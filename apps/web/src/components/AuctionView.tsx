'use client';

import React, { useState, useEffect } from 'react';
import {
  RoomSnapshot,
  validateBid,
  getNextBidAmount,
  IPL_TEAMS,
  TeamState,
  BidEvent,
  TradeOffer,
} from '@ipl-auction/shared';
import { getSocket } from '../lib/socket';
import { TeamBadge } from './TeamBadge';
import { ConfettiEffect } from './ConfettiEffect';
import { AuctionStatsModal } from './AuctionStatsModal';
import { ExchangeModal } from './ExchangeModal';
import { SquadsAccordionView } from './SquadsAccordionView';
import { AcceleratedPollModal } from './AcceleratedPollModal';
import { EditNameModal } from './EditNameModal';
import { sounds } from '../lib/audio';
import { getSetCardInfo, DISPLAY_SET_ORDER } from '../lib/setCardConfig';
import {
  Volume2,
  VolumeX,
  Home,
  Copy,
  Users,
  History,
  Shield,
  Pause,
  Play,
  SkipForward,
  MessageSquare,
  DollarSign,
  AlertCircle,
  Award,
  Check,
  Send,
  Layers,
  ArrowLeftRight,
  Sparkles,
  Zap,
  Clock,
  Gavel,
  XCircle,
  X,
  UserX,
  AlertTriangle,
  Edit3,
} from 'lucide-react';
import Link from 'next/link';


interface AuctionViewProps {
  room: RoomSnapshot;
  playerId: string;
  code: string;
}

export const AuctionView: React.FC<AuctionViewProps> = ({ room, playerId, code }) => {
  const [bottomTab, setBottomTab] = useState<'activity' | 'squads' | 'exchange' | 'chat'>('activity');
  const [isMuted, setIsMuted] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [showPlayersModal, setShowPlayersModal] = useState(false);
  const [playerToKick, setPlayerToKick] = useState<{ id: string; name: string } | null>(null);
  const [exchangeTargetTeamId, setExchangeTargetTeamId] = useState<string | null>(null);
  const [exchangeTargetPlayerId, setExchangeTargetPlayerId] = useState<string | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(false);
  const [soldOverlay, setSoldOverlay] = useState<{ type: 'SOLD' | 'UNSOLD'; text: string } | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [pendingTradeAlert, setPendingTradeAlert] = useState<TradeOffer | null>(null);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [isAcceleratedModalOpen, setIsAcceleratedModalOpen] = useState(true);
  const [setTransition, setSetTransition] = useState<{ setKey: string; title: string } | null>(null);
  const [prevPlayerSet, setPrevPlayerSet] = useState<string | null>(null);

  const socket = getSocket();
  const me = room.players.find((p) => p.id === playerId);
  const isHost = me?.isHost || false;
  const myTeamId = me?.teamId || null;
  const myTeam = myTeamId ? room.teams[myTeamId] : null;

  const handleKickPlayer = (targetId: string) => {
    socket.emit('room:kick', { code, playerToken: playerId, targetPlayerId: targetId });
    setPlayerToKick(null);
  };

  const handleSaveName = (newName: string) => {
    localStorage.setItem('ipl_auction_user_name', newName);
    socket.emit('player:updateName', { code, playerToken: playerId, newName });
  };

  // Re-open Accelerated Poll modal automatically when a new poll starts
  useEffect(() => {
    if (
      room.acceleratedPoll &&
      (room.acceleratedPoll.status === 'VOTING' || room.acceleratedPoll.status === 'BALLOT')
    ) {
      setIsAcceleratedModalOpen(true);
    }
  }, [room.acceleratedPoll?.id, room.acceleratedPoll?.status]);

  const playerBlock = room.currentPlayerBlock;

  // Real-time Trade Notification Listeners
  useEffect(() => {
    const handleTradeProposed = (payload: { trade: TradeOffer; room: RoomSnapshot }) => {
      if (payload?.trade && payload.trade.toTeamId === myTeamId) {
        setPendingTradeAlert(payload.trade);
        sounds.playBidSound();
      }
    };

    const handleTradeResolved = (payload: { trade: TradeOffer }) => {
      if (payload?.trade && pendingTradeAlert?.id === payload.trade.id) {
        setPendingTradeAlert(null);
      }
    };

    socket.on('trade:proposed', handleTradeProposed);
    socket.on('trade:accepted', handleTradeResolved);
    socket.on('trade:rejected', handleTradeResolved);
    socket.on('trade:cancelled', handleTradeResolved);

    return () => {
      socket.off('trade:proposed', handleTradeProposed);
      socket.off('trade:accepted', handleTradeResolved);
      socket.off('trade:rejected', handleTradeResolved);
      socket.off('trade:cancelled', handleTradeResolved);
    };
  }, [myTeamId, pendingTradeAlert?.id, socket]);

  // Sync with active trades in room state
  useEffect(() => {
    if (myTeamId && room.trades) {
      const activeIncoming = room.trades.find(
        (t) => t.toTeamId === myTeamId && t.status === 'PENDING'
      );
      if (activeIncoming && !pendingTradeAlert) {
        setPendingTradeAlert(activeIncoming);
      }
    }
  }, [room.trades, myTeamId]);

  // React to room status changes for audio & normal popups for ALL sold/unsold events
  useEffect(() => {
    if (room.status === 'SOLD') {
      const bid = playerBlock?.currentBid || 0;
      const soldTeamId = playerBlock?.highestBidderTeamId || '';

      sounds.playSoldSound();
      setConfettiTrigger(true);
      setSoldOverlay({
        type: 'SOLD',
        text: `🔨 SOLD to ${playerBlock?.highestBidderName || soldTeamId} for ₹${bid.toFixed(2)} Cr!`,
      });
      setTimeout(() => {
        setSoldOverlay(null);
        setConfettiTrigger(false);
      }, 2400);
    } else if (room.status === 'UNSOLD') {
      sounds.playUnsoldSound();
      setSoldOverlay({
        type: 'UNSOLD',
        text: `❌ UNSOLD at base price ₹${playerBlock?.player.basePrice.toFixed(2)} Cr`,
      });
      setTimeout(() => setSoldOverlay(null), 2400);
    }
  }, [room.status]);

  // Detect set transitions — show "Next Round: XYZ" card for 3 seconds
  useEffect(() => {
    if (playerBlock?.player?.set) {
      const currentSet = playerBlock.player.set;
      if (prevPlayerSet && prevPlayerSet !== currentSet) {
        // Set changed! Show transition card
        const info = getSetCardInfo(currentSet);
        setSetTransition({ setKey: currentSet, title: info.title });
        setTimeout(() => setSetTransition(null), 3000);
      }
      setPrevPlayerSet(currentSet);
    }
  }, [playerBlock?.player?.set]);

  // Audio timer warning at 3s
  useEffect(() => {
    if (playerBlock && playerBlock.timerSecondsLeft <= 3 && playerBlock.timerSecondsLeft > 0) {
      sounds.playTimerWarning();
    }
  }, [playerBlock?.timerSecondsLeft]);

  const handlePlaceBid = () => {
    if (!myTeamId || !playerBlock) return;
    sounds.playBidSound();
    socket.emit('bid:place', { code, playerToken: playerId, teamId: myTeamId });
  };

  const handlePause = () => {
    if (isHost) socket.emit('auction:pause', { code, playerToken: playerId });
  };

  const handleResume = () => {
    if (isHost) socket.emit('auction:resume', { code, playerToken: playerId });
  };

  const handleSkip = () => {
    if (isHost) socket.emit('auction:skip', { code, playerToken: playerId });
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket.emit('chat:send', { code, playerToken: playerId, text: chatInput });
    setChatInput('');
  };

  // Bid validation & Next Bid computation
  let validationResult: { valid: boolean; reason?: string; nextBidAmount?: number } = {
    valid: false,
    reason: 'You must claim a team to bid',
    nextBidAmount: 0,
  };
  if (myTeam && playerBlock) {
    validationResult = validateBid(myTeam, playerBlock, room.settings);
  }

  const nextBidAmount = playerBlock ? getNextBidAmount(playerBlock, room.settings.bidIncrementOption) : 0;
  const timerPercentage = playerBlock
    ? (playerBlock.timerSecondsLeft / room.settings.bidTimerDuration) * 100
    : 0;

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col justify-between p-3 sm:p-5 relative overflow-x-hidden">
      <ConfettiEffect trigger={confettiTrigger} />

      {/* SOLD / UNSOLD Full Screen Animation Overlay */}
      {soldOverlay && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-bounce-short">
          <div
            className={`p-8 rounded-3xl border text-center space-y-3 shadow-2xl max-w-md w-full ${
              soldOverlay.type === 'SOLD'
                ? 'bg-gradient-to-b from-emerald-950 to-slate-900 border-emerald-500 glow-green'
                : 'bg-gradient-to-b from-red-950 to-slate-900 border-red-500'
            }`}
          >
            <div className="text-4xl">{soldOverlay.type === 'SOLD' ? '🏆' : '❌'}</div>
            <h2 className="text-2xl font-extrabold text-white">{soldOverlay.type}!</h2>
            <p className="text-sm font-semibold text-slate-200">{soldOverlay.text}</p>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━ SET TRANSITION OVERLAY (3 seconds between sets) ━━━━━━━━━━ */}
      {setTransition && (() => {
        const info = getSetCardInfo(setTransition.setKey);
        return (
          <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 animate-bounce-short">
            <div className={`p-10 rounded-3xl bg-gradient-to-b ${info.bgGradient} border-2 ${info.borderColor} text-center space-y-4 shadow-2xl max-w-lg w-full`}>
              <div className="text-6xl">{info.icon}</div>
              <div className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">
                NEXT ROUND
              </div>
              <h2 className={`text-2xl sm:text-3xl font-black ${info.textColor} tracking-wide`}>
                {info.title}
              </h2>
              <p className="text-sm font-semibold text-slate-300">{info.description}</p>
              <div className="flex items-center justify-center gap-1 pt-2">
                <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                <span className="text-xs font-bold text-orange-400 animate-pulse">Starting Now...</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Top Bar Navigation */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white"
          >
            <Home className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg font-mono tracking-widest text-orange-400">
                {code}
              </span>
              <button
                onClick={() => setShowPlayersModal(true)}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 transition-all border border-slate-700"
                title="Manage & View Room Players"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{room.players.length}/10 Players</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons, Host Controls & Mute Toggle */}
        <div className="flex items-center gap-2">
          {/* Edit Display Name Button */}
          <button
            onClick={() => setShowEditNameModal(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-orange-500/60 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all"
            title="Edit your display name"
          >
            <Edit3 className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden sm:inline max-w-[100px] truncate">{me?.name || 'Your Name'}</span>
          </button>

          {/* Accelerated Poll Badge / Trigger Button if Active */}
          {room.acceleratedPoll &&
            (room.acceleratedPoll.status === 'VOTING' || room.acceleratedPoll.status === 'BALLOT') && (
              <button
                onClick={() => setIsAcceleratedModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-orange-500/20 border border-orange-500/50 text-orange-400 hover:bg-orange-500/30 font-bold text-xs flex items-center gap-1.5 shadow transition-all animate-pulse"
                title="Open Accelerated Auction Ballot / Poll"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">Accelerated Ballot Active</span>
              </button>
            )}

          {/* Players Management Button */}
          <button
            onClick={() => setShowPlayersModal(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-orange-500/60 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all"
            title="Room Participants & Kick Manager"
          >
            <Users className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden sm:inline">Players ({room.players.length})</span>
          </button>

          {/* Auction Stats / Sets Modal Button */}
          <button
            onClick={() => setShowStatsModal(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-orange-500/60 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all"
            title="View Upcoming Sets & Stats"
          >
            <Layers className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden sm:inline">Stats & Sets</span>
          </button>

          {/* Exchange / Trading Window Button */}
          <button
            onClick={() => setShowExchangeModal(true)}
            className="relative px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-950 to-slate-900 border border-emerald-600/60 hover:border-emerald-500 text-emerald-300 hover:text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all"
            title="IPL Player Exchange & Trading"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exchange</span>
            {room.trades &&
              room.trades.some((t) => t.toTeamId === myTeamId && t.status === 'PENDING') && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping absolute -top-1 -right-1"></span>
              )}
          </button>

          {isHost && (
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              {/* Dynamic Timer Changer */}
              <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-xs" title="Change bid timer duration at any time">
                <Clock className="w-3.5 h-3.5 text-orange-400" />
                <select
                  value={room.settings.bidTimerDuration}
                  onChange={(e) => {
                    const newDur = Number(e.target.value);
                    socket.emit('timer:change', { code, playerToken: playerId, duration: newDur });
                  }}
                  className="bg-transparent font-extrabold text-white text-xs focus:outline-none cursor-pointer"
                >
                  <option value={5} className="bg-slate-900 text-white">5s</option>
                  <option value={10} className="bg-slate-900 text-white">10s</option>
                  <option value={15} className="bg-slate-900 text-white">15s</option>
                  <option value={20} className="bg-slate-900 text-white">20s</option>
                  <option value={30} className="bg-slate-900 text-white">30s</option>
                  <option value={45} className="bg-slate-900 text-white">45s</option>
                </select>
              </div>

              {/* Host Bid Increment Changer */}
              <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-xs" title="Change bid increment at any time">
                <Gavel className="w-3.5 h-3.5 text-amber-400" />
                <select
                  value={room.settings.bidIncrementOption || 'DYNAMIC'}
                  onChange={(e) => {
                    const option = e.target.value;
                    socket.emit('bid:increment:change', { code, playerToken: playerId, option });
                  }}
                  className="bg-transparent font-extrabold text-amber-400 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="DYNAMIC" className="bg-slate-900 text-white">Dynamic (IPL Tiers)</option>
                  <option value="25L" className="bg-slate-900 text-white">+₹25 Lakhs</option>
                  <option value="50L" className="bg-slate-900 text-white">+₹50 Lakhs</option>
                  <option value="75L" className="bg-slate-900 text-white">+₹75 Lakhs</option>
                  <option value="1CR" className="bg-slate-900 text-white">+₹1.00 Crore</option>
                </select>
              </div>

              {/* Accelerated Auction Poll Trigger with Set Selector */}
              <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-orange-500/30 text-xs">
                <Zap className="w-3.5 h-3.5 text-orange-400 fill-current" />
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      socket.emit('poll:start', { code, playerToken: playerId, targetSet: val });
                      e.target.value = '';
                    }
                  }}
                  className="bg-transparent font-extrabold text-orange-300 text-xs focus:outline-none cursor-pointer"
                  title="Trigger Accelerated Poll by set or for all remaining"
                >
                  <option value="" disabled className="bg-slate-900 text-slate-400">⚡ Poll Set...</option>
                  <option value="CURRENT" className="bg-slate-900 text-white">Current Set</option>
                  <option value="MARQUEE" className="bg-slate-900 text-white">Marquee Set</option>
                  <option value="TIER1_BAT" className="bg-slate-900 text-white">Tier 1 Batsmen</option>
                  <option value="TIER1_BOWL" className="bg-slate-900 text-white">Tier 1 Bowlers</option>
                  <option value="TIER1_AL" className="bg-slate-900 text-white">Tier 1 All-Rounders</option>
                  <option value="TIER1_WK" className="bg-slate-900 text-white">Tier 1 Keepers</option>
                  <option value="TIER2_BAT" className="bg-slate-900 text-white">Tier 2 Batsmen</option>
                  <option value="TIER2_BOWL" className="bg-slate-900 text-white">Tier 2 Bowlers</option>
                  <option value="TIER2_AL" className="bg-slate-900 text-white">Tier 2 All-Rounders</option>
                  <option value="TIER2_WK" className="bg-slate-900 text-white">Tier 2 Keepers</option>
                  <option value="TIER3_BAT" className="bg-slate-900 text-white">Tier 3 Emerging</option>
                  <option value="ALL" className="bg-slate-900 text-white">All Remaining Sets</option>
                </select>
              </div>

              {room.status === 'PAUSED' ? (
                <button
                  onClick={handleResume}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center gap-1"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Resume
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold text-xs flex items-center gap-1"
                >
                  <Pause className="w-3.5 h-3.5" /> Pause
                </button>
              )}
              <button
                onClick={handleSkip}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1"
              >
                <SkipForward className="w-3.5 h-3.5" /> Skip
              </button>
            </div>
          )}


          <button
            onClick={() => {
              sounds.isMuted = !isMuted;
              setIsMuted(!isMuted);
            }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-orange-400" />}
          </button>
        </div>
      </header>


      {/* Timer Bar */}
      {playerBlock && (
        <div className="max-w-6xl mx-auto w-full my-2 relative">
          <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-1000 ${
                playerBlock.timerSecondsLeft <= 3 ? 'bg-red-500 animate-pulse' : 'bg-orange-500'
              }`}
              style={{ width: `${timerPercentage}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Main Auction Block */}
      <main className="max-w-6xl mx-auto w-full my-3 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left/Center Column (8 cols): Player Card & Bidding Panel */}
        <div className="lg:col-span-8 space-y-4">

          {/* ━━━━━━━━━━ AUCTION SET CARDS PIPELINE ("WHAT IS COMING NEXT") ━━━━━━━━━━ */}
          <div className="glass-panel p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                  Auction Sets Pipeline (What's Coming)
                </span>
              </div>
              <button
                onClick={() => setShowStatsModal(true)}
                className="text-[11px] font-extrabold text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors"
              >
                <span>View Full Set List & Players</span>
                <Sparkles className="w-3 h-3" />
              </button>
            </div>

            {/* Set Cards Horizontal Strip */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
              {DISPLAY_SET_ORDER.map((setKey, idx) => {
                const info = getSetCardInfo(setKey);
                const isCurrent = playerBlock?.player.set === setKey;
                // Find next set index
                const currentSetIdx = DISPLAY_SET_ORDER.indexOf(playerBlock?.player.set || 'MARQUEE');
                const isNext = idx === currentSetIdx + 1;

                return (
                  <button
                    key={setKey}
                    onClick={() => setShowStatsModal(true)}
                    className={`shrink-0 px-3 py-2 rounded-xl border text-left transition-all flex flex-col justify-between min-w-[125px] ${
                      isCurrent
                        ? `bg-gradient-to-r ${info.bgGradient} ${info.borderColor} shadow-lg ring-2 ring-orange-500/50 scale-[1.02]`
                        : isNext
                        ? 'bg-slate-900/90 border-orange-500/40 text-slate-200 hover:border-orange-500'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <span className="text-sm">{info.icon}</span>
                      {isCurrent ? (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 animate-pulse">
                          LIVE NOW
                        </span>
                      ) : isNext ? (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 border border-amber-500/40">
                          NEXT
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-1">
                      <div className={`text-xs font-extrabold truncate ${isCurrent ? info.textColor : 'text-slate-200'}`}>
                        {info.shortTitle}
                      </div>
                      <div className="text-[9px] text-slate-400 truncate font-medium">
                        {info.description.substring(0, 22)}...
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {playerBlock ? (
            <div className="glass-panel p-5 sm:p-7 rounded-3xl space-y-5 border border-slate-800 shadow-2xl relative overflow-hidden">
              {/* Corner Circular Timer Badge */}
              <div
                className={`absolute top-4 right-4 w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-lg shadow-lg border ${
                  playerBlock.timerSecondsLeft <= 3
                    ? 'bg-red-600 text-white border-red-400 animate-pulse'
                    : 'bg-slate-900 text-orange-400 border-slate-700'
                }`}
              >
                {playerBlock.timerSecondsLeft}s
              </div>

              {/* Set Banner Header Card */}
              {(() => {
                const currentSetCard = getSetCardInfo(playerBlock.player.set);
                return (
                  <div className={`p-3.5 rounded-2xl bg-gradient-to-r ${currentSetCard.bgGradient} border ${currentSetCard.borderColor} flex items-center justify-between shadow-md mb-2`}>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl sm:text-2xl">{currentSetCard.icon}</span>
                      <div>
                        <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase block">
                          AUCTION BLOCK SET
                        </span>
                        <h3 className={`font-black text-xs sm:text-sm ${currentSetCard.textColor}`}>
                          {currentSetCard.title}
                        </h3>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${currentSetCard.badgeColor}`}>
                      {currentSetCard.description}
                    </span>
                  </div>
                );
              })()}

              {/* Player Header Info */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-900 border border-slate-700 text-orange-400 font-extrabold text-2xl flex items-center justify-center shadow-lg">
                  {playerBlock.player.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      SET: {playerBlock.player.set}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {playerBlock.player.role}
                    </span>
                    {playerBlock.player.isOverseas && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        ✈️ OS ({playerBlock.player.country})
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                    {playerBlock.player.name}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Base Price: <span className="font-bold text-white">₹{playerBlock.player.basePrice.toFixed(2)} Cr</span> | Overall Rating:{' '}
                    <span className="font-bold text-amber-400">{playerBlock.player.overallRating}/100</span>
                  </p>
                </div>
              </div>

              {/* Bidding Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Current Bid</span>
                  <div className="text-xl font-extrabold text-amber-400">
                    ₹{playerBlock.currentBid.toFixed(2)} Cr
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Highest Bidder</span>
                  <div className="text-xs font-bold text-white flex items-center gap-1 mt-1">
                    {playerBlock.highestBidderTeamId ? (
                      <>
                        <TeamBadge teamId={playerBlock.highestBidderTeamId} size="sm" />
                        <span className="truncate">{playerBlock.highestBidderName}</span>
                      </>
                    ) : (
                      <span className="text-slate-500 italic">No bids yet</span>
                    )}
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Your Purse</span>
                  <div className="text-base font-extrabold text-emerald-400">
                    ₹{myTeam ? myTeam.purseRemaining.toFixed(2) : '0.00'} Cr
                  </div>
                </div>
              </div>

              {/* Team Selector for Late Joiners (no team claimed yet) */}
              {!myTeamId && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-950/60 to-amber-950/40 border border-orange-500/40 space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-orange-400" />
                    <span className="font-black text-sm text-orange-300">Claim a Team to Start Bidding</span>
                  </div>
                  <p className="text-[11px] text-slate-300">Select an available franchise to participate in the auction:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {IPL_TEAMS.map((team) => {
                      const teamState = room.teams[team.id];
                      const isTaken = teamState?.ownerId && teamState.ownerId !== playerId;
                      return (
                        <button
                          key={team.id}
                          disabled={!!isTaken}
                          onClick={() => socket.emit('team:select', { code, playerToken: playerId, teamId: team.id })}
                          className={`p-2 rounded-xl text-xs font-extrabold border transition-all flex flex-col items-center gap-1 ${
                            isTaken
                              ? 'bg-slate-900/60 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                              : 'bg-slate-900 border-slate-700 text-white hover:border-orange-500 hover:bg-slate-800'
                          }`}
                          style={!isTaken ? { borderColor: team.primaryColor + '80' } : {}}
                        >
                          <TeamBadge teamId={team.id} size="sm" />
                          <span className="truncate">{team.shortName}</span>
                          {isTaken && <span className="text-[9px] text-slate-500">Taken</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Large Green BID Button */}
              <div className="space-y-2">
                <button
                  onClick={handlePlaceBid}
                  disabled={!validationResult.valid}
                  className={`w-full py-4 rounded-2xl font-extrabold text-lg flex items-center justify-center gap-2 shadow-2xl transition-all ${
                    validationResult.valid
                      ? 'bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 text-slate-950 glow-green hover:brightness-110 active:scale-[0.99]'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                  }`}
                >
                  <DollarSign className="w-6 h-6" />
                  <span>
                    BID ₹{nextBidAmount.toFixed(2)} Cr
                  </span>
                </button>

                {!validationResult.valid && (
                  <p className="text-center text-xs font-semibold text-amber-400/90 flex items-center justify-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {validationResult.reason}
                  </p>
                )}
              </div>

              {/* History Drawer Toggle Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <History className="w-3.5 h-3.5" /> Bid History ({playerBlock.bidHistory.length})
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-12 rounded-3xl text-center space-y-3 border border-slate-800">
              <p className="text-base font-bold text-slate-300">
                {room.status === 'COMPLETED'
                  ? '🎉 Auction Completed!'
                  : 'Preparing next player on the block...'}
              </p>
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Tabs (Activity, Squads, Exchange, Chat) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-2xl border border-slate-800 text-xs">
            <button
              onClick={() => setBottomTab('activity')}
              className={`flex-1 py-2 rounded-xl font-bold transition-all ${
                bottomTab === 'activity' ? 'bg-orange-500 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Activity
            </button>
            <button
              onClick={() => setBottomTab('squads')}
              className={`flex-1 py-2 rounded-xl font-bold transition-all ${
                bottomTab === 'squads' ? 'bg-orange-500 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Squads
            </button>
            <button
              onClick={() => setBottomTab('exchange')}
              className={`flex-1 py-2 rounded-xl font-bold transition-all relative ${
                bottomTab === 'exchange' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Exchange</span>
              {room.trades &&
                room.trades.some((t) => t.toTeamId === myTeamId && t.status === 'PENDING') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 absolute top-1 right-1"></span>
                )}
            </button>
            <button
              onClick={() => setBottomTab('chat')}
              className={`flex-1 py-2 rounded-xl font-bold transition-all ${
                bottomTab === 'chat' ? 'bg-orange-500 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Chat
            </button>
          </div>

          {/* Activity Tab */}
          {bottomTab === 'activity' && playerBlock && (
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3 h-[450px] overflow-y-auto">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Live Activity Feed</h3>
              <div className="space-y-2">
                {playerBlock.bidHistory.map((bid) => (
                  <div
                    key={bid.id}
                    className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <TeamBadge teamId={bid.teamId} size="sm" />
                      <div>
                        <span className="font-bold text-white">{bid.bidderName}</span>
                        <p className="text-[10px] text-slate-400">{bid.teamName}</p>
                      </div>
                    </div>
                    <span className="font-extrabold text-amber-400">₹{bid.amount.toFixed(2)} Cr</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Squads Tab matching Screenshot 2 */}
          {bottomTab === 'squads' && (
            <div className="glass-panel p-3 rounded-2xl border border-slate-800 space-y-3 h-[450px] overflow-y-auto">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">All Squads & Purses</h3>
                <span className="text-[10px] text-slate-500">Click team to expand</span>
              </div>
              <SquadsAccordionView
                room={room}
                playerId={playerId}
                onInitiateTrade={(targetTeamId, targetPlayerId) => {
                  setExchangeTargetTeamId(targetTeamId);
                  setExchangeTargetPlayerId(targetPlayerId || null);
                  setShowExchangeModal(true);
                }}
              />
            </div>
          )}

          {/* Exchange Tab */}
          {bottomTab === 'exchange' && (
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-4 h-[450px] overflow-y-auto flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    IPL Exchange Hub
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                    ACTIVE
                  </span>
                </div>

                <p className="text-xs text-slate-300">
                  Trade players you don't need with other franchises. Swap player-for-player or sell for purse funds!
                </p>

                {/* Quick stats box */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Listed on Market:</span>
                    <span className="font-extrabold text-white">{room.transferListings?.length || 0} players</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Incoming Proposals:</span>
                    <span className="font-extrabold text-emerald-400">
                      {room.trades?.filter((t) => t.toTeamId === myTeamId && t.status === 'PENDING').length || 0}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowExchangeModal(true)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:brightness-110 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>Open Exchange & Trading Window</span>
              </button>
            </div>
          )}

          {/* Chat Tab */}
          {bottomTab === 'chat' && (
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col h-[450px] justify-between">
              <div className="overflow-y-auto space-y-2 pr-1 flex-1">
                {room.chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2 rounded-xl text-xs ${
                      msg.isSystem
                        ? 'bg-orange-500/10 border border-orange-500/20 text-orange-300 font-semibold'
                        : 'bg-slate-900/80 border border-slate-800 text-slate-200'
                    }`}
                  >
                    {!msg.isSystem && (
                      <span className="font-bold text-orange-400 mr-1.5">{msg.senderName}:</span>
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
                  placeholder="Chat with friends..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-orange-500 text-white font-bold text-xs hover:bg-orange-600 transition-all"
                >
                  Send
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Bid History Drawer Modal */}
      {showHistoryModal && playerBlock && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6 border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Bid History: {playerBlock.player.name}</h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {playerBlock.bidHistory.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-500">No bids placed yet.</p>
              ) : (
                playerBlock.bidHistory.map((bid) => (
                  <div
                    key={bid.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <TeamBadge teamId={bid.teamId} size="sm" />
                      <div>
                        <span className="font-bold text-white">{bid.bidderName}</span>
                        <p className="text-[10px] text-slate-400">{bid.teamName}</p>
                      </div>
                    </div>
                    <span className="font-extrabold text-amber-400">₹{bid.amount.toFixed(2)} Cr</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auction Stats & Sets Modal */}
      <AuctionStatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        code={code}
      />

      {/* Trading & Exchange Window Modal */}
      <ExchangeModal
        isOpen={showExchangeModal}
        onClose={() => {
          setShowExchangeModal(false);
          setExchangeTargetTeamId(null);
          setExchangeTargetPlayerId(null);
        }}
        room={room}
        playerId={playerId}
        code={code}
        initialTargetTeamId={exchangeTargetTeamId}
        initialTargetPlayerId={exchangeTargetPlayerId}
      />

      {/* Accelerated Auction Poll & Ballot Modal */}
      <AcceleratedPollModal
        room={room}
        playerId={playerId}
        code={code}
        isOpen={isAcceleratedModalOpen}
        onClose={() => setIsAcceleratedModalOpen(false)}
      />

      {/* Floating Reopen Button for Accelerated Auction Ballot when minimized */}
      {room.acceleratedPoll &&
        (room.acceleratedPoll.status === 'VOTING' || room.acceleratedPoll.status === 'BALLOT') &&
        !isAcceleratedModalOpen && (
          <button
            onClick={() => setIsAcceleratedModalOpen(true)}
            className="fixed bottom-24 right-5 z-40 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 text-slate-950 font-black text-xs flex items-center gap-2 shadow-2xl glow-orange hover:scale-105 transition-all animate-bounce"
            title="Re-open Accelerated Auction Ballot"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>⚡ Accelerated {room.acceleratedPoll.status === 'VOTING' ? 'Poll' : 'Ballot'} Active</span>
          </button>
        )}

      {/* Interactive Incoming Trade Proposal Alert Modal */}
      {pendingTradeAlert && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#121620] border-2 border-emerald-500 rounded-3xl w-full max-w-lg shadow-[0_0_50px_rgba(16,185,129,0.35)] overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 p-5 border-b border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-400 animate-pulse">
                  <ArrowLeftRight className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 inline-block mb-1">
                    🚨 INCOMING TRADE PROPOSAL
                  </span>
                  <h3 className="text-lg font-black text-white">
                    Proposal from {pendingTradeAlert.fromTeamName}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setPendingTradeAlert(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl bg-slate-800/80 transition-colors"
                title="Review later in Exchange modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Details */}
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-300">
                <strong className="text-white font-extrabold">{pendingTradeAlert.fromTeamName}</strong> wants to make a trade with your franchise! Review the terms below:
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* You Receive */}
                <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-2">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">
                    🎁 You Receive
                  </span>
                  <div className="font-extrabold text-sm text-white">
                    {pendingTradeAlert.offeredPlayer ? (
                      <>
                        <div className="text-white font-black">{pendingTradeAlert.offeredPlayer.name}</div>
                        <div className="text-[11px] font-semibold text-emerald-300">
                          {pendingTradeAlert.offeredPlayer.role} • Rating {pendingTradeAlert.offeredPlayer.overallRating}
                        </div>
                      </>
                    ) : (
                      <div className="text-slate-400 italic font-medium">No player</div>
                    )}
                  </div>
                  {pendingTradeAlert.offeredCash > 0 && (
                    <div className="text-xs font-black text-emerald-400 bg-emerald-950/80 px-2 py-1 rounded-lg border border-emerald-500/30">
                      + ₹{pendingTradeAlert.offeredCash.toFixed(2)} Cr Cash
                    </div>
                  )}
                </div>

                {/* You Give */}
                <div className="p-3.5 rounded-2xl bg-orange-950/40 border border-orange-500/40 space-y-2">
                  <span className="text-[10px] font-black text-orange-400 uppercase tracking-wider block">
                    📤 You Give
                  </span>
                  <div className="font-extrabold text-sm text-white">
                    {pendingTradeAlert.requestedPlayer ? (
                      <>
                        <div className="text-white font-black">{pendingTradeAlert.requestedPlayer.name}</div>
                        <div className="text-[11px] font-semibold text-orange-300">
                          {pendingTradeAlert.requestedPlayer.role} • Rating {pendingTradeAlert.requestedPlayer.overallRating}
                        </div>
                      </>
                    ) : (
                      <div className="text-slate-400 italic font-medium">No player</div>
                    )}
                  </div>
                  {pendingTradeAlert.requestedCash > 0 && (
                    <div className="text-xs font-black text-orange-400 bg-orange-950/80 px-2 py-1 rounded-lg border border-orange-500/30">
                      + ₹{pendingTradeAlert.requestedCash.toFixed(2)} Cr Cash
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    socket.emit('trade:reject', {
                      code,
                      playerToken: playerId,
                      tradeId: pendingTradeAlert.id,
                    });
                    setPendingTradeAlert(null);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-extrabold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span>Reject Offer</span>
                </button>

                <button
                  onClick={() => {
                    socket.emit('trade:accept', {
                      code,
                      playerToken: playerId,
                      tradeId: pendingTradeAlert.id,
                    });
                    setPendingTradeAlert(null);
                    sounds.playSoldSound();
                    setConfettiTrigger(true);
                    setTimeout(() => setConfettiTrigger(false), 3000);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:brightness-110 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98]"
                >
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>Accept Trade</span>
                </button>
              </div>

              <div className="text-center pt-1">
                <button
                  onClick={() => {
                    setPendingTradeAlert(null);
                    setShowExchangeModal(true);
                  }}
                  className="text-[11px] text-slate-400 hover:text-emerald-400 underline transition-colors"
                >
                  Open Full IPL Trading & Exchange Window
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Room Players & Host Kick Manager Modal */}

      {/* Room Players & Host Kick Manager Modal */}
      {showPlayersModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6 border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-400" />
                <h3 className="text-base font-extrabold text-white">Room Players ({room.players.length}/10)</h3>
              </div>
              <button
                onClick={() => setShowPlayersModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {room.players.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-slate-800 text-orange-400 font-bold text-xs flex items-center justify-center border border-slate-700">
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
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">{p.name}</span>
                        {p.id === playerId && (
                          <span className="text-[10px] text-orange-400 font-bold flex items-center gap-0.5">
                            (You)
                            <button
                              onClick={() => setShowEditNameModal(true)}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-orange-400 transition-all ml-0.5"
                              title="Edit Display Name"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </span>
                        )}
                        {p.isHost && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold">
                            Host
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {p.teamId ? (
                          <span className="text-[10px] text-slate-400">
                            Franchise: <span className="font-bold text-slate-200">{p.teamId}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">No team assigned</span>
                        )}
                        {!p.isOnline && (
                          <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded">
                            Offline
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!p.isHost && isHost && (
                    <button
                      onClick={() => setPlayerToKick({ id: p.id, name: p.name })}
                      className="px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-1 transition-all"
                      title="Remove player for misbehavior"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>Kick</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowPlayersModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kick Player Confirmation Modal */}
      {playerToKick && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-sm rounded-3xl p-6 border border-red-500/40 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Remove Player?</h3>
              <p className="text-xs text-slate-300 mt-1">
                Are you sure you want to remove <span className="font-extrabold text-red-400">{playerToKick.name}</span> from the auction? Their team will be converted to bot management so the auction continues smoothly.
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
      {/* Edit Display Name Modal */}
      <EditNameModal
        isOpen={showEditNameModal}
        onClose={() => setShowEditNameModal(false)}
        currentName={me?.name || ''}
        onSave={handleSaveName}
      />
    </div>
  );
};


