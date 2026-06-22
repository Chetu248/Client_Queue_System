import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NotFound = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md">
        <span className="text-8xl mb-6 block animate-bounce-gentle">🏥</span>
        <h1 className="text-6xl font-black text-gray-900 dark:text-white mb-2">404</h1>
        <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-3">Page not found</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          This page doesn't exist. Maybe the token was never assigned?
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => navigate(-1)} className="btn btn-ghost">
            ← Go Back
          </button>
          {isAuthenticated
            ? <Link to="/dashboard" className="btn btn-primary">Reception Dashboard</Link>
            : <Link to="/login"     className="btn btn-primary">Sign In</Link>
          }
          <Link to="/patient" className="btn btn-outline">Patient Screen</Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
