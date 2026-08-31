import React, { useCallback, useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import Drawer from '../components/Drawer';
import { modelPhotoService, extractApiError, extractFieldErrors } from '../api/services';
import { MODEL_CATEGORY_OPTIONS, MODEL_GENDER_OPTIONS } from '../constants/directoryOptions';
import { formatDate, money } from '../utils/format';
import './Directory.css';

const EMPTY_FORM = {
  name: '',
  age: '',
  gender: 'FEMALE',
  height_cm: '',
  weight_kg: '',
  skin_tone: '',
  mobile: '',
  email: '',
  cost_per_day: '',
  categories: [],
  notes: '',
};

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export default function Models() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [genderFilter, setGenderFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = { search: search || undefined };
    if (categoryFilter !== 'All') params.category = categoryFilter;
    if (genderFilter !== 'All') params.gender = genderFilter.toUpperCase();
    if (statusFilter !== 'All') params.status = statusFilter;
    modelPhotoService
      .list(params)
      .then((data) => {
        setRows(Array.isArray(data) ? data : data.results || []);
        setError('');
      })
      .catch((err) => setError(extractApiError(err, 'Could not load the models directory.')))
      .finally(() => setLoading(false));
  }, [search, categoryFilter, genderFilter, statusFilter]);

  useEffect(load, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setPhotoFile(null);
    setPhotoPreview(null);
    setFieldErrors({});
    setFormError('');
    setDrawerOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name,
      age: row.age,
      gender: row.gender,
      height_cm: row.height_cm || '',
      weight_kg: row.weight_kg || '',
      skin_tone: row.skin_tone || '',
      mobile: row.mobile,
      email: row.email || '',
      cost_per_day: row.cost_per_day,
      categories: row.categories || [],
      notes: row.notes || '',
    });
    setPhotoFile(null);
    setPhotoPreview(row.photo || null);
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

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError('');
    setFieldErrors({});
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key === 'categories') {
          // Multipart forms can't carry a real array -- a repeated key only
          // keeps its last value once Django parses it, so JSON-encode the
          // list into one field and let the backend decode it.
          data.append('categories', JSON.stringify(value));
        } else if (value !== '' && value !== null && value !== undefined) {
          data.append(key, value);
        }
      });
      if (photoFile) data.append('photo', photoFile);

      if (editing) {
        await modelPhotoService.patch(editing.id, data);
      } else {
        await modelPhotoService.create(data);
      }
      setDrawerOpen(false);
      load();
    } catch (err) {
      const flattened = extractFieldErrors(err);
      if (Object.keys(flattened).length) {
        setFieldErrors(flattened);
        setFormError(flattened.non_field_errors || 'Please fix the errors below.');
      } else {
        setFormError(extractApiError(err, 'Could not save this model.'));
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row) => {
    try {
      const data = new FormData();
      data.append('is_active', (!row.is_active).toString());
      await modelPhotoService.patch(row.id, data);
      load();
    } catch (err) {
      setError(extractApiError(err, 'Could not update status.'));
    }
  };

  return (
    <AppShell active="models">
      <div className="rr-content">
        <div className="rr-page-title">Models</div>
        <div className="rr-page-sub">Master directory of models available for shoots.</div>

        <div className="rr-toolbar">
          <input type="text" placeholder="Search models…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}>
            <option value="All">All genders</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
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
              setCategoryFilter('All');
              setGenderFilter('All');
              setStatusFilter('All');
            }}
          >
            Clear filters
          </button>
          <div className="rr-toolbar__spacer" />
          <button className="rr-btn-primary" onClick={openCreate}>
            + Add Model
          </button>
        </div>

        <div className="rr-chip-row">
          <button
            className={`rr-chip${categoryFilter === 'All' ? ' rr-chip--active' : ''}`}
            onClick={() => setCategoryFilter('All')}
          >
            All
          </button>
          {MODEL_CATEGORY_OPTIONS.map((o) => (
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
            <div className="rr-empty__title">No models match</div>
            <div className="rr-empty__text">Try clearing filters or search a different name.</div>
          </div>
        )}

        <div className="rr-card-grid">
          {rows.map((md) => (
            <div className="rr-card" key={md.id}>
              <div className="rr-card__head">
                <div className="rr-card__id">
                  <div className="rr-avatar">
                    {md.photo ? <img src={md.photo} alt={md.name} /> : initials(md.name)}
                  </div>
                  <div>
                    <div className="rr-card__name">{md.name}</div>
                    <div className="rr-card__sub">{md.mobile}</div>
                  </div>
                </div>
                <span
                  className="rr-pill"
                  style={{
                    background: md.is_active ? '#d6f5e3' : '#eeeeee',
                    color: md.is_active ? '#177a4c' : '#7a7a76',
                  }}
                >
                  {md.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="rr-card__grid2">
                <div>
                  Age <b>{md.age}</b>
                </div>
                <div>
                  Gender <b>{md.gender_display}</b>
                </div>
                <div>
                  Height <b>{md.height_cm ? `${md.height_cm} cm` : '—'}</b>
                </div>
                <div>
                  Weight <b>{md.weight_kg ? `${md.weight_kg} kg` : '—'}</b>
                </div>
                <div className="full">
                  Skin tone <b>{md.skin_tone || '—'}</b>
                </div>
                <div className="full">
                  Category <b>{(md.categories || []).join(', ') || '—'}</b>
                </div>
                <div className="full">
                  Cost <b>{money(md.cost_per_day)}/day</b>
                </div>
                <div className="full" style={{ color: 'rgba(0,0,0,.45)' }}>
                  Last updated <b style={{ color: 'rgba(0,0,0,.65)' }}>{formatDate(md.updated_at)}</b>
                </div>
              </div>
              <div className="rr-card__actions">
                <button className="rr-card__action-btn" onClick={() => openEdit(md)}>
                  Edit
                </button>
                <button className="rr-card__action-btn" onClick={() => toggleActive(md)}>
                  {md.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        title={editing ? 'Edit Model' : 'Add Model'}
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

        <label>Model photo</label>
        <div className="rr-drawer__photo-row">
          <div className="rr-drawer__photo-preview">
            {photoPreview && <img src={photoPreview} alt="" />}
          </div>
          <label className="rr-drawer__upload">
            {photoPreview ? 'Replace' : 'Upload'}
            <input type="file" accept="image/*" onChange={handlePhoto} />
          </label>
        </div>

        <label>
          Name <span className="rr-drawer__required">*</span>
        </label>
        <input name="name" value={form.name} onChange={handleChange} />
        {fieldErrors.name && <div className="rr-drawer__error">{fieldErrors.name}</div>}

        <div className="rr-drawer__row">
          <div>
            <label>
              Age <span className="rr-drawer__required">*</span>
            </label>
            <input name="age" type="number" min={18} max={80} value={form.age} onChange={handleChange} />
            {fieldErrors.age && <div className="rr-drawer__error">{fieldErrors.age}</div>}
          </div>
          <div>
            <label>Gender</label>
            <select name="gender" value={form.gender} onChange={handleChange}>
              {MODEL_GENDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rr-drawer__row">
          <div>
            <label>Height (cm)</label>
            <input name="height_cm" type="number" value={form.height_cm} onChange={handleChange} />
          </div>
          <div>
            <label>Weight (kg)</label>
            <input name="weight_kg" type="number" value={form.weight_kg} onChange={handleChange} />
          </div>
        </div>

        <label>Skin tone</label>
        <input name="skin_tone" value={form.skin_tone} onChange={handleChange} placeholder="e.g. Fair, Wheatish, Dusky" />

        <label>
          Mobile <span className="rr-drawer__required">*</span>
        </label>
        <input name="mobile" value={form.mobile} onChange={handleChange} />
        {fieldErrors.mobile && <div className="rr-drawer__error">{fieldErrors.mobile}</div>}

        <label>Email</label>
        <input name="email" type="email" value={form.email} onChange={handleChange} />

        <label>Per-day cost (₹)</label>
        <input name="cost_per_day" type="number" step="0.01" value={form.cost_per_day} onChange={handleChange} />
        {fieldErrors.cost_per_day && <div className="rr-drawer__error">{fieldErrors.cost_per_day}</div>}

        <label>
          Category <span className="rr-drawer__required">*</span>
        </label>
        <div className="rr-drawer__chips">
          {MODEL_CATEGORY_OPTIONS.map((o) => (
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

        <label>Notes</label>
        <textarea name="notes" rows={3} value={form.notes} onChange={handleChange} />
      </Drawer>
    </AppShell>
  );
}
