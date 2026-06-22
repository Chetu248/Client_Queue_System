/**
 * QueueCure'26 — Backend Server
 *
 * Express HTTP + Socket.io WebSocket server.
 * io instance is injected into every request via ioMiddleware so
 * controllers can emit events without a module-level singleton.
 */

const express       = require('express');
const http          = require('http');
const { Server }    = require('socket.io');
const cors          = require('cors');
const authRoutes    = require('./routes/authRoutes');
const queueRoutes   = require('./routes/queueRoutes');
const socketHandler = require('./socket/socketHandler');

const app    = express();
const server = http.createServer(app);

// ── CORS ─────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'];

const corsOptions = {
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods:      ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:  true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // pre-flight

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Socket.io ─────────────────────────────────────────────────
const io = new Server(server, {
  cors: corsOptions,
  pingTimeout:  60_000,
  pingInterval: 25_000,
  // Allow long-polling fallback for environments that block WebSockets
  transports: ['websocket', 'polling'],
});

socketHandler(io);

// ── Inject io into every request so controllers can emit ─────
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// ── Health check ─────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ status: "QueueCure'26 API is running", timestamp: new Date().toISOString() });
});

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api',      queueRoutes);

// ── 404 ──────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));

// ── Global error handler ──────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`\n🏥  QueueCure'26 server  →  http://localhost:${PORT}`);
  console.log(`📡  Socket.io ready for real-time connections\n`);
});

module.exports = { app, server, io };
