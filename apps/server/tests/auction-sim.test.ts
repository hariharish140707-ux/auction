import { describe, it, expect, beforeAll } from 'vitest';
import { auctionEngine } from '../src/auction-engine';
import { DEFAULT_ROOM_SETTINGS } from '@ipl-auction/shared';

describe('Auction Engine Simulation', () => {
  const roomCode = 'TEST99';

  it('should create room snapshot cleanly', async () => {
    const room = await auctionEngine.createRoom(roomCode, 'host-1', 'Host Alice', DEFAULT_ROOM_SETTINGS);
    expect(room.code).toBe(roomCode);
    expect(room.status).toBe('LOBBY');
    expect(room.players.length).toBe(1);
    expect(Object.keys(room.teams).length).toBe(10);
  });

  it('should start auction and place player on block', async () => {
    const events: any[] = [];
    await auctionEngine.startAuction(roomCode, (evt, payload) => {
      events.push({ evt, payload });
    });

    const session = auctionEngine.getSession(roomCode);
    expect(session).toBeDefined();
    expect(session?.room.status).toBe('PLAYER_ON_BLOCK');
    expect(session?.room.currentPlayerBlock).not.toBeNull();
  });

  it('should accept valid bid and update current bid', async () => {
    const session = auctionEngine.getSession(roomCode)!;
    const initialBid = session.room.currentPlayerBlock!.currentBid;

    await auctionEngine.placeBid(roomCode, 'host-1', 'MI', () => {});

    expect(session.room.currentPlayerBlock!.highestBidderTeamId).toBe('MI');
    expect(session.room.currentPlayerBlock!.currentBid).toBe(initialBid);
  });
});
