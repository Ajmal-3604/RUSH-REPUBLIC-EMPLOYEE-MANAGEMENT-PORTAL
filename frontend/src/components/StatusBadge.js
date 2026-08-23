import React from 'react';

/**
 * Monochrome status pill.
 *
 * The theme is black and white, so state is carried by fill weight rather than
 * hue: solid = settled/positive, outline = needs attention, muted = idle.
 */
const TONE_BY_STATUS = {
  // Shoot plan
  DRAFT: 'muted',
  PRODUCTION_REVIEW: 'outline',
  ON_HOLD: 'muted',
  RETURNED_FOR_CHANGES: 'outline',
  CREATIVE_REVIEW: 'outline',
  APPROVED: 'solid',
  SHOOT_COMPLETED: 'solid',
  ARCHIVED: 'muted',
  // Reel
  IDEA: 'muted',
  SCRIPTED: 'outline',
  SHOT: 'outline',
  EDITING: 'outline',
  PUBLISHED: 'solid',
  // Photo
  RETOUCHING: 'outline',
  DELIVERED: 'solid',
  // Review & approval
  PENDING: 'outline',
  REJECTED: 'muted',
  CHANGES_REQUESTED: 'outline',
  // Feedback
  OPEN: 'outline',
  IN_REVIEW: 'outline',
  RESOLVED: 'solid',
  CLOSED: 'muted',
};

export default function StatusBadge({ status, label }) {
  if (!status && !label) return <span className="rr-muted">—</span>;
  const tone = TONE_BY_STATUS[status] || 'muted';
  return <span className={`rr-badge rr-badge--${tone}`}>{label || status}</span>;
}

/** Neutral pill for non-status metadata (platform, category, role). */
export function MetaBadge({ children }) {
  if (!children) return <span className="rr-muted">—</span>;
  return <span className="rr-badge rr-badge--muted">{children}</span>;
}
