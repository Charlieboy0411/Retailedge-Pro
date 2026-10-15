import React, { useEffect, useState, useContext, useMemo } from 'react';
import { 
  Trophy, Award, Target, Zap, Clock, TrendingUp, Search, 
  Users, CheckCircle2, ChevronRight, Filter, AlertCircle, 
  MapPin, RefreshCw, BarChart2, ShieldCheck, Flame, Layers,
  Download, ChevronUp, ChevronDown, ArrowUpDown, X, ExternalLink
} from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const LEVELS = [
  { name: 'Bronze',       min: 0,    max: 200,  color: '#CD7F32', icon: '🥉' },
  { name: 'Silver',       min: 200,  max: 500,  color: '#64748B', icon: '🥈' },
  { name: 'Gold',         min: 500,  max: 1000, color: '#F59E0B', icon: '🥇' },
  { name: 'Platinum',     min: 1000, max: 2000, color: '#2563EB', icon: '💎' },
  { name: 'Arena Master', min: 2000, max: 50000, color: '#FF6B35', icon: '🏆' },
];

function sortData(list, { key, direction }, tiePolicy = null) {
  return [...list].sort((a, b) => {
    const valA = a[key];
    const valB = b[key];

    // Numeric comparison
    if (typeof valA === 'number' || typeof valB === 'number') {
      const numA = Number(valA) || 0;
      const numB = Number(valB) || 0;
      if (numA !== numB) {
        return direction === 'asc' ? numA - numB : numB - numA;
      }
    } else if (key === 'createdAt' || key === 'lastQuizDate' || key === 'date') {
      // Date comparison
      const dateA = valA && valA !== 'N/A' ? new Date(valA).getTime() : 0;
      const dateB = valB && valB !== 'N/A' ? new Date(valB).getTime() : 0;
      if (dateA !== dateB) {
        return direction === 'asc' ? dateA - dateB : dateB - dateA;
      }
    } else {
      // String comparison
      const strA = String(valA || '').toLowerCase();
      const strB = String(valB || '').toLowerCase();
      const cmp = strA.localeCompare(strB);
      if (cmp !== 0) {
        return direction === 'asc' ? cmp : -cmp;
      }
    }

    if (tiePolicy) {
      return tiePolicy(a, b);
    }
    return 0;
  });
}

function exportToCSV(rows, filename = 'participant_quiz_history.csv') {
  const headers = [
    'Date',
    'Participant Name',
    'Employee ID',
    'Zone / Store',
    'Quiz Title',
    'Session',
    'Questions Answered',
    'Total Questions',
    'Correct Answers',
    'Quiz Score',
    'Arena Points',
    'Status'
  ];

  const escapeCSV = (val) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = [
    headers.join(','),
    ...rows.map(r => [
      escapeCSV(r.date || (r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : 'N/A')),
      escapeCSV(r.name),
      escapeCSV(r.employeeId),
      escapeCSV(r.zone),
      escapeCSV(r.quizTitle),
      escapeCSV(r.sessionName),
      escapeCSV(r.answeredCount),
      escapeCSV(r.questionsCount),
      escapeCSV(r.correctCount),
      escapeCSV(r.quizPercentage),
      escapeCSV(r.arenaPoints),
      escapeCSV(r.status)
    ].join(','))
  ];

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function Gamification() {
  const { user, token } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState('all');

  // Navigation tabs for non-employees: 'summary' (View A) | 'topic' (View B) | 'history' (View C) | 'badges'
  const [activeTab, setActiveTab] = useState('summary');

  // View A: Project Summary State
  const [summarySearch, setSummarySearch] = useState('');
  const [summarySort, setSummarySort] = useState({ key: 'cumulativeArenaPoints', direction: 'desc' });
  const [summaryPage, setSummaryPage] = useState(1);
  const [summaryPageSize, setSummaryPageSize] = useState(10);

  // View B: Topic / Quiz Performance State
  const [topicQuizId, setTopicQuizId] = useState('all');
  const [topicSessionId, setTopicSessionId] = useState('all');
  const [topicStatus, setTopicStatus] = useState('all');
  const [topicSearch, setTopicSearch] = useState('');
  const [topicSort, setTopicSort] = useState({ key: 'arenaPoints', direction: 'desc' });
  const [topicPage, setTopicPage] = useState(1);
  const [topicPageSize, setTopicPageSize] = useState(10);

  // View C: Quiz Attempt History State
  const [historySearch, setHistorySearch] = useState('');
  const [historyQuizFilter, setHistoryQuizFilter] = useState('all');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [historyParticipantFilter, setHistoryParticipantFilter] = useState('');
  const [historySort, setHistorySort] = useState({ key: 'createdAt', direction: 'desc' });
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);

  const userRole = user?.role || (user?.Role ? user?.Role?.role_name : '');
  const isEmployee = userRole === 'Employee';

  const fetchGamificationData = async (projId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/reports/gamification', {
        params: { projectId: projId || 'all' },
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
      if (res.data?.selectedProjectId) {
        setSelectedProjectId(res.data.selectedProjectId);
      }
    } catch (err) {
      console.error('Failed to load gamification data:', err);
      const msg = err.response?.data?.error || err.message || 'Failed to load participant results.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchGamificationData(selectedProjectId);
    }
  }, [token]);

  const handleProjectChange = (e) => {
    const newProj = e.target.value;
    setSelectedProjectId(newProj);
    // Reset filters on project change
    setTopicQuizId('all');
    setTopicSessionId('all');
    setHistoryQuizFilter('all');
    setHistoryParticipantFilter('');
    setSummaryPage(1);
    setTopicPage(1);
    setHistoryPage(1);
    fetchGamificationData(newProj);
  };

  // Drill-down from View A into View C
  const handleDrilldownToHistory = (participant) => {
    const filterKey = participant.employeeId && participant.employeeId !== 'N/A' 
      ? participant.employeeId 
      : participant.name;
    setHistoryParticipantFilter(filterKey);
    setHistorySearch('');
    setHistoryPage(1);
    setActiveTab('history');
  };

  // Helper sort header renderer
  const renderSortHeader = (label, colKey, currentSort, setSortHandler, align = 'left') => {
    const isActive = currentSort.key === colKey;
    return (
      <th 
        onClick={() => {
          if (isActive) {
            setSortHandler({ key: colKey, direction: currentSort.direction === 'asc' ? 'desc' : 'asc' });
          } else {
            // Default numeric and date columns to desc, strings to asc
            const defaultDesc = ['cumulativeArenaPoints', 'arenaPoints', 'rawPercentage', 'quizzesCompleted', 'totalAttempts', 'questionsCount', 'answeredCount', 'correctCount', 'createdAt', 'lastQuizDate'].includes(colKey);
            setSortHandler({ key: colKey, direction: defaultDesc ? 'desc' : 'asc' });
          }
        }}
        style={{
          padding: '12px 14px',
          textAlign: align,
          cursor: 'pointer',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          color: isActive ? '#2563EB' : '#475569',
          fontWeight: 700,
          background: isActive ? '#EFF6FF50' : 'transparent',
          transition: 'all 0.15s ease'
        }}
        title={`Sort by ${label}`}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: align === 'right' ? 'flex-end' : (align === 'center' ? 'center' : 'flex-start') }}>
          <span>{label}</span>
          {isActive ? (
            currentSort.direction === 'asc' ? <ChevronUp size={14} color="#2563EB" /> : <ChevronDown size={14} color="#2563EB" />
          ) : (
            <ArrowUpDown size={12} color="#94A3B8" style={{ opacity: 0.6 }} />
          )}
        </div>
      </th>
    );
  };

  // Helper Pagination component
  const renderPagination = (totalItems, currentPage, pageSize, setPage, setPageSize, itemLabel = 'records') => {
    const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = pageSize === 'all' ? totalItems : Math.min(currentPage * pageSize, totalItems);

    return (
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '16px 20px',
        borderTop: '1px solid #E2E8F0',
        background: '#FAFAFA',
        borderRadius: '0 0 16px 16px',
        fontSize: '0.82rem',
        color: '#64748B'
      }}>
        <div>
          Showing <span style={{ fontWeight: 700, color: '#0F172A' }}>{startItem}–{endItem}</span> of <span style={{ fontWeight: 700, color: '#0F172A' }}>{totalItems}</span> {itemLabel}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                setPageSize(val);
                setPage(1);
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                fontSize: '0.8rem',
                color: '#0F172A',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value="all">All</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              disabled={currentPage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                background: currentPage <= 1 ? '#F1F5F9' : '#FFFFFF',
                color: currentPage <= 1 ? '#94A3B8' : '#0F172A',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                fontWeight: 600
              }}
            >
              Prev
            </button>
            <span style={{ padding: '0 6px', fontWeight: 600 }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                background: currentPage >= totalPages ? '#F1F5F9' : '#FFFFFF',
                color: currentPage >= totalPages ? '#94A3B8' : '#0F172A',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                fontWeight: 600
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── VIEW A: DATA PREPARATION (PROJECT PERFORMANCE SUMMARY) ──
  const rawSummaries = data?.participantSummaries || [];
  const filteredSummaries = useMemo(() => {
    if (!rawSummaries) return [];
    let list = rawSummaries;
    if (summarySearch.trim()) {
      const q = summarySearch.toLowerCase().trim();
      list = list.filter(p => 
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.employeeId && p.employeeId.toLowerCase().includes(q)) ||
        (p.zone && p.zone.toLowerCase().includes(q))
      );
    }
    // Sort globally
    const sorted = sortData(list, summarySort, (a, b) => {
      const pDiff = (b.rawPercentage ?? -1) - (a.rawPercentage ?? -1);
      if (pDiff !== 0) return pDiff;
      return (a.name || '').localeCompare(b.name || '');
    });
    // Re-assign ranks based on sorted order
    return sorted.map((p, i) => ({ ...p, displayRank: i + 1 }));
  }, [rawSummaries, summarySearch, summarySort]);

  const paginatedSummaries = useMemo(() => {
    if (summaryPageSize === 'all') return filteredSummaries;
    const start = (summaryPage - 1) * summaryPageSize;
    return filteredSummaries.slice(start, start + summaryPageSize);
  }, [filteredSummaries, summaryPage, summaryPageSize]);

  // ── VIEW B: DATA PREPARATION (TOPIC / QUIZ PERFORMANCE) ──
  const allAttempts = data?.allParticipantResults || data?.participantResults || [];
  const availableQuizzes = data?.availableQuizzes || [];
  const availableSessions = data?.availableSessions || [];

  // Filter sessions options based on selected topicQuizId
  const filteredAvailableSessions = useMemo(() => {
    if (topicQuizId === 'all') return availableSessions;
    return availableSessions.filter(s => s.quizId === topicQuizId);
  }, [availableSessions, topicQuizId]);

  const filteredTopicAttempts = useMemo(() => {
    let list = allAttempts;
    if (topicQuizId !== 'all') {
      list = list.filter(p => p.quizId === topicQuizId);
    }
    if (topicSessionId !== 'all') {
      list = list.filter(p => p.sessionId === topicSessionId);
    }
    if (topicStatus !== 'all') {
      list = list.filter(p => p.status === topicStatus);
    }
    if (topicSearch.trim()) {
      const q = topicSearch.toLowerCase().trim();
      list = list.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.employeeId && p.employeeId.toLowerCase().includes(q)) ||
        (p.zone && p.zone.toLowerCase().includes(q))
      );
    }
    // Sort globally with secondary tie-breaker
    const sorted = sortData(list, topicSort, (a, b) => {
      const ptsDiff = (b.arenaPoints || 0) - (a.arenaPoints || 0);
      if (ptsDiff !== 0) return ptsDiff;
      const pDiff = (b.rawPercentage ?? -1) - (a.rawPercentage ?? -1);
      if (pDiff !== 0) return pDiff;
      return (a.name || '').localeCompare(b.name || '');
    });
    return sorted.map((p, i) => ({ ...p, displayRank: i + 1 }));
  }, [allAttempts, topicQuizId, topicSessionId, topicStatus, topicSearch, topicSort]);

  const paginatedTopicAttempts = useMemo(() => {
    if (topicPageSize === 'all') return filteredTopicAttempts;
    const start = (topicPage - 1) * topicPageSize;
    return filteredTopicAttempts.slice(start, start + topicPageSize);
  }, [filteredTopicAttempts, topicPage, topicPageSize]);

  // ── VIEW C: DATA PREPARATION (QUIZ ATTEMPT HISTORY) ──
  const filteredHistoryAttempts = useMemo(() => {
    let list = allAttempts;
    if (historyParticipantFilter) {
      const pf = historyParticipantFilter.toLowerCase().trim();
      list = list.filter(p => 
        (p.name && p.name.toLowerCase().includes(pf)) ||
        (p.employeeId && p.employeeId.toLowerCase().includes(pf))
      );
    }
    if (historyQuizFilter !== 'all') {
      list = list.filter(p => p.quizId === historyQuizFilter);
    }
    if (historyStatusFilter !== 'all') {
      list = list.filter(p => p.status === historyStatusFilter);
    }
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase().trim();
      list = list.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.employeeId && p.employeeId.toLowerCase().includes(q)) ||
        (p.zone && p.zone.toLowerCase().includes(q)) ||
        (p.quizTitle && p.quizTitle.toLowerCase().includes(q)) ||
        (p.sessionName && p.sessionName.toLowerCase().includes(q)) ||
        (p.sessionId && p.sessionId.toLowerCase().includes(q))
      );
    }
    // Global sort
    const sorted = sortData(list, historySort, (a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      return (a.name || '').localeCompare(b.name || '');
    });
    return sorted;
  }, [allAttempts, historyParticipantFilter, historyQuizFilter, historyStatusFilter, historySearch, historySort]);

  const paginatedHistoryAttempts = useMemo(() => {
    if (historyPageSize === 'all') return filteredHistoryAttempts;
    const start = (historyPage - 1) * historyPageSize;
    return filteredHistoryAttempts.slice(start, start + historyPageSize);
  }, [filteredHistoryAttempts, historyPage, historyPageSize]);

  if (loading && !data) {
    return (
      <div className="view-section active" style={{ padding: '32px 24px', minHeight: '600px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '16px' }}>
          <RefreshCw size={36} className="spinning" style={{ color: '#2563EB' }} />
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#475569' }}>
            Loading Project Results & Gamification Intelligence...
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="view-section active" style={{ padding: '32px 24px' }}>
        <div style={{
          background: '#FEF2F2',
          border: '1.5px solid #FCA5A5',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px'
        }}>
          <AlertCircle size={28} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 700, color: '#991B1B' }}>
              Project Access Error
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', color: '#B91C1C' }}>
              {error}
            </p>
            <button
              onClick={() => fetchGamificationData('all')}
              style={{
                background: '#EF4444',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Reset to Assigned Projects
            </button>
          </div>
        </div>
      </div>
    );
  }

  const {
    accessibleProjects = [],
    selectedProjectName = 'All Assigned Projects',
    summary = {},
    zoneBreakdown = [],
    leaderboard = [],
    badges = [],
    stats = {},
    level = LEVELS[0],
    totalPoints = 0
  } = data || {};

  const currentLevelObj = LEVELS.find(l => l.name === level.name) || LEVELS[0];
  const nextLevelObj = LEVELS[LEVELS.indexOf(currentLevelObj) + 1] || null;

  return (
    <div className="view-section active" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* ── Top Header & Context Bar ── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '24px 28px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              background: '#EFF6FF',
              color: '#2563EB',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              <ShieldCheck size={14} />
              {isEmployee ? 'Personal Arena' : `${userRole || 'Project'} Analytics`}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#CBD5E1', fontWeight: 600 }}>•</span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: (selectedProjectId === 'all' && accessibleProjects.length > 1) ? '#FEF3C7' : '#F1F5F9',
              color: (selectedProjectId === 'all' && accessibleProjects.length > 1) ? '#B45309' : '#0F172A',
              border: `1px solid ${(selectedProjectId === 'all' && accessibleProjects.length > 1) ? '#FDE68A' : '#E2E8F0'}`
            }}>
              {(selectedProjectId === 'all' && accessibleProjects.length > 1) ? '🌐 Portfolio Aggregate' : '📁 Project Scope'}
            </span>
            <span style={{ fontSize: '0.88rem', color: '#0F172A', fontWeight: 700 }}>
              {selectedProjectName}
            </span>
          </div>

          <h1 style={{
            fontFamily: 'Manrope, sans-serif',
            fontSize: '1.65rem',
            fontWeight: 800,
            color: '#0F172A',
            margin: '0 0 6px 0',
            letterSpacing: '-0.02em'
          }}>
            {isEmployee ? 'My Performance & Gamification' : 'Participant Results & Performance Arena'}
          </h1>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748B' }}>
            {isEmployee 
              ? 'Your validated Live Arena points, mathematical level progression, and verified badge collection.'
              : 'Project-scoped analytics, cumulative participant standings, topic-wise assessments, and scalable quiz history.'}
          </p>
        </div>

        {/* Right side controls: Project Selector & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {accessibleProjects.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="gamification-project-select" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
                Project Scope:
              </label>
              <select
                id="gamification-project-select"
                value={selectedProjectId || (accessibleProjects.length === 1 ? accessibleProjects[0].id : 'all')}
                onChange={handleProjectChange}
                style={{
                  padding: '9px 16px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  minWidth: '220px',
                  boxShadow: '0 1px 2px rgba(15,23,42,0.04)'
                }}
              >
                {accessibleProjects.length > 1 && (
                  <option value="all">🌐 All Assigned Projects ({accessibleProjects.length})</option>
                )}
                {accessibleProjects.map(p => (
                  <option key={p.id} value={p.id}>
                    📁 {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => fetchGamificationData(selectedProjectId)}
            title="Refresh Scope"
            style={{
              padding: '9px 14px',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              background: '#F8FAFC',
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              fontWeight: 600
            }}
          >
            <RefreshCw size={15} className={loading ? 'spinning' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── View Navigation Tabs (For Non-Employees) ── */}
      {!isEmployee && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '24px',
          borderBottom: '1px solid #E2E8F0',
          paddingBottom: '12px'
        }}>
          <button
            onClick={() => { setActiveTab('summary'); setSummaryPage(1); }}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'summary' ? '#2563EB' : 'transparent',
              color: activeTab === 'summary' ? '#FFFFFF' : '#64748B',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease'
            }}
          >
            <BarChart2 size={16} />
            <span>Project Performance Summary</span>
          </button>

          <button
            onClick={() => { setActiveTab('topic'); setTopicPage(1); }}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'topic' ? '#2563EB' : 'transparent',
              color: activeTab === 'topic' ? '#FFFFFF' : '#64748B',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease'
            }}
          >
            <Target size={16} />
            <span>Topic / Quiz Performance</span>
          </button>

          <button
            onClick={() => { setActiveTab('history'); setHistoryPage(1); }}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'history' ? '#2563EB' : 'transparent',
              color: activeTab === 'history' ? '#FFFFFF' : '#64748B',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease'
            }}
          >
            <Layers size={16} />
            <span>Quiz Attempt History</span>
          </button>

          <button
            onClick={() => setActiveTab('badges')}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'badges' ? '#2563EB' : 'transparent',
              color: activeTab === 'badges' ? '#FFFFFF' : '#64748B',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease'
            }}
          >
            <Award size={16} />
            <span>Gamification & Badge Criteria</span>
          </button>
        </div>
      )}

      {/* ── EMPLOYEE VIEW (Personal Journey) ── */}
      {isEmployee && (
        <>
          {/* Level Progress Card */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '28px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '8px' }}>
                  Current Level
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '18px',
                    background: `${level.color}15`,
                    border: `2px solid ${level.color}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '2rem'
                  }}>
                    {level.icon}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '2rem', fontWeight: 900, color: level.color, lineHeight: 1 }}>
                      {level.name}
                    </div>
                    {nextLevelObj && (
                      <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '6px', fontWeight: 500 }}>
                        {level.pointsToNext} pts to {nextLevelObj.icon} {nextLevelObj.name}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '8px' }}>
                  Total Arena Points
                </div>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '2.8rem', fontWeight: 900, color: '#FF6B35', lineHeight: 1 }}>
                  {totalPoints.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>Live Arena Points</div>
              </div>
            </div>

            {/* Level progression bar */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748B', marginBottom: '8px', fontWeight: 600 }}>
                <span>{level.icon} {level.name} ({level.min} pts)</span>
                {nextLevelObj && <span>{nextLevelObj.icon} {nextLevelObj.name} ({nextLevelObj.min} pts)</span>}
              </div>
              <div style={{ height: '14px', background: '#F1F5F9', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                <div style={{
                  height: '100%',
                  width: `${level.progressPct}%`,
                  background: `linear-gradient(90deg, ${level.color}, #FF6B35)`,
                  borderRadius: '8px',
                  transition: 'width 0.8s ease'
                }} />
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#64748B', marginTop: '6px', fontWeight: 600 }}>
                {level.progressPct}% to next level
              </div>
            </div>

            {/* Level road */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              {LEVELS.map((l, i) => {
                const reached = totalPoints >= l.min;
                return (
                  <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{
                      height: '6px', borderRadius: '4px',
                      background: reached ? l.color : '#E2E8F0',
                      marginBottom: '6px',
                      transition: 'background 0.3s ease'
                    }} />
                    <div style={{ fontSize: '0.72rem', color: reached ? l.color : '#94A3B8', fontWeight: 700 }}>
                      {l.icon} {l.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Achievement Stats & Leaderboard Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            {/* Achievement Stats */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)' }}>
              <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem', color: '#0F172A' }}>
                <TrendingUp size={20} color="#00C896" /> Achievement Stats
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { label: 'Sessions Participated', value: stats.sessionsParticipated ?? '0', icon: <Zap size={18} />, color: '#FF6B35' },
                  { label: 'Badges Earned',          value: stats.badgesEarned ?? '0',          icon: <Award size={18} />, color: '#F59E0B' },
                  { label: 'Avg. Finalized Score',   value: stats.avgScore ?? 'N/A',            icon: <Target size={18} />, color: '#10B981' },
                  { label: 'Fastest Answer Time',    value: stats.fastestAnswer ?? 'N/A',       icon: <Clock size={18} />, color: '#2563EB' },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '12px',
                      background: `${s.color}15`, border: `1.5px solid ${s.color}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: s.color, flexShrink: 0
                    }}>
                      {s.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>{s.label}</div>
                      <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: s.color }}>{s.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Project Leaderboard */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, margin: 0, fontSize: '1.1rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Trophy size={20} color="#F59E0B" /> Project Leaderboard
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>Top {leaderboard.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {leaderboard.slice(0, 5).map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontWeight: 800, width: '24px', color: i === 0 ? '#2563EB' : '#64748B' }}>#{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A' }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{p.zone} • {p.quizScore}</div>
                    </div>
                    <span style={{ fontWeight: 800, color: '#FF6B35', fontSize: '0.9rem' }}>{p.arenaPoints} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── NON-EMPLOYEE: TOP KPI CARDS & TEAM SUMMARY ── */}
      {!isEmployee && (
        <>
          {/* Top 4 KPI Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            {/* Card 1: Eligible Participants */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              padding: '20px 22px',
              boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: '#EFF6FF', color: '#2563EB',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Users size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Eligible Participants
                </div>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.65rem', fontWeight: 900, color: '#0F172A', lineHeight: 1.1 }}>
                  {summary.totalParticipants || 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '3px' }}>
                  Project team learners
                </div>
              </div>
            </div>

            {/* Card 2: Participant Submissions */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              padding: '20px 22px',
              boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: '#ECFDF5', color: '#10B981',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Participant Submissions
                </div>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.65rem', fontWeight: 900, color: '#0F172A', lineHeight: 1.1 }}>
                  {summary.completedAttempts ?? summary.quizzesCompleted ?? 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '3px' }}>
                  {summary.completedAttempts ?? summary.quizzesCompleted ?? 0} of {summary.totalAttempts ?? 0} completed • {summary.distinctSessionsCount ?? 1} sessions • {summary.distinctQuizzesCount ?? 1} quizzes
                </div>
              </div>
            </div>

            {/* Card 3: Average Quiz Score */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              padding: '20px 22px',
              boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: '#FFFBEB', color: '#F59E0B',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Target size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Average Quiz Score
                </div>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.65rem', fontWeight: 900, color: '#0F172A', lineHeight: 1.1 }}>
                  {summary.avgScore || 'N/A'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '3px' }}>
                  Finalized assessment accuracy
                </div>
              </div>
            </div>

            {/* Card 4: Total Arena Points */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              padding: '20px 22px',
              boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: '#FFF7ED', color: '#FF6B35',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Trophy size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Total Arena Points
                </div>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.65rem', fontWeight: 900, color: '#FF6B35', lineHeight: 1.1 }}>
                  {(summary.totalArenaPoints ?? 0).toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '3px' }}>
                  Live Arena score tally
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── VIEW A: PROJECT PERFORMANCE SUMMARY ── */}
      {!isEmployee && activeTab === 'summary' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
          overflow: 'hidden',
          marginBottom: '24px'
        }}>
          {/* Header & Controls */}
          <div style={{ padding: '24px 28px', borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <div>
                <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, margin: '0 0 4px 0', fontSize: '1.2rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart2 size={20} color="#2563EB" />
                  Project Performance Summary
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B' }}>
                  Cumulative participant performance across all quizzes in {selectedProjectName}. One row per unique participant.
                </p>
              </div>

              {/* Search Bar */}
              <div style={{ position: 'relative', minWidth: '280px' }}>
                <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search by name, ID, zone..."
                  value={summarySearch}
                  onChange={e => { setSummarySearch(e.target.value); setSummaryPage(1); }}
                  style={{
                    width: '100%',
                    padding: '8px 14px 8px 36px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '0.85rem',
                    outline: 'none',
                    background: '#FFFFFF',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>

          {filteredSummaries.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center', color: '#94A3B8', fontSize: '0.9rem' }}>
              {summarySearch ? 'No participants match your search filter.' : 'No participant records exist for this project yet.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#475569', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {renderSortHeader('Rank', 'displayRank', summarySort, setSummarySort, 'center')}
                    {renderSortHeader('Participant', 'name', summarySort, setSummarySort)}
                    {renderSortHeader('Employee ID', 'employeeId', summarySort, setSummarySort)}
                    {renderSortHeader('Zone / Store', 'zone', summarySort, setSummarySort)}
                    {renderSortHeader('Quizzes Completed', 'quizzesCompleted', summarySort, setSummarySort, 'center')}
                    {renderSortHeader('Cumulative Points', 'cumulativeArenaPoints', summarySort, setSummarySort, 'right')}
                    {renderSortHeader('Overall Accuracy', 'rawPercentage', summarySort, setSummarySort, 'center')}
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Badges</th>
                    {renderSortHeader('Recent Date', 'lastQuizDate', summarySort, setSummarySort, 'center')}
                    {renderSortHeader('Latest Status', 'lastQuizStatus', summarySort, setSummarySort, 'center')}
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Drill-down</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSummaries.map((p, idx) => (
                    <tr key={p.userId || p.employeeId || idx} style={{
                      borderBottom: '1px solid #F1F5F9',
                      background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                      transition: 'background 0.15s ease'
                    }}>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          background: p.displayRank === 1 ? '#EFF6FF' : (p.displayRank <= 3 ? '#F1F5F9' : 'transparent'),
                          color: p.displayRank === 1 ? '#2563EB' : (p.displayRank <= 3 ? '#0F172A' : '#64748B'),
                          border: p.displayRank <= 3 ? '1px solid #CBD5E1' : 'none'
                        }}>
                          #{p.displayRank}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A' }}>
                        <button
                          onClick={() => handleDrilldownToHistory(p)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            color: '#0F172A',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '0.88rem',
                            textAlign: 'left'
                          }}
                          title="Click to view full quiz history"
                        >
                          <span style={{ textDecoration: 'underline', textDecorationColor: '#CBD5E1' }}>{p.name}</span>
                        </button>
                      </td>

                      <td style={{ padding: '12px 14px', color: '#64748B', fontFamily: 'monospace' }}>
                        {p.employeeId}
                      </td>

                      <td style={{ padding: '12px 14px', color: '#475569' }}>
                        {p.zone}
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center', color: '#0F172A', fontWeight: 600 }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: p.quizzesCompleted > 0 ? '#ECFDF5' : '#F1F5F9',
                          color: p.quizzesCompleted > 0 ? '#059669' : '#64748B',
                          fontWeight: 700
                        }}>
                          {p.quizzesCompleted} {p.quizzesCompleted === 1 ? 'quiz' : 'quizzes'}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#FF6B35', fontSize: '0.92rem' }}>
                        {p.cumulativeArenaPoints.toLocaleString()} pts
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 8px', borderRadius: '6px',
                          background: p.rawPercentage >= 70 ? '#ECFDF5' : (p.rawPercentage >= 0 ? '#FEF2F2' : '#F1F5F9'),
                          color: p.rawPercentage >= 70 ? '#059669' : (p.rawPercentage >= 0 ? '#DC2626' : '#64748B'),
                          fontWeight: 700, fontSize: '0.82rem'
                        }}>
                          {p.overallAccuracy}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {p.earnedBadges && p.earnedBadges.length > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            {p.earnedBadges.map(bId => {
                              const bIcons = { champion: '🏆', fastest: '⚡', streak: '🔥', expert: '📦', team: '🎯', perfect: '💯' };
                              return (
                                <span key={bId} style={{ fontSize: '1rem' }}>{bIcons[bId] || '🏅'}</span>
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>—</span>
                        )}
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center', color: '#64748B', fontSize: '0.8rem' }}>
                        {p.lastQuizDate}
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '12px',
                          background: p.lastQuizStatus === 'Completed' ? '#ECFDF5' : '#FFFBEB',
                          color: p.lastQuizStatus === 'Completed' ? '#059669' : '#D97706',
                          fontSize: '0.72rem', fontWeight: 700
                        }}>
                          {p.lastQuizStatus}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDrilldownToHistory(p)}
                          style={{
                            background: '#EFF6FF',
                            color: '#2563EB',
                            border: '1px solid #BFDBFE',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>History</span>
                          <ExternalLink size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {renderPagination(filteredSummaries.length, summaryPage, summaryPageSize, setSummaryPage, setSummaryPageSize, 'participants')}
        </div>
      )}

      {/* ── VIEW B: TOPIC / QUIZ PERFORMANCE ── */}
      {!isEmployee && activeTab === 'topic' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
          overflow: 'hidden',
          marginBottom: '24px'
        }}>
          {/* Controls Bar */}
          <div style={{ padding: '24px 28px', borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, margin: '0 0 4px 0', fontSize: '1.2rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target size={20} color="#2563EB" />
                  Topic / Quiz Performance Arena
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B' }}>
                  Evaluate participant standings for a selected quiz or specific session. Sorted by points earned descending by default.
                </p>
              </div>

              {/* Status info pill */}
              <div style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: topicQuizId === 'all' ? '#FFFBEB' : '#EFF6FF',
                color: topicQuizId === 'all' ? '#B45309' : '#1D4ED8',
                border: `1px solid ${topicQuizId === 'all' ? '#FDE68A' : '#BFDBFE'}`,
                fontSize: '0.8rem',
                fontWeight: 600
              }}>
                {topicQuizId === 'all' 
                  ? '🌐 All Topics View — Showing all quiz sessions' 
                  : `🎯 Topic Scoped: ${availableQuizzes.find(q => q.id === topicQuizId)?.title || 'Selected Quiz'}`}
              </div>
            </div>

            {/* Filter Controls Row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              {/* Topic / Quiz Select */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Topic / Quiz:</label>
                <select
                  value={topicQuizId}
                  onChange={(e) => {
                    setTopicQuizId(e.target.value);
                    setTopicSessionId('all');
                    setTopicPage(1);
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    background: '#FFFFFF',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    outline: 'none',
                    minWidth: '220px'
                  }}
                >
                  <option value="all">All Topics / Quizzes ({availableQuizzes.length})</option>
                  {availableQuizzes.map(q => (
                    <option key={q.id} value={q.id}>
                      {q.title} ({q.questionCount} Questions)
                    </option>
                  ))}
                </select>
              </div>

              {/* Session Select */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Session:</label>
                <select
                  value={topicSessionId}
                  onChange={(e) => { setTopicSessionId(e.target.value); setTopicPage(1); }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    background: '#FFFFFF',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    outline: 'none',
                    minWidth: '200px'
                  }}
                >
                  <option value="all">All Sessions ({filteredAvailableSessions.length})</option>
                  {filteredAvailableSessions.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.sessionName} ({s.roomCode || 'Session'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Completion Status:</label>
                <select
                  value={topicStatus}
                  onChange={(e) => { setTopicStatus(e.target.value); setTopicPage(1); }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    background: '#FFFFFF',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    outline: 'none',
                    minWidth: '150px'
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="Completed">Completed Only</option>
                  <option value="In Progress">In Progress Only</option>
                </select>
              </div>

              {/* Search */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '200px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Search Participant:</label>
                <div style={{ position: 'relative' }}>
                  <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Search name, ID, zone..."
                    value={topicSearch}
                    onChange={(e) => { setTopicSearch(e.target.value); setTopicPage(1); }}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 32px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.84rem',
                      outline: 'none',
                      background: '#FFFFFF',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Reset button */}
              {(topicQuizId !== 'all' || topicSessionId !== 'all' || topicStatus !== 'all' || topicSearch) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'flex-end' }}>
                  <label style={{ fontSize: '0.75rem', visibility: 'hidden' }}>Reset</label>
                  <button
                    onClick={() => {
                      setTopicQuizId('all');
                      setTopicSessionId('all');
                      setTopicStatus('all');
                      setTopicSearch('');
                      setTopicPage(1);
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      background: '#F1F5F9',
                      color: '#475569',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          </div>

          {filteredTopicAttempts.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center', color: '#94A3B8', fontSize: '0.9rem' }}>
              No quiz attempt records match the selected topic and session criteria.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#475569', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {renderSortHeader('Rank', 'displayRank', topicSort, setTopicSort, 'center')}
                    {renderSortHeader('Participant', 'name', topicSort, setTopicSort)}
                    {renderSortHeader('Employee ID', 'employeeId', topicSort, setTopicSort)}
                    {renderSortHeader('Zone / Store', 'zone', topicSort, setTopicSort)}
                    {renderSortHeader('Quiz / Topic', 'quizTitle', topicSort, setTopicSort)}
                    {renderSortHeader('Session', 'sessionName', topicSort, setTopicSort)}
                    {renderSortHeader('Questions', 'questionsCount', topicSort, setTopicSort, 'center')}
                    {renderSortHeader('Correct', 'correctCount', topicSort, setTopicSort, 'center')}
                    {renderSortHeader('Quiz Score', 'rawPercentage', topicSort, setTopicSort, 'center')}
                    {renderSortHeader('Arena Points', 'arenaPoints', topicSort, setTopicSort, 'right')}
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Achievements</th>
                    {renderSortHeader('Status', 'status', topicSort, setTopicSort, 'center')}
                  </tr>
                </thead>
                <tbody>
                  {paginatedTopicAttempts.map((row, idx) => (
                    <tr key={row.id || idx} style={{
                      borderBottom: '1px solid #F1F5F9',
                      background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                      transition: 'background 0.15s ease'
                    }}>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          background: row.displayRank === 1 ? '#EFF6FF' : (row.displayRank <= 3 ? '#F1F5F9' : 'transparent'),
                          color: row.displayRank === 1 ? '#2563EB' : (row.displayRank <= 3 ? '#0F172A' : '#64748B'),
                          border: row.displayRank <= 3 ? '1px solid #CBD5E1' : 'none'
                        }}>
                          #{row.displayRank}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A' }}>
                        {row.name}
                      </td>

                      <td style={{ padding: '12px 14px', color: '#64748B', fontFamily: 'monospace' }}>
                        {row.employeeId}
                      </td>

                      <td style={{ padding: '12px 14px', color: '#475569' }}>
                        {row.zone}
                      </td>

                      <td style={{ padding: '12px 14px', color: '#0F172A', fontWeight: 600 }}>
                        {row.quizTitle}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          color: '#475569',
                          background: '#F1F5F9',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontFamily: 'monospace'
                        }}>
                          {row.sessionName}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center', color: '#475569' }}>
                        {row.answeredCount} / {row.questionsCount}
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center', color: '#10B981', fontWeight: 700 }}>
                        {row.correctCount}
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 8px', borderRadius: '6px',
                          background: row.rawPercentage >= 70 ? '#ECFDF5' : (row.rawPercentage !== null ? '#FEF2F2' : '#F1F5F9'),
                          color: row.rawPercentage >= 70 ? '#059669' : (row.rawPercentage !== null ? '#DC2626' : '#64748B'),
                          fontWeight: 700, fontSize: '0.82rem'
                        }}>
                          {row.quizPercentage}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#FF6B35', fontSize: '0.92rem' }}>
                        {row.arenaPoints} pts
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {row.earnedBadges && row.earnedBadges.length > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            {row.earnedBadges.map(bId => {
                              const bIcons = { champion: '🏆', fastest: '⚡', streak: '🔥', expert: '📦', team: '🎯', perfect: '💯' };
                              return (
                                <span key={bId} style={{ fontSize: '1rem' }}>{bIcons[bId] || '🏅'}</span>
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>—</span>
                        )}
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '12px',
                          background: row.status === 'Completed' ? '#ECFDF5' : '#FFFBEB',
                          color: row.status === 'Completed' ? '#059669' : '#D97706',
                          fontSize: '0.72rem', fontWeight: 700
                        }}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {renderPagination(filteredTopicAttempts.length, topicPage, topicPageSize, setTopicPage, setTopicPageSize, 'session attempts')}
        </div>
      )}

      {/* ── VIEW C: QUIZ ATTEMPT HISTORY ── */}
      {!isEmployee && activeTab === 'history' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
          overflow: 'hidden',
          marginBottom: '24px'
        }}>
          {/* Controls Bar */}
          <div style={{ padding: '24px 28px', borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, margin: '0 0 4px 0', fontSize: '1.2rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={20} color="#2563EB" />
                  Quiz Attempt History
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B' }}>
                  Chronological, searchable history of all quiz sessions conducted under {selectedProjectName}.
                </p>
              </div>

              {/* CSV Export Button */}
              <button
                onClick={() => exportToCSV(filteredHistoryAttempts, `quiz_history_${selectedProjectId}_${new Date().toISOString().split('T')[0]}.csv`)}
                disabled={filteredHistoryAttempts.length === 0}
                style={{
                  padding: '9px 16px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: filteredHistoryAttempts.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(15,23,42,0.05)'
                }}
              >
                <Download size={15} color="#2563EB" />
                <span>Export CSV ({filteredHistoryAttempts.length})</span>
              </button>
            </div>

            {/* Drill-down active notice banner */}
            {historyParticipantFilter && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 14px',
                borderRadius: '8px',
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                color: '#1D4ED8',
                marginBottom: '16px',
                fontSize: '0.85rem',
                fontWeight: 600
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Drill-down Filter: Showing attempts for participant</span>
                  <span style={{ fontWeight: 800, textDecoration: 'underline' }}>{historyParticipantFilter}</span>
                </div>
                <button
                  onClick={() => setHistoryParticipantFilter('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563EB',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: 700,
                    fontSize: '0.8rem'
                  }}
                >
                  <X size={14} /> Clear Drilldown
                </button>
              </div>
            )}

            {/* Filter Bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              {/* Search input */}
              <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search by participant, employee ID, zone, quiz..."
                  value={historySearch}
                  onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '0.84rem',
                    outline: 'none',
                    background: '#FFFFFF',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Topic Select */}
              <select
                value={historyQuizFilter}
                onChange={(e) => { setHistoryQuizFilter(e.target.value); setHistoryPage(1); }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  outline: 'none',
                  minWidth: '180px'
                }}
              >
                <option value="all">All Quizzes / Topics</option>
                {availableQuizzes.map(q => (
                  <option key={q.id} value={q.id}>{q.title}</option>
                ))}
              </select>

              {/* Status Select */}
              <select
                value={historyStatusFilter}
                onChange={(e) => { setHistoryStatusFilter(e.target.value); setHistoryPage(1); }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  outline: 'none',
                  minWidth: '140px'
                }}
              >
                <option value="all">All Statuses</option>
                <option value="Completed">Completed</option>
                <option value="In Progress">In Progress</option>
              </select>
            </div>
          </div>

          {filteredHistoryAttempts.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center', color: '#94A3B8', fontSize: '0.9rem' }}>
              No historical quiz attempt records match the filter criteria.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#475569', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {renderSortHeader('Date', 'createdAt', historySort, setHistorySort)}
                    {renderSortHeader('Participant', 'name', historySort, setHistorySort)}
                    {renderSortHeader('Employee ID', 'employeeId', historySort, setHistorySort)}
                    {renderSortHeader('Zone / Store', 'zone', historySort, setHistorySort)}
                    {renderSortHeader('Quiz / Topic', 'quizTitle', historySort, setHistorySort)}
                    {renderSortHeader('Session', 'sessionName', historySort, setHistorySort)}
                    {renderSortHeader('Questions', 'questionsCount', historySort, setHistorySort, 'center')}
                    {renderSortHeader('Correct', 'correctCount', historySort, setHistorySort, 'center')}
                    {renderSortHeader('Score', 'rawPercentage', historySort, setHistorySort, 'center')}
                    {renderSortHeader('Points', 'arenaPoints', historySort, setHistorySort, 'right')}
                    {renderSortHeader('Status', 'status', historySort, setHistorySort, 'center')}
                  </tr>
                </thead>
                <tbody>
                  {paginatedHistoryAttempts.map((row, idx) => (
                    <tr key={row.id || idx} style={{
                      borderBottom: '1px solid #F1F5F9',
                      background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                      transition: 'background 0.15s ease'
                    }}>
                      <td style={{ padding: '12px 14px', color: '#64748B', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                        {row.date || (row.createdAt ? new Date(row.createdAt).toISOString().split('T')[0] : 'N/A')}
                      </td>

                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A' }}>
                        {row.name}
                      </td>

                      <td style={{ padding: '12px 14px', color: '#64748B', fontFamily: 'monospace' }}>
                        {row.employeeId}
                      </td>

                      <td style={{ padding: '12px 14px', color: '#475569' }}>
                        {row.zone}
                      </td>

                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0F172A' }}>
                        {row.quizTitle}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          color: '#475569',
                          background: '#F1F5F9',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontFamily: 'monospace'
                        }}>
                          {row.sessionName}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center', color: '#475569' }}>
                        {row.answeredCount} / {row.questionsCount}
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center', color: '#10B981', fontWeight: 700 }}>
                        {row.correctCount}
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 8px', borderRadius: '6px',
                          background: row.rawPercentage >= 70 ? '#ECFDF5' : (row.rawPercentage !== null ? '#FEF2F2' : '#F1F5F9'),
                          color: row.rawPercentage >= 70 ? '#059669' : (row.rawPercentage !== null ? '#DC2626' : '#64748B'),
                          fontWeight: 700, fontSize: '0.82rem'
                        }}>
                          {row.quizPercentage}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#FF6B35' }}>
                        {row.arenaPoints} pts
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '12px',
                          background: row.status === 'Completed' ? '#ECFDF5' : '#FFFBEB',
                          color: row.status === 'Completed' ? '#059669' : '#D97706',
                          fontSize: '0.72rem', fontWeight: 700
                        }}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {renderPagination(filteredHistoryAttempts.length, historyPage, historyPageSize, setHistoryPage, setHistoryPageSize, 'attempts')}
        </div>
      )}

      {/* ── VIEW D: BADGES & CRITERIA TAB ── */}
      {(isEmployee || activeTab === 'badges') && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          padding: '28px',
          marginTop: isEmployee ? '0' : '24px',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
        }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem', color: '#0F172A' }}>
              <Award size={22} color="#FF6B35" />
              {isEmployee ? 'Personal Badge Collection' : 'Project Team Badge Achievements & Criteria'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
              {isEmployee
                ? 'Your validated Live Arena achievements awarded strictly upon meeting objective qualification rules.'
                : `Team qualification criteria evaluated against authoritative finalized session results (${badges.filter(b => b.unlocked).length} of ${badges.length} badges achieved by project team).`}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {badges.map(b => (
              <div key={b.id} style={{
                padding: '20px',
                borderRadius: '14px',
                background: b.unlocked ? `${b.color}0A` : '#F8FAFC',
                border: `1.5px solid ${b.unlocked ? b.color + '40' : '#E2E8F0'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                opacity: b.unlocked ? 1 : 0.7,
                transition: 'all 0.2s ease',
                boxShadow: b.unlocked ? `0 2px 8px ${b.color}15` : 'none'
              }}>
                <div style={{
                  width: '52px', height: '52px', borderRadius: '14px',
                  background: b.unlocked ? `${b.color}15` : '#E2E8F0',
                  border: `2px solid ${b.unlocked ? b.color + '40' : '#CBD5E1'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.65rem', flexShrink: 0
                }}>
                  {b.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.94rem', color: b.unlocked ? '#0F172A' : '#475569', marginBottom: '3px' }}>
                    {b.label}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', lineHeight: 1.4 }}>
                    {b.desc}
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: b.unlocked ? `${b.color}15` : '#F1F5F9',
                      color: b.unlocked ? b.color : '#64748B',
                      border: `1px solid ${b.unlocked ? b.color + '30' : '#E2E8F0'}`
                    }}>
                      {b.statusText || (b.unlocked ? '✓ Earned' : 'Locked (Criteria Unmet)')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Team Performance by Zone / Store (Shown on Summary Tab or Base Dashboard) ── */}
      {!isEmployee && activeTab === 'summary' && zoneBreakdown.length > 0 && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          padding: '24px 28px',
          marginTop: '24px',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, margin: '0 0 4px 0', fontSize: '1.15rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={20} color="#2563EB" />
                Team Performance by Zone / Store
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B' }}>
                Performance aggregated by registered participant store or territory.
              </p>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '14px'
          }}>
            {zoneBreakdown.map((z, idx) => (
              <div key={idx} style={{
                padding: '16px 18px',
                borderRadius: '12px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A' }}>
                    {z.zone}
                  </span>
                  <span style={{
                    padding: '3px 8px', borderRadius: '6px',
                    background: '#EFF6FF', color: '#2563EB',
                    fontSize: '0.72rem', fontWeight: 700
                  }}>
                    {z.participantCount} {z.participantCount === 1 ? 'Learner' : 'Learners'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748B' }}>
                  <span>Completed Quizzes:</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>{z.quizzesCompleted}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748B' }}>
                  <span>Average Score:</span>
                  <span style={{ fontWeight: 700, color: z.avgScore !== 'N/A' ? '#10B981' : '#94A3B8' }}>{z.avgScore}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748B', borderTop: '1px dashed #E2E8F0', paddingTop: '6px' }}>
                  <span>Arena Points:</span>
                  <span style={{ fontWeight: 800, color: '#FF6B35' }}>{z.totalArenaPoints.toLocaleString()} pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
