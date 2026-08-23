import React, { useCallback, useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import Drawer from '../components/Drawer';
import { brandService, teamService, extractApiError, extractFieldErrors } from '../api/services';
import './Directory.css';

const EMPTY_FORM = {
  name: '',
  client_servicing: '',
  social_media_specialist: '',
  production_coordinator: '',
  script_writer: '',
  production_head: '',
};

export default function Brands() {
  const [rows, setRows] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [paletteFile, setPaletteFile] = useState(null);
  const [palettePreview, setPalettePreview] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = { search: search || undefined };
    if (statusFilter !== 'All') params.status = statusFilter;
    brandService
      .list(params)
      .then((data) => {
        setRows(Array.isArray(data) ? data : data.results || []);
        setError('');
      })
      .catch((err) => setError(extractApiError(err, 'Could not load brands.')))
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(load, [load]);
  useEffect(() => {
    teamService
      .list({ status: 'Active' })
      .then((data) => setTeam(Array.isArray(data) ? data : data.results || []))
      .catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setLogoFile(null);
    setLogoPreview(null);
    setPaletteFile(null);
    setPalettePreview(null);
    setFieldErrors({});
    setFormError('');
    setDrawerOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name,
      client_servicing: row.client_servicing || '',
      social_media_specialist: row.social_media_specialist || '',
      production_coordinator: row.production_coordinator || '',
      script_writer: row.script_writer || '',
      production_head: row.production_head || '',
    });
    setLogoFile(null);
    setLogoPreview(row.logo || null);
    setPaletteFile(null);
    setPalettePreview(row.palette || null);
    setFieldErrors({});
    setFormError('');
    setDrawerOpen(true);
  };

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handlePalette = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPaletteFile(file);
    setPalettePreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError('');
    setFieldErrors({});
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) data.append(key, value);
      });
      if (logoFile) data.append('logo', logoFile);
      if (paletteFile) data.append('palette', paletteFile);

      if (editing) {
        await brandService.patch(editing.id, data);
      } else {
        await brandService.create(data);
      }
      setDrawerOpen(false);
      load();
    } catch (err) {
      const flattened = extractFieldErrors(err);
      if (Object.keys(flattened).length) {
        setFieldErrors(flattened);
        setFormError(flattened.non_field_errors || 'Please fix the errors below.');
      } else {
        setFormError(extractApiError(err, 'Could not save this brand.'));
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row) => {
    try {
      const data = new FormData();
      data.append('is_active', (!row.is_active).toString());
      await brandService.patch(row.id, data);
      load();
    } catch (err) {
      setError(extractApiError(err, 'Could not update status.'));
    }
  };

  // Each role field may only be filled by a team member actually holding
  // that role -- dynamic off `team`, so a newly added member shows up
  // automatically without any code change.
  const clientServicingOptions = team.filter((tm) => tm.role === 'CLIENT_SERVICING');
  const socialMediaOptions = team.filter((tm) => tm.role === 'SOCIAL_MEDIA_SPECIALIST');
  const productionCoordinatorOptions = team.filter((tm) => tm.role === 'PRODUCTION_COORDINATOR');
  const scriptWriterOptions = team.filter((tm) => tm.role === 'SCRIPT_WRITER');
  const productionHeadOptions = team.filter((tm) => tm.role === 'PRODUCTION_HEAD');

  const roleOptions = (options) =>
    options.length === 0 ? (
      <option value="" disabled>
        No users available
      </option>
    ) : (
      <>
        <option value="">Select…</option>
        {options.map((tm) => (
          <option key={tm.id} value={tm.id}>
            {tm.name}
          </option>
        ))}
      </>
    );

  return (
    <AppShell active="brands">
      <div className="rr-content">
        <div className="rr-page-title">Brands</div>
        <div className="rr-page-sub">Client brands and the Rush Republic team assigned to each.</div>

        <div className="rr-toolbar">
          <input type="text" placeholder="Search brands…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <div className="rr-toolbar__spacer" />
          <button className="rr-btn-primary" onClick={openCreate}>
            + Add Brand
          </button>
        </div>

        {error && <div className="rr-empty" style={{ borderStyle: 'solid', marginBottom: 18 }}>{error}</div>}

        {!loading && rows.length === 0 && (
          <div className="rr-empty">
            <div className="rr-empty__title">No brands match</div>
            <div className="rr-empty__text">Try a different search or clear the status filter.</div>
          </div>
        )}

        <div className="rr-card-grid">
          {rows.map((b) => (
            <div className="rr-card rr-card--flush" key={b.id}>
              <div className="rr-card__cover">
                {b.logo ? <img className="rr-card__cover-single" src={b.logo} alt={b.name} /> : '16:9 palette'}
              </div>
              <div className="rr-card__body">
                <div className="rr-card__head">
                  <div className="rr-card__name rr-card__name--lg">{b.name}</div>
                  <span
                    className="rr-pill"
                    style={{
                      background: b.is_active ? '#d6f5e3' : '#eeeeee',
                      color: b.is_active ? '#177a4c' : '#7a7a76',
                    }}
                  >
                    {b.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="rr-card__meta">
                  <span>Script Writer: {b.script_writer_name || '—'}</span>
                  <span>Social Media Specialist: {b.social_media_specialist_name || '—'}</span>
                  <span>Client Servicing: {b.client_servicing_name || '—'}</span>
                  <span>Production Head: {b.production_head_name || '—'}</span>
                </div>
                <div className="rr-card__actions">
                  <button className="rr-card__action-btn" onClick={() => openEdit(b)}>
                    Edit
                  </button>
                  <button className="rr-card__action-btn" onClick={() => toggleActive(b)}>
                    {b.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        title={editing ? 'Edit Brand' : 'Add Brand'}
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

        <label>Brand logo</label>
        <div className="rr-drawer__photo-row">
          <div className="rr-drawer__photo-preview" style={{ borderRadius: 6 }}>
            {logoPreview && <img src={logoPreview} alt="" />}
          </div>
          <label className="rr-drawer__upload">
            {logoPreview ? 'Replace' : 'Upload'}
            <input type="file" accept="image/*" onChange={handleLogo} />
          </label>
        </div>

        <label>Color palette image (16:9)</label>
        <div className="rr-drawer__photo-row">
          <div className="rr-drawer__photo-preview" style={{ borderRadius: 6, aspectRatio: '16 / 9', width: 120, height: 'auto' }}>
            {palettePreview && <img src={palettePreview} alt="" />}
          </div>
          <label className="rr-drawer__upload">
            {palettePreview ? 'Replace' : 'Upload'}
            <input type="file" accept="image/*" onChange={handlePalette} />
          </label>
        </div>

        <label>
          Brand name <span className="rr-drawer__required">*</span>
        </label>
        <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Indriya Realtors" />
        {fieldErrors.name && <div className="rr-drawer__error">{fieldErrors.name}</div>}

        <label>Client Servicing Manager</label>
        <select name="client_servicing" value={form.client_servicing} onChange={handleChange}>
          {roleOptions(clientServicingOptions)}
        </select>

        <label>Social Media Specialist</label>
        <select name="social_media_specialist" value={form.social_media_specialist} onChange={handleChange}>
          {roleOptions(socialMediaOptions)}
        </select>

        <label>Production Coordinator</label>
        <select name="production_coordinator" value={form.production_coordinator} onChange={handleChange}>
          {roleOptions(productionCoordinatorOptions)}
        </select>

        <label>Script Writer</label>
        <select name="script_writer" value={form.script_writer} onChange={handleChange}>
          {roleOptions(scriptWriterOptions)}
        </select>

        <label>Production Head</label>
        <select name="production_head" value={form.production_head} onChange={handleChange}>
          {roleOptions(productionHeadOptions)}
        </select>
      </Drawer>
    </AppShell>
  );
}
