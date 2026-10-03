export type PlayerRole = 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER';
export type PlayerSet =
  | 'MARQUEE'
  | 'TIER1_BAT' | 'TIER1_BOWL' | 'TIER1_AL' | 'TIER1_WK'
  | 'TIER2_BAT' | 'TIER2_BOWL' | 'TIER2_AL' | 'TIER2_WK'
  | 'TIER3_BAT' | 'TIER3_BOWL' | 'TIER3_AL' | 'TIER3_WK';
export type AuctionMode = 'MEGA' | 'MINI';
export type AuctionStatus = 'LOBBY' | 'LIVE' | 'PLAYER_ON_BLOCK' | 'SOLD' | 'UNSOLD' | 'NEXT_PLAYER' | 'PAUSED' | 'COMPLETED';

export interface TeamMetadata {
  id: string; // e.g. 'MI', 'CSK'
  name: string; // e.g. 'Mumbai Indians'
  shortName: string; // 'MI'
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  city: string;
}

export interface Player {
  id: string;
  name: string;
  country: string;
  role: PlayerRole;
  isOverseas: boolean;
  basePrice: number; // in Crores, e.g., 2.0, 1.5, 0.50, 0.20
  battingRating: number; // 1-100
  bowlingRating: number; // 1-100
  overallRating: number; // 1-100
  set: PlayerSet;
  retainedByTeamId?: string | null; // For Mini Auction mode
  retainedPrice?: number | null;
}

export type BidIncrementOption = 'DYNAMIC' | '25L' | '50L' | '75L' | '1CR';

export interface RoomSettings {
  bidTimerDuration: number; // in seconds: 5, 10, 15, 20, 30
  bidIncrementOption?: BidIncrementOption; // 'DYNAMIC' | '25L' | '50L' | '75L' | '1CR'
  auctionMode: AuctionMode;
  startingPurse: number; // in Crores, default 120 for Mega, 90 for Mini
  maxSquadSize: number; // default 25
  minSquadSize: number; // default 18
  maxOverseas: number; // default 8
  isPublic: boolean;
  allowAiBots: boolean;
}

export interface RoomPlayer {
  id: string; // socket/client player UUID
  name: string;
  teamId: string | null; // Claimed team code (e.g. 'MI'), null if unassigned
  isHost: boolean;
  isBot: boolean;
  isOnline: boolean;
  joinedAt: number;
}

export interface TeamSquadEntry {
  playerId: string;
  player: Player;
  buyPrice: number; // in Crores
  isRetained: boolean;
}

export interface TeamState {
  teamId: string;
  ownerId: string | null; // RoomPlayer id
  ownerName: string | null;
  isBotOwner: boolean;
  purseRemaining: number;
  totalSpent: number;
  squad: TeamSquadEntry[];
}

export interface BidEvent {
  id: string;
  roomId: string;
  playerId: string;
  teamId: string;
  teamName: string;
  bidderName: string;
  amount: number; // in Crores
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  senderTeamId?: string | null;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface PlayerOnBlockState {
  player: Player;
  currentBid: number;
  highestBidderTeamId: string | null;
  highestBidderName: string | null;
  timerSecondsLeft: number;
  timerEndsAt: number;
  bidHistory: BidEvent[];
}

export interface TradeOffer {
  id: string;
  roomId: string;
  fromTeamId: string;
  fromTeamName: string;
  fromPlayerId: string;
  fromPlayerName: string;
  toTeamId: string;
  toTeamName: string;
  offeredPlayerId?: string | null;
  offeredPlayer?: Player | null;
  offeredCash: number; // in Crores (fromTeam pays toTeam)
  requestedPlayerId?: string | null;
  requestedPlayer?: Player | null;
  requestedCash: number; // in Crores (toTeam pays fromTeam)
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  reason?: string;
  createdAt: number;
}

export interface TransferListing {
  id: string;
  teamId: string;
  teamName: string;
  ownerName: string;
  player: Player;
  buyPrice: number;
  askingCash?: number;
  notes?: string;
  createdAt: number;
}

export interface AcceleratedPoll {
  id: string;
  targetSet?: string | 'CURRENT' | 'ALL';
  targetSetName?: string;
  status: 'VOTING' | 'BALLOT' | 'COMPLETED' | 'REJECTED';
  votes: Record<string, boolean>; // playerId -> true/false
  requiredVotes: number;
  totalOnline: number;
  createdAt: number;
  ballotNominations: Record<string, string[]>; // teamId -> playerIds
  nominatedPlayerIds: string[];
}

export interface RoomSnapshot {
  code: string;
  status: AuctionStatus;
  settings: RoomSettings;
  players: RoomPlayer[];
  teams: Record<string, TeamState>;
  currentPlayerBlock: PlayerOnBlockState | null;
  upcomingPlayerCount: number;
  completedPlayerCount: number;
  chatMessages: ChatMessage[];
  lastActivity: string;
  createdAt: number;
  trades?: TradeOffer[];
  transferListings?: TransferListing[];
  acceleratedPoll?: AcceleratedPoll | null;
  bannedPlayerIds?: string[];
}


export interface PublicRoomSummary {
  code: string;
  hostName: string;
  mode: AuctionMode;
  playerCount: number;
  maxPlayers: number;
  status: AuctionStatus;
  createdAt: number;
}

export interface TeamRatingSummary {
  teamId: string;
  teamName: string;
  ownerName: string;
  totalSpent: number;
  purseRemaining: number;
  squadCount: number;
  overseasCount: number;
  batsmenCount: number;
  bowlersCount: number;
  allRoundersCount: number;
  keepersCount: number;
  overallScore: number;
  starPlayers: string[];
}

