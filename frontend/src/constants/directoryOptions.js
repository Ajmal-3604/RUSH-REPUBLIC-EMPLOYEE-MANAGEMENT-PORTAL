/** Mirrors directory/models.py choice lists. */

export const TEAM_ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'PRODUCTION_HEAD', label: 'Production Head' },
  { value: 'SOCIAL_MEDIA_SPECIALIST', label: 'Social Media Specialist' },
  { value: 'CLIENT_SERVICING', label: 'Client Servicing' },
  { value: 'SCRIPT_WRITER', label: 'Script Writer' },
  { value: 'PRODUCTION_COORDINATOR', label: 'Production Coordinator' },
];

export const BRANCH_OPTIONS = [
  { value: 'KOCHI', label: 'Kochi' },
  { value: 'COIMBATORE', label: 'Coimbatore' },
];

export const FREELANCER_CATEGORY_OPTIONS = [
  { value: 'PHOTOGRAPHER', label: 'Photographer' },
  { value: 'VIDEOGRAPHER', label: 'Videographer' },
  { value: 'CINEMATOGRAPHER', label: 'Cinematographer' },
  { value: 'PRODUCTION_COORDINATOR', label: 'Production Coordinator' },
  { value: 'SCRIPT_WRITER', label: 'Script Writer' },
  { value: 'CAMERA_ASSISTANT', label: 'Camera Assistant' },
  { value: 'PRODUCTION_HEAD', label: 'Production Head' },
];

export const MODEL_GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

export const MODEL_CATEGORY_OPTIONS = [
  { value: 'MODELLING', label: 'Modelling' },
  { value: 'ACTING', label: 'Acting' },
];

export function labelOf(options, value) {
  const match = options.find((o) => o.value === value);
  return match ? match.label : value || '—';
}
