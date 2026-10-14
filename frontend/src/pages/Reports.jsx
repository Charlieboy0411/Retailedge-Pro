import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import ReportCenterView from '../components/ReportCenterView';
import TrainerReportCenter from '../components/TrainerReportCenter';
import SupervisorReportCenter from '../components/SupervisorReportCenter';
import EmployeeReportCenter from '../components/EmployeeReportCenter';
import { RefreshCw } from 'lucide-react';

/**
 * RetailEdge PRO — Reports Router
 * 
 * Strict Role Routing per Stage 3A Specification:
 * - Admin / Super Admin    -> ReportCenterView (Full enterprise intelligence + Monthly Closing + L3)
 * - Program Manager        -> ReportCenterView (Assigned projects scope, operational reports)
 * - T&D Manager            -> ReportCenterView (Authorized capability scope, L1 & L2)
 * - Client                 -> ReportCenterView (Contracted client project scope)
 * - Trainer                -> TrainerReportCenter (Session, quiz, roster, certification readiness)
 * - Supervisor             -> SupervisorReportCenter (Direct reports team attendance & performance)
 * - Employee               -> EmployeeReportCenter (Personal "My Training & Assessment Records")
 */
export default function Reports() {
  const { token, user, loading } = useContext(AuthContext);

  if (loading || !token) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '12px',
        color: '#64748B'
      }}>
        <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Loading reporting center...</span>
      </div>
    );
  }

  const role = user?.role || 'Admin';

  // 1. Trainer Role Routing
  if (role === 'Trainer') {
    return <TrainerReportCenter token={token} user={user} />;
  }

  // 2. Supervisor Role Routing
  if (role === 'Supervisor') {
    return <SupervisorReportCenter token={token} user={user} />;
  }

  // 3. Employee Role Routing
  if (role === 'Employee') {
    return <EmployeeReportCenter token={token} user={user} />;
  }

  // 4. Admin, Super Admin, Program Manager, T&D Manager, Client
  return <ReportCenterView token={token} user={user} />;
}
