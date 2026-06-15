import api from './api';

const BASE = '/admissions';

// Dashboard Stats
export const getAdmissionStats = () => api.get(`${BASE}/stats`);

// Admissions List & Detail
export const listAdmissions = (status = null, patientId = null) => {
  const params = new URLSearchParams();
  if (status) params.append('status_filter', status);
  if (patientId) params.append('patient_id', patientId);
  const query = params.toString();
  return api.get(query ? `${BASE}?${query}` : BASE);
};

export const getAdmission = (id) => api.get(`${BASE}/${id}`);

// Admit Patient
export const admitPatient = (data) => api.post(BASE, data);

// Discharge Patient
export const dischargePatient = (admissionId, data) => api.post(`${BASE}/${admissionId}/discharge`, data);

// Download Discharge Report
export const downloadDischargeReport = async (admissionId) => {
  const response = await api.get(`${BASE}/${admissionId}/download-report`, {
    responseType: 'blob'
  });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `discharge_report_${admissionId}.pdf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Admission History
export const getAdmissionHistory = (patientId = null, limit = 50) => {
  const params = new URLSearchParams();
  if (patientId) params.append('patient_id', patientId);
  params.append('limit', limit);
  const query = params.toString();
  return api.get(`${BASE}/history?${query}`);
};
