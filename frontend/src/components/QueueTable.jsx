/**
 * QueueTable
 * Full-featured patient queue table with:
 *  - Search by name / token
 *  - Sort by token or arrival time
 *  - Status filter (All / Waiting / In Progress / Completed)
 *  - Pagination (10 per page)
 *  - Edit / Delete per row
 *  - Priority badge (emergency glow)
 *  - Real-time status updates via QueueContext socket
 */
import React, { useState, useMemo } from 'react';
import { useQueue } from '../context/QueueContext';
import { useToast } from '../hooks/useToast';
import EditPatientModal from './EditPatientModal';

const PAGE_SIZE = 10;

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

const StatusBadge = ({ status, priority }) => {
  if (status === 'in-progress') return (
    <span className="badge-progress flex items-center gap-1">
      <span className="pulse-dot scale-75" />In Progress
    </span>
  );
  if (status === 'completed') return <span className="badge-done">✓ Done</span>;
  if (priority === 'emergency') return <span className="badge-emergency">🚨 Emergency</span>;
  return <span className="badge-waiting">Waiting</span>;
};

const QueueTable = () => {
  const { queue, deletePatient, isPaused } = useQueue();
  const { toast } = useToast();

  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [sortBy,        setSortBy]        = useState('token');
  const [sortDir,       setSortDir]       = useState('asc');
  const [page,          setPage]          = useState(1);
  const [editPatient,   setEditPatient]   = useState(null);
  const [deletingId,    setDeletingId]    = useState(null);

  // ── Filtered + sorted list ────────────────────────────────
  const filtered = useMemo(() => {
    let rows = [...queue];

    // Status filter
    if (statusFilter !== 'all') rows = rows.filter(p => p.status === statusFilter);

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.token.toLowerCase().includes(q) ||
        p.phone?.includes(q) ||
        p.doctor?.toLowerCase().includes(q)
      );
    }

    // Sort
    rows.sort((a, b) => {
      let av = a[sortBy === 'token' ? 'token' : 'arrivalTime'];
      let bv = b[sortBy === 'token' ? 'token' : 'arrivalTime'];
      if (sortBy === 'token') {
        av = parseInt(av.replace(/\D/g, ''), 10);
        bv = parseInt(bv.replace(/\D/g, ''), 10);
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return rows;
  }, [queue, search, statusFilter, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
    setPage(1);
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Remove ${p.name} (${p.token}) from queue?`)) return;
    setDeletingId(p.id);
    try {
      await deletePatient(p.id);
      toast.success(`${p.token} removed from queue.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const SortIcon = ({ col }) => (
    <span className={`ml-1 text-xs ${sortBy === col ? 'text-blue-500' : 'text-gray-300'}`}>
      {sortBy === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  const counts = {
    all:         queue.length,
    waiting:     queue.filter(p => p.status === 'waiting').length,
    'in-progress': queue.filter(p => p.status === 'in-progress').length,
    completed:   queue.filter(p => p.status === 'completed').length,
  };

  return (
    <>
      <div className="card overflow-hidden">
        {/* ── Toolbar ── */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name, token, doctor…"
              className="input pl-9 text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                ×
              </button>
            )}
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-1 overflow-x-auto">
            {[['all','All'], ['waiting','Waiting'], ['in-progress','Active'], ['completed','Done']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => { setStatusFilter(val); setPage(1); }}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  statusFilter === val
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {label} <span className="ml-1 opacity-70 text-xs">({counts[val]})</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => toggleSort('token')}>
                  Token <SortIcon col="token" />
                </th>
                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Patient</th>
                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 hidden md:table-cell">Doctor</th>
                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:text-blue-600 transition-colors hidden sm:table-cell"
                  onClick={() => toggleSort('arrivalTime')}>
                  Arrived <SortIcon col="arrivalTime" />
                </th>
                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Status</th>
                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-gray-400 dark:text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">🏥</span>
                      <p className="font-medium">{search ? 'No patients match your search.' : 'Queue is empty.'}</p>
                      {search && <button onClick={() => setSearch('')} className="text-blue-500 text-sm hover:underline">Clear search</button>}
                    </div>
                  </td>
                </tr>
              ) : paginated.map((p) => (
                <tr
                  key={p.id}
                  className={`
                    transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30
                    ${p.status === 'in-progress' ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}
                    ${p.status === 'completed'   ? 'opacity-50' : ''}
                    ${p.priority === 'emergency' && p.status === 'waiting' ? 'bg-red-50/50 dark:bg-red-900/10' : ''}
                  `}
                >
                  {/* Token */}
                  <td className="px-4 py-3">
                    <span className={`font-mono font-bold text-base ${
                      p.status === 'in-progress' ? 'text-emerald-600 dark:text-emerald-400' :
                      p.priority === 'emergency' ? 'text-red-600 dark:text-red-400' :
                      'text-blue-600 dark:text-blue-400'
                    }`}>
                      {p.token}
                    </span>
                    {p.priority === 'emergency' && <span className="ml-1 text-xs">🚨</span>}
                  </td>

                  {/* Patient info */}
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 dark:text-white">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.age}y · {p.phone}</p>
                  </td>

                  {/* Doctor */}
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300 hidden md:table-cell">{p.doctor}</td>

                  {/* Arrival time */}
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell font-mono text-xs">
                    {fmtTime(p.arrivalTime)}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} priority={p.priority} />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {p.status !== 'completed' && (
                        <button
                          onClick={() => setEditPatient(p)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Edit patient"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                      )}
                      {p.status !== 'in-progress' && (
                        <button
                          onClick={() => handleDelete(p)}
                          disabled={deletingId === p.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                          title={p.status === 'in-progress' ? 'Cannot remove active patient' : 'Remove patient'}
                        >
                          {deletingId === p.id ? (
                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >← Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
                .reduce((acc, n, i, arr) => {
                  if (i > 0 && n - arr[i-1] > 1) acc.push('...');
                  acc.push(n);
                  return acc;
                }, [])
                .map((item, i) => item === '...'
                  ? <span key={`dot-${i}`} className="px-2 text-gray-400">…</span>
                  : (
                    <button
                      key={item}
                      onClick={() => setPage(item)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        safePage === item
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >{item}</button>
                  )
                )
              }
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editPatient && (
        <EditPatientModal patient={editPatient} onClose={() => setEditPatient(null)} />
      )}
    </>
  );
};

export default QueueTable;
