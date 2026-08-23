/** Mirrors the choice lists added to shootplan/models.py for Phase 2. */

export const APPROVAL_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

export const PERMIT_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'SECURED', label: 'Secured' },
  { value: 'NOT_REQUIRED', label: 'Not Required' },
];

export const PROP_SOURCE_OPTIONS = [
  { value: 'LENT', label: 'Lent' },
  { value: 'RENTED', label: 'Rented' },
  { value: 'OWNED', label: 'Owned' },
];

export const PROP_STATUS_OPTIONS = [
  { value: 'SECURED', label: 'Secured' },
  { value: 'NOT_SECURED', label: 'Not Secured' },
];

export const TRAVEL_TYPE_OPTIONS = [
  { value: 'FLIGHT', label: 'Flight' },
  { value: 'TRAIN', label: 'Train' },
  { value: 'CAB', label: 'Cab' },
  { value: 'FUEL', label: 'Fuel' },
  { value: 'ACCOMMODATION', label: 'Accommodation' },
  { value: 'OTHER', label: 'Other' },
];

export const PERSON_TYPE_OPTIONS = [
  { value: 'INTERNAL_TEAM', label: 'Internal Team' },
  { value: 'FREELANCER', label: 'Freelancer' },
  { value: 'MODEL', label: 'Model' },
];

/**
 * Exactly the 7 sections from the source design (Shoot Details, Reels,
 * Photos, Shoot Crew, Budget Allowance, Review & Approval) plus Feedback,
 * which the source doesn't have. People & Models, Locations, and Props are
 * NOT separate top-level steps in the source -- that data is managed inline
 * from within the Reels step (see StepReels.js).
 */
export const WIZARD_STEPS = [
  { key: 'details', num: 1, label: 'Shoot Details' },
  { key: 'reels', num: 2, label: 'Reels' },
  { key: 'photos', num: 3, label: 'Photos' },
  { key: 'crew', num: 4, label: 'Shoot Crew' },
  { key: 'budget', num: 5, label: 'Budget Allowance' },
  { key: 'review', num: 6, label: 'Review & Approval' },
  { key: 'print', num: 7, label: 'Print Details' },
  { key: 'feedback', num: 8, label: 'Feedback' },
];

export function labelOf(options, value) {
  const match = options.find((o) => o.value === value);
  return match ? match.label : value || '—';
}
