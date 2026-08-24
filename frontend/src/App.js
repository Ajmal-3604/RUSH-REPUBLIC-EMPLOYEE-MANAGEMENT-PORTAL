import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Unauthorized from './pages/Unauthorized';
import ShootPlans from './pages/ShootPlans';
import ShootPlanWizard from './pages/wizard/ShootPlanWizard';
import Feedback from './pages/Feedback';
import Brands from './pages/Brands';
import Team from './pages/Team';
import Freelancers from './pages/Freelancers';
import Models from './pages/Models';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Every department lands here after login -- scoped server-side. */}
            <Route
              path="/shoot-plans"
              element={
                <ProtectedRoute>
                  <ShootPlans />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shoot-plans/new"
              element={
                <ProtectedRoute>
                  <ShootPlanWizard create />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shoot-plans/:id"
              element={
                <ProtectedRoute>
                  <ShootPlanWizard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/feedback"
              element={
                <ProtectedRoute>
                  <Feedback />
                </ProtectedRoute>
              }
            />

            {/* Directory modules -- shared data, every department gets full access. */}
            <Route
              path="/brands"
              element={
                <ProtectedRoute>
                  <Brands />
                </ProtectedRoute>
              }
            />
            <Route
              path="/team"
              element={
                <ProtectedRoute>
                  <Team />
                </ProtectedRoute>
              }
            />
            <Route
              path="/freelancers"
              element={
                <ProtectedRoute>
                  <Freelancers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/models"
              element={
                <ProtectedRoute>
                  <Models />
                </ProtectedRoute>
              }
            />

            <Route
              path="*"
              element={
                <ProtectedRoute>
                  <Navigate to="/shoot-plans" replace />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
