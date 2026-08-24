import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { extractApiError } from '../api/services';
import { switchableDepartments, departmentLabel } from '../constants/departments';
import './AppShell.css';

// Brands/Team/Freelancers/Models are shared data -- every department gets
// the same nav, not just Admin/Production Head.
const NAV_ITEMS = [
  { key: 'shoot-plans', label: 'Shoot Plans', path: '/shoot-plans' },
  { key: 'brands', label: 'Brands', path: '/brands' },
  { key: 'team', label: 'Team', path: '/team' },
  { key: 'freelancers', label: 'Freelancers', path: '/freelancers' },
  { key: 'models', label: 'Models', path: '/models' },
];

/**
 * Dark top-bar app shell used by every authenticated page.
 *
 * Replaces a left sidebar entirely -- brand, nav, and (for Admin/Production
 * Head) the "Preview As" department switcher all live in one bar, matching
 * the approved design reference exactly.
 */
export default function AppShell({ active, subbar, children }) {
  const { originalRole, isElevated, selectedDepartment, switchDepartment, logout } = useAuth();
  const navigate = useNavigate();
  const { showError } = useToast();

  const navItems = NAV_ITEMS;

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
              value={selectedDepartment || originalRole}
              onChange={async (e) => {
                const value = e.target.value;
                // Compare against the currently-selected department, not the
                // original role -- comparing against originalRole meant
                // switching back to it (e.g. Admin -> Production Coordinator
                // -> Admin) silently no-opped, since `value` always equals
                // originalRole in that case, so selectedDepartment never
                // actually updated back.
                if (value === (selectedDepartment || originalRole)) return;
                try {
                  await switchDepartment(value);
                } catch (err) {
                  showError(extractApiError(err, 'Could not switch department.'));
                }
              }}
            >
              <option value={originalRole}>{departmentLabel(originalRole)}</option>
              {switchableDepartments(originalRole).map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </>
        ) : (
          <span className="rr-shell__dept">{departmentLabel(originalRole)}</span>
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
