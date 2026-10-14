import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BookOpen, Award, CheckCircle2, Clock, Calendar, 
  Search, RefreshCw, Download, FileText, ArrowUpRight
} from 'lucide-react';
import PageHeader from './ui/PageHeader';
import KpiCard from './ui/KpiCard';
import StatusBadge from './ui/StatusBadge';
import EmptyState from './ui/EmptyState';
import LoadingSkeleton from './ui/LoadingSkeleton';

export default function EmployeeReportCenter({ token, user }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Data
  const [quizLogs, setQuizLogs] = useState([]);
  const [trainingLogs, setTrainingLogs] = useState([]);
  const [summary, setSummary] = useState({ quizCount: 0, avgScore: '0%', datesCount: 0 });

  // Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('quizzes'); // 'quizzes' | 'meetings'

  const fetchEmployeeRecords = async (isSilent = false) => {
    if (!token) return;
    try {
      if (!isSilent) setLoading(true);
      setError('');

      const res = await axios.get('/api/reports/attendance', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data) {
        setQuizLogs(Array.isArray(res.data.logs) ? res.data.logs : []);
        setTrainingLogs(Array.isArray(res.data.trainingLogs) ? res.data.trainingLogs : []);
        setSummary(res.data.summary || { quizCount: 0, avgScore: '0%', datesCount: 0 });
      }
    } catch (err) {
      console.error('Failed to load employee records:', err);
      setError(err.response?.data?.error || 'Failed to load your personal learning records.');
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmployeeRecords();
  }, [token]);

  const filteredQuizzes = quizLogs.filter(q => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      (q.quizTitle && q.quizTitle.toLowerCase().includes(term)) ||
      (q.projectName && q.projectName.toLowerCase().includes(term))
    );
  });

  const filteredMeetings = trainingLogs.filter(m => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      (m.topic && m.topic.toLowerCase().includes(term)) ||
      (m.projectName && m.projectName.toLowerCase().includes(term))
    );
  });

  const handleExportCSV = () => {
    if (quizLogs.length === 0 && trainingLogs.length === 0) {
      alert('No learning records available to export.');
      return;
    }
    const headers = ['Record Type', 'Topic / Quiz', 'Project', 'Date', 'Assessment Score (%)', 'Arena Speed Points (pts)', 'Time Spent', 'Status'];
    const rows = [
      ...quizLogs.map(q => [
        'Quiz Assessment',
        `"${q.quizTitle || ''}"`,
        `"${q.projectName || ''}"`,
        `"${q.date || ''}"`,
        `"${q.percentage || ''}"`,
        `"${q.arenaPoints || 0} pts"`,
        `"${q.timeSpent || ''}"`,
        `"${q.status || 'Completed'}"`
      ]),
      ...trainingLogs.map(t => [
        'Training Meeting',
        `"${t.topic || ''}"`,
        `"${t.projectName || ''}"`,
        `"${t.date || ''}"`,
        '—',
        '—',
        `"${t.timeSpent || ''}"`,
        `"${t.status || 'Attended'}"`
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `my_learning_transcript_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '24px 32px', minHeight: '100vh', background: '#F6F8FC' }}>
      {/* ─── PAGE HEADER ─── */}
      <PageHeader
        eyebrow="MY LEARNING RECORDS"
        title="My Training & Assessment Records"
        description="Review your verified training session history, assessment scores, and attendance records."
      >
        <button
          onClick={() => { setRefreshing(true); fetchEmployeeRecords(true); }}
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
          Export Transcript
        </button>
      </PageHeader>

      {/* ─── KPI METRICS ─── */}
      {loading ? (
        <LoadingSkeleton variant="kpi" count={4} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <KpiCard
            title="Completed Assessments"
            value={summary.quizCount || 0}
            subtitle="Verified quiz evaluations"
            icon={Award}
            variant="primary"
          />
          <KpiCard
            title="Assessment Average"
            value={summary.avgScore || '0%'}
            subtitle="Average assessment score (%)"
            icon={CheckCircle2}
            variant="success"
          />
          <KpiCard
            title="Training Sessions Attended"
            value={trainingLogs.length || 0}
            subtitle="Live webinar / cohort sessions"
            icon={BookOpen}
            variant="info"
          />
          <KpiCard
            title="Active Learning Days"
            value={summary.datesCount || 0}
            subtitle="Days with recorded training activity"
            icon={Calendar}
            variant="purple"
          />
        </div>
      )}

      {/* ─── TABS & FILTER ─── */}
      <div style={{
        background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0',
        padding: '16px 20px', marginBottom: '20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '12px'
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', background: '#F1F5F9', padding: '4px', borderRadius: '8px' }}>
          <button
            onClick={() => setActiveTab('quizzes')}
            style={{
              padding: '6px 14px', borderRadius: '6px', border: 'none',
              background: activeTab === 'quizzes' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'quizzes' ? '#0F172A' : '#64748B',
              fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
              boxShadow: activeTab === 'quizzes' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            My Assessments ({filteredQuizzes.length})
          </button>
          <button
            onClick={() => setActiveTab('meetings')}
            style={{
              padding: '6px 14px', borderRadius: '6px', border: 'none',
              background: activeTab === 'meetings' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'meetings' ? '#0F172A' : '#64748B',
              fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
              boxShadow: activeTab === 'meetings' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            My Training Meetings ({filteredMeetings.length})
          </button>
        </div>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px',
          padding: '6px 12px', width: '240px'
        }}>
          <Search size={14} color="#94A3B8" />
          <input
            type="text"
            placeholder="Search my records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: '0.8rem', color: '#0F172A', width: '100%' }}
          />
        </div>
      </div>

      {/* ─── DATA TABLE ─── */}
      {loading ? (
        <LoadingSkeleton variant="table" count={5} />
      ) : activeTab === 'quizzes' ? (
        filteredQuizzes.length === 0 ? (
          <EmptyState
            title="No Assessment Records Found"
            description="You have not completed any quiz assessments matching your search criteria."
          />
        ) : (
          <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                  <th style={{ padding: '12px 18px' }}>Assessment Name</th>
                  <th style={{ padding: '12px 18px' }}>Project</th>
                  <th style={{ padding: '12px 18px' }}>Date</th>
                  <th style={{ padding: '12px 18px' }}>Assessment Score (%)</th>
                  <th style={{ padding: '12px 18px' }}>Arena Speed Points (pts)</th>
                  <th style={{ padding: '12px 18px' }}>Time Spent</th>
                  <th style={{ padding: '12px 18px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuizzes.map((q, idx) => (
                  <tr key={q.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0F172A' }}>{q.quizTitle}</td>
                    <td style={{ padding: '14px 18px', color: '#475569' }}>
                      <span style={{ background: '#EFF6FF', color: '#1E40AF', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {q.projectName}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', color: '#64748B' }}>{q.date}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        background: parseInt(q.percentage) >= 70 ? '#DCFCE7' : '#FEF3C7',
                        color: parseInt(q.percentage) >= 70 ? '#166534' : '#92400E',
                        padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.78rem'
                      }}>
                        {q.percentage} ({q.score})
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', color: '#6D28D9', fontWeight: 600 }}>
                      {q.arenaPoints || 0} pts
                    </td>
                    <td style={{ padding: '14px 18px', color: '#64748B' }}>{q.timeSpent}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <StatusBadge status={q.status || 'Completed'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        filteredMeetings.length === 0 ? (
          <EmptyState
            title="No Training Meeting Records Found"
            description="You have not participated in any training meetings matching your search criteria."
          />
        ) : (
          <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                  <th style={{ padding: '12px 18px' }}>Training Topic</th>
                  <th style={{ padding: '12px 18px' }}>Project</th>
                  <th style={{ padding: '12px 18px' }}>Date</th>
                  <th style={{ padding: '12px 18px' }}>Time Attended</th>
                  <th style={{ padding: '12px 18px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredMeetings.map((m, idx) => (
                  <tr key={m.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0F172A' }}>{m.topic}</td>
                    <td style={{ padding: '14px 18px', color: '#475569' }}>
                      <span style={{ background: '#EFF6FF', color: '#1E40AF', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {m.projectName}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', color: '#64748B' }}>{m.date}</td>
                    <td style={{ padding: '14px 18px', color: '#0F172A', fontWeight: 600 }}>{m.timeSpent || '—'}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <StatusBadge status={m.status || 'Attended'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
