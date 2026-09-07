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
  Zap,
  Calendar,
  Clock,
  ArrowUpRight,
  Filter,
  Check,
  AlertCircle,
  Info,
  HelpCircle
} from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function TDCapabilityCockpit() {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Scope & Filter State
  // Read initial query params if present (e.g. from drill-downs)
  const urlParams = new URLSearchParams(window.location.search);
  const initialProject = urlParams.get('projectId') || 'all';
  const initialSubProject = urlParams.get('subProjectId') || 'all';
  const initialPeriod = urlParams.get('period') || 'current_month';

  // Scope & Filter State
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

  // Human-readable period label
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

  // Subprojects available under selected project
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

  // Relative time helper
  const getRelativeTimeString = (date) => {
    const diff = Math.floor((new Date() - date) / 1000);
    if (diff < 10) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  };

  // Filter participants by query and tab pill
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

  return (
    <div style={{ fontFamily: 'Poppins, sans-serif', color: '#F8FAFC', paddingBottom: '40px' }}>
      
      {/* ─── 1. STRONG ENTERPRISE HERO SECTION (TIGHTENED 15-20% VERTICALLY) ─────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0B132B 0%, #1C2541 60%, #1E1E38 100%)',
        border: '1px solid #334155',
        borderRadius: '14px',
        padding: '16px 22px',
        marginBottom: '16px',
        boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.5)',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{
                background: '#4338CA',
                color: '#EEF2FF',
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '5px',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                border: '1px solid #6366F1'
              }}>
                Capability Governance
              </span>
              <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 500 }}>
                Authoritative Portfolio
              </span>
            </div>

            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: '#FFFFFF', letterSpacing: '-0.4px' }}>
              T&amp;D CAPABILITY COCKPIT
            </h1>
            <p style={{ fontSize: '0.84rem', color: '#CBD5E1', marginTop: '2px', marginBottom: '10px', fontWeight: 400 }}>
              Capability performance across your authorized training portfolio
            </p>

            {/* Context Metadata Pill Row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid #475569',
                padding: '3px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: '#E2E8F0',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ color: '#94A3B8' }}>Project:</span>
                <strong style={{ color: '#38BDF8' }}>{selectedProjectObj ? selectedProjectObj.name : 'All Authorized Projects'}</strong>
              </div>

              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid #475569',
                padding: '3px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: '#E2E8F0',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ color: '#94A3B8' }}>Subproject:</span>
                <strong style={{ color: '#A5B4FC' }}>
                  {selectedSubProjectObj 
                    ? selectedSubProjectObj.name 
                    : (selectedProjectId === 'all' ? `All Subprojects (${projects.filter(p => p.parentId).length})` : `All Subprojects (${availableSubProjects.length})`)}
                </strong>
              </div>

              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid #475569',
                padding: '3px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: '#E2E8F0',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ color: '#94A3B8' }}>Period:</span>
                <strong style={{ color: '#FCD34D' }}>
                  {getPeriodLabel(selectedPeriod)}
                </strong>
              </div>
            </div>
          </div>

          {/* Right Status / Actions Block */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            {/* Portfolio Health Badge */}
            <div 
              style={{ position: 'relative', cursor: 'pointer' }}
              onMouseEnter={() => setShowHealthTooltip(true)}
              onMouseLeave={() => setShowHealthTooltip(false)}
            >
              <div style={{
                background: health.badgeColor === 'green' ? 'rgba(16, 185, 129, 0.15)' : (health.badgeColor === 'red' ? 'rgba(239, 68, 68, 0.15)' : (health.badgeColor === 'amber' ? 'rgba(245, 158, 11, 0.15)' : (health.badgeColor === 'blue' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(148, 163, 184, 0.15)'))),
                border: `1px solid ${health.badgeColor === 'green' ? '#10B981' : (health.badgeColor === 'red' ? '#EF4444' : (health.badgeColor === 'amber' ? '#F59E0B' : (health.badgeColor === 'blue' ? '#0284C7' : '#64748B')))}`,
                borderRadius: '8px',
                padding: '6px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  background: health.badgeColor === 'green' ? '#10B981' : (health.badgeColor === 'red' ? '#EF4444' : (health.badgeColor === 'amber' ? '#F59E0B' : (health.badgeColor === 'blue' ? '#38BDF8' : '#94A3B8'))),
                  boxShadow: `0 0 6px ${health.badgeColor === 'green' ? '#10B981' : (health.badgeColor === 'red' ? '#EF4444' : (health.badgeColor === 'amber' ? '#F59E0B' : (health.badgeColor === 'blue' ? '#38BDF8' : '#94A3B8')))}`
                }} />
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>
                    Portfolio Health
                  </div>
                  <div style={{ 
                    fontSize: '0.90rem', 
                    fontWeight: 700, 
                    color: health.badgeColor === 'green' ? '#34D399' : (health.badgeColor === 'red' ? '#F87171' : (health.badgeColor === 'amber' ? '#FBBF24' : (health.badgeColor === 'blue' ? '#38BDF8' : '#CBD5E1'))) 
                  }}>
                    {health.status}
                  </div>
                </div>
                <HelpCircle size={13} color="#94A3B8" />
              </div>

              {/* Health Breakdown Tooltip */}
              {showHealthTooltip && (
                <div style={{
                  position: 'absolute',
                  top: '110%',
                  right: 0,
                  width: '320px',
                  background: '#0F172A',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
                  zIndex: 100
                }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>
                    Data-Driven Health Criteria
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: '10px' }}>
                    {health.summary}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {health.criteria.map((c, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                        <span style={{ color: '#CBD5E1' }}>{c.name} ({c.threshold || c.target})</span>
                        <strong style={{ color: c.met === true ? '#34D399' : (c.met === false ? '#F87171' : '#94A3B8') }}>{c.actual}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Refresh State Indicator & Manual Refresh Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.74rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} />
                {loading ? 'Loading capability intelligence...' : (syncing ? 'Refreshing live metrics...' : `Updated ${getRelativeTimeString(lastRefreshed)}`)}
              </span>
              <button
                onClick={() => fetchCockpitData(true)}
                disabled={loading || syncing}
                title="Refresh real-time portfolio metrics"
                style={{
                  background: 'rgba(51, 65, 85, 0.8)',
                  border: '1px solid #475569',
                  color: '#F8FAFC',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: loading || syncing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background 0.2s'
                }}
              >
                <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. ENTERPRISE FILTER BAR & SCOPE CONTEXT (TIGHTENED) ────────────────────────── */}
      <div style={{
        background: '#1E293B',
        border: '1px solid #334155',
        borderRadius: '10px',
        padding: '10px 16px',
        marginBottom: '16px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={15} color="#38BDF8" />
          <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#FFFFFF' }}>
            Portfolio Scope Filter:
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          {/* Project Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '0.76rem', color: '#94A3B8', fontWeight: 600 }}>Project:</label>
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setSelectedSubProjectId('all');
              }}
              style={{
                background: '#0F172A',
                color: '#F8FAFC',
                border: '1px solid #475569',
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '0.80rem',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="all">All Authorized Projects ({projects.filter(p => !p.parentId).length})</option>
              {projects.filter(p => !p.parentId).map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.project_code || 'PRJ'})</option>
              ))}
            </select>
          </div>

          {/* Subproject Selector */}
          {availableSubProjects.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '0.76rem', color: '#94A3B8', fontWeight: 600 }}>Subproject:</label>
              <select
                value={selectedSubProjectId}
                onChange={(e) => setSelectedSubProjectId(e.target.value)}
                style={{
                  background: '#0F172A',
                  color: '#F8FAFC',
                  border: '1px solid #475569',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '0.80rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="all">All Subprojects ({availableSubProjects.length})</option>
                {availableSubProjects.map(sp => (
                  <option key={sp.id} value={sp.id}>{sp.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Period Selector (All 7 Authoritative Options, Default: current_month) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '0.76rem', color: '#94A3B8', fontWeight: 600 }}>Period:</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              style={{
                background: '#0F172A',
                color: '#F8FAFC',
                border: '1px solid #475569',
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '0.80rem',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="current_month">Current Month (Sep 2026)</option>
              <option value="previous_month">Previous Month (Aug 2026)</option>
              <option value="current_quarter">Current Quarter (Q3 2026)</option>
              <option value="previous_quarter">Previous Quarter (Q2 2026)</option>
              <option value="current_fy">Current FY (2026-2027)</option>
              <option value="all_time">All Time</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(selectedProjectId !== 'all' || selectedSubProjectId !== 'all' || selectedPeriod !== 'current_month') && (
            <button
              onClick={() => {
                setSelectedProjectId('all');
                setSelectedSubProjectId('all');
                setSelectedPeriod('current_month');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#38BDF8',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Error Banner if any */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid #EF4444',
          color: '#FCA5A5',
          padding: '12px 18px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} color="#EF4444" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{error}</span>
          </div>
          <button
            onClick={() => fetchCockpitData()}
            style={{
              background: '#EF4444',
              color: '#FFFFFF',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ─── 3. ATTENTION REQUIRED SECTION (MANDATORY DECISION INTELLIGENCE) ── */}
      <div style={{
        background: '#0F172A',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '18px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
                ATTENTION REQUIRED
              </span>
              <span style={{
                background: attentionItems.length > 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                color: attentionItems.length > 0 ? '#FBBF24' : '#34D399',
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '10px'
              }}>
                {attentionItems.length} SIGNAL{attentionItems.length === 1 ? '' : 'S'}
              </span>
            </div>
            <p style={{ fontSize: '0.76rem', color: '#94A3B8', margin: '2px 0 0 0' }}>
              Diagnostic indicators: Assessment Risk: <strong style={{ color: '#F87171' }}>{kpis.assessmentRiskCount || 0}</strong> | Attendance Risk: <strong style={{ color: '#FBBF24' }}>{kpis.attendanceRiskCount || 0}</strong> (Unique learners requiring attention: <strong style={{ color: '#38BDF8' }}>{kpis.skillDeficitsCount || 0}</strong>)
            </p>
          </div>
        </div>

        {attentionItems.length === 0 ? (
          health.status === 'Insufficient Data' ? (
            <div style={{
              background: 'rgba(148, 163, 184, 0.1)',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              borderRadius: '8px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <HelpCircle size={18} color="#94A3B8" />
              <span style={{ fontSize: '0.82rem', color: '#CBD5E1', fontWeight: 600 }}>
                Insufficient delivery or evaluation evidence in the selected period to assess operational health. Select a broader period or record live training delivery.
              </span>
            </div>
          ) : (
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <CheckCircle2 size={18} color="#10B981" />
              <span style={{ fontSize: '0.82rem', color: '#6EE7B7', fontWeight: 600 }}>
                All capability indicators are currently on track. Workforce attendance and pass benchmarks are fully met.
              </span>
            </div>
          )
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
            {attentionItems.map((item, idx) => {
              const isCrit = item.severity === 'critical';
              const isAmber = item.severity === 'amber';
              const isGreen = item.severity === 'green';

              const cardBg = isCrit ? 'rgba(239, 68, 68, 0.10)' : (isAmber ? 'rgba(245, 158, 11, 0.10)' : 'rgba(16, 185, 129, 0.10)');
              const cardBorder = isCrit ? '#EF4444' : (isAmber ? '#F59E0B' : '#10B981');
              const iconColor = isCrit ? '#F87171' : (isAmber ? '#FBBF24' : '#34D399');

              return (
                <div
                  key={idx}
                  style={{
                    background: cardBg,
                    border: `1px solid ${cardBorder}50`,
                    borderLeft: `4px solid ${cardBorder}`,
                    borderRadius: '8px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    {isCrit ? <AlertTriangle size={17} color={iconColor} /> : (isAmber ? <AlertCircle size={17} color={iconColor} /> : <Award size={17} color={iconColor} />)}
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#CBD5E1', marginTop: '2px', lineHeight: '1.3' }}>
                        {item.description}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                    <button
                      onClick={() => {
                        if (item.actionTab) {
                          setActiveTab(item.actionTab);
                          if (item.actionFilter) setLearnerFilter(item.actionFilter);
                        } else if (item.actionRoute) {
                          navigate(getDrillDownUrl(item.actionRoute));
                        }
                      }}
                      style={{
                        background: isCrit ? '#EF4444' : (isAmber ? '#D97706' : '#059669'),
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '4px 10px',
                        borderRadius: '5px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {item.actionLabel}
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 4. STRUCTURED 9 REAL DATABASE KPIS (GROUPED ARCHITECTURE) ───────── */}
      
      {/* GROUP A: PORTFOLIO & WORKFORCE */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
          Portfolio &amp; Framework Infrastructure
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          
          {/* KPI 1: Total Learners */}
          <div 
            onClick={() => setActiveTab('learners')}
            style={{
              background: '#1E293B',
              border: '1px solid #334155',
              borderTop: '3px solid #6366F1',
              borderRadius: '10px',
              padding: '14px 16px',
              cursor: 'pointer',
              transition: 'transform 0.15s, border-color 0.15s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>
                  Total Learners
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#FFFFFF', marginTop: '3px' }}>
                  {loading ? '—' : kpis.totalLearners}
                </div>
              </div>
              <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '7px', borderRadius: '7px' }}>
                <Users size={18} color="#818CF8" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.72rem' }}>
              <span style={{ color: '#94A3B8' }}>Baseline: Enrolled workforce</span>
              <span style={{ color: '#38BDF8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                View Roster <ArrowUpRight size={11} />
              </span>
            </div>
          </div>

          {/* KPI 2: Active Modules */}
          <div 
            onClick={() => setActiveTab('framework')}
            style={{
              background: '#1E293B',
              border: '1px solid #334155',
              borderTop: '3px solid #0284C7',
              borderRadius: '10px',
              padding: '14px 16px',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>
                  Active Modules
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#FFFFFF', marginTop: '3px' }}>
                  {loading ? '—' : kpis.activeModules}
                </div>
              </div>
              <div style={{ background: 'rgba(2, 132, 199, 0.15)', padding: '7px', borderRadius: '7px' }}>
                <BookOpen size={18} color="#38BDF8" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.72rem' }}>
              <span style={{ color: '#94A3B8' }}>Baseline: Capability catalog</span>
              <span style={{ color: '#38BDF8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                View Framework <ArrowUpRight size={11} />
              </span>
            </div>
          </div>

          {/* KPI 3: Active Assessments */}
          <div 
            onClick={() => navigate(getDrillDownUrl('/builder'))}
            style={{
              background: '#1E293B',
              border: '1px solid #334155',
              borderTop: '3px solid #D97706',
              borderRadius: '10px',
              padding: '14px 16px',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>
                  Active Assessments
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#FFFFFF', marginTop: '3px' }}>
                  {loading ? '—' : kpis.activeQuizzes}
                </div>
              </div>
              <div style={{ background: 'rgba(217, 119, 6, 0.15)', padding: '7px', borderRadius: '7px' }}>
                <Zap size={18} color="#FBBF24" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.72rem' }}>
              <span style={{ color: '#94A3B8' }}>Baseline: Authored framework</span>
              <span style={{ color: '#38BDF8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                Assessment Studio <ArrowUpRight size={11} />
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* GROUP B: DELIVERY & EXECUTION */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
          Delivery &amp; Participation Telemetry
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          
          {/* KPI 4: Curriculum Completion */}
          <div 
            onClick={() => navigate(getDrillDownUrl('/trainings'))}
            style={{
              background: '#1E293B',
              border: '1px solid #334155',
              borderTop: '3px solid #059669',
              borderRadius: '10px',
              padding: '14px 16px',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>
                  Curriculum Completion
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#FFFFFF', marginTop: '3px' }}>
                  {loading ? '—' : (kpis.hasCurriculumData && kpis.curriculumCompletionRate !== null ? `${kpis.curriculumCompletionRate}%` : '—')}
                </div>
              </div>
              <div style={{ background: 'rgba(5, 150, 105, 0.15)', padding: '7px', borderRadius: '7px' }}>
                <CheckCircle2 size={18} color="#34D399" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.72rem' }}>
              <span style={{ color: '#94A3B8' }} title="Percentage of assigned curriculum requirements completed by enrolled learners within the selected scope and period.">
                Benchmark: &gt;= 70%
              </span>
              <span style={{ color: kpis.hasCurriculumData ? (kpis.curriculumCompletionRate >= 70 ? '#34D399' : '#FBBF24') : '#94A3B8', fontWeight: 600 }}>
                {kpis.hasCurriculumData ? (kpis.curriculumCompletionRate >= 70 ? 'On Track' : 'In Progress') : 'No curriculum assigned'}
              </span>
            </div>
          </div>

          {/* KPI 5: Attendance Rate */}
          <div 
            onClick={() => navigate(getDrillDownUrl('/attendance'))}
            style={{
              background: '#1E293B',
              border: '1px solid #334155',
              borderTop: '3px solid #0891B2',
              borderRadius: '10px',
              padding: '14px 16px',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>
                  Attendance Rate
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#FFFFFF', marginTop: '3px' }}>
                  {loading ? '—' : (kpis.hasAttendanceData && kpis.attendanceRate !== null ? `${kpis.attendanceRate}%` : '—')}
                </div>
              </div>
              <div style={{ background: 'rgba(8, 145, 178, 0.15)', padding: '7px', borderRadius: '7px' }}>
                <Calendar size={18} color="#38BDF8" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.72rem' }}>
              <span style={{ color: '#94A3B8' }}>Certification threshold: &gt;= 80%</span>
              <span style={{ color: kpis.hasAttendanceData ? (kpis.attendanceRate >= 80 ? '#34D399' : '#FBBF24') : '#94A3B8', fontWeight: 600 }}>
                {kpis.hasAttendanceData ? (kpis.attendanceRate >= 80 ? 'Threshold Met' : 'Below Standard') : 'No attendance records'}
              </span>
            </div>
          </div>

          {/* KPI 9: Learners Requiring Attention */}
          <div 
            onClick={() => {
              setActiveTab('learners');
              setLearnerFilter('deficit');
            }}
            style={{
              background: '#1E293B',
              border: '1px solid #334155',
              borderTop: `3px solid ${kpis.skillDeficitsCount > 0 ? '#DC2626' : '#059669'}`,
              borderRadius: '10px',
              padding: '14px 16px',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>
                  Learners Requiring Attention
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 800, color: kpis.skillDeficitsCount > 0 ? '#F87171' : '#34D399', marginTop: '3px' }}>
                  {loading ? '—' : kpis.skillDeficitsCount}
                </div>
              </div>
              <div style={{ background: kpis.skillDeficitsCount > 0 ? 'rgba(220, 38, 38, 0.15)' : 'rgba(5, 150, 105, 0.15)', padding: '7px', borderRadius: '7px' }}>
                <AlertTriangle size={18} color={kpis.skillDeficitsCount > 0 ? '#F87171' : '#34D399'} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.72rem' }}>
              <span style={{ color: '#CBD5E1' }}>Score &lt;70% or Att &lt;80%</span>
              <span style={{ color: '#38BDF8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                View Triage <ArrowUpRight size={11} />
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* GROUP C: OUTCOMES & CERTIFICATION */}
      <div style={{ marginBottom: '22px' }}>
        <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
          Outcome Mastery &amp; Validated Credentials
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          
          {/* KPI 6: Assessment Average */}
          <div 
            onClick={() => navigate(getDrillDownUrl('/gamification'))}
            style={{
              background: '#1E293B',
              border: '1px solid #334155',
              borderTop: '3px solid #7C3AED',
              borderRadius: '10px',
              padding: '14px 16px',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>
                  Assessment Average
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#FFFFFF', marginTop: '3px' }}>
                  {loading ? '—' : (kpis.hasAssessmentData && kpis.assessmentAverageScore !== null ? `${kpis.assessmentAverageScore}%` : '—')}
                </div>
              </div>
              <div style={{ background: 'rgba(124, 58, 237, 0.15)', padding: '7px', borderRadius: '7px' }}>
                <TrendingUp size={18} color="#A78BFA" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.72rem' }}>
              <span style={{ color: '#94A3B8' }}>Evaluated learner average</span>
              <span style={{ 
                color: kpis.hasAssessmentData ? (kpis.assessmentAverageScore >= 70 ? '#34D399' : (kpis.assessmentAverageScore === 0 ? '#CBD5E1' : '#FBBF24')) : '#94A3B8', 
                fontWeight: 600 
              }}>
                {kpis.hasAssessmentData 
                  ? (kpis.assessmentAverageScore >= 70 
                      ? 'Proficient' 
                      : (kpis.assessmentAverageScore === 0 ? 'Evaluated learner average' : 'Needs Focus')) 
                  : 'No completed assessments'}
              </span>
            </div>
          </div>

          {/* KPI 7: Assessment Pass Rate */}
          <div 
            onClick={() => navigate(getDrillDownUrl('/gamification'))}
            style={{
              background: '#1E293B',
              border: '1px solid #334155',
              borderTop: '3px solid #DB2777',
              borderRadius: '10px',
              padding: '14px 16px',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>
                  Assessment Pass Rate
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#FFFFFF', marginTop: '3px' }}>
                  {loading ? '—' : (kpis.hasAssessmentData && kpis.assessmentPassRate !== null ? `${kpis.assessmentPassRate}%` : '—')}
                </div>
              </div>
              <div style={{ background: 'rgba(219, 39, 119, 0.15)', padding: '7px', borderRadius: '7px' }}>
                <Percent size={18} color="#F472B6" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.72rem' }}>
              <span style={{ color: '#94A3B8' }}>Passing standard: &gt;= 70%</span>
              <span style={{ color: kpis.hasAssessmentData ? (kpis.assessmentPassRate >= 70 ? '#34D399' : '#F87171') : '#94A3B8', fontWeight: 600 }}>
                {kpis.hasAssessmentData ? (kpis.assessmentPassRate >= 70 ? 'Pass Standard Met' : 'Remediation Needed') : 'No completed assessments'}
              </span>
            </div>
          </div>

          {/* KPI 8: Certificates Issued */}
          <div 
            onClick={() => navigate(getDrillDownUrl('/certificates'))}
            style={{
              background: '#1E293B',
              border: '1px solid #334155',
              borderTop: '3px solid #F59E0B',
              borderRadius: '10px',
              padding: '14px 16px',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>
                  Certificates Issued
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#FFFFFF', marginTop: '3px' }}>
                  {loading ? '—' : kpis.certificatesIssued}
                </div>
              </div>
              <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '7px', borderRadius: '7px' }}>
                <Award size={18} color="#FCD34D" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.72rem' }}>
              <span style={{ color: '#94A3B8' }}>Portfolio baseline</span>
              <span style={{ color: '#38BDF8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                Certification Vault <ArrowUpRight size={11} />
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ─── 5. CAPABILITY PERFORMANCE SECTION & ACCESSIBLE TABS ─────────────── */}
      <div style={{
        background: '#0F172A',
        border: '1px solid #334155',
        borderRadius: '14px',
        padding: '24px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ marginBottom: '18px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
            CAPABILITY PERFORMANCE
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '4px', margin: 0 }}>
            Curriculum execution, trainer delivery evaluations, and learner diagnostic matrices
          </p>
        </div>

        {/* Tab Navigation with High Contrast & Underlines */}
        <div style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #334155',
          marginBottom: '20px',
          overflowX: 'auto'
        }}>
          {[
            { id: 'framework', label: 'Capability Framework', icon: <BookOpen size={16} /> },
            { id: 'trainers', label: 'Trainer Performance', icon: <GraduationCap size={16} /> },
            { id: 'learners', label: 'Learner Competency', icon: <Users size={16} /> },
            { id: 'portfolio', label: 'Portfolio Structure', icon: <Layers size={16} /> }
          ].map(t => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 18px',
                  background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '3px solid #6366F1' : '3px solid transparent',
                  color: isActive ? '#FFFFFF' : '#94A3B8',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  borderRadius: '6px 6px 0 0',
                  transition: 'all 0.15s'
                }}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: CAPABILITY FRAMEWORK */}
        {activeTab === 'framework' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '0.85rem', color: '#CBD5E1', fontWeight: 600 }} title="Percentage of assigned curriculum requirements completed by enrolled learners within the selected scope and period.">
                Training Modules &amp; Curriculum Execution
              </div>
              <Link 
                to={getDrillDownUrl('/trainings')}
                style={{
                  color: '#38BDF8',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Manage Training Frameworks <ExternalLink size={13} />
              </Link>
            </div>

            {capabilityMatrix.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: '#94A3B8', fontSize: '0.88rem' }}>
                No training modules found within this capability portfolio scope.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                  <thead>
                    <tr style={{ background: '#1E293B', color: '#94A3B8', textAlign: 'left' }}>
                      <th style={{ padding: '12px 14px', borderRadius: '6px 0 0 6px' }}>Training Module</th>
                      <th style={{ padding: '12px 14px' }}>Type</th>
                      <th style={{ padding: '12px 14px' }}>Project Portfolio</th>
                      <th style={{ padding: '12px 14px' }}>Duration</th>
                      <th style={{ padding: '12px 14px' }}>Completion %</th>
                      <th style={{ padding: '12px 14px', borderRadius: '0 6px 6px 0' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {capabilityMatrix.map((m, i) => (
                      <tr 
                        key={m.id || i}
                        style={{
                          borderBottom: '1px solid #334155',
                          transition: 'background 0.15s'
                        }}
                      >
                        <td style={{ padding: '14px', fontWeight: 600, color: '#FFFFFF' }}>{m.title}</td>
                        <td style={{ padding: '14px', color: '#CBD5E1' }}>{m.type}</td>
                        <td style={{ padding: '14px', color: '#94A3B8' }}>{m.projectName}</td>
                        <td style={{ padding: '14px', color: '#94A3B8' }}>{m.duration}</td>
                        <td style={{ padding: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              flex: 1,
                              height: '6px',
                              background: '#334155',
                              borderRadius: '3px',
                              overflow: 'hidden',
                              minWidth: '60px'
                            }}>
                              <div style={{
                                width: `${m.completionPct}%`,
                                height: '100%',
                                background: m.completionPct >= 80 ? '#10B981' : (m.completionPct >= 50 ? '#F59E0B' : '#EF4444')
                              }} />
                            </div>
                            <span style={{ fontWeight: 700, color: '#FFFFFF', minWidth: '32px' }}>{m.completionPct}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: m.status === 'Mastered' ? 'rgba(16, 185, 129, 0.15)' : (m.status === 'In Progress' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
                            color: m.status === 'Mastered' ? '#34D399' : (m.status === 'In Progress' ? '#FBBF24' : '#F87171'),
                            border: `1px solid ${m.status === 'Mastered' ? '#10B981' : (m.status === 'In Progress' ? '#F59E0B' : '#EF4444')}40`
                          }}>
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TRAINER PERFORMANCE */}
        {activeTab === 'trainers' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '0.85rem', color: '#CBD5E1', fontWeight: 600 }}>
                Trainer Performance &amp; Session Delivery
              </div>
              <Link 
                to={getDrillDownUrl('/schedule')}
                style={{
                  color: '#38BDF8',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Schedule Oversight <ExternalLink size={13} />
              </Link>
            </div>

            {trainerDelivery.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: '#94A3B8', fontSize: '0.88rem' }}>
                No training sessions recorded by trainers in this portfolio scope.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                  <thead>
                    <tr style={{ background: '#1E293B', color: '#94A3B8', textAlign: 'left' }}>
                      <th style={{ padding: '12px 14px', borderRadius: '6px 0 0 6px' }}>Trainer Name</th>
                      <th style={{ padding: '12px 14px' }}>Email</th>
                      <th style={{ padding: '12px 14px' }}>Sessions Delivered</th>
                      <th style={{ padding: '12px 14px', borderRadius: '0 6px 6px 0' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainerDelivery.map((tr, i) => (
                      <tr key={tr.id || i} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '14px', fontWeight: 600, color: '#FFFFFF' }}>{tr.name}</td>
                        <td style={{ padding: '14px', color: '#CBD5E1' }}>{tr.email}</td>
                        <td style={{ padding: '14px', fontWeight: 700, color: '#38BDF8' }}>{tr.sessionsHosted} sessions</td>
                        <td style={{ padding: '14px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#34D399',
                            border: '1px solid rgba(16, 185, 129, 0.3)'
                          }}>
                            {tr.status || 'Active Delivery'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LEARNER COMPETENCY */}
        {activeTab === 'learners' && (
          <div>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}>
              {/* Search Bar */}
              <div style={{ position: 'relative', width: '320px' }}>
                <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                <input
                  type="text"
                  placeholder="Search your capability portfolio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '8px 12px 8px 36px',
                    color: '#FFFFFF',
                    fontSize: '0.82rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Triage Pills */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {[
                  { id: 'all', label: `All (${participants.length})` },
                  { id: 'deficit', label: `Attention Required (${participants.filter(p => p.capabilityStatus === 'Deficit' || (p.avgScore !== null && p.avgScore < 70) || p.attendanceRate < 80).length})` },
                  { id: 'certified', label: `Certified (${participants.filter(p => p.certified).length})` },
                  { id: 'proficient', label: `Proficient (${participants.filter(p => p.capabilityStatus === 'Mastery' || p.capabilityStatus === 'Proficient').length})` }
                ].map(pill => (
                  <button
                    key={pill.id}
                    onClick={() => setLearnerFilter(pill.id)}
                    style={{
                      background: learnerFilter === pill.id ? '#4338CA' : '#1E293B',
                      color: learnerFilter === pill.id ? '#FFFFFF' : '#94A3B8',
                      border: learnerFilter === pill.id ? '1px solid #6366F1' : '1px solid #334155',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredParticipants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: '#94A3B8', fontSize: '0.88rem' }}>
                No participants match the selected filter criteria.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                  <thead>
                    <tr style={{ background: '#1E293B', color: '#94A3B8', textAlign: 'left' }}>
                      <th style={{ padding: '12px 14px', borderRadius: '6px 0 0 6px' }}>Emp ID</th>
                      <th style={{ padding: '12px 14px' }}>Learner Name</th>
                      <th style={{ padding: '12px 14px' }}>Role</th>
                      <th style={{ padding: '12px 14px' }}>Project</th>
                      <th style={{ padding: '12px 14px' }}>Attendance</th>
                      <th style={{ padding: '12px 14px' }}>Avg Score</th>
                      <th style={{ padding: '12px 14px' }}>Completion</th>
                      <th style={{ padding: '12px 14px' }}>Status</th>
                      <th style={{ padding: '12px 14px', borderRadius: '0 6px 6px 0', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParticipants.map((p) => {
                      const isDeficit = p.capabilityStatus === 'Deficit' || (p.avgScore !== null && p.avgScore < 70) || p.attendanceRate < 80;
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid #334155' }}>
                          <td style={{ padding: '14px', color: '#94A3B8', fontFamily: 'monospace' }}>{p.employeeId}</td>
                          <td style={{ padding: '14px', fontWeight: 600, color: '#FFFFFF' }}>{p.name}</td>
                          <td style={{ padding: '14px', color: '#CBD5E1' }}>{p.designation}</td>
                          <td style={{ padding: '14px', color: '#94A3B8' }}>{p.projectName}</td>
                          <td style={{ padding: '14px', fontWeight: 700, color: p.attendanceRate >= 80 ? '#34D399' : '#F87171' }}>
                            {p.attendanceRate}%
                          </td>
                          <td style={{ padding: '14px', fontWeight: 700, color: p.avgScore !== null ? (p.avgScore >= 70 ? '#34D399' : '#F87171') : '#94A3B8' }}>
                            {p.avgScore !== null ? `${p.avgScore}%` : '—'}
                          </td>
                          <td style={{ padding: '14px', color: '#CBD5E1' }}>{p.curriculumProgress}%</td>
                          <td style={{ padding: '14px' }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: isDeficit ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: isDeficit ? '#F87171' : '#34D399',
                              border: `1px solid ${isDeficit ? '#EF4444' : '#10B981'}40`
                            }}>
                              {isDeficit ? 'Needs Coaching' : (p.certified ? 'Certified' : 'Proficient')}
                            </span>
                          </td>
                          <td style={{ padding: '14px', textAlign: 'right' }}>
                            <button
                              onClick={() => setInspectParticipant(p)}
                              style={{
                                background: '#334155',
                                color: '#FFFFFF',
                                border: 'none',
                                padding: '5px 12px',
                                borderRadius: '6px',
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              360 Profile
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

        {/* TAB 4: PORTFOLIO STRUCTURE */}
        {activeTab === 'portfolio' && (
          <div>
            <div style={{ fontSize: '0.85rem', color: '#CBD5E1', fontWeight: 600, marginBottom: '14px' }}>
              Authorized Capability Hierarchy &amp; Initiatives
            </div>

            {portfolioProjects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: '#94A3B8', fontSize: '0.88rem' }}>
                No active projects assigned in this portfolio scope.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                {portfolioProjects.map((proj) => (
                  <div
                    key={proj.id}
                    style={{
                      background: '#1E293B',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: '#38BDF8', fontWeight: 700, fontFamily: 'monospace' }}>
                          {proj.project_code || 'PRJ'}
                        </span>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34D399'
                        }}>
                          {proj.status || 'Active'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#FFFFFF', marginTop: '6px' }}>
                        {proj.name}
                      </div>
                    </div>

                    <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                        {proj.parentId ? 'Child Subproject' : 'Base Project'}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedProjectId(proj.parentId || proj.id);
                          if (proj.parentId) setSelectedSubProjectId(proj.id);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#38BDF8',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        Filter Scope
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ─── 6. PARTICIPANT 360 DIAGNOSTIC MODAL ────────────────────────────── */}
      {inspectParticipant && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#0F172A',
            border: '1px solid #334155',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '650px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #334155', paddingBottom: '16px', marginBottom: '18px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#38BDF8', fontWeight: 800, textTransform: 'uppercase' }}>
                  Participant 360 Diagnostic Profile
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: '4px 0 0 0' }}>
                  {inspectParticipant.name}
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '2px' }}>
                  {inspectParticipant.designation} • {inspectParticipant.projectName} (ID: {inspectParticipant.employeeId})
                </div>
              </div>
              <button
                onClick={() => setInspectParticipant(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Diagnostic Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#1E293B', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>ATTENDANCE RATE</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: inspectParticipant.attendanceRate >= 80 ? '#34D399' : '#F87171', marginTop: '4px' }}>
                  {inspectParticipant.attendanceRate}%
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '2px' }}>Benchmark: &gt;= 80%</div>
              </div>

              <div style={{ background: '#1E293B', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>ASSESSMENT AVERAGE</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: inspectParticipant.avgScore >= 70 ? '#34D399' : '#F87171', marginTop: '4px' }}>
                  {inspectParticipant.avgScore}%
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '2px' }}>Passing: &gt;= 70%</div>
              </div>

              <div style={{ background: '#1E293B', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>CERTIFICATION</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: inspectParticipant.certified ? '#FCD34D' : '#94A3B8', marginTop: '4px' }}>
                  {inspectParticipant.certified ? 'Certified' : 'Eligible Pending'}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '2px' }}>
                  {inspectParticipant.certificateId || 'Not Issued'}
                </div>
              </div>
            </div>

            {/* Coaching Status Recommendation */}
            <div style={{
              background: inspectParticipant.avgScore < 70 || inspectParticipant.attendanceRate < 80 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
              border: `1px solid ${inspectParticipant.avgScore < 70 || inspectParticipant.attendanceRate < 80 ? '#EF4444' : '#10B981'}40`,
              borderRadius: '10px',
              padding: '14px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FFFFFF' }}>
                T&amp;D Capability Coaching Assessment:
              </div>
              <div style={{ fontSize: '0.76rem', color: '#CBD5E1', marginTop: '4px', lineHeight: '1.4' }}>
                {inspectParticipant.avgScore < 70 || inspectParticipant.attendanceRate < 80
                  ? `Learner requires remediation in core assessment areas (Current: ${inspectParticipant.avgScore}%) or attendance compliance (${inspectParticipant.attendanceRate}%). Certification issuance is held until thresholds are met.`
                  : `Learner has achieved proficiency benchmarks across training and assessment evaluations. Eligible for certification issuance via approved templates.`}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setInspectParticipant(null)}
                style={{
                  background: '#334155',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              {inspectParticipant.certified ? (
                <Link
                  to="/certificates"
                  style={{
                    background: '#D97706',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  View in Vault <ExternalLink size={14} />
                </Link>
              ) : (
                <Link
                  to="/certificates"
                  style={{
                    background: '#4338CA',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  Evaluate Eligibility <ExternalLink size={14} />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
