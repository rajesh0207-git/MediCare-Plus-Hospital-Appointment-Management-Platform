import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { getHealthSummary } from '../../services/healthTrackerApi';
import { getTodayReminders, listReminders } from '../../services/medicineReminderApi';
import { 
  Calendar, CreditCard, FlaskConical, Stethoscope, 
  ArrowRight, Bot, Clipboard, AlertCircle, XCircle,
  Video, Film, Play, Shield, HeartPulse, Pill, Scale,
  Droplets, CheckCircle, Clock, XCircle as MissedIcon
} from 'lucide-react';

const PatientDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [bills, setBills] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Health Tracker & Medicine Reminder overview data
  const [healthSummary, setHealthSummary] = useState(null);
  const [todayMeds, setTodayMeds] = useState([]);
  const [activeReminders, setActiveReminders] = useState([]);
  
  // Video Session states
  const [videoHistory, setVideoHistory] = useState([]);
  const [videoLoading, setVideoLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [playbackOpen, setPlaybackOpen] = useState(false);


  const fetchVideoHistory = async () => {
    try {
      const res = await api.get('/appointments/video-sessions/history');
      setVideoHistory(res.data);
    } catch (err) {
      console.error("Failed to load video sessions:", err);
    } finally {
      setVideoLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [apptRes, billsRes, labsRes] = await Promise.all([
          api.get('/appointments'),
          api.get('/billing/bills'),
          api.get('/lab-tests')
        ]);
        setAppointments(apptRes.data);
        setBills(billsRes.data);
        setLabTests(labsRes.data);
        await fetchVideoHistory();

        // Fetch health tracker & medicine reminder overview data
        try {
          const [htRes, medTodayRes, medListRes] = await Promise.all([
            getHealthSummary(),
            getTodayReminders(),
            listReminders(true)
          ]);
          setHealthSummary(htRes.data);
          setTodayMeds(medTodayRes.data);
          setActiveReminders(medListRes.data);
        } catch (htErr) {
          console.error("Failed to load health/medicine overview:", htErr);
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        setError("Unable to retrieve dashboard information.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);


  const handleCancelAppointment = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      const res = await api.post(`/appointments/${id}/cancel`);
      // Update appointment in state
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'CANCELLED' } : a));
    } catch (err) {
      alert("Failed to cancel appointment: " + (err.response?.data?.detail || err.message));
    }
  };

  const getUpcomingAppointment = () => {
    return appointments.find(a => a.status === 'CONFIRMED' || a.status === 'PENDING');
  };

  const getUnpaidBillsCount = () => {
    return bills.filter(b => b.payment_status === 'PENDING').length;
  };

  const getPendingLabsCount = () => {
    return labTests.filter(l => l.status === 'PENDING').length;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const upcomingAppt = getUpcomingAppointment();
  const unpaidBillsCount = getUnpaidBillsCount();
  const pendingLabsCount = getPendingLabsCount();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Hero */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-teal-900/60 to-slate-900 border border-teal-500/20 p-8 md:p-10 shadow-xl">
        <div className="relative z-10 max-w-lg space-y-3">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">
            Hello, <span className="text-teal-400">{user?.full_name || 'Patient'}</span>
          </h2>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            Manage your medical visits, billing claims, prescriptions, and consult our AI medical assistant for instant diagnosis support.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link 
              to="/patient/book" 
              className="py-2 px-4 bg-teal-500 hover:bg-teal-600 text-slate-950 text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-teal-500/15"
            >
              Book Appointment
            </Link>
            <Link 
              to="/patient/ai-chat" 
              className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-teal-400 text-sm font-semibold rounded-xl border border-slate-700 hover:border-teal-500/30 transition-all flex items-center gap-1.5"
            >
              <Bot className="w-4 h-4 text-teal-400" />
              <span>AI Symptom Checker</span>
            </Link>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-teal-500/5 to-transparent pointer-events-none"></div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stat 1: Next Visit */}
        <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-semibold">Next Visit</p>
            <p className="text-white font-bold text-sm mt-0.5">
              {upcomingAppt ? upcomingAppt.appointment_date : 'No Schedule'}
            </p>
            {upcomingAppt && <p className="text-slate-500 text-[10px]">{upcomingAppt.time_slot}</p>}
          </div>
        </div>

        {/* Stat 2: Unpaid Invoices */}
        <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-semibold">Unpaid Invoices</p>
            <p className="text-white font-bold text-lg mt-0.5">{unpaidBillsCount}</p>
            <p className="text-slate-500 text-[10px]">Pending payment</p>
          </div>
        </div>

        {/* Stat 3: Pending Lab Tests */}
        <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-semibold">Pending Labs</p>
            <p className="text-white font-bold text-lg mt-0.5">{pendingLabsCount}</p>
            <p className="text-slate-500 text-[10px]">Awaiting results</p>
          </div>
        </div>

        {/* Stat 4: Consultations */}
        <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 bg-violet-500/10 text-violet-400 rounded-xl">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-semibold">Total Visits</p>
            <p className="text-white font-bold text-lg mt-0.5">
              {appointments.filter(a => a.status === 'COMPLETED').length}
            </p>
            <p className="text-slate-500 text-[10px]">Completed visits</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Appointments & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Appointments List (Col 2/3) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Clipboard className="w-5 h-5 text-teal-400" />
              <span>Upcoming Appointments</span>
            </h3>
            <Link to="/patient/records" className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1">
              <span>View History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-800 shadow-lg p-5">
            {appointments.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <p className="text-slate-400 text-sm">You have no appointment bookings.</p>
                <Link to="/patient/book" className="text-teal-400 hover:underline text-xs font-medium inline-block">
                  Book your first appointment now
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-800 space-y-4">
                {appointments.slice(0, 5).map((appt, i) => (
                  <div key={appt.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 ${i === 0 ? 'pt-0' : ''}`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <p className="text-white font-semibold text-sm">
                          Dr. {appt.doctor?.user?.email?.split('@')[0].toUpperCase() || 'Doctor'}
                        </p>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          appt.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          appt.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          appt.status === 'COMPLETED' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' :
                          'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {appt.status}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs font-medium">
                        Specialization: {appt.doctor?.specialization || 'General'}
                      </p>
                      <p className="text-slate-500 text-[10px]">
                        Scheduled: {appt.appointment_date} at {appt.time_slot}
                      </p>
                      {appt.symptoms && (
                        <p className="text-slate-400 text-xs italic bg-slate-900/40 p-2 rounded-lg border border-slate-800/60 mt-1 max-w-md">
                          Symptoms: {appt.symptoms}
                        </p>
                      )}
                    </div>

                    {/* Booking Actions */}
                    <div className="flex items-center gap-2">
                      {appt.status === 'CONFIRMED' && (
                        <button
                          onClick={() => navigate(`/patient/video/${appt.id}`)}
                          className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-indigo-500/15"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Join Video</span>
                        </button>
                      )}
                      {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
                        <button
                          onClick={() => handleCancelAppointment(appt.id)}
                          className="py-1.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold rounded-lg border border-rose-500/10 hover:border-rose-500/20 transition-all flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Telemedicine Video Consultation Sessions History */}
          <div className="glass-panel rounded-2xl border border-slate-800 shadow-lg p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Film className="w-4 h-4 text-indigo-400" />
                <span>Consultation Video Recordings</span>
              </h3>
              <p className="text-slate-400 text-[10px] mt-0.5">View records and playback your secure video consultation calls.</p>
            </div>

            {videoLoading ? (
              <div className="text-center py-6 text-slate-500 text-xs">Loading sessions...</div>
            ) : videoHistory.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">No video consultation recordings on file.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {videoHistory.map((sess) => {
                  const appt = appointments.find(a => a.id === sess.appointment_id);
                  const docEmail = appt?.doctor?.user?.email || 'Doctor';
                  const docName = "Dr. " + docEmail.split('@')[0].toUpperCase();
                  const sessionDate = appt?.appointment_date || sess.created_at.slice(0, 10);
                  
                  return (
                    <div key={sess.id} className="p-3 bg-slate-900/60 border border-slate-805/80 rounded-xl space-y-3 hover:border-slate-700 transition-all text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-white font-bold text-xs">{docName}</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">Room ID: {sess.room_id.slice(0,18)}...</p>
                          <p className="text-[9px] text-slate-500">Date: {sessionDate}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold ${
                          sess.status === 'COMPLETED' ? 'bg-teal-500/10 text-teal-400' : 'bg-slate-950 border border-slate-800 text-slate-400'
                        }`}>
                          {sess.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                        <span className="text-[10px] text-slate-500 font-semibold">
                          {sess.recording_path ? 'Recording Stored' : 'No Recording'}
                        </span>
                        {sess.recording_path && (
                          <button
                            onClick={() => {
                              setSelectedVideo(sess);
                              setPlaybackOpen(true);
                            }}
                            className="py-1 px-2 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-slate-950 border border-indigo-500/20 rounded-md transition-all flex items-center gap-1 text-[10px] font-bold"
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
        </div>

        {/* Sidebar Widgets (Col 1/3) */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-white">Quick Actions</h3>

          {/* Quick Actions Panel */}
          <div className="glass-panel rounded-2xl border border-slate-800 shadow-lg p-5 space-y-4">
            <Link 
              to="/patient/ai-chat" 
              className="flex items-center justify-between p-3.5 rounded-xl border border-violet-500/20 hover:border-violet-500/50 bg-violet-500/5 hover:bg-violet-500/10 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-violet-500/10 text-violet-400 rounded-lg">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-white text-xs font-bold">Ask AI assistant</h4>
                  <p className="text-slate-400 text-[10px]">Check symptoms & health guides</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-violet-400 transition-colors" />
            </Link>

            <Link 
              to="/patient/billing" 
              className="flex items-center justify-between p-3.5 rounded-xl border border-rose-500/20 hover:border-rose-500/50 bg-rose-500/5 hover:bg-rose-500/10 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-lg">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-white text-xs font-bold">Billing & Invoices</h4>
                  <p className="text-slate-400 text-[10px]">Pay your bills, print receipts</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition-colors" />
            </Link>
          </div>

          {/* Health Tracker Overview Card */}
          <div className="glass-panel rounded-2xl border border-slate-800 shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/60">
              <h4 className="text-white font-bold text-sm flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-teal-400" />
                Health Tracker
              </h4>
              <Link to="/patient/health-tracker" className="text-[10px] text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-5 space-y-3">
              {healthSummary ? (
                <>
                  {/* BMI */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-teal-500/10 rounded-lg">
                        <Scale className="w-3.5 h-3.5 text-teal-400" />
                      </div>
                      <span className="text-slate-400 text-xs">BMI</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-sm">{healthSummary.latest_bmi ?? '—'}</span>
                      {healthSummary.bmi_category && (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          healthSummary.bmi_category === 'NORMAL' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' :
                          healthSummary.bmi_category === 'OVERWEIGHT' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' :
                          healthSummary.bmi_category === 'OBESE' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25' :
                          'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25'
                        }`}>
                          {healthSummary.bmi_category === 'NORMAL' ? 'Normal' :
                           healthSummary.bmi_category === 'OVERWEIGHT' ? 'Overweight' :
                           healthSummary.bmi_category === 'OBESE' ? 'Obese' :
                           healthSummary.bmi_category === 'UNDERWEIGHT' ? 'Underweight' : healthSummary.bmi_category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Weight */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-blue-500/10 rounded-lg">
                        <Scale className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <span className="text-slate-400 text-xs">Weight</span>
                    </div>
                    <span className="text-white font-bold text-sm">
                      {healthSummary.latest_weight_kg ?? '—'}<span className="text-slate-500 text-[10px] ml-0.5">kg</span>
                    </span>
                  </div>

                  {/* Blood Pressure */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-rose-500/10 rounded-lg">
                        <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                      </div>
                      <span className="text-slate-400 text-xs">Blood Pressure</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-sm">
                        {healthSummary.latest_bp_systolic ?? '—'}/{healthSummary.latest_bp_diastolic ?? '—'}
                        <span className="text-slate-500 text-[10px] ml-0.5">mmHg</span>
                      </span>
                      {healthSummary.bp_category && (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          healthSummary.bp_category === 'NORMAL' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' :
                          healthSummary.bp_category === 'ELEVATED' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' :
                          'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                        }`}>
                          {healthSummary.bp_category === 'NORMAL' ? 'Normal' :
                           healthSummary.bp_category === 'ELEVATED' ? 'Elevated' : healthSummary.bp_category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Blood Glucose */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-violet-500/10 rounded-lg">
                        <Droplets className="w-3.5 h-3.5 text-violet-400" />
                      </div>
                      <span className="text-slate-400 text-xs">Blood Glucose</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-sm">
                        {healthSummary.latest_glucose_mgdl ?? '—'}<span className="text-slate-500 text-[10px] ml-0.5">mg/dL</span>
                      </span>
                      {healthSummary.glucose_category && (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          healthSummary.glucose_category === 'NORMAL' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' :
                          healthSummary.glucose_category === 'PREDIABETES' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' :
                          'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                        }`}>
                          {healthSummary.glucose_category === 'NORMAL' ? 'Normal' :
                           healthSummary.glucose_category === 'PREDIABETES' ? 'Pre-Diabetes' : healthSummary.glucose_category}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-slate-500 text-xs">No health data yet</p>
                  <Link to="/patient/health-tracker" className="text-teal-400 hover:underline text-[10px] font-semibold mt-1 inline-block">
                    Start tracking
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Medicine Reminder Overview Card */}
          <div className="glass-panel rounded-2xl border border-slate-800 shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/60">
              <h4 className="text-white font-bold text-sm flex items-center gap-2">
                <Pill className="w-4 h-4 text-violet-400" />
                Medicine Reminders
              </h4>
              <Link to="/patient/medicine-reminder" className="text-[10px] text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-5 space-y-3">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-violet-500/5 border border-violet-500/10 rounded-xl p-2.5 text-center">
                  <p className="text-violet-400 font-extrabold text-lg">{activeReminders.length}</p>
                  <p className="text-slate-500 text-[9px]">Active</p>
                </div>
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-2.5 text-center">
                  <p className={`font-extrabold text-lg ${todayMeds.filter(t => t.status === 'PENDING').length > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {todayMeds.filter(t => t.status === 'PENDING').length}
                  </p>
                  <p className="text-slate-500 text-[9px]">Due Today</p>
                </div>
              </div>

              {/* Today's Medicines List */}
              {todayMeds.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {todayMeds.slice(0, 5).map((med, idx) => (
                    <div key={idx} className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                      med.status === 'TAKEN' ? 'bg-emerald-500/5 border border-emerald-500/15' :
                      med.status === 'MISSED' ? 'bg-rose-500/5 border border-rose-500/15' :
                      med.status === 'SKIPPED' ? 'bg-amber-500/5 border border-amber-500/15' :
                      'bg-slate-900/60 border border-slate-800/60'
                    }`}>
                      <div className="flex items-center gap-2 min-w-0">
                        {med.status === 'TAKEN' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> :
                         med.status === 'MISSED' ? <MissedIcon className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" /> :
                         med.status === 'SKIPPED' ? <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" /> :
                         <Pill className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />}
                        <span className={`truncate ${med.status === 'TAKEN' ? 'text-slate-400 line-through' : 'text-white font-semibold'}`}>
                          {med.medicine_name}
                        </span>
                      </div>
                      <span className="text-slate-500 text-[10px] font-mono ml-2 flex-shrink-0">{med.scheduled_time}</span>
                    </div>
                  ))}
                  {todayMeds.length > 5 && (
                    <Link to="/patient/medicine-reminder" className="text-teal-400 hover:text-teal-300 text-[10px] font-semibold text-center block pt-1">
                      +{todayMeds.length - 5} more doses today
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-slate-500 text-xs">No medicines scheduled today</p>
                  <Link to="/patient/medicine-reminder" className="text-teal-400 hover:underline text-[10px] font-semibold mt-1 inline-block">
                    Set up a reminder
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
