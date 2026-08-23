/** Visual treatment for each Shoot Plan status -- matches the design reference exactly. */
export const SHOOT_STATUS_META = {
  DRAFT: { label: 'Draft', bg: '#e9e8e4', fg: '#3a3a38', icon: '●' },
  PRODUCTION_REVIEW: { label: 'Production Review', bg: '#e6e0fb', fg: '#4b3ba6', icon: '↻' },
  ON_HOLD: { label: 'On Hold', bg: '#ffd9d6', fg: '#a3372f', icon: '⏸' },
  RETURNED_FOR_CHANGES: { label: 'Returned for Changes', bg: '#ffdadf', fg: '#b3213f', icon: '↩' },
  CREATIVE_REVIEW: { label: 'Creative Review', bg: '#fdead0', fg: '#93591a', icon: '◐' },
  APPROVED: { label: 'Approved', bg: '#d6f5e3', fg: '#177a4c', icon: '✓' },
  SHOOT_COMPLETED: { label: 'Shoot Completed', bg: '#0e0e0e', fg: '#f3f2ef', icon: '■' },
  ARCHIVED: { label: 'Archived', bg: '#eeeeee', fg: '#7a7a76', icon: '▢' },
};

export const SHOOT_STATUS_ORDER = [
  'DRAFT',
  'PRODUCTION_REVIEW',
  'ON_HOLD',
  'RETURNED_FOR_CHANGES',
  'CREATIVE_REVIEW',
  'APPROVED',
  'SHOOT_COMPLETED',
  'ARCHIVED',
];

export function statusMeta(status) {
  return SHOOT_STATUS_META[status] || { label: status || '—', bg: '#eee', fg: '#555', icon: '' };
}

/** Simple Active/Inactive pill used across all four directory modules. */
export function activeMeta(isActive) {
  return isActive
    ? { label: 'Active', bg: '#d6f5e3', fg: '#177a4c' }
    : { label: 'Inactive', bg: '#eeeeee', fg: '#7a7a76' };
}
