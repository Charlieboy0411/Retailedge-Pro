import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FileSpreadsheet, Presentation, Eye, Download, RefreshCw,
  Sparkles, Calendar, Users, CheckCircle2, AlertTriangle,
  Layers, Search, ChevronRight, X, Clock, Award, BookOpen,
  Filter, CheckCircle, ShieldAlert, BarChart2, Play
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generate15SlidePPT } from '../utils/pptHelper';
import { generateExcelReport } from '../utils/excelHelper';
import { downloadWorkbook, downloadPPT } from '../utils/downloadWorkbook';

export default function TrainerReportCenter({ token, user }) {
  const navigate = useNavigate();

  // Data States
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [reports, setReports] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [certEligibility, setCertEligibility] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);

  // Hierarchy Filter States (Project -> Subproject -> Session -> Quiz)
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedSubProjectId, setSelectedSubProjectId] = useState('all');
  const [selectedSessionId, setSelectedSessionId] = useState('all');
  const [selectedQuizId, setSelectedQuizId] = useState('all');
  const [dateFilter, setDateFilter] = useState('All'); // 'Today' | '7d' | '30d' | 'All'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drilldown
  const [activeModal, setActiveModal] = useState(null); // 'quiz' | 'training' | 'participant' | 'cert' | 'detail'
  const [selectedReportDetail, setSelectedReportDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Fetch Authoritative Data (Trainer Scoped)
  const fetchTrainerReportData = async (isSilent = false) => {
    if (!token) return;
    try {
      if (!isSilent) setLoading(true);

      const [projRes, repRes, trainRes, certRes, attRes] = await Promise.allSettled([
        axios.get('/api/projects/my-projects', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/reports', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/trainings', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/certificates/eligibility', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/reports/attendance', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (projRes.status === 'fulfilled' && projRes.value.data) {
        setAssignedProjects(Array.isArray(projRes.value.data) ? projRes.value.data : []);
      }
      if (repRes.status === 'fulfilled' && repRes.value.data) {
        setReports(Array.isArray(repRes.value.data) ? repRes.value.data : []);
      }
      if (trainRes.status === 'fulfilled' && trainRes.value.data) {
        setTrainings(Array.isArray(trainRes.value.data) ? trainRes.value.data : []);
      }
      if (certRes.status === 'fulfilled' && certRes.value.data) {
        setCertEligibility(Array.isArray(certRes.value.data) ? certRes.value.data : []);
      }
      if (attRes.status === 'fulfilled' && attRes.value.data) {
        const attData = attRes.value.data;
        const combined = [
          ...(attData.quizAttendance || []),
          ...(attData.trainingAttendance || [])
        ];
        setAttendanceLogs(combined);
      }
    } catch (err) {
      console.error('Error fetching Trainer Report Center data:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainerReportData();
  }, [token]);

  // Handle Project Change in Filter
  const handleProjectSelect = (projId) => {
    setSelectedProjectId(projId);
    setSelectedSubProjectId('all');
    setSelectedSessionId('all');
    setSelectedQuizId('all');
  };

  // Subprojects available for selected project
  const currentProject = assignedProjects.find(p => p.id === selectedProjectId);
  const availableSubprojects = currentProject ? (currentProject.subprojects || currentProject.subProjects || []) : [];

  // Scoped Data based on Hierarchy Filters
  const filteredReports = reports.filter(r => {
    // Project Match
    if (selectedProjectId !== 'all') {
      const pMatch = r.projectId === selectedProjectId || r.projectName === currentProject?.name;
      if (!pMatch) return false;
    }
    // Subproject Match
    if (selectedSubProjectId !== 'all') {
      const spMatch = r.subProjectId === selectedSubProjectId || r.subProjectName === selectedSubProjectId;
      if (!spMatch) return false;
    }
    // Quiz Match
    if (selectedQuizId !== 'all' && r.quizId !== selectedQuizId && r.id !== selectedQuizId) {
      return false;
    }
    // Date Match
    if (dateFilter !== 'All' && r.date) {
      const rDate = new Date(r.date);
      const now = new Date();
      if (dateFilter === 'Today') {
        if (rDate.toDateString() !== now.toDateString()) return false;
      } else if (dateFilter === '7d') {
        const past7 = new Date();
        past7.setDate(now.getDate() - 7);
        if (rDate < past7) return false;
      } else if (dateFilter === '30d') {
        const past30 = new Date();
        past30.setDate(now.getDate() - 30);
        if (rDate < past30) return false;
      }
    }
    // Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const titleMatch = (r.title || r.quizTitle || '').toLowerCase().includes(q);
      const projMatch = (r.projectName || '').toLowerCase().includes(q);
      if (!titleMatch && !projMatch) return false;
    }
    return true;
  });

  const filteredTrainings = trainings.filter(t => {
    if (selectedProjectId !== 'all' && t.projectId !== selectedProjectId) return false;
    if (selectedSubProjectId !== 'all' && t.subProjectId !== selectedSubProjectId) return false;
    return true;
  });

  // Calculate Operational Metrics
  const totalQuizzesCount = filteredReports.length;
  const avgQuizScore = totalQuizzesCount > 0
    ? Math.round(filteredReports.reduce((sum, r) => sum + (parseInt(r.avgScore) || 0), 0) / totalQuizzesCount)
    : 0;
  const totalQuizParticipants = filteredReports.reduce((sum, r) => sum + (r.participants || 0), 0);
  const quizPassRate = totalQuizzesCount > 0
    ? Math.round((filteredReports.filter(r => (parseInt(r.avgScore) || 0) >= 70).length / totalQuizzesCount) * 100)
    : 0;

  const totalTrainingsCount = filteredTrainings.length;
  const completedTrainingsCount = filteredTrainings.filter(t => t.status === 'Completed' || t.status === 'Finished').length;
  const totalEnrolledLearners = filteredTrainings.reduce((sum, t) => sum + (t.participants?.length || t.inviteeCount || 0), 0);

  const certEligibleCount = certEligibility.length;
  const certIssuedCount = certEligibility.filter(c => c.isIssued || c.issued).length;
  const certPendingCount = certEligibleCount - certIssuedCount;

  // View Report Details
  const handleViewReportDetail = async (report) => {
    try {
      setLoadingDetail(true);
      setActiveModal('detail');
      const res = await axios.get(`/api/reports/${report.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedReportDetail(res.data || report);
    } catch (err) {
      console.error('Failed to fetch detailed report:', err);
      setSelectedReportDetail(report);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Ensure session has full participant details before export
  const ensureSessionDetail = async (report) => {
    if (report.participants && Array.isArray(report.participants) && report.participants.length > 0 && typeof report.participants[0] === 'object') {
      return report;
    }
    try {
      const res = await axios.get(`/api/reports/${report.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return { ...report, ...res.data };
    } catch (err) {
      console.warn('Could not fetch full session detail for export, using report summary', err);
      return report;
    }
  };

  // Export Individual Report to Excel
  const handleExportSessionExcel = async (report) => {
    try {
      const fullReport = await ensureSessionDetail(report);
      await generateExcelReport('quiz', fullReport, {
        presenterName: user?.name || 'Trainer',
        footerText: `RetailEdge Pro · ${fullReport.projectName || 'Training'}`
      });
    } catch (err) {
      console.error('Failed to generate Excel report:', err);
      alert('Failed to generate Excel report');
    }
  };

  // Export Individual Report to PPT
  const handleExportSessionPPT = async (report) => {
    try {
      const fullReport = await ensureSessionDetail(report);
      await generate15SlidePPT(
        fullReport,
        [],
        'standard',
        {
          presenterName: user?.name || 'Trainer',
          footerText: `RetailEdge Pro · ${fullReport.projectName || 'Training'}`
        }
      );
    } catch (err) {
      console.error('Failed to generate PowerPoint deck:', err);
      alert('Failed to generate PowerPoint deck');
    }
  };

  // Export Combined Operational Excel
  const handleExportAllExcel = () => {
    try {
      setExporting(true);
      if (filteredReports.length === 0) {
        alert('No report data available to export.');
        return;
      }
      const primaryReport = filteredReports[0];
      generateExcelReport(primaryReport, currentProject?.name || 'Assigned_Projects');
    } catch (err) {
      alert('Failed to generate combined Excel report.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ─── BANNER & OPERATIONAL HEADER ─── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          padding: '24px 28px',
          borderRadius: '16px',
          border: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.4)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                background: '#2563EB',
                color: '#FFFFFF',
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '6px',
                letterSpacing: '0.05em'
              }}
            >
              TRAINER INTELLIGENCE
            </span>
            <span style={{ color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600 }}>
              Live Scoped Operational Analytics
            </span>
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
            Training Outcome & Assessment Center
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#94A3B8', fontSize: '0.85rem' }}>
            Hierarchical analytics across assigned projects, training cohorts, and participant certifications.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => fetchTrainerReportData(false)}
            disabled={syncing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '8px',
              border: '1px solid #475569',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#F8FAFC',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            Sync
          </button>

          <button
            onClick={handleExportAllExcel}
            disabled={exporting || filteredReports.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#16A34A',
              color: '#FFFFFF',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <FileSpreadsheet size={14} />
            Export Scoped Excel
          </button>
        </div>
      </div>

      {/* ─── AUTHORITATIVE HIERARCHY FILTER BAR ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'var(--bg-glass)',
          padding: '16px 20px',
          borderRadius: '14px',
          border: '1px solid #B7BEC7',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 700 }}>
          <Filter size={15} />
          <span>Hierarchy:</span>
        </div>

        {/* Level 1: Project */}
        <select
          value={selectedProjectId}
          onChange={(e) => handleProjectSelect(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #B7BEC7',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            fontSize: '0.82rem',
            fontWeight: 600,
            outline: 'none',
            minWidth: '170px'
          }}
        >
          <option value="all">All Assigned Projects</option>
          {assignedProjects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {/* Level 2: Subproject */}
        <select
          value={selectedSubProjectId}
          onChange={(e) => setSelectedSubProjectId(e.target.value)}
          disabled={availableSubprojects.length === 0}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #B7BEC7',
            background: availableSubprojects.length === 0 ? 'rgba(0,0,0,0.03)' : 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            fontSize: '0.82rem',
            fontWeight: 600,
            outline: 'none',
            minWidth: '160px'
          }}
        >
          <option value="all">All Subprojects</option>
          {availableSubprojects.map(sp => (
            <option key={sp.id || sp.name} value={sp.id || sp.name}>{sp.name}</option>
          ))}
        </select>

        {/* Level 3: Session */}
        <select
          value={selectedSessionId}
          onChange={(e) => setSelectedSessionId(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #B7BEC7',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            fontSize: '0.82rem',
            fontWeight: 600,
            outline: 'none',
            minWidth: '160px'
          }}
        >
          <option value="all">All Training Sessions</option>
          {filteredTrainings.map(t => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>

        {/* Date Filter */}
        <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '3px', marginLeft: 'auto' }}>
          {['All', '30d', '7d', 'Today'].map(df => (
            <button
              key={df}
              onClick={() => setDateFilter(df)}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: 'none',
                background: dateFilter === df ? 'var(--primary)' : 'transparent',
                color: dateFilter === df ? '#FFFFFF' : 'var(--text-secondary)',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {df === 'All' ? 'All Time' : df}
            </button>
          ))}
        </div>
      </div>

      {/* ─── FOUR OPERATIONAL INTELLIGENCE CARDS ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px'
        }}
      >
        {/* Card 1: Quiz Performance */}
        <div
          className="glass-card"
          onClick={() => setActiveModal('quiz')}
          style={{
            background: 'var(--bg-glass)',
            border: '1px solid #B7BEC7',
            borderRadius: '16px',
            padding: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#2563EB'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#B7BEC7'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Quiz Performance</span>
              <h3 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
                {avgQuizScore}%
              </h3>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
              <Award size={20} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '14px', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
            <span><strong>{totalQuizzesCount}</strong> Quizzes</span>
            <span>•</span>
            <span><strong>{totalQuizParticipants}</strong> Submissions</span>
            <span>•</span>
            <span style={{ color: '#16A34A', fontWeight: 700 }}>{quizPassRate}% Pass</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '12px', color: '#2563EB', fontSize: '0.76rem', fontWeight: 700 }}>
            <span>View Quiz Drilldown</span>
            <ChevronRight size={14} />
          </div>
        </div>

        {/* Card 2: Training Outcome */}
        <div
          className="glass-card"
          onClick={() => setActiveModal('training')}
          style={{
            background: 'var(--bg-glass)',
            border: '1px solid #B7BEC7',
            borderRadius: '16px',
            padding: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#7C3AED'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#B7BEC7'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Training Outcome</span>
              <h3 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
                {completedTrainingsCount} / {totalTrainingsCount}
              </h3>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED' }}>
              <BookOpen size={20} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '14px', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
            <span><strong>{totalEnrolledLearners}</strong> Enrolled</span>
            <span>•</span>
            <span style={{ color: '#7C3AED', fontWeight: 700 }}>
              {totalTrainingsCount > 0 ? Math.round((completedTrainingsCount / totalTrainingsCount) * 100) : 0}% Complete
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '12px', color: '#7C3AED', fontSize: '0.76rem', fontWeight: 700 }}>
            <span>View Training Cohorts</span>
            <ChevronRight size={14} />
          </div>
        </div>

        {/* Card 3: Participant Intelligence */}
        <div
          className="glass-card"
          onClick={() => setActiveModal('participant')}
          style={{
            background: 'var(--bg-glass)',
            border: '1px solid #B7BEC7',
            borderRadius: '16px',
            padding: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#059669'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#B7BEC7'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Participant Intelligence</span>
              <h3 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
                {totalEnrolledLearners}
              </h3>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <Users size={20} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '14px', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
            <span><strong>{attendanceLogs.length}</strong> Attendance Logs</span>
            <span>•</span>
            <span style={{ color: '#16A34A', fontWeight: 700 }}>Active Roster</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '12px', color: '#059669', fontSize: '0.76rem', fontWeight: 700 }}>
            <span>View Participant Roster</span>
            <ChevronRight size={14} />
          </div>
        </div>

        {/* Card 4: Certification Status */}
        <div
          className="glass-card"
          onClick={() => setActiveModal('cert')}
          style={{
            background: 'var(--bg-glass)',
            border: '1px solid #B7BEC7',
            borderRadius: '16px',
            padding: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#D97706'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#B7BEC7'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Certification Status</span>
              <h3 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
                {certIssuedCount} / {certEligibleCount}
              </h3>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(217,119,6,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' }}>
              <Sparkles size={20} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '14px', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
            <span><strong>{certPendingCount}</strong> Pending Issue</span>
            <span>•</span>
            <span style={{ color: '#D97706', fontWeight: 700 }}>
              {certEligibleCount > 0 ? Math.round((certIssuedCount / certEligibleCount) * 100) : 0}% Rate
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '12px', color: '#D97706', fontSize: '0.76rem', fontWeight: 700 }}>
            <span>Manage Certificates</span>
            <ChevronRight size={14} />
          </div>
        </div>
      </div>

      {/* ─── OPERATIONAL REPORTS TABLE (SCOPED REAL DATA) ─── */}
      <div
        className="glass-card"
        style={{
          background: 'var(--bg-glass)',
          border: '1px solid #B7BEC7',
          borderRadius: '16px',
          padding: '24px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Completed Quiz Assessment Reports
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Authoritative quiz session outcomes and exportable intelligence decks
            </p>
          </div>

          {/* Search Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-tertiary)', border: '1px solid #B7BEC7', padding: '6px 12px', borderRadius: '8px', width: '240px' }}>
            <Search size={14} color="var(--text-secondary)" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.8rem', color: 'var(--text-primary)', width: '100%' }}
            />
          </div>
        </div>

        {/* Table / Empty State */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
            <div>Loading operational reports...</div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', borderRadius: '12px' }}>
            <BarChart2 size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              No Training Assessment Reports Found
            </div>
            <div style={{ fontSize: '0.78rem', marginTop: '4px', maxWidth: '380px', margin: '4px auto 0' }}>
              No completed quizzes match the selected project hierarchy and timeframe. Host or complete a quiz session to generate live reports.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-glass)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Assessment Title</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Project / Hierarchy</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Date</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Participants</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Avg Score</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report, idx) => {
                  const score = parseInt(report.avgScore) || 0;
                  const badgeColor = score >= 80 ? '#15803D' : (score >= 60 ? '#A16207' : '#DC2626');
                  const badgeBg = score >= 80 ? 'rgba(34, 197, 94, 0.15)' : (score >= 60 ? '#FEF08A' : '#FEE2E2');

                  return (
                    <tr
                      key={report.id || idx}
                      style={{ borderBottom: '1px solid var(--bg-tertiary)', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {report.title || report.quizTitle || 'Quiz Assessment'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{report.projectName || 'Assigned Project'}</div>
                        {report.subProjectName && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{report.subProjectName}</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                        {report.date ? new Date(report.date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                        {report.participants || 0}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '12px', background: badgeBg, color: badgeColor, fontWeight: 700, fontSize: '0.76rem' }}>
                          {score}%
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(34, 197, 94, 0.15)', color: '#16A34A', fontWeight: 700, fontSize: '0.72rem' }}>
                          {report.status || 'Finished'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            onClick={() => handleViewReportDetail(report)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: '1px solid #B7BEC7',
                              background: 'var(--bg-glass)',
                              color: 'var(--text-primary)',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="View Full Report"
                          >
                            <Eye size={13} /> View
                          </button>

                          <button
                            onClick={() => handleExportSessionExcel(report)}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              border: '1px solid #B7BEC7',
                              background: 'var(--bg-glass)',
                              color: '#16A34A',
                              fontSize: '0.74rem',
                              cursor: 'pointer'
                            }}
                            title="Export Excel"
                          >
                            <FileSpreadsheet size={13} />
                          </button>

                          <button
                            onClick={() => handleExportSessionPPT(report)}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              border: '1px solid #B7BEC7',
                              background: 'var(--bg-glass)',
                              color: '#7C3AED',
                              fontSize: '0.74rem',
                              cursor: 'pointer'
                            }}
                            title="Export PowerPoint"
                          >
                            <Presentation size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── DRILLDOWN MODAL: QUIZ PERFORMANCE ─── */}
      {activeModal === 'quiz' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(3px)' }}>
          <div className="glass-card" style={{ width: '640px', background: 'var(--bg-glass)', maxHeight: '85vh', overflowY: 'auto', padding: '28px', borderRadius: '16px', border: '1px solid #B7BEC7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={22} color="#2563EB" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>Quiz Performance Breakdown</h3>
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredReports.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{r.title || r.quizTitle}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {r.projectName} • {r.participants || 0} Submissions
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, padding: '3px 8px', borderRadius: '8px', background: 'rgba(37,99,235,0.1)', color: '#2563EB' }}>
                      Avg {r.avgScore || '0%'}
                    </span>
                    <button
                      onClick={() => handleViewReportDetail(r)}
                      style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #B7BEC7', background: 'var(--bg-glass)', cursor: 'pointer', fontSize: '0.74rem' }}
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              ))}
              {filteredReports.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No quizzes recorded.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── DRILLDOWN MODAL: TRAINING OUTCOME ─── */}
      {activeModal === 'training' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(3px)' }}>
          <div className="glass-card" style={{ width: '640px', background: 'var(--bg-glass)', maxHeight: '85vh', overflowY: 'auto', padding: '28px', borderRadius: '16px', border: '1px solid #B7BEC7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={22} color="#7C3AED" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>Training Cohort Outcomes</h3>
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredTrainings.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{t.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {t.platform || 'Meeting'} • {t.participants?.length || t.inviteeCount || 0} Enrolled
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: t.status === 'Completed' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', color: t.status === 'Completed' ? '#16A34A' : '#D97706' }}>
                    {t.status || 'Active'}
                  </span>
                </div>
              ))}
              {filteredTrainings.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No training sessions recorded.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── DRILLDOWN MODAL: PARTICIPANT INTELLIGENCE ─── */}
      {activeModal === 'participant' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(3px)' }}>
          <div className="glass-card" style={{ width: '640px', background: 'var(--bg-glass)', maxHeight: '85vh', overflowY: 'auto', padding: '28px', borderRadius: '16px', border: '1px solid #B7BEC7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={22} color="#059669" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>Participant Intelligence & Attendance</h3>
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {attendanceLogs.slice(0, 15).map((log, i) => (
                <div key={log.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '0.82rem' }}>
                  <div>
                    <span style={{ fontWeight: 700 }}>{log.userName || log.name || 'Participant'}</span>
                    <span style={{ color: 'var(--text-secondary)', marginLeft: '8px', fontSize: '0.74rem' }}>{log.projectName || ''}</span>
                  </div>
                  <span style={{ color: '#16A34A', fontWeight: 700, fontSize: '0.74rem' }}>
                    {log.status || 'Attended'}
                  </span>
                </div>
              ))}
              {attendanceLogs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No attendance records found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── DRILLDOWN MODAL: CERTIFICATION STATUS ─── */}
      {activeModal === 'cert' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(3px)' }}>
          <div className="glass-card" style={{ width: '640px', background: 'var(--bg-glass)', maxHeight: '85vh', overflowY: 'auto', padding: '28px', borderRadius: '16px', border: '1px solid #B7BEC7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={22} color="#D97706" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>Certification Issuance Status</h3>
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'rgba(217,119,6,0.08)', borderRadius: '10px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Issue Certificates to Eligible Learners</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Authorized issuance within your assigned projects</div>
              </div>
              <button
                onClick={() => navigate('/certificates')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#D97706',
                  color: 'white',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Go to Issuance Wizard
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {certEligibility.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '0.82rem' }}>
                  <div>
                    <span style={{ fontWeight: 700 }}>{c.name}</span>
                    <span style={{ color: 'var(--text-secondary)', marginLeft: '8px', fontSize: '0.74rem' }}>{c.projectName || ''}</span>
                  </div>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', background: c.isIssued ? 'rgba(34,197,94,0.15)' : 'rgba(217,119,6,0.15)', color: c.isIssued ? '#16A34A' : '#D97706', fontWeight: 700, fontSize: '0.72rem' }}>
                    {c.isIssued ? 'Issued' : 'Pending'}
                  </span>
                </div>
              ))}
              {certEligibility.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No eligible learners recorded.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── REPORT DETAIL INSPECTOR MODAL ─── */}
      {activeModal === 'detail' && selectedReportDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, backdropFilter: 'blur(4px)' }}>
          <div className="glass-card" style={{ width: '850px', maxWidth: '95vw', background: 'var(--bg-glass)', maxHeight: '88vh', overflowY: 'auto', padding: '28px', borderRadius: '16px', border: '1px solid #B7BEC7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {selectedReportDetail.title || selectedReportDetail.quizTitle}
                </h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {selectedReportDetail.projectName} • {selectedReportDetail.date}
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>

            {/* Metric Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Participants</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {selectedReportDetail.participantsCount || (Array.isArray(selectedReportDetail.participants) ? selectedReportDetail.participants.length : selectedReportDetail.participants) || 0}
                </div>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Average Score</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2563EB' }}>{selectedReportDetail.avgScore || '0%'}</div>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Questions</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {selectedReportDetail.totalQuestions || (selectedReportDetail.questions ? selectedReportDetail.questions.length : 0)}
                </div>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#16A34A' }}>{selectedReportDetail.status || 'Finished'}</div>
              </div>
            </div>

            {/* Learner Roster Table */}
            {Array.isArray(selectedReportDetail.participants) && selectedReportDetail.participants.length > 0 && typeof selectedReportDetail.participants[0] === 'object' && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Learner Roster ({selectedReportDetail.participants.length})
                </h4>
                <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-glass)' }}>
                        <th style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Learner</th>
                        <th style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Assessment Score</th>
                        <th style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Assessment %</th>
                        <th style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Arena Points</th>
                        <th style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Completion</th>
                        <th style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Time Spent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReportDetail.participants.map((p, idx) => {
                        const pctVal = parseInt(p.percentage) || 0;
                        const isPass = pctVal >= 70;
                        return (
                          <tr key={p.id || idx} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{p.employeeId || 'ID: N/A'}</div>
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {p.score || '0 / 0'}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                background: isPass ? 'rgba(22, 163, 74, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: isPass ? '#16A34A' : '#EF4444'
                              }}>
                                {p.percentage || '0%'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#F59E0B' }}>
                              {p.arenaPoints != null ? `${p.arenaPoints} pts` : '0 pts'}
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                              {p.completion || '100%'}
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                              {p.timeSpent || '0s'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Questions Roster */}
            {selectedReportDetail.questions && selectedReportDetail.questions.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.92rem', fontWeight: 700 }}>Questions Analysis ({selectedReportDetail.questions.length})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedReportDetail.questions.map((q, i) => (
                    <div key={q.id || i} style={{ padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '0.8rem' }}>
                      <div style={{ fontWeight: 600 }}>{i + 1}. {q.text}</div>
                      <div style={{ color: '#16A34A', fontSize: '0.74rem', marginTop: '3px' }}>
                        Correct: {q.correct_answer}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Export Actions inside Modal */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid var(--border-glass)' }}>
              <button
                onClick={() => handleExportSessionExcel(selectedReportDetail)}
                style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #B7BEC7', background: 'var(--bg-glass)', color: '#16A34A', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <FileSpreadsheet size={14} /> Export Excel
              </button>
              <button
                onClick={() => handleExportSessionPPT(selectedReportDetail)}
                style={{ padding: '8px 14px', borderRadius: '6px', border: 'none', background: '#7C3AED', color: 'white', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <Presentation size={14} /> Export PPT
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
