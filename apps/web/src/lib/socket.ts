import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    // In production, connect directly to the server URL if provided
    // Otherwise, use same-origin (works for dev with Next.js proxy, or same-domain setups)
    let serverUrl: string;

    if (typeof window !== 'undefined') {
      const envUrl = process.env.NEXT_PUBLIC_SERVER_URL;
      if (envUrl && envUrl.trim()) {
        // Ensure the URL has a protocol
        serverUrl = envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
      } else {
        // Fallback: use same origin (for dev proxy or single-domain deploy)
        serverUrl = window.location.origin;
      }
    } else {
      serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';
    }

    socket = io(serverUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}
