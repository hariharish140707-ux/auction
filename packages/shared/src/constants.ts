import { TeamMetadata, RoomSettings } from './types';

export const APP_BRAND_NAME = 'IPL Super Auction';

export const IPL_TEAMS: TeamMetadata[] = [
  {
    id: 'MI',
    name: 'Mumbai Indians',
    shortName: 'MI',
    primaryColor: '#004BA0',
    secondaryColor: '#D1AB3E',
    textColor: '#FFFFFF',
    city: 'Mumbai',
  },
  {
    id: 'CSK',
    name: 'Chennai Super Kings',
    shortName: 'CSK',
    primaryColor: '#FDB913',
    secondaryColor: '#0081E9',
    textColor: '#1E293B',
    city: 'Chennai',
  },
  {
    id: 'RCB',
    name: 'Royal Challengers Bengaluru',
    shortName: 'RCB',
    primaryColor: '#EC1C24',
    secondaryColor: '#000000',
    textColor: '#FFFFFF',
    city: 'Bengaluru',
  },
  {
    id: 'KKR',
    name: 'Kolkata Knight Riders',
    shortName: 'KKR',
    primaryColor: '#3A225D',
    secondaryColor: '#F3AD35',
    textColor: '#FFFFFF',
    city: 'Kolkata',
  },
  {
    id: 'DC',
    name: 'Delhi Capitals',
    shortName: 'DC',
    primaryColor: '#000080',
    secondaryColor: '#EF1B23',
    textColor: '#FFFFFF',
    city: 'Delhi',
  },
  {
    id: 'PBKS',
    name: 'Punjab Kings',
    shortName: 'PBKS',
    primaryColor: '#DD1F2D',
    secondaryColor: '#D1AB3E',
    textColor: '#FFFFFF',
    city: 'Mohali',
  },
  {
    id: 'RR',
    name: 'Rajasthan Royals',
    shortName: 'RR',
    primaryColor: '#EA1A85',
    secondaryColor: '#254AA5',
    textColor: '#FFFFFF',
    city: 'Jaipur',
  },
  {
    id: 'SRH',
    name: 'Sunrisers Hyderabad',
    shortName: 'SRH',
    primaryColor: '#F26522',
    secondaryColor: '#000000',
    textColor: '#FFFFFF',
    city: 'Hyderabad',
  },
  {
    id: 'GT',
    name: 'Gujarat Titans',
    shortName: 'GT',
    primaryColor: '#1B2133',
    secondaryColor: '#E3B34C',
    textColor: '#FFFFFF',
    city: 'Ahmedabad',
  },
  {
    id: 'LSG',
    name: 'Lucknow Super Giants',
    shortName: 'LSG',
    primaryColor: '#0057B8',
    secondaryColor: '#FF8200',
    textColor: '#FFFFFF',
    city: 'Lucknow',
  },
];

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  bidTimerDuration: 10,
  auctionMode: 'MEGA',
  startingPurse: 120, // 120 Cr for Mega
  maxSquadSize: 25,
  minSquadSize: 18,
  maxOverseas: 8,
  isPublic: true,
  allowAiBots: false,
};

export const MINI_AUCTION_DEFAULT_PURSE = 90; // 90 Cr base for Mini before retentions

export const MINIMUM_PLAYER_BASE_PRICE = 0.20; // 20 Lakhs = 0.20 Cr

export const SET_ORDER = [
  'MARQUEE',
  'TIER1_BAT', 'TIER1_BOWL', 'TIER1_AL', 'TIER1_WK',
  'TIER2_BAT', 'TIER2_BOWL', 'TIER2_AL', 'TIER2_WK',
  'TIER3_BAT', 'TIER3_BOWL', 'TIER3_AL', 'TIER3_WK',
] as const;
