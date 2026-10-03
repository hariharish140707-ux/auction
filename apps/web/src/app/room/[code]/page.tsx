'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RoomSnapshot } from '@ipl-auction/shared';
import { getSocket } from '../../../lib/socket';
import { LobbyView } from '../../../components/LobbyView';
import { AuctionView } from '../../../components/AuctionView';
import { ResultsView } from '../../../components/ResultsView';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params?.code as string)?.toUpperCase();

  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isKicked, setIsKicked] = useState(false);
  const [kickReason, setKickReason] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;

    const socket = getSocket();

    let name = localStorage.getItem('ipl_auction_user_name');
    if (!name) {
      name = `Player${Math.floor(Math.random() * 900) + 100}`;
      localStorage.setItem('ipl_auction_user_name', name);
    }

    let token = localStorage.getItem(`ipl_room_${code}_token`);
    if (!token) {
      // Check for persistent global player token first
      const globalToken = localStorage.getItem('ipl_auction_player_token');
      if (globalToken) {
        token = globalToken;
      } else {
        token = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        localStorage.setItem('ipl_auction_player_token', token);
      }
      localStorage.setItem(`ipl_room_${code}_token`, token);
    }
    setPlayerId(token);

    const joinRoom = () => {
      socket.emit('room:join', { code, playerToken: token, playerName: name });
    };

    // Join room initially
    joinRoom();

    // Auto-reconnect on socket connect / wake up
    socket.on('connect', joinRoom);

    socket.on('room:joined', (data: { room: RoomSnapshot; playerId: string }) => {
      setRoom(data.room);
      setPlayerId(data.playerId);
      setErrorMsg(null);
    });

    socket.on('room:state', (updatedRoom: RoomSnapshot) => {
      setRoom(updatedRoom);
    });

    socket.on('player:kicked', (data: { message?: string }) => {
      setIsKicked(true);
      setKickReason(data?.message || 'You have been removed from the room by the host.');
      localStorage.removeItem(`ipl_room_${code}_token`);
      localStorage.removeItem(`ipl_room_${code}_team`);
    });

    socket.on('auction:playerOnBlock', (playerBlock: any) => {
      setRoom((prev) => (prev ? { ...prev, currentPlayerBlock: playerBlock, status: 'PLAYER_ON_BLOCK' } : null));
    });

    socket.on('auction:tick', (data: { secondsLeft: number; timerEndsAt: number }) => {
      setRoom((prev) => {
        if (!prev || !prev.currentPlayerBlock) return prev;
        return {
          ...prev,
          currentPlayerBlock: {
            ...prev.currentPlayerBlock,
            timerSecondsLeft: data.secondsLeft,
            timerEndsAt: data.timerEndsAt,
          },
        };
      });
    });

    socket.on('auction:bidPlaced', (data: { currentPlayerBlock: any; roomSnapshot: RoomSnapshot }) => {
      setRoom(data.roomSnapshot);
    });

    socket.on('auction:sold', (data: { room: RoomSnapshot }) => {
      setRoom(data.room);
    });

    socket.on('auction:unsold', (data: { room: RoomSnapshot }) => {
      setRoom(data.room);
    });

    socket.on('auction:completed', (data: { room: RoomSnapshot }) => {
      setRoom(data.room);
    });

    socket.on('chat:message', (msg: any) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          chatMessages: [...prev.chatMessages, msg],
        };
      });
    });

    socket.on('error', (err: { message: string }) => {
      // Only set fatal page error if we don't even have a room yet (e.g. room not found or banned)
      setRoom((currentRoom) => {
        if (!currentRoom) {
          setErrorMsg(err.message);
        }
        return currentRoom;
      });
    });

    return () => {
      socket.off('connect', joinRoom);
      socket.off('room:joined');
      socket.off('room:state');
      socket.off('player:kicked');
      socket.off('auction:playerOnBlock');
      socket.off('auction:tick');
      socket.off('auction:bidPlaced');
      socket.off('auction:sold');
      socket.off('auction:unsold');
      socket.off('auction:completed');
      socket.off('chat:message');
      socket.off('error');
    };
  }, [code]);

  if (isKicked) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-3xl max-w-md w-full text-center space-y-4 border border-red-500/50 shadow-2xl">
          <div className="text-5xl animate-bounce">🚫</div>
          <h2 className="text-xl font-extrabold text-red-400">Removed from Room</h2>
          <p className="text-xs text-slate-300">
            {kickReason || 'You have been removed from this room by the host for misbehavior.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold text-xs hover:brightness-110 shadow-lg transition-all"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-3xl max-w-md w-full text-center space-y-4 border border-red-500/30">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-bold text-red-400">Unable to Join Room</h2>
          <p className="text-xs text-slate-300">{errorMsg}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-xs hover:bg-orange-600 transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!room || !playerId) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-orange-500 border-t-transparent animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-400">Connecting to room {code}...</p>
        </div>
      </div>
    );
  }

  // Render view depending on status
  if (room.status === 'LOBBY') {
    return <LobbyView room={room} playerId={playerId} code={code} />;
  }

  if (room.status === 'COMPLETED') {
    return <ResultsView room={room} />;
  }

  return <AuctionView room={room} playerId={playerId} code={code} />;
}
