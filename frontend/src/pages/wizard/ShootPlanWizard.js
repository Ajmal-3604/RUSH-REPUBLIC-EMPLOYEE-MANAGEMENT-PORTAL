import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ErrorAlert, LoadingState } from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { shootPlanService, extractApiError, extractFieldErrors } from '../../api/services';
import { WIZARD_STEPS } from '../../constants/wizardOptions';
import { statusMeta } from '../../constants/statusMeta';
import { pruneEmpty, formatDate, formatClock } from '../../utils/format';

import StepShootDetails from './StepShootDetails';
import StepReels from './StepReels';
import StepPhotos from './StepPhotos';
import StepCrew from './StepCrew';
import StepBudget from './StepBudget';
import StepReview from './StepReview';
import StepPrintDetails from './StepPrintDetails';
import StepFeedback from './StepFeedback';

import './WizardShell.css';
import './Wizard.css';

const EMPTY_FORM = {
  title: '',
  client_name: '',
  brand: '',
  department: '',
  location: '',
  shoot_date: '',
  call_time: '',
  wrap_time: '',
  status: 'DRAFT',
  completion_percent: 0,
  brief: '',
  client_notified: false,
};

const NULLABLE_TIME_FIELDS = ['call_time', 'wrap_time', 'shoot_date'];

function stepComplete(key, plan) {
  if (!plan) return false;
  switch (key) {
    case 'details':
      return !!(plan.title && plan.shoot_date);
    case 'reels':
      return (plan.reels || []).length > 0;
    case 'photos':
      return (plan.photos || []).length > 0;
    case 'crew':
      return (plan.crew || []).length > 0;
    case 'budget':
      return (plan.budget_items || []).length > 0 || (plan.travel_expenses || []).length > 0;
    case 'feedback':
      return (plan.feedback || []).length > 0;
    default:
      return false;
  }
}

export default function ShootPlanWizard({ create = false }) {
  const { id } = useParams();
  const { user, isElevated, activeDepartment } = useAuth();
  const { showToast, showError } = useToast();
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [, setLoading] = useState(!create);
  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState('details');

  // No visible department picker in Shoot Details (the source design has no
  // department concept at all) -- silently stamp it from context instead:
  // the user's own department, or whichever department an elevated user is
  // currently previewing as.
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    department: (isElevated ? activeDepartment : user?.department) || '',
  }));
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  const load = useCallback(() => {
    if (create || !id) return;
    setLoading(true);
    shootPlanService
      .get(id)
      .then((data) => {
        setPlan(data);
        setForm({
          title: data.title,
          client_name: data.client_name,
          brand: data.brand || '',
          department: data.department,
          location: data.location,
          shoot_date: data.shoot_date || '',
          call_time: data.call_time || '',
          wrap_time: data.wrap_time || '',
          status: data.status,
          completion_percent: data.completion_percent,
          brief: data.brief,
          client_notified: data.client_notified,
        });
        setError('');
      })
      .catch((err) => setError(extractApiError(err, 'Could not load this shoot plan.')))
      .finally(() => setLoading(false));
  }, [create, id]);

  useEffect(load, [load]);

  // Autosave Step 1's own fields on change, debounced.
  useEffect(() => {
    if (create || !plan) return;
    const timer = setTimeout(() => {
      const payload = pruneEmpty(form, NULLABLE_TIME_FIELDS);
      setSaving(true);
      shootPlanService
        .patch(plan.id, payload)
        .then(() => setLastSaved(new Date()))
        .catch((err) => {
          const flattened = extractFieldErrors(err);
          setFieldErrors(flattened);
        })
        .finally(() => setSaving(false));
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const handleCreate = async () => {
    setSaving(true);
    setFieldErrors({});
    try {
      const payload = pruneEmpty(form, NULLABLE_TIME_FIELDS);
      const created = await shootPlanService.create(payload);
      showToast('Shoot plan created');
      navigate(`/shoot-plans/${created.id}`, { replace: true });
    } catch (err) {
      // Always surface a toast, even when a field error also gets set below --
      // not every field this API can reject (e.g. client_name, which has no
      // input of its own until a Brand is picked) has an inline error slot in
      // the form, so relying on fieldErrors alone can fail completely silently.
      showError(extractApiError(err, 'Could not create this shoot plan.'));
      setFieldErrors(extractFieldErrors(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      const payload = pruneEmpty(form, NULLABLE_TIME_FIELDS);
      await shootPlanService.patch(plan.id, payload);
      setLastSaved(new Date());
      showToast('Draft saved');
    } catch (err) {
      showError(extractApiError(err, 'Could not save draft.'));
      setFieldErrors(extractFieldErrors(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!window.confirm('Delete this shoot plan and everything in it? This cannot be undone.')) return;
    try {
      await shootPlanService.remove(plan.id);
      showToast('Shoot plan deleted');
      navigate('/shoot-plans', { replace: true });
    } catch (err) {
      showError(extractApiError(err, 'Could not delete this shoot plan.'));
    }
  };

  const trackedSteps = useMemo(
    () => WIZARD_STEPS.filter((s) => s.key !== 'review' && s.key !== 'print' && s.key !== 'feedback'),
    []
  );

  const progressPercent = useMemo(() => {
    if (!plan) return 0;
    // Review and Feedback are meta-steps, not planning deliverables -- they
    // don't count toward "how much of this plan is filled out".
    const done = trackedSteps.filter((s) => stepComplete(s.key, plan)).length;
    return Math.round((done / trackedSteps.length) * 100);
  }, [plan, trackedSteps]);

  const attentionCount = useMemo(() => {
    if (!plan) return 0;
    return trackedSteps.filter((s) => !stepComplete(s.key, plan)).length;
  }, [plan, trackedSteps]);

  if (create) {
    return (
      <div className="rr-wiz-page">
        <div className="rr-wiz">
          <div className="rr-wiz__topbar">
            <button className="rr-wiz__back" onClick={() => navigate('/shoot-plans')}>
              ← Shoot Plans
            </button>
            <div className="rr-wiz__title">New Shoot Plan</div>
          </div>
          <div style={{ padding: 28, maxWidth: 720 }}>
            <StepShootDetails plan={null} form={form} setForm={setForm} fieldErrors={fieldErrors} onCrewChanged={() => {}} />
            <button type="button" className="rr-toggle-btn rr-toggle-btn--active" disabled={saving} onClick={handleCreate}>
              {saving ? 'Creating…' : 'Create shoot plan'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Guard on `plan` itself, not the `loading` flag -- React Router can keep
  // this same component instance mounted across the create -> detail
  // navigate() (same component type, different route), so `loading`'s
  // stale value from the create-mode render isn't trustworthy here.
  if (!plan) {
    return (
      <div className="rr-wiz-page">
        {error ? <ErrorAlert message={error} /> : <LoadingState label="Loading shoot plan" />}
      </div>
    );
  }

  const meta = statusMeta(plan.status);

  const stepProps = { plan, onChanged: load };

  return (
    <div className="rr-wiz-page">
      <div className="rr-wiz">
        <div className="rr-wiz__topbar">
          <button className="rr-wiz__back" onClick={() => navigate('/shoot-plans')}>
            ← Shoot Plans
          </button>
          <div className="rr-wiz__title">{plan.title}</div>
          <span className="rr-pill" style={{ background: meta.bg, color: meta.fg }}>
            {meta.icon} {meta.label}
          </span>
          <div className="rr-wiz__spacer" />
          <span className="rr-wiz__savetext">{saving ? 'Saving…' : lastSaved ? `Saved · ${formatClock(lastSaved)}` : ''}</span>
          <button type="button" className="rr-wiz__btn" disabled={saving} onClick={handleSaveDraft}>
            Save Draft
          </button>
          <button type="button" className="rr-wiz__btn" onClick={() => setActiveStep('review')}>
            Preview
          </button>
          <button type="button" className="rr-wiz__btn rr-wiz__btn--dark" onClick={() => setActiveStep('review')}>
            Submit
          </button>
        </div>

        <div className="rr-wiz__pills">
          {WIZARD_STEPS.map((s) => (
            <button
              key={s.key}
              className={`rr-wiz__pill${activeStep === s.key ? ' rr-wiz__pill--active' : ''}`}
              onClick={() => setActiveStep(s.key)}
            >
              {s.num} · {s.label}
            </button>
          ))}
        </div>

        <div className="rr-wiz__body">
          <div className="rr-wiz__nav">
            <div className="rr-wiz__ring-wrap">
              <div className="rr-wiz__ring" style={{ background: `conic-gradient(#0e0e0e ${progressPercent}%, #e4e2dd 0)` }}>
                <div className="rr-wiz__ring-inner">{progressPercent}%</div>
              </div>
              <span className="rr-wiz__ring-label">complete</span>
            </div>
            <div className="rr-wiz__steps">
              {WIZARD_STEPS.map((s) => (
                <button
                  key={s.key}
                  className={`rr-wiz__step${activeStep === s.key ? ' rr-wiz__step--active' : ''}`}
                  onClick={() => setActiveStep(s.key)}
                >
                  <span>
                    {s.num} · {s.label}
                  </span>
                  {stepComplete(s.key, plan) && <span className="rr-wiz__step-check">✓</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="rr-wiz__content">
            {activeStep === 'details' && (
              <StepShootDetails
                plan={plan}
                form={form}
                setForm={setForm}
                fieldErrors={fieldErrors}
                onCrewChanged={load}
              />
            )}
            {activeStep === 'reels' && <StepReels {...stepProps} />}
            {activeStep === 'photos' && <StepPhotos {...stepProps} />}
            {activeStep === 'crew' && <StepCrew {...stepProps} />}
            {activeStep === 'budget' && <StepBudget {...stepProps} />}
            {activeStep === 'review' && (
              <StepReview {...stepProps} goToStep={setActiveStep} isElevated={isElevated} onDeletePlan={handleDeletePlan} />
            )}
            {activeStep === 'print' && <StepPrintDetails plan={plan} goToStep={setActiveStep} />}
            {activeStep === 'feedback' && <StepFeedback {...stepProps} />}
          </div>

          {activeStep === 'details' && (
            <div className="rr-wiz__glance">
              <div className="rr-wiz__glance-title">At a glance</div>
              <div className="rr-wiz__glance-row">
                <span>Brand</span>
                <b>{plan.brand_name || plan.client_name || '—'}</b>
              </div>
              <div className="rr-wiz__glance-row">
                <span>Date</span>
                <b>{plan.shoot_date ? formatDate(plan.shoot_date) : '—'}</b>
              </div>
              <div className="rr-wiz__glance-row">
                <span>Models</span>
                <b>{(plan.plan_models || []).length} added</b>
              </div>
              <div className="rr-wiz__glance-row">
                <span>Completion</span>
                <b>{progressPercent}%</b>
              </div>
              {attentionCount > 0 && (
                <div className="rr-wiz__glance-warning">
                  ⚠ {attentionCount} item{attentionCount === 1 ? '' : 's'} need{attentionCount === 1 ? 's' : ''} attention
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
