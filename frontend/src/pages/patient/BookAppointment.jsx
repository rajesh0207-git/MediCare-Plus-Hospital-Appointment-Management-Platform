import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import {
  Clock, AlertCircle, CheckCircle, Stethoscope, ChevronRight,
  ChevronLeft, Calendar
} from 'lucide-react';

/* ─── Tiny Custom Calendar Component ──────────────────────────────────────── */
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CustomCalendar = ({ value, onChange }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const initDate = value ? new Date(value + 'T00:00:00') : new Date(today);
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());

  // Keep view in sync if parent changes value
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const toDateStr = (y, m, d) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const cells = [];
  // Empty leading cells
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 select-none">
      {/* Month / Year Nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-white font-bold text-sm tracking-wide">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-slate-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day Cells */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />;

          const dateStr = toDateStr(viewYear, viewMonth, day);
          const cellDate = new Date(viewYear, viewMonth, day);
          const isPast = cellDate < today;
          const isSelected = value === dateStr;
          const isToday = dateStr === toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

          return (
            <button
              key={dateStr}
              type="button"
              disabled={isPast}
              onClick={() => onChange(dateStr)}
              className={`
                mx-auto w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all duration-150
                ${isSelected
                  ? 'bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/40 scale-110'
                  : isToday && !isPast
                  ? 'bg-slate-800 border border-teal-500/50 text-teal-400 font-bold'
                  : isPast
                  ? 'text-slate-700 cursor-not-allowed'
                  : 'text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer'
                }
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Selected date display */}
      {value && (
        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-teal-400" />
          <span className="text-teal-300 text-xs font-bold">
            {new Date(value + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </span>
        </div>
      )}
    </div>
  );
};

/* ─── Main BookAppointment Page ────────────────────────────────────────────── */
const BookAppointment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialDoctorId = searchParams.get('doctorId');

  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [slots, setSlots] = useState([]);

  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [apptDate, setApptDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [symptoms, setSymptoms] = useState('');

  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch departments & doctors
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptRes, docRes] = await Promise.all([
          api.get('/departments'),
          api.get('/doctors'),
        ]);
        setDepartments(deptRes.data);
        setDoctors(docRes.data);

        if (initialDoctorId) {
          const doc = docRes.data.find(d => d.id === parseInt(initialDoctorId, 10));
          if (doc) {
            setSelectedDocId(doc.id.toString());
            if (doc.department?.id) setSelectedDeptId(doc.department.id.toString());
          }
        }
      } catch (err) {
        console.error(err);
        setError('Failed to fetch doctor database.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [initialDoctorId]);

  // Filter doctors when department changes
  useEffect(() => {
    if (selectedDeptId) {
      setFilteredDoctors(doctors.filter(d => d.department?.id === parseInt(selectedDeptId, 10)));
      const currentDoc = doctors.find(d => d.id === parseInt(selectedDocId, 10));
      if (currentDoc && currentDoc.department?.id !== parseInt(selectedDeptId, 10)) {
        setSelectedDocId('');
        setSlots([]);
        setSelectedSlot('');
      }
    } else {
      setFilteredDoctors(doctors);
    }
  }, [selectedDeptId, doctors, selectedDocId]);

  // Fetch slots when doctor or date changes
  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDocId || !apptDate) {
        setSlots([]);
        setSelectedSlot('');
        return;
      }
      setSlotsLoading(true);
      setError('');
      try {
        const res = await api.get(`/doctors/${selectedDocId}/slots?appointment_date=${apptDate}`);
        setSlots(res.data);
      } catch (err) {
        console.error(err);
        setError('Failed to load availability slots for this date.');
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchSlots();
  }, [selectedDocId, apptDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!selectedDocId || !apptDate || !selectedSlot || !symptoms) {
      setError('Please fill in all details and select an available slot.');
      return;
    }
    try {
      await api.post('/appointments', {
        doctor_id: parseInt(selectedDocId, 10),
        appointment_date: apptDate,
        time_slot: selectedSlot,
        symptoms,
      });
      setSuccess('Appointment booked successfully! Redirecting in 3 seconds...');
      setTimeout(() => navigate('/patient'), 3000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Booking failed. The slot may have been taken.');
    }
  };

  const selectedDoctor = doctors.find(d => d.id === parseInt(selectedDocId, 10));
  const availableCount = slots.filter(s => s.status === 'AVAILABLE' && s.is_available).length;
  const bookedCount = slots.filter(s => s.status === 'BOOKED').length;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Stethoscope className="w-6 h-6 text-teal-400" />
          Book an Appointment
        </h2>
        <p className="text-slate-400 text-xs">
          Select your doctor, pick a date from the calendar, then choose an available time slot.
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-6 md:p-8 shadow-xl space-y-6">

        {/* ── Row 1: Department + Doctor ──────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Department */}
          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-2" htmlFor="department">
              🏥 Department
            </label>
            <select
              id="department"
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 text-sm transition-all"
            >
              <option value="">-- All Departments --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Doctor */}
          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-2" htmlFor="doctor">
              👨‍⚕️ Select Doctor
            </label>
            <select
              id="doctor"
              value={selectedDocId}
              onChange={(e) => { setSelectedDocId(e.target.value); setSlots([]); setSelectedSlot(''); }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 text-sm transition-all"
              required
            >
              <option value="">-- Choose Doctor --</option>
              {filteredDoctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  Dr. {doc.email.split('@')[0].toUpperCase()} ({doc.specialization}) — ${doc.consultation_fee}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Row 2: Calendar + Symptoms ──────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">

          {/* Custom Calendar Picker */}
          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-2">
              📅 Select Appointment Date
            </label>
            <CustomCalendar
              value={apptDate}
              onChange={(dateStr) => {
                setApptDate(dateStr);
                setSelectedSlot('');
              }}
            />
          </div>

          {/* Symptoms */}
          <div className="flex flex-col h-full">
            <label className="block text-slate-300 text-sm font-semibold mb-2" htmlFor="symptoms">
              🩺 Describe Your Symptoms
            </label>
            <textarea
              id="symptoms"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              rows={6}
              placeholder="Describe your symptoms in detail...&#10;e.g. Mild chest tightness since 2 days, shortness of breath on stairs, occasional palpitations."
              className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 text-sm transition-all resize-none leading-relaxed"
              required
            />
            <p className="text-slate-600 text-[10px] mt-1.5 font-medium">
              Be as specific as possible — this helps the doctor prepare for your consultation.
            </p>
          </div>
        </div>

        {/* ── Slot Picker ─────────────────────────────────────────────── */}
        {selectedDocId && apptDate && (
          <div className="border-t border-slate-800 pt-6 space-y-4">

            {/* Header with counts */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-400" />
                Available Time Slots
              </h3>
              {!slotsLoading && slots.length > 0 && (
                <div className="flex items-center gap-2 text-[11px] font-bold">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                    {availableCount} Open
                  </span>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400">
                    <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                    {bookedCount} Booked
                  </span>
                </div>
              )}
            </div>

            {slotsLoading ? (
              <div className="flex items-center gap-3 text-slate-400 text-xs py-6 justify-center">
                <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                <span>Loading available slots...</span>
              </div>
            ) : slots.length === 0 ? (
              <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <p className="text-amber-300 text-xs">
                  No slots available on this day. Doctors are typically scheduled Monday, Wednesday & Friday. Try selecting one of those days.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Legend */}
                <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-slate-400">
                  <span className="flex items-center gap-1.5 text-emerald-300">
                    <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/60 inline-block" />
                    Available
                  </span>
                  <span className="flex items-center gap-1.5 text-teal-300">
                    <span className="w-3 h-3 rounded bg-teal-500 inline-block" />
                    Selected
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <span className="w-3 h-3 rounded bg-rose-500/20 border border-rose-500/40 inline-block" />
                    Booked
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-3 h-3 rounded bg-slate-800 inline-block" />
                    Blocked
                  </span>
                </div>

                {/* Slot Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot === slot.time;
                    const isAvailable = slot.is_available && slot.status === 'AVAILABLE';
                    const isBooked = slot.status === 'BOOKED';

                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setSelectedSlot(slot.time)}
                        title={isAvailable ? `Select ${slot.time}` : isBooked ? 'Already booked' : 'Unavailable'}
                        className={`
                          relative py-3 px-1 rounded-xl border text-center transition-all duration-150
                          flex flex-col items-center justify-center gap-1
                          ${isSelected
                            ? 'bg-teal-500 border-teal-400 shadow-lg shadow-teal-500/40 scale-105 ring-2 ring-teal-300/40 ring-offset-1 ring-offset-slate-950'
                            : isAvailable
                            ? 'bg-emerald-500/10 border-emerald-500/40 hover:bg-emerald-500/25 hover:border-emerald-400 hover:scale-105 hover:shadow-md hover:shadow-emerald-500/20 cursor-pointer'
                            : isBooked
                            ? 'bg-rose-500/8 border-rose-500/25 opacity-75 cursor-not-allowed'
                            : 'bg-slate-900/40 border-slate-800 opacity-40 cursor-not-allowed'
                          }
                        `}
                      >
                        {isSelected && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-teal-400 rounded-full flex items-center justify-center text-slate-950 text-[9px] font-black shadow-sm">
                            ✓
                          </span>
                        )}
                        <span className={`text-xs font-bold ${isSelected ? 'text-slate-950' : isAvailable ? 'text-emerald-200' : isBooked ? 'text-rose-400' : 'text-slate-600'}`}>
                          {slot.time}
                        </span>
                        <span className={`text-[8px] uppercase font-extrabold tracking-wide px-1.5 py-0.5 rounded-full ${
                          isSelected ? 'bg-teal-600/30 text-teal-950'
                          : isAvailable ? 'bg-emerald-500/20 text-emerald-400'
                          : isBooked ? 'bg-rose-500/15 text-rose-400'
                          : 'bg-slate-800 text-slate-600'
                        }`}>
                          {isSelected ? 'Chosen' : isAvailable ? 'Open' : isBooked ? 'Booked' : 'N/A'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Confirmation bar */}
                {selectedSlot && (
                  <div className="flex items-center gap-3 p-3.5 bg-teal-500/10 border border-teal-500/30 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-teal-400 flex-shrink-0" />
                    <div>
                      <p className="text-teal-200 text-sm font-bold">✅ Slot Confirmed: {selectedSlot}</p>
                      <p className="text-teal-400/60 text-[11px]">
                        {new Date(apptDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        {selectedDoctor ? ` · Dr. ${selectedDoctor.email.split('@')[0].toUpperCase()}` : ''}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!selectedDocId || !apptDate || !selectedSlot || !symptoms || !!success}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all flex justify-center items-center gap-2"
        >
          <Stethoscope className="w-4 h-4" />
          Confirm &amp; Book Appointment
          <ChevronRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

export default BookAppointment;
