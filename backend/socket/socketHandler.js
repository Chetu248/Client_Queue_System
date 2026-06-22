/**
 * Socket.io Event Handler
 *
 * Event architecture:
 *
 *  CLIENT → SERVER                  SERVER → ALL CLIENTS
 *  ──────────────────               ─────────────────────────────
 *  identify          →              sync-state          (on connect)
 *  request-sync      →              queue-updated       (any mutation)
 *  call-next (sock)  →              patient-added
 *  ping              →              emergency-added
 *                                   queue-paused
 *                                   queue-resumed
 *                                   average-time-changed
 *                                   token-completed     (sound/animation trigger)
 *                                   pong
 *
 *  Reconnect flow:
 *    Client reconnects → socket 'connect' fires → server emits 'sync-state'
 *    with full queue snapshot → client does one setState() to restore UI.
 *
 *  Multiple-tab / race-condition safety:
 *    • callNext via socket delegates to store.callNext() which has a mutex.
 *    • Every emit carries the full queueState so late-joining tabs stay in sync.
 */
const store = require('../models/inMemoryStore');

const socketHandler = (io) => {
  const clients = new Map(); // socketId → { role, connectedAt }

  io.on('connection', (socket) => {
    console.log(`[SOCKET] Connected: ${socket.id}`);
    clients.set(socket.id, { role: 'unknown', connectedAt: new Date() });

    // ── Immediate full-state sync for new / reconnected clients ──
    socket.emit('sync-state', store.getQueueState());

    // ── Role identification (for logging) ──
    socket.on('identify', ({ role }) => {
      const entry = clients.get(socket.id) || {};
      clients.set(socket.id, { ...entry, role });
      console.log(`[SOCKET] ${socket.id} → role: ${role}`);
    });

    // ── Manual sync request (e.g., after socket.io auto-reconnect) ──
    socket.on('request-sync', () => {
      socket.emit('sync-state', store.getQueueState());
    });

    /**
     * call-next via socket (alternative to REST for lower-latency scenarios).
     * Uses acknowledgement callback so the calling client knows the result.
     */
    socket.on('call-next', (ack) => {
      try {
        const result     = store.callNext();
        const queueState = store.getQueueState();

        // Broadcast to every connected client
        io.emit('queue-updated', { type: 'call-next', ...result, queueState });
        io.emit('token-completed', {
          completedToken: result.completed?.token || null,
          newToken:       result.next?.token || null,
        });

        if (typeof ack === 'function') ack({ success: true, result });

      } catch (err) {
        console.error(`[SOCKET] call-next error: ${err.message}`);
        socket.emit('error-event', { message: err.message });
        if (typeof ack === 'function') ack({ success: false, error: err.message });
      }
    });

    // ── Heartbeat (keeps connections alive through NAT/proxies) ──
    socket.on('ping-check', () => socket.emit('pong-check'));

    // ── Disconnect ──
    socket.on('disconnect', (reason) => {
      console.log(`[SOCKET] Disconnected: ${socket.id} — reason: ${reason}`);
      clients.delete(socket.id);
    });

    socket.on('error', (err) => {
      console.error(`[SOCKET] Error from ${socket.id}:`, err.message);
    });
  });

  // Periodic connection count log (useful on Render free tier)
  setInterval(() => {
    const count = clients.size;
    if (count > 0) console.log(`[SOCKET] Active connections: ${count}`);
  }, 60_000);
};

module.exports = socketHandler;
