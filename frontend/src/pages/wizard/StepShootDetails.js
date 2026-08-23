import React, { useEffect, useState } from 'react';
import SearchPicker from '../../components/SearchPicker';
import { brandService, freelancerService, crewService, extractApiError } from '../../api/services';

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export default function StepShootDetails({ plan, form, setForm, fieldErrors, onCrewChanged }) {
  const [brands, setBrands] = useState([]);
  const [freelancers, setFreelancers] = useState([]);
  const [freelancerCrew, setFreelancerCrew] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [freelancerQuery, setFreelancerQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    brandService.list({ status: 'Active' }).then((data) => setBrands(Array.isArray(data) ? data : data.results || []));
    freelancerService
      .list({ status: 'Active' })
      .then((data) => setFreelancers(Array.isArray(data) ? data : data.results || []));
  }, []);

  useEffect(() => {
    setFreelancerCrew((plan?.crew || []).filter((c) => c.person_type === 'FREELANCER'));
  }, [plan]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const selectedBrand = brands.find((b) => String(b.id) === String(form.brand));

  const addFreelancer = async (freelancerId) => {
    const fr = freelancers.find((f) => String(f.id) === String(freelancerId));
    if (!fr || !plan?.id) return;
    setBusy(true);
    setError('');
    try {
      await crewService.create({
        shoot_plan: plan.id,
        name: fr.name,
        contact: fr.mobile,
        person_type: 'FREELANCER',
        source_freelancer: fr.id,
        role: 'OTHER',
      });
      onCrewChanged();
    } catch (err) {
      setError(extractApiError(err, 'Could not add freelancer.'));
    } finally {
      setBusy(false);
      setPickerOpen(false);
      setFreelancerQuery('');
    }
  };

  const updateFreelancerTime = async (crewId, field, value) => {
    try {
      await crewService.patch(crewId, { [field]: value || null });
      onCrewChanged();
    } catch (err) {
      setError(extractApiError(err, 'Could not update time.'));
    }
  };

  const removeFreelancer = async (crewId) => {
    try {
      await crewService.remove(crewId);
      onCrewChanged();
    } catch (err) {
      setError(extractApiError(err, 'Could not remove freelancer.'));
    }
  };

  const availableFreelancers = freelancers
    .filter((f) => !freelancerCrew.some((c) => c.source_freelancer === f.id))
    .filter((f) => f.name.toLowerCase().includes(freelancerQuery.toLowerCase()));

  return (
    <>
      <div className="rr-wiz-step-title">Shoot Details</div>

      <div className="rr-wizfield">
        <label>
          Shoot title <span className="rr-wiz-required">*</span>
        </label>
        <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Villa Launch Shoot" />
        {fieldErrors.title && <div className="rr-drawer__error">{fieldErrors.title}</div>}
      </div>

      <div className="rr-wizgrid-3" style={{ marginBottom: 14 }}>
        <div className="rr-wizfield" style={{ marginBottom: 0 }}>
          <label>
            Shoot date <span className="rr-wiz-required">*</span>
          </label>
          <input type="date" name="shoot_date" value={form.shoot_date} onChange={handleChange} />
        </div>
        <div className="rr-wizfield" style={{ marginBottom: 0 }}>
          <label>Start time</label>
          <input type="time" name="call_time" value={form.call_time} onChange={handleChange} />
        </div>
        <div className="rr-wizfield" style={{ marginBottom: 0 }}>
          <label>End time</label>
          <input type="time" name="wrap_time" value={form.wrap_time} onChange={handleChange} />
        </div>
      </div>

      <div className="rr-wizgrid-3" style={{ marginBottom: 14 }}>
        <SearchPicker
          label="Brand"
          required
          value={form.brand}
          options={brands.map((b) => ({ id: b.id, name: b.name }))}
          onSelect={(id) => {
            const picked = brands.find((b) => String(b.id) === String(id));
            setForm((prev) => ({ ...prev, brand: id, client_name: picked ? picked.name : prev.client_name }));
          }}
          placeholder="Select brand"
        />
      </div>

      <div className="rr-wizgrid-3" style={{ marginBottom: 4 }}>
        {[
          ['Client Servicing Manager', selectedBrand?.client_servicing_name],
          ['Social Media Specialist', selectedBrand?.social_media_specialist_name],
          ['Production Coordinator', selectedBrand?.production_coordinator_name],
          ['Script Writer', selectedBrand?.script_writer_name],
          ['Production Head', selectedBrand?.production_head_name],
        ].map(([label, value]) => (
          <div className="rr-wizfield" key={label} style={{ marginBottom: 0 }}>
            <label>{label}</label>
            <input value={value || '—'} disabled style={{ background: '#f7f7f5', color: 'rgba(0,0,0,.65)' }} />
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.4)', margin: '4px 0 16px' }}>
        Social Media, Client Service, Scriptwriter, and Production Head follow the selected brand's assignment — change them from the Brands page.
      </div>

      <div className="rr-wizfield" style={{ maxWidth: 380, position: 'relative' }}>
        <label>Freelancer(s)</label>
        {error && <div className="rr-drawer__error" style={{ marginBottom: 6 }}>{error}</div>}
        <div className="rr-wiz-chips">
          {freelancerCrew.map((fc) => (
            <div className="rr-wiz-chip" key={fc.id} style={{ gap: 10 }}>
              <span style={{ fontWeight: 600 }}>{fc.name}</span>
              <label style={{ fontSize: 10.5, color: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', gap: 4 }}>
                In
                <input
                  type="time"
                  defaultValue={fc.call_time || ''}
                  onBlur={(e) => updateFreelancerTime(fc.id, 'call_time', e.target.value)}
                  style={{ border: '1px solid rgba(0,0,0,.15)', borderRadius: 5, padding: '4px 6px', fontSize: 12 }}
                />
              </label>
              <label style={{ fontSize: 10.5, color: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', gap: 4 }}>
                Out
                <input
                  type="time"
                  defaultValue={fc.time_out || ''}
                  onBlur={(e) => updateFreelancerTime(fc.id, 'time_out', e.target.value)}
                  style={{ border: '1px solid rgba(0,0,0,.15)', borderRadius: 5, padding: '4px 6px', fontSize: 12 }}
                />
              </label>
              <button type="button" onClick={() => removeFreelancer(fc.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>
        {plan?.id ? (
          <>
            <div
              onClick={() => setPickerOpen((o) => !o)}
              style={{
                border: '1px dashed rgba(0,0,0,.3)',
                borderRadius: 5,
                padding: '8px 10px',
                fontSize: 13,
                cursor: 'pointer',
                color: 'rgba(0,0,0,.5)',
                display: 'inline-block',
              }}
            >
              {busy ? 'Adding…' : '+ Add freelancer'}
            </div>
            {pickerOpen && (
              <div
                style={{
                  position: 'absolute', zIndex: 10, background: '#fff', border: '1px solid rgba(0,0,0,.15)',
                  borderRadius: 6, boxShadow: '0 6px 18px rgba(0,0,0,.12)', marginTop: 4, maxHeight: 220,
                  overflowY: 'auto', width: '100%',
                }}
              >
                <input
                  autoFocus
                  value={freelancerQuery}
                  onChange={(e) => setFreelancerQuery(e.target.value)}
                  placeholder="Search…"
                  style={{ width: '100%', border: 'none', borderBottom: '1px solid rgba(0,0,0,.08)', padding: '9px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
                {availableFreelancers.length === 0 && (
                  <div style={{ padding: '10px 12px', fontSize: 12.5, color: 'rgba(0,0,0,.45)' }}>
                    No more freelancers available.
                  </div>
                )}
                {availableFreelancers.map((f) => (
                  <div
                    key={f.id}
                    role="option"
                    aria-selected="false"
                    tabIndex={0}
                    onClick={() => addFreelancer(f.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        addFreelancer(f.id);
                      }
                    }}
                    className="rr-searchpicker__option"
                  >
                    <span className="rr-searchpicker__avatar">{initials(f.name)}</span>
                    {f.name}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,.4)' }}>Save the shoot to add freelancers.</div>
        )}
      </div>

      <label style={{ display: 'block', marginBottom: 8 }}>Client notified about shoot and timings?</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button
          type="button"
          className={`rr-toggle-btn${form.client_notified ? ' rr-toggle-btn--active' : ''}`}
          onClick={() => setForm((prev) => ({ ...prev, client_notified: true }))}
        >
          Yes
        </button>
        <button
          type="button"
          className={`rr-toggle-btn${!form.client_notified ? ' rr-toggle-btn--active' : ''}`}
          onClick={() => setForm((prev) => ({ ...prev, client_notified: false }))}
        >
          No
        </button>
      </div>
    </>
  );
}
