/**
 * Login Page
 * Split layout: left = branding hero, right = login form.
 * Pre-fill buttons make hackathon demos instant.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CREDENTIALS = [
  { label: 'Receptionist', email: 'reception@queuecure.com', password: '123456', icon: '🩺', role: 'receptionist' },
  { label: 'Admin',        email: 'admin@queuecure.com',     password: '123456', icon: '⚙️', role: 'admin' },
];

const Login = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || '/dashboard';

  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [showPw,  setShowPw]  = useState(false);

  // Already logged in → redirect
  useEffect(() => { if (isAuthenticated) navigate(from, { replace: true }); }, [isAuthenticated, navigate, from]);

  const prefill = (cred) => setForm({ email: cred.email, password: cred.password });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(form.email.trim(), form.password);
    if (res.success) {
      navigate(res.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } else {
      setError(res.error || 'Login failed.');
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left hero panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-hero p-12 text-white">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <span className="text-4xl">🏥</span>
            <div>
              <h1 className="text-2xl font-bold">QueueCure<span className="text-blue-300 font-light">'26</span></h1>
              <p className="text-blue-300 text-sm">Real-time Clinic Queue System</p>
            </div>
          </div>

          <h2 className="text-4xl font-extrabold leading-tight mb-4">
            No more<br />paper tokens.<br />
            <span className="text-blue-300">Ever.</span>
          </h2>
          <p className="text-blue-200 text-lg leading-relaxed max-w-sm">
            Replace messy paper slips with a live digital queue. Patients see their turn in real time. Receptionists run it in seconds.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: '⚡', text: 'Real-time via Socket.io' },
            { icon: '🚨', text: 'Emergency priority queue' },
            { icon: '📊', text: 'Live wait time estimates' },
            { icon: '📱', text: 'Works on any device' },
          ].map(f => (
            <div key={f.text} className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2.5">
              <span>{f.icon}</span>
              <span className="text-sm text-blue-100">{f.text}</span>
            </div>
          ))}
        </div>

        <p className="text-blue-400 text-xs">Hackathon Project 2026 · Built with React + Node.js + Socket.io</p>
      </div>

      {/* ── Right login form ── */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <span className="text-3xl">🏥</span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">QueueCure<span className="text-blue-600">'26</span></h1>
          </div>

          <div className="card p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Sign in</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Access the clinic queue dashboard</p>

            {/* Quick-fill buttons */}
            <div className="mb-6">
              <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Quick demo login</p>
              <div className="grid grid-cols-2 gap-2">
                {CREDENTIALS.map(cred => (
                  <button
                    key={cred.role}
                    type="button"
                    onClick={() => prefill(cred)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600
                      hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20
                      text-sm font-medium text-gray-600 dark:text-gray-300 transition-all"
                  >
                    <span>{cred.icon}</span>
                    {cred.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700" /></div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-white dark:bg-gray-800 text-xs text-gray-400">or enter manually</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <span className="text-red-500">⚠️</span>
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="Enter your email"
                  className="input"
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Enter your password"
                    className="input pr-10"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary w-full btn-lg mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Signing in…
                  </span>
                ) : 'Sign in →'}
              </button>
            </form>

            <p className="text-xs text-gray-400 dark:text-gray-500 mt-6 text-center">
              Patient? Visit <a href="/patient" className="text-blue-500 hover:underline">Patient Waiting Room →</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
