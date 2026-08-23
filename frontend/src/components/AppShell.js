import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { extractApiError } from '../api/services';
import { switchableDepartments, departmentLabel } from '../constants/departments';
import './AppShell.css';

const ELEVATED_NAV_ITEMS = [
  { key: 'shoot-plans', label: 'Shoot Plans', path: '/shoot-plans' },
  { key: 'brands', label: 'Brands', path: '/brands' },
  { key: 'team', label: 'Team', path: '/team' },
  { key: 'freelancers', label: 'Freelancers', path: '/freelancers' },
  { key: 'models', label: 'Models', path: '/models' },
];

const DEPARTMENT_NAV_ITEMS = [{ key: 'shoot-plans', label: 'Shoot Plans', path: '/shoot-plans' }];

/**
 * Dark top-bar app shell used by every authenticated page.
 *
 * Replaces a left sidebar entirely -- brand, nav, and (for Admin/Production
 * Head) the "Preview As" department switcher all live in one bar, matching
 * the approved design reference exactly.
 */
export default function AppShell({ active, subbar, children }) {
  const { user, isElevated, activeDepartment, switchDepartment, logout } = useAuth();
  const navigate = useNavigate();
  const { showError } = useToast();

  const navItems = isElevated ? ELEVATED_NAV_ITEMS : DEPARTMENT_NAV_ITEMS;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="rr-shell">
      <div className="rr-shell__bar">
        <button className="rr-shell__brand" onClick={() => navigate('/shoot-plans')}>
          Rush Republic
        </button>
        <div className="rr-shell__divider" />

        <nav className="rr-shell__nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`rr-shell__nav-item${active === item.key ? ' rr-shell__nav-item--active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="rr-shell__spacer" />

        {isElevated ? (
          <>
            <label className="rr-shell__preview-label" htmlFor="preview-as">
              Preview as
            </label>
            <select
              id="preview-as"
              className="rr-shell__preview-select"
              value={activeDepartment || user.department}
              onChange={async (e) => {
                const value = e.target.value;
                if (value === user.department) return;
                try {
                  await switchDepartment(value);
                } catch (err) {
                  showError(extractApiError(err, 'Could not switch department.'));
                }
              }}
            >
              <option value={user.department}>{departmentLabel(user.department)}</option>
              {switchableDepartments(user.department).map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </>
        ) : (
          <span className="rr-shell__dept">{departmentLabel(user?.department)}</span>
        )}

        <div className="rr-shell__user">
          <button className="rr-shell__logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>

      {subbar && <div className="rr-shell__subbar">{subbar}</div>}

      <div className="rr-shell__body">{children}</div>
    </div>
  );
}
