import { describe, it, expect } from 'vitest';
import { calculateBidIncrement, validateBid, getNextBidAmount } from '@ipl-auction/shared';
import { TeamState, RoomSettings, PlayerOnBlockState } from '@ipl-auction/shared';

describe('IPL Bid Increment Logic', () => {
  it('should calculate correct bid increments for IPL price brackets', () => {
    expect(calculateBidIncrement(0.5)).toBe(0.2);
    expect(calculateBidIncrement(0.9)).toBe(0.2);
    expect(calculateBidIncrement(1.0)).toBe(0.25);
    expect(calculateBidIncrement(1.75)).toBe(0.25);
    expect(calculateBidIncrement(2.0)).toBe(0.5);
    expect(calculateBidIncrement(4.5)).toBe(0.5);
    expect(calculateBidIncrement(5.0)).toBe(1.0);
    expect(calculateBidIncrement(14.5)).toBe(1.0);
  });
});

describe('Bid Validation Rules', () => {
  const dummySettings: RoomSettings = {
    bidTimerDuration: 10,
    auctionMode: 'MEGA',
    startingPurse: 120,
    maxSquadSize: 25,
    minSquadSize: 18,
    maxOverseas: 8,
    isPublic: true,
    allowAiBots: false,
  };

  const dummyPlayerOnBlock: PlayerOnBlockState = {
    player: {
      id: 'p1',
      name: 'Test Star',
      country: 'India',
      role: 'BATSMAN',
      isOverseas: false,
      basePrice: 2.0,
      battingRating: 90,
      bowlingRating: 20,
      overallRating: 88,
      set: 'MARQUEE',
    },
    currentBid: 2.0,
    highestBidderTeamId: null,
    highestBidderName: null,
    timerSecondsLeft: 10,
    timerEndsAt: Date.now() + 10000,
    bidHistory: [],
  };

  const dummyTeam: TeamState = {
    teamId: 'MI',
    ownerId: 'player-1',
    ownerName: 'Alice',
    isBotOwner: false,
    purseRemaining: 120.0,
    totalSpent: 0,
    squad: [],
  };

  it('should allow valid first bid at base price', () => {
    const result = validateBid(dummyTeam, dummyPlayerOnBlock, dummySettings);
    expect(result.valid).toBe(true);
    expect(result.nextBidAmount).toBe(2.0);
  });

  it('should reject bid if team is already the highest bidder', () => {
    const activeBlock = { ...dummyPlayerOnBlock, highestBidderTeamId: 'MI' };
    const result = validateBid(dummyTeam, activeBlock, dummySettings);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('already the highest bidder');
  });

  it('should reject bid if purse is insufficient', () => {
    const poorTeam = { ...dummyTeam, purseRemaining: 1.0 };
    const result = validateBid(poorTeam, dummyPlayerOnBlock, dummySettings);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Insufficient purse balance');
  });

  it('should reject bid if min squad reserve rule would be violated', () => {
    // Need 18 players total. Team has 0. Squad count after buy = 1. Remaining needed = 17.
    // Reserve needed = 17 * 0.20 Cr = 3.40 Cr.
    // If team has 5.0 Cr purse and bids 2.5 Cr -> remaining = 2.5 Cr < 3.4 Cr needed -> Reject!
    const lowPurseTeam = { ...dummyTeam, purseRemaining: 5.0 };
    const highBlock = { ...dummyPlayerOnBlock, currentBid: 2.0, highestBidderTeamId: 'CSK' };
    // next bid = 2.5 Cr. 5.0 - 2.5 = 2.5 Cr left. Reserve needed = 3.4 Cr.
    const result = validateBid(lowPurseTeam, highBlock, dummySettings);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('reserve at least');
  });
});
