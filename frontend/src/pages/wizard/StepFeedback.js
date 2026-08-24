import React, { useState } from 'react';
import { ErrorAlert } from '../../components/EmptyState';
import { feedbackService, shootPlanService, extractApiError } from '../../api/services';
import { formatDateTime } from '../../utils/format';

export default function StepFeedback({ plan, onChanged, isElevated }) {
  const entries = plan?.feedback || [];

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [justSavedNew, setJustSavedNew] = useState(false);
  const [completing, setCompleting] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [justSavedId, setJustSavedId] = useState(null);

  const handleSave = async () => {
    if (!message.trim()) return;
    setSaving(true);
    setError('');
    try {
      await feedbackService.create({
        shoot_plan: plan.id,
        subject: `Feedback on ${plan.title}`,
        message,
      });
      setMessage('');
      setJustSavedNew(true);
      setTimeout(() => setJustSavedNew(false), 2500);
      onChanged();
    } catch (err) {
      setError(extractApiError(err, 'Could not save your feedback.'));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setEditText(entry.message);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleMarkCompleted = async () => {
    setCompleting(true);
    setError('');
    try {
      await shootPlanService.patch(plan.id, { status: 'SHOOT_COMPLETED' });
      onChanged();
    } catch (err) {
      setError(extractApiError(err, 'Could not mark this shoot as completed.'));
    } finally {
      setCompleting(false);
    }
  };

  const handleUpdate = async (id) => {
    if (!editText.trim()) return;
    setEditSaving(true);
    setError('');
    try {
      await feedbackService.patch(id, { message: editText });
      setEditingId(null);
      setJustSavedId(id);
      setTimeout(() => setJustSavedId(null), 2500);
      onChanged();
    } catch (err) {
      setError(extractApiError(err, 'Could not update this feedback.'));
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <>
      <div className="rr-wiz-step-title">Feedback</div>
      <ErrorAlert message={error} />

      <div className="rr-wizfield">
        <label>Share feedback on this shoot plan</label>
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Notes, concerns, or praise for this shoot plan…"
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          type="button"
          className="rr-toggle-btn rr-toggle-btn--active"
          disabled={saving || !message.trim()}
          onClick={handleSave}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {justSavedNew && <span style={{ fontSize: 12, fontWeight: 600, color: '#1fac71' }}>✓ Saved</span>}
      </div>

      {isElevated && plan?.status === 'APPROVED' && (
        <div style={{ marginBottom: 24 }}>
          <button
            type="button"
            className="rr-toggle-btn rr-toggle-btn--active"
            disabled={completing || entries.length === 0}
            title={entries.length === 0 ? 'Enter and save feedback before marking the shoot completed.' : undefined}
            onClick={handleMarkCompleted}
          >
            {completing ? 'Marking completed…' : 'Mark Shoot Completed'}
          </button>
          {entries.length === 0 && (
            <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.5)', marginTop: 6 }}>
              Save at least one piece of feedback to unlock this.
            </div>
          )}
        </div>
      )}
      {plan?.status === 'SHOOT_COMPLETED' && (
        <div style={{ fontSize: 12.5, color: '#1fac71', fontWeight: 600, marginBottom: 24 }}>
          ✓ Shoot marked completed
        </div>
      )}

      {entries.length === 0 ? (
        <div className="rr-wiz-empty">
          <div className="rr-wiz-empty__title">No feedback yet</div>
          <div className="rr-wiz-empty__text">Be the first to leave feedback on this shoot plan.</div>
        </div>
      ) : (
        <div className="rr-review-section">
          <div className="rr-review-section__title" style={{ marginBottom: 12 }}>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </div>
          {entries.map((entry) => (
            <div key={entry.id} className="rr-review-item">
              <div className="rr-review-section__head" style={{ marginBottom: 6 }}>
                <div className="rr-review-item__title" style={{ marginBottom: 0 }}>
                  {entry.author_name}
                </div>
                {editingId !== entry.id && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {justSavedId === entry.id && (
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#1fac71' }}>✓ Saved</span>
                    )}
                    {entry.can_edit && (
                      <button type="button" className="rr-review-edit" onClick={() => startEdit(entry)}>
                        Edit
                      </button>
                    )}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.45)', marginBottom: 8 }}>
                {formatDateTime(entry.created_at)}
              </div>
              {editingId === entry.id ? (
                <>
                  <textarea
                    rows={3}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button
                      type="button"
                      className="rr-toggle-btn rr-toggle-btn--active"
                      disabled={editSaving || !editText.trim()}
                      onClick={() => handleUpdate(entry.id)}
                    >
                      {editSaving ? 'Saving…' : 'Update'}
                    </button>
                    <button type="button" className="rr-toggle-btn" onClick={cancelEdit} disabled={editSaving}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{entry.message}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
