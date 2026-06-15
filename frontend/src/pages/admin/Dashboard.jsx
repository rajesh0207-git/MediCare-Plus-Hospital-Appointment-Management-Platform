import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import {
  Users, Stethoscope, Calendar, CreditCard,
  TrendingUp, Award, Activity, AlertCircle, Building,
  BedDouble, FileText, Star, BarChart3, TrendingDown,
  CheckCircle, XCircle, Clock, DollarSign
} from 'lucide-react';

const AdminDashboard = () => {
  const [basicMetrics, setBasicMetrics] = useState(null);
  const [advancedAnalytics, setAdvancedAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [basicRes, advancedRes] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/admin/analytics/advanced', { params: { days: 90 } })
        ]);
        setBasicMetrics(basicRes.data);
        setAdvancedAnalytics(advancedRes.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load analytics dashboard.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm flex items-center gap-2">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!basicMetrics || !advancedAnalytics) {
    return (
      <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-sm">
        Analytics data not available.
      </div>
    );
  }

  const { total_patients, total_doctors } = basicMetrics;
  const { summary, revenue, department_performance, doctor_performance, patient_satisfaction } = advancedAnalytics;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-900/50 p-1 rounded-xl border border-slate-800 w-fit">
        {['overview', 'revenue', 'departments', 'doctors', 'satisfaction'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all capitalize ${activeTab === tab ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
              <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-slate-400 text-xs font-semibold">Total Patients</p>
                <p className="text-white font-extrabold text-2xl mt-0.5">{total_patients}</p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
              <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <p className="text-slate-400 text-xs font-semibold">Active Doctors</p>
                <p className="text-white font-extrabold text-2xl mt-0.5">{total_doctors}</p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
              <div className="p-3 bg-violet-500/10 text-violet-400 rounded-xl">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-slate-400 text-xs font-semibold">Total Appointments</p>
                <p className="text-white font-extrabold text-2xl mt-0.5">{summary.total_appointments}</p>
                <p className="text-emerald-400 text-[10px]">+{summary.recent_appointments} (90d)</p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-slate-400 text-xs font-semibold">Total Revenue</p>
                <p className="text-white font-extrabold text-2xl mt-0.5">${revenue.total_revenue.toFixed(2)}</p>
                <p className="text-emerald-400 text-[10px]">{revenue.collection_rate}% collected</p>
              </div>
            </div>
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel rounded-xl p-5 border border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <Activity className="w-5 h-5 text-teal-400" />
                <h3 className="text-white font-bold text-sm">Consultations</h3>
              </div>
              <p className="text-3xl font-bold text-white">{summary.total_consultations}</p>
              <p className="text-slate-500 text-xs mt-1">Completed appointments</p>
            </div>

            <div className="glass-panel rounded-xl p-5 border border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <BedDouble className="w-5 h-5 text-violet-400" />
                <h3 className="text-white font-bold text-sm">Admissions</h3>
              </div>
              <p className="text-3xl font-bold text-white">{summary.total_admissions}</p>
              <p className="text-slate-500 text-xs mt-1">{summary.active_admissions} currently active</p>
            </div>

            <div className="glass-panel rounded-xl p-5 border border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h3 className="text-white font-bold text-sm">Avg Bill Amount</h3>
              </div>
              <p className="text-3xl font-bold text-white">${revenue.average_bill.toFixed(2)}</p>
              <p className="text-slate-500 text-xs mt-1">Per transaction</p>
            </div>
          </div>

          {/* Appointment Status */}
          <div className="glass-panel rounded-xl p-6 border border-slate-800">
            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-teal-400" />
              Appointment Status Distribution
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Completed', count: basicMetrics.appointment_analytics?.COMPLETED || 0, color: 'bg-emerald-500', textColor: 'text-emerald-400' },
                { label: 'Confirmed', count: basicMetrics.appointment_analytics?.CONFIRMED || 0, color: 'bg-teal-500', textColor: 'text-teal-400' },
                { label: 'Pending', count: basicMetrics.appointment_analytics?.PENDING || 0, color: 'bg-amber-500', textColor: 'text-amber-400' },
                { label: 'Cancelled', count: basicMetrics.appointment_analytics?.CANCELLED || 0, color: 'bg-rose-500', textColor: 'text-rose-400' }
              ].map(item => {
                const total = summary.total_appointments || 1;
                const pct = Math.round((item.count / total) * 100);
                return (
                  <div key={item.label} className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-center">
                    <p className={`text-2xl font-bold ${item.textColor}`}>{item.count}</p>
                    <p className="text-slate-400 text-xs mt-1">{item.label}</p>
                    <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                      <div className={`${item.color} h-full rounded-full`} style={{ width: `${pct}%` }}></div>
                    </div>
                    <p className="text-slate-500 text-[10px] mt-1">{pct}%</p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* REVENUE TAB */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          {/* Revenue Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="glass-panel rounded-xl p-5 border border-slate-800">
              <p className="text-slate-400 text-xs font-semibold">TOTAL REVENUE</p>
              <p className="text-3xl font-bold text-emerald-400 mt-2">${revenue.total_revenue.toFixed(2)}</p>
            </div>
            <div className="glass-panel rounded-xl p-5 border border-slate-800">
              <p className="text-slate-400 text-xs font-semibold">PAID</p>
              <p className="text-3xl font-bold text-teal-400 mt-2">${revenue.paid_revenue.toFixed(2)}</p>
            </div>
            <div className="glass-panel rounded-xl p-5 border border-slate-800">
              <p className="text-slate-400 text-xs font-semibold">PENDING</p>
              <p className="text-3xl font-bold text-amber-400 mt-2">${revenue.pending_revenue.toFixed(2)}</p>
            </div>
            <div className="glass-panel rounded-xl p-5 border border-slate-800">
              <p className="text-slate-400 text-xs font-semibold">COLLECTION RATE</p>
              <p className="text-3xl font-bold text-violet-400 mt-2">{revenue.collection_rate}%</p>
            </div>
          </div>

          {/* Monthly Trend */}
          <div className="glass-panel rounded-xl p-6 border border-slate-800">
            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Monthly Revenue Trend
            </h3>
            <div className="space-y-2">
              {revenue.monthly_trend.map(month => (
                <div key={month.month} className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/50">
                  <span className="text-slate-400 text-xs w-20">{month.month}</span>
                  <div className="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all"
                         style={{ width: `${revenue.total_revenue > 0 ? (month.revenue / revenue.total_revenue) * 100 : 0}%` }}></div>
                  </div>
                  <span className="text-white text-xs font-bold w-24 text-right">${month.revenue.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DEPARTMENTS TAB */}
      {activeTab === 'departments' && (
        <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              <Building className="w-5 h-5 text-teal-400" />
              Department Performance
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Doctors</th>
                  <th className="px-6 py-4">Appointments</th>
                  <th className="px-6 py-4">Completed</th>
                  <th className="px-6 py-4">Completion Rate</th>
                  <th className="px-6 py-4">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {department_performance.map((dept) => (
                  <tr key={dept.department_id} className="hover:bg-slate-900/25 transition-colors">
                    <td className="px-6 py-4 text-slate-200 font-bold">{dept.name}</td>
                    <td className="px-6 py-4 text-slate-300">{dept.doctor_count}</td>
                    <td className="px-6 py-4 text-slate-300 font-semibold">{dept.total_appointments}</td>
                    <td className="px-6 py-4 text-emerald-400 font-semibold">{dept.completed_appointments}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-teal-500 h-full rounded-full" style={{ width: `${dept.completion_rate}%` }}></div>
                        </div>
                        <span className="text-teal-400 font-semibold">{dept.completion_rate}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-emerald-400 font-bold">${dept.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DOCTORS TAB */}
      {activeTab === 'doctors' && (
        <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              <Award className="w-5 h-5 text-violet-400" />
              Doctor Performance Metrics (Top 20)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                  <th className="px-6 py-4">Doctor</th>
                  <th className="px-6 py-4">Specialization</th>
                  <th className="px-6 py-4">Appointments</th>
                  <th className="px-6 py-4">Completed</th>
                  <th className="px-6 py-4">Cancelled</th>
                  <th className="px-6 py-4">Completion Rate</th>
                  <th className="px-6 py-4">Rating</th>
                  <th className="px-6 py-4">Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {doctor_performance.map((doc) => (
                  <tr key={doc.doctor_id} className="hover:bg-slate-900/25 transition-colors">
                    <td className="px-6 py-4 text-slate-200 font-bold">{doc.name}</td>
                    <td className="px-6 py-4 text-slate-300">{doc.specialization}</td>
                    <td className="px-6 py-4 text-slate-300 font-semibold">{doc.total_appointments}</td>
                    <td className="px-6 py-4 text-emerald-400">{doc.completed}</td>
                    <td className="px-6 py-4 text-rose-400">{doc.cancelled}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${doc.completion_rate >= 80 ? 'bg-emerald-500/20 text-emerald-400' : doc.completion_rate >= 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {doc.completion_rate}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {doc.avg_rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" />
                          <span className="text-yellow-400 font-bold">{doc.avg_rating}</span>
                          <span className="text-slate-500">({doc.review_count})</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">No reviews</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-emerald-400 font-semibold">${doc.consultation_fee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SATISFACTION TAB */}
      {activeTab === 'satisfaction' && (
        <div className="space-y-6">
          {/* Satisfaction Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel rounded-xl p-6 border border-slate-800 text-center">
              <Star className="w-8 h-8 text-yellow-400 mx-auto mb-2" fill="currentColor" />
              <p className="text-slate-400 text-xs font-semibold">AVG SATISFACTION</p>
              <p className="text-4xl font-bold text-yellow-400 mt-2">{patient_satisfaction.avg_satisfaction_score}/5</p>
            </div>
            <div className="glass-panel rounded-xl p-6 border border-slate-800 text-center">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-slate-400 text-xs font-semibold">RECOMMENDATION RATE</p>
              <p className="text-4xl font-bold text-emerald-400 mt-2">{patient_satisfaction.recommendation_rate}%</p>
            </div>
            <div className="glass-panel rounded-xl p-6 border border-slate-800 text-center">
              <Users className="w-8 h-8 text-violet-400 mx-auto mb-2" />
              <p className="text-slate-400 text-xs font-semibold">TOTAL FEEDBACK</p>
              <p className="text-4xl font-bold text-violet-400 mt-2">{patient_satisfaction.total_feedback}</p>
            </div>
          </div>

          {/* Rating Breakdown */}
          <div className="glass-panel rounded-xl p-6 border border-slate-800">
            <h3 className="text-white font-bold text-sm mb-4">Rating Distribution</h3>
            <div className="space-y-3">
              {[
                { stars: 5, label: '5 Stars', color: 'bg-emerald-500' },
                { stars: 4, label: '4 Stars', color: 'bg-teal-500' },
                { stars: 3, label: '3 Stars', color: 'bg-yellow-500' },
                { stars: 2, label: '2 Stars', color: 'bg-orange-500' },
                { stars: 1, label: '1 Star', color: 'bg-rose-500' }
              ].map(item => {
                const count = patient_satisfaction.rating_breakdown[item.stars] || 0;
                const total = patient_satisfaction.total_feedback || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={item.stars} className="flex items-center gap-3">
                    <span className="text-slate-400 text-xs w-16">{item.label}</span>
                    <div className="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div className={`${item.color} h-full rounded-full`} style={{ width: `${pct}%` }}></div>
                    </div>
                    <span className="text-white text-xs font-bold w-12">{count}</span>
                    <span className="text-slate-500 text-[10px] w-12">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Scores */}
          <div className="glass-panel rounded-xl p-6 border border-slate-800">
            <h3 className="text-white font-bold text-sm mb-4">Category Satisfaction Scores</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {patient_satisfaction.category_scores.map(cat => (
                <div key={cat.category} className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-center">
                  <p className="text-slate-400 text-xs font-semibold mb-2">{cat.category.toUpperCase()}</p>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="w-4 h-4 text-yellow-400" fill="currentColor" />
                    <span className="text-yellow-400 text-xl font-bold">{cat.avg_rating}</span>
                  </div>
                  <p className="text-slate-500 text-[10px]">{cat.count} reviews</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
