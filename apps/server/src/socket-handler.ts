import { Server, Socket } from 'socket.io';
import { roomStore } from './store';
import { auctionEngine } from './auction-engine';
import { RoomSettings, RoomSnapshot, IPL_TEAMS } from '@ipl-auction/shared';

const socketPlayerMap = new Map<string, { code: string; playerToken: string }>();
const playerSocketMap = new Map<string, string>(); // playerToken -> socketId

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    const broadcastRoomState = (code: string, eventName: string, payload?: any) => {
      io.to(code.toUpperCase()).emit(eventName, payload);
    };

    /**
     * Create Room
     */
    socket.on('room:create', async (data: { hostName: string; settings: RoomSettings; playerToken?: string }) => {
      try {
        const code = generateRoomCode();
        const playerId = data.playerToken || `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const room = await auctionEngine.createRoom(code, playerId, data.hostName, data.settings);

        socket.join(code);
        socketPlayerMap.set(socket.id, { code, playerToken: playerId });
        playerSocketMap.set(playerId, socket.id);

        socket.emit('room:created', { code, room, playerId });
        console.log(`🏠 Room ${code} created by ${data.hostName} (ID: ${playerId})`);
      } catch (err: any) {
        socket.emit('error', { message: err.message || 'Failed to create room' });
      }
    });

    /**
     * Join Room
     */
    socket.on(
      'room:join',
      async (data: { code: string; playerToken: string; playerName: string }) => {
        try {
          const code = data.code.toUpperCase();
          const session = auctionEngine.getSession(code);
          const existingRoom = session ? session.room : await roomStore.getRoom(code);

          if (!existingRoom) {
            socket.emit('error', { message: `Room ${code} not found` });
            return;
          }

          // Check if banned
          if (existingRoom.bannedPlayerIds && existingRoom.bannedPlayerIds.includes(data.playerToken)) {
            socket.emit('error', { message: 'You have been removed from this room by the host' });
            return;
          }

          socket.join(code);
          const playerToken = data.playerToken || socket.id;
          socketPlayerMap.set(socket.id, { code, playerToken });
          playerSocketMap.set(playerToken, socket.id);

          // Check if reconnecting existing player or new player
          let player = existingRoom.players.find((p) => p.id === playerToken);
          if (player) {
            // Restore connection
            const wasOffline = !player.isOnline;
            player.isOnline = true;
            if (data.playerName && data.playerName.trim()) {
              player.name = data.playerName.trim();
            }
            if (player.teamId && existingRoom.teams[player.teamId]) {
              existingRoom.teams[player.teamId].ownerName = player.name;
              existingRoom.teams[player.teamId].isBotOwner = false;
            }
            if (wasOffline) {
              auctionEngine.addChatMessage(existingRoom, 'System', `${player.name} reconnected.`, true);
            }
          } else {
            // New joiner
            if (existingRoom.players.length >= 10) {
              socket.emit('error', { message: 'Room is full (10 players max)' });
              return;
            }
            player = {
              id: playerToken,
              name: data.playerName || `Player${Math.floor(Math.random() * 900) + 100}`,
              teamId: null,
              isHost: existingRoom.players.length === 0,
              isBot: false,
              isOnline: true,
              joinedAt: Date.now(),
            };
            existingRoom.players.push(player);
            auctionEngine.addChatMessage(existingRoom, 'System', `${player.name} joined the room.`, true);
          }

          await roomStore.saveRoom(existingRoom);
          socket.emit('room:joined', { room: existingRoom, playerId: player.id });
          io.to(code).emit('room:state', existingRoom);
        } catch (err: any) {
          socket.emit('error', { message: err.message || 'Failed to join room' });
        }
      }
    );

    /**
     * Update Player Name inside Room
     */
    socket.on(
      'player:updateName',
      async (data: { code: string; playerToken: string; newName: string }) => {
        try {
          const code = data.code.toUpperCase();
          await auctionEngine.runSerialized(code, async (session) => {
            const room = session.room;
            const player = room.players.find((p) => p.id === data.playerToken);
            if (!player) throw new Error('Player not found in room');

            const cleanName = (data.newName || '').trim().substring(0, 24);
            if (!cleanName) throw new Error('Name cannot be empty');

            const oldName = player.name;
            if (oldName === cleanName) return;

            player.name = cleanName;

            // Update host name if host
            if (player.isHost) {
              room.hostName = cleanName;
            }

            // Update team owner name if team claimed
            if (player.teamId && room.teams[player.teamId]) {
              room.teams[player.teamId].ownerName = cleanName;
            }

            auctionEngine.addChatMessage(room, 'System', `${oldName} changed their name to ${cleanName}.`, true);
            await roomStore.saveRoom(room);
            io.to(code).emit('room:state', room);
          });
        } catch (err: any) {
          socket.emit('error', { message: err.message || 'Failed to update name' });
        }
      }
    );

    /**
     * Atomic Team Claiming / Unclaiming
     */
    socket.on(
      'team:select',
      async (data: { code: string; playerToken: string; teamId: string | null }) => {
        try {
          const code = data.code.toUpperCase();
          await auctionEngine.runSerialized(code, async (session) => {
            const room = session.room;
            if (room.status !== 'LOBBY') {
              throw new Error('Team selection is locked once auction starts');
            }

            const player = room.players.find((p) => p.id === data.playerToken);
            if (!player) throw new Error('Player not found in room');

            if (data.teamId !== null) {
              // Check atomic team availability
              const existingTeamOwner = room.teams[data.teamId]?.ownerId;
              if (existingTeamOwner && existingTeamOwner !== player.id) {
                throw new Error('This team has already been claimed by another player');
              }

              // Release old team if claimed
              if (player.teamId && room.teams[player.teamId]) {
                room.teams[player.teamId].ownerId = null;
                room.teams[player.teamId].ownerName = null;
                room.teams[player.teamId].isBotOwner = false;
              }

              // Claim new team
              player.teamId = data.teamId;
              room.teams[data.teamId].ownerId = player.id;
              room.teams[data.teamId].ownerName = player.name;
              room.teams[data.teamId].isBotOwner = false;

              const teamMeta = IPL_TEAMS.find((t) => t.id === data.teamId);
              auctionEngine.addChatMessage(
                room,
                'System',
                `${player.name} selected ${teamMeta ? teamMeta.name : data.teamId}.`,
                true
              );
            } else {
              // Unclaim current team
              if (player.teamId && room.teams[player.teamId]) {
                room.teams[player.teamId].ownerId = null;
                room.teams[player.teamId].ownerName = null;
                room.teams[player.teamId].isBotOwner = false;
              }
              player.teamId = null;
            }

            await roomStore.saveRoom(room);
            io.to(code).emit('room:state', room);
          });
        } catch (err: any) {
          socket.emit('error', { message: err.message || 'Team selection failed' });
        }
      }
    );

    /**
     * Settings Update (Host only)
     */
    socket.on(
      'settings:update',
      async (data: { code: string; playerToken: string; settings: RoomSettings }) => {
        try {
          const code = data.code.toUpperCase();
          await auctionEngine.runSerialized(code, async (session) => {
            const room = session.room;
            const player = room.players.find((p) => p.id === data.playerToken);
            if (!player || !player.isHost) {
              throw new Error('Only the room host can update settings');
            }

            room.settings = { ...room.settings, ...data.settings };
            auctionEngine.addChatMessage(room, 'System', 'Host updated room settings.', true);

            await roomStore.saveRoom(room);
            io.to(code).emit('room:state', room);
          });
        } catch (err: any) {
          socket.emit('error', { message: err.message || 'Settings update failed' });
        }
      }
    );

    /**
     * Chat Message Send
     */
    socket.on(
      'chat:send',
      async (data: { code: string; playerToken: string; text: string }) => {
        try {
          const code = data.code.toUpperCase();
          const session = auctionEngine.getSession(code);
          if (!session) return;

          const player = session.room.players.find((p) => p.id === data.playerToken);
          if (!player) return;

          // Basic rate limiting & sanitization
          const cleanText = data.text.trim().substring(0, 300);
          if (!cleanText) return;

          auctionEngine.addChatMessage(session.room, player.name, cleanText, false);
          await roomStore.saveRoom(session.room);
          io.to(code).emit('chat:message', session.room.chatMessages[session.room.chatMessages.length - 1]);
        } catch (err: any) {
          console.error('Chat error:', err);
        }
      }
    );

    /**
     * Start Auction (Host only)
     */
    socket.on('auction:start', async (data: { code: string; playerToken: string }) => {
      try {
        const code = data.code.toUpperCase();
        const session = auctionEngine.getSession(code);
        if (!session) throw new Error('Room not found');

        const player = session.room.players.find((p) => p.id === data.playerToken);
        if (!player || !player.isHost) {
          throw new Error('Only the room host can start the auction');
        }

        await auctionEngine.startAuction(code, (evt, payload) => broadcastRoomState(code, evt, payload));
      } catch (err: any) {
        socket.emit('error', { message: err.message || 'Failed to start auction' });
      }
    });

    /**
     * Place Bid
     */
    socket.on(
      'bid:place',
      async (data: { code: string; playerToken: string; teamId: string }) => {
        try {
          const code = data.code.toUpperCase();
          await auctionEngine.placeBid(code, data.playerToken, data.teamId, (evt, payload) =>
            broadcastRoomState(code, evt, payload)
          );
        } catch (err: any) {
          socket.emit('error', { message: err.message || 'Bid rejected' });
        }
      }
    );

    /**
     * Pause Auction (Host only)
     */
    socket.on('auction:pause', async (data: { code: string; playerToken: string }) => {
      try {
        const code = data.code.toUpperCase();
        await auctionEngine.pauseAuction(code, (evt, payload) => broadcastRoomState(code, evt, payload));
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    /**
     * Resume Auction (Host only)
     */
    socket.on('auction:resume', async (data: { code: string; playerToken: string }) => {
      try {
        const code = data.code.toUpperCase();
        await auctionEngine.resumeAuction(code, (evt, payload) => broadcastRoomState(code, evt, payload));
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    /**
     * Skip Player (Host only)
     */
    socket.on('auction:skip', async (data: { code: string; playerToken: string }) => {
      try {
        const code = data.code.toUpperCase();
        await auctionEngine.skipPlayer(code, (evt, payload) => broadcastRoomState(code, evt, payload));
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    /**
     * Get Auction Stats (Upcoming sets, sold, unsold, leaderboard)
     */
    socket.on('auction:getStats', async (data: { code: string }) => {
      try {
        const code = data.code.toUpperCase();
        const stats = await auctionEngine.getAuctionStats(code);
        socket.emit('auction:stats', stats);
      } catch (err: any) {
        socket.emit('error', { message: err.message || 'Failed to fetch auction stats' });
      }
    });

    /**
     * Propose Trade (Player Swap / Cash Offer)
     */
    socket.on(
      'trade:propose',
      async (data: {
        code: string;
        playerToken: string;
        toTeamId: string;
        offeredPlayerId?: string | null;
        offeredCash?: number;
        requestedPlayerId?: string | null;
        requestedCash?: number;
      }) => {
        try {
          const code = data.code.toUpperCase();
          await auctionEngine.proposeTrade(
            code,
            data.playerToken,
            {
              toTeamId: data.toTeamId,
              offeredPlayerId: data.offeredPlayerId,
              offeredCash: data.offeredCash,
              requestedPlayerId: data.requestedPlayerId,
              requestedCash: data.requestedCash,
            },
            (evt, payload) => broadcastRoomState(code, evt, payload)
          );
        } catch (err: any) {
          socket.emit('error', { message: err.message || 'Trade proposal failed' });
        }
      }
    );

    /**
     * Accept Trade
     */
    socket.on('trade:accept', async (data: { code: string; playerToken: string; tradeId: string }) => {
      try {
        const code = data.code.toUpperCase();
        await auctionEngine.acceptTrade(code, data.playerToken, data.tradeId, (evt, payload) =>
          broadcastRoomState(code, evt, payload)
        );
      } catch (err: any) {
        socket.emit('error', { message: err.message || 'Accept trade failed' });
      }
    });

    /**
     * Reject Trade
     */
    socket.on('trade:reject', async (data: { code: string; playerToken: string; tradeId: string }) => {
      try {
        const code = data.code.toUpperCase();
        await auctionEngine.rejectTrade(code, data.playerToken, data.tradeId, (evt, payload) =>
          broadcastRoomState(code, evt, payload)
        );
      } catch (err: any) {
        socket.emit('error', { message: err.message || 'Reject trade failed' });
      }
    });

    /**
     * Cancel Trade
     */
    socket.on('trade:cancel', async (data: { code: string; playerToken: string; tradeId: string }) => {
      try {
        const code = data.code.toUpperCase();
        await auctionEngine.cancelTrade(code, data.playerToken, data.tradeId, (evt, payload) =>
          broadcastRoomState(code, evt, payload)
        );
      } catch (err: any) {
        socket.emit('error', { message: err.message || 'Cancel trade failed' });
      }
    });

    /**
     * List Player on Exchange Board
     */
    socket.on(
      'exchange:list',
      async (data: {
        code: string;
        playerToken: string;
        playerId: string;
        askingCash?: number;
        notes?: string;
      }) => {
        try {
          const code = data.code.toUpperCase();
          await auctionEngine.listTransfer(
            code,
            data.playerToken,
            { playerId: data.playerId, askingCash: data.askingCash, notes: data.notes },
            (evt, payload) => broadcastRoomState(code, evt, payload)
          );
        } catch (err: any) {
          socket.emit('error', { message: err.message || 'Listing player failed' });
        }
      }
    );

    /**
     * Delist Player from Exchange Board
     */
    socket.on(
      'exchange:delist',
      async (data: { code: string; playerToken: string; listingId: string }) => {
        try {
          const code = data.code.toUpperCase();
          await auctionEngine.delistTransfer(code, data.playerToken, data.listingId, (evt, payload) =>
            broadcastRoomState(code, evt, payload)
          );
        } catch (err: any) {
          socket.emit('error', { message: err.message || 'Delisting player failed' });
        }
      }
    );

    /**
     * Change Timer Duration (Host only, anytime)
     */
    socket.on(
      'timer:change',
      async (data: { code: string; playerToken: string; duration: number }) => {
        try {
          const code = data.code.toUpperCase();
          await auctionEngine.updateTimer(code, data.playerToken, data.duration, (evt, payload) =>
            broadcastRoomState(code, evt, payload)
          );
        } catch (err: any) {
          socket.emit('error', { message: err.message || 'Failed to update timer' });
        }
      }
    );

    /**
     * Change Bid Increment (Host only, anytime)
     */
    socket.on(
      'bid:increment:change',
      async (data: { code: string; playerToken: string; option: any }) => {
        try {
          const code = data.code.toUpperCase();
          await auctionEngine.setBidIncrement(code, data.playerToken, data.option, (evt, payload) =>
            broadcastRoomState(code, evt, payload)
          );
        } catch (err: any) {
          socket.emit('error', { message: err.message || 'Failed to update bid increment' });
        }
      }
    );

    /**
     * Trigger Accelerated Auction Poll (Host only, with optional targetSet)
     */
    socket.on(
      'poll:start',
      async (data: { code: string; playerToken: string; targetSet?: string }) => {
        try {
          const code = data.code.toUpperCase();
          await auctionEngine.startAcceleratedPoll(code, data.playerToken, data.targetSet, (evt, payload) =>
            broadcastRoomState(code, evt, payload)
          );
        } catch (err: any) {
          socket.emit('error', { message: err.message || 'Failed to start accelerated poll' });
        }
      }
    );

    /**
     * Vote on Accelerated Auction Poll (Accept / Decline)
     */
    socket.on(
      'poll:vote',
      async (data: { code: string; playerToken: string; accept: boolean }) => {
        try {
          const code = data.code.toUpperCase();
          await auctionEngine.voteAcceleratedPoll(code, data.playerToken, data.accept, (evt, payload) =>
            broadcastRoomState(code, evt, payload)
          );
        } catch (err: any) {
          socket.emit('error', { message: err.message || 'Failed to record vote' });
        }
      }
    );

    /**
     * Submit Ballot Nominations for Accelerated Auction
     */
    socket.on(
      'ballot:submit',
      async (data: { code: string; playerToken: string; playerIds: string[] }) => {
        try {
          const code = data.code.toUpperCase();
          await auctionEngine.submitBallotNominations(
            code,
            data.playerToken,
            data.playerIds,
            (evt, payload) => broadcastRoomState(code, evt, payload)
          );
        } catch (err: any) {
          socket.emit('error', { message: err.message || 'Failed to submit ballot nominations' });
        }
      }
    );

    /**
     * Launch Accelerated Auction with Nominated Players (Host only)
     */
    socket.on('accelerated:launch', async (data: { code: string; playerToken: string }) => {
      try {
        const code = data.code.toUpperCase();
        await auctionEngine.launchAcceleratedAuction(code, data.playerToken, (evt, payload) =>
          broadcastRoomState(code, evt, payload)
        );
      } catch (err: any) {
        socket.emit('error', { message: err.message || 'Failed to launch accelerated auction' });
      }
    });

    /**
     * Kick / Remove Player (Host only)
     */
    socket.on(
      'room:kick',
      async (data: { code: string; playerToken: string; targetPlayerId: string }) => {
        try {
          const code = data.code.toUpperCase();
          const targetPlayerId = data.targetPlayerId;

          await auctionEngine.kickPlayer(
            code,
            data.playerToken,
            targetPlayerId,
            (evt, payload) => broadcastRoomState(code, evt, payload)
          );

          // If target player is currently connected, notify and disconnect them
          const targetSocketId = playerSocketMap.get(targetPlayerId);
          if (targetSocketId) {
            io.to(targetSocketId).emit('player:kicked', {
              message: 'You have been removed from the room by the host.',
            });
            const targetSocket = io.sockets.sockets.get(targetSocketId);
            if (targetSocket) {
              targetSocket.leave(code);
            }
            socketPlayerMap.delete(targetSocketId);
            playerSocketMap.delete(targetPlayerId);
          }
        } catch (err: any) {
          socket.emit('error', { message: err.message || 'Failed to remove player' });
        }
      }
    );

    socket.on('disconnect', async () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      const mapping = socketPlayerMap.get(socket.id);
      if (mapping) {
        const { code, playerToken } = mapping;
        socketPlayerMap.delete(socket.id);
        if (playerSocketMap.get(playerToken) === socket.id) {
          playerSocketMap.delete(playerToken);
        }

        try {
          const session = auctionEngine.getSession(code);
          const room = session ? session.room : await roomStore.getRoom(code);
          if (room) {
            const player = room.players.find((p) => p.id === playerToken);
            if (player) {
              player.isOnline = false;
              await roomStore.saveRoom(room);
              io.to(code).emit('room:state', room);
            }
          }
        } catch (err) {
          console.error('Error handling disconnect:', err);
        }
      }
    });


  });
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
