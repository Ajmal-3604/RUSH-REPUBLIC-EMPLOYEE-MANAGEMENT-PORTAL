import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authService } from '../api/services';
import {
  DEPARTMENTS,
  DEPARTMENT_HOME_ROUTES,
  homeRouteFor,
} from '../constants/departments';

const AuthContext = createContext(null);

const STORAGE = {
  access: 'rr_access_token',
  refresh: 'rr_refresh_token',
  user: 'rr_user',
  activeDepartment: 'rr_active_department',
};

/** Re-exported for the pages that already import it from here. */
export { DEPARTMENT_HOME_ROUTES };
export function getHomeRouteForDepartment(department) {
  return homeRouteFor(department);
}

function clearSession() {
  Object.values(STORAGE).forEach((key) => localStorage.removeItem(key));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(STORAGE.user);
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  /**
   * The department whose data is currently on screen.
   *
   * For every non-admin user this is permanently their own department. Admin is
   * the only role that can point it somewhere else, via "Switch Department".
   */
  const [activeDepartment, setActiveDepartment] = useState(
    () => localStorage.getItem(STORAGE.activeDepartment) || null
  );

  useEffect(() => {
    // Rehydrate the profile on refresh if a token exists.
    const token = localStorage.getItem(STORAGE.access);
    if (!token) {
      setLoading(false);
      return;
    }
    authService
      .profile()
      .then((data) => {
        setUser(data);
        localStorage.setItem(STORAGE.user, JSON.stringify(data));
        if (data.department !== DEPARTMENTS.ADMIN && data.department !== DEPARTMENTS.PRODUCTION_HEAD) {
          // Defend against a stale/tampered value in localStorage.
          setActiveDepartment(data.department);
          localStorage.setItem(STORAGE.activeDepartment, data.department);
        }
      })
      .catch(() => {
        setUser(null);
        clearSession();
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authService.login(email, password);
    localStorage.setItem(STORAGE.access, data.access);
    localStorage.setItem(STORAGE.refresh, data.refresh);
    localStorage.setItem(STORAGE.user, JSON.stringify(data.user));
    localStorage.setItem(STORAGE.activeDepartment, data.user.department);
    setUser(data.user);
    setActiveDepartment(data.user.department);
    return data.user;
  }, []);

  const signup = useCallback((payload) => authService.signup(payload), []);

  const logout = useCallback(async () => {
    const refresh = localStorage.getItem(STORAGE.refresh);
    try {
      if (refresh) await authService.logout(refresh);
    } catch {
      // Non-fatal: clear the local session even if blacklisting fails.
    } finally {
      clearSession();
      setUser(null);
      setActiveDepartment(null);
    }
  }, []);

  const isAdmin = !!user && user.department === DEPARTMENTS.ADMIN;
  const isProductionHead = !!user && user.department === DEPARTMENTS.PRODUCTION_HEAD;
  const isElevated = isAdmin || isProductionHead;

  /**
   * Admin and Production Head only. The backend re-checks the caller is
   * elevated (and that only Admin can switch into Admin) and hands back the
   * route, so this cannot be forced by editing localStorage.
   */
  const switchDepartment = useCallback(
    async (department) => {
      if (!user || !(user.department === DEPARTMENTS.ADMIN || user.department === DEPARTMENTS.PRODUCTION_HEAD)) {
        throw new Error('Only Admin or Production Head can switch departments.');
      }
      if (department === DEPARTMENTS.ADMIN && user.department !== DEPARTMENTS.ADMIN) {
        throw new Error('Only Admin can switch into the Admin department.');
      }
      const data = await authService.switchDepartment(department);
      setActiveDepartment(data.department);
      localStorage.setItem(STORAGE.activeDepartment, data.department);
      return data;
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      isAdmin,
      isProductionHead,
      isElevated,
      // Non-elevated users can never have an active department other than their own.
      activeDepartment: isElevated ? activeDepartment : user?.department || null,
      login,
      signup,
      logout,
      switchDepartment,
      setActiveDepartment,
    }),
    [user, loading, isAdmin, isProductionHead, isElevated, activeDepartment, login, signup, logout, switchDepartment]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
