import { Player, TeamState, RoomSettings, PlayerOnBlockState, BidIncrementOption } from './types';
import { MINIMUM_PLAYER_BASE_PRICE } from './constants';

/**
 * Calculates the IPL style bid increment based on current bid price and optional host rule.
 * - '25L': +0.25 Cr (25 Lakhs)
 * - '50L': +0.50 Cr (50 Lakhs)
 * - '75L': +0.75 Cr (75 Lakhs)
 * - '1CR': +1.00 Cr (1.00 Crore)
 * - 'DYNAMIC' / default:
 *   - < 1.00 Cr: +0.20 Cr
 *   - 1.00 Cr to < 2.00 Cr: +0.25 Cr
 *   - 2.00 Cr to < 5.00 Cr: +0.50 Cr
 *   - >= 5.00 Cr: +1.00 Cr
 */
export function calculateBidIncrement(currentPrice: number, option?: BidIncrementOption): number {
  if (option === '25L') return 0.25;
  if (option === '50L') return 0.50;
  if (option === '75L') return 0.75;
  if (option === '1CR') return 1.00;

  // Standard dynamic tiered rules
  const price = Math.round(currentPrice * 100) / 100;
  if (price < 1.00) {
    return 0.20;
  } else if (price < 2.00) {
    return 0.25;
  } else if (price < 5.00) {
    return 0.50;
  } else {
    return 1.00;
  }
}

/**
 * Determines the next valid bid amount for a player currently on the block.
 * If no bid has been placed yet, the starting bid is the player's base price.
 * Otherwise, it is currentBid + increment.
 */
export function getNextBidAmount(playerOnBlock: PlayerOnBlockState, option?: BidIncrementOption): number {
  if (!playerOnBlock.highestBidderTeamId) {
    return playerOnBlock.player.basePrice;
  }
  const increment = calculateBidIncrement(playerOnBlock.currentBid, option);
  const nextAmount = playerOnBlock.currentBid + increment;
  return Math.round(nextAmount * 100) / 100;
}

export interface BidValidationResult {
  valid: boolean;
  reason?: string;
  nextBidAmount: number;
}

/**
 * Validates whether a team can place the next bid on the active player on block.
 */
export function validateBid(
  team: TeamState,
  playerOnBlock: PlayerOnBlockState,
  settings: RoomSettings
): BidValidationResult {
  const nextBidAmount = getNextBidAmount(playerOnBlock, settings.bidIncrementOption);

  // 1. Cannot bid against yourself
  if (playerOnBlock.highestBidderTeamId === team.teamId) {
    return { valid: false, reason: 'Your team is already the highest bidder', nextBidAmount };
  }

  // 2. Max squad limit check
  if (team.squad.length >= settings.maxSquadSize) {
    return {
      valid: false,
      reason: `Maximum squad limit of ${settings.maxSquadSize} players reached`,
      nextBidAmount,
    };
  }

  // 3. Max overseas limit check
  if (playerOnBlock.player.isOverseas) {
    const overseasCount = team.squad.filter((entry) => entry.player.isOverseas).length;
    if (overseasCount >= settings.maxOverseas) {
      return {
        valid: false,
        reason: `Maximum overseas limit of ${settings.maxOverseas} players reached`,
        nextBidAmount,
      };
    }
  }

  // 4. Sufficient purse check
  if (team.purseRemaining < nextBidAmount) {
    return {
      valid: false,
      reason: `Insufficient purse balance (Need ₹${nextBidAmount.toFixed(2)} Cr, Have ₹${team.purseRemaining.toFixed(2)} Cr)`,
      nextBidAmount,
    };
  }

  // 5. Reserve purse check for minimum squad size
  const squadCountAfterBuy = team.squad.length + 1;
  const remainingSlotsNeeded = Math.max(0, settings.minSquadSize - squadCountAfterBuy);
  const reserveNeeded = remainingSlotsNeeded * MINIMUM_PLAYER_BASE_PRICE;
  const purseAfterBid = team.purseRemaining - nextBidAmount;

  if (Math.round(purseAfterBid * 100) / 100 < Math.round(reserveNeeded * 100) / 100) {
    return {
      valid: false,
      reason: `Must reserve at least ₹${reserveNeeded.toFixed(2)} Cr to complete minimum squad size (${settings.minSquadSize} players)`,
      nextBidAmount,
    };
  }

  return { valid: true, nextBidAmount };
}
