/** Small display helpers shared across the module pages. */

const CURRENCY = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const NUMBER = new Intl.NumberFormat('en-IN');

export function money(value) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? CURRENCY.format(amount) : '—';
}

// Cost/quantity fields can't go below `min` -- HTML's `min` attribute only
// affects the spinner arrows and validation styling, not a typed value, so
// this is what actually stops a negative number reaching the backend.
export const clampNonNegative = (value, min = 0) => Math.max(min, Number(value) || 0);

export function count(value) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? NUMBER.format(amount) : '—';
}

/** `2026-08-21` -> `21 Aug 2026` */
export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** ISO timestamp -> `21 Aug 2026, 14:32` */
export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}, ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

/** ISO timestamp -> `20 Jun 09:05 AM` -- used on the Activity Timeline */
export function formatActivityTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const datePart = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const timePart = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${datePart} ${timePart}`;
}

/** `07:30:00` -> `07:30` */
export function formatTime(value) {
  if (!value) return '—';
  return String(value).slice(0, 5);
}

/** Date -> `01:05 PM` */
export function formatClock(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/** `45` -> `45s`, `90` -> `1m 30s` */
export function duration(seconds) {
  const total = Number(seconds ?? 0);
  if (!Number.isFinite(total) || total <= 0) return '—';
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
}

/** Monochrome 1-5 rating, e.g. `★★★★☆`. */
export function ratingStars(rating) {
  const filled = Math.max(0, Math.min(5, Number(rating) || 0));
  return { filled: '★'.repeat(filled), empty: '☆'.repeat(5 - filled) };
}

/** Percentage of an allocation that has been spent, clamped for display. */
export function usagePercent(spent, allocated) {
  const total = Number(allocated ?? 0);
  if (total <= 0) return 0;
  return Math.round((Number(spent ?? 0) / total) * 100);
}

/** ISO timestamp -> `2 hours ago` / `3 days ago` / falls back to a date past 30 days. */
export function timeAgo(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDate(value);
}

/** Strips empty strings so DRF receives null-ish fields as absent, not "". */
export function pruneEmpty(payload, nullable = []) {
  return Object.entries(payload).reduce((acc, [key, value]) => {
    if (value === '' || value === undefined) {
      // Date/time columns are nullable in the DB; send null rather than "".
      if (nullable.includes(key)) acc[key] = null;
      return acc;
    }
    acc[key] = value;
    return acc;
  }, {});
}
