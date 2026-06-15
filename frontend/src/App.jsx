import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Common Auth pages
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';

// Shared Layout
import DashboardLayout from './components/DashboardLayout';

// Patient Portal pages
import PatientDashboard from './pages/patient/Dashboard';
import AIChat from './pages/patient/AIChat';
import BookAppointment from './pages/patient/BookAppointment';
import Billing from './pages/patient/Billing';
import MedicalRecords from './pages/patient/MedicalRecords';
import Profile from './pages/patient/Profile';
import HealthTracker from './pages/patient/HealthTracker';
import MedicineReminder from './pages/patient/MedicineReminder';
import Feedback from './pages/patient/Feedback';

// Doctor Portal pages
import DoctorDashboard from './pages/doctor/Dashboard';
import DoctorSchedule from './pages/doctor/Schedule';
import PatientRecords from './pages/doctor/PatientRecords';
import BillingManager from './pages/doctor/BillingManager';

// Standalone Telemedicine page
import VideoConsultation from './pages/VideoConsultation';

// Admin Portal pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminDepartments from './pages/admin/Departments';
import DoctorOnboarding from './pages/admin/DoctorOnboarding';
import AuditLogs from './pages/admin/AuditLogs';
import BedManagement from './pages/admin/BedManagement';
import AdmissionDischarge from './pages/admin/AdmissionDischarge';
import EmergencyService from './pages/EmergencyService';

// Route Guard Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { token, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === 'PATIENT') return <Navigate to="/patient" replace />;
    if (role === 'DOCTOR') return <Navigate to="/doctor" replace />;
    if (role === 'ADMIN') return <Navigate to="/admin" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Root Redirect helper
const HomeRedirect = () => {
  const { token, role } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (role === 'PATIENT') return <Navigate to="/patient" replace />;
  if (role === 'DOCTOR') return <Navigate to="/doctor" replace />;
  if (role === 'ADMIN') return <Navigate to="/admin" replace />;
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Secure Patient Portal */}
          <Route path="/patient" element={
            <ProtectedRoute allowedRoles={['PATIENT']}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<PatientDashboard />} />
            <Route path="ai-chat" element={<AIChat />} />
            <Route path="book" element={<BookAppointment />} />
            <Route path="billing" element={<Billing />} />
            <Route path="records" element={<MedicalRecords />} />
            <Route path="profile" element={<Profile />} />
            <Route path="health-tracker" element={<HealthTracker />} />
            <Route path="medicine-reminder" element={<MedicineReminder />} />
            <Route path="feedback" element={<Feedback />} />
          </Route>

          <Route path="/patient/video/:apptId" element={
            <ProtectedRoute allowedRoles={['PATIENT']}>
              <VideoConsultation />
            </ProtectedRoute>
          } />

          {/* Secure Doctor Portal */}
          <Route path="/doctor" element={
            <ProtectedRoute allowedRoles={['DOCTOR']}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DoctorDashboard />} />
            <Route path="schedule" element={<DoctorSchedule />} />
            <Route path="records" element={<PatientRecords />} />
            <Route path="billing" element={<BillingManager />} />
            <Route path="feedback" element={<Feedback />} />
          </Route>

          <Route path="/doctor/video/:apptId" element={
            <ProtectedRoute allowedRoles={['DOCTOR']}>
              <VideoConsultation />
            </ProtectedRoute>
          } />

          {/* Secure Admin Portal */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="departments" element={<AdminDepartments />} />
            <Route path="doctors" element={<DoctorOnboarding />} />
            <Route path="audit" element={<AuditLogs />} />
            <Route path="beds" element={<BedManagement />} />
            <Route path="admissions" element={<AdmissionDischarge />} />
            <Route path="feedback" element={<Feedback />} />
          </Route>

          {/* Emergency Service - Available to all authenticated users */}
          <Route path="/emergency" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'DOCTOR', 'PATIENT']}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<EmergencyService />} />
          </Route>

          {/* Catch-all & Home redirection */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}


export default App;
