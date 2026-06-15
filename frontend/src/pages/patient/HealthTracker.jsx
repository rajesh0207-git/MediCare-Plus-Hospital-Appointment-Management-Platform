import React, { useEffect, useState, useCallback } from 'react';
import {
  Activity, Scale, Ruler, HeartPulse, Droplets,
  Plus, Trash2, TrendingUp, TrendingDown, Minus,
  AlertCircle, CheckCircle, ChevronDown, ChevronUp,
  RefreshCw, BarChart3, Info
} from 'lucide-react';
import {
  addWeight, getWeights, deleteWeight,
  addHeight, getHeights, deleteHeight,
  addBP, getBPs, deleteBP,
  addSugar, getSugars, deleteSugar,
  getHealthSummary
} from '../../services/healthTrackerApi';

// ─── Helper: Status badge colors ─────────────────────────────────────────────
const categoryColor = (cat) => {
  if (!cat) return 'bg-slate-700 text-slate-300';
  const map = {
    NORMAL: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
    ELEVATED: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
    HIGH_STAGE1: 'bg-orange-500/15 text-orange-400 border border-orange-500/25',
    HIGH_STAGE2: 'bg-rose-500/15 text-rose-400 border border-rose-500/25',
    CRISIS: 'bg-red-600/25 text-red-400 border border-red-500/40',
    PREDIABETES: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
    DIABETES: 'bg-rose-500/15 text-rose-400 border border-rose-500/25',
    UNDERWEIGHT: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25',
    OVERWEIGHT: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
    OBESE: 'bg-rose-500/15 text-rose-400 border border-rose-500/25',
  };
  return map[cat] || 'bg-slate-700/40 text-slate-400';
};

const categoryLabel = (cat) => {
  if (!cat) return '—';
  const map = {
    NORMAL: 'Normal',
    ELEVATED: 'Elevated',
    HIGH_STAGE1: 'High (Stage 1)',
    HIGH_STAGE2: 'High (Stage 2)',
    CRISIS: 'Hypertensive Crisis',
    PREDIABETES: 'Pre-Diabetes',
    DIABETES: 'Diabetes',
    UNDERWEIGHT: 'Underweight',
    OVERWEIGHT: 'Overweight',
    OBESE: 'Obese',
  };
  return map[cat] || cat;
};

const formatDate = (dt) => {
  if (!dt) return '—';
  try { return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return dt; }
};

const today = () => new Date().toISOString().slice(0, 16);

// ─── Mini spark-line using SVG ────────────────────────────────────────────────
const SparkLine = ({ data, color = '#14b8a6', height = 36, valueKey }) => {
  if (!data || data.length < 2) return null;
  const vals = [...data].reverse().map(d => d[valueKey] || 0);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const w = 120;
  const h = height;
  const points = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-70">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={points} />
    </svg>
  );
};

// ─── Input field helper ───────────────────────────────────────────────────────
const FormInput = ({ label, type = 'text', value, onChange, placeholder, min, max, step, required }) => (
  <div className="space-y-1">
    <label className="block text-slate-300 text-xs font-semibold">{label}</label>
    <input
      type={type} value={value} onChange={onChange}
      placeholder={placeholder} min={min} max={max} step={step} required={required}
      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder:text-slate-600"
    />
  </div>
);

// ─── Section header ───────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, color, count, onAdd, addOpen, onToggleAdd }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2.5">
      <div className={`p-2 rounded-xl ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <h3 className="text-white font-bold text-sm">{title}</h3>
        <p className="text-slate-500 text-[10px]">{count} record{count !== 1 ? 's' : ''}</p>
      </div>
    </div>
    <button
      onClick={onToggleAdd}
      className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all ${
        addOpen
          ? 'bg-slate-800 text-slate-300 border border-slate-700'
          : 'bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500 hover:text-slate-950'
      }`}
    >
      {addOpen ? <><ChevronUp className="w-3.5 h-3.5" /> Close</> : <><Plus className="w-3.5 h-3.5" /> Add</>}
    </button>
  </div>
);

// ─── Record row ───────────────────────────────────────────────────────────────
const RecordRow = ({ children, onDelete, deleting }) => (
  <div className="flex items-center justify-between px-4 py-3 bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/60 hover:border-slate-700 rounded-xl transition-all group text-xs">
    <div className="flex items-center gap-4 flex-1">{children}</div>
    <button
      onClick={onDelete}
      disabled={deleting}
      className="opacity-0 group-hover:opacity-100 p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all ml-3"
      title="Delete record"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const HealthTracker = () => {
  const [summary, setSummary]   = useState(null);
  const [weights, setWeights]   = useState([]);
  const [heights, setHeights]   = useState([]);
  const [bps, setBps]           = useState([]);
  const [sugars, setSugars]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  // Add-form toggles
  const [addWeight_,  setAddWeight_]  = useState(false);
  const [addHeight_,  setAddHeight_]  = useState(false);
  const [addBP_,      setAddBP_]      = useState(false);
  const [addSugar_,   setAddSugar_]   = useState(false);

  // Form values
  const [wForm,  setWForm]  = useState({ weight_kg: '', notes: '', recorded_at: today() });
  const [hForm,  setHForm]  = useState({ height_cm: '', notes: '', recorded_at: today() });
  const [bpForm, setBpForm] = useState({ systolic: '', diastolic: '', pulse: '', notes: '', recorded_at: today() });
  const [sForm,  setSForm]  = useState({ glucose_mgdl: '', measurement_type: 'FASTING', notes: '', recorded_at: today() });

  const [submitting, setSubmitting] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // ─── Fetch all ─────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sumRes, wRes, hRes, bpRes, sRes] = await Promise.all([
        getHealthSummary(),
        getWeights(),
        getHeights(),
        getBPs(),
        getSugars(),
      ]);
      setSummary(sumRes.data);
      setWeights(wRes.data);
      setHeights(hRes.data);
      setBps(bpRes.data);
      setSugars(sRes.data);
    } catch (err) {
      setError('Failed to load health data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  // ─── Submit handlers ────────────────────────────────────────────────────────
  const handleAddWeight = async (e) => {
    e.preventDefault();
    setSubmitting('weight');
    try {
      await addWeight({ weight_kg: parseFloat(wForm.weight_kg), notes: wForm.notes, recorded_at: wForm.recorded_at || undefined });
      setWForm({ weight_kg: '', notes: '', recorded_at: today() });
      setAddWeight_(false);
      showSuccess('Weight recorded successfully!');
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save weight.');
    } finally { setSubmitting(''); }
  };

  const handleAddHeight = async (e) => {
    e.preventDefault();
    setSubmitting('height');
    try {
      await addHeight({ height_cm: parseFloat(hForm.height_cm), notes: hForm.notes, recorded_at: hForm.recorded_at || undefined });
      setHForm({ height_cm: '', notes: '', recorded_at: today() });
      setAddHeight_(false);
      showSuccess('Height recorded successfully!');
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save height.');
    } finally { setSubmitting(''); }
  };

  const handleAddBP = async (e) => {
    e.preventDefault();
    setSubmitting('bp');
    try {
      await addBP({
        systolic: parseInt(bpForm.systolic),
        diastolic: parseInt(bpForm.diastolic),
        pulse: bpForm.pulse ? parseInt(bpForm.pulse) : undefined,
        notes: bpForm.notes,
        recorded_at: bpForm.recorded_at || undefined
      });
      setBpForm({ systolic: '', diastolic: '', pulse: '', notes: '', recorded_at: today() });
      setAddBP_(false);
      showSuccess('Blood pressure recorded!');
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save blood pressure.');
    } finally { setSubmitting(''); }
  };

  const handleAddSugar = async (e) => {
    e.preventDefault();
    setSubmitting('sugar');
    try {
      await addSugar({
        glucose_mgdl: parseFloat(sForm.glucose_mgdl),
        measurement_type: sForm.measurement_type,
        notes: sForm.notes,
        recorded_at: sForm.recorded_at || undefined
      });
      setSForm({ glucose_mgdl: '', measurement_type: 'FASTING', notes: '', recorded_at: today() });
      setAddSugar_(false);
      showSuccess('Sugar level recorded!');
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save sugar level.');
    } finally { setSubmitting(''); }
  };

  // ─── Delete handlers ────────────────────────────────────────────────────────
  const handleDelete = async (type, id) => {
    if (!window.confirm('Delete this record?')) return;
    setDeletingId(id);
    try {
      if (type === 'weight') await deleteWeight(id);
      if (type === 'height') await deleteHeight(id);
      if (type === 'bp') await deleteBP(id);
      if (type === 'sugar') await deleteSugar(id);
      showSuccess('Record deleted.');
      fetchAll();
    } catch { setError('Failed to delete record.'); }
    finally { setDeletingId(null); }
  };

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading your health data…</p>
      </div>
    );
  }

  // ─── BMI gauge ─────────────────────────────────────────────────────────────
  const bmi = summary?.latest_bmi;
  const bmiCat = summary?.bmi_category;
  const bmiPercent = bmi ? Math.min(100, Math.max(0, ((bmi - 10) / 30) * 100)) : 0;
  const bmiColor = bmiCat === 'NORMAL' ? '#10b981' : bmiCat === 'OVERWEIGHT' ? '#f59e0b' : bmiCat === 'OBESE' ? '#f43f5e' : '#06b6d4';

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-teal-400" />
            <span>Patient Health Tracker</span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">Monitor weight, height, blood pressure, and blood sugar trends.</p>
        </div>
        <button
          onClick={fetchAll}
          className="flex items-center gap-2 py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* ── Alert Messages ─────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-rose-400 hover:text-rose-300">✕</button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-sm flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* ── Health Analytics Summary ───────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-teal-400" />
          Health Analytics Overview
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* BMI Card */}
          <div className="glass-card rounded-2xl p-5 col-span-1 sm:col-span-2 lg:col-span-1 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Body Mass Index</p>
                <p className="text-3xl font-extrabold text-white mt-1">{bmi ?? '—'}</p>
              </div>
              <div className="p-2 bg-teal-500/10 rounded-xl text-teal-400">
                <Scale className="w-5 h-5" />
              </div>
            </div>
            {bmi && (
              <div className="space-y-1.5">
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${bmiPercent}%`, backgroundColor: bmiColor }} />
                </div>
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>Underweight</span><span>Normal</span><span>Obese</span>
                </div>
              </div>
            )}
            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${categoryColor(bmiCat)}`}>
              {categoryLabel(bmiCat)}
            </span>
          </div>

          {/* Latest Weight */}
          <div className="glass-card rounded-2xl p-5 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Latest Weight</p>
                <p className="text-3xl font-extrabold text-white mt-1">
                  {summary?.latest_weight_kg ?? '—'}<span className="text-base text-slate-400 ml-1">kg</span>
                </p>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400"><Scale className="w-5 h-5" /></div>
            </div>
            <SparkLine data={weights} valueKey="weight_kg" color="#60a5fa" />
            <p className="text-slate-500 text-[10px]">{summary?.total_weight_records ?? 0} records total</p>
          </div>

          {/* Latest BP */}
          <div className="glass-card rounded-2xl p-5 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Blood Pressure</p>
                <p className="text-2xl font-extrabold text-white mt-1">
                  {summary?.latest_bp_systolic ?? '—'}<span className="text-slate-400 text-sm">/</span>{summary?.latest_bp_diastolic ?? '—'}
                  <span className="text-base text-slate-400 ml-1">mmHg</span>
                </p>
              </div>
              <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400"><HeartPulse className="w-5 h-5" /></div>
            </div>
            <SparkLine data={bps} valueKey="systolic" color="#f43f5e" />
            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${categoryColor(summary?.bp_category)}`}>
              {categoryLabel(summary?.bp_category)}
            </span>
          </div>

          {/* Latest Glucose */}
          <div className="glass-card rounded-2xl p-5 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Blood Glucose</p>
                <p className="text-3xl font-extrabold text-white mt-1">
                  {summary?.latest_glucose_mgdl ?? '—'}<span className="text-base text-slate-400 ml-1">mg/dL</span>
                </p>
              </div>
              <div className="p-2 bg-violet-500/10 rounded-xl text-violet-400"><Droplets className="w-5 h-5" /></div>
            </div>
            <SparkLine data={sugars} valueKey="glucose_mgdl" color="#a78bfa" />
            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${categoryColor(summary?.glucose_category)}`}>
              {categoryLabel(summary?.glucose_category)}
            </span>
          </div>
        </div>
      </div>

      {/* ── 4 Tracker Sections Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── WEIGHT ────────────────────────────────────────────────────────── */}
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <SectionHeader
            icon={Scale} title="Weight Tracking" color="bg-blue-500/10 text-blue-400"
            count={weights.length} addOpen={addWeight_}
            onToggleAdd={() => setAddWeight_(!addWeight_)}
          />

          {addWeight_ && (
            <form onSubmit={handleAddWeight} className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3 animate-fade-in">
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Weight (kg)" type="number" step="0.1" min="1" max="500" required
                  value={wForm.weight_kg} onChange={e => setWForm({...wForm, weight_kg: e.target.value})} placeholder="e.g. 70.5" />
                <FormInput label="Date & Time" type="datetime-local"
                  value={wForm.recorded_at} onChange={e => setWForm({...wForm, recorded_at: e.target.value})} />
              </div>
              <FormInput label="Notes (optional)" value={wForm.notes}
                onChange={e => setWForm({...wForm, notes: e.target.value})} placeholder="Any remarks..." />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setAddWeight_(false)} className="py-1.5 px-3 bg-slate-800 text-slate-400 rounded-lg text-xs hover:text-white border border-slate-700">Cancel</button>
                <button type="submit" disabled={submitting === 'weight'} className="py-1.5 px-4 bg-teal-500 hover:bg-teal-600 text-slate-950 rounded-lg text-xs font-bold transition-all disabled:opacity-50">
                  {submitting === 'weight' ? 'Saving…' : 'Save Weight'}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {weights.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-8">No weight records. Add your first entry above.</p>
            ) : weights.map(r => (
              <RecordRow key={r.id} onDelete={() => handleDelete('weight', r.id)} deleting={deletingId === r.id}>
                <div className="w-16 text-center">
                  <span className="text-white font-extrabold text-sm">{r.weight_kg}</span>
                  <span className="text-slate-500 text-[10px] block">kg</span>
                </div>
                {r.bmi && (
                  <div className="w-14 text-center">
                    <span className="text-slate-300 font-bold text-xs">{r.bmi}</span>
                    <span className="text-slate-500 text-[10px] block">BMI</span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-slate-400 text-[10px]">{formatDate(r.recorded_at)}</p>
                  {r.notes && <p className="text-slate-500 text-[9px] italic truncate max-w-[160px]">{r.notes}</p>}
                </div>
              </RecordRow>
            ))}
          </div>
        </div>

        {/* ── HEIGHT ────────────────────────────────────────────────────────── */}
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <SectionHeader
            icon={Ruler} title="Height Tracking" color="bg-cyan-500/10 text-cyan-400"
            count={heights.length} addOpen={addHeight_}
            onToggleAdd={() => setAddHeight_(!addHeight_)}
          />

          {addHeight_ && (
            <form onSubmit={handleAddHeight} className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3 animate-fade-in">
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Height (cm)" type="number" step="0.1" min="50" max="300" required
                  value={hForm.height_cm} onChange={e => setHForm({...hForm, height_cm: e.target.value})} placeholder="e.g. 170.5" />
                <FormInput label="Date & Time" type="datetime-local"
                  value={hForm.recorded_at} onChange={e => setHForm({...hForm, recorded_at: e.target.value})} />
              </div>
              <FormInput label="Notes (optional)" value={hForm.notes}
                onChange={e => setHForm({...hForm, notes: e.target.value})} placeholder="Any remarks..." />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setAddHeight_(false)} className="py-1.5 px-3 bg-slate-800 text-slate-400 rounded-lg text-xs hover:text-white border border-slate-700">Cancel</button>
                <button type="submit" disabled={submitting === 'height'} className="py-1.5 px-4 bg-teal-500 hover:bg-teal-600 text-slate-950 rounded-lg text-xs font-bold transition-all disabled:opacity-50">
                  {submitting === 'height' ? 'Saving…' : 'Save Height'}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {heights.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-8">No height records. Add your first entry above.</p>
            ) : heights.map(r => (
              <RecordRow key={r.id} onDelete={() => handleDelete('height', r.id)} deleting={deletingId === r.id}>
                <div className="w-16 text-center">
                  <span className="text-white font-extrabold text-sm">{r.height_cm}</span>
                  <span className="text-slate-500 text-[10px] block">cm</span>
                </div>
                <div className="w-14 text-center">
                  <span className="text-slate-400 font-bold text-xs">{(r.height_cm / 100).toFixed(2)}</span>
                  <span className="text-slate-500 text-[10px] block">m</span>
                </div>
                <div className="flex-1">
                  <p className="text-slate-400 text-[10px]">{formatDate(r.recorded_at)}</p>
                  {r.notes && <p className="text-slate-500 text-[9px] italic truncate max-w-[160px]">{r.notes}</p>}
                </div>
              </RecordRow>
            ))}
          </div>
        </div>

        {/* ── BLOOD PRESSURE ────────────────────────────────────────────────── */}
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <SectionHeader
            icon={HeartPulse} title="Blood Pressure Tracking" color="bg-rose-500/10 text-rose-400"
            count={bps.length} addOpen={addBP_}
            onToggleAdd={() => setAddBP_(!addBP_)}
          />

          {addBP_ && (
            <form onSubmit={handleAddBP} className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3 animate-fade-in">
              <div className="grid grid-cols-3 gap-3">
                <FormInput label="Systolic (mmHg)" type="number" min="60" max="250" required
                  value={bpForm.systolic} onChange={e => setBpForm({...bpForm, systolic: e.target.value})} placeholder="120" />
                <FormInput label="Diastolic (mmHg)" type="number" min="40" max="150" required
                  value={bpForm.diastolic} onChange={e => setBpForm({...bpForm, diastolic: e.target.value})} placeholder="80" />
                <FormInput label="Pulse (bpm)" type="number" min="30" max="250"
                  value={bpForm.pulse} onChange={e => setBpForm({...bpForm, pulse: e.target.value})} placeholder="72" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Date & Time" type="datetime-local"
                  value={bpForm.recorded_at} onChange={e => setBpForm({...bpForm, recorded_at: e.target.value})} />
                <FormInput label="Notes (optional)" value={bpForm.notes}
                  onChange={e => setBpForm({...bpForm, notes: e.target.value})} placeholder="Any remarks..." />
              </div>
              {/* BP Guide */}
              <div className="flex items-start gap-2 p-2.5 bg-blue-500/5 border border-blue-500/10 rounded-xl text-[10px] text-slate-400">
                <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>Normal BP: 120/80 mmHg. Below 120/80 is optimal. 130-139/80-89 is Stage 1 hypertension.</span>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setAddBP_(false)} className="py-1.5 px-3 bg-slate-800 text-slate-400 rounded-lg text-xs hover:text-white border border-slate-700">Cancel</button>
                <button type="submit" disabled={submitting === 'bp'} className="py-1.5 px-4 bg-teal-500 hover:bg-teal-600 text-slate-950 rounded-lg text-xs font-bold transition-all disabled:opacity-50">
                  {submitting === 'bp' ? 'Saving…' : 'Save BP Reading'}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {bps.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-8">No BP records. Add your first reading above.</p>
            ) : bps.map(r => (
              <RecordRow key={r.id} onDelete={() => handleDelete('bp', r.id)} deleting={deletingId === r.id}>
                <div className="w-20 text-center">
                  <span className="text-white font-extrabold text-sm">{r.systolic}/{r.diastolic}</span>
                  <span className="text-slate-500 text-[10px] block">mmHg</span>
                </div>
                {r.pulse && (
                  <div className="w-12 text-center">
                    <span className="text-slate-300 text-xs font-bold">{r.pulse}</span>
                    <span className="text-slate-500 text-[10px] block">bpm</span>
                  </div>
                )}
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${categoryColor(r.category)}`}>
                  {categoryLabel(r.category)}
                </span>
                <div className="flex-1 text-right">
                  <p className="text-slate-400 text-[10px]">{formatDate(r.recorded_at)}</p>
                </div>
              </RecordRow>
            ))}
          </div>
        </div>

        {/* ── SUGAR LEVEL ───────────────────────────────────────────────────── */}
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <SectionHeader
            icon={Droplets} title="Sugar Level Monitoring" color="bg-violet-500/10 text-violet-400"
            count={sugars.length} addOpen={addSugar_}
            onToggleAdd={() => setAddSugar_(!addSugar_)}
          />

          {addSugar_ && (
            <form onSubmit={handleAddSugar} className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3 animate-fade-in">
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Glucose (mg/dL)" type="number" step="0.1" min="1" max="1000" required
                  value={sForm.glucose_mgdl} onChange={e => setSForm({...sForm, glucose_mgdl: e.target.value})} placeholder="e.g. 95" />
                <div className="space-y-1">
                  <label className="block text-slate-300 text-xs font-semibold">Measurement Type</label>
                  <select value={sForm.measurement_type} onChange={e => setSForm({...sForm, measurement_type: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500 transition-all">
                    <option value="FASTING">Fasting</option>
                    <option value="POST_MEAL">Post Meal</option>
                    <option value="RANDOM">Random</option>
                    <option value="HBA1C">HbA1c (%)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Date & Time" type="datetime-local"
                  value={sForm.recorded_at} onChange={e => setSForm({...sForm, recorded_at: e.target.value})} />
                <FormInput label="Notes (optional)" value={sForm.notes}
                  onChange={e => setSForm({...sForm, notes: e.target.value})} placeholder="Any remarks..." />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setAddSugar_(false)} className="py-1.5 px-3 bg-slate-800 text-slate-400 rounded-lg text-xs hover:text-white border border-slate-700">Cancel</button>
                <button type="submit" disabled={submitting === 'sugar'} className="py-1.5 px-4 bg-teal-500 hover:bg-teal-600 text-slate-950 rounded-lg text-xs font-bold transition-all disabled:opacity-50">
                  {submitting === 'sugar' ? 'Saving…' : 'Save Sugar Level'}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {sugars.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-8">No sugar records. Add your first entry above.</p>
            ) : sugars.map(r => (
              <RecordRow key={r.id} onDelete={() => handleDelete('sugar', r.id)} deleting={deletingId === r.id}>
                <div className="w-16 text-center">
                  <span className="text-white font-extrabold text-sm">{r.glucose_mgdl}</span>
                  <span className="text-slate-500 text-[10px] block">{r.measurement_type === 'HBA1C' ? '%' : 'mg/dL'}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  {r.measurement_type.replace('_', ' ')}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${categoryColor(r.category)}`}>
                  {categoryLabel(r.category)}
                </span>
                <div className="flex-1 text-right">
                  <p className="text-slate-400 text-[10px]">{formatDate(r.recorded_at)}</p>
                </div>
              </RecordRow>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default HealthTracker;
