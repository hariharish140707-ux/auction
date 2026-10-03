'use client';

import React, { useState, useEffect } from 'react';
import { Player, TeamRatingSummary, IPL_TEAMS } from '@ipl-auction/shared';
import { getSocket } from '../lib/socket';
import { TeamBadge } from './TeamBadge';
import {
  X,
  Search,
  Users,
  CheckCircle2,
  XCircle,
  Trophy,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';

interface AuctionStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
}

interface SoldItem {
  player: Player;
  teamId: string;
  teamName: string;
  price: number;
  isRetained: boolean;
}

type TabType = 'upcoming' | 'sold' | 'unsold' | 'leaderboard';
type RoleFilterType = 'ALL' | 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER';

export const AuctionStatsModal: React.FC<AuctionStatsModalProps> = ({ isOpen, onClose, code }) => {
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilterType>('ALL');
  const [osOnly, setOsOnly] = useState(false);

  const [upcomingPlayers, setUpcomingPlayers] = useState<Player[]>([]);
  const [soldPlayers, setSoldPlayers] = useState<SoldItem[]>([]);
  const [unsoldPlayers, setUnsoldPlayers] = useState<Player[]>([]);
  const [leaderboard, setLeaderboard] = useState<TeamRatingSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const socket = getSocket();

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    const handleStats = (data: {
      upcoming: Player[];
      sold: SoldItem[];
      unsold: Player[];
      leaderboard: TeamRatingSummary[];
    }) => {
      setUpcomingPlayers(data.upcoming || []);
      setSoldPlayers(data.sold || []);
      setUnsoldPlayers(data.unsold || []);
      setLeaderboard(data.leaderboard || []);
      setLoading(false);
    };

    socket.on('auction:stats', handleStats);
    socket.emit('auction:getStats', { code });

    return () => {
      socket.off('auction:stats', handleStats);
    };
  }, [isOpen, code]);

  if (!isOpen) return null;

  // Filter functions
  const filterPlayer = (p: Player) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.country.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || p.role === roleFilter;
    const matchesOS = !osOnly || p.isOverseas;
    return matchesSearch && matchesRole && matchesOS;
  };

  const filteredUpcoming = upcomingPlayers.filter(filterPlayer);
  const filteredSold = soldPlayers.filter((s) => filterPlayer(s.player));
  const filteredUnsold = unsoldPlayers.filter(filterPlayer);

  // Group upcoming by set name
  const groupedSets: Record<string, Player[]> = {};
  filteredUpcoming.forEach((p) => {
    const setName = p.set || 'GENERAL';
    if (!groupedSets[setName]) groupedSets[setName] = [];
    groupedSets[setName].push(p);
  });

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'ALL_ROUNDER':
        return 'bg-purple-950/80 text-purple-300 border-purple-800/80';
      case 'WICKET_KEEPER':
        return 'bg-amber-950/80 text-amber-300 border-amber-800/80';
      case 'BOWLER':
        return 'bg-red-950/80 text-red-300 border-red-800/80';
      case 'BATSMAN':
      default:
        return 'bg-blue-950/80 text-blue-300 border-blue-800/80';
    }
  };

  const renderUpcomingTab = () => {
    if (filteredUpcoming.length === 0) {
      return (
        <div className="py-16 text-center text-xs text-slate-500">
          No upcoming players match your search / filter.
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {Object.entries(groupedSets).map(([setName, players]) => (
          <div key={setName} className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-400 font-extrabold text-xs border border-amber-500/30 uppercase tracking-wider">
                {setName}
              </span>
              <div className="h-[1px] flex-1 bg-slate-800"></div>
              <span className="text-[11px] font-bold text-slate-400">{players.length} players</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {players.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-2xl bg-[#171B26] border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-3 shadow-md"
                >
                  <div className="space-y-1.5 min-w-0">
                    <h4 className="font-extrabold text-sm text-white truncate">{p.name}</h4>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getRoleBadgeStyle(
                          p.role
                        )}`}
                      >
                        {p.role === 'ALL_ROUNDER'
                          ? 'All-Rounder'
                          : p.role === 'WICKET_KEEPER'
                          ? 'Wicket-Keeper'
                          : p.role}
                      </span>
                      {p.isOverseas && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-800/80 flex items-center gap-1">
                          🌐 OS
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-extrabold text-emerald-400">
                      ₹{p.basePrice.toFixed(2)} Cr
                    </div>
                    <span className="text-[10px] font-bold uppercase text-slate-500">Base</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSoldTab = () => {
    if (filteredSold.length === 0) {
      return <div className="py-16 text-center text-xs text-slate-500">No players sold yet.</div>;
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredSold.map((s) => (
          <div
            key={s.player.id}
            className="p-3.5 rounded-2xl bg-[#171B26] border border-slate-800 flex items-center justify-between gap-3 shadow-md"
          >
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm text-white truncate">{s.player.name}</h4>
                {s.isRetained && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                    RETAINED
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <TeamBadge teamId={s.teamId} size="sm" />
                <span className="text-xs text-slate-300 font-semibold truncate">{s.teamName}</span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-sm font-extrabold text-amber-400">
                ₹{s.price.toFixed(2)} Cr
              </div>
              <span className="text-[10px] font-bold text-slate-500">SOLD</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderUnsoldTab = () => {
    if (filteredUnsold.length === 0) {
      return <div className="py-16 text-center text-xs text-slate-500">No unsold players recorded yet.</div>;
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredUnsold.map((p) => (
          <div
            key={p.id}
            className="p-3.5 rounded-2xl bg-[#171B26] border border-red-950/60 flex items-center justify-between gap-3 shadow-md"
          >
            <div className="space-y-1 min-w-0">
              <h4 className="font-extrabold text-sm text-slate-200 truncate">{p.name}</h4>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900 text-slate-400">
                  {p.role}
                </span>
                {p.isOverseas && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900 text-slate-400">
                    ✈️ {p.country}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs font-bold text-red-400">UNSOLD</div>
              <span className="text-[10px] text-slate-500">Base ₹{p.basePrice.toFixed(2)} Cr</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderLeaderboardTab = () => {
    return (
      <div className="space-y-3">
        {leaderboard.map((item, idx) => (
          <div
            key={item.teamId}
            className="p-4 rounded-2xl bg-[#171B26] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-extrabold text-sm text-orange-400">
                #{idx + 1}
              </div>
              <TeamBadge teamId={item.teamId} size="md" />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-sm text-white">{item.teamName}</h4>
                  <span className="text-xs text-slate-400 font-semibold">({item.ownerName})</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Squad: {item.squadCount}/25 (OS: {item.overseasCount}/8) • Bats: {item.batsmenCount} • Bowl: {item.bowlersCount} • All-R: {item.allRoundersCount}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
              <div className="text-right">
                <div className="text-xs font-bold text-emerald-400">Purse: ₹{item.purseRemaining.toFixed(2)} Cr</div>
                <div className="text-[10px] text-slate-500">Spent: ₹{item.totalSpent.toFixed(2)} Cr</div>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-center">
                <span className="text-[10px] font-bold block uppercase">Rating</span>
                <span className="text-base font-extrabold">{item.overallScore}/100</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      <div className="bg-[#121620] border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-wide">Auction Stats & Sets</h2>
              <p className="text-xs text-slate-400">Inspect upcoming player sets, sold transfers, and team budgets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-4 flex flex-wrap gap-2 border-b border-slate-800/60 bg-[#0F131C]">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
              activeTab === 'upcoming'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <Clock className="w-4 h-4 text-orange-400" />
            <span>Upcoming</span>
            <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-extrabold">
              {upcomingPlayers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('sold')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
              activeTab === 'sold'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Sold</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold">
              {soldPlayers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('unsold')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
              activeTab === 'unsold'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <XCircle className="w-4 h-4 text-red-400" />
            <span>Unsold</span>
            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-extrabold">
              {unsoldPlayers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
              activeTab === 'leaderboard'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Leaderboard</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-extrabold">
              {leaderboard.length}
            </span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        {activeTab !== 'leaderboard' && (
          <div className="p-4 bg-[#0E121A] border-b border-slate-800/80 space-y-3">
            {activeTab === 'upcoming' && (
              <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-800/40 text-purple-300 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Upcoming players will be presented set-by-set during the live auction.</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search player by name or country..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(['ALL', 'BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKET_KEEPER'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                      roleFilter === r
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {r === 'ALL_ROUNDER' ? 'All-Rounder' : r === 'WICKET_KEEPER' ? 'WK' : r}
                  </button>
                ))}

                <button
                  onClick={() => setOsOnly(!osOnly)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap border transition-all ${
                    osOnly
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  ✈️ OS Only
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-400">Loading auction datasets...</p>
            </div>
          ) : activeTab === 'upcoming' ? (
            renderUpcomingTab()
          ) : activeTab === 'sold' ? (
            renderSoldTab()
          ) : activeTab === 'unsold' ? (
            renderUnsoldTab()
          ) : (
            renderLeaderboardTab()
          )}
        </div>
      </div>
    </div>
  );
};
