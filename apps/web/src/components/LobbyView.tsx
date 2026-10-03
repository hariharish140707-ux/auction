'use client';

import React, { useState } from 'react';
import { RoomSnapshot, RoomSettings, IPL_TEAMS } from '@ipl-auction/shared';
import { TeamBadge } from './TeamBadge';
import { AuctionStatsModal } from './AuctionStatsModal';
import { getSocket } from '../lib/socket';
import {
  Users,
  Copy,
  Share2,
  MessageSquare,
  Play,
  Settings as SettingsIcon,
  Shield,
  ArrowLeft,
  Check,
  Send,
  UserCheck,
  UserX,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

interface LobbyViewProps {
  room: RoomSnapshot;
  playerId: string;
  code: string;
}

export const LobbyView: React.FC<LobbyViewProps> = ({ room, playerId, code }) => {
  const [activeTab, setActiveTab] = useState<'team' | 'players' | 'chat' | 'settings'>('team');
  const [copied, setCopied] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [editingSettings, setEditingSettings] = useState<RoomSettings>(room.settings);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [playerToKick, setPlayerToKick] = useState<{ id: string; name: string } | null>(null);

  const socket = getSocket();
  const me = room.players.find((p) => p.id === playerId);
  const isHost = me?.isHost || false;
  const myTeamId = me?.teamId || null;

  const handleKickPlayer = (targetId: string) => {
    socket.emit('room:kick', { code, playerToken: playerId, targetPlayerId: targetId });
    setPlayerToKick(null);
  };

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/room/${code}` : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`Join my IPL Auction room! Code: ${code}\nLink: ${shareUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'IPL Super Auction Room',
        text: `Join my IPL Auction room! Code: ${code}`,
        url: shareUrl,
      });
    } else {
      handleCopyLink();
    }
  };

  const handleSelectTeam = (teamId: string) => {
    // Toggle team selection
    const target = myTeamId === teamId ? null : teamId;
    socket.emit('team:select', { code, playerToken: playerId, teamId: target });
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket.emit('chat:send', { code, playerToken: playerId, text: chatInput });
    setChatInput('');
  };

  const handleSaveSettings = () => {
    if (!isHost) return;
    socket.emit('settings:update', { code, playerToken: playerId, settings: editingSettings });
  };

  const handleStartAuction = () => {
    if (!isHost) return;
    socket.emit('auction:start', { code, playerToken: playerId });
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col justify-between p-4 sm:p-6">
      {/* Lobby Header */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl font-mono tracking-widest text-orange-400">
                {code}
              </span>
              <span className="text-xs bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Online
              </span>
            </div>
            <p className="text-xs text-slate-400">Mode: {room.settings.auctionMode} Auction 2026</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowStatsModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-orange-500/60 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all"
          >
            <Layers className="w-4 h-4 text-orange-400" />
            <span>Stats & Sets</span>
          </button>

          <div className="px-3 py-1.5 rounded-xl glass-panel text-xs font-bold flex items-center gap-1.5">
            <Users className="w-4 h-4 text-orange-400" />
            <span>{room.players.length}/10 Connected</span>
          </div>

          {isHost && (
            <button
              onClick={handleStartAuction}
              className="px-5 py-2.5 rounded-xl font-extrabold text-xs bg-gradient-to-r from-emerald-500 to-green-600 text-slate-950 shadow-lg glow-green hover:brightness-110 transition-all flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Auction</span>
            </button>
          )}
        </div>
      </header>


      {/* Main Content */}
      <main className="max-w-5xl mx-auto w-full my-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Invite Card & Players */}
        <div className="space-y-6">
          {/* Invite Card */}
          <div className="glass-panel p-5 rounded-2xl space-y-3 border border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Invite Friends</h3>
              <span className="text-[10px] bg-orange-500/20 text-orange-400 font-bold px-2 py-0.5 rounded">
                Share Link
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full bg-transparent text-xs text-slate-300 focus:outline-none truncate"
              />
              <button
                onClick={handleCopyLink}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all"
                title="Copy Link"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleWhatsAppShare}
                className="py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
              <button
                onClick={handleNativeShare}
                className="py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
            </div>
          </div>

          {/* Connected Players List */}
          <div className="glass-panel p-5 rounded-2xl space-y-3 border border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span>Lobby Players ({room.players.length}/10)</span>
            </h3>

            <div className="space-y-2">
              {room.players.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="w-7 h-7 rounded-full bg-slate-800 text-orange-400 font-bold text-xs flex items-center justify-center border border-slate-700">
                        {p.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                          p.isOnline ? 'bg-emerald-500' : 'bg-slate-500'
                        }`}
                        title={p.isOnline ? 'Online' : 'Offline / Reconnecting'}
                      />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white flex items-center gap-1">
                        {p.name}
                        {p.id === playerId && (
                          <span className="text-[10px] text-orange-400 font-semibold">(You)</span>
                        )}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {p.teamId && (
                          <span className="text-[10px] text-slate-400">Team: {p.teamId}</span>
                        )}
                        {!p.isOnline && (
                          <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded">
                            Offline
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {p.isHost ? (
                      <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Host
                      </span>
                    ) : (
                      isHost && (
                        <button
                          onClick={() => setPlayerToKick({ id: p.id, name: p.name })}
                          className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-bold flex items-center gap-1 transition-all"
                          title="Remove player for misbehavior"
                        >
                          <UserX className="w-3 h-3" />
                          <span>Kick</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (2 cols width): Franchise Selection Grid & Tabs */}
        <div className="md:col-span-2 space-y-6">
          {/* Navigation Bar */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <button
              onClick={() => setActiveTab('team')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'team'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Claim Franchise</span>
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'chat'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Live Chat ({room.chatMessages.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'settings'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
              <span>Room Settings</span>
            </button>
          </div>

          {/* Tab 1: Team Selection Grid */}
          {activeTab === 'team' && (
            <div className="glass-panel p-6 rounded-3xl space-y-4 border border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-white">Select Your Franchise</h3>
                <p className="text-xs text-slate-400">
                  Atomic selection: once claimed, no other player can pick your team.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-2">
                {IPL_TEAMS.map((team) => {
                  const teamState = room.teams[team.id];
                  const ownerName = teamState?.ownerName;
                  const isOccupiedByOther = ownerName && teamState.ownerId !== playerId;
                  const isMine = teamState?.ownerId === playerId;

                  return (
                    <div
                      key={team.id}
                      onClick={() => !isOccupiedByOther && handleSelectTeam(team.id)}
                      className={`p-4 rounded-2xl flex flex-col items-center justify-between border cursor-pointer transition-all ${
                        isMine
                          ? 'border-orange-500 bg-orange-500/10 shadow-lg'
                          : isOccupiedByOther
                          ? 'border-slate-800/60 bg-slate-950/40 opacity-40 cursor-not-allowed'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:scale-105'
                      }`}
                    >
                      <TeamBadge
                        teamId={team.id}
                        size="lg"
                        isSelected={isMine}
                        isDisabled={!!isOccupiedByOther}
                      />
                      <span className="mt-2 text-xs font-bold text-white text-center">{team.name}</span>
                      <span className="text-[10px] text-slate-400 mt-1">
                        {isMine ? (
                          <span className="text-orange-400 font-bold">Your Team</span>
                        ) : ownerName ? (
                          `Owned by ${ownerName}`
                        ) : (
                          'Available'
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 2: Chat View */}
          {activeTab === 'chat' && (
            <div className="glass-panel p-6 rounded-3xl space-y-4 border border-slate-800 flex flex-col h-[400px] justify-between">
              <div className="overflow-y-auto space-y-2 pr-1 flex-1">
                {room.chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2.5 rounded-xl text-xs ${
                      msg.isSystem
                        ? 'bg-orange-500/10 border border-orange-500/20 text-orange-300 font-semibold'
                        : 'bg-slate-900/80 border border-slate-800 text-slate-200'
                    }`}
                  >
                    {!msg.isSystem && (
                      <span className="font-bold text-orange-400 mr-2">{msg.senderName}:</span>
                    )}
                    <span>{msg.text}</span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-slate-800">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs hover:bg-orange-600 transition-all flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          )}

          {/* Tab 3: Settings View */}
          {activeTab === 'settings' && (
            <div className="glass-panel p-6 rounded-3xl space-y-5 border border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-extrabold text-white">Room Settings</h3>
                  <p className="text-xs text-slate-400">
                    {isHost ? 'Host editable settings' : 'Read-only view for non-hosts'}
                  </p>
                </div>
                {isHost && (
                  <button
                    onClick={handleSaveSettings}
                    className="px-4 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs hover:bg-orange-600 transition-all"
                  >
                    Save Changes
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Bid Timer Duration</label>
                  <select
                    disabled={!isHost}
                    value={editingSettings.bidTimerDuration}
                    onChange={(e) =>
                      setEditingSettings({ ...editingSettings, bidTimerDuration: Number(e.target.value) })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white disabled:opacity-50"
                  >
                    <option value={5}>5 seconds</option>
                    <option value={10}>10 seconds (Default)</option>
                    <option value={15}>15 seconds</option>
                    <option value={20}>20 seconds</option>
                    <option value={30}>30 seconds</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Starting Purse (Cr)</label>
                  <input
                    type="number"
                    disabled={!isHost}
                    value={editingSettings.startingPurse}
                    onChange={(e) =>
                      setEditingSettings({ ...editingSettings, startingPurse: Number(e.target.value) })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Max Squad Size</label>
                  <input
                    type="number"
                    disabled={!isHost}
                    value={editingSettings.maxSquadSize}
                    onChange={(e) =>
                      setEditingSettings({ ...editingSettings, maxSquadSize: Number(e.target.value) })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Max Overseas Players</label>
                  <input
                    type="number"
                    disabled={!isHost}
                    value={editingSettings.maxOverseas}
                    onChange={(e) =>
                      setEditingSettings({ ...editingSettings, maxOverseas: Number(e.target.value) })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Auction Stats & Sets Modal */}
      <AuctionStatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        code={code}
      />

      {/* Kick Player Confirmation Modal */}
      {playerToKick && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-sm rounded-3xl p-6 border border-red-500/40 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Remove Player?</h3>
              <p className="text-xs text-slate-300 mt-1">
                Are you sure you want to remove <span className="font-extrabold text-red-400">{playerToKick.name}</span> from the room?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setPlayerToKick(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleKickPlayer(playerToKick.id)}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold text-xs hover:brightness-110 shadow transition-all"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

