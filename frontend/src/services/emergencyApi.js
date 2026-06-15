import api from './api';

const BASE = '/emergency';

// Create emergency request
export const createEmergencyRequest = (data) => api.post(BASE, data);

// List emergency requests (with optional filters)
export const listEmergencyRequests = (status = null, priority = null) => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (priority) params.append('priority', priority);
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return api.get(`${BASE}${queryString}`);
};

// Get specific emergency request
export const getEmergencyRequest = (id) => api.get(`${BASE}/${id}`);

// Dispatch emergency team
export const dispatchEmergencyTeam = (id, data) => api.post(`${BASE}/${id}/dispatch`, data);

// Update emergency request
export const updateEmergencyRequest = (id, data) => api.put(`${BASE}/${id}`, data);

// Cancel emergency request
export const cancelEmergencyRequest = (id, reason) => api.post(`${BASE}/${id}/cancel?reason=${encodeURIComponent(reason)}`);

// Get emergency statistics
export const getEmergencyStats = () => api.get(`${BASE}/stats/summary`);
