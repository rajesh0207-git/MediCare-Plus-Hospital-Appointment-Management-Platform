import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  Bot, Send, User, Sparkles, Stethoscope, AlertTriangle, ArrowRight,
  Pill, HelpCircle, Calendar, Heart, Shield, Activity, X, ChevronDown,
  ThermometerSun, Brain, Wind, Baby, Bone, Eye, Zap
} from 'lucide-react';

const SEVERITY_COLORS = {
  LOW: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  MODERATE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
  CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/40'
};

const SEVERITY_ICONS = {
  LOW: <Shield className="w-3.5 h-3.5" />,
  MODERATE: <Activity className="w-3.5 h-3.5" />,
  HIGH: <Zap className="w-3.5 h-3.5" />,
  CRITICAL: <AlertTriangle className="w-3.5 h-3.5" />
};

const QUICK_QUESTIONS = [
  "I have a headache and fever",
  "My chest feels tight",
  "I have stomach pain and nausea",
  "How do I book an appointment?",
  "What are the hospital hours?",
  "I have a persistent cough"
];

const AIChat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Hello! I'm your AI Health Assistant. I can help you with:\n\n🔍 **Symptom Analysis** — Describe what you're feeling\n💊 **Medication Info** — Learn about common treatments\n❓ **Health FAQs** — Get answers to common questions\n👨‍⚕️ **Doctor Suggestions** — Find the right specialist\n📅 **Appointment Guidance** — Know when to book\n\nTry asking about your symptoms, or click a quick question below!",
      isWelcome: true
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [activeTab, setActiveTab] = useState('analysis'); // analysis, doctors, meds, faqs
  const [showQuickQuestions, setShowQuickQuestions] = useState(true);

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (text) => {
    const messageText = typeof text === 'string' ? text : input;
    if (!messageText.trim() || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: messageText
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setShowQuickQuestions(false);

    try {
      const res = await api.post('/ai/chat', { message: messageText });
      const data = res.data;

      const aiResponse = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.response,
        hasAnalysis: !!data.symptom_analysis,
        hasMeds: !!(data.medications && data.medications.length > 0),
        hasFaqs: !!(data.faqs && data.faqs.length > 0),
        hasDoctors: !!(data.recommended_doctors && data.recommended_doctors.length > 0),
        appointmentRecommended: data.appointment_recommended
      };

      setMessages(prev => [...prev, aiResponse]);

      // Store analysis data for sidebar
      if (data.symptom_analysis || data.recommended_doctors || data.medications || data.faqs) {
        setLastAnalysis({
          analysis: data.symptom_analysis,
          doctors: data.recommended_doctors || [],
          medications: data.medications || [],
          faqs: data.faqs || [],
          specialization: data.suggested_specialization,
          appointmentRecommended: data.appointment_recommended,
          quickActions: data.quick_actions || []
        });
      }
    } catch (err) {
      console.error('AI Chat Error:', err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: "I'm having trouble right now. Please try again. For emergencies, call our 24/7 helpline at +1 (800) 555-0199."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleBookDoctor = () => {
    navigate('/patient/book');
  };

  const formatText = (text) => {
    // Convert markdown-like formatting to JSX
    return text.split('\n').map((line, i) => {
      let formatted = line
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
        .replace(/• /g, '<span class="text-violet-400 ml-2">•</span> ');
      return <div key={i} dangerouslySetInnerHTML={{ __html: formatted }} className="leading-relaxed" />;
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[calc(100vh-140px)] animate-fade-in">

      {/* Chat Area */}
      <div className="lg:col-span-2 flex flex-col glass-panel rounded-2xl border border-slate-800 shadow-2xl h-[calc(100vh-140px)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-violet-500 to-fuchsia-500 rounded-xl text-white shadow-md shadow-violet-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-bold text-sm flex items-center gap-1.5">
              AI Health Assistant
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            </h3>
            <p className="text-[10px] text-slate-400">Symptom Analysis • Doctor Suggestions • Medication Info • FAQs</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex gap-3 max-w-[90%] ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
              <div className={`p-2 rounded-xl flex-shrink-0 flex items-center justify-center h-8 w-8 ${m.sender === 'user' ? 'bg-teal-500/20 text-teal-400' : 'bg-violet-500/20 text-violet-400'}`}>
                {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`p-4 rounded-2xl text-sm ${m.sender === 'user' ? 'bg-teal-500/10 border border-teal-500/20 text-slate-100' : 'bg-slate-900 border border-slate-800 text-slate-300'}`}>
                {formatText(m.text)}
                {m.hasAnalysis && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">See Analysis →</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 max-w-[90%]">
              <div className="p-2 rounded-xl bg-violet-500/20 text-violet-400 h-8 w-8 flex items-center justify-center">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Questions */}
        {showQuickQuestions && (
          <div className="px-6 py-3 border-t border-slate-800/50 bg-slate-900/30">
            <p className="text-[10px] text-slate-500 font-semibold mb-2">QUICK QUESTIONS</p>
            <div className="flex gap-2 flex-wrap">
              {QUICK_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="px-3 py-1.5 bg-slate-800/50 hover:bg-violet-500/10 border border-slate-700 hover:border-violet-500/30 text-slate-400 hover:text-violet-300 text-[10px] font-semibold rounded-lg transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="px-6 py-2 bg-rose-500/5 border-y border-rose-500/10 text-[10px] text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
          <span>Disclaimer: This AI tool is for guidance only and does not replace professional medical diagnosis.</span>
        </div>

        {/* Input */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-4 border-t border-slate-800 bg-slate-900/40 flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Describe your symptoms or ask a health question..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 disabled:opacity-40 text-white rounded-xl shadow-lg transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Sidebar — Analysis Panel */}
      <div className="space-y-4 flex flex-col">
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
          {[
            { key: 'analysis', icon: Activity, label: 'Analysis' },
            { key: 'doctors', icon: Stethoscope, label: 'Doctors' },
            { key: 'meds', icon: Pill, label: 'Meds' },
            { key: 'faqs', icon: HelpCircle, label: 'FAQs' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-semibold rounded-lg transition-all ${activeTab === tab.key ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {!lastAnalysis ? (
            <div className="glass-panel rounded-2xl border border-slate-800 p-6 text-center text-slate-500 text-xs h-full flex flex-col justify-center items-center space-y-3">
              <Sparkles className="w-8 h-8 text-slate-700 animate-pulse" />
              <p>Chat with the AI to see analysis, doctor recommendations, medications, and FAQs here.</p>
            </div>
          ) : (
            <div className="space-y-4">

              {/* SYMPTOM ANALYSIS TAB */}
              {activeTab === 'analysis' && lastAnalysis.analysis && (
                <div className="glass-panel rounded-2xl border border-slate-800 p-5 space-y-4">
                  <h4 className="text-white font-bold text-xs flex items-center gap-2">
                    <Activity className="w-4 h-4 text-violet-400" />
                    Symptom Analysis
                  </h4>

                  {/* Severity Badge */}
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border ${SEVERITY_COLORS[lastAnalysis.analysis.severity]}`}>
                      {SEVERITY_ICONS[lastAnalysis.analysis.severity]}
                      {lastAnalysis.analysis.severity}
                    </span>
                    {lastAnalysis.specialization && (
                      <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">
                        {lastAnalysis.specialization}
                      </span>
                    )}
                  </div>

                  {/* Detected Symptoms */}
                  <div>
                    <p className="text-slate-400 text-[10px] font-semibold mb-2">DETECTED SYMPTOMS</p>
                    <div className="flex gap-2 flex-wrap">
                      {lastAnalysis.analysis.detected_symptoms.map((s, i) => (
                        <span key={i} className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Urgency Advice */}
                  <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                    <p className="text-[10px] text-slate-400 font-semibold mb-1">ADVICE</p>
                    <p className="text-slate-300 text-xs leading-relaxed">{lastAnalysis.analysis.urgency_advice}</p>
                  </div>

                  {/* Self-Care Tips */}
                  {lastAnalysis.analysis.self_care_tips.length > 0 && (
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold mb-2">SELF-CARE TIPS</p>
                      <div className="space-y-1.5">
                        {lastAnalysis.analysis.self_care_tips.map((tip, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                            <Heart className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Book Appointment Button */}
                  {lastAnalysis.appointmentRecommended && (
                    <button
                      onClick={handleBookDoctor}
                      className="w-full py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                    >
                      <Calendar className="w-4 h-4" />
                      Book Appointment Now
                    </button>
                  )}
                </div>
              )}

              {/* DOCTORS TAB */}
              {activeTab === 'doctors' && (
                <div className="glass-panel rounded-2xl border border-slate-800 p-5 space-y-4">
                  <h4 className="text-white font-bold text-xs flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-violet-400" />
                    Recommended Doctors
                  </h4>
                  {lastAnalysis.doctors.length === 0 ? (
                    <p className="text-slate-500 text-xs text-center py-8">No doctors found for this specialization. Try describing different symptoms.</p>
                  ) : (
                    <div className="space-y-3">
                      {lastAnalysis.doctors.map((doc, i) => (
                        <div key={i} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-white font-semibold text-xs">{doc.name}</p>
                              <p className="text-[10px] text-slate-400">{doc.specialization}</p>
                            </div>
                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${doc.availability_status ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                              {doc.availability_status ? 'Available' : 'Unavailable'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex gap-3">
                              <span className="text-teal-400 text-[10px] font-semibold">${doc.fee}</span>
                              {doc.experience_years && <span className="text-slate-400 text-[10px]">{doc.experience_years} yrs exp</span>}
                            </div>
                            <button
                              onClick={handleBookDoctor}
                              className="py-1 px-2.5 bg-violet-500/10 hover:bg-violet-500 text-violet-400 hover:text-white text-[10px] font-semibold rounded-lg border border-violet-500/30 transition-colors flex items-center gap-1"
                            >
                              Book <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* MEDICATIONS TAB */}
              {activeTab === 'meds' && (
                <div className="glass-panel rounded-2xl border border-slate-800 p-5 space-y-4">
                  <h4 className="text-white font-bold text-xs flex items-center gap-2">
                    <Pill className="w-4 h-4 text-violet-400" />
                    Medication Information
                  </h4>
                  {lastAnalysis.medications.length === 0 ? (
                    <p className="text-slate-500 text-xs text-center py-8">No medication info available. Try describing specific symptoms.</p>
                  ) : (
                    <div className="space-y-3">
                      {lastAnalysis.medications.map((med, i) => (
                        <div key={i} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                          <div className="flex justify-between items-start">
                            <p className="text-white font-semibold text-xs">{med.name}</p>
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                              {med.category}
                            </span>
                          </div>
                          <p className="text-slate-400 text-[10px]">{med.description}</p>
                          <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-700">
                            <p className="text-[9px] text-slate-500 font-semibold">DOSAGE</p>
                            <p className="text-slate-300 text-[10px]">{med.common_dosage}</p>
                          </div>
                          {med.precautions && (
                            <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                              <p className="text-[9px] text-amber-400 font-semibold">⚠ PRECAUTION</p>
                              <p className="text-amber-300/80 text-[10px]">{med.precautions}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[9px] text-rose-400 text-center italic">Always consult a doctor before taking any medication.</p>
                </div>
              )}

              {/* FAQS TAB */}
              {activeTab === 'faqs' && (
                <div className="glass-panel rounded-2xl border border-slate-800 p-5 space-y-4">
                  <h4 className="text-white font-bold text-xs flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-violet-400" />
                    Health FAQs
                  </h4>
                  {lastAnalysis.faqs.length === 0 ? (
                    <p className="text-slate-500 text-xs text-center py-8">No FAQs available.</p>
                  ) : (
                    <div className="space-y-2">
                      {lastAnalysis.faqs.map((faq, i) => (
                        <FAQItem key={i} faq={faq} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// FAQ Accordion Item
const FAQItem = ({ faq }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-800/50 transition-colors"
      >
        <span className="text-white text-xs font-semibold pr-2">{faq.question}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-3 pb-3">
          <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700">
            <p className="text-slate-300 text-xs leading-relaxed">{faq.answer}</p>
          </div>
          <span className="inline-block mt-2 px-2 py-0.5 text-[9px] font-semibold rounded-full bg-violet-500/10 text-violet-400">
            {faq.category}
          </span>
        </div>
      )}
    </div>
  );
};

export default AIChat;
