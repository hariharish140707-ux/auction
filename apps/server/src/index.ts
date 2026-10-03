import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { roomStore } from './store';
import { setupSocketHandlers } from './socket-handler';

dotenv.config();

const app = express();
app.use(cors());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// REST endpoint for browsing public rooms
app.get('/api/rooms/public', async (req, res) => {
  try {
    const publicRooms = await roomStore.listPublicRooms();
    res.json({ success: true, rooms: publicRooms });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// All other web pages and Next.js assets proxy to Next.js on port 3000
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }

  const options: http.RequestOptions = {
    hostname: '127.0.0.1',
    port: 3000,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: req.headers.host || 'localhost:3000',
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      res.status(502).send('Web client is initializing, please refresh in 3 seconds...');
    }
  });

  req.pipe(proxyReq, { end: true });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 30000,
  pingInterval: 10000,
  transports: ['websocket', 'polling'],
});

// Setup Socket.IO handlers
setupSocketHandlers(io);

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`🚀 IPL Auction Unified Server listening on port ${PORT}`);
});
