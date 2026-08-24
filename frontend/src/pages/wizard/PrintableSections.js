import React from 'react';
import { formatDate, formatTime } from '../../utils/format';
import logo from '../../assets/rush-republic-logo.png';

// Same palette as StepReels.js's REEL_APPROVAL_META / StepReview.js's
// approval-workflow pills -- "Approved" reads identically everywhere.
export const APPROVAL_BADGE_COLORS = {
  DRAFT: { background: '#e9e8e4', color: '#3a3a38' },
  PENDING_APPROVAL: { background: '#e6e0fb', color: '#4b3ba6' },
  RETURNED_FOR_CHANGES: { background: '#ffdadf', color: '#b3213f' },
  APPROVED: { background: '#d6f5e3', color: '#177a4c' },
};

/**
 * Read-only summary blocks shared between Review & Approval and Print
 * Details -- same data, same markup, same `rr-review-*` styling, so both
 * pages stay in lockstep with a single source of truth instead of two
 * copies of this JSX drifting apart.
 */

// Every free-text field shown across Review & Approval and Print Details
// (Script, Notes to editor, Photographer notes, Access notes, prop/model
// Notes, Notes to designer) renders through this so they all share one
// width/padding/border/font instead of drifting apart as separate inline
// styles.
export function NoteBlock({ label, value }) {
  if (!value) return null;
  return (
    <div className="rr-note-block">
      <div className="rr-note-block__label">{label}</div>
      <div className="rr-note-block__value">{value}</div>
    </div>
  );
}

// Invisible on screen -- only appears at the top of the actual printed /
// downloaded output (see the .rr-print-brand rules under @media print),
// so the on-screen wizard steps stay exactly as they are.
export function PrintBrandHeader() {
  return (
    <div className="rr-print-brand">
      <img src={logo} alt="Rush Republic" />
      <div className="rr-print-brand__name">RUSH REPUBLIC</div>
    </div>
  );
}

export function ShootDetailsSection({ plan }) {
  const crew = plan?.crew || [];
  const freelancerNames = crew.filter((c) => c.person_type === 'FREELANCER').map((c) => c.name).join(', ');

  return (
    <>
      <div className="rr-review-section">
        <div className="rr-review-section__title" style={{ marginBottom: 12 }}>
          Shoot Summary
        </div>
        <div className="rr-review-fields">
          <div>
            <span className="field-label">Title</span>
            <b>{plan?.title}</b>
          </div>
          <div>
            <span className="field-label">Brand</span>
            <b>{plan?.brand_name || plan?.client_name}</b>
          </div>
          <div>
            <span className="field-label">Date &amp; time</span>
            <b>
              {formatDate(plan?.shoot_date)}
              {plan?.call_time && plan?.wrap_time ? ` · ${formatTime(plan.call_time)}–${formatTime(plan.wrap_time)}` : ''}
            </b>
          </div>
        </div>
      </div>

      <div className="rr-review-section">
        <div className="rr-review-section__title" style={{ marginBottom: 12 }}>
          Assigned Team
        </div>
        <div className="rr-review-fields">
          <div>
            <span className="field-label">Freelancer</span>
            <b>{freelancerNames || '—'}</b>
          </div>
          <div>
            <span className="field-label">Social Media</span>
            <b>{plan?.brand_social_media_specialist || '—'}</b>
          </div>
          <div>
            <span className="field-label">Client Service</span>
            <b>{plan?.brand_client_servicing || '—'}</b>
          </div>
          <div>
            <span className="field-label">Scriptwriter</span>
            <b>{plan?.brand_script_writer || '—'}</b>
          </div>
          <div>
            <span className="field-label">Production Coordinator</span>
            <b>{plan?.brand_production_coordinator || '—'}</b>
          </div>
        </div>
      </div>
    </>
  );
}

export function ReelsSection({ plan, goToStep }) {
  const reels = plan?.reels || [];
  return (
    <div className="rr-review-section">
      <div className="rr-review-section__head">
        <div className="rr-review-section__title">Reels ({reels.length})</div>
        {goToStep && (
          <button className="rr-review-edit" onClick={() => goToStep('reels')}>
            Edit
          </button>
        )}
      </div>
      {reels.length === 0 && <div style={{ fontSize: 13, color: 'rgba(0,0,0,.5)' }}>No reels added.</div>}
      {reels.map((r, idx) => (
        <div key={r.id} className="rr-review-item">
          <div className="rr-review-item__title">
            Reel {idx + 1} — {r.title}{' '}
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 10,
                textTransform: 'uppercase',
                ...(APPROVAL_BADGE_COLORS[r.approval_status] || APPROVAL_BADGE_COLORS.DRAFT),
              }}
            >
              {r.approval_status_display || 'Draft'}
            </span>
          </div>
          <div className="rr-review-fields">
            <div>
              <span className="field-label">Reference link</span>
              <b>{r.reference_link || '—'}</b>
            </div>
            <div>
              <span className="field-label">Models</span>
              <b>{r.assigned_model_names?.length ? r.assigned_model_names.join(', ') : '—'}</b>
            </div>
            <div>
              <span className="field-label">Locations</span>
              <b>{r.assigned_location_names?.length ? r.assigned_location_names.join(', ') : '—'}</b>
            </div>
            <div>
              <span className="field-label">Props</span>
              <b>{r.assigned_prop_names?.length ? r.assigned_prop_names.join(', ') : '—'}</b>
            </div>
            <div>
              <span className="field-label">Storyboard frames</span>
              <b>{(r.photos || []).filter((ph) => ph.category === 'STORYBOARD').length}</b>
            </div>
          </div>
          <NoteBlock label="Script" value={r.concept} />
          <NoteBlock label="Notes to editor" value={r.notes} />
        </div>
      ))}
    </div>
  );
}

export function PhotosSection({ plan, goToStep }) {
  const photoBriefs = plan?.photos || [];
  return (
    <div className="rr-review-section">
      <div className="rr-review-section__head">
        <div className="rr-review-section__title">Photos ({photoBriefs.length})</div>
        {goToStep && (
          <button className="rr-review-edit" onClick={() => goToStep('photos')}>
            Edit
          </button>
        )}
      </div>
      {photoBriefs.length === 0 && <div style={{ fontSize: 13, color: 'rgba(0,0,0,.5)' }}>No photo briefs added.</div>}
      {photoBriefs.map((p, idx) => (
        <div key={p.id} className="rr-review-item">
          <div className="rr-review-item__title">
            Shot {idx + 1} — {p.description || p.title || 'Untitled'}{' '}
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 10,
                textTransform: 'uppercase',
                ...(APPROVAL_BADGE_COLORS[p.approval_status] || APPROVAL_BADGE_COLORS.DRAFT),
              }}
            >
              {p.approval_status_display || 'Draft'}
            </span>
          </div>
          <div className="rr-review-fields">
            <div>
              <span className="field-label">Number of Photos</span>
              <b>{p.quantity || '—'}</b>
            </div>
            <div>
              <span className="field-label">Models</span>
              <b>{p.assigned_model_names?.length ? p.assigned_model_names.join(', ') : '—'}</b>
            </div>
            <div>
              <span className="field-label">Locations</span>
              <b>{p.assigned_location_names?.length ? p.assigned_location_names.join(', ') : '—'}</b>
            </div>
            <div>
              <span className="field-label">Props</span>
              <b>{p.assigned_prop_names?.length ? p.assigned_prop_names.join(', ') : '—'}</b>
            </div>
            <div>
              <span className="field-label">Reference images</span>
              <b>{(p.photos || []).filter((ph) => ph.category === 'MOODBOARD').length}</b>
            </div>
          </div>
          {(p.reference_links || []).length > 0 && (
            <div style={{ marginTop: 6 }}>
              <span className="field-label">Reference Links</span>
              <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 13 }}>
                {p.reference_links.map((link) => (
                  <li key={link.id} style={{ wordBreak: 'break-all' }}>{link.url}</li>
                ))}
              </ul>
            </div>
          )}
          <NoteBlock label="Notes to designer" value={p.notes_to_designer} />
        </div>
      ))}
    </div>
  );
}
