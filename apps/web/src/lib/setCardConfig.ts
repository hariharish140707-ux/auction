export interface SetCardInfo {
  setKey: string;
  title: string;
  shortTitle: string;
  icon: string;
  badgeColor: string;
  bgGradient: string;
  borderColor: string;
  textColor: string;
  description: string;
}

export const SET_CARD_CONFIGS: Record<string, SetCardInfo> = {
  MARQUEE: {
    setKey: 'MARQUEE',
    title: '⭐ MARQUEE SUPERSTARS',
    shortTitle: '⭐ MARQUEE',
    icon: '👑',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    bgGradient: 'from-amber-950/80 via-purple-950/60 to-slate-900',
    borderColor: 'border-amber-500/50',
    textColor: 'text-amber-400',
    description: 'Top 20 Mega Superstars & Franchise Legends',
  },
  TIER1_BAT: {
    setKey: 'TIER1_BAT',
    title: '🏏 TIER 1 — BATTERS',
    shortTitle: '🏏 TIER 1 BAT',
    icon: '🏏',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
    bgGradient: 'from-red-950/80 via-orange-950/60 to-slate-900',
    borderColor: 'border-red-500/50',
    textColor: 'text-red-400',
    description: 'Premier explosive top-order & middle-order batsmen',
  },
  TIER1_AL: {
    setKey: 'TIER1_AL',
    title: '🔥 TIER 1 — ALL-ROUNDERS',
    shortTitle: '🔥 TIER 1 AL',
    icon: '🔥',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    bgGradient: 'from-purple-950/80 via-indigo-950/60 to-slate-900',
    borderColor: 'border-purple-500/50',
    textColor: 'text-purple-400',
    description: 'Elite dual-threat match winners & power hitters',
  },
  TIER1_BOWL: {
    setKey: 'TIER1_BOWL',
    title: '⚡ TIER 1 — BOWLERS',
    shortTitle: '⚡ TIER 1 BOWL',
    icon: '⚡',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    bgGradient: 'from-blue-950/80 via-cyan-950/60 to-slate-900',
    borderColor: 'border-blue-500/50',
    textColor: 'text-blue-400',
    description: 'World-class pace & spin strike bowlers',
  },
  TIER1_WK: {
    setKey: 'TIER1_WK',
    title: '🧤 TIER 1 — KEEPERS',
    shortTitle: '🧤 TIER 1 WK',
    icon: '🧤',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    bgGradient: 'from-amber-950/80 via-slate-900 to-slate-900',
    borderColor: 'border-amber-500/50',
    textColor: 'text-amber-400',
    description: 'Top keeper-batter powerhouses',
  },
  TIER2_BAT: {
    setKey: 'TIER2_BAT',
    title: '🟠 TIER 2 — BATTERS',
    shortTitle: '🟠 TIER 2 BAT',
    icon: '🟠',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    bgGradient: 'from-orange-950/80 via-slate-900 to-slate-900',
    borderColor: 'border-orange-500/50',
    textColor: 'text-orange-400',
    description: 'Proven IPL top & middle order batsmen',
  },
  TIER2_WK: {
    setKey: 'TIER2_WK',
    title: '🧤 TIER 2 — KEEPERS',
    shortTitle: '🧤 TIER 2 WK',
    icon: '🧤',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    bgGradient: 'from-amber-950/80 via-slate-900 to-slate-900',
    borderColor: 'border-amber-500/50',
    textColor: 'text-amber-400',
    description: 'Specialist keepers & power hitting batsmen',
  },
  TIER2_AL: {
    setKey: 'TIER2_AL',
    title: '🟠 TIER 2 — ALL-ROUNDERS',
    shortTitle: '🟠 TIER 2 AL',
    icon: '✨',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    bgGradient: 'from-teal-950/80 via-slate-900 to-slate-900',
    borderColor: 'border-teal-500/50',
    textColor: 'text-teal-400',
    description: 'Dynamic utility pace & spin all-rounders',
  },
  TIER2_BOWL: {
    setKey: 'TIER2_BOWL',
    title: '🟠 TIER 2 — BOWLERS',
    shortTitle: '🟠 TIER 2 BOWL',
    icon: '🎯',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    bgGradient: 'from-rose-950/80 via-slate-900 to-slate-900',
    borderColor: 'border-rose-500/50',
    textColor: 'text-rose-400',
    description: 'Proven strike bowlers & death over specialists',
  },
  TIER3_BAT: {
    setKey: 'TIER3_BAT',
    title: '🟢 TIER 3 — BATTERS',
    shortTitle: '🟢 TIER 3 BAT',
    icon: '🟢',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    bgGradient: 'from-emerald-950/80 via-slate-900 to-slate-900',
    borderColor: 'border-emerald-500/50',
    textColor: 'text-emerald-400',
    description: 'Emerging & uncapped batting talent',
  },
  TIER3_WK: {
    setKey: 'TIER3_WK',
    title: '🟢 TIER 3 — KEEPERS',
    shortTitle: '🟢 TIER 3 WK',
    icon: '🧤',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    bgGradient: 'from-emerald-950/80 via-slate-900 to-slate-900',
    borderColor: 'border-emerald-500/50',
    textColor: 'text-emerald-400',
    description: 'Emerging keeper prospects',
  },
  TIER3_AL: {
    setKey: 'TIER3_AL',
    title: '🟢 TIER 3 — ALL-ROUNDERS',
    shortTitle: '🟢 TIER 3 AL',
    icon: '⚡',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    bgGradient: 'from-emerald-950/80 via-slate-900 to-slate-900',
    borderColor: 'border-emerald-500/50',
    textColor: 'text-emerald-400',
    description: 'Rising young all-rounders',
  },
  TIER3_BOWL: {
    setKey: 'TIER3_BOWL',
    title: '🟢 TIER 3 — BOWLERS',
    shortTitle: '🟢 TIER 3 BOWL',
    icon: '🎯',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    bgGradient: 'from-emerald-950/80 via-slate-900 to-slate-900',
    borderColor: 'border-emerald-500/50',
    textColor: 'text-emerald-400',
    description: 'Emerging pace & spin bowling options',
  },
};

export const DISPLAY_SET_ORDER = [
  'MARQUEE',
  'TIER1_BAT',
  'TIER1_AL',
  'TIER1_BOWL',
  'TIER1_WK',
  'TIER2_BAT',
  'TIER2_WK',
  'TIER2_AL',
  'TIER2_BOWL',
  'TIER3_BAT',
  'TIER3_WK',
  'TIER3_AL',
  'TIER3_BOWL',
];

export function getSetCardInfo(setKey: string): SetCardInfo {
  return (
    SET_CARD_CONFIGS[setKey] || {
      setKey,
      title: `⚡ ${setKey}`,
      shortTitle: setKey,
      icon: '⚡',
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
      bgGradient: 'from-slate-900 to-slate-950',
      borderColor: 'border-slate-700',
      textColor: 'text-slate-300',
      description: 'IPL Auction Set',
    }
  );
}
