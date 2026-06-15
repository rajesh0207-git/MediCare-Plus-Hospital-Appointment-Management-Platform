import api from './api';

const BASE = '/health-tracker';

// ── Weight ────────────────────────────────────────────
export const addWeight    = (data)   => api.post(`${BASE}/weight`, data);
export const getWeights   = (limit = 50) => api.get(`${BASE}/weight?limit=${limit}`);
export const deleteWeight = (id)    => api.delete(`${BASE}/weight/${id}`);

// ── Height ────────────────────────────────────────────
export const addHeight    = (data)   => api.post(`${BASE}/height`, data);
export const getHeights   = (limit = 50) => api.get(`${BASE}/height?limit=${limit}`);
export const deleteHeight = (id)    => api.delete(`${BASE}/height/${id}`);

// ── Blood Pressure ────────────────────────────────────
export const addBP    = (data)   => api.post(`${BASE}/blood-pressure`, data);
export const getBPs   = (limit = 50) => api.get(`${BASE}/blood-pressure?limit=${limit}`);
export const deleteBP = (id)    => api.delete(`${BASE}/blood-pressure/${id}`);

// ── Sugar Level ───────────────────────────────────────
export const addSugar    = (data)   => api.post(`${BASE}/sugar`, data);
export const getSugars   = (limit = 50) => api.get(`${BASE}/sugar?limit=${limit}`);
export const deleteSugar = (id)    => api.delete(`${BASE}/sugar/${id}`);

// ── Summary ───────────────────────────────────────────
export const getHealthSummary = () => api.get(`${BASE}/summary`);
