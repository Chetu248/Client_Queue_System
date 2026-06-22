/**
 * Toast notification system.
 * Provides a context-based imperative API:
 *   toast.success(msg)  toast.error(msg)  toast.info(msg)  toast.warning(msg)
 * Toasts auto-dismiss after 4 s.  Max 5 on screen at once.
 */
import React, { createContext, useState, useCallback, useRef } from 'react';

export const ToastContext = createContext(null);

const ICONS = {
  success: (
    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const BORDER = { success: 'border-l-emerald-500', error: 'border-l-red-500', warning: 'border-l-amber-500', info: 'border-l-blue-500' };

let uidCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const add = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++uidCounter;
    setToasts(prev => {
      const next = [...prev, { id, message, type, leaving: false }];
      // Keep max 5 toasts
      return next.length > 5 ? next.slice(next.length - 5) : next;
    });
    timers.current[id] = setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  const toast = {
    success: (msg, dur) => add(msg, 'success', dur),
    error:   (msg, dur) => add(msg, 'error',   dur),
    warning: (msg, dur) => add(msg, 'warning', dur),
    info:    (msg, dur) => add(msg, 'info',    dur),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container — bottom-right */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`
              pointer-events-auto flex items-start gap-3 p-4 pr-5
              bg-white dark:bg-gray-800 rounded-xl shadow-xl
              border border-gray-100 dark:border-gray-700
              border-l-4 ${BORDER[t.type]}
              max-w-xs w-full
              transition-all duration-300
              ${t.leaving ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0 animate-slide-in-right'}
            `}
          >
            <span className="mt-0.5 shrink-0">{ICONS[t.type]}</span>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors ml-1 shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
