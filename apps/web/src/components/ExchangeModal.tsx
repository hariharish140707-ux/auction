'use client';

import React, { useState, useEffect } from 'react';
import { RoomSnapshot, TradeOffer, TransferListing, IPL_TEAMS, TeamSquadEntry } from '@ipl-auction/shared';
import { getSocket } from '../lib/socket';
import { TeamBadge } from './TeamBadge';
import {
  X,
  ArrowLeftRight,
  Send,
  Check,
  XCircle,
  Tag,
  Coins,
  Shield,
  Layers,
  AlertCircle,
  PlusCircle,
  Trash2,
  Inbox,
  SendHorizontal,
} from 'lucide-react';

interface ExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: RoomSnapshot;
  playerId: string;
  code: string;
  initialTargetTeamId?: string | null;
  initialTargetPlayerId?: string | null;
}

export const ExchangeModal: React.FC<ExchangeModalProps> = ({
  isOpen,
  onClose,
  room,
  playerId,
  code,
  initialTargetTeamId,
  initialTargetPlayerId,
}) => {
  const [subTab, setSubTab] = useState<'market' | 'propose' | 'proposals' | 'list'>('market');

  const socket = getSocket();
  const me = room.players.find((p) => p.id === playerId);
  const myTeamId = me?.teamId;
  const myTeam = myTeamId ? room.teams[myTeamId] : null;

  // Propose trade form state
  const [targetTeamId, setTargetTeamId] = useState<string>(
    initialTargetTeamId ||
      Object.keys(room.teams).find((t) => t !== myTeamId) ||
      'MI'
  );
  const [offeredPlayerId, setOfferedPlayerId] = useState<string>('');
  const [offeredCash, setOfferedCash] = useState<string>('0');
  const [requestedPlayerId, setRequestedPlayerId] = useState<string>(initialTargetPlayerId || '');
  const [requestedCash, setRequestedCash] = useState<string>('0');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // List on board form state
  const [listingPlayerId, setListingPlayerId] = useState<string>('');
  const [listingAskingCash, setListingAskingCash] = useState<string>('0');
  const [listingNotes, setListingNotes] = useState<string>('');

  useEffect(() => {
    if (initialTargetTeamId) setTargetTeamId(initialTargetTeamId);
    if (initialTargetPlayerId) setRequestedPlayerId(initialTargetPlayerId);
  }, [initialTargetTeamId, initialTargetPlayerId]);

  // Listen to socket feedback inside modal
  useEffect(() => {
    if (!isOpen) return;

    const handleError = (err: { message: string }) => {
      setIsProcessing(false);
      setFormError(err.message || 'Operation failed');
    };

    const handleProposed = (payload?: any) => {
      setIsProcessing(false);
      setOfferedPlayerId('');
      setOfferedCash('0');
      setRequestedPlayerId('');
      setRequestedCash('0');
      setTimeout(() => setSuccessMsg(null), 5000);
      setSubTab('proposals');
    };

    const handleAccepted = (payload?: any) => {
      setIsProcessing(false);
      const trade = payload?.trade;
      const desc = trade
        ? `${trade.fromTeamId} & ${trade.toTeamId} trade completed!`
        : 'Trade accepted! Players and funds exchanged.';
      setSuccessMsg(`🎉 ${desc}`);
      setTimeout(() => setSuccessMsg(null), 5000);
    };

    const handleRejected = (payload?: any) => {
      setIsProcessing(false);
      const trade = payload?.trade;
      const reason = trade?.reason ? ` (${trade.reason})` : '';
      setSuccessMsg(`❌ Trade proposal was declined${reason}.`);
      setTimeout(() => setSuccessMsg(null), 5000);
    };

    const handleCancelled = () => {
      setIsProcessing(false);
      setSuccessMsg('Trade proposal cancelled.');
      setTimeout(() => setSuccessMsg(null), 4000);
    };

    const handleListed = () => {
      setIsProcessing(false);
      setListingPlayerId('');
      setListingAskingCash('0');
      setListingNotes('');
      setSuccessMsg('Player listed on Exchange Board!');
      setTimeout(() => setSuccessMsg(null), 4000);
      setSubTab('market');
    };

    const handleDelisted = () => {
      setIsProcessing(false);
      setSuccessMsg('Listing removed from Exchange Board.');
      setTimeout(() => setSuccessMsg(null), 4000);
    };

    socket.on('error', handleError);
    socket.on('trade:proposed', handleProposed);
    socket.on('trade:accepted', handleAccepted);
    socket.on('trade:rejected', handleRejected);
    socket.on('trade:cancelled', handleCancelled);
    socket.on('exchange:listed', handleListed);
    socket.on('exchange:delisted', handleDelisted);

    return () => {
      socket.off('error', handleError);
      socket.off('trade:proposed', handleProposed);
      socket.off('trade:accepted', handleAccepted);
      socket.off('trade:rejected', handleRejected);
      socket.off('trade:cancelled', handleCancelled);
      socket.off('exchange:listed', handleListed);
      socket.off('exchange:delisted', handleDelisted);
    };
  }, [isOpen, socket]);

  if (!isOpen) return null;

  const isHost = !!me?.isHost || room.hostId === playerId;

  const isBotTeam = (teamId: string) => {
    const team = room.teams[teamId];
    if (!team) return false;
    if (team.isBotOwner) return true;
    if (!team.ownerId) return true;
    const owner = room.players.find((p) => p.id === team.ownerId);
    return !!owner?.isBot;
  };

  const targetTeam = targetTeamId ? room.teams[targetTeamId] : null;
  const trades = room.trades || [];
  const transferListings = room.transferListings || [];

  const incomingTrades = trades.filter((t) => t.toTeamId === myTeamId && t.status === 'PENDING');
  const outgoingTrades = trades.filter((t) => t.fromTeamId === myTeamId || t.fromPlayerId === playerId);
  const aiPendingTrades = isHost
    ? trades.filter(
        (t) => t.status === 'PENDING' && isBotTeam(t.toTeamId) && t.toTeamId !== myTeamId
      )
    : [];

  const handleProposeTrade = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    if (!myTeamId) {
      setFormError('You must claim a franchise before trading');
      return;
    }

    const offerCashNum = Math.max(0, Math.round((Number(offeredCash) || 0) * 100) / 100);
    const reqCashNum = Math.max(0, Math.round((Number(requestedCash) || 0) * 100) / 100);

    const hasOffer = !!offeredPlayerId || offerCashNum > 0;
    const hasRequest = !!requestedPlayerId || reqCashNum > 0;

    if (!hasOffer) {
      setFormError('Please offer either a player from your squad or cash (> ₹0 Cr)');
      return;
    }

    if (!hasRequest) {
      setFormError('Please request either a player or cash (> ₹0 Cr) from the target franchise');
      return;
    }

    if (offerCashNum > (myTeam?.purseRemaining || 0)) {
      setFormError(`Insufficient purse! You only have ₹${myTeam?.purseRemaining.toFixed(2)} Cr`);
      return;
    }

    setIsProcessing(true);
    setTimeout(() => setIsProcessing(false), 3500);

    const isTargetBot = isBotTeam(targetTeamId);
    setSuccessMsg(
      isTargetBot
        ? `Trade proposal sent! 🤖 ${targetTeamId} AI is reviewing your offer...`
        : 'Trade proposal sent successfully!'
    );

    socket.emit('trade:propose', {
      code,
      playerToken: playerId,
      toTeamId: targetTeamId,
      offeredPlayerId: offeredPlayerId || null,
      offeredCash: offerCashNum,
      requestedPlayerId: requestedPlayerId || null,
      requestedCash: reqCashNum,
    });
  };

  const handleAcceptTrade = (tradeId: string) => {
    setFormError(null);
    setIsProcessing(true);
    setTimeout(() => setIsProcessing(false), 3500);
    socket.emit('trade:accept', { code, playerToken: playerId, tradeId });
  };

  const handleRejectTrade = (tradeId: string) => {
    setFormError(null);
    setIsProcessing(true);
    setTimeout(() => setIsProcessing(false), 3500);
    socket.emit('trade:reject', { code, playerToken: playerId, tradeId });
  };

  const handleCancelTrade = (tradeId: string) => {
    setFormError(null);
    setIsProcessing(true);
    setTimeout(() => setIsProcessing(false), 3500);
    socket.emit('trade:cancel', { code, playerToken: playerId, tradeId });
  };

  const handleListPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!listingPlayerId) return;

    setFormError(null);
    setIsProcessing(true);
    setTimeout(() => setIsProcessing(false), 3500);
    socket.emit('exchange:list', {
      code,
      playerToken: playerId,
      playerId: listingPlayerId,
      askingCash: Number(listingAskingCash) || 0,
      notes: listingNotes || 'Open for exchange or player swap',
    });
  };

  const handleDelistPlayer = (listingId: string) => {
    setFormError(null);
    setIsProcessing(true);
    setTimeout(() => setIsProcessing(false), 3500);
    socket.emit('exchange:delist', { code, playerToken: playerId, listingId });
  };

  const startTradeFromMarket = (listing: TransferListing) => {
    setTargetTeamId(listing.teamId);
    setRequestedPlayerId(listing.player.id);
    if (listing.askingCash && listing.askingCash > 0) {
      setOfferedCash(listing.askingCash.toString());
    } else {
      setOfferedCash('0');
    }
    setRequestedCash('0');
    setOfferedPlayerId('');
    setFormError(null);
    setSuccessMsg(null);
    setSubTab('propose');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      <div className="bg-[#121620] border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-wide">IPL Trading & Exchange Window</h2>
              <p className="text-xs text-slate-400">Swap unwanted players with other franchises for players or purse funds</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub Tabs */}
        <div className="px-5 pt-3 flex flex-wrap gap-2 border-b border-slate-800/60 bg-[#0F131C]">
          <button
            onClick={() => setSubTab('market')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
              subTab === 'market'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exchange Board</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-300 text-[10px]">
              {transferListings.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('propose')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
              subTab === 'propose'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <SendHorizontal className="w-3.5 h-3.5 text-orange-400" />
            <span>Propose Swap</span>
          </button>

          <button
            onClick={() => setSubTab('proposals')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
              subTab === 'proposals'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Inbox className="w-3.5 h-3.5 text-blue-400" />
            <span>Proposals</span>
            {incomingTrades.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-extrabold animate-pulse">
                {incomingTrades.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTab('list')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
              subTab === 'list'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>List My Players</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TAB 1: Exchange Board */}
          {subTab === 'market' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Franchise Transfer Listings ({transferListings.length})
                </h3>
                <span className="text-[11px] text-slate-500">Listed by teams looking to swap or sell</span>
              </div>

              {transferListings.length === 0 ? (
                <div className="py-16 text-center space-y-3 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                  <Tag className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">No players listed on the exchange board yet.</p>
                  <button
                    onClick={() => setSubTab('list')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-4 h-4" />
                    List a Player from your squad
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {transferListings.map((listing) => (
                    <div
                      key={listing.id}
                      className="p-4 rounded-2xl bg-[#171B26] border border-slate-800 flex flex-col justify-between gap-3 shadow-md"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TeamBadge teamId={listing.teamId} size="sm" />
                            <span className="text-xs font-extrabold text-white">{listing.teamName}</span>
                          </div>
                          {listing.teamId === myTeamId && (
                            <button
                              onClick={() => handleDelistPlayer(listing.id)}
                              title="Remove Listing"
                              className="text-slate-500 hover:text-red-400 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div>
                          <h4 className="font-extrabold text-sm text-white">{listing.player.name}</h4>
                          <p className="text-[11px] text-slate-400">
                            {listing.player.role} {listing.player.isOverseas && '• ✈️ OS'} • Bought for ₹
                            {listing.buyPrice.toFixed(2)} Cr
                          </p>
                        </div>

                        {listing.notes && (
                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-[11px] text-slate-300 italic">
                            "{listing.notes}"
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block uppercase">Asking</span>
                          <span className="text-xs font-extrabold text-emerald-400">
                            {listing.askingCash && listing.askingCash > 0
                              ? `₹${listing.askingCash.toFixed(2)} Cr`
                              : 'Player Swap'}
                          </span>
                        </div>

                        {listing.teamId !== myTeamId && (
                          <button
                            onClick={() => startTradeFromMarket(listing)}
                            className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1 shadow"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            <span>Trade</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Propose Swap / Cash Offer */}
          {subTab === 'propose' && (
            <form onSubmit={handleProposeTrade} className="space-y-4">
              {!myTeamId ? (
                <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>You must select a team in the lobby/auction before proposing trades.</span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* LEFT: You Offer */}
                    <div className="p-4 rounded-2xl bg-[#171B26] border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wide">
                          You Give ({myTeamId})
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">
                          Purse: ₹{myTeam?.purseRemaining.toFixed(2)} Cr
                        </span>
                      </div>

                      {/* Select Player from Squad */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          Select Player to Exchange
                        </label>
                        <select
                          value={offeredPlayerId}
                          onChange={(e) => setOfferedPlayerId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value="">-- No Player (Cash Only) --</option>
                          {myTeam?.squad.map((s) => (
                            <option key={s.playerId} value={s.playerId}>
                              {s.player.name} ({s.player.role}, ₹{s.buyPrice.toFixed(2)} Cr)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Add Cash Offer */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          Add Cash to Offer (₹ in Crores)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max={myTeam?.purseRemaining || 0}
                          value={offeredCash}
                          onChange={(e) => setOfferedCash(e.target.value)}
                          placeholder="0.0"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* RIGHT: You Receive */}
                    <div className="p-4 rounded-2xl bg-[#171B26] border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-xs font-extrabold text-orange-400 uppercase tracking-wide">
                          You Receive
                        </span>
                        <div className="flex items-center gap-1.5">
                          <TeamBadge teamId={targetTeamId} size="sm" />
                          <span className="text-xs text-slate-300 font-bold">{targetTeamId}</span>
                        </div>
                      </div>

                      {/* Select Target Team */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">Target Franchise</label>
                        <select
                          value={targetTeamId}
                          onChange={(e) => {
                            setTargetTeamId(e.target.value);
                            setRequestedPlayerId('');
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                        >
                          {Object.keys(room.teams)
                            .filter((t) => t !== myTeamId)
                            .map((t) => {
                              const meta = IPL_TEAMS.find((item) => item.id === t);
                              return (
                                <option key={t} value={t}>
                                  {meta?.name || t} ({room.teams[t]?.squad.length} players)
                                </option>
                              );
                            })}
                        </select>
                      </div>

                      {/* Select Requested Player */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          Player You Want From {targetTeamId}
                        </label>
                        <select
                          value={requestedPlayerId}
                          onChange={(e) => setRequestedPlayerId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                        >
                          <option value="">-- No Player (Selling for Cash) --</option>
                          {targetTeam?.squad.map((s) => (
                            <option key={s.playerId} value={s.playerId}>
                              {s.player.name} ({s.player.role}, ₹{s.buyPrice.toFixed(2)} Cr)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Request Cash */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          Request Cash From {targetTeamId} (₹ in Crores)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={requestedCash}
                          onChange={(e) => setRequestedCash(e.target.value)}
                          placeholder="0.0"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>

                  {formError && (
                    <div className="p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {successMsg && (
                    <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className={`w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:brightness-110 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.99] ${
                      isProcessing ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    <span>{isProcessing ? 'Sending...' : 'Send Trade Proposal'}</span>
                  </button>
                </>
              )}
            </form>
          )}

          {/* TAB 3: Proposals (Incoming & Outgoing) */}
          {subTab === 'proposals' && (
            <div className="space-y-6">
              {formError && (
                <div className="p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Host AI Franchise Proposals */}
              {isHost && aiPendingTrades.length > 0 && (
                <div className="space-y-3 p-4 rounded-2xl bg-[#141A29] border border-blue-500/30">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span>Franchise / Bot Trade Approvals ({aiPendingTrades.length})</span>
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">
                      Host Control
                    </span>
                  </div>

                  <div className="space-y-3">
                    {aiPendingTrades.map((trade) => (
                      <div
                        key={trade.id}
                        className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TeamBadge teamId={trade.fromTeamId} size="sm" />
                            <span className="font-extrabold text-xs text-white">
                              {trade.fromTeamName} ➔ {trade.toTeamName} (AI)
                            </span>
                          </div>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 animate-pulse">
                            PENDING (AI / Host)
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px]">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-500 block">Offer:</span>
                            <span className="font-bold text-emerald-400">
                              {trade.offeredPlayer?.name || 'No player'}
                              {trade.offeredCash > 0 && ` + ₹${trade.offeredCash.toFixed(2)} Cr`}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-500 block">Wants:</span>
                            <span className="font-bold text-orange-400">
                              {trade.requestedPlayer?.name || 'No player'}
                              {trade.requestedCash > 0 && ` + ₹${trade.requestedCash.toFixed(2)} Cr`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() => handleRejectTrade(trade.id)}
                            disabled={isProcessing}
                            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                          >
                            Reject on Bot's Behalf
                          </button>
                          <button
                            onClick={() => handleAcceptTrade(trade.id)}
                            disabled={isProcessing}
                            className="px-3.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center gap-1 shadow"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Force Accept</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Incoming Offers */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <Inbox className="w-4 h-4" />
                  <span>Incoming Trade Proposals ({incomingTrades.length})</span>
                </h3>

                {incomingTrades.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500 italic bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
                    No incoming trade offers right now.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {incomingTrades.map((trade) => (
                      <div
                        key={trade.id}
                        className="p-4 rounded-2xl bg-[#171B26] border border-emerald-500/40 space-y-3 shadow-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TeamBadge teamId={trade.fromTeamId} size="sm" />
                            <span className="font-extrabold text-sm text-white">
                              {trade.fromTeamName} proposed a trade
                            </span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            PENDING
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">They Give:</span>
                            <div className="font-bold text-emerald-400">
                              {trade.offeredPlayer?.name || 'No player'}
                              {trade.offeredCash > 0 && ` + ₹${trade.offeredCash.toFixed(2)} Cr`}
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">They Want:</span>
                            <div className="font-bold text-orange-400">
                              {trade.requestedPlayer?.name || 'No player'}
                              {trade.requestedCash > 0 && ` + ₹${trade.requestedCash.toFixed(2)} Cr`}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() => handleRejectTrade(trade.id)}
                            disabled={isProcessing}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleAcceptTrade(trade.id)}
                            disabled={isProcessing}
                            className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs flex items-center gap-1 shadow disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            {isProcessing ? 'Accepting...' : 'Accept Trade'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Outgoing Offers */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <SendHorizontal className="w-4 h-4" />
                  <span>Your Sent Proposals ({outgoingTrades.length})</span>
                </h3>

                {outgoingTrades.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500 italic bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
                    You haven't sent any proposals yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {outgoingTrades.map((trade) => (
                      <div
                        key={trade.id}
                        className="p-3.5 rounded-2xl bg-[#171B26] border border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">To {trade.toTeamName}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                trade.status === 'ACCEPTED'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : trade.status === 'REJECTED'
                                  ? 'bg-red-500/20 text-red-400'
                                  : trade.status === 'CANCELLED'
                                  ? 'bg-slate-800 text-slate-400'
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              {trade.status}
                            </span>
                            {trade.status === 'PENDING' && isBotTeam(trade.toTeamId) && (
                              <span className="text-[10px] text-amber-400 flex items-center gap-1 font-semibold animate-pulse">
                                🤖 Reviewing...
                              </span>
                            )}
                          </div>
                          <p className="text-slate-400 text-[11px]">
                            Offered: {trade.offeredPlayer?.name || '₹' + trade.offeredCash.toFixed(2) + ' Cr'} ➔ For:{' '}
                            {trade.requestedPlayer?.name || '₹' + trade.requestedCash.toFixed(2) + ' Cr'}
                          </p>
                          {trade.status === 'REJECTED' && trade.reason && (
                            <p className="text-[10px] text-red-400/90 italic">
                              Feedback: "{trade.reason}"
                            </p>
                          )}
                        </div>

                        {trade.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancelTrade(trade.id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-red-400 text-xs font-bold"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: List My Players */}
          {subTab === 'list' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                Put players you don't need on the public Exchange Board so other franchises can send you trade offers!
              </div>

              {!myTeamId || myTeam?.squad.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  You don't have any players in your squad yet to list.
                </div>
              ) : (
                <form onSubmit={handleListPlayer} className="p-4 rounded-2xl bg-[#171B26] border border-slate-800 space-y-3">
                  {formError && (
                    <div className="p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}
                  {successMsg && (
                    <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Choose Player to Put on Exchange
                    </label>
                    <select
                      value={listingPlayerId}
                      onChange={(e) => setListingPlayerId(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- Choose Player --</option>
                      {myTeam?.squad.map((s) => (
                        <option key={s.playerId} value={s.playerId}>
                          {s.player.name} ({s.player.role}, ₹{s.buyPrice.toFixed(2)} Cr)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Asking Cash (Optional, ₹ in Crores)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={listingAskingCash}
                      onChange={(e) => setListingAskingCash(e.target.value)}
                      placeholder="0.0 for player swap"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Notes / What are you looking for?
                    </label>
                    <input
                      type="text"
                      value={listingNotes}
                      onChange={(e) => setListingNotes(e.target.value)}
                      placeholder="e.g., Looking for a quality fast bowler or cash offer"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow disabled:opacity-50"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>{isProcessing ? 'Listing...' : 'Post on Exchange Board'}</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
