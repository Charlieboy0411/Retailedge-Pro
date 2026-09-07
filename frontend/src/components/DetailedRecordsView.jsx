import React, { useState } from 'react';
import axios from 'axios';
import { 
  BarChart2, Users, Calendar, CheckCircle, FileText, Presentation, 
  ArrowRight, Download, Send, AlertTriangle, Eye, ShieldAlert, Sparkles,
  TrendingUp, Clock, UserCheck, Search, Filter, Video, Award, ShieldCheck,
  ExternalLink, ChevronRight
} from 'lucide-react';
import Participant360Modal from './Participant360Modal';
import CertificateViewer from './CertificateViewer';
import { generateMasterOutcomeExcel } from '../utils/masterOutcomeReportHelper';
import ReportCenterView from './ReportCenterView';

export default function DetailedRecordsView({
  projectUsers = [],
  projectsList = [],
  reports = [],
  attendanceData = {},
  intelligenceData = null,
  onExportExcel,
  onExportPPT,
  selectedProjectId = 'all',
  selectedSubProjectId = 'all',
  dateRange = '7d',
  token,
  projectInfo = null,
  fetchSessionDetails,
  fetchingDetails = false,
  handleDownloadSessionPPT,
  handleDownloadSessionExcel,
  onExportPMExcel,
  onExportPMPPT,
  user = null
}) {
  // 10 Required Tabs
  const [activeTab, setActiveTab] = useState('overview');
  const [reportsSubTab, setReportsSubTab] = useState('intelligent'); // 'intelligent' | 'operational'
  const [attendanceSubTab, setAttendanceSubTab] = useState('quiz');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParticipantId, setSelectedParticipantId] = useState(null);
  const [is360ModalOpen, setIs360ModalOpen] = useState(false);
  const [downloadingOutcome, setDownloadingOutcome] = useState(false);
  const [attemptFilter, setAttemptFilter] = useState('ALL');
  const [dataIntegrity, setDataIntegrity] = useState(null);
  const [viewingCertificateId, setViewingCertificateId] = useState(null);
  const [isCertViewerOpen, setIsCertViewerOpen] = useState(false);

  React.useEffect(() => {
    if (activeTab === 'audit' && token) {
      axios.get('/api/projects/data-integrity', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setDataIntegrity(res.data))
        .catch(() => setDataIntegrity(null));
    }
  }, [activeTab, token]);

  // Extract from intelligence data
  const kpis = intelligenceData?.kpis || {};
  const jitsi = intelligenceData?.jitsiAttendance || { live: [], history: [] };
  const quiz = intelligenceData?.quizIntelligence || { attemptsList: [], quizzes: [] };
  const cert = intelligenceData?.certificationIntelligence || { certificates: [] };

  const quizAttendance = attendanceData?.quizAttendance || [];
  const trainingAttendance = attendanceData?.trainingAttendance || [];

  const handleOpen360 = (pId) => {
    setSelectedParticipantId(pId);
    setIs360ModalOpen(true);
  };

  // Master Outcome Download
  const handleDownloadMasterOutcome = async () => {
    try {
      setDownloadingOutcome(true);
      const res = await axios.get(`/api/reports/master-outcome?projectId=${selectedProjectId}&subProjectId=${selectedSubProjectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const activeProjName = projectsList.find(p => p.id === selectedProjectId)?.name || 'All_Projects';
      generateMasterOutcomeExcel(res.data || [], activeProjName);
    } catch (err) {
      console.error('Failed to download master outcome:', err);
      alert('Failed to generate master training outcome export.');
    } finally {
      setDownloadingOutcome(false);
    }
  };

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'sessions', label: '📅 Sessions' },
    { id: 'jitsi', label: '📹 Jitsi Attendance' },
    { id: 'quiz_sessions', label: '🎯 Quiz Sessions' },
    { id: 'quiz_attempts', label: '📝 Quiz Attempts' },
    { id: 'attendance', label: '👥 Attendance' },
    { id: 'participants', label: '👤 Participants' },
    { id: 'certifications', label: '🎓 Certifications' },
    { id: 'reports', label: '✨ Reports & Analytics' },
    { id: 'audit', label: '🛡️ Audit Logs' }
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: 'var(--text-primary, #0F172A)' }}>
      
      {/* ─── TAB NAVIGATION ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '1px solid var(--border-glass, #E2E8F0)',
        marginBottom: '24px',
        overflowX: 'auto',
        paddingBottom: '2px'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: activeTab === tab.id ? '#0284C7' : '#64748B',
              borderBottom: activeTab === tab.id ? '2px solid #0284C7' : '2px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.18s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── TAB 1: OVERVIEW ─── */}
      {activeTab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Quiz Sessions</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px' }}>{reports.length}</div>
            </div>
            <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Attempts</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px', color: '#0284C7' }}>{quiz.kpis?.totalAttempts || 0}</div>
            </div>
            <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Jitsi Telemetry Records</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px', color: '#10B981' }}>{jitsi.overview?.totalRecorded || 0}</div>
            </div>
            <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Certificates Issued</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px', color: '#EC4899' }}>{cert.kpis?.issued || 0}</div>
            </div>
          </div>

          {/* Quick Outcome Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            color: '#FFFFFF',
            borderRadius: '14px',
            padding: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 800 }}>
                Master Training Outcome Intelligence Report
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94A3B8' }}>
                Consolidates 21 key metrics: Project, Jitsi Intervals, Duration %, Online/Offline Quizzes, Scores, and Certificate IDs.
              </p>
            </div>
            <button
              onClick={handleDownloadMasterOutcome}
              disabled={downloadingOutcome}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                background: '#0284C7',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: downloadingOutcome ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Download size={16} />
              {downloadingOutcome ? 'Generating Excel...' : 'Export Master Outcome (Excel)'}
            </button>
          </div>
        </div>
      )}

      {/* ─── TAB 2: SESSIONS ─── */}
      {activeTab === 'sessions' && (
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', textAlign: 'left', color: '#64748B' }}>
                <th style={{ padding: '12px 14px' }}>Session / Material</th>
                <th style={{ padding: '12px 14px' }}>Project</th>
                <th style={{ padding: '12px 14px' }}>Date</th>
                <th style={{ padding: '12px 14px' }}>Participants</th>
                <th style={{ padding: '12px 14px' }}>Avg Score</th>
                <th style={{ padding: '12px 14px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r, idx) => (
                <tr key={r.id || idx} style={{ borderTop: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 700 }}>{r.title}</td>
                  <td style={{ padding: '12px 14px' }}>{r.projectName}</td>
                  <td style={{ padding: '12px 14px', color: '#64748B' }}>{r.date}</td>
                  <td style={{ padding: '12px 14px' }}>{r.participants}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 700 }}>{r.avgScore}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, background: '#10B98118', color: '#10B981' }}>
                      {r.status || 'Finished'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── TAB 3: JITSI ATTENDANCE ─── */}
      {activeTab === 'jitsi' && (
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', textAlign: 'left', color: '#64748B' }}>
                <th style={{ padding: '12px 14px' }}>Participant</th>
                <th style={{ padding: '12px 14px' }}>Employee ID</th>
                <th style={{ padding: '12px 14px' }}>Training Meeting</th>
                <th style={{ padding: '12px 14px' }}>Join Time</th>
                <th style={{ padding: '12px 14px' }}>Leave Time</th>
                <th style={{ padding: '12px 14px' }}>Total Duration</th>
                <th style={{ padding: '12px 14px' }}>Rejoins</th>
                <th style={{ padding: '12px 14px' }}>Attendance %</th>
                <th style={{ padding: '12px 14px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {[...(jitsi.live || []), ...(jitsi.history || [])].map((item, idx) => (
                <tr key={item.id || idx} style={{ borderTop: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 700 }}>{item.participantName}</td>
                  <td style={{ padding: '12px 14px', color: '#64748B' }}>{item.employeeId}</td>
                  <td style={{ padding: '12px 14px' }}>{item.trainingTitle}</td>
                  <td style={{ padding: '12px 14px' }}>{item.joinTime}</td>
                  <td style={{ padding: '12px 14px' }}>{item.leaveTime}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 700 }}>{item.totalDuration}</td>
                  <td style={{ padding: '12px 14px' }}>{item.rejoins}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: item.attendancePercentage >= 75 ? '#10B981' : '#F59E0B' }}>
                    {item.attendancePercentage}%
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700,
                      background: item.status === 'Online' ? '#10B98118' : item.status === 'Completed' ? '#0284C718' : '#EF444418',
                      color: item.status === 'Online' ? '#10B981' : item.status === 'Completed' ? '#0284C7' : '#EF4444'
                    }}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── TAB 4: QUIZ SESSIONS ─── */}
      {activeTab === 'quiz_sessions' && (
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', textAlign: 'left', color: '#64748B' }}>
                <th style={{ padding: '12px 14px' }}>Quiz Title</th>
                <th style={{ padding: '12px 14px' }}>Project</th>
                <th style={{ padding: '12px 14px' }}>Host / Trainer</th>
                <th style={{ padding: '12px 14px' }}>Participants</th>
                <th style={{ padding: '12px 14px' }}>Avg Score</th>
                <th style={{ padding: '12px 14px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r, i) => (
                <tr key={r.id || i} style={{ borderTop: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 700 }}>{r.title}</td>
                  <td style={{ padding: '12px 14px' }}>{r.projectName}</td>
                  <td style={{ padding: '12px 14px' }}>{r.hostName}</td>
                  <td style={{ padding: '12px 14px' }}>{r.participants}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 700 }}>{r.avgScore}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <button
                      onClick={() => handleDownloadSessionExcel && handleDownloadSessionExcel(r.id)}
                      style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0284C7', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                    >
                      Export Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── TAB 5: QUIZ ATTEMPTS ─── */}
      {activeTab === 'quiz_attempts' && (
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {/* Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>
              Individual Assessment Attempts
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['ALL', 'ONLINE', 'OFFLINE'].map(t => (
                <button
                  key={t}
                  onClick={() => setAttemptFilter(t)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: attemptFilter === t ? '#0284C7' : '#E2E8F0',
                    color: attemptFilter === t ? '#FFFFFF' : '#64748B'
                  }}
                >
                  {t === 'ALL' ? 'All Formats' : t === 'ONLINE' ? 'Online' : 'Offline'}
                </button>
              ))}
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', textAlign: 'left', color: '#64748B' }}>
                <th style={{ padding: '12px 14px' }}>Participant</th>
                <th style={{ padding: '12px 14px' }}>Employee ID</th>
                <th style={{ padding: '12px 14px' }}>Quiz Title</th>
                <th style={{ padding: '12px 14px' }}>Format</th>
                <th style={{ padding: '12px 14px' }}>Score</th>
                <th style={{ padding: '12px 14px' }}>Result</th>
                <th style={{ padding: '12px 14px' }}>Date</th>
                <th style={{ padding: '12px 14px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(quiz.attemptsList || [])
                .filter(att => attemptFilter === 'ALL' || att.quizType === attemptFilter)
                .map((att, i) => (
                  <tr key={att.id || i} style={{ borderTop: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>{att.participantName}</td>
                    <td style={{ padding: '12px 14px', color: '#64748B' }}>{att.employeeId}</td>
                    <td style={{ padding: '12px 14px' }}>{att.quizTitle}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800,
                        background: att.quizType === 'ONLINE' ? '#3B82F618' : '#F9731618',
                        color: att.quizType === 'ONLINE' ? '#2563EB' : '#EA580C'
                      }}>
                        {att.quizType}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>{att.percentage}%</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ color: att.passed ? '#10B981' : '#EF4444', fontWeight: 700 }}>
                        {att.passed ? '✓ Pass' : '✗ Fail'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748B' }}>{att.attemptDate}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        onClick={() => handleOpen360(att.participantName)}
                        style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0284C7', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                      >
                        360 View
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── TAB 6: ATTENDANCE ─── */}
      {activeTab === 'attendance' && (
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: '8px', padding: '12px 14px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
            <button
              onClick={() => setAttendanceSubTab('quiz')}
              style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: attendanceSubTab === 'quiz' ? '#0284C7' : '#E2E8F0', color: attendanceSubTab === 'quiz' ? '#FFFFFF' : '#64748B', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Quiz Attendance ({quizAttendance.length})
            </button>
            <button
              onClick={() => setAttendanceSubTab('training')}
              style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: attendanceSubTab === 'training' ? '#0284C7' : '#E2E8F0', color: attendanceSubTab === 'training' ? '#FFFFFF' : '#64748B', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Training Attendance ({trainingAttendance.length})
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', textAlign: 'left', color: '#64748B' }}>
                <th style={{ padding: '12px 14px' }}>Participant</th>
                <th style={{ padding: '12px 14px' }}>Employee ID</th>
                <th style={{ padding: '12px 14px' }}>Project</th>
                <th style={{ padding: '12px 14px' }}>{attendanceSubTab === 'quiz' ? 'Quizzes Taken' : 'Topic'}</th>
                <th style={{ padding: '12px 14px' }}>{attendanceSubTab === 'quiz' ? 'Avg Score' : 'Time Spent'}</th>
                <th style={{ padding: '12px 14px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(attendanceSubTab === 'quiz' ? quizAttendance : trainingAttendance).map((att, i) => (
                <tr key={i} style={{ borderTop: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 700 }}>{att.name}</td>
                  <td style={{ padding: '12px 14px', color: '#64748B' }}>{att.employeeId}</td>
                  <td style={{ padding: '12px 14px' }}>{att.projectName}</td>
                  <td style={{ padding: '12px 14px' }}>{attendanceSubTab === 'quiz' ? att.quizCount : att.topic}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 700 }}>{attendanceSubTab === 'quiz' ? att.avgScore : att.timeSpent}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <button
                      onClick={() => handleOpen360(att.userId || att.name)}
                      style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0284C7', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                    >
                      360 Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── TAB 7: PARTICIPANTS ─── */}
      {activeTab === 'participants' && (
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', textAlign: 'left', color: '#64748B' }}>
                <th style={{ padding: '12px 14px' }}>Name</th>
                <th style={{ padding: '12px 14px' }}>Employee ID</th>
                <th style={{ padding: '12px 14px' }}>Email</th>
                <th style={{ padding: '12px 14px' }}>Role</th>
                <th style={{ padding: '12px 14px' }}>Status</th>
                <th style={{ padding: '12px 14px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {projectUsers.map((u, i) => (
                <tr key={u.id || i} style={{ borderTop: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 700 }}>{u.name}</td>
                  <td style={{ padding: '12px 14px', color: '#64748B' }}>{u.employee_id || 'EMP'}</td>
                  <td style={{ padding: '12px 14px', color: '#64748B' }}>{u.email}</td>
                  <td style={{ padding: '12px 14px' }}>{u.Role?.role_name || 'Employee'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, background: '#10B98118', color: '#10B981' }}>
                      {u.status || 'Active'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <button
                      onClick={() => handleOpen360(u.id)}
                      style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0284C7', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                    >
                      360 Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── TAB 8: CERTIFICATIONS ─── */}
      {activeTab === 'certifications' && (
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', textAlign: 'left', color: '#64748B' }}>
                <th style={{ padding: '12px 14px' }}>Certificate ID</th>
                <th style={{ padding: '12px 14px' }}>Participant</th>
                <th style={{ padding: '12px 14px' }}>Program</th>
                <th style={{ padding: '12px 14px' }}>Project</th>
                <th style={{ padding: '12px 14px' }}>Issue Date</th>
                <th style={{ padding: '12px 14px' }}>Status</th>
                <th style={{ padding: '12px 14px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(cert.certificates || []).map((c, i) => {
                const normStatus = (c.status || '').toUpperCase();
                const canView = ['ISSUED', 'VALID', 'REVOKED'].includes(normStatus) && Boolean(c.certificateId || c.id);

                return (
                  <tr key={c.id || i} style={{ borderTop: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 800 }}>
                      {canView ? (
                        <button
                          onClick={() => {
                            setViewingCertificateId(c.certificateId || c.id);
                            setIsCertViewerOpen(true);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: normStatus === 'REVOKED' ? '#EF4444' : '#0284C7',
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            cursor: 'pointer',
                            padding: 0,
                            textDecoration: 'underline'
                          }}
                          title="Click to view certificate"
                        >
                          {c.certificateId}
                        </button>
                      ) : (
                        <span style={{ color: '#64748B' }}>{c.certificateId || 'PENDING'}</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>{c.participantName}</td>
                    <td style={{ padding: '12px 14px' }}>{c.program}</td>
                    <td style={{ padding: '12px 14px' }}>{c.projectName}</td>
                    <td style={{ padding: '12px 14px', color: '#64748B' }}>{c.issueDate}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700,
                        background: normStatus === 'ISSUED' || normStatus === 'VALID' ? '#10B98118' : normStatus === 'REVOKED' ? '#EF444418' : '#0284C718',
                        color: normStatus === 'ISSUED' || normStatus === 'VALID' ? '#10B981' : normStatus === 'REVOKED' ? '#EF4444' : '#0284C7'
                      }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {canView && (
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
                            gap: '4px'
                          }}
                        >
                          <Eye size={13} /> View
                        </button>
                      )}
                      <a
                        href={`/verify/${c.certificateId}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#64748B', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 600 }}
                      >
                        Verify
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── TAB 9: REPORTS & ANALYTICS ─── */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Sub-Tabs: Intelligent Reports vs Operational Reports */}
          <div style={{
            display: 'flex',
            gap: '10px',
            borderBottom: '1px solid #E2E8F0',
            paddingBottom: '10px'
          }}>
            <button
              onClick={() => setReportsSubTab('intelligent')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '8px',
                border: reportsSubTab === 'intelligent' ? '2px solid #2563EB' : '1px solid #E2E8F0',
                background: reportsSubTab === 'intelligent' ? '#EFF6FF' : '#FFFFFF',
                color: reportsSubTab === 'intelligent' ? '#2563EB' : '#64748B',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <Sparkles size={16} />
              ✨ Intelligent Reports
            </button>

            <button
              onClick={() => setReportsSubTab('operational')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '8px',
                border: reportsSubTab === 'operational' ? '2px solid #0284C7' : '1px solid #E2E8F0',
                background: reportsSubTab === 'operational' ? '#F0F9FF' : '#FFFFFF',
                color: reportsSubTab === 'operational' ? '#0284C7' : '#64748B',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <BarChart2 size={16} />
              📊 Operational Reports
            </button>
          </div>

          {reportsSubTab === 'intelligent' ? (
            <ReportCenterView
              token={token}
              user={user}
              defaultProjectId={selectedProjectId}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 800 }}>
                    Consolidated Master Training Outcome Report
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
                    Download comprehensive 21-column Excel report containing Client, Project, Subproject, Jitsi Attendance, Durations, Quiz Scores, and Certification Records.
                  </p>
                </div>
                <button
                  onClick={handleDownloadMasterOutcome}
                  disabled={downloadingOutcome}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: '#0284C7',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: downloadingOutcome ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Download size={16} />
                  {downloadingOutcome ? 'Generating...' : 'Download Master Outcome (Excel)'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                {[
                  { title: 'Project Training Report', desc: 'Overview of scheduled modules and completion status' },
                  { title: 'Jitsi Attendance Report', desc: 'Intervals, join/leave duration and rejoin logs' },
                  { title: 'Participant Attendance Report', desc: 'Aggregated attendance percentage per learner' },
                  { title: 'Online & Offline Quiz Report', desc: 'Detailed responses, scoring, and pass rates' },
                  { title: 'Certification Report', desc: 'Issued certificate numbers and eligibility status' }
                ].map((r, i) => (
                  <div key={i} style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <h5 style={{ margin: '0 0 4px 0', fontSize: '0.92rem', fontWeight: 700 }}>{r.title}</h5>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748B' }}>{r.desc}</p>
                    <button
                      onClick={() => onExportExcel && onExportExcel()}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#0284C7', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Export Data
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 10: AUDIT LOGS ─── */}
      {activeTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Data Integrity Monitor for Admin */}
          {dataIntegrity && (
            <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '16px 20px', border: '1px solid #E2E8F0', borderLeft: '4px solid #0284C7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={18} color="#0284C7" /> System Data Reconciliation Monitor (Admin)
                </h4>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', background: dataIntegrity.status === 'Healthy' ? '#10B98118' : '#F59E0B18', color: dataIntegrity.status === 'Healthy' ? '#10B981' : '#D97706' }}>
                  {dataIntegrity.status}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                <div style={{ padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Unmapped Sessions</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: dataIntegrity.unmappedSessions > 0 ? '#EF4444' : '#10B981' }}>{dataIntegrity.unmappedSessions}</div>
                </div>
                <div style={{ padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Unmapped Participants</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: dataIntegrity.unmappedParticipants > 0 ? '#EF4444' : '#10B981' }}>{dataIntegrity.unmappedParticipants}</div>
                </div>
                <div style={{ padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Unmapped Quizzes</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: dataIntegrity.unmappedQuizAttempts > 0 ? '#EF4444' : '#10B981' }}>{dataIntegrity.unmappedQuizAttempts}</div>
                </div>
                <div style={{ padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Unmapped Attendance</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: dataIntegrity.unmappedAttendance > 0 ? '#EF4444' : '#10B981' }}>{dataIntegrity.unmappedAttendance}</div>
                </div>
                <div style={{ padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Failed Jitsi Events</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10B981' }}>{dataIntegrity.failedJitsiEvents}</div>
                </div>
              </div>
            </div>
          )}

          <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 800 }}>
              Security & Governance Audit Trail
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { action: 'JITSI_ATTENDANCE_RECORDED', user: 'System Telemetry', desc: 'Consolidated meeting intervals for participant', time: 'Just now' },
                { action: 'QUIZ_SUBMITTED', user: 'Learner', desc: 'Offline response graded and mapped to project', time: '10 mins ago' },
                { action: 'CERTIFICATE_GENERATED', user: 'Auto-Issuance Engine', desc: 'Issued certificate REP-2026-000006', time: '1 hour ago' },
                { action: 'PROJECT_SCOPED_ACCESS', user: 'Program Manager', desc: 'Verified RBAC access for assigned subprojects', time: '2 hours ago' }
              ].map((log, i) => (
                <div key={i} style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0284C7' }}>{log.action}</span>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#475569' }}>{log.desc} by <strong>{log.user}</strong></p>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Participant 360 Modal */}
      <Participant360Modal
        isOpen={is360ModalOpen}
        onClose={() => setIs360ModalOpen(false)}
        participantId={selectedParticipantId}
        token={token}
        selectedProjectId={selectedProjectId}
        selectedSubProjectId={selectedSubProjectId}
      />

      {/* Certificate Viewer Modal */}
      <CertificateViewer
        isOpen={isCertViewerOpen}
        onClose={() => setIsCertViewerOpen(false)}
        certificateId={viewingCertificateId}
        token={token}
      />
    </div>
  );
}
