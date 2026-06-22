/**
 * QueueContext
 *
 * Central state store for all queue data.  Combines:
 *  • REST API calls (initial load, mutations)
 *  • Socket.io subscriptions (real-time patches from server)
 *
 * Design principle: server is the source of truth.
 * Every socket event from the server carries the FULL queueState so the
 * client always does a single setState() — no partial patching, no drift.
 *
 * Concurrency / edge-case notes:
 *  • callNext debounce — ignores clicks within 800 ms of the previous call
 *  • Socket reconnect  — emits 'request-sync' so missed events are recovered
 *  • Browser refresh   — QueueContext re-mounts, connects socket, fetches REST state
 *  • Multiple tabs     — all tabs subscribe to the same socket room; one
 *                        tab's callNext broadcasts to all others instantly
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import socket from '../socket/socket';
import { useAuth } from './AuthContext';

const QueueContext = createContext(null);

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const QueueProvider = ({ children }) => {
  const { authFetch, isAuthenticated, user } = useAuth();

  // ── Queue state ──────────────────────────────────────────────
  const [queue,               setQueue]               = useState([]);
  const [currentToken,        setCurrentToken]        = useState(null);
  const [isPaused,            setIsPaused]            = useState(false);
  const [avgConsultationTime, setAvgConsultationTime] = useState(5);
  const [stats,               setStats]               = useState({});
  const [isConnected,         setIsConnected]         = useState(false);
  const [isCallNextLoading,   setIsCallNextLoading]   = useState(false);

  // Debounce ref for callNext (prevents double-click / multiple-tab races)
  const lastCallNextAt = useRef(0);

  // ── Apply full server snapshot ────────────────────────────────
  const applyState = useCallback((state) => {
    if (!state) return;
    if (Array.isArray(state.queue))              setQueue(state.queue);
    if (state.currentToken   !== undefined)      setCurrentToken(state.currentToken);
    if (state.isPaused       !== undefined)      setIsPaused(state.isPaused);
    if (state.avgConsultationTime !== undefined) setAvgConsultationTime(state.avgConsultationTime);
    if (state.stats)                             setStats(state.stats);
  }, []);

  // ── REST: initial fetch ───────────────────────────────────────
  const fetchState = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/queue`);
      const data = await res.json();
      applyState(data);
    } catch (err) {
      console.error('[Queue] fetch failed:', err.message);
    }
  }, [applyState]);

  // ── Socket lifecycle ──────────────────────────────────────────
  useEffect(() => {
    socket.connect();

    const onConnect = () => {
      setIsConnected(true);
      socket.emit('identify', { role: user?.role || 'patient' });
    };
    const onDisconnect = () => setIsConnected(false);
    const onReconnect  = () => socket.emit('request-sync');

    const onSyncState      = (s) => applyState(s);
    const onQueueUpdated   = ({ queueState }) => applyState(queueState);
    const onPatientAdded   = ({ queueState }) => applyState(queueState);
    const onEmergencyAdded = ({ queueState }) => applyState(queueState);
    const onPaused         = ({ queueState }) => { setIsPaused(true);  applyState(queueState); };
    const onResumed        = ({ queueState }) => { setIsPaused(false); applyState(queueState); };
    const onAvgChanged     = ({ queueState }) => applyState(queueState);

    socket.on('connect',            onConnect);
    socket.on('disconnect',         onDisconnect);
    socket.on('reconnect',          onReconnect);
    socket.on('sync-state',         onSyncState);
    socket.on('queue-updated',      onQueueUpdated);
    socket.on('patient-added',      onPatientAdded);
    socket.on('emergency-added',    onEmergencyAdded);
    socket.on('queue-paused',       onPaused);
    socket.on('queue-resumed',      onResumed);
    socket.on('average-time-changed', onAvgChanged);

    // Seed initial data via REST (socket may not have delivered missed events)
    fetchState();

    return () => {
      socket.off('connect',            onConnect);
      socket.off('disconnect',         onDisconnect);
      socket.off('reconnect',          onReconnect);
      socket.off('sync-state',         onSyncState);
      socket.off('queue-updated',      onQueueUpdated);
      socket.off('patient-added',      onPatientAdded);
      socket.off('emergency-added',    onEmergencyAdded);
      socket.off('queue-paused',       onPaused);
      socket.off('queue-resumed',      onResumed);
      socket.off('average-time-changed', onAvgChanged);
      socket.disconnect();
    };
  }, [applyState, fetchState, user?.role]);

  // ── Action helpers ────────────────────────────────────────────
  const addPatient = useCallback(async (data) => {
    const res  = await authFetch(`${API}/patient/add`, { method: 'POST', body: JSON.stringify(data) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to add patient.');
    return json;
  }, [authFetch]);

  const callNext = useCallback(async () => {
    const now = Date.now();
    // Front-end debounce: ignore within 800 ms of previous call
    if (now - lastCallNextAt.current < 800) {
      throw new Error('Please wait a moment before calling the next patient.');
    }
    lastCallNextAt.current = now;
    setIsCallNextLoading(true);
    try {
      const res  = await authFetch(`${API}/call-next`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to call next patient.');
      return json;
    } finally {
      setIsCallNextLoading(false);
    }
  }, [authFetch]);

  const pauseQueue = useCallback(async () => {
    const res  = await authFetch(`${API}/pause`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    return json;
  }, [authFetch]);

  const resumeQueue = useCallback(async () => {
    const res  = await authFetch(`${API}/resume`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    return json;
  }, [authFetch]);

  const setAvgTime = useCallback(async (time) => {
    const res  = await authFetch(`${API}/avg-time`, { method: 'POST', body: JSON.stringify({ time }) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    return json;
  }, [authFetch]);

  const deletePatient = useCallback(async (id) => {
    const res  = await authFetch(`${API}/patient/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    return json;
  }, [authFetch]);

  const updatePatient = useCallback(async (id, updates) => {
    const res  = await authFetch(`${API}/patient/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    return json;
  }, [authFetch]);

  const getPatientWaitInfo = useCallback(async (token) => {
    const res  = await fetch(`${API}/patient/wait/${token}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    return json;
  }, []);

  // ── Derived state ─────────────────────────────────────────────
  const waitingQueue       = queue.filter(p => p.status === 'waiting');
  const inProgressPatient  = queue.find(p => p.status === 'in-progress') || null;
  const completedPatients  = queue.filter(p => p.status === 'completed');
  const estimatedFinishTime = waitingQueue.length
    ? new Date(Date.now() + (waitingQueue.length + (inProgressPatient ? 1 : 0)) * avgConsultationTime * 60_000)
    : null;

  return (
    <QueueContext.Provider value={{
      // State
      queue, currentToken, isPaused, avgConsultationTime, stats,
      isConnected, isCallNextLoading,
      // Derived
      waitingQueue, inProgressPatient, completedPatients, estimatedFinishTime,
      // Actions
      addPatient, callNext, pauseQueue, resumeQueue, setAvgTime,
      deletePatient, updatePatient, getPatientWaitInfo, fetchState,
    }}>
      {children}
    </QueueContext.Provider>
  );
};

export const useQueue = () => {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error('useQueue must be used within <QueueProvider>');
  return ctx;
};
