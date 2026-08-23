import React, { useCallback, useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import Drawer from '../components/Drawer';
import { freelancerService, extractApiError, extractFieldErrors } from '../api/services';
import { FREELANCER_CATEGORY_OPTIONS, labelOf } from '../constants/directoryOptions';
import './Directory.css';

const EMPTY_FORM = {
  name: '',
  mobile: '',
  email: '',
  categories: [],
  equipment: [],
  notes: '',
  is_active: true,
};

const EQUIPMENT_TYPE_OPTIONS = ['Camera', 'Lights', 'Gimbal', 'Lens', 'Microphone', 'GoPro', 'Other'];

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export default function Freelancers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
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
    if (categoryFilter !== 'All') params.category = categoryFilter;
    if (statusFilter !== 'All') params.status = statusFilter;
    freelancerService
      .list(params)
      .then((data) => {
        setRows(Array.isArray(data) ? data : data.results || []);
        setError('');
      })
      .catch((err) => setError(extractApiError(err, 'Could not load freelancers.')))
      .finally(() => setLoading(false));
  }, [search, categoryFilter, statusFilter]);

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
      mobile: row.mobile,
      email: row.email || '',
      categories: row.categories || [],
      equipment: row.equipment || [],
      notes: row.notes || '',
      is_active: row.is_active,
    });
    setFieldErrors({});
    setFormError('');
    setDrawerOpen(true);
  };

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const toggleCategory = (value) => {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(value)
        ? prev.categories.filter((c) => c !== value)
        : [...prev.categories, value],
    }));
  };

  const addEquipmentItem = () =>
    setForm((prev) => ({ ...prev, equipment: [...prev.equipment, { type: EQUIPMENT_TYPE_OPTIONS[0], name: '' }] }));
  const updateEquipmentItem = (idx, field, value) =>
    setForm((prev) => ({
      ...prev,
      equipment: prev.equipment.map((eq, i) => (i === idx ? { ...eq, [field]: value } : eq)),
    }));
  const removeEquipmentItem = (idx) =>
    setForm((prev) => ({ ...prev, equipment: prev.equipment.filter((_, i) => i !== idx) }));

  const handleSave = async () => {
    setSaving(true);
    setFormError('');
    setFieldErrors({});
    try {
      if (editing) {
        await freelancerService.patch(editing.id, form);
      } else {
        await freelancerService.create(form);
      }
      setDrawerOpen(false);
      load();
    } catch (err) {
      const flattened = extractFieldErrors(err);
      if (Object.keys(flattened).length) {
        setFieldErrors(flattened);
        setFormError(flattened.non_field_errors || 'Please fix the errors below.');
      } else {
        setFormError(extractApiError(err, 'Could not save this freelancer.'));
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row) => {
    try {
      await freelancerService.patch(row.id, { is_active: !row.is_active });
      load();
    } catch (err) {
      setError(extractApiError(err, 'Could not update status.'));
    }
  };

  return (
    <AppShell active="freelancers">
      <div className="rr-content">
        <div className="rr-page-title">Freelancers</div>
        <div className="rr-page-sub">External photographers and videographers available for shoots.</div>

        <div className="rr-toolbar">
          <input
            type="text"
            placeholder="Search name, phone, email, equipment…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <button
            className="rr-toolbar__clear"
            onClick={() => {
              setSearch('');
              setCategoryFilter('All');
              setStatusFilter('All');
            }}
          >
            Clear filters
          </button>
          <div className="rr-toolbar__spacer" />
          <button className="rr-btn-primary" onClick={openCreate}>
            + Add Freelancer
          </button>
        </div>

        <div className="rr-chip-row">
          <button
            className={`rr-chip${categoryFilter === 'All' ? ' rr-chip--active' : ''}`}
            onClick={() => setCategoryFilter('All')}
          >
            All
          </button>
          {FREELANCER_CATEGORY_OPTIONS.map((o) => (
            <button
              key={o.value}
              className={`rr-chip${categoryFilter === o.value ? ' rr-chip--active' : ''}`}
              onClick={() => setCategoryFilter(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>

        {error && <div className="rr-empty" style={{ borderStyle: 'solid', marginBottom: 18 }}>{error}</div>}

        {!loading && rows.length === 0 && (
          <div className="rr-empty">
            <div className="rr-empty__title">No freelancers match</div>
            <div className="rr-empty__text">Try clearing filters or search a different name.</div>
          </div>
        )}

        <div className="rr-card-grid">
          {rows.map((fr) => (
            <div className="rr-card" key={fr.id}>
              <div className="rr-card__head">
                <div className="rr-card__id">
                  <div className="rr-avatar">{initials(fr.name)}</div>
                  <div>
                    <div className="rr-card__name">{fr.name}</div>
                    <div className="rr-card__sub">{fr.mobile}</div>
                  </div>
                </div>
                <span
                  className="rr-pill"
                  style={{
                    background: fr.is_active ? '#d6f5e3' : '#eeeeee',
                    color: fr.is_active ? '#177a4c' : '#7a7a76',
                  }}
                >
                  {fr.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="rr-card__meta">
                <span>
                  <b style={{ color: 'rgba(0,0,0,.4)', fontWeight: 600 }}>Availability: </b>
                  {fr.availability_note}
                </span>
              </div>
              <div className="rr-card__tags">
                {(fr.categories || []).map((c) => (
                  <span className="rr-card__tag" key={c}>
                    {labelOf(FREELANCER_CATEGORY_OPTIONS, c)}
                  </span>
                ))}
                {fr.specialization && <span className="rr-card__tag">{fr.specialization}</span>}
              </div>
              {(fr.equipment || []).length > 0 ? (
                <div className="rr-card__meta" style={{ marginTop: 8 }}>
                  <span>{fr.equipment.map((eq) => eq.name).filter(Boolean).join(' · ')}</span>
                </div>
              ) : fr.equipment_summary ? (
                <div className="rr-card__meta" style={{ marginTop: 8 }}>
                  <span>{fr.equipment_summary}</span>
                </div>
              ) : null}
              <div className="rr-card__meta" style={{ marginTop: 8 }}>
                <span>{fr.email}</span>
              </div>
              <div className="rr-card__actions">
                <button className="rr-card__action-btn" onClick={() => openEdit(fr)}>
                  Edit
                </button>
                <button className="rr-card__action-btn" onClick={() => toggleActive(fr)}>
                  {fr.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        title={editing ? 'Edit Freelancer' : 'Add Freelancer'}
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

        <label>
          Mobile <span className="rr-drawer__required">*</span>
        </label>
        <input name="mobile" value={form.mobile} onChange={handleChange} placeholder="98765 43210" />
        {fieldErrors.mobile && <div className="rr-drawer__error">{fieldErrors.mobile}</div>}

        <label>Email</label>
        <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="name@freelance.in" />
        {fieldErrors.email && <div className="rr-drawer__error">{fieldErrors.email}</div>}

        <label>Categories</label>
        <div className="rr-drawer__chips">
          {FREELANCER_CATEGORY_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`rr-drawer__chip${form.categories.includes(o.value) ? ' rr-drawer__chip--active' : ''}`}
              onClick={() => toggleCategory(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 8px' }}>
          <label style={{ marginBottom: 0 }}>Equipment</label>
          <button
            type="button"
            onClick={addEquipmentItem}
            style={{ border: '1px solid rgba(0,0,0,.2)', background: '#fff', borderRadius: 5, padding: '5px 10px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}
          >
            + Add item
          </button>
        </div>
        {form.equipment.map((eq, idx) => (
          <div key={idx} style={{ border: '1px solid rgba(0,0,0,.1)', borderRadius: 5, padding: 10, marginBottom: 8 }}>
            <div className="rr-drawer__row">
              <select value={eq.type} onChange={(e) => updateEquipmentItem(idx, 'type', e.target.value)}>
                {EQUIPMENT_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                value={eq.name}
                onChange={(e) => updateEquipmentItem(idx, 'name', e.target.value)}
                placeholder="Model/name"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
              <button
                type="button"
                onClick={() => removeEquipmentItem(idx)}
                style={{ border: 'none', background: 'none', color: '#ff615f', fontSize: 11.5, cursor: 'pointer' }}
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        <label>Notes</label>
        <textarea name="notes" rows={3} value={form.notes} onChange={handleChange} placeholder="Available weekends only." />

        <label style={{ display: 'block', marginTop: 14, marginBottom: 8 }}>Status</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button
            type="button"
            className={`rr-toggle-btn${form.is_active ? ' rr-toggle-btn--active' : ''}`}
            onClick={() => setForm((prev) => ({ ...prev, is_active: true }))}
          >
            Active
          </button>
          <button
            type="button"
            className={`rr-toggle-btn${!form.is_active ? ' rr-toggle-btn--active' : ''}`}
            onClick={() => setForm((prev) => ({ ...prev, is_active: false }))}
          >
            Inactive
          </button>
        </div>
      </Drawer>
    </AppShell>
  );
}
