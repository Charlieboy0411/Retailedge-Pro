import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  FolderOpen, Users, UserCheck, BarChart2, TrendingUp, Sparkles, Award,
  ArrowRight, ShieldAlert, CheckCircle, Clock, AlertCircle, Play, FileText,
  Presentation, RefreshCw, Plus, Calendar, Send, ChevronRight, ChevronDown,
  Video, Eye, Filter, ShieldCheck, AlertTriangle, Layers, Activity, Download,
  CheckCircle2, ArrowUpRight, Search, ExternalLink, SlidersHorizontal, BookOpen
} from 'lucide-react';
import PageHeader from './ui/PageHeader';
import KpiCard from './ui/KpiCard';
import StatusBadge from './ui/StatusBadge';
import EmptyState from './ui/EmptyState';
import LoadingSkeleton from './ui/LoadingSkeleton';
import EscalationManager from './EscalationManager';
import Participant360Modal from './Participant360Modal';
import CertificateViewer from './CertificateViewer';
import DetailedRecordsView from './DetailedRecordsView';

export default function PMDashboardView({
  projectUsers = [],
  projectsList = [],
  reports = [],
  attendanceData = {},
  onExportExcel,
  onExportPPT,
  onExportPMExcel,
  onExportPMPPT,
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
  syncing = false,
  viewMode = 'dashboard',
  setViewMode,
  detailedRecordsProps = null
}) {
  const navigate = useNavigate();
  const [showAllKPIs, setShowAllKPIs] = useState(false);
  const [activeTab, setActiveTab] = useState('training'); // 'training' | 'assessment' | 'readiness' | 'certification'
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [showAdvancedTabs, setShowAdvancedTabs] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState(null);
  const [is360ModalOpen, setIs360ModalOpen] = useState(false);
  const [quizTypeFilter, setQuizTypeFilter] = useState('ALL'); // ALL | ONLINE | OFFLINE
  const [viewingCertificateId, setViewingCertificateId] = useState(null);
  const [isCertViewerOpen, setIsCertViewerOpen] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');
  const [participantFilter, setParticipantFilter] = useState('ALL'); // ALL | ATTENDED | PASSED | ELIGIBLE | AT_RISK
  const [subprojectSearch, setSubprojectSearch] = useState('');

  // Extract intelligence datasets with clean fallbacks
  const kpis = intelligenceData?.kpis || {};
  const trainingPerf = intelligenceData?.trainingPerformance || {};
  const jitsi = intelligenceData?.jitsiAttendance || { live: [], history: [], overview: {} };
  const quiz = intelligenceData?.quizIntelligence || { kpis: {}, attemptsList: [], quizzes: [] };
  const cert = intelligenceData?.certificationIntelligence || { kpis: {}, certificates: [] };
  const projectComparison = intelligenceData?.projectComparison || [];
  const alerts = intelligenceData?.alerts || [];

  // Deduplicate and disambiguate projects for PM
  const uniqueAuthorizedProjects = React.useMemo(() => {
    const map = new Map();
    const nameCounts = {};
    projectsList.forEach(p => {
      nameCounts[p.name] = (nameCounts[p.name] || 0) + 1;
    });

    const list = [];
    projectsList.forEach(p => {
      if (!map.has(p.id)) {
        map.set(p.id, true);
        const hasDup = nameCounts[p.name] > 1;
        let displayName = p.name;
        if (hasDup) {
          const detail = p.business_unit || p.project_code || (p.parent?.name ? `Sub of ${p.parent.name}` : (p.parentId ? 'Subproject' : 'Main Project'));
          displayName = `${p.name} (${detail})`;
        }
        list.push({ ...p, displayName });
      }
    });
    return list;
  }, [projectsList]);

  // Filter child subprojects of the currently selected mother project
  const currentProject = uniqueAuthorizedProjects.find(p => p.id === selectedProjectId) || projectsList.find(p => p.id === selectedProjectId);
  const availableSubProjects = selectedProjectId === 'all'
    ? []
    : projectsList.filter(p => p.parentId === selectedProjectId);

  // Authoritative Management KPIs
  const activeProjectsCount = kpis.activeProjects !== undefined ? kpis.activeProjects : (uniqueAuthorizedProjects.length || 1);
  const activeSubprojectsCount = kpis.activeSubprojects !== undefined ? kpis.activeSubprojects : projectsList.filter(p => p.parentId).length;
  const activeSessionsCount = kpis.activeTrainingSessions !== undefined ? kpis.activeTrainingSessions : reports.length;
  const totalParticipantsCount = kpis.totalParticipants !== undefined ? kpis.totalParticipants : projectUsers.length;
  const participantsJoinedCount = kpis.participantsJoined !== undefined ? kpis.participantsJoined : reports.reduce((s, r) => s + (r.participants || 0), 0);
  const attendanceRateVal = (kpis.attendanceRate !== undefined && kpis.attendanceRate !== null) ? kpis.attendanceRate : null;
  const avgSessionDurationVal = kpis.averageSessionDuration || '—';

  // Quiz Funnel KPIs (Assigned → Started → Attempted → Completed → Passed / Failed)
  const quizzesAssignedCount = kpis.quizzesAssigned !== undefined ? kpis.quizzesAssigned : 0;
  const quizAttemptsCount = kpis.quizAttempts !== undefined ? kpis.quizAttempts : quiz.attemptsList?.length || 0;
  const quizStartedCount = kpis.quizStarted !== undefined ? kpis.quizStarted : quizAttemptsCount;
  const quizCompletedCount = kpis.quizCompleted !== undefined ? kpis.quizCompleted : quizAttemptsCount;
  const quizPassedCount = kpis.quizPassed !== undefined ? kpis.quizPassed : (quiz.kpis?.passed || 0);
  const quizFailedCount = kpis.quizFailed !== undefined ? kpis.quizFailed : (quiz.kpis?.failedAttempts || 0);

  const quizCompletionRateVal = kpis.quizCompletionRate !== undefined ? kpis.quizCompletionRate : 0;
  const quizAttemptRateVal = kpis.quizAttemptRate !== undefined ? kpis.quizAttemptRate : 0;
  const avgQuizScoreVal = kpis.averageQuizScore !== undefined ? kpis.averageQuizScore : 0;
  const quizPassRateVal = kpis.quizPassRate !== undefined ? kpis.quizPassRate : 0;
  const certificatesIssuedCount = kpis.certificatesIssued !== undefined ? kpis.certificatesIssued : (cert.kpis?.issued || 0);

  // Context-Aware Action Execution
  const handleExecuteAction = (action) => {
    if (!action) return;
    if (action.actionType === 'SCHEDULE_MAKEUP_SESSION') {
      navigate('/trainings');
    } else if (action.actionType === 'SEND_QUIZ_REMINDER') {
      navigate('/reports');
    } else if (action.actionType === 'ISSUE_CERTIFICATES') {
      navigate('/certificates');
    } else if (action.targetUrl) {
      navigate(action.targetUrl);
    } else if (action.actionPayload?.targetUrl) {
      navigate(action.actionPayload.targetUrl);
    } else {
      alert(`Action Triggered: ${action.label || action.title || 'Action'}`);
    }
  };

  const handleOpen360 = (pId) => {
    setSelectedParticipantId(pId);
    setIs360ModalOpen(true);
  };

  const filteredQuizAttempts = (quiz.attemptsList || []).filter(a => {
    if (quizTypeFilter === 'ALL') return true;
    return a.quizType === quizTypeFilter;
  });

  // Filtered participant roster
  const filteredProjectUsers = projectUsers.filter(u => {
    const q = participantSearch.toLowerCase();
    const matchesSearch = !q || 
      (u.name && u.name.toLowerCase().includes(q)) || 
      (u.employee_id && u.employee_id.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q));

    if (!matchesSearch) return false;
    if (participantFilter === 'ATTENDED') return (u.attendancePercentage || 0) >= 75;
    if (participantFilter === 'PASSED') return (u.assessmentScore || 0) >= 70;
    if (participantFilter === 'ELIGIBLE') return (u.attendancePercentage || 0) >= 80 && (u.assessmentScore || 0) >= 70;
    if (participantFilter === 'AT_RISK') return (u.attendancePercentage || 0) < 75 || (u.assessmentScore || 0) < 60;
    return true;
  });

  // Filtered subprojects
  const filteredSubprojectsList = availableSubProjects.filter(sp => {
    if (!subprojectSearch) return true;
    return sp.name.toLowerCase().includes(subprojectSearch.toLowerCase());
  });

  // If viewMode === 'details', render DetailedRecordsView directly within the same page shell
  if (viewMode === 'details' && detailedRecordsProps) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <PageHeader
          eyebrow="PROGRAM MANAGEMENT"
          badge={currentProject ? currentProject.name : 'Portfolio Scope'}
          title="Training Operations Command Center"
          subtitle="Detailed Records & Multi-Dimensional Training Logs"
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', background: '#F1F5F9', padding: '3px', borderRadius: '8px' }}>
                <button
                  onClick={() => setViewMode && setViewMode('dashboard')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'transparent',
                    color: '#64748B',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  Operations Cockpit
                </button>
                <button
                  onClick={() => setViewMode && setViewMode('details')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#0284C7',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  Detailed Records
                </button>
              </div>

              <button
                onClick={() => onSync && onSync()}
                disabled={syncing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  border: '1px solid #CBD5E1',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: syncing ? 'wait' : 'pointer'
                }}
              >
                <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
                <span>Sync</span>
              </button>
            </div>
          }
        />
        <DetailedRecordsView {...detailedRecordsProps} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ─── 1. PAGE HEADER (ENTERPRISE OPERATIONAL STANDARD) ─── */}
      <PageHeader
        eyebrow="PROGRAM MANAGEMENT"
        badge={selectedProjectId === 'all' ? (uniqueAuthorizedProjects.length === 1 ? uniqueAuthorizedProjects[0].displayName : 'All Assigned Projects') : (currentProject?.name || 'Project Scope')}
        title="Training Operations"
        subtitle="Operational overview of training delivery, participant progress, and program milestones across your assigned projects."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* View Mode Toggle */}
            {setViewMode && (
              <div style={{ display: 'flex', background: '#F1F5F9', padding: '3px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <button
                  id="pm-toggle-dashboard"
                  onClick={() => setViewMode('dashboard')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: viewMode === 'dashboard' ? '#0284C7' : 'transparent',
                    color: viewMode === 'dashboard' ? '#FFFFFF' : '#64748B',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  Cockpit
                </button>
                <button
                  id="pm-toggle-details"
                  onClick={() => setViewMode('details')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: viewMode === 'details' ? '#0284C7' : 'transparent',
                    color: viewMode === 'details' ? '#FFFFFF' : '#64748B',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  Records
                </button>
              </div>
            )}

            {/* Project Scope Selector */}
            <div style={{ position: 'relative' }}>
              <select
                id="pm-project-select"
                value={selectedProjectId}
                onChange={(e) => {
                  if (onSelectProject) onSelectProject(e.target.value);
                  if (onSelectSubProject) onSelectSubProject('all');
                }}
                style={{
                  padding: '7px 28px 7px 11px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  minWidth: '170px'
                }}
              >
                {uniqueAuthorizedProjects.length === 0 ? (
                  <option value="">No Assigned Projects</option>
                ) : uniqueAuthorizedProjects.length === 1 ? (
                  <option value={uniqueAuthorizedProjects[0].id}>{uniqueAuthorizedProjects[0].displayName}</option>
                ) : (
                  <>
                    <option value="all">All Assigned Projects</option>
                    {uniqueAuthorizedProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.displayName}</option>
                    ))}
                  </>
                )}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }} />
            </div>

            {/* Subproject Selector (Only enabled if multiple subprojects exist) */}
            {selectedProjectId !== 'all' && availableSubProjects.length > 0 && (
              <div style={{ position: 'relative' }}>
                <select
                  id="pm-subproject-select"
                  value={selectedSubProjectId}
                  onChange={(e) => {
                    if (onSelectSubProject) onSelectSubProject(e.target.value);
                  }}
                  style={{
                    padding: '7px 28px 7px 11px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    minWidth: '160px'
                  }}
                >
                  <option value="all">All Subprojects ({availableSubProjects.length})</option>
                  {availableSubProjects.map(sp => (
                    <option key={sp.id} value={sp.id}>{sp.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }} />
              </div>
            )}

            {/* Period Selector (7d / 30d / all) */}
            <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '2px' }}>
              {['7d', '30d', 'all'].map(r => (
                <button
                  key={r}
                  id={`pm-period-${r}`}
                  onClick={() => onSelectDateRange && onSelectDateRange(r)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: dateRange === r ? '#0284C7' : 'transparent',
                    color: dateRange === r ? '#FFFFFF' : '#64748B',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {r === '7d' ? '7D' : r === '30d' ? '30D' : 'All'}
                </button>
              ))}
            </div>

            {/* Sync Button */}
            <button
              id="pm-sync-btn"
              onClick={() => onSync && onSync()}
              disabled={syncing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                background: '#0284C7',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: syncing ? 'wait' : 'pointer',
                boxShadow: '0 1px 3px rgba(2, 132, 199, 0.25)'
              }}
            >
              <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
              <span>{syncing ? 'Syncing...' : 'Sync'}</span>
            </button>

            {/* Primary Action: Schedule Class */}
            <button
              id="pm-schedule-btn"
              onClick={() => navigate('/schedule')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                background: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(37, 99, 235, 0.25)'
              }}
            >
              <Plus size={14} />
              <span>Schedule Class</span>
            </button>

            {/* Quick Export Dropdown */}
            {(onExportPMExcel || onExportExcel) && (
              <button
                id="pm-export-excel-btn"
                onClick={() => (onExportPMExcel ? onExportPMExcel() : onExportExcel('reports'))}
                title="Download Operational Excel Report"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  border: '1px solid #CBD5E1',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                <Download size={14} color="#10B981" />
                <span>Excel</span>
              </button>
            )}

            {(onExportPMPPT || onExportPPT) && (
              <button
                id="pm-export-ppt-btn"
                onClick={() => (onExportPMPPT ? onExportPMPPT() : onExportPPT('reports'))}
                title="Download 15-Slide Executive PPT Report"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  border: '1px solid #CBD5E1',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                <Presentation size={14} color="#8B5CF6" />
                <span>PPT</span>
              </button>
            )}
          </div>
        }
      />

      {/* ─── 2. LEVEL 1: OPERATIONAL MANAGEMENT KPIS (6 PRIMARY + COLLAPSIBLE OPERATIONAL DETAILS) ─── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={17} color="#0284C7" /> Primary Operational Indicators
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
              Real-time operational measures across assigned programs and learner cohorts
            </span>
          </div>
          <button
            id="pm-toggle-kpi-drawer"
            onClick={() => setShowAllKPIs(prev => !prev)}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#0284C7',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {showAllKPIs ? 'Hide Operational Details' : 'Operational Details & Telemetry (9)'}
            <ChevronDown size={14} style={{ transform: showAllKPIs ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        </div>

        {/* 6 Primary KPI Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px'
        }}>
          {/* 1. Assigned Projects */}
          <KpiCard
            icon={FolderOpen}
            label="ASSIGNED PROJECTS"
            value={activeProjectsCount !== undefined && activeProjectsCount !== null ? activeProjectsCount : '—'}
            variant="blue"
            subtext={selectedProjectId === 'all' ? (uniqueAuthorizedProjects.length === 1 ? 'Single Assigned Project' : 'Authorized Portfolio') : 'Focused Scope'}
            onClick={() => navigate('/projects')}
          />

          {/* 2. Active Participants */}
          <KpiCard
            icon={Users}
            label="ACTIVE PARTICIPANTS"
            value={totalParticipantsCount !== undefined && totalParticipantsCount !== null ? totalParticipantsCount.toLocaleString() : '—'}
            variant="blue"
            subtext="Enrolled Learners"
            onClick={() => navigate('/project-participants')}
          />

          {/* 3. Training Sessions */}
          <KpiCard
            icon={Video}
            label="TRAINING SESSIONS"
            value={activeSessionsCount !== undefined && activeSessionsCount !== null ? activeSessionsCount : '—'}
            variant="purple"
            subtext="Scheduled & Active Batches"
            onClick={() => navigate('/schedule')}
          />

          {/* 4. Quiz Completion */}
          <KpiCard
            icon={CheckCircle}
            label="QUIZ COMPLETION"
            value={quizCompletionRateVal !== undefined && quizCompletionRateVal !== null ? `${quizCompletionRateVal}%` : '—'}
            variant={quizCompletionRateVal >= 70 ? 'green' : 'amber'}
            radialProgress={quizCompletionRateVal}
            subtext={`${quizCompletedCount} Completed of ${quizzesAssignedCount} Workloads`}
            onClick={() => navigate('/gamification')}
          />

          {/* 5. Assessment Average */}
          <KpiCard
            icon={TrendingUp}
            label="AVG QUIZ SCORE"
            value={avgQuizScoreVal !== undefined && avgQuizScoreVal !== null ? `${avgQuizScoreVal}%` : '—'}
            variant={avgQuizScoreVal >= 70 ? 'green' : avgQuizScoreVal >= 60 ? 'amber' : 'red'}
            radialProgress={avgQuizScoreVal}
            subtext={avgQuizScoreVal >= 70 ? 'Benchmark Met (≥70%)' : 'Below Benchmark'}
            onClick={() => navigate('/gamification')}
          />

          {/* 6. Pending Actions */}
          <KpiCard
            icon={AlertTriangle}
            label="PENDING ACTIONS"
            value={alerts.length}
            variant={alerts.length > 0 ? 'red' : 'green'}
            subtext={alerts.length > 0 ? `${alerts.length} Items Require Follow-up` : 'All Programs On Track'}
          />
        </div>

        {/* Operational Details Drawer (Expandable secondary metrics) */}
        <AnimatePresence>
          {showAllKPIs && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '14px',
                marginTop: '14px'
              }}
            >
              <KpiCard
                icon={UserCheck}
                label="ATTENDANCE RATE"
                value={attendanceRateVal !== null && attendanceRateVal !== undefined ? `${attendanceRateVal}%` : 'N/A'}
                variant={attendanceRateVal != null && attendanceRateVal >= 75 ? 'green' : 'amber'}
                radialProgress={attendanceRateVal != null ? attendanceRateVal : 0}
                subtext={attendanceRateVal != null ? (attendanceRateVal >= 75 ? 'Optimal (≥75%)' : 'Needs Follow-up') : 'Telemetry Unavailable'}
              />
              <KpiCard
                icon={Layers}
                label="SUBPROJECTS"
                value={activeSubprojectsCount !== undefined && activeSubprojectsCount !== null ? activeSubprojectsCount : '—'}
                variant="cyan"
                subtext="Child Workstreams"
              />
              <KpiCard
                icon={Award}
                label="CERTIFICATES ISSUED"
                value={certificatesIssuedCount !== undefined && certificatesIssuedCount !== null ? certificatesIssuedCount : '—'}
                variant="purple"
                subtext={`${cert.kpis?.eligiblePending || 0} Eligible Pending`}
              />
              <KpiCard
                icon={Users}
                label="PARTICIPANTS JOINED"
                value={participantsJoinedCount.toLocaleString()}
                variant="cyan"
                subtext="Session Attendees"
              />
              <KpiCard
                icon={BarChart2}
                label="QUIZZES ASSIGNED"
                value={quizzesAssignedCount.toLocaleString()}
                variant="blue"
                subtext="Assigned Workload"
              />
              <KpiCard
                icon={Activity}
                label="QUIZ ATTEMPTS"
                value={quizAttemptsCount.toLocaleString()}
                variant="amber"
                subtext={`${quizAttemptRateVal}% Attempt Rate`}
              />
              <KpiCard
                icon={ShieldCheck}
                label="QUIZ PASS RATE"
                value={`${quizPassRateVal}%`}
                variant={quizPassRateVal >= 70 ? 'green' : 'red'}
                radialProgress={quizPassRateVal}
                subtext={`${quizPassedCount} Passed / ${quizCompletedCount} Completed`}
              />
              <KpiCard
                icon={Clock}
                label="AVG SESSION DURATION"
                value={avgSessionDurationVal}
                variant="purple"
                subtext="Training Telemetry"
              />
              <KpiCard
                icon={Clock}
                label="TRAINING HOURS"
                value={trainingPerf.trainingHoursDelivered != null ? `${trainingPerf.trainingHoursDelivered}h` : 'N/A'}
                variant="blue"
                subtext={trainingPerf.telemetryStatus === 'UNAVAILABLE' ? 'Telemetry Unavailable' : 'Delivered Classroom Hours'}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── 3. LEVEL 6: INTELLIGENCE ACTION CENTER (WHAT → WHY → WHO → NEXT) ─── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '14px',
        padding: '20px 24px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                background: 'rgba(2, 132, 199, 0.1)',
                color: '#0284C7',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.5px'
              }}>
                LEVEL 6 INTELLIGENCE
              </span>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                Operational Action Center
              </h3>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
              Targeted operational remediation: What happened → Root cause → Affected learners → Immediate next action.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              color: alerts.length > 0 ? '#B91C1C' : '#047857',
              background: alerts.length > 0 ? '#FEE2E2' : '#D1FAE5',
              padding: '4px 10px',
              borderRadius: '12px'
            }}>
              {alerts.length} Active Operational Trigger{alerts.length === 1 ? '' : 's'}
            </span>
            {alerts.length > 3 && (
              <button
                id="pm-toggle-alerts"
                onClick={() => setShowAllAlerts(prev => !prev)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#0284C7',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {showAllAlerts ? 'Show Top 3 Priority Items' : `View All (${alerts.length})`}
                <ChevronDown size={14} style={{ transform: showAllAlerts ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
            )}
          </div>
        </div>

        {alerts.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="All Programs Operational"
            description="No immediate attendance or assessment blockers across your assigned project scopes."
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
            {(showAllAlerts ? alerts : alerts.slice(0, 3)).map((al, idx) => {
              const isCritical = al.severity === 'critical' || al.type?.includes('RISK');
              const isWarning = al.severity === 'warning';
              const borderColor = isCritical ? '#EF4444' : isWarning ? '#F59E0B' : '#0284C7';
              const iconBg = isCritical ? 'rgba(239, 68, 68, 0.1)' : isWarning ? 'rgba(245, 158, 11, 0.1)' : 'rgba(2, 132, 199, 0.1)';

              return (
                <div
                  key={al.id || idx}
                  style={{
                    background: '#F8FAFC',
                    borderRadius: '10px',
                    padding: '16px',
                    border: '1px solid #E2E8F0',
                    borderLeft: `4px solid ${borderColor}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A' }}>
                        {al.title}
                      </span>
                      <StatusBadge
                        status={isCritical ? 'danger' : isWarning ? 'warning' : 'info'}
                        label={isCritical ? 'High Priority' : isWarning ? 'Attention' : 'Operational'}
                        size="sm"
                      />
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: '1.45' }}>
                      {al.message}
                    </p>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '10px',
                    borderTop: '1px solid #E2E8F0'
                  }}>
                    <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>
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
                        gap: '5px',
                        boxShadow: '0 1px 3px rgba(2, 132, 199, 0.25)'
                      }}
                    >
                      {al.recommendedAction || al.actionPayload?.label || 'Execute Action'}
                      <ArrowUpRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 3.5. UPCOMING TRAINING SESSIONS & BATCHES ─── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '14px',
        padding: '20px 24px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="#0284C7" />
              Upcoming & Scheduled Training Batches
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
              Real-time training pipeline and upcoming batch deliveries for your assigned scope.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              id="pm-schedule-class-btn"
              onClick={() => navigate('/schedule')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: '#0284C7',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={14} /> Schedule Class
            </button>
            <button
              onClick={() => navigate('/schedule')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: '#F1F5F9',
                color: '#0F172A',
                border: '1px solid #CBD5E1',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>View Full Schedule</span>
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>

        {reports.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No Training Sessions Found"
            description="No training batches or sessions are scheduled for the current project scope."
          />
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', textAlign: 'left', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Session Title / Topic</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Project Scope</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Date</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Participants</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Avg Score</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.slice(0, 4).map((r, idx) => (
                  <tr key={r.id || idx} style={{ borderBottom: idx < 3 ? '1px solid #E2E8F0' : 'none' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0F172A' }}>
                      {r.title || 'Training Session'}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#475569' }}>
                      {r.projectName || currentProject?.name || 'Assigned Project'}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#64748B' }}>
                      {r.date || '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                      {r.participants != null ? r.participants : (r.participantsList?.length || '—')}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: r.avgScore && parseFloat(r.avgScore) >= 70 ? '#10B981' : '#0F172A' }}>
                      {r.avgScore || '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <StatusBadge
                        status={r.status === 'Finished' || r.status === 'Completed' ? 'success' : r.status === 'Active' ? 'blue' : 'warning'}
                        label={r.status || 'Scheduled'}
                        size="sm"
                      />
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <button
                        onClick={() => navigate('/schedule')}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          color: '#0284C7',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── 4. COMPACT PROJECT HEALTH & GOVERNANCE MATRIX ─── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '14px',
        padding: '20px 24px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderOpen size={18} color="#0284C7" />
              Project Health & Governance Matrix
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
              Authoritative project-to-subproject hierarchy and delivery status across assigned scopes.
            </p>
          </div>
          {selectedProjectId !== 'all' && (
            <button
              onClick={() => {
                if (onSelectProject) onSelectProject('all');
                if (onSelectSubProject) onSelectSubProject('all');
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                color: '#0F172A',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              ← Back to All Projects
            </button>
          )}
        </div>

        {/* Hierarchy Visualizer: Mother Project -> Child Subprojects */}
        <div style={{
          background: '#F8FAFC',
          borderRadius: '10px',
          padding: '16px',
          border: '1px solid #E2E8F0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderOpen size={16} color="#0284C7" />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>
                {selectedProjectId === 'all' ? 'All Assigned Mother Projects' : `Mother Project: ${currentProject?.name || 'Selected'}`}
              </span>
              <span style={{ fontSize: '0.75rem', background: '#E2E8F0', color: '#475569', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                {availableSubProjects.length > 0
                  ? `${availableSubProjects.length} Child Subprojects`
                  : (projectsList.filter(p => !p.parentId).length > 0
                      ? `${projectsList.filter(p => !p.parentId).length} Mother Projects`
                      : `${uniqueAuthorizedProjects.length} Assigned Project${uniqueAuthorizedProjects.length === 1 ? '' : 's'}`)}
              </span>
            </div>

            {availableSubProjects.length > 0 && (
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={14} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Search subprojects..."
                  value={subprojectSearch}
                  onChange={(e) => setSubprojectSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '5px 10px 5px 28px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.78rem'
                  }}
                />
              </div>
            )}
          </div>

          {/* Subproject folder badges / quick filter buttons */}
          {availableSubProjects.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '160px', overflowY: 'auto', padding: '4px 0' }}>
              <button
                onClick={() => onSelectSubProject && onSelectSubProject('all')}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: selectedSubProjectId === 'all' ? '#0284C7' : '#CBD5E1',
                  background: selectedSubProjectId === 'all' ? '#0284C7' : '#FFFFFF',
                  color: selectedSubProjectId === 'all' ? '#FFFFFF' : '#0F172A',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                All Subprojects ({availableSubProjects.length})
              </button>
              {filteredSubprojectsList.map(sp => (
                <button
                  key={sp.id}
                  onClick={() => onSelectSubProject && onSelectSubProject(sp.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: selectedSubProjectId === sp.id ? '#0284C7' : '#E2E8F0',
                    background: selectedSubProjectId === sp.id ? '#0284C7' : '#FFFFFF',
                    color: selectedSubProjectId === sp.id ? '#FFFFFF' : '#334155',
                    fontWeight: selectedSubProjectId === sp.id ? 700 : 500,
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  <Layers size={12} color={selectedSubProjectId === sp.id ? '#FFFFFF' : '#64748B'} />
                  <span>{sp.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Project Comparison Table */}
        <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', textAlign: 'left', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>Project Name</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>Subprojects</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>Participants</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>Sessions</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>Attendance</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>Quiz Completion</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>Avg Score</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>Pass Rate</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>Certificates</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>Health Status</th>
              </tr>
            </thead>
            <tbody>
              {(projectComparison.length > 0 ? projectComparison : (uniqueAuthorizedProjects.map(p => ({
                id: p.id,
                name: p.displayName || p.name,
                subprojectCount: projectsList.filter(sp => sp.parentId === p.id).length,
                participants: totalParticipantsCount,
                sessions: activeSessionsCount,
                attendance: attendanceRateVal != null ? `${attendanceRateVal}%` : 'N/A',
                quizCompletion: `${quizCompletionRateVal}%`,
                avgScore: `${avgQuizScoreVal}%`,
                passRate: `${quizPassRateVal}%`,
                certificates: certificatesIssuedCount,
                projectHealth: attendanceRateVal >= 75 && quizCompletionRateVal >= 70 ? 'Healthy' : attendanceRateVal < 70 ? 'Critical' : 'Watch'
              })))).map((p, idx) => (
                <tr key={p.id || idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 700 }}>
                    <button
                      onClick={() => {
                        if (onSelectProject) onSelectProject(p.id);
                        if (onSelectSubProject) onSelectSubProject('all');
                      }}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#0284C7',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0,
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <FolderOpen size={14} />
                      <span>{p.name}</span>
                    </button>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748B' }}>{p.subprojectCount || 0}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 600 }}>{p.participants || 0}</td>
                  <td style={{ padding: '12px 14px' }}>{p.sessions || 0}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: (p.attendance && p.attendance !== 'N/A' && parseFloat(p.attendance) >= 75) ? '#10B981' : '#F59E0B' }}>
                    {p.attendance && !String(p.attendance).includes('null') ? p.attendance : 'N/A'}
                  </td>
                  <td style={{ padding: '12px 14px' }}>{p.quizCompletion || '—'}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 700 }}>{p.avgScore || '—'}</td>
                  <td style={{ padding: '12px 14px' }}>{p.passRate || '—'}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 600 }}>{p.certificates || 0}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <StatusBadge
                      status={p.projectHealth}
                      label={p.projectHealth}
                      size="sm"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 5. SPECIALIZED OPERATIONAL STREAMS (COLLAPSIBLE DEEP-DIVE STREAMS) ─── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={17} color="#0284C7" /> Specialized Operational Streams
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
              Deep-dive delivery logs, live Jitsi telemetry, quiz funnels, learner roster, and certificates.
            </span>
          </div>
          <button
            id="pm-toggle-operational-streams"
            onClick={() => setShowAdvancedTabs(prev => !prev)}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              background: showAdvancedTabs ? '#F1F5F9' : '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#0284C7',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {showAdvancedTabs ? 'Collapse Operational Streams' : 'Explore Detailed Streams (4)'}
            <ChevronDown size={14} style={{ transform: showAdvancedTabs ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        </div>

        {showAdvancedTabs && (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden'
          }}>
            {/* Tab Header Bar */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #E2E8F0',
              background: '#F8FAFC',
              overflowX: 'auto',
              padding: '4px 16px 0 16px',
              gap: '4px'
            }}>
              {[
                { id: 'training', label: 'Training Delivery & Telemetry', icon: Video, count: trainingPerf.totalSessions || reports.length },
                { id: 'assessment', label: 'Assessment Funnel & Quizzes', icon: BarChart2, count: quizAttemptsCount },
                { id: 'readiness', label: 'Participant Readiness', icon: Users, count: totalParticipantsCount },
                { id: 'certification', label: 'Certification Pipeline', icon: Award, count: certificatesIssuedCount }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`pm-tab-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      padding: '12px 16px',
                      border: 'none',
                      borderBottom: isActive ? '3px solid #0284C7' : '3px solid transparent',
                      background: 'transparent',
                      color: isActive ? '#0284C7' : '#64748B',
                      fontWeight: isActive ? 800 : 600,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s'
                    }}
                  >
                    <Icon size={16} color={isActive ? '#0284C7' : '#64748B'} />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span style={{
                        fontSize: '0.72rem',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        background: isActive ? '#0284C7' : '#E2E8F0',
                        color: isActive ? '#FFFFFF' : '#475569',
                        fontWeight: 700
                      }}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Content Container */}
            <div style={{ padding: '24px' }}>

          {/* ══════════════ TAB 2: TRAINING DELIVERY & TELEMETRY ══════════════ */}
          {activeTab === 'training' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                    Training Delivery & Live Telemetry
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                    Delivered hours, session completion rates, and real-time attendance telemetry.
                  </p>
                </div>
              </div>

              {/* Delivery Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Total Sessions</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                    {trainingPerf.totalSessions || reports.length}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>Scheduled & Hosted</div>
                </div>

                <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Training Hours</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>
                    {trainingPerf.trainingHoursDelivered != null ? `${trainingPerf.trainingHoursDelivered}h` : '—'}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>Total Classroom Time</div>
                </div>

                <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Average Attendance</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284C7', marginTop: '4px' }}>
                    {trainingPerf.averageAttendancePct != null
                      ? `${trainingPerf.averageAttendancePct}%`
                      : (attendanceRateVal != null ? `${attendanceRateVal}%` : 'N/A')}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>Present vs Target</div>
                </div>

                <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Average Duration</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#8B5CF6', marginTop: '4px' }}>
                    {trainingPerf.averageSessionDuration && trainingPerf.averageSessionDuration !== '0m' ? trainingPerf.averageSessionDuration : (avgSessionDurationVal || 'N/A')}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>Jitsi / Meeting Mean</div>
                </div>
              </div>

              {/* Status Distribution Bars */}
              {trainingPerf.statusDistribution && trainingPerf.statusDistribution.length > 0 && (
                <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '16px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A', marginBottom: '10px', textTransform: 'uppercase' }}>
                    Session Lifecycle Breakdown
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    {trainingPerf.statusDistribution.map((st, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, color: '#475569' }}>{st.name}</span>
                          <span style={{ fontWeight: 700, color: '#0F172A' }}>{st.value} sessions</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.min(100, (st.value / Math.max(trainingPerf.totalSessions || 1, 1)) * 100)}%`,
                            height: '100%',
                            background: st.color
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Jitsi Attendance Telemetry Table */}
              <div style={{ borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Video size={15} color="#10B981" /> Jitsi Participant Telemetry Log
                  </span>
                  <span style={{ fontSize: '0.74rem', color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981' }} />
                    Telemetry Synchronized
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#FFFFFF', textAlign: 'left', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Participant Name</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Status</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Join Time</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Leave Time</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Rejoins</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Duration</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Attendance %</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...(jitsi.live || []), ...(jitsi.history || []).slice(0, 8)].map((p, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 700 }}>{p.participantName}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <StatusBadge
                              status={p.status === 'Online' ? 'success' : 'neutral'}
                              label={p.status}
                              size="sm"
                              dot={true}
                            />
                          </td>
                          <td style={{ padding: '10px 14px', color: '#64748B' }}>{p.joinTime || '—'}</td>
                          <td style={{ padding: '10px 14px', color: '#64748B' }}>{p.leaveTime || '—'}</td>
                          <td style={{ padding: '10px 14px' }}>{p.rejoins || 0}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                            {p.totalDuration} <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>/ {p.scheduledDurationMinutes || 60}m</span>
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 800, color: p.attendancePercentage >= 75 ? '#10B981' : '#F59E0B' }}>
                            {p.attendancePercentage}%
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <button
                              onClick={() => handleOpen360(p.participantName)}
                              style={{
                                padding: '3px 8px',
                                borderRadius: '5px',
                                border: '1px solid #CBD5E1',
                                background: '#FFFFFF',
                                color: '#0284C7',
                                fontWeight: 700,
                                fontSize: '0.74rem',
                                cursor: 'pointer'
                              }}
                            >
                              Inspect 360
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ TAB 3: ASSESSMENT FUNNEL & QUIZZES ══════════════ */}
          {activeTab === 'assessment' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                  Authoritative Assessment Funnel
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                  5-Stage Evaluation Journey: Assigned → Started → Attempted → Completed → Passed / Failed
                </p>
              </div>

              {/* The Authoritative 5-Stage Stepped Funnel */}
              <div style={{
                background: '#F8FAFC',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #E2E8F0'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                  gap: '12px'
                }}>
                  {/* Step 1: Assigned */}
                  <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>1. Assigned</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284C7', marginTop: '4px' }}>
                      {quizzesAssignedCount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>Total Modules</div>
                  </div>

                  {/* Step 2: Started */}
                  <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>2. Started</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                      {quizStartedCount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                      {quizzesAssignedCount > 0 ? `${Math.round((quizStartedCount / quizzesAssignedCount) * 100)}% Initiated` : '—'}
                    </div>
                  </div>

                  {/* Step 3: Attempted */}
                  <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>3. Attempted</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#8B5CF6', marginTop: '4px' }}>
                      {quizAttemptsCount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                      {quizAttemptRateVal}% Attempt Rate
                    </div>
                  </div>

                  {/* Step 4: Completed */}
                  <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>4. Completed</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>
                      {quizCompletedCount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                      {quizCompletionRateVal}% Completion Rate
                    </div>
                  </div>

                  {/* Step 5: Passed / Failed */}
                  <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>5. Outcome</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                      <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981' }}>{quizPassedCount}</span>
                      <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>/</span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#EF4444' }}>{quizFailedCount}</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                      {quizPassRateVal}% Pass Rate (≥70%)
                    </div>
                  </div>
                </div>
              </div>

              {/* Unified Quiz Roster (Online + Offline) */}
              <div style={{ borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0F172A' }}>
                    Unified Assessment Activity ({filteredQuizAttempts.length})
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '2px' }}>
                      {['ALL', 'ONLINE', 'OFFLINE'].map(t => (
                        <button
                          key={t}
                          onClick={() => setQuizTypeFilter(t)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: 'none',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: quizTypeFilter === t ? '#0284C7' : 'transparent',
                            color: quizTypeFilter === t ? '#FFFFFF' : '#64748B'
                          }}
                        >
                          {t === 'ALL' ? 'All Modes' : t === 'ONLINE' ? 'Live Online' : 'Self-Paced'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#FFFFFF', textAlign: 'left', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Participant</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Employee ID</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Quiz Title</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Delivery Mode</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Score %</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Result</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Attempt Date</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQuizAttempts.slice(0, 10).map((att, i) => (
                        <tr key={att.id || i} style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 700 }}>{att.participantName}</td>
                          <td style={{ padding: '10px 14px', color: '#64748B' }}>{att.employeeId || '—'}</td>
                          <td style={{ padding: '10px 14px' }}>{att.quizTitle}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <StatusBadge
                              status={att.quizType === 'ONLINE' ? 'info' : 'purple'}
                              label={att.quizType}
                              size="sm"
                            />
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700 }}>{att.percentage}%</td>
                          <td style={{ padding: '10px 14px' }}>
                            <StatusBadge
                              status={att.passed ? 'success' : 'danger'}
                              label={att.passed ? 'Pass' : 'Fail'}
                              size="sm"
                            />
                          </td>
                          <td style={{ padding: '10px 14px', color: '#64748B' }}>{att.attemptDate || '—'}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <button
                              onClick={() => handleOpen360(att.participantName)}
                              style={{
                                padding: '3px 8px',
                                borderRadius: '5px',
                                border: '1px solid #CBD5E1',
                                background: '#FFFFFF',
                                color: '#0284C7',
                                fontWeight: 700,
                                fontSize: '0.74rem',
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
            </div>
          )}

          {/* ══════════════ TAB 4: PARTICIPANT READINESS ══════════════ */}
          {activeTab === 'readiness' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                  Participant Training Journey & Readiness Pipeline
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                  Progression tracking: Invited → Attended → Quiz Attempted → Passed → Certified
                </p>
              </div>

              {/* Visual Pipeline Funnel Tiles */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '12px'
              }}>
                <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>1. Enrolled</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                    {totalParticipantsCount}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Target Roster</div>
                </div>

                <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>2. Attended</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0284C7', marginTop: '4px' }}>
                    {participantsJoinedCount}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Joined Classrooms</div>
                </div>

                <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>3. Assessed</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#8B5CF6', marginTop: '4px' }}>
                    {quiz.kpis?.uniqueParticipants || quizAttemptsCount}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Attempted Evaluation</div>
                </div>

                <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>4. Passed</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>
                    {quizPassedCount}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Score ≥ 70%</div>
                </div>

                <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>5. Certified</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#EC4899', marginTop: '4px' }}>
                    {certificatesIssuedCount}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Credentials Issued</div>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ position: 'relative', width: '280px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    type="text"
                    placeholder="Search learners by name or ID..."
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 12px 7px 32px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '4px', background: '#F1F5F9', padding: '3px', borderRadius: '8px' }}>
                  {[
                    { id: 'ALL', label: 'All' },
                    { id: 'ATTENDED', label: 'Attended (≥75%)' },
                    { id: 'PASSED', label: 'Passed (≥70%)' },
                    { id: 'ELIGIBLE', label: 'Cert Eligible' },
                    { id: 'AT_RISK', label: 'At Risk' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setParticipantFilter(f.id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: participantFilter === f.id ? '#0284C7' : 'transparent',
                        color: participantFilter === f.id ? '#FFFFFF' : '#64748B'
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Learners Roster Table */}
              <div style={{ borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', textAlign: 'left', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Employee ID</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Participant Name</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Email</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Attendance</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Assessment</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Readiness Status</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProjectUsers.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
                            No participants match the selected filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredProjectUsers.slice(0, 15).map((u, i) => {
                          const att = u.attendancePercentage !== undefined ? u.attendancePercentage : 85;
                          const score = u.assessmentScore !== undefined ? u.assessmentScore : (u.avgScore ? parseInt(u.avgScore) : 75);
                          const isEligible = att >= 80 && score >= 70;
                          const isAtRisk = att < 75 || score < 60;
                          const statusLabel = isEligible ? 'Certification Eligible' : isAtRisk ? 'At Risk' : 'In Progress';
                          const statusVariant = isEligible ? 'success' : isAtRisk ? 'danger' : 'info';

                          return (
                            <tr key={u.id || i} style={{ borderBottom: '1px solid #E2E8F0' }}>
                              <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#64748B' }}>
                                {u.employee_id || u.employeeId || 'EMP-—'}
                              </td>
                              <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0F172A' }}>
                                {u.name}
                              </td>
                              <td style={{ padding: '10px 14px', color: '#64748B' }}>
                                {u.email}
                              </td>
                              <td style={{ padding: '10px 14px', fontWeight: 700, color: att >= 75 ? '#10B981' : '#F59E0B' }}>
                                {att}%
                              </td>
                              <td style={{ padding: '10px 14px', fontWeight: 700, color: score >= 70 ? '#10B981' : '#EF4444' }}>
                                {score}%
                              </td>
                              <td style={{ padding: '10px 14px' }}>
                                <StatusBadge
                                  status={statusVariant}
                                  label={statusLabel}
                                  size="sm"
                                />
                              </td>
                              <td style={{ padding: '10px 14px' }}>
                                <button
                                  onClick={() => handleOpen360(u.id || u.name)}
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: '5px',
                                    border: '1px solid #CBD5E1',
                                    background: '#FFFFFF',
                                    color: '#0284C7',
                                    fontWeight: 700,
                                    fontSize: '0.74rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Inspect 360
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ TAB 5: CERTIFICATION PIPELINE & GOVERNANCE ══════════════ */}
          {activeTab === 'certification' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                  Certification Pipeline & Issuance Governance
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                  Enterprise Certification Benchmark: Attendance ≥ 80% • Assessment Score ≥ 70%
                </p>
              </div>

              {/* 4 Pipeline Stage Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', borderLeft: '4px solid #10B981' }}>
                  <div style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 800, textTransform: 'uppercase' }}>Issued Certificates</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>
                    {cert.kpis?.issued || certificatesIssuedCount}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>Verified & Valid</div>
                </div>

                <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', borderLeft: '4px solid #0284C7' }}>
                  <div style={{ fontSize: '0.72rem', color: '#0369A1', fontWeight: 800, textTransform: 'uppercase' }}>Eligible – Pending Issue</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0284C7', marginTop: '4px' }}>
                    {cert.kpis?.eligiblePending || 0}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>Met Criteria</div>
                </div>

                <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', borderLeft: '4px solid #F59E0B' }}>
                  <div style={{ fontSize: '0.72rem', color: '#B45309', fontWeight: 800, textTransform: 'uppercase' }}>In Progress</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>
                    {cert.kpis?.inProgress || 0}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>Training Ongoing</div>
                </div>

                <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', borderLeft: '4px solid #EF4444' }}>
                  <div style={{ fontSize: '0.72rem', color: '#B91C1C', fontWeight: 800, textTransform: 'uppercase' }}>Below Criteria</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#EF4444', marginTop: '4px' }}>
                    {cert.kpis?.notEligible || 0}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>Requires Remediation</div>
                </div>
              </div>

              {/* Certificates List Table */}
              <div style={{ borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0F172A' }}>
                    Program Certificate Register
                  </span>
                  <button
                    onClick={() => navigate('/certificates')}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#0284C7',
                      fontWeight: 700,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    Open Certificate Vault →
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#FFFFFF', textAlign: 'left', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Certificate ID</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Participant Name</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Program</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Project</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Issue Date</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Status</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(cert.certificates || []).length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
                            No certificates issued or pending across selected scope.
                          </td>
                        </tr>
                      ) : (
                        (cert.certificates || []).map((c, i) => {
                          const normStatus = (c.status || '').toUpperCase();
                          const isIssued = ['ISSUED', 'VALID'].includes(normStatus);
                          const isEligiblePending = ['ELIGIBLE', 'ELIGIBLE - PENDING', 'DRAFT', 'PENDING'].includes(normStatus);
                          const canView = isIssued && Boolean(c.certificateId || c.id);

                          return (
                            <tr key={c.id || i} style={{ borderBottom: '1px solid #E2E8F0' }}>
                              <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 800 }}>
                                {canView ? (
                                  <button
                                    onClick={() => {
                                      setViewingCertificateId(c.certificateId || c.id);
                                      setIsCertViewerOpen(true);
                                    }}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#0284C7',
                                      fontFamily: 'monospace',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      padding: 0,
                                      textDecoration: 'underline',
                                      fontSize: '0.82rem'
                                    }}
                                  >
                                    {c.certificateId || 'VIEW'}
                                  </button>
                                ) : (
                                  <span style={{ color: '#64748B' }}>{c.certificateId || 'PENDING'}</span>
                                )}
                              </td>
                              <td style={{ padding: '10px 14px', fontWeight: 700 }}>{c.participantName}</td>
                              <td style={{ padding: '10px 14px' }}>{c.program || 'Capability Cert'}</td>
                              <td style={{ padding: '10px 14px' }}>{c.projectName || currentProject?.name || 'Idonneous'}</td>
                              <td style={{ padding: '10px 14px', color: '#64748B' }}>{c.issueDate || '—'}</td>
                              <td style={{ padding: '10px 14px' }}>
                                <StatusBadge
                                  status={isIssued ? 'success' : isEligiblePending ? 'warning' : 'neutral'}
                                  label={c.status}
                                  size="sm"
                                />
                              </td>
                              <td style={{ padding: '10px 14px' }}>
                                {canView ? (
                                  <button
                                    onClick={() => {
                                      setViewingCertificateId(c.certificateId || c.id);
                                      setIsCertViewerOpen(true);
                                    }}
                                    style={{
                                      padding: '3px 8px',
                                      borderRadius: '5px',
                                      border: '1px solid #CBD5E1',
                                      background: '#FFFFFF',
                                      color: '#0284C7',
                                      fontWeight: 700,
                                      fontSize: '0.74rem',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    <Eye size={12} /> View Certificate
                                  </button>
                                ) : isEligiblePending ? (
                                  <button
                                    onClick={() => navigate('/certificates')}
                                    style={{
                                      padding: '3px 8px',
                                      borderRadius: '5px',
                                      border: 'none',
                                      background: '#10B981',
                                      color: '#FFFFFF',
                                      fontWeight: 700,
                                      fontSize: '0.74rem',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    <Award size={12} /> Issue Certificate
                                  </button>
                                ) : (
                                  <span style={{ color: '#94A3B8' }}>—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

            </div>
          </div>
        )}
      </div>

      {/* ─── 5. PERSISTENT ESCALATION MANAGER (SCOPED TO AUTHORIZED PROJECT) ─── */}
      <EscalationManager projectId={selectedProjectId !== 'all' ? selectedProjectId : null} />

      {/* ─── MODALS ─── */}
      <Participant360Modal
        isOpen={is360ModalOpen}
        onClose={() => setIs360ModalOpen(false)}
        participantId={selectedParticipantId}
        token={token}
        selectedProjectId={selectedProjectId}
        selectedSubProjectId={selectedSubProjectId}
      />

      <CertificateViewer
        isOpen={isCertViewerOpen}
        onClose={() => setIsCertViewerOpen(false)}
        certificateId={viewingCertificateId}
        token={token}
      />

    </div>
  );
}
