import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, BarChart2, Award, Calendar, MapPin, CheckCircle, Clock, 
  TrendingUp, AlertCircle, FileText, Presentation, Download, 
  ArrowRight, ShieldAlert, BookOpen, Star, HelpCircle, AlertTriangle,
  Search, Bell, ChevronDown, Check, X, Shield, Lock, FileSpreadsheet,
  TrendingDown, Settings, Heart, Sparkles
} from 'lucide-react';

export default function ClientDashboard({
  projectUsers = [],
  projectsList = [],
  reports = [],
  attendanceData = {},
  onExportExcel,
  onExportPPT,
  manualMetrics = {},
  selectedProjectId = 'all',
  myProjectId = null
}) {
  // Navigation states
  const [dateFilter, setDateFilter] = useState('Last 30 Days'); // 'Last 7 Days' | 'Last 30 Days' | 'Quarterly' | 'Custom'
  const [dateRange, setDateRange] = useState('06 May 2026 - 05 Jun 2026');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReportTemplate, setSelectedReportTemplate] = useState('monthly'); // 'monthly' | 'quarterly' | 'compliance' | 'board'
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [showRoleAlert, setShowRoleAlert] = useState(false);
  const [trendTimeline, setTrendTimeline] = useState('Monthly'); // 'Weekly' | 'Monthly' | 'Quarterly'

  // Notification Feed Simulation
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Certification target achieved (88% coverage)', type: 'success' },
    { id: 2, text: 'Compliance Alert: East region compliance drops below 60%', type: 'critical' },
    { id: 3, text: 'New monthly audit review PDF report ready for download', type: 'info' }
  ]);

  // Date range selectors mapping
  const handleDateFilterChange = (filterType) => {
    setDateFilter(filterType);
    if (filterType === 'Last 7 Days') {
      setDateRange('30 May 2026 - 05 Jun 2026');
    } else if (filterType === 'Last 30 Days') {
      setDateRange('06 May 2026 - 05 Jun 2026');
    } else if (filterType === 'Quarterly') {
      setDateRange('01 Apr 2026 - 05 Jun 2026');
    } else if (filterType === 'Custom') {
      const start = prompt("Enter Start Date (e.g. 01 May 2026):", "01 May 2026");
      const end = prompt("Enter End Date (e.g. 15 May 2026):", "15 May 2026");
      if (start && end) setDateRange(`${start} - ${end}`);
    }
  };

  // Mock template presentations slide preview deck
  const slidePreviews = [
    { title: "Executive Summary", description: "Strategic overview of workforce capability and program status" },
    { title: "Workforce Funnel", description: "Assigned -> Active -> Trained -> Certified -> Ready flow rate" },
    { title: "Regional Heatmap", description: "Geographical capability index by state and retail location" },
    { title: "Learning Trends", description: "Knowledge growth metrics vs assessment completion timelines" },
    { title: "Interventions Plan", description: "Recommended training paths for at-risk employees" }
  ];

  const getActiveClientName = () => {
    if (selectedProjectId && selectedProjectId !== 'all') {
      const found = projectsList.find(p => p.id === selectedProjectId);
      if (found) {
        if (found.parentId) {
          const parent = projectsList.find(p => p.id === found.parentId);
          if (parent) return parent.name;
        }
        return found.name;
      }
    }
    const motherProj = projectsList.find(p => p.parentId === null);
    return motherProj ? motherProj.name : 'Sun Pharma';
  };

  const getActiveProjectName = () => {
    if (selectedProjectId && selectedProjectId !== 'all') {
      const found = projectsList.find(p => p.id === selectedProjectId);
      if (found) return found.name;
    }
    const motherProj = projectsList.find(p => p.id === myProjectId || p.parentId === null);
    return motherProj ? motherProj.name : 'Project Alpha';
  };

  // Real numbers supplemented with PRD guidelines when database counts are sparse
  const totalAssigned = projectUsers.length > 0 ? projectUsers.length : 500;
  const activeLearners = projectUsers.length > 0 ? projectUsers.filter(u => u.status === 'Active').length : 450;
  
  const quizAttendance = attendanceData?.quizAttendance || [];
  const completedSessions = reports.filter(r => r.participants > 0);
  
  // Real average quiz score / Training Completion %
  const avgQuizScore = completedSessions.length > 0 
    ? Math.round(completedSessions.reduce((sum, r) => sum + parseFloat(r.avgScore || 0), 0) / completedSessions.length)
    : 84;
  
  const trainedCount = projectUsers.length > 0 ? Math.round(projectUsers.length * (avgQuizScore / 100)) : 420;
  const certifiedCount = projectUsers.length > 0 ? Math.round(projectUsers.length * ((avgQuizScore - 3) / 100)) : 390;
  const readyCount = projectUsers.length > 0 ? Math.round(projectUsers.length * ((avgQuizScore - 5) / 100)) : 375;

  const learningCompletionRate = avgQuizScore;
  const certificationRate = Math.round(avgQuizScore * 0.95);
  const complianceRate = Math.min(100, Math.round(avgQuizScore * 1.02));
  const readinessPercent = Math.round((readyCount / totalAssigned) * 100);

  const engagementIndex = '4.7 / 5';
  const projectHealthScore = Math.round(avgQuizScore * 1.05) > 100 ? 98 : Math.round(avgQuizScore * 1.05);

  // Derived location-wise regional stats
  const getLocationStats = () => {
    const stats = {
      'North': { completedRate: 0, avgScore: 0, compliance: 0, reps: 0, sumScore: 0, scoreCount: 0 },
      'South': { completedRate: 0, avgScore: 0, compliance: 0, reps: 0, sumScore: 0, scoreCount: 0 },
      'East': { completedRate: 0, avgScore: 0, compliance: 0, reps: 0, sumScore: 0, scoreCount: 0 },
      'West': { completedRate: 0, avgScore: 0, compliance: 0, reps: 0, sumScore: 0, scoreCount: 0 },
      'Central': { completedRate: 0, avgScore: 0, compliance: 0, reps: 0, sumScore: 0, scoreCount: 0 }
    };

    projectUsers.forEach(u => {
      const loc = u.location || '';
      let region = 'North';
      if (loc.toLowerCase().includes('west') || loc.toLowerCase().includes('mumbai')) region = 'West';
      else if (loc.toLowerCase().includes('south') || loc.toLowerCase().includes('bangalore') || loc.toLowerCase().includes('karnataka')) region = 'South';
      else if (loc.toLowerCase().includes('east') || loc.toLowerCase().includes('kolkata')) region = 'East';
      else if (loc.toLowerCase().includes('central')) region = 'Central';
      stats[region].reps += 1;
    });

    const quizAtt = attendanceData?.quizAttendance || [];
    quizAtt.forEach(a => {
      const matched = projectUsers.find(u => u.id === a.userId || u.employee_id === a.employeeId);
      const loc = matched?.location || '';
      let region = 'North';
      if (loc.toLowerCase().includes('west') || loc.toLowerCase().includes('mumbai')) region = 'West';
      else if (loc.toLowerCase().includes('south') || loc.toLowerCase().includes('bangalore') || loc.toLowerCase().includes('karnataka')) region = 'South';
      else if (loc.toLowerCase().includes('east') || loc.toLowerCase().includes('kolkata')) region = 'East';
      else if (loc.toLowerCase().includes('central')) region = 'Central';

      const score = parseFloat(a.avgScore || 0);
      if (score > 0) {
        stats[region].sumScore += score;
        stats[region].scoreCount += 1;
      }
    });

    const results = Object.keys(stats).map(key => {
      const reg = stats[key];
      const hasRealData = reg.reps > 0 || reg.scoreCount > 0;
      
      const defaultVals = {
        'North': { completedRate: 91, avgScore: 91, compliance: 95, reps: 110 },
        'South': { completedRate: 93, avgScore: 93, compliance: 96, reps: 135 },
        'East': { completedRate: 58, avgScore: 72, compliance: 58, reps: 80 },
        'West': { completedRate: 74, avgScore: 78, compliance: 74, reps: 90 },
        'Central': { completedRate: 68, avgScore: 75, compliance: 68, reps: 85 }
      };

      if (!hasRealData) {
        return {
          region: key,
          ...defaultVals[key]
        };
      }

      const calculatedScore = reg.scoreCount > 0 ? Math.round(reg.sumScore / reg.scoreCount) : 80;
      return {
        region: key,
        completedRate: calculatedScore,
        avgScore: calculatedScore,
        compliance: Math.min(100, Math.round(calculatedScore * 1.02)),
        reps: reg.reps
      };
    });

    return results.filter(r => r.region.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const locationRankings = getLocationStats().sort((a, b) => b.avgScore - a.avgScore);

  // Triggering the PPT export through parents
  const triggerPPTDownload = () => {
    if (onExportPPT) {
      onExportPPT('reports');
    } else {
      alert("Generating Executive review slides... Presentation deck download started.");
    }
  };

  // Triggering Excel sheet download
  const triggerExcelDownload = () => {
    if (onExportExcel) {
      onExportExcel('reports');
    } else {
      alert("Compiling report worksheets... Excel sheet download started.");
    }
  };

  return (
    <div style={{ padding: '20px', background: '#F4F5F7', fontFamily: 'Poppins, sans-serif', boxSizing: 'border-box' }}>
      
      {/* Security alert modal when view-only client attempts to modify records */}
      {showRoleAlert && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(7,27,54,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--bg-glass)', padding: '24px', borderRadius: '16px', border: '1.5px solid #EF4444', maxWidth: '440px', boxShadow: '0 20px 40px rgba(7,27,54,0.15)', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: '#EF4444' }}>
              <Lock size={22} />
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: 800, color: '#1F2328' }}>Action Restricted</h3>
            <p style={{ fontSize: '0.8rem', color: '#5F6875', margin: '0 0 20px 0', lineHeight: 1.4 }}>
              As a **Client** role user, you have view-only access. You cannot assign training modules, edit questions, modify database logs, or notify supervisors directly.
            </p>
            <button 
              onClick={() => setShowRoleAlert(false)}
              style={{ padding: '8px 24px', background: '#1F2328', color: 'white', fontWeight: 700, border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem' }}
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* ─── HEADER BAR ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1F2328', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            Client Success Command Center <span style={{ textShadow: '0 0 10px rgba(243,111,33,0.3)' }}>🛡️</span>
          </h1>
          <p style={{ color: '#5F6875', fontSize: '0.85rem', margin: '4px 0 0 0' }}>Workforce readiness, training effectiveness, compliance status and project health.</p>
        </div>

        {/* User Profile display card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-glass)', border: '1px solid #B7BEC7', padding: '6px 14px', borderRadius: '12px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#FFF5F0', border: '1.5px solid #3E5C8A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3E5C8A', fontWeight: 800, fontSize: '0.78rem' }}>
            SC
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1F2328', display: 'block' }}>Demo Client</span>
            <span style={{ fontSize: '0.65rem', color: '#5F6875', display: 'block' }}>{getActiveClientName()} · Executive Reviewer</span>
          </div>
        </div>
      </div>

      {/* ─── FILTERS & DATE SELECTOR ROW ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-glass)', padding: '12px 18px', borderRadius: '12px', border: '1px solid #B7BEC7', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F4F5F7', padding: '8px 14px', borderRadius: '8px', border: '1px solid #B7BEC7', width: '260px' }}>
          <Search size={14} color="#5F6875" />
          <input 
            type="text" 
            placeholder="Search employees, locations, roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.78rem', color: '#1F2328', width: '100%' }}
          />
        </div>

        {/* Controls: Date options & quick PPT downloads */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* Active range indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F4F5F7', border: '1px solid #B7BEC7', padding: '6px 12px', borderRadius: '8px' }}>
            <Calendar size={14} color="#5F6875" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1F2328' }}>{dateRange}</span>
          </div>

          {/* Quick Date Selection Filters */}
          <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '8px', padding: '3px' }}>
            {['Last 7 Days', 'Last 30 Days', 'Quarterly', 'Custom'].map(item => {
              const isActive = dateFilter === item;
              return (
                <button
                  key={item}
                  onClick={() => handleDateFilterChange(item)}
                  style={{
                    padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '0.72rem', fontWeight: 700,
                    cursor: 'pointer', background: isActive ? '#3E5C8A' : 'transparent', color: isActive ? 'white' : '#5F6875',
                    transition: 'all 0.15s'
                  }}
                >
                  {item}
                </button>
              );
            })}
          </div>

          {/* Download PPT dropdown */}
          <button
            onClick={triggerPPTDownload}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'linear-gradient(135deg, #1F2328 0%, #152B4F 100%)',
              border: 'none', borderRadius: '8px', color: 'white', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(7,27,54,0.15)'
            }}
          >
            <Presentation size={13} />
            <span>Download Review PPT</span>
          </button>
        </div>
      </div>

      {/* ─── PROJECT INFORMATION BANNER ─── */}
      <div style={{ background: 'linear-gradient(135deg, #1F2328 0%, #152A4E 100%)', color: 'white', padding: '20px 24px', borderRadius: '16px', marginBottom: '24px', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 24px rgba(7,27,54,0.15)' }}>
        
        {/* Decorative client banner logo marker on right */}
        <div style={{ position: 'absolute', right: '24px', top: '50%', transform: 'translateY(-50%)', opacity: 0.12, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <strong style={{ fontSize: '2.5rem', fontWeight: 900, textTransform: 'uppercase' }}>{getActiveClientName()}</strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#38BDF8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Active Project Command Banner</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {getActiveProjectName()} Performance Center
            </h2>
            
            <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap', fontSize: '0.78rem', color: '#727A86' }}>
              <span>Client: <strong style={{ color: 'white' }}>{getActiveClientName()}</strong></span>
              <span>•</span>
              <span>Project Manager: <strong style={{ color: 'white' }}>Rahul Sharma</strong></span>
              <span>•</span>
              <span>Last Sync: <strong style={{ color: '#38BDF8' }}>Just Now</strong></span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
            <span style={{ fontSize: '0.65rem', color: '#727A86', fontWeight: 600 }}>Operational Status</span>
            <span style={{ 
              background: '#DCFCE7', color: '#16A34A', padding: '4px 12px', borderRadius: '20px', 
              fontWeight: 800, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' 
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16A34A' }} /> On Track
            </span>
          </div>
        </div>
      </div>

      {/* ─── EXECUTIVE KPI CARDS (6 CARDS) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* KPI 1: Workforce Readiness */}
        <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', position: 'relative' }} title={`Formula: Ready Employees (${readyCount}) ÷ Assigned (${totalAssigned}) × 100`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#5F6875' }}>Workforce Readiness</span>
            <Users size={16} color="#3E5C8A" />
          </div>
          <strong style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1F2328', margin: '4px 0' }}>{readinessPercent}%</strong>
          <span style={{ fontSize: '0.62rem', color: '#5F6875' }}>Reps ready for deployment</span>
        </div>

        {/* KPI 2: Learning Completion */}
        <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#5F6875' }}>Learning Completion</span>
            <CheckCircle size={16} color="#3E5C8A" />
          </div>
          <strong style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1F2328', margin: '4px 0' }}>{learningCompletionRate}%</strong>
          <span style={{ fontSize: '0.62rem', color: '#5F6875' }}>Curriculum progress rate</span>
        </div>

        {/* KPI 3: Certification Coverage */}
        <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#5F6875' }}>Certifications</span>
            <Award size={16} color="#3B8C68" />
          </div>
          <strong style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1F2328', margin: '4px 0' }}>{certificationRate}%</strong>
          <span style={{ fontSize: '0.62rem', color: '#5F6875' }}>Certified field force percentage</span>
        </div>

        {/* KPI 4: Compliance Score */}
        <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#5F6875' }}>Compliance Score</span>
            <Shield size={16} color="#16A34A" />
          </div>
          <strong style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1F2328', margin: '4px 0' }}>{complianceRate}%</strong>
          <span style={{ fontSize: '0.62rem', color: '#5F6875' }}>Mandatory check status</span>
        </div>

        {/* KPI 5: Engagement Index */}
        <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#5F6875' }}>Engagement Index</span>
            <Heart size={16} color="#EF4444" />
          </div>
          <strong style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1F2328', margin: '4px 0' }}>{engagementIndex}</strong>
          <span style={{ fontSize: '0.62rem', color: '#5F6875' }}>Active participation score</span>
        </div>

        {/* KPI 6: Project Health Score */}
        <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#5F6875' }}>Project Health</span>
            <Star size={16} color="#FBBF24" />
          </div>
          <strong style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1F2328', margin: '4px 0' }}>{projectHealthScore} / 100</strong>
          <span style={{ background: '#DCFCE7', color: '#16A34A', padding: '2px 6px', borderRadius: '4px', alignSelf: 'flex-start', fontWeight: 700, fontSize: '0.58rem', marginTop: '2px' }}>ON TARGET</span>
        </div>

      </div>

      {/* ─── ROW 2: WORKFORCE PIPELINE + PROJECT HEALTH CENTER + LEARNING TREND ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        {/* Workforce Pipeline Funnel Chart */}
        <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1F2328', margin: 0 }}>Workforce Pipeline</h3>
            <span style={{ fontSize: '0.72rem', color: '#5F6875' }}>Progression transition stages and counts</span>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '16px' }}>
            <div style={{ width: '100%', height: '170px', position: 'relative' }}>
              <svg viewBox="0 0 200 170" width="100%" height="100%" style={{ overflow: 'visible' }}>
                {/* Horizontal funnel bands with HSL gradients */}
                {/* 1. Assigned */}
                <path d="M 10,10 L 190,10 L 175,36 L 25,36 Z" fill="#3E5C8A" fillOpacity="0.95" stroke="#FFFFFF" strokeWidth="1" />
                <text x="100" y="27" fill="#FFFFFF" fontSize="8" fontWeight="800" textAnchor="middle">{totalAssigned} Assigned</text>

                {/* 2. Active */}
                <path d="M 25,41 L 175,41 L 160,67 L 40,67 Z" fill="#1F2328" fillOpacity="0.95" stroke="#FFFFFF" strokeWidth="1" />
                <text x="100" y="58" fill="#FFFFFF" fontSize="8" fontWeight="800" textAnchor="middle">{activeLearners} Active ({Math.round((activeLearners / totalAssigned) * 100)}%)</text>

                {/* 3. Trained */}
                <path d="M 40,72 L 160,72 L 145,98 L 55,98 Z" fill="#3E5C8A" fillOpacity="0.95" stroke="#FFFFFF" strokeWidth="1" />
                <text x="100" y="89" fill="#FFFFFF" fontSize="8" fontWeight="800" textAnchor="middle">{trainedCount} Trained ({Math.round((trainedCount / totalAssigned) * 100)}%)</text>

                {/* 4. Certified */}
                <path d="M 55,103 L 145,103 L 130,129 L 70,129 Z" fill="#3B8C68" fillOpacity="0.95" stroke="#FFFFFF" strokeWidth="1" />
                <text x="100" y="120" fill="#FFFFFF" fontSize="8" fontWeight="800" textAnchor="middle">{certifiedCount} Certified ({Math.round((certifiedCount / totalAssigned) * 100)}%)</text>

                {/* 5. Ready */}
                <path d="M 70,134 L 130,134 L 115,160 L 85,160 Z" fill="#16A34A" fillOpacity="0.95" stroke="#FFFFFF" strokeWidth="1" />
                <text x="100" y="151" fill="#FFFFFF" fontSize="8" fontWeight="800" textAnchor="middle">{readyCount} Ready ({Math.round((readyCount / totalAssigned) * 100)}%)</text>
              </svg>
            </div>
          </div>
        </div>

        {/* Project Health Center circular concentric score card */}
        <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1F2328', margin: 0 }}>Project Health Center</h3>
            <span style={{ fontSize: '0.72rem', color: '#5F6875' }}>Operational safety concentric metrics</span>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '14px', marginTop: '12px' }}>
            
            {/* Concentric Circle SVGs */}
            <div style={{ width: '120px', height: '120px', position: 'relative', flexShrink: 0 }}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                {/* 1. Completion: learningCompletionRate% (R=50) -> circ ≈ 314 */}
                <circle cx="60" cy="60" r="50" fill="none" stroke="#F1F5F9" strokeWidth="7" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="#3E5C8A" strokeWidth="7" strokeDasharray="314" strokeDashoffset={314 * (1 - learningCompletionRate / 100)} strokeLinecap="round" transform="rotate(-90 60 60)" />

                {/* 2. Certification: certificationRate% (R=41) -> circ ≈ 257.6 */}
                <circle cx="60" cy="60" r="41" fill="none" stroke="#F1F5F9" strokeWidth="7" />
                <circle cx="60" cy="60" r="41" fill="none" stroke="#3E5C8A" strokeWidth="7" strokeDasharray="257.6" strokeDashoffset={257.6 * (1 - certificationRate / 100)} strokeLinecap="round" transform="rotate(-90 60 60)" />

                {/* 3. Compliance: complianceRate% (R=32) -> circ ≈ 201 */}
                <circle cx="60" cy="60" r="32" fill="none" stroke="#F1F5F9" strokeWidth="7" />
                <circle cx="60" cy="60" r="32" fill="none" stroke="#3B8C68" strokeWidth="7" strokeDasharray="201" strokeDashoffset={201 * (1 - complianceRate / 100)} strokeLinecap="round" transform="rotate(-90 60 60)" />

                {/* 4. Attendance: 88% (R=23) -> circ ≈ 144.5 */}
                <circle cx="60" cy="60" r="23" fill="none" stroke="#F1F5F9" strokeWidth="7" />
                <circle cx="60" cy="60" r="23" fill="none" stroke="#7C3AED" strokeWidth="7" strokeDasharray="144.5" strokeDashoffset={144.5 * (1 - 0.88)} strokeLinecap="round" transform="rotate(-90 60 60)" />
              </svg>
              
              {/* Inner score badge */}
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <strong style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1F2328', display: 'block' }}>89</strong>
                <span style={{ fontSize: '0.45rem', color: '#16A34A', display: 'block', fontWeight: 800 }}>HEALTHY</span>
              </div>
            </div>

            {/* Dials legend list */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.68rem', fontWeight: 600 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3E5C8A' }} /> Completion</span>
                <strong style={{ color: '#1F2328' }}>{learningCompletionRate}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3E5C8A' }} /> Certified</span>
                <strong style={{ color: '#1F2328' }}>{certificationRate}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3B8C68' }} /> Compliance</span>
                <strong style={{ color: '#1F2328' }}>{complianceRate}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7C3AED' }} /> Attendance</span>
                <strong style={{ color: '#1F2328' }}>88%</strong>
              </div>
            </div>

          </div>
        </div>

        {/* Learning Effectiveness Trend Multi-Line Graph */}
        <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1F2328', margin: 0 }}>Effectiveness Trend</h3>
              <span style={{ fontSize: '0.72rem', color: '#5F6875' }}>Training impact parameters timeline</span>
            </div>
            
            <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '6px', padding: '2px' }}>
              {['Weekly', 'Monthly', 'Quarterly'].map(t => (
                <button
                  key={t}
                  onClick={() => setTrendTimeline(t)}
                  style={{
                    padding: '3px 8px', borderRadius: '4px', border: 'none', fontSize: '0.62rem', fontWeight: 700,
                    cursor: 'pointer', background: trendTimeline === t ? '#1F2328' : 'transparent', color: trendTimeline === t ? 'white' : '#5F6875'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Multi-Line Chart */}
          <div style={{ flex: 1, height: '110px', minHeight: '110px' }}>
            <svg viewBox="0 0 220 110" width="100%" height="100%" style={{ overflow: 'visible' }}>
              {/* Grid lines */}
              <line x1="20" y1="15" x2="200" y2="15" stroke="#F1F5F9" strokeWidth="0.8" />
              <line x1="20" y1="50" x2="200" y2="50" stroke="#F1F5F9" strokeWidth="0.8" />
              <line x1="20" y1="85" x2="200" y2="85" stroke="#B7BEC7" strokeWidth="1" />

              {/* Line 1: Knowledge Growth (Orange) */}
              <path d="M 20,70 L 65,58 L 110,48 L 155,30 L 200,20" fill="none" stroke="#3E5C8A" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="200" cy="20" r="2.5" fill="#3E5C8A" />

              {/* Line 2: Assessment Scores (Blue) */}
              <path d="M 20,80 L 65,72 L 110,50 L 155,42 L 200,34" fill="none" stroke="#3E5C8A" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="200" cy="34" r="2.5" fill="#3E5C8A" />

              {/* Line 3: Completion Rates (Green) */}
              <path d="M 20,85 L 65,65 L 110,55 L 155,48 L 200,26" fill="none" stroke="#3B8C68" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="200" cy="26" r="2.5" fill="#3B8C68" />

              {/* X Labels */}
              <text x="20" y="98" fill="#727A86" fontSize="6.5" textAnchor="middle">W1</text>
              <text x="65" y="98" fill="#727A86" fontSize="6.5" textAnchor="middle">W2</text>
              <text x="110" y="98" fill="#727A86" fontSize="6.5" textAnchor="middle">W3</text>
              <text x="155" y="98" fill="#727A86" fontSize="6.5" textAnchor="middle">W4</text>
              <text x="200" y="98" fill="#727A86" fontSize="6.5" textAnchor="middle">Current</text>
            </svg>
          </div>

          {/* Legends */}
          <div style={{ display: 'flex', gap: '8px', fontSize: '0.62rem', fontWeight: 700, color: '#475569', justifyContent: 'center', marginTop: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '6px', height: '6px', background: '#3E5C8A', borderRadius: '1.5px' }} /> Knowledge Growth</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '6px', height: '6px', background: '#3E5C8A', borderRadius: '1.5px' }} /> Assessment</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '6px', height: '6px', background: '#3B8C68', borderRadius: '1.5px' }} /> Completion</span>
          </div>

        </div>

      </div>

      {/* ─── ROW 3: COMPLIANCE OVERVIEW + REGIONAL PERFORMANCE India Heatmap + AI INSIGHTS ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        {/* Compliance & Certification Overview */}
        <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1F2328', margin: 0 }}>Compliance &amp; Certifications Ratio</h3>
            <span style={{ fontSize: '0.72rem', color: '#5F6875' }}>Mandatory audits and certification distribution</span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            
            {/* Compliance Progress Meters */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: '#F0FDF4', border: '1.5px solid rgba(34,197,94,0.2)', padding: '10px 14px', borderRadius: '10px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: '#16A34A', fontWeight: 700, textTransform: 'uppercase' }}>Completed</span>
                <strong style={{ fontSize: '1.3rem', fontWeight: 800, color: '#16A34A', display: 'block', marginTop: '4px' }}>94%</strong>
                <span style={{ fontSize: '0.62rem', color: '#5F6875' }}>Clear audit benchmarks</span>
              </div>

              <div style={{ background: '#FEF2F2', border: '1.5px solid rgba(239,68,68,0.2)', padding: '10px 14px', borderRadius: '10px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: '#EF4444', fontWeight: 700, textTransform: 'uppercase' }}>Pending Gaps</span>
                <strong style={{ fontSize: '1.3rem', fontWeight: 800, color: '#EF4444', display: 'block', marginTop: '4px' }}>6%</strong>
                <span style={{ fontSize: '0.62rem', color: '#5F6875' }}>Requires intervention</span>
              </div>
            </div>

            {/* Certification Donut ratios */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#F4F5F7', border: '1px solid #B7BEC7', padding: '10px 14px', borderRadius: '10px' }}>
              {/* Small donut SVG */}
              <div style={{ width: '56px', height: '56px', position: 'relative', flexShrink: 0 }}>
                <svg width="56" height="56" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="#B7BEC7" strokeWidth="5" />
                  <circle cx="28" cy="28" r="22" fill="none" stroke="#3B8C68" strokeWidth="5" strokeDasharray="138.2" strokeDashoffset={138.2 * 0.12} strokeLinecap="round" transform="rotate(-90 28 28)" />
                  <circle cx="28" cy="28" r="22" fill="none" stroke="#FBBF24" strokeWidth="5" strokeDasharray="138.2" strokeDashoffset={138.2 * 0.9} strokeLinecap="round" transform="rotate(230 28 28)" />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.68rem', fontWeight: 800, color: '#1F2328' }}>
                  88%
                </div>
              </div>
              <div style={{ flex: 1, fontSize: '0.68rem', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Issued Certificates</span>
                  <strong style={{ color: '#3B8C68' }}>343 reps (88%)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Expiring (30 Days)</span>
                  <strong style={{ color: '#FBBF24' }}>32 reps (8%)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Expired / Retrain</span>
                  <strong style={{ color: '#EF4444' }}>15 reps (4%)</strong>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Regional Performance India Map widget */}
        <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1F2328', margin: 0 }}>Regional Standings Map</h3>
            <span style={{ fontSize: '0.62rem', background: '#F4F5F7', border: '1px solid #B7BEC7', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>India Coverage</span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', height: '130px', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <path 
                  d="M 200 20 L 220 50 L 280 100 L 340 100 L 360 120 L 300 150 L 280 180 L 260 250 L 200 360 L 180 360 L 140 250 L 100 160 L 80 150 L 100 100 L 140 60 Z" 
                  fill="#F4F5F7" stroke="#CBD5E1" strokeWidth="3" strokeLinejoin="round" 
                />
                <circle cx="200" cy="80" r="45" fill="#3B8C68" opacity="0.85" />
                <circle cx="120" cy="160" r="45" fill="#FBBF24" opacity="0.85" />
                <circle cx="200" cy="180" r="45" fill="#FBBF24" opacity="0.85" />
                <circle cx="280" cy="160" r="45" fill="#EF4444" opacity="0.85" />
                <circle cx="200" cy="280" r="45" fill="#3B8C68" opacity="0.85" />

                <text x="200" y="85" fill="#FFFFFF" fontSize="16" fontWeight="bold" textAnchor="middle">North: 91%</text>
                <text x="120" y="165" fill="#1F2328" fontSize="16" fontWeight="bold" textAnchor="middle">West: 74%</text>
                <text x="200" y="185" fill="#1F2328" fontSize="16" fontWeight="bold" textAnchor="middle">Central: 68%</text>
                <text x="280" y="165" fill="#FFFFFF" fontSize="16" fontWeight="bold" textAnchor="middle">East: 58%</text>
                <text x="200" y="285" fill="#FFFFFF" fontSize="16" fontWeight="bold" textAnchor="middle">South: 93%</text>
              </svg>
            </div>
            
            {/* Color Threshold metrics bar */}
            <div style={{ display: 'flex', gap: '8px', fontSize: '0.6rem', color: '#5F6875', fontWeight: 600, marginTop: '6px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#3B8C68' }} /> Green (&gt;90%)</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#FBBF24' }} /> Yellow (75-89%)</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#EF4444' }} /> Critical (&lt;60%)</span>
            </div>
          </div>
        </div>

        {/* AI Insights engine */}
        <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1F2328', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={15} color="#3E5C8A" /> AI Insights Engine
            </h3>
            <span style={{ fontSize: '0.62rem', background: '#FFF5F0', color: '#3E5C8A', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>Active Recommendations</span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
            {[
              { text: 'Certification coverage target (88%) has been successfully achieved.', type: 'success' },
              { text: 'South region is performing above benchmark average (93% score).', type: 'success' },
              { text: 'East region has dropped below compliance threshold (58%); intervention required.', type: 'alert' },
              { text: 'Trainer effectiveness metric indicates 12% improvement vs last month.', type: 'success' }
            ].map((insight, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', background: '#F4F5F7', padding: '8px 10px', borderRadius: '8px', border: '1px solid #B7BEC7', alignItems: 'flex-start' }}>
                <span style={{ color: insight.type === 'success' ? '#3B8C68' : '#EF4444', flexShrink: 0 }}>✓</span>
                <span style={{ lineHeight: 1.3 }}>{insight.text}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ─── ROW 4: TOP PERFORMERS + NEEDS ATTENTION + ACTION CENTER ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        {/* Top Performers (Gold, Silver, Bronze Leaderboard) */}
        <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1F2328', margin: '0 0 12px 0' }}>🏆 Top Performers</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            {[
              { rank: 1, label: '🏆 Rank 1 (Gold)', name: 'Rahul Sharma', score: '95% Avg', completion: '100% Modules', badgeBg: '#FEF3C7', badgeCol: '#D97706' },
              { rank: 2, label: '🥈 Rank 2 (Silver)', name: 'Neha Singh', score: '92% Avg', completion: '100% Modules', badgeBg: '#F1F5F9', badgeCol: '#475569' },
              { rank: 3, label: '🥉 Rank 3 (Bronze)', name: 'Amit Kumar', score: '90% Avg', completion: '100% Modules', badgeBg: '#FFEDD5', badgeCol: '#C2410C' },
              { rank: 4, label: '#4 Position', name: 'Priya Patel', score: '88% Avg', completion: '100% Modules', badgeBg: '#F4F5F7', badgeCol: '#5F6875' },
              { rank: 5, label: '#5 Position', name: 'Suresh Yadav', score: '86% Avg', completion: '100% Modules', badgeBg: '#F4F5F7', badgeCol: '#5F6875' }
            ].map((p, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#F4F5F7', borderRadius: '8px', border: '1px solid #B7BEC7' }}>
                <div>
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: p.badgeCol, background: p.badgeBg, padding: '2px 6px', borderRadius: '4px' }}>{p.label}</span>
                  <strong style={{ display: 'block', fontSize: '0.78rem', color: '#1F2328', marginTop: '2px' }}>{p.name}</strong>
                  <span style={{ fontSize: '0.62rem', color: '#5F6875' }}>Status: Certified</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#16A34A' }}>{p.score}</span>
                  <span style={{ display: 'block', fontSize: '0.62rem', color: '#5F6875' }}>{p.completion}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Needs Attention (At-Risk list) */}
        <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#EF4444', margin: '0 0 4px 0' }}>⚠️ Needs Attention</h3>
          <span style={{ fontSize: '0.72rem', color: '#5F6875', display: 'block', marginBottom: '12px' }}>At-risk representatives requiring L&amp;D coaching</span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            {[
              { name: 'Amit Patel', gap: 'Low Completion (35%)', status: 'Pending Compliance', id: 'EMP308' },
              { name: 'Sneha Nair', gap: 'Expired Certificate (Compliance)', status: 'Requires Retraining', id: 'EMP415' },
              { name: 'Vikas Rao', gap: 'Low Score (42% on SOP)', status: 'Requires Coaching', id: 'EMP290' }
            ].map((p, idx) => (
              <div key={idx} style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.78rem', color: '#EF4444', display: 'block' }}>{p.name}</strong>
                  <span style={{ fontSize: '0.65rem', color: '#B91C1C', display: 'block', fontWeight: 600 }}>{p.gap}</span>
                  <span style={{ fontSize: '0.6rem', color: '#5F6875' }}>ID: {p.id} · status: {p.status}</span>
                </div>

                {/* Quick Client restricted actions button */}
                <button 
                  onClick={() => setShowRoleAlert(true)}
                  style={{
                    padding: '4px 8px', borderRadius: '4px', border: 'none', background: '#EF4444', color: 'white',
                    fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px'
                  }}
                  title="Assign Coach (Restricted)"
                >
                  <Lock size={9} /> Action
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Action Center & Business Review PPT center */}
        <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1F2328', margin: '0 0 12px 0' }}>Action Center</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
            
            {/* Quick Actions grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button 
                onClick={triggerPPTDownload}
                style={{ padding: '8px', border: '1px solid #B7BEC7', background: '#F4F5F7', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700, color: '#1F2328', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyCenter: 'center', gap: '4px' }}
              >
                <Presentation size={12} color="#7C3AED" /> Slide Deck
              </button>
              <button 
                onClick={triggerExcelDownload}
                style={{ padding: '8px', border: '1px solid #B7BEC7', background: '#F4F5F7', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700, color: '#1F2328', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyCenter: 'center', gap: '4px' }}
              >
                <FileText size={12} color="#16A34A" /> Excel Sheets
              </button>
            </div>

            {/* Template lists */}
            <div style={{ borderTop: '1px solid #B7BEC7', paddingTop: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Select Business Review Deck</label>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { key: 'monthly', label: 'Monthly Business Review (MBR)', desc: 'Executive MBR PPT template' },
                  { key: 'quarterly', label: 'Quarterly Review Deck (QBR)', desc: 'Full corporate slide presentation' },
                  { key: 'compliance', label: 'Compliance Review', desc: 'Audit compliance checklists' },
                  { key: 'board', label: 'Executive Board Report', desc: 'Summary metrics presentation' }
                ].map(opt => {
                  const isSelected = selectedReportTemplate === opt.key;
                  return (
                    <div 
                      key={opt.key}
                      onClick={() => setSelectedReportTemplate(opt.key)}
                      style={{
                        padding: '8px 10px', borderRadius: '6px', border: `1px solid ${isSelected ? '#3E5C8A' : '#B7BEC7'}`,
                        background: isSelected ? '#FFF5F0' : '#FFFFFF', cursor: 'pointer', display: 'flex', flexDirection: 'column'
                      }}
                    >
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isSelected ? '#3E5C8A' : '#1F2328' }}>{opt.label}</span>
                      <span style={{ fontSize: '0.62rem', color: '#5F6875' }}>{opt.desc}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={triggerPPTDownload}
              style={{
                width: '100%', border: 'none', background: '#3E5C8A', color: 'white', fontWeight: 700,
                fontSize: '0.78rem', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: 'auto', boxShadow: '0 4px 12px rgba(243,111,33,0.2)'
              }}
            >
              Export Selected Review Deck
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
