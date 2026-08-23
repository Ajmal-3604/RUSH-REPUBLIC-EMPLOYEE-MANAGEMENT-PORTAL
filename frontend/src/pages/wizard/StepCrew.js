import React, { useState } from 'react';
import { ErrorAlert } from '../../components/EmptyState';
import { crewService, extractApiError } from '../../api/services';
import { PERSON_TYPE_OPTIONS } from '../../constants/wizardOptions';
import { CREW_ROLES } from '../../constants/departments';

export default function StepCrew({ plan, onChanged }) {
  const [error, setError] = useState('');
  const crew = plan?.crew || [];
  const planModels = plan?.plan_models || [];
  const reelsAndPhotos = [...(plan?.reels || []), ...(plan?.photos || [])];
  const assignedModelIds = new Set(reelsAndPhotos.flatMap((r) => r.assigned_models || []));

  const run = async (fn, message) => {
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(extractApiError(err, message));
    }
  };

  const patch = (id, payload) => run(() => crewService.patch(id, payload), 'Could not save changes.');
  const remove = (id) => run(() => crewService.remove(id), 'Could not remove crew member.');

  const addManual = () =>
    run(
      () => crewService.create({ shoot_plan: plan.id, name: 'New crew member', person_type: 'INTERNAL_TEAM', role: 'OTHER' }),
      'Could not add crew member.'
    );

  const BRAND_ROLE_SYNC = [
    { key: 'brand_script_writer', role: 'SCRIPT_WRITER' },
    { key: 'brand_social_media_specialist', role: 'SOCIAL_MEDIA_SPECIALIST' },
    { key: 'brand_client_servicing', role: 'CLIENT_SERVICING' },
    { key: 'brand_production_coordinator', role: 'PRODUCTION_COORDINATOR' },
    { key: 'brand_production_head', role: 'PRODUCTION_HEAD' },
  ];

  const syncFromModels = () => {
    // Only models actually assigned to a Reel or Photo shot are real shoot
    // crew -- the raw Models pool can contain rows nobody has cast yet.
    const unsyncedModels = planModels
      .filter((m) => assignedModelIds.has(m.id))
      .filter((m) => !crew.some((c) => c.source_plan_model === m.id));
    const unsyncedBrandRoles = BRAND_ROLE_SYNC.filter(
      ({ key, role }) => plan?.[key] && !crew.some((c) => c.source_brand_role === role)
    );
    if (unsyncedModels.length === 0 && unsyncedBrandRoles.length === 0) return;
    run(
      () =>
        Promise.all([
          ...unsyncedModels.map((m) =>
            crewService.create({
              shoot_plan: plan.id,
              name: m.name,
              contact: m.phone,
              person_type: 'MODEL',
              role: 'TALENT',
              source_plan_model: m.id,
              call_time: m.time_in || null,
              time_out: m.time_out || null,
            })
          ),
          ...unsyncedBrandRoles.map(({ key, role }) =>
            crewService.create({
              shoot_plan: plan.id,
              name: plan[key],
              person_type: 'INTERNAL_TEAM',
              role,
              source_brand_role: role,
            })
          ),
        ]),
      'Could not sync crew.'
    );
  };

  const sourceLabel = (c) => {
    if (c.source_freelancer) return 'From Shoot Details';
    if (c.source_plan_model) return 'From Models';
    if (c.source_brand_role) return 'From Shoot Details';
    return 'Added manually';
  };

  const assignmentStatus = (c) => {
    if (!c.source_plan_model) return 'Not yet assigned to a reel';
    const count = reelsAndPhotos.filter((r) => (r.assigned_models || []).includes(c.source_plan_model)).length;
    return count > 0 ? `Assigned to ${count} reel(s)` : 'Not yet assigned to a reel';
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div className="rr-wiz-step-title" style={{ marginBottom: 0 }}>
          Shoot Crew
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="rr-toggle-btn" onClick={syncFromModels}>
            ↻ Sync from shoot plan
          </button>
          <button type="button" className="rr-toggle-btn rr-toggle-btn--active" onClick={addManual}>
            + Add person
          </button>
        </div>
      </div>
      <div style={{ fontSize: 13, color: 'rgba(0,0,0,.55)', marginBottom: 16 }}>
        Everyone participating in this shoot — models pulled from Reels &amp; Photos, freelancers and brand contacts
        pulled from Shoot Details, plus anyone added manually.
      </div>

      <ErrorAlert message={error} />

      {crew.length === 0 && (
        <div className="rr-wiz-empty">
          <div className="rr-wiz-empty__title">No crew yet</div>
          <div className="rr-wiz-empty__text">Sync from the shoot plan or add a person manually.</div>
        </div>
      )}

      {crew.map((c) => (
        <div key={c.id} style={{ border: '1px solid rgba(0,0,0,.1)', borderRadius: 6, padding: 14, marginBottom: 10 }}>
          <div className="rr-wizgrid-3" style={{ marginBottom: 10 }}>
            <div className="rr-wizfield" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 11 }}>Name</label>
              <input defaultValue={c.name} onBlur={(e) => patch(c.id, { name: e.target.value })} style={{ padding: '7px 9px', fontSize: 13 }} />
            </div>
            <div className="rr-wizfield" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 11 }}>Person type</label>
              <select
                defaultValue={c.person_type}
                onBlur={(e) => patch(c.id, { person_type: e.target.value })}
                style={{ padding: '7px 9px', fontSize: 13 }}
              >
                {PERSON_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="rr-wizfield" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 11 }}>Role on this shoot</label>
              <select
                defaultValue={c.role}
                onBlur={(e) => patch(c.id, { role: e.target.value })}
                style={{ padding: '7px 9px', fontSize: 13 }}
              >
                {CREW_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {c.person_type !== 'INTERNAL_TEAM' && (
            <div className="rr-wizgrid-2" style={{ marginBottom: 10 }}>
              <div className="rr-wizfield" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 11 }}>Agreed time in</label>
                <input type="time" defaultValue={c.call_time || ''} onBlur={(e) => patch(c.id, { call_time: e.target.value || null })} style={{ padding: '7px 9px', fontSize: 13 }} />
              </div>
              <div className="rr-wizfield" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 11 }}>Agreed time out</label>
                <input type="time" defaultValue={c.time_out || ''} onBlur={(e) => patch(c.id, { time_out: e.target.value || null })} style={{ padding: '7px 9px', fontSize: 13 }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,.5)' }}>
              <div>{sourceLabel(c)}</div>
              <div>{assignmentStatus(c)}</div>
            </div>
            <button type="button" onClick={() => remove(c.id)} style={{ border: 'none', background: 'none', color: '#ff615f', fontSize: 12.5, cursor: 'pointer' }}>
              Remove
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
