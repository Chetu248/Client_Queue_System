/**
 * Queue Controller
 *
 * All functions accept (req, res).  Socket.io instance is attached to
 * req.io by the ioMiddleware in server.js, so no singleton pattern needed.
 *
 * Socket emit pattern:
 *   • Every mutating action emits an event to ALL connected clients (io.emit)
 *   • The emitted payload always includes the full queueState so every client
 *     can do a single setState() rather than incremental patching
 */
const store = require('../models/inMemoryStore');

// ─── Helpers ────────────────────────────────────────────────
const emit = (req, event, payload) => {
  if (req.io) req.io.emit(event, payload);
};

// ─── READ endpoints (public) ────────────────────────────────

/** GET /api/queue — full state (used by Patient Waiting Room on mount) */
const getQueue = (req, res) => {
  try {
    res.json(store.getQueueState());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** GET /api/current-token */
const getCurrentToken = (req, res) => {
  res.json({
    currentToken:       store.getCurrentToken(),
    isPaused:           store.getIsPaused(),
    avgConsultationTime: store.getAvgConsultationTime(),
  });
};

/** GET /api/stats (admin) */
const getStats = (req, res) => {
  try {
    res.json(store.getStats());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** GET /api/patient/wait/:token — patient-facing wait info */
const getPatientWaitInfo = (req, res) => {
  const info = store.getPatientWaitInfo(req.params.token.toUpperCase());
  if (!info) {
    return res.status(404).json({ error: 'Token not found in queue.' });
  }
  res.json(info);
};

// ─── WRITE endpoints (protected) ────────────────────────────

/** POST /api/patient/add */
const addPatient = (req, res) => {
  try {
    const { name, age, phone, doctor, priority } = req.body;

    // Validation
    if (!name || !age || !phone || !doctor) {
      return res.status(400).json({ error: 'name, age, phone, and doctor are all required.' });
    }
    if (isNaN(age) || +age < 0 || +age > 150) {
      return res.status(400).json({ error: 'Age must be a number between 0 and 150.' });
    }

    const patient = store.addPatient({ name, age, phone, doctor, priority });
    const queueState = store.getQueueState();

    // Broadcast to all clients
    const event = priority === 'emergency' ? 'emergency-added' : 'patient-added';
    emit(req, event, { patient, queueState });

    console.log(`[QUEUE] Added: ${patient.token} — ${patient.name} (${patient.priority})`);

    res.status(201).json({
      success: true,
      patient,
      message: `Token ${patient.token} assigned to ${patient.name}`,
    });

  } catch (err) {
    const status = err.message.includes('already in queue') ? 409 : 500;
    res.status(status).json({ error: err.message });
  }
};

/** POST /api/call-next */
const callNext = (req, res) => {
  try {
    const result    = store.callNext();
    const queueState = store.getQueueState();

    emit(req, 'queue-updated', { type: 'call-next', ...result, queueState });

    // Dedicated event for patient room sound / animation
    emit(req, 'token-completed', {
      completedToken: result.completed?.token || null,
      newToken:       result.next?.token || null,
    });

    console.log(`[QUEUE] Call Next → now serving: ${result.next?.token || '(queue empty)'}`);

    res.json({ success: true, ...result, queueState });

  } catch (err) {
    const status = err.message.includes('processing') ? 429
                 : err.message.includes('paused')     ? 403
                 : 500;
    res.status(status).json({ error: err.message });
  }
};

/** POST /api/pause */
const pauseQueue = (req, res) => {
  store.pauseQueue();
  const queueState = store.getQueueState();
  emit(req, 'queue-paused', { isPaused: true, queueState });
  console.log('[QUEUE] Paused');
  res.json({ success: true, isPaused: true });
};

/** POST /api/resume */
const resumeQueue = (req, res) => {
  store.resumeQueue();
  const queueState = store.getQueueState();
  emit(req, 'queue-resumed', { isPaused: false, queueState });
  console.log('[QUEUE] Resumed');
  res.json({ success: true, isPaused: false });
};

/** POST /api/avg-time */
const setAvgTime = (req, res) => {
  const { time } = req.body;
  const valid    = [2, 5, 10, 15];

  if (!valid.includes(+time)) {
    return res.status(400).json({ error: `Invalid time. Choose from: ${valid.join(', ')} minutes.` });
  }

  store.setAvgConsultationTime(time);
  const queueState = store.getQueueState();
  emit(req, 'average-time-changed', { avgConsultationTime: +time, queueState });

  console.log(`[QUEUE] Avg consultation time set to ${time} min`);
  res.json({ success: true, avgConsultationTime: +time });
};

/** PUT /api/patient/:id */
const updatePatient = (req, res) => {
  try {
    const patient = store.updatePatient(req.params.id, req.body);
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });

    const queueState = store.getQueueState();
    emit(req, 'queue-updated', { type: 'patient-updated', patient, queueState });

    res.json({ success: true, patient });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** DELETE /api/patient/:id */
const deletePatient = (req, res) => {
  try {
    const deleted = store.deletePatient(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Patient not found.' });

    const queueState = store.getQueueState();
    emit(req, 'queue-updated', { type: 'patient-deleted', id: req.params.id, queueState });

    res.json({ success: true, message: 'Patient removed from queue.' });
  } catch (err) {
    const status = err.message.includes('Cannot remove') ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
};

module.exports = {
  getQueue,
  getCurrentToken,
  getStats,
  getPatientWaitInfo,
  addPatient,
  callNext,
  pauseQueue,
  resumeQueue,
  setAvgTime,
  updatePatient,
  deletePatient,
};
