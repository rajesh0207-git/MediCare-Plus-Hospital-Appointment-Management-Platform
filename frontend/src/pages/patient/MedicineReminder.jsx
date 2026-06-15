import React, { useEffect, useState, useCallback } from 'react';
import {
  Pill, Plus, Trash2, CheckCircle, XCircle, Clock,
  AlertCircle, Bell, BellOff, History, Calendar,
  ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
  RefreshCw, ClipboardList, Info, Edit3, Check
} from 'lucide-react';
import {
  createReminder, listReminders, updateReminder, deleteReminder,
  logMedicineTaken, getTodayReminders, getAllHistory
} from '../../services/medicineReminderApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (dt) => {
  if (!dt) return '—';
  try { return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return dt; }
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const frequencyLabel = (f) => {
  const map = {
    DAILY: 'Once Daily', TWICE_DAILY: 'Twice Daily', THREE_TIMES: '3× Daily',
    WEEKLY: 'Weekly', AS_NEEDED: 'As Needed'
  };
  return map[f] || f;
};

const statusConfig = {
  TAKEN:   { color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', icon: CheckCircle, label: 'Taken' },
  MISSED:  { color: 'bg-rose-500/15 text-rose-400 border-rose-500/25',         icon: XCircle,     label: 'Missed' },
  SKIPPED: { color: 'bg-amber-500/15 text-amber-400 border-amber-500/25',       icon: Clock,       label: 'Skipped' },
  PENDING: { color: 'bg-slate-700/40 text-slate-300 border-slate-600/30',       icon: Bell,        label: 'Pending' },
};

const FREQ_OPTIONS = ['DAILY', 'TWICE_DAILY', 'THREE_TIMES', 'WEEKLY', 'AS_NEEDED'];

// ─── Tab Button ───────────────────────────────────────────────────────────────
const TabBtn = ({ active, onClick, icon: Icon, label, badge }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
      active
        ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
    }`}
  >
    <Icon className="w-4 h-4" />
    <span>{label}</span>
    {badge !== undefined && badge > 0 && (
      <span className="bg-teal-500 text-slate-950 text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center">
        {badge}
      </span>
    )}
  </button>
);

// ─── Form Input ───────────────────────────────────────────────────────────────
const FI = ({ label, type = 'text', value, onChange, placeholder, min, max, required, children }) => (
  <div className="space-y-1">
    <label className="block text-slate-300 text-xs font-semibold">{label}</label>
    {children || (
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        min={min} max={max} required={required}
        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all placeholder:text-slate-600"
      />
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const MedicineReminder = () => {
  const [tab, setTab] = useState('today');   // 'today' | 'reminders' | 'history'
  const [reminders, setReminders]   = useState([]);
  const [todayList, setTodayList]   = useState([]);
  const [history,   setHistory]     = useState([]);
  const [loading,   setLoading]     = useState(true);
  const [error,     setError]       = useState('');
  const [success,   setSuccess]     = useState('');

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    medicine_name: '', dosage: '', frequency: 'DAILY',
    reminder_time: '08:00', reminder_time_2: '', reminder_time_3: '',
    start_date: todayStr(), end_date: '', notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Logging state
  const [loggingId, setLoggingId] = useState(null);

  // ─── Data fetch ─────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [remRes, todayRes, histRes] = await Promise.all([
        listReminders(),
        getTodayReminders(),
        getAllHistory(100),
      ]);
      setReminders(remRes.data);
      setTodayList(todayRes.data);
      setHistory(histRes.data);
    } catch (err) {
      setError('Failed to load medicine reminder data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3500);
  };

  // ─── Create Reminder ────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createReminder({
        medicine_name: form.medicine_name,
        dosage: form.dosage || undefined,
        frequency: form.frequency,
        reminder_time: form.reminder_time,
        reminder_time_2: form.reminder_time_2 || undefined,
        reminder_time_3: form.reminder_time_3 || undefined,
        start_date: form.start_date,
        end_date: form.end_date || undefined,
        notes: form.notes || undefined,
      });
      setForm({
        medicine_name: '', dosage: '', frequency: 'DAILY',
        reminder_time: '08:00', reminder_time_2: '', reminder_time_3: '',
        start_date: todayStr(), end_date: '', notes: ''
      });
      setShowForm(false);
      showSuccess('Medicine reminder created successfully!');
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create reminder.');
    } finally { setSubmitting(false); }
  };

  // ─── Toggle Active ──────────────────────────────────────────────────────────
  const handleToggleActive = async (r) => {
    try {
      await updateReminder(r.id, { is_active: !r.is_active });
      showSuccess(r.is_active ? 'Reminder paused.' : 'Reminder activated!');
      fetchAll();
    } catch { setError('Failed to update reminder status.'); }
  };

  // ─── Delete Reminder ────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this medicine reminder and all its history?')) return;
    try {
      await deleteReminder(id);
      showSuccess('Reminder deleted.');
      fetchAll();
    } catch { setError('Failed to delete reminder.'); }
  };

  // ─── Log Medicine Status ────────────────────────────────────────────────────
  const handleLog = async (item, newStatus) => {
    setLoggingId(`${item.reminder_id}-${item.scheduled_time}`);
    try {
      await logMedicineTaken(
        item.reminder_id,
        item.scheduled_date,
        item.scheduled_time,
        { status: newStatus }
      );
      showSuccess(`Marked as ${newStatus.toLowerCase()}!`);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to log medicine status.');
    } finally { setLoggingId(null); }
  };

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading medicine reminders…</p>
      </div>
    );
  }

  const pendingToday = todayList.filter(t => t.status === 'PENDING').length;
  const activeCount  = reminders.filter(r => r.is_active).length;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Pill className="w-6 h-6 text-violet-400" />
            <span>Medicine Reminder System</span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Schedule and track your daily medications with smart reminders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} className="flex items-center gap-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-all">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
              showForm
                ? 'bg-slate-800 text-slate-300 border border-slate-700'
                : 'bg-violet-500 hover:bg-violet-600 text-white shadow-lg shadow-violet-500/20'
            }`}
          >
            <Plus className="w-4 h-4" />
            {showForm ? 'Cancel' : 'Add Reminder'}
          </button>
        </div>
      </div>

      {/* ── Alert Messages ─────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-rose-400">✕</button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-sm flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* ── Stats Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className="text-3xl font-extrabold text-violet-400">{reminders.length}</p>
          <p className="text-slate-400 text-xs mt-1">Total Reminders</p>
        </div>
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className="text-3xl font-extrabold text-emerald-400">{activeCount}</p>
          <p className="text-slate-400 text-xs mt-1">Active</p>
        </div>
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className={`text-3xl font-extrabold ${pendingToday > 0 ? 'text-amber-400' : 'text-slate-400'}`}>{pendingToday}</p>
          <p className="text-slate-400 text-xs mt-1">Due Today</p>
        </div>
      </div>

      {/* ── Create Reminder Form ────────────────────────────────────────────── */}
      {showForm && (
        <div className="glass-panel border border-violet-500/20 rounded-2xl p-6 animate-fade-in">
          <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
            <Pill className="w-4 h-4 text-violet-400" />
            Schedule New Medicine Reminder
          </h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FI label="Medicine Name *" required value={form.medicine_name}
                onChange={e => setForm({...form, medicine_name: e.target.value})} placeholder="e.g. Metformin 500mg" />
              <FI label="Dosage" value={form.dosage}
                onChange={e => setForm({...form, dosage: e.target.value})} placeholder="e.g. 1 tablet, 5ml" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FI label="Frequency *">
                <select value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})} required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500 transition-all">
                  {FREQ_OPTIONS.map(f => <option key={f} value={f}>{frequencyLabel(f)}</option>)}
                </select>
              </FI>
              <FI label="Primary Reminder Time *" type="time" required value={form.reminder_time}
                onChange={e => setForm({...form, reminder_time: e.target.value})} />
            </div>

            {(form.frequency === 'TWICE_DAILY' || form.frequency === 'THREE_TIMES') && (
              <div className="grid grid-cols-2 gap-4">
                <FI label="2nd Reminder Time" type="time" value={form.reminder_time_2}
                  onChange={e => setForm({...form, reminder_time_2: e.target.value})} />
                {form.frequency === 'THREE_TIMES' && (
                  <FI label="3rd Reminder Time" type="time" value={form.reminder_time_3}
                    onChange={e => setForm({...form, reminder_time_3: e.target.value})} />
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FI label="Start Date *" type="date" required value={form.start_date}
                onChange={e => setForm({...form, start_date: e.target.value})} />
              <FI label="End Date (optional)" type="date" value={form.end_date}
                onChange={e => setForm({...form, end_date: e.target.value})} />
            </div>

            <FI label="Notes (optional)" value={form.notes}
              onChange={e => setForm({...form, notes: e.target.value})} placeholder="Special instructions, food restrictions, etc." />

            <div className="flex gap-3 justify-end pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setShowForm(false)}
                className="py-2 px-4 bg-slate-800 text-slate-400 rounded-xl text-sm hover:text-white border border-slate-700 transition-all">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="py-2 px-6 bg-violet-500 hover:bg-violet-600 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20">
                {submitting ? 'Saving…' : 'Create Reminder'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Tab Navigation ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
        <TabBtn active={tab === 'today'} onClick={() => setTab('today')}
          icon={Bell} label="Today's Schedule" badge={pendingToday} />
        <TabBtn active={tab === 'reminders'} onClick={() => setTab('reminders')}
          icon={ClipboardList} label="My Reminders" />
        <TabBtn active={tab === 'history'} onClick={() => setTab('history')}
          icon={History} label="History Log" />
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB: TODAY'S SCHEDULE                                                 */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {tab === 'today' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-400" />
              Today — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h3>
            <span className="text-xs text-slate-500">{todayList.length} dose{todayList.length !== 1 ? 's' : ''} scheduled</span>
          </div>

          {todayList.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center space-y-3 border-dashed border border-slate-700">
              <div className="w-14 h-14 bg-violet-500/10 rounded-2xl flex items-center justify-center mx-auto">
                <BellOff className="w-7 h-7 text-violet-400" />
              </div>
              <p className="text-white font-bold">No medicines scheduled today</p>
              <p className="text-slate-500 text-xs">Add a medicine reminder using the button above to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayList.map((item, idx) => {
                const cfg = statusConfig[item.status] || statusConfig.PENDING;
                const StatusIcon = cfg.icon;
                const logKey = `${item.reminder_id}-${item.scheduled_time}`;
                const isLogging = loggingId === logKey;

                return (
                  <div key={idx} className={`glass-panel rounded-2xl p-4 border transition-all ${
                    item.status === 'TAKEN' ? 'border-emerald-500/20 bg-emerald-500/3' :
                    item.status === 'MISSED' ? 'border-rose-500/15' :
                    item.status === 'SKIPPED' ? 'border-amber-500/15' :
                    'border-slate-700/60 hover:border-violet-500/30'
                  }`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          item.status === 'TAKEN' ? 'bg-emerald-500/15' :
                          item.status === 'MISSED' ? 'bg-rose-500/15' :
                          'bg-violet-500/10'
                        }`}>
                          <StatusIcon className={`w-5 h-5 ${
                            item.status === 'TAKEN' ? 'text-emerald-400' :
                            item.status === 'MISSED' ? 'text-rose-400' :
                            item.status === 'SKIPPED' ? 'text-amber-400' :
                            'text-violet-400'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-white font-bold text-sm truncate">{item.medicine_name}</p>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${cfg.color}`}>
                              {cfg.label}
                            </span>
                          </div>
                          <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            Scheduled at <strong className="text-violet-300">{item.scheduled_time}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {item.status === 'PENDING' && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleLog(item, 'TAKEN')}
                            disabled={isLogging}
                            className="flex items-center gap-1.5 py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/20 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Taken
                          </button>
                          <button
                            onClick={() => handleLog(item, 'SKIPPED')}
                            disabled={isLogging}
                            className="flex items-center gap-1.5 py-1.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            Skip
                          </button>
                          <button
                            onClick={() => handleLog(item, 'MISSED')}
                            disabled={isLogging}
                            className="flex items-center gap-1.5 py-1.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Missed
                          </button>
                        </div>
                      )}

                      {item.status !== 'PENDING' && (
                        <button
                          onClick={() => handleLog(item, 'PENDING')}
                          className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded-xl text-xs transition-all"
                          title="Undo"
                        >
                          Undo
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB: MY REMINDERS                                                     */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {tab === 'reminders' && (
        <div className="space-y-4 animate-fade-in">
          {reminders.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center space-y-3 border-dashed border border-slate-700">
              <div className="w-14 h-14 bg-violet-500/10 rounded-2xl flex items-center justify-center mx-auto">
                <Pill className="w-7 h-7 text-violet-400" />
              </div>
              <p className="text-white font-bold">No medicine reminders set up</p>
              <p className="text-slate-500 text-xs">Create your first reminder using the "Add Reminder" button above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {reminders.map(r => (
                <div key={r.id} className={`glass-panel rounded-2xl p-5 border transition-all ${
                  r.is_active ? 'border-slate-700/60 hover:border-violet-500/25' : 'border-slate-800/40 opacity-60'
                }`}>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        r.is_active ? 'bg-violet-500/15' : 'bg-slate-800'
                      }`}>
                        <Pill className={`w-5 h-5 ${r.is_active ? 'text-violet-400' : 'text-slate-500'}`} />
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-sm">{r.medicine_name}</h4>
                        {r.dosage && <p className="text-slate-400 text-[10px]">{r.dosage}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/* Toggle Active */}
                      <button
                        onClick={() => handleToggleActive(r)}
                        className={`p-1.5 rounded-lg transition-all border ${
                          r.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                        }`}
                        title={r.is_active ? 'Pause reminder' : 'Activate reminder'}
                      >
                        {r.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 rounded-lg bg-rose-500/5 hover:bg-rose-500/15 text-rose-400 border border-rose-500/15 transition-all"
                        title="Delete reminder"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 border-t border-slate-800/60 pt-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2.5 py-1 bg-violet-500/10 text-violet-300 border border-violet-500/20 rounded-lg text-[10px] font-bold">
                        {frequencyLabel(r.frequency)}
                      </span>
                      <span className="px-2.5 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-mono">
                        ⏰ {r.reminder_time}
                      </span>
                      {r.reminder_time_2 && (
                        <span className="px-2.5 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-mono">
                          ⏰ {r.reminder_time_2}
                        </span>
                      )}
                      {r.reminder_time_3 && (
                        <span className="px-2.5 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-mono">
                          ⏰ {r.reminder_time_3}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-[10px] text-slate-500">
                      <span>Start: <span className="text-slate-300">{r.start_date}</span></span>
                      {r.end_date && <span>End: <span className="text-slate-300">{r.end_date}</span></span>}
                    </div>

                    {r.notes && (
                      <p className="text-slate-500 text-[10px] italic bg-slate-900/40 px-3 py-2 rounded-xl border border-slate-800/50">
                        📝 {r.notes}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                        r.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}>
                        {r.is_active ? '● Active' : '○ Paused'}
                      </span>
                      <span className="text-[10px] text-slate-600">Added {formatDate(r.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB: HISTORY LOG                                                      */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-teal-400" />
              Reminder History Log
            </h3>
            <div className="flex gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />Taken</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400" />Missed</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />Skipped</span>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center space-y-3 border-dashed border border-slate-700">
              <div className="w-14 h-14 bg-teal-500/10 rounded-2xl flex items-center justify-center mx-auto">
                <History className="w-7 h-7 text-teal-400" />
              </div>
              <p className="text-white font-bold">No history yet</p>
              <p className="text-slate-500 text-xs">Start marking your medicines as taken from the Today's Schedule tab.</p>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
              <div className="grid grid-cols-4 bg-slate-900/80 px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <span>Medicine</span>
                <span>Date</span>
                <span>Time</span>
                <span>Status</span>
              </div>
              <div className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto">
                {history.map((h, idx) => {
                  const cfg = statusConfig[h.status] || statusConfig.PENDING;
                  return (
                    <div key={idx} className="grid grid-cols-4 px-5 py-3.5 hover:bg-slate-900/40 transition-colors items-center text-xs">
                      <div>
                        <p className="text-white font-semibold">{h.medicine_name || '—'}</p>
                        <p className="text-slate-600 text-[9px]">Rem. #{h.reminder_id}</p>
                      </div>
                      <span className="text-slate-300">{h.scheduled_date}</span>
                      <span className="text-slate-300 font-mono">{h.scheduled_time}</span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border w-fit ${cfg.color}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary stats */}
          {history.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              {['TAKEN', 'MISSED', 'SKIPPED'].map(s => {
                const cnt = history.filter(h => h.status === s).length;
                const pct = history.length > 0 ? Math.round((cnt / history.length) * 100) : 0;
                const cfg = statusConfig[s];
                return (
                  <div key={s} className="glass-card rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className={`text-xs font-bold ${s === 'TAKEN' ? 'text-emerald-400' : s === 'MISSED' ? 'text-rose-400' : 'text-amber-400'}`}>
                        {cfg.label}
                      </span>
                      <span className="text-white font-extrabold">{cnt}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${s === 'TAKEN' ? 'bg-emerald-500' : s === 'MISSED' ? 'bg-rose-500' : 'bg-amber-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-slate-500 text-[10px]">{pct}% of logs</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MedicineReminder;
