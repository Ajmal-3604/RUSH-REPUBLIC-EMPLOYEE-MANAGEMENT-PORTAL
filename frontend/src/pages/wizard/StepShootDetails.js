import React, { useEffect, useState } from 'react';
import SearchPicker from '../../components/SearchPicker';
import { brandService } from '../../api/services';

export default function StepShootDetails({ plan, form, setForm, fieldErrors }) {
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    brandService.list({ status: 'Active' }).then((data) => setBrands(Array.isArray(data) ? data : data.results || []));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const selectedBrand = brands.find((b) => String(b.id) === String(form.brand));

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
