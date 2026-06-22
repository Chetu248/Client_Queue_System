/**
 * Socket.io Client — Singleton instance shared across the entire app.
 *
 * autoConnect: false  → we connect manually in QueueContext after mount,
 *                       giving us control over reconnect logic.
 *
 * Reconnect strategy:
 *   • Up to 10 attempts with exponential back-off (1s … 5s)
 *   • On reconnect, QueueContext emits 'request-sync' to get full state
 *   • transports: ['websocket', 'polling'] — WebSocket first, polling fallback
 *     (important for environments like some corporate proxies that block WS)
 */
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

const socket = io(SOCKET_URL, {
  autoConnect:          false,
  reconnection:         true,
  reconnectionAttempts: 10,
  reconnectionDelay:    1000,
  reconnectionDelayMax: 5000,
  timeout:              20000,
  transports:           ['websocket', 'polling'],
});

if (import.meta.env.DEV) {
  socket.on('connect',       ()      => console.log('[Socket] Connected:', socket.id));
  socket.on('disconnect',    (reason) => console.log('[Socket] Disconnected:', reason));
  socket.on('reconnect',     (n)     => console.log(`[Socket] Reconnected after ${n} attempts`));
  socket.on('connect_error', (err)   => console.warn('[Socket] Error:', err.message));
}

export default socket;
