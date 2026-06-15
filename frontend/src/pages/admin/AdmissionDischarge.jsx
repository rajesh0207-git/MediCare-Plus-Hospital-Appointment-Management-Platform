import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getAdmissionStats, listAdmissions, admitPatient, dischargePatient,
  downloadDischargeReport, getAdmissionHistory
} from '../../services/admissionApi';
import { listBeds } from '../../services/bedManagementApi';
import {
  BedSingle, UserPlus, LogOut, FileText, Calendar, AlertCircle,
  CheckCircle, Clock, X, Search, Download, Eye, History
} from 'lucide-react';

const ADMISSION_TYPES = ['EMERGENCY', 'ELECTIVE', 'REFERRAL', 'TRANSFER'];
const DISCHARGE_STATUSES = ['RECOVERED', 'REFERRED', 'AMA', 'DECEASED'];

const AdmissionDischarge = () => {
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';
  const isStaff = role === 'ADMIN' || role === 'DOCTOR';

  const [stats, setStats] = useState(null);
  const [admissions, setAdmissions] = useState([]);
  const [history, setHistory] = useState([]);
  const [beds, setBeds] = useState([]);     
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('admitted');

  // Modals
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState(null);

  // Forms
  const [admitForm, setAdmitForm] = useState({
    patient_id: '', bed_id: '', admission_type: 'EMERGENCY', diagnosis: '', admission_notes: '', insurance_id: '', estimated_discharge_date: ''
  });
  const [dischargeForm, setDischargeForm] = useState({
    discharge_status: 'RECOVERED', discharge_summary: '', discharge_medication: '', followup_instructions: '', followup_date: ''
  });

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching admission data...');
      const [statsRes, admittedRes, historyRes, bedsRes] = await Promise.all([
        getAdmissionStats(),
        listAdmissions('ADMITTED'),
        getAdmissionHistory(null, 50),
        listBeds(null, 'AVAILABLE')  // Fetch only available beds
      ]);
      
      console.log('Stats:', statsRes.data);
      console.log('Admitted count:', admittedRes.data?.length);
      console.log('History count:', historyRes.data?.length);
      console.log('Available beds:', bedsRes.data?.length);
      
      setStats(statsRes.data);
      setAdmissions(Array.isArray(admittedRes.data) ? admittedRes.data : []);
      setHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
      setBeds(Array.isArray(bedsRes.data) ? bedsRes.data : []);
    } catch (err) {
      console.error('Failed to load admission data:', err);
      console.error('Error response:', err.response?.data);
      const errorMsg = err.response?.data?.detail 
        ? (typeof err.response.data.detail === 'string' 
            ? err.response.data.detail 
            : Array.isArray(err.response.data.detail)
              ? err.response.data.detail.map(e => e.msg || e.message || JSON.stringify(e)).join(', ')
              : JSON.stringify(err.response.data.detail))
        : (err.message || 'Failed to load admission data.');
      setError(errorMsg);
      setAdmissions([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleAdmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = {
        patient_id: parseInt(admitForm.patient_id),
        admission_type: admitForm.admission_type
      };
      if (admitForm.bed_id && admitForm.bed_id.trim() !== '') {
        data.bed_id = parseInt(admitForm.bed_id);
      }
      if (admitForm.diagnosis) data.diagnosis = admitForm.diagnosis;
      if (admitForm.admission_notes) data.admission_notes = admitForm.admission_notes;
      if (admitForm.insurance_id && admitForm.insurance_id.trim() !== '') {
        data.insurance_id = parseInt(admitForm.insurance_id);
      }
      if (admitForm.estimated_discharge_date && admitForm.estimated_discharge_date.trim() !== '') {
        data.estimated_discharge_date = new Date(admitForm.estimated_discharge_date).toISOString();
      }
      console.log('Submitting admission:', data);
      await admitPatient(data);
      setShowAdmitModal(false);
      setAdmitForm({ patient_id: '', bed_id: '', admission_type: 'EMERGENCY', diagnosis: '', admission_notes: '', insurance_id: '', estimated_discharge_date: '' });
      fetchAll();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to admit patient.');
    }
  };

  const handleDischarge = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = {
        discharge_status: dischargeForm.discharge_status
      };
      if (dischargeForm.discharge_summary) data.discharge_summary = dischargeForm.discharge_summary;
      if (dischargeForm.discharge_medication) data.discharge_medication = dischargeForm.discharge_medication;
      if (dischargeForm.followup_instructions) data.followup_instructions = dischargeForm.followup_instructions;
      if (dischargeForm.followup_date && dischargeForm.followup_date.trim() !== '') {
        data.followup_date = new Date(dischargeForm.followup_date).toISOString();
      }
      console.log('Submitting discharge:', data);
      await dischargePatient(selectedAdmission.id, data);
      setShowDischargeModal(false);
      setSelectedAdmission(null);
      setDischargeForm({ discharge_status: 'RECOVERED', discharge_summary: '', discharge_medication: '', followup_instructions: '', followup_date: '' });
      fetchAll();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to discharge patient.');
    }
  };

  const handleDownloadReport = async (id) => {
    try {
      await downloadDischargeReport(id);
    } catch (err) {
      setError('Failed to download discharge report.');
    }
  };

  const openDischarge = (admission) => {
    setSelectedAdmission(admission);
    setShowDischargeModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BedSingle className="w-6 h-6 text-teal-400" />
            Patient Admission & Discharge
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">Admit patients, manage discharges, and view admission history.</p>
        </div>
        {isStaff && (
          <button onClick={() => setShowAdmitModal(true)} className="py-2 px-3.5 bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5">
            <UserPlus className="w-4 h-4" /> Admit Patient
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-rose-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Admissions', value: stats.total_admissions, color: 'text-blue-400' },
            { label: 'Currently Admitted', value: stats.currently_admitted, color: 'text-amber-400' },
            { label: 'Discharged Today', value: stats.discharged_today, color: 'text-emerald-400' },
            { label: 'Avg Stay (Days)', value: stats.average_stay_days, color: 'text-violet-400' },
          ].map((s, i) => (
            <div key={i} className="glass-panel rounded-2xl border border-slate-800 p-4 text-center">
              <p className="text-slate-400 text-[10px] uppercase font-semibold tracking-wider">{s.label}</p>
              <p className={`text-2xl font-extrabold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900/50 rounded-xl p-1 border border-slate-800 w-fit">
        {[
          { id: 'admitted', label: 'Currently Admitted', icon: BedSingle },
          { id: 'history', label: 'Admission History', icon: History },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === tab.id ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
          >
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* CURRENTLY ADMITTED */}
      {activeTab === 'admitted' && (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          {admissions.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">No patients currently admitted.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                    <th className="px-5 py-3">Patient</th>
                    <th className="px-5 py-3">Bed / Ward</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Diagnosis</th>
                    <th className="px-5 py-3">Admitted</th>
                    <th className="px-5 py-3">Stay (Days)</th>
                    {isStaff && <th className="px-5 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {admissions.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-900/25 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-white font-semibold">{a.patient_name}</p>
                        <p className="text-slate-500 text-[10px]">ID: {a.patient_id} | {a.patient_gender}, {a.patient_age || 'N/A'}</p>
                      </td>
                      <td className="px-5 py-3 text-slate-300">
                        {a.bed_number ? <><span className="font-bold">{a.bed_number}</span> <span className="text-slate-500">- {a.ward_name}</span></> : <span className="text-slate-500">No bed assigned</span>}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          a.admission_type === 'EMERGENCY' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' :
                          a.admission_type === 'ELECTIVE' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                          'text-slate-400 bg-slate-500/10 border-slate-500/20'
                        }`}>{a.admission_type}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-400 max-w-[150px] truncate">{a.diagnosis || '-'}</td>
                      <td className="px-5 py-3 text-slate-400">{new Date(a.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-teal-400 font-bold">{a.length_of_stay_days || 0}</td>
                      {isStaff && (
                        <td className="px-5 py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button onClick={() => openDischarge(a)} className="p-1.5 text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all" title="Discharge">
                              <LogOut className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ADMISSION HISTORY */}
      {activeTab === 'history' && (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          {history.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">No admission history found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                    <th className="px-5 py-3">Patient</th>
                    <th className="px-5 py-3">Bed / Ward</th>
                    <th className="px-5 py-3">Admitted</th>
                    <th className="px-5 py-3">Discharged</th>
                    <th className="px-5 py-3">Stay (Days)</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Discharge Reason</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {history.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-900/25 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-white font-semibold">{a.patient_name}</p>
                        <p className="text-slate-500 text-[10px]">ID: {a.patient_id}</p>
                      </td>
                      <td className="px-5 py-3 text-slate-300">{a.bed_number || '-'} {a.ward_name ? `- ${a.ward_name}` : ''}</td>
                      <td className="px-5 py-3 text-slate-400">{new Date(a.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-slate-400">{a.actual_discharge_date ? new Date(a.actual_discharge_date).toLocaleDateString() : '-'}</td>
                      <td className="px-5 py-3 text-teal-400 font-bold">{a.length_of_stay_days || 0}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          a.status === 'ADMITTED' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                          'text-slate-400 bg-slate-500/10 border-slate-500/20'
                        }`}>{a.status}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-400 max-w-[120px] truncate">{a.discharge_status || '-'}</td>
                      <td className="px-5 py-3 text-right">
                        {a.status === 'DISCHARGED' && (
                          <button onClick={() => handleDownloadReport(a.id)} className="p-1.5 text-teal-400 hover:bg-teal-500/10 rounded-lg transition-all" title="Download Report">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ADMIT MODAL */}
      {showAdmitModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 overflow-y-auto" style={{ backgroundColor: 'rgba(2, 6, 23, 0.95)' }}>
          <div className="relative w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5 animate-fade-in" style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-700">
              <h3 className="text-white font-bold text-sm flex items-center gap-2"><UserPlus className="w-4 h-4 text-teal-400" /> Admit Patient</h3>
              <button onClick={() => setShowAdmitModal(false)} className="text-slate-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleAdmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 text-[10px] font-semibold mb-1">Patient ID</label>
                  <input type="number" placeholder="e.g. 1" value={admitForm.patient_id} onChange={(e) => setAdmitForm({ ...admitForm, patient_id: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500" required min="1" />
                </div>
                <div>
                  <label className="block text-slate-300 text-[10px] font-semibold mb-1">Admission Type</label>
                  <select value={admitForm.admission_type} onChange={(e) => setAdmitForm({ ...admitForm, admission_type: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500">
                    {ADMISSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-300 text-[10px] font-semibold mb-1">Assign Bed (optional)</label>
                <select value={admitForm.bed_id} onChange={(e) => setAdmitForm({ ...admitForm, bed_id: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500">
                  <option value="">-- No Bed Assigned --</option>
                  {beds.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.bed_number} - {b.ward_name} ({b.bed_type}, ${b.daily_rate}/day)
                    </option>
                  ))}
                </select>
                <p className="text-slate-500 text-[9px] mt-1">Select a bed to automatically create a bed assignment</p>
              </div>
              <div>
                <label className="block text-slate-300 text-[10px] font-semibold mb-1">Diagnosis</label>
                <input type="text" placeholder="Primary diagnosis" value={admitForm.diagnosis} onChange={(e) => setAdmitForm({ ...admitForm, diagnosis: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500" />
              </div>
              <div>
                <label className="block text-slate-300 text-[10px] font-semibold mb-1">Admission Notes</label>
                <textarea placeholder="Reason for admission, initial observations..." value={admitForm.admission_notes} onChange={(e) => setAdmitForm({ ...admitForm, admission_notes: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500" rows="2" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 text-[10px] font-semibold mb-1">Insurance ID (optional)</label>
                  <input type="number" placeholder="Policy ID" value={admitForm.insurance_id} onChange={(e) => setAdmitForm({ ...admitForm, insurance_id: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500" min="1" />
                </div>
                <div>
                  <label className="block text-slate-300 text-[10px] font-semibold mb-1">Est. Discharge Date</label>
                  <input type="date" value={admitForm.estimated_discharge_date} onChange={(e) => setAdmitForm({ ...admitForm, estimated_discharge_date: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500" />
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-xl text-xs transition-all">Confirm Admission</button>
            </form>
          </div>
        </div>
      )}

      {/* DISCHARGE MODAL */}
      {showDischargeModal && selectedAdmission && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 overflow-y-auto" style={{ backgroundColor: 'rgba(2, 6, 23, 0.95)' }}>
          <div className="relative w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5 animate-fade-in" style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-700">
              <h3 className="text-white font-bold text-sm flex items-center gap-2"><LogOut className="w-4 h-4 text-amber-400" /> Discharge Patient</h3>
              <button onClick={() => { setShowDischargeModal(false); setSelectedAdmission(null); }} className="text-slate-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-3 rounded-xl border" style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderColor: '#334155' }}>
              <p className="text-white font-semibold text-sm">{selectedAdmission.patient_name}</p>
              <p className="text-slate-300 text-xs mt-1">Bed: {selectedAdmission.bed_number || 'N/A'} | Ward: {selectedAdmission.ward_name || 'N/A'} | Stay: {selectedAdmission.length_of_stay_days || 0} days</p>
            </div>
            <form onSubmit={handleDischarge} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-[10px] font-semibold mb-1">Discharge Status</label>
                <select value={dischargeForm.discharge_status} onChange={(e) => setDischargeForm({ ...dischargeForm, discharge_status: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500">
                  {DISCHARGE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-300 text-[10px] font-semibold mb-1">Discharge Summary</label>
                <textarea placeholder="Patient condition at discharge, treatment summary..." value={dischargeForm.discharge_summary} onChange={(e) => setDischargeForm({ ...dischargeForm, discharge_summary: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500" rows="2" required />
              </div>
              <div>
                <label className="block text-slate-300 text-[10px] font-semibold mb-1">Discharge Medications</label>
                <textarea placeholder="Medications to continue at home..." value={dischargeForm.discharge_medication} onChange={(e) => setDischargeForm({ ...dischargeForm, discharge_medication: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500" rows="2" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 text-[10px] font-semibold mb-1">Follow-up Date</label>
                  <input type="date" value={dischargeForm.followup_date} onChange={(e) => setDischargeForm({ ...dischargeForm, followup_date: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500" />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 text-[10px] font-semibold mb-1">Follow-up Instructions</label>
                <textarea placeholder="Diet, activity restrictions, warning signs..." value={dischargeForm.followup_instructions} onChange={(e) => setDischargeForm({ ...dischargeForm, followup_instructions: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500" rows="2" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-all">Confirm Discharge & Generate Report</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdmissionDischarge;
