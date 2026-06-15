import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Clock, Calendar, AlertCircle, CheckCircle, Plus, ClipboardList, 
  Lock, Unlock, Trash2, CalendarDays, RefreshCw, LayoutGrid
} from 'lucide-react';

const DoctorSchedule = () => {
  const { user } = useAuth();
  
  // Weekly Schedule Template State
  const [schedules, setSchedules] = useState([]);
  const [dayOfWeek, setDayOfWeek] = useState('Monday');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [slotDuration, setSlotDuration] = useState('30');
  
  // Tabs State: 'template' | 'daily_slots'
  const [activeTab, setActiveTab] = useState('template');
  
  // Daily Slots State
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  
  // Custom slot form
  const [customStart, setCustomStart] = useState('14:00');
  const [customEnd, setCustomEnd] = useState('14:30');
  
  // Batch generate slots form
  const [generateStart, setGenerateStart] = useState(new Date().toISOString().slice(0, 10));
  const [generateEnd, setGenerateEnd] = useState(
    new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) // +6 days default
  );

  // Common UI State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadDoctorProfile = async () => {
    try {
      // Fetch all doctors to get the matching profile schedules
      const res = await api.get('/doctors');
      const email = localStorage.getItem('email');
      const docProfile = res.data.find(d => d.email === email);
      if (docProfile) {
        setDoctorProfile(docProfile);
        setSchedules(docProfile.schedules || []);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to retrieve schedule database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctorProfile();
  }, []);

  // Fetch slots for a selected date
  const loadDailySlots = async (dateVal) => {
    if (!doctorProfile) return;
    setSlotsLoading(true);
    setError('');
    try {
      const res = await api.get(`/doctors/${doctorProfile.id}/slots?appointment_date=${dateVal}`);
      setSlots(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load availability slots for the selected date.");
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'daily_slots' && doctorProfile) {
      loadDailySlots(selectedDate);
    }
  }, [activeTab, selectedDate, doctorProfile]);

  // Handle Weekly Template Submit
  const handleWeeklySubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await api.post('/doctors/me/schedule', {
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        slot_duration_minutes: parseInt(slotDuration, 10)
      });
      setSuccess("Availability weekly template updated successfully!");
      // Reload profile schedules
      loadDoctorProfile();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to update weekly schedule.");
    } finally {
      setSubmitting(false);
    }
  };

  // Add a single custom slot
  const handleAddCustomSlot = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await api.post('/doctors/me/slots', {
        slot_date: selectedDate,
        start_time: customStart,
        end_time: customEnd
      });
      setSuccess("Custom slot created successfully!");
      loadDailySlots(selectedDate);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to create custom slot.");
    } finally {
      setSubmitting(false);
    }
  };

  // Block or unblock slot
  const handleToggleBlockSlot = async (slotId, currentStatus) => {
    setError('');
    setSuccess('');
    const newStatus = currentStatus === 'BLOCKED' ? 'AVAILABLE' : 'BLOCKED';
    
    try {
      await api.put(`/doctors/me/slots/${slotId}`, {
        status: newStatus
      });
      setSuccess(`Slot status updated to ${newStatus}`);
      loadDailySlots(selectedDate);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to modify slot status.");
    }
  };

  // Delete a specific slot
  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm("Are you sure you want to delete this availability slot?")) return;
    setError('');
    setSuccess('');
    
    try {
      await api.delete(`/doctors/me/slots/${slotId}`);
      setSuccess("Availability slot deleted successfully.");
      loadDailySlots(selectedDate);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to delete slot.");
    }
  };

  // Batch generate slots from weekly schedule templates
  const handleBatchGenerateSlots = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await api.post('/doctors/me/slots/generate', {
        start_date: generateStart,
        end_date: generateEnd
      });
      setSuccess("Slots generated successfully for the selected date range!");
      if (selectedDate >= generateStart && selectedDate <= generateEnd) {
        loadDailySlots(selectedDate);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to batch-generate slots.");
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
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b border-slate-900 pb-5">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-teal-400" />
            <span>Consultation Availability & Bookings Calendar</span>
          </h2>
          <p className="text-slate-400 text-xs">Configure weekly schedule templates or manage individual date slots dynamically.</p>
        </div>

        {/* Tab Selection buttons */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 self-start">
          <button
            onClick={() => { setActiveTab('template'); setError(''); setSuccess(''); }}
            className={`py-1.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'template' ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Weekly Templates</span>
          </button>
          <button
            onClick={() => { setActiveTab('daily_slots'); setError(''); setSuccess(''); }}
            className={`py-1.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'daily_slots' ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Daily Slots Manager</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {activeTab === 'template' ? (
        /* Tab 1: Weekly Template Manager */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Template Creation Form */}
          <div className="md:col-span-1 glass-panel rounded-2xl p-6 shadow-xl space-y-5 h-fit border border-slate-800">
            <h3 className="text-white font-bold text-sm border-b border-slate-800 pb-3 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-teal-400" />
              <span>Create Weekly Working Hours</span>
            </h3>

            <form onSubmit={handleWeeklySubmit} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">Weekday</label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                >
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-1">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-1">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">Slot Duration</label>
                <select
                  value={slotDuration}
                  onChange={(e) => setSlotDuration(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                >
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes</option>
                  <option value="45">45 Minutes</option>
                  <option value="60">60 Minutes</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition-all"
              >
                {submitting ? 'Publishing...' : 'Publish Weekly Block'}
              </button>
            </form>
          </div>

          {/* Published Templates Ledger */}
          <div className="md:col-span-2 glass-panel rounded-2xl p-6 shadow-xl space-y-5 border border-slate-800">
            <h3 className="text-white font-bold text-sm border-b border-slate-800 pb-3 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-teal-400" />
              <span>Published Weekly Schedule Templates</span>
            </h3>

            {schedules.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-10">No active work schedules published yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                {schedules.map((sched) => (
                  <div key={sched.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3.5">
                    <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm">{sched.day_of_week}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Hours: {sched.start_time.slice(0,5)} - {sched.end_time.slice(0,5)}
                      </p>
                      <p className="text-[10px] text-slate-500 font-semibold mt-1">
                        Intervals: {sched.slot_duration_minutes} mins
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Tab 2: Daily Slots Manager (DYNAMIC MANAGEMENT) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left: Custom Slot creation & Batch Generator */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Custom One-Off Slot Form */}
            <div className="glass-panel rounded-2xl p-6 shadow-xl space-y-4 border border-slate-800">
              <h3 className="text-white font-bold text-sm border-b border-slate-800 pb-2 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-teal-400" />
                <span>Add Custom Slot for Selected Date</span>
              </h3>
              
              <form onSubmit={handleAddCustomSlot} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-450 text-[10px] font-bold mb-1">Start Time</label>
                    <input
                      type="time"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-450 text-[10px] font-bold mb-1">End Time</label>
                    <input
                      type="time"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-xl text-xs transition-all"
                >
                  Create Single Slot
                </button>
              </form>
            </div>

            {/* Batch Generator Form */}
            <div className="glass-panel rounded-2xl p-6 shadow-xl space-y-4 border border-slate-800">
              <h3 className="text-white font-bold text-sm border-b border-slate-800 pb-2 flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-teal-400" />
                <span>Batch Generate slots from Template</span>
              </h3>
              
              <form onSubmit={handleBatchGenerateSlots} className="space-y-4">
                <div>
                  <label className="block text-slate-450 text-[10px] font-bold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={generateStart}
                    onChange={(e) => setGenerateStart(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-450 text-[10px] font-bold mb-1">End Date</label>
                  <input
                    type="date"
                    value={generateEnd}
                    onChange={(e) => setGenerateEnd(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-500/15"
                >
                  Generate Date Slots
                </button>
              </form>
            </div>
          </div>

          {/* Right: Slots Grid Ledger */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Header / Date Selector */}
            <div className="glass-panel rounded-2xl p-4 shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-teal-400" />
                <span className="text-xs text-slate-350 font-bold">Select Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1 text-white text-xs focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">
                Slots for date: <span className="text-white">{selectedDate}</span>
              </span>
            </div>

            {/* Slots List container */}
            <div className="glass-panel rounded-2xl p-6 shadow-xl border border-slate-800 min-h-60 relative">
              {slotsLoading ? (
                <div className="absolute inset-0 flex justify-center items-center">
                  <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-16 space-y-2">
                  <p className="text-slate-400 text-xs font-semibold">No availability slots generated for this date.</p>
                  <p className="text-[10px] text-slate-500 max-w-xs mx-auto">Use the template generator on the left to initialize slots or create custom blocks.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
                  {slots.map((slot) => (
                    <div 
                      key={slot.id} 
                      className={`p-3 border rounded-xl flex items-center justify-between transition-colors ${
                        slot.status === 'BOOKED' ? 'bg-rose-500/5 border-rose-500/10' :
                        slot.status === 'BLOCKED' ? 'bg-slate-950/60 border-slate-850' :
                        'bg-emerald-500/5 border-emerald-500/10'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-xs">{slot.time}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold ${
                            slot.status === 'BOOKED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            slot.status === 'BLOCKED' ? 'bg-slate-900 text-slate-400 border border-slate-800' :
                            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {slot.status}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-500">Slot ID: {slot.id}</p>
                      </div>

                      {/* Slot Actions */}
                      <div className="flex items-center gap-1.5">
                        {slot.status !== 'BOOKED' ? (
                          <>
                            {/* Toggle Block / Unblock */}
                            <button
                              onClick={() => handleToggleBlockSlot(slot.id, slot.status)}
                              className={`p-1.5 rounded-lg border transition-all ${
                                slot.status === 'BLOCKED' ? 
                                'bg-slate-900 border-slate-800 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20' : 
                                'bg-slate-900 border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/20'
                              }`}
                              title={slot.status === 'BLOCKED' ? 'Unblock Slot' : 'Block Slot'}
                            >
                              {slot.status === 'BLOCKED' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            </button>

                            {/* Delete Slot */}
                            <button
                              onClick={() => handleDeleteSlot(slot.id)}
                              className="p-1.5 bg-slate-900 border border-slate-800 hover:border-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-all"
                              title="Delete Availability Slot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-semibold italic pr-1">Reserves Active</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorSchedule;
