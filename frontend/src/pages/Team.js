import React, { useCallback, useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import Drawer from '../components/Drawer';
import { teamService, extractApiError, extractFieldErrors } from '../api/services';
import { TEAM_ROLE_OPTIONS, BRANCH_OPTIONS } from '../constants/directoryOptions';
import './Directory.css';

const EMPTY_FORM = { name: '', role: '', branch: 'KOCHI', mobile: '', email: '' };

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export default function Team() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = { search: search || undefined };
    if (roleFilter !== 'All') params.role = roleFilter;
    if (branchFilter !== 'All') params.branch = branchFilter;
    if (statusFilter !== 'All') params.status = statusFilter;
    teamService
      .list(params)
      .then((data) => {
        setRows(Array.isArray(data) ? data : data.results || []);
        setError('');
      })
      .catch((err) => setError(extractApiError(err, 'Could not load the team directory.')))
      .finally(() => setLoading(false));
  }, [search, roleFilter, branchFilter, statusFilter]);

  useEffect(load, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormError('');
    setDrawerOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name,
      role: row.role,
      branch: row.branch,
      mobile: row.mobile,
      email: row.email || '',
    });
    setFieldErrors({});
    setFormError('');
    setDrawerOpen(true);
  };

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setFormError('');
    setFieldErrors({});
    try {
      if (editing) {
        await teamService.patch(editing.id, form);
      } else {
        await teamService.create(form);
      }
      setDrawerOpen(false);
      load();
    } catch (err) {
      const flattened = extractFieldErrors(err);
      if (Object.keys(flattened).length) {
        setFieldErrors(flattened);
        setFormError(flattened.non_field_errors || 'Please fix the errors below.');
      } else {
        setFormError(extractApiError(err, 'Could not save this team member.'));
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row) => {
    try {
      await teamService.patch(row.id, { is_active: !row.is_active });
      load();
    } catch (err) {
      setError(extractApiError(err, 'Could not update status.'));
    }
  };

  return (
    <AppShell active="team">
      <div className="rr-content">
        <div className="rr-page-title">Team</div>
        <div className="rr-page-sub">Manage Rush Republic staff, their system roles, and branch assignments.</div>

        <div className="rr-toolbar">
          <input
            type="text"
            placeholder="Search team members…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="All">All roles</option>
            {TEAM_ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
            <option value="All">All branches</option>
            {BRANCH_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <button
            className="rr-toolbar__clear"
            onClick={() => {
              setSearch('');
              setRoleFilter('All');
              setBranchFilter('All');
              setStatusFilter('All');
            }}
          >
            Clear filters
          </button>
          <div className="rr-toolbar__spacer" />
          <button className="rr-btn-primary" onClick={openCreate}>
            + Add Team Member
          </button>
        </div>

        {error && <div className="rr-empty" style={{ borderStyle: 'solid', marginBottom: 18 }}>{error}</div>}

        {!loading && rows.length === 0 && (
          <div className="rr-empty">
            <div className="rr-empty__title">No team members match</div>
            <div className="rr-empty__text">Try clearing filters or search a different name.</div>
          </div>
        )}

        <div className="rr-card-grid">
          {rows.map((tm) => (
            <div className="rr-card" key={tm.id}>
              <div className="rr-card__head">
                <div className="rr-card__id">
                  <div className="rr-avatar">{initials(tm.name)}</div>
                  <div>
                    <div className="rr-card__name">{tm.name}</div>
                    <div className="rr-card__sub">{tm.designation}</div>
                  </div>
                </div>
                <span
                  className="rr-pill"
                  style={{
                    background: tm.is_active ? '#d6f5e3' : '#eeeeee',
                    color: tm.is_active ? '#177a4c' : '#7a7a76',
                  }}
                >
                  {tm.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="rr-card__meta">
                <span>
                  {tm.role_display} · {tm.branch_display}
                </span>
                <span>{tm.mobile}</span>
                {tm.email && <span>{tm.email}</span>}
              </div>
              <div className="rr-card__actions">
                <button className="rr-card__action-btn" onClick={() => openEdit(tm)}>
                  Edit
                </button>
                <button className="rr-card__action-btn" onClick={() => toggleActive(tm)}>
                  {tm.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        title={editing ? 'Edit Team Member' : 'Add Team Member'}
        onClose={() => setDrawerOpen(false)}
        footer={
          <>
            <button className="rr-card__action-btn" onClick={() => setDrawerOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button className="rr-btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        {formError && <div className="rr-drawer__error" style={{ marginBottom: 10 }}>{formError}</div>}

        <label>
          Name <span className="rr-drawer__required">*</span>
        </label>
        <input name="name" value={form.name} onChange={handleChange} placeholder="Full name" />
        {fieldErrors.name && <div className="rr-drawer__error">{fieldErrors.name}</div>}

        <div className="rr-drawer__row">
          <div>
            <label>
              Role <span className="rr-drawer__required">*</span>
            </label>
            <select name="role" value={form.role} onChange={handleChange}>
              <option value="">Select role</option>
              {TEAM_ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Branch</label>
            <select name="branch" value={form.branch} onChange={handleChange}>
              {BRANCH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {fieldErrors.role && <div className="rr-drawer__error">{fieldErrors.role}</div>}

        <label>
          Mobile <span className="rr-drawer__required">*</span>
        </label>
        <input name="mobile" value={form.mobile} onChange={handleChange} placeholder="98765 43210" />
        {fieldErrors.mobile && <div className="rr-drawer__error">{fieldErrors.mobile}</div>}

        <label>Email</label>
        <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="name@rushrepublic.in" />
        {fieldErrors.email && <div className="rr-drawer__error">{fieldErrors.email}</div>}
      </Drawer>
    </AppShell>
  );
}
