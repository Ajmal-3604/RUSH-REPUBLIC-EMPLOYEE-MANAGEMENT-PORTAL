import React, { useRef, useState } from 'react';
import { ErrorAlert } from '../../components/EmptyState';
import { planLocationService, propService, crewService, travelExpenseService, extractApiError } from '../../api/services';
import { money, clampNonNegative } from '../../utils/format';

const TRAVEL_EXPENSE_TYPES = [
  { value: 'AUTO', label: 'Auto' },
  { value: 'CAB', label: 'Cab' },
  { value: 'CAR_RENTAL', label: 'Car rental' },
  { value: 'FUEL', label: 'Fuel' },
  { value: 'FLIGHT', label: 'Flight' },
  { value: 'TRAIN', label: 'Train' },
  { value: 'BUS', label: 'Bus' },
  { value: 'ACCOMMODATION', label: 'Accommodation' },
  { value: 'PARKING', label: 'Parking' },
  { value: 'TOLL', label: 'Toll' },
  { value: 'OTHER', label: 'Other' },
];

export default function StepBudget({ plan, onChanged }) {
  const [error, setError] = useState('');
  const mealCostRefs = useRef({});
  const props_ = plan?.props || [];
  const crew = plan?.crew || [];
  const travel = plan?.travel_expenses || [];
  const reels = plan?.reels || [];
  const photos = plan?.photos || [];

  const usageText = (id, field) => {
    const reelCount = reels.filter((r) => (r[field] || []).includes(id)).length;
    const photoCount = photos.filter((p) => (p[field] || []).includes(id)).length;
    return `Used in ${reelCount} reel(s), ${photoCount} photo concept(s)`;
  };

  // Only locations actually cast in a Reel or Photo belong in the budget --
  // the raw plan_locations pool can include rows nobody has assigned yet.
  const usedLocationIds = new Set([...reels, ...photos].flatMap((r) => r.assigned_locations || []));
  const locations = (plan?.plan_locations || []).filter((l) => usedLocationIds.has(l.id));

  const run = async (fn, message) => {
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(extractApiError(err, message));
    }
  };

  const locationTotal = locations.reduce((sum, l) => sum + Number(l.budget_cost || 0), 0);
  const propsTotal = props_.reduce((sum, p) => sum + Number(p.unit_cost || 0) * Number(p.quantity || 0), 0);
  const foodTotal = crew
    .filter((c) => c.meal_included)
    .reduce((sum, c) => sum + Number(c.meal_cost || 0) * Number(c.meals_count || 0), 0);
  const travelTotal = travel.reduce((sum, t) => sum + Number(t.cost || 0), 0);
  const grandTotal = locationTotal + propsTotal + foodTotal + travelTotal;

  const applyMealCostToAll = async () => {
    const included = crew.filter((c) => c.meal_included);
    if (included.length === 0) return;
    // Read straight from the DOM, not from `crew` -- if the first row's
    // input still has focus (typed but not yet blurred), `crew` still holds
    // the pre-edit value and this would silently apply the wrong cost.
    const firstInput = mealCostRefs.current[included[0].id];
    const rawCost = firstInput ? firstInput.value : included[0].meal_cost;
    const cost = clampNonNegative(rawCost);
    try {
      await Promise.all(included.map((c) => crewService.patch(c.id, { meal_cost: cost })));
      // These are uncontrolled inputs (defaultValue), so a re-render with
      // fresh props won't update what's on screen -- write the new value
      // into each visible box directly so it doesn't look like a no-op.
      included.forEach((c) => {
        const input = mealCostRefs.current[c.id];
        if (input) input.value = cost;
      });
      onChanged();
    } catch (err) {
      setError(extractApiError(err, 'Could not update.'));
    }
  };

  const addTravel = () => run(() => travelExpenseService.create({ shoot_plan: plan.id, reason: '', expense_type: 'OTHER', cost: 0 }), 'Could not add expense.');

  return (
    <>
      <div className="rr-wiz-step-title" style={{ marginBottom: 14 }}>
        Budget Allowance
      </div>
      <ErrorAlert message={error} />

      <div className="rr-budget-stats">
        <div className="rr-budget-stat">
          <div className="rr-budget-stat__label">Location</div>
          <div className="rr-budget-stat__value">{money(locationTotal)}</div>
        </div>
        <div className="rr-budget-stat">
          <div className="rr-budget-stat__label">Props</div>
          <div className="rr-budget-stat__value">{money(propsTotal)}</div>
        </div>
        <div className="rr-budget-stat">
          <div className="rr-budget-stat__label">Food</div>
          <div className="rr-budget-stat__value">{money(foodTotal)}</div>
        </div>
        <div className="rr-budget-stat">
          <div className="rr-budget-stat__label">Travel</div>
          <div className="rr-budget-stat__value">{money(travelTotal)}</div>
        </div>
        <div className="rr-budget-stat rr-budget-stat--total">
          <div className="rr-budget-stat__label">Grand Total</div>
          <div className="rr-budget-stat__value">{money(grandTotal)}</div>
        </div>
      </div>

      <div className="rr-budget-section-title">Total Location Budget — {money(locationTotal)}</div>
      {locations.length === 0 && <div style={{ fontSize: 13, color: 'rgba(0,0,0,.5)', marginBottom: 16 }}>No locations assigned yet in the Locations, Reels or Photos steps.</div>}
      {locations.map((l) => (
        <div key={l.id} className="rr-budget-row" style={{ gridTemplateColumns: '1.4fr .8fr .8fr' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{l.name}</div>
            <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.5)' }}>{usageText(l.id, 'assigned_locations')}</div>
          </div>
          <div>
            <label style={{ fontSize: 10.5, color: 'rgba(0,0,0,.5)' }}>Cost (₹)</label>
            <input
              type="number"
              min={0}
              defaultValue={l.budget_cost}
              onBlur={(e) => run(() => planLocationService.patch(l.id, { budget_cost: clampNonNegative(e.target.value) }), 'Could not save.')}
            />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{money(l.budget_cost)}</div>
        </div>
      ))}

      <div className="rr-budget-section-title">Total Props Budget — {money(propsTotal)}</div>
      {props_.length === 0 && <div style={{ fontSize: 13, color: 'rgba(0,0,0,.5)', marginBottom: 16 }}>No props in the master Props list yet.</div>}
      {props_.map((p) => (
        <div key={p.id} className="rr-budget-row" style={{ gridTemplateColumns: '1.4fr .6fr .8fr .8fr .9fr' }}>
          <div>
            <input
              defaultValue={p.name}
              onBlur={(e) => run(() => propService.patch(p.id, { name: e.target.value }), 'Could not save.')}
              style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}
            />
            <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.5)' }}>
              {p.source_display} · {usageText(p.id, 'assigned_props')}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 10.5, color: 'rgba(0,0,0,.5)' }}>Qty</label>
            <input
              type="number"
              min={1}
              defaultValue={p.quantity}
              onBlur={(e) => run(() => propService.patch(p.id, { quantity: clampNonNegative(e.target.value, 1) }), 'Could not save.')}
            />
          </div>
          <div>
            <label style={{ fontSize: 10.5, color: 'rgba(0,0,0,.5)' }}>Unit cost (₹)</label>
            <input
              type="number"
              min={0}
              defaultValue={p.unit_cost}
              onBlur={(e) => run(() => propService.patch(p.id, { unit_cost: clampNonNegative(e.target.value) }), 'Could not save.')}
            />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{money(p.unit_cost * p.quantity)}</div>
          <div style={{ fontSize: 11.5, color: '#c9822b', textAlign: 'right' }}>
            {p.source === 'RENTED' && Number(p.unit_cost) === 0 && '⚠ Rented — cost needed'}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 10px' }}>
        <div className="rr-budget-section-title" style={{ margin: 0 }}>
          Total Food Budget — {money(foodTotal)}
        </div>
        <button type="button" className="rr-toggle-btn" onClick={applyMealCostToAll}>
          Apply cost to all included
        </button>
      </div>
      {crew.length === 0 && <div style={{ fontSize: 13, color: 'rgba(0,0,0,.5)', marginBottom: 16 }}>Add crew in the Shoot Crew step to build the food budget.</div>}
      {crew.map((c) => (
        <div key={c.id} className="rr-budget-row" style={{ gridTemplateColumns: '1.4fr .8fr .8fr .8fr .8fr' }}>
          <div>
            {c.name && <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>}
            <div style={{ fontSize: c.name ? 11.5 : 13, color: c.name ? 'rgba(0,0,0,.5)' : '#0e0e0e', fontWeight: c.name ? 400 : 600 }}>
              {c.role_display} · {c.person_type_display}
            </div>
          </div>
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              defaultChecked={c.meal_included}
              onChange={(e) => run(() => crewService.patch(c.id, { meal_included: e.target.checked }), 'Could not save.')}
            />
            Include
          </label>
          <div>
            <label style={{ fontSize: 10.5, color: 'rgba(0,0,0,.5)' }}>Meal cost (₹)</label>
            <input
              type="number"
              min={0}
              ref={(el) => { mealCostRefs.current[c.id] = el; }}
              defaultValue={c.meal_cost}
              onBlur={(e) => run(() => crewService.patch(c.id, { meal_cost: clampNonNegative(e.target.value) }), 'Could not save.')}
            />
          </div>
          <div>
            <label style={{ fontSize: 10.5, color: 'rgba(0,0,0,.5)' }}>Meals</label>
            <input
              type="number"
              min={1}
              defaultValue={c.meals_count}
              onBlur={(e) => run(() => crewService.patch(c.id, { meals_count: clampNonNegative(e.target.value, 1) }), 'Could not save.')}
            />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{money(c.meal_included ? c.meal_cost * c.meals_count : 0)}</div>
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 10px' }}>
        <div className="rr-budget-section-title" style={{ margin: 0 }}>
          Total Travel Budget — {money(travelTotal)}
        </div>
        <button type="button" className="rr-toggle-btn rr-toggle-btn--active" onClick={addTravel}>
          + Add travel expense
        </button>
      </div>
      {travel.length === 0 && <div style={{ fontSize: 13, color: 'rgba(0,0,0,.5)', marginBottom: 16 }}>No travel expenses added.</div>}
      {travel.map((t) => (
        <div key={t.id} className="rr-budget-row" style={{ gridTemplateColumns: '1.4fr .9fr .8fr 1.2fr auto' }}>
          <input
            defaultValue={t.reason}
            placeholder="Reason"
            onBlur={(e) => run(() => travelExpenseService.patch(t.id, { reason: e.target.value }), 'Could not save.')}
          />
          <select
            defaultValue={t.expense_type}
            onChange={(e) => run(() => travelExpenseService.patch(t.id, { expense_type: e.target.value }), 'Could not save.')}
          >
            {TRAVEL_EXPENSE_TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            defaultValue={t.cost}
            placeholder="Cost ₹"
            onBlur={(e) => run(() => travelExpenseService.patch(t.id, { cost: clampNonNegative(e.target.value) }), 'Could not save.')}
          />
          <input
            defaultValue={t.notes}
            placeholder="Notes"
            onBlur={(e) => run(() => travelExpenseService.patch(t.id, { notes: e.target.value }), 'Could not save.')}
          />
          <button
            type="button"
            onClick={() => run(() => travelExpenseService.remove(t.id), 'Could not remove.')}
            style={{ border: 'none', background: 'none', color: '#ff615f', fontSize: 12.5, cursor: 'pointer' }}
          >
            Remove
          </button>
        </div>
      ))}
    </>
  );
}
