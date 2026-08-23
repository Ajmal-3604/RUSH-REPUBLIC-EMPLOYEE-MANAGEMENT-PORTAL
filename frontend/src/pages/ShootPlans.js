import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { ErrorAlert, LoadingState } from '../components/EmptyState';
import { shootPlanService, brandService, extractApiError } from '../api/services';
import { SHOOT_STATUS_ORDER, statusMeta } from '../constants/statusMeta';
import { formatDate, formatTime, timeAgo } from '../utils/format';
import './Directory.css';
import './ShootPlans.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function ShootPlans() {
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [brandFilter, setBrandFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    brandService.list({ status: 'Active' }).then((data) => setBrands(Array.isArray(data) ? data : data.results || []));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = { search: search || undefined };
    shootPlanService
      .list(params)
      .then((data) => {
        setPlans(Array.isArray(data) ? data : data.results || []);
        setError('');
      })
      .catch((err) => setError(extractApiError(err, 'Could not load shoot plans.')))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(load, [load]);

  const yearOptions = useMemo(() => {
    const years = new Set(plans.filter((p) => p.shoot_date).map((p) => new Date(p.shoot_date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [plans]);

  const filtered = useMemo(
    () =>
      plans.filter((plan) => {
        if (statusFilter !== 'ALL' && plan.status !== statusFilter) return false;
        if (yearFilter !== 'ALL') {
          if (!plan.shoot_date) return false;
          if (new Date(plan.shoot_date).getFullYear() !== Number(yearFilter)) return false;
        }
        if (monthFilter !== 'ALL') {
          if (!plan.shoot_date) return false;
          if (new Date(plan.shoot_date).getMonth() !== Number(monthFilter)) return false;
        }
        if (brandFilter !== 'ALL' && String(plan.brand) !== String(brandFilter)) return false;
        return true;
      }),
    [plans, statusFilter, yearFilter, monthFilter, brandFilter]
  );

  const statusTabs = useMemo(
    () => [
      { value: 'ALL', label: 'All', count: plans.length },
      ...SHOOT_STATUS_ORDER.map((value) => ({
        value,
        label: statusMeta(value).label,
        count: plans.filter((p) => p.status === value).length,
      })),
    ],
    [plans]
  );

  return (
    <AppShell
      active="shoot-plans"
      subbar={
        <>
          <div className="rr-plans-title">Shoot Plans</div>
          <input
            className="rr-plans-search"
            type="search"
            placeholder="Search shoot plans…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="rr-plans-new-btn" onClick={() => navigate('/shoot-plans/new')}>
            + New Shoot Plan
          </button>
        </>
      }
    >
      <div className="rr-content">
        <div className="rr-toolbar">
          <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            <option value="ALL">All years</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
            <option value="ALL">All months</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
            <option value="ALL">All brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <button
            className="rr-toolbar__clear"
            onClick={() => {
              setStatusFilter('ALL');
              setYearFilter('ALL');
              setMonthFilter('ALL');
              setBrandFilter('ALL');
              setSearch('');
            }}
          >
            Clear filters
          </button>
        </div>

        <div className="rr-plans-tabs">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              className={`rr-plans-tab${statusFilter === tab.value ? ' rr-plans-tab--active' : ''}`}
              onClick={() => setStatusFilter(tab.value)}
            >
              {tab.label} <span className="rr-plans-tab__count">{tab.count}</span>
            </button>
          ))}
        </div>

        <ErrorAlert message={error} />

        {loading ? (
          <LoadingState label="Loading shoot plans" />
        ) : filtered.length === 0 ? (
          <div className="rr-empty">
            <div className="rr-empty__title">No shoot plans found</div>
            <div className="rr-empty__text">Try a different search or filter, or start a new plan.</div>
          </div>
        ) : (
          <div className="rr-plan-grid">
            {filtered.map((plan) => {
              const meta = statusMeta(plan.status);
              return (
                <button key={plan.id} className="rr-plan-card" onClick={() => navigate(`/shoot-plans/${plan.id}`)}>
                  <div className="rr-plan-card__head">
                    <div>
                      <div className="rr-plan-card__eyebrow">{plan.client_name}</div>
                      <div className="rr-plan-card__title">{plan.title}</div>
                    </div>
                    <span className="rr-pill" style={{ background: meta.bg, color: meta.fg }}>
                      {meta.icon} {meta.label}
                    </span>
                  </div>

                  <div className="rr-plan-card__meta">
                    {formatDate(plan.shoot_date)}
                    {plan.call_time && plan.wrap_time ? ` · ${formatTime(plan.call_time)}–${formatTime(plan.wrap_time)}` : ''}
                  </div>

                  {plan.created_by_name && (
                    <div className="rr-plan-card__owner">
                      <span className="rr-avatar" style={{ width: 26, height: 26, fontSize: 11 }}>
                        {plan.created_by_name.charAt(0).toUpperCase()}
                      </span>
                      <span>
                        {plan.created_by_name} · {timeAgo(plan.created_at)}
                      </span>
                    </div>
                  )}

                  <div className="rr-plan-card__completion">
                    <div className="rr-plan-card__completion-row">
                      <span>Completion</span>
                      <span>{plan.completion_percent ?? 0}%</span>
                    </div>
                    <div className="rr-plan-card__meter">
                      <div className="rr-plan-card__meter-fill" style={{ width: `${plan.completion_percent ?? 0}%` }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
