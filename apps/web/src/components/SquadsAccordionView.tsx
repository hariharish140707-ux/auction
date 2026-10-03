'use client';

import React, { useState } from 'react';
import { RoomSnapshot, TeamState, IPL_TEAMS, TeamSquadEntry } from '@ipl-auction/shared';
import { TeamBadge } from './TeamBadge';
import {
  ChevronDown,
  ChevronUp,
  Download,
  Share2,
  Check,
  ArrowLeftRight,
  Shield,
  Coins,
  Users,
} from 'lucide-react';

interface SquadsAccordionViewProps {
  room: RoomSnapshot;
  playerId: string;
  onInitiateTrade?: (targetTeamId: string, targetPlayerId?: string) => void;
}

export const SquadsAccordionView: React.FC<SquadsAccordionViewProps> = ({
  room,
  playerId,
  onInitiateTrade,
}) => {
  // Track open accordion IDs
  const [openTeams, setOpenTeams] = useState<Record<string, boolean>>(() => {
    // Open user's own team by default or first team with squad
    const initial: Record<string, boolean> = {};
    const me = room.players.find((p) => p.id === playerId);
    if (me?.teamId) {
      initial[me.teamId] = true;
    } else {
      const firstTeam = Object.keys(room.teams)[0];
      if (firstTeam) initial[firstTeam] = true;
    }
    return initial;
  });

  const [copiedTeam, setCopiedTeam] = useState<string | null>(null);

  const toggleTeam = (teamId: string) => {
    setOpenTeams((prev) => ({
      ...prev,
      [teamId]: !prev[teamId],
    }));
  };

  const handleSaveSquad = (team: TeamState, teamName: string) => {
    const lines = [
      `🏏 ${teamName} (${team.teamId}) Squad Breakdown`,
      `Owner: ${team.ownerName || 'Unassigned'}`,
      `Purse Remaining: ₹${team.purseRemaining.toFixed(2)} Cr`,
      `Total Spent: ₹${team.totalSpent.toFixed(2)} Cr`,
      `Total Players: ${team.squad.length}/25 (Overseas: ${team.squad.filter((s) => s.player.isOverseas).length}/8)`,
      '',
      '--- SQUAD PLAYERS ---',
    ];

    team.squad.forEach((s, idx) => {
      lines.push(
        `${idx + 1}. ${s.player.name} (${s.player.role}${s.player.isOverseas ? ', OS' : ''}) - ₹${s.buyPrice.toFixed(2)} Cr${
          s.isRetained ? ' [Retained]' : ''
        }`
      );
    });

    const squadText = lines.join('\n');
    const blob = new Blob([squadText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${team.teamId}_Squad_${room.code}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShareSquad = (team: TeamState, teamName: string) => {
    const text = `🏆 ${teamName} Squad for IPL Auction (Room ${room.code}):\n${team.squad
      .map((s) => `• ${s.player.name} (₹${s.buyPrice.toFixed(2)} Cr)`)
      .join('\n')}\nPurse Left: ₹${team.purseRemaining.toFixed(2)} Cr`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedTeam(team.teamId);
      setTimeout(() => setCopiedTeam(null), 2000);
    }
  };

  const me = room.players.find((p) => p.id === playerId);
  const myTeamId = me?.teamId;

  return (
    <div className="space-y-3">
      {Object.values(room.teams).map((team) => {
        const isOpen = !!openTeams[team.teamId];
        const meta = IPL_TEAMS.find((t) => t.id === team.teamId);
        const teamName = meta ? meta.name : team.teamId;
        const ownerPlayer = room.players.find((p) => p.teamId === team.teamId);
        const isOnline = ownerPlayer?.isOnline ?? false;
        const overseasCount = team.squad.filter((s) => s.player.isOverseas).length;

        // Group squad by category
        const roleGroups: Record<string, TeamSquadEntry[]> = {
          'ALL-ROUNDER': [],
          'BATSMAN': [],
          'BOWLER': [],
          'WICKET-KEEPER': [],
        };

        team.squad.forEach((s) => {
          let cat = 'BATSMAN';
          if (s.player.role === 'ALL_ROUNDER') cat = 'ALL-ROUNDER';
          else if (s.player.role === 'BOWLER') cat = 'BOWLER';
          else if (s.player.role === 'WICKET_KEEPER') cat = 'WICKET-KEEPER';
          roleGroups[cat].push(s);
        });

        return (
          <div
            key={team.teamId}
            className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
              isOpen
                ? 'bg-[#151923] border-slate-700 shadow-xl'
                : 'bg-[#111520]/90 border-slate-800 hover:border-slate-700/80'
            }`}
          >
            {/* Accordion Header matching Screenshot 2 */}
            <button
              onClick={() => toggleTeam(team.teamId)}
              className="w-full p-3.5 sm:p-4 flex items-center justify-between gap-3 text-left focus:outline-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Online Status Dot */}
                <div className="relative">
                  <span
                    className={`w-2.5 h-2.5 rounded-full block ${
                      isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-600'
                    }`}
                  ></span>
                </div>

                <TeamBadge teamId={team.teamId} size="sm" />

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm sm:text-base text-white truncate">
                      {team.ownerName || 'Unassigned'}
                    </span>
                    {myTeamId === team.teamId && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                    <span>{meta?.city || team.teamId}</span>
                    <span>•</span>
                    <span className="text-slate-300">{team.squad.length} players</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right hidden xs:block">
                  <div className="text-xs font-bold text-emerald-400">₹{team.purseRemaining.toFixed(1)} Cr</div>
                </div>
                <div className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </button>

            {/* Expanded Accordion Body */}
            {isOpen && (
              <div className="px-4 pb-4 pt-1 space-y-4 border-t border-slate-800/80 animate-fade-in">
                {/* Summary Metrics Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">OS:</span>
                    <span className="font-extrabold text-purple-400">{overseasCount}/8</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Purse:</span>
                    <span className="font-extrabold text-emerald-400">₹{team.purseRemaining.toFixed(2)} Cr</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Spent:</span>
                    <span className="font-extrabold text-amber-400">₹{team.totalSpent.toFixed(2)} Cr</span>
                  </div>
                </div>

                {/* Bought Players List */}
                <div className="space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Bought ({team.squad.length})
                  </div>

                  {team.squad.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500 italic bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
                      No players acquired yet.
                    </div>
                  ) : (
                    Object.entries(roleGroups).map(([roleHeading, squadEntries]) => {
                      if (squadEntries.length === 0) return null;
                      return (
                        <div key={roleHeading} className="space-y-1.5">
                          <div className="text-[10px] font-extrabold text-emerald-400 tracking-wider">
                            {roleHeading} ({squadEntries.length})
                          </div>
                          <div className="space-y-1.5">
                            {squadEntries.map((s) => (
                              <div
                                key={s.playerId}
                                className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-all"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-bold text-white truncate">{s.player.name}</span>
                                  {s.player.isOverseas && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-blue-950/80 text-blue-300 rounded border border-blue-800/80">
                                      OS
                                    </span>
                                  )}
                                  {s.isRetained && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-950/80 text-amber-300 rounded border border-amber-800/80">
                                      Retained
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-extrabold text-emerald-400">
                                    ₹{s.buyPrice.toFixed(2)} Cr
                                  </span>

                                  {/* Trade Swap button if viewing another team's player */}
                                  {myTeamId && myTeamId !== team.teamId && onInitiateTrade && (
                                    <button
                                      onClick={() => onInitiateTrade(team.teamId, s.playerId)}
                                      title="Propose Trade / Swap"
                                      className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-white border border-orange-500/30 transition-all text-[10px] font-bold flex items-center gap-1"
                                    >
                                      <ArrowLeftRight className="w-3 h-3" />
                                      <span className="hidden xs:inline">Trade</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Bottom Actions matching screenshot 2 (Save / Share) */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => handleSaveSquad(team, teamName)}
                    className="py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>

                  <button
                    onClick={() => handleShareSquad(team, teamName)}
                    className="py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    {copiedTeam === team.teamId ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
