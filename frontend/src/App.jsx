import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PMDashboard from './pages/PMDashboard';
import QuizBuilder from './pages/QuizBuilder';
import LandingPage from './pages/LandingPage';
import Join from './pages/Join';
import GuestJoin from './pages/GuestJoin';
import LiveQuiz from './pages/LiveQuiz';
import OfflineQuiz from './pages/OfflineQuiz';
import Reports from './pages/Reports';
import UserDirectory from './pages/UserDirectory';
import OrgChart from './pages/OrgChart';
import Projects from './pages/Projects';
import HostControlRoom from './pages/HostControlRoom';
import Trainings from './pages/Trainings';
import Certificates from './pages/Certificates';
import Attendance from './pages/Attendance';
import Gamification from './pages/Gamification';
import PromotorPortal from './pages/PromotorPortal';
import Settings from './pages/Settings';
import SchedulePage from './pages/SchedulePage';
import ClientManagement from './pages/ClientManagement';
import RoleManagement from './pages/RoleManagement';
import OfflineSync from './pages/OfflineSync';
import AuditLogs from './pages/AuditLogs';
import NotificationsCenter from './pages/NotificationsCenter';
import MonitorDashboard from './pages/MonitorDashboard';
import PublicCertificateVerification from './pages/PublicCertificateVerification';
import AccessDenied from './components/AccessDenied';
import { AuthProvider, AuthContext } from './context/AuthContext';

function RoleGuard({ allowedRoles, children, fallback = "/dashboard", renderDenied = false, message }) {
  const { user, loading } = React.useContext(AuthContext);
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (renderDenied) {
      return (
        <AccessDenied 
          title="Access Denied"
          message={message || `Your account role (${user.role}) is not authorized to access this module or administrative interface.`} 
          returnUrl={fallback}
        />
      );
    }
    return <Navigate to={fallback} replace />;
  }
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />

          {/* Standalone Learner & Verification Routes */}
          <Route path="/join" element={<Join />} />
          <Route path="/guest-join" element={<GuestJoin />} />
          <Route path="/live/:roomCode" element={<LiveQuiz />} />
          <Route path="/offline-quiz/:quizId" element={<OfflineQuiz />} />
          <Route path="/verify" element={<PublicCertificateVerification />} />
          <Route path="/verify/:certificateId" element={<PublicCertificateVerification />} />

          {/* Protected Routes inside Layout */}
          <Route path="/" element={<Layout />}>
            <Route path="dashboard"    element={<Dashboard />} />
            <Route path="pm-dashboard" element={
              <RoleGuard 
                allowedRoles={['Admin', 'Super Admin', 'Program Manager', 'MD', 'COO', 'VP Operations', 'Marketing Manager']} 
                renderDenied={true}
                message="Your account is not authorized to access the Program Manager Dashboard"
              >
                <PMDashboard />
              </RoleGuard>
            } />
            <Route path="builder"      element={
              <RoleGuard allowedRoles={['Trainer', 'Admin', 'Super Admin', 'T&D Manager']}>
                <QuizBuilder />
              </RoleGuard>
            } />
            <Route path="builder/:quizId" element={
              <RoleGuard allowedRoles={['Trainer', 'Admin', 'Super Admin', 'T&D Manager']}>
                <QuizBuilder />
              </RoleGuard>
            } />
            <Route path="users"        element={
              <RoleGuard allowedRoles={['Admin', 'Super Admin', 'Program Manager', 'MD', 'COO', 'VP Operations', 'Marketing Manager']}>
                <UserDirectory />
              </RoleGuard>
            } />
            <Route path="org-chart"    element={
              <RoleGuard allowedRoles={['Admin', 'Super Admin', 'Program Manager', 'MD', 'COO', 'VP Operations', 'Marketing Manager']}>
                <OrgChart />
              </RoleGuard>
            } />
            <Route path="projects"     element={
              <RoleGuard allowedRoles={['Admin', 'Super Admin', 'Program Manager', 'MD', 'COO', 'VP Operations']}>
                <Projects />
              </RoleGuard>
            } />
            <Route path="reports"      element={
              <RoleGuard allowedRoles={['Admin', 'Super Admin', 'Program Manager', 'Trainer', 'T&D Manager', 'Client', 'MD', 'COO', 'VP Operations', 'Supervisor', 'Marketing Manager']}>
                <Reports />
              </RoleGuard>
            } />
            <Route path="trainings"    element={<Trainings />} />
            <Route path="certificates" element={<Certificates />} />
            <Route path="certificates/templates" element={
              <RoleGuard allowedRoles={['Admin', 'Super Admin', 'Program Manager']} renderDenied={true}>
                <Certificates initialTab="templates" />
              </RoleGuard>
            } />
            <Route path="certificates/analytics" element={
              <RoleGuard allowedRoles={['Admin', 'Super Admin', 'Program Manager', 'T&D Manager']} renderDenied={true}>
                <Certificates initialTab="analytics" />
              </RoleGuard>
            } />
            <Route path="certificates/batch-generator" element={
              <RoleGuard allowedRoles={['Admin', 'Super Admin', 'Program Manager', 'T&D Manager']} renderDenied={true}>
                <Certificates initialTab="bulk" />
              </RoleGuard>
            } />
            <Route path="certificates/issuance" element={
              <RoleGuard allowedRoles={['Admin', 'Super Admin', 'Program Manager', 'T&D Manager']} renderDenied={true}>
                <Certificates initialTab="issuance" />
              </RoleGuard>
            } />
            <Route path="signatures-and-seals" element={
              <RoleGuard allowedRoles={['Admin', 'Super Admin', 'Program Manager']} renderDenied={true}>
                <Certificates initialTab="templates" />
              </RoleGuard>
            } />
            <Route path="attendance"   element={<Attendance />} />
            <Route path="gamification" element={<Gamification />} />
            <Route path="portal"       element={<PromotorPortal />} />
            <Route path="schedule"     element={
              <RoleGuard allowedRoles={['Admin', 'Super Admin', 'Program Manager', 'Trainer', 'T&D Manager']}>
                <SchedulePage />
              </RoleGuard>
            } />
            <Route path="clients"      element={
              <RoleGuard allowedRoles={['Admin', 'Super Admin', 'Program Manager']} renderDenied={true}>
                <ClientManagement />
              </RoleGuard>
            } />
            <Route path="roles"        element={
              <RoleGuard allowedRoles={['Admin', 'Super Admin']} renderDenied={true}>
                <RoleManagement />
              </RoleGuard>
            } />
            <Route path="offline-sync" element={
              <RoleGuard allowedRoles={['Admin', 'Super Admin', 'Trainer']} renderDenied={true}>
                <OfflineSync />
              </RoleGuard>
            } />
            <Route path="audit-logs"   element={
              <RoleGuard allowedRoles={['Admin', 'Super Admin']} renderDenied={true}>
                <AuditLogs />
              </RoleGuard>
            } />
            <Route path="notifications" element={<NotificationsCenter />} />
            <Route path="settings"     element={
              <RoleGuard allowedRoles={['Admin', 'Super Admin', 'Program Manager', 'Trainer']} renderDenied={true}>
                <Settings />
              </RoleGuard>
            } />
            <Route path="monitor"      element={
              <RoleGuard allowedRoles={['Admin', 'Super Admin', 'Program Manager']} renderDenied={true}>
                <MonitorDashboard />
              </RoleGuard>
            } />
          </Route>

          {/* Full screen host view */}
          <Route path="/host/:quizId" element={
            <RoleGuard allowedRoles={['Admin', 'Super Admin', 'Trainer', 'Program Manager']}>
              <HostControlRoom />
            </RoleGuard>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
