import React, { useState } from 'react';
import { ErrorAlert } from '../../components/EmptyState';
import { shootPlanService, reviewService, extractApiError } from '../../api/services';
import { money, formatActivityTime, formatTime } from '../../utils/format';
import { ShootDetailsSection, ReelsSection, PhotosSection, NoteBlock, PrintBrandHeader } from './PrintableSections';
import { printWithBranding } from '../../utils/printUtils';

const STATUS_META = {
  DRAFT: { label: 'Draft', bg: '#e9e8e4', fg: '#3a3a38' },
  PRODUCTION_REVIEW: { label: 'Production Review', bg: '#e6e0fb', fg: '#4b3ba6' },
  ON_HOLD: { label: 'On Hold', bg: '#ffd9d6', fg: '#a3372f' },
  RETURNED_FOR_CHANGES: { label: 'Returned for Changes', bg: '#ffdadf', fg: '#b3213f' },
  CREATIVE_REVIEW: { label: 'Creative Review', bg: '#fdead0', fg: '#93591a' },
  APPROVED: { label: 'Approved', bg: '#d6f5e3', fg: '#177a4c' },
  SHOOT_COMPLETED: { label: 'Shoot Completed', bg: '#0e0e0e', fg: '#f3f2ef' },
  ARCHIVED: { label: 'Archived', bg: '#eeeeee', fg: '#7a7a76' },
};

// Primary forward action + what's next, per status. Secondary branches
// (hold / return for changes) stay as smaller links next to it.
const PRIMARY_ACTION = {
  DRAFT: { next: 'Awaiting submission', label: 'Submit for Internal Approval', to: 'PRODUCTION_REVIEW' },
  RETURNED_FOR_CHANGES: { next: 'Awaiting resubmission', label: 'Resubmit for Internal Approval', to: 'PRODUCTION_REVIEW' },
  PRODUCTION_REVIEW: { next: 'Awaiting Production Head approval', label: 'Approve', to: 'CREATIVE_REVIEW' },
  CREATIVE_REVIEW: { next: 'Awaiting final approval', label: 'Final Approve', to: 'APPROVED' },
  ON_HOLD: { next: 'Paused — resume when ready', label: 'Resume Review', to: 'PRODUCTION_REVIEW' },
  APPROVED: { next: 'Ready to shoot', label: 'Mark Shoot Completed', to: 'SHOOT_COMPLETED' },
  SHOOT_COMPLETED: { next: 'Ready to archive', label: 'Archive', to: 'ARCHIVED' },
  ARCHIVED: { next: 'No further action', label: null, to: null },
};

function ThumbGroup({ label, images }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'rgba(0,0,0,.5)', marginBottom: 4 }}>{label}</div>
      {images.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.4)' }}>None</div>
      ) : (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {images.map((img) => (
            <img
              key={img.id}
              src={img.image}
              alt=""
              style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(0,0,0,.1)' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function StepReview({ plan, onChanged, goToStep, isElevated, onDeletePlan }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reels = plan?.reels || [];
  const photoBriefs = plan?.photos || [];
  const reelsAndPhotos = [...reels, ...photoBriefs];
  // Only models/locations/props actually cast in a Reel or Photo belong here
  // -- the raw pools can include rows nobody has assigned to a shot yet.
  const assignedModelIds = new Set(reelsAndPhotos.flatMap((r) => r.assigned_models || []));
  const assignedLocationIds = new Set(reelsAndPhotos.flatMap((r) => r.assigned_locations || []));
  const assignedPropIds = new Set(reelsAndPhotos.flatMap((r) => r.assigned_props || []));
  const models = (plan?.plan_models || []).filter((m) => assignedModelIds.has(m.id));
  const locations = (plan?.plan_locations || []).filter((l) => assignedLocationIds.has(l.id));
  const propsList = (plan?.props || []).filter((p) => assignedPropIds.has(p.id));

  // Storyboard frames live on whichever Reels this model is cast in; moodboard
  // images live on whichever Photo briefs it's cast in -- neither is stored
  // on the model itself, so they're gathered from every reel/brief that
  // actually assigns this model.
  const modelStoryboardImages = (modelId) =>
    reels
      .filter((r) => (r.assigned_models || []).includes(modelId))
      .flatMap((r) => (r.photos || []).filter((p) => p.category === 'STORYBOARD'));

  const modelMoodboardImages = (modelId) =>
    photoBriefs
      .filter((p) => (p.assigned_models || []).includes(modelId))
      .flatMap((p) => (p.photos || []).filter((ph) => ph.category === 'MOODBOARD'));

  const propUsageText = (id) => {
    const reelCount = reels.filter((r) => (r.assigned_props || []).includes(id)).length;
    const photoCount = photoBriefs.filter((p) => (p.assigned_props || []).includes(id)).length;
    return `${reelCount} reel(s), ${photoCount} photo concept(s)`;
  };
  const crew = plan?.crew || [];
  const activityLog = plan?.activity_log || [];

  const propsTotal = propsList.reduce((s, p) => s + Number(p.unit_cost || 0) * Number(p.quantity || 0), 0);
  const foodTotal = crew.filter((c) => c.meal_included).reduce((s, c) => s + Number(c.meal_cost || 0) * Number(c.meals_count || 0), 0);
  const travelTotal = (plan?.travel_expenses || []).reduce((s, t) => s + Number(t.cost || 0), 0);
  const locationTotal = locations.reduce((s, l) => s + Number(l.budget_cost || 0), 0);
  const grandTotal = propsTotal + foodTotal + travelTotal + locationTotal;

  const checklist = [
    { label: 'Shoot details complete', done: !!(plan?.title && plan?.shoot_date) },
    { label: 'Team assigned', done: !!(plan?.brand_client_servicing || plan?.brand_social_media_specialist) },
    { label: 'Models confirmed', done: models.length > 0 && models.every((m) => m.approval_status === 'APPROVED') },
    { label: 'Locations approved', done: locations.length > 0 && locations.every((l) => l.approval_status === 'APPROVED') },
    { label: 'Reel briefs complete', done: reels.length > 0 },
    { label: 'Photo briefs complete', done: photoBriefs.length > 0 },
    { label: 'Props secured', done: propsList.length > 0 && propsList.every((p) => p.status === 'SECURED') },
    { label: 'Client notified', done: !!plan?.client_notified },
  ];

  const warnings = [];
  if (!models.length || models.some((m) => !m.name || !m.phone)) {
    warnings.push({ text: 'Add at least one model with name and phone.', onClick: () => goToStep('reels') });
  }
  if (crew.length === 0) {
    warnings.push({ text: 'No shoot crew added — sync or add crew members.', onClick: () => goToStep('crew') });
  }
  if (reels.length === 0 && photoBriefs.length === 0) {
    warnings.push({ text: 'Add at least one reel or photo brief.', onClick: () => goToStep('reels') });
  }
  if (!plan?.client_notified) {
    warnings.push({ text: 'Confirm the client has been notified about shoot and timings.', onClick: () => goToStep('details') });
  }

  const transition = async (nextStatus, remarks) => {
    setBusy(true);
    setError('');
    try {
      await shootPlanService.patch(plan.id, { status: nextStatus });
      if (remarks) {
        await reviewService.create({ shoot_plan: plan.id, status: nextStatus === 'APPROVED' ? 'APPROVED' : 'PENDING', remarks });
      }
      onChanged();
    } catch (err) {
      setError(extractApiError(err, 'Could not update status.'));
    } finally {
      setBusy(false);
    }
  };

  const meta = STATUS_META[plan?.status] || STATUS_META.DRAFT;
  const primary = PRIMARY_ACTION[plan?.status] || PRIMARY_ACTION.DRAFT;

  const renderWorkflowActions = () => {
    if (!isElevated || !primary.label) return null;
    const canHoldOrReturn = plan?.status === 'PRODUCTION_REVIEW' || plan?.status === 'CREATIVE_REVIEW';
    return (
      <div className="rr-approval-actions" style={{ marginTop: 14 }}>
        <button className="approve" disabled={busy} onClick={() => transition(primary.to)}>
          {primary.label}
        </button>
        {canHoldOrReturn && (
          <>
            <button className="warn" disabled={busy} onClick={() => transition('ON_HOLD')}>
              Put on Hold
            </button>
            <button className="warn" disabled={busy} onClick={() => transition('RETURNED_FOR_CHANGES')}>
              Return for Changes
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <PrintBrandHeader />
      <div className="rr-wiz-step-title">Review &amp; Approval</div>
      <ErrorAlert message={error} />

      {warnings.length > 0 && (
        <div className="rr-print-hide" style={{ background: '#fde8cc', color: '#8a5a12', borderRadius: 6, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠ Before you submit</div>
          {warnings.map((w) => (
            <div key={w.text}>
              ·{' '}
              <button
                type="button"
                onClick={w.onClick}
                style={{ border: 'none', background: 'none', color: '#8a5a12', textDecoration: 'underline', cursor: 'pointer', font: 'inherit', padding: 0 }}
              >
                {w.text}
              </button>
            </div>
          ))}
        </div>
      )}

      <ShootDetailsSection plan={plan} />

      <div className="rr-review-section">
        <div className="rr-review-section__head">
          <div className="rr-review-section__title">Models ({models.length})</div>
          <button className="rr-review-edit" onClick={() => goToStep('reels')}>
            Edit
          </button>
        </div>
        {models.length === 0 && <div style={{ fontSize: 13, color: 'rgba(0,0,0,.5)' }}>No models added.</div>}
        {models.map((m, idx) => (
          <div key={m.id} className="rr-review-item">
            <div className="rr-review-item__title">Model {idx + 1} — {m.name}</div>
            <div className="rr-review-fields">
              <div>
                <span className="field-label">Agreed time in</span>
                <b>{m.time_in ? formatTime(m.time_in) : '—'}</b>
              </div>
              <div>
                <span className="field-label">Agreed time out</span>
                <b>{m.time_out ? formatTime(m.time_out) : '—'}</b>
              </div>
            </div>
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(0,0,0,.5)', marginBottom: 4 }}>Profile Picture</div>
                {m.directory_model_photo ? (
                  <img
                    src={m.directory_model_photo}
                    alt=""
                    style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(0,0,0,.1)' }}
                  />
                ) : (
                  <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.4)' }}>None</div>
                )}
              </div>
              <ThumbGroup label="Costume Photo" images={(m.photos || []).filter((p) => p.category === 'COSTUME')} />
              <ThumbGroup label="Moodboard" images={modelMoodboardImages(m.id)} />
              <ThumbGroup label="Storyboard" images={modelStoryboardImages(m.id)} />
            </div>
            <NoteBlock label="Notes" value={m.directory_model_notes} />
          </div>
        ))}
      </div>

      <div className="rr-review-section">
        <div className="rr-review-section__head">
          <div className="rr-review-section__title">Locations ({locations.length})</div>
          <button className="rr-review-edit" onClick={() => goToStep('reels')}>
            Edit
          </button>
        </div>
        {locations.length === 0 && <div style={{ fontSize: 13, color: 'rgba(0,0,0,.5)' }}>No locations added.</div>}
        {locations.map((l, idx) => (
          <div key={l.id} className="rr-review-item">
            <div className="rr-review-item__title">Location {idx + 1} — {l.name}</div>
            <div className="rr-review-fields">
              <div>
                <span className="field-label">Address</span>
                <b>{l.address || '—'}</b>
              </div>
              <div>
                <span className="field-label">Map URL</span>
                <b>{l.map_url || '—'}</b>
              </div>
              <div>
                <span className="field-label">Permit status</span>
                <b>{l.permit_status_display}</b>
              </div>
              <div>
                <span className="field-label">Contact</span>
                <b>{l.contact_name || l.contact_phone ? `${l.contact_name || '—'} · ${l.contact_phone || '—'}` : '—'}</b>
              </div>
              <div>
                <span className="field-label">Agreed time in</span>
                <b>{l.time_in ? formatTime(l.time_in) : '—'}</b>
              </div>
              <div>
                <span className="field-label">Agreed time out</span>
                <b>{l.time_out ? formatTime(l.time_out) : '—'}</b>
              </div>
            </div>
            <div style={{ marginTop: 6 }}>
              <span className="field-label">Photos</span>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {(l.photos || []).filter((ph) => ph.category === 'LOCATION').length} location photo(s),{' '}
                {(l.photos || []).filter((ph) => ph.category === 'BACKGROUND_REF').length} background ref(s)
              </div>
            </div>
            <NoteBlock label="Access notes" value={l.access_notes} />
          </div>
        ))}
      </div>

      <ReelsSection plan={plan} goToStep={goToStep} />

      <PhotosSection plan={plan} goToStep={goToStep} />

      <div className="rr-review-section">
        <div className="rr-review-section__head">
          <div className="rr-review-section__title">Props ({propsList.length})</div>
          <button className="rr-review-edit" onClick={() => goToStep('reels')}>
            Edit
          </button>
        </div>
        {propsList.length === 0 && <div style={{ fontSize: 13, color: 'rgba(0,0,0,.5)' }}>No props added.</div>}
        {propsList.map((p, idx) => (
          <div key={p.id} className="rr-review-item">
            <div className="rr-review-item__title">Prop {idx + 1} — {p.name}</div>
            <div className="rr-review-fields">
              <div>
                <span className="field-label">Quantity</span>
                <b>{p.quantity}</b>
              </div>
              <div>
                <span className="field-label">Source</span>
                <b>{p.source_display}</b>
              </div>
              <div>
                <span className="field-label">Status</span>
                <b>{p.status_display}</b>
              </div>
            </div>
            <div style={{ marginTop: 6 }}>
              <span className="field-label">Used in</span>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{propUsageText(p.id)}</div>
            </div>
            <NoteBlock label="Notes" value={p.notes} />
          </div>
        ))}
      </div>

      <div className="rr-review-section">
        <div className="rr-review-section__title" style={{ marginBottom: 12 }}>
          Completion Checklist
        </div>
        {checklist.map((c) => (
          <div className="rr-checklist-row" key={c.label}>
            <span style={{ color: c.done ? '#1fac71' : '#c9822b' }}>{c.done ? '✓' : '○'}</span>
            <span style={{ flex: 1 }}>{c.label}</span>
          </div>
        ))}
      </div>

      <div className="rr-review-section">
        <div className="rr-review-section__head">
          <div className="rr-review-section__title">Approval Workflow</div>
          <span className="rr-status-select" style={{ background: meta.bg, color: meta.fg, cursor: 'default' }}>
            {meta.label.toUpperCase()}
          </span>
        </div>
        <div style={{ fontSize: 13 }}>
          <div>
            Stage: <b>{meta.label}</b>
          </div>
          <div>
            Next: <b>{primary.next}</b>
          </div>
        </div>
        {renderWorkflowActions()}
        {!isElevated && (
          <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.45)', marginTop: 10 }}>
            🔒 Only Admin or Production Head can move this shoot plan's status.
          </div>
        )}
        {isElevated && onDeletePlan && (
          <div className="rr-print-hide" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,.08)' }}>
            <button type="button" className="rr-wiz__btn" onClick={onDeletePlan} style={{ color: '#b3213f', borderColor: 'rgba(179,33,63,.3)' }}>
              Delete shoot plan
            </button>
          </div>
        )}
      </div>

      <div className="rr-wizgrid-2" style={{ marginBottom: 20 }}>
        <div style={{ border: '1px solid rgba(0,0,0,.1)', borderRadius: 6, padding: 16 }}>
          <div className="rr-review-section__title" style={{ marginBottom: 10 }}>
            Shoot Crew Summary
          </div>
          <div className="rr-wizgrid-2" style={{ fontSize: 12.5 }}>
            <div>
              Total crew <b>{crew.length}</b>
            </div>
            <div>
              Unconfirmed <b>{crew.filter((c) => !c.call_time || !c.time_out).length}</b>
            </div>
            <div>
              Internal team <b>{crew.filter((c) => c.person_type === 'INTERNAL_TEAM').length}</b>
            </div>
            <div>
              Freelancers <b>{crew.filter((c) => c.person_type === 'FREELANCER').length}</b>
            </div>
            <div>
              Models <b>{crew.filter((c) => c.person_type === 'MODEL').length}</b>
            </div>
          </div>
        </div>
        <div style={{ border: '1px solid rgba(0,0,0,.1)', borderRadius: 6, padding: 16 }}>
          <div className="rr-review-section__title" style={{ marginBottom: 10 }}>
            Budget Summary
          </div>
          <div className="rr-wizgrid-2" style={{ fontSize: 12.5 }}>
            <div>
              Props <b>{money(propsTotal)}</b>
            </div>
            <div>
              Food <b>{money(foodTotal)}</b>
            </div>
            <div>
              Travel <b>{money(travelTotal)}</b>
            </div>
            <div>
              Grand total <b>{money(grandTotal)}</b>
            </div>
          </div>
        </div>
      </div>

      <div className="rr-review-section">
        <div className="rr-review-section__title" style={{ marginBottom: 12 }}>
          Activity Timeline
        </div>
        {activityLog.length === 0 && <div style={{ fontSize: 13, color: 'rgba(0,0,0,.5)' }}>No activity yet.</div>}
        {activityLog.map((a) => (
          <div key={a.id} style={{ padding: '9px 0', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{a.title}</div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,.5)' }}>
              {a.actor_name || 'System'} · {a.department_display || 'System'} · {formatActivityTime(a.created_at)}
            </div>
          </div>
        ))}
      </div>

      <div className="rr-print-hide" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" className="rr-toggle-btn" onClick={() => goToStep('details')}>
          Back to Edit
        </button>
        <button type="button" className="rr-toggle-btn" onClick={onChanged}>
          Save Draft
        </button>
        <button
          type="button"
          className="rr-toggle-btn"
          onClick={() => printWithBranding(plan?.title ? `${plan.title} — Review & Approval — Rush Republic` : 'Review & Approval — Rush Republic')}
        >
          Preview Printable Version
        </button>
        {isElevated && (
          <button
            type="button"
            className="rr-toggle-btn rr-toggle-btn--active"
            disabled={busy || warnings.length > 0 || !['DRAFT', 'RETURNED_FOR_CHANGES'].includes(plan?.status)}
            onClick={() => transition('PRODUCTION_REVIEW')}
          >
            Submit for Internal Approval
          </button>
        )}
      </div>
    </>
  );
}
