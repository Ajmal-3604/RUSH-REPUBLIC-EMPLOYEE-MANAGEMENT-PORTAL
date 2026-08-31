import React, { useState } from 'react';
import { ErrorAlert } from '../../components/EmptyState';
import { crewService, extractApiError } from '../../api/services';
import { PERSON_TYPE_OPTIONS } from '../../constants/wizardOptions';
import { CREW_ROLES } from '../../constants/departments';

export default function StepCrew({ plan, onChanged }) {
  const [error, setError] = useState('');
  // Manually-added people are tracked here (in add order) so they always
  // render at the very bottom of the list, below every synced/existing
  // member -- the default sort-by-type below would otherwise drop a new
  // "New crew member" row wherever its (empty) call_time/name happens to
  // fall inside its Internal Team group.
  const [justAddedIds, setJustAddedIds] = useState([]);
  const planModels = plan?.plan_models || [];
  const reelsAndPhotos = [...(plan?.reels || []), ...(plan?.photos || [])];
  const assignedModelIds = new Set(reelsAndPhotos.flatMap((r) => r.assigned_models || []));

  // Internal Team first, then Freelancers, then Models -- Agreed Time In/Out
  // for both of those groups is always read from their Reels/Photos source
  // below (PlanModel.time_in/time_out for models; the freelancer's own
  // call_time/time_out, which Reels/Photos already patch directly), so this
  // view never holds its own copy that could drift out of sync.
  const PERSON_TYPE_ORDER = { INTERNAL_TEAM: 0, FREELANCER: 1, MODEL: 2 };
  const allCrew = plan?.crew || [];
  const crew = allCrew
    .filter((c) => !justAddedIds.includes(c.id))
    .sort((a, b) => (PERSON_TYPE_ORDER[a.person_type] ?? 3) - (PERSON_TYPE_ORDER[b.person_type] ?? 3));
  const newlyAdded = justAddedIds
    .map((id) => allCrew.find((c) => c.id === id))
    .filter(Boolean);

  const run = async (fn, message) => {
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(extractApiError(err, message));
    }
  };

  const patch = (id, payload) => run(() => crewService.patch(id, payload), 'Could not save changes.');
  const remove = (id) => {
    setJustAddedIds((ids) => ids.filter((i) => i !== id));
    run(() => crewService.remove(id), 'Could not remove crew member.');
  };

  const addManual = async () => {
    try {
      const created = await crewService.create({ shoot_plan: plan.id, name: 'New crew member', person_type: 'INTERNAL_TEAM', role: 'OTHER' });
      setJustAddedIds((ids) => [...ids, created.id]);
      onChanged();
    } catch (err) {
      setError(extractApiError(err, 'Could not add crew member.'));
    }
  };

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
        </div>
      </div>
      <div style={{ fontSize: 13, color: 'rgba(0,0,0,.55)', marginBottom: 16 }}>
        Everyone participating in this shoot — models pulled from Reels &amp; Photos, freelancers and brand contacts
        pulled from Shoot Details, plus anyone added manually.
      </div>

      <ErrorAlert message={error} />

      {crew.length === 0 && newlyAdded.length === 0 && (
        <div className="rr-wiz-empty">
          <div className="rr-wiz-empty__title">No crew yet</div>
          <div className="rr-wiz-empty__text">Sync from the shoot plan or add a person manually.</div>
        </div>
      )}

      {[...crew, ...newlyAdded].map((c) => {
        // Models' Agreed Time In/Out lives on the linked PlanModel (edited
        // from Reels/Photos); freelancers' already lives directly on this
        // crew row, since Reels/Photos patch that same field. Either way,
        // Shoot Crew only ever displays it -- never its own copy.
        const linkedModel = c.person_type === 'MODEL' && c.source_plan_model
          ? planModels.find((m) => m.id === c.source_plan_model)
          : null;
        const timeIn = linkedModel ? linkedModel.time_in : c.call_time;
        const timeOut = linkedModel ? linkedModel.time_out : c.time_out;
        // Only lock the fields when this row actually has a Reels/Photos
        // source to read from -- a manually-added Freelancer/Model (no
        // source_plan_model / source_freelancer) has nowhere to sync from,
        // so it must stay editable like Internal Team's own timing would.
        const hasSource = !!(linkedModel || c.source_freelancer);
        const showTiming = c.person_type !== 'INTERNAL_TEAM';
        const timingFromSource = showTiming && hasSource;
        return (
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

          {timingFromSource && (
            <div className="rr-wizgrid-2" style={{ marginBottom: 10 }}>
              <div className="rr-wizfield" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 11 }}>Agreed time in (from Reels/Photos)</label>
                <input type="time" value={timeIn || ''} readOnly disabled style={{ padding: '7px 9px', fontSize: 13, background: '#f7f7f5', color: 'rgba(0,0,0,.65)' }} />
              </div>
              <div className="rr-wizfield" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 11 }}>Agreed time out (from Reels/Photos)</label>
                <input type="time" value={timeOut || ''} readOnly disabled style={{ padding: '7px 9px', fontSize: 13, background: '#f7f7f5', color: 'rgba(0,0,0,.65)' }} />
              </div>
            </div>
          )}

          {showTiming && !hasSource && (
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
        );
      })}

      <button type="button" className="rr-toggle-btn rr-toggle-btn--active" onClick={addManual}>
        + Add person
      </button>
    </>
  );
}
