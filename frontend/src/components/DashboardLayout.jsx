import React, { useState } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Activity, Bell, LogOut, Menu, X, Check, CheckCheck,
  LayoutDashboard, Bot, CalendarRange, CreditCard, FolderHeart, User,
  Clock, ShieldAlert, PlusCircle, Building, Calendar, FileText, FlaskConical, BadgeAlert,
  HeartPulse, Pill, BedDouble, ClipboardList, Siren, MessageSquare
} from 'lucide-react';

const DashboardLayout = () => {
  const { user, role, logout, notifications, unreadCount, markAsRead, markAllAsRead } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Define sidebar items based on role
  const patientNavigation = [
    { name: 'Overview', path: '/patient', icon: LayoutDashboard },
    { name: 'AI Symptom Checker', path: '/patient/ai-chat', icon: Bot, isSpecial: true },
    { name: 'Book Appointment', path: '/patient/book', icon: CalendarRange },
    { name: 'Billing & Payments', path: '/patient/billing', icon: CreditCard },
    { name: 'Medical Records', path: '/patient/records', icon: FolderHeart },
    { name: 'Health Tracker', path: '/patient/health-tracker', icon: HeartPulse },
    { name: 'Medicine Reminder', path: '/patient/medicine-reminder', icon: Pill },
    { name: 'Profile Settings', path: '/patient/profile', icon: User },
    { name: 'Feedback & Ratings', path: '/patient/feedback', icon: MessageSquare },
    { name: 'Emergency Service', path: '/emergency', icon: Siren, isSpecial: true },
  ];

  const doctorNavigation = [
    { name: 'Appointments', path: '/doctor', icon: LayoutDashboard },
    { name: 'Manage Schedule', path: '/doctor/schedule', icon: Clock },
    { name: 'Patient Records', path: '/doctor/records', icon: FolderHeart },
    { name: 'Invoicing & Bills', path: '/doctor/billing', icon: CreditCard },
    { name: 'Feedback & Ratings', path: '/doctor/feedback', icon: MessageSquare },
    { name: 'Emergency Service', path: '/emergency', icon: Siren, isSpecial: true },
  ];

  const adminNavigation = [
    { name: 'Metrics Analytics', path: '/admin', icon: LayoutDashboard },
    { name: 'Departments', path: '/admin/departments', icon: Building },
    { name: 'Onboard Doctor', path: '/admin/doctors', icon: PlusCircle },
    { name: 'Bed Management', path: '/admin/beds', icon: BedDouble },
    { name: 'Admission & Discharge', path: '/admin/admissions', icon: ClipboardList },
    { name: 'Feedback & Ratings', path: '/admin/feedback', icon: MessageSquare },
    { name: 'Security Audit Logs', path: '/admin/audit', icon: ShieldAlert },
    { name: 'Emergency Service', path: '/emergency', icon: Siren, isSpecial: true },
  ];

  const navigation = 
    role === 'PATIENT' ? patientNavigation :
    role === 'DOCTOR' ? doctorNavigation :
    role === 'ADMIN' ? adminNavigation : [];

  const roleLabels = {
    'PATIENT': 'Patient Portal',
    'DOCTOR': 'Doctor Portal',
    'ADMIN': 'Admin Panel'
  };

  const activeClass = (path) => 
    location.pathname === path 
      ? 'bg-teal-500/10 text-teal-400 border-l-4 border-teal-500' 
      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200';

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString();
  };

  const NotificationPopover = ({ isMobile }) => (
    <div className={`absolute right-0 ${isMobile ? 'top-10' : 'top-12'} w-80 glass-panel rounded-2xl border border-slate-800 shadow-2xl p-4 z-50 animate-fade-in max-h-96 overflow-y-auto`}>
      <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-3">
        <h3 className="text-white font-bold text-sm">Notifications</h3>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-[10px] text-teal-400 hover:text-teal-300 font-semibold transition-colors"
            >
              Mark all read
            </button>
          )}
          <span className="text-[10px] bg-slate-800 text-slate-400 py-0.5 px-2 rounded-full font-semibold">
            {unreadCount} New
          </span>
        </div>
      </div>
      {notifications.length === 0 ? (
        <p className="text-slate-500 text-xs text-center py-6">No notifications yet.</p>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-3 rounded-xl transition-all border text-xs flex gap-2.5 items-start ${notif.is_read ? 'bg-slate-900/30 border-slate-800/40 text-slate-400' : 'bg-teal-500/5 border-teal-500/10 text-slate-200'}`}
            >
              <div className="flex-1 space-y-1">
                <p className="font-medium leading-relaxed">{notif.message}</p>
                <p className="text-[10px] text-slate-500">{formatTime(notif.created_at)}</p>
              </div>
              {!notif.is_read && (
                <button
                  onClick={() => markAsRead(notif.id)}
                  className="p-1 bg-teal-500/10 border border-teal-500/20 text-teal-400 hover:bg-teal-500 hover:text-slate-950 rounded-lg transition-colors flex-shrink-0"
                  title="Mark as read"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="flex md:hidden items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 text-white z-20">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-teal-400" />
          <span className="font-extrabold text-lg">MediCare <span className="text-teal-400">Plus</span></span>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative flex items-center">
            <button 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-1 text-slate-400 hover:text-white"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-teal-500 text-slate-950 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>
            {notificationsOpen && (
              <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)}></div>
            )}
            {notificationsOpen && <NotificationPopover isMobile={true} />}
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Sidebar - Desktop */}
      <aside className={`w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed md:sticky top-0 h-screen z-30 transition-transform duration-300 md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="hidden md:flex items-center gap-3 px-6 py-6 border-b border-slate-800/60 flex-shrink-0">
          <div className="p-1.5 bg-teal-500/10 border border-teal-500/20 rounded-lg text-teal-400">
            <Activity className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-lg text-white">
            MediCare <span className="text-teal-400">Plus</span>
          </span>
        </div>

        {/* User Profile Summary */}
        <div className="px-6 py-5 border-b border-slate-800/40 bg-slate-900/40 flex-shrink-0">
          <p className="text-slate-400 text-[10px] tracking-wider uppercase font-semibold mb-1">
            {roleLabels[role] || 'User Portal'}
          </p>
          <p className="text-white font-bold truncate">
            {user?.full_name || user?.email?.split('@')[0].toUpperCase() || 'Loading...'}
          </p>
          {user?.email && <p className="text-slate-500 text-xs truncate mt-0.5">{user.email}</p>}
        </div>

        {/* Navigation Links - scrollable */}
        <nav className="flex-1 overflow-y-auto mt-4 px-4 space-y-1 pb-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeClass(item.path)} ${item.isSpecial ? 'bg-gradient-to-r from-violet-500/5 to-fuchsia-500/5 text-violet-400 border-violet-500/30' : ''}`}
            >
              <item.icon className={`w-4 h-4 ${item.isSpecial ? 'text-violet-400' : ''}`} />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* Logout Button - always visible at bottom */}
        <div className="p-4 border-t border-slate-800 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800/40 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 text-sm font-medium rounded-xl border border-slate-800 hover:border-rose-500/20 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header - Desktop Only */}
        <header className="hidden md:flex items-center justify-between px-8 py-5 border-b border-slate-900 bg-slate-950 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-white capitalize">
              {role === 'PATIENT' ? 'Patient Dashboard' : role === 'DOCTOR' ? 'Doctor Portal' : 'Admin Panel'}
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">Welcome back to your dashboard overview.</p>
          </div>

          {/* Action Items */}
          <div className="flex items-center gap-4 relative">
            {/* Notification Bell */}
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-teal-500 text-slate-950 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Back Overlay for Notification close */}
            {notificationsOpen && (
              <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)}></div>
            )}

            {/* Notification Center Popover */}
            {notificationsOpen && (
              <NotificationPopover isMobile={false} />
            )}
          </div>
        </header>

        {/* Page Content Panel */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
