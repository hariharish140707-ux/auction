'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { APP_BRAND_NAME, IPL_TEAMS, AuctionMode, DEFAULT_ROOM_SETTINGS } from '@ipl-auction/shared';
import { TeamBadge } from './TeamBadge';
import { getSocket } from '../lib/socket';
import { Users, History, Trophy, Plus, ArrowRight, Trash2, Coffee, Globe, Share2, MessageSquare } from 'lucide-react';

interface RecentRoom {
  code: string;
  date: string;
  mode: AuctionMode;
  teamId: string;
}

export const HomeView: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'new' | 'recent'>('new');
  const [sport, setSport] = useState<'cricket' | 'football'>('cricket');
  const [userName, setUserName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('MI');
  const [mode, setMode] = useState<AuctionMode>('MEGA');
  const [isPublic, setIsPublic] = useState(true);
  const [allowAiBots, setAllowAiBots] = useState(false);
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
  const [publicRooms, setPublicRooms] = useState<any[]>([]);
  const [showPublicModal, setShowPublicModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showAdSlot, setShowAdSlot] = useState(false); // Ad slot optional & off by default

  useEffect(() => {
    // Load persisted user name & recent history from localStorage
    const savedName = localStorage.getItem('ipl_auction_user_name');
    if (savedName) setUserName(savedName);
    else setUserName(`Player${Math.floor(Math.random() * 900) + 100}`);

    const savedRecent = localStorage.getItem('ipl_auction_recent_rooms');
    if (savedRecent) {
      try {
        setRecentRooms(JSON.parse(savedRecent));
      } catch (e) {}
    }

    fetchPublicRooms();
  }, []);

  const fetchPublicRooms = async () => {
    try {
      const res = await fetch('/api/rooms/public');
      const data = await res.json();
      if (data.success) {
        setPublicRooms(data.rooms || []);
      }
    } catch (err) {}
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUserName(val);
    localStorage.setItem('ipl_auction_user_name', val);
  };

  const handleCreateRoom = () => {
    if (!userName.trim()) return;
    setIsCreating(true);

    const socket = getSocket();
    const settings = {
      ...DEFAULT_ROOM_SETTINGS,
      auctionMode: mode,
      startingPurse: mode === 'MEGA' ? 120 : 90,
      isPublic,
      allowAiBots,
    };

    const timer = setTimeout(() => {
      setIsCreating(false);
    }, 8000);

    const handleError = (err: { message: string }) => {
      clearTimeout(timer);
      setIsCreating(false);
      alert(err.message || 'Failed to create room');
      socket.off('error', handleError);
    };

    let token = localStorage.getItem('ipl_auction_player_token');
    if (!token) {
      token = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem('ipl_auction_player_token', token);
    }

    socket.emit('room:create', { hostName: userName.trim(), settings, playerToken: token });

    socket.once('room:created', (data: { code: string; room: any; playerId: string }) => {
      clearTimeout(timer);
      socket.off('error', handleError);

      // Save to recent rooms
      const newRecentItem: RecentRoom = {
        code: data.code,
        date: new Date().toLocaleDateString(),
        mode,
        teamId: selectedTeam,
      };
      const updatedRecent = [newRecentItem, ...recentRooms.filter((r) => r.code !== data.code)].slice(0, 10);
      setRecentRooms(updatedRecent);
      localStorage.setItem('ipl_auction_recent_rooms', JSON.stringify(updatedRecent));
      localStorage.setItem(`ipl_room_${data.code}_token`, data.playerId);
      localStorage.setItem(`ipl_room_${data.code}_team`, selectedTeam);

      router.push(`/room/${data.code}`);
    });
  };

  const handleRejoinRoom = (code: string, teamId: string) => {
    if (!userName.trim()) return;
    localStorage.setItem(`ipl_room_${code}_team`, teamId);
    router.push(`/room/${code}`);
  };

  const clearHistory = () => {
    setRecentRooms([]);
    localStorage.removeItem('ipl_auction_recent_rooms');
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* Top Navbar */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg glow-orange">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent">
              {APP_BRAND_NAME}
            </h1>
            <p className="text-xs text-slate-400">Real-time Multiplayer Cricket Auction</p>
          </div>
        </div>

        <button
          onClick={() => {
            fetchPublicRooms();
            setShowPublicModal(true);
          }}
          className="relative px-3.5 py-2 rounded-xl glass-panel text-xs font-semibold hover:border-orange-500/50 flex items-center gap-2 transition-all"
        >
          <Globe className="w-4 h-4 text-orange-400" />
          <span>Browse Rooms</span>
          {publicRooms.length > 0 && (
            <span className="ml-1 bg-orange-500 text-white font-bold px-2 py-0.5 rounded-full text-[10px]">
              {publicRooms.length}
            </span>
          )}
        </button>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full my-8">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mb-6 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800/80 w-fit mx-auto">
          <button
            onClick={() => setActiveTab('new')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'new'
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg glow-orange'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>New Game</span>
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'recent'
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg glow-orange'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Recent ({recentRooms.length})</span>
          </button>
        </div>

        {/* Tab 1: New Game */}
        {activeTab === 'new' && (
          <div className="glass-panel p-6 sm:p-8 rounded-3xl space-y-6 shadow-2xl border border-slate-800">
            {/* Sport Toggle */}
            <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-2xl border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 ml-2">Sport:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSport('cricket')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    sport === 'cricket'
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🏏 Cricket (Active)
                </button>
                <button
                  disabled
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-500 bg-slate-800/50 cursor-not-allowed opacity-60 flex items-center gap-1"
                >
                  ⚽ Football <span className="text-[10px] bg-slate-700 px-1 rounded">Soon</span>
                </button>
              </div>
            </div>

            {/* Your Name Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-orange-400" />
                Your Display Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={handleNameChange}
                placeholder="Enter your name..."
                maxLength={20}
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-semibold"
              />
            </div>

            {/* Team Selection */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                Choose Preferred Franchise
              </label>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-3 py-2">
                {IPL_TEAMS.map((t) => (
                  <TeamBadge
                    key={t.id}
                    teamId={t.id}
                    size="md"
                    isSelected={selectedTeam === t.id}
                    onClick={() => setSelectedTeam(t.id)}
                  />
                ))}
              </div>
            </div>

            {/* Auction Mode Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => setMode('MEGA')}
                className={`p-4 rounded-2xl cursor-pointer border transition-all ${
                  mode === 'MEGA'
                    ? 'border-orange-500 bg-orange-500/10 shadow-lg'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white text-sm">Mega Auction 2026</span>
                  <span className="text-xs font-bold text-orange-400 bg-orange-500/20 px-2 py-0.5 rounded-full">
                    ₹120 Cr
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Full reset auction. 350+ star players, max 25 squad size & 8 overseas.
                </p>
              </div>

              <div
                onClick={() => setMode('MINI')}
                className={`p-4 rounded-2xl cursor-pointer border transition-all ${
                  mode === 'MINI'
                    ? 'border-orange-500 bg-orange-500/10 shadow-lg'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white text-sm">Mini Auction 2026</span>
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">
                    ₹90 Cr Base
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Pre-loaded retained core squads per franchise with reduced purse.
                </p>
              </div>
            </div>

            {/* Room Options */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800/80">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="rounded accent-orange-500 w-4 h-4"
                />
                <span className="text-xs font-semibold text-slate-300">Public Room (Allow browsing)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowAiBots}
                  onChange={(e) => setAllowAiBots(e.target.checked)}
                  className="rounded accent-orange-500 w-4 h-4"
                />
                <span className="text-xs font-semibold text-slate-300">Allow AI Bots for empty teams</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="pt-4">
              <button
                onClick={handleCreateRoom}
                disabled={isCreating || !userName.trim()}
                className="w-full py-4 rounded-2xl font-extrabold text-base bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-xl glow-orange hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isCreating ? 'Creating Room...' : '🎮 Create Private Room'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Recent Games */}
        {activeTab === 'recent' && (
          <div className="glass-panel p-6 sm:p-8 rounded-3xl space-y-4 shadow-2xl border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                Recent Rooms (Last 10)
              </h3>
              {recentRooms.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear all history
                </button>
              )}
            </div>

            {recentRooms.length === 0 ? (
              <div className="text-center py-12 text-slate-500 space-y-2">
                <History className="w-10 h-10 mx-auto opacity-40" />
                <p className="text-sm font-semibold">No recent rooms found.</p>
                <p className="text-xs">Create a new game to get started!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentRooms.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <TeamBadge teamId={r.teamId} size="sm" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white tracking-widest text-base font-mono">
                            {r.code}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">
                            {r.mode}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">{r.date}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRejoinRoom(r.code, r.teamId)}
                      className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
                    >
                      <span>Rejoin</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Public Rooms Modal */}
      {showPublicModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-6 border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-orange-400" />
                Live Public Auction Rooms
              </h3>
              <button
                onClick={() => setShowPublicModal(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {publicRooms.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-400">
                  No public auction rooms open right now. Create one and invite friends!
                </p>
              ) : (
                publicRooms.map((room) => (
                  <div
                    key={room.code}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white font-mono tracking-wider">
                          {room.code}
                        </span>
                        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                          {room.mode}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">Host: {room.hostName}</p>
                    </div>

                    <button
                      onClick={() => {
                        setShowPublicModal(false);
                        router.push(`/room/${room.code}`);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-orange-500 text-white font-bold text-xs hover:bg-orange-600 transition-all"
                    >
                      Join
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Support & Footer */}
      <footer className="max-w-5xl mx-auto w-full pt-8 border-t border-slate-800/80 space-y-6">
        {/* Support Banner */}
        <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-200">Enjoying the IPL Auction App?</p>
              <p className="text-[11px] text-slate-400">Support server costs and updates!</p>
            </div>
          </div>

          <a
            href="https://buymeacoffee.com"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all shadow-md flex items-center gap-1.5"
          >
            <Coffee className="w-4 h-4" />
            <span>Buy me a coffee</span>
          </a>
        </div>

        {/* Optional Ad Slot (Off by default) */}
        {showAdSlot && (
          <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-600">
            Ad Slot (Disabled)
          </div>
        )}

        {/* Social Links */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <p>© 2026 {APP_BRAND_NAME}. Built for friends & cricket fans.</p>
          <div className="flex items-center gap-4">
            <a href="https://x.com" target="_blank" rel="noreferrer" className="hover:text-orange-400">
              X (Twitter)
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-orange-400">
              LinkedIn
            </a>
            <a href="https://reddit.com" target="_blank" rel="noreferrer" className="hover:text-orange-400">
              Reddit
            </a>
            <a href="https://discord.com" target="_blank" rel="noreferrer" className="hover:text-orange-400">
              Discord
            </a>
            <a href="https://whatsapp.com" target="_blank" rel="noreferrer" className="hover:text-orange-400">
              WhatsApp
            </a>
            <a href="https://t.me" target="_blank" rel="noreferrer" className="hover:text-orange-400">
              Telegram
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
