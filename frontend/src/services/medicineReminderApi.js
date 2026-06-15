import api from './api';

const BASE = '/medicine-reminders';

// ── Reminders CRUD ─────────────────────────────────────────────────────────
export const createReminder   = (data)         => api.post(BASE, data);
export const listReminders    = (activeOnly = false) => api.get(`${BASE}?active_only=${activeOnly}`);
export const getReminder      = (id)           => api.get(`${BASE}/${id}`);
export const updateReminder   = (id, data)     => api.patch(`${BASE}/${id}`, data);
export const deleteReminder   = (id)           => api.delete(`${BASE}/${id}`);

// ── History / Mark as Taken ────────────────────────────────────────────────
export const logMedicineTaken = (reminderId, scheduledDate, scheduledTime, data) =>
  api.post(`${BASE}/${reminderId}/log?scheduled_date=${scheduledDate}&scheduled_time=${scheduledTime}`, data);

export const getTodayReminders  = () => api.get(`${BASE}/history/today`);
export const getAllHistory       = (limit = 100) => api.get(`${BASE}/history/all?limit=${limit}`);
