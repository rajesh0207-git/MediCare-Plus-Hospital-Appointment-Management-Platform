import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  FolderHeart, Plus, FileDown, FlaskConical, Stethoscope, 
  AlertCircle, ChevronRight, Upload, Calendar 
} from 'lucide-react';

const MedicalRecords = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Upload Form State
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: '',
    record_type: 'PRESCRIPTION',
    file_path: 'uploads/records/my_report.pdf', // Mock upload file path
    notes: ''
  });
  const [uploading, setUploading] = useState(false);

  const fetchData = async () => {
    try {
      const [recRes, labRes, apptRes] = await Promise.all([
        api.get('/medical-records'),
        api.get('/lab-tests'),
        api.get('/appointments')
      ]);
      setRecords(recRes.data);
      setLabTests(labRes.data);
      setAppointments(apptRes.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load medical file database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUploadRecord = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    
    setUploading(true);
    setError('');
    try {
      await api.post('/medical-records', {
        ...uploadData,
        patient_id: user.id
      });
      setUploadOpen(false);
      setUploadData({
        title: '',
        record_type: 'PRESCRIPTION',
        file_path: 'uploads/records/my_report.pdf',
        notes: ''
      });
      fetchData(); // Refresh list
    } catch (err) {
      console.error(err);
      setError("Failed to upload medical record.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadPrescription = async (prescId) => {
    try {
      const response = await api.get(`/appointments/prescriptions/${prescId}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `prescription_${prescId}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert("Failed to download prescription PDF.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const completedAppointments = appointments.filter(a => a.status === 'COMPLETED');

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FolderHeart className="w-6 h-6 text-teal-400" />
            <span>Health Repository & Medical Records</span>
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">Access history of lab tests, custom documents, and clinical prescriptions.</p>
        </div>
        <button
          onClick={() => setUploadOpen(!uploadOpen)}
          className="py-2 px-3.5 bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-lg shadow-teal-500/10"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Record</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Form Panel (Collapsible) */}
      {uploadOpen && (
        <form onSubmit={handleUploadRecord} className="glass-panel border-teal-500/20 rounded-2xl p-6 max-w-lg space-y-4 animate-fade-in">
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <Upload className="w-4 h-4 text-teal-400" />
            <span>Upload Medical File</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-slate-300 text-xs mb-1">Record Title</label>
              <input
                type="text"
                placeholder="e.g. ECG Report June 2026"
                value={uploadData.title}
                onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 text-xs mb-1">Record Type</label>
                <select
                  value={uploadData.record_type}
                  onChange={(e) => setUploadData({ ...uploadData, record_type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                >
                  <option value="PRESCRIPTION">Prescription</option>
                  <option value="LAB_RESULT">Lab Result</option>
                  <option value="IMAGING">Imaging (X-Ray, MRI)</option>
                  <option value="OTHER">Other Report</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-xs mb-1">Mock File Path / URL</label>
                <input
                  type="text"
                  placeholder="uploads/records/report.pdf"
                  value={uploadData.file_path}
                  onChange={(e) => setUploadData({ ...uploadData, file_path: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-xs mb-1">Notes / Description</label>
              <textarea
                placeholder="Diagnostic impressions or clinical remarks"
                rows="2.5"
                value={uploadData.notes}
                onChange={(e) => setUploadData({ ...uploadData, notes: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => setUploadOpen(false)}
              className="py-1.5 px-3 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg text-xs hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="py-1.5 px-3 bg-teal-500 hover:bg-teal-600 text-slate-950 rounded-lg text-xs font-semibold"
            >
              {uploading ? 'Uploading...' : 'Save File'}
            </button>
          </div>
        </form>
      )}

      {/* Grid: Prescriptions, Lab Tests, Custom Uploads */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 1. Official Prescriptions */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Stethoscope className="w-4.5 h-4.5 text-teal-400" />
            <span>Doctor Prescriptions</span>
          </h3>

          <div className="space-y-3">
            {completedAppointments.length === 0 ? (
              <div className="glass-panel rounded-2xl p-5 border-slate-800/40 text-center text-slate-500 text-xs">
                No issued prescriptions found.
              </div>
            ) : (
              completedAppointments.map((appt) => (
                <div key={appt.id} className="glass-panel rounded-2xl border-slate-800/50 p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-bold text-xs">Dr. {appt.doctor?.user?.email.split('@')[0].toUpperCase()}</h4>
                      <p className="text-[10px] text-slate-500">Visit Date: {appt.appointment_date}</p>
                    </div>
                    {appt.prescription?.id && (
                      <button
                        onClick={() => handleDownloadPrescription(appt.prescription.id)}
                        className="p-1.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 hover:bg-teal-500 hover:text-slate-950 rounded-lg transition-colors"
                        title="Download formal PDF"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  
                  {appt.consultation && (
                    <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3 text-xs text-slate-300 space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-500">Consultation Notes:</p>
                      <p className="italic">"{appt.consultation.doctor_notes}"</p>
                      {appt.consultation.prescription_text && (
                        <>
                          <div className="border-t border-slate-900/60 my-1.5"></div>
                          <p className="text-[10px] font-bold text-teal-500">Medications:</p>
                          <p className="font-mono text-slate-200">{appt.consultation.prescription_text}</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 2. Requested Lab & Tests */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <FlaskConical className="w-4.5 h-4.5 text-cyan-400" />
            <span>Lab Test Requests</span>
          </h3>

          <div className="space-y-3">
            {labTests.length === 0 ? (
              <div className="glass-panel rounded-2xl p-5 border-slate-800/40 text-center text-slate-500 text-xs">
                No requested lab tests.
              </div>
            ) : (
              labTests.map((test) => (
                <div key={test.id} className="glass-panel rounded-2xl border-slate-800/50 p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-bold text-xs">{test.test_name}</h4>
                      <p className="text-[10px] text-slate-500">Request ID: #LAB-0{test.id}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                      test.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {test.status}
                    </span>
                  </div>

                  {test.status === 'COMPLETED' && test.result_text && (
                    <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3 text-xs text-slate-300 space-y-1">
                      <p className="text-[10px] font-bold text-slate-500">Diagnostic Result:</p>
                      <p>{test.result_text}</p>
                      {test.file_path && (
                        <p className="text-[10px] text-teal-400 font-mono mt-1 mt-1.5">Attached: {test.file_path}</p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. Custom Uploaded Files */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <FolderHeart className="w-4.5 h-4.5 text-violet-400" />
            <span>Custom Records Vault</span>
          </h3>

          <div className="space-y-3">
            {records.length === 0 ? (
              <div className="glass-panel rounded-2xl p-5 border-slate-800/40 text-center text-slate-500 text-xs">
                No uploaded records.
              </div>
            ) : (
              records.map((rec) => (
                <div key={rec.id} className="glass-panel rounded-2xl border-slate-800/50 p-4 space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-bold text-xs">{rec.title}</h4>
                      <span className="text-[8px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold">
                        {rec.record_type}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-500">#REC-0{rec.id}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/20 p-2.5 rounded-xl border border-slate-900/60">
                    {rec.notes && <p className="mb-1">"{rec.notes}"</p>}
                    <p className="font-mono text-[9px] text-slate-500">Path: {rec.file_path}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default MedicalRecords;
