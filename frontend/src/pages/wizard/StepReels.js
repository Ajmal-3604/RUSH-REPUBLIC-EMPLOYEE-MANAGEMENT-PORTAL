import React, { useEffect, useState } from 'react';
import RepeatingCard from '../../components/RepeatingCard';
import PhotoUploadGrid from '../../components/PhotoUploadGrid';
import { ErrorAlert } from '../../components/EmptyState';
import ApprovalPanel from '../../components/ApprovalPanel';
import { useToast } from '../../context/ToastContext';
import {
  reelService,
  reelPhotoService,
  modelService,
  planModelService,
  planModelPhotoService,
  planLocationService,
  planLocationPhotoService,
  propService,
  propPhotoService,
  extractApiError,
} from '../../api/services';
import { money, clampNonNegative } from '../../utils/format';
import {
  APPROVAL_STATUS_OPTIONS,
  PERMIT_STATUS_OPTIONS,
  PROP_SOURCE_OPTIONS,
  PROP_STATUS_OPTIONS,
} from '../../constants/wizardOptions';

const REEL_PHOTO_CATEGORIES = [
  { value: 'STORYBOARD', label: 'Storyboard (9:16 frames)', aspect: 'portrait', hint: 'Drag & drop portrait frames, or click to browse' },
];

const PROP_STATUS_COLORS = {
  NOT_SECURED: { background: '#e9e8e4', color: '#3a3a38' },
  SECURED: { background: '#d6f5e3', color: '#177a4c' },
};

const APPROVAL_STATUS_COLORS = {
  PENDING: { background: '#e9e8e4', color: '#3a3a38' },
  APPROVED: { background: '#d6f5e3', color: '#177a4c' },
  REJECTED: { background: '#ffdadf', color: '#b3213f' },
};

// Shared by ModelCard and LocationCard so "Completion Checklist" on the
// Review & Approval step (which checks every assigned model/location is
// APPROVED) has a way to actually reach that state -- it has no other input
// anywhere in the reachable wizard.
function ApprovalStatusSelect({ value, onChange }) {
  return (
    <select
      className="rr-status-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={APPROVAL_STATUS_COLORS[value] || APPROVAL_STATUS_COLORS.PENDING}
    >
      {APPROVAL_STATUS_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// Grows a textarea to fit its content instead of scrolling inside a fixed
// height -- called on mount (via ref, for existing long content) and on
// every keystroke/paste/delete (via onInput) so it never lags behind.
function autoResize(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function AssignmentRow({ label, pool, selectedIds, onRemove, actionLabel, onAction }) {
  const assigned = pool.filter((p) => selectedIds.includes(p.id));
  return (
    <div className="rr-wizfield" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ marginBottom: 0 }}>{label} — {assigned.length ? `${assigned.length} assigned` : 'None assigned'}</label>
        <button type="button" onClick={onAction} style={{ border: 'none', background: 'none', color: '#0e0e0e', textDecoration: 'underline', fontSize: 12.5, cursor: 'pointer' }}>
          {actionLabel}
        </button>
      </div>
      {assigned.length > 0 && (
        <div className="rr-wiz-chips" style={{ marginTop: 6 }}>
          {assigned.map((item) => (
            <span className="rr-wiz-chip" key={item.id}>
              <label>
                <input type="checkbox" checked readOnly onClick={() => onRemove(item)} />
                {item.name}
              </label>
              <button type="button" onClick={() => onRemove(item)} style={{ border: 'none', background: 'none', color: 'rgba(0,0,0,.4)', cursor: 'pointer', fontSize: 12 }}>
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function LocationCard({ location, onPatch, onUpload, onRemovePhoto, onRequestRemove }) {
  return (
    <RepeatingCard
      title={location.name || 'New location'}
      isFirst
      isLast
      onMoveUp={() => {}}
      onMoveDown={() => {}}
      onRemove={onRequestRemove}
      headerExtra={
        <ApprovalStatusSelect value={location.approval_status} onChange={(value) => onPatch({ approval_status: value })} />
      }
    >
      <div className="rr-wizgrid-2">
        <div className="rr-wizfield">
          <label>
            Location name <span className="rr-wiz-required">*</span>
          </label>
          <input defaultValue={location.name} onBlur={(e) => onPatch({ name: e.target.value })} placeholder="e.g. Marina Rooftop" />
        </div>
        <div className="rr-wizfield">
          <label>
            Address <span className="rr-wiz-required">*</span>
          </label>
          <input defaultValue={location.address} onBlur={(e) => onPatch({ address: e.target.value })} placeholder="Full address" />
        </div>
        <div className="rr-wizfield">
          <label>Map URL</label>
          <input defaultValue={location.map_url} onBlur={(e) => onPatch({ map_url: e.target.value })} placeholder="https://maps.google.com/…" />
        </div>
        <div className="rr-wizfield">
          <label>Permit status</label>
          <select defaultValue={location.permit_status} onBlur={(e) => onPatch({ permit_status: e.target.value })}>
            {PERMIT_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="rr-wizfield">
          <label>On-site contact</label>
          <input defaultValue={location.contact_name} onBlur={(e) => onPatch({ contact_name: e.target.value })} placeholder="Name" />
        </div>
        <div className="rr-wizfield">
          <label>Contact phone</label>
          <input defaultValue={location.contact_phone} onBlur={(e) => onPatch({ contact_phone: e.target.value })} placeholder="98765 43210" />
        </div>
      </div>

      <div className="rr-wizfield">
        <label>Access notes</label>
        <textarea
          ref={autoResize}
          rows={2}
          defaultValue={location.access_notes}
          onInput={(e) => autoResize(e.target)}
          onBlur={(e) => onPatch({ access_notes: e.target.value })}
          placeholder="Parking, permits, timing restrictions…"
          style={{ overflow: 'hidden', resize: 'none' }}
        />
      </div>

      <PhotoUploadGrid
        label="Location photos"
        photos={location.photos || []}
        hint="Drag & drop images, or click to browse · JPG/PNG up to 10MB"
        onUpload={onUpload}
        onRemove={onRemovePhoto}
      />

      <div className="rr-wizgrid-2">
        <div className="rr-wizfield">
          <label>Agreed time in</label>
          <input type="time" defaultValue={location.time_in || ''} onBlur={(e) => onPatch({ time_in: e.target.value || null })} />
        </div>
        <div className="rr-wizfield">
          <label>Agreed time out</label>
          <input type="time" defaultValue={location.time_out || ''} onBlur={(e) => onPatch({ time_out: e.target.value || null })} />
        </div>
      </div>
    </RepeatingCard>
  );
}

function PropCard({ prop, onPatch, onUpload, onRemovePhoto, onRequestRemove }) {
  return (
    <RepeatingCard
      title={prop.name || 'New prop'}
      isFirst
      isLast
      onMoveUp={() => {}}
      onMoveDown={() => {}}
      onRemove={onRequestRemove}
      headerExtra={
        <select
          className="rr-status-select"
          value={prop.status}
          onChange={(e) => onPatch({ status: e.target.value })}
          style={PROP_STATUS_COLORS[prop.status]}
        >
          {PROP_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      }
    >
      <div className="rr-wizgrid-3">
        <div className="rr-wizfield">
          <label>
            Prop name <span className="rr-wiz-required">*</span>
          </label>
          <input defaultValue={prop.name} onBlur={(e) => onPatch({ name: e.target.value })} placeholder="e.g. Woven picnic basket" />
        </div>
        <div className="rr-wizfield">
          <label>
            Quantity <span className="rr-wiz-required">*</span>
          </label>
          <input type="number" min={1} defaultValue={prop.quantity} onBlur={(e) => onPatch({ quantity: clampNonNegative(e.target.value, 1) })} />
        </div>
        <div className="rr-wizfield">
          <label>Source</label>
          <select defaultValue={prop.source} onBlur={(e) => onPatch({ source: e.target.value })}>
            <option value="">Select…</option>
            {PROP_SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="rr-wizfield" style={{ maxWidth: 200 }}>
        <label>Unit cost (₹)</label>
        <input type="number" step="0.01" defaultValue={prop.unit_cost} onBlur={(e) => onPatch({ unit_cost: clampNonNegative(e.target.value) })} />
      </div>
      <div className="rr-wizfield">
        <label>Notes</label>
        <textarea
          ref={autoResize}
          rows={2}
          defaultValue={prop.notes}
          onInput={(e) => autoResize(e.target)}
          onBlur={(e) => onPatch({ notes: e.target.value })}
          placeholder="Condition, color, backup options…"
          style={{ overflow: 'hidden', resize: 'none' }}
        />
      </div>
      <PhotoUploadGrid label="Reference photos" photos={prop.photos || []} onUpload={onUpload} onRemove={onRemovePhoto} />
    </RepeatingCard>
  );
}

function ModelCard({ model, onPatch, onUploadRef, onRemoveRefPhoto, onUploadCostume, onRemoveCostumePhoto, onRequestRemove }) {
  const refPhotos = (model.photos || []).filter((p) => p.category === 'COSTUME_COLOR_REF');
  const costumePhotos = (model.photos || []).filter((p) => p.category === 'COSTUME');
  return (
    <RepeatingCard title={model.name || 'Model'} isFirst isLast onMoveUp={() => {}} onMoveDown={() => {}} onRemove={onRequestRemove}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 4 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#0e0e0e', color: '#fff', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', overflow: 'hidden' }}>
            {model.directory_model_photo ? (
              <img src={model.directory_model_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              initials(model.name)
            )}
          </div>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>{model.name}</div>
            {(model.directory_model_age || model.directory_model_gender_display) && (
              <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.5)' }}>
                Age {model.directory_model_age} · {model.directory_model_gender_display}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div className="rr-wizfield" style={{ width: 140, marginBottom: 0 }}>
            <label>Agreed time in</label>
            <input type="time" defaultValue={model.time_in || ''} onBlur={(e) => onPatch({ time_in: e.target.value || null })} />
          </div>
          <div className="rr-wizfield" style={{ width: 140, marginBottom: 0 }}>
            <label>Agreed time out</label>
            <input type="time" defaultValue={model.time_out || ''} onBlur={(e) => onPatch({ time_out: e.target.value || null })} />
          </div>
          <ApprovalStatusSelect value={model.approval_status} onChange={(value) => onPatch({ approval_status: value })} />
        </div>
      </div>

      <div className="rr-wizgrid-2">
        <PhotoUploadGrid label="Costume reference images" hint="Add costume reference" photos={refPhotos} onUpload={onUploadRef} onRemove={onRemoveRefPhoto} />
        <PhotoUploadGrid label="Model costume images" hint="Add costume photos" photos={costumePhotos} onUpload={onUploadCostume} onRemove={onRemoveCostumePhoto} />
      </div>
    </RepeatingCard>
  );
}

export default function StepReels({ plan, onChanged, isElevated }) {
  const [error, setError] = useState('');
  const [directoryModels, setDirectoryModels] = useState([]);
  const [modelPickerFor, setModelPickerFor] = useState(null);
  const [modelQuery, setModelQuery] = useState('');
  const [confirmTarget, setConfirmTarget] = useState(null);
  const { showToast } = useToast();
  const reels = plan?.reels || [];
  const modelPool = plan?.plan_models || [];
  const locationPool = plan?.plan_locations || [];
  const propPool = plan?.props || [];

  useEffect(() => {
    modelService.list({ status: 'Active' }).then((data) => setDirectoryModels(Array.isArray(data) ? data : data.results || []));
  }, []);

  const run = async (fn, message, successMessage) => {
    try {
      await fn();
      onChanged();
      if (successMessage) showToast(successMessage);
    } catch (err) {
      setError(extractApiError(err, message));
    }
  };

  const add = () =>
    run(
      () => reelService.create({ shoot_plan: plan.id, order: reels.length }),
      'Could not add reel.'
    );
  const patch = (id, payload) => run(() => reelService.patch(id, payload), 'Could not save changes.');
  const remove = (id) => run(() => reelService.remove(id), 'Could not remove reel.');
  const submitReel = (id, wasReturned) =>
    run(
      () => reelService.submit(id),
      'Could not submit this reel for approval.',
      wasReturned ? 'Reel resubmitted successfully for approval.' : 'Reel submitted successfully for approval.'
    );
  const approveReel = (id) =>
    run(() => reelService.approve(id), 'Could not approve this reel.', 'Reel approved successfully.');
  const returnReel = (id, suggestions) =>
    run(
      () => reelService.returnForChanges(id, suggestions),
      'Could not return this reel for changes.',
      'Reel returned for changes.'
    );
  const move = (id, dir) => {
    const idx = reels.findIndex((r) => r.id === id);
    const swapWith = reels[idx + dir];
    if (!swapWith) return;
    run(
      () =>
        Promise.all([
          reelService.patch(id, { order: swapWith.order }),
          reelService.patch(swapWith.id, { order: reels[idx].order }),
        ]),
      'Could not reorder.'
    );
  };
  const duplicate = (r) =>
    run(
      () =>
        reelService.create({
          shoot_plan: plan.id,
          title: `${r.title} (copy)`,
          concept: r.concept,
          reference_link: r.reference_link,
          notes: r.notes,
          photographer_notes: r.photographer_notes,
          platform: r.platform,
          duration_seconds: r.duration_seconds,
          order: reels.length,
        }),
      'Could not duplicate.'
    );

  const assign = (reel, field, id) => {
    const current = reel[field] || [];
    if (current.includes(id)) return;
    patch(reel.id, { [field]: [...current, id] });
  };

  const closeModelPicker = () => {
    setModelPickerFor(null);
    setModelQuery('');
  };

  const selectModel = async (reel, dirModel) => {
    closeModelPicker();
    const existing = modelPool.find((m) => m.name === dirModel.name);
    if (existing) {
      assign(reel, 'assigned_models', existing.id);
      return;
    }
    try {
      const created = await planModelService.create({
        shoot_plan: plan.id,
        from_directory: true,
        directory_model: dirModel.id,
        name: dirModel.name,
        phone: dirModel.mobile,
        email: dirModel.email || '',
        negotiated_cost: dirModel.cost_per_day,
        order: modelPool.length,
      });
      await patch(reel.id, { assigned_models: [...(reel.assigned_models || []), created.id] });
    } catch (err) {
      setError(extractApiError(err, 'Could not add model.'));
    }
  };
  const createLocationFor = (reel) =>
    run(async () => {
      const created = await planLocationService.create({
        shoot_plan: plan.id,
        name: 'New location',
        order: locationPool.length,
      });
      await reelService.patch(reel.id, { assigned_locations: [...(reel.assigned_locations || []), created.id] });
    }, 'Could not create location.');

  const createPropFor = (reel) =>
    run(async () => {
      const created = await propService.create({
        shoot_plan: plan.id,
        name: 'New prop',
        order: propPool.length,
      });
      await reelService.patch(reel.id, { assigned_props: [...(reel.assigned_props || []), created.id] });
    }, 'Could not create prop.');

  const patchLocation = (id, payload) => run(() => planLocationService.patch(id, payload), 'Could not save changes.');
  const patchProp = (id, payload) => run(() => propService.patch(id, payload), 'Could not save changes.');
  const patchModel = (id, payload) => run(() => planModelService.patch(id, payload), 'Could not save changes.');

  // Models/Locations/Props are a shared per-plan pool -- removing one here
  // deletes the record itself, not just this reel's assignment, since it may
  // be assigned elsewhere too. That's destructive, so it goes through a
  // confirmation instead of removing outright.
  const requestRemoveModel = (m) => setConfirmTarget({ kind: 'model', id: m.id, name: m.name });
  const requestRemoveLocation = (loc) => setConfirmTarget({ kind: 'location', id: loc.id, name: loc.name });
  const requestRemoveProp = (p) => setConfirmTarget({ kind: 'prop', id: p.id, name: p.name });
  const cancelConfirm = () => setConfirmTarget(null);
  const confirmRemove = () => {
    if (!confirmTarget) return;
    const { kind, id } = confirmTarget;
    setConfirmTarget(null);
    if (kind === 'model') run(() => planModelService.remove(id), 'Could not remove model.');
    else if (kind === 'location') run(() => planLocationService.remove(id), 'Could not remove location.');
    else run(() => propService.remove(id), 'Could not remove prop.');
  };

  return (
    <>
      <div className="rr-wiz-step-title">Reels</div>
      <ErrorAlert message={error} />

      <div className="rr-stepbar">
        <span className="rr-stepbar__count">{reels.length} reel(s) briefed</span>
        <button type="button" className="rr-toggle-btn rr-toggle-btn--active" onClick={add}>
          + Add Reel
        </button>
      </div>

      {reels.length === 0 && (
        <div className="rr-wiz-empty">
          <div className="rr-wiz-empty__title">No reels briefed yet</div>
          <div className="rr-wiz-empty__text">Outline each reel's script and references.</div>
          <button type="button" className="rr-toggle-btn rr-toggle-btn--active" onClick={add}>
            + Add Reel
          </button>
        </div>
      )}

      {reels.map((r, idx) => {
        const assignedLocations = locationPool.filter((l) => (r.assigned_locations || []).includes(l.id));
        const assignedProps = propPool.filter((p) => (r.assigned_props || []).includes(p.id));
        const assignedModels = modelPool.filter((m) => (r.assigned_models || []).includes(m.id));
        return (
          <RepeatingCard
            key={r.id}
            title={`Reel ${idx + 1}${r.title ? ` — ${r.title}` : ''}`}
            complete={!!(r.title && r.concept)}
            summary={`${r.title || 'Untitled'} · ${r.status_display} · ${r.approval_status_display || 'Draft'}`}
            isFirst={idx === 0}
            isLast={idx === reels.length - 1}
            onMoveUp={() => move(r.id, -1)}
            onMoveDown={() => move(r.id, 1)}
            onDuplicate={() => duplicate(r)}
            onRemove={() => remove(r.id)}
          >
            <ApprovalPanel
              entity={r}
              entityLabel="Reel"
              isElevated={isElevated}
              onSubmit={() => submitReel(r.id, r.approval_status === 'RETURNED_FOR_CHANGES')}
              onApprove={() => approveReel(r.id)}
              onReturn={(suggestions) => returnReel(r.id, suggestions)}
            />
            <div className="rr-wizfield">
              <label>
                Reel title <span className="rr-wiz-required">*</span>
              </label>
              <input defaultValue={r.title} onBlur={(e) => patch(r.id, { title: e.target.value })} placeholder="e.g. Rooftop Sunset Walk" />
            </div>
            <div className="rr-wizfield">
              <label>
                Script <span className="rr-wiz-required">*</span>
              </label>
              <textarea
                ref={autoResize}
                rows={4}
                defaultValue={r.concept}
                onInput={(e) => autoResize(e.target)}
                onBlur={(e) => patch(r.id, { concept: e.target.value })}
                placeholder="Full script — paragraph breaks supported…"
                style={{ overflow: 'hidden', resize: 'none' }}
              />
            </div>
            <div className="rr-wizfield">
              <label>Reference link</label>
              <input defaultValue={r.reference_link} onBlur={(e) => patch(r.id, { reference_link: e.target.value })} placeholder="Link to moodboard, reference reel…" />
            </div>
            <div className="rr-wizfield">
              <label>Notes to editor</label>
              <textarea
                ref={autoResize}
                rows={2}
                defaultValue={r.notes}
                onInput={(e) => autoResize(e.target)}
                onBlur={(e) => patch(r.id, { notes: e.target.value })}
                placeholder="Music, pacing, transitions…"
                style={{ overflow: 'hidden', resize: 'none' }}
              />
            </div>
            <div className="rr-wizfield">
              <label>Photographer/Videographer Notes</label>
              <textarea
                ref={autoResize}
                rows={3}
                defaultValue={r.photographer_notes}
                onInput={(e) => autoResize(e.target)}
                onBlur={(e) => patch(r.id, { photographer_notes: e.target.value })}
                placeholder="Camera movement, lens, frame rate, lighting, audio, special equipment…"
                style={{ overflow: 'hidden', resize: 'none' }}
              />
            </div>

            {REEL_PHOTO_CATEGORIES.map((cat) => (
              <PhotoUploadGrid
                key={cat.value}
                label={cat.label}
                aspect={cat.aspect}
                hint={cat.hint}
                photos={(r.photos || []).filter((p) => p.category === cat.value)}
                onUpload={(file) => run(() => reelPhotoService.upload(r.id, file, { category: cat.value }), 'Upload failed.')}
                onRemove={(photoId) => run(() => reelPhotoService.remove(photoId), 'Could not remove photo.')}
              />
            ))}

            <div className="rr-wizfield">
              <label style={{ display: 'block', marginBottom: 6 }}>
                Brand color palette{plan?.brand_name ? ` · ${plan.brand_name}` : ''}
              </label>
              <div
                style={{
                  width: '100%', maxWidth: 300, aspectRatio: '16 / 9', background: '#f7f7f5',
                  border: '1px solid rgba(0,0,0,.1)', borderRadius: 6, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}
              >
                {plan?.brand_palette ? (
                  <img src={plan.brand_palette} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 12.5, color: 'rgba(0,0,0,.4)' }}>No palette image uploaded</span>
                )}
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(0,0,0,.08)', paddingTop: 14, marginTop: 4 }}>
              <AssignmentRow
                label="Models"
                pool={modelPool}
                selectedIds={r.assigned_models || []}
                onRemove={requestRemoveModel}
                actionLabel="+ Select model"
                onAction={() => setModelPickerFor(r.id)}
              />
              {assignedModels.map((m) => (
                <ModelCard
                  key={m.id}
                  model={m}
                  onPatch={(payload) => patchModel(m.id, payload)}
                  onUploadRef={(file) => run(() => planModelPhotoService.upload(m.id, file, { category: 'COSTUME_COLOR_REF' }), 'Upload failed.')}
                  onRemoveRefPhoto={(photoId) => run(() => planModelPhotoService.remove(photoId), 'Could not remove photo.')}
                  onUploadCostume={(file) => run(() => planModelPhotoService.upload(m.id, file, { category: 'COSTUME' }), 'Upload failed.')}
                  onRemoveCostumePhoto={(photoId) => run(() => planModelPhotoService.remove(photoId), 'Could not remove photo.')}
                  onRequestRemove={() => requestRemoveModel(m)}
                />
              ))}

              <div className="rr-wizfield">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ marginBottom: 0 }}>
                    Locations — {assignedLocations.length ? assignedLocations.map((l) => l.name || 'New location').join(', ') : 'None assigned'}
                  </label>
                  <button type="button" onClick={() => createLocationFor(r)} style={{ border: 'none', background: 'none', color: '#0e0e0e', textDecoration: 'underline', fontSize: 12.5, cursor: 'pointer' }}>
                    + Create new location
                  </button>
                </div>
                {assignedLocations.length > 0 && (
                  <div className="rr-wiz-chips" style={{ marginTop: 6, marginBottom: assignedLocations.length ? 0 : 6 }}>
                    {assignedLocations.map((loc) => (
                      <span className="rr-wiz-chip" key={loc.id}>
                        <label>
                          <input type="checkbox" checked readOnly onClick={() => requestRemoveLocation(loc)} />
                          {loc.name || 'New location'}
                        </label>
                        <button type="button" onClick={() => requestRemoveLocation(loc)} style={{ border: 'none', background: 'none', color: 'rgba(0,0,0,.4)', cursor: 'pointer', fontSize: 12 }}>
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {assignedLocations.map((loc) => (
                <LocationCard
                  key={loc.id}
                  location={loc}
                  onPatch={(payload) => patchLocation(loc.id, payload)}
                  onUpload={(file) => run(() => planLocationPhotoService.upload(loc.id, file), 'Upload failed.')}
                  onRemovePhoto={(photoId) => run(() => planLocationPhotoService.remove(photoId), 'Could not remove photo.')}
                  onRequestRemove={() => requestRemoveLocation(loc)}
                />
              ))}

              <div className="rr-wizfield">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ marginBottom: 0 }}>
                    Props — {assignedProps.length ? assignedProps.map((p) => p.name || 'New prop').join(', ') : 'None assigned'}
                  </label>
                  <button type="button" onClick={() => createPropFor(r)} style={{ border: 'none', background: 'none', color: '#0e0e0e', textDecoration: 'underline', fontSize: 12.5, cursor: 'pointer' }}>
                    + Create new prop
                  </button>
                </div>
                {assignedProps.length > 0 && (
                  <div className="rr-wiz-chips" style={{ marginTop: 6 }}>
                    {assignedProps.map((p) => (
                      <span className="rr-wiz-chip" key={p.id}>
                        <label>
                          <input type="checkbox" checked readOnly onClick={() => requestRemoveProp(p)} />
                          {p.name || 'New prop'}
                        </label>
                        <button type="button" onClick={() => requestRemoveProp(p)} style={{ border: 'none', background: 'none', color: 'rgba(0,0,0,.4)', cursor: 'pointer', fontSize: 12 }}>
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {assignedProps.map((p) => (
                <PropCard
                  key={p.id}
                  prop={p}
                  onPatch={(payload) => patchProp(p.id, payload)}
                  onUpload={(file) => run(() => propPhotoService.upload(p.id, file), 'Upload failed.')}
                  onRemovePhoto={(photoId) => run(() => propPhotoService.remove(photoId), 'Could not remove photo.')}
                  onRequestRemove={() => requestRemoveProp(p)}
                />
              ))}

              <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.4)' }}>
                New entries are added to the shared People &amp; Models / Locations / Props lists.
              </div>
            </div>
          </RepeatingCard>
        );
      })}

      {modelPickerFor !== null && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={closeModelPicker}
        >
          <div
            style={{ background: '#fff', width: 460, maxWidth: '92vw', maxHeight: '80vh', overflowY: 'auto', borderRadius: 8, padding: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Select from Models directory</div>
              <button type="button" onClick={closeModelPicker} style={{ border: 'none', background: 'none', fontSize: 16, cursor: 'pointer' }}>
                ✕
              </button>
            </div>
            <input
              autoFocus
              value={modelQuery}
              onChange={(e) => setModelQuery(e.target.value)}
              placeholder="Search models…"
              style={{ width: '100%', border: '1px solid rgba(0,0,0,.15)', borderRadius: 6, padding: '9px 12px', fontSize: 13, marginBottom: 12, boxSizing: 'border-box' }}
            />
            {directoryModels
              .filter((m) => m.name.toLowerCase().includes(modelQuery.toLowerCase()))
              .map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    const reel = reels.find((r) => r.id === modelPickerFor);
                    if (reel) selectModel(reel, m);
                  }}
                  style={{ border: '1px solid rgba(0,0,0,.1)', borderRadius: 6, padding: '10px 12px', marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0e0e0e', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', overflow: 'hidden' }}>
                    {m.photo ? <img src={m.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(m.name)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,.5)' }}>
                      {m.age} · {m.gender_display} · {m.height_cm} cm · {(m.categories || []).join(', ')} · {money(m.cost_per_day)}/day
                    </div>
                  </div>
                </div>
              ))}
            {directoryModels.length === 0 && (
              <div style={{ padding: '10px 12px', fontSize: 12.5, color: 'rgba(0,0,0,.45)' }}>No models in the directory yet.</div>
            )}
          </div>
        </div>
      )}

      {confirmTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={cancelConfirm}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 22, width: 340 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Confirm action</div>
            <div style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', marginBottom: 14 }}>
              This entry has information and may be assigned elsewhere. Removing it will delete it everywhere it is used.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={cancelConfirm} style={{ border: '1px solid rgba(0,0,0,.2)', background: '#fff', borderRadius: 6, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="button" onClick={confirmRemove} style={{ border: 'none', background: '#ff615f', color: '#fff', borderRadius: 6, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
