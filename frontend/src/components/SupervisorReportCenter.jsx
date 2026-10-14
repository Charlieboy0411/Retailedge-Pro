import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, ClipboardList, CheckCircle2, TrendingUp, Search, 
  RefreshCw, Download, FileSpreadsheet, Calendar, AlertCircle,
  Eye, X, Award
} from 'lucide-react';
import PageHeader from './ui/PageHeader';
import KpiCard from './ui/KpiCard';
import StatusBadge from './ui/StatusBadge';
import EmptyState from './ui/EmptyState';
import LoadingSkeleton from './ui/LoadingSkeleton';

export default function SupervisorReportCenter({ token, user }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // Data
  const [sessionReports, setSessionReports] = useState([]);
  const [attendanceData, setAttendanceData] = useState({ quizAttendance: [], trainingAttendance: [] });
  const [subordinates, setSubordinates] = useState([]);

  // Filters
  const [selectedMember, setSelectedMember] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('assessments'); // 'assessments' | 'attendance'

  // Modal
  const [selectedSessionDetail, setSelectedSessionDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchSupervisorReports = async (isSilent = false) => {
    if (!token) return;
    try {
      if (!isSilent) setLoading(true);
      setError('');

      const [repRes, attRes, teamRes] = await Promise.allSettled([
        axios.get('/api/reports', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/reports/attendance', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/supervisor/team', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (repRes.status === 'fulfilled' && repRes.value.data) {
        setSessionReports(Array.isArray(repRes.value.data) ? repRes.value.data : []);
      }
      if (attRes.status === 'fulfilled' && attRes.value.data) {
        setAttendanceData(attRes.value.data || { quizAttendance: [], trainingAttendance: [] });
      }
      if (teamRes.status === 'fulfilled' && teamRes.value.data) {
        setSubordinates(Array.isArray(teamRes.value.data) ? teamRes.value.data : []);
      }
    } catch (err) {
      console.error('Failed to fetch supervisor reports:', err);
      setError(err.response?.data?.error || 'Failed to load supervisor reporting data.');
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSupervisorReports();
  }, [token]);

  // Flattened team attendance logs
  const allAttendanceLogs = [
    ...(attendanceData.quizAttendance || []).map(q => ({
      id: `q-${q.userId}-${q.dates}`,
      userId: q.userId,
      name: q.name,
      employeeId: q.employeeId,
      projectName: q.projectName,
      topic: `${q.quizCount} Quiz Sessions`,
      date: q.dates,
      type: 'Quiz Assessment',
      score: q.avgScore,
      status: 'Completed'
    })),
    ...(attendanceData.trainingAttendance || []).map(t => ({
      id: `t-${t.userId}-${t.date}`,
      userId: t.userId,
      name: t.name,
      employeeId: t.employeeId,
      projectName: t.projectName,
      topic: t.topic,
      date: t.date,
      type: 'Training Meeting',
      timeSpent: t.timeSpent,
      status: t.status || 'Attended'
    }))
  ];

  // Filtering
  const filteredReports = sessionReports.filter(r => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (r.title || '').toLowerCase().includes(q);
      const matchProject = (r.projectName || '').toLowerCase().includes(q);
      if (!matchTitle && !matchProject) return false;
    }
    return true;
  });

  const filteredAttendance = allAttendanceLogs.filter(log => {
    if (selectedMember !== 'all' && log.userId !== selectedMember) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = (log.name || '').toLowerCase().includes(q);
      const matchTopic = (log.topic || '').toLowerCase().includes(q);
      const matchEmp = (log.employeeId || '').toLowerCase().includes(q);
      if (!matchName && !matchTopic && !matchEmp) return false;
    }
    return true;
  });

  // Aggregate KPIs
  const teamMemberCount = subordinates.length > 0 
    ? subordinates.length 
    : [...new Set(allAttendanceLogs.map(l => l.userId).filter(Boolean))].length;

  const totalSessionsCount = filteredReports.length;

  const avgAssessmentScore = filteredReports.length > 0
    ? Math.round(filteredReports.reduce((sum, r) => sum + (parseInt(r.avgScore) || 0), 0) / filteredReports.length)
    : (allAttendanceLogs.filter(a => a.score).length > 0
        ? Math.round(allAttendanceLogs.filter(a => a.score).reduce((sum, a) => sum + (parseInt(a.score) || 0), 0) / allAttendanceLogs.filter(a => a.score).length)
        : 0);

  const totalLogsCount = allAttendanceLogs.length;

  const handleViewDetail = async (reportId) => {
    try {
      setLoadingDetail(true);
      const res = await axios.get(`/api/reports/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedSessionDetail(res.data);
    } catch (err) {
      console.error('Error fetching session detail:', err);
      alert('Failed to load session details.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredAttendance.length === 0) {
      alert('No attendance records to export.');
      return;
    }
    const headers = ['Team Member', 'Employee ID', 'Project', 'Activity / Topic', 'Date', 'Type', 'Status'];
    const rows = filteredAttendance.map(a => [
      `"${a.name || ''}"`,
      `"${a.employeeId || ''}"`,
      `"${a.projectName || ''}"`,
      `"${a.topic || ''}"`,
      `"${a.date || ''}"`,
      `"${a.type || ''}"`,
      `"${a.status || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `supervisor_team_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '24px 32px', minHeight: '100vh', background: '#F6F8FC' }}>
      {/* ─── PAGE HEADER ─── */}
      <PageHeader
        eyebrow="TEAM REPORTING"
        title="Team Performance & Attendance Reports"
        description="Monitor assessment scores, attendance compliance, and training completion for your direct reporting team."
      >
        <button
          onClick={() => { setRefreshing(true); fetchSupervisorReports(true); }}
          disabled={refreshing}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: '8px',
            border: '1px solid #E2E8F0', background: '#FFFFFF',
            color: '#475569', fontSize: '0.8rem', fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
        <button
          onClick={handleExportCSV}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: '8px',
            border: 'none', background: '#1E40AF',
            color: '#FFFFFF', fontSize: '0.8rem', fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <Download size={14} />
          Export CSV
        </button>
      </PageHeader>

      {/* ─── KPI CARDS ─── */}
      {loading ? (
        <LoadingSkeleton variant="kpi" count={4} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <KpiCard
            title="Team Members"
            value={teamMemberCount}
            subtitle="Direct reporting subordinates"
            icon={Users}
            variant="primary"
          />
          <KpiCard
            title="Sessions Completed"
            value={totalSessionsCount}
            subtitle="Assigned training sessions"
            icon={ClipboardList}
            variant="info"
          />
          <KpiCard
            title="Assessment Average"
            value={avgAssessmentScore > 0 ? `${avgAssessmentScore}%` : '—'}
            subtitle="Team assessment score (%)"
            icon={Award}
            variant="success"
          />
          <KpiCard
            title="Activity Logs"
            value={totalLogsCount}
            subtitle="Recorded team attendances"
            icon={CheckCircle2}
            variant="purple"
          />
        </div>
      )}

      {/* ─── FILTERS & TABS ─── */}
      <div style={{
        background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0',
        padding: '16px 20px', marginBottom: '20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '12px'
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', background: '#F1F5F9', padding: '4px', borderRadius: '8px' }}>
          <button
            onClick={() => setActiveTab('assessments')}
            style={{
              padding: '6px 14px', borderRadius: '6px', border: 'none',
              background: activeTab === 'assessments' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'assessments' ? '#0F172A' : '#64748B',
              fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
              boxShadow: activeTab === 'assessments' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            Assessment Reports ({filteredReports.length})
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            style={{
              padding: '6px 14px', borderRadius: '6px', border: 'none',
              background: activeTab === 'attendance' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'attendance' ? '#0F172A' : '#64748B',
              fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
              boxShadow: activeTab === 'attendance' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            Team Attendance Roster ({filteredAttendance.length})
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Member Filter */}
          {subordinates.length > 0 && (
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              style={{
                background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px',
                padding: '6px 12px', fontSize: '0.8rem', color: '#0F172A', outline: 'none'
              }}
            >
              <option value="all">All Team Members</option>
              {subordinates.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.employee_id || 'ID'})</option>
              ))}
            </select>
          )}

          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px',
            padding: '6px 12px', width: '220px'
          }}>
            <Search size={14} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: '0.8rem', color: '#0F172A', width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* ─── CONTENT TABLE ─── */}
      {loading ? (
        <LoadingSkeleton variant="table" count={5} />
      ) : activeTab === 'assessments' ? (
        filteredReports.length === 0 ? (
          <EmptyState
            title="No Assessment Reports"
            description="No training assessments have been recorded for your direct reporting team."
          />
        ) : (
          <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                  <th style={{ padding: '12px 18px' }}>Training Assessment</th>
                  <th style={{ padding: '12px 18px' }}>Project</th>
                  <th style={{ padding: '12px 18px' }}>Trainer</th>
                  <th style={{ padding: '12px 18px' }}>Date</th>
                  <th style={{ padding: '12px 18px' }}>Team Attendees</th>
                  <th style={{ padding: '12px 18px' }}>Assessment Score (%)</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((r, idx) => (
                  <tr key={r.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0F172A' }}>
                      {r.title}
                    </td>
                    <td style={{ padding: '14px 18px', color: '#475569' }}>
                      <span style={{ background: '#EFF6FF', color: '#1E40AF', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {r.projectName || 'General'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', color: '#475569' }}>{r.hostName || 'Trainer'}</td>
                    <td style={{ padding: '14px 18px', color: '#64748B' }}>{r.date}</td>
                    <td style={{ padding: '14px 18px', color: '#0F172A', fontWeight: 600 }}>{r.participants}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        background: parseInt(r.avgScore) >= 70 ? '#DCFCE7' : '#FEF3C7',
                        color: parseInt(r.avgScore) >= 70 ? '#166534' : '#92400E',
                        padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.78rem'
                      }}>
                        {r.avgScore || '0%'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleViewDetail(r.id)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          background: '#F1F5F9', border: '1px solid #E2E8F0',
                          padding: '5px 10px', borderRadius: '6px',
                          color: '#1E40AF', fontSize: '0.75rem', fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <Eye size={13} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        filteredAttendance.length === 0 ? (
          <EmptyState
            title="No Attendance Records"
            description="No attendance logs found matching your team filter criteria."
          />
        ) : (
          <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                  <th style={{ padding: '12px 18px' }}>Team Member</th>
                  <th style={{ padding: '12px 18px' }}>Employee ID</th>
                  <th style={{ padding: '12px 18px' }}>Project</th>
                  <th style={{ padding: '12px 18px' }}>Activity / Module</th>
                  <th style={{ padding: '12px 18px' }}>Date</th>
                  <th style={{ padding: '12px 18px' }}>Type</th>
                  <th style={{ padding: '12px 18px' }}>Assessment Score (%)</th>
                  <th style={{ padding: '12px 18px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.map((a, idx) => (
                  <tr key={a.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0F172A' }}>{a.name}</td>
                    <td style={{ padding: '14px 18px', color: '#64748B' }}><code>{a.employeeId || '—'}</code></td>
                    <td style={{ padding: '14px 18px', color: '#475569' }}>{a.projectName}</td>
                    <td style={{ padding: '14px 18px', color: '#0F172A' }}>{a.topic}</td>
                    <td style={{ padding: '14px 18px', color: '#64748B' }}>{a.date}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        background: a.type.includes('Quiz') ? '#EFF6FF' : '#F5F3FF',
                        color: a.type.includes('Quiz') ? '#1E40AF' : '#6D28D9',
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600
                      }}>
                        {a.type}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      {a.score ? (
                        <span style={{ fontWeight: 700, color: parseInt(a.score) >= 70 ? '#166534' : '#B45309' }}>
                          {a.score}
                        </span>
                      ) : (
                        <span style={{ color: '#94A3B8' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <StatusBadge status={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ─── SESSION DETAIL MODAL ─── */}
      {selectedSessionDetail && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0',
            width: '100%', maxWidth: '780px', maxHeight: '85vh',
            display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid #E2E8F0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                  {selectedSessionDetail.quizTitle}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  {selectedSessionDetail.projectName} • {selectedSessionDetail.date} • Host: {selectedSessionDetail.hostName}
                </span>
              </div>
              <button
                onClick={() => setSelectedSessionDetail(null)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>TOTAL QUESTIONS</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>{selectedSessionDetail.totalQuestions}</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>AVERAGE SCORE (%)</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#166534' }}>{selectedSessionDetail.avgScore}</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>PARTICIPANTS</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E40AF' }}>{selectedSessionDetail.participantsCount}</div>
                </div>
              </div>

              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>
                Subordinate Attendee Results
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', color: '#475569' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Learner</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Employee ID</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Assessment Score (%)</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Arena Speed Points (pts)</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Time Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedSessionDetail.participants || []).map((p, i) => (
                    <tr key={p.id || i} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0F172A' }}>{p.name}</td>
                      <td style={{ padding: '10px 12px', color: '#64748B' }}><code>{p.employeeId || '—'}</code></td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontWeight: 700, color: parseInt(p.percentage) >= 70 ? '#166534' : '#B45309' }}>
                          {p.percentage} ({p.score})
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#6D28D9', fontWeight: 600 }}>
                        {p.arenaPoints || 0} pts
                      </td>
                      <td style={{ padding: '10px 12px', color: '#64748B' }}>{p.timeSpent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
