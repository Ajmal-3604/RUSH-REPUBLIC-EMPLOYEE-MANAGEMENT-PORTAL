import React, { useCallback, useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal, { ConfirmDialog } from '../components/Modal';
import { Field, SelectField, TextAreaField } from '../components/FormFields';
import { ErrorAlert, LoadingState } from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { feedbackService, extractApiError, extractFieldErrors } from '../api/services';
import { FEEDBACK_CATEGORIES, FEEDBACK_STATUS } from '../constants/departments';
import { formatDateTime } from '../utils/format';

const EMPTY_FORM = {
  subject: '',
  message: '',
  category: 'GENERAL',
  rating: 5,
  status: 'OPEN',
  admin_response: '',
};

export default function Feedback() {
  const { isElevated } = useAuth();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    feedbackService
      .list(statusFilter === 'ALL' ? {} : { status: statusFilter })
      .then((data) => {
        setRows(Array.isArray(data) ? data : data.results || []);
        setError('');
      })
      .catch((err) => setError(extractApiError(err, 'Could not load feedback.')))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(load, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      subject: row.subject,
      message: row.message,
      category: row.category,
      rating: row.rating,
      status: row.status,
      admin_response: row.admin_response || '',
    });
    setFieldErrors({});
    setFormError('');
    setModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    setFieldErrors({});
    const payload = isElevated ? form : { ...form, admin_response: undefined, status: undefined };
    try {
      if (editing) {
        await feedbackService.patch(editing.id, payload);
      } else {
        await feedbackService.create(payload);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      const flattened = extractFieldErrors(err);
      if (Object.keys(flattened).length) {
        setFieldErrors(flattened);
        setFormError(flattened.non_field_errors || 'Please fix the errors below.');
      } else {
        setFormError(extractApiError(err, 'Could not save this feedback.'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await feedbackService.remove(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(extractApiError(err, 'Could not delete this feedback.'));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'subject', header: 'Subject' },
    { key: 'category_display', header: 'Category' },
    ...(isElevated ? [{ key: 'department_display', header: 'Department' }] : []),
    { key: 'author_name', header: 'By' },
    { key: 'rating', header: 'Rating', render: (r) => `${r.rating}/5` },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} label={r.status_display} /> },
    { key: 'shoot_plan_title', header: 'Shoot plan', render: (r) => r.shoot_plan_title || '—' },
    { key: 'created_at', header: 'Filed', render: (r) => formatDateTime(r.created_at) },
    {
      key: '__actions',
      header: '',
      align: 'right',
      render: (row) =>
        row.can_edit ? (
          <div className="rr-table__actions">
            <button type="button" className="rr-btn rr-btn--quiet rr-btn--sm" onClick={() => openEdit(row)}>
              Edit
            </button>
            <button type="button" className="rr-btn rr-btn--ghost rr-btn--sm" onClick={() => setDeleteTarget(row)}>
              Delete
            </button>
          </div>
        ) : (
          <span className="rr-table__muted">—</span>
        ),
    },
  ];

  return (
    <AppShell active="shoot-plans">
    <PageHeader
      eyebrow="All departments"
      title="Feedback"
      actions={
        <button type="button" className="rr-btn rr-btn--sm" onClick={openCreate}>
          + Add feedback
        </button>
      }
    >
      <ErrorAlert message={error} />

      <div className="rr-tabs">
        {['ALL', ...FEEDBACK_STATUS.map((s) => s.value)].map((value) => (
          <button
            key={value}
            type="button"
            className={`rr-tab${statusFilter === value ? ' rr-tab--active' : ''}`}
            onClick={() => setStatusFilter(value)}
          >
            {value === 'ALL' ? 'All' : FEEDBACK_STATUS.find((s) => s.value === value)?.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState label="Loading feedback" />
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          emptyTitle="No feedback yet"
          emptyText="Feedback filed by your department will show up here."
        />
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Edit feedback' : 'Add feedback'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="rr-btn rr-btn--ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="rr-feedback-form" className="rr-btn" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <form id="rr-feedback-form" onSubmit={handleSubmit} noValidate>
          {formError && <div className="rr-alert">{formError}</div>}
          <div className="rr-form-grid">
            <Field name="subject" label="Subject" value={form.subject} onChange={handleChange} error={fieldErrors.subject} required wide />
            <TextAreaField name="message" label="Message" value={form.message} onChange={handleChange} error={fieldErrors.message} />
            <SelectField name="category" label="Category" value={form.category} onChange={handleChange} options={FEEDBACK_CATEGORIES} error={fieldErrors.category} />
            <Field name="rating" label="Rating (1-5)" type="number" min={1} max={5} value={form.rating} onChange={handleChange} error={fieldErrors.rating} />
            <SelectField
              name="status"
              label="Status"
              value={form.status}
              onChange={handleChange}
              options={FEEDBACK_STATUS}
              error={fieldErrors.status}
              disabled={!isElevated}
              hint={!isElevated ? 'Only Admin can change status.' : undefined}
            />
            {isElevated && (
              <TextAreaField
                name="admin_response"
                label="Admin response"
                value={form.admin_response}
                onChange={handleChange}
                error={fieldErrors.admin_response}
              />
            )}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete feedback"
        message="This cannot be undone. Are you sure you want to delete this feedback entry?"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
        busy={deleting}
      />
    </PageHeader>
    </AppShell>
  );
}
