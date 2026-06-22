import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }  from './context/AuthContext';
import { QueueProvider } from './context/QueueContext';
import { ToastProvider } from './components/Toast';
import ProtectedRoute    from './components/ProtectedRoute';

import Login                from './pages/Login';
import ReceptionDashboard   from './pages/ReceptionDashboard';
import PatientWaitingRoom   from './pages/PatientWaitingRoom';
import AdminDashboard       from './pages/AdminDashboard';
import NotFound             from './pages/NotFound';

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <QueueProvider>
        <ToastProvider>
          <Routes>
            {/* Public */}
            <Route path="/"        element={<Navigate to="/login" replace />} />
            <Route path="/login"   element={<Login />} />
            <Route path="/patient" element={<PatientWaitingRoom />} />

            {/* Receptionist + Admin */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute roles={['receptionist', 'admin']}>
                  <ReceptionDashboard />
                </ProtectedRoute>
              }
            />

            {/* Admin only */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ToastProvider>
      </QueueProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
