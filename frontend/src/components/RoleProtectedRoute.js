import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DEPARTMENTS } from '../constants/departments';
import { LoadingState } from './EmptyState';

/**
 * Blocks access unless the logged-in user's department is in
 * `allowedDepartments`. Admin is always granted access, matching the backend's
 * "Admin can access everything" rule.
 *
 * This is the reason a Social Media user typing /client-servicing-home into the
 * address bar lands on /unauthorized instead of the page. The department APIs
 * return 403 for the same request, so the data is protected either way.
 */
export default function RoleProtectedRoute({ allowedDepartments, children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingState label="Checking your access" />;
  if (!user) return <Navigate to="/login" replace />;

  const isAllowed =
    user.department === DEPARTMENTS.ADMIN || allowedDepartments.includes(user.department);
  if (!isAllowed) return <Navigate to="/unauthorized" replace />;

  return children;
}
