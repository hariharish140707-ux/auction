import {
  RoomSnapshot,
  Player,
  RoomSettings,
  IPL_TEAMS,
  SET_ORDER,
  validateBid,
  getNextBidAmount,
  TeamRatingSummary,
  TeamSquadEntry,
  ChatMessage,
  TradeOffer,
  TransferListing,
  AcceleratedPoll,
} from '@ipl-auction/shared';
import { prisma } from './db';
import { roomStore } from './store';
import { botManager } from './bot-manager';
import { build350PlayersDataset } from './seed/seed-data-builder';

export interface ServerRoomSession {
  room: RoomSnapshot;
  upcomingPlayers: Player[];
  unsoldPlayers: Player[];
  timerId: NodeJS.Timeout | null;
  commandQueue: Promise<void>; // Per-room command lock
  botTimerId: NodeJS.Timeout | null;
  onStateUpdate?: (room: RoomSnapshot, eventName: string, payload?: any) => void;
}

export class AuctionEngine {
  private sessions: Map<string, ServerRoomSession> = new Map();

  /**
   * Initializes a new room snapshot.
   */
  async createRoom(
    code: string,
    hostId: string,
    hostName: string,
    settings: RoomSettings
  ): Promise<RoomSnapshot> {
    const teams: Record<string, any> = {};

    // Fetch retained players if Mini auction mode
    let retainedPlayers: any[] = [];
    if (settings.auctionMode === 'MINI') {
      try {
        retainedPlayers = await prisma.player.findMany({ where: { retainedByTeamId: { not: null } } });
      } catch (err) {
        retainedPlayers = build350PlayersDataset().filter((p) => p.retainedByTeamId);
      }
      if (!retainedPlayers || retainedPlayers.length === 0) {
        retainedPlayers = build350PlayersDataset().filter((p) => p.retainedByTeamId);
      }
    }

    for (const t of IPL_TEAMS) {
      const teamRetained = retainedPlayers.filter((rp) => rp.retainedByTeamId === t.id);
      let totalSpent = 0;
      const squad: TeamSquadEntry[] = teamRetained.map((rp) => {
        const price = rp.retainedPrice || rp.basePrice;
        totalSpent += price;
        return {
          playerId: rp.id,
          player: {
            id: rp.id,
            name: rp.name,
            country: rp.country,
            role: rp.role as any,
            isOverseas: rp.isOverseas,
            basePrice: rp.basePrice,
            battingRating: rp.battingRating,
            bowlingRating: rp.bowlingRating,
            overallRating: rp.overallRating,
            set: rp.set as any,
            retainedByTeamId: rp.retainedByTeamId,
            retainedPrice: rp.retainedPrice,
          },
          buyPrice: price,
          isRetained: true,
        };
      });

      const purseRemaining = Math.max(0, settings.startingPurse - totalSpent);

      teams[t.id] = {
        teamId: t.id,
        ownerId: null,
        ownerName: null,
        isBotOwner: false,
        purseRemaining,
        totalSpent,
        squad,
      };
    }

    const room: RoomSnapshot = {
      code,
      status: 'LOBBY',
      settings,
      players: [
        {
          id: hostId,
          name: hostName,
          teamId: null,
          isHost: true,
          isBot: false,
          isOnline: true,
          joinedAt: Date.now(),
        },
      ],
      teams,
      currentPlayerBlock: null,
      upcomingPlayerCount: 0,
      completedPlayerCount: 0,
      chatMessages: [
        {
          id: 'sys-1',
          senderName: 'System',
          text: `Room created by ${hostName}. Code: ${code}`,
          timestamp: Date.now(),
          isSystem: true,
        },
      ],
      lastActivity: new Date().toISOString(),
      createdAt: Date.now(),
      trades: [],
      transferListings: [],
    };

    const session: ServerRoomSession = {
      room,
      upcomingPlayers: [],
      unsoldPlayers: [],
      timerId: null,
      commandQueue: Promise.resolve(),
      botTimerId: null,
    };

    this.sessions.set(code, session);
    await roomStore.saveRoom(room);
    return room;
  }


  getSession(code: string): ServerRoomSession | undefined {
    return this.sessions.get(code.toUpperCase());
  }

  /**
   * Helper to run commands sequentially for a room (race-condition safety lock).
   */
  async runSerialized<T>(code: string, fn: (session: ServerRoomSession) => Promise<T>): Promise<T> {
    const session = this.getSession(code);
    if (!session) throw new Error(`Room ${code} not found`);

    return new Promise<T>((resolve, reject) => {
      session.commandQueue = session.commandQueue
        .then(async () => {
          try {
            const res = await fn(session);
            resolve(res);
          } catch (err) {
            reject(err);
          }
        })
        .catch((err) => reject(err));
    });
  }

  /**
   * Start the live auction.
   */
  async startAuction(code: string, broadcaster: (eventName: string, payload?: any) => void) {
    await this.runSerialized(code, async (session) => {
      if (session.room.status !== 'LOBBY' && session.room.status !== 'PAUSED') {
        throw new Error('Auction cannot be started from current status');
      }

      // Load available players from database or built-in dataset
      let dbPlayers: any[] = [];
      try {
        dbPlayers = await prisma.player.findMany();
      } catch (err) {
        dbPlayers = build350PlayersDataset();
      }

      if (!dbPlayers || dbPlayers.length === 0) {
        dbPlayers = build350PlayersDataset();
      }
      
      // Filter out retained players if mini mode
      const retainedIds = new Set<string>();
      if (session.room.settings.auctionMode === 'MINI') {
        Object.values(session.room.teams).forEach((t) => {
          t.squad.forEach((s) => retainedIds.add(s.playerId));
        });
      }

      const available = dbPlayers.filter((p) => !retainedIds.has(p.id));

      // Group by set and shuffle
      const setMap: Record<string, Player[]> = {
        MARQUEE: [],
        TIER1_BAT: [], TIER1_BOWL: [], TIER1_AL: [], TIER1_WK: [],
        TIER2_BAT: [], TIER2_BOWL: [], TIER2_AL: [], TIER2_WK: [],
        TIER3_BAT: [], TIER3_BOWL: [], TIER3_AL: [], TIER3_WK: [],
      };

      available.forEach((p) => {
        const item: Player = {
          id: p.id,
          name: p.name,
          country: p.country,
          role: p.role as any,
          isOverseas: p.isOverseas,
          basePrice: p.basePrice,
          battingRating: p.battingRating,
          bowlingRating: p.bowlingRating,
          overallRating: p.overallRating,
          set: p.set as any,
        };
        if (setMap[item.set]) {
          setMap[item.set].push(item);
        } else {
          setMap.TIER3_BAT.push(item);
        }
      });

      // Shuffle within sets and concatenate
      const queue: Player[] = [];
      for (const setName of SET_ORDER) {
        const setPlayers = setMap[setName] || [];
        setPlayers.sort(() => Math.random() - 0.5);
        queue.push(...setPlayers);
      }

      session.upcomingPlayers = queue;
      session.unsoldPlayers = [];
      session.room.upcomingPlayerCount = queue.length;
      session.room.status = 'LIVE';

      this.addChatMessage(session.room, 'System', 'Auction started! First player coming up...', true);
      await roomStore.saveRoom(session.room);
      broadcaster('room:state', session.room);

      // Bring first player on block
      this.bringNextPlayerOnBlock(session, broadcaster);
    });
  }

  /**
   * Brings the next player from upcoming/unsold pool onto the block.
   */
  private bringNextPlayerOnBlock(
    session: ServerRoomSession,
    broadcaster: (eventName: string, payload?: any) => void
  ) {
    if (session.timerId) clearInterval(session.timerId);
    if (session.botTimerId) clearTimeout(session.botTimerId);

    if (session.upcomingPlayers.length === 0) {
      if (session.unsoldPlayers.length > 0) {
        // Round 2 for unsold players
        session.upcomingPlayers = [...session.unsoldPlayers];
        session.unsoldPlayers = [];
        this.addChatMessage(session.room, 'System', 'Round 2 starting for unsold players!', true);
      } else {
        // Auction completed
        session.room.status = 'COMPLETED';
        session.room.currentPlayerBlock = null;
        this.addChatMessage(session.room, 'System', '🎉 Auction Completed! View final squads & ratings.', true);
        roomStore.saveRoom(session.room);
        broadcaster('room:state', session.room);
        broadcaster('auction:completed', { room: session.room, summary: this.generateSummary(session.room) });
        return;
      }
    }

    const nextPlayer = session.upcomingPlayers.shift()!;
    session.room.upcomingPlayerCount = session.upcomingPlayers.length;

    const duration = session.room.settings.bidTimerDuration;
    const now = Date.now();

    session.room.status = 'PLAYER_ON_BLOCK';
    session.room.currentPlayerBlock = {
      player: nextPlayer,
      currentBid: nextPlayer.basePrice,
      highestBidderTeamId: null,
      highestBidderName: null,
      timerSecondsLeft: duration,
      timerEndsAt: now + duration * 1000,
      bidHistory: [],
    };

    roomStore.saveRoom(session.room);
    broadcaster('room:state', session.room);
    broadcaster('auction:playerOnBlock', session.room.currentPlayerBlock);

    // Start timer loop
    this.startTimerLoop(session, broadcaster);
    this.triggerBotCheck(session, broadcaster);
  }

  /**
   * Main timer tick countdown for active player block.
   */
  private startTimerLoop(
    session: ServerRoomSession,
    broadcaster: (eventName: string, payload?: any) => void
  ) {
    if (session.timerId) clearInterval(session.timerId);

    session.timerId = setInterval(async () => {
      await this.runSerialized(session.room.code, async (currSession) => {
        const block = currSession.room.currentPlayerBlock;
        if (!block || currSession.room.status !== 'PLAYER_ON_BLOCK') {
          if (currSession.timerId) clearInterval(currSession.timerId);
          return;
        }

        const now = Date.now();
        const secondsLeft = Math.max(0, Math.ceil((block.timerEndsAt - now) / 1000));
        block.timerSecondsLeft = secondsLeft;

        broadcaster('auction:tick', { secondsLeft, timerEndsAt: block.timerEndsAt });

        if (secondsLeft <= 0) {
          clearInterval(currSession.timerId!);
          currSession.timerId = null;
          await this.handlePlayerBlockExpiry(currSession, broadcaster);
        }
      });
    }, 1000);
  }

  /**
   * Called when timer reaches 0 for a player.
   */
  private async handlePlayerBlockExpiry(
    session: ServerRoomSession,
    broadcaster: (eventName: string, payload?: any) => void
  ) {
    const block = session.room.currentPlayerBlock;
    if (!block) return;

    if (block.highestBidderTeamId) {
      // SOLD
      const team = session.room.teams[block.highestBidderTeamId];
      const winPrice = block.currentBid;

      team.purseRemaining = Math.round((team.purseRemaining - winPrice) * 100) / 100;
      team.totalSpent = Math.round((team.totalSpent + winPrice) * 100) / 100;

      const squadEntry: TeamSquadEntry = {
        playerId: block.player.id,
        player: block.player,
        buyPrice: winPrice,
        isRetained: false,
      };
      team.squad.push(squadEntry);
      session.room.completedPlayerCount++;

      session.room.status = 'SOLD';
      const msg = `🔨 SOLD! ${block.player.name} sold to ${team.teamId} (${block.highestBidderName}) for ₹${winPrice.toFixed(2)} Cr!`;
      this.addChatMessage(session.room, 'System', msg, true);

      roomStore.saveRoom(session.room);
      broadcaster('auction:sold', {
        player: block.player,
        teamId: team.teamId,
        teamName: IPL_TEAMS.find((t) => t.id === team.teamId)?.name || team.teamId,
        winnerName: block.highestBidderName,
        price: winPrice,
        room: session.room,
      });
    } else {
      // UNSOLD
      session.unsoldPlayers.push(block.player);
      session.room.status = 'UNSOLD';
      const msg = `❌ UNSOLD! ${block.player.name} went unsold at base price ₹${block.player.basePrice.toFixed(2)} Cr.`;
      this.addChatMessage(session.room, 'System', msg, true);

      roomStore.saveRoom(session.room);
      broadcaster('auction:unsold', { player: block.player, room: session.room });
    }

    // Wait 2.5 seconds before loading next player
    setTimeout(() => {
      this.runSerialized(session.room.code, async (currSession) => {
        if (currSession.room.status === 'SOLD' || currSession.room.status === 'UNSOLD') {
          this.bringNextPlayerOnBlock(currSession, broadcaster);
        }
      });
    }, 2500);
  }

  /**
   * Process a bid intent from a client.
   */
  async placeBid(
    code: string,
    playerId: string,
    teamId: string,
    broadcaster: (eventName: string, payload?: any) => void
  ) {
    return this.runSerialized(code, async (session) => {
      const room = session.room;
      if (room.status !== 'PLAYER_ON_BLOCK' || !room.currentPlayerBlock) {
        throw new Error('No active player on the block to bid on');
      }

      const player = room.players.find((p) => p.id === playerId);
      const team = room.teams[teamId];
      if (!team) throw new Error('Invalid team');

      const validation = validateBid(team, room.currentPlayerBlock, room.settings);
      if (!validation.valid) {
        throw new Error(validation.reason || 'Invalid bid');
      }

      const bidAmount = validation.nextBidAmount;
      const duration = room.settings.bidTimerDuration;
      const now = Date.now();

      room.currentPlayerBlock.currentBid = bidAmount;
      room.currentPlayerBlock.highestBidderTeamId = teamId;
      room.currentPlayerBlock.highestBidderName = player ? player.name : teamId;
      room.currentPlayerBlock.timerSecondsLeft = duration;
      room.currentPlayerBlock.timerEndsAt = now + duration * 1000;

      const bidEvent = {
        id: `bid-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        roomId: room.code,
        playerId: room.currentPlayerBlock.player.id,
        teamId,
        teamName: IPL_TEAMS.find((t) => t.id === teamId)?.name || teamId,
        bidderName: player ? player.name : teamId,
        amount: bidAmount,
        timestamp: now,
      };

      room.currentPlayerBlock.bidHistory.unshift(bidEvent);

      await roomStore.saveRoom(room);
      broadcaster('auction:bidPlaced', {
        bidEvent,
        currentPlayerBlock: room.currentPlayerBlock,
        roomSnapshot: room,
      });

      // Trigger bot response check
      this.triggerBotCheck(session, broadcaster);
    });
  }

  /**
   * Check AI bots to place counter bids if active.
   */
  private triggerBotCheck(
    session: ServerRoomSession,
    broadcaster: (eventName: string, payload?: any) => void
  ) {
    if (session.botTimerId) clearTimeout(session.botTimerId);

    const botAction = botManager.evaluateBotBids(session.room);
    if (!botAction) return;

    // Random bot response delay between 1.2s and 2.8s
    const delay = Math.floor(Math.random() * 1600) + 1200;
    session.botTimerId = setTimeout(() => {
      this.placeBid(session.room.code, 'bot-user', botAction.teamId, broadcaster).catch(() => {});
    }, delay);
  }

  /**
   * Pause auction host control.
   */
  async pauseAuction(code: string, broadcaster: (eventName: string, payload?: any) => void) {
    return this.runSerialized(code, async (session) => {
      if (session.timerId) clearInterval(session.timerId);
      if (session.botTimerId) clearTimeout(session.botTimerId);
      session.room.status = 'PAUSED';
      this.addChatMessage(session.room, 'System', '⏸️ Auction paused by host.', true);
      await roomStore.saveRoom(session.room);
      broadcaster('room:state', session.room);
    });
  }

  /**
   * Resume auction host control.
   */
  async resumeAuction(code: string, broadcaster: (eventName: string, payload?: any) => void) {
    return this.runSerialized(code, async (session) => {
      if (session.room.status !== 'PAUSED') return;
      session.room.status = 'PLAYER_ON_BLOCK';
      if (session.room.currentPlayerBlock) {
        const duration = session.room.settings.bidTimerDuration;
        session.room.currentPlayerBlock.timerSecondsLeft = duration;
        session.room.currentPlayerBlock.timerEndsAt = Date.now() + duration * 1000;
      }
      this.addChatMessage(session.room, 'System', '▶️ Auction resumed.', true);
      await roomStore.saveRoom(session.room);
      broadcaster('room:state', session.room);
      this.startTimerLoop(session, broadcaster);
      this.triggerBotCheck(session, broadcaster);
    });
  }

  /**
   * Skip current player on block.
   */
  async skipPlayer(code: string, broadcaster: (eventName: string, payload?: any) => void) {
    return this.runSerialized(code, async (session) => {
      if (session.timerId) clearInterval(session.timerId);
      if (session.room.currentPlayerBlock) {
        session.unsoldPlayers.push(session.room.currentPlayerBlock.player);
        this.addChatMessage(
          session.room,
          'System',
          `⏩ Host skipped player ${session.room.currentPlayerBlock.player.name}`,
          true
        );
      }
      this.bringNextPlayerOnBlock(session, broadcaster);
    });
  }

  /**
   * Host kick/remove player from room.
   */
  async kickPlayer(
    code: string,
    hostToken: string,
    targetPlayerId: string,
    broadcaster?: (eventName: string, payload?: any) => void
  ) {
    return this.runSerialized(code, async (session) => {
      const room = session.room;
      const host = room.players.find((p) => p.id === hostToken);
      if (!host || !host.isHost) {
        throw new Error('Only the room host can remove players');
      }

      const targetIndex = room.players.findIndex((p) => p.id === targetPlayerId);
      if (targetIndex === -1) {
        throw new Error('Player not found in room');
      }

      const targetPlayer = room.players[targetIndex];
      if (targetPlayer.isHost) {
        throw new Error('Cannot remove the room host');
      }

      // Free or convert team
      if (targetPlayer.teamId && room.teams[targetPlayer.teamId]) {
        const team = room.teams[targetPlayer.teamId];
        if (room.status === 'LOBBY') {
          team.ownerId = null;
          team.ownerName = null;
          team.isBotOwner = false;
        } else {
          // If auction started, keep squad and hand over to bot
          team.ownerId = null;
          team.ownerName = `${team.teamId} Bot`;
          team.isBotOwner = true;
        }
      }

      // Add to banned player list for this room
      if (!room.bannedPlayerIds) {
        room.bannedPlayerIds = [];
      }
      if (!room.bannedPlayerIds.includes(targetPlayerId)) {
        room.bannedPlayerIds.push(targetPlayerId);
      }

      // Remove player
      room.players.splice(targetIndex, 1);

      this.addChatMessage(
        room,
        'System',
        `🚫 ${targetPlayer.name} was removed from the room by the host.`,
        true
      );

      await roomStore.saveRoom(room);
      if (broadcaster) {
        broadcaster('room:state', room);
      }
    });
  }

  /**
   * Helper to append system or user chat message.
   */
  addChatMessage(room: RoomSnapshot, senderName: string, text: string, isSystem = false) {
    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderName,
      text,
      timestamp: Date.now(),
      isSystem,
    };
    room.chatMessages.push(msg);
    if (room.chatMessages.length > 200) room.chatMessages.shift();
  }

  /**
   * Generates team ratings and leaderboard summaries for final results view.
   */
  generateSummary(room: RoomSnapshot): TeamRatingSummary[] {
    const summaries: TeamRatingSummary[] = [];

    for (const teamId of Object.keys(room.teams)) {
      const team = room.teams[teamId];
      const meta = IPL_TEAMS.find((t) => t.id === teamId);
      const squad = team.squad;

      let bats = 0,
        bowlers = 0,
        allRounders = 0,
        keepers = 0,
        overseas = 0;
      let totalRatingSum = 0;

      squad.forEach((s) => {
        const p = s.player;
        if (p.isOverseas) overseas++;
        if (p.role === 'BATSMAN') bats++;
        else if (p.role === 'BOWLER') bowlers++;
        else if (p.role === 'ALL_ROUNDER') allRounders++;
        else if (p.role === 'WICKET_KEEPER') keepers++;
        totalRatingSum += p.overallRating;
      });

      // Top 11 rating average
      const sortedRatings = squad.map((s) => s.player.overallRating).sort((a, b) => b - a);
      const top11 = sortedRatings.slice(0, 11);
      const avgTop11 = top11.length > 0 ? top11.reduce((a, b) => a + b, 0) / top11.length : 50;

      // Squad completeness bonus
      const squadCount = squad.length;
      const completenessFactor = Math.min(1.0, squadCount / room.settings.minSquadSize);

      // Role balance score (out of 20)
      let balanceScore = 0;
      if (bats >= 4) balanceScore += 5;
      if (bowlers >= 4) balanceScore += 5;
      if (allRounders >= 2) balanceScore += 5;
      if (keepers >= 1) balanceScore += 5;

      const overallScore = Math.round(avgTop11 * 0.7 * completenessFactor + balanceScore * 1.5);

      // Top star players
      const starPlayers = squad
        .sort((a, b) => b.buyPrice - a.buyPrice)
        .slice(0, 3)
        .map((s) => `${s.player.name} (₹${s.buyPrice.toFixed(2)} Cr)`);

      summaries.push({
        teamId,
        teamName: meta ? meta.name : teamId,
        ownerName: team.ownerName || 'Unassigned',
        totalSpent: team.totalSpent,
        purseRemaining: team.purseRemaining,
        squadCount,
        overseasCount: overseas,
        batsmenCount: bats,
        bowlersCount: bowlers,
        allRoundersCount: allRounders,
        keepersCount: keepers,
        overallScore: Math.min(99, Math.max(40, overallScore)),
        starPlayers,
      });
    }

    return summaries.sort((a, b) => b.overallScore - a.overallScore);
  }

  /**
   * Returns organized upcoming sets, sold players, unsold players, and leaderboard.
   */
  async getAuctionStats(code: string) {
    const session = this.getSession(code);
    let room = session ? session.room : await roomStore.getRoom(code);
    if (!room) throw new Error('Room not found');

    let upcoming: Player[] = [];
    if (session && session.upcomingPlayers && session.upcomingPlayers.length > 0) {
      upcoming = [...session.upcomingPlayers];
    } else {
      let dbPlayers: any[] = [];
      try {
        dbPlayers = await prisma.player.findMany();
      } catch (err) {
        dbPlayers = build350PlayersDataset();
      }
      if (!dbPlayers || dbPlayers.length === 0) {
        dbPlayers = build350PlayersDataset();
      }

      const soldIds = new Set<string>();
      Object.values(room.teams).forEach((t) => {
        t.squad.forEach((s) => soldIds.add(s.playerId));
      });
      const unsoldIds = new Set(session ? session.unsoldPlayers.map((p) => p.id) : []);
      if (room.currentPlayerBlock) soldIds.add(room.currentPlayerBlock.player.id);

      const available = dbPlayers.filter((p) => !soldIds.has(p.id) && !unsoldIds.has(p.id));

      const setMap: Record<string, Player[]> = {
        MARQUEE: [],
        TIER1_BAT: [], TIER1_BOWL: [], TIER1_AL: [], TIER1_WK: [],
        TIER2_BAT: [], TIER2_BOWL: [], TIER2_AL: [], TIER2_WK: [],
        TIER3_BAT: [], TIER3_BOWL: [], TIER3_AL: [], TIER3_WK: [],
      };
      available.forEach((p) => {
        const item: Player = {
          id: p.id,
          name: p.name,
          country: p.country,
          role: p.role as any,
          isOverseas: p.isOverseas,
          basePrice: p.basePrice,
          battingRating: p.battingRating,
          bowlingRating: p.bowlingRating,
          overallRating: p.overallRating,
          set: p.set as any,
        };
        if (setMap[item.set]) setMap[item.set].push(item);
        else setMap.TIER3_BAT.push(item);
      });
      for (const setName of SET_ORDER) {
        upcoming.push(...(setMap[setName] || []));
      }
    }

    const sold: { player: Player; teamId: string; teamName: string; price: number; isRetained: boolean }[] = [];
    Object.values(room.teams).forEach((t) => {
      const meta = IPL_TEAMS.find((tm) => tm.id === t.teamId);
      t.squad.forEach((s) => {
        sold.push({
          player: s.player,
          teamId: t.teamId,
          teamName: meta ? meta.name : t.teamId,
          price: s.buyPrice,
          isRetained: s.isRetained,
        });
      });
    });

    const unsold = session ? session.unsoldPlayers : [];

    return {
      upcoming,
      sold,
      unsold,
      leaderboard: this.generateSummary(room),
    };
  }

  /**
   * Propose a player swap or cash trade.
   */
  /**
   * Update bid timer duration at any time (Host only).
   */
  async updateTimer(
    code: string,
    playerToken: string,
    duration: number,
    broadcaster: (eventName: string, payload?: any) => void
  ) {
    return this.runSerialized(code, async (session) => {
      const room = session.room;
      const player = room.players.find((p) => p.id === playerToken);
      if (!player || !player.isHost) {
        throw new Error('Only the room host can change the timer duration');
      }

      const validDuration = Math.max(3, Math.min(60, Number(duration) || 10));
      room.settings.bidTimerDuration = validDuration;

      // Dynamically adjust active player on block timer if active
      if (room.status === 'PLAYER_ON_BLOCK' && room.currentPlayerBlock) {
        room.currentPlayerBlock.timerSecondsLeft = validDuration;
        room.currentPlayerBlock.timerEndsAt = Date.now() + validDuration * 1000;
      }

      this.addChatMessage(room, 'System', `⏱️ Host updated bid timer to ${validDuration}s.`, true);
      await roomStore.saveRoom(room);
      broadcaster('room:state', room);
      broadcaster('timer:updated', { duration: validDuration, room });
    });
  }

  /**
   * Set dynamic or custom bid increment (Host only, anytime).
   */
  async setBidIncrement(
    code: string,
    playerToken: string,
    option: any,
    broadcaster: (eventName: string, payload?: any) => void
  ) {
    return this.runSerialized(code, async (session) => {
      const room = session.room;
      const player = room.players.find((p) => p.id === playerToken);
      if (!player || !player.isHost) {
        throw new Error('Only the room host can change the bid increment');
      }

      room.settings.bidIncrementOption = option;
      const label =
        option === '25L'
          ? '₹25 Lakhs (+0.25 Cr)'
          : option === '50L'
          ? '₹50 Lakhs (+0.50 Cr)'
          : option === '75L'
          ? '₹75 Lakhs (+0.75 Cr)'
          : option === '1CR'
          ? '₹1.00 Crore (+1.00 Cr)'
          : 'Dynamic IPL Tiers';

      this.addChatMessage(session.room, 'System', `🔨 Host set bid increment to ${label}.`, true);
      await roomStore.saveRoom(session.room);
      broadcaster('room:state', session.room);
      broadcaster('bid:increment:updated', { option, room: session.room });
    });
  }

  /**
   * Start Accelerated Auction Poll (Host only, optional targetSet).
   */
  async startAcceleratedPoll(
    code: string,
    playerToken: string,
    targetSet: string | undefined,
    broadcaster: (eventName: string, payload?: any) => void
  ) {
    return this.runSerialized(code, async (session) => {
      const room = session.room;
      const player = room.players.find((p) => p.id === playerToken);
      if (!player || !player.isHost) {
        throw new Error('Only the room host can initiate an Accelerated Auction Poll');
      }

      const onlinePlayers = room.players.filter((p) => p.isOnline);
      const totalOnline = Math.max(1, onlinePlayers.length);
      const requiredVotes = Math.max(1, Math.ceil(totalOnline / 2));

      let effectiveTargetSet = targetSet || 'CURRENT';
      let targetSetName = 'Current Upcoming Set';
      if (effectiveTargetSet === 'ALL') {
        targetSetName = 'All Remaining Players';
      } else if (effectiveTargetSet === 'CURRENT') {
        const firstUpcoming = session.upcomingPlayers[0];
        targetSetName = firstUpcoming ? `Current Set (${firstUpcoming.set})` : 'Current Upcoming Set';
        if (firstUpcoming) effectiveTargetSet = firstUpcoming.set;
      } else {
        targetSetName = `Set: ${effectiveTargetSet}`;
      }

      room.acceleratedPoll = {
        id: `poll-${Date.now()}`,
        targetSet: effectiveTargetSet,
        targetSetName,
        status: 'VOTING',
        votes: {
          [player.id]: true, // Host automatically votes YES
        },
        requiredVotes,
        totalOnline,
        createdAt: Date.now(),
        ballotNominations: {},
        nominatedPlayerIds: [],
      };

      this.addChatMessage(
        room,
        'System',
        `⚡ Host initiated Accelerated Auction Poll for ${targetSetName}! (${requiredVotes}/${totalOnline} YES votes required)`,
        true
      );

      await roomStore.saveRoom(room);
      broadcaster('room:state', room);
      broadcaster('poll:started', { poll: room.acceleratedPoll, room });
    });
  }

  /**
   * Vote on Accelerated Auction Poll.
   */
  async voteAcceleratedPoll(
    code: string,
    playerToken: string,
    accept: boolean,
    broadcaster: (eventName: string, payload?: any) => void
  ) {
    return this.runSerialized(code, async (session) => {
      const room = session.room;
      if (!room.acceleratedPoll || room.acceleratedPoll.status !== 'VOTING') {
        throw new Error('No active Accelerated Auction poll to vote on');
      }

      const player = room.players.find((p) => p.id === playerToken);
      const voterId = player ? player.id : playerToken;
      room.acceleratedPoll.votes[voterId] = accept;

      const yesVotes = Object.values(room.acceleratedPoll.votes).filter((v) => v === true).length;
      const noVotes = Object.values(room.acceleratedPoll.votes).filter((v) => v === false).length;

      if (yesVotes >= room.acceleratedPoll.requiredVotes) {
        // Poll PASSED! Move to Ballot phase
        room.acceleratedPoll.status = 'BALLOT';
        this.addChatMessage(
          room,
          'System',
          `🎉 Accelerated Auction Poll PASSED (${yesVotes}/${room.acceleratedPoll.totalOnline} YES votes)! Please submit your ballot nominations now.`,
          true
        );
      } else if (noVotes > room.acceleratedPoll.totalOnline - room.acceleratedPoll.requiredVotes) {
        // Poll REJECTED
        room.acceleratedPoll.status = 'REJECTED';
        this.addChatMessage(
          room,
          'System',
          `❌ Accelerated Auction Poll DECLINED (${noVotes} NO votes). Regular auction continues.`,
          true
        );
      }

      await roomStore.saveRoom(room);
      broadcaster('room:state', room);
    });
  }

  /**
   * Submit Ballot Nominations for Accelerated Auction.
   */
  async submitBallotNominations(
    code: string,
    playerToken: string,
    playerIds: string[],
    broadcaster: (eventName: string, payload?: any) => void
  ) {
    return this.runSerialized(code, async (session) => {
      const room = session.room;
      if (!room.acceleratedPoll || room.acceleratedPoll.status !== 'BALLOT') {
        throw new Error('Ballot nominations are not currently open');
      }

      const player = room.players.find((p) => p.id === playerToken);
      const teamId = player?.teamId || Object.keys(room.teams).find((t) => room.teams[t].ownerId === playerToken) || playerToken;

      room.acceleratedPoll.ballotNominations[teamId] = Array.isArray(playerIds) ? playerIds : [];

      this.addChatMessage(
        room,
        'System',
        `📋 ${teamId} submitted ${playerIds.length} player nominations on their Accelerated Ballot.`,
        true
      );

      await roomStore.saveRoom(room);
      broadcaster('room:state', room);
    });
  }

  /**
   * Launch Accelerated Auction with all nominated players.
   */
  async launchAcceleratedAuction(
    code: string,
    playerToken: string,
    broadcaster: (eventName: string, payload?: any) => void
  ) {
    return this.runSerialized(code, async (session) => {
      const room = session.room;
      const player = room.players.find((p) => p.id === playerToken);
      if (!player || !player.isHost) {
        throw new Error('Only the room host can launch the Accelerated Auction');
      }

      if (!room.acceleratedPoll || room.acceleratedPoll.status !== 'BALLOT') {
        throw new Error('Ballot phase is not active');
      }

      // Collect union of all nominated player IDs
      const allNominatedIds = new Set<string>();
      Object.values(room.acceleratedPoll.ballotNominations).forEach((list) => {
        list.forEach((id) => allNominatedIds.add(id));
      });

      const targetSet = room.acceleratedPoll.targetSet;
      const allUpcoming = [...session.upcomingPlayers];

      let keptUpcoming: Player[] = [];
      let skippedUpcoming: Player[] = [];

      if (!targetSet || targetSet === 'ALL') {
        if (allNominatedIds.size > 0) {
          keptUpcoming = allUpcoming.filter((p) => allNominatedIds.has(p.id));
          skippedUpcoming = allUpcoming.filter((p) => !allNominatedIds.has(p.id));
        } else {
          keptUpcoming = allUpcoming.slice(0, 30);
          skippedUpcoming = allUpcoming.slice(30);
        }
        session.upcomingPlayers = keptUpcoming;
        session.unsoldPlayers.push(...skippedUpcoming);
      } else {
        // Accelerating specific set only
        const thisSetPlayers = allUpcoming.filter((p) => p.set === targetSet);
        const otherSetPlayers = allUpcoming.filter((p) => p.set !== targetSet);

        const thisSetNominated = thisSetPlayers.filter((p) => allNominatedIds.has(p.id));
        const thisSetUnselected = thisSetPlayers.filter((p) => !allNominatedIds.has(p.id));

        session.upcomingPlayers = [...thisSetNominated, ...otherSetPlayers];
        session.unsoldPlayers.push(...thisSetUnselected);
      }

      room.upcomingPlayerCount = session.upcomingPlayers.length;
      room.acceleratedPoll.status = 'COMPLETED';
      room.acceleratedPoll.nominatedPlayerIds = Array.from(allNominatedIds);

      this.addChatMessage(
        room,
        'System',
        `🚀 ACCELERATED AUCTION COMMENCED for ${room.acceleratedPoll.targetSetName || 'nominated set'}! Unselected players skipped.`,
        true
      );

      await roomStore.saveRoom(room);
      broadcaster('room:state', room);

      // If no active player on block, start next player immediately
      if (!room.currentPlayerBlock || room.status === 'PAUSED' || room.status === 'LIVE' || room.status === 'LOBBY') {
        this.bringNextPlayerOnBlock(session, broadcaster);
      }
    });
  }

  /**
   * Propose a player swap or cash trade.
   */
  async proposeTrade(
    code: string,
    playerToken: string,
    data: {
      toTeamId: string;
      offeredPlayerId?: string | null;
      offeredCash?: number;
      requestedPlayerId?: string | null;
      requestedCash?: number;
    },
    broadcaster: (eventName: string, payload?: any) => void
  ) {
    return this.runSerialized(code, async (session) => {
      const room = session.room;
      let player = room.players.find((p) => p.id === playerToken);
      let fromTeamId: string | null = player?.teamId || null;

      if (!fromTeamId) {
        fromTeamId = Object.keys(room.teams).find((t) => room.teams[t].ownerId === playerToken) || null;
      }
      if (!fromTeamId && player) {
        fromTeamId = Object.keys(room.teams).find((t) => room.teams[t].ownerName === player.name) || null;
      }
      if (!fromTeamId && room.teams[playerToken]) {
        fromTeamId = playerToken;
      }

      if (!fromTeamId) throw new Error('You must be assigned to a franchise to propose a trade');

      const toTeamId = data.toTeamId;
      if (fromTeamId === toTeamId) throw new Error('Cannot trade with your own team');

      const fromTeam = room.teams[fromTeamId];
      const toTeam = room.teams[toTeamId];
      if (!fromTeam || !toTeam) throw new Error('Invalid teams involved in proposal');

      const offeredCash = Math.max(0, Math.round((Number(data.offeredCash) || 0) * 100) / 100);
      const requestedCash = Math.max(0, Math.round((Number(data.requestedCash) || 0) * 100) / 100);

      // Validate offered player
      let offeredEntry: TeamSquadEntry | undefined;
      if (data.offeredPlayerId) {
        offeredEntry = fromTeam.squad.find((s) => s.playerId === data.offeredPlayerId);
        if (!offeredEntry) throw new Error('You do not own the offered player');
      }

      // Validate requested player
      let requestedEntry: TeamSquadEntry | undefined;
      if (data.requestedPlayerId) {
        requestedEntry = toTeam.squad.find((s) => s.playerId === data.requestedPlayerId);
        if (!requestedEntry) throw new Error('Target team does not own requested player');
      }

      const hasOffer = !!offeredEntry || offeredCash > 0;
      const hasRequest = !!requestedEntry || requestedCash > 0;

      if (!hasOffer) {
        throw new Error('Please offer either a squad player or cash amount (> ₹0 Cr)');
      }
      if (!hasRequest) {
        throw new Error('Please request either a player or cash amount (> ₹0 Cr) from the other team');
      }

      if (offeredCash > fromTeam.purseRemaining) {
        throw new Error(`Insufficient purse! Max offer is ₹${fromTeam.purseRemaining.toFixed(2)} Cr`);
      }

      const trade: TradeOffer = {
        id: `trade-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        roomId: room.code,
        fromTeamId,
        fromTeamName: IPL_TEAMS.find((t) => t.id === fromTeamId)?.name || fromTeamId,
        fromPlayerId: player ? player.id : playerToken,
        fromPlayerName: player ? player.name : fromTeam.ownerName || fromTeamId,
        toTeamId,
        toTeamName: IPL_TEAMS.find((t) => t.id === toTeamId)?.name || toTeamId,
        offeredPlayerId: data.offeredPlayerId || null,
        offeredPlayer: offeredEntry ? offeredEntry.player : null,
        offeredCash,
        requestedPlayerId: data.requestedPlayerId || null,
        requestedPlayer: requestedEntry ? requestedEntry.player : null,
        requestedCash,
        status: 'PENDING',
        createdAt: Date.now(),
      };

      room.trades = room.trades || [];
      room.trades.push(trade);

      const offerDesc = [
        offeredEntry ? offeredEntry.player.name : null,
        offeredCash > 0 ? `₹${offeredCash.toFixed(2)} Cr` : null,
      ]
        .filter(Boolean)
        .join(' + ');

      const reqDesc = [
        requestedEntry ? requestedEntry.player.name : null,
        requestedCash > 0 ? `₹${requestedCash.toFixed(2)} Cr` : null,
      ]
        .filter(Boolean)
        .join(' + ');

      this.addChatMessage(
        room,
        'System',
        `🔄 Trade Offer: ${fromTeamId} offered [${offerDesc || '₹0'}] to ${toTeamId} for [${reqDesc || '₹0'}]`,
        true
      );

      await roomStore.saveRoom(room);
      broadcaster('room:state', room);
      broadcaster('trade:proposed', { trade, room });

      // Automatically evaluate if recipient is an AI franchise team
      if (botManager.isBotControlledTeam(room, toTeamId)) {
        this.scheduleAiTradeEvaluation(code, trade.id, broadcaster);
      }

      return trade;
    });
  }

  /**
   * Internal helper to atomically execute player and funds exchange for an accepted trade.
   */
  private executeTradeExchange(room: RoomSnapshot, trade: TradeOffer) {
    const fromTeam = room.teams[trade.fromTeamId];
    const toTeam = room.teams[trade.toTeamId];
    if (!fromTeam || !toTeam) throw new Error('Invalid teams involved in trade');

    // Check purse funds
    if (trade.offeredCash > 0 && fromTeam.purseRemaining < trade.offeredCash) {
      throw new Error(`${trade.fromTeamId} has insufficient purse for the cash offer (Needs ₹${trade.offeredCash.toFixed(2)} Cr)`);
    }
    if (trade.requestedCash > 0 && toTeam.purseRemaining < trade.requestedCash) {
      throw new Error(`${trade.toTeamId} has insufficient purse for the requested cash (Needs ₹${trade.requestedCash.toFixed(2)} Cr)`);
    }

    // Check player ownership still valid
    let offeredIndex = -1;
    if (trade.offeredPlayerId) {
      offeredIndex = fromTeam.squad.findIndex((s) => s.playerId === trade.offeredPlayerId);
      if (offeredIndex === -1) throw new Error(`${trade.fromTeamId} no longer owns the offered player`);
    }

    let requestedIndex = -1;
    if (trade.requestedPlayerId) {
      requestedIndex = toTeam.squad.findIndex((s) => s.playerId === trade.requestedPlayerId);
      if (requestedIndex === -1) throw new Error(`${trade.toTeamId} no longer owns the requested player`);
    }

    // Overseas check
    const maxOverseas = room.settings.maxOverseas || 8;
    const fromOverseas = fromTeam.squad.filter((s) => s.player.isOverseas).length;
    const toOverseas = toTeam.squad.filter((s) => s.player.isOverseas).length;

    const offeredIsOverseas = offeredIndex >= 0 && fromTeam.squad[offeredIndex].player.isOverseas;
    const reqIsOverseas = requestedIndex >= 0 && toTeam.squad[requestedIndex].player.isOverseas;

    const newFromOverseas = fromOverseas - (offeredIsOverseas ? 1 : 0) + (reqIsOverseas ? 1 : 0);
    const newToOverseas = toOverseas - (reqIsOverseas ? 1 : 0) + (offeredIsOverseas ? 1 : 0);

    if (newFromOverseas > maxOverseas) {
      throw new Error(`${trade.fromTeamId} would exceed overseas limit (${maxOverseas})`);
    }
    if (newToOverseas > maxOverseas) {
      throw new Error(`${trade.toTeamId} would exceed overseas limit (${maxOverseas})`);
    }

    // Squad size check
    const maxSquad = room.settings.maxSquadSize || 25;
    const newFromSquadSize = fromTeam.squad.length - (offeredIndex >= 0 ? 1 : 0) + (requestedIndex >= 0 ? 1 : 0);
    const newToSquadSize = toTeam.squad.length - (requestedIndex >= 0 ? 1 : 0) + (offeredIndex >= 0 ? 1 : 0);

    if (newFromSquadSize > maxSquad) {
      throw new Error(`${trade.fromTeamId} would exceed max squad limit (${maxSquad})`);
    }
    if (newToSquadSize > maxSquad) {
      throw new Error(`${trade.toTeamId} would exceed max squad limit (${maxSquad})`);
    }

    // Execute Player Swaps
    let swappedFromPlayer: TeamSquadEntry | null = null;
    let swappedToPlayer: TeamSquadEntry | null = null;

    if (offeredIndex >= 0) {
      swappedFromPlayer = fromTeam.squad.splice(offeredIndex, 1)[0];
    }
    if (requestedIndex >= 0) {
      swappedToPlayer = toTeam.squad.splice(requestedIndex, 1)[0];
    }

    if (swappedFromPlayer) {
      toTeam.squad.push(swappedFromPlayer);
    }
    if (swappedToPlayer) {
      fromTeam.squad.push(swappedToPlayer);
    }

    // Execute Purse Adjustments
    if (trade.offeredCash > 0 || trade.requestedCash > 0) {
      fromTeam.purseRemaining = Math.round((fromTeam.purseRemaining - trade.offeredCash + trade.requestedCash) * 100) / 100;
      toTeam.purseRemaining = Math.round((toTeam.purseRemaining - trade.requestedCash + trade.offeredCash) * 100) / 100;
      fromTeam.totalSpent = Math.round((fromTeam.totalSpent + trade.offeredCash - trade.requestedCash) * 100) / 100;
      toTeam.totalSpent = Math.round((toTeam.totalSpent + trade.requestedCash - trade.offeredCash) * 100) / 100;
    }

    trade.status = 'ACCEPTED';

    // Remove from transferListings if listed
    if (room.transferListings) {
      room.transferListings = room.transferListings.filter(
        (tl) => tl.player.id !== trade.offeredPlayerId && tl.player.id !== trade.requestedPlayerId
      );
    }

    // Auto-cancel any other pending proposals involving the traded players
    room.trades.forEach((otherTrade) => {
      if (otherTrade.id !== trade.id && otherTrade.status === 'PENDING') {
        const usesTradedPlayer =
          (trade.offeredPlayerId &&
            (otherTrade.offeredPlayerId === trade.offeredPlayerId ||
              otherTrade.requestedPlayerId === trade.offeredPlayerId)) ||
          (trade.requestedPlayerId &&
            (otherTrade.offeredPlayerId === trade.requestedPlayerId ||
              otherTrade.requestedPlayerId === trade.requestedPlayerId));
        if (usesTradedPlayer) {
          otherTrade.status = 'CANCELLED';
        }
      }
    });
  }

  /**
   * Schedules AI bot deliberation and response for trade offers directed at AI teams.
   */
  private scheduleAiTradeEvaluation(
    code: string,
    tradeId: string,
    broadcaster: (eventName: string, payload?: any) => void
  ) {
    setTimeout(async () => {
      try {
        await this.runSerialized(code, async (session) => {
          const room = session.room;
          room.trades = room.trades || [];
          const trade = room.trades.find((t) => t.id === tradeId);
          if (!trade || trade.status !== 'PENDING') return;

          if (!botManager.isBotControlledTeam(room, trade.toTeamId)) return;

          const toTeam = room.teams[trade.toTeamId];
          if (!toTeam) return;

          const teamName = IPL_TEAMS.find((t) => t.id === trade.toTeamId)?.name || trade.toTeamId;
          const decision = botManager.evaluateIncomingTrade(room, trade);

          if (decision.accept) {
            this.executeTradeExchange(room, trade);
            this.addChatMessage(
              room,
              'System',
              `🤖 [${teamName} AI] Accepted trade offer from ${trade.fromTeamId}! Swap completed successfully.`,
              true
            );
            await roomStore.saveRoom(room);
            broadcaster('room:state', room);
            broadcaster('trade:accepted', { trade, room });
          } else {
            trade.status = 'REJECTED';
            trade.reason = decision.reason;
            this.addChatMessage(
              room,
              'System',
              `🤖 [${teamName} AI] Declined trade offer from ${trade.fromTeamId}. ${decision.reason ? `Reason: "${decision.reason}"` : ''}`,
              true
            );
            await roomStore.saveRoom(room);
            broadcaster('room:state', room);
            broadcaster('trade:rejected', { trade, room });
          }
        });
      } catch (err: any) {
        console.error(`Error during AI trade evaluation in room ${code}:`, err);
      }
    }, 2200);
  }

  /**
   * Accept an incoming trade.
   */
  async acceptTrade(
    code: string,
    playerToken: string,
    tradeId: string,
    broadcaster: (eventName: string, payload?: any) => void
  ) {
    return this.runSerialized(code, async (session) => {
      const room = session.room;
      room.trades = room.trades || [];
      const trade = room.trades.find((t) => t.id === tradeId);
      if (!trade || trade.status !== 'PENDING') {
        throw new Error('Trade offer not found or no longer active');
      }

      const player = room.players.find((p) => p.id === playerToken);
      let userTeamId = player?.teamId || Object.keys(room.teams).find((t) => room.teams[t].ownerId === playerToken || room.teams[t].ownerName === player?.name);

      if (userTeamId !== trade.toTeamId && playerToken !== trade.toTeamId && (!player || !player.isHost)) {
        throw new Error('Only the recipient team or host can accept this trade');
      }

      this.executeTradeExchange(room, trade);

      this.addChatMessage(
        room,
        'System',
        `🤝 TRADE COMPLETED! ${trade.fromTeamId} and ${trade.toTeamId} successfully completed exchange!`,
        true
      );

      await roomStore.saveRoom(room);
      broadcaster('room:state', room);
      broadcaster('trade:accepted', { trade, room });
      return trade;
    });
  }

  /**
   * Reject a trade.
   */
  async rejectTrade(
    code: string,
    playerToken: string,
    tradeId: string,
    broadcaster: (eventName: string, payload?: any) => void
  ) {
    return this.runSerialized(code, async (session) => {
      const room = session.room;
      room.trades = room.trades || [];
      const trade = room.trades.find((t) => t.id === tradeId);
      if (!trade) throw new Error('Trade not found');

      const player = room.players.find((p) => p.id === playerToken);
      let userTeamId = player?.teamId || Object.keys(room.teams).find((t) => room.teams[t].ownerId === playerToken || room.teams[t].ownerName === player?.name);

      if (userTeamId !== trade.toTeamId && userTeamId !== trade.fromTeamId && playerToken !== trade.toTeamId && (!player || !player.isHost)) {
        throw new Error('Not authorized to reject this trade');
      }

      trade.status = 'REJECTED';
      this.addChatMessage(room, 'System', `❌ Trade offer rejected between ${trade.fromTeamId} and ${trade.toTeamId}.`, true);

      await roomStore.saveRoom(room);
      broadcaster('room:state', room);
      broadcaster('trade:rejected', { trade, room });
      return trade;
    });
  }

  /**
   * Cancel a trade (by proposer or host).
   */
  async cancelTrade(
    code: string,
    playerToken: string,
    tradeId: string,
    broadcaster: (eventName: string, payload?: any) => void
  ) {
    return this.runSerialized(code, async (session) => {
      const room = session.room;
      room.trades = room.trades || [];
      const trade = room.trades.find((t) => t.id === tradeId);
      if (!trade) throw new Error('Trade not found');

      const player = room.players.find((p) => p.id === playerToken);
      let userTeamId = player?.teamId || Object.keys(room.teams).find((t) => room.teams[t].ownerId === playerToken || room.teams[t].ownerName === player?.name);

      if (userTeamId !== trade.fromTeamId && playerToken !== trade.fromTeamId && (!player || !player.isHost)) {
        throw new Error('Not authorized to cancel this trade');
      }

      trade.status = 'CANCELLED';
      await roomStore.saveRoom(room);
      broadcaster('room:state', room);
      broadcaster('trade:cancelled', { trade, room });
      return trade;
    });
  }

  /**
   * List player on the Exchange / Transfer board.
   */
  async listTransfer(
    code: string,
    playerToken: string,
    data: { playerId: string; askingCash?: number; notes?: string },
    broadcaster: (eventName: string, payload?: any) => void
  ) {
    return this.runSerialized(code, async (session) => {
      const room = session.room;
      const player = room.players.find((p) => p.id === playerToken);
      let userTeamId = player?.teamId || Object.keys(room.teams).find((t) => room.teams[t].ownerId === playerToken || room.teams[t].ownerName === player?.name);
      if (!userTeamId) throw new Error('Must claim a team to list players');

      const team = room.teams[userTeamId];
      const squadEntry = team.squad.find((s) => s.playerId === data.playerId);
      if (!squadEntry) throw new Error('You do not own this player');

      room.transferListings = room.transferListings || [];
      room.transferListings = room.transferListings.filter((tl) => tl.player.id !== data.playerId);

      const listing: TransferListing = {
        id: `tl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        teamId: team.teamId,
        teamName: IPL_TEAMS.find((t) => t.id === team.teamId)?.name || team.teamId,
        ownerName: player ? player.name : team.ownerName || team.teamId,
        player: squadEntry.player,
        buyPrice: squadEntry.buyPrice,
        askingCash: Math.max(0, Number(data.askingCash) || 0),
        notes: data.notes || 'Open for exchange or player swap',
        createdAt: Date.now(),
      };

      room.transferListings.unshift(listing);
      this.addChatMessage(
        room,
        'System',
        `📢 ${team.teamId} listed ${squadEntry.player.name} on the Exchange Window!`,
        true
      );

      await roomStore.saveRoom(room);
      broadcaster('room:state', room);
      broadcaster('exchange:listed', { listing, room });
      return listing;
    });
  }

  /**
   * Remove listing from Exchange / Transfer board.
   */
  async delistTransfer(
    code: string,
    playerToken: string,
    listingId: string,
    broadcaster: (eventName: string, payload?: any) => void
  ) {
    return this.runSerialized(code, async (session) => {
      const room = session.room;
      room.transferListings = room.transferListings || [];
      const item = room.transferListings.find((l) => l.id === listingId);
      if (!item) return;

      const player = room.players.find((p) => p.id === playerToken);
      let userTeamId = player?.teamId || Object.keys(room.teams).find((t) => room.teams[t].ownerId === playerToken || room.teams[t].ownerName === player?.name);

      if (userTeamId !== item.teamId && (!player || !player.isHost)) {
        throw new Error('Not authorized to delist this item');
      }

      room.transferListings = room.transferListings.filter((l) => l.id !== listingId);
      await roomStore.saveRoom(room);
      broadcaster('room:state', room);
      broadcaster('exchange:delisted', { listingId, room });
    });
  }
}

export const auctionEngine = new AuctionEngine();



