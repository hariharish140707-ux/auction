import { calculateBidIncrement, validateBid, getNextBidAmount } from '@ipl-auction/shared';
import { RoomSettings, PlayerOnBlockState, TeamState } from '@ipl-auction/shared';

console.log('🧪 Running IPL Auction Engine Unit Tests...\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

// 1. Increment Logic Tests
console.log('1. Bid Increments');
assert(calculateBidIncrement(0.5) === 0.20, '< 1.0 Cr bracket -> +0.20 Cr');
assert(calculateBidIncrement(0.9) === 0.20, '0.9 Cr -> +0.20 Cr');
assert(calculateBidIncrement(1.0) === 0.25, '1.0 Cr bracket -> +0.25 Cr');
assert(calculateBidIncrement(1.75) === 0.25, '1.75 Cr -> +0.25 Cr');
assert(calculateBidIncrement(2.0) === 0.50, '2.0 Cr bracket -> +0.50 Cr');
assert(calculateBidIncrement(4.5) === 0.50, '4.5 Cr -> +0.50 Cr');
assert(calculateBidIncrement(5.0) === 1.00, '>= 5.0 Cr bracket -> +1.00 Cr');
assert(calculateBidIncrement(12.0) === 1.00, '12.0 Cr -> +1.00 Cr');

// 2. Validation Tests
console.log('\n2. Bid Validation Rules');
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
    name: 'Jasprit Bumrah',
    country: 'India',
    role: 'BOWLER',
    isOverseas: false,
    basePrice: 2.0,
    battingRating: 35,
    bowlingRating: 98,
    overallRating: 96,
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

// First bid test
const res1 = validateBid(dummyTeam, dummyPlayerOnBlock, dummySettings);
assert(res1.valid === true && res1.nextBidAmount === 2.0, 'First bid accepted at base price');

// Self bid test
const selfBlock = { ...dummyPlayerOnBlock, highestBidderTeamId: 'MI' };
const res2 = validateBid(dummyTeam, selfBlock, dummySettings);
assert(res2.valid === false && res2.reason!.includes('highest bidder'), 'Prevents bidding against yourself');

// Insufficient purse test
const poorTeam = { ...dummyTeam, purseRemaining: 1.0 };
const res3 = validateBid(poorTeam, dummyPlayerOnBlock, dummySettings);
assert(res3.valid === false && res3.reason!.includes('Insufficient purse'), 'Rejects bid if purse insufficient');

// Minimum squad reserve rule test
// 18 min squad size. 0 current squad. Need 18 slots. Purchase uses 1. 17 left -> Reserve needed = 17 * 0.20 = 3.40 Cr.
// If team has 5.0 Cr purse and next bid is 2.5 Cr -> remaining = 2.5 Cr < 3.4 Cr -> Reject!
const lowPurseTeam = { ...dummyTeam, purseRemaining: 5.0 };
const activeBlock = { ...dummyPlayerOnBlock, currentBid: 2.0, highestBidderTeamId: 'CSK' };
const res4 = validateBid(lowPurseTeam, activeBlock, dummySettings);
assert(res4.valid === false && res4.reason!.includes('reserve'), 'Enforces minimum squad purse reservation rule');

console.log(`\nResults: ${passed} Passed, ${failed} Failed.`);
if (failed > 0) process.exit(1);
