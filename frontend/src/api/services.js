/**
 * API service layer.
 *
 * Every network call in the app goes through one of these functions -- pages
 * never talk to axios directly. Keeps endpoint strings in a single file and
 * gives error handling one place to live.
 */

import api from './axios';

/**
 * Turns a DRF error response into a single readable sentence.
 * DRF returns either {detail: "..."} or {field: ["msg", ...], ...}.
 */
export function extractApiError(error, fallback = 'Something went wrong. Please try again.') {
  const data = error?.response?.data;
  if (!data) {
    return error?.message === 'Network Error'
      ? 'Cannot reach the server. Is the Django API running?'
      : fallback;
  }
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;

  const messages = Object.entries(data).map(([field, value]) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value);
    return field === 'non_field_errors' ? text : `${field.replace(/_/g, ' ')}: ${text}`;
  });
  return messages.length ? messages.join(' ') : fallback;
}

/** Flattens a DRF error body into {field: "message"} for inline form errors. */
export function extractFieldErrors(error) {
  const data = error?.response?.data;
  if (!data || typeof data !== 'object') return {};
  return Object.entries(data).reduce((acc, [field, value]) => {
    acc[field] = Array.isArray(value) ? value.join(' ') : String(value);
    return acc;
  }, {});
}

/** Builds a `?a=1&b=2` string, dropping empty values. */
function query(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.append(key, value);
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/** Generic CRUD set against a DRF router endpoint. */
function crud(resource) {
  return {
    list: (params) => api.get(`/${resource}/${query(params)}`).then((r) => r.data),
    get: (id) => api.get(`/${resource}/${id}/`).then((r) => r.data),
    create: (payload) => api.post(`/${resource}/`, payload).then((r) => r.data),
    update: (id, payload) => api.put(`/${resource}/${id}/`, payload).then((r) => r.data),
    patch: (id, payload) => api.patch(`/${resource}/${id}/`, payload).then((r) => r.data),
    remove: (id) => api.delete(`/${resource}/${id}/`).then((r) => r.data),
  };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const authService = {
  departments: () => api.get('/departments/').then((r) => r.data),
  signup: (payload) => api.post('/signup/', payload).then((r) => r.data),
  login: (email, password) => api.post('/login/', { email, password }).then((r) => r.data),
  logout: (refresh) => api.post('/logout/', { refresh }).then((r) => r.data),
  profile: () => api.get('/profile/').then((r) => r.data),
  updateProfile: (payload) => api.patch('/profile/', payload).then((r) => r.data),
  switchDepartment: (department) =>
    api.post('/switch-department/', { department }).then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Dashboards
// ---------------------------------------------------------------------------
export const dashboardService = {
  /** `endpoint` comes from DEPARTMENT_DASHBOARD_ENDPOINTS. */
  load: (endpoint) => api.get(endpoint).then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Admin user management
// ---------------------------------------------------------------------------
export const userService = {
  ...crud('users'),
  toggleActive: (id) => api.post(`/users/${id}/toggle_active/`).then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Shoot Plan module
// ---------------------------------------------------------------------------
export const shootPlanService = {
  ...crud('shoot-plans'),
  summary: (params) => api.get(`/shoot-plans/summary/${query(params)}`).then((r) => r.data),
};

export const reelService = crud('reels');
export const photoService = crud('photos');
export const photoReferenceLinkService = crud('photo-reference-links');
export const crewService = crud('crew');
export const budgetService = crud('budget-items');
export const reviewService = crud('reviews');

export const feedbackService = {
  ...crud('feedback'),
  summary: (params) => api.get(`/feedback/summary/${query(params)}`).then((r) => r.data),
};

/** Maps a Shoot Plan tab key to the service that owns its rows. */
export const CATEGORY_SERVICES = {
  reels: reelService,
  photos: photoService,
  crew: crewService,
  budget: budgetService,
  review: reviewService,
  feedback: feedbackService,
};

// ---------------------------------------------------------------------------
// Directory: Team, Freelancers, Models, Brands
// ---------------------------------------------------------------------------
export const teamService = crud('team');
export const freelancerService = crud('freelancers');
export const modelService = crud('models');

/** Brand create/update accept multipart so a logo file can ride along. */
export const brandService = {
  list: (params) => api.get(`/brands/${query(params)}`).then((r) => r.data),
  get: (id) => api.get(`/brands/${id}/`).then((r) => r.data),
  create: (formData) =>
    api.post('/brands/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  patch: (id, formData) =>
    api
      .patch(`/brands/${id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data),
  remove: (id) => api.delete(`/brands/${id}/`).then((r) => r.data),
};

/** Model profile create/update accept multipart so a photo file can ride along. */
export const modelPhotoService = {
  ...modelService,
  create: (formData) =>
    api.post('/models/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  patch: (id, formData) =>
    api
      .patch(`/models/${id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Shoot Plan wizard (Phase 2): People & Models, Locations, Props, Reels,
// Photos, Travel -- plus a photo-gallery upload helper shared by all five
// "attach photos to a row" endpoints.
// ---------------------------------------------------------------------------
export const planModelService = crud('plan-models');
export const planLocationService = crud('plan-locations');
export const propService = crud('props');
export const travelExpenseService = crud('travel-expenses');

/** One multipart POST per file; `parentField` is the FK name the gallery expects (e.g. 'plan_model'). */
function galleryService(resource, parentField) {
  return {
    list: (parentId) => api.get(`/${resource}/?${parentField}=${parentId}`).then((r) => r.data),
    upload: (parentId, file, extra = {}) => {
      const data = new FormData();
      data.append(parentField, parentId);
      data.append('image', file);
      Object.entries(extra).forEach(([k, v]) => data.append(k, v));
      return api
        .post(`/${resource}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } })
        .then((r) => r.data);
    },
    remove: (id) => api.delete(`/${resource}/${id}/`).then((r) => r.data),
  };
}

export const planModelPhotoService = galleryService('plan-model-photos', 'plan_model');
export const planLocationPhotoService = galleryService('plan-location-photos', 'plan_location');
export const propPhotoService = galleryService('prop-photos', 'prop');
export const reelPhotoService = galleryService('reel-photos', 'reel');
export const photoBriefImageService = galleryService('photo-brief-images', 'photo');
