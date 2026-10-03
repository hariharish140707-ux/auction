export interface PlayerSeedItem {
  id: string;
  name: string;
  country: string;
  role: 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER';
  isOverseas: boolean;
  basePrice: number;
  battingRating: number;
  bowlingRating: number;
  overallRating: number;
  set:
    | 'MARQUEE'
    | 'TIER1_BAT' | 'TIER1_BOWL' | 'TIER1_AL' | 'TIER1_WK'
    | 'TIER2_BAT' | 'TIER2_BOWL' | 'TIER2_AL' | 'TIER2_WK'
    | 'TIER3_BAT' | 'TIER3_BOWL' | 'TIER3_AL' | 'TIER3_WK';
  retainedByTeamId?: string;
  retainedPrice?: number;
}

// ─── MARQUEE ─────────────────────────────────────────────────────────────────
const MARQUEE_PLAYERS: PlayerSeedItem[] = [
  { id: 'p-virat',    name: 'Virat Kohli',         country: 'India',        role: 'BATSMAN',       isOverseas: false, basePrice: 2.0, battingRating: 95, bowlingRating: 30, overallRating: 94, set: 'MARQUEE', retainedByTeamId: 'RCB', retainedPrice: 21.0 },
  { id: 'p-bumrah',   name: 'Jasprit Bumrah',      country: 'India',        role: 'BOWLER',        isOverseas: false, basePrice: 2.0, battingRating: 30, bowlingRating: 98, overallRating: 96, set: 'MARQUEE', retainedByTeamId: 'MI',  retainedPrice: 18.0 },
  { id: 'p-rohit',    name: 'Rohit Sharma',        country: 'India',        role: 'BATSMAN',       isOverseas: false, basePrice: 2.0, battingRating: 92, bowlingRating: 25, overallRating: 90, set: 'MARQUEE', retainedByTeamId: 'MI',  retainedPrice: 16.3 },
  { id: 'p-pant',     name: 'Rishabh Pant',        country: 'India',        role: 'WICKET_KEEPER', isOverseas: false, basePrice: 2.0, battingRating: 91, bowlingRating: 10, overallRating: 91, set: 'MARQUEE' },
  { id: 'p-klaasen',  name: 'Heinrich Klaasen',    country: 'South Africa', role: 'WICKET_KEEPER', isOverseas: true,  basePrice: 2.0, battingRating: 94, bowlingRating: 15, overallRating: 93, set: 'MARQUEE', retainedByTeamId: 'SRH', retainedPrice: 23.0 },
  { id: 'p-pandya',   name: 'Hardik Pandya',       country: 'India',        role: 'ALL_ROUNDER',   isOverseas: false, basePrice: 2.0, battingRating: 88, bowlingRating: 84, overallRating: 90, set: 'MARQUEE', retainedByTeamId: 'MI',  retainedPrice: 16.3 },
  { id: 'p-jadeja',   name: 'Ravindra Jadeja',     country: 'India',        role: 'ALL_ROUNDER',   isOverseas: false, basePrice: 2.0, battingRating: 84, bowlingRating: 88, overallRating: 89, set: 'MARQUEE', retainedByTeamId: 'CSK', retainedPrice: 18.0 },
  { id: 'p-rashid',   name: 'Rashid Khan',         country: 'Afghanistan',  role: 'BOWLER',        isOverseas: true,  basePrice: 2.0, battingRating: 65, bowlingRating: 94, overallRating: 91, set: 'MARQUEE', retainedByTeamId: 'GT',  retainedPrice: 18.0 },
  { id: 'p-pooran',   name: 'Nicholas Pooran',     country: 'West Indies',  role: 'WICKET_KEEPER', isOverseas: true,  basePrice: 2.0, battingRating: 92, bowlingRating: 10, overallRating: 91, set: 'MARQUEE', retainedByTeamId: 'LSG', retainedPrice: 21.0 },
  { id: 'p-cummins',  name: 'Pat Cummins',         country: 'Australia',    role: 'ALL_ROUNDER',   isOverseas: true,  basePrice: 2.0, battingRating: 75, bowlingRating: 92, overallRating: 91, set: 'MARQUEE', retainedByTeamId: 'SRH', retainedPrice: 18.0 },
  { id: 'p-camgreen', name: 'Cameron Green',       country: 'Australia',    role: 'ALL_ROUNDER',   isOverseas: true,  basePrice: 2.0, battingRating: 86, bowlingRating: 82, overallRating: 88, set: 'MARQUEE' },
  { id: 'p-pathirana',name: 'Matheesha Pathirana', country: 'Sri Lanka',    role: 'BOWLER',        isOverseas: true,  basePrice: 2.0, battingRating: 20, bowlingRating: 93, overallRating: 88, set: 'MARQUEE' },
  { id: 'p-starc',    name: 'Mitchell Starc',      country: 'Australia',    role: 'BOWLER',        isOverseas: true,  basePrice: 2.0, battingRating: 40, bowlingRating: 93, overallRating: 90, set: 'MARQUEE' },
  { id: 'p-darylm',   name: 'Daryl Mitchell',      country: 'New Zealand',  role: 'ALL_ROUNDER',   isOverseas: true,  basePrice: 2.0, battingRating: 84, bowlingRating: 72, overallRating: 84, set: 'MARQUEE' },
  { id: 'p-head',     name: 'Travis Head',         country: 'Australia',    role: 'BATSMAN',       isOverseas: true,  basePrice: 2.0, battingRating: 93, bowlingRating: 55, overallRating: 92, set: 'MARQUEE', retainedByTeamId: 'SRH', retainedPrice: 14.0 },
  { id: 'p-harshal',  name: 'Harshal Patel',       country: 'India',        role: 'ALL_ROUNDER',   isOverseas: false, basePrice: 2.0, battingRating: 55, bowlingRating: 87, overallRating: 85, set: 'MARQUEE' },
  { id: 'p-alzarri',  name: 'Alzarri Joseph',      country: 'West Indies',  role: 'BOWLER',        isOverseas: true,  basePrice: 2.0, battingRating: 30, bowlingRating: 89, overallRating: 86, set: 'MARQUEE' },
  { id: 'p-kartiksh', name: 'Kartik Sharma',       country: 'India',        role: 'BATSMAN',       isOverseas: false, basePrice: 0.3, battingRating: 85, bowlingRating: 55, overallRating: 83, set: 'MARQUEE' },
  { id: 'p-prashv',   name: 'Prashant Veer',       country: 'India',        role: 'ALL_ROUNDER',   isOverseas: false, basePrice: 0.3, battingRating: 72, bowlingRating: 80, overallRating: 80, set: 'MARQUEE' },
  { id: 'p-llivingt', name: 'Liam Livingstone',    country: 'England',      role: 'ALL_ROUNDER',   isOverseas: true,  basePrice: 2.0, battingRating: 86, bowlingRating: 74, overallRating: 84, set: 'MARQUEE' },
  { id: 'p-spencerj', name: 'Spencer Johnson',     country: 'Australia',    role: 'BOWLER',        isOverseas: true,  basePrice: 2.0, battingRating: 30, bowlingRating: 87, overallRating: 84, set: 'MARQUEE' },
];

// ─── TIER 1 ───────────────────────────────────────────────────────────────────
const TIER1_BAT: PlayerSeedItem[] = [
  { id: 'p-suryak',   name: 'Suryakumar Yadav',   country: 'India',       role: 'BATSMAN', isOverseas: false, basePrice: 2.0, battingRating: 96, bowlingRating: 20, overallRating: 95, set: 'TIER1_BAT', retainedByTeamId: 'MI',   retainedPrice: 16.3 },
  { id: 'p-gill',     name: 'Shubman Gill',        country: 'India',       role: 'BATSMAN', isOverseas: false, basePrice: 2.0, battingRating: 90, bowlingRating: 20, overallRating: 89, set: 'TIER1_BAT', retainedByTeamId: 'GT',   retainedPrice: 16.5 },
  { id: 'p-jaiswal',  name: 'Yashasvi Jaiswal',    country: 'India',       role: 'BATSMAN', isOverseas: false, basePrice: 2.0, battingRating: 91, bowlingRating: 30, overallRating: 89, set: 'TIER1_BAT', retainedByTeamId: 'RR',   retainedPrice: 18.0 },
  { id: 'p-ruturaj',  name: 'Ruturaj Gaikwad',     country: 'India',       role: 'BATSMAN', isOverseas: false, basePrice: 2.0, battingRating: 89, bowlingRating: 15, overallRating: 88, set: 'TIER1_BAT', retainedByTeamId: 'CSK',  retainedPrice: 18.0 },
  { id: 'p-shreyas',  name: 'Shreyas Iyer',        country: 'India',       role: 'BATSMAN', isOverseas: false, basePrice: 2.0, battingRating: 87, bowlingRating: 30, overallRating: 86, set: 'TIER1_BAT' },
  { id: 'p-rinku',    name: 'Rinku Singh',         country: 'India',       role: 'BATSMAN', isOverseas: false, basePrice: 2.0, battingRating: 88, bowlingRating: 25, overallRating: 87, set: 'TIER1_BAT', retainedByTeamId: 'KKR',  retainedPrice: 13.0 },
  { id: 'p-abhishek', name: 'Abhishek Sharma',     country: 'India',       role: 'BATSMAN', isOverseas: false, basePrice: 2.0, battingRating: 88, bowlingRating: 60, overallRating: 86, set: 'TIER1_BAT', retainedByTeamId: 'SRH',  retainedPrice: 14.0 },
  { id: 'p-tilak',    name: 'Tilak Varma',         country: 'India',       role: 'BATSMAN', isOverseas: false, basePrice: 2.0, battingRating: 86, bowlingRating: 40, overallRating: 85, set: 'TIER1_BAT', retainedByTeamId: 'MI',   retainedPrice: 8.0 },
  { id: 'p-sai',      name: 'Sai Sudharsan',       country: 'India',       role: 'BATSMAN', isOverseas: false, basePrice: 2.0, battingRating: 85, bowlingRating: 10, overallRating: 84, set: 'TIER1_BAT', retainedByTeamId: 'GT',   retainedPrice: 8.5 },
  { id: 'p-samrizvi', name: 'Sameer Rizvi',        country: 'India',       role: 'BATSMAN', isOverseas: false, basePrice: 2.0, battingRating: 84, bowlingRating: 25, overallRating: 83, set: 'TIER1_BAT' },
  { id: 'p-rossouw',  name: 'Rilee Rossouw',       country: 'South Africa',role: 'BATSMAN', isOverseas: true,  basePrice: 2.0, battingRating: 86, bowlingRating: 20, overallRating: 84, set: 'TIER1_BAT' },
  { id: 'p-rovpow',   name: 'Rovman Powell',       country: 'West Indies', role: 'BATSMAN', isOverseas: true,  basePrice: 2.0, battingRating: 84, bowlingRating: 20, overallRating: 82, set: 'TIER1_BAT' },
  { id: 'p-shubdub',  name: 'Shubham Dubey',       country: 'India',       role: 'BATSMAN', isOverseas: false, basePrice: 1.0, battingRating: 83, bowlingRating: 20, overallRating: 81, set: 'TIER1_BAT' },
  { id: 'p-brook',    name: 'Harry Brook',         country: 'England',     role: 'BATSMAN', isOverseas: true,  basePrice: 2.0, battingRating: 85, bowlingRating: 30, overallRating: 83, set: 'TIER1_BAT' },
  { id: 'p-dmiller',  name: 'David Miller',        country: 'South Africa',role: 'BATSMAN', isOverseas: true,  basePrice: 2.0, battingRating: 87, bowlingRating: 15, overallRating: 85, set: 'TIER1_BAT' },
  { id: 'p-rajpat',   name: 'Rajat Patidar',       country: 'India',       role: 'BATSMAN', isOverseas: false, basePrice: 2.0, battingRating: 84, bowlingRating: 10, overallRating: 83, set: 'TIER1_BAT', retainedByTeamId: 'RCB',  retainedPrice: 11.0 },
  { id: 'p-hetmyer',  name: 'Shimron Hetmyer',     country: 'West Indies', role: 'BATSMAN', isOverseas: true,  basePrice: 2.0, battingRating: 83, bowlingRating: 10, overallRating: 82, set: 'TIER1_BAT', retainedByTeamId: 'RR',   retainedPrice: 11.0 },
];

const TIER1_BOWL: PlayerSeedItem[] = [
  { id: 'p-kuldeep',  name: 'Kuldeep Yadav',        country: 'India',       role: 'BOWLER', isOverseas: false, basePrice: 2.0, battingRating: 30, bowlingRating: 92, overallRating: 89, set: 'TIER1_BOWL', retainedByTeamId: 'DC',   retainedPrice: 13.25 },
  { id: 'p-shami',    name: 'Mohammed Shami',       country: 'India',       role: 'BOWLER', isOverseas: false, basePrice: 2.0, battingRating: 25, bowlingRating: 91, overallRating: 88, set: 'TIER1_BOWL' },
  { id: 'p-arshdeep', name: 'Arshdeep Singh',       country: 'India',       role: 'BOWLER', isOverseas: false, basePrice: 2.0, battingRating: 20, bowlingRating: 89, overallRating: 87, set: 'TIER1_BOWL' },
  { id: 'p-siraj',    name: 'Mohammed Siraj',       country: 'India',       role: 'BOWLER', isOverseas: false, basePrice: 2.0, battingRating: 20, bowlingRating: 87, overallRating: 85, set: 'TIER1_BOWL' },
  { id: 'p-boult',    name: 'Trent Boult',          country: 'New Zealand', role: 'BOWLER', isOverseas: true,  basePrice: 2.0, battingRating: 20, bowlingRating: 90, overallRating: 87, set: 'TIER1_BOWL' },
  { id: 'p-rabada',   name: 'Kagiso Rabada',        country: 'South Africa',role: 'BOWLER', isOverseas: true,  basePrice: 2.0, battingRating: 30, bowlingRating: 89, overallRating: 86, set: 'TIER1_BOWL' },
  { id: 'p-chahal',   name: 'Yuzvendra Chahal',     country: 'India',       role: 'BOWLER', isOverseas: false, basePrice: 2.0, battingRating: 15, bowlingRating: 90, overallRating: 87, set: 'TIER1_BOWL' },
  { id: 'p-varun',    name: 'Varun Chakaravarthy',  country: 'India',       role: 'BOWLER', isOverseas: false, basePrice: 2.0, battingRating: 15, bowlingRating: 89, overallRating: 86, set: 'TIER1_BOWL', retainedByTeamId: 'KKR',  retainedPrice: 12.0 },
  { id: 'p-mayankl',  name: 'Mayank Yadav',         country: 'India',       role: 'BOWLER', isOverseas: false, basePrice: 2.0, battingRating: 15, bowlingRating: 87, overallRating: 83, set: 'TIER1_BOWL', retainedByTeamId: 'LSG',  retainedPrice: 11.0 },
  { id: 'p-rbishnoi', name: 'Ravi Bishnoi',         country: 'India',       role: 'BOWLER', isOverseas: false, basePrice: 2.0, battingRating: 20, bowlingRating: 86, overallRating: 84, set: 'TIER1_BOWL' },
  { id: 'p-shivavm',  name: 'Shivam Mavi',          country: 'India',       role: 'BOWLER', isOverseas: false, basePrice: 1.0, battingRating: 30, bowlingRating: 82, overallRating: 80, set: 'TIER1_BOWL' },
  { id: 'p-umesh',    name: 'Umesh Yadav',          country: 'India',       role: 'BOWLER', isOverseas: false, basePrice: 1.0, battingRating: 25, bowlingRating: 83, overallRating: 80, set: 'TIER1_BOWL' },
  { id: 'p-mustafiz', name: 'Mustafizur Rahman',    country: 'Bangladesh',  role: 'BOWLER', isOverseas: true,  basePrice: 2.0, battingRating: 15, bowlingRating: 85, overallRating: 82, set: 'TIER1_BOWL' },
  { id: 'p-jhyerich', name: 'Jhye Richardson',      country: 'Australia',   role: 'BOWLER', isOverseas: true,  basePrice: 2.0, battingRating: 30, bowlingRating: 83, overallRating: 80, set: 'TIER1_BOWL' },
  { id: 'p-nthushara',name: 'Nuwan Thushara',       country: 'Sri Lanka',   role: 'BOWLER', isOverseas: true,  basePrice: 1.5, battingRating: 15, bowlingRating: 82, overallRating: 79, set: 'TIER1_BOWL' },
  { id: 'p-dilmad',   name: 'Dilshan Madushanka',   country: 'Sri Lanka',   role: 'BOWLER', isOverseas: true,  basePrice: 1.5, battingRating: 15, bowlingRating: 81, overallRating: 78, set: 'TIER1_BOWL' },
  { id: 'p-auqibdar', name: 'Auqib Dar',            country: 'India',       role: 'BOWLER', isOverseas: false, basePrice: 0.3, battingRating: 20, bowlingRating: 83, overallRating: 79, set: 'TIER1_BOWL' },
  { id: 'p-akashd',   name: 'Akash Deep',           country: 'India',       role: 'BOWLER', isOverseas: false, basePrice: 1.0, battingRating: 20, bowlingRating: 80, overallRating: 78, set: 'TIER1_BOWL' },
];

const TIER1_AL: PlayerSeedItem[] = [
  { id: 'p-maxwell',  name: 'Glenn Maxwell',      country: 'Australia',   role: 'ALL_ROUNDER', isOverseas: true,  basePrice: 2.0, battingRating: 88, bowlingRating: 80, overallRating: 88, set: 'TIER1_AL' },
  { id: 'p-stoinis',  name: 'Marcus Stoinis',     country: 'Australia',   role: 'ALL_ROUNDER', isOverseas: true,  basePrice: 2.0, battingRating: 85, bowlingRating: 78, overallRating: 84, set: 'TIER1_AL' },
  { id: 'p-axar',     name: 'Axar Patel',         country: 'India',       role: 'ALL_ROUNDER', isOverseas: false, basePrice: 2.0, battingRating: 82, bowlingRating: 87, overallRating: 86, set: 'TIER1_AL', retainedByTeamId: 'DC',   retainedPrice: 16.5 },
  { id: 'p-narine',   name: 'Sunil Narine',       country: 'West Indies', role: 'ALL_ROUNDER', isOverseas: true,  basePrice: 2.0, battingRating: 86, bowlingRating: 89, overallRating: 89, set: 'TIER1_AL', retainedByTeamId: 'KKR',  retainedPrice: 12.0 },
  { id: 'p-russell',  name: 'Andre Russell',      country: 'West Indies', role: 'ALL_ROUNDER', isOverseas: true,  basePrice: 2.0, battingRating: 90, bowlingRating: 81, overallRating: 88, set: 'TIER1_AL', retainedByTeamId: 'KKR',  retainedPrice: 12.0 },
  { id: 'p-shivdube', name: 'Shivam Dube',        country: 'India',       role: 'ALL_ROUNDER', isOverseas: false, basePrice: 2.0, battingRating: 87, bowlingRating: 60, overallRating: 84, set: 'TIER1_AL', retainedByTeamId: 'CSK',  retainedPrice: 12.0 },
  { id: 'p-samcurr',  name: 'Sam Curran',         country: 'England',     role: 'ALL_ROUNDER', isOverseas: true,  basePrice: 2.0, battingRating: 78, bowlingRating: 83, overallRating: 82, set: 'TIER1_AL' },
  { id: 'p-washsund', name: 'Washington Sundar',  country: 'India',       role: 'ALL_ROUNDER', isOverseas: false, basePrice: 2.0, battingRating: 76, bowlingRating: 82, overallRating: 80, set: 'TIER1_AL' },
  { id: 'p-nitish',   name: 'Nitish Kumar Reddy', country: 'India',       role: 'ALL_ROUNDER', isOverseas: false, basePrice: 2.0, battingRating: 81, bowlingRating: 75, overallRating: 80, set: 'TIER1_AL', retainedByTeamId: 'SRH',  retainedPrice: 6.0 },
  { id: 'p-venkiyer', name: 'Venkatesh Iyer',     country: 'India',       role: 'ALL_ROUNDER', isOverseas: false, basePrice: 2.0, battingRating: 82, bowlingRating: 72, overallRating: 80, set: 'TIER1_AL' },
  { id: 'p-jholder',  name: 'Jason Holder',       country: 'West Indies', role: 'ALL_ROUNDER', isOverseas: true,  basePrice: 2.0, battingRating: 74, bowlingRating: 82, overallRating: 82, set: 'TIER1_AL' },
  { id: 'p-gerald',   name: 'Gerald Coetzee',     country: 'South Africa',role: 'ALL_ROUNDER', isOverseas: true,  basePrice: 2.0, battingRating: 45, bowlingRating: 82, overallRating: 79, set: 'TIER1_AL' },
  { id: 'p-woakes',   name: 'Chris Woakes',       country: 'England',     role: 'ALL_ROUNDER', isOverseas: true,  basePrice: 2.0, battingRating: 72, bowlingRating: 83, overallRating: 81, set: 'TIER1_AL' },
  { id: 'p-shardul',  name: 'Shardul Thakur',     country: 'India',       role: 'ALL_ROUNDER', isOverseas: false, basePrice: 2.0, battingRating: 65, bowlingRating: 80, overallRating: 78, set: 'TIER1_AL' },
  { id: 'p-shahrukh', name: 'Shahrukh Khan',      country: 'India',       role: 'ALL_ROUNDER', isOverseas: false, basePrice: 2.0, battingRating: 80, bowlingRating: 55, overallRating: 78, set: 'TIER1_AL' },
];

const TIER1_WK: PlayerSeedItem[] = [
  { id: 'p-buttler',  name: 'Jos Buttler',        country: 'England',      role: 'WICKET_KEEPER', isOverseas: true,  basePrice: 2.0, battingRating: 92, bowlingRating: 10, overallRating: 91, set: 'TIER1_WK' },
  { id: 'p-klrahul',  name: 'KL Rahul',           country: 'India',        role: 'WICKET_KEEPER', isOverseas: false, basePrice: 2.0, battingRating: 88, bowlingRating: 10, overallRating: 87, set: 'TIER1_WK' },
  { id: 'p-ssamson',  name: 'Sanju Samson',       country: 'India',        role: 'WICKET_KEEPER', isOverseas: false, basePrice: 2.0, battingRating: 90, bowlingRating: 10, overallRating: 89, set: 'TIER1_WK', retainedByTeamId: 'RR',   retainedPrice: 18.0 },
  { id: 'p-ishan',    name: 'Ishan Kishan',       country: 'India',        role: 'WICKET_KEEPER', isOverseas: false, basePrice: 2.0, battingRating: 85, bowlingRating: 10, overallRating: 84, set: 'TIER1_WK' },
  { id: 'p-philsalt', name: 'Phil Salt',          country: 'England',      role: 'WICKET_KEEPER', isOverseas: true,  basePrice: 2.0, battingRating: 88, bowlingRating: 10, overallRating: 87, set: 'TIER1_WK' },
  { id: 'p-jinglis',  name: 'Josh Inglis',        country: 'Australia',    role: 'WICKET_KEEPER', isOverseas: true,  basePrice: 2.0, battingRating: 84, bowlingRating: 10, overallRating: 83, set: 'TIER1_WK' },
  { id: 'p-dekock',   name: 'Quinton de Kock',    country: 'South Africa', role: 'WICKET_KEEPER', isOverseas: true,  basePrice: 2.0, battingRating: 88, bowlingRating: 10, overallRating: 87, set: 'TIER1_WK' },
  { id: 'p-kukush',   name: 'Kumar Kushagra',     country: 'India',        role: 'WICKET_KEEPER', isOverseas: false, basePrice: 0.5, battingRating: 80, bowlingRating: 10, overallRating: 78, set: 'TIER1_WK' },
  { id: 'p-dhruv',    name: 'Dhruv Jurel',        country: 'India',        role: 'WICKET_KEEPER', isOverseas: false, basePrice: 2.0, battingRating: 82, bowlingRating: 10, overallRating: 81, set: 'TIER1_WK', retainedByTeamId: 'RR',   retainedPrice: 14.0 },
  { id: 'p-prabhsim', name: 'Prabhsimran Singh',  country: 'India',        role: 'WICKET_KEEPER', isOverseas: false, basePrice: 1.0, battingRating: 80, bowlingRating: 10, overallRating: 79, set: 'TIER1_WK', retainedByTeamId: 'PBKS', retainedPrice: 4.0 },
];

// ─── TIER 2 ───────────────────────────────────────────────────────────────────
const TIER2_BAT: PlayerSeedItem[] = [
  { id: 'p-warner',   name: 'David Warner',       country: 'Australia',   role: 'BATSMAN', isOverseas: true,  basePrice: 2.0, battingRating: 86, bowlingRating: 15, overallRating: 85, set: 'TIER2_BAT' },
  { id: 'p-sruther',  name: 'Sherfane Rutherford',country: 'West Indies', role: 'BATSMAN', isOverseas: true,  basePrice: 1.0, battingRating: 81, bowlingRating: 15, overallRating: 79, set: 'TIER2_BAT' },
  { id: 'p-aturner',  name: 'Ashton Turner',      country: 'Australia',   role: 'BATSMAN', isOverseas: true,  basePrice: 0.75,battingRating: 78, bowlingRating: 20, overallRating: 76, set: 'TIER2_BAT' },
  { id: 'p-finallen', name: 'Finn Allen',         country: 'New Zealand', role: 'BATSMAN', isOverseas: true,  basePrice: 2.0, battingRating: 82, bowlingRating: 10, overallRating: 80, set: 'TIER2_BAT' },
  { id: 'p-duckett',  name: 'Ben Duckett',        country: 'England',     role: 'BATSMAN', isOverseas: true,  basePrice: 2.0, battingRating: 80, bowlingRating: 10, overallRating: 78, set: 'TIER2_BAT' },
  { id: 'p-nissanka', name: 'Pathum Nissanka',    country: 'Sri Lanka',   role: 'BATSMAN', isOverseas: true,  basePrice: 0.75,battingRating: 79, bowlingRating: 15, overallRating: 77, set: 'TIER2_BAT' },
  { id: 'p-mshort',   name: 'Matthew Short',      country: 'Australia',   role: 'BATSMAN', isOverseas: true,  basePrice: 1.5, battingRating: 78, bowlingRating: 30, overallRating: 77, set: 'TIER2_BAT' },
  { id: 'p-racchin',  name: 'Rachin Ravindra',    country: 'New Zealand', role: 'BATSMAN', isOverseas: true,  basePrice: 2.0, battingRating: 82, bowlingRating: 68, overallRating: 80, set: 'TIER2_BAT' },
];

const TIER2_BOWL: PlayerSeedItem[] = [
  { id: 'p-msiddhth', name: 'M. Siddharth',       country: 'India',       role: 'BOWLER', isOverseas: false, basePrice: 0.5, battingRating: 15, bowlingRating: 80, overallRating: 77, set: 'TIER2_BOWL' },
  { id: 'p-mujeeb',   name: 'Mujeeb ur Rahman',   country: 'Afghanistan', role: 'BOWLER', isOverseas: true,  basePrice: 2.0, battingRating: 15, bowlingRating: 84, overallRating: 81, set: 'TIER2_BOWL' },
  { id: 'p-lockie',   name: 'Lockie Ferguson',    country: 'New Zealand', role: 'BOWLER', isOverseas: true,  basePrice: 2.0, battingRating: 20, bowlingRating: 82, overallRating: 79, set: 'TIER2_BOWL' },
  { id: 'p-unadkat',  name: 'Jaydev Unadkat',     country: 'India',       role: 'BOWLER', isOverseas: false, basePrice: 1.0, battingRating: 30, bowlingRating: 79, overallRating: 76, set: 'TIER2_BOWL' },
  { id: 'p-sushantm', name: 'Sushant Mishra',     country: 'India',       role: 'BOWLER', isOverseas: false, basePrice: 0.3, battingRating: 20, bowlingRating: 79, overallRating: 76, set: 'TIER2_BOWL' },
  { id: 'p-yashdayal',name: 'Yash Dayal',         country: 'India',       role: 'BOWLER', isOverseas: false, basePrice: 0.75,battingRating: 20, bowlingRating: 79, overallRating: 76, set: 'TIER2_BOWL' },
  { id: 'p-yashrana', name: 'Harshit Rana',        country: 'India',       role: 'BOWLER', isOverseas: false, basePrice: 0.5, battingRating: 35, bowlingRating: 82, overallRating: 80, set: 'TIER2_BOWL', retainedByTeamId: 'KKR',  retainedPrice: 4.0 },
  { id: 'p-rchahar',  name: 'Rahul Chahar',       country: 'India',       role: 'BOWLER', isOverseas: false, basePrice: 1.0, battingRating: 20, bowlingRating: 80, overallRating: 77, set: 'TIER2_BOWL' },
  { id: 'p-bdwarsh',  name: 'Ben Dwarshuis',      country: 'Australia',   role: 'BOWLER', isOverseas: true,  basePrice: 1.0, battingRating: 25, bowlingRating: 78, overallRating: 75, set: 'TIER2_BOWL' },
  { id: 'p-kjamieson',name: 'Kyle Jamieson',      country: 'New Zealand', role: 'BOWLER', isOverseas: true,  basePrice: 2.0, battingRating: 45, bowlingRating: 81, overallRating: 79, set: 'TIER2_BOWL' },
  { id: 'p-lngidi',   name: 'Lungi Ngidi',        country: 'South Africa',role: 'BOWLER', isOverseas: true,  basePrice: 2.0, battingRating: 20, bowlingRating: 82, overallRating: 79, set: 'TIER2_BOWL' },
  { id: 'p-anortje',  name: 'Anrich Nortje',      country: 'South Africa',role: 'BOWLER', isOverseas: true,  basePrice: 2.0, battingRating: 20, bowlingRating: 84, overallRating: 81, set: 'TIER2_BOWL' },
  { id: 'p-amatt',    name: 'Matt Henry',         country: 'New Zealand', role: 'BOWLER', isOverseas: true,  basePrice: 2.0, battingRating: 25, bowlingRating: 80, overallRating: 78, set: 'TIER2_BOWL' },
  { id: 'p-amilne',   name: 'Adam Milne',         country: 'New Zealand', role: 'BOWLER', isOverseas: true,  basePrice: 2.0, battingRating: 20, bowlingRating: 79, overallRating: 77, set: 'TIER2_BOWL' },
  { id: 'p-jduffy',   name: 'Jacob Duffy',        country: 'New Zealand', role: 'BOWLER', isOverseas: true,  basePrice: 2.0, battingRating: 20, bowlingRating: 78, overallRating: 75, set: 'TIER2_BOWL' },
  { id: 'p-gustkins', name: 'Gus Atkinson',       country: 'England',     role: 'BOWLER', isOverseas: true,  basePrice: 1.0, battingRating: 35, bowlingRating: 80, overallRating: 78, set: 'TIER2_BOWL' },
  { id: 'p-mangesh',  name: 'Mangesh Yadav',      country: 'India',       role: 'BOWLER', isOverseas: false, basePrice: 0.3, battingRating: 15, bowlingRating: 80, overallRating: 77, set: 'TIER2_BOWL' },
];

const TIER2_AL: PlayerSeedItem[] = [
  { id: 'p-whasaranga',name: 'Wanindu Hasaranga', country: 'Sri Lanka',   role: 'ALL_ROUNDER', isOverseas: true,  basePrice: 2.0, battingRating: 70, bowlingRating: 83, overallRating: 82, set: 'TIER2_AL' },
  { id: 'p-dwilley',  name: 'David Willey',       country: 'England',     role: 'ALL_ROUNDER', isOverseas: true,  basePrice: 2.0, battingRating: 70, bowlingRating: 78, overallRating: 77, set: 'TIER2_AL' },
  { id: 'p-mnabi',    name: 'Mohammad Nabi',      country: 'Afghanistan', role: 'ALL_ROUNDER', isOverseas: true,  basePrice: 1.5, battingRating: 72, bowlingRating: 78, overallRating: 77, set: 'TIER2_AL' },
  { id: 'p-tcurran',  name: 'Tom Curran',         country: 'England',     role: 'ALL_ROUNDER', isOverseas: true,  basePrice: 1.5, battingRating: 68, bowlingRating: 77, overallRating: 75, set: 'TIER2_AL' },
  { id: 'p-azomarzai',name: 'Azmatullah Omarzai', country: 'Afghanistan', role: 'ALL_ROUNDER', isOverseas: true,  basePrice: 0.5, battingRating: 72, bowlingRating: 73, overallRating: 74, set: 'TIER2_AL' },
  { id: 'p-akehosein',name: 'Akeal Hosein',       country: 'West Indies', role: 'ALL_ROUNDER', isOverseas: true,  basePrice: 2.0, battingRating: 68, bowlingRating: 78, overallRating: 76, set: 'TIER2_AL' },
  { id: 'p-cconnolly',name: 'Cooper Connolly',    country: 'Australia',   role: 'ALL_ROUNDER', isOverseas: true,  basePrice: 2.0, battingRating: 74, bowlingRating: 72, overallRating: 75, set: 'TIER2_AL' },
  { id: 'p-jedwards', name: 'Jack Edwards',       country: 'England',     role: 'ALL_ROUNDER', isOverseas: true,  basePrice: 0.5, battingRating: 70, bowlingRating: 74, overallRating: 74, set: 'TIER2_AL' },
  { id: 'p-sumitk',   name: 'Sumit Kumar',        country: 'India',       role: 'ALL_ROUNDER', isOverseas: false, basePrice: 1.0, battingRating: 65, bowlingRating: 72, overallRating: 71, set: 'TIER2_AL' },
];

const TIER2_WK: PlayerSeedItem[] = [
  { id: 'p-tstubbs',  name: 'Tristan Stubbs',     country: 'South Africa',role: 'WICKET_KEEPER', isOverseas: true,  basePrice: 1.5, battingRating: 86, bowlingRating: 40, overallRating: 85, set: 'TIER2_WK', retainedByTeamId: 'DC',   retainedPrice: 10.0 },
  { id: 'p-shope',    name: 'Shai Hope',          country: 'West Indies', role: 'WICKET_KEEPER', isOverseas: true,  basePrice: 0.75,battingRating: 79, bowlingRating: 10, overallRating: 77, set: 'TIER2_WK' },
  { id: 'p-robinminz',name: 'Robin Minz',         country: 'India',       role: 'WICKET_KEEPER', isOverseas: false, basePrice: 0.3, battingRating: 76, bowlingRating: 10, overallRating: 74, set: 'TIER2_WK' },
  { id: 'p-tseifert', name: 'Tim Seifert',        country: 'New Zealand', role: 'WICKET_KEEPER', isOverseas: true,  basePrice: 1.5, battingRating: 78, bowlingRating: 10, overallRating: 76, set: 'TIER2_WK' },
  { id: 'p-tbanton',  name: 'Tom Banton',         country: 'England',     role: 'WICKET_KEEPER', isOverseas: true,  basePrice: 2.0, battingRating: 77, bowlingRating: 10, overallRating: 75, set: 'TIER2_WK' },
  { id: 'p-msdhoni',  name: 'MS Dhoni',           country: 'India',       role: 'WICKET_KEEPER', isOverseas: false, basePrice: 2.0, battingRating: 82, bowlingRating: 10, overallRating: 83, set: 'TIER2_WK', retainedByTeamId: 'CSK',  retainedPrice: 4.0 },
];

// ─── TIER 3 ───────────────────────────────────────────────────────────────────
const TIER3_BAT: PlayerSeedItem[] = [
  { id: 'p-shashank', name: 'Shashank Singh',        country: 'India', role: 'BATSMAN', isOverseas: false, basePrice: 0.2, battingRating: 78, bowlingRating: 20, overallRating: 76, set: 'TIER3_BAT' },
  { id: 'p-angkrish', name: 'Angkrish Raghuvanshi',  country: 'India', role: 'BATSMAN', isOverseas: false, basePrice: 0.2, battingRating: 77, bowlingRating: 15, overallRating: 74, set: 'TIER3_BAT' },
  { id: 'p-swastikc', name: 'Swastik Chhikara',      country: 'India', role: 'BATSMAN', isOverseas: false, basePrice: 0.2, battingRating: 72, bowlingRating: 10, overallRating: 70, set: 'TIER3_BAT' },
  { id: 'p-manishp',  name: 'Manish Pandey',         country: 'India', role: 'BATSMAN', isOverseas: false, basePrice: 0.5, battingRating: 76, bowlingRating: 10, overallRating: 74, set: 'TIER3_BAT' },
  { id: 'p-sauravch', name: 'Saurav Chuahan',        country: 'India', role: 'BATSMAN', isOverseas: false, basePrice: 0.2, battingRating: 70, bowlingRating: 10, overallRating: 68, set: 'TIER3_BAT' },
  { id: 'p-pshaw',    name: 'Prithvi Shaw',           country: 'India', role: 'BATSMAN', isOverseas: false, basePrice: 0.75,battingRating: 79, bowlingRating: 10, overallRating: 77, set: 'TIER3_BAT' },
  { id: 'p-rtripathi',name: 'Rahul Tripathi',        country: 'India', role: 'BATSMAN', isOverseas: false, basePrice: 0.75,battingRating: 75, bowlingRating: 10, overallRating: 73, set: 'TIER3_BAT' },
  { id: 'p-sarkhan',  name: 'Sarfaraz Khan',         country: 'India', role: 'BATSMAN', isOverseas: false, basePrice: 0.75,battingRating: 82, bowlingRating: 10, overallRating: 80, set: 'TIER3_BAT' },
  { id: 'p-tejasvis', name: 'Tejasvi Singh',         country: 'India', role: 'BATSMAN', isOverseas: false, basePrice: 0.3, battingRating: 76, bowlingRating: 15, overallRating: 73, set: 'TIER3_BAT' },
  { id: 'p-akshatr',  name: 'Akshat Raghuwanshi',    country: 'India', role: 'BATSMAN', isOverseas: false, basePrice: 0.3, battingRating: 74, bowlingRating: 10, overallRating: 71, set: 'TIER3_BAT' },
  { id: 'p-rickybhui',name: 'Ricky Bhui',            country: 'India', role: 'BATSMAN', isOverseas: false, basePrice: 0.2, battingRating: 70, bowlingRating: 10, overallRating: 68, set: 'TIER3_BAT' },
];

const TIER3_BOWL: PlayerSeedItem[] = [
  { id: 'p-rasikh',   name: 'Rasikh Dar',              country: 'India',        role: 'BOWLER', isOverseas: false, basePrice: 0.2, battingRating: 20, bowlingRating: 74, overallRating: 71, set: 'TIER3_BOWL' },
  { id: 'p-manavs',   name: 'Manav Suthar',            country: 'India',        role: 'BOWLER', isOverseas: false, basePrice: 0.2, battingRating: 15, bowlingRating: 73, overallRating: 70, set: 'TIER3_BOWL' },
  { id: 'p-kartikty', name: 'Kartik Tyagi',            country: 'India',        role: 'BOWLER', isOverseas: false, basePrice: 0.3, battingRating: 15, bowlingRating: 74, overallRating: 71, set: 'TIER3_BOWL' },
  { id: 'p-nburger',  name: 'Nandre Burger',           country: 'South Africa', role: 'BOWLER', isOverseas: true,  basePrice: 0.5, battingRating: 20, bowlingRating: 75, overallRating: 72, set: 'TIER3_BOWL' },
  { id: 'p-chetans',  name: 'Chetan Sakariya',         country: 'India',        role: 'BOWLER', isOverseas: false, basePrice: 0.5, battingRating: 20, bowlingRating: 74, overallRating: 71, set: 'TIER3_BOWL' },
  { id: 'p-sakibhus', name: 'Sakib Hussain',           country: 'India',        role: 'BOWLER', isOverseas: false, basePrice: 0.2, battingRating: 15, bowlingRating: 71, overallRating: 68, set: 'TIER3_BOWL' },
  { id: 'p-jhataved', name: 'Jhathavedh Subramanyan',  country: 'India',        role: 'BOWLER', isOverseas: false, basePrice: 0.2, battingRating: 15, bowlingRating: 71, overallRating: 68, set: 'TIER3_BOWL' },
  { id: 'p-akashsin', name: 'Akash Singh',             country: 'India',        role: 'BOWLER', isOverseas: false, basePrice: 0.2, battingRating: 15, bowlingRating: 70, overallRating: 67, set: 'TIER3_BOWL' },
  { id: 'p-princech', name: 'Prince Choudhary',        country: 'India',        role: 'BOWLER', isOverseas: false, basePrice: 0.2, battingRating: 15, bowlingRating: 70, overallRating: 67, set: 'TIER3_BOWL' },
  { id: 'p-mukul',    name: 'Mukul Choudhary',         country: 'India',        role: 'BOWLER', isOverseas: false, basePrice: 0.3, battingRating: 20, bowlingRating: 76, overallRating: 73, set: 'TIER3_BOWL' },
  { id: 'p-shregopal',name: 'Shreyas Gopal',           country: 'India',        role: 'BOWLER', isOverseas: false, basePrice: 0.2, battingRating: 25, bowlingRating: 74, overallRating: 71, set: 'TIER3_BOWL' },
  { id: 'p-vickyost', name: 'Vicky Ostwal',            country: 'India',        role: 'BOWLER', isOverseas: false, basePrice: 0.3, battingRating: 20, bowlingRating: 73, overallRating: 70, set: 'TIER3_BOWL' },
  { id: 'p-anshulk',  name: 'Anshul Kamboj',           country: 'India',        role: 'BOWLER', isOverseas: false, basePrice: 0.2, battingRating: 25, bowlingRating: 74, overallRating: 71, set: 'TIER3_BOWL' },
  { id: 'p-kuldeepsen',name:'Kuldeep Sen',              country: 'India',        role: 'BOWLER', isOverseas: false, basePrice: 0.75,battingRating: 20, bowlingRating: 74, overallRating: 71, set: 'TIER3_BOWL' },
  { id: 'p-salilaro', name: 'Salil Arora',             country: 'India',        role: 'BOWLER', isOverseas: false, basePrice: 0.3, battingRating: 15, bowlingRating: 71, overallRating: 68, set: 'TIER3_BOWL' },
];

const TIER3_AL: PlayerSeedItem[] = [
  { id: 'p-ramandeep', name: 'Ramandeep Singh',           country: 'India', role: 'ALL_ROUNDER', isOverseas: false, basePrice: 0.2, battingRating: 68, bowlingRating: 65, overallRating: 67, set: 'TIER3_AL' },
  { id: 'p-arshinkulk',name: 'Arshin Kulkarni',           country: 'India', role: 'ALL_ROUNDER', isOverseas: false, basePrice: 0.2, battingRating: 68, bowlingRating: 66, overallRating: 67, set: 'TIER3_AL' },
  { id: 'p-moharshad', name: 'Mohd. Arshad Khan',         country: 'India', role: 'ALL_ROUNDER', isOverseas: false, basePrice: 0.2, battingRating: 62, bowlingRating: 68, overallRating: 66, set: 'TIER3_AL' },
  { id: 'p-shivaliksh',name: 'Shivalik Sharma',           country: 'India', role: 'ALL_ROUNDER', isOverseas: false, basePrice: 0.2, battingRating: 65, bowlingRating: 67, overallRating: 66, set: 'TIER3_AL' },
  { id: 'p-namandhir', name: 'Naman Dhir',                country: 'India', role: 'ALL_ROUNDER', isOverseas: false, basePrice: 0.2, battingRating: 72, bowlingRating: 60, overallRating: 68, set: 'TIER3_AL' },
  { id: 'p-tanaythy',  name: 'Tanay Thyagarajann',        country: 'India', role: 'ALL_ROUNDER', isOverseas: false, basePrice: 0.2, battingRating: 62, bowlingRating: 65, overallRating: 64, set: 'TIER3_AL' },
  { id: 'p-vishwap',   name: 'Vishwanath Pratap Singh',   country: 'India', role: 'ALL_ROUNDER', isOverseas: false, basePrice: 0.2, battingRating: 62, bowlingRating: 65, overallRating: 64, set: 'TIER3_AL' },
  { id: 'p-ashutosh',  name: 'Ashutosh Sharma',           country: 'India', role: 'ALL_ROUNDER', isOverseas: false, basePrice: 0.2, battingRating: 74, bowlingRating: 62, overallRating: 70, set: 'TIER3_AL' },
  { id: 'p-abidmush',  name: 'Abid Mushtaq',              country: 'India', role: 'ALL_ROUNDER', isOverseas: false, basePrice: 0.2, battingRating: 64, bowlingRating: 68, overallRating: 66, set: 'TIER3_AL' },
  { id: 'p-swapnil',   name: 'Swapnil Singh',             country: 'India', role: 'ALL_ROUNDER', isOverseas: false, basePrice: 0.2, battingRating: 65, bowlingRating: 67, overallRating: 66, set: 'TIER3_AL' },
];

const TIER3_WK: PlayerSeedItem[] = [
  { id: 'p-avanaravel',name: 'Avanish Rao Aravelly',country: 'India',   role: 'WICKET_KEEPER', isOverseas: false, basePrice: 0.2, battingRating: 68, bowlingRating: 5, overallRating: 66, set: 'TIER3_WK' },
  { id: 'p-ksbharat',  name: 'K.S. Bharat',         country: 'India',   role: 'WICKET_KEEPER', isOverseas: false, basePrice: 0.5, battingRating: 70, bowlingRating: 5, overallRating: 68, set: 'TIER3_WK' },
  { id: 'p-tkohler',   name: 'Tom Kohler-Cadmore',  country: 'England', role: 'WICKET_KEEPER', isOverseas: true,  basePrice: 0.4, battingRating: 71, bowlingRating: 5, overallRating: 69, set: 'TIER3_WK' },
  { id: 'p-jcox',      name: 'Jordan Cox',          country: 'England', role: 'WICKET_KEEPER', isOverseas: true,  basePrice: 0.75,battingRating: 73, bowlingRating: 5, overallRating: 71, set: 'TIER3_WK' },
];

export const STAR_PLAYERS: PlayerSeedItem[] = [
  ...MARQUEE_PLAYERS,
  ...TIER1_BAT, ...TIER1_BOWL, ...TIER1_AL, ...TIER1_WK,
  ...TIER2_BAT, ...TIER2_BOWL, ...TIER2_AL, ...TIER2_WK,
  ...TIER3_BAT, ...TIER3_BOWL, ...TIER3_AL, ...TIER3_WK,
];

export function build350PlayersDataset(): PlayerSeedItem[] {
  return [...STAR_PLAYERS];
}
