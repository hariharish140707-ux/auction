import {
  RoomSnapshot,
  validateBid,
  TradeOffer,
  TeamSquadEntry,
  Player,
} from '@ipl-auction/shared';

export interface BotBidAction {
  teamId: string;
  botName: string;
}

export class BotManager {
  /**
   * Check if a franchise team is controlled by an AI bot or unassigned.
   */
  isBotControlledTeam(room: RoomSnapshot, teamId: string): boolean {
    const team = room.teams[teamId];
    if (!team) return false;
    if (team.isBotOwner) return true;
    if (!team.ownerId) {
      // Unassigned team in room functions as AI
      return true;
    }
    const ownerPlayer = room.players.find((p) => p.id === team.ownerId);
    if (ownerPlayer && ownerPlayer.isBot) return true;
    return false;
  }

  /**
   * Calculates a realistic valuation for a player in Crores.
   */
  getPlayerMarketValue(entry: TeamSquadEntry | undefined, player: Player): number {
    const base = player.basePrice || 1.0;
    const rating = player.overallRating || 75;
    const buyPrice = entry ? entry.buyPrice : base;

    // Rating multiplier (75 -> 1.0, 84 -> 1.25, 90 -> 1.44, 95 -> 1.6)
    const ratingMultiplier = Math.pow(Math.max(60, rating) / 75, 2.0);

    // Premium for star players (ratings >= 86)
    const starBonus = rating >= 90 ? 2.5 : rating >= 86 ? 1.0 : 0;

    const valuation = (buyPrice * 0.55) + (base * ratingMultiplier * 0.55) + starBonus;
    return Math.max(0.5, Math.round(valuation * 100) / 100);
  }

  /**
   * Evaluates an incoming trade offer sent to an AI franchise team.
   */
  evaluateIncomingTrade(
    room: RoomSnapshot,
    trade: TradeOffer
  ): { accept: boolean; reason: string } {
    const toTeam = room.teams[trade.toTeamId];
    const fromTeam = room.teams[trade.fromTeamId];
    if (!toTeam || !fromTeam) {
      return { accept: false, reason: 'Invalid teams involved in trade' };
    }

    // 1. Cash limits & purse check
    if (trade.requestedCash > 0) {
      if (toTeam.purseRemaining < trade.requestedCash) {
        return {
          accept: false,
          reason: `Insufficient purse balance (Only ₹${toTeam.purseRemaining.toFixed(2)} Cr remaining)`,
        };
      }
      const remainingSlots = Math.max(0, (room.settings.maxSquadSize || 25) - toTeam.squad.length);
      const minReserve = remainingSlots * 0.2; // Reserve at least 20L per squad vacancy
      if (toTeam.purseRemaining - trade.requestedCash < minReserve) {
        return {
          accept: false,
          reason: `Cannot spend purse needed to fill remaining squad spots`,
        };
      }
    }

    // 2. Squad size limits
    const offeredPlayer =
      trade.offeredPlayer ||
      (trade.offeredPlayerId
        ? fromTeam.squad.find((s) => s.playerId === trade.offeredPlayerId)?.player
        : null);
    const requestedPlayer =
      trade.requestedPlayer ||
      (trade.requestedPlayerId
        ? toTeam.squad.find((s) => s.playerId === trade.requestedPlayerId)?.player
        : null);

    const newToSquadSize =
      toTeam.squad.length - (requestedPlayer ? 1 : 0) + (offeredPlayer ? 1 : 0);
    if (newToSquadSize > (room.settings.maxSquadSize || 25)) {
      return {
        accept: false,
        reason: `Squad size limit reached (Maximum ${room.settings.maxSquadSize || 25} players)`,
      };
    }

    // 3. Overseas player limits (max 8)
    const currentOverseas = toTeam.squad.filter((s) => s.player.isOverseas).length;
    const newOverseas =
      currentOverseas -
      (requestedPlayer?.isOverseas ? 1 : 0) +
      (offeredPlayer?.isOverseas ? 1 : 0);
    const maxOverseas = room.settings.maxOverseasPlayers || 8;
    if (newOverseas > maxOverseas) {
      return {
        accept: false,
        reason: `Overseas player quota reached (Maximum ${maxOverseas} overseas players allowed)`,
      };
    }

    // 4. Valuation Heuristic
    const offeredEntry = trade.offeredPlayerId
      ? fromTeam.squad.find((s) => s.playerId === trade.offeredPlayerId)
      : undefined;
    const requestedEntry = trade.requestedPlayerId
      ? toTeam.squad.find((s) => s.playerId === trade.requestedPlayerId)
      : undefined;

    const valReceived =
      (offeredPlayer ? this.getPlayerMarketValue(offeredEntry, offeredPlayer) : 0) +
      (trade.offeredCash || 0);
    const valGiven =
      (requestedPlayer ? this.getPlayerMarketValue(requestedEntry, requestedPlayer) : 0) +
      (trade.requestedCash || 0);

    // Case A: Selling player for cash only (Bot receives pure cash)
    if (!offeredPlayer && requestedPlayer) {
      const minCashWanted = Math.max(
        this.getPlayerMarketValue(requestedEntry, requestedPlayer),
        (requestedEntry?.buyPrice || requestedPlayer.basePrice) * 1.05
      );
      if ((trade.offeredCash || 0) >= minCashWanted * 0.95) {
        return { accept: true, reason: 'Fair cash valuation' };
      } else {
        const diff = Math.max(
          0.5,
          Math.round((minCashWanted - (trade.offeredCash || 0)) * 10) / 10
        );
        return {
          accept: false,
          reason: `Cash offer too low for ${requestedPlayer.name}. Need at least ₹${diff.toFixed(2)} Cr more`,
        };
      }
    }

    // Case B: Buying player for cash only (Bot pays cash to user)
    if (offeredPlayer && !requestedPlayer) {
      const maxCashToPay = Math.min(
        this.getPlayerMarketValue(offeredEntry, offeredPlayer) * 0.95,
        toTeam.purseRemaining * 0.4
      );
      if ((trade.requestedCash || 0) <= maxCashToPay) {
        return { accept: true, reason: 'Good value squad reinforcement' };
      } else {
        return {
          accept: false,
          reason: `Asking price of ₹${(trade.requestedCash || 0).toFixed(2)} Cr is too high for ${offeredPlayer.name}`,
        };
      }
    }

    // Case C: Player-for-Player swap (with or without cash adjustments)
    // Accept if value received is within 90% of value given
    if (valReceived >= valGiven * 0.9) {
      return { accept: true, reason: 'Mutually beneficial trade deal' };
    } else {
      const deficit = Math.max(
        0.25,
        Math.round((valGiven - valReceived) * 10) / 10
      );
      return {
        accept: false,
        reason: `Offer value is too low. Please add ₹${deficit.toFixed(2)} Cr cash or offer a higher-rated player`,
      };
    }
  }

  /**
   * Evaluates if any AI bot team in the room wants to place a bid on the active player on block.
   */
  evaluateBotBids(room: RoomSnapshot): BotBidAction | null {
    if (!room.currentPlayerBlock) return null;
    const playerBlock = room.currentPlayerBlock;
    const player = playerBlock.player;

    // Find candidate bot teams
    const botTeams = Object.values(room.teams).filter((team) => {
      // Must be owned by bot OR allowAiBots enabled for unassigned teams
      if (!team.ownerId && !room.settings.allowAiBots) return false;
      if (team.ownerId) {
        const ownerPlayer = room.players.find((p) => p.id === team.ownerId);
        if (!ownerPlayer || !ownerPlayer.isBot) return false;
      }
      return true;
    });

    if (botTeams.length === 0) return null;

    // Shuffle candidate bot teams
    const shuffled = [...botTeams].sort(() => Math.random() - 0.5);

    for (const team of shuffled) {
      // Skip if this bot is already highest bidder
      if (playerBlock.highestBidderTeamId === team.teamId) continue;

      const validation = validateBid(team, playerBlock, room.settings);
      if (!validation.valid) continue;

      const nextBid = validation.nextBidAmount;

      // Heuristic valuation (in Crores)
      // Base rating factor: rating 80 -> factor 1.0, rating 95 -> factor 2.2
      const ratingMultiplier = Math.pow(player.overallRating / 75, 2.5);
      let valuation = Math.max(player.basePrice, player.basePrice * ratingMultiplier);

      // Domestic players slightly higher priority if overseas limit close
      const overseasCount = team.squad.filter((s) => s.player.isOverseas).length;
      if (player.isOverseas && overseasCount >= 6) {
        valuation *= 0.8;
      }

      // Caps valuation at team's remaining purse
      valuation = Math.min(valuation, team.purseRemaining * 0.4);

      if (nextBid <= valuation) {
        const ownerPlayer = room.players.find((p) => p.id === team.ownerId);
        return {
          teamId: team.teamId,
          botName: ownerPlayer ? ownerPlayer.name : `${team.teamId} Bot`,
        };
      }
    }

    return null;
  }
}

export const botManager = new BotManager();

