import api from './api';

const BASE = '/bed-management';

// Dashboard Stats
export const getBedStats = () => api.get(`${BASE}/stats`);

// Ward Management
export const listWards = () => api.get(`${BASE}/wards`);
export const createWard = (data) => api.post(`${BASE}/wards`, data);
export const updateWard = (wardId, data) => api.put(`${BASE}/wards/${wardId}`, data);
export const deleteWard = (wardId) => api.delete(`${BASE}/wards/${wardId}`);

// Bed Management
export const listBeds = (wardId = null, status = null) => {
  const params = new URLSearchParams();
  if (wardId) params.append('ward_id', wardId);
  if (status) params.append('status_filter', status);
  return api.get(`${BASE}/beds?${params.toString()}`);
};
export const createBed = (data) => api.post(`${BASE}/beds`, data);
export const updateBed = (bedId, data) => api.put(`${BASE}/beds/${bedId}`, data);
export const deleteBed = (bedId) => api.delete(`${BASE}/beds/${bedId}`);

// Bed Assignments
export const listAssignments = (status = null) => {
  const params = status ? `?status_filter=${status}` : '';
  return api.get(`${BASE}/assignments${params}`);
};
export const assignBed = (data) => api.post(`${BASE}/assignments`, data);
export const dischargePatient = (assignmentId, data = {}) => api.post(`${BASE}/assignments/${assignmentId}/discharge`, data);
export const transferPatient = (assignmentId, data) => api.post(`${BASE}/assignments/${assignmentId}/transfer`, data);
