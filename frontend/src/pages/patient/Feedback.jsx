import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  submitFeedback, listFeedback, getFeedbackAnalytics, getSatisfactionReport, respondToFeedback
} from '../../services/feedbackApi';
import {
  Star, Send, BarChart3, TrendingUp, MessageSquare, ThumbsUp, ThumbsDown,
  AlertCircle, CheckCircle, ChevronDown, MessageCircle, Activity, Award, Target
} from 'lucide-react';

const SERVICE_CATEGORIES = ['Overall', 'Doctor', 'Nursing', 'Food', 'Cleanliness', 'Facilities', 'Wait Time'];

const Feedback = () => {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState(role === 'ADMIN' ? 'analytics' : 'submit');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Feedback list
  const [feedbacks, setFeedbacks] = useState([]);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [responseText, setResponseText] = useState('');

  // Submit form
  const [form, setForm] = useState({
    service_category: 'Overall',
    doctor_id: '',
    department_id: '',
    overall_rating: 0,
    doctor_rating: 0,
    nursing_rating: 0,
    food_rating: 0,
    cleanliness_rating: 0,
    facilities_rating: 0,
    wait_time_rating: 0,
    title: '',
    comment: '',
    suggestions: '',
    positive_aspects: '',
    negative_aspects: '',
    would_recommend: 1
  });

  // Analytics
  const [analytics, setAnalytics] = useState(null);
  const [satisfactionReport, setSatisfactionReport] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [fbRes] = await Promise.all([
        listFeedback({ limit: 100 })
      ]);
      setFeedbacks(fbRes.data);

      if (role === 'ADMIN' || role === 'DOCTOR') {
        const [analyticsRes] = await Promise.all([
          getFeedbackAnalytics(90)
        ]);
        setAnalytics(analyticsRes.data);
      }

      if (role === 'ADMIN') {
        const satRes = await getSatisfactionReport(30);
        setSatisfactionReport(satRes.data);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const data = { ...form };
      // Remove empty optional fields
      if (!data.doctor_id) delete data.doctor_id;
      else data.doctor_id = parseInt(data.doctor_id);
      if (!data.department_id) delete data.department_id;
      else data.department_id = parseInt(data.department_id);
      if (!data.title) delete data.title;
      if (!data.comment) delete data.comment;
      if (!data.suggestions) delete data.suggestions;
      if (!data.positive_aspects) delete data.positive_aspects;
      if (!data.negative_aspects) delete data.negative_aspects;

      // Remove zero ratings (optional)
      if (data.doctor_rating === 0) delete data.doctor_rating;
      if (data.nursing_rating === 0) delete data.nursing_rating;
      if (data.food_rating === 0) delete data.food_rating;
      if (data.cleanliness_rating === 0) delete data.cleanliness_rating;
      if (data.facilities_rating === 0) delete data.facilities_rating;
      if (data.wait_time_rating === 0) delete data.wait_time_rating;

      await submitFeedback(data);
      setSuccess('Feedback submitted successfully!');
      setForm({
        service_category: 'Overall', doctor_id: '', department_id: '',
        overall_rating: 0, doctor_rating: 0, nursing_rating: 0, food_rating: 0,
        cleanliness_rating: 0, facilities_rating: 0, wait_time_rating: 0,
        title: '', comment: '', suggestions: '',
        positive_aspects: '', negative_aspects: '', would_recommend: 1
      });
      fetchAll();
    } catch (err) {
      console.error('Submit error:', err);
      setError(err.response?.data?.detail || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async () => {
    if (!selectedFeedback || !responseText.trim()) return;
    try {
      await respondToFeedback(selectedFeedback.id, { admin_response: responseText });
      setResponseText('');
      setSelectedFeedback(null);
      fetchAll();
    } catch (err) {
      setError('Failed to respond');
    }
  };

  // Star rating component
  const StarRating = ({ value, onChange, size = 'md', label }) => {
    const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
    return (
      <div className="flex items-center gap-2">
        {label && <span className="text-xs text-slate-400 w-32">{label}</span>}
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => onChange && onChange(star)}
              className={`${sizeClass} transition-all ${star <= value ? 'text-yellow-400' : 'text-slate-700'} ${onChange ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
            >
              <Star fill={star <= value ? 'currentColor' : 'none'} />
            </button>
          ))}
          <span className="ml-2 text-sm font-semibold text-white">{value || 0}/5</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header Stats */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="glass-panel rounded-xl p-4 border border-slate-800">
            <p className="text-slate-400 text-[10px] font-semibold">TOTAL FEEDBACK</p>
            <p className="text-2xl font-bold text-white mt-1">{analytics.total_feedback}</p>
          </div>
          <div className="glass-panel rounded-xl p-4 border border-slate-800">
            <p className="text-slate-400 text-[10px] font-semibold">AVG RATING</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-bold text-yellow-400">{analytics.avg_overall_rating}</p>
              <Star className="w-5 h-5 text-yellow-400" fill="currentColor" />
            </div>
          </div>
          <div className="glass-panel rounded-xl p-4 border border-slate-800">
            <p className="text-slate-400 text-[10px] font-semibold">RECOMMENDATION</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{analytics.recommendation_rate}%</p>
          </div>
          {satisfactionReport && (
            <>
              <div className="glass-panel rounded-xl p-4 border border-slate-800">
                <p className="text-slate-400 text-[10px] font-semibold">SATISFACTION</p>
                <p className="text-2xl font-bold text-violet-400 mt-1">{satisfactionReport.overall_satisfaction_score}%</p>
              </div>
              <div className="glass-panel rounded-xl p-4 border border-slate-800">
                <p className="text-slate-400 text-[10px] font-semibold">NPS SCORE</p>
                <p className="text-2xl font-bold text-cyan-400 mt-1">{satisfactionReport.nps_score}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-900/50 p-1 rounded-xl border border-slate-800 w-fit">
        {role === 'PATIENT' && (
          <button onClick={() => setActiveTab('submit')} className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'submit' ? 'bg-teal-500/20 text-teal-400' : 'text-slate-500'}`}>
            Submit Feedback
          </button>
        )}
        <button onClick={() => setActiveTab('list')} className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'list' ? 'bg-teal-500/20 text-teal-400' : 'text-slate-500'}`}>
          Service Ratings
        </button>
        {(role === 'ADMIN' || role === 'DOCTOR') && (
          <>
            <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'analytics' ? 'bg-teal-500/20 text-teal-400' : 'text-slate-500'}`}>
              Analytics
            </button>
            {role === 'ADMIN' && (
              <button onClick={() => setActiveTab('report')} className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'report' ? 'bg-teal-500/20 text-teal-400' : 'text-slate-500'}`}>
                Satisfaction Report
              </button>
            )}
          </>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {success}
        </div>
      )}

      {/* SUBMIT FEEDBACK TAB */}
      {activeTab === 'submit' && role === 'PATIENT' && (
        <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-teal-400" />
            Submit Your Feedback
          </h3>

          {/* Category */}
          <div>
            <label className="block text-slate-300 text-xs font-semibold mb-2">Service Category *</label>
            <select value={form.service_category} onChange={(e) => setForm({ ...form, service_category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500">
              {SERVICE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          {/* Overall Rating */}
          <div>
            <label className="block text-slate-300 text-xs font-semibold mb-2">Overall Rating *</label>
            <StarRating value={form.overall_rating} onChange={(v) => setForm({ ...form, overall_rating: v })} size="lg" />
          </div>

          {/* Individual Ratings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
            <StarRating label="Doctor" value={form.doctor_rating} onChange={(v) => setForm({ ...form, doctor_rating: v })} />
            <StarRating label="Nursing" value={form.nursing_rating} onChange={(v) => setForm({ ...form, nursing_rating: v })} />
            <StarRating label="Food" value={form.food_rating} onChange={(v) => setForm({ ...form, food_rating: v })} />
            <StarRating label="Cleanliness" value={form.cleanliness_rating} onChange={(v) => setForm({ ...form, cleanliness_rating: v })} />
            <StarRating label="Facilities" value={form.facilities_rating} onChange={(v) => setForm({ ...form, facilities_rating: v })} />
            <StarRating label="Wait Time" value={form.wait_time_rating} onChange={(v) => setForm({ ...form, wait_time_rating: v })} />
          </div>

          {/* Title & Comment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 text-xs font-semibold mb-2">Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                     className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500" placeholder="Brief summary" />
            </div>
            <div>
              <label className="block text-slate-300 text-xs font-semibold mb-2">Comment</label>
              <textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} rows={2}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500 resize-none" placeholder="Share your experience" />
            </div>
          </div>

          {/* Positive & Negative */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 text-xs font-semibold mb-2">Positive Aspects (comma-separated)</label>
              <textarea value={form.positive_aspects} onChange={(e) => setForm({ ...form, positive_aspects: e.target.value })} rows={2}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500 resize-none" placeholder="e.g. Friendly staff, Clean rooms" />
            </div>
            <div>
              <label className="block text-slate-300 text-xs font-semibold mb-2">Negative Aspects (comma-separated)</label>
              <textarea value={form.negative_aspects} onChange={(e) => setForm({ ...form, negative_aspects: e.target.value })} rows={2}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500 resize-none" placeholder="e.g. Long wait, Food quality" />
            </div>
          </div>

          {/* Suggestions */}
          <div>
            <label className="block text-slate-300 text-xs font-semibold mb-2">Suggestions for Improvement</label>
            <textarea value={form.suggestions} onChange={(e) => setForm({ ...form, suggestions: e.target.value })} rows={2}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500 resize-none" placeholder="How can we improve?" />
          </div>

          {/* Would Recommend */}
          <div className="flex items-center gap-4">
            <label className="text-slate-300 text-xs font-semibold">Would you recommend us?</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm({ ...form, would_recommend: 1 })}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${form.would_recommend === 1 ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                <ThumbsUp className="w-4 h-4 inline mr-1" /> Yes
              </button>
              <button type="button" onClick={() => setForm({ ...form, would_recommend: 0 })}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${form.would_recommend === 0 ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                <ThumbsDown className="w-4 h-4 inline mr-1" /> No
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading || !form.overall_rating}
                  className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 disabled:opacity-40 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all">
            <Send className="w-4 h-4" />
            {loading ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      )}

      {/* SERVICE RATINGS TAB */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-400" />
            Service Ratings ({feedbacks.length})
          </h3>
          {feedbacks.length === 0 ? (
            <p className="text-slate-500 text-center py-12">No feedback yet.</p>
          ) : (
            <div className="grid gap-4">
              {feedbacks.map(fb => (
                <div key={fb.id} className="glass-panel rounded-xl p-5 border border-slate-800 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 text-[10px] font-bold rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">{fb.service_category}</span>
                        {fb.title && <p className="text-white font-semibold text-sm">{fb.title}</p>}
                      </div>
                      <p className="text-slate-500 text-[10px] mt-1">{new Date(fb.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StarRating value={fb.overall_rating} size="sm" />
                      {fb.would_recommend === 1 && <ThumbsUp className="w-4 h-4 text-emerald-400" />}
                    </div>
                  </div>
                  {fb.comment && <p className="text-slate-300 text-xs leading-relaxed">{fb.comment}</p>}
                  {fb.positive_aspects && (
                    <div className="flex gap-2 text-[10px]">
                      <span className="text-emerald-400 font-semibold">👍</span>
                      <span className="text-emerald-300">{fb.positive_aspects}</span>
                    </div>
                  )}
                  {fb.negative_aspects && (
                    <div className="flex gap-2 text-[10px]">
                      <span className="text-rose-400 font-semibold">👎</span>
                      <span className="text-rose-300">{fb.negative_aspects}</span>
                    </div>
                  )}
                  {fb.admin_response && (
                    <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
                      <p className="text-teal-400 text-[10px] font-semibold mb-1">Admin Response</p>
                      <p className="text-teal-300 text-xs">{fb.admin_response}</p>
                    </div>
                  )}
                  {role === 'ADMIN' && !fb.admin_response && (
                    <button onClick={() => setSelectedFeedback(fb)}
                            className="px-3 py-1.5 bg-teal-500/10 hover:bg-teal-500 text-teal-400 hover:text-white text-xs font-semibold rounded-lg transition-all">
                      Respond
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Admin Response Modal */}
          {selectedFeedback && role === 'ADMIN' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90">
              <div className="w-full max-w-lg rounded-2xl p-6 bg-slate-900 border border-slate-800 space-y-4">
                <h4 className="text-white font-bold">Respond to Feedback</h4>
                <p className="text-slate-400 text-xs">{selectedFeedback.comment}</p>
                <textarea value={responseText} onChange={(e) => setResponseText(e.target.value)} rows={4}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500 resize-none" placeholder="Your response..." />
                <div className="flex gap-3">
                  <button onClick={() => { setSelectedFeedback(null); setResponseText(''); }}
                          className="flex-1 py-2.5 bg-slate-800 text-slate-300 text-sm font-semibold rounded-xl">Cancel</button>
                  <button onClick={handleRespond} disabled={!responseText.trim()}
                          className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" /> Send Response
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'analytics' && analytics && (role === 'ADMIN' || role === 'DOCTOR') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Rating Breakdown */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800">
            <h4 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" fill="currentColor" />
              Rating Breakdown
            </h4>
            <div className="space-y-3">
              {[
                { label: '5 Stars', value: analytics.rating_breakdown.five_star, color: 'bg-emerald-500' },
                { label: '4 Stars', value: analytics.rating_breakdown.four_star, color: 'bg-teal-500' },
                { label: '3 Stars', value: analytics.rating_breakdown.three_star, color: 'bg-yellow-500' },
                { label: '2 Stars', value: analytics.rating_breakdown.two_star, color: 'bg-orange-500' },
                { label: '1 Star', value: analytics.rating_breakdown.one_star, color: 'bg-rose-500' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-slate-400 text-xs w-16">{item.label}</span>
                  <div className="flex-1 bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div className={`${item.color} h-full rounded-full transition-all`}
                         style={{ width: `${analytics.total_feedback > 0 ? (item.value / analytics.total_feedback) * 100 : 0}%` }}></div>
                  </div>
                  <span className="text-white text-xs font-semibold w-8">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Category Averages */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800">
            <h4 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-400" />
              Category Averages
            </h4>
            <div className="space-y-3">
              {analytics.category_averages.map(cat => (
                <div key={cat.category} className="flex justify-between items-center p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                  <span className="text-slate-300 text-xs">{cat.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 text-sm font-bold">{cat.avg_rating}</span>
                    <span className="text-slate-500 text-[10px]">({cat.count})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Trend */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800">
            <h4 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-400" />
              Monthly Trend
            </h4>
            <div className="space-y-2">
              {analytics.monthly_trend.map(month => (
                <div key={month.month} className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/50">
                  <span className="text-slate-400 text-xs w-20">{month.month}</span>
                  <div className="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden">
                    <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 h-full rounded-full"
                         style={{ width: `${(month.avg_rating / 5) * 100}%` }}></div>
                  </div>
                  <span className="text-white text-xs font-bold w-16">{month.avg_rating} ({month.count})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Aspects */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800">
            <h4 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              Top Feedback Themes
            </h4>
            {analytics.top_positive_aspects.length > 0 && (
              <div className="mb-4">
                <p className="text-emerald-400 text-[10px] font-semibold mb-2">MOST MENTIONED POSITIVE</p>
                <div className="flex gap-2 flex-wrap">
                  {analytics.top_positive_aspects.map((aspect, i) => (
                    <span key={i} className="px-3 py-1.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{aspect}</span>
                  ))}
                </div>
              </div>
            )}
            {analytics.top_negative_aspects.length > 0 && (
              <div>
                <p className="text-rose-400 text-[10px] font-semibold mb-2">MOST MENTIONED NEGATIVE</p>
                <div className="flex gap-2 flex-wrap">
                  {analytics.top_negative_aspects.map((aspect, i) => (
                    <span key={i} className="px-3 py-1.5 text-[10px] font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">{aspect}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SATISFACTION REPORT TAB */}
      {activeTab === 'report' && satisfactionReport && role === 'ADMIN' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Overall Score */}
            <div className="glass-panel rounded-2xl p-6 border border-slate-800 text-center">
              <Target className="w-8 h-8 text-violet-400 mx-auto mb-2" />
              <p className="text-slate-400 text-[10px] font-semibold">SATISFACTION SCORE</p>
              <p className="text-4xl font-bold text-violet-400 mt-2">{satisfactionReport.overall_satisfaction_score}%</p>
              <p className="text-slate-500 text-xs mt-1">Out of 100</p>
            </div>
            {/* Responses */}
            <div className="glass-panel rounded-2xl p-6 border border-slate-800 text-center">
              <MessageCircle className="w-8 h-8 text-teal-400 mx-auto mb-2" />
              <p className="text-slate-400 text-[10px] font-semibold">TOTAL RESPONSES</p>
              <p className="text-4xl font-bold text-teal-400 mt-2">{satisfactionReport.total_responses}</p>
              <p className="text-slate-500 text-xs mt-1">{satisfactionReport.response_rate}% response rate</p>
            </div>
            {/* NPS */}
            <div className="glass-panel rounded-2xl p-6 border border-slate-800 text-center">
              <BarChart3 className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
              <p className="text-slate-400 text-[10px] font-semibold">NPS SCORE</p>
              <p className="text-4xl font-bold text-cyan-400 mt-2">{satisfactionReport.nps_score}</p>
              <p className="text-slate-500 text-xs mt-1">Net Promoter Score</p>
            </div>
          </div>

          {/* Department Satisfaction */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800">
            <h4 className="text-white font-bold text-sm mb-4">Department Satisfaction</h4>
            <div className="space-y-3">
              {satisfactionReport.department_satisfaction.map(dept => (
                <div key={dept.department_name} className="flex items-center justify-between p-4 rounded-lg bg-slate-900/50 border border-slate-800">
                  <span className="text-slate-300 text-sm font-semibold">{dept.department_name}</span>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-yellow-400 text-sm font-bold">{dept.avg_rating}/5</p>
                      <p className="text-slate-500 text-[10px]">{dept.total_feedback} reviews</p>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-400 text-sm font-bold">{dept.recommendation_rate}%</p>
                      <p className="text-slate-500 text-[10px]">recommend</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-slate-500 text-xs text-center italic">Report period: {satisfactionReport.period}</p>
        </div>
      )}
    </div>
  );
};

export default Feedback;
