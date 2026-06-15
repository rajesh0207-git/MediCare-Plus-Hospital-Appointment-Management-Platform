import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const { login, token, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Redirect already-authenticated users to their dashboard
  useEffect(() => {
    if (!authLoading && token && role) {
      if (role === 'PATIENT') navigate('/patient', { replace: true });
      else if (role === 'DOCTOR') navigate('/doctor', { replace: true });
      else if (role === 'ADMIN') navigate('/admin', { replace: true });
    }
  }, [authLoading, token, role, navigate]);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const isSessionExpired = searchParams.get('expired') === 'true';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    
    setLoading(true);
    try {
      const { role } = await login(email, password);
      if (role === 'PATIENT') {
        navigate('/patient');
      } else if (role === 'DOCTOR') {
        navigate('/doctor');
      } else if (role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Incorrect email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-md animate-fade-in">
        {/* Logo / Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-2xl mb-4 text-teal-400">
            <Activity className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">
            MediCare <span className="text-teal-400">Plus</span>
          </h1>
          <p className="text-slate-400 text-sm">Hospital & Appointment Management Portal</p>
        </div>

        {/* Form Panel */}
        <div className="glass-panel rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-6">Welcome Back</h2>

          {isSessionExpired && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Your session has expired. Please log in again.</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all text-sm"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-slate-300 text-sm font-medium" htmlFor="password">
                  Password
                </label>
                <Link to="/reset-password" className="text-xs text-teal-400 hover:text-teal-300 transition-colors">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all text-sm"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl text-sm shadow-lg hover:shadow-teal-500/15 focus:outline-none focus:ring-2 focus:ring-teal-500/50 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800 text-center">
            <p className="text-slate-400 text-xs">
              Need a patient account?{' '}
              <Link to="/register" className="text-teal-400 hover:text-teal-300 font-medium transition-colors">
                Register here
              </Link>
            </p>
          </div>
        </div>

        {/* Demo Credentials Alert */}
        <div className="mt-6 glass-panel rounded-xl p-4 border-teal-500/10 text-xs text-slate-400 space-y-2">
          <div className="font-semibold text-slate-300 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-400"></div>
            Demo Login Credentials
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="font-semibold text-slate-300">Patient</p>
              <p className="truncate">patient@medicare.com</p>
              <p className="font-mono">Patient@123</p>
            </div>
            <div>
              <p className="font-semibold text-slate-300">Doctor</p>
              <p className="truncate">doctor@medicare.com</p>
              <p className="font-mono">Doctor@123</p>
            </div>
            <div>
              <p className="font-semibold text-slate-300">Admin</p>
              <p className="truncate">admin@medicare.com</p>
              <p className="font-mono">Admin@123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
