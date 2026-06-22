/**
 * AuthContext
 *
 * Handles JWT login/logout and persists session to localStorage so that
 * a browser refresh doesn't log the user out.
 *
 * Edge cases:
 *  • Corrupt localStorage value → caught and cleared automatically
 *  • Expired token → 401 from any protected endpoint triggers logout
 */
import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const safeJSON = (str) => { try { return JSON.parse(str); } catch { return null; } };

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => safeJSON(localStorage.getItem('qc_user')));
  const [token, setToken] = useState(() => localStorage.getItem('qc_token') || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${API}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed.');

      localStorage.setItem('qc_token', data.token);
      localStorage.setItem('qc_user',  JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return { success: true, role: data.user.role };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('qc_token');
    localStorage.removeItem('qc_user');
    setToken(null);
    setUser(null);
  }, []);

  /** Attach auth header to any fetch call */
  const authFetch = useCallback(async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    // Auto-logout on 401 (expired / invalid token)
    if (res.status === 401) {
      logout();
      throw new Error('Session expired. Please log in again.');
    }
    return res;
  }, [token, logout]);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      error,
      login,
      logout,
      authFetch,
      isAuthenticated: Boolean(token && user),
      isReceptionist:  user?.role === 'receptionist',
      isAdmin:         user?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
};
