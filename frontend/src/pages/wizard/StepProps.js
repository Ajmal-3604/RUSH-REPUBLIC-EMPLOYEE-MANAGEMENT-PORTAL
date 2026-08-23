import React, { useState } from 'react';
import RepeatingCard from '../../components/RepeatingCard';
import PhotoUploadGrid from '../../components/PhotoUploadGrid';
import { ErrorAlert } from '../../components/EmptyState';
import { propService, propPhotoService, extractApiError } from '../../api/services';
import { PROP_SOURCE_OPTIONS, PROP_STATUS_OPTIONS } from '../../constants/wizardOptions';

const STATUS_COLORS = {
  NOT_SECURED: { background: '#e9e8e4', color: '#3a3a38' },
  SECURED: { background: '#d6f5e3', color: '#177a4c' },
};

export default function StepProps({ plan, onChanged }) {
  const [error, setError] = useState('');
  const props_ = plan?.props || [];

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
      () => propService.create({ shoot_plan: plan.id, name: `Prop ${props_.length + 1}`, order: props_.length }),
      'Could not add prop.'
    );
  const patch = (id, payload) => run(() => propService.patch(id, payload), 'Could not save changes.');
  const remove = (id) => run(() => propService.remove(id), 'Could not remove prop.');
  const move = (id, dir) => {
    const idx = props_.findIndex((p) => p.id === id);
    const swapWith = props_[idx + dir];
    if (!swapWith) return;
    run(
      () =>
        Promise.all([
          propService.patch(id, { order: swapWith.order }),
          propService.patch(swapWith.id, { order: props_[idx].order }),
        ]),
      'Could not reorder.'
    );
  };
  const duplicate = (p) =>
    run(
      () =>
        propService.create({
          shoot_plan: plan.id,
          name: `${p.name} (copy)`,
          quantity: p.quantity,
          source: p.source,
          unit_cost: p.unit_cost,
          notes: p.notes,
          order: props_.length,
        }),
      'Could not duplicate.'
    );

  return (
    <>
      <div className="rr-wiz-step-title">Props</div>
      <ErrorAlert message={error} />

      <div className="rr-stepbar">
        <span className="rr-stepbar__count">{props_.length} prop(s) listed</span>
        <button type="button" className="rr-toggle-btn rr-toggle-btn--active" onClick={add}>
          + Add Prop
        </button>
      </div>

      {props_.length === 0 && (
        <div className="rr-wiz-empty">
          <div className="rr-wiz-empty__title">No props listed yet</div>
          <div className="rr-wiz-empty__text">Track what needs sourcing and its status.</div>
          <button type="button" className="rr-toggle-btn rr-toggle-btn--active" onClick={add}>
            + Add Prop
          </button>
        </div>
      )}

      {props_.map((p, idx) => (
        <RepeatingCard
          key={p.id}
          title={`Prop ${idx + 1}${p.name ? ` — ${p.name}` : ''}`}
          complete={!!p.name}
          summary={`${p.name || 'Unnamed'} · Qty ${p.quantity}`}
          isFirst={idx === 0}
          isLast={idx === props_.length - 1}
          onMoveUp={() => move(p.id, -1)}
          onMoveDown={() => move(p.id, 1)}
          onDuplicate={() => duplicate(p)}
          onRemove={() => remove(p.id)}
          headerExtra={
            <select
              className="rr-status-select"
              value={p.status}
              onChange={(e) => patch(p.id, { status: e.target.value })}
              style={STATUS_COLORS[p.status]}
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
              <input defaultValue={p.name} onBlur={(e) => patch(p.id, { name: e.target.value })} placeholder="e.g. Woven picnic basket" />
            </div>
            <div className="rr-wizfield">
              <label>
                Quantity <span className="rr-wiz-required">*</span>
              </label>
              <input type="number" min={1} defaultValue={p.quantity} onBlur={(e) => patch(p.id, { quantity: e.target.value })} />
            </div>
            <div className="rr-wizfield">
              <label>Source</label>
              <select defaultValue={p.source} onBlur={(e) => patch(p.id, { source: e.target.value })}>
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
            <input type="number" step="0.01" defaultValue={p.unit_cost} onBlur={(e) => patch(p.id, { unit_cost: e.target.value })} />
          </div>
          <div className="rr-wizfield">
            <label>Notes</label>
            <textarea rows={2} defaultValue={p.notes} onBlur={(e) => patch(p.id, { notes: e.target.value })} placeholder="Condition, color, backup options…" />
          </div>
          <PhotoUploadGrid
            label="Reference photos"
            photos={p.photos || []}
            onUpload={(file) => run(() => propPhotoService.upload(p.id, file), 'Upload failed.')}
            onRemove={(photoId) => run(() => propPhotoService.remove(photoId), 'Could not remove photo.')}
          />
        </RepeatingCard>
      ))}
    </>
  );
}
