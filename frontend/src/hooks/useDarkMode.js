import { useState, useEffect } from 'react';

export const useDarkMode = () => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('qc_dark');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add('dark');
    else        root.classList.remove('dark');
    localStorage.setItem('qc_dark', String(isDark));
  }, [isDark]);

  const toggle = () => setIsDark(d => !d);
  return { isDark, toggle };
};
