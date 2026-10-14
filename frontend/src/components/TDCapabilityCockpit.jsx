import React, { useState, useEffect, useContext, useMemo } from 'react';
import { 
  Award, 
  BookOpen, 
  Users, 
  CheckCircle2, 
  TrendingUp, 
  AlertTriangle, 
  RefreshCw, 
  Search, 
  ExternalLink, 
  Sparkles, 
  BarChart3, 
  Percent, 
  GraduationCap, 
  Layers, 
  ShieldCheck, 
  FileText, 
  X,
  ChevronRight,
  ChevronDown,
  Zap,
  Calendar,
  Clock,
  ArrowUpRight,
  Filter,
  Check,
  AlertCircle,
  Info,
  HelpCircle,
  Eye,
  Shield
} from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from './ui/PageHeader';
import KpiCard from './ui/KpiCard';
import StatusBadge from './ui/StatusBadge';
import EmptyState from './ui/EmptyState';
import LoadingSkeleton from './ui/LoadingSkeleton';

export default function TDCapabilityCockpit() {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Scope & Filter State
  const urlParams = new URLSearchParams(window.location.search);
  const initialProject = urlParams.get('projectId') || 'all';
  const initialSubProject = urlParams.get('subProjectId') || 'all';
  const initialPeriod = urlParams.get('period') || 'current_month';

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProject);
  const [selectedSubProjectId, setSelectedSubProjectId] = useState(initialSubProject);
  const [selectedPeriod, setSelectedPeriod] = useState(initialPeriod);
  
  // Data State
  const [metrics, setMetrics] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [learnerFilter, setLearnerFilter] = useState('all'); // 'all' | 'deficit' | 'certified' | 'proficient'
  
  // Lifecycle & Status State
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [activeTab, setActiveTab] = useState('framework'); // 'framework' | 'trainers' | 'learners' | 'portfolio'
  const [showHealthTooltip, setShowHealthTooltip] = useState(false);

  // Participant 360 Inspection State
  const [inspectParticipant, setInspectParticipant] = useState(null);

  const authToken = token || localStorage.getItem('jwt') || localStorage.getItem('token');

  // Helper to preserve active filter scope on all drill-down actions
  const getDrillDownUrl = (baseRoute) => {
    const params = new URLSearchParams();
    if (selectedProjectId && selectedProjectId !== 'all') params.append('projectId', selectedProjectId);
    if (selectedSubProjectId && selectedSubProjectId !== 'all') params.append('subProjectId', selectedSubProjectId);
    if (selectedPeriod) params.append('period', selectedPeriod);
    const qs = params.toString();
    return qs ? `${baseRoute}?${qs}` : baseRoute;
  };

  const getPeriodLabel = (p) => {
    switch (p) {
      case 'current_month': return 'Current Month (Sep 2026)';
      case 'previous_month': return 'Previous Month (Aug 2026)';
      case 'current_quarter': return 'Current Quarter (Q3 2026)';
      case 'previous_quarter': return 'Previous Quarter (Q2 2026)';
      case 'current_fy': return 'Current FY (2026-2027)';
      case 'all_time':
      case 'all': return 'All Time';
      case 'custom': return 'Custom Range';
      default: return p || 'Current Month';
    }
  };

  // Fetch authorized projects on mount
  useEffect(() => {
    if (authToken) {
      fetchProjects();
    }
  }, [authToken]);

  // Fetch metrics & participants whenever filters change
  useEffect(() => {
    if (authToken) {
      fetchCockpitData();
    }
  }, [selectedProjectId, selectedSubProjectId, selectedPeriod, authToken]);

  const fetchProjects = async () => {
    const t = token || localStorage.getItem('jwt') || localStorage.getItem('token');
    if (!t) return;
    try {
      const res = await axios.get('/api/td/projects', {
        headers: { Authorization: `Bearer ${t}` }
      });
      setProjects(res.data || []);
    } catch (err) {
      console.error('Failed to fetch T&D projects:', err);
    }
  };

  const fetchCockpitData = async (silent = false) => {
    const t = token || localStorage.getItem('jwt') || localStorage.getItem('token');
    if (!t) return;
    if (!silent) setLoading(true);
    else setSyncing(true);
    setError(null);

    try {
      const [metricsRes, participantsRes] = await Promise.all([
        axios.get(`/api/td/cockpit?projectId=${selectedProjectId}&subProjectId=${selectedSubProjectId}&period=${selectedPeriod}`, {
          headers: { Authorization: `Bearer ${t}` }
        }),
        axios.get(`/api/td/participants?projectId=${selectedProjectId}&subProjectId=${selectedSubProjectId}&period=${selectedPeriod}&search=${encodeURIComponent(searchQuery)}`, {
          headers: { Authorization: `Bearer ${t}` }
        })
      ]);

      setMetrics(metricsRes.data);
      setParticipants(participantsRes.data || []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to fetch T&D cockpit data:', err);
      setError(err.response?.data?.error || 'Failed to load T&D capability intelligence.');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const availableSubProjects = selectedProjectId !== 'all'
    ? projects.filter(p => p.parentId === selectedProjectId)
    : [];

  const selectedProjectObj = projects.find(p => p.id === selectedProjectId);
  const selectedSubProjectObj = projects.find(p => p.id === selectedSubProjectId);

  const kpis = metrics?.kpis || {
    totalLearners: 0,
    activeModules: 0,
    activeQuizzes: 0,
    curriculumCompletionRate: 0,
    attendanceRate: 0,
    assessmentAverageScore: 0,
    assessmentPassRate: 0,
    certificatesIssued: 0,
    skillDeficitsCount: 0
  };

  const health = metrics?.health || {
    status: 'Healthy',
    badgeColor: 'green',
    score: 85,
    summary: 'Capability portfolio metrics meet active operational benchmarks.',
    criteria: [
      { name: 'Live Attendance', target: '>= 80%', actual: `${kpis.attendanceRate}%`, met: kpis.attendanceRate >= 80 },
      { name: 'Assessment Pass Rate', target: '>= 70%', actual: `${kpis.assessmentPassRate}%`, met: kpis.assessmentPassRate >= 70 },
      { name: 'Assessment Average', target: '>= 70%', actual: `${kpis.assessmentAverageScore}%`, met: kpis.assessmentAverageScore >= 70 },
      { name: 'Learner Attention Ratio', target: '<= 15%', actual: `${kpis.totalLearners > 0 ? Math.round((kpis.skillDeficitsCount / kpis.totalLearners) * 100) : 0}%`, met: (kpis.skillDeficitsCount / (kpis.totalLearners || 1)) <= 0.15 }
    ]
  };

  const attentionItems = metrics?.attentionRequired || [];
  const capabilityMatrix = metrics?.capabilityMatrix || [];
  const trainerDelivery = metrics?.trainerDelivery || [];
  const portfolioProjects = metrics?.portfolioProjects || projects;

  const getRelativeTimeString = (date) => {
    const diff = Math.floor((new Date() - date) / 1000);
    if (diff < 10) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  };

  const filteredParticipants = useMemo(() => {
    return participants.filter(p => {
      const matchesSearch = !searchQuery.trim() || 
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.designation?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (learnerFilter === 'deficit') return p.capabilityStatus === 'Deficit' || p.avgScore < 70 || p.attendanceRate < 80;
      if (learnerFilter === 'certified') return p.certified;
      if (learnerFilter === 'proficient') return p.capabilityStatus === 'Mastery' || p.capabilityStatus === 'Proficient';
      return true;
    });
  }, [participants, searchQuery, learnerFilter]);

  const getInitials = (name) => {
    if (!name) return 'LN';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  };

  return (
    <div className="td-capability-cockpit-page td-cockpit-page" style={{
      minHeight: '100%',
      background: 'var(--re-bg, #F6F8FC)',
      padding: '24px 32px 56px',
      color: 'var(--re-text, #0F172A)'
    }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>

        {/* ─── 1. PAGE HEADER (ENTERPRISE OPERATIONAL STANDARD) ─── */}
        <PageHeader
          eyebrow="TRAINING & DEVELOPMENT"
          badge={selectedProjectObj ? selectedProjectObj.name : "All Authorized Projects"}
          title="Capability Intelligence Cockpit"
          subtitle="Govern capability programs, monitor training effectiveness and identify the skills that need attention."
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Project Scope Filter */}
              <div style={{ position: 'relative' }}>
                <select
                  id="td-project-selector"
                  value={selectedProjectId}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value);
                    setSelectedSubProjectId('all');
                  }}
                  style={{
                    padding: '8px 30px 8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    outline: 'none',
                    boxShadow: 'var(--re-shadow-sm, 0 1px 2px 0 rgba(15, 23, 42, 0.05))'
                  }}
                >
                  <option value="all">All Authorized Projects ({projects.filter(p => !p.parentId).length})</option>
                  {projects.filter(p => !p.parentId).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }} />
              </div>

              {/* Subproject Selector (if applicable) */}
              {availableSubProjects.length > 0 && (
                <div style={{ position: 'relative' }}>
                  <select
                    id="td-subproject-selector"
                    value={selectedSubProjectId}
                    onChange={(e) => setSelectedSubProjectId(e.target.value)}
                    style={{
                      padding: '8px 30px 8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#0F172A',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      outline: 'none',
                      boxShadow: 'var(--re-shadow-sm, 0 1px 2px 0 rgba(15, 23, 42, 0.05))'
                    }}
                  >
                    <option value="all">All Subprojects ({availableSubProjects.length})</option>
                    {availableSubProjects.map(sp => (
                      <option key={sp.id} value={sp.id}>{sp.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }} />
                </div>
              )}

              {/* Period Selector */}
              <div style={{ position: 'relative' }}>
                <select
                  id="td-period-selector"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  style={{
                    padding: '8px 30px 8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    outline: 'none',
                    boxShadow: 'var(--re-shadow-sm, 0 1px 2px 0 rgba(15, 23, 42, 0.05))'
                  }}
                >
                  <option value="current_month">Current Month (Sep 2026)</option>
                  <option value="previous_month">Previous Month (Aug 2026)</option>
                  <option value="current_quarter">Current Quarter (Q3 2026)</option>
                  <option value="previous_quarter">Previous Quarter (Q2 2026)</option>
                  <option value="current_fy">Current FY (2026-2027)</option>
                  <option value="all_time">All Time</option>
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }} />
              </div>

              {/* Refresh / Sync Button */}
              <button
                id="td-refresh-btn"
                onClick={() => fetchCockpitData(true)}
                disabled={loading || syncing}
                title="Refresh real-time portfolio metrics"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  cursor: loading || syncing ? 'not-allowed' : 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  boxShadow: 'var(--re-shadow-sm, 0 1px 2px 0 rgba(15, 23, 42, 0.05))',
                  transition: 'all 0.15s'
                }}
              >
                <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
                <span>{syncing ? 'Syncing...' : 'Sync'}</span>
              </button>
            </div>
          }
        />

        {/* ─── 2. PORTFOLIO HEALTH & ATTENTION SIGNALS BANNER ─── */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--re-border, #E2E8F0)',
          borderRadius: '14px',
          padding: '18px 22px',
          boxShadow: 'var(--re-shadow-sm, 0 1px 3px 0 rgba(15, 23, 42, 0.05))',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '8px',
                background: health.badgeColor === 'green' ? '#ECFDF5' : (health.badgeColor === 'red' ? '#FEF2F2' : '#FFFBEB'),
                border: `1px solid ${health.badgeColor === 'green' ? '#A7F3D0' : (health.badgeColor === 'red' ? '#FCA5A5' : '#FDE68A')}`
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: health.badgeColor === 'green' ? '#10B981' : (health.badgeColor === 'red' ? '#EF4444' : '#F59E0B')
                }} />
                <span style={{
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: health.badgeColor === 'green' ? '#065F46' : (health.badgeColor === 'red' ? '#991B1B' : '#92400E')
                }}>
                  PORTFOLIO HEALTH: {health.status.toUpperCase()}
                </span>
              </div>
              <span style={{ fontSize: '0.82rem', color: '#64748B' }}>
                {health.summary}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#64748B' }}>
              <Clock size={13} />
              <span>{loading ? 'Loading intelligence...' : (syncing ? 'Refreshing...' : `Updated ${getRelativeTimeString(lastRefreshed)}`)}</span>
            </div>
          </div>

          {/* Operational Rules Context */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '10px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '0.8rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1E40AF', fontWeight: 600 }}>
              <Shield size={14} color="#1E40AF" />
              <span><strong>COACHING THRESHOLDS:</strong> &lt;60% At Risk • 60–74% Needs Review • ≥75% On Track</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontWeight: 600 }}>
              <Award size={14} color="#059669" />
              <span><strong>CERTIFICATION BENCHMARK:</strong> Attendance ≥80% AND Assessment ≥70%</span>
            </div>
          </div>
        </div>

        {/* ─── 3. MANAGEMENT KPI AREA (9 REAL DATABASE METRICS) ─── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '16px'
        }}>
          {/* KPI 1: Active Programs */}
          <KpiCard
            icon={Layers}
            label="ACTIVE PROGRAMS"
            value={portfolioProjects.length > 0 ? portfolioProjects.length : '—'}
            subtext="Authorized capability scopes"
            variant="blue"
            loading={loading}
            onClick={() => setActiveTab('portfolio')}
          />

          {/* KPI 2: Active Modules */}
          <KpiCard
            icon={BookOpen}
            label="ACTIVE MODULES"
            value={kpis.activeModules !== undefined && kpis.activeModules !== null ? kpis.activeModules : '—'}
            subtext="Authored learning modules"
            variant="purple"
            loading={loading}
            onClick={() => setActiveTab('framework')}
          />

          {/* KPI 3: Participants */}
          <KpiCard
            icon={Users}
            label="TOTAL LEARNERS"
            value={kpis.totalLearners !== undefined && kpis.totalLearners !== null ? kpis.totalLearners : '—'}
            subtext="Enrolled frontline workforce"
            variant="cyan"
            loading={loading}
            onClick={() => setActiveTab('learners')}
          />

          {/* KPI 4: Curriculum Completion */}
          <KpiCard
            icon={CheckCircle2}
            label="CURRICULUM COMPLETION"
            value={kpis.hasCurriculumData && kpis.curriculumCompletionRate !== null ? `${kpis.curriculumCompletionRate}%` : '—'}
            subtext={kpis.hasCurriculumData ? (kpis.curriculumCompletionRate >= 70 ? '✓ Meeting ≥70% target' : '⚠️ Below target') : 'No curriculum assigned'}
            variant="green"
            radialProgress={kpis.hasCurriculumData ? kpis.curriculumCompletionRate : null}
            loading={loading}
          />

          {/* KPI 5: Attendance Rate */}
          <KpiCard
            icon={Calendar}
            label="ATTENDANCE RATE"
            value={kpis.hasAttendanceData && kpis.attendanceRate !== null ? `${kpis.attendanceRate}%` : '—'}
            subtext={kpis.hasAttendanceData ? (kpis.attendanceRate >= 80 ? '✓ Meeting ≥80% benchmark' : '⚠️ Below standard') : 'No attendance records'}
            variant={kpis.hasAttendanceData && kpis.attendanceRate >= 80 ? 'green' : 'amber'}
            radialProgress={kpis.hasAttendanceData ? kpis.attendanceRate : null}
            loading={loading}
          />

          {/* KPI 6: Assessment Average */}
          <KpiCard
            icon={TrendingUp}
            label="ASSESSMENT AVERAGE"
            value={kpis.hasAssessmentData && kpis.assessmentAverageScore !== null ? `${kpis.assessmentAverageScore}%` : '—'}
            subtext={kpis.hasAssessmentData ? (kpis.assessmentAverageScore >= 70 ? '✓ Passing standard met' : '⚠️ Focus required') : 'No completed quizzes'}
            variant="blue"
            radialProgress={kpis.hasAssessmentData ? kpis.assessmentAverageScore : null}
            loading={loading}
          />

          {/* KPI 7: Assessment Pass Rate */}
          <KpiCard
            icon={Percent}
            label="PASS RATE (≥70%)"
            value={kpis.hasAssessmentData && kpis.assessmentPassRate !== null ? `${kpis.assessmentPassRate}%` : '—'}
            subtext={kpis.hasAssessmentData ? (kpis.assessmentPassRate >= 70 ? '✓ Meeting threshold' : '⚠️ Needs remediation') : 'No completed quizzes'}
            variant="green"
            radialProgress={kpis.hasAssessmentData ? kpis.assessmentPassRate : null}
            loading={loading}
          />

          {/* KPI 8: Certification Progress */}
          <KpiCard
            icon={Award}
            label="CERTIFICATES ISSUED"
            value={kpis.certificatesIssued !== undefined && kpis.certificatesIssued !== null ? kpis.certificatesIssued : '—'}
            subtext="Digitally validated credentials"
            variant="amber"
            loading={loading}
            onClick={() => navigate(getDrillDownUrl('/certificates'))}
          />

          {/* KPI 9: Learners Requiring Attention */}
          <KpiCard
            icon={AlertTriangle}
            label="AT-RISK LEARNERS"
            value={kpis.skillDeficitsCount !== undefined && kpis.skillDeficitsCount !== null ? kpis.skillDeficitsCount : '—'}
            subtext={kpis.skillDeficitsCount > 0 ? 'Score <70% or Att <80%' : 'All learners on track'}
            variant={kpis.skillDeficitsCount > 0 ? 'red' : 'green'}
            loading={loading}
            onClick={() => {
              setActiveTab('learners');
              setLearnerFilter('deficit');
            }}
          />
        </div>

        {/* ─── 4. CAPABILITY TABS & SECTION CONTENT ─── */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--re-border, #E2E8F0)',
          borderRadius: '14px',
          padding: '24px',
          boxShadow: 'var(--re-shadow-sm, 0 1px 3px 0 rgba(15, 23, 42, 0.05))',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {/* Tab Header Controls */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            borderBottom: '1px solid #E2E8F0',
            paddingBottom: '12px'
          }}>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
              {[
                { id: 'framework', label: 'Capability Framework', icon: <BookOpen size={16} /> },
                { id: 'trainers', label: 'Trainer Performance', icon: <GraduationCap size={16} /> },
                { id: 'learners', label: 'Learner Competency', icon: <Users size={16} /> },
                { id: 'portfolio', label: 'Portfolio Health', icon: <Layers size={16} /> }
              ].map(t => {
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    id={`td-tab-${t.id}`}
                    onClick={() => setActiveTab(t.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      background: isActive ? '#EFF6FF' : 'transparent',
                      color: isActive ? '#1E40AF' : '#64748B',
                      fontWeight: isActive ? 800 : 600,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {t.icon}
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── TAB 1: CAPABILITY FRAMEWORK & SKILL GAP ─── */}
          {activeTab === 'framework' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                  Capability Framework Performance
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                  Aggregate mastery evaluation across authorized retail capability pillars
                </p>
              </div>

              {capabilityMatrix.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="Capability Insights Unavailable"
                  description="More assessment activity is required to calculate capability performance. Please ensure quizzes are assigned and completed."
                />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                  {capabilityMatrix.map((cap, idx) => {
                    const title = cap.title || cap.name || 'Capability Module';
                    const score = cap.completionPct !== undefined ? cap.completionPct : (cap.score || 0);
                    const isDeficit = score < 70;
                    const isMastery = score >= 85;

                    return (
                      <div
                        key={idx}
                        style={{
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '12px',
                          padding: '16px 18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>
                              {title}
                            </span>
                            <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                              {cap.type || 'Curriculum'} • {cap.projectName || 'Authorized Scope'} • {cap.duration || '30m'}
                            </div>
                          </div>
                          <span style={{
                            padding: '3px 9px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            background: isMastery ? '#ECFDF5' : (isDeficit ? '#FEF2F2' : '#EFF6FF'),
                            color: isMastery ? '#065F46' : (isDeficit ? '#991B1B' : '#1E40AF'),
                            border: `1px solid ${isMastery ? '#A7F3D0' : (isDeficit ? '#FCA5A5' : '#DBEAFE')}`
                          }}>
                            {cap.status || (isMastery ? 'Mastered' : (isDeficit ? 'Deficit Risk' : 'In Progress'))}
                          </span>
                        </div>

                        {/* Performance Bar */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                            <span style={{ color: '#475569', fontWeight: 600 }}>Completion:</span>
                            <strong style={{ color: isDeficit ? '#EF4444' : '#059669' }}>{score}%</strong>
                          </div>
                          <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${Math.min(score, 100)}%`,
                              height: '100%',
                              background: isMastery ? '#10B981' : (isDeficit ? '#EF4444' : '#3B82F6'),
                              borderRadius: '4px'
                            }} />
                          </div>
                        </div>

                        {/* Benchmark & Target Gap */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingTop: '8px',
                          borderTop: '1px solid #E2E8F0',
                          fontSize: '0.75rem',
                          color: '#64748B'
                        }}>
                          <span>Benchmark: <strong>≥70%</strong></span>
                          <span>Gap: <strong style={{ color: score >= 70 ? '#059669' : '#EF4444' }}>{score >= 70 ? '+ On Track' : `-${70 - score}% Gap`}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── TAB 2: TRAINER PERFORMANCE ─── */}
          {activeTab === 'trainers' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                  Trainer Execution & Delivery Performance
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                  Operational delivery oversight across assigned trainers and facilitation cohorts
                </p>
              </div>

              {trainerDelivery.length === 0 ? (
                <EmptyState
                  icon={GraduationCap}
                  title="Insufficient Trainer Data"
                  description="No completed training sessions delivered by assigned trainers within the active scope and period."
                />
              ) : (
                <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase' }}>Trainer</th>
                        <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase' }}>Sessions Delivered</th>
                        <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase' }}>Learners Trained</th>
                        <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase' }}>Avg Attendance</th>
                        <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase' }}>Class Avg Score</th>
                        <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase' }}>Class Pass Rate</th>
                        <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase' }}>Delivery Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trainerDelivery.map((tr, idx) => (
                        <tr
                          key={tr.trainerId || idx}
                          style={{ borderBottom: '1px solid #F1F5F9' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '8px',
                                background: '#EFF6FF',
                                color: '#1E40AF',
                                fontWeight: 800,
                                fontSize: '0.78rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                {getInitials(tr.trainerName || tr.name)}
                              </div>
                              <span style={{ fontWeight: 700, color: '#0F172A' }}>{tr.trainerName || tr.name || 'Trainer'}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', fontWeight: 600 }}>{tr.sessionsDelivered !== undefined ? tr.sessionsDelivered : (tr.sessionsHosted || 0)}</td>
                          <td style={{ padding: '14px 16px', fontWeight: 600 }}>{tr.participantsTrained || 0}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ fontWeight: 700, color: (tr.avgAttendance || 0) >= 80 ? '#059669' : '#DC2626' }}>
                              {tr.avgAttendance || 0}%
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ fontWeight: 700, color: (tr.avgScore || 0) >= 70 ? '#059669' : '#D97706' }}>
                              {tr.avgScore || 0}%
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ fontWeight: 700, color: (tr.passRate || 0) >= 70 ? '#059669' : '#DC2626' }}>
                              {tr.passRate || 0}%
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <StatusBadge
                              variant={(tr.avgScore || 0) >= 70 && (tr.avgAttendance || 0) >= 80 ? 'success' : 'warning'}
                              label={(tr.avgScore || 0) >= 70 && (tr.avgAttendance || 0) >= 80 ? 'Optimal' : 'Needs Review'}
                              size="sm"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ─── TAB 3: LEARNER COMPETENCY & DIAGNOSTIC ROSTER ─── */}
          {activeTab === 'learners' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                    Learner Competency & Diagnostic Roster
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                    Participant assessment correctness, verified attendance records, and capability status
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {/* Filter Pills */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[
                      { id: 'all', label: `All (${participants.length})` },
                      { id: 'deficit', label: `At Risk / Deficits (${participants.filter(p => p.capabilityStatus === 'Deficit' || p.avgScore < 70 || p.attendanceRate < 80).length})` },
                      { id: 'certified', label: `Certified (${participants.filter(p => p.certified).length})` },
                      { id: 'proficient', label: `Proficient (${participants.filter(p => p.capabilityStatus === 'Mastery' || p.capabilityStatus === 'Proficient').length})` }
                    ].map(pill => (
                      <button
                        key={pill.id}
                        id={`td-learner-filter-${pill.id}`}
                        onClick={() => setLearnerFilter(pill.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: learnerFilter === pill.id ? '1px solid #1E40AF' : '1px solid #E2E8F0',
                          background: learnerFilter === pill.id ? '#1E40AF' : '#F8FAFC',
                          color: learnerFilter === pill.id ? '#FFFFFF' : '#475569',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>

                  {/* Search Input */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#F8FAFC',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    minWidth: '220px'
                  }}>
                    <Search size={14} color="#94A3B8" />
                    <input
                      id="td-learner-search"
                      type="text"
                      placeholder="Search participant..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#0F172A',
                        outline: 'none',
                        fontSize: '0.82rem',
                        width: '100%'
                      }}
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <X size={13} color="#94A3B8" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {filteredParticipants.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No Learners Found"
                  description={searchQuery ? `No participants match "${searchQuery}".` : "No participants match the selected filter criteria."}
                />
              ) : (
                <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase' }}>Participant</th>
                        <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase' }}>Designation</th>
                        <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase' }}>Project Scope</th>
                        <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase' }}>Attendance</th>
                        <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase' }}>Assessment</th>
                        <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase' }}>Capability Status</th>
                        <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase' }}>Certification</th>
                        <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredParticipants.slice(0, 15).map(p => {
                        const isAtRisk = (p.avgScore || 0) < 60 || (p.attendanceRate || 0) < 80;
                        const isNeedsReview = (p.avgScore || 0) >= 60 && (p.avgScore || 0) < 75;

                        return (
                          <tr
                            key={p.id}
                            style={{ borderBottom: '1px solid #F1F5F9' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '34px',
                                  height: '34px',
                                  borderRadius: '8px',
                                  background: '#EFF6FF',
                                  color: '#1E40AF',
                                  fontWeight: 800,
                                  fontSize: '0.78rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  {getInitials(p.name)}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontWeight: 700, color: '#0F172A' }}>{p.name}</span>
                                  <span style={{ fontSize: '0.74rem', color: '#64748B' }}>{p.employeeId || 'ID: —'} • {p.email}</span>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px', color: '#475569', fontSize: '0.82rem' }}>
                              {p.designation || 'Frontline Specialist'}
                            </td>
                            <td style={{ padding: '14px 16px', color: '#475569', fontSize: '0.82rem' }}>
                              {p.projectName || 'Authorized Scope'}
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{ fontWeight: 700, color: (p.attendanceRate || 0) >= 80 ? '#059669' : '#DC2626' }}>
                                {p.attendanceRate !== undefined ? `${p.attendanceRate}%` : '—'}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{ fontWeight: 700, color: (p.avgScore || 0) >= 70 ? '#059669' : ((p.avgScore || 0) >= 60 ? '#D97706' : '#DC2626') }}>
                                {p.avgScore !== undefined ? `${p.avgScore}%` : '—'}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <StatusBadge
                                variant={isAtRisk ? 'danger' : (isNeedsReview ? 'warning' : 'success')}
                                label={isAtRisk ? 'At Risk' : (isNeedsReview ? 'Needs Review' : 'On Track')}
                                size="sm"
                              />
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              {p.certified ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  color: '#059669',
                                  fontWeight: 700,
                                  fontSize: '0.76rem',
                                  background: '#ECFDF5',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #A7F3D0'
                                }}>
                                  <CheckCircle2 size={12} /> Certified
                                </span>
                              ) : (
                                <span style={{ color: '#64748B', fontSize: '0.78rem' }}>Pending</span>
                              )}
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                              <button
                                id={`td-inspect-360-${p.id}`}
                                onClick={() => setInspectParticipant(p)}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid #CBD5E1',
                                  background: '#FFFFFF',
                                  color: '#0F172A',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.78rem',
                                  fontWeight: 600
                                }}
                              >
                                <Eye size={13} /> 360
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ─── TAB 4: PORTFOLIO HEALTH MATRIX ─── */}
          {activeTab === 'portfolio' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                  Authorized Portfolio Capability Scopes
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                  Governance breakdown across authorized enterprise mother projects and subprojects
                </p>
              </div>

              {portfolioProjects.length === 0 ? (
                <EmptyState
                  icon={Layers}
                  title="No Authorized Portfolio Projects"
                  description="No project assignments are configured for your T&D Manager profile."
                />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                  {portfolioProjects.filter(p => !p.parentId).map(proj => {
                    const subCount = portfolioProjects.filter(p => p.parentId === proj.id).length;
                    return (
                      <div
                        key={proj.id}
                        style={{
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '12px',
                          padding: '16px 18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.95rem' }}>
                              {proj.name}
                            </span>
                            <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                              Code: {proj.project_code || 'PRJ'} • {subCount} Subprojects
                            </div>
                          </div>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: '#EFF6FF',
                            color: '#1E40AF',
                            border: '1px solid #DBEAFE'
                          }}>
                            Authorized
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.78rem' }}>
                          <div style={{ background: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem', fontWeight: 600 }}>ENROLLED</span>
                            <strong style={{ fontSize: '1.1rem', color: '#0F172A' }}>{proj.learnersCount || kpis.totalLearners}</strong>
                          </div>
                          <div style={{ background: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem', fontWeight: 600 }}>MODULES</span>
                            <strong style={{ fontSize: '1.1rem', color: '#0F172A' }}>{proj.modulesCount || kpis.activeModules}</strong>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #E2E8F0' }}>
                          <button
                            onClick={() => {
                              setSelectedProjectId(proj.id);
                              setSelectedSubProjectId('all');
                              setActiveTab('framework');
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#1E40AF',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            Filter Scope to this Project <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── 5. PARTICIPANT 360 MODAL (LIGHT CORPORATE MODAL LANGUAGE) ─── */}
        {inspectParticipant && (
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
                      Participant 360 Diagnostic
                    </h3>
                    <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                      Capability assessment & compliance audit record
                    </span>
                  </div>
                </div>
                <button
                  id="close-td-360-btn"
                  onClick={() => setInspectParticipant(null)}
                  style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Profile Card */}
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
                    {getInitials(inspectParticipant.name)}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                      {inspectParticipant.name}
                    </h4>
                    <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                      {inspectParticipant.email} • {inspectParticipant.employeeId || 'ID: —'}
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
                  {inspectParticipant.designation || 'Frontline Specialist'}
                </span>
              </div>

              {/* Meters */}
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
                  <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                    Attendance Record
                  </span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: (inspectParticipant.attendanceRate || 0) >= 80 ? '#059669' : '#DC2626' }}>
                    {inspectParticipant.attendanceRate !== undefined ? `${inspectParticipant.attendanceRate}%` : '—'}
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
                  <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                    Assessment Average
                  </span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: (inspectParticipant.avgScore || 0) >= 70 ? '#059669' : '#DC2626' }}>
                    {inspectParticipant.avgScore !== undefined ? `${inspectParticipant.avgScore}%` : '—'}
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
                  {inspectParticipant.certified
                    ? '✓ Official certificate issued on file with verifiable signature and compliance record.'
                    : 'Evaluating learner completion and attendance requirements towards threshold.'}
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
