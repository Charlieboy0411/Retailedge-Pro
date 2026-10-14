import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import {
  Users, Award, CheckCircle, Clock, TrendingUp,
  AlertTriangle, FileText, Download, Star, Shield,
  ClipboardList, Trophy, CheckCircle2, ChevronRight,
  Plus, Eye, MessageSquare, RefreshCw, X, Calendar,
  ArrowUpRight, Filter, Search, BarChart3, HelpCircle,
  Activity, Check
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import PageHeader from './ui/PageHeader';
import KpiCard from './ui/KpiCard';
import StatusBadge from './ui/StatusBadge';
import EmptyState from './ui/EmptyState';
import LoadingSkeleton from './ui/LoadingSkeleton';

export default function SupervisorDashboard() {
  const { token, user } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    teamMembers: 0,
    activeLearners: 0,
    trainingCompletion: 0,
    attendanceRate: 0,
    averageAssessmentScore: 0,
    assessmentPassRate: 0,
    certificationReady: 0,
    atRiskLearners: 0
  });

  const [teamRoster, setTeamRoster] = useState([]);
  const [coachingLogs, setCoachingLogs] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Coaching Modal State
  const [isCoachModalOpen, setIsCoachModalOpen] = useState(false);
  const [coachTarget, setCoachTarget] = useState(null);
  const [coachIssue, setCoachIssue] = useState('Assessment Remediation');
  const [coachReason, setCoachReason] = useState('');
  const [coachAction, setCoachAction] = useState('');
  const [coachStatus, setCoachStatus] = useState('Pending');
  const [coachDate, setCoachDate] = useState('');
  const [coachSubmitting, setCoachSubmitting] = useState(false);
  const [coachSuccess, setCoachSuccess] = useState(false);

  // Participant 360 Modal State
  const [is360ModalOpen, setIs360ModalOpen] = useState(false);
  const [selected360User, setSelected360User] = useState(null);
  const [loading360, setLoading360] = useState(false);
  const [error360, setError360] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      const [metricsRes, teamRes, logsRes] = await Promise.all([
        axios.get('/api/supervisor/metrics', { headers }),
        axios.get('/api/supervisor/team', { headers }),
        axios.get('/api/supervisor/coaching-logs', { headers }).catch(() => ({ data: [] }))
      ]);

      setMetrics(metricsRes.data || {});
      setTeamRoster(teamRes.data || []);
      setCoachingLogs(logsRes.data || []);
    } catch (err) {
      console.error('Failed to load supervisor cockpit data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const handleOpenCoachModal = (employee) => {
    setCoachTarget(employee);
    setCoachIssue(employee.coachingStatus === 'At Risk' ? 'Critical Remediation Needed' : 'Refresher Coaching');
    setCoachReason(`Assessment: ${employee.assessmentScore}% | Attendance: ${employee.attendancePercentage}%`);
    setCoachAction('Schedule 1-on-1 coaching session and review module gap.');
    setCoachStatus('Pending');
    setCoachDate(new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]);
    setCoachSuccess(false);
    setIsCoachModalOpen(true);
  };

  const handleSaveCoachingNote = async (e) => {
    e.preventDefault();
    if (!coachTarget) return;
    try {
      setCoachSubmitting(true);
      await axios.post('/api/supervisor/coaching-log', {
        employeeId: coachTarget.id,
        issue: coachIssue,
        reason: coachReason,
        recommendedAction: coachAction,
        followUpStatus: coachStatus,
        nextActionDate: coachDate
      }, { headers: { Authorization: `Bearer ${token}` } });

      setCoachSuccess(true);
      setTimeout(() => {
        setIsCoachModalOpen(false);
        fetchDashboardData();
      }, 1200);
    } catch (err) {
      console.error('Failed to save coaching note:', err);
      alert(err.response?.data?.error || 'Failed to record coaching note.');
    } finally {
      setCoachSubmitting(false);
    }
  };

  const handleOpen360 = async (employeeId) => {
    try {
      setIs360ModalOpen(true);
      setLoading360(true);
      setError360('');
      setSelected360User(null);
      const res = await axios.get(`/api/projects/participant-360/${employeeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelected360User(res.data);
    } catch (err) {
      console.error('Failed to fetch Participant 360:', err);
      setError360(err.response?.data?.error || 'Access denied or unable to fetch participant 360 profile.');
    } finally {
      setLoading360(false);
    }
  };

  // Filtered Roster
  const filteredRoster = teamRoster.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.employee_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.designation || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedFilter === 'AT_RISK') return emp.coachingStatus === 'At Risk';
    if (selectedFilter === 'NEEDS_REVIEW') return emp.coachingStatus === 'Needs Review';
    if (selectedFilter === 'ON_TRACK') return emp.coachingStatus === 'On Track';
    if (selectedFilter === 'LOW_ATTENDANCE') return emp.attendancePercentage < 80;
    if (selectedFilter === 'CERT_READY') return emp.certificationStatus === 'Eligible';
    return true;
  });

  // Calculate cohort breakdowns
  const atRiskCount = teamRoster.filter(e => e.coachingStatus === 'At Risk').length;
  const needsReviewCount = teamRoster.filter(e => e.coachingStatus === 'Needs Review').length;
  const onTrackCount = teamRoster.filter(e => e.coachingStatus === 'On Track').length;
  const lowAttendanceCount = teamRoster.filter(e => e.attendancePercentage < 80).length;
  const certReadyCount = teamRoster.filter(e => e.certificationStatus === 'Eligible').length;

  const getInitials = (name) => {
    if (!name) return 'TM';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  };

  return (
    <div className="supervisor-workspace-page" style={{
      minHeight: '100%',
      background: 'var(--re-bg, #F6F8FC)',
      padding: '24px 32px 56px',
      color: 'var(--re-text, #0F172A)'
    }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ─── 1. PAGE HEADER (ENTERPRISE OPERATIONAL STANDARD) ─── */}
        <PageHeader
          eyebrow="SUPERVISOR CENTER"
          badge={user?.name || 'Supervisor'}
          title="Team Performance & Coaching"
          subtitle="Monitor team readiness, identify performance gaps and drive focused follow-up."
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                id="supervisor-refresh-btn"
                onClick={fetchDashboardData}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  borderRadius: '9px',
                  border: '1px solid var(--re-border, #E2E8F0)',
                  background: '#FFFFFF',
                  color: 'var(--re-text, #0F172A)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  boxShadow: 'var(--re-shadow-sm, 0 1px 2px 0 rgba(15, 23, 42, 0.05))',
                  transition: 'all 0.15s'
                }}
              >
                <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                <span>Sync</span>
              </button>
            </div>
          }
        />

        {/* ─── 2. SECTION 1: TEAM SNAPSHOT (8 OPERATIONAL KPIS) ─── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '16px'
        }}>
          {/* KPI 1: Team Members */}
          <KpiCard
            icon={Users}
            label="TEAM MEMBERS"
            value={metrics.teamMembers !== undefined && metrics.teamMembers !== null ? metrics.teamMembers : '—'}
            subtext="Assigned to your direct team"
            variant="blue"
            loading={loading}
          />

          {/* KPI 2: Active Learners */}
          <KpiCard
            icon={TrendingUp}
            label="ACTIVE LEARNERS"
            value={metrics.activeLearners !== undefined && metrics.activeLearners !== null ? metrics.activeLearners : '—'}
            subtext="Engaged in curriculum this cycle"
            variant="cyan"
            loading={loading}
          />

          {/* KPI 3: Training Completion */}
          <KpiCard
            icon={CheckCircle}
            label="MODULE COMPLETION"
            value={metrics.trainingCompletion !== undefined && metrics.trainingCompletion !== null ? `${metrics.trainingCompletion}%` : '—'}
            subtext="Modules finished by cohort"
            variant="purple"
            radialProgress={typeof metrics.trainingCompletion === 'number' ? metrics.trainingCompletion : null}
            loading={loading}
          />

          {/* KPI 4: Attendance Rate */}
          <KpiCard
            icon={ClipboardList}
            label="ATTENDANCE RATE"
            value={metrics.attendanceRate !== undefined && metrics.attendanceRate !== null ? `${metrics.attendanceRate}%` : '—'}
            subtext={metrics.attendanceRate >= 80 ? '✓ Meeting ≥80% benchmark' : '⚠️ Below 80% benchmark'}
            variant={metrics.attendanceRate >= 80 ? 'green' : 'amber'}
            radialProgress={typeof metrics.attendanceRate === 'number' ? metrics.attendanceRate : null}
            loading={loading}
          />

          {/* KPI 5: Average Assessment Score */}
          <KpiCard
            icon={Star}
            label="AVERAGE QUIZ SCORE"
            value={metrics.averageAssessmentScore !== undefined && metrics.averageAssessmentScore !== null ? `${metrics.averageAssessmentScore}%` : '—'}
            subtext={metrics.averageAssessmentScore >= 70 ? '✓ Passing benchmark ≥70%' : '⚠️ Under 70% passing standard'}
            variant={metrics.averageAssessmentScore >= 70 ? 'blue' : 'amber'}
            radialProgress={typeof metrics.averageAssessmentScore === 'number' ? metrics.averageAssessmentScore : null}
            loading={loading}
          />

          {/* KPI 6: Pass Rate */}
          <KpiCard
            icon={Trophy}
            label="PASS RATE (≥70%)"
            value={metrics.assessmentPassRate !== undefined && metrics.assessmentPassRate !== null ? `${metrics.assessmentPassRate}%` : '—'}
            subtext="Attempts meeting passing threshold"
            variant="green"
            radialProgress={typeof metrics.assessmentPassRate === 'number' ? metrics.assessmentPassRate : null}
            loading={loading}
          />

          {/* KPI 7: Certification Ready */}
          <KpiCard
            icon={Award}
            label="CERTIFICATION READY"
            value={metrics.certificationReady !== undefined && metrics.certificationReady !== null ? metrics.certificationReady : '—'}
            subtext="Att ≥80% & Score ≥70% (Eligible)"
            variant="green"
            loading={loading}
          />

          {/* KPI 8: At-Risk Learners */}
          <KpiCard
            icon={AlertTriangle}
            label="AT-RISK LEARNERS"
            value={metrics.atRiskLearners !== undefined && metrics.atRiskLearners !== null ? metrics.atRiskLearners : '—'}
            subtext={metrics.atRiskLearners > 0 ? 'Score <60% OR Attendance <80%' : 'Cohort on track'}
            variant={metrics.atRiskLearners > 0 ? 'red' : 'green'}
            loading={loading}
          />
        </div>

        {/* ─── 3. SECTION 2: ATTENTION REQUIRED & ROSTER FILTER BANNER ─── */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--re-border, #E2E8F0)',
          borderRadius: '14px',
          padding: '20px 24px',
          boxShadow: 'var(--re-shadow-sm, 0 1px 3px 0 rgba(15, 23, 42, 0.05))',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Operational Rule Notice Banner */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '12px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '0.82rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1E40AF', fontWeight: 600 }}>
              <Shield size={16} color="#1E40AF" />
              <span><strong>COACHING SIGNALS:</strong> &lt;60% At Risk • 60–74% Needs Review • ≥75% On Track</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontWeight: 600 }}>
              <Award size={16} color="#059669" />
              <span><strong>CERTIFICATION BENCHMARK:</strong> Attendance ≥80% AND Assessment ≥70%</span>
            </div>
          </div>

          {/* Filters & Search Controls */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: `All Team (${teamRoster.length})` },
                { id: 'AT_RISK', label: `At Risk (${atRiskCount})` },
                { id: 'NEEDS_REVIEW', label: `Needs Review (${needsReviewCount})` },
                { id: 'ON_TRACK', label: `On Track (${onTrackCount})` },
                { id: 'LOW_ATTENDANCE', label: `Low Attendance (${lowAttendanceCount})` },
                { id: 'CERT_READY', label: `Cert Ready (${certReadyCount})` }
              ].map(pill => {
                const isActive = selectedFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    id={`filter-pill-${pill.id.toLowerCase()}`}
                    onClick={() => setSelectedFilter(pill.id)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      background: isActive ? '#1E40AF' : '#F8FAFC',
                      color: isActive ? '#FFFFFF' : '#475569',
                      border: isActive ? '1px solid #1E40AF' : '1px solid #E2E8F0',
                      boxShadow: isActive ? '0 2px 4px rgba(30, 64, 175, 0.15)' : 'none'
                    }}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#F8FAFC',
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              minWidth: '240px'
            }}>
              <Search size={15} color="#94A3B8" />
              <input
                id="supervisor-search-input"
                type="text"
                placeholder="Search team member..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#0F172A',
                  outline: 'none',
                  fontSize: '0.85rem',
                  width: '100%'
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94A3B8' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* ─── 4. MY TEAM PERFORMANCE MATRIX TABLE ─── */}
          <div style={{
            overflowX: 'auto',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            background: '#FFFFFF'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '12px 18px', color: '#64748B', fontWeight: 700, fontSize: '0.74rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Employee</th>
                  <th style={{ padding: '12px 18px', color: '#64748B', fontWeight: 700, fontSize: '0.74rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Designation</th>
                  <th style={{ padding: '12px 18px', color: '#64748B', fontWeight: 700, fontSize: '0.74rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Training Progress</th>
                  <th style={{ padding: '12px 18px', color: '#64748B', fontWeight: 700, fontSize: '0.74rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Attendance</th>
                  <th style={{ padding: '12px 18px', color: '#64748B', fontWeight: 700, fontSize: '0.74rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Assessment</th>
                  <th style={{ padding: '12px 18px', color: '#64748B', fontWeight: 700, fontSize: '0.74rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Coaching Status</th>
                  <th style={{ padding: '12px 18px', color: '#64748B', fontWeight: 700, fontSize: '0.74rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Certification</th>
                  <th style={{ padding: '12px 18px', color: '#64748B', fontWeight: 700, fontSize: '0.74rem', letterSpacing: '0.04em', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoster.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px 16px', textAlign: 'center' }}>
                      <EmptyState
                        icon={Users}
                        title="No Team Members Found"
                        description={searchTerm ? `No direct reports match "${searchTerm}".` : "No team members match the selected filter criteria."}
                      />
                    </td>
                  </tr>
                ) : (
                  filteredRoster.map(emp => {
                    const isAtRisk = emp.coachingStatus === 'At Risk';
                    const isNeedsReview = emp.coachingStatus === 'Needs Review';

                    return (
                      <tr
                        key={emp.id}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* Employee Avatar + Info */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              background: '#EFF6FF',
                              color: '#1E40AF',
                              fontWeight: 800,
                              fontSize: '0.78rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              border: '1px solid #DBEAFE'
                            }}>
                              {getInitials(emp.name)}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.88rem' }}>{emp.name}</span>
                              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{emp.employee_id || 'ID: —'} • {emp.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* Designation */}
                        <td style={{ padding: '14px 18px', color: '#475569', fontSize: '0.82rem' }}>
                          {emp.designation || 'Field Representative'}
                        </td>

                        {/* Training Progress Bar */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '84px',
                              height: '6px',
                              background: '#E2E8F0',
                              borderRadius: '3px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${Math.min(emp.trainingProgress || 0, 100)}%`,
                                height: '100%',
                                background: '#1E40AF',
                                borderRadius: '3px'
                              }} />
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0F172A' }}>
                              {emp.trainingProgress !== undefined ? `${emp.trainingProgress}%` : '—'}
                            </span>
                          </div>
                        </td>

                        {/* Attendance % */}
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{
                            fontWeight: 700,
                            color: emp.attendancePercentage >= 80 ? '#10B981' : '#EF4444'
                          }}>
                            {emp.attendancePercentage !== undefined ? `${emp.attendancePercentage}%` : '—'}
                          </span>
                        </td>

                        {/* Assessment Score */}
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{
                            fontWeight: 700,
                            color: emp.assessmentScore >= 70 ? '#10B981' : (emp.assessmentScore >= 60 ? '#F59E0B' : '#EF4444')
                          }}>
                            {emp.assessmentScore !== undefined ? `${emp.assessmentScore}%` : '—'}
                          </span>
                        </td>

                        {/* Coaching Status Badge */}
                        <td style={{ padding: '14px 18px' }}>
                          <StatusBadge
                            variant={isAtRisk ? 'danger' : (isNeedsReview ? 'warning' : 'success')}
                            label={emp.coachingStatus || 'On Track'}
                            size="sm"
                          />
                        </td>

                        {/* Certification Status */}
                        <td style={{ padding: '14px 18px' }}>
                          {emp.certificationStatus === 'Certified' ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: '#059669',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              background: '#ECFDF5',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              border: '1px solid #A7F3D0'
                            }}>
                              <CheckCircle2 size={13} /> Certified
                            </span>
                          ) : emp.certificationStatus === 'Eligible' ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: '#EFF6FF',
                              color: '#1E40AF',
                              border: '1px solid #DBEAFE'
                            }}>
                              <Award size={13} /> Eligible
                            </span>
                          ) : (
                            <span style={{
                              color: '#64748B',
                              fontSize: '0.78rem',
                              background: '#F1F5F9',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              border: '1px solid #E2E8F0'
                            }}>
                              In Progress
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              id={`view-360-${emp.id}`}
                              onClick={() => handleOpen360(emp.id)}
                              title="View Participant 360"
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: '1px solid #CBD5E1',
                                background: '#FFFFFF',
                                color: '#0F172A',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                transition: 'all 0.15s'
                              }}
                            >
                              <Eye size={13} /> 360
                            </button>
                            <button
                              id={`btn-coach-${emp.id}`}
                              onClick={() => handleOpenCoachModal(emp)}
                              style={{
                                padding: '5px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                background: isAtRisk ? '#EF4444' : '#1E40AF',
                                color: '#FFFFFF',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                transition: 'all 0.15s'
                              }}
                            >
                              <MessageSquare size={13} /> Coach
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── 5. SECTION 3: TEAM TRAINING PROGRESS & DISTRIBUTION INSIGHTS ─── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '20px'
        }}>
          {/* Card A: Team Training Progress Breakdown */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid var(--re-border, #E2E8F0)',
            borderRadius: '14px',
            padding: '22px 24px',
            boxShadow: 'var(--re-shadow-sm, 0 1px 3px 0 rgba(15, 23, 42, 0.05))',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                  Team Training Progress
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                  Progress distribution across active curriculum modules
                </p>
              </div>
              <BarChart3 size={18} color="#1E40AF" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>Completed Training (100%)</span>
                  <span style={{ fontWeight: 700, color: '#059669' }}>
                    {teamRoster.filter(e => e.trainingProgress >= 100).length} learners
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${teamRoster.length > 0 ? (teamRoster.filter(e => e.trainingProgress >= 100).length / teamRoster.length) * 100 : 0}%`,
                    height: '100%',
                    background: '#10B981',
                    borderRadius: '4px'
                  }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>In Progress (1% – 99%)</span>
                  <span style={{ fontWeight: 700, color: '#1E40AF' }}>
                    {teamRoster.filter(e => e.trainingProgress > 0 && e.trainingProgress < 100).length} learners
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${teamRoster.length > 0 ? (teamRoster.filter(e => e.trainingProgress > 0 && e.trainingProgress < 100).length / teamRoster.length) * 100 : 0}%`,
                    height: '100%',
                    background: '#3B82F6',
                    borderRadius: '4px'
                  }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>Not Started (0%)</span>
                  <span style={{ fontWeight: 700, color: '#94A3B8' }}>
                    {teamRoster.filter(e => (e.trainingProgress || 0) === 0).length} learners
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${teamRoster.length > 0 ? (teamRoster.filter(e => (e.trainingProgress || 0) === 0).length / teamRoster.length) * 100 : 0}%`,
                    height: '100%',
                    background: '#CBD5E1',
                    borderRadius: '4px'
                  }} />
                </div>
              </div>
            </div>
          </div>

          {/* Card B: Coaching Priority Distribution */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid var(--re-border, #E2E8F0)',
            borderRadius: '14px',
            padding: '22px 24px',
            boxShadow: 'var(--re-shadow-sm, 0 1px 3px 0 rgba(15, 23, 42, 0.05))',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                  Coaching Priority Breakdown
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                  Cohort segmentation based on assessment score & attendance
                </p>
              </div>
              <Shield size={18} color="#1E40AF" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>On Track (≥75% Score)</span>
                  <span style={{ fontWeight: 700, color: '#059669' }}>
                    {onTrackCount} learners
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${teamRoster.length > 0 ? (onTrackCount / teamRoster.length) * 100 : 0}%`,
                    height: '100%',
                    background: '#10B981',
                    borderRadius: '4px'
                  }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>Needs Review (60% – 74%)</span>
                  <span style={{ fontWeight: 700, color: '#D97706' }}>
                    {needsReviewCount} learners
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${teamRoster.length > 0 ? (needsReviewCount / teamRoster.length) * 100 : 0}%`,
                    height: '100%',
                    background: '#F59E0B',
                    borderRadius: '4px'
                  }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>At Risk (&lt;60% Score)</span>
                  <span style={{ fontWeight: 700, color: '#DC2626' }}>
                    {atRiskCount} learners
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${teamRoster.length > 0 ? (atRiskCount / teamRoster.length) * 100 : 0}%`,
                    height: '100%',
                    background: '#EF4444',
                    borderRadius: '4px'
                  }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 6. SECTION 4: COACHING & REMEDIATION FOLLOW-UP LOG ─── */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--re-border, #E2E8F0)',
          borderRadius: '14px',
          padding: '20px 24px',
          boxShadow: 'var(--re-shadow-sm, 0 1px 3px 0 rgba(15, 23, 42, 0.05))',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                Coaching & Remediation Follow-up Log
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                Operational tracking of feedback sessions, knowledge gap follow-ups, and scheduled refreshers
              </p>
            </div>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#1E40AF',
              background: '#EFF6FF',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid #DBEAFE'
            }}>
              {coachingLogs.length} Records Logged
            </span>
          </div>

          {coachingLogs.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
              No coaching logs recorded yet. Click "Coach" on any employee in the roster above to record a remediation note.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {coachingLogs.slice(0, 6).map(log => {
                const emp = teamRoster.find(e => e.id === log.employeeId);
                const isResolved = log.followUpStatus === 'Resolved';
                return (
                  <div
                    key={log.id}
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.88rem' }}>
                        {emp ? emp.name : 'Team Member'}
                      </span>
                      <StatusBadge
                        variant={isResolved ? 'success' : 'warning'}
                        label={log.followUpStatus || 'Pending'}
                        size="sm"
                      />
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#334155' }}>
                      <strong>Issue:</strong> {log.issue}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                      <strong>Action:</strong> {log.recommendedAction}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#1E40AF', marginTop: '4px', fontWeight: 600 }}>
                      📅 Next Action: {log.nextActionDate || 'Pending scheduling'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── 7. MODAL: RECORD COACHING NOTE ─── */}
        {isCoachModalOpen && coachTarget && (
          <div className="re-modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div className="coaching-modal" style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              width: '90%',
              maxWidth: '520px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '14px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                    Record Coaching Note
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                    {coachTarget.name} ({coachTarget.employee_id || 'ID: —'}) • Status: {coachTarget.coachingStatus}
                  </span>
                </div>
                <button
                  className="btn-modal-close"
                  onClick={() => setIsCoachModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={18} />
                </button>
              </div>

              {coachSuccess ? (
                <div style={{ padding: '30px 10px', textAlign: 'center' }}>
                  <CheckCircle2 size={48} color="#10B981" style={{ margin: '0 auto 12px auto' }} />
                  <h4 style={{ color: '#059669', margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 800 }}>Coaching Note Logged</h4>
                  <p style={{ color: '#64748B', fontSize: '0.85rem', margin: 0 }}>Follow-up action registered for this team member.</p>
                </div>
              ) : (
                <form onSubmit={handleSaveCoachingNote} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                      Coaching Issue / Reason *
                    </label>
                    <input
                      type="text"
                      value={coachIssue}
                      onChange={e => setCoachIssue(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        background: '#F8FAFC',
                        border: '1px solid #CBD5E1',
                        color: '#0F172A',
                        outline: 'none',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                      Observations & Gap Notes
                    </label>
                    <textarea
                      rows={3}
                      className="coaching-textarea"
                      value={coachReason}
                      onChange={e => setCoachReason(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        background: '#F8FAFC',
                        border: '1px solid #CBD5E1',
                        color: '#0F172A',
                        outline: 'none',
                        resize: 'vertical',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                      Recommended Action / Refresher *
                    </label>
                    <input
                      type="text"
                      value={coachAction}
                      onChange={e => setCoachAction(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        background: '#F8FAFC',
                        border: '1px solid #CBD5E1',
                        color: '#0F172A',
                        outline: 'none',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                        Status
                      </label>
                      <select
                        value={coachStatus}
                        onChange={e => setCoachStatus(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          background: '#F8FAFC',
                          border: '1px solid #CBD5E1',
                          color: '#0F172A',
                          outline: 'none',
                          fontSize: '0.85rem'
                        }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                        Next Follow-up Date
                      </label>
                      <input
                        type="date"
                        value={coachDate}
                        onChange={e => setCoachDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          background: '#F8FAFC',
                          border: '1px solid #CBD5E1',
                          color: '#0F172A',
                          outline: 'none',
                          fontSize: '0.85rem'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
                    <button
                      type="button"
                      onClick={() => setIsCoachModalOpen(false)}
                      style={{
                        padding: '9px 16px',
                        borderRadius: '8px',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        color: '#475569',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.85rem'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-save-note"
                      disabled={coachSubmitting}
                      style={{
                        padding: '9px 20px',
                        borderRadius: '8px',
                        background: '#1E40AF',
                        border: 'none',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        boxShadow: '0 2px 4px rgba(30, 64, 175, 0.2)'
                      }}
                    >
                      {coachSubmitting ? 'Saving...' : 'Save Coaching Note'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ─── 8. MODAL: PARTICIPANT 360 DRAWER ─── */}
        {is360ModalOpen && (
          <div className="re-modal-overlay participant-360-modal" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              width: '90%',
              maxWidth: '640px',
              padding: '28px',
              maxHeight: '85vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#EFF6FF',
                    color: '#1E40AF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Eye size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                      Participant 360 Profile
                    </h3>
                    <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                      Comprehensive individual capability & compliance view
                    </span>
                  </div>
                </div>
                <button
                  id="close-360-modal-btn"
                  onClick={() => setIs360ModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={18} />
                </button>
              </div>

              {loading360 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                  <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
                  <span>Loading direct subordinate intelligence profile...</span>
                </div>
              ) : error360 ? (
                <div style={{
                  padding: '16px',
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '10px',
                  color: '#DC2626',
                  fontSize: '0.85rem'
                }}>
                  <strong>Access Guard:</strong> {error360}
                </div>
              ) : selected360User ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Profile Header Card */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#F8FAFC',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: '#EFF6FF',
                        color: '#1E40AF',
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #DBEAFE'
                      }}>
                        {getInitials(selected360User.participant?.name)}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                          {selected360User.participant?.name || 'Learner'}
                        </h4>
                        <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                          {selected360User.participant?.email} • {selected360User.participant?.employee_id || 'ID: —'}
                        </span>
                      </div>
                    </div>
                    <span style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      background: '#EFF6FF',
                      color: '#1E40AF',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      border: '1px solid #DBEAFE'
                    }}>
                      Team Direct Report
                    </span>
                  </div>

                  {/* Attendance & Assessment Meters */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div style={{
                      background: '#F8FAFC',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Attendance Record
                      </span>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#059669' }}>
                        {selected360User.jitsiAttendance?.attendanceRate != null ? `${selected360User.jitsiAttendance.attendanceRate}%` : 'N/A'}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Authoritative session presence</span>
                    </div>

                    <div style={{
                      background: '#F8FAFC',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Assessment Average
                      </span>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1E40AF' }}>
                        {selected360User.quizIntelligence?.averageScore != null ? `${selected360User.quizIntelligence.averageScore}%` : 'N/A'}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Evaluated quiz accuracy</span>
                    </div>
                  </div>

                  {/* Certification Readiness Audit */}
                  <div style={{
                    background: '#ECFDF5',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid #A7F3D0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, color: '#065F46', fontSize: '0.88rem' }}>
                        Certification Readiness Audit
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>
                        Rule: Att ≥80% & Score ≥70%
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#047857' }}>
                      {selected360User.certificationIntelligence?.hasCertificate
                        ? '✓ Issued official certificate on file with digital credential validation.'
                        : 'Evaluating learner completion and attendance requirements towards threshold.'}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
