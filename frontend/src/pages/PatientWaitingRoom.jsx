/**
 * PatientWaitingRoom — Public screen (no auth required).
 *
 * Intended for:
 *  • The TV/display screen in the waiting area (always showing live token)
 *  • Patients on their phone who want to check their position
 *
 * Features:
 *  • Live current token via Socket.io (updates without refresh)
 *  • Token look-up: patient types their token → sees position + wait time
 *  • Progress bar showing position
 *  • Sound notification on token change (toggleable)
 *  • "Doctor Unavailable" state when queue is paused
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQueue } from '../context/QueueContext';
import LiveAnnouncement from '../components/LiveAnnouncement';
import Clock from '../components/Clock';
import { useDarkMode } from '../hooks/useDarkMode';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const ProgressBar = ({ position, total }) => {
  if (!total) return null;
  const pct = total === 1 ? 100 : Math.max(5, 100 - ((position - 1) / (total - 1)) * 95);
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
      <div
        className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 progress-fill"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

const PatientWaitingRoom = () => {
  const { currentToken, waitingQueue, isPaused, avgConsultationTime } = useQueue();
  const { isDark, toggle } = useDarkMode();

  const [tokenInput, setTokenInput]   = useState('');
  const [waitInfo,   setWaitInfo]     = useState(null);
  const [searching,  setSearching]    = useState(false);
  const [searchErr,  setSearchErr]    = useState('');

  const nextToken = waitingQueue[0]?.token || null;

  const handleSearch = useCallback(async (e) => {
    e?.preventDefault();
    const q = tokenInput.trim().toUpperCase();
    if (!q) { setSearchErr('Enter your token number (e.g. A001)'); return; }

    setSearching(true);
    setSearchErr('');
    setWaitInfo(null);

    try {
      const res  = await fetch(`${API}/patient/wait/${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Token not found.');
      setWaitInfo(data);
    } catch (err) {
      setSearchErr(err.message);
    } finally {
      setSearching(false);
    }
  }, [tokenInput]);

  // Auto-refresh wait info every 30 s if a token is loaded
  useEffect(() => {
    if (!waitInfo) return;
    const id = setInterval(() => handleSearch(), 30_000);
    return () => clearInterval(id);
  }, [waitInfo, handleSearch]);

  // Re-fetch when queue changes (socket updates QueueContext)
  useEffect(() => {
    if (waitInfo?.patient?.token) {
      setTokenInput(waitInfo.patient.token);
      handleSearch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentToken, waitingQueue.length]);

  const statusColor = {
    waiting:     'text-blue-600 dark:text-blue-400',
    'in-progress': 'text-emerald-600 dark:text-emerald-400',
    completed:   'text-gray-400',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <Link to="/login" className="flex items-center gap-2 font-bold text-blue-600 dark:text-blue-400 text-lg">
          <span className="text-2xl">🏥</span>
          <span className="hidden sm:block">QueueCure<span className="text-gray-400 font-light">'26</span></span>
        </Link>
        <div className="flex items-center gap-3">
          <Clock />
          <button onClick={toggle} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      <main className="flex-1 p-4 sm:p-8 max-w-4xl mx-auto w-full">

        {/* Live Announcement Panel */}
        <div className="mb-8">
          <LiveAnnouncement
            currentToken={currentToken}
            nextToken={nextToken}
            isPaused={isPaused}
          />
        </div>

        {/* Queue snapshot */}
        {waitingQueue.length > 0 && (
          <div className="card p-5 mb-8">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 text-sm uppercase tracking-wide">
              Upcoming Queue
            </h3>
            <div className="flex flex-wrap gap-2">
              {waitingQueue.slice(0, 10).map((p, i) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-mono font-bold
                    ${i === 0
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-400'
                      : p.priority === 'emergency'
                        ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                >
                  {p.priority === 'emergency' && <span className="text-xs">🚨</span>}
                  {p.token}
                  {i === 0 && <span className="text-xs font-normal">· Next</span>}
                </div>
              ))}
              {waitingQueue.length > 10 && (
                <span className="px-3 py-1.5 text-sm text-gray-400">+{waitingQueue.length - 10} more</span>
              )}
            </div>
          </div>
        )}

        {/* ── Token look-up ── */}
        <div className="card p-6">
          <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">Check Your Position</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Enter your token number to see your estimated wait time</p>

          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <input
              value={tokenInput}
              onChange={e => { setTokenInput(e.target.value.toUpperCase()); setWaitInfo(null); setSearchErr(''); }}
              placeholder="e.g. A001"
              maxLength={4}
              className="input flex-1 font-mono text-lg text-center tracking-widest font-bold"
            />
            <button type="submit" disabled={searching} className="btn btn-primary px-6">
              {searching ? (
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              ) : 'Check'}
            </button>
          </form>

          {searchErr && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              ⚠️ {searchErr}
            </div>
          )}

          {/* Wait info card */}
          {waitInfo && (
            <div className="mt-4 animate-slide-up">

              {/* Status banner */}
              {waitInfo.status === 'completed' ? (
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl text-center">
                  <span className="text-4xl mb-2 block">✅</span>
                  <p className="font-bold text-gray-700 dark:text-gray-200">Your consultation is complete!</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Thank you for visiting.</p>
                </div>
              ) : waitInfo.status === 'in-progress' ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-700">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl animate-bounce-gentle">🔔</span>
                    <div>
                      <p className="font-bold text-emerald-700 dark:text-emerald-300 text-lg">It's your turn!</p>
                      <p className="text-emerald-600 dark:text-emerald-400 text-sm">Please proceed to the doctor's room.</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Waiting info */
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                    <div>
                      <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Your token</p>
                      <p className="font-black text-blue-800 dark:text-blue-200 text-3xl font-mono">{waitInfo.patient.token}</p>
                      <p className={`text-sm font-medium mt-1 ${statusColor[waitInfo.status]}`}>
                        {waitInfo.patient.priority === 'emergency' ? '🚨 Emergency' : waitInfo.status === 'waiting' ? '⏳ Waiting' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Est. wait</p>
                      <p className="font-bold text-gray-900 dark:text-white text-2xl">
                        {waitInfo.tokensAhead === 0
                          ? '~0 min'
                          : `~${waitInfo.tokensAhead * avgConsultationTime} min`}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {waitInfo.tokensAhead} patient{waitInfo.tokensAhead !== 1 ? 's' : ''} ahead
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                      <span>Position #{waitInfo.queuePosition} of {waitInfo.totalWaiting}</span>
                      <span>{waitInfo.tokensAhead === 0 ? 'You\'re next!' : `${waitInfo.tokensAhead} ahead`}</span>
                    </div>
                    <ProgressBar position={waitInfo.queuePosition} total={waitInfo.totalWaiting} />
                  </div>

                  {/* Patient info */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
                      <p className="text-xs text-gray-400 mb-0.5">Name</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{waitInfo.patient.name}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
                      <p className="text-xs text-gray-400 mb-0.5">Doctor</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{waitInfo.patient.doctor}</p>
                    </div>
                  </div>

                  {waitInfo.tokensAhead === 0 && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-700 text-sm text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2">
                      🟢 You are next! Please be ready.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-8">
          🔴 Live · Updates automatically · No refresh needed
        </p>
      </main>
    </div>
  );
};

export default PatientWaitingRoom;
