/**
 * AdminDashboard — Statistics & Analytics view
 * Accessible only to role: "admin"
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useQueue } from '../context/QueueContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const MetricCard = ({ icon, label, value, sub, color = 'blue' }) => {
  const colors = {
    blue:   'from-blue-500 to-blue-600 shadow-blue-200 dark:shadow-blue-900',
    green:  'from-emerald-500 to-emerald-600 shadow-emerald-200 dark:shadow-emerald-900',
    amber:  'from-amber-500 to-amber-600 shadow-amber-200 dark:shadow-amber-900',
    purple: 'from-purple-500 to-purple-600 shadow-purple-200 dark:shadow-purple-900',
    red:    'from-red-500 to-red-600 shadow-red-200 dark:shadow-red-900',
  };
  return (
    <div className={`rounded-2xl p-5 text-white bg-gradient-to-br ${colors[color]} shadow-lg`}>
      <div className="text-3xl mb-3">{icon}</div>
      <p className="text-white/80 text-sm font-medium">{label}</p>
      <p className="text-3xl font-black mt-1 token-display">{value}</p>
      {sub && <p className="text-white/70 text-xs mt-1">{sub}</p>}
    </div>
  );
};

const AdminDashboard = () => {
  const { authFetch } = useAuth();
  const { queue, avgConsultationTime, isConnected } = useQueue();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res  = await authFetch(`${API}/stats`);
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 15_000); // refresh every 15 s
    return () => clearInterval(interval);
  }, [authFetch]);

  const waiting   = queue.filter(p => p.status === 'waiting').length;
  const active    = queue.filter(p => p.status === 'in-progress').length;
  const completed = queue.filter(p => p.status === 'completed').length;
  const total     = queue.length;

  const efficiency = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Doctor breakdown
  const doctorMap = {};
  queue.forEach(p => {
    if (!doctorMap[p.doctor]) doctorMap[p.doctor] = { waiting: 0, completed: 0 };
    if (p.status === 'waiting')   doctorMap[p.doctor].waiting++;
    if (p.status === 'completed') doctorMap[p.doctor].completed++;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <Navbar />

      <main className="flex-1 p-4 sm:p-8 max-w-screen-xl mx-auto w-full">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Real-time queue analytics · Auto-refreshes every 15 s</p>
          </div>
          <Link to="/dashboard" className="btn btn-outline btn-sm">
            ← Reception View
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-60">
            <svg className="w-10 h-10 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          </div>
        ) : (
          <>
            {/* Metric cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
              <MetricCard icon="✅" label="Served Today"      value={stats?.totalServedToday ?? completed} color="green" />
              <MetricCard icon="⏳" label="Currently Waiting" value={waiting}   color="blue"  />
              <MetricCard icon="🏃" label="In Consultation"   value={active}    color="purple" />
              <MetricCard icon="📈" label="Queue Efficiency"  value={`${efficiency}%`}
                sub="Completed / Total" color="amber" />
              <MetricCard icon="⏱" label="Avg Wait Time"
                value={`${stats?.avgWaitTimeMinutes ?? avgConsultationTime} min`}
                sub="Per patient" color="red" />
            </div>

            {/* Efficiency bar */}
            <div className="card p-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 dark:text-white">Queue Progress Today</h3>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{efficiency}% done</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                <div
                  className="h-4 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 progress-fill flex items-center justify-end pr-2"
                  style={{ width: `${efficiency}%` }}
                >
                  {efficiency > 15 && <span className="text-white text-xs font-bold">{efficiency}%</span>}
                </div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-400">
                <span>0 patients</span>
                <span>{total} registered today</span>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid md:grid-cols-2 gap-6">

              {/* Queue breakdown */}
              <div className="card p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">Queue Breakdown</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Completed', count: completed, color: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
                    { label: 'Waiting',   count: waiting,   color: 'bg-blue-500',    text: 'text-blue-600 dark:text-blue-400' },
                    { label: 'In Progress', count: active,  color: 'bg-purple-500',  text: 'text-purple-600 dark:text-purple-400' },
                  ].map(r => (
                    <div key={r.label}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className={`font-medium ${r.text}`}>{r.label}</span>
                        <span className="font-bold text-gray-700 dark:text-gray-300">{r.count}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${r.color} progress-fill`}
                          style={{ width: total > 0 ? `${(r.count / total) * 100}%` : '0%' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Doctor breakdown */}
              <div className="card p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">By Doctor</h3>
                {Object.keys(doctorMap).length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">No patient data yet.</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(doctorMap).map(([doc, counts]) => (
                      <div key={doc} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{doc}</p>
                          <p className="text-xs text-gray-400">{counts.completed} done · {counts.waiting} waiting</p>
                        </div>
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {counts.completed + counts.waiting}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* System info */}
              <div className="card p-6 md:col-span-2">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">System Status</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Socket Status',  value: isConnected ? '🟢 Connected' : '🔴 Offline' },
                    { label: 'Avg Consult',    value: `${avgConsultationTime} min` },
                    { label: 'Peak Queue',     value: stats?.peakQueueLength ?? '—' },
                    { label: 'Total Registered', value: total },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                      <p className="font-bold text-gray-800 dark:text-gray-200">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
