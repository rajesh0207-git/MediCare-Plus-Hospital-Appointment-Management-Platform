import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  createEmergencyRequest, listEmergencyRequests, getEmergencyStats,
  dispatchEmergencyTeam, updateEmergencyRequest, cancelEmergencyRequest
} from '../services/emergencyApi';
import {
  AlertTriangle, Plus, Clock, MapPin, User, Phone, X, CheckCircle,
  Truck, Activity, FileText, BarChart3, RefreshCw, Siren, Heart,
  Brain, Wind, Baby, Stethoscope, ShieldAlert
} from 'lucide-react';

const EMERGENCY_TYPES = ['CARDIAC', 'TRAUMA', 'STROKE', 'RESPIRATORY', 'PEDIATRIC', 'OBSTETRIC', 'PSYCHIATRIC', 'OTHER'];
const PRIORITY_LEVELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const STATUS_OPTIONS = ['PENDING', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const PRIORITY_COLORS = {
  CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/40',
  HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
  MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  LOW: 'bg-blue-500/20 text-blue-400 border-blue-500/40'
};

const STATUS_COLORS = {
  PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  DISPATCHED: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  IN_PROGRESS: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  COMPLETED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  CANCELLED: 'bg-slate-500/20 text-slate-400 border-slate-500/40'
};

const EmergencyService = () => {
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';
  const isStaff = role === 'ADMIN' || role === 'DOCTOR';

  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('requests');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Forms
  const [createForm, setCreateForm] = useState({
    patient_id: '', contact_number: '', emergency_type: 'OTHER', priority: 'HIGH',
    location: '', description: '', patient_condition: ''
  });
  const [dispatchForm, setDispatchForm] = useState({
    assigned_team: '', assigned_vehicle: '', response_time_minutes: ''
  });
  const [updateForm, setUpdateForm] = useState({
    status: '', treatment_given: '', transported_to: '', outcome_notes: ''
  });

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching emergency data...');
      const [statsRes, requestsRes] = await Promise.all([
        isStaff ? getEmergencyStats() : Promise.resolve({ data: null }),
        listEmergencyRequests()
      ]);
      
      console.log('Stats:', statsRes.data);
      console.log('Requests count:', requestsRes.data?.length);
      
      setStats(statsRes.data);
      setRequests(Array.isArray(requestsRes.data) ? requestsRes.data : []);
    } catch (err) {
      console.error('Failed to load emergency data:', err);
      console.error('Error response:', err.response?.data);
      const errorMsg = err.response?.data?.detail
        ? (typeof err.response.data.detail === 'string'
            ? err.response.data.detail
            : Array.isArray(err.response.data.detail)
              ? err.response.data.detail.map(e => e.msg || e.message || JSON.stringify(e)).join(', ')
              : JSON.stringify(err.response.data.detail))
        : (err.message || 'Failed to load emergency data.');
      setError(errorMsg);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(fetchAll, 15000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchAll();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = {
        emergency_type: createForm.emergency_type,
        priority: createForm.priority,
        location: createForm.location,
        description: createForm.description
      };
      if (createForm.patient_id && createForm.patient_id.trim() !== '') {
        data.patient_id = parseInt(createForm.patient_id);
      }
      if (createForm.contact_number && createForm.contact_number.trim() !== '') {
        data.contact_number = createForm.contact_number;
      }
      if (createForm.patient_condition && createForm.patient_condition.trim() !== '') {
        data.patient_condition = createForm.patient_condition;
      }

      console.log('Submitting emergency request:', data);
      const res = await createEmergencyRequest(data);
      console.log('Emergency request created:', res.data);
      setShowCreateModal(false);
      setCreateForm({ patient_id: '', contact_number: '', emergency_type: 'OTHER', priority: 'HIGH', location: '', description: '', patient_condition: '' });
      fetchAll();
    } catch (err) {
      console.error('Emergency create error:', err);
      console.error('Error response:', err.response?.data);
      const errorMsg = err.response?.data?.detail
        ? (typeof err.response.data.detail === 'string'
            ? err.response.data.detail
            : Array.isArray(err.response.data.detail)
              ? err.response.data.detail.map(e => e.msg || e.message || JSON.stringify(e)).join(', ')
              : JSON.stringify(err.response.data.detail))
        : (err.message || 'Failed to create emergency request.');
      setError(errorMsg);
    }
  };

  const handleDispatch = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = {
        assigned_team: dispatchForm.assigned_team,
        assigned_vehicle: dispatchForm.assigned_vehicle
      };
      if (dispatchForm.response_time_minutes && dispatchForm.response_time_minutes.trim() !== '') {
        data.response_time_minutes = parseInt(dispatchForm.response_time_minutes);
      }

      console.log('Dispatching team:', data, 'for request:', selectedRequest.id);
      await dispatchEmergencyTeam(selectedRequest.id, data);
      setShowDispatchModal(false);
      setSelectedRequest(null);
      fetchAll();
    } catch (err) {
      console.error('Dispatch error:', err);
      const errorMsg = err.response?.data?.detail
        ? (typeof err.response.data.detail === 'string'
            ? err.response.data.detail
            : Array.isArray(err.response.data.detail)
              ? err.response.data.detail.map(e => e.msg || JSON.stringify(e)).join(', ')
              : JSON.stringify(err.response.data.detail))
        : (err.message || 'Failed to dispatch team.');
      setError(errorMsg);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = {};
      if (updateForm.status) data.status = updateForm.status;
      if (updateForm.treatment_given && updateForm.treatment_given.trim() !== '') data.treatment_given = updateForm.treatment_given;
      if (updateForm.transported_to && updateForm.transported_to.trim() !== '') data.transported_to = updateForm.transported_to;
      if (updateForm.outcome_notes && updateForm.outcome_notes.trim() !== '') data.outcome_notes = updateForm.outcome_notes;

      console.log('Updating request:', selectedRequest.id, 'with:', data);
      await updateEmergencyRequest(selectedRequest.id, data);
      setShowUpdateModal(false);
      setSelectedRequest(null);
      fetchAll();
    } catch (err) {
      console.error('Update error:', err);
      const errorMsg = err.response?.data?.detail
        ? (typeof err.response.data.detail === 'string'
            ? err.response.data.detail
            : Array.isArray(err.response.data.detail)
              ? err.response.data.detail.map(e => e.msg || JSON.stringify(e)).join(', ')
              : JSON.stringify(err.response.data.detail))
        : (err.message || 'Failed to update request.');
      setError(errorMsg);
    }
  };

  const handleCancel = async (id) => {
    const reason = prompt('Enter cancellation reason (min 5 characters):');
    if (!reason || reason.length < 5) return alert('Reason must be at least 5 characters');
    try {
      await cancelEmergencyRequest(id, reason);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to cancel request.');
    }
  };

  const getEmergencyIcon = (type) => {
    const icons = {
      CARDIAC: <Heart className="w-4 h-4" />,
      STROKE: <Brain className="w-4 h-4" />,
      RESPIRATORY: <Wind className="w-4 h-4" />,
      PEDIATRIC: <Baby className="w-4 h-4" />,
      OBSTETRIC: <Baby className="w-4 h-4" />,
      TRAUMA: <ShieldAlert className="w-4 h-4" />,
      PSYCHIATRIC: <Activity className="w-4 h-4" />,
      OTHER: <Siren className="w-4 h-4" />
    };
    return icons[type] || <Siren className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Siren className="w-6 h-6 text-red-400" />
            Emergency Service Requests
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">Submit, monitor, and manage emergency requests with priority handling.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={fetchAll} className="py-2 px-3.5 bg-slate-800 border border-slate-700 hover:border-cyan-500/30 text-cyan-400 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={() => setShowCreateModal(true)} className="py-2 px-3.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 animate-pulse">
            <Plus className="w-4 h-4" /> Emergency Request
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" /> <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-rose-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Stats */}
      {isStaff && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {[
            { label: 'Total', value: stats.total_requests, icon: BarChart3, color: 'text-slate-400' },
            { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-yellow-400' },
            { label: 'Dispatched', value: stats.dispatched, icon: Truck, color: 'text-blue-400' },
            { label: 'In Progress', value: stats.in_progress, icon: Activity, color: 'text-purple-400' },
            { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'text-emerald-400' },
            { label: 'Critical', value: stats.critical_count, icon: AlertTriangle, color: 'text-red-400' },
            { label: 'Avg Response', value: `${stats.avg_response_time}m`, icon: Clock, color: 'text-cyan-400' }
          ].map((stat, i) => (
            <div key={i} className="glass-panel rounded-2xl p-4 text-center">
              <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-1`} />
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-slate-400 text-[10px] font-semibold">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800">
        {['requests', 'pending', 'active', 'completed'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-semibold transition-all border-b-2 ${
              activeTab === tab ? 'border-red-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Requests List */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Patient</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">Time</th>
                <th className="px-5 py-3">Team</th>
                {isStaff && <th className="px-5 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {requests
                .filter(r => {
                  if (activeTab === 'pending') return r.status === 'PENDING';
                  if (activeTab === 'active') return ['DISPATCHED', 'IN_PROGRESS'].includes(r.status);
                  if (activeTab === 'completed') return r.status === 'COMPLETED';
                  return true;
                })
                .map(r => (
                  <tr key={r.id} className={`hover:bg-slate-900/25 transition-colors border-b border-slate-800/50 ${r.priority === 'CRITICAL' ? 'bg-red-500/5' : ''}`}>
                    <td className="px-5 py-3 text-white font-mono text-xs">#{r.id}</td>
                    <td className="px-5 py-3">
                      <div className="text-white text-xs font-semibold">{r.patient_name || 'Unknown'}</div>
                      <div className="text-slate-500 text-[10px]">{r.requester_name}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 text-white text-xs">
                        {getEmergencyIcon(r.emergency_type)}
                        <span>{r.emergency_type}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full border ${PRIORITY_COLORS[r.priority]}`}>
                        {r.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full border ${STATUS_COLORS[r.status]}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs max-w-xs truncate" title={r.location}>
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {r.location}
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {r.time_since_request_minutes}m ago
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs">
                      {r.assigned_team || '-'}
                    </td>
                    {isStaff && (
                      <td className="px-5 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          {r.status === 'PENDING' && (
                            <button onClick={() => { setSelectedRequest(r); setShowDispatchModal(true); }} className="p-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-colors" title="Dispatch">
                              <Truck className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {['DISPATCHED', 'IN_PROGRESS'].includes(r.status) && (
                            <button onClick={() => { setSelectedRequest(r); setUpdateForm({ status: 'IN_PROGRESS', treatment_given: '', transported_to: '', outcome_notes: '' }); setShowUpdateModal(true); }} className="p-1.5 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg transition-colors" title="Update">
                              <Activity className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {r.status !== 'COMPLETED' && (
                            <button onClick={() => handleCancel(r.id)} className="p-1.5 bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 rounded-lg transition-colors" title="Cancel">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              {requests.length === 0 && (
                <tr><td colSpan="9" className="px-5 py-8 text-center text-slate-500">No emergency requests found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 overflow-y-auto" style={{ backgroundColor: 'rgba(2, 6, 23, 0.95)' }}>
          <div className="relative w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5 animate-fade-in" style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-700">
              <h3 className="text-white font-bold text-sm flex items-center gap-2"><Siren className="w-4 h-4 text-red-400" /> New Emergency Request</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 text-[10px] font-semibold mb-1">Patient ID (optional)</label>
                  <input type="number" value={createForm.patient_id} onChange={(e) => setCreateForm({ ...createForm, patient_id: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-red-500" placeholder="Patient ID" />
                </div>
                <div>
                  <label className="block text-slate-300 text-[10px] font-semibold mb-1">Contact Number</label>
                  <input type="text" value={createForm.contact_number} onChange={(e) => setCreateForm({ ...createForm, contact_number: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-red-500" placeholder="Phone number" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 text-[10px] font-semibold mb-1">Emergency Type</label>
                  <select value={createForm.emergency_type} onChange={(e) => setCreateForm({ ...createForm, emergency_type: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-red-500">
                    {EMERGENCY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 text-[10px] font-semibold mb-1">Priority Level</label>
                  <select value={createForm.priority} onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-red-500">
                    {PRIORITY_LEVELS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-300 text-[10px] font-semibold mb-1">Location</label>
                <input type="text" value={createForm.location} onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-red-500" placeholder="Full address or location" required minLength="3" />
              </div>
              <div>
                <label className="block text-slate-300 text-[10px] font-semibold mb-1">Description</label>
                <textarea value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-red-500" placeholder="What happened? Details about the emergency..." required minLength="10" rows="3" />
              </div>
              <div>
                <label className="block text-slate-300 text-[10px] font-semibold mb-1">Patient Condition</label>
                <textarea value={createForm.patient_condition} onChange={(e) => setCreateForm({ ...createForm, patient_condition: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-red-500" placeholder="Current patient condition (conscious, breathing, bleeding...)" rows="2" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs transition-all">Submit Emergency Request</button>
            </form>
          </div>
        </div>
      )}

      {/* DISPATCH MODAL */}
      {showDispatchModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 overflow-y-auto" style={{ backgroundColor: 'rgba(2, 6, 23, 0.95)' }}>
          <div className="relative w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5 animate-fade-in" style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-700">
              <h3 className="text-white font-bold text-sm flex items-center gap-2"><Truck className="w-4 h-4 text-blue-400" /> Dispatch Emergency Team</h3>
              <button onClick={() => { setShowDispatchModal(false); setSelectedRequest(null); }} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-3 rounded-xl border" style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderColor: '#334155' }}>
              <p className="text-white font-semibold text-sm">Request #{selectedRequest.id} - {selectedRequest.emergency_type}</p>
              <p className="text-slate-300 text-xs mt-1"><MapPin className="w-3 h-3 inline mr-1" />{selectedRequest.location}</p>
              <p className="text-slate-400 text-xs mt-1">Priority: <span className={`px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[selectedRequest.priority]}`}>{selectedRequest.priority}</span></p>
            </div>
            <form onSubmit={handleDispatch} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-[10px] font-semibold mb-1">Team Name</label>
                <input type="text" value={dispatchForm.assigned_team} onChange={(e) => setDispatchForm({ ...dispatchForm, assigned_team: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500" placeholder="e.g. Ambulance Team Alpha" required />
              </div>
              <div>
                <label className="block text-slate-300 text-[10px] font-semibold mb-1">Vehicle Number</label>
                <input type="text" value={dispatchForm.assigned_vehicle} onChange={(e) => setDispatchForm({ ...dispatchForm, assigned_vehicle: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500" placeholder="e.g. AMB-001" required />
              </div>
              <div>
                <label className="block text-slate-300 text-[10px] font-semibold mb-1">Estimated Response Time (minutes)</label>
                <input type="number" value={dispatchForm.response_time_minutes} onChange={(e) => setDispatchForm({ ...dispatchForm, response_time_minutes: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500" placeholder="e.g. 10" min="1" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-xs transition-all">Dispatch Team</button>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE MODAL */}
      {showUpdateModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 overflow-y-auto" style={{ backgroundColor: 'rgba(2, 6, 23, 0.95)' }}>
          <div className="relative w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5 animate-fade-in" style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-700">
              <h3 className="text-white font-bold text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-purple-400" /> Update Request #{selectedRequest.id}</h3>
              <button onClick={() => { setShowUpdateModal(false); setSelectedRequest(null); }} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-[10px] font-semibold mb-1">Status</label>
                <select value={updateForm.status} onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500">
                  <option value="">-- Select Status --</option>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-300 text-[10px] font-semibold mb-1">Treatment Given</label>
                <textarea value={updateForm.treatment_given} onChange={(e) => setUpdateForm({ ...updateForm, treatment_given: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500" placeholder="Medical treatment administered..." rows="2" />
              </div>
              <div>
                <label className="block text-slate-300 text-[10px] font-semibold mb-1">Transported To</label>
                <input type="text" value={updateForm.transported_to} onChange={(e) => setUpdateForm({ ...updateForm, transported_to: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500" placeholder="Hospital name if transported" />
              </div>
              <div>
                <label className="block text-slate-300 text-[10px] font-semibold mb-1">Outcome Notes</label>
                <textarea value={updateForm.outcome_notes} onChange={(e) => setUpdateForm({ ...updateForm, outcome_notes: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500" placeholder="Final outcome and notes..." rows="2" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl text-xs transition-all">Update Request</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyService;
