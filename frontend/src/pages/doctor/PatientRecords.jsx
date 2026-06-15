import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { 
  FolderHeart, FlaskConical, FileText, CheckCircle, Clock, 
  AlertCircle, ChevronRight, Upload, Sparkles, User 
} from 'lucide-react';

const PatientRecords = () => {
  const [labTests, setLabTests] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Lab Result Modal State
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [activeTest, setActiveTest] = useState(null);
  const [resultData, setResultData] = useState({
    result_text: '',
    file_path: 'uploads/lab_results/report_lab.pdf'
  });
  const [submittingResult, setSubmittingResult] = useState(false);

  const fetchData = async () => {
    try {
      const [labRes, recordsRes] = await Promise.all([
        api.get('/lab-tests'),
        api.get('/medical-records')
      ]);
      setLabTests(labRes.data);
      setMedicalRecords(recordsRes.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch medical registry records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenUploadResult = (test) => {
    setActiveTest(test);
    setResultData({
      result_text: '',
      file_path: `uploads/lab_results/report_lab_${test.id}.pdf`
    });
    setResultModalOpen(true);
  };

  const handleSubmitResult = async (e) => {
    e.preventDefault();
    if (!activeTest) return;

    setSubmittingResult(true);
    setError('');
    try {
      await api.post(`/lab-tests/${activeTest.id}/results`, resultData);
      setResultModalOpen(false);
      fetchData(); // Reload list
      alert("Lab result uploaded and logged into patient's medical records successfully.");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to submit lab results.");
    } finally {
      setSubmittingResult(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-teal-400" />
            <span>Diagnostics Hub & Patient Records</span>
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">Fulfill outstanding laboratory test directives and audit medical files.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Lab Tests Queue & Medical History Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Lab test requests queue */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <FlaskConical className="w-4.5 h-4.5 text-cyan-400" />
            <span>Active Diagnostics Requests</span>
          </h3>

          <div className="space-y-3">
            {labTests.length === 0 ? (
              <div className="glass-panel rounded-2xl p-5 border-slate-800/40 text-center text-slate-500 text-xs">
                No active laboratory orders.
              </div>
            ) : (
              labTests.map((test) => (
                <div key={test.id} className="glass-panel rounded-2xl border-slate-800/50 p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-bold text-sm">{test.test_name}</h4>
                      <p className="text-slate-400 text-xs mt-1">Patient: {test.patient?.full_name || 'John Doe'}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Test ID: #LAB-0{test.id}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold ${
                      test.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {test.status}
                    </span>
                  </div>

                  {test.status === 'PENDING' ? (
                    <button
                      onClick={() => handleOpenUploadResult(test)}
                      className="w-full py-1.5 bg-cyan-500/10 hover:bg-cyan-500 hover:text-slate-950 text-cyan-400 text-xs font-semibold rounded-lg border border-cyan-500/25 hover:border-cyan-500 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Result Report</span>
                    </button>
                  ) : (
                    <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3 text-xs text-slate-300 space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-500">Report Summary:</p>
                      <p className="italic">"{test.result_text}"</p>
                      {test.file_path && (
                        <p className="text-[10px] text-teal-400 font-mono">File: {test.file_path}</p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Patient records history search */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <FolderHeart className="w-4.5 h-4.5 text-violet-400" />
            <span>Health Records Auditing</span>
          </h3>

          <div className="space-y-3">
            {medicalRecords.length === 0 ? (
              <div className="glass-panel rounded-2xl p-5 border-slate-800/40 text-center text-slate-500 text-xs">
                No associated patient documents.
              </div>
            ) : (
              medicalRecords.map((rec) => (
                <div key={rec.id} className="glass-panel rounded-2xl border-slate-800/50 p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-bold text-xs">{rec.title}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Patient ID: #{rec.patient_id} | Type: {rec.record_type}</p>
                    </div>
                    <span className="text-[9px] text-slate-500">#REC-0{rec.id}</span>
                  </div>
                  
                  <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/20 p-2.5 rounded-xl border border-slate-900/60 space-y-1">
                    {rec.notes && <p className="italic">"{rec.notes}"</p>}
                    <p className="font-mono text-[9px] text-slate-500">Document URL: {rec.file_path}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Upload Lab Result Modal */}
      {resultModalOpen && activeTest && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl p-6 shadow-2xl space-y-5 border border-slate-800 animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-white font-bold text-sm">Upload Laboratory Findings</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Test Ordered: {activeTest.test_name}</p>
              </div>
              <button 
                onClick={() => setResultModalOpen(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitResult} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1">Observation Findings</label>
                <textarea
                  placeholder="Summarize diagnostic results, measurements, and clinical significance..."
                  rows="3.5"
                  value={resultData.result_text}
                  onChange={(e) => setResultData({ ...resultData, result_text: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1">Mock File Path / Report PDF URL</label>
                <input
                  type="text"
                  value={resultData.file_path}
                  onChange={(e) => setResultData({ ...resultData, file_path: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500 font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submittingResult}
                className="w-full py-2.5 px-4 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition-all"
              >
                {submittingResult ? 'Publishing Report...' : 'Publish Findings & Settle Order'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientRecords;
