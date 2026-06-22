/**
 * LiveAnnouncement
 * Animated "Now Serving / Next" panel for the Patient Waiting Room.
 *
 * Features:
 *  - Token slide-in animation on every change (CSS keyframe)
 *  - Web Audio API beep when a new token is called (no external lib)
 *  - Sound can be toggled off
 *  - Shows "Doctor Unavailable" banner when queue is paused
 */
import React, { useEffect, useRef, useState } from 'react';
import socket from '../socket/socket';

const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    // Two-tone hospital-style chime
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.55);
    ctx.close().catch(() => {});
  } catch {
    // Browser may block AudioContext before user gesture — silent fail
  }
};

const LiveAnnouncement = ({ currentToken, nextToken, isPaused }) => {
  const [displayToken,  setDisplayToken]  = useState(currentToken);
  const [animKey,       setAnimKey]       = useState(0);
  const [soundEnabled,  setSoundEnabled]  = useState(true);
  const prevTokenRef = useRef(currentToken);

  // Listen for token change events from socket
  useEffect(() => {
    const handler = ({ newToken }) => {
      if (newToken && newToken !== prevTokenRef.current) {
        prevTokenRef.current = newToken;
        setDisplayToken(newToken);
        setAnimKey(k => k + 1);   // remount anim element
        if (soundEnabled) playBeep();
      }
    };
    socket.on('token-completed', handler);
    return () => socket.off('token-completed', handler);
  }, [soundEnabled]);

  // Also reflect prop changes (e.g. after REST fetch on mount)
  useEffect(() => {
    if (currentToken !== prevTokenRef.current) {
      prevTokenRef.current = currentToken;
      setDisplayToken(currentToken);
      setAnimKey(k => k + 1);
    }
  }, [currentToken]);

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-2xl">

      {/* Gradient background */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 p-6 sm:p-10 text-white">

        {/* Sound toggle */}
        <button
          onClick={() => setSoundEnabled(s => !s)}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          title={soundEnabled ? 'Mute sound' : 'Enable sound'}
        >
          {soundEnabled ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.536 8.464a5 5 0 010 7.072M12 6v12m0 0l-3-3m3 3l3-3M9.172 9.172a4 4 0 000 5.656"/>
            </svg>
          ) : (
            <svg className="w-5 h-5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/>
            </svg>
          )}
        </button>

        {/* Paused overlay */}
        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center bg-amber-900/80 backdrop-blur-sm rounded-3xl z-10">
            <div className="text-center">
              <span className="text-5xl mb-3 block">⏸</span>
              <p className="text-2xl font-bold text-amber-200">Doctor Currently Unavailable</p>
              <p className="text-amber-300 mt-1 text-sm">Queue is paused. Please wait.</p>
            </div>
          </div>
        )}

        {/* Main announcement */}
        <div className="text-center">
          <p className="text-blue-200 text-sm font-semibold tracking-widest uppercase mb-4">
            🏥 Now Serving
          </p>

          {/* Token display with animation */}
          <div key={animKey} className="token-slide-in">
            {displayToken ? (
              <div className="inline-block">
                <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl px-8 py-5 mb-2">
                  <span className="text-6xl sm:text-8xl font-black token-display text-white tracking-wider">
                    {displayToken}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-white/10 rounded-2xl px-8 py-5 mb-2">
                <span className="text-4xl sm:text-5xl font-bold text-blue-200 opacity-60">
                  No patient
                </span>
              </div>
            )}
          </div>

          {/* Next token */}
          {nextToken && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="h-px w-12 bg-white/20" />
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl">
                <span className="text-blue-300 text-sm">Next:</span>
                <span className="text-white font-bold font-mono text-lg">{nextToken}</span>
              </div>
              <div className="h-px w-12 bg-white/20" />
            </div>
          )}

          {!displayToken && !isPaused && (
            <p className="text-blue-300 mt-4 text-sm animate-pulse-soft">
              Waiting for queue to start…
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveAnnouncement;
