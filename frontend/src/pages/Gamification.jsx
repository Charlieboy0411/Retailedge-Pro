import React, { useEffect, useState, useContext, useMemo } from 'react';
import {
  Trophy, Award, Target, Zap, Clock, TrendingUp, Search,
  Users, CheckCircle2, ChevronRight, Filter, AlertCircle,
  MapPin, RefreshCw, BarChart2, ShieldCheck, Flame, Layers,
  Download, ChevronUp, ChevronDown, ArrowUpDown, X, ExternalLink,
  Calendar, FileText, Check, Eye, Info, Globe, Building2
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
    'Session Reference',
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

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  // Navigation tabs for non-employees: 'summary' (View A) | 'topic' (View B) | 'history' (View C) | 'badges'
  const [activeTab, setActiveTab] = useState('summary');

  // View A: Project Summary State
  const [summarySearch, setSummarySearch] = useState('');
  const [summarySort, setSummarySort] = useState({ key: 'cumulativeArenaPoints', direction: 'desc' });
  const [summaryPage, setSummaryPage] = useState(1);
  const [summaryPageSize, setSummaryPageSize] = useState(10);
  const [expandedSummaryRows, setExpandedSummaryRows] = useState({});

  // View B: Topic / Quiz Performance State
  const [topicQuizId, setTopicQuizId] = useState('all');
  const [topicSessionId, setTopicSessionId] = useState('all');
  const [topicStatus, setTopicStatus] = useState('all');
  const [topicSearch, setTopicSearch] = useState('');
  const [topicSort, setTopicSort] = useState({ key: 'arenaPoints', direction: 'desc' });
  const [topicPage, setTopicPage] = useState(1);
  const [topicPageSize, setTopicPageSize] = useState(10);
  const [expandedTopicRows, setExpandedTopicRows] = useState({});

  // View C: Quiz Attempt History State
  const [historySubTab, setHistorySubTab] = useState('timeline'); // 'timeline' | 'participants'
  const [historySearch, setHistorySearch] = useState('');
  const [historyQuizFilter, setHistoryQuizFilter] = useState('all');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [historyParticipantFilter, setHistoryParticipantFilter] = useState('');
  const [historySort, setHistorySort] = useState({ key: 'createdAt', direction: 'desc' });
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [historySummaryPage, setHistorySummaryPage] = useState(1);
  const [historySummaryPageSize, setHistorySummaryPageSize] = useState(10);
  const [expandedHistoryRows, setExpandedHistoryRows] = useState({});

  const userRole = user?.role || (user?.Role ? user?.Role?.role_name : '');
  const isEmployee = userRole === 'Employee';

  const fetchGamificationData = async (projId) => {
    setLoading(true);
    setError(null);
    setRefreshError(null);
    try {
      const res = await axios.get('/api/reports/gamification', {
        params: {
          projectId: projId || 'all',
          _t: Date.now()
        },
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });
      setData(res.data);
      if (res.data?.selectedProjectId) {
        setSelectedProjectId(res.data.selectedProjectId);
      }
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error('Failed to load gamification data:', err);
      const msg = err.response?.data?.error || err.message || 'Failed to load participant results.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Dedicated functional refresh control
  const handleRefresh = async () => {
    if (isRefreshing) return; // Prevent duplicate overlapping requests
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      const res = await axios.get('/api/reports/gamification', {
        params: {
          projectId: selectedProjectId || 'all',
          _t: Date.now() // Cache-busting
        },
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });
      setData(res.data);
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error('Refresh request failed:', err);
      const msg = err.response?.data?.error || err.message || 'Failed to reload latest data.';
      setRefreshError(msg);
    } finally {
      setIsRefreshing(false);
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
    setHistorySummaryPage(1);
    fetchGamificationData(newProj);
  };

  // Row expand toggles
  const toggleSummaryRow = (id) => {
    setExpandedSummaryRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleTopicRow = (id) => {
    setExpandedTopicRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleHistoryRow = (id) => {
    setExpandedHistoryRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Drill-down from View A into View C
  const handleDrilldownToHistory = (participant) => {
    const filterKey = participant.employeeId && participant.employeeId !== 'N/A'
      ? participant.employeeId
      : participant.name;
    setHistoryParticipantFilter(filterKey);
    setHistorySearch('');
    setHistorySubTab('timeline');
    setHistoryPage(1);
    setActiveTab('history');
  };

  // Helper sort header renderer
  const renderSortHeader = (label, colKey, currentSort, setSortHandler, align = 'left', customWidth = null, minWidth = null) => {
    const isActive = currentSort.key === colKey;
    return (
      <th
        onClick={() => {
          if (isActive) {
            setSortHandler({ key: colKey, direction: currentSort.direction === 'asc' ? 'desc' : 'asc' });
          } else {
            const defaultDesc = ['cumulativeArenaPoints', 'arenaPoints', 'rawPercentage', 'quizzesCompleted', 'distinctQuizzesAttempted', 'totalAttempts', 'questionsCount', 'answeredCount', 'correctCount', 'createdAt', 'lastQuizDate'].includes(colKey);
            setSortHandler({ key: colKey, direction: defaultDesc ? 'desc' : 'asc' });
          }
        }}
        style={{
          padding: '11px 8px',
          textAlign: align,
          cursor: 'pointer',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          color: isActive ? '#2563EB' : '#475569',
          fontWeight: 700,
          background: isActive ? '#EFF6FF50' : 'transparent',
          transition: 'all 0.15s ease',
          width: customWidth || 'auto',
          minWidth: minWidth || (customWidth || 'auto')
        }}
        title={`Sort by ${label}`}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', justifyContent: align === 'right' ? 'flex-end' : (align === 'center' ? 'center' : 'flex-start') }}>
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
        padding: '12px 18px',
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
  // 1. Participant-level development summary list
  const participantHistoryList = useMemo(() => {
    return filteredSummaries;
  }, [filteredSummaries]);

  const paginatedParticipantHistory = useMemo(() => {
    if (historySummaryPageSize === 'all') return participantHistoryList;
    const start = (historySummaryPage - 1) * historySummaryPageSize;
    return participantHistoryList.slice(start, start + historySummaryPageSize);
  }, [participantHistoryList, historySummaryPage, historySummaryPageSize]);

  // 2. Chronological attempts log list
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
    <div className="view-section active" style={{ padding: '0 0 24px 0', maxWidth: '1440px', margin: '0 auto', boxSizing: 'border-box' }}>

      {/* ── Top Header & Context Bar ── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '24px 28px',
        marginBottom: '20px',
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

          {/* Functional Refresh Button */}
          <button
            id="gamification-refresh-btn"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Reload latest authorized data from server"
            style={{
              padding: '9px 14px',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              background: isRefreshing ? '#EFF6FF' : '#F8FAFC',
              color: isRefreshing ? '#2563EB' : '#475569',
              cursor: isRefreshing ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              fontWeight: 600,
              boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
              transition: 'all 0.15s ease'
            }}
          >
            <RefreshCw size={15} className={isRefreshing ? 'spinning' : ''} style={{ color: isRefreshing ? '#2563EB' : '#64748B' }} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ── Refresh feedback banner / error alert ── */}
      {refreshError && (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '10px',
          padding: '10px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.82rem',
          color: '#991B1B'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} color="#DC2626" />
            <span>Refresh notice: {refreshError}. Displaying previously loaded data.</span>
          </div>
          <button
            onClick={() => setRefreshError(null)}
            style={{ background: 'none', border: 'none', color: '#991B1B', cursor: 'pointer', padding: 0 }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── View Navigation Tabs (For Non-Employees) ── */}
      {!isEmployee && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '20px',
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

      {/* ── Top Metric Summary Cards (Shared across views) ── */}
      {!isEmployee && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {/* Card 1: Eligible Participants */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '12px',
              background: '#EFF6FF', color: '#2563EB',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Users size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Eligible Participants
              </div>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.55rem', fontWeight: 900, color: '#0F172A', lineHeight: 1.1 }}>
                {summary.totalParticipants || 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '2px' }}>
                Project team learners
              </div>
            </div>
          </div>

          {/* Card 2: Quizzes Completed */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '12px',
              background: '#ECFDF5', color: '#10B981',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Quizzes Completed
              </div>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.55rem', fontWeight: 900, color: '#0F172A', lineHeight: 1.1 }}>
                {summary.completedAttempts ?? summary.quizzesCompleted ?? 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                {summary.completedAttempts ?? summary.quizzesCompleted ?? 0} of {summary.totalAttempts ?? 0} completed • {summary.distinctQuizzesCount ?? 1} topics
              </div>
            </div>
          </div>

          {/* Card 3: Average Quiz Score */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '12px',
              background: '#FFFBEB', color: '#F59E0B',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Target size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Average Quiz Score
              </div>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.55rem', fontWeight: 900, color: '#0F172A', lineHeight: 1.1 }}>
                {summary.avgScore || 'N/A'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '2px' }}>
                Finalized assessment accuracy
              </div>
            </div>
          </div>

          {/* Card 4: Total Arena Points */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '12px',
              background: '#FFF7ED', color: '#FF6B35',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Trophy size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Arena Points
              </div>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.55rem', fontWeight: 900, color: '#FF6B35', lineHeight: 1.1 }}>
                {(summary.totalArenaPoints ?? 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '2px' }}>
                Live Arena score tally
              </div>
            </div>
          </div>
        </div>
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
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <div>
                <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, margin: '0 0 4px 0', fontSize: '1.18rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart2 size={20} color="#2563EB" />
                  Project Performance Summary
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B' }}>
                  Cumulative participant performance across all quizzes in {selectedProjectName}. Exactly one row per unique participant.
                </p>
              </div>

              {/* Search Bar */}
              <div style={{ position: 'relative', minWidth: '260px' }}>
                <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search name, ID, zone..."
                  value={summarySearch}
                  onChange={e => { setSummarySearch(e.target.value); setSummaryPage(1); }}
                  style={{
                    width: '100%',
                    padding: '8px 14px 8px 34px',
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
          </div>

          {filteredSummaries.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center', color: '#94A3B8', fontSize: '0.9rem' }}>
              {summarySearch ? 'No participants match your search filter.' : 'No participant records exist for this project yet.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#475569', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {renderSortHeader('Rank', 'displayRank', summarySort, setSummarySort, 'center', '52px', '52px')}
                    {renderSortHeader('Participant', 'name', summarySort, setSummarySort, 'left', '200px', '180px')}
                    {renderSortHeader('Zone / Store', 'zone', summarySort, setSummarySort, 'left', '100px', '90px')}
                    {renderSortHeader('Quizzes Completed', 'quizzesCompleted', summarySort, setSummarySort, 'center', '120px', '110px')}
                    {renderSortHeader('Cumulative Points', 'cumulativeArenaPoints', summarySort, setSummarySort, 'right', '120px', '110px')}
                    {renderSortHeader('Overall Accuracy', 'rawPercentage', summarySort, setSummarySort, 'center', '110px', '100px')}
                    <th style={{ padding: '11px 8px', textAlign: 'center', width: '80px', minWidth: '70px', whiteSpace: 'nowrap' }}>Badges</th>
                    <th style={{ padding: '11px 8px', textAlign: 'center', width: '85px', minWidth: '80px', whiteSpace: 'nowrap' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSummaries.map((p, idx) => {
                    const rowKey = p.userId || p.employeeId || idx;
                    const isExpanded = !!expandedSummaryRows[rowKey];

                    return (
                      <React.Fragment key={rowKey}>
                        <tr style={{
                          borderBottom: isExpanded ? 'none' : '1px solid #F1F5F9',
                          background: isExpanded ? '#F8FAFC' : (idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'),
                          transition: 'background 0.15s ease'
                        }}>
                          {/* Rank */}
                          <td style={{ padding: '12px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
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

                          {/* Participant Name & Inline Subtitle */}
                          <td style={{ padding: '12px 10px', minWidth: '180px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <button
                                onClick={() => toggleSummaryRow(rowKey)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  color: '#2563EB',
                                  flexShrink: 0
                                }}
                                title={isExpanded ? 'Collapse details' : 'Expand details'}
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                              <div
                                style={{
                                  minWidth: 0,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                                title={`${p.name}${p.employeeId && p.employeeId !== 'N/A' ? ` (${p.employeeId})` : ''}`}
                              >
                                <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.88rem' }}>
                                  {p.name}
                                </span>
                                {p.employeeId && p.employeeId !== 'N/A' && (
                                  <span style={{ fontSize: '0.74rem', color: '#64748B', marginLeft: '6px', fontFamily: 'monospace', fontWeight: 500 }}>
                                    ({p.employeeId})
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Zone / Store */}
                          <td style={{ padding: '12px 10px', color: '#475569', whiteSpace: 'nowrap' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: '#F1F5F9',
                              fontSize: '0.8rem',
                              fontWeight: 600
                            }}>
                              {p.zone}
                            </span>
                          </td>

                          {/* Quizzes Completed */}
                          <td style={{ padding: '12px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: p.quizzesCompleted > 0 ? '#ECFDF5' : '#F1F5F9',
                              color: p.quizzesCompleted > 0 ? '#059669' : '#64748B',
                              fontWeight: 700,
                              fontSize: '0.8rem'
                            }}>
                              {p.quizzesCompleted} {p.quizzesCompleted === 1 ? 'quiz' : 'quizzes'}
                            </span>
                          </td>

                          {/* Cumulative Arena Points */}
                          <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 800, color: '#FF6B35', fontSize: '0.92rem', whiteSpace: 'nowrap' }}>
                            {p.cumulativeArenaPoints.toLocaleString()} pts
                          </td>

                          {/* Overall Accuracy */}
                          <td style={{ padding: '12px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <span style={{
                              padding: '3px 8px', borderRadius: '6px',
                              background: p.rawPercentage >= 70 ? '#ECFDF5' : (p.rawPercentage >= 0 ? '#FEF2F2' : '#F1F5F9'),
                              color: p.rawPercentage >= 70 ? '#059669' : (p.rawPercentage >= 0 ? '#DC2626' : '#64748B'),
                              fontWeight: 700, fontSize: '0.82rem'
                            }}>
                              {p.overallAccuracy}
                            </span>
                          </td>

                          {/* Badges Earned */}
                          <td style={{ padding: '12px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {p.earnedBadges && p.earnedBadges.length > 0 ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                {p.earnedBadges.map(bId => {
                                  const bIcons = { champion: '🏆', fastest: '⚡', streak: '🔥', expert: '📦', team: '🎯', perfect: '💯' };
                                  return (
                                    <span key={bId} style={{ fontSize: '0.95rem' }}>{bIcons[bId] || '🏅'}</span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span style={{ color: '#94A3B8' }}>—</span>
                            )}
                          </td>

                          {/* Actions: History & Expand */}
                          <td style={{ padding: '12px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                onClick={() => handleDrilldownToHistory(p)}
                                style={{
                                  background: '#EFF6FF',
                                  color: '#2563EB',
                                  border: '1px solid #BFDBFE',
                                  borderRadius: '6px',
                                  padding: '5px 10px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.15s ease'
                                }}
                                title="View chronological quiz history for this participant"
                              >
                                <span>History</span>
                                <ExternalLink size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Secondary Details Panel */}
                        {isExpanded && (
                          <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                            <td colSpan={8} style={{ padding: '12px 20px' }}>
                              <div style={{
                                background: '#FFFFFF',
                                border: '1px solid #E2E8F0',
                                borderRadius: '10px',
                                padding: '14px 18px',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                gap: '14px',
                                fontSize: '0.82rem'
                              }}>
                                <div>
                                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Employee ID</span>
                                  <span style={{ fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>{p.employeeId || 'N/A'}</span>
                                </div>
                                <div>
                                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Most Recent Quiz Date</span>
                                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{p.lastQuizDate || 'N/A'}</span>
                                </div>
                                <div>
                                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Latest Attempt Status</span>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    background: p.lastQuizStatus === 'Completed' ? '#ECFDF5' : '#FFFBEB',
                                    color: p.lastQuizStatus === 'Completed' ? '#059669' : '#D97706',
                                    fontWeight: 700,
                                    fontSize: '0.72rem',
                                    marginTop: '2px'
                                  }}>
                                    {p.lastQuizStatus || 'N/A'}
                                  </span>
                                </div>
                                <div>
                                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Total Attempts</span>
                                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{p.totalAttempts || 0} attempts ({p.quizzesCompleted} completed)</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <button
                                    onClick={() => handleDrilldownToHistory(p)}
                                    style={{
                                      background: '#2563EB',
                                      color: '#FFFFFF',
                                      border: 'none',
                                      borderRadius: '6px',
                                      padding: '6px 12px',
                                      fontSize: '0.78rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px'
                                    }}
                                  >
                                    <span>Open Full Attempt History</span>
                                    <ChevronRight size={14} />
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
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
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, margin: '0 0 4px 0', fontSize: '1.18rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  ? '🌐 All Topics & Sessions View — Displaying individual quiz session attempts'
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

              {/* Session Select with clean readable labels (NO raw session IDs) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Session Scope:</label>
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
                  {filteredAvailableSessions.map(s => {
                    const sessionDate = s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
                    const label = s.sessionName && !s.sessionName.startsWith('off-')
                      ? s.sessionName
                      : (s.roomCode ? `Live Session #${s.roomCode}` : `Offline Session ${sessionDate ? '(' + sessionDate + ')' : ''}`);
                    return (
                      <option key={s.id} value={s.id}>
                        {label} — {s.quizTitle || 'Quiz'}
                      </option>
                    );
                  })}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '180px' }}>
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
            <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: '1020px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#475569', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {renderSortHeader('Rank', 'displayRank', topicSort, setTopicSort, 'center', '64px', '64px')}
                    {renderSortHeader('Participant', 'name', topicSort, setTopicSort, 'left', '240px', '220px')}
                    {renderSortHeader('Zone / Store', 'zone', topicSort, setTopicSort, 'left', '140px', '130px')}
                    {renderSortHeader('Correct Answers', 'correctCount', topicSort, setTopicSort, 'center', '140px', '130px')}
                    {renderSortHeader('Quiz Score', 'rawPercentage', topicSort, setTopicSort, 'center', '130px', '120px')}
                    {renderSortHeader('Points Earned', 'arenaPoints', topicSort, setTopicSort, 'right', '140px', '130px')}
                    {renderSortHeader('Status', 'status', topicSort, setTopicSort, 'center', '130px', '120px')}
                    <th style={{ padding: '12px 14px', textAlign: 'center', width: '100px', minWidth: '90px', whiteSpace: 'nowrap' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTopicAttempts.map((row, idx) => {
                    const rowKey = row.id || idx;
                    const isExpanded = !!expandedTopicRows[rowKey];

                    return (
                      <React.Fragment key={rowKey}>
                        <tr style={{
                          borderBottom: isExpanded ? 'none' : '1px solid #F1F5F9',
                          background: isExpanded ? '#F8FAFC' : (idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'),
                          transition: 'background 0.15s ease'
                        }}>
                          {/* Rank */}
                          <td style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
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

                          {/* Participant Name & Inline Subtitle */}
                          <td style={{ padding: '12px 14px', minWidth: '220px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <button
                                onClick={() => toggleTopicRow(rowKey)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  color: '#2563EB',
                                  flexShrink: 0
                                }}
                                title={isExpanded ? 'Collapse' : 'Expand'}
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                              <div
                                style={{
                                  minWidth: 0,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                                title={`${row.name}${row.employeeId && row.employeeId !== 'N/A' ? ` (${row.employeeId})` : ''}`}
                              >
                                <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.88rem' }}>
                                  {row.name}
                                </span>
                                {row.employeeId && row.employeeId !== 'N/A' && (
                                  <span style={{ fontSize: '0.74rem', color: '#64748B', marginLeft: '6px', fontFamily: 'monospace', fontWeight: 500 }}>
                                    ({row.employeeId})
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Zone / Store */}
                          <td style={{ padding: '10px 12px', color: '#475569' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: '#F1F5F9',
                              fontSize: '0.8rem',
                              fontWeight: 600
                            }}>
                              {row.zone}
                            </span>
                          </td>

                          {/* Correct Answers */}
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>
                            <span style={{ color: '#10B981', fontWeight: 700 }}>{row.correctCount}</span> / {row.questionsCount}
                          </td>

                          {/* Quiz Score */}
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{
                              padding: '3px 8px', borderRadius: '6px',
                              background: row.rawPercentage >= 70 ? '#ECFDF5' : (row.rawPercentage !== null ? '#FEF2F2' : '#F1F5F9'),
                              color: row.rawPercentage >= 70 ? '#059669' : (row.rawPercentage !== null ? '#DC2626' : '#64748B'),
                              fontWeight: 700, fontSize: '0.82rem'
                            }}>
                              {row.quizPercentage}
                            </span>
                          </td>

                          {/* Points Earned */}
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#FF6B35', fontSize: '0.92rem' }}>
                            {row.arenaPoints} pts
                          </td>

                          {/* Completion Status */}
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{
                              padding: '3px 8px', borderRadius: '12px',
                              background: row.status === 'Completed' ? '#ECFDF5' : '#FFFBEB',
                              color: row.status === 'Completed' ? '#059669' : '#D97706',
                              fontSize: '0.72rem', fontWeight: 700
                            }}>
                              {row.status}
                            </span>
                          </td>

                          {/* Details Toggle */}
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <button
                              onClick={() => toggleTopicRow(rowKey)}
                              style={{
                                background: '#F1F5F9',
                                color: '#475569',
                                border: '1px solid #E2E8F0',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <span>{isExpanded ? 'Hide' : 'Details'}</span>
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                          </td>
                        </tr>

                        {/* Expandable Topic Row Details */}
                        {isExpanded && (
                          <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                            <td colSpan={8} style={{ padding: '12px 20px' }}>
                              <div style={{
                                background: '#FFFFFF',
                                border: '1px solid #E2E8F0',
                                borderRadius: '10px',
                                padding: '14px 18px',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                gap: '14px',
                                fontSize: '0.82rem'
                              }}>
                                <div>
                                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Topic / Quiz</span>
                                  <span style={{ fontWeight: 700, color: '#0F172A' }}>{row.quizTitle}</span>
                                </div>
                                <div>
                                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Submission Date</span>
                                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{row.date || 'N/A'}</span>
                                </div>
                                <div>
                                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Questions Answered</span>
                                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{row.answeredCount} of {row.questionsCount} answered ({row.correctCount} correct)</span>
                                </div>
                                <div>
                                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Badges Earned</span>
                                  <div>
                                    {row.earnedBadges && row.earnedBadges.length > 0 ? (
                                      <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                                        {row.earnedBadges.map(bId => {
                                          const bIcons = { champion: '🏆', fastest: '⚡', streak: '🔥', expert: '📦', team: '🎯', perfect: '💯' };
                                          return <span key={bId} style={{ fontSize: '1rem' }}>{bIcons[bId] || '🏅'}</span>;
                                        })}
                                      </div>
                                    ) : (
                                      <span style={{ color: '#94A3B8' }}>None on this attempt</span>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <span style={{ color: '#94A3B8', display: 'block', fontSize: '0.70rem', textTransform: 'uppercase', fontWeight: 700 }}>Technical Session Ref</span>
                                  <span style={{ color: '#64748B', fontFamily: 'monospace', fontSize: '0.75rem' }}>{row.sessionId || row.sessionName || 'N/A'}</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {renderPagination(filteredTopicAttempts.length, topicPage, topicPageSize, setTopicPage, setTopicPageSize, 'session attempts')}
        </div>
      )}

      {/* ── VIEW C: QUIZ ATTEMPT HISTORY (DISTINCT AUDIT & DEVELOPMENT VIEW) ── */}
      {!isEmployee && activeTab === 'history' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
          overflow: 'hidden',
          marginBottom: '24px'
        }}>
          {/* Top Historical KPI Volume Cards */}
          <div style={{
            padding: '20px 24px',
            background: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, margin: '0 0 4px 0', fontSize: '1.18rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={20} color="#2563EB" />
                  Quiz Attempt History & Development
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B' }}>
                  Chronological participation volume, timeline of attempts, and individual participant progression over time.
                </p>
              </div>

              {/* CSV Export Button */}
              <button
                onClick={() => exportToCSV(filteredHistoryAttempts, `quiz_history_${selectedProjectId}_${new Date().toISOString().split('T')[0]}.csv`)}
                disabled={filteredHistoryAttempts.length === 0}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
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

            {/* Clearly defined historical counts */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px'
            }}>
              <div style={{ background: '#FFFFFF', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Unique Participants</span>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                  {summary.totalParticipants || 0}
                </div>
                <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>Enrolled project learners</span>
              </div>

              <div style={{ background: '#FFFFFF', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Distinct Quizzes Attempted</span>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.35rem', fontWeight: 800, color: '#2563EB', marginTop: '2px' }}>
                  {summary.distinctQuizzesCount || 0}
                </div>
                <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>Different quiz topics</span>
              </div>

              <div style={{ background: '#FFFFFF', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Distinct Sessions</span>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                  {summary.distinctSessionsCount || 0}
                </div>
                <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>Conducting session instances</span>
              </div>

              <div style={{ background: '#FFFFFF', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Participant Attempts</span>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.35rem', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
                  {summary.totalAttempts || 0}
                </div>
                <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                  {summary.completedAttempts ?? summary.quizzesCompleted ?? 0} completed • {Math.max(0, (summary.totalAttempts || 0) - (summary.completedAttempts ?? summary.quizzesCompleted ?? 0))} in progress
                </span>
              </div>
            </div>
          </div>

          {/* Sub-view switcher: Development Summary vs Chronological Attempt Log */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '6px', background: '#F1F5F9', padding: '3px', borderRadius: '8px' }}>
              <button
                onClick={() => setHistorySubTab('timeline')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: historySubTab === 'timeline' ? '#FFFFFF' : 'transparent',
                  color: historySubTab === 'timeline' ? '#0F172A' : '#64748B',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: historySubTab === 'timeline' ? '0 1px 2px rgba(15,23,42,0.06)' : 'none'
                }}
              >
                Chronological Attempt Log ({filteredHistoryAttempts.length})
              </button>
              <button
                onClick={() => setHistorySubTab('participants')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: historySubTab === 'participants' ? '#FFFFFF' : 'transparent',
                  color: historySubTab === 'participants' ? '#0F172A' : '#64748B',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: historySubTab === 'participants' ? '0 1px 2px rgba(15,23,42,0.06)' : 'none'
                }}
              >
                Participant Development Summary ({participantHistoryList.length})
              </button>
            </div>

            {/* Drilldown active notice banner */}
            {historyParticipantFilter && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                color: '#1D4ED8',
                fontSize: '0.8rem',
                fontWeight: 600
              }}>
                <span>Filtered by: <strong>{historyParticipantFilter}</strong></span>
                <button
                  onClick={() => setHistoryParticipantFilter('')}
                  style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', padding: 0 }}
                  title="Clear filter"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Sub-Tab 1: Chronological Attempt Log */}
          {historySubTab === 'timeline' && (
            <div>
              {/* Filter controls */}
              <div style={{ padding: '14px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
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

              {filteredHistoryAttempts.length === 0 ? (
                <div style={{ padding: '48px 16px', textAlign: 'center', color: '#94A3B8', fontSize: '0.9rem' }}>
                  No historical quiz attempt records match the filter criteria.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', minWidth: '1020px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#475569', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {renderSortHeader('Date', 'createdAt', historySort, setHistorySort, 'left', '110px')}
                        {renderSortHeader('Participant', 'name', historySort, setHistorySort, 'left', '220px', '200px')}
                        {renderSortHeader('Zone / Store', 'zone', historySort, setHistorySort, 'left', '130px')}
                        {renderSortHeader('Quiz / Topic', 'quizTitle', historySort, setHistorySort)}
                        {renderSortHeader('Questions', 'questionsCount', historySort, setHistorySort, 'center', '110px')}
                        {renderSortHeader('Score', 'rawPercentage', historySort, setHistorySort, 'center', '110px')}
                        {renderSortHeader('Points', 'arenaPoints', historySort, setHistorySort, 'right', '110px')}
                        {renderSortHeader('Status', 'status', historySort, setHistorySort, 'center', '110px')}
                        <th style={{ padding: '12px 14px', textAlign: 'center', width: '90px', minWidth: '80px', whiteSpace: 'nowrap' }}>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedHistoryAttempts.map((row, idx) => {
                        const rowKey = row.id || idx;
                        const isExpanded = !!expandedHistoryRows[rowKey];

                        return (
                          <React.Fragment key={rowKey}>
                            <tr style={{
                              borderBottom: isExpanded ? 'none' : '1px solid #F1F5F9',
                              background: isExpanded ? '#F8FAFC' : (idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'),
                              transition: 'background 0.15s ease'
                            }}>
                              {/* Date */}
                              <td style={{ padding: '12px 14px', color: '#64748B', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                                {row.date || (row.createdAt ? new Date(row.createdAt).toISOString().split('T')[0] : 'N/A')}
                              </td>

                              {/* Participant */}
                              <td style={{ padding: '12px 14px', minWidth: '200px' }}>
                                <div
                                  style={{
                                    minWidth: 0,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                  title={`${row.name}${row.employeeId && row.employeeId !== 'N/A' ? ` (${row.employeeId})` : ''}`}
                                >
                                  <span style={{ fontWeight: 700, color: '#0F172A' }}>{row.name}</span>
                                  {row.employeeId && row.employeeId !== 'N/A' && (
                                    <span style={{ fontSize: '0.74rem', color: '#64748B', marginLeft: '6px', fontFamily: 'monospace', fontWeight: 500 }}>
                                      ({row.employeeId})
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Zone */}
                              <td style={{ padding: '10px 12px', color: '#475569' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  background: '#F1F5F9',
                                  fontSize: '0.8rem',
                                  fontWeight: 600
                                }}>
                                  {row.zone}
                                </span>
                              </td>

                              {/* Quiz Title (Readable Identifier) */}
                              <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0F172A' }}>
                                {row.quizTitle}
                              </td>

                              {/* Questions */}
                              <td style={{ padding: '10px 12px', textAlign: 'center', color: '#475569' }}>
                                {row.answeredCount} / {row.questionsCount}
                              </td>

                              {/* Score */}
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '3px 8px', borderRadius: '6px',
                                  background: row.rawPercentage >= 70 ? '#ECFDF5' : (row.rawPercentage !== null ? '#FEF2F2' : '#F1F5F9'),
                                  color: row.rawPercentage >= 70 ? '#059669' : (row.rawPercentage !== null ? '#DC2626' : '#64748B'),
                                  fontWeight: 700, fontSize: '0.82rem'
                                }}>
                                  {row.quizPercentage}
                                </span>
                              </td>

                              {/* Points */}
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#FF6B35' }}>
                                {row.arenaPoints} pts
                              </td>

                              {/* Status */}
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '3px 8px', borderRadius: '12px',
                                  background: row.status === 'Completed' ? '#ECFDF5' : '#FFFBEB',
                                  color: row.status === 'Completed' ? '#059669' : '#D97706',
                                  fontSize: '0.72rem', fontWeight: 700
                                }}>
                                  {row.status}
                                </span>
                              </td>

                              {/* Details button */}
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <button
                                  onClick={() => toggleHistoryRow(rowKey)}
                                  style={{
                                    background: '#F1F5F9',
                                    color: '#475569',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {isExpanded ? 'Hide' : 'Info'}
                                </button>
                              </td>
                            </tr>

                            {/* Expandable History Details */}
                            {isExpanded && (
                              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                                <td colSpan={9} style={{ padding: '12px 20px' }}>
                                  <div style={{
                                    background: '#FFFFFF',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '10px',
                                    padding: '12px 16px',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '16px',
                                    fontSize: '0.82rem'
                                  }}>
                                    <div>
                                      <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Employee ID</span>
                                      <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{row.employeeId || 'N/A'}</span>
                                    </div>
                                    <div>
                                      <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Correct Answers</span>
                                      <span style={{ fontWeight: 700, color: '#10B981' }}>{row.correctCount} of {row.questionsCount}</span>
                                    </div>
                                    <div>
                                      <span style={{ color: '#94A3B8', display: 'block', fontSize: '0.70rem', textTransform: 'uppercase', fontWeight: 700 }}>Technical Session ID</span>
                                      <span style={{ color: '#64748B', fontFamily: 'monospace', fontSize: '0.75rem' }}>{row.sessionId || row.sessionName || 'N/A'}</span>
                                    </div>
                                    <div>
                                      <button
                                        onClick={() => handleDrilldownToHistory(row)}
                                        style={{
                                          marginTop: '10px',
                                          background: '#EFF6FF',
                                          color: '#2563EB',
                                          border: '1px solid #BFDBFE',
                                          borderRadius: '6px',
                                          padding: '4px 10px',
                                          fontSize: '0.75rem',
                                          fontWeight: 700,
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Filter strictly to {row.name}
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {renderPagination(filteredHistoryAttempts.length, historyPage, historyPageSize, setHistoryPage, setHistoryPageSize, 'attempts')}
            </div>
          )}

          {/* Sub-Tab 2: Participant Development Summary */}
          {historySubTab === 'participants' && (
            <div>
              <div style={{ padding: '14px 24px', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.82rem' }}>
                Cumulative participant progression overview across all attempted topics in {selectedProjectName}.
              </div>

              {participantHistoryList.length === 0 ? (
                <div style={{ padding: '48px 16px', textAlign: 'center', color: '#94A3B8', fontSize: '0.9rem' }}>
                  No participant history records available.
                </div>
              ) : (
                <div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#475569', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <th style={{ padding: '10px 12px' }}>Participant Name</th>
                        <th style={{ padding: '10px 12px' }}>Employee ID</th>
                        <th style={{ padding: '10px 12px' }}>Zone / Store</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>Distinct Quizzes Attempted</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>Completed Attempts</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Cumulative Arena Points</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>Overall Avg Score</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>Latest Quiz Date</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>Timeline</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedParticipantHistory.map((p, idx) => (
                        <tr key={p.userId || p.employeeId || idx} style={{
                          borderBottom: '1px solid #F1F5F9',
                          background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
                        }}>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0F172A' }}>
                            {p.name}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#64748B', fontFamily: 'monospace' }}>
                            {p.employeeId}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#475569' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#F1F5F9', fontSize: '0.8rem', fontWeight: 600 }}>
                              {p.zone}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#0F172A' }}>
                            {p.distinctQuizzesAttempted || 1} {p.distinctQuizzesAttempted === 1 ? 'topic' : 'topics'}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: p.quizzesCompleted > 0 ? '#ECFDF5' : '#F1F5F9',
                              color: p.quizzesCompleted > 0 ? '#059669' : '#64748B',
                              fontWeight: 700,
                              fontSize: '0.8rem'
                            }}>
                              {p.quizzesCompleted} of {p.totalAttempts}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#FF6B35' }}>
                            {p.cumulativeArenaPoints.toLocaleString()} pts
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{
                              padding: '3px 8px', borderRadius: '6px',
                              background: p.rawPercentage >= 70 ? '#ECFDF5' : (p.rawPercentage >= 0 ? '#FEF2F2' : '#F1F5F9'),
                              color: p.rawPercentage >= 70 ? '#059669' : (p.rawPercentage >= 0 ? '#DC2626' : '#64748B'),
                              fontWeight: 700, fontSize: '0.82rem'
                            }}>
                              {p.overallAccuracy}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748B', fontSize: '0.8rem' }}>
                            {p.lastQuizDate || 'N/A'}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <button
                              onClick={() => handleDrilldownToHistory(p)}
                              style={{
                                background: '#EFF6FF',
                                color: '#2563EB',
                                border: '1px solid #BFDBFE',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Inspect full timeline of attempts for this participant"
                            >
                              <span>View Log</span>
                              <ChevronRight size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {renderPagination(participantHistoryList.length, historySummaryPage, historySummaryPageSize, setHistorySummaryPage, setHistorySummaryPageSize, 'participants')}
            </div>
          )}
        </div>
      )}

      {/* ── VIEW D: BADGES & CRITERIA TAB ── */}
      {(isEmployee || activeTab === 'badges') && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          padding: '24px 28px',
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {badges.map(b => (
              <div key={b.id} style={{
                padding: '18px',
                borderRadius: '14px',
                background: b.unlocked ? `${b.color}0A` : '#F8FAFC',
                border: `1.5px solid ${b.unlocked ? b.color + '40' : '#E2E8F0'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                opacity: b.unlocked ? 1 : 0.7,
                transition: 'all 0.2s ease',
                boxShadow: b.unlocked ? `0 2px 8px ${b.color}15` : 'none'
              }}>
                <div style={{
                  width: '50px', height: '50px', borderRadius: '12px',
                  background: b.unlocked ? `${b.color}15` : '#E2E8F0',
                  border: `2px solid ${b.unlocked ? b.color + '40' : '#CBD5E1'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem', flexShrink: 0
                }}>
                  {b.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: b.unlocked ? '#0F172A' : '#475569', marginBottom: '3px' }}>
                    {b.label}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', lineHeight: 1.4 }}>
                    {b.desc}
                  </div>
                  <div style={{ marginTop: '6px' }}>
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

      {/* ── Team Performance by Zone / Store (Shown on Summary Tab) ── */}
      {!isEmployee && activeTab === 'summary' && zoneBreakdown.length > 0 && (() => {
        // Distinguish regional territory aggregates (e.g. West, East, North, South, Central or multi-learner groups >= 4) from specific retail stores/outlets
        const isRegionalZone = (zoneName) => {
          const norm = (zoneName || '').trim().toLowerCase();
          return ['west', 'east', 'north', 'south', 'central', 'northeast', 'northwest', 'southeast', 'southwest'].includes(norm);
        };

        const regionalZones = zoneBreakdown.filter(z => isRegionalZone(z.zone) || z.participantCount >= 4);
        const storeOutlets = zoneBreakdown.filter(z => !regionalZones.includes(z));

        const renderZoneCard = (z, idx, isRegional = false) => (
          <div
            key={`${z.zone}_${idx}`}
            style={{
              padding: isRegional ? '20px 22px' : '16px 18px',
              borderRadius: '12px',
              background: isRegional ? '#FFFFFF' : '#F8FAFC',
              border: isRegional ? '1.5px solid #CBD5E1' : '1px solid #E2E8F0',
              boxShadow: isRegional ? '0 2px 5px rgba(15, 23, 42, 0.05)' : 'none',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
              transition: 'all 0.15s ease',
              position: 'relative'
            }}
          >
            {/* Header: Name + Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <div style={{
                  width: isRegional ? '32px' : '28px',
                  height: isRegional ? '32px' : '28px',
                  borderRadius: '8px',
                  background: isRegional ? '#EFF6FF' : '#F1F5F9',
                  color: isRegional ? '#2563EB' : '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {isRegional ? <Globe size={isRegional ? 18 : 15} /> : <MapPin size={15} />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: isRegional ? '1.02rem' : '0.92rem',
                      color: '#0F172A',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                    title={z.zone}
                  >
                    {z.zone}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>
                    {isRegional ? 'Regional Territory' : 'Store / Location Outlet'}
                  </div>
                </div>
              </div>
              <span style={{
                padding: '3px 8px',
                borderRadius: '6px',
                background: isRegional ? '#EFF6FF' : '#E2E8F0',
                color: isRegional ? '#2563EB' : '#475569',
                fontSize: '0.72rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}>
                {z.participantCount} {z.participantCount === 1 ? 'Learner' : 'Learners'}
              </span>
            </div>

            {/* Metrics Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                <span style={{ color: '#64748B' }}>Completed Quizzes:</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{z.quizzesCompleted}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                <span style={{ color: '#64748B' }}>Average Score:</span>
                <span style={{
                  fontWeight: 700,
                  color: z.avgScore !== 'N/A' ? '#059669' : '#94A3B8',
                  background: z.avgScore !== 'N/A' ? '#ECFDF5' : 'transparent',
                  padding: z.avgScore !== 'N/A' ? '2px 6px' : '0',
                  borderRadius: '4px'
                }}>
                  {z.avgScore}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.82rem',
                borderTop: '1px dashed #E2E8F0',
                paddingTop: '8px',
                marginTop: '2px'
              }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Arena Points:</span>
                <span style={{ fontWeight: 800, color: '#FF6B35', fontSize: '0.95rem' }}>
                  {z.totalArenaPoints.toLocaleString()} pts
                </span>
              </div>
            </div>
          </div>
        );

        return (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '24px 28px',
            marginTop: '24px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, margin: '0 0 4px 0', fontSize: '1.18rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={20} color="#2563EB" />
                  Team Performance by Zone / Store
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B' }}>
                  Performance aggregated by registered participant store or territory.
                </p>
              </div>
            </div>

            {/* Tier 1: Regional Territories */}
            {regionalZones.length > 0 && (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '14px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #F1F5F9'
                }}>
                  <Globe size={16} color="#2563EB" />
                  <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Regional Territories ({regionalZones.length})
                  </span>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
                  gap: '16px'
                }}>
                  {regionalZones.map((z, idx) => renderZoneCard(z, idx, true))}
                </div>
              </div>
            )}

            {/* Tier 2: Specific Stores & Outlets */}
            {storeOutlets.length > 0 && (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '14px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #F1F5F9'
                }}>
                  <Building2 size={16} color="#64748B" />
                  <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Individual Stores & Outlets ({storeOutlets.length})
                  </span>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
                  gap: '16px'
                }}>
                  {storeOutlets.map((z, idx) => renderZoneCard(z, idx, false))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

    </div>
  );
}
