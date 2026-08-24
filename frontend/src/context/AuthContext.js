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
  selectedDepartment: 'rr_active_department',
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
   * Two independent values, never conflated:
   *
   * - `originalRole` (derived below from `user.department`) is the role the
   *   user actually authenticated with. It only ever changes on login/logout
   *   -- switching departments must NEVER touch it.
   * - `selectedDepartment` is just which department's data is currently on
   *   screen. For every non-elevated user it's permanently their own
   *   department; Admin and Production Head are the only roles that can
   *   point it elsewhere, via "Switch Department".
   */
  const [selectedDepartment, setSelectedDepartment] = useState(
    () => localStorage.getItem(STORAGE.selectedDepartment) || null
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
          setSelectedDepartment(data.department);
          localStorage.setItem(STORAGE.selectedDepartment, data.department);
        }
        // Elevated roles keep whatever selectedDepartment was already
        // restored from localStorage above, so a refresh preserves which
        // department they were viewing -- originalRole (derived from
        // `data.department`, the real DB value) is untouched either way.
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
    localStorage.setItem(STORAGE.selectedDepartment, data.user.department);
    setUser(data.user);
    setSelectedDepartment(data.user.department);
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
      // Clears the authenticated user AND the selected-department state --
      // a new login must never inherit the previous session's context.
      clearSession();
      setUser(null);
      setSelectedDepartment(null);
    }
  }, []);

  // originalRole: the role the user actually logged in with. Derived fresh
  // from `user.department` (the real, DB-backed value from /profile) on
  // every render -- switching departments never writes to `user`, so this
  // can never drift.
  const originalRole = user?.department || null;
  const isAdmin = originalRole === DEPARTMENTS.ADMIN;
  const isProductionHead = originalRole === DEPARTMENTS.PRODUCTION_HEAD;
  const isElevated = isAdmin || isProductionHead;

  /**
   * Admin and Production Head only. The backend re-checks the caller is
   * elevated (and that only Admin can switch into Admin) and hands back the
   * route, so this cannot be forced by editing localStorage. Only ever
   * updates `selectedDepartment` -- `originalRole`/`user` are untouched.
   */
  const switchDepartment = useCallback(
    async (department) => {
      if (!isElevated) {
        throw new Error('Only Admin or Production Head can switch departments.');
      }
      if (department === DEPARTMENTS.ADMIN && !isAdmin) {
        throw new Error('Only Admin can switch into the Admin department.');
      }
      const data = await authService.switchDepartment(department);
      setSelectedDepartment(data.department);
      localStorage.setItem(STORAGE.selectedDepartment, data.department);
      return data;
    },
    [isElevated, isAdmin]
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      originalRole,
      isAdmin,
      isProductionHead,
      isElevated,
      // Non-elevated users can never have a selected department other than their own.
      selectedDepartment: isElevated ? selectedDepartment : originalRole,
      login,
      signup,
      logout,
      switchDepartment,
      setSelectedDepartment,
    }),
    [user, loading, originalRole, isAdmin, isProductionHead, isElevated, selectedDepartment, login, signup, logout, switchDepartment]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
