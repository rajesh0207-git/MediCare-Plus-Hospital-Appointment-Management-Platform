import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { 
  Calendar, ClipboardCheck, User, Stethoscope, FileText, 
  FlaskConical, CreditCard, AlertCircle, Check, X, ShieldAlert,
  Video, Play, Film, Shield
} from 'lucide-react';

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Video Session states
  const [videoHistory, setVideoHistory] = useState([]);
  const [videoLoading, setVideoLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [playbackOpen, setPlaybackOpen] = useState(false);
  
  // Consultation Modal State
  const [consultModalOpen, setConsultModalOpen] = useState(false);
  const [activeAppt, setActiveAppt] = useState(null);

  
  // 1. Consultation Notes State
  const [consultData, setConsultData] = useState({
    consultation_type: 'ONLINE',
    doctor_notes: '',
    prescription_text: ''
  });
  
  // 2. Formal Prescription State
  const [prescData, setPrescData] = useState({
    medications: [{ name: '', dosage: '', frequency: '', duration: '' }],
    instructions: ''
  });
  
  // 3. Invoice State
  const [invoiceData, setInvoiceData] = useState({
    amount: '150.00',
    tax: '15.00',
    discount: '0.00'
  });

  // 4. Lab Test State
  const [labTestName, setLabTestName] = useState('');

  const [activeStep, setActiveStep] = useState(1); // 1: Notes, 2: Prescription, 3: Invoice, 4: Lab Test
  const [submitting, setSubmitting] = useState(false);

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/appointments');
      setAppointments(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load appointments registry.");
    } finally {
      setLoading(false);
    }
  };

  const fetchVideoHistory = async () => {
    try {
      const res = await api.get('/appointments/video-sessions/history');
      setVideoHistory(res.data);
    } catch (err) {
      console.error("Failed to load video history:", err);
    } finally {
      setVideoLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchVideoHistory();
  }, []);


  const handleUpdateStatus = async (apptId, status) => {
    try {
      await api.post(`/appointments/${apptId}/status`, { status });
      fetchAppointments();
    } catch (err) {
      alert("Failed to update status: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleCancelAppointment = async (apptId) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      await api.post(`/appointments/${apptId}/cancel`);
      fetchAppointments();
    } catch (err) {
      alert("Failed to cancel appointment: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleOpenConsultation = (appt) => {
    setActiveAppt(appt);
    setConsultData({
      consultation_type: 'ONLINE',
      doctor_notes: '',
      prescription_text: ''
    });
    setPrescData({
      medications: [{ name: '', dosage: '', frequency: '', duration: '' }],
      instructions: ''
    });
    setInvoiceData({
      amount: appt.doctor?.consultation_fee?.toString() || '150.00',
      tax: '12.50',
      discount: '0.00'
    });
    setLabTestName('');
    setActiveStep(1);
    setConsultModalOpen(true);
  };

  // Step 1: Submit consultation notes
  const handleSubmitNotes = async () => {
    if (!activeAppt) return;
    setSubmitting(true);
    try {
      await api.post(`/appointments/${activeAppt.id}/consultation`, consultData);
      fetchAppointments(); // Update list status to completed
      setActiveStep(2); // Go to formal prescription step
    } catch (err) {
      alert("Notes submission failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: Submit formal prescription
  const handleMedicationChange = (index, field, value) => {
    const updatedMeds = [...prescData.medications];
    updatedMeds[index][field] = value;
    setPrescData({ ...prescData, medications: updatedMeds });
  };

  const addMedicationRow = () => {
    setPrescData({
      ...prescData,
      medications: [...prescData.medications, { name: '', dosage: '', frequency: '', duration: '' }]
    });
  };

  const removeMedicationRow = (index) => {
    const updated = prescData.medications.filter((_, i) => i !== index);
    setPrescData({ ...prescData, medications: updated });
  };

  const handleSubmitPrescription = async () => {
    if (!activeAppt) return;
    setSubmitting(true);
    try {
      // Filter out empty medications
      const validMeds = prescData.medications.filter(m => m.name.trim() !== '');
      if (validMeds.length > 0) {
        await api.post(`/appointments/${activeAppt.id}/prescription`, {
          medications: validMeds,
          instructions: prescData.instructions
        });
      }
      setActiveStep(3); // Go to billing invoice step
    } catch (err) {
      alert("Prescription generation failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Step 3: Settle invoice details
  const handleSubmitInvoice = async () => {
    if (!activeAppt) return;
    setSubmitting(true);
    try {
      await api.post('/billing/bills', {
        patient_id: activeAppt.patient_id,
        appointment_id: activeAppt.id,
        amount: parseFloat(invoiceData.amount),
        tax: parseFloat(invoiceData.tax),
        discount: parseFloat(invoiceData.discount)
      });
      setActiveStep(4); // Go to lab test request step
    } catch (err) {
      alert("Invoice generation failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Step 4: Issue laboratory diagnostics request
  const handleSubmitLabRequest = async () => {
    if (!activeAppt) return;
    // Lab test is optional — skip if no name provided
    if (labTestName.trim() === '') {
      setConsultModalOpen(false);
      alert("Consultation workflow completed! Notes, Prescription, and Invoice have been issued.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/lab-tests/request', {
        patient_id: activeAppt.patient_id,
        test_name: labTestName
      });
      setConsultModalOpen(false);
      alert(`Consultation complete! Lab request "${labTestName}" issued. Notes, Prescription & Invoice were generated.`);
    } catch (err) {
      alert("Lab request failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
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
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-teal-400" />
            <span>Consultation Registry & Appointments</span>
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">Manage patient queues, register check-in visits, and write prescriptions.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Appointments Grid Ledger */}
      <div className="glass-panel rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {appointments.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">No scheduled appointments on file.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                  <th className="px-6 py-4">Patient Profile</th>
                  <th className="px-6 py-4">Appointment Date</th>
                  <th className="px-6 py-4">Time Slot</th>
                  <th className="px-6 py-4">Symptoms Reported</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-900/25 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-slate-200 font-bold text-sm">
                          {appt.patient?.full_name || 'Patient'}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Age: {appt.patient?.age || 'N/A'} | Blood: {appt.patient?.blood_group || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300 font-medium">{appt.appointment_date}</td>
                    <td className="px-6 py-4 text-slate-300 font-semibold">{appt.time_slot}</td>
                    <td className="px-6 py-4 text-slate-400 max-w-xs truncate">{appt.symptoms || 'No symptoms specified'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold ${
                        appt.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        appt.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        appt.status === 'COMPLETED' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' :
                        'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {appt.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {appt.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleCancelAppointment(appt.id)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:border-rose-500/30 rounded-lg border border-rose-500/10 transition-all"
                              title="Decline Visit"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(appt.id, 'CONFIRMED')}
                              className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:border-emerald-500/30 rounded-lg border border-emerald-500/10 transition-all"
                              title="Accept Visit"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        
                        {appt.status === 'CONFIRMED' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => navigate(`/doctor/video/${appt.id}`)}
                              className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all flex items-center gap-1 shadow-md shadow-indigo-500/15 text-xs"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>Join Call</span>
                            </button>
                            <button
                              onClick={() => handleOpenConsultation(appt)}
                              className="py-1.5 px-3 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-lg transition-all flex items-center gap-1 shadow-md shadow-teal-500/15 text-xs"
                            >
                              <Stethoscope className="w-3.5 h-3.5" />
                              <span>Consult</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Telemedicine Video Consultation Sessions History */}
      <div className="glass-panel rounded-2xl border border-slate-800 shadow-xl p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-indigo-400" />
            <span>Consultation Session History & Recordings</span>
          </h3>
          <p className="text-slate-400 text-[10px] mt-0.5">Access video consulting logs and playback secure call recordings.</p>
        </div>

        {videoLoading ? (
          <div className="text-center py-6 text-slate-500 text-xs">Loading sessions registry...</div>
        ) : videoHistory.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">No telemedicine video logs on file.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videoHistory.map((sess) => {
              const appt = appointments.find(a => a.id === sess.appointment_id);
              const patName = appt?.patient?.full_name || 'Patient';
              const sessionDate = appt?.appointment_date || sess.created_at.slice(0, 10);
              
              return (
                <div key={sess.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 hover:border-slate-700 transition-all text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-bold text-xs">Room: {sess.room_id.slice(0,18)}...</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Patient: {patName}</p>
                      <p className="text-[9px] text-slate-500">Date: {sessionDate}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold ${
                      sess.status === 'COMPLETED' ? 'bg-teal-500/10 text-teal-400' : 'bg-slate-950 border border-slate-800 text-slate-400'
                    }`}>
                      {sess.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-805/60">
                    <span className="text-[10px] text-slate-500 font-semibold">
                      {sess.recording_path ? 'Recording Saved' : 'No Recording'}
                    </span>
                    {sess.recording_path && (
                      <button
                        onClick={() => {
                          setSelectedVideo(sess);
                          setPlaybackOpen(true);
                        }}
                        className="py-1 px-2.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-slate-950 border border-indigo-500/20 rounded-md transition-all flex items-center gap-1 text-[10px] font-bold"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Playback</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Playback Simulation Modal */}
      {playbackOpen && selectedVideo && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg glass-panel rounded-2xl p-6 shadow-2xl space-y-4 border border-slate-800 animate-fade-in">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-white font-bold text-sm">Session Recording Playback</h3>
              <button 
                onClick={() => {
                  setPlaybackOpen(false);
                  setSelectedVideo(null);
                }}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="w-full aspect-video rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950/40 to-slate-900/40 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-indigo-500/10 border-2 border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-all">
                  <Film className="w-7 h-7" />
                </div>
                <p className="text-slate-300 font-bold text-xs mt-3">Consultation Recording Playback</p>
                <p className="text-[10px] text-slate-500">Room: {selectedVideo.room_id}</p>
                
                <div className="flex gap-1 items-end mt-4 h-6">
                  {[1, 2, 3, 4, 5, 4, 3, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1].map((h, i) => (
                    <span 
                      key={i} 
                      style={{ height: `${h * 4}px` }} 
                      className="w-1 bg-indigo-500 rounded-full animate-pulse"
                    ></span>
                  ))}
                </div>
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 bg-slate-900/95 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-[10px] text-slate-400 z-10 font-mono">
                <div className="flex items-center gap-3">
                  <Play className="w-3.5 h-3.5 text-teal-400 fill-current" />
                  <span>00:15 / 03:45</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-slate-950 h-1 rounded-full overflow-hidden">
                    <div className="bg-teal-400 h-full w-1/3"></div>
                  </div>
                  <span>1080p SECURE</span>
                </div>
              </div>
            </div>

            <div className="bg-indigo-500/5 border border-indigo-500/10 p-3 rounded-xl flex gap-2 text-[10px] text-slate-400 leading-relaxed">
              <Shield className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>This recording contains protected health information (PHI) and is subject to HIPAA compliance. Only authorized users can play back this session.</span>
            </div>
          </div>
        </div>
      )}


      {/* Consultation Workflow Wizard Modal */}
      {consultModalOpen && activeAppt && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl glass-panel rounded-2xl p-6 shadow-2xl space-y-6 border border-slate-800 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-white font-bold text-sm">Consultation Wizard - Patient: {activeAppt.patient?.full_name}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Symptom checklist: {activeAppt.symptoms}</p>
              </div>
              <button 
                onClick={() => setConsultModalOpen(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Stepper Wizard Indicator */}
            <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold text-slate-500 border-b border-slate-900 pb-3">
              <div className={`${activeStep >= 1 ? 'text-teal-400' : ''}`}>1. Notes</div>
              <div className={`${activeStep >= 2 ? 'text-teal-400' : ''}`}>2. Prescription</div>
              <div className={`${activeStep >= 3 ? 'text-teal-400' : ''}`}>3. Invoicing</div>
              <div className={`${activeStep >= 4 ? 'text-teal-400' : ''}`}>4. Lab Request</div>
            </div>

            {/* Step Content */}
            {activeStep === 1 && (
              <div className="space-y-4 animate-fade-in">
                <h4 className="text-white font-bold text-xs flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-teal-400" />
                  <span>Clinical Diagnostics Notes</span>
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Consultation Mode</label>
                    <select
                      value={consultData.consultation_type}
                      onChange={(e) => setConsultData({ ...consultData, consultation_type: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                    >
                      <option value="ONLINE">Online Video Consult</option>
                      <option value="IN_PERSON">In-Person Visit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Quick Med Summary</label>
                    <input
                      type="text"
                      placeholder="e.g. Aspirin 75mg once daily"
                      value={consultData.prescription_text}
                      onChange={(e) => setConsultData({ ...consultData, prescription_text: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-xs mb-1">Clinical Observation Notes</label>
                  <textarea
                    placeholder="Describe patient status, advised diagnostics and rest guidelines..."
                    rows="3.5"
                    value={consultData.doctor_notes}
                    onChange={(e) => setConsultData({ ...consultData, doctor_notes: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                    required
                  />
                </div>

                <button
                  onClick={handleSubmitNotes}
                  disabled={!consultData.doctor_notes || submitting}
                  className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-xl text-xs transition-all"
                >
                  Save Notes & Continue
                </button>
              </div>
            )}

            {activeStep === 2 && (
              <div className="space-y-4 animate-fade-in max-h-96 overflow-y-auto pr-1">
                <h4 className="text-white font-bold text-xs flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-teal-400" />
                  <span>Issue Formal Prescription PDF</span>
                </h4>

                {prescData.medications.map((med, idx) => (
                  <div key={idx} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-3 relative">
                    <div className="grid grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        placeholder="Medication Name"
                        value={med.name}
                        onChange={(e) => handleMedicationChange(idx, 'name', e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Dosage (e.g. 500mg)"
                        value={med.dosage}
                        onChange={(e) => handleMedicationChange(idx, 'dosage', e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        placeholder="Frequency (e.g. Twice daily)"
                        value={med.frequency}
                        onChange={(e) => handleMedicationChange(idx, 'frequency', e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Duration (e.g. 7 days)"
                        value={med.duration}
                        onChange={(e) => handleMedicationChange(idx, 'duration', e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs"
                      />
                    </div>
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => removeMedicationRow(idx)}
                        className="absolute -top-1 right-2 text-rose-400 text-[10px] hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addMedicationRow}
                    className="py-1.5 px-3 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-xs"
                  >
                    + Add Medication Row
                  </button>
                </div>

                <div>
                  <label className="block text-slate-400 text-xs mb-1">General intake instructions</label>
                  <textarea
                    placeholder="e.g. Take medications after meals. Avoid strenuous physical activity."
                    rows="2"
                    value={prescData.instructions}
                    onChange={(e) => setPrescData({ ...prescData, instructions: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className="flex-1 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl text-xs hover:text-white"
                  >
                    Skip Prescription
                  </button>
                  <button
                    onClick={handleSubmitPrescription}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-teal-600"
                  >
                    Generate Prescription PDF
                  </button>
                </div>
              </div>
            )}

            {activeStep === 3 && (
              <div className="space-y-4 animate-fade-in">
                <h4 className="text-white font-bold text-xs flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-teal-400" />
                  <span>Generate Consultation Bill / Invoice</span>
                </h4>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Fee Amount ($)</label>
                    <input
                      type="number"
                      value={invoiceData.amount}
                      onChange={(e) => setInvoiceData({ ...invoiceData, amount: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Tax Surcharge ($)</label>
                    <input
                      type="number"
                      value={invoiceData.tax}
                      onChange={(e) => setInvoiceData({ ...invoiceData, tax: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Discount Limit ($)</label>
                    <input
                      type="number"
                      value={invoiceData.discount}
                      onChange={(e) => setInvoiceData({ ...invoiceData, discount: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveStep(4)}
                    className="flex-1 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl text-xs hover:text-white"
                  >
                    Skip Bill Creation
                  </button>
                  <button
                    onClick={handleSubmitInvoice}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-teal-600"
                  >
                    Create Bill Invoice
                  </button>
                </div>
              </div>
            )}

            {activeStep === 4 && (
              <div className="space-y-4 animate-fade-in">
                <h4 className="text-white font-bold text-xs flex items-center gap-1.5">
                  <FlaskConical className="w-4 h-4 text-teal-400" />
                  <span>Issue Laboratory Diagnostics Request</span>
                </h4>

                <div>
                  <label className="block text-slate-400 text-xs mb-1">Lab test Name / Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Lipids panel, Chest X-Ray, Blood CBC"
                    value={labTestName}
                    onChange={(e) => setLabTestName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setConsultModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl text-xs hover:text-white"
                  >
                    Skip & Complete Consult
                  </button>
                  <button
                    onClick={handleSubmitLabRequest}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-teal-600"
                  >
                    Settle Consultation Flow
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
