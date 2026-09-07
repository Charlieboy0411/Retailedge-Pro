import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import {
  Users, Award, CheckCircle, Clock, TrendingUp,
  AlertTriangle, FileText, Download, Star, Shield,
  ClipboardList, Trophy, CheckCircle2, ChevronRight,
  Plus, Eye, MessageSquare, RefreshCw, X, Calendar,
  ArrowUpRight, Filter, Search
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

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

  return (
    <div className="supervisor-cockpit" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      
      {/* ─── COCKPIT HEADER ─── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '16px', background: 'var(--bg-glass)',
        padding: '24px', borderRadius: '16px', border: '1px solid var(--border-glass)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.25)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              background: 'rgba(56, 189, 248, 0.12)', color: '#38BDF8',
              border: '1px solid rgba(56, 189, 248, 0.25)', padding: '4px 10px',
              borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em'
            }}>
              🎯 FIELD SUPERVISOR COCKPIT
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontSize: '0.85rem', color: '#10B981', fontWeight: 600 }}>Active Roster Live</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Welcome back, {user?.name || 'Supervisor'}!
          </h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Operational Command — Monitor Team Readiness, Drive Performance & Remediate Learning Gaps
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={fetchDashboardData}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-glass)',
              background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-primary)',
              cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600
            }}
          >
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ─── SECTION 1: TEAM SNAPSHOT (8 OPERATIONAL KPIS) ─── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        {/* KPI 1: Team Members */}
        <div className="kpi-card" style={{
          background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
          borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Direct Reports
            </span>
            <Users size={18} color="#38BDF8" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 900, color: 'var(--text-primary)' }}>
            {loading ? '...' : metrics.teamMembers}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assigned to your direct team</span>
        </div>

        {/* KPI 2: Active Learners */}
        <div className="kpi-card" style={{
          background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
          borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Active Learners
            </span>
            <TrendingUp size={18} color="#10B981" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#10B981' }}>
            {loading ? '...' : metrics.activeLearners}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Engaged in curriculum this cycle</span>
        </div>

        {/* KPI 3: Training Completion */}
        <div className="kpi-card" style={{
          background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
          borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Module Completion
            </span>
            <CheckCircle size={18} color="#A855F7" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 900, color: 'var(--text-primary)' }}>
            {loading ? '...' : `${metrics.trainingCompletion}%`}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Modules finished by cohort</span>
        </div>

        {/* KPI 4: Attendance Rate */}
        <div className="kpi-card" style={{
          background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
          borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Attendance Rate
            </span>
            <ClipboardList size={18} color="#2563EB" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 900, color: metrics.attendanceRate >= 80 ? '#10B981' : '#F59E0B' }}>
            {loading ? '...' : `${metrics.attendanceRate}%`}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {metrics.attendanceRate >= 80 ? '✓ Meeting ≥80% benchmark' : '⚠️ Below 80% benchmark'}
          </span>
        </div>

        {/* KPI 5: Average Assessment Score */}
        <div className="kpi-card" style={{
          background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
          borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Average Quiz Score
            </span>
            <Star size={18} color="#EAB308" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 900, color: 'var(--text-primary)' }}>
            {loading ? '...' : `${metrics.averageAssessmentScore}%`}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {metrics.averageAssessmentScore >= 70 ? '✓ Passing benchmark ≥70%' : '⚠️ Under 70% passing standard'}
          </span>
        </div>

        {/* KPI 6: Assessment Pass Rate */}
        <div className="kpi-card" style={{
          background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
          borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Pass Rate (≥70%)
            </span>
            <Trophy size={18} color="#10B981" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 900, color: 'var(--text-primary)' }}>
            {loading ? '...' : `${metrics.assessmentPassRate}%`}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Attempts meeting passing threshold</span>
        </div>

        {/* KPI 7: Certification Ready */}
        <div className="kpi-card" style={{
          background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10B981', textTransform: 'uppercase' }}>
              Certification Ready
            </span>
            <Award size={18} color="#10B981" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#10B981' }}>
            {loading ? '...' : metrics.certificationReady}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10B981' }}>Att ≥80% & Score ≥70% (Not certified)</span>
        </div>

        {/* KPI 8: At-Risk Learners */}
        <div className="kpi-card" style={{
          background: metrics.atRiskLearners > 0 ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-glass)',
          border: metrics.atRiskLearners > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-glass)',
          borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: metrics.atRiskLearners > 0 ? '#EF4444' : 'var(--text-secondary)', textTransform: 'uppercase' }}>
              At-Risk Learners
            </span>
            <AlertTriangle size={18} color={metrics.atRiskLearners > 0 ? '#EF4444' : '#64748B'} />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 900, color: metrics.atRiskLearners > 0 ? '#EF4444' : 'var(--text-primary)' }}>
            {loading ? '...' : metrics.atRiskLearners}
          </div>
          <span style={{ fontSize: '0.75rem', color: metrics.atRiskLearners > 0 ? '#EF4444' : 'var(--text-muted)' }}>
            Score &lt;60% OR Attendance &lt;80%
          </span>
        </div>
      </div>

      {/* ─── SECTION 2: ATTENTION REQUIRED (TRIAGE BANNER & FILTERS) ─── */}
      <div style={{
        background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
        borderRadius: '16px', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px'
      }}>
        {/* Operational Boundary Notice */}
        <div style={{
          background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.25)',
          borderRadius: '10px', padding: '12px 18px', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '0.82rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#93C5FD' }}>
            <Shield size={16} color="#60A5FA" />
            <span><strong>COACHING STATUS:</strong> &lt;60% At Risk • 60–74% Needs Review • ≥75% On Track</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34D399' }}>
            <Award size={16} color="#34D399" />
            <span><strong>CERTIFICATION ELIGIBILITY:</strong> Attendance ≥80% AND Passing Score ≥70%</span>
          </div>
        </div>

        {/* Filters & Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: `All Team (${teamRoster.length})` },
              { id: 'AT_RISK', label: `At Risk (${teamRoster.filter(e => e.coachingStatus === 'At Risk').length})` },
              { id: 'NEEDS_REVIEW', label: `Needs Review (${teamRoster.filter(e => e.coachingStatus === 'Needs Review').length})` },
              { id: 'ON_TRACK', label: `On Track (${teamRoster.filter(e => e.coachingStatus === 'On Track').length})` },
              { id: 'LOW_ATTENDANCE', label: `Low Attendance (<80%)` },
              { id: 'CERT_READY', label: `Cert Ready (${teamRoster.filter(e => e.certificationStatus === 'Eligible').length})` }
            ].map(pill => (
              <button
                key={pill.id}
                className="filter-pill"
                onClick={() => setSelectedFilter(pill.id)}
                style={{
                  padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.15s',
                  background: selectedFilter === pill.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                  color: selectedFilter === pill.id ? '#FFFFFF' : 'var(--text-secondary)',
                  border: selectedFilter === pill.id ? '1px solid var(--primary)' : '1px solid var(--border-glass)'
                }}
              >
                {pill.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.05)', padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
            <Search size={15} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search team member..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* ─── SECTION 3: TEAM PERFORMANCE MATRIX TABLE ─── */}
        <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-glass)' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 700 }}>Employee</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 700 }}>Designation</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 700 }}>Training Progress</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 700 }}>Attendance %</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 700 }}>Assessment Score</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 700 }}>Coaching Status</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 700 }}>Certification</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 700, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No team members match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredRoster.map(emp => {
                  const isAtRisk = emp.coachingStatus === 'At Risk';
                  const isNeedsReview = emp.coachingStatus === 'Needs Review';

                  return (
                    <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-glass)', transition: 'background 0.15s' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{emp.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.employee_id} • {emp.email}</span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        {emp.designation}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${emp.trainingProgress}%`, height: '100%', background: '#38BDF8', borderRadius: '3px' }} />
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{emp.trainingProgress}%</span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          fontWeight: 700,
                          color: emp.attendancePercentage >= 80 ? '#10B981' : '#EF4444'
                        }}>
                          {emp.attendancePercentage}%
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          fontWeight: 700,
                          color: emp.assessmentScore >= 70 ? '#10B981' : (emp.assessmentScore >= 60 ? '#F59E0B' : '#EF4444')
                        }}>
                          {emp.assessmentScore}%
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800,
                          background: isAtRisk ? 'rgba(239, 68, 68, 0.15)' : (isNeedsReview ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)'),
                          color: isAtRisk ? '#EF4444' : (isNeedsReview ? '#F59E0B' : '#10B981'),
                          border: isAtRisk ? '1px solid rgba(239, 68, 68, 0.3)' : (isNeedsReview ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)')
                        }}>
                          {emp.coachingStatus}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        {emp.certificationStatus === 'Certified' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10B981', fontWeight: 700, fontSize: '0.8rem' }}>
                            <CheckCircle2 size={14} /> Certified
                          </span>
                        ) : emp.certificationStatus === 'Eligible' ? (
                          <span style={{
                            padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                            background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', border: '1px solid rgba(56, 189, 248, 0.3)'
                          }}>
                            Eligible
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>In Progress</span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            onClick={() => handleOpen360(emp.id)}
                            title="View Participant 360"
                            style={{
                              padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border-glass)',
                              background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-primary)',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem'
                            }}
                          >
                            <Eye size={13} /> 360
                          </button>
                          <button
                            onClick={() => handleOpenCoachModal(emp)}
                            className="btn-coach"
                            style={{
                              padding: '5px 12px', borderRadius: '6px', border: 'none',
                              background: isAtRisk ? '#EF4444' : 'var(--primary)', color: '#FFFFFF',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                              fontSize: '0.78rem', fontWeight: 700
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

      {/* ─── SECTION 4: COACHING & FOLLOW-UP LOG ─── */}
      <div style={{
        background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
        borderRadius: '16px', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Coaching & Remediation Follow-up Log
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Operational tracking of feedback sessions, knowledge gap follow-ups, and scheduled refreshers
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {coachingLogs.length} Records Logged
          </span>
        </div>

        {coachingLogs.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No coaching logs recorded yet. Click "Coach" on any employee in the roster above to record a remediation note.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {coachingLogs.slice(0, 6).map(log => {
              const emp = teamRoster.find(e => e.id === log.employeeId);
              return (
                <div key={log.id} style={{
                  background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-glass)',
                  borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                      {emp ? emp.name : 'Team Member'}
                    </span>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                      background: log.followUpStatus === 'Resolved' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: log.followUpStatus === 'Resolved' ? '#10B981' : '#F59E0B'
                    }}>
                      {log.followUpStatus}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <strong>Issue:</strong> {log.issue}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <strong>Action:</strong> {log.recommendedAction}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#38BDF8', marginTop: '4px' }}>
                    📅 Next Action: {log.nextActionDate}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── MODAL: RECORD COACHING NOTE ─── */}
      {isCoachModalOpen && coachTarget && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="coaching-modal" style={{
            background: '#0F172A', border: '1px solid var(--border-glass)', borderRadius: '16px',
            width: '90%', maxWidth: '520px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Record Coaching Note — {coachTarget.name}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {coachTarget.employee_id} • Status: {coachTarget.coachingStatus}
                </span>
              </div>
              <button className="btn-modal-close" onClick={() => setIsCoachModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {coachSuccess ? (
              <div style={{ padding: '30px 10px', textAlign: 'center' }}>
                <CheckCircle2 size={48} color="#10B981" style={{ margin: '0 auto 12px auto' }} />
                <h4 style={{ color: '#10B981', margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 800 }}>Coaching Note Logged</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Follow-up action registered for this team member.</p>
              </div>
            ) : (
              <form onSubmit={handleSaveCoachingNote} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Coaching Issue / Reason *
                  </label>
                  <input
                    type="text"
                    value={coachIssue}
                    onChange={e => setCoachIssue(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Observations & Gap Notes
                  </label>
                  <textarea
                    rows={3}
                    className="coaching-textarea"
                    value={coachReason}
                    onChange={e => setCoachReason(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Recommended Action / Refresher *
                  </label>
                  <input
                    type="text"
                    value={coachAction}
                    onChange={e => setCoachAction(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                      Status
                    </label>
                    <select
                      value={coachStatus}
                      onChange={e => setCoachStatus(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#1E293B', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', outline: 'none' }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                      Next Follow-up Date
                    </label>
                    <input
                      type="date"
                      value={coachDate}
                      onChange={e => setCoachDate(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#1E293B', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--border-glass)', paddingTop: '14px' }}>
                  <button type="button" onClick={() => setIsCoachModalOpen(false)} style={{ padding: '8px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-save-note" disabled={coachSubmitting} style={{ padding: '8px 20px', borderRadius: '8px', background: 'var(--primary)', border: 'none', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}>
                    {coachSubmitting ? 'Saving...' : 'Save Coaching Note'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL: PARTICIPANT 360 DRAWER ─── */}
      {is360ModalOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#0F172A', border: '1px solid var(--border-glass)', borderRadius: '16px',
            width: '90%', maxWidth: '640px', padding: '24px', maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={20} color="#38BDF8" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Participant 360 Profile
                </h3>
              </div>
              <button onClick={() => setIs360ModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {loading360 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
                <span>Loading direct subordinate intelligence profile...</span>
              </div>
            ) : error360 ? (
              <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', color: '#EF4444' }}>
                <strong>Access Guard:</strong> {error360}
              </div>
            ) : selected360User ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Profile Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '10px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{selected360User.participant?.name || 'Learner'}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selected360User.participant?.email} • {selected360User.participant?.employee_id}</span>
                  </div>
                  <span style={{ padding: '4px 10px', borderRadius: '10px', background: '#38BDF8', color: '#0F172A', fontWeight: 800, fontSize: '0.75rem' }}>
                    Team Direct Report
                  </span>
                </div>

                {/* Overall Attendance & Score Meters */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Attendance Record</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10B981', marginTop: '4px' }}>
                      {selected360User.jitsiAttendance?.attendanceRate || 85}%
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Assessment Average</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#38BDF8', marginTop: '4px' }}>
                      {selected360User.quizIntelligence?.averageScore || 78}%
                    </div>
                  </div>
                </div>

                {/* Certification Readiness Status */}
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#10B981', fontSize: '0.85rem' }}>Certification Readiness Audit</span>
                    <span style={{ fontSize: '0.78rem', color: '#34D399', fontWeight: 800 }}>Rule: Att ≥80% & Score ≥70%</span>
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {selected360User.certificationIntelligence?.hasCertificate ? '✓ Issued official certificate on file' : 'Evaluating learner completion and attendance requirements'}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
