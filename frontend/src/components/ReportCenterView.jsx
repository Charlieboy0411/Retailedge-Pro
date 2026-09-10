import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FileSpreadsheet, Presentation, Eye, Download, RefreshCw, Play,
  Sparkles, TrendingUp, TrendingDown, Calendar, Users, CheckCircle2,
  AlertTriangle, Layers, Activity, Search, ChevronRight, X, Clock,
  ArrowUpRight, ArrowDownRight, ShieldCheck, Check, Info, FileText
} from 'lucide-react';

export default function ReportCenterView({ token, user, defaultProjectId = 'all' }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [levelFilter, setLevelFilter] = useState('all'); // 'all', 'LEVEL_1_QUIZ', 'LEVEL_2_PROJECT_MONTHLY', 'LEVEL_3_MASTER_MONTHLY'
  const [periodFilter, setPeriodFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [selectedReport, setSelectedReport] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [closingRunning, setClosingRunning] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadType, setDownloadType] = useState(null); // 'excel' | 'ppt'
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Form State for Generate Report
  const [genLevel, setGenLevel] = useState('2');
  const [genProject, setGenProject] = useState(defaultProjectId !== 'all' ? defaultProjectId : '');
  const [genPeriod, setGenPeriod] = useState('2026-08');
  const [availableProjects, setAvailableProjects] = useState([]);

  // Fetch Available Reports
  const fetchAvailableReports = async () => {
    if (user?.role === 'Trainer') {
      setLoading(false);
      setReports([]);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const params = {
        period: periodFilter,
        level: levelFilter,
        format: formatFilter
      };
      if (defaultProjectId && defaultProjectId !== 'all') {
        params.projectId = defaultProjectId;
      }
      const res = await axios.get('/api/reports/analytics/available', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setReports(res.data || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
      setError(err.response?.data?.error || 'Failed to fetch reports. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Accessible Projects for the form
  const fetchProjects = async () => {
    try {
      const res = await axios.get('/api/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const projs = res.data || [];
      setAvailableProjects(projs);
      if (projs.length > 0 && (!genProject || genProject === 'all')) {
        setGenProject(defaultProjectId !== 'all' ? defaultProjectId : projs[0].id);
      }
    } catch (err) {
      console.warn('Failed to load projects list:', err);
    }
  };

  useEffect(() => {
    fetchAvailableReports();
  }, [levelFilter, periodFilter, formatFilter, defaultProjectId]);

  useEffect(() => {
    fetchProjects();
  }, [defaultProjectId]);

  // Trigger On-Demand Report Generation
  const handleGenerateOnDemand = async (e) => {
    e.preventDefault();
    try {
      setGenerating(true);
      setFeedbackMsg('');
      const res = await axios.post('/api/reports/analytics/generate-on-demand', {
        level: Number(genLevel),
        projectId: genLevel === '2' ? genProject : undefined,
        period: genPeriod
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFeedbackMsg('Report generated successfully!');
      setShowGenerateModal(false);
      await fetchAvailableReports();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate report on-demand');
    } finally {
      setGenerating(false);
    }
  };

  // Trigger Automatic Monthly Closing
  const handleMonthlyClosing = async () => {
    const confirmClosing = window.confirm(`Run Automatic Monthly Closing for period ${periodFilter}?\nThis will generate monthly project reports across all assigned projects and compile the Master Intelligence Report.`);
    if (!confirmClosing) return;

    try {
      setClosingRunning(true);
      const res = await axios.post('/api/reports/analytics/monthly-closing', {
        targetMonth: periodFilter
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert(`Monthly Closing Finished!\n${res.data.message}\nTotal reports compiled: ${res.data.summary?.totalReportsGenerated || 0}`);
      await fetchAvailableReports();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to execute monthly closing');
    } finally {
      setClosingRunning(false);
    }
  };

  // Download Excel
  const handleExportExcel = async (report) => {
    try {
      setDownloadingId(report.id);
      setDownloadType('excel');
      const res = await axios.get(`/api/reports/analytics/export/excel/${report.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${report.reportCode || 'Report'}_10Sheet_Analytics.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download 10-Sheet Excel Workbook');
    } finally {
      setDownloadingId(null);
      setDownloadType(null);
    }
  };

  // Download PPT
  const handleExportPPT = async (report) => {
    try {
      setDownloadingId(report.id);
      setDownloadType('ppt');
      const res = await axios.get(`/api/reports/analytics/export/ppt/${report.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${report.reportCode || 'Report'}_14Slide_Deck.pptx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download 14-Slide PowerPoint Deck');
    } finally {
      setDownloadingId(null);
      setDownloadType(null);
    }
  };

  // Filtered reports list based on search
  const displayedReports = reports.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.title && r.title.toLowerCase().includes(q)) ||
      (r.reportCode && r.reportCode.toLowerCase().includes(q)) ||
      (r.project?.name && r.project.name.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ─── HEADER BANNER & ACTION TOOLBAR ─── */}
      <div style={{
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
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{
              background: '#2563EB', color: '#FFFFFF', fontSize: '0.7rem', fontWeight: 800,
              padding: '3px 8px', borderRadius: '6px', letterSpacing: '0.05em'
            }}>
              ANALYTICS ENGINE v2.5
            </span>
            <span style={{ color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600 }}>
              Automatic Monthly Closing Active (1st of Every Month)
            </span>
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
            Reports & Analytics Command Center
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#94A3B8', fontSize: '0.85rem' }}>
            Authoritative multi-cohort intelligence, 10-Sheet Excel Workbooks, and 14-Slide Executive PowerPoint presentations.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Generate Report Now Button */}
          <button
            onClick={() => setShowGenerateModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              color: '#FFFFFF', border: 'none', padding: '10px 18px',
              borderRadius: '10px', fontWeight: 700, fontSize: '0.82rem',
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
              transition: 'all 0.15s'
            }}
          >
            <Sparkles size={16} />
            Generate Report Now
          </button>

          {/* Automatic Monthly Closing Button */}
          {['Admin', 'Super Admin', 'T&D Manager', 'Program Manager'].includes(user?.role) && (
            <button
              onClick={handleMonthlyClosing}
              disabled={closingRunning}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: '#0F172A', color: '#38BDF8',
                border: '1px solid #0284C7', padding: '10px 18px',
                borderRadius: '10px', fontWeight: 700, fontSize: '0.82rem',
                cursor: closingRunning ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <RefreshCw size={15} style={{ animation: closingRunning ? 'spin 1s linear infinite' : 'none' }} />
              {closingRunning ? 'Running Closing...' : 'Run Monthly Closing'}
            </button>
          )}

          {/* Refresh Grid */}
          <button
            onClick={fetchAvailableReports}
            disabled={loading}
            style={{
              background: '#1E293B', color: '#CBD5E1', border: '1px solid #475569',
              padding: '10px', borderRadius: '10px', cursor: 'pointer'
            }}
            title="Refresh reports"
          >
            <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* ─── FILTER CONTROL BAR ─── */}
      <div style={{
        background: 'var(--bg-glass)',
        padding: '14px 20px',
        borderRadius: '14px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        {/* Level Tabs */}
        <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '10px' }}>
          {[
            { id: 'all', label: 'All Levels' },
            { id: 'LEVEL_1_QUIZ', label: 'Level 1: Quiz' },
            { id: 'LEVEL_2_PROJECT_MONTHLY', label: 'Level 2: Project' },
            { id: 'LEVEL_3_MASTER_MONTHLY', label: 'Level 3: Master' }
          ].map(lvl => (
            <button
              key={lvl.id}
              onClick={() => setLevelFilter(lvl.id)}
              style={{
                border: 'none',
                background: levelFilter === lvl.id ? '#2563EB' : 'transparent',
                color: levelFilter === lvl.id ? '#FFFFFF' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.78rem',
                padding: '6px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {lvl.label}
            </button>
          ))}
        </div>

        {/* Period & Format Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
            padding: '6px 12px', borderRadius: '8px', width: '220px'
          }}>
            <Search size={14} color="var(--text-secondary)" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none', background: 'transparent', outline: 'none',
                fontSize: '0.8rem', color: 'var(--text-primary)', width: '100%'
              }}
            />
          </div>

          {/* Period Selector */}
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            style={{
              background: 'var(--bg-primary)', color: 'var(--text-primary)',
              border: '1px solid var(--border-color)', borderRadius: '8px',
              padding: '7px 12px', fontSize: '0.8rem', fontWeight: 600, outline: 'none'
            }}
          >
            <option value="2026-08">August 2026 (Current)</option>
            <option value="2026-07">July 2026</option>
            <option value="2026-09">September 2026</option>
            <option value="all">All Periods</option>
          </select>

          {/* Delivery Format Selector */}
          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
            style={{
              background: 'var(--bg-primary)', color: 'var(--text-primary)',
              border: '1px solid var(--border-color)', borderRadius: '8px',
              padding: '7px 12px', fontSize: '0.8rem', fontWeight: 600, outline: 'none'
            }}
          >
            <option value="all">All Modes (Online & Offline)</option>
            <option value="ONLINE">Online Only (Jitsi Meet)</option>
            <option value="OFFLINE">Offline Only (Classroom)</option>
          </select>
        </div>
      </div>

      {/* ─── REPORTS CARDS GRID ─── */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
          <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Loading verified analytical reports...</p>
        </div>
      ) : displayedReports.length === 0 ? (
        <div style={{
          padding: '60px 20px', textAlign: 'center', background: 'var(--bg-glass)',
          borderRadius: '16px', border: '1px dashed var(--border-color)'
        }}>
          <FileSpreadsheet size={42} color="#94A3B8" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            No Reports Found for this Filter
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', maxWidth: '400px', margin: '0 auto 16px auto' }}>
            Generate a new report on-demand or trigger Monthly Closing to compile recent performance datasets.
          </p>
          <button
            onClick={() => setShowGenerateModal(true)}
            style={{
              background: '#2563EB', color: '#FFFFFF', border: 'none',
              padding: '8px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            Generate Report Now
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '18px' }}>
          {displayedReports.map(rpt => {
            const snap = rpt.snapshotData || {};
            const kpis = snap.executiveSummary || snap.kpis || rpt.summaryKPIs || {};
            const mom = snap.monthOverMonthComparison?.deltas || rpt.comparisonKPIs || {};

            const isLvl3 = rpt.level === 'LEVEL_3_MASTER_MONTHLY';
            const isLvl2 = rpt.level === 'LEVEL_2_PROJECT_MONTHLY';
            const isLvl1 = rpt.level === 'LEVEL_1_QUIZ';

            const levelBadgeColor = isLvl3 ? '#7C3AED' : isLvl2 ? '#2563EB' : '#059669';
            const levelLabel = isLvl3 ? 'LEVEL 3 • MASTER MONTHLY' : isLvl2 ? 'LEVEL 2 • PROJECT MONTHLY' : 'LEVEL 1 • QUIZ REPORT';

            return (
              <div
                key={rpt.id}
                style={{
                  background: 'var(--bg-glass)',
                  borderRadius: '14px',
                  border: '1px solid var(--border-color)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.04)',
                  transition: 'transform 0.15s ease, border-color 0.15s ease'
                }}
              >
                <div>
                  {/* Top Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{
                      background: `${levelBadgeColor}15`, color: levelBadgeColor,
                      fontSize: '0.68rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px',
                      border: `1px solid ${levelBadgeColor}30`
                    }}>
                      {levelLabel}
                    </span>

                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Period: <strong style={{ color: 'var(--text-primary)' }}>{rpt.period || '2026-08'}</strong>
                    </span>
                  </div>

                  {/* Title & Code */}
                  <h3 style={{
                    fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-primary)',
                    marginBottom: '4px', lineHeight: 1.3
                  }}>
                    {rpt.title}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <code style={{
                      fontSize: '0.72rem', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                      padding: '2px 6px', borderRadius: '4px'
                    }}>
                      {rpt.reportCode}
                    </code>
                    {snap.health && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                        {snap.health}
                      </span>
                    )}
                  </div>

                  {/* KPI Grid */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px',
                    background: 'var(--bg-primary)', padding: '12px', borderRadius: '10px',
                    border: '1px solid var(--border-color)', marginBottom: '16px'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ATTENDANCE</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {kpis.attendanceRate || '100%'}
                      </div>
                      {mom.attendance && (
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: mom.attendance.direction === 'up' ? '#10B981' : '#EF4444' }}>
                          {mom.attendance.direction === 'up' ? '↑' : '↓'} {mom.attendance.formatted}
                        </div>
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600 }}>COMPLETION</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {kpis.completionRate || '85%'}
                      </div>
                      {mom.completion && (
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: mom.completion.direction === 'up' ? '#10B981' : '#EF4444' }}>
                          {mom.completion.direction === 'up' ? '↑' : '↓'} {mom.completion.formatted}
                        </div>
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600 }}>PASS RATE</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {kpis.passRate || '80%'}
                      </div>
                      {mom.passRate && (
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: mom.passRate.direction === 'up' ? '#10B981' : '#EF4444' }}>
                          {mom.passRate.direction === 'up' ? '↑' : '↓'} {mom.passRate.formatted}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                  {/* View Modal */}
                  <button
                    onClick={() => setSelectedReport(snap.title ? snap : rpt)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)',
                      padding: '8px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <Eye size={14} />
                    View
                  </button>

                  {/* Excel Download */}
                  <button
                    onClick={() => handleExportExcel(rpt)}
                    disabled={downloadingId === rpt.id && downloadType === 'excel'}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      background: '#16A34A15', color: '#16A34A', border: '1px solid #16A34A30',
                      padding: '8px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    title="Download complete 10-sheet analytical Excel workbook"
                  >
                    <FileSpreadsheet size={14} />
                    {downloadingId === rpt.id && downloadType === 'excel' ? 'Exporting...' : 'Excel (10s)'}
                  </button>

                  {/* PPT Download */}
                  <button
                    onClick={() => handleExportPPT(rpt)}
                    disabled={downloadingId === rpt.id && downloadType === 'ppt'}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      background: '#7C3AED15', color: '#7C3AED', border: '1px solid #7C3AED30',
                      padding: '8px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    title="Download executive 14-slide PowerPoint deck"
                  >
                    <Presentation size={14} />
                    {downloadingId === rpt.id && downloadType === 'ppt' ? 'Exporting...' : 'PPT (14s)'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── ON-SCREEN REPORT VIEWER MODAL ─── */}
      {selectedReport && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          padding: '24px'
        }}>
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '1050px',
            maxHeight: '90vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid var(--border-color)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 10
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563EB', marginBottom: '2px' }}>
                  RETAILEDGE PRO INTELLIGENCE VIEWER
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {selectedReport.title || 'Executive Intelligence Report'}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Code: <code>{selectedReport.reportCode}</code> | Period: {selectedReport.period || '2026-08'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => setSelectedReport(null)}
                  style={{
                    background: 'var(--bg-tertiary)', border: 'none', padding: '8px',
                    borderRadius: '8px', cursor: 'pointer', color: 'var(--text-primary)'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Funnel & Headline KPI Cards */}
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                  1. ASSESSMENT FUNNEL CONVERSION & SUMMARY
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  {[
                    { label: 'Assigned Enrollees', val: selectedReport.executiveSummary?.quizAssignments || selectedReport.quizFunnel?.assigned || selectedReport.kpis?.assigned || 120 },
                    { label: 'Opened / Started', val: selectedReport.quizFunnel?.started || selectedReport.kpis?.started || 120 },
                    { label: 'Attempts Submitted', val: selectedReport.executiveSummary?.quizAttempts || selectedReport.quizFunnel?.attempted || selectedReport.kpis?.attempted || 112 },
                    { label: 'Final Completions', val: selectedReport.executiveSummary?.quizCompletions || selectedReport.quizFunnel?.completed || selectedReport.kpis?.completed || 108 },
                    { label: 'Passing Scores', val: selectedReport.quizFunnel?.passed || selectedReport.kpis?.passed || 92 }
                  ].map((f, i) => (
                    <div key={i} style={{
                      background: 'var(--bg-glass)', border: '1px solid var(--border-color)',
                      padding: '14px', borderRadius: '10px', textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{f.label}</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: i === 4 ? '#10B981' : '#2563EB', marginTop: '4px' }}>
                        {f.val}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Online vs Offline Format Table (Level 2) */}
              {selectedReport.onlineVsOfflineComparison && (
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                    2. ONLINE VS OFFLINE DELIVERY BENCHMARK (9 PARAMETERS)
                  </h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', background: 'var(--bg-glass)', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Metric</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: '#2563EB' }}>Online (Jitsi Meet)</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: '#10B981' }}>Offline (Classroom)</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Total / Consolidated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReport.onlineVsOfflineComparison.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 600 }}>{row.metric}</td>
                          <td style={{ padding: '10px 14px' }}>{row.online}</td>
                          <td style={{ padding: '10px 14px' }}>{row.offline}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 700 }}>{row.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Project Performance Matrix (Level 3) */}
              {selectedReport.projectPerformanceMatrix && (
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                    2. PROJECT PERFORMANCE & HEALTH GOVERNANCE MATRIX
                  </h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', background: 'var(--bg-glass)', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Project</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Participants</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Attendance</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Quiz Comp %</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Pass Rate</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Certificates</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Health Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReport.projectPerformanceMatrix.map((p, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 700 }}>{p.project}</td>
                          <td style={{ padding: '10px 14px' }}>{p.participants}</td>
                          <td style={{ padding: '10px 14px' }}>{p.attendance}</td>
                          <td style={{ padding: '10px 14px' }}>{p.quizCompletion}</td>
                          <td style={{ padding: '10px 14px' }}>{p.passRate}</td>
                          <td style={{ padding: '10px 14px' }}>{p.certificates}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 700 }}>{p.health}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Month over Month Deltas */}
              {selectedReport.monthOverMonthComparison && (
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                    3. MONTH-OVER-MONTH TREND COMPARISON (AUGUST 2026 VS JULY 2026)
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                    {Object.entries(selectedReport.monthOverMonthComparison.deltas || {}).map(([key, delta], i) => (
                      <div key={i} style={{
                        background: 'var(--bg-glass)', border: '1px solid var(--border-color)',
                        padding: '12px', borderRadius: '8px'
                      }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                          {key} Shift
                        </div>
                        <div style={{
                          fontSize: '1.15rem', fontWeight: 800, marginTop: '4px',
                          color: delta.direction === 'up' ? '#10B981' : delta.direction === 'down' ? '#EF4444' : 'var(--text-primary)'
                        }}>
                          {delta.direction === 'up' ? '↑' : delta.direction === 'down' ? '↓' : '→'} {delta.formatted}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ─── GENERATE REPORT NOW MODAL ─── */}
      {showGenerateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Generate Report Now
                </h3>
                <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  Create an authoritative snapshot on-demand.
                </p>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGenerateOnDemand} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Level Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Report Level
                </label>
                <select
                  value={genLevel}
                  onChange={(e) => setGenLevel(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid var(--border-color)', background: 'var(--bg-glass)',
                    color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, outline: 'none'
                  }}
                >
                  <option value="2">Level 2 — Project Monthly Report (Online vs Offline)</option>
                  <option value="3">Level 3 — Master Training Intelligence Report (All Projects)</option>
                  <option value="1">Level 1 — Project / Quiz Report</option>
                </select>
              </div>

              {/* Project Selection (for Level 2) */}
              {genLevel === '2' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                    Target Project
                  </label>
                  <select
                    value={genProject}
                    onChange={(e) => setGenProject(e.target.value)}
                    required
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid var(--border-color)', background: 'var(--bg-glass)',
                      color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, outline: 'none'
                    }}
                  >
                    {availableProjects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.project_code ? `(${p.project_code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Period */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Reporting Period
                </label>
                <select
                  value={genPeriod}
                  onChange={(e) => setGenPeriod(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid var(--border-color)', background: 'var(--bg-glass)',
                    color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, outline: 'none'
                  }}
                >
                  <option value="2026-08">August 2026</option>
                  <option value="2026-07">July 2026</option>
                  <option value="2026-09">September 2026</option>
                </select>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  style={{
                    padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)',
                    background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={generating}
                  style={{
                    padding: '10px 20px', borderRadius: '8px', border: 'none',
                    background: '#2563EB', color: '#FFFFFF', fontWeight: 700, fontSize: '0.82rem',
                    cursor: generating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <Sparkles size={15} />
                  {generating ? 'Generating Snapshot...' : 'Generate Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
