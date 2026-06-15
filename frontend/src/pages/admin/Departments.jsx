import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Building, Plus, UserPlus, AlertCircle, CheckCircle, ClipboardList, Settings } from 'lucide-react';

const AdminDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add Department State
  const [deptFormOpen, setDeptFormOpen] = useState(false);
  const [deptData, setDeptData] = useState({ name: '', description: '' });
  
  // Assign Doctor State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignment, setAssignment] = useState({ dept_id: '', doctor_id: '' });
  
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [deptRes, docRes] = await Promise.all([
        api.get('/departments'),
        api.get('/doctors')
      ]);
      setDepartments(deptRes.data);
      setDoctors(docRes.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch department registries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateDept = async (e) => {
    e.preventDefault();
    if (!deptData.name || !deptData.description) return;

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/departments', deptData);
      setDeptFormOpen(false);
      setDeptData({ name: '', description: '' });
      setSuccess("New department created successfully.");
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to create department.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignDoctor = async (e) => {
    e.preventDefault();
    if (!assignment.dept_id || !assignment.doctor_id) return;

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await api.post(`/departments/${assignment.dept_id}/assign/${assignment.doctor_id}`);
      setAssignModalOpen(false);
      setAssignment({ dept_id: '', doctor_id: '' });
      setSuccess("Doctor successfully assigned to department.");
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to assign doctor.");
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building className="w-6 h-6 text-teal-400" />
            <span>Hospital Department Management</span>
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">Settle specialization clinics and assign medical doctor personnel.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAssignModalOpen(true)}
            className="py-2 px-3.5 bg-slate-900 border border-slate-800 hover:border-teal-500/35 text-teal-400 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Assign Staff</span>
          </button>
          <button
            onClick={() => setDeptFormOpen(!deptFormOpen)}
            className="py-2 px-3.5 bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-teal-500/10"
          >
            <Plus className="w-4 h-4" />
            <span>Create Department</span>
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

      {/* Add Department Form (Collapsible) */}
      {deptFormOpen && (
        <form onSubmit={handleCreateDept} className="glass-panel border-teal-500/20 rounded-2xl p-5 max-w-lg space-y-4 animate-fade-in">
          <h3 className="text-white font-bold text-sm">Add New Department</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Department Name (e.g. Neurology)"
              value={deptData.name}
              onChange={(e) => setDeptData({ ...deptData, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
              required
            />
            <textarea
              placeholder="Department Description"
              value={deptData.description}
              onChange={(e) => setDeptData({ ...deptData, description: e.target.value })}
              rows="3"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
              required
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setDeptFormOpen(false)}
              className="py-1.5 px-3 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg text-xs hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="py-1.5 px-3 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-lg text-xs"
            >
              {submitting ? 'Creating...' : 'Create Department'}
            </button>
          </div>
        </form>
      )}

      {/* Grid: Departments List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((dept) => (
          <div key={dept.id} className="glass-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-teal-500/10 text-teal-400 rounded-xl border border-teal-500/20">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">{dept.name}</h4>
                <p className="text-[9px] text-slate-500">Registry ID: #DEPT-0{dept.id}</p>
              </div>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed min-h-[48px]">{dept.description}</p>
            
            {/* Show stats if present */}
            <div className="border-t border-slate-800 pt-3 flex justify-between items-center text-[10px] text-slate-500 font-semibold">
              <span>Staff Assignment</span>
              <span className="text-slate-300">
                {doctors.filter(d => d.department?.id === dept.id).length} Active Doctor(s)
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Assign Doctor Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl p-6 shadow-2xl space-y-5 border border-slate-800 animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-white font-bold text-sm">Assign Doctor Staffing</h3>
              <button 
                onClick={() => setAssignModalOpen(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignDoctor} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1">Target Department</label>
                <select
                  value={assignment.dept_id}
                  onChange={(e) => setAssignment({ ...assignment, dept_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  required
                >
                  <option value="">-- Select Department --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1">Target Doctor</label>
                <select
                  value={assignment.doctor_id}
                  onChange={(e) => setAssignment({ ...assignment, doctor_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  required
                >
                  <option value="">-- Select Doctor --</option>
                  {doctors.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      Dr. {doc.email.split('@')[0].toUpperCase()} ({doc.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition-all"
              >
                {submitting ? 'Assigning...' : 'Assign Staff Member'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDepartments;
