/**
 * QueueCure'26 — In-Memory Store
 *
 * MongoDB-ready architecture: every function signature mirrors what a Mongoose
 * model would expose.  To upgrade to MongoDB, replace only this file — all
 * controllers and socket handlers remain unchanged.
 *
 * Edge cases handled here:
 *  • Duplicate patient (same phone, same visit) → throws
 *  • Emergency insertion → placed right after current in-progress patient
 *  • Call-next mutex  → prevents race condition from double-clicks / multiple tabs
 *  • Delete guard     → blocks deleting a patient who is currently in-progress
 *  • Token collision  → server-side sequential counter guarantees uniqueness
 */

// ─────────────────────────── STATE ───────────────────────────
let queue = [];           // Full patient list (all statuses)
let currentToken = null;  // Token string of the patient currently being served
let isPaused     = false; // Whether the receptionist has paused the queue
let avgConsultationTime = 5;  // Minutes per patient (default 5)
let tokenCounter = 0;    // Ever-increasing counter for token generation
let isCallNextLocked = false; // Mutex flag — prevents concurrent callNext()

let stats = {
  totalServedToday: 0,
  peakQueueLength: 0,
  totalWaitTimeMinutes: 0,
};

// ─────────────────────── TOKEN GENERATION ────────────────────
/**
 * Generates A001, A002 … A999 sequentially.
 * Server-side ensures uniqueness even across multiple browser tabs.
 */
const generateToken = () => {
  tokenCounter += 1;
  return `A${String(tokenCounter).padStart(3, '0')}`;
};

// ──────────────────────────── GETTERS ────────────────────────
const getQueue                 = () => [...queue]; // shallow copy — never expose raw array
const getWaitingQueue          = () => queue.filter(p => p.status === 'waiting');
const getCurrentToken          = () => currentToken;
const getIsPaused              = () => isPaused;
const getAvgConsultationTime   = () => avgConsultationTime;

const getStats = () => {
  const waitingCount   = queue.filter(p => p.status === 'waiting').length;
  const inProgressCount = queue.filter(p => p.status === 'in-progress').length;
  const completedCount = queue.filter(p => p.status === 'completed').length;
  const totalActive    = waitingCount + inProgressCount + completedCount;
  const efficiency     = totalActive > 0
    ? Math.min(100, Math.round((completedCount / totalActive) * 100))
    : 0;

  return {
    ...stats,
    waitingCount,
    inProgressCount,
    completedCount,
    efficiency,
    avgConsultationTime,
    estimatedFinishTime: calculateEstimatedFinishTime(),
    avgWaitTimeMinutes: stats.totalServedToday > 0
      ? Math.round(stats.totalWaitTimeMinutes / stats.totalServedToday)
      : 0,
  };
};

// ──────────────────── WAIT-TIME CALCULATION ──────────────────
/**
 * Estimated wait = (patients ahead in "waiting" list) × avgConsultationTime.
 * Never hardcoded — always derived from live avgConsultationTime setting.
 */
const calculateWaitTime = (patientId) => {
  const waitingList  = queue.filter(p => p.status === 'waiting');
  const patientIndex = waitingList.findIndex(p => p.id === patientId);
  if (patientIndex === -1) return null;
  return patientIndex * avgConsultationTime; // minutes
};

const calculateEstimatedFinishTime = () => {
  const remaining = queue.filter(p => ['waiting', 'in-progress'].includes(p.status)).length;
  if (remaining === 0) return null;
  return new Date(Date.now() + remaining * avgConsultationTime * 60_000).toISOString();
};

// ──────────────────── PATIENT OPERATIONS ─────────────────────

/**
 * addPatient — validates, generates token, inserts into queue.
 *
 * Emergency patients are placed immediately after the current in-progress
 * patient (or at the front if no one is being served), so they are served
 * on the very next "Call Next" click.
 */
const addPatient = (patientData) => {
  // Duplicate guard: same phone number already active in queue
  const duplicate = queue.find(
    p => p.phone === patientData.phone && p.status !== 'completed'
  );
  if (duplicate) {
    throw new Error(
      `Patient with phone ${patientData.phone} already in queue as token ${duplicate.token}.`
    );
  }

  const token = generateToken();
  const patient = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    token,
    name:     patientData.name.trim(),
    age:      parseInt(patientData.age, 10),
    phone:    patientData.phone.trim(),
    doctor:   patientData.doctor.trim(),
    priority: patientData.priority || 'normal',
    arrivalTime:       new Date().toISOString(),
    status:            'waiting',
    consultationStart: null,
    consultationEnd:   null,
  };

  if (patient.priority === 'emergency') {
    // Insert after current in-progress patient so they are served next
    const inProgressIdx = queue.findIndex(p => p.status === 'in-progress');
    if (inProgressIdx !== -1) {
      queue.splice(inProgressIdx + 1, 0, patient);
    } else {
      queue.unshift(patient); // No one being served → serve immediately next
    }
  } else {
    queue.push(patient);
  }

  // Track peak queue length for stats
  if (queue.length > stats.peakQueueLength) {
    stats.peakQueueLength = queue.length;
  }

  return patient;
};

/**
 * callNext — the most critical operation.
 *
 * Concurrency guard: isCallNextLocked mutex prevents race conditions from:
 *  • Double-clicks on the Call Next button
 *  • Multiple receptionist browser tabs clicking simultaneously
 *  • Socket + REST both triggering at the same moment
 *
 * The lock is released after 500 ms (via setTimeout in finally block),
 * giving enough time for the response to reach all clients before a
 * second call can be accepted.
 */
const callNext = () => {
  if (isCallNextLocked) {
    throw new Error('Call Next is already processing. Please wait a moment.');
  }
  if (isPaused) {
    throw new Error('Queue is paused. Resume the queue before calling the next patient.');
  }

  isCallNextLocked = true;

  try {
    let completedPatient = null;

    // Step 1: Mark the current in-progress patient as completed
    const inProgressIdx = queue.findIndex(p => p.status === 'in-progress');
    if (inProgressIdx !== -1) {
      queue[inProgressIdx].status          = 'completed';
      queue[inProgressIdx].consultationEnd = new Date().toISOString();
      completedPatient = queue[inProgressIdx];
      stats.totalServedToday += 1;

      // Accumulate real wait-time data for stats
      if (completedPatient.consultationStart) {
        const waitMs = new Date(completedPatient.consultationStart) -
                       new Date(completedPatient.arrivalTime);
        stats.totalWaitTimeMinutes += waitMs / 60_000;
      }
    }

    // Step 2: Promote next "waiting" patient (already priority-ordered by insertion)
    const nextPatient = queue.find(p => p.status === 'waiting');
    if (nextPatient) {
      nextPatient.status            = 'in-progress';
      nextPatient.consultationStart = new Date().toISOString();
      currentToken                  = nextPatient.token;
    } else {
      currentToken = null; // Queue exhausted
    }

    return { completed: completedPatient, next: nextPatient || null };

  } finally {
    // ALWAYS release the mutex — even if an error is thrown
    setTimeout(() => { isCallNextLocked = false; }, 500);
  }
};

// ─────────────────── QUEUE CONTROL ───────────────────────────
const pauseQueue  = () => { isPaused = true;  };
const resumeQueue = () => { isPaused = false; };
const setAvgConsultationTime = (time) => { avgConsultationTime = parseInt(time, 10); };

// ─────────────────── PATIENT CRUD ────────────────────────────
const updatePatient = (id, updates) => {
  const idx = queue.findIndex(p => p.id === id);
  if (idx === -1) return null;
  // Protect immutable fields
  const { id: _id, token: _token, ...safeUpdates } = updates;
  queue[idx] = { ...queue[idx], ...safeUpdates };
  return queue[idx];
};

const deletePatient = (id) => {
  const idx = queue.findIndex(p => p.id === id);
  if (idx === -1) return false;
  // Guard: cannot remove the patient currently being consulted
  if (queue[idx].status === 'in-progress') {
    throw new Error('Cannot remove a patient who is currently being consulted.');
  }
  queue.splice(idx, 1);
  return true;
};

// ─────────────────── STATE SNAPSHOT ──────────────────────────
/** Full state snapshot — sent to clients on connect / reconnect */
const getQueueState = () => ({
  queue:               getQueue(),
  currentToken,
  isPaused,
  avgConsultationTime,
  stats:               getStats(),
});

// ─────────────── PATIENT-FACING WAIT INFO ────────────────────
const getPatientWaitInfo = (token) => {
  const patient     = queue.find(p => p.token === token);
  if (!patient) return null;

  const waitingList  = queue.filter(p => p.status === 'waiting');
  const patientIdx   = waitingList.findIndex(p => p.token === token);
  const inProgress   = queue.find(p => p.status === 'in-progress');

  // tokensAhead: how many waiting patients are before this one
  const tokensAhead = patientIdx === -1 ? 0 : patientIdx;
  const estimatedWait = tokensAhead * avgConsultationTime;

  return {
    patient,
    tokensAhead,
    estimatedWait,          // minutes
    queuePosition:  patientIdx + 1,
    totalWaiting:   waitingList.length,
    currentlyServing: inProgress?.token || currentToken || null,
    nextInLine: waitingList[0]?.token || null,
    status: patient.status,
  };
};

module.exports = {
  getQueue,
  getWaitingQueue,
  getCurrentToken,
  getIsPaused,
  getAvgConsultationTime,
  getStats,
  addPatient,
  callNext,
  pauseQueue,
  resumeQueue,
  setAvgConsultationTime,
  updatePatient,
  deletePatient,
  getQueueState,
  getPatientWaitInfo,
  calculateWaitTime,
};
