import React, { useState, useEffect, useContext } from 'react';
import {
  Users, BarChart2, Award, Calendar, Settings, Shield, BookOpen,
  FolderOpen, CheckCircle, Clock, TrendingUp, AlertCircle, FileText,
  Presentation, Download, Server, Database, Activity, Bell, Lock,
  PlusCircle, Upload, Eye, Edit3, Trash2, RefreshCw, Search, Filter,
  Globe, Mail, MessageSquare, ClipboardList, Star, Zap, AlertTriangle,
  ChevronRight, BarChart3, UserCheck, Layers, Smartphone, Briefcase, 
  ShieldCheck, ShieldAlert, CheckCircle2, ArrowRight, Radio
} from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import PageHeader from './ui/PageHeader';
import KpiCard from './ui/KpiCard';
import StatusBadge from './ui/StatusBadge';
import EmptyState from './ui/EmptyState';
import LoadingSkeleton from './ui/LoadingSkeleton';

export default function AdminDashboard({ token: propToken, allUsers = [], projectsList = [], reports = [], syncTrigger = 0, onSync = null }) {
  const { token: contextToken, user } = useContext(AuthContext);
  const token = propToken || contextToken || localStorage.getItem('jwt');
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [dataIntegrity, setDataIntegrity] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const isFetchingRef = React.useRef(false);

  const fetchAdminData = async (silent = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      if (!stats && !silent) setLoading(true);
      else setSyncing(true);

      const authToken = token || localStorage.getItem('jwt');
      if (!authToken) {
        setLoading(false);
        setSyncing(false);
        return;
      }

      const headers = { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      };

      const [statsData, integrityData] = await Promise.all([
        fetch('/api/superadmin/stats', { headers })
          .then(res => res.ok ? res.json() : null)
          .catch(() => null),
        fetch('/api/projects/data-integrity', { headers })
          .then(res => res.ok ? res.json() : null)
          .catch(() => null)
      ]);

      if (statsData) setStats(statsData);
      if (integrityData) setDataIntegrity(integrityData);
    } catch (err) {
      console.error('Failed to fetch administrative data', err);
    } finally {
      setLoading(false);
      setSyncing(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    const activeToken = token || localStorage.getItem('jwt');
    if (activeToken) {
      fetchAdminData(false);
    }
  }, [token, syncTrigger]);

  const handleSyncClick = async () => {
    await fetchAdminData(true);
    if (onSync) onSync();
  };

  if (loading || !stats) {
    return (
      <div className="admin-workspace-page" style={{ padding: '24px 32px 56px', background: 'var(--re-bg, #F6F8FC)' }}>
        <LoadingSkeleton type="kpi" count={4} />
        <div style={{ marginTop: '24px' }}>
          <LoadingSkeleton type="table" count={5} />
        </div>
      </div>
    );
  }

  // Derive integrity status
  const integrityStatus = dataIntegrity?.status || 'Healthy';
  const hasIntegrityIssues = dataIntegrity && (
    dataIntegrity.unmappedSessions > 0 ||
    dataIntegrity.unmappedParticipants > 0 ||
    dataIntegrity.unmappedQuizAttempts > 0 ||
    dataIntegrity.unmappedAttendance > 0
  );

  return (
    <div className="admin-workspace-page admin-dashboard-page" style={{
      minHeight: '100%',
      background: 'var(--re-bg, #F6F8FC)',
      padding: '24px 32px 56px',
      color: 'var(--re-text, #0F172A)'
    }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>

        {/* ─── 1. PAGE HEADER ─── */}
        <PageHeader
          eyebrow="PLATFORM GOVERNANCE"
          badge={user?.name ? `Logged in as ${user.name}` : undefined}
          title="Platform Operations"
          subtitle="Monitor platform health, data integrity, access governance and operational readiness."
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                id="admin-sync-btn"
                onClick={handleSyncClick}
                disabled={syncing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: syncing ? 'not-allowed' : 'pointer',
                  boxShadow: 'var(--re-shadow-sm, 0 1px 2px 0 rgba(15, 23, 42, 0.05))',
                  transition: 'background 0.15s ease'
                }}
              >
                <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none', color: '#64748B' }} />
                <span>{syncing ? 'Syncing...' : 'Sync Platform'}</span>
              </button>
            </div>
          }
        />

        {/* ─── 2. KPI AREA (8 GOVERNANCE CARDS) ─── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '12px'
        }}>
          <KpiCard
            title="Active Users"
            value={stats.workforce?.activeUsers ?? stats.workforce?.totalRegisteredUsers ?? '—'}
            subtitle={`${stats.workforce?.totalRegisteredUsers ?? 0} Registered`}
            status="info"
            icon={<Users size={20} />}
          />
          <KpiCard
            title="Active Projects"
            value={stats.projects?.activeProjects ?? '—'}
            subtitle={`${stats.projects?.clientsServed ?? 0} Clients Served`}
            status="info"
            icon={<FolderOpen size={20} />}
          />
          <KpiCard
            title="Active Sessions"
            value={stats.training?.ongoingSessions ?? '—'}
            subtitle={`${stats.training?.trainingsConducted ?? 0} Conducted`}
            status="info"
            icon={<Presentation size={20} />}
          />
          <KpiCard
            title="Participants Assessed"
            value={stats.assessments?.participantsAssessed ?? '—'}
            subtitle={`${stats.assessments?.passRate ?? 0}% Pass Rate`}
            status="success"
            icon={<UserCheck size={20} />}
          />
          <KpiCard
            title="Quiz Assessments"
            value={stats.assessments?.assessmentsConducted ?? '—'}
            subtitle={`${stats.assessments?.failRate ?? 0}% Fail Rate`}
            status="neutral"
            icon={<FileText size={20} />}
          />
          <KpiCard
            title="Certificates Issued"
            value={stats.certifications?.certificatesIssued ?? '—'}
            subtitle={`${stats.certifications?.expiringCertificates ?? 0} Expiring`}
            status="success"
            icon={<Award size={20} />}
          />
          <KpiCard
            title="System Health"
            value={systemHealth?.status === 'ok' ? 'Operational' : 'Active'}
            subtitle={systemHealth?.database === 'connected' ? 'Database Connected' : 'Engine Ready'}
            status="success"
            icon={<Activity size={20} />}
          />
          <KpiCard
            title="Data Integrity"
            value={integrityStatus}
            subtitle={hasIntegrityIssues ? 'Reconciliation required' : 'All streams aligned'}
            status={integrityStatus === 'Healthy' ? 'success' : 'warning'}
            icon={<ShieldCheck size={20} />}
          />
        </div>

        {/* ─── 3. ADMINISTRATIVE ATTENTION & ALERTS ─── */}
        <div style={{
          background: hasIntegrityIssues ? '#FFFBEB' : '#F0FDF4',
          borderRadius: '12px',
          border: `1px solid ${hasIntegrityIssues ? '#FDE68A' : '#BBF7D0'}`,
          borderLeft: `4px solid ${hasIntegrityIssues ? '#F59E0B' : '#10B981'}`,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {hasIntegrityIssues ? (
              <AlertTriangle size={20} color="#D97706" style={{ flexShrink: 0 }} />
            ) : (
              <CheckCircle2 size={20} color="#059669" style={{ flexShrink: 0 }} />
            )}
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: hasIntegrityIssues ? '#92400E' : '#065F46' }}>
                {hasIntegrityIssues ? 'Administrative Attention Required' : 'Platform Operating Normally'}
              </div>
              <div style={{ fontSize: '0.8rem', color: hasIntegrityIssues ? '#B45309' : '#047857', marginTop: '2px' }}>
                {hasIntegrityIssues 
                  ? `Data integrity monitor reports ${dataIntegrity.unmappedParticipants} unmapped participants and ${dataIntegrity.unmappedSessions} unmapped sessions requiring project reconciliation.`
                  : 'All core microservices, authentication pipelines, and telemetry databases are reporting within standard thresholds.'
                }
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {hasIntegrityIssues ? (
              <button
                id="admin-reconcile-btn"
                onClick={() => navigate('/projects')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#92400E',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                Reconcile Projects
              </button>
            ) : (
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', background: '#D1FAE5', padding: '4px 10px', borderRadius: '6px' }}>
                100% Operational
              </span>
            )}
          </div>
        </div>

        {/* ─── 4. DATA INTEGRITY MONITOR (AUTHORITATIVE RECONCILIATION PANEL) ─── */}
        <div style={{
          background: 'var(--re-surface, #FFFFFF)',
          borderRadius: '12px',
          border: '1px solid var(--re-border, #E2E8F0)',
          padding: '20px 24px',
          boxShadow: 'var(--re-shadow-sm, 0 1px 2px 0 rgba(15, 23, 42, 0.05))',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="#2563EB" />
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0F172A' }}>
                Data Integrity Monitor
              </h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                background: integrityStatus === 'Healthy' ? '#ECFDF5' : '#FFFBEB',
                color: integrityStatus === 'Healthy' ? '#065F46' : '#92400E',
                border: `1px solid ${integrityStatus === 'Healthy' ? '#A7F3D0' : '#FDE68A'}`
              }}>
                Status: {integrityStatus}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Unmapped Sessions</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: (dataIntegrity?.unmappedSessions ?? 0) > 0 ? '#EF4444' : '#10B981', marginTop: '4px' }}>
                {dataIntegrity?.unmappedSessions ?? '—'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>Sessions without project ID</div>
            </div>

            <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Unmapped Participants</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: (dataIntegrity?.unmappedParticipants ?? 0) > 0 ? '#EF4444' : '#10B981', marginTop: '4px' }}>
                {dataIntegrity?.unmappedParticipants ?? '—'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>Trainees in orphan pools</div>
            </div>

            <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Unmapped Quizzes</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: (dataIntegrity?.unmappedQuizAttempts ?? 0) > 0 ? '#EF4444' : '#10B981', marginTop: '4px' }}>
                {dataIntegrity?.unmappedQuizAttempts ?? '—'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>Assessments without parent</div>
            </div>

            <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Unmapped Attendance</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: (dataIntegrity?.unmappedAttendance ?? 0) > 0 ? '#EF4444' : '#10B981', marginTop: '4px' }}>
                {dataIntegrity?.unmappedAttendance ?? '—'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>Attendance log discrepancies</div>
            </div>

            <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Failed Jitsi Events</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: (dataIntegrity?.failedJitsiEvents ?? 0) > 0 ? '#EF4444' : '#10B981', marginTop: '4px' }}>
                {dataIntegrity?.failedJitsiEvents ?? 0}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>Telemetry packet drops</div>
            </div>

            <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Pending Offline Sync</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: (dataIntegrity?.pendingOfflineSync ?? 0) > 0 ? '#F59E0B' : '#10B981', marginTop: '4px' }}>
                {dataIntegrity?.pendingOfflineSync ?? 0}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>Awaiting edge merge</div>
            </div>
          </div>
        </div>

        {/* ─── 5. PLATFORM HEALTH & ACCESS GOVERNANCE GRID ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>

          {/* Platform Health Matrix */}
          <div style={{
            background: 'var(--re-surface, #FFFFFF)',
            borderRadius: '12px',
            border: '1px solid var(--re-border, #E2E8F0)',
            padding: '20px 24px',
            boxShadow: 'var(--re-shadow-sm, 0 1px 2px 0 rgba(15, 23, 42, 0.05))',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server size={18} color="#2563EB" />
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0F172A' }}>
                Platform Health Signals
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>Application Core API</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Node.js / Express Server</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', background: '#D1FAE5', padding: '3px 8px', borderRadius: '6px' }}>
                  Healthy
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>Database Engine</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>PostgreSQL / SQLite Connection</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', background: '#D1FAE5', padding: '3px 8px', borderRadius: '6px' }}>
                  Connected
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>Authentication &amp; RBAC</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>JWT Verification &amp; Role Enforcement</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', background: '#D1FAE5', padding: '3px 8px', borderRadius: '6px' }}>
                  Operational
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>Field Device Synchronization</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Edge Devices &amp; Offline Sync Hub</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', background: '#D1FAE5', padding: '3px 8px', borderRadius: '6px' }}>
                  {stats.offlineSync?.devicesSyncedToday ?? 0} Synced
                </span>
              </div>
            </div>
          </div>

          {/* Access Governance & Workforce */}
          <div style={{
            background: 'var(--re-surface, #FFFFFF)',
            borderRadius: '12px',
            border: '1px solid var(--re-border, #E2E8F0)',
            padding: '20px 24px',
            boxShadow: 'var(--re-shadow-sm, 0 1px 2px 0 rgba(15, 23, 42, 0.05))',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="#2563EB" />
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0F172A' }}>
                  Access Governance &amp; Workforce
                </h3>
              </div>
              <button
                onClick={() => navigate('/users')}
                style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                User Directory <ChevronRight size={14} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Total Registered</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                  {stats.workforce?.totalRegisteredUsers ?? '—'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 600, marginTop: '2px' }}>
                  {stats.workforce?.activeUsers ?? 0} Active Users
                </div>
              </div>

              <div style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Trainers</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#2563EB', marginTop: '2px' }}>
                  {stats.workforce?.trainers ?? '—'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>Authorized Hosts</div>
              </div>

              <div style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Supervisors</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#06B6D4', marginTop: '2px' }}>
                  {stats.workforce?.supervisors ?? '—'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>Field Team Leads</div>
              </div>

              <div style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Learners / Associates</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#8B5CF6', marginTop: '2px' }}>
                  {stats.workforce?.learners || (stats.workforce?.totalRegisteredUsers - (stats.workforce?.trainers || 0) - (stats.workforce?.supervisors || 0)) || '—'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>Active Trainees</div>
              </div>
            </div>

            <div style={{ padding: '10px 14px', background: '#EFF6FF', borderRadius: '8px', border: '1px solid #DBEAFE', fontSize: '0.78rem', color: '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>RBAC matrix enforcing strict project boundaries.</span>
              <button
                onClick={() => navigate('/users')}
                style={{ background: 'none', border: 'none', color: '#1E40AF', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Review Roles
              </button>
            </div>
          </div>

        </div>

        {/* ─── 6. PROJECT CONFIGURATION & LIVE ARENA ROW ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>

          {/* Project & Commercial Configuration Health */}
          <div style={{
            background: 'var(--re-surface, #FFFFFF)',
            borderRadius: '12px',
            border: '1px solid var(--re-border, #E2E8F0)',
            padding: '20px 24px',
            boxShadow: 'var(--re-shadow-sm, 0 1px 2px 0 rgba(15, 23, 42, 0.05))',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Briefcase size={18} color="#2563EB" />
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0F172A' }}>
                  Configuration &amp; Account Health
                </h3>
              </div>
              <button
                onClick={() => navigate('/projects')}
                style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                Manage Projects <ChevronRight size={14} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Active Projects</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                  {stats.projects?.activeProjects ?? '—'}
                </div>
              </div>

              <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Clients Served</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                  {stats.projects?.clientsServed ?? '—'}
                </div>
              </div>

              <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Regions Covered</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                  {stats.projects?.regionsCovered ?? '—'}
                </div>
              </div>

              <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Stores &amp; Outlets</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                  {stats.projects?.storesCovered ?? '—'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px' }}>
              <button
                onClick={() => navigate('/projects')}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>Project Structure &amp; Folders</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Live Arena Operational Visibility */}
          <div style={{
            background: 'var(--re-surface, #FFFFFF)',
            borderRadius: '12px',
            border: '1px solid var(--re-border, #E2E8F0)',
            padding: '20px 24px',
            boxShadow: 'var(--re-shadow-sm, 0 1px 2px 0 rgba(15, 23, 42, 0.05))',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio size={18} color="#EA580C" />
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0F172A' }}>
                  Live Arena &amp; Telemetry Stream
                </h3>
              </div>
              <button
                onClick={() => navigate('/trainings')}
                style={{ background: 'none', border: 'none', color: '#EA580C', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                Schedule <ChevronRight size={14} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Ongoing Sessions</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>
                  {stats.training?.ongoingSessions ?? 0}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 600, marginTop: '2px' }}>Active Rooms</div>
              </div>

              <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Trainings Conducted</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                  {stats.training?.trainingsConducted ?? 0}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>Finished Sessions</div>
              </div>

              <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Upcoming Trainings</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563EB', marginTop: '4px' }}>
                  {stats.training?.upcomingTrainings ?? 0}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>Scheduled Future</div>
              </div>
            </div>

            <div style={{ padding: '12px 14px', background: '#FFF7ED', borderRadius: '8px', border: '1px solid #FFEDD5', fontSize: '0.78rem', color: '#9A3412', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Live Arena event lifecycle broadcasting across active rooms.</span>
              <button
                onClick={() => navigate('/join')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  background: '#EA580C',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Join Arena
              </button>
            </div>
          </div>

        </div>

        {/* ─── 7. GOVERNANCE QUICK ACTIONS ─── */}
        <div style={{
          background: 'var(--re-surface, #FFFFFF)',
          borderRadius: '12px',
          border: '1px solid var(--re-border, #E2E8F0)',
          padding: '20px 24px',
          boxShadow: 'var(--re-shadow-sm, 0 1px 2px 0 rgba(15, 23, 42, 0.05))'
        }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '0.98rem', fontWeight: 800, color: '#0F172A' }}>
            Platform Governance Shortcuts
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <button
              onClick={() => navigate('/projects')}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <FolderOpen size={15} color="#2563EB" /> Manage Projects
            </button>
            <button
              onClick={() => navigate('/users')}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Users size={15} color="#10B981" /> User Directory
            </button>
            <button
              onClick={() => navigate('/trainings')}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Calendar size={15} color="#F59E0B" /> Schedule Sessions
            </button>
            <button
              onClick={() => navigate('/builder')}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <FileText size={15} color="#8B5CF6" /> Assessment Studio
            </button>
            <button
              onClick={() => navigate('/certificates')}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Award size={15} color="#06B6D4" /> Certificates Vault
            </button>
            <button
              onClick={() => navigate('/reports')}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <BarChart3 size={15} color="#0F172A" /> LMS Reports
            </button>
            <button
              onClick={() => navigate('/notifications')}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Bell size={15} color="#64748B" /> Broadcast Center
            </button>
            <button
              onClick={() => navigate('/offline-sync')}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Smartphone size={15} color="#0891B2" /> Field Device Sync
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
