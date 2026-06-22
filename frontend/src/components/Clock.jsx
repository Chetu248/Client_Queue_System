import React, { useState, useEffect } from 'react';

const Clock = ({ className = '' }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const fmt = (d) =>
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const fmtDate = (d) =>
    d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className={`text-right ${className}`}>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 font-mono tabular-nums">
        {fmt(time)}
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500">{fmtDate(time)}</p>
    </div>
  );
};

export default Clock;
