'use client';

import React, { useState } from 'react';
import { RoomSnapshot, IPL_TEAMS } from '@ipl-auction/shared';
import { TeamBadge } from './TeamBadge';
import { Trophy, Award, DollarSign, Share2, Home, Star, Check, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import Link from 'next/link';

interface ResultsViewProps {
  room: RoomSnapshot;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ room }) => {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [copiedResults, setCopiedResults] = useState(false);

  // Collect all squad purchases to find Most Expensive Buy
  const allPurchases: { player: any; teamId: string; price: number }[] = [];
  Object.values(room.teams).forEach((team) => {
    team.squad.forEach((s) => {
      allPurchases.push({ player: s.player, teamId: team.teamId, price: s.buyPrice });
    });
  });

  allPurchases.sort((a, b) => b.price - a.price);
  const mostExpensive = allPurchases[0] || null;

  // Calculate team scores for leaderboard
  const leaderBoard = Object.values(room.teams).map((team) => {
    const meta = IPL_TEAMS.find((t) => t.id === team.teamId);
    const squad = team.squad;

    const top11Ratings = squad
      .map((s) => s.player.overallRating)
      .sort((a, b) => b - a)
      .slice(0, 11);
    const avgRating = top11Ratings.length > 0 ? top11Ratings.reduce((a, b) => a + b, 0) / top11Ratings.length : 50;
    const completeness = Math.min(1.0, squad.length / room.settings.minSquadSize);
    const score = Math.min(99, Math.round(avgRating * 0.85 * completeness + 10));

    return {
      teamId: team.teamId,
      teamName: meta ? meta.name : team.teamId,
      ownerName: team.ownerName || 'Unassigned',
      totalSpent: team.totalSpent,
      purseRemaining: team.purseRemaining,
      squadCount: squad.length,
      overseasCount: squad.filter((s) => s.player.isOverseas).length,
      score,
      squad,
    };
  });

  leaderBoard.sort((a, b) => b.score - a.score);

  const handleCopySummary = () => {
    const summaryLines = [
      `🏆 IPL SUPER AUCTION RESULTS (Room: ${room.code})`,
      `==========================================`,
      ...leaderBoard.map(
        (t, i) =>
          `#${i + 1} ${t.teamName} (${t.ownerName}) - Rating: ${t.score}/100 | Spent: ₹${t.totalSpent.toFixed(
            2
          )} Cr | Squad: ${t.squadCount}/25`
      ),
      mostExpensive ? `\n⭐ Most Expensive: ${mostExpensive.player.name} -> ${mostExpensive.teamId} for ₹${mostExpensive.price.toFixed(2)} Cr` : '',
    ];

    navigator.clipboard.writeText(summaryLines.join('\n'));
    setCopiedResults(true);
    setTimeout(() => setCopiedResults(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col justify-between p-4 sm:p-8">
      {/* Top Header */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-bold shadow-lg glow-orange">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">Auction Results & Leaderboard</h1>
            <p className="text-xs text-slate-400">Room Code: {room.code}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopySummary}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all"
          >
            {copiedResults ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-orange-400" />}
            <span>{copiedResults ? 'Copied Summary!' : 'Export Results'}</span>
          </button>

          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto w-full my-8 space-y-8">
        {/* Highlights Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {mostExpensive && (
            <div className="glass-panel p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Star className="w-3.5 h-3.5" /> Most Expensive Buy
              </span>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-white">{mostExpensive.player.name}</h3>
                  <p className="text-xs text-slate-400">Bought by {mostExpensive.teamId}</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-amber-400">
                    ₹{mostExpensive.price.toFixed(2)} Cr
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="glass-panel p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" /> Tournament Champion Squad
            </span>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white">{leaderBoard[0]?.teamName}</h3>
                <p className="text-xs text-slate-400">Manager: {leaderBoard[0]?.ownerName}</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-extrabold text-emerald-400">
                  Rating: {leaderBoard[0]?.score}/100
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="glass-panel p-6 rounded-3xl space-y-4 border border-slate-800">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-300">
            Franchise Standings & Squad Score
          </h3>

          <div className="space-y-3">
            {leaderBoard.map((item, index) => {
              const isExpanded = expandedTeam === item.teamId;

              return (
                <div
                  key={item.teamId}
                  className="rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all overflow-hidden"
                >
                  <div
                    onClick={() => setExpandedTeam(isExpanded ? null : item.teamId)}
                    className="p-4 flex flex-wrap items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-extrabold text-base text-slate-500 w-6">#{index + 1}</span>
                      <TeamBadge teamId={item.teamId} size="md" />
                      <div>
                        <h4 className="font-extrabold text-white text-sm">{item.teamName}</h4>
                        <p className="text-xs text-slate-400">Owner: {item.ownerName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Squad / Overseas</span>
                        <span className="font-bold text-slate-200">
                          {item.squadCount}/25 ({item.overseasCount} OS)
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px]">Total Spent</span>
                        <span className="font-bold text-orange-400">₹{item.totalSpent.toFixed(2)} Cr</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px]">Remaining Purse</span>
                        <span className="font-bold text-emerald-400">₹{item.purseRemaining.toFixed(2)} Cr</span>
                      </div>

                      <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 block font-semibold">Squad Rating</span>
                        <span className="font-extrabold text-amber-400 text-sm">{item.score}/100</span>
                      </div>

                      <div className="text-slate-400">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Squad Roster */}
                  {isExpanded && (
                    <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-3">
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Full Squad ({item.squad.length} Players)
                      </h5>
                      {item.squad.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No players purchased.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {item.squad.map((s, sIdx) => (
                            <div
                              key={s.player.id || sIdx}
                              className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-white">{s.player.name}</span>
                                  {s.player.isOverseas && (
                                    <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1 rounded">✈️</span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 block">
                                  {s.player.role} | Rating: <span className="text-amber-400 font-bold">{s.player.overallRating}</span>
                                </span>
                              </div>
                              <span className="font-extrabold text-emerald-400">₹{s.buyPrice.toFixed(2)} Cr</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

