import api from './api';

// Patient: Submit feedback
export const submitFeedback = (data) => api.post('/feedback', data);

// Patient/Admin: List feedback
export const listFeedback = (params = {}) => api.get('/feedback', { params });

// Patient/Admin: Get single feedback
export const getFeedback = (id) => api.get(`/feedback/${id}`);

// Admin: Respond to feedback
export const respondToFeedback = (id, data) => api.post(`/feedback/${id}/respond`, data);

// Admin/Doctor: Get analytics
export const getFeedbackAnalytics = (days = 90) => api.get('/feedback/analytics/summary', { params: { days } });

// Admin: Get satisfaction report
export const getSatisfactionReport = (days = 30) => api.get('/feedback/analytics/satisfaction-report', { params: { days } });
