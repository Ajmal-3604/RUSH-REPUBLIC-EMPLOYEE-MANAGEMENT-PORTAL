import React, { useEffect, useState } from 'react';
import RepeatingCard from '../../components/RepeatingCard';
import PhotoUploadGrid from '../../components/PhotoUploadGrid';
import { ErrorAlert } from '../../components/EmptyState';
import ApprovalPanel from '../../components/ApprovalPanel';
import { useToast } from '../../context/ToastContext';
import {
  photoService,
  photoBriefImageService,
  photoReferenceLinkService,
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
import { PERMIT_STATUS_OPTIONS, PROP_SOURCE_OPTIONS, PROP_STATUS_OPTIONS } from '../../constants/wizardOptions';

const PHOTO_BRIEF_CATEGORIES = [
  { value: 'MOODBOARD', label: 'Moodboard / shot references (9:16)', aspect: 'portrait', hint: 'Drag & drop portrait frames, or click to browse' },
];

const PROP_STATUS_COLORS = {
  NOT_SECURED: { background: '#e9e8e4', color: '#3a3a38' },
  SECURED: { background: '#d6f5e3', color: '#177a4c' },
};

// Grows a textarea to fit its content instead of scrolling inside a fixed
// height -- called on mount (via ref, for existing long content) and on
// every keystroke/paste/delete (via onInput) so it never lags behind.
function autoResize(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

// Unsaved "+ Add Link" rows need a stable id of their own -- keying them by
// array index would make React reuse/reset the wrong <input> whenever a
// *different* pending row (not the last one) gets filled in and removed.
let pendingLinkSeq = 0;

function ReferenceLinksBlock({ links, onAdd, onUpdate, onRemove }) {
  const [pendingRows, setPendingRows] = useState([]);

  const addPendingRow = () => {
    pendingLinkSeq += 1;
    setPendingRows((rows) => [...rows, { localId: pendingLinkSeq }]);
  };
  const removePendingRow = (localId) => setPendingRows((rows) => rows.filter((r) => r.localId !== localId));

  const rows = [
    ...links.map((l) => ({ key: `saved-${l.id}`, id: l.id, url: l.url })),
    ...pendingRows.map((r) => ({ key: `pending-${r.localId}`, id: null, url: '', localId: r.localId })),
  ];

  const handleBlur = (row, value) => {
    const trimmed = value.trim();
    if (row.id) {
      if (trimmed && trimmed !== row.url) onUpdate(row.id, trimmed);
    } else if (trimmed) {
      onAdd(trimmed);
      removePendingRow(row.localId);
    }
  };

  const handleRemove = (row) => {
    if (row.id) onRemove(row.id);
    else removePendingRow(row.localId);
  };

  return (
    <div className="rr-wizfield">
      <label>Reference Links</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.length === 0 && (
          <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.4)' }}>No reference links added yet.</div>
        )}
        {rows.map((row, idx) => (
          <div key={row.key}>
            <label style={{ fontSize: 11, color: 'rgba(0,0,0,.5)', display: 'block', marginBottom: 4 }}>
              Link {idx + 1}
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                defaultValue={row.url}
                placeholder="Paste reference link here"
                onBlur={(e) => handleBlur(row, e.target.value)}
                style={{ flex: '1 1 200px', minWidth: 0 }}
              />
              {row.url && (
                <a
                  href={row.url}
                  target="_blank"
                  rel="noreferrer"
                  title="Open link"
                  style={{ fontSize: 13, color: 'rgba(0,0,0,.5)', flex: 'none' }}
                >
                  ↗
                </a>
              )}
              <button
                type="button"
                onClick={() => handleRemove(row)}
                aria-label={`Remove Link ${idx + 1}`}
                style={{ border: 'none', background: 'none', color: 'rgba(0,0,0,.4)', cursor: 'pointer', fontSize: 13, flex: 'none' }}
              >
                ✕ Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="rr-toggle-btn" style={{ marginTop: 12 }} onClick={addPendingRow}>
        + Add Link
      </button>
    </div>
  );
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
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="rr-wizfield" style={{ width: 140, marginBottom: 0 }}>
            <label>Agreed time in</label>
            <input type="time" defaultValue={model.time_in || ''} onBlur={(e) => onPatch({ time_in: e.target.value || null })} />
          </div>
          <div className="rr-wizfield" style={{ width: 140, marginBottom: 0 }}>
            <label>Agreed time out</label>
            <input type="time" defaultValue={model.time_out || ''} onBlur={(e) => onPatch({ time_out: e.target.value || null })} />
          </div>
        </div>
      </div>

      <div className="rr-wizgrid-2">
        <PhotoUploadGrid label="Costume reference images" hint="Add costume reference" photos={refPhotos} onUpload={onUploadRef} onRemove={onRemoveRefPhoto} />
        <PhotoUploadGrid label="Model costume images" hint="Add costume photos" photos={costumePhotos} onUpload={onUploadCostume} onRemove={onRemoveCostumePhoto} />
      </div>
    </RepeatingCard>
  );
}

export default function StepPhotos({ plan, onChanged, isElevated }) {
  const [error, setError] = useState('');
  const [directoryModels, setDirectoryModels] = useState([]);
  const [modelPickerFor, setModelPickerFor] = useState(null);
  const [modelQuery, setModelQuery] = useState('');
  const [confirmTarget, setConfirmTarget] = useState(null);
  const { showToast } = useToast();
  const briefs = plan?.photos || [];
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
      () => photoService.create({ shoot_plan: plan.id, order: briefs.length }),
      'Could not add shot.'
    );
  const patch = (id, payload) => run(() => photoService.patch(id, payload), 'Could not save changes.');
  const addReferenceLink = (photoId, url) =>
    run(() => photoReferenceLinkService.create({ photo: photoId, url }), 'Could not add reference link.');
  const updateReferenceLink = (linkId, url) =>
    run(() => photoReferenceLinkService.patch(linkId, { url }), 'Could not update reference link.');
  const removeReferenceLink = (linkId) =>
    run(() => photoReferenceLinkService.remove(linkId), 'Could not remove reference link.');
  const remove = (id) => run(() => photoService.remove(id), 'Could not remove shot.');
  const submitShot = (id, wasReturned) =>
    run(
      () => photoService.submit(id),
      'Could not submit this shot for approval.',
      wasReturned ? 'Shot resubmitted successfully for approval.' : 'Shot submitted successfully for approval.'
    );
  const approveShot = (id) =>
    run(() => photoService.approve(id), 'Could not approve this shot.', 'Shot approved successfully.');
  const returnShot = (id, suggestions) =>
    run(
      () => photoService.returnForChanges(id, suggestions),
      'Could not return this shot for changes.',
      'Shot returned for changes.'
    );
  const move = (id, dir) => {
    const idx = briefs.findIndex((p) => p.id === id);
    const swapWith = briefs[idx + dir];
    if (!swapWith) return;
    run(
      () =>
        Promise.all([
          photoService.patch(id, { order: swapWith.order }),
          photoService.patch(swapWith.id, { order: briefs[idx].order }),
        ]),
      'Could not reorder.'
    );
  };
  const duplicate = (p) =>
    run(
      () =>
        photoService.create({
          shoot_plan: plan.id,
          title: `${p.title} (copy)`,
          description: p.description,
          quantity: p.quantity,
          notes_to_designer: p.notes_to_designer,
          shot_type: p.shot_type,
          order: briefs.length,
        }),
      'Could not duplicate.'
    );

  const assign = (brief, field, id) => {
    const current = brief[field] || [];
    if (current.includes(id)) return;
    patch(brief.id, { [field]: [...current, id] });
  };

  const closeModelPicker = () => {
    setModelPickerFor(null);
    setModelQuery('');
  };

  const selectModel = async (brief, dirModel) => {
    closeModelPicker();
    const existing = modelPool.find((m) => m.name === dirModel.name);
    if (existing) {
      assign(brief, 'assigned_models', existing.id);
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
      await patch(brief.id, { assigned_models: [...(brief.assigned_models || []), created.id] });
    } catch (err) {
      setError(extractApiError(err, 'Could not add model.'));
    }
  };
  const createLocationFor = (brief) =>
    run(async () => {
      const created = await planLocationService.create({
        shoot_plan: plan.id,
        name: 'New location',
        order: locationPool.length,
      });
      await photoService.patch(brief.id, { assigned_locations: [...(brief.assigned_locations || []), created.id] });
    }, 'Could not create location.');

  const createPropFor = (brief) =>
    run(async () => {
      const created = await propService.create({
        shoot_plan: plan.id,
        name: 'New prop',
        order: propPool.length,
      });
      await photoService.patch(brief.id, { assigned_props: [...(brief.assigned_props || []), created.id] });
    }, 'Could not create prop.');

  const patchLocation = (id, payload) => run(() => planLocationService.patch(id, payload), 'Could not save changes.');
  const patchProp = (id, payload) => run(() => propService.patch(id, payload), 'Could not save changes.');
  const patchModel = (id, payload) => run(() => planModelService.patch(id, payload), 'Could not save changes.');

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
      <div className="rr-wiz-step-title">Photos</div>
      <ErrorAlert message={error} />

      <div className="rr-stepbar">
        <span className="rr-stepbar__count">{briefs.length} shot(s) briefed</span>
        <button type="button" className="rr-toggle-btn rr-toggle-btn--active" onClick={add}>
          + Add Shot
        </button>
      </div>

      {briefs.length === 0 && (
        <div className="rr-wiz-empty">
          <div className="rr-wiz-empty__title">No shots briefed yet</div>
          <div className="rr-wiz-empty__text">List the still shots needed and any references.</div>
          <button type="button" className="rr-toggle-btn rr-toggle-btn--active" onClick={add}>
            + Add Shot
          </button>
        </div>
      )}

      {briefs.map((p, idx) => {
        const assignedLocations = locationPool.filter((l) => (p.assigned_locations || []).includes(l.id));
        const assignedProps = propPool.filter((pr) => (p.assigned_props || []).includes(pr.id));
        const assignedModels = modelPool.filter((m) => (p.assigned_models || []).includes(m.id));
        return (
          <RepeatingCard
            key={p.id}
            title={`Shot ${idx + 1}${p.title ? ` — ${p.title}` : ''}`}
            complete={!!p.description}
            summary={`${p.description || p.title || 'Untitled'} · ${p.approval_status_display || 'Draft'}`}
            isFirst={idx === 0}
            isLast={idx === briefs.length - 1}
            onMoveUp={() => move(p.id, -1)}
            onMoveDown={() => move(p.id, 1)}
            onDuplicate={() => duplicate(p)}
            onRemove={() => remove(p.id)}
          >
            <ApprovalPanel
              entity={p}
              entityLabel="Shot"
              isElevated={isElevated}
              onSubmit={() => submitShot(p.id, p.approval_status === 'RETURNED_FOR_CHANGES')}
              onApprove={() => approveShot(p.id)}
              onReturn={(suggestions) => returnShot(p.id, suggestions)}
            />
            <div className="rr-wizfield">
              <label>
                Shot description <span className="rr-wiz-required">*</span>
              </label>
              <textarea
                ref={autoResize}
                rows={2}
                defaultValue={p.description}
                onInput={(e) => autoResize(e.target)}
                onBlur={(e) => patch(p.id, { description: e.target.value })}
                placeholder="e.g. Wide hero shot of villa exterior at golden hour"
                style={{ overflow: 'hidden', resize: 'none' }}
              />
            </div>
            <div className="rr-wizfield">
              <label>Number of Photos</label>
              <input type="number" min={1} defaultValue={p.quantity} onBlur={(e) => patch(p.id, { quantity: e.target.value })} placeholder="e.g. 6" />
            </div>
            <div className="rr-wizfield">
              <label>Notes to Designer</label>
              <textarea
                ref={autoResize}
                rows={2}
                defaultValue={p.notes_to_designer}
                onInput={(e) => autoResize(e.target)}
                onBlur={(e) => patch(p.id, { notes_to_designer: e.target.value })}
                placeholder="Styling, angle, props in frame…"
                style={{ overflow: 'hidden', resize: 'none' }}
              />
            </div>

            <ReferenceLinksBlock
              links={p.reference_links || []}
              onAdd={(url) => addReferenceLink(p.id, url)}
              onUpdate={updateReferenceLink}
              onRemove={removeReferenceLink}
            />

            {PHOTO_BRIEF_CATEGORIES.map((cat) => (
              <PhotoUploadGrid
                key={cat.value}
                label={cat.label}
                aspect={cat.aspect}
                hint={cat.hint}
                photos={(p.photos || []).filter((ph) => ph.category === cat.value)}
                onUpload={(file) => run(() => photoBriefImageService.upload(p.id, file, { category: cat.value }), 'Upload failed.')}
                onRemove={(photoId) => run(() => photoBriefImageService.remove(photoId), 'Could not remove photo.')}
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
                selectedIds={p.assigned_models || []}
                onRemove={requestRemoveModel}
                actionLabel="+ Select model"
                onAction={() => setModelPickerFor(p.id)}
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
                  <button type="button" onClick={() => createLocationFor(p)} style={{ border: 'none', background: 'none', color: '#0e0e0e', textDecoration: 'underline', fontSize: 12.5, cursor: 'pointer' }}>
                    + Create new location
                  </button>
                </div>
                {assignedLocations.length > 0 && (
                  <div className="rr-wiz-chips" style={{ marginTop: 6 }}>
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
                    Props — {assignedProps.length ? assignedProps.map((pr) => pr.name || 'New prop').join(', ') : 'None assigned'}
                  </label>
                  <button type="button" onClick={() => createPropFor(p)} style={{ border: 'none', background: 'none', color: '#0e0e0e', textDecoration: 'underline', fontSize: 12.5, cursor: 'pointer' }}>
                    + Create new prop
                  </button>
                </div>
                {assignedProps.length > 0 && (
                  <div className="rr-wiz-chips" style={{ marginTop: 6 }}>
                    {assignedProps.map((pr) => (
                      <span className="rr-wiz-chip" key={pr.id}>
                        <label>
                          <input type="checkbox" checked readOnly onClick={() => requestRemoveProp(pr)} />
                          {pr.name || 'New prop'}
                        </label>
                        <button type="button" onClick={() => requestRemoveProp(pr)} style={{ border: 'none', background: 'none', color: 'rgba(0,0,0,.4)', cursor: 'pointer', fontSize: 12 }}>
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {assignedProps.map((pr) => (
                <PropCard
                  key={pr.id}
                  prop={pr}
                  onPatch={(payload) => patchProp(pr.id, payload)}
                  onUpload={(file) => run(() => propPhotoService.upload(pr.id, file), 'Upload failed.')}
                  onRemovePhoto={(photoId) => run(() => propPhotoService.remove(photoId), 'Could not remove photo.')}
                  onRequestRemove={() => requestRemoveProp(pr)}
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
                    const brief = briefs.find((b) => b.id === modelPickerFor);
                    if (brief) selectModel(brief, m);
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
