import React, { useEffect, useState } from 'react';
import RepeatingCard from '../../components/RepeatingCard';
import PhotoUploadGrid from '../../components/PhotoUploadGrid';
import { ErrorAlert } from '../../components/EmptyState';
import { planLocationService, planLocationPhotoService, shootPlanService, extractApiError } from '../../api/services';
import { APPROVAL_STATUS_OPTIONS, PERMIT_STATUS_OPTIONS } from '../../constants/wizardOptions';

export default function StepLocations({ plan, onChanged }) {
  const [error, setError] = useState('');
  const [notified, setNotified] = useState(!!plan?.locations_notified);
  const locations = plan?.plan_locations || [];

  useEffect(() => setNotified(!!plan?.locations_notified), [plan?.locations_notified]);

  const run = async (fn, message) => {
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(extractApiError(err, message));
    }
  };

  const add = () =>
    run(
      () => planLocationService.create({ shoot_plan: plan.id, name: `Location ${locations.length + 1}`, order: locations.length }),
      'Could not add location.'
    );
  const patch = (id, payload) => run(() => planLocationService.patch(id, payload), 'Could not save changes.');
  const remove = (id) => run(() => planLocationService.remove(id), 'Could not remove location.');
  const move = (id, dir) => {
    const idx = locations.findIndex((l) => l.id === id);
    const swapWith = locations[idx + dir];
    if (!swapWith) return;
    run(
      () =>
        Promise.all([
          planLocationService.patch(id, { order: swapWith.order }),
          planLocationService.patch(swapWith.id, { order: locations[idx].order }),
        ]),
      'Could not reorder.'
    );
  };
  const duplicate = (l) =>
    run(
      () =>
        planLocationService.create({
          shoot_plan: plan.id,
          name: `${l.name} (copy)`,
          address: l.address,
          map_url: l.map_url,
          permit_status: l.permit_status,
          contact_name: l.contact_name,
          contact_phone: l.contact_phone,
          access_notes: l.access_notes,
          budget_cost: l.budget_cost,
          order: locations.length,
        }),
      'Could not duplicate.'
    );

  return (
    <>
      <div className="rr-wiz-step-title">Locations</div>
      <ErrorAlert message={error} />

      {locations.length > 0 && (
        <div style={{ border: '1px solid rgba(0,0,0,.1)', borderRadius: 6, padding: 16, marginBottom: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.03em', color: 'rgba(0,0,0,.5)', marginBottom: 10 }}>
            Location Approval
          </div>
          {locations.map((l) => (
            <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{l.name}</span>
              <select
                className="rr-status-select"
                value={l.approval_status}
                onChange={(e) => patch(l.id, { approval_status: e.target.value })}
                style={{
                  background: l.approval_status === 'APPROVED' ? '#d6f5e3' : l.approval_status === 'REJECTED' ? '#ffdadf' : '#e9e8e4',
                  color: l.approval_status === 'APPROVED' ? '#177a4c' : l.approval_status === 'REJECTED' ? '#b3213f' : '#3a3a38',
                }}
              >
                {APPROVAL_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Locations shared with client?</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className={`rr-toggle-btn${notified ? ' rr-toggle-btn--active' : ''}`}
                onClick={() => {
                  setNotified(true);
                  run(() => shootPlanService.patch(plan.id, { locations_notified: true }), 'Could not save.');
                }}
              >
                Yes
              </button>
              <button
                type="button"
                className={`rr-toggle-btn${!notified ? ' rr-toggle-btn--active' : ''}`}
                onClick={() => {
                  setNotified(false);
                  run(() => shootPlanService.patch(plan.id, { locations_notified: false }), 'Could not save.');
                }}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rr-stepbar">
        <span className="rr-stepbar__count">{locations.length} location(s) added</span>
        <button type="button" className="rr-toggle-btn rr-toggle-btn--active" onClick={add}>
          + Add Location
        </button>
      </div>

      {locations.length === 0 && (
        <div className="rr-wiz-empty">
          <div className="rr-wiz-empty__title">No locations added yet</div>
          <div className="rr-wiz-empty__text">Add the shoot's locations, addresses, and access details.</div>
          <button type="button" className="rr-toggle-btn rr-toggle-btn--active" onClick={add}>
            + Add Location
          </button>
        </div>
      )}

      {locations.map((l, idx) => (
        <RepeatingCard
          key={l.id}
          title={`Location ${idx + 1}${l.name ? ` — ${l.name}` : ''}`}
          complete={!!(l.name && l.address)}
          summary={`${l.name || 'Unnamed'} · ${l.address || 'no address'}`}
          isFirst={idx === 0}
          isLast={idx === locations.length - 1}
          onMoveUp={() => move(l.id, -1)}
          onMoveDown={() => move(l.id, 1)}
          onDuplicate={() => duplicate(l)}
          onRemove={() => remove(l.id)}
        >
          <div className="rr-wizgrid-2">
            <div className="rr-wizfield">
              <label>
                Location name <span className="rr-wiz-required">*</span>
              </label>
              <input defaultValue={l.name} onBlur={(e) => patch(l.id, { name: e.target.value })} placeholder="e.g. Marina Rooftop" />
            </div>
            <div className="rr-wizfield">
              <label>
                Address <span className="rr-wiz-required">*</span>
              </label>
              <input defaultValue={l.address} onBlur={(e) => patch(l.id, { address: e.target.value })} placeholder="Full address" />
            </div>
            <div className="rr-wizfield">
              <label>Map URL</label>
              <input defaultValue={l.map_url} onBlur={(e) => patch(l.id, { map_url: e.target.value })} placeholder="https://maps.google.com/…" />
            </div>
            <div className="rr-wizfield">
              <label>Permit status</label>
              <select defaultValue={l.permit_status} onBlur={(e) => patch(l.id, { permit_status: e.target.value })}>
                {PERMIT_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="rr-wizfield">
              <label>On-site contact</label>
              <input defaultValue={l.contact_name} onBlur={(e) => patch(l.id, { contact_name: e.target.value })} placeholder="Name" />
            </div>
            <div className="rr-wizfield">
              <label>Contact phone</label>
              <input defaultValue={l.contact_phone} onBlur={(e) => patch(l.id, { contact_phone: e.target.value })} placeholder="98765 43210" />
            </div>
          </div>

          <div className="rr-wizfield">
            <label>Access notes</label>
            <textarea rows={2} defaultValue={l.access_notes} onBlur={(e) => patch(l.id, { access_notes: e.target.value })} />
          </div>

          <PhotoUploadGrid
            label="Location photos"
            photos={(l.photos || []).filter((p) => p.category === 'LOCATION')}
            onUpload={(file) => run(() => planLocationPhotoService.upload(l.id, file, { category: 'LOCATION' }), 'Upload failed.')}
            onRemove={(photoId) => run(() => planLocationPhotoService.remove(photoId), 'Could not remove photo.')}
          />
          <PhotoUploadGrid
            label="Preferred background color"
            photos={(l.photos || []).filter((p) => p.category === 'BACKGROUND_REF')}
            onUpload={(file) => run(() => planLocationPhotoService.upload(l.id, file, { category: 'BACKGROUND_REF' }), 'Upload failed.')}
            onRemove={(photoId) => run(() => planLocationPhotoService.remove(photoId), 'Could not remove photo.')}
          />

          <div className="rr-wizgrid-2">
            <div className="rr-wizfield">
              <label>Agreed time in</label>
              <input type="time" defaultValue={l.time_in || ''} onBlur={(e) => patch(l.id, { time_in: e.target.value || null })} />
            </div>
            <div className="rr-wizfield">
              <label>Agreed time out</label>
              <input type="time" defaultValue={l.time_out || ''} onBlur={(e) => patch(l.id, { time_out: e.target.value || null })} />
            </div>
          </div>
        </RepeatingCard>
      ))}
    </>
  );
}
