/**
 * StatsCards
 * Shows 4 real-time metric cards across the top of the dashboard:
 *  1. Current Token Being Served
 *  2. Total Patients Waiting
 *  3. Avg Consultation Time (user-selectable)
 *  4. Estimated Queue Finish Time
 */
import React from 'react';
import { useQueue } from '../context/QueueContext';
import { useToast } from '../hooks/useToast';

const AVG_OPTIONS = [2, 5, 10, 15];

const fmt12 = (isoStr) => {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const Card = ({ icon, label, value, sub, accent = 'blue', children }) => {
  const accents = {
    blue:    'from-blue-500 to-blue-600',
    green:   'from-emerald-500 to-emerald-600',
    amber:   'from-amber-500 to-amber-600',
    purple:  'from-purple-500 to-purple-600',
    red:     'from-red-500 to-red-600',
  };
  const iconBg = {
    blue:   'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    green:  'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
    amber:  'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
    purple: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
    red:    'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
  };

  return (
    <div className="card p-5 flex flex-col gap-3 hover:shadow-card-hover transition-shadow duration-300 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${iconBg[accent]}`}>
          {icon}
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r ${accents[accent]} text-white`}>
          LIVE
        </span>
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5 token-display">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
      </div>
      {children}
    </div>
  );
};

const StatsCards = () => {
  const { currentToken, waitingQueue, avgConsultationTime, estimatedFinishTime, isPaused, inProgressPatient, setAvgTime } = useQueue();
  const { toast } = useToast();

  const handleAvgChange = async (time) => {
    try {
      await setAvgTime(time);
      toast.info(`⏱ Avg consultation time set to ${time} min`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

      {/* Card 1: Current Token */}
      <Card
        icon="🎫"
        label="Now Serving"
        accent={isPaused ? 'amber' : inProgressPatient ? 'green' : 'blue'}
        value={
          isPaused ? 'PAUSED' :
          currentToken || (waitingQueue.length === 0 ? 'EMPTY' : '—')
        }
        sub={
          inProgressPatient
            ? `${inProgressPatient.name} · ${inProgressPatient.doctor}`
            : isPaused ? 'Queue is paused by receptionist'
            : 'No patient in consultation'
        }
      >
        {currentToken && !isPaused && (
          <div className="flex items-center gap-1.5">
            <span className="pulse-dot" />
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">In consultation</span>
          </div>
        )}
        {isPaused && (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Queue paused</span>
          </div>
        )}
      </Card>

      {/* Card 2: Waiting Count */}
      <Card
        icon="👥"
        label="Patients Waiting"
        accent="blue"
        value={waitingQueue.length}
        sub={waitingQueue.length === 0 ? 'Queue is clear!' : `Next: ${waitingQueue[0]?.token || '—'} · ${waitingQueue[0]?.name || ''}`}
      >
        {waitingQueue.length > 0 && (
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-blue-500 transition-all duration-700"
              style={{ width: `${Math.min(100, (waitingQueue.length / 20) * 100)}%` }}
            />
          </div>
        )}
      </Card>

      {/* Card 3: Avg Consultation Time */}
      <Card
        icon="⏱"
        label="Avg Consultation Time"
        accent="purple"
        value={`${avgConsultationTime} min`}
        sub="Tap to change"
      >
        <div className="grid grid-cols-4 gap-1">
          {AVG_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => handleAvgChange(opt)}
              className={`text-xs font-semibold py-1 rounded-lg transition-all ${
                avgConsultationTime === opt
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600'
              }`}
            >
              {opt}m
            </button>
          ))}
        </div>
      </Card>

      {/* Card 4: Estimated Finish Time */}
      <Card
        icon="🏁"
        label="Queue Finishes At"
        accent="amber"
        value={estimatedFinishTime ? fmt12(estimatedFinishTime.toISOString()) : '—'}
        sub={
          estimatedFinishTime
            ? `≈ ${Math.round((estimatedFinishTime - Date.now()) / 60000)} min remaining for all patients`
            : 'No patients in queue'
        }
      />
    </div>
  );
};

export default StatsCards;
