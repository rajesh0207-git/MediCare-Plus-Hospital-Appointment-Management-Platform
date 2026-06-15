import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getBedStats, listWards, createWard, deleteWard,
  listBeds, createBed, updateBed, deleteBed,
  listAssignments, assignBed, dischargePatient, transferPatient
} from '../../services/bedManagementApi';
import {
  BedDouble, Building2, Plus, Trash2, UserPlus, ArrowRightLeft,
  LogOut as DischargeIcon, AlertCircle, CheckCircle, Clock, Wrench,
  ShieldAlert, BarChart3, X, RefreshCw
} from 'lucide-react';

const WARD_TYPES = ['GENERAL', 'PRIVATE', 'ICU', 'NICU', 'EMERGENCY', 'MATERNITY', 'PEDIATRIC', 'SURGICAL'];
const BED_TYPES = ['STANDARD', 'ELECTRIC', 'ICU_BED', 'CRIB'];

const BedManagement = () => {
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';
  const isStaff = role === 'ADMIN' || role === 'DOCTOR';

  // State
  const [stats, setStats] = useState(null);
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Filter state
  const [selectedWard, setSelectedWard] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modal states
  const [showWardForm, setShowWardForm] = useState(false);
  const [showBedForm, setShowBedForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferAssignment, setTransferAssignment] = useState(null);

  // Form data
  const [wardForm, setWardForm] = useState({ name: '', ward_type: 'GENERAL', floor: 1, description: '' });
  const [bedForm, setBedForm] = useState({ ward_id: '', bed_number: '', bed_type: 'STANDARD', daily_rate: 100, notes: '' });
  const [assignForm, setAssignForm] = useState({ bed_id: '', patient_id: '', reason: '', notes: '' });
  const [transferForm, setTransferForm] = useState({ new_bed_id: '', notes: '' });

  const fetchAll = async () => {
    try {
      const [statsRes, wardsRes, bedsRes, assignRes] = await Promise.all([
        getBedStats(),
        listWards(),
        listBeds(selectedWard || null, selectedStatus || null),
        listAssignments()
      ]);
      setStats(statsRes.data);
      setWards(wardsRes.data);
      setBeds(bedsRes.data);
      setAssignments(assignRes.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load bed management data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Auto-refresh when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page visible - refreshing bed data');
        fetchAll();
      }
    };

    const handleFocus = () => {
      console.log('Page focused - refreshing bed data');
      fetchAll();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Also refresh every 30 seconds
    const interval = setInterval(fetchAll, 30000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const fetchBeds = async () => {
      try {
        const res = await listBeds(selectedWard || null, selectedStatus || null);
        setBeds(res.data);
      } catch (err) { console.error(err); }
    };
    fetchBeds();
  }, [selectedWard, selectedStatus]);

  const handleCreateWard = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createWard(wardForm);
      setShowWardForm(false);
      setWardForm({ name: '', ward_type: 'GENERAL', floor: 1, description: '' });
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create ward.');
    }
  };

  const handleDeleteWard = async (id) => {
    if (!confirm('Delete this ward? All beds inside will be removed.')) return;
    try {
      await deleteWard(id);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete ward.');
    }
  };

  const handleCreateBed = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createBed({ ...bedForm, ward_id: parseInt(bedForm.ward_id), daily_rate: parseInt(bedForm.daily_rate) });
      setShowBedForm(false);
      setBedForm({ ward_id: '', bed_number: '', bed_type: 'STANDARD', daily_rate: 100, notes: '' });
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create bed.');
    }
  };

  const handleDeleteBed = async (id) => {
    if (!confirm('Delete this bed?')) return;
    try {
      await deleteBed(id);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete bed.');
    }
  };

  const handleAssignBed = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await assignBed({ ...assignForm, bed_id: parseInt(assignForm.bed_id), patient_id: parseInt(assignForm.patient_id) });
      setShowAssignForm(false);
      setAssignForm({ bed_id: '', patient_id: '', reason: '', notes: '' });
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to assign bed.');
    }
  };

  const handleDischarge = async (assignmentId) => {
    if (!confirm('Discharge this patient?')) return;
    try {
      await dischargePatient(assignmentId, {});
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to discharge patient.');
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await transferPatient(transferAssignment.id, { new_bed_id: parseInt(transferForm.new_bed_id), notes: transferForm.notes });
      setShowTransferForm(false);
      setTransferAssignment(null);
      setTransferForm({ new_bed_id: '', notes: '' });
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to transfer patient.');
    }
  };

  const statusBadge = (status) => {
    const map = {
      AVAILABLE: { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle },
      OCCUPIED: { color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', icon: BedDouble },
      MAINTENANCE: { color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Wrench },
      RESERVED: { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: Clock },
    };
    const s = map[status] || map.AVAILABLE;
    const Icon = s.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.color}`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
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
            <BedDouble className="w-6 h-6 text-teal-400" />
            Hospital Bed Management
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">Manage wards, beds, and patient allocations.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Refresh Button */}
          <button 
            onClick={fetchAll} 
            className="py-2 px-3.5 bg-slate-800 border border-slate-700 hover:border-cyan-500/30 text-cyan-400 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          {isAdmin && (
            <>
              <button onClick={() => setShowWardForm(true)} className="py-2 px-3.5 bg-slate-900 border border-slate-800 hover:border-teal-500/30 text-teal-400 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Add Ward
              </button>
              <button onClick={() => setShowBedForm(true)} className="py-2 px-3.5 bg-slate-900 border border-slate-800 hover:border-teal-500/30 text-teal-400 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Add Bed
              </button>
            </>
          )}
          {isStaff && (
            <button onClick={() => setShowAssignForm(true)} className="py-2 px-3.5 bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5">
              <UserPlus className="w-4 h-4" /> Assign Bed
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-rose-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Wards', value: stats.total_wards, color: 'text-violet-400' },
            { label: 'Total Beds', value: stats.total_beds, color: 'text-blue-400' },
            { label: 'Available', value: stats.available_beds, color: 'text-emerald-400' },
            { label: 'Occupied', value: stats.occupied_beds, color: 'text-rose-400' },
          ].map((s, i) => (
            <div key={i} className="glass-panel rounded-2xl border border-slate-800 p-4 text-center">
              <p className="text-slate-400 text-[10px] uppercase font-semibold tracking-wider">{s.label}</p>
              <p className={`text-2xl font-extrabold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {stats && (
        <div className="glass-panel rounded-2xl border border-slate-800 p-4 flex items-center gap-4">
          <BarChart3 className="w-5 h-5 text-teal-400" />
          <div className="flex-1">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Occupancy Rate</span>
              <span className="font-bold text-white">{stats.occupancy_rate}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all" style={{ width: `${stats.occupancy_rate}%` }}></div>
            </div>
          </div>
          <div className="text-xs text-slate-400">
            <span className="text-white font-bold">{stats.active_admissions}</span> Active Admissions
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900/50 rounded-xl p-1 border border-slate-800 w-fit">
        {['overview', 'beds', 'assignments'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg capitalize transition-all ${activeTab === tab ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
          >
            {tab === 'overview' ? 'Wards' : tab}
          </button>
        ))}
      </div>

      {/* WARDS TAB */}
      {activeTab === 'overview' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wards.length === 0 ? (
            <p className="text-slate-500 text-sm col-span-full text-center py-8">No wards created yet.</p>
          ) : wards.map((ward) => (
            <div key={ward.id} className="glass-panel rounded-2xl border border-slate-800 p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white font-bold text-sm">{ward.name}</p>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider">{ward.ward_type} &bull; Floor {ward.floor}</p>
                </div>
                {isAdmin && (
                  <button onClick={() => handleDeleteWard(ward.id)} className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {ward.description && <p className="text-slate-400 text-xs">{ward.description}</p>}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div><p className="text-emerald-400 font-bold text-sm">{ward.available_beds}</p><p className="text-[9px] text-slate-500">Free</p></div>
                <div><p className="text-rose-400 font-bold text-sm">{ward.occupied_beds}</p><p className="text-[9px] text-slate-500">Occupied</p></div>
                <div><p className="text-amber-400 font-bold text-sm">{ward.maintenance_beds}</p><p className="text-[9px] text-slate-500">Maint.</p></div>
                <div><p className="text-blue-400 font-bold text-sm">{ward.reserved_beds}</p><p className="text-[9px] text-slate-500">Reserved</p></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* BEDS TAB */}
      {activeTab === 'beds' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <select value={selectedWard} onChange={(e) => setSelectedWard(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500">
              <option value="">All Wards</option>
              {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500">
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="RESERVED">Reserved</option>
            </select>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            {beds.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No beds found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                      <th className="px-5 py-3">Bed #</th>
                      <th className="px-5 py-3">Ward</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Rate/Day</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Patient</th>
                      {isAdmin && <th className="px-5 py-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {beds.map((bed) => (
                      <tr key={bed.id} className="hover:bg-slate-900/25 transition-colors">
                        <td className="px-5 py-3 text-white font-bold">{bed.bed_number}</td>
                        <td className="px-5 py-3 text-slate-300">{bed.ward_name || '-'}</td>
                        <td className="px-5 py-3 text-slate-400">{bed.bed_type}</td>
                        <td className="px-5 py-3 text-teal-400 font-semibold">${bed.daily_rate}</td>
                        <td className="px-5 py-3">{statusBadge(bed.status)}</td>
                        <td className="px-5 py-3 text-slate-300">{bed.current_patient || '-'}</td>
                        {isAdmin && (
                          <td className="px-5 py-3 text-right">
                            <button onClick={() => handleDeleteBed(bed.id)} className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ASSIGNMENTS TAB */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          {/* Status Filter */}
          <div className="flex gap-3 flex-wrap items-center">
            <label className="text-slate-400 text-xs font-semibold">Filter by Status:</label>
            <select 
              value={selectedStatus} 
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                // Fetch assignments with filter
                listAssignments(e.target.value || null).then(res => setAssignments(res.data));
              }} 
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="DISCHARGED">Discharged Only</option>
              <option value="TRANSFERRED">Transferred Only</option>
            </select>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          {assignments.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No bed assignments found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                    <th className="px-5 py-3">Patient</th>
                    <th className="px-5 py-3">Bed</th>
                    <th className="px-5 py-3">Ward</th>
                    <th className="px-5 py-3">Admitted</th>
                    <th className="px-5 py-3">Discharged/Transferred</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Reason</th>
                    {isStaff && <th className="px-5 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {assignments.map((a) => (
                    <tr key={a.id} className={`hover:bg-slate-900/25 transition-colors ${a.status !== 'ACTIVE' ? 'opacity-60' : ''}`}>
                      <td className="px-5 py-3 text-white font-semibold">{a.patient_name || `Patient #${a.patient_id}`}</td>
                      <td className="px-5 py-3 text-slate-300">{a.bed_number || '-'}</td>
                      <td className="px-5 py-3 text-slate-400">{a.ward_name || '-'}</td>
                      <td className="px-5 py-3 text-slate-400">{new Date(a.admission_date).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-slate-400">
                        {a.discharge_date ? new Date(a.discharge_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          a.status === 'ACTIVE' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                          a.status === 'DISCHARGED' ? 'text-slate-400 bg-slate-500/10 border-slate-500/20' :
                          'text-blue-400 bg-blue-500/10 border-blue-500/20'
                        }`}>{a.status}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-400 max-w-[150px] truncate">{a.reason || '-'}</td>
                      {isStaff && (
                        <td className="px-5 py-3 text-right">
                          {a.status === 'ACTIVE' && (
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handleDischarge(a.id)}
                                className="p-1.5 text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all"
                                title="Discharge"
                              >
                                <DischargeIcon className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => { setTransferAssignment(a); setShowTransferForm(true); }}
                                className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                                title="Transfer"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>
      )}

      {/* CREATE WARD MODAL */}
      {showWardForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl p-6 shadow-2xl space-y-5 border border-slate-800 animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-white font-bold text-sm">Create New Ward</h3>
              <button onClick={() => setShowWardForm(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateWard} className="space-y-4">
              <input type="text" placeholder="Ward Name" value={wardForm.name} onChange={(e) => setWardForm({ ...wardForm, name: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500" required />
              <div className="grid grid-cols-2 gap-3">
                <select value={wardForm.ward_type} onChange={(e) => setWardForm({ ...wardForm, ward_type: e.target.value })} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500">
                  {WARD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="number" placeholder="Floor" value={wardForm.floor} onChange={(e) => setWardForm({ ...wardForm, floor: parseInt(e.target.value) })} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500" min="1" />
              </div>
              <textarea placeholder="Description (optional)" value={wardForm.description} onChange={(e) => setWardForm({ ...wardForm, description: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500" rows="2" />
              <button type="submit" className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-xl text-xs transition-all">Create Ward</button>
            </form>
          </div>
        </div>
      )}

      {/* CREATE BED MODAL */}
      {showBedForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl p-6 shadow-2xl space-y-5 border border-slate-800 animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-white font-bold text-sm">Add New Bed</h3>
              <button onClick={() => setShowBedForm(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateBed} className="space-y-4">
              <select value={bedForm.ward_id} onChange={(e) => setBedForm({ ...bedForm, ward_id: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500" required>
                <option value="">-- Select Ward --</option>
                {wards.map(w => <option key={w.id} value={w.id}>{w.name} ({w.ward_type})</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Bed Number (e.g. A-101)" value={bedForm.bed_number} onChange={(e) => setBedForm({ ...bedForm, bed_number: e.target.value })} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500" required />
                <select value={bedForm.bed_type} onChange={(e) => setBedForm({ ...bedForm, bed_type: e.target.value })} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500">
                  {BED_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <input type="number" placeholder="Daily Rate ($)" value={bedForm.daily_rate} onChange={(e) => setBedForm({ ...bedForm, daily_rate: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500" min="0" />
              <button type="submit" className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-xl text-xs transition-all">Add Bed</button>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN BED MODAL */}
      {showAssignForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl p-6 shadow-2xl space-y-5 border border-slate-800 animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-white font-bold text-sm">Assign Bed to Patient</h3>
              <button onClick={() => setShowAssignForm(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleAssignBed} className="space-y-4">
              <select value={assignForm.bed_id} onChange={(e) => setAssignForm({ ...assignForm, bed_id: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500" required>
                <option value="">-- Select Available Bed --</option>
                {beds.filter(b => b.status === 'AVAILABLE').map(b => (
                  <option key={b.id} value={b.id}>{b.bed_number} - {b.ward_name} (${b.daily_rate}/day)</option>
                ))}
              </select>
              <input type="number" placeholder="Patient ID" value={assignForm.patient_id} onChange={(e) => setAssignForm({ ...assignForm, patient_id: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500" required min="1" />
              <input type="text" placeholder="Reason for admission" value={assignForm.reason} onChange={(e) => setAssignForm({ ...assignForm, reason: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500" />
              <textarea placeholder="Notes (optional)" value={assignForm.notes} onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500" rows="2" />
              <button type="submit" className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-xl text-xs transition-all">Assign Bed</button>
            </form>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {showTransferForm && transferAssignment && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl p-6 shadow-2xl space-y-5 border border-slate-800 animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-white font-bold text-sm">Transfer Patient</h3>
              <button onClick={() => { setShowTransferForm(false); setTransferAssignment(null); }} className="text-slate-500 hover:text-white">✕</button>
            </div>
            <p className="text-slate-400 text-xs">Transferring <span className="text-white font-semibold">{transferAssignment.patient_name}</span> from bed <span className="text-white font-semibold">{transferAssignment.bed_number}</span></p>
            <form onSubmit={handleTransfer} className="space-y-4">
              <select value={transferForm.new_bed_id} onChange={(e) => setTransferForm({ ...transferForm, new_bed_id: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500" required>
                <option value="">-- Select Target Bed --</option>
                {beds.filter(b => b.status === 'AVAILABLE').map(b => (
                  <option key={b.id} value={b.id}>{b.bed_number} - {b.ward_name} (${b.daily_rate}/day)</option>
                ))}
              </select>
              <textarea placeholder="Transfer notes (optional)" value={transferForm.notes} onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500" rows="2" />
              <button type="submit" className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-xs transition-all">Confirm Transfer</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BedManagement;
