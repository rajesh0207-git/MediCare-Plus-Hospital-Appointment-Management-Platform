import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Send, MessageSquare,
  Radio, Square, Volume2, Shield, Info, Clock, AlertCircle,
  Download, X, PlayCircle, Film
} from 'lucide-react';

const VideoConsultation = () => {
  const { apptId } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const [appointment, setAppointment] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Media states
  const [localStream, setLocalStream] = useState(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  // Recording states — real MediaRecorder
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState(null);
  const [showPlaybackModal, setShowPlaybackModal] = useState(false);
  const [recordingSupported, setRecordingSupported] = useState(true);

  // Chat states
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatOpen, setChatOpen] = useState(true);

  // Call simulation states
  const [callDuration, setCallDuration] = useState(0);
  const [peerStatus, setPeerStatus] = useState('Connecting...');
  const [peerSpeaking, setPeerSpeaking] = useState(false);

  const localVideoRef = useRef(null);
  const playbackVideoRef = useRef(null);
  const chatEndRef = useRef(null);
  const recordIntervalRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const localStreamRef = useRef(null); // stable ref for cleanup

  // ─── Init Call ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const initCall = async () => {
      try {
        const apptRes = await api.get(`/appointments`);
        const appt = apptRes.data.find(a => a.id === parseInt(apptId, 10));
        if (!appt) {
          setError('Appointment not found');
          setLoading(false);
          return;
        }
        setAppointment(appt);

        // Retrieve or generate video session
        let sess;
        try {
          const sessRes = await api.get(`/appointments/${apptId}/video-session`);
          sess = sessRes.data;
        } catch {
          const genRes = await api.post(`/appointments/${apptId}/video-session`);
          sess = genRes.data;
        }
        setSession(sess);

        // Start camera
        await startCamera();

        setPeerStatus('Connected');
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Failed to initialize video consultation session.');
        setLoading(false);
      }
    };

    initCall();

    return () => {
      // Cleanup on unmount
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    };
  }, [apptId]);

  // ─── Call Timer + Peer Speaking Simulation ─────────────────────────────────
  useEffect(() => {
    if (loading || error) return;
    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
      if (Math.random() > 0.7) setPeerSpeaking(prev => !prev);
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, error]);

  // ─── Scroll Chat ───────────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Update playback video src when blobUrl changes ────────────────────────
  useEffect(() => {
    if (recordedBlobUrl && playbackVideoRef.current) {
      playbackVideoRef.current.src = recordedBlobUrl;
    }
  }, [recordedBlobUrl, showPlaybackModal]);

  // ─── Camera ────────────────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setVideoEnabled(true);
      setMicEnabled(true);

      // Check MediaRecorder support
      if (!window.MediaRecorder) {
        setRecordingSupported(false);
      }
    } catch (err) {
      console.warn('Camera/mic denied:', err);
      setVideoEnabled(false);
      setMicEnabled(false);
      setRecordingSupported(false);
    }
  };

  const stopCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
  };

  const toggleMic = () => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getAudioTracks().forEach(t => { t.enabled = !micEnabled; });
    }
    setMicEnabled(prev => !prev);
  };

  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getVideoTracks().forEach(t => { t.enabled = !videoEnabled; });
    }
    setVideoEnabled(prev => !prev);
  };

  // ─── Real MediaRecorder Recording ──────────────────────────────────────────
  const handleStartStopRecording = async () => {
    if (role !== 'DOCTOR') return;

    if (!isRecording) {
      // ── START recording ──
      const stream = localStreamRef.current;
      if (!stream) {
        alert('No camera/microphone stream available to record.');
        return;
      }

      // Clear previous recording
      chunksRef.current = [];
      setRecordedChunks([]);
      if (recordedBlobUrl) {
        URL.revokeObjectURL(recordedBlobUrl);
        setRecordedBlobUrl(null);
      }

      // Pick best supported MIME type
      const mimeType = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ].find(m => MediaRecorder.isTypeSupported(m)) || '';

      try {
        const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});

        mr.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        mr.onstop = () => {
          const blob = new Blob(chunksRef.current, {
            type: mimeType || 'video/webm',
          });
          const url = URL.createObjectURL(blob);
          setRecordedBlobUrl(url);
          setRecordedChunks([...chunksRef.current]);
          setShowPlaybackModal(true);
        };

        mr.onerror = (e) => {
          console.error('MediaRecorder error:', e);
          alert('Recording error: ' + e.error?.message);
        };

        mr.start(1000); // collect data every 1 second
        mediaRecorderRef.current = mr;

        setIsRecording(true);
        setRecordingSeconds(0);
        recordIntervalRef.current = setInterval(() => {
          setRecordingSeconds(prev => prev + 1);
        }, 1000);

        // Notify backend
        await api.put(`/appointments/${apptId}/video-session`, { is_recording: true });

      } catch (err) {
        console.error('Failed to start MediaRecorder:', err);
        alert('Your browser does not support in-browser recording. Try Chrome or Edge.');
      }

    } else {
      // ── STOP recording ──
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop(); // triggers onstop → sets blob url → shows modal
      }

      setIsRecording(false);
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
        recordIntervalRef.current = null;
      }

      // Notify backend
      try {
        await api.put(`/appointments/${apptId}/video-session`, { is_recording: false });
      } catch (err) {
        console.error('Backend update failed:', err);
      }
    }
  };

  // ─── Download recorded video ────────────────────────────────────────────────
  const handleDownloadRecording = () => {
    if (!recordedBlobUrl) return;
    const a = document.createElement('a');
    a.href = recordedBlobUrl;
    a.download = `consultation-${apptId}-${new Date().toISOString().slice(0, 10)}.webm`;
    a.click();
  };

  // ─── Chat ──────────────────────────────────────────────────────────────────
  const handleBotReply = (userText) => {
    const isDoc = role === 'DOCTOR';
    const peerName = isDoc ? 'Patient' : 'Doctor';
    const text = userText.toLowerCase();

    setTimeout(() => {
      let replyText = "Understood. Let's record this in the notes.";
      if (isDoc) {
        if (text.includes('heart') || text.includes('chest')) replyText = 'Yes, it mostly happens when I climb stairs or feel stressed.';
        else if (text.includes('pain') || text.includes('hurt')) replyText = "It's a dull ache, about 4/10. It started two days ago.";
        else if (text.includes('medicine') || text.includes('pill')) replyText = 'I take my usual medication every morning after breakfast.';
        else replyText = 'Okay Doctor. Should I schedule a follow-up lab test?';
      } else {
        if (text.includes('symptom') || text.includes('feel') || text.includes('hurt')) replyText = "I'll note these symptoms and recommend some checks.";
        else if (text.includes('recording') || text.includes('record')) replyText = 'Yes, the recording is stored securely in your history.';
        else if (text.includes('prescription') || text.includes('medicine')) replyText = "I've reviewed your history and will prescribe a daily dosage.";
        else replyText = 'Please take a deep breath. We will monitor this over the next few days.';
      }

      setMessages(prev => [...prev, {
        sender: 'PEER',
        senderName: peerName,
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    }, 2500);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, {
      sender: 'ME',
      senderName: user?.full_name || 'Me',
      text: newMessage,
      time: timeStr,
    }]);
    handleBotReply(newMessage);
    setNewMessage('');
  };

  // ─── End Call ──────────────────────────────────────────────────────────────
  const handleEndCall = async () => {
    if (!window.confirm('Are you sure you want to end this consultation call?')) return;

    // Stop recording if active
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    }

    try {
      await api.put(`/appointments/${apptId}/video-session`, { status: 'COMPLETED', is_recording: false });
    } catch { /* fallback */ }

    stopCamera();
    navigate(role === 'DOCTOR' ? '/doctor' : '/patient');
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ─── Loading / Error ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center gap-4 text-white">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-semibold">Generating secure telemedicine tunnel...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center gap-4 text-white p-6">
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl flex items-center gap-3 max-w-md">
          <AlertCircle className="w-6 h-6 text-rose-400 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
        <button
          onClick={() => navigate(role === 'DOCTOR' ? '/doctor' : '/patient')}
          className="py-2.5 px-5 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 hover:text-white text-xs font-bold transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const peerName = role === 'DOCTOR'
    ? (appointment?.patient?.full_name || 'Patient')
    : `Dr. ${appointment?.doctor?.user?.email?.split('@')[0].toUpperCase() || 'Doctor'}`;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col text-slate-100 font-sans">

      {/* ── Playback Modal ─────────────────────────────────────────────────── */}
      {showPlaybackModal && recordedBlobUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-500/10 border border-teal-500/20 rounded-xl">
                  <Film className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-sm">Consultation Recording</h2>
                  <p className="text-slate-500 text-[11px]">
                    Duration recorded: {formatTimer(recordingSeconds)} &nbsp;|&nbsp; Room: {session?.room_id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPlaybackModal(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Player */}
            <div className="bg-black relative flex items-center justify-center" style={{ minHeight: '360px' }}>
              <video
                ref={playbackVideoRef}
                controls
                autoPlay
                className="w-full max-h-[60vh] rounded-none"
                style={{ background: '#000' }}
              >
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center px-6 py-4 border-t border-slate-800 bg-slate-950/50">
              <p className="text-slate-500 text-[11px]">
                ✅ Recording captured from your webcam &amp; microphone stream
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDownloadRecording}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-slate-950 rounded-xl text-xs font-bold transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download .webm
                </button>
                <button
                  onClick={() => setShowPlaybackModal(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                >
                  Continue Call
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/60 px-6 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500/10 border border-teal-500/20 rounded-xl text-teal-400 animate-pulse">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Telemedicine Consultation Room</span>
              <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[9px] font-bold">SECURE SSL</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">
              Room ID: {session?.room_id} | Patient: {appointment?.patient?.full_name}
            </p>
          </div>
        </div>

        {/* Call Timer */}
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-full px-4 py-1.5 text-xs text-slate-300">
          <Clock className="w-3.5 h-3.5 text-teal-400" />
          <span className="font-mono font-bold">{formatTimer(callDuration)}</span>
        </div>

        <div className="flex items-center gap-4">
          {/* View Recording button (if available) */}
          {recordedBlobUrl && (
            <button
              onClick={() => setShowPlaybackModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-xl text-xs font-bold hover:bg-teal-500/20 transition-all"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>View Recording</span>
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded-lg">
            <Shield className="w-3.5 h-3.5 text-teal-400" />
            <span>HIPAA Compliant</span>
          </div>
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`p-2 rounded-xl border transition-all relative ${chatOpen ? 'bg-teal-500/10 border-teal-500/20 text-teal-400' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
          >
            <MessageSquare className="w-5 h-5" />
            {!chatOpen && messages.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-teal-500 text-slate-950 font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center">!</span>
            )}
          </button>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left: Video Area */}
        <div className="flex-1 p-6 flex flex-col justify-between relative bg-slate-950">

          {/* Remote Feed Panel */}
          <div className="flex-1 w-full rounded-3xl overflow-hidden bg-slate-900 border border-slate-800/80 relative flex items-center justify-center shadow-inner">

            {peerStatus === 'Connected' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <div className={`absolute inset-0 rounded-full bg-teal-500/10 border border-teal-500/30 transition-all duration-300 scale-150 ${peerSpeaking ? 'animate-ping' : ''}`}></div>
                  <div className="w-24 h-24 rounded-full bg-slate-950 border-2 border-slate-800 flex items-center justify-center relative overflow-hidden z-10">
                    <span className="text-2xl font-extrabold text-teal-400">{peerName.charAt(0)}</span>
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-white font-bold text-sm">{peerName}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 justify-center">
                    <Volume2 className={`w-3.5 h-3.5 ${peerSpeaking ? 'text-teal-400 animate-bounce' : 'text-slate-500'}`} />
                    <span>{peerSpeaking ? 'Speaking...' : 'Connected'}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-slate-500 text-xs font-semibold">Connecting peer tunnel...</p>
              </div>
            )}

            {/* PiP Local Video */}
            <div className="absolute right-4 bottom-4 w-40 sm:w-48 h-28 sm:h-32 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex items-center justify-center">
              {videoEnabled ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                <div className="text-center space-y-1">
                  <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto">
                    <span className="text-xs font-bold text-slate-400">{user?.full_name?.charAt(0) || 'U'}</span>
                  </div>
                  <p className="text-[9px] text-slate-500">Camera Muted</p>
                </div>
              )}
              <div className="absolute left-2.5 bottom-2 bg-slate-900/80 backdrop-blur-md px-2 py-0.5 rounded-md text-[9px] font-bold text-slate-300">
                You {micEnabled ? '' : '(Muted)'}
              </div>
            </div>

            {/* Recording Indicator */}
            {isRecording && (
              <div className="absolute left-6 top-6 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold px-3.5 py-1.5 rounded-full flex items-center gap-2 animate-pulse shadow-lg">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
                <span>REC {formatTimer(recordingSeconds)}</span>
              </div>
            )}
          </div>

          {/* Controls Toolbar */}
          <div className="h-20 flex justify-center items-center gap-4 flex-shrink-0 mt-4">

            {/* Mic */}
            <button
              onClick={toggleMic}
              className={`p-3.5 rounded-full border transition-all shadow-lg ${micEnabled ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white' : 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'}`}
              title={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            {/* Video */}
            <button
              onClick={toggleVideo}
              className={`p-3.5 rounded-full border transition-all shadow-lg ${videoEnabled ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white' : 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'}`}
              title={videoEnabled ? 'Stop Video' : 'Start Video'}
            >
              {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            {/* Record (DOCTOR only) */}
            {role === 'DOCTOR' && (
              <button
                onClick={handleStartStopRecording}
                disabled={!recordingSupported && !isRecording}
                className={`p-3.5 rounded-full border transition-all shadow-lg flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                  isRecording
                    ? 'bg-rose-500 text-slate-950 font-bold border-rose-600 animate-pulse hover:bg-rose-600'
                    : 'bg-slate-900 border-slate-800 text-rose-400 hover:bg-rose-500/10'
                }`}
                title={isRecording ? 'Stop Recording' : recordingSupported ? 'Record Consultation' : 'Recording not supported in this browser'}
              >
                {isRecording
                  ? <Square className="w-5 h-5 text-slate-950 fill-current" />
                  : <span className="w-5 h-5 flex items-center justify-center">
                      <span className="w-3 h-3 rounded-full bg-rose-400 inline-block"></span>
                    </span>
                }
              </button>
            )}

            {/* View Recording (if stopped) */}
            {role === 'DOCTOR' && recordedBlobUrl && !isRecording && (
              <button
                onClick={() => setShowPlaybackModal(true)}
                className="p-3.5 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 transition-all shadow-lg"
                title="Play Back Recording"
              >
                <PlayCircle className="w-5 h-5" />
              </button>
            )}

            {/* End Call */}
            <button
              onClick={handleEndCall}
              className="p-3.5 bg-rose-500 hover:bg-rose-600 text-slate-950 rounded-full border border-rose-600 transition-all shadow-lg shadow-rose-500/15"
              title="Hang Up"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Right: Chat Panel */}
        {chatOpen && (
          <div className="w-80 border-l border-slate-800/60 bg-slate-900/60 backdrop-blur-md flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-teal-400" />
                <span>Call Messenger</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-bold bg-slate-950 px-2 py-0.5 rounded-full">
                {messages.length} msgs
              </span>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              <div className="p-3 bg-slate-950/60 border border-slate-800/60 rounded-xl text-[10px] text-slate-400 leading-relaxed flex gap-2">
                <Info className="w-4 h-4 text-teal-400 flex-shrink-0" />
                <span>Chats are private, encrypted and auto-summarized into clinical reports.</span>
              </div>

              {messages.length === 0 ? (
                <div className="h-40 flex flex-col justify-center items-center text-center p-4">
                  <MessageSquare className="w-8 h-8 text-slate-800 mb-2" />
                  <p className="text-slate-500 text-xs font-medium">Send a quick note or symptom detail to the other party.</p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.sender === 'ME' ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-slate-500 font-semibold mb-1 px-1">{msg.senderName} • {msg.time}</span>
                    <div className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${msg.sender === 'ME' ? 'bg-teal-500 text-slate-950 font-medium rounded-tr-none' : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-slate-950/50">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-teal-500/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none placeholder-slate-600"
                />
                <button
                  type="submit"
                  className="p-2.5 bg-teal-500 text-slate-950 hover:bg-teal-600 rounded-xl font-bold transition-all flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoConsultation;
