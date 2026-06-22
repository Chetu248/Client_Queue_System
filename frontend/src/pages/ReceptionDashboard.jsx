/**
 * ReceptionDashboard
 * The primary working screen for the receptionist.
 *
 * Layout:
 *  Navbar (top)
 *  ─────────────────────────────────────────────────
 *  Action bar: Add | Call Next | Pause/Resume | Emergency
 *  ─────────────────────────────────────────────────
 *  StatsCards row (4 cards)
 *  ─────────────────────────────────────────────────
 *  QueueTable (search / filter / paginate)
 *
 * Edge cases handled:
 *  • Double-click on "Call Next" → debounced in QueueContext
 *  • Empty queue → button disabled with tooltip
 *  • Paused queue → "Call Next" disabled, visual indicator
 *  • Emergency button → opens AddPatientModal pre-set to emergency
 */
import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import StatsCards from '../components/StatsCards';
import QueueTable from '../components/QueueTable';
import AddPatientModal from '../components/AddPatientModal';
import { useQueue } from '../context/QueueContext';
import { useToast } from '../hooks/useToast';

const ReceptionDashboard = () => {
  const {
    callNext, pauseQueue, resumeQueue,
    isPaused, waitingQueue, inProgressPatient,
    isCallNextLoading, isConnected, currentToken,
  } = useQueue();
  const { toast } = useToast();

  const [showAddModal,       setShowAddModal]       = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [isPauseLoading,     setIsPauseLoading]     = useState(false);

  const canCallNext = !isPaused && (waitingQueue.length > 0 || inProgressPatient) && !isCallNextLoading;

  const handleCallNext = async () => {
    if (!canCallNext) return;
    try {
      const res = await callNext();
      if (res.next) {
        toast.success(`🔔 Now serving: ${res.next.token} — ${res.next.name}`);
      } else {
        toast.info('✅ Queue is now empty. All patients have been served.');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handlePauseResume = async () => {
    setIsPauseLoading(true);
    try {
      if (isPaused) {
        await resumeQueue();
        toast.success('▶️ Queue resumed.');
      } else {
        await pauseQueue();
        toast.warning('⏸ Queue paused. Patient screen will show "Doctor Unavailable".');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsPauseLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />

      <main className="flex-1 p-4 sm:p-6 max-w-screen-2xl mx-auto w-full">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Reception Dashboard
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Connection status */}
          <div className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full ${
            isConnected
              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-50 dark:bg-red-900/30 text-red-500'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            {isConnected ? 'Connected — live updates on' : 'Reconnecting…'}
          </div>
        </div>

        {/* ── Action bar ── */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 p-4 card">
          {/* Add Patient */}
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            Add Patient
          </button>

          {/* Call Next — the star of the show */}
          <button
            onClick={handleCallNext}
            disabled={!canCallNext}
            className={`btn btn-xl font-bold tracking-wide transition-all duration-200 ${
              canCallNext
                ? 'btn-success shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 scale-100 hover:scale-105'
                : 'btn-success opacity-50 cursor-not-allowed'
            }`}
            title={
              isPaused          ? 'Queue is paused'          :
              waitingQueue.length === 0 && !inProgressPatient ? 'Queue is empty' :
              'Call next patient'
            }
          >
            {isCallNextLoading ? (
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            ) : '📢'}
            {isCallNextLoading ? 'Calling…' : 'Call Next'}
          </button>

          {/* Pause / Resume */}
          <button
            onClick={handlePauseResume}
            disabled={isPauseLoading}
            className={`btn ${isPaused ? 'btn-success' : 'btn-warning'}`}
          >
            {isPauseLoading ? '…' : isPaused ? '▶️ Resume Queue' : '⏸ Pause Queue'}
          </button>

          {/* Emergency */}
          <button
            onClick={() => setShowEmergencyModal(true)}
            className="btn btn-danger ml-auto"
          >
            🚨 Emergency Token
          </button>
        </div>

        {/* ── Paused notice banner ── */}
        {isPaused && (
          <div className="flex items-center gap-3 p-4 mb-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl animate-fade-in">
            <span className="text-2xl">⏸</span>
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-300">Queue is currently paused</p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                "Call Next" is disabled. The patient waiting screen shows "Doctor Unavailable".
                Click <strong>Resume Queue</strong> to continue.
              </p>
            </div>
          </div>
        )}

        {/* ── Stats cards ── */}
        <div className="mb-6">
          <StatsCards />
        </div>

        {/* ── Queue table ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 dark:text-white text-lg">Patient Queue</h2>
            <span className="text-sm text-gray-400">
              {waitingQueue.length} waiting · {currentToken ? `Serving ${currentToken}` : 'Idle'}
            </span>
          </div>
          <QueueTable />
        </div>
      </main>

      {/* Modals */}
      {showAddModal && <AddPatientModal onClose={() => setShowAddModal(false)} />}
      {showEmergencyModal && <AddPatientModal isEmergency onClose={() => setShowEmergencyModal(false)} />}
    </div>
  );
};

export default ReceptionDashboard;
