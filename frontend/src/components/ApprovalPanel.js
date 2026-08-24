import React, { useState } from 'react';
import { formatDateTime } from '../utils/format';

// Same palette as ShootPlan's own APPROVAL_WORKFLOW status pills
// (StepReview.js) so "Approved" reads identically everywhere in the app --
// green background, dark green text.
const APPROVAL_META = {
  DRAFT: { label: 'Draft', bg: '#e9e8e4', fg: '#3a3a38' },
  PENDING_APPROVAL: { label: 'Pending Approval', bg: '#e6e0fb', fg: '#4b3ba6' },
  RETURNED_FOR_CHANGES: { label: 'Returned for Changes', bg: '#ffdadf', fg: '#b3213f' },
  APPROVED: { label: 'Approved', bg: '#d6f5e3', fg: '#177a4c' },
};

/**
 * Shared by StepReels.js and StepPhotos.js -- Submit -> Pending Approval ->
 * Approve / Return for Changes workflow for a single Reel or Photo/Shot.
 * Creators (all 6 roles) get Submit; only Admin/Production Head (isElevated)
 * get Approve/Return. Return opens a mandatory suggestions box before
 * anything is sent -- nothing here writes local-only state, every action
 * round-trips through the backend so it survives a refresh.
 *
 * `entity` needs: approval_status, suggestions, approved_by_name,
 * approved_at, returned_by_name, returned_at, approval_history.
 */
export default function ApprovalPanel({ entity, entityLabel = 'item', isElevated, onSubmit, onApprove, onReturn }) {
  const [returning, setReturning] = useState(false);
  const [suggestionsText, setSuggestionsText] = useState('');
  const [suggestionsError, setSuggestionsError] = useState('');
  const [busy, setBusy] = useState(false);

  const status = entity.approval_status || 'DRAFT';
  const meta = APPROVAL_META[status] || APPROVAL_META.DRAFT;
  const history = entity.approval_history || [];
  const canSubmit = status === 'DRAFT' || status === 'RETURNED_FOR_CHANGES';

  const withBusy = (fn) => async () => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const openReturn = () => {
    setReturning(true);
    setSuggestionsText('');
    setSuggestionsError('');
  };
  const cancelReturn = () => {
    setReturning(false);
    setSuggestionsText('');
    setSuggestionsError('');
  };
  const confirmReturn = async () => {
    if (!suggestionsText.trim()) {
      setSuggestionsError(`Please provide the changes required before returning this ${entityLabel} for changes.`);
      return;
    }
    setBusy(true);
    try {
      await onReturn(suggestionsText.trim());
      setReturning(false);
      setSuggestionsText('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rr-wizfield" style={{ border: '1px solid rgba(0,0,0,.1)', borderRadius: 6, padding: 12, marginBottom: 16, background: '#fafaf8' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span className="rr-status-select" style={{ background: meta.bg, color: meta.fg, cursor: 'default' }}>
          {meta.label.toUpperCase()}
        </span>

        <div style={{ display: 'flex', gap: 8 }}>
          {canSubmit && (
            <button type="button" className="rr-toggle-btn rr-toggle-btn--active" disabled={busy} onClick={withBusy(onSubmit)}>
              {busy ? 'Submitting…' : 'Submit'}
            </button>
          )}
          {isElevated && status === 'PENDING_APPROVAL' && !returning && (
            <>
              <button type="button" className="rr-toggle-btn rr-toggle-btn--active" disabled={busy} onClick={withBusy(onApprove)}>
                Approve
              </button>
              <button type="button" className="rr-toggle-btn" disabled={busy} onClick={openReturn}>
                Return for Changes
              </button>
            </>
          )}
          {!isElevated && status === 'PENDING_APPROVAL' && (
            <span style={{ fontSize: 12.5, color: 'rgba(0,0,0,.5)' }}>Awaiting Admin/Production Head review</span>
          )}
        </div>
      </div>

      {status === 'RETURNED_FOR_CHANGES' && entity.suggestions && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,.5)', marginBottom: 4 }}>Changes</div>
          <div style={{ fontSize: 13, background: '#fff4e8', border: '1px solid #f0c896', borderRadius: 5, padding: 10, whiteSpace: 'pre-wrap' }}>
            {entity.suggestions}
          </div>
          {entity.returned_by_name && (
            <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.45)', marginTop: 4 }}>
              Returned by {entity.returned_by_name}{entity.returned_at ? ` · ${formatDateTime(entity.returned_at)}` : ''}
            </div>
          )}
        </div>
      )}

      {status === 'APPROVED' && entity.approved_by_name && (
        <div style={{ marginTop: 8, fontSize: 12.5, color: 'rgba(0,0,0,.5)' }}>
          Approved by <b style={{ color: '#177a4c' }}>{entity.approved_by_name}</b>
          {entity.approved_at ? ` · ${formatDateTime(entity.approved_at)}` : ''}
        </div>
      )}

      {returning && (
        <div style={{ marginTop: 12, borderTop: '1px solid rgba(0,0,0,.08)', paddingTop: 12 }}>
          <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 6 }}>
            Changes Required <span className="rr-wiz-required">*</span>
          </label>
          <textarea
            rows={3}
            value={suggestionsText}
            onChange={(e) => {
              setSuggestionsText(e.target.value);
              if (suggestionsError) setSuggestionsError('');
            }}
            placeholder="Please enter what needs to be changed…"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
          {suggestionsError && <div style={{ color: '#b3213f', fontSize: 12, marginTop: 4 }}>{suggestionsError}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" className="rr-toggle-btn" disabled={busy} onClick={cancelReturn}>
              Cancel
            </button>
            <button type="button" className="rr-toggle-btn rr-toggle-btn--active" disabled={busy} onClick={confirmReturn}>
              {busy ? 'Returning…' : 'Return for Changes'}
            </button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div style={{ marginTop: 12, borderTop: '1px solid rgba(0,0,0,.08)', paddingTop: 10 }}>
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,.5)', marginBottom: 6 }}>Approval History</div>
          {[...history].reverse().map((h) => (
            <div key={h.id} style={{ fontSize: 12, marginBottom: 6 }}>
              <b>{h.status_display}</b>
              {h.reviewer_name ? ` — ${h.reviewer_name}` : ''}
              {h.reviewed_at ? ` · ${formatDateTime(h.reviewed_at)}` : ''}
              {h.remarks && <div style={{ color: 'rgba(0,0,0,.6)', marginTop: 2 }}>"{h.remarks}"</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
