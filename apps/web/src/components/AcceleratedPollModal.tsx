'use client';

import React, { useState, useEffect } from 'react';
import { RoomSnapshot, Player, AcceleratedPoll, IPL_TEAMS } from '@ipl-auction/shared';
import { getSocket } from '../lib/socket';
import { TeamBadge } from './TeamBadge';
import {
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Check,
  X,
  Vote,
  ListPlus,
  Send,
  Rocket,
  Sparkles,
  Users,
} from 'lucide-react';

interface AcceleratedPollModalProps {
  room: RoomSnapshot;
  playerId: string;
  code: string;
}

export const AcceleratedPollModal: React.FC<AcceleratedPollModalProps> = ({ room, playerId, code }) => {
  const poll = room.acceleratedPoll;
  const socket = getSocket();

  const me = room.players.find((p) => p.id === playerId);
  const isHost = me?.isHost || false;
  const myTeamId = me?.teamId;

  // Ballot state
  const [upcomingPool, setUpcomingPool] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER'>('ALL');
  const [submittedBallot, setSubmittedBallot] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Fetch upcoming players list when entering ballot phase
  useEffect(() => {
    if (!poll || poll.status !== 'BALLOT') return;

    const handleStats = (data: { upcoming: Player[] }) => {
      setUpcomingPool(data.upcoming || []);
    };

    socket.on('auction:stats', handleStats);
    socket.emit('auction:getStats', { code });

    return () => {
      socket.off('auction:stats', handleStats);
    };
  }, [poll?.status, code]);

  // Reset dismissed state on new poll
  useEffect(() => {
    if (poll?.status === 'VOTING' || poll?.status === 'BALLOT') {
      setIsDismissed(false);
    }
  }, [poll?.id, poll?.status]);

  if (!poll || poll.status === 'COMPLETED' || poll.status === 'REJECTED' || isDismissed) {
    return null;
  }

  const yesVotes = Object.values(poll.votes || {}).filter((v) => v === true).length;
  const totalVotes = Object.keys(poll.votes || {}).length;
  const hasVoted = poll.votes?.[playerId] !== undefined || (myTeamId && poll.votes?.[myTeamId] !== undefined);
  const userVote = poll.votes?.[playerId] ?? (myTeamId ? poll.votes?.[myTeamId] : undefined);

  const handleVote = (accept: boolean) => {
    socket.emit('poll:vote', { code, playerToken: playerId, accept });
  };

  const togglePlayerSelection = (pId: string) => {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(pId)) next.delete(pId);
      else next.add(pId);
      return next;
    });
  };

  const handleSelectAll = (filtered: Player[]) => {
    setSelectedPlayerIds(new Set(filtered.map((p) => p.id)));
  };

  const handleClearAll = () => {
    setSelectedPlayerIds(new Set());
  };

  const handleSubmitBallot = () => {
    socket.emit('ballot:submit', {
      code,
      playerToken: playerId,
      playerIds: Array.from(selectedPlayerIds),
    });
    setSubmittedBallot(true);
  };

  const handleLaunchAccelerated = () => {
    if (isHost) {
      socket.emit('accelerated:launch', { code, playerToken: playerId });
    }
  };

  const filteredUpcoming = upcomingPool.filter((p) => {
    const matchesSet =
      !poll?.targetSet ||
      poll.targetSet === 'ALL' ||
      p.set === poll.targetSet;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.country.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || p.role === roleFilter;
    return matchesSet && matchesSearch && matchesRole;
  });

  // Calculate total unique nominated players across all submitted ballots
  const allNominatedIds = new Set<string>();
  Object.values(poll.ballotNominations || {}).forEach((list) => {
    list.forEach((id) => allNominatedIds.add(id));
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      <div className="bg-[#121620] border border-orange-500/40 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden glow-orange">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-orange-950/40 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-orange-500/20 border border-orange-500/40 text-orange-400">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white tracking-wide">
                  {poll.status === 'VOTING' ? 'Accelerated Auction Poll' : 'Accelerated Auction Ballot'}
                </h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase">
                  {poll.status}
                </span>
                {poll.targetSetName && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-800 text-orange-300 border border-slate-700">
                    {poll.targetSetName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                {poll.status === 'VOTING'
                  ? `Vote to accelerate: ${poll.targetSetName || 'Current Set'}`
                  : `Select players you want from ${poll.targetSetName || 'this set'} — unchosen will be skipped!`}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsDismissed(true)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* PHASE 1: VOTING */}
          {poll.status === 'VOTING' && (
            <div className="space-y-6 py-4">
              <div className="glass-panel p-6 rounded-3xl border border-slate-800 text-center space-y-4 max-w-lg mx-auto">
                <div className="p-4 rounded-full bg-orange-500/10 text-orange-400 w-16 h-16 mx-auto flex items-center justify-center">
                  <Vote className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-white">
                    Start Accelerated Auction for {poll.targetSetName || 'Current Set'}?
                  </h3>
                  <p className="text-xs text-slate-400">
                    If at least <span className="text-orange-400 font-bold">{poll.requiredVotes} of {poll.totalOnline} online players</span> vote YES, all franchises will nominate desired players from this set before bidding resumes.
                  </p>
                </div>

                {/* Quorum Progress Bar */}
                <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold">YES Votes</span>
                    <span className="font-extrabold text-emerald-400">
                      {yesVotes} / {poll.requiredVotes} needed (Total Online: {poll.totalOnline})
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, (yesVotes / poll.requiredVotes) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Voting Buttons or Voted State */}
                {!hasVoted ? (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => handleVote(false)}
                      className="py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all"
                    >
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span>Decline (NO)</span>
                    </button>

                    <button
                      onClick={() => handleVote(true)}
                      className="py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:brightness-110 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg glow-green transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Accept (YES)</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>Your Vote Recorded: {userVote ? 'Accepted (YES)' : 'Declined (NO)'}. Waiting for other players...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PHASE 2: BALLOT NOMINATIONS */}
          {poll.status === 'BALLOT' && (
            <div className="space-y-4">
              {/* Top notification banner */}
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-emerald-200">
                    Poll Passed! Check all players your franchise wants to bid on.
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-extrabold text-white">{allNominatedIds.size} Unique Players</span>
                  <span className="text-[10px] text-slate-400 block">Nominated Room-Wide</span>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search upcoming players by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto">
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
                </div>
              </div>

              {/* Selection Summary & Bulk Actions */}
              <div className="flex items-center justify-between text-xs px-1">
                <span className="font-extrabold text-orange-400">
                  Your Ballot: {selectedPlayerIds.size} Players Selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSelectAll(filteredUpcoming)}
                    className="text-[11px] font-bold text-slate-400 hover:text-white"
                  >
                    Select Filtered ({filteredUpcoming.length})
                  </button>
                  <span>•</span>
                  <button
                    onClick={handleClearAll}
                    className="text-[11px] font-bold text-slate-400 hover:text-white"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Player Grid with Checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                {filteredUpcoming.map((p) => {
                  const isSelected = selectedPlayerIds.has(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlayerSelection(p.id)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all ${
                        isSelected
                          ? 'bg-orange-500/10 border-orange-500/70 shadow-md'
                          : 'bg-[#171B26] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-white truncate">{p.name}</span>
                          {p.isOverseas && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-950/80 text-blue-300 border border-blue-800/80">
                              OS
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {p.role} • Base ₹{p.basePrice.toFixed(2)} Cr
                        </p>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-orange-500 border-orange-500 text-slate-950'
                            : 'bg-slate-900 border-slate-700'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Bottom Actions: Submit Ballot & Launch Accelerated Auction */}
              <div className="space-y-2 pt-3 border-t border-slate-800">
                <button
                  onClick={handleSubmitBallot}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:brightness-110 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {submittedBallot
                      ? `Update Ballot (${selectedPlayerIds.size} Players Nominated)`
                      : `Submit Ballot Nominations (${selectedPlayerIds.size} Players)`}
                  </span>
                </button>

                {isHost && (
                  <button
                    onClick={handleLaunchAccelerated}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:brightness-110 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg glow-orange"
                  >
                    <Rocket className="w-4 h-4" />
                    <span>
                      Launch Accelerated Auction Now ({allNominatedIds.size} Nominated Players Queue)
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
