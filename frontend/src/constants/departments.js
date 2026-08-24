/**
 * Single source of truth for departments on the frontend.
 * Mirrors users.models.Department and users.views.DEPARTMENT_HOME_ROUTES.
 */

export const DEPARTMENTS = {
  ADMIN: 'ADMIN',
  PRODUCTION_HEAD: 'PRODUCTION_HEAD',
  SOCIAL_MEDIA: 'SOCIAL_MEDIA',
  PRODUCTION_COORDINATOR: 'PRODUCTION_COORDINATOR',
  CLIENT_SERVICING: 'CLIENT_SERVICING',
  SCRIPT_WRITER: 'SCRIPT_WRITER',
};

export const DEPARTMENT_LABELS = {
  ADMIN: 'Admin',
  PRODUCTION_HEAD: 'Production Head',
  SOCIAL_MEDIA: 'Social Media Specialist',
  PRODUCTION_COORDINATOR: 'Production Coordinator',
  CLIENT_SERVICING: 'Client Servicing',
  SCRIPT_WRITER: 'Script Writer',
};

/** Every department lands on the same Shoot Plans dashboard; the API scopes the rows. */
export const DEPARTMENT_HOME_ROUTES = {
  ADMIN: '/shoot-plans',
  PRODUCTION_HEAD: '/shoot-plans',
  SOCIAL_MEDIA: '/shoot-plans',
  PRODUCTION_COORDINATOR: '/shoot-plans',
  CLIENT_SERVICING: '/shoot-plans',
  SCRIPT_WRITER: '/shoot-plans',
};

/** API endpoint that backs each department's dashboard. */
export const DEPARTMENT_DASHBOARD_ENDPOINTS = {
  ADMIN: '/admin-dashboard/',
  SOCIAL_MEDIA: '/social-media/',
  PRODUCTION_COORDINATOR: '/production-coordinator/',
  CLIENT_SERVICING: '/client-servicing/',
  SCRIPT_WRITER: '/script-writer/',
};

/** Options for the signup dropdown, in the order the spec lists them. */
export const DEPARTMENT_OPTIONS = [
  { value: DEPARTMENTS.ADMIN, label: DEPARTMENT_LABELS.ADMIN },
  { value: DEPARTMENTS.PRODUCTION_HEAD, label: DEPARTMENT_LABELS.PRODUCTION_HEAD },
  { value: DEPARTMENTS.SOCIAL_MEDIA, label: DEPARTMENT_LABELS.SOCIAL_MEDIA },
  { value: DEPARTMENTS.PRODUCTION_COORDINATOR, label: DEPARTMENT_LABELS.PRODUCTION_COORDINATOR },
  { value: DEPARTMENTS.CLIENT_SERVICING, label: DEPARTMENT_LABELS.CLIENT_SERVICING },
  { value: DEPARTMENTS.SCRIPT_WRITER, label: DEPARTMENT_LABELS.SCRIPT_WRITER },
];

/**
 * Departments the current user can switch into via "Preview As".
 * Admin -> everything except Admin itself. Production Head -> everything
 * except Admin and Production Head itself (parity with Admin, minus Admin).
 * Every other department has no switch UI at all.
 */
export function switchableDepartments(currentDepartment) {
  if (currentDepartment === DEPARTMENTS.ADMIN) {
    return DEPARTMENT_OPTIONS.filter((d) => d.value !== DEPARTMENTS.ADMIN);
  }
  if (currentDepartment === DEPARTMENTS.PRODUCTION_HEAD) {
    return DEPARTMENT_OPTIONS.filter(
      (d) => d.value !== DEPARTMENTS.ADMIN && d.value !== DEPARTMENTS.PRODUCTION_HEAD
    );
  }
  return [];
}

export function departmentLabel(value) {
  return DEPARTMENT_LABELS[value] || value || '—';
}

export function homeRouteFor(department) {
  return DEPARTMENT_HOME_ROUTES[department] || '/shoot-plans';
}

// ---------------------------------------------------------------------------
// Shoot Plan module choice lists -- kept in step with shootplan/models.py
// ---------------------------------------------------------------------------

export const SHOOT_PLAN_STATUS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PRODUCTION_REVIEW', label: 'Production Review' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'RETURNED_FOR_CHANGES', label: 'Returned for Changes' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'SHOOT_COMPLETED', label: 'Shoot Completed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export const REEL_PLATFORMS = [
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'YOUTUBE', label: 'YouTube Shorts' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'OTHER', label: 'Other' },
];

export const REEL_STATUS = [
  { value: 'IDEA', label: 'Idea' },
  { value: 'SCRIPTED', label: 'Scripted' },
  { value: 'SHOT', label: 'Shot' },
  { value: 'EDITING', label: 'Editing' },
  { value: 'PUBLISHED', label: 'Published' },
];

export const PHOTO_SHOT_TYPES = [
  { value: 'PORTRAIT', label: 'Portrait' },
  { value: 'PRODUCT', label: 'Product' },
  { value: 'LIFESTYLE', label: 'Lifestyle' },
  { value: 'CANDID', label: 'Candid' },
  { value: 'GROUP', label: 'Group' },
  { value: 'BTS', label: 'Behind The Scenes' },
  { value: 'OTHER', label: 'Other' },
];

export const PHOTO_STATUS = [
  { value: 'PLANNED', label: 'Planned' },
  { value: 'SHOT', label: 'Shot' },
  { value: 'RETOUCHING', label: 'Retouching' },
  { value: 'DELIVERED', label: 'Delivered' },
];

export const CREW_ROLES = [
  { value: 'DIRECTOR', label: 'Director' },
  { value: 'DOP', label: 'Director of Photography' },
  { value: 'CAMERA', label: 'Camera Operator' },
  { value: 'PHOTOGRAPHER', label: 'Photographer' },
  { value: 'EDITOR', label: 'Editor' },
  { value: 'STYLIST', label: 'Stylist' },
  { value: 'MAKEUP', label: 'Hair & Makeup' },
  { value: 'PRODUCTION_ASSISTANT', label: 'Production Assistant' },
  { value: 'SCRIPT_WRITER', label: 'Script Writer' },
  { value: 'SOCIAL_MEDIA_SPECIALIST', label: 'Social Media Specialist' },
  { value: 'CLIENT_SERVICING', label: 'Client Servicing' },
  { value: 'PRODUCTION_COORDINATOR', label: 'Production Coordinator' },
  { value: 'PRODUCTION_HEAD', label: 'Production Head' },
  { value: 'TALENT', label: 'Talent' },
  { value: 'OTHER', label: 'Other' },
];

export const BUDGET_CATEGORIES = [
  { value: 'CREW', label: 'Crew' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'LOCATION', label: 'Location' },
  { value: 'TRAVEL', label: 'Travel' },
  { value: 'CATERING', label: 'Catering' },
  { value: 'PROPS', label: 'Props & Set' },
  { value: 'POST_PRODUCTION', label: 'Post Production' },
  { value: 'CONTINGENCY', label: 'Contingency' },
  { value: 'OTHER', label: 'Other' },
];

export const REVIEW_STATUS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CHANGES_REQUESTED', label: 'Changes Requested' },
];

export const FEEDBACK_CATEGORIES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'SHOOT', label: 'Shoot Execution' },
  { value: 'CLIENT', label: 'Client' },
  { value: 'CREW', label: 'Crew' },
  { value: 'BUDGET', label: 'Budget' },
  { value: 'SCRIPT', label: 'Script' },
  { value: 'TOOLING', label: 'Tooling / Portal' },
];

export const FEEDBACK_STATUS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

/** The seven categories of the Shoot Plan module, in spec order. */
export const SHOOT_PLAN_TABS = [
  { key: 'details', label: 'Shoot Details' },
  { key: 'reels', label: 'Reels' },
  { key: 'photos', label: 'Photos' },
  { key: 'crew', label: 'Shoot Crew' },
  { key: 'budget', label: 'Budget Allowance' },
  { key: 'review', label: 'Review & Approval' },
  { key: 'feedback', label: 'Feedback' },
];

export function labelOf(options, value) {
  const match = options.find((o) => o.value === value);
  return match ? match.label : value || '—';
}
