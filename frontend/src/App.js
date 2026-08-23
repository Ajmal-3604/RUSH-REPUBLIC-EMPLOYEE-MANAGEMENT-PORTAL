import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import { DEPARTMENTS } from './constants/departments';

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

            {/* Directory modules -- Admin and Production Head only. */}
            <Route
              path="/brands"
              element={
                <RoleProtectedRoute allowedDepartments={[DEPARTMENTS.PRODUCTION_HEAD]}>
                  <Brands />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/team"
              element={
                <RoleProtectedRoute allowedDepartments={[DEPARTMENTS.PRODUCTION_HEAD]}>
                  <Team />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/freelancers"
              element={
                <RoleProtectedRoute allowedDepartments={[DEPARTMENTS.PRODUCTION_HEAD]}>
                  <Freelancers />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/models"
              element={
                <RoleProtectedRoute allowedDepartments={[DEPARTMENTS.PRODUCTION_HEAD]}>
                  <Models />
                </RoleProtectedRoute>
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
