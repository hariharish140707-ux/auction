import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    let serverUrl: string = '';

    if (typeof window !== 'undefined') {
      const envUrl = process.env.NEXT_PUBLIC_SERVER_URL;
      if (envUrl && envUrl.trim()) {
        serverUrl = envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
      } else {
        // Smart Render fallback: If on *.onrender.com and URL has -web, infer -server backend
        const hostname = window.location.hostname;
        if (hostname.endsWith('.onrender.com') && hostname.includes('-web')) {
          const serverHostname = hostname.replace('-web', '-server');
          serverUrl = `${window.location.protocol}//${serverHostname}`;
        } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
          serverUrl = 'http://localhost:4000';
        } else {
          serverUrl = window.location.origin;
        }
      }
    } else {
      serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';
    }

    console.log(`🔌 Socket connecting to backend server: ${serverUrl}`);

    socket = io(serverUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}
