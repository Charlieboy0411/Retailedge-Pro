import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PMDashboard from './pages/PMDashboard';
import QuizBuilder from './pages/QuizBuilder';
import LandingPage from './pages/LandingPage';
import Join from './pages/Join';
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
import { AuthProvider, AuthContext } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />

          {/* Standalone Learner Routes */}
          <Route path="/join" element={<Join />} />
          <Route path="/live/:roomCode" element={<LiveQuiz />} />
          <Route path="/offline-quiz/:quizId" element={<OfflineQuiz />} />

          {/* Protected Routes inside Layout */}
          <Route path="/" element={<Layout />}>
            <Route path="dashboard"    element={<Dashboard />} />
            <Route path="pm-dashboard" element={<PMDashboard />} />
            <Route path="builder"      element={<QuizBuilder />} />
            <Route path="builder/:quizId" element={<QuizBuilder />} />
            <Route path="users"        element={<UserDirectory />} />
            <Route path="org-chart"    element={<OrgChart />} />
            <Route path="projects"     element={<Projects />} />
            <Route path="reports"      element={<Reports />} />
            <Route path="trainings"    element={<Trainings />} />
            <Route path="certificates" element={<Certificates />} />
            <Route path="attendance"   element={<Attendance />} />
            <Route path="gamification" element={<Gamification />} />
            <Route path="portal"       element={<PromotorPortal />} />
            <Route path="certificates" element={<Certificates />} />
            <Route path="schedule"     element={<SchedulePage />} />
            <Route path="clients"      element={<ClientManagement />} />
            <Route path="roles"        element={<RoleManagement />} />
            <Route path="offline-sync" element={<OfflineSync />} />
            <Route path="audit-logs"   element={<AuditLogs />} />
            <Route path="notifications" element={<NotificationsCenter />} />
            <Route path="settings"     element={<Settings />} />
          </Route>

          {/* Full screen host view */}
          <Route path="/host/:quizId" element={<HostControlRoom />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
