import React, { useEffect, useState } from 'react';
import RepeatingCard from '../../components/RepeatingCard';
import PhotoUploadGrid from '../../components/PhotoUploadGrid';
import { ErrorAlert } from '../../components/EmptyState';
import {
  planModelService,
  planModelPhotoService,
  modelService,
  shootPlanService,
  extractApiError,
} from '../../api/services';
import { APPROVAL_STATUS_OPTIONS } from '../../constants/wizardOptions';

export default function StepPeopleModels({ plan, onChanged }) {
  const [directoryModels, setDirectoryModels] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState('');
  const [notified, setNotified] = useState(!!plan?.models_notified);

  const planModels = plan?.plan_models || [];

  useEffect(() => {
    modelService.list({ status: 'Active' }).then((data) => setDirectoryModels(Array.isArray(data) ? data : data.results || []));
  }, []);

  useEffect(() => setNotified(!!plan?.models_notified), [plan?.models_notified]);

  const run = async (fn, message) => {
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(extractApiError(err, message));
    }
  };

  const addBlank = () =>
    run(
      () => planModelService.create({ shoot_plan: plan.id, name: `Model ${planModels.length + 1}`, order: planModels.length }),
      'Could not add model.'
    );

  const addFromDirectory = (dm) =>
    run(
      () =>
        planModelService.create({
          shoot_plan: plan.id,
          from_directory: true,
          directory_model: dm.id,
          name: dm.name,
          phone: dm.mobile,
          email: dm.email || '',
          negotiated_cost: dm.cost_per_day,
          order: planModels.length,
        }),
      'Could not add model.'
    ).then(() => setPickerOpen(false));

  const patch = (id, payload) => run(() => planModelService.patch(id, payload), 'Could not save changes.');
  const remove = (id) => run(() => planModelService.remove(id), 'Could not remove model.');
  const move = (id, dir) => {
    const idx = planModels.findIndex((m) => m.id === id);
    const swapWith = planModels[idx + dir];
    if (!swapWith) return;
    run(
      () =>
        Promise.all([
          planModelService.patch(id, { order: swapWith.order }),
          planModelService.patch(swapWith.id, { order: planModels[idx].order }),
        ]),
      'Could not reorder.'
    );
  };
  const duplicate = (m) =>
    run(
      () =>
        planModelService.create({
          shoot_plan: plan.id,
          name: `${m.name} (copy)`,
          phone: m.phone,
          email: m.email,
          agency: m.agency,
          alt_contact: m.alt_contact,
          negotiated_cost: m.negotiated_cost,
          notes: m.notes,
          order: planModels.length,
        }),
      'Could not duplicate.'
    );

  const availableDirectoryModels = directoryModels.filter(
    (dm) => !planModels.some((pm) => pm.directory_model === dm.id)
  );

  return (
    <>
      <div className="rr-wiz-step-title">People &amp; Models</div>

      <ErrorAlert message={error} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Models added: {planModels.length}</span>
        <button type="button" className="rr-toggle-btn" onClick={addBlank}>
          + Add Model
        </button>
        <div style={{ position: 'relative' }}>
          <button type="button" className="rr-toggle-btn" onClick={() => setPickerOpen((o) => !o)}>
            🔍 Select from Models directory
          </button>
          {pickerOpen && (
            <div
              style={{
                position: 'absolute', zIndex: 10, background: '#fff', border: '1px solid rgba(0,0,0,.15)',
                borderRadius: 6, boxShadow: '0 6px 18px rgba(0,0,0,.12)', marginTop: 4, maxHeight: 240,
                overflowY: 'auto', minWidth: 240,
              }}
            >
              {availableDirectoryModels.length === 0 && (
                <div style={{ padding: '10px 12px', fontSize: 12.5, color: 'rgba(0,0,0,.45)' }}>No more models available.</div>
              )}
              {availableDirectoryModels.map((dm) => (
                <div
                  key={dm.id}
                  role="option"
                  aria-selected="false"
                  tabIndex={0}
                  onClick={() => addFromDirectory(dm)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      addFromDirectory(dm);
                    }
                  }}
                  style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer' }}
                >
                  {dm.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {planModels.length > 0 && (
        <div style={{ border: '1px solid rgba(0,0,0,.1)', borderRadius: 6, padding: 16, marginBottom: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.03em', color: 'rgba(0,0,0,.5)', marginBottom: 10 }}>
            Model Approval
          </div>
          {planModels.map((m) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</span>
              <select
                className="rr-status-select"
                value={m.approval_status}
                onChange={(e) => patch(m.id, { approval_status: e.target.value })}
                style={{
                  background: m.approval_status === 'APPROVED' ? '#d6f5e3' : m.approval_status === 'REJECTED' ? '#ffdadf' : '#e9e8e4',
                  color: m.approval_status === 'APPROVED' ? '#177a4c' : m.approval_status === 'REJECTED' ? '#b3213f' : '#3a3a38',
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
            <span style={{ fontSize: 13, fontWeight: 600 }}>Models notified about shoot and timings?</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className={`rr-toggle-btn${notified ? ' rr-toggle-btn--active' : ''}`}
                onClick={() => {
                  setNotified(true);
                  run(() => shootPlanService.patch(plan.id, { models_notified: true }), 'Could not save.');
                }}
              >
                Yes
              </button>
              <button
                type="button"
                className={`rr-toggle-btn${!notified ? ' rr-toggle-btn--active' : ''}`}
                onClick={() => {
                  setNotified(false);
                  run(() => shootPlanService.patch(plan.id, { models_notified: false }), 'Could not save.');
                }}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {planModels.length === 0 && (
        <div className="rr-wiz-empty">
          <div className="rr-wiz-empty__title">No models added yet</div>
          <div className="rr-wiz-empty__text">Add a model manually or select from the Models directory.</div>
          <button type="button" className="rr-toggle-btn rr-toggle-btn--active" onClick={addBlank}>
            + Add Model
          </button>
        </div>
      )}

      {planModels.map((m, idx) => (
        <RepeatingCard
          key={m.id}
          title={`Model ${idx + 1}${m.name ? ` — ${m.name}` : ''}`}
          complete={!!(m.name && m.phone)}
          summary={`${m.name || 'Unnamed'} · ${m.phone || 'no phone'}`}
          isFirst={idx === 0}
          isLast={idx === planModels.length - 1}
          onMoveUp={() => move(m.id, -1)}
          onMoveDown={() => move(m.id, 1)}
          onDuplicate={() => duplicate(m)}
          onRemove={() => remove(m.id)}
        >
          <div className="rr-wizgrid-2">
            <div className="rr-wizfield">
              <label>
                Model name <span className="rr-wiz-required">*</span>
              </label>
              <input defaultValue={m.name} onBlur={(e) => patch(m.id, { name: e.target.value })} placeholder="Full name" />
            </div>
            <div className="rr-wizfield">
              <label>
                Phone <span className="rr-wiz-required">*</span>
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  defaultValue={m.country_code}
                  onBlur={(e) => patch(m.id, { country_code: e.target.value })}
                  style={{ width: 60 }}
                />
                <input
                  defaultValue={m.phone}
                  onBlur={(e) => patch(m.id, { phone: e.target.value })}
                  placeholder="98765 43210"
                  style={{ flex: 1 }}
                />
              </div>
            </div>
            <div className="rr-wizfield">
              <label>Email</label>
              <input defaultValue={m.email} onBlur={(e) => patch(m.id, { email: e.target.value })} placeholder="name@example.com" />
            </div>
            <div className="rr-wizfield">
              <label>Agency / source</label>
              <input defaultValue={m.agency} onBlur={(e) => patch(m.id, { agency: e.target.value })} placeholder="e.g. Independent" />
            </div>
            <div className="rr-wizfield">
              <label>Alternate contact</label>
              <input defaultValue={m.alt_contact} onBlur={(e) => patch(m.id, { alt_contact: e.target.value })} />
            </div>
            <div className="rr-wizfield">
              <label>Negotiated shoot cost (₹)</label>
              <input
                type="number"
                defaultValue={m.negotiated_cost || ''}
                onBlur={(e) => patch(m.id, { negotiated_cost: e.target.value || null })}
              />
            </div>
          </div>
          {m.from_directory && (
            <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.45)', margin: '-8px 0 14px' }}>
              From Models directory: {m.directory_model_name}
            </div>
          )}
          <div className="rr-wizfield">
            <label>Notes</label>
            <textarea rows={2} defaultValue={m.notes} onBlur={(e) => patch(m.id, { notes: e.target.value })} />
          </div>

          <PhotoUploadGrid
            label="Model photos"
            photos={(m.photos || []).filter((p) => p.category === 'MODEL')}
            onUpload={(file) => run(() => planModelPhotoService.upload(m.id, file, { category: 'MODEL' }), 'Upload failed.')}
            onRemove={(photoId) => run(() => planModelPhotoService.remove(photoId), 'Could not remove photo.')}
          />
          <PhotoUploadGrid
            label="Costume pictures"
            photos={(m.photos || []).filter((p) => p.category === 'COSTUME')}
            onUpload={(file) => run(() => planModelPhotoService.upload(m.id, file, { category: 'COSTUME' }), 'Upload failed.')}
            onRemove={(photoId) => run(() => planModelPhotoService.remove(photoId), 'Could not remove photo.')}
          />
          <PhotoUploadGrid
            label="Preferred costume color"
            photos={(m.photos || []).filter((p) => p.category === 'COSTUME_COLOR_REF')}
            onUpload={(file) => run(() => planModelPhotoService.upload(m.id, file, { category: 'COSTUME_COLOR_REF' }), 'Upload failed.')}
            onRemove={(photoId) => run(() => planModelPhotoService.remove(photoId), 'Could not remove photo.')}
          />

          <div className="rr-wizgrid-2">
            <div className="rr-wizfield">
              <label>Agreed time in</label>
              <input type="time" defaultValue={m.time_in || ''} onBlur={(e) => patch(m.id, { time_in: e.target.value || null })} />
            </div>
            <div className="rr-wizfield">
              <label>Agreed time out</label>
              <input type="time" defaultValue={m.time_out || ''} onBlur={(e) => patch(m.id, { time_out: e.target.value || null })} />
            </div>
          </div>
        </RepeatingCard>
      ))}
    </>
  );
}
