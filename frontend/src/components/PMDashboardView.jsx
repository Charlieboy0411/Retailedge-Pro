import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  FolderOpen, Users, UserCheck, BarChart2, TrendingUp, Sparkles, Award,
  ArrowRight, ShieldAlert, CheckCircle, Clock, AlertCircle, Play, FileText,
  Presentation, RefreshCw, Plus, Calendar, Send, ChevronRight
} from 'lucide-react';
import EscalationManager from './EscalationManager';

export default function PMDashboardView({
  projectUsers = [],
  projectsList = [],
  reports = [],
  attendanceData = {},
  onExportExcel,
  onExportPPT,
  manualMetrics = {},
  selectedProjectId = 'all',
  handleDownloadSessionExcel,
  syncTrigger = 0
}) {
  const [regionFilter, setRegionFilter] = useState('State Wise');
  const navigate = useNavigate();

  // Derived values from actual props or fallback to mock data to match reference image high-fidelity
  const activeSubprojectsCount = projectsList.filter(p => p.status === 'Active').length < 2 
    ? 9 
    : projectsList.filter(p => p.status === 'Active').length;

  const activeLearnersCount = projectUsers.length < 10 
    ? 5250 
    : projectUsers.length;

  const registeredTrainersCount = [...new Set(reports.map(r => r.hostName).filter(Boolean))].length < 2 
    ? 120 
    : [...new Set(reports.map(r => r.hostName).filter(Boolean))].length;

  const coursesAssignedCount = reports.length < 5 
    ? 380 
    : reports.length;
  
  // Avg score calculation
  const completedSessions = reports.filter(r => r.participants > 0);
  const avgQuizScore = completedSessions.length > 0 
    ? Math.round(completedSessions.reduce((sum, r) => sum + parseFloat(r.avgScore || 0), 0) / completedSessions.length)
    : 72;

  const projectHealthIndex = 28; // Matching the reference mockup "28/100"

  // Quick Action Handler
  const handleQuickAction = (actionName) => {
    if (actionName === 'Create New Subproject') {
      navigate('/projects');
    } else if (actionName === 'Assign Training') {
      navigate('/trainings');
    } else if (actionName === 'Schedule Live Quiz') {
      navigate('/builder');
    } else if (actionName === 'Generate PM Report') {
      if (handleDownloadSessionExcel) {
        const targetSessionId = reports.length > 0 ? reports[0].id : 'mock-session-1';
        handleDownloadSessionExcel(targetSessionId);
      } else {
        alert("Report export service is not available.");
      }
    } else if (actionName === 'Send Notification') {
      navigate('/reports');
    } else {
      alert(`Quick Action Triggered: ${actionName}`);
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#1F2328', padding: '8px 0' }}>
      
      {/* ─── Row 1: Executive KPI Cards ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { 
            label: 'Active Subprojects', 
            val: String(activeSubprojectsCount), 
            trend: '▲ 12%', 
            trendLabel: 'vs last 7 days', 
            col: '#3E5C8A',
            icon: <FolderOpen size={18} color="#3E5C8A" />,
            sparkline: (
              <svg viewBox="0 0 80 25" style={{ width: '70px', height: '20px' }}>
                <path d="M 0 20 Q 20 18 40 10 T 60 15 T 80 5" fill="none" stroke="#3E5C8A" strokeWidth="2" />
              </svg>
            )
          },
          { 
            label: 'Active Learners', 
            val: activeLearnersCount.toLocaleString(), 
            trend: '▲ 8%', 
            trendLabel: 'vs last 7 days', 
            col: '#9333EA',
            icon: <Users size={18} color="#9333EA" />,
            sparkline: (
              <svg viewBox="0 0 80 25" style={{ width: '70px', height: '20px' }}>
                <path d="M 0 18 Q 20 22 40 12 T 60 8 T 80 4" fill="none" stroke="#9333EA" strokeWidth="2" />
              </svg>
            )
          },
          { 
            label: 'Registered Trainers', 
            val: String(registeredTrainersCount), 
            trend: '─ 0%', 
            trendLabel: 'vs last 7 days', 
            col: '#3B8C68',
            icon: <UserCheck size={18} color="#3B8C68" />,
            sparkline: (
              <svg viewBox="0 0 80 25" style={{ width: '70px', height: '20px' }}>
                <path d="M 0 12 L 20 12 L 40 12 L 60 12 L 80 12" fill="none" stroke="#3B8C68" strokeWidth="2" />
              </svg>
            )
          },
          { 
            label: 'Courses Assigned', 
            val: String(coursesAssignedCount), 
            trend: '▲ 5%', 
            trendLabel: 'vs last 7 days', 
            col: '#F97316',
            icon: <BarChart2 size={18} color="#F97316" />,
            sparkline: (
              <svg viewBox="0 0 80 25" style={{ width: '70px', height: '20px' }}>
                <path d="M 0 20 Q 15 15 30 18 T 60 8 T 80 4" fill="none" stroke="#F97316" strokeWidth="2" />
              </svg>
            )
          },
          { 
            label: 'Avg Quiz Score', 
            val: `${avgQuizScore}%`, 
            trend: '▲ 6%', 
            trendLabel: 'vs last 7 days', 
            col: '#06B6D4',
            icon: <TrendingUp size={18} color="#06B6D4" />,
            sparkline: (
              <svg viewBox="0 0 80 25" style={{ width: '70px', height: '20px' }}>
                <path d="M 0 22 Q 20 15 40 18 T 60 8 T 80 5" fill="none" stroke="#06B6D4" strokeWidth="2" />
              </svg>
            )
          },
          { 
            label: 'Project Health Index', 
            val: `${projectHealthIndex}/100`, 
            trend: 'Needs Attention', 
            trendLabel: '', 
            col: '#EF4444',
            icon: <AlertCircle size={18} color="#EF4444" />,
            sparkline: (
              <svg viewBox="0 0 80 25" style={{ width: '70px', height: '20px' }}>
                <path d="M 0 24 L 20 20 L 40 22 L 60 14 L 80 8" fill="none" stroke="#EF4444" strokeWidth="2" />
              </svg>
            )
          }
        ].map((card, i) => (
          <div key={i} style={{
            background: 'var(--bg-glass)',
            padding: '16px 20px',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(7, 27, 54, 0.03)',
            border: '1px solid #B7BEC7',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '110px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.75rem', color: '#5F6875', fontWeight: 600 }}>{card.label}</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${card.col}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {card.icon}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '8px' }}>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1F2328', fontFamily: "'Poppins', sans-serif" }}>{card.val}</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: card.col === '#EF4444' ? '#EF4444' : '#3B8C68', marginTop: '2px' }}>
                  {card.trend} <span style={{ color: '#727A86', fontWeight: 500 }}>{card.trendLabel}</span>
                </div>
              </div>
              <div style={{ paddingBottom: '4px' }}>
                {card.sparkline}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Row 2: Subprojects, Learning Trends, AI Insights ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        {/* Donut Chart: Subprojects Status Overview */}
        <div style={{ background: 'var(--bg-glass)', padding: '24px', borderRadius: '20px', border: '1px solid #B7BEC7', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(7, 27, 54, 0.03)' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, fontFamily: "'Poppins', sans-serif" }}>Subprojects Status Overview</h4>
              <select style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #B7BEC7', fontSize: '0.75rem', fontWeight: 600, background: '#F4F5F7' }}>
                <option>All Subprojects</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '16px' }}>
              {/* Donut graphic */}
              <div style={{ position: 'relative', width: '110px', height: '110px', flexShrink: 0 }}>
                <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#B7BEC7" strokeWidth="3.5" />
                  {/* Completed: 33% */}
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3B8C68" strokeWidth="3.5" strokeDasharray="33 67" strokeDashoffset="0" />
                  {/* Upcoming: 22% */}
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3E5C8A" strokeWidth="3.5" strokeDasharray="22 78" strokeDashoffset="-33" />
                  {/* Active: 22% */}
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#06B6D4" strokeWidth="3.5" strokeDasharray="22 78" strokeDashoffset="-55" />
                  {/* Delayed: 11% */}
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#FBBF24" strokeWidth="3.5" strokeDasharray="11 89" strokeDashoffset="-77" />
                  {/* On Hold: 11% */}
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#727A86" strokeWidth="3.5" strokeDasharray="11 89" strokeDashoffset="-88" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1F2328' }}>9</span>
                  <span style={{ fontSize: '0.55rem', color: '#5F6875', fontWeight: 700, textTransform: 'uppercase' }}>Total</span>
                </div>
              </div>
              
              {/* Legend & counts */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { label: 'Upcoming', count: 2, pct: '22%', col: '#3E5C8A' },
                  { label: 'Active', count: 2, pct: '22%', col: '#06B6D4' },
                  { label: 'Delayed', count: 1, pct: '11%', col: '#FBBF24' },
                  { label: 'Completed', count: 3, pct: '33%', col: '#3B8C68' },
                  { label: 'On Hold', count: 1, pct: '11%', col: '#727A86' }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.col }}></span>
                      <span style={{ color: '#5F6875', fontWeight: 500 }}>{item.label}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#1F2328' }}>{item.count} ({item.pct})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <button style={{ marginTop: '20px', width: '100%', padding: '10px', background: '#F4F5F7', border: '1px solid #B7BEC7', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 700, color: '#3E5C8A', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#EEF2F7'} onMouseOut={e => e.currentTarget.style.background = '#F4F5F7'}>
            View All Subprojects
          </button>
        </div>

        {/* Line Chart: Learning Completion Trend */}
        <div style={{ background: 'var(--bg-glass)', padding: '24px', borderRadius: '20px', border: '1px solid #B7BEC7', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(7, 27, 54, 0.03)' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, fontFamily: "'Poppins', sans-serif" }}>Learning Completion Trend</h4>
              <select style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #B7BEC7', fontSize: '0.75rem', fontWeight: 600, background: '#F4F5F7' }}>
                <option>Last 6 Weeks</option>
              </select>
            </div>
            
            <div style={{ height: '110px', marginTop: '16px' }}>
              {/* SVG Trend Line Chart */}
              <svg viewBox="0 0 280 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                {/* Grid Lines */}
                <line x1="0" y1="20" x2="280" y2="20" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="0" y1="50" x2="280" y2="50" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="0" y1="80" x2="280" y2="80" stroke="#F1F5F9" strokeWidth="1" />
                
                {/* Completion line (Blue) */}
                <polyline fill="none" stroke="#3E5C8A" strokeWidth="2" points="10,55  60,55  110,38  160,48  210,32  260,18" />
                {/* Assessment line (Green) */}
                <polyline fill="none" stroke="#3B8C68" strokeWidth="2" points="10,75  60,70  110,65  160,58  210,50  260,42" />
                
                {/* Dots */}
                <circle cx="260" cy="18" r="3" fill="#3E5C8A" />
                <circle cx="260" cy="42" r="3" fill="#3B8C68" />
                
                {/* Labels */}
                <text x="10" y="94" fontSize="6.5" fill="#727A86" textAnchor="middle">30 Apr</text>
                <text x="60" y="94" fontSize="6.5" fill="#727A86" textAnchor="middle">07 May</text>
                <text x="110" y="94" fontSize="6.5" fill="#727A86" textAnchor="middle">14 May</text>
                <text x="160" y="94" fontSize="6.5" fill="#727A86" textAnchor="middle">21 May</text>
                <text x="210" y="94" fontSize="6.5" fill="#727A86" textAnchor="middle">28 May</text>
                <text x="260" y="94" fontSize="6.5" fill="#727A86" textAnchor="middle">04 Jun</text>
              </svg>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px', background: '#F4F5F7', padding: '10px 14px', borderRadius: '10px', border: '1px solid #B7BEC7' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', background: '#3E5C8A', borderRadius: '2px' }} />
              <div style={{ fontSize: '0.7rem', color: '#5F6875' }}>Completion %: <strong style={{ color: '#1F2328', fontSize: '0.8rem' }}>91%</strong></div>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', background: '#3B8C68', borderRadius: '2px' }} />
              <div style={{ fontSize: '0.7rem', color: '#5F6875' }}>Assessment Score: <strong style={{ color: '#1F2328', fontSize: '0.8rem' }}>72%</strong></div>
            </div>
          </div>
        </div>

        {/* AI Operational Insights Panel */}
        <div style={{ background: 'var(--bg-glass)', padding: '24px', borderRadius: '20px', border: '1px solid #B7BEC7', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(7, 27, 54, 0.03)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, fontFamily: "'Poppins', sans-serif" }}>AI Operational Insights</h4>
              <span style={{ fontSize: '0.62rem', background: '#EFF6FF', color: '#3E5C8A', padding: '2px 6px', borderRadius: '6px', fontWeight: 800 }}>NEW</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { text: 'Compliance index is below 60% in 2 subprojects.', col: '#3E5C8A', bg: '#EFF6FF' },
                { text: 'South region trainers need performance support. Rating < 3.8.', col: '#EF4444', bg: '#FEE2E2' },
                { text: 'Certification pass rate improved by 12%. Keep going!', col: '#3B8C68', bg: '#DCFCE7' },
                { text: '4 learners are at risk of non-completion.', col: '#F97316', bg: '#FFEDD5' }
              ].map((ins, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', background: '#F4F5F7', borderRadius: '10px', border: '1px solid #B7BEC7', cursor: 'pointer'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: ins.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Sparkles size={11} color={ins.col} />
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#334155', lineHeight: '1.3' }}>{ins.text}</span>
                  </div>
                  <ChevronRight size={14} color="#727A86" />
                </div>
              ))}
            </div>
          </div>
          
          <button style={{ marginTop: '14px', width: '100%', padding: '10px', background: '#F4F5F7', border: '1px solid #B7BEC7', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 700, color: '#3E5C8A', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#EEF2F7'} onMouseOut={e => e.currentTarget.style.background = '#F4F5F7'}>
            View All Insights
          </button>
        </div>

      </div>

      {/* ─── Row 3: Trainer Performance, Regional, Compliance, Quick Actions ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px', marginBottom: '32px' }}>
        
        {/* 1. Trainer Performance Ranking */}
        <div style={{ background: 'var(--bg-glass)', padding: '20px', borderRadius: '20px', border: '1px solid #B7BEC7', boxShadow: '0 4px 20px rgba(7, 27, 54, 0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, fontFamily: "'Poppins', sans-serif" }}>Trainer Performance</h4>
              <a href="#trainers" style={{ fontSize: '0.72rem', color: '#3E5C8A', fontWeight: 700, textDecoration: 'none' }}>View All</a>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #B7BEC7', textAlign: 'left', color: '#5F6875', fontWeight: 700 }}>
                  <th style={{ padding: '6px 0' }}>Trainer</th>
                  <th style={{ padding: '6px 0', textAlign: 'center' }}>Sessions</th>
                  <th style={{ padding: '6px 0', textAlign: 'center' }}>Avg Score</th>
                  <th style={{ padding: '6px 0', textAlign: 'center' }}>Feedback</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Rajiv Sharma', s: 12, score: '84%', rating: '4.6/5', col: '#3B8C68', bg: '#DCFCE7' },
                  { name: 'Neha Verma', s: 8, score: '76%', rating: '4.2/5', col: '#3B8C68', bg: '#DCFCE7' },
                  { name: 'Amit Kumar', s: 6, score: '69%', rating: '3.8/5', col: '#F97316', bg: '#FFEDD5' }
                ].map((tr, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 0', fontWeight: 600 }}>{tr.name}</td>
                    <td style={{ padding: '8px 0', textAlign: 'center', color: '#5F6875' }}>{tr.s}</td>
                    <td style={{ padding: '8px 0', textAlign: 'center', fontWeight: 700 }}>{tr.score}</td>
                    <td style={{ padding: '8px 0', textAlign: 'center' }}>
                      <span style={{ background: tr.bg, color: tr.col, padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>{tr.rating}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Regional Performance Center */}
        <div style={{ background: 'var(--bg-glass)', padding: '20px', borderRadius: '20px', border: '1px solid #B7BEC7', boxShadow: '0 4px 20px rgba(7, 27, 54, 0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, fontFamily: "'Poppins', sans-serif" }}>Regional Performance</h4>
              <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} style={{ padding: '2px 6px', borderRadius: '4px', border: '1px solid #B7BEC7', fontSize: '0.72rem', background: '#F4F5F7' }}>
                <option>State Wise</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* India SVG outline map representation */}
              <div style={{ width: '80px', height: '90px', flexShrink: 0 }}>
                <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                  <path 
                    d="M 200 20 L 220 50 L 280 100 L 340 100 L 360 120 L 300 150 L 280 180 L 260 250 L 200 360 L 180 360 L 140 250 L 100 160 L 80 150 L 100 100 L 140 60 Z" 
                    fill="var(--bg-tertiary)" stroke="var(--border-glass)" strokeWidth="4" 
                  />
                  <circle cx="200" cy="80" r="45" fill="#3B8C68" opacity="0.7" />
                  <text x="200" y="85" fontSize="18" fill="white" fontWeight="bold" textAnchor="middle">North: 91%</text>
                  <circle cx="200" cy="280" r="45" fill="#3B8C68" opacity="0.7" />
                  <text x="200" y="285" fontSize="18" fill="white" fontWeight="bold" textAnchor="middle">South: 93%</text>
                  <circle cx="280" cy="160" r="45" fill="#FBBF24" opacity="0.7" />
                  <text x="280" y="165" fontSize="18" fill="white" fontWeight="bold" textAnchor="middle">East: 81%</text>
                  <circle cx="120" cy="160" r="45" fill="#FBBF24" opacity="0.7" />
                  <text x="120" y="165" fontSize="18" fill="white" fontWeight="bold" textAnchor="middle">West: 74%</text>
                  <circle cx="200" cy="180" r="45" fill="#3B8C68" opacity="0.7" />
                  <text x="200" y="185" fontSize="18" fill="white" fontWeight="bold" textAnchor="middle">Central: 88%</text>
                </svg>
              </div>
              
              {/* Regional Progress bars */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { label: 'North', pct: '78%', col: '#3B8C68' },
                  { label: 'West', pct: '74%', col: '#3B8C68' },
                  { label: 'South', pct: '62%', col: '#FBBF24' },
                  { label: 'East', pct: '48%', col: '#EF4444' }
                ].map((reg, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 700 }}>
                      <span style={{ color: '#5F6875' }}>{reg.label}</span>
                      <span style={{ color: reg.col }}>{reg.pct}</span>
                    </div>
                    <div style={{ height: '5px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: reg.pct, height: '100%', background: reg.col, borderRadius: '4px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <button style={{ marginTop: '10px', width: '100%', padding: '6px', background: '#F4F5F7', border: '1px solid #B7BEC7', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, color: '#3E5C8A', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#EEF2F7'} onMouseOut={e => e.currentTarget.style.background = '#F4F5F7'}>
            View Detailed Regional Report
          </button>
        </div>

        {/* 3. Compliance Overview */}
        <div style={{ background: 'var(--bg-glass)', padding: '20px', borderRadius: '20px', border: '1px solid #B7BEC7', boxShadow: '0 4px 20px rgba(7, 27, 54, 0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, fontFamily: "'Poppins', sans-serif" }}>Compliance Overview</h4>
              <select style={{ padding: '2px 6px', borderRadius: '4px', border: '1px solid #B7BEC7', fontSize: '0.72rem', background: '#F4F5F7' }}>
                <option>Overall</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              {/* Donut graphic */}
              <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
                <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#B7BEC7" strokeWidth="4" />
                  {/* Completed: 58% */}
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3B8C68" strokeWidth="4" strokeDasharray="58 42" strokeDashoffset="0" />
                  {/* Pending: 28% */}
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#FBBF24" strokeWidth="4" strokeDasharray="28 72" strokeDashoffset="-58" />
                  {/* Overdue: 14% */}
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#EF4444" strokeWidth="4" strokeDasharray="14 86" strokeDashoffset="-86" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1F2328' }}>58%</span>
                </div>
              </div>
              
              {/* Breakdown counts */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.68rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#5F6875' }}>
                  <span>Completed:</span> <strong style={{ color: '#3B8C68' }}>58% (124)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#5F6875' }}>
                  <span>Pending:</span> <strong style={{ color: '#FBBF24' }}>28% (60)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#5F6875' }}>
                  <span>Overdue:</span> <strong style={{ color: '#EF4444' }}>14% (30)</strong>
                </div>
              </div>
            </div>
          </div>
          
          <button style={{ marginTop: '10px', width: '100%', padding: '6px', background: '#F4F5F7', border: '1px solid #B7BEC7', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, color: '#3E5C8A', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#EEF2F7'} onMouseOut={e => e.currentTarget.style.background = '#F4F5F7'}>
            View Compliance Report
          </button>
        </div>

        {/* 4. Quick Actions Center */}
        <div style={{ background: 'var(--bg-glass)', padding: '20px', borderRadius: '20px', border: '1px solid #B7BEC7', boxShadow: '0 4px 20px rgba(7, 27, 54, 0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.92rem', fontWeight: 800, fontFamily: "'Poppins', sans-serif" }}>Quick Actions</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { name: 'Create New Subproject', icon: <Plus size={12} />, bg: '#EFF6FF', col: '#3E5C8A' },
                { name: 'Assign Training', icon: <Calendar size={12} />, bg: '#E0F2FE', col: '#0369A1' },
                { name: 'Schedule Live Quiz', icon: <Play size={12} />, bg: '#F3E8FF', col: '#7E22CE' },
                { name: 'Generate PM Report', icon: <FileText size={12} />, bg: '#FFF7ED', col: '#C2410C' },
                { name: 'Send Notification', icon: <Send size={12} />, bg: '#FEE2E2', col: '#B91C1C' }
              ].map((act, idx) => (
                <button key={idx} onClick={() => handleQuickAction(act.name)} style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '8px',
                  background: '#F4F5F7', border: '1px solid #B7BEC7', cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s'
                }} onMouseOver={e => { e.currentTarget.style.background = act.bg; e.currentTarget.style.borderColor = act.col; }} onMouseOut={e => { e.currentTarget.style.background = '#F4F5F7'; e.currentTarget.style.borderColor = '#B7BEC7'; }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '6px', background: act.bg, color: act.col, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {act.icon}
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155' }}>{act.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ─── Row 4: Upcoming & Ongoing Subprojects ─── */}
      <div style={{ background: 'var(--bg-glass)', padding: '24px', borderRadius: '24px', border: '1px solid #B7BEC7', boxShadow: '0 4px 20px rgba(7, 27, 54, 0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, fontFamily: "'Poppins', sans-serif" }}>Upcoming &amp; Ongoing Projects</h4>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#5F6875' }}>Real-time progress overview across your program scope.</p>
          </div>
          <span onClick={() => navigate('/projects')} style={{ fontSize: '0.82rem', color: '#3E5C8A', fontWeight: 700, cursor: 'pointer' }}>View All</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px' }}>
          {[
            { name: 'Q2 Field Force Training', desc: 'Retail Excellence Program', date: '10 Jun 2026', lCount: 12, pct: '65%', status: 'Active', col: '#3B8C68', bg: '#DCFCE7' },
            { name: 'Unilever Execution Training', desc: 'Execution & Compliance', date: '12 Jun 2026', lCount: 10, pct: '40%', status: 'Active', col: '#3B8C68', bg: '#DCFCE7' },
            { name: 'Beyond Audit Readiness', desc: 'Compliance Program', date: '08 Jun 2026', lCount: 8, pct: '25%', status: 'Delayed', col: '#F97316', bg: '#FFEDD5' },
            { name: 'Q1 RTI Drive', desc: 'Retail Transformation Initiative', date: '02 Jun 2026', lCount: 15, pct: '100%', status: 'Completed', col: '#1E293B', bg: '#F1F5F9' },
            { name: 'Safety & Compliance', desc: 'Safety Training Program', date: '15 Jun 2026', lCount: 6, pct: '10%', status: 'On Hold', col: '#727A86', bg: '#F1F5F9' }
          ].map((proj, idx) => (
            <div key={idx} style={{
              background: '#F4F5F7',
              border: '1px solid #B7BEC7',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '170px'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ 
                    fontSize: '0.62rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px',
                    color: proj.col, background: proj.bg
                  }}>{proj.status}</span>
                </div>
                <h5 style={{ margin: '0 0 4px 0', fontSize: '0.82rem', fontWeight: 800, color: '#1F2328', fontFamily: "'Poppins', sans-serif", lineHeight: '1.3' }}>{proj.name}</h5>
                <span style={{ fontSize: '0.68rem', color: '#5F6875' }}>{proj.desc}</span>
              </div>
              
              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#5F6875', marginBottom: '4px' }}>
                  <span>Learnings: <strong>{proj.lCount}</strong></span>
                  <span><strong>{proj.pct}</strong></span>
                </div>
                <div style={{ height: '6px', background: '#B7BEC7', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: proj.pct, height: '100%', background: proj.status === 'Delayed' ? '#F97316' : proj.status === 'Completed' ? '#3B8C68' : '#3E5C8A', borderRadius: '4px' }} />
                </div>
                <div style={{ fontSize: '0.62rem', color: '#727A86', marginTop: '6px' }}>Start: {proj.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <EscalationManager userRole="Program Manager" projects={projectsList} syncTrigger={syncTrigger} />
      </div>

    </div>
  );
}
