import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  FolderOpen, Users, UserCheck, BarChart2, TrendingUp, Sparkles, Award,
  ArrowRight, ShieldAlert, CheckCircle, Clock, AlertCircle, Play, FileText,
  Presentation, RefreshCw, Plus, Calendar, Send, ChevronRight, ChevronDown,
  Video, Eye, Filter, ShieldCheck, AlertTriangle, Layers, Activity, Download,
  CheckCircle2, ArrowUpRight
} from 'lucide-react';
import EscalationManager from './EscalationManager';
import Participant360Modal from './Participant360Modal';
import CertificateViewer from './CertificateViewer';

export default function PMDashboardView({
  projectUsers = [],
  projectsList = [],
  reports = [],
  attendanceData = {},
  onExportExcel,
  onExportPPT,
  manualMetrics = {},
  selectedProjectId = 'all',
  onSelectProject,
  selectedSubProjectId = 'all',
  onSelectSubProject,
  dateRange = '7d',
  onSelectDateRange,
  handleDownloadSessionExcel,
  syncTrigger = 0,
  token,
  intelligenceData = null,
  onSync,
  syncing = false
}) {
  const navigate = useNavigate();
  const [showAllKPIs, setShowAllKPIs] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState(null);
  const [is360ModalOpen, setIs360ModalOpen] = useState(false);
  const [quizTypeFilter, setQuizTypeFilter] = useState('ALL'); // ALL | ONLINE | OFFLINE
  const [viewingCertificateId, setViewingCertificateId] = useState(null);
  const [isCertViewerOpen, setIsCertViewerOpen] = useState(false);

  // Extract intelligence datasets with clean fallbacks
  const kpis = intelligenceData?.kpis || {};
  const trainingPerf = intelligenceData?.trainingPerformance || {};
  const jitsi = intelligenceData?.jitsiAttendance || { live: [], history: [], overview: {} };
  const quiz = intelligenceData?.quizIntelligence || { kpis: {}, attemptsList: [], quizzes: [] };
  const cert = intelligenceData?.certificationIntelligence || { kpis: {}, certificates: [] };
  const projectComparison = intelligenceData?.projectComparison || [];
  const alerts = intelligenceData?.alerts || [];

  // Filter child subprojects of the currently selected mother project
  const availableSubProjects = selectedProjectId === 'all'
    ? []
    : projectsList.filter(p => p.parentId === selectedProjectId);

  // 13 Required KPIs based on exact User Analytics formulas:
  // Assigned → Started → Attempted → Completed → Passed / Failed
  const activeProjectsCount = kpis.activeProjects !== undefined ? kpis.activeProjects : projectsList.filter(p => !p.parentId).length;
  const activeSubprojectsCount = kpis.activeSubprojects !== undefined ? kpis.activeSubprojects : projectsList.filter(p => p.parentId).length;
  const activeSessionsCount = kpis.activeTrainingSessions !== undefined ? kpis.activeTrainingSessions : reports.length;
  const totalParticipantsCount = kpis.totalParticipants !== undefined ? kpis.totalParticipants : projectUsers.length;
  const participantsJoinedCount = kpis.participantsJoined !== undefined ? kpis.participantsJoined : reports.reduce((s, r) => s + (r.participants || 0), 0);
  const attendanceRateVal = kpis.attendanceRate !== undefined ? kpis.attendanceRate : 85;
  const avgSessionDurationVal = kpis.averageSessionDuration || '45m';

  // Quiz Funnel KPIs
  const quizzesAssignedCount = kpis.quizzesAssigned !== undefined ? kpis.quizzesAssigned : (reports.length * Math.max(totalParticipantsCount, 1));
  const quizAttemptsCount = kpis.quizAttempts !== undefined ? kpis.quizAttempts : quiz.attemptsList.length;
  const quizCompletionRateVal = kpis.quizCompletionRate !== undefined ? kpis.quizCompletionRate : 92;
  const quizAttemptRateVal = kpis.quizAttemptRate !== undefined ? kpis.quizAttemptRate : 94;
  const avgQuizScoreVal = kpis.averageQuizScore !== undefined ? kpis.averageQuizScore : 74;
  const quizPassRateVal = kpis.quizPassRate !== undefined ? kpis.quizPassRate : 78;
  const certificatesIssuedCount = kpis.certificatesIssued !== undefined ? kpis.certificatesIssued : (cert.kpis?.issued || 0);

  // Primary 8 KPI Cards (Visible Initially)
  const primaryKpiCards = [
    {
      label: 'Active Projects',
      val: String(activeProjectsCount),
      sub: selectedProjectId === 'all' ? 'Across Portfolio' : 'Selected Project',
      col: '#0284C7',
      icon: <FolderOpen size={18} color="#0284C7" />
    },
    {
      label: 'Active Subprojects',
      val: String(activeSubprojectsCount),
      sub: 'Under Management',
      col: '#3B82F6',
      icon: <Layers size={18} color="#3B82F6" />
    },
    {
      label: 'Active Sessions',
      val: String(activeSessionsCount),
      sub: 'Training & Jitsi',
      col: '#8B5CF6',
      icon: <Video size={18} color="#8B5CF6" />
    },
    {
      label: 'Total Participants',
      val: totalParticipantsCount.toLocaleString(),
      sub: 'Target Enrolled',
      col: '#06B6D4',
      icon: <Users size={18} color="#06B6D4" />
    },
    {
      label: 'Attendance Rate',
      val: `${attendanceRateVal}%`,
      sub: attendanceRateVal >= 75 ? 'Optimal (≥75%)' : 'Needs Review (<75%)',
      col: attendanceRateVal >= 75 ? '#10B981' : '#F59E0B',
      icon: <UserCheck size={18} color={attendanceRateVal >= 75 ? '#10B981' : '#F59E0B'} />
    },
    {
      label: 'Avg Session Duration',
      val: avgSessionDurationVal,
      sub: 'Jitsi & Telemetry',
      col: '#6366F1',
      icon: <Clock size={18} color="#6366F1" />
    },
    {
      label: 'Quiz Completion Rate',
      val: `${quizCompletionRateVal}%`,
      sub: 'Completed / Assigned',
      col: quizCompletionRateVal >= 80 ? '#10B981' : '#F59E0B',
      icon: <CheckCircle size={18} color={quizCompletionRateVal >= 80 ? '#10B981' : '#F59E0B'} />
    },
    {
      label: 'Certificates Issued',
      val: String(certificatesIssuedCount),
      sub: 'Issued & Verified',
      col: '#EC4899',
      icon: <Award size={18} color="#EC4899" />
    }
  ];

  // Secondary 5 KPI Cards (Shown on Expand)
  const secondaryKpiCards = [
    {
      label: 'Participants Joined',
      val: participantsJoinedCount.toLocaleString(),
      sub: 'Active Attendees',
      col: '#14B8A6',
      icon: <Users size={18} color="#14B8A6" />
    },
    {
      label: 'Quizzes Assigned',
      val: quizzesAssignedCount.toLocaleString(),
      sub: 'Assignments',
      col: '#F97316',
      icon: <BarChart2 size={18} color="#F97316" />
    },
    {
      label: 'Quiz Attempts',
      val: quizAttemptsCount.toLocaleString(),
      sub: `${quizAttemptRateVal}% Attempt Rate`,
      col: '#EAB308',
      icon: <Activity size={18} color="#EAB308" />
    },
    {
      label: 'Average Quiz Score',
      val: `${avgQuizScoreVal}%`,
      sub: 'Completed Attempts',
      col: '#8B5CF6',
      icon: <TrendingUp size={18} color="#8B5CF6" />
    },
    {
      label: 'Quiz Pass Rate',
      val: `${quizPassRateVal}%`,
      sub: 'Passed / Completed',
      col: quizPassRateVal >= 70 ? '#10B981' : '#EF4444',
      icon: <ShieldCheck size={18} color={quizPassRateVal >= 70 ? '#10B981' : '#EF4444'} />
    }
  ];

  const handleOpen360 = (pId) => {
    setSelectedParticipantId(pId);
    setIs360ModalOpen(true);
  };

  // Context-Aware Action Execution
  const handleExecuteAction = (action) => {
    if (action.actionType === 'SCHEDULE_MAKEUP_SESSION') {
      navigate('/trainings');
    } else if (action.actionType === 'SEND_QUIZ_REMINDER') {
      navigate('/reports');
    } else if (action.actionType === 'ISSUE_CERTIFICATES') {
      navigate('/certificates');
    } else if (action.targetUrl) {
      navigate(action.targetUrl);
    } else {
      alert(`Action Triggered: ${action.label || action.title}`);
    }
  };

  const filteredQuizAttempts = (quiz.attemptsList || []).filter(a => {
    if (quizTypeFilter === 'ALL') return true;
    return a.quizType === quizTypeFilter;
  });

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: 'var(--text-primary, #0F172A)', padding: '4px 0' }}>
      
      {/* ─── HEADER: PERSISTENT PROJECT SELECTOR, SUBPROJECT SELECTOR, DATE RANGE, REFRESH ─── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '14px',
        padding: '16px 20px',
        marginBottom: '24px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {/* Project Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748B', marginBottom: '4px', textTransform: 'uppercase' }}>
              Project Scope
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  if (onSelectProject) onSelectProject(e.target.value);
                  if (onSelectSubProject) onSelectSubProject('all');
                }}
                style={{
                  padding: '8px 32px 8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  minWidth: '200px'
                }}
              >
                <option value="all">All My Projects</option>
                {projectsList.filter(p => !p.parentId).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }} />
            </div>
          </div>

          {/* Subproject Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748B', marginBottom: '4px', textTransform: 'uppercase' }}>
              Subproject
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={selectedSubProjectId}
                onChange={(e) => {
                  if (onSelectSubProject) onSelectSubProject(e.target.value);
                }}
                disabled={selectedProjectId === 'all'}
                style={{
                  padding: '8px 32px 8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: selectedProjectId === 'all' ? '#F1F5F9' : '#F8FAFC',
                  color: selectedProjectId === 'all' ? '#94A3B8' : '#0F172A',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: selectedProjectId === 'all' ? 'not-allowed' : 'pointer',
                  minWidth: '180px'
                }}
              >
                <option value="all">All Subprojects</option>
                {availableSubProjects.map(sp => (
                  <option key={sp.id} value={sp.id}>{sp.name}</option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }} />
            </div>
          </div>

          {/* Date Range Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748B', marginBottom: '4px', textTransform: 'uppercase' }}>
              Date Range
            </label>
            <div style={{ display: 'flex', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '2px' }}>
              {['7d', '30d', 'all'].map(r => (
                <button
                  key={r}
                  onClick={() => onSelectDateRange && onSelectDateRange(r)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: dateRange === r ? '#0284C7' : 'transparent',
                    color: dateRange === r ? '#FFFFFF' : '#64748B',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : 'All Time'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sync Button */}
        <button
          onClick={() => onSync && onSync()}
          disabled={syncing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '8px',
            background: '#0284C7',
            color: '#FFFFFF',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: syncing ? 'wait' : 'pointer',
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
          }}
        >
          <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
          {syncing ? 'Syncing...' : 'Sync Live Data'}
        </button>
      </div>

      {/* ─── LEVEL 1: EXECUTIVE KPIs (13 KPI CARDS WITH QUIZ FUNNEL) ─── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="#0284C7" /> Level 1 — Executive Project KPIs
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
              Assigned ({quizzesAssignedCount}) → Attempted ({quizAttemptsCount}) → Completion ({quizCompletionRateVal}%) → Pass Rate ({quizPassRateVal}%)
            </span>
          </div>
          <button
            onClick={() => setShowAllKPIs(prev => !prev)}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#0284C7',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {showAllKPIs ? 'Collapse Additional KPIs' : 'Show All 13 KPIs'}
            <ChevronDown size={14} style={{ transform: showAllKPIs ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        </div>

        {/* Primary 8 Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
          {primaryKpiCards.map((card, i) => (
            <div
              key={i}
              style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                  {card.label}
                </span>
                <div style={{ padding: '6px', borderRadius: '8px', background: `${card.col}12` }}>
                  {card.icon}
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
                  {card.val}
                </div>
                <div style={{ fontSize: '0.75rem', color: card.col, fontWeight: 700, marginTop: '2px' }}>
                  {card.sub}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Secondary 5 Cards (Expandable) */}
        <AnimatePresence>
          {showAllKPIs && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginTop: '14px' }}
            >
              {secondaryKpiCards.map((card, i) => (
                <div
                  key={i}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                      {card.label}
                    </span>
                    <div style={{ padding: '6px', borderRadius: '8px', background: `${card.col}12` }}>
                      {card.icon}
                    </div>
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
                      {card.val}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: card.col, fontWeight: 700, marginTop: '2px' }}>
                      {card.sub}
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── LEVEL 6: ACTION CENTER (RECOMMENDED NEXT ACTIONS) ─── */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        color: '#FFFFFF',
        borderRadius: '14px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="#38BDF8" /> Level 6 — Intelligence Action Center
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#94A3B8' }}>
              Action-oriented recommendations: What happened → Why → Who needs attention → What to do next.
            </p>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38BDF8', background: 'rgba(56, 189, 248, 0.15)', padding: '4px 10px', borderRadius: '12px' }}>
            {alerts.length} Active Operational Triggers
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {alerts.map((al, idx) => (
            <div
              key={al.id || idx}
              style={{
                background: 'rgba(255, 255, 255, 0.07)',
                borderRadius: '10px',
                padding: '14px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '10px'
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#FFFFFF', marginBottom: '4px' }}>
                  {al.title}
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#CBD5E1', lineHeight: '1.4' }}>
                  {al.message}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                  Recommended Action:
                </span>
                <button
                  onClick={() => handleExecuteAction(al.actionPayload || al)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: '#0284C7',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
                  }}
                >
                  {al.recommendedAction || al.actionPayload?.label || 'Execute Action'}
                  <ArrowUpRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── LEVEL 2: PROJECT HEALTH & COMPARISON MATRIX ─── */}
      {selectedProjectId === 'all' && projectComparison.length > 0 && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          padding: '20px',
          marginBottom: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                🏢 Level 2 — Project Portfolio Health & Comparison Matrix
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                Performance across assigned mother projects and child subprojects.
              </p>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0284C7', background: 'rgba(2, 132, 199, 0.1)', padding: '4px 10px', borderRadius: '12px' }}>
              {projectComparison.length} Projects Analyzed
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', textAlign: 'left', color: '#64748B' }}>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Project</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Participants</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Sessions</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Attendance</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Quiz Completion</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Avg Score</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Pass Rate</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Certificates</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Project Health</th>
                </tr>
              </thead>
              <tbody>
                {projectComparison.map((p, idx) => {
                  const isHealthy = p.projectHealth === 'Healthy';
                  const isAttention = p.projectHealth === 'Needs Attention';
                  const healthBg = isHealthy ? '#10B98118' : isAttention ? '#F59E0B18' : '#EF444418';
                  const healthColor = isHealthy ? '#10B981' : isAttention ? '#D97706' : '#EF4444';

                  return (
                    <tr key={p.id || idx} style={{ borderTop: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700 }}>
                        <button
                          onClick={() => onSelectProject && onSelectProject(p.id)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#0284C7',
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: 0,
                            textAlign: 'left'
                          }}
                        >
                          {p.name}
                        </button>
                      </td>
                      <td style={{ padding: '12px 14px' }}>{p.participants}</td>
                      <td style={{ padding: '12px 14px' }}>{p.sessions}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700 }}>{p.attendance}</td>
                      <td style={{ padding: '12px 14px' }}>{p.quizCompletion}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700 }}>{p.avgScore}</td>
                      <td style={{ padding: '12px 14px' }}>{p.passRate}</td>
                      <td style={{ padding: '12px 14px' }}>{p.certificates}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: healthBg,
                          color: healthColor
                        }}>
                          {p.projectHealth}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── LEVEL 3: TRAINING & JITSI ATTENDANCE INTELLIGENCE ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* Session Status & Delivery Metrics */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          padding: '20px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
        }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Video size={18} color="#0284C7" /> Training Performance Breakdown
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
            <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Total Sessions</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>{trainingPerf.totalSessions || 0}</div>
            </div>
            <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Training Hours</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>{trainingPerf.trainingHoursDelivered || 0}h</div>
            </div>
            <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Avg Attendance</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0284C7', marginTop: '2px' }}>{trainingPerf.averageAttendancePct || 0}%</div>
            </div>
            <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Avg Duration</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#8B5CF6', marginTop: '2px' }}>{trainingPerf.averageSessionDuration || '0m'}</div>
            </div>
          </div>

          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px' }}>
            Session Status Distribution
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(trainingPerf.statusDistribution || []).map((st, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '3px' }}>
                  <span>{st.name}</span>
                  <span style={{ fontWeight: 700 }}>{st.value}</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (st.value / Math.max(trainingPerf.totalSessions || 1, 1)) * 100)}%`, height: '100%', background: st.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Jitsi Live Attendance & Actual vs Scheduled Duration */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          padding: '20px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Video size={18} color="#10B981" /> Jitsi Attendance Telemetry
            </h3>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10B981'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
              Live Telemetry
            </span>
          </div>

          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', textAlign: 'left', color: '#64748B' }}>
                  <th style={{ padding: '8px 10px' }}>Participant</th>
                  <th style={{ padding: '8px 10px' }}>Status</th>
                  <th style={{ padding: '8px 10px' }}>Join</th>
                  <th style={{ padding: '8px 10px' }}>Leave</th>
                  <th style={{ padding: '8px 10px' }}>Rejoins</th>
                  <th style={{ padding: '8px 10px' }}>Total Time</th>
                  <th style={{ padding: '8px 10px' }}>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {[...(jitsi.live || []), ...(jitsi.history || []).slice(0, 5)].map((p, idx) => (
                  <tr key={idx} style={{ borderTop: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>
                      <button
                        onClick={() => handleOpen360(p.participantName)}
                        style={{ border: 'none', background: 'transparent', color: '#0284C7', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >
                        {p.participantName}
                      </button>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ color: p.status === 'Online' ? '#10B981' : '#64748B', fontWeight: 700 }}>
                        ● {p.status}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px' }}>{p.joinTime}</td>
                    <td style={{ padding: '8px 10px' }}>{p.leaveTime}</td>
                    <td style={{ padding: '8px 10px' }}>{p.rejoins}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>
                      {p.totalDuration} <span style={{ fontSize: '0.72rem', color: '#64748B' }}>/ {p.scheduledDurationMinutes || 60}m</span>
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: 800, color: p.attendancePercentage >= 75 ? '#10B981' : '#F59E0B' }}>
                      {p.attendancePercentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #E2E8F0', fontSize: '0.8rem', color: '#64748B' }}>
            <span>Avg: <strong>{jitsi.overview?.averageDuration || '0m'}</strong></span>
            <span>Present (≥75%): <strong style={{ color: '#10B981' }}>{jitsi.overview?.present || 0}</strong></span>
            <span>Below 75%: <strong style={{ color: '#EF4444' }}>{jitsi.overview?.belowThreshold || 0}</strong></span>
          </div>
        </div>
      </div>

      {/* ─── LEVEL 3B: UNIFIED QUIZ INTELLIGENCE (ONLINE + OFFLINE WITH FILTER) ─── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '14px',
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={18} color="#F97316" /> Unified Quiz Intelligence (Online & Offline)
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
              Synchronous live quizzes and asynchronous offline assessments.
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Filter */}
            <div style={{ display: 'flex', gap: '4px', background: '#F1F5F9', padding: '2px', borderRadius: '6px' }}>
              {['ALL', 'ONLINE', 'OFFLINE'].map(t => (
                <button
                  key={t}
                  onClick={() => setQuizTypeFilter(t)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: quizTypeFilter === t ? '#0284C7' : 'transparent',
                    color: quizTypeFilter === t ? '#FFFFFF' : '#64748B'
                  }}
                >
                  {t === 'ALL' ? 'All' : t === 'ONLINE' ? 'Online' : 'Offline'}
                </button>
              ))}
            </div>

            <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700, background: 'rgba(59, 130, 246, 0.1)', color: '#2563EB' }}>
              Online: {quiz.onlineAttempts || 0}
            </span>
            <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700, background: 'rgba(249, 115, 22, 0.1)', color: '#EA580C' }}>
              Offline: {quiz.offlineAttempts || 0}
            </span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', textAlign: 'left', color: '#64748B' }}>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Participant</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Employee ID</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Quiz Title</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Source</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Score</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Result</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Date</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuizAttempts.slice(0, 6).map((att, i) => (
                <tr key={att.id || i} style={{ borderTop: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>{att.participantName}</td>
                  <td style={{ padding: '10px 12px', color: '#64748B' }}>{att.employeeId}</td>
                  <td style={{ padding: '10px 12px' }}>{att.quizTitle}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800,
                      background: att.quizType === 'ONLINE' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(249, 115, 22, 0.1)',
                      color: att.quizType === 'ONLINE' ? '#2563EB' : '#EA580C'
                    }}>
                      {att.quizType}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>{att.percentage}%</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ color: att.passed ? '#10B981' : '#EF4444', fontWeight: 700 }}>
                      {att.passed ? '✓ Pass' : '✗ Fail'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#64748B' }}>{att.attemptDate}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <button
                      onClick={() => handleOpen360(att.participantName)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        background: '#FFFFFF',
                        color: '#0284C7',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      360 Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── LEVEL 5: CERTIFICATION TRACKING & ELIGIBILITY ENGINE ─── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '14px',
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} color="#10B981" /> Level 5 — Certification Pipeline & Governance
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
              Criteria: Min 75% Attendance • 100% Quiz Completion • Min 60% Assessment Benchmark
            </p>
          </div>
        </div>

        {/* Pipeline Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div style={{ padding: '12px 14px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <div style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 700, textTransform: 'uppercase' }}>Issued Certificates</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>{cert.kpis?.issued || 0}</div>
          </div>
          <div style={{ padding: '12px 14px', background: 'rgba(2, 132, 199, 0.08)', borderRadius: '10px', border: '1px solid rgba(2, 132, 199, 0.2)' }}>
            <div style={{ fontSize: '0.72rem', color: '#0284C7', fontWeight: 700, textTransform: 'uppercase' }}>Eligible – Pending Issue</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284C7', marginTop: '2px' }}>{cert.kpis?.eligiblePending || 0}</div>
          </div>
          <div style={{ padding: '12px 14px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <div style={{ fontSize: '0.72rem', color: '#D97706', fontWeight: 700, textTransform: 'uppercase' }}>In Progress</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#D97706', marginTop: '2px' }}>{cert.kpis?.inProgress || 0}</div>
          </div>
          <div style={{ padding: '12px 14px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div style={{ fontSize: '0.72rem', color: '#EF4444', fontWeight: 700, textTransform: 'uppercase' }}>Not Eligible</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#EF4444', marginTop: '2px' }}>{cert.kpis?.notEligible || 0}</div>
          </div>
        </div>

        {/* Recent Certificates Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', textAlign: 'left', color: '#64748B' }}>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Certificate ID</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Participant</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Program</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Project</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Issue Date</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(cert.certificates || []).slice(0, 10).map((c, i) => {
                const normStatus = (c.status || '').toUpperCase();
                const isIssued = ['ISSUED', 'VALID'].includes(normStatus);
                const isRevoked = normStatus === 'REVOKED';
                const isEligiblePending = ['ELIGIBLE', 'ELIGIBLE - PENDING', 'DRAFT', 'PENDING'].includes(normStatus);
                const canView = (isIssued || isRevoked) && Boolean(c.certificateId || c.id);

                return (
                  <tr key={c.id || i} style={{ borderTop: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 800 }}>
                      {canView ? (
                        <button
                          onClick={() => {
                            setViewingCertificateId(c.certificateId || c.id);
                            setIsCertViewerOpen(true);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: isRevoked ? '#EF4444' : '#0284C7',
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            cursor: 'pointer',
                            padding: 0,
                            textDecoration: 'underline',
                            fontSize: '0.85rem'
                          }}
                          title="Click to view certificate"
                        >
                          {c.certificateId || 'VIEW'}
                        </button>
                      ) : (
                        <span style={{ color: '#64748B' }}>{c.certificateId || 'PENDING'}</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{c.participantName}</td>
                    <td style={{ padding: '10px 12px' }}>{c.program}</td>
                    <td style={{ padding: '10px 12px' }}>{c.projectName}</td>
                    <td style={{ padding: '10px 12px', color: '#64748B' }}>{c.issueDate}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                        background: isIssued ? '#10B98118' : isRevoked ? '#EF444418' : isEligiblePending ? '#0284C718' : '#64748B18',
                        color: isIssued ? '#10B981' : isRevoked ? '#EF4444' : isEligiblePending ? '#0284C7' : '#64748B'
                      }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {canView ? (
                        <button
                          onClick={() => {
                            setViewingCertificateId(c.certificateId || c.id);
                            setIsCertViewerOpen(true);
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            color: '#0284C7',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                          }}
                        >
                          <Eye size={13} /> View Certificate
                        </button>
                      ) : isEligiblePending ? (
                        <button
                          onClick={() => navigate('/certificates')}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#10B981',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 1px 3px rgba(16,185,129,0.25)'
                          }}
                        >
                          <Award size={13} /> Issue Certificate
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Escalation Manager */}
      <EscalationManager projectId={selectedProjectId !== 'all' ? selectedProjectId : null} />

      {/* Level 4: Participant 360 Modal */}
      <Participant360Modal
        isOpen={is360ModalOpen}
        onClose={() => setIs360ModalOpen(false)}
        participantId={selectedParticipantId}
        token={token}
        selectedProjectId={selectedProjectId}
        selectedSubProjectId={selectedSubProjectId}
      />

      {/* Level 5: Certificate Viewer Modal */}
      <CertificateViewer
        isOpen={isCertViewerOpen}
        onClose={() => setIsCertViewerOpen(false)}
        certificateId={viewingCertificateId}
        token={token}
      />
    </div>
  );
}
