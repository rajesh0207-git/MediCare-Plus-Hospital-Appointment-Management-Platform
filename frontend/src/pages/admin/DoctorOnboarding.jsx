import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { UserPlus, Stethoscope, Mail, Lock, Award, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';

const DoctorOnboarding = () => {
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    department_id: '',
    specialization: '',
    qualification: '',
    experience: '',
    consultation_fee: '150.00'
  });
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
      setError("Failed to fetch onboarding metadata.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'department_id' || name === 'experience' 
        ? (value ? parseInt(value, 10) : '')
        : name === 'consultation_fee' 
        ? (value ? parseFloat(value) : '')
        : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    if (!formData.email || !formData.password || !formData.department_id || !formData.specialization || !formData.qualification || !formData.experience) {
      setError("Please fill out all fields.");
      setSubmitting(false);
      return;
    }

    try {
      await api.post('/auth/register-doctor', formData);
      setSuccess(`Doctor ${formData.email} registered successfully!`);
      setFormData({
        email: '',
        password: '',
        department_id: '',
        specialization: '',
        qualification: '',
        experience: '',
        consultation_fee: '150.00'
      });
      fetchData(); // Reload doctors list
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Onboarding failed. Make sure the email is unique.");
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
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <UserPlus className="w-6 h-6 text-teal-400" />
          <span>Doctor Staff Provisioning</span>
        </h2>
        <p className="text-slate-400 text-xs">Onboard new physician profiles and register their credentials into the hospital catalog.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Panel */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 shadow-xl space-y-5">
          <h3 className="text-white font-bold text-sm border-b border-slate-800 pb-3 flex items-center gap-1.5">
            <Stethoscope className="w-4 h-4 text-teal-400" />
            <span>Physician Profile Form</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email */}
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">Login Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="dr.name@medicare.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-white text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">Login Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 6 characters"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-white text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">Assign Department</label>
                <select
                  name="department_id"
                  value={formData.department_id}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                  required
                >
                  <option value="">-- Select Department --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Specialization */}
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">Medical Specialization</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Stethoscope className="w-3.5 h-3.5" />
                  </div>
                  <input
                    name="specialization"
                    type="text"
                    value={formData.specialization}
                    onChange={handleChange}
                    placeholder="e.g. Cardiologist"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-white text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Qualification */}
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">Qualifications / Degrees</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Award className="w-3.5 h-3.5" />
                  </div>
                  <input
                    name="qualification"
                    type="text"
                    value={formData.qualification}
                    onChange={handleChange}
                    placeholder="e.g. MD - Cardiology, MBBS"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-white text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Experience */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-1">Exp (Years)</label>
                  <input
                    name="experience"
                    type="number"
                    value={formData.experience}
                    onChange={handleChange}
                    placeholder="10"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-1">Consult Fee ($)</label>
                  <input
                    name="consultation_fee"
                    type="number"
                    value={formData.consultation_fee}
                    onChange={handleChange}
                    placeholder="150.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition-all"
            >
              {submitting ? 'Provisioning...' : 'Provision Doctor Profile'}
            </button>
          </form>
        </div>

        {/* Existing Doctors Side panel */}
        <div className="glass-panel rounded-2xl p-5 shadow-xl space-y-4 h-[500px] overflow-y-auto">
          <h3 className="text-white font-bold text-sm border-b border-slate-800 pb-3">Onboarded Medical Staff</h3>
          
          <div className="space-y-3">
            {doctors.map(doc => (
              <div key={doc.id} className="p-3 bg-slate-900 border border-slate-800/80 rounded-xl space-y-1 text-xs">
                <p className="text-white font-bold">Dr. {doc.email.split('@')[0].toUpperCase()}</p>
                <p className="text-slate-400 text-[10px]">{doc.specialization} ({doc.qualification})</p>
                <p className="text-slate-500 text-[10px]">Dept: {doc.department?.name || 'Unassigned'} | Exp: {doc.experience} yrs</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DoctorOnboarding;
