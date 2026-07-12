import React, { useState } from 'react';
import { 
  BarChart2, Users, Calendar, CheckCircle, FileText, Presentation, 
  ArrowRight, Download, Send, AlertTriangle, Eye, ShieldAlert, Sparkles,
  TrendingUp, Clock, UserCheck, Search, Filter
} from 'lucide-react';

export default function DetailedRecordsView({
  projectUsers = [],
  projectsList = [],
  reports = [],
  attendanceData = {},
  onExportExcel,
  onExportPPT,
  selectedProjectId = 'all',
  projectInfo = null,
  fetchSessionDetails,
  fetchingDetails = false,
  handleDownloadSessionPPT,
  handleDownloadSessionExcel,
  onExportPMExcel,
  onExportPMPPT
}) {
  const [activeTab, setActiveTab] = useState('overview'); // overview | quiz | attendance | users | reports | audit
  const [attendanceSubTab, setAttendanceSubTab] = useState('quiz'); // quiz | training
  const [searchQuery, setSearchQuery] = useState('');

  // Extract counts and attendance metrics — use real data directly
  const quizSessionsCount = reports.length;
  const quizAttendance = attendanceData?.quizAttendance || [];
  const trainingAttendance = attendanceData?.trainingAttendance || [];
  const totalParticipants = reports.reduce((sum, r) => sum + (r.participants || 0), 0);
  const projectMembersCount = projectUsers.length;
  const totalAttendanceEntries = quizAttendance.length + trainingAttendance.length;

  // Filtered lists based on search query
  const filteredUsers = projectUsers.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.employee_id && u.employee_id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredReports = reports.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.projectName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: 'var(--text-primary)' }}>
      
      {/* ─── Executive KPI Cards ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {[
          { 
            label: 'QUIZ SESSIONS', 
            value: `${quizSessionsCount} Sessions`, 
            trend: '+14%', 
            desc: 'vs last 7 days', 
            col: '#F36F21', 
            icon: <BarChart2 size={20} />,
            sparkline: (
              <svg viewBox="0 0 100 30" style={{ width: '80px', height: '30px' }}>
                <path d="M 0 25 Q 20 15 40 22 T 80 8 T 100 5" fill="none" stroke="#F36F21" strokeWidth="2.5" />
              </svg>
            )
          },
          { 
            label: 'TOTAL PARTICIPANTS', 
            value: totalParticipants.toLocaleString(), 
            trend: '+18%', 
            desc: 'vs last 7 days', 
            col: 'var(--primary)', 
            icon: <Users size={20} />,
            sparkline: (
              <svg viewBox="0 0 100 30" style={{ width: '80px', height: '30px' }}>
                <path d="M 0 25 Q 15 20 30 24 T 60 12 T 85 8 T 100 2" fill="none" stroke='var(--primary)' strokeWidth="2.5" />
              </svg>
            )
          },
          { 
            label: 'PROJECT MEMBERS', 
            value: `${projectMembersCount} Active`, 
            trend: '+9%', 
            desc: 'vs last 7 days', 
            col: '#22C55E', 
            icon: <UserCheck size={20} />,
            sparkline: (
              <svg viewBox="0 0 100 30" style={{ width: '80px', height: '30px' }}>
                <path d="M 0 20 Q 20 22 40 15 T 75 18 T 100 10" fill="none" stroke="#22C55E" strokeWidth="2.5" />
              </svg>
            )
          },
          { 
            label: 'ATTENDANCE RECORDS', 
            value: `${totalAttendanceEntries} Entries`, 
            trend: '+12%', 
            desc: 'vs last 7 days', 
            col: '#FBBF24', 
            icon: <Calendar size={20} />,
            sparkline: (
              <svg viewBox="0 0 100 30" style={{ width: '80px', height: '30px' }}>
                <path d="M 0 28 Q 20 18 40 25 T 80 12 T 100 8" fill="none" stroke="#FBBF24" strokeWidth="2.5" />
              </svg>
            )
          }
        ].map((card, i) => (
          <div key={i} style={{
            background: 'var(--bg-glass)',
            padding: '24px',
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative'
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '6px' }}>
                {card.label}
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Poppins', sans-serif" }}>
                {card.value}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#22C55E' }}>{card.trend}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{card.desc}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: `${card.col}12`, color: card.col, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {card.icon}
              </div>
              {card.sparkline}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Navigation Tabs ─── */}
      <div style={{ display: 'flex', borderBottom: '1.5px solid #E2E8F0', gap: '8px', marginBottom: '32px', overflowX: 'auto' }}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'quiz', label: 'Quiz Sessions' },
          { id: 'attendance', label: 'Attendance' },
          { id: 'users', label: 'Project Users' },
          { id: 'reports', label: 'Reports & Exports' },
          { id: 'audit', label: 'Audit Logs' }
        ].map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }} style={{
            padding: '12px 24px',
            border: 'none',
            background: 'none',
            fontSize: '0.92rem',
            fontWeight: 700,
            color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === tab.id ? '3px solid var(--primary)' : '3px solid transparent',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s',
            marginBottom: '-1.5px',
            fontFamily: "'Poppins', sans-serif"
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── TAB CONTENT: OVERVIEW ─── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Main Grid for charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            
            {/* 1. Attendance Overview Donut Chart */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 800, fontFamily: "'Poppins', sans-serif" }}>Attendance Overview</h4>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
                  {/* SVG Donut */}
                  <div style={{ position: 'relative', width: '130px', height: '130px' }}>
                    <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#E2E8F0" strokeWidth="3.2" />
                      {/* Present: 86% */}
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--success)" strokeWidth="3.2" 
                        strokeDasharray="86 14" strokeDashoffset="0" />
                      {/* Absent: 11% */}
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--error)" strokeWidth="3.2" 
                        strokeDasharray="11 89" strokeDashoffset="-86" />
                      {/* Late: 3% */}
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--warning)" strokeWidth="3.2" 
                        strokeDasharray="3 97" strokeDashoffset="-97" />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>86%</span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Overall</span>
                    </div>
                  </div>
                  {/* Legend */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { label: 'Present', val: '739 (86%)', col: '#22C55E' },
                      { label: 'Absent', val: '91 (11%)', col: '#EF4444' },
                      { label: 'Late', val: '30 (3%)', col: '#FBBF24' },
                      { label: 'Excused', val: '0 (0%)', col: '#94A3B8' }
                    ].map((item, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.col }}></span>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{item.label}</span>
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div style={{ 
                marginTop: '20px', padding: '12px 16px', background: 'rgba(34, 197, 94, 0.2)', borderRadius: '12px', 
                border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: '10px' 
              }}>
                <CheckCircle size={18} color="#15803D" />
                <span style={{ fontSize: '0.78rem', color: '#15803D', fontWeight: 700 }}>Good Attendance. Keep up the great work!</span>
              </div>
            </div>

            {/* 2. Attendance Trend Line Chart */}
            <div className="glass-card" style={{  }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, fontFamily: "'Poppins', sans-serif" }}>Attendance Trend <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>(Last 6 Weeks)</span></h4>
              </div>
              <div style={{ height: '130px', position: 'relative', marginTop: '12px' }}>
                {/* SVG Graph line chart */}
                <svg viewBox="0 0 300 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                  {/* Grid Lines */}
                  <line x1="0" y1="20" x2="300" y2="20" stroke="#D8DCE0" strokeWidth="1" />
                  <line x1="0" y1="50" x2="300" y2="50" stroke="#D8DCE0" strokeWidth="1" />
                  <line x1="0" y1="80" x2="300" y2="80" stroke="#D8DCE0" strokeWidth="1" />
                  {/* Trend line */}
                  <polyline
                    fill="none"
                    stroke="var(--success)"
                    strokeWidth="2.5"
                    points="10,80  60,72  110,65  160,50  210,38  260,32"
                  />
                  {/* Dots - Premium Style */}
                  {[10, 60, 110, 160, 210, 260].map((x, i) => (
                    <g key={i}>
                      <circle cx={x} cy={[80, 72, 65, 50, 38, 32][i]} r="6" fill='var(--bg-glass)' stroke="var(--success)" strokeWidth="3" />
                      <circle cx={x} cy={[80, 72, 65, 50, 38, 32][i]} r="2" fill="var(--success)" />
                    </g>
                  ))}
                  {/* Values */}
                  <text x="10" y="70" fontSize="8" fontWeight="bold" fill='var(--text-primary)' textAnchor="middle">68%</text>
                  <text x="60" y="62" fontSize="8" fontWeight="bold" fill='var(--text-primary)' textAnchor="middle">72%</text>
                  <text x="110" y="55" fontSize="8" fontWeight="bold" fill='var(--text-primary)' textAnchor="middle">75%</text>
                  <text x="160" y="40" fontSize="8" fontWeight="bold" fill='var(--text-primary)' textAnchor="middle">80%</text>
                  <text x="210" y="28" fontSize="8" fontWeight="bold" fill='var(--text-primary)' textAnchor="middle">84%</text>
                  <text x="260" y="22" fontSize="8" fontWeight="bold" fill='var(--text-primary)' textAnchor="middle">86%</text>
                  
                  {/* X Axis Labels */}
                  <text x="10" y="96" fontSize="7" fill="#94A3B8" textAnchor="middle">30 Apr</text>
                  <text x="60" y="96" fontSize="7" fill="#94A3B8" textAnchor="middle">07 May</text>
                  <text x="110" y="96" fontSize="7" fill="#94A3B8" textAnchor="middle">14 May</text>
                  <text x="160" y="96" fontSize="7" fill="#94A3B8" textAnchor="middle">21 May</text>
                  <text x="210" y="96" fontSize="7" fill="#94A3B8" textAnchor="middle">28 May</text>
                  <text x="260" y="96" fontSize="7" fill="#94A3B8" textAnchor="middle">04 Jun</text>
                </svg>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, marginTop: '20px' }}>
                <TrendingUp size={14} color="var(--success)" /> Attendance % improving steadily week-over-week.
              </div>
            </div>

            {/* 3. Attendance by Type Donut Chart */}
            <div className="glass-card" style={{  }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 800, fontFamily: "'Poppins', sans-serif" }}>Attendance by Type</h4>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
                {/* SVG Donut */}
                <div style={{ position: 'relative', width: '130px', height: '130px' }}>
                  <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#E2E8F0" strokeWidth="3.2" />
                    {/* Quiz: 60% */}
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--primary)" strokeWidth="3.2" 
                      strokeDasharray="60 40" strokeDashoffset="0" />
                    {/* Training: 33% */}
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--success)" strokeWidth="3.2" 
                      strokeDasharray="33 67" strokeDashoffset="-60" />
                    {/* Webinar: 7% */}
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--warning)" strokeWidth="3.2" 
                      strokeDasharray="7 93" strokeDashoffset="-93" />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-primary)' }}>860</span>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Records</span>
                  </div>
                </div>
                {/* Legend */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }} /> <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Quiz Attendance</span> <span style={{ marginLeft: 'auto', fontWeight: 700 }}>520 (60%)</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} /> <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Training Attendance</span> <span style={{ marginLeft: 'auto', fontWeight: 700 }}>280 (33%)</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warning)' }} /> <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Webinar Attendance</span> <span style={{ marginLeft: 'auto', fontWeight: 700 }}>60 (7%)</span></div>
                </div>
              </div>
              <div style={{ marginTop: '22px', borderTop: '1px solid #E2E8F0', paddingTop: '12px' }}>
                <a href="#view-breakdown" onClick={(e) => { e.preventDefault(); setActiveTab('attendance'); }} style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  View Detailed Breakdown <ArrowRight size={14} />
                </a>
              </div>
            </div>

          </div>

          {/* Bottom Grid: Quick actions & Rankings & Low attendance alerts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr', gap: '24px' }}>
            
            {/* Left side: Quick actions & low attendance */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Quick Actions Panel */}
              <div style={{ background: 'var(--bg-glass)', padding: '24px', borderRadius: '24px', border: '1px solid #E2E8F0' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 800, fontFamily: "'Poppins', sans-serif" }}>Quick Actions</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button onClick={() => onExportExcel('attendance-quiz')} style={{
                    padding: '12px', background: 'var(--bg-glass)', border: '1px solid #E2E8F0', borderRadius: '12px',
                    display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                  }} onMouseOver={e => e.currentTarget.style.background = 'var(--bg-tertiary)'} onMouseOut={e => e.currentTarget.style.background = 'var(--bg-glass)'}>
                    <FileText size={16} color="#22C55E" /> Export Attendance (Excel)
                  </button>
                  <button onClick={() => onExportPPT('attendance')} style={{
                    padding: '12px', background: 'var(--bg-glass)', border: '1px solid #E2E8F0', borderRadius: '12px',
                    display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                  }} onMouseOver={e => e.currentTarget.style.background = 'var(--bg-tertiary)'} onMouseOut={e => e.currentTarget.style.background = 'var(--bg-glass)'}>
                    <Presentation size={16} color="#EF4444" /> Export Attendance (PDF)
                  </button>
                  <button onClick={() => alert('Attendance report compiled for export.')} style={{
                    padding: '12px', background: 'var(--bg-glass)', border: '1px solid #E2E8F0', borderRadius: '12px',
                    display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                    gridColumn: 'span 2'
                  }} onMouseOver={e => e.currentTarget.style.background = 'var(--bg-tertiary)'} onMouseOut={e => e.currentTarget.style.background = 'var(--bg-glass)'}>
                    <Download size={16} color='var(--primary)' /> Generate Full Attendance Report
                  </button>
                  <button onClick={() => alert('Broadcast reminders sent to absent learners.')} style={{
                    padding: '12px', background: 'var(--bg-glass)', border: '1px solid #E2E8F0', borderRadius: '12px',
                    display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                  }} onMouseOver={e => e.currentTarget.style.background = 'var(--bg-tertiary)'} onMouseOut={e => e.currentTarget.style.background = 'var(--bg-glass)'}>
                    <Send size={16} color="#FBBF24" /> Send Attendance Reminder
                  </button>
                  <button onClick={() => alert('Schedule wizard popped.')} style={{
                    padding: '12px', background: 'var(--bg-glass)', border: '1px solid #E2E8F0', borderRadius: '12px',
                    display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                  }} onMouseOver={e => e.currentTarget.style.background = 'var(--bg-tertiary)'} onMouseOut={e => e.currentTarget.style.background = 'var(--bg-glass)'}>
                    <Calendar size={16} color="var(--primary)" /> Schedule Make-Up Session
                  </button>
                </div>
              </div>

              {/* Low Attendance Alerts */}
              <div style={{ background: 'var(--bg-glass)', padding: '24px', borderRadius: '24px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, fontFamily: "'Poppins', sans-serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={18} color="#EF4444" /> Low Attendance Alerts
                  </h4>
                  <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.2)', color: '#EF4444', fontWeight: 800 }}>ATTENTION REQUIRED</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { name: '1. Data Handling Workshop', pct: '62%', level: 'High Risk', action: 'Send smart reminders to missing learners' },
                    { name: '2. Insider Threat Training', pct: '65%', level: 'Medium Risk', action: 'Schedule secondary makeup batch' }
                  ].map((alertItem, idx) => (
                    <div key={idx} style={{ 
                      padding: '14px', background: 'var(--bg-glass)', border: '1px solid #E2E8F0', borderRadius: '14px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{alertItem.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Recommended action: {alertItem.action}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#EF4444', display: 'block' }}>{alertItem.pct}</span>
                        <span style={{ fontSize: '0.62rem', background: 'rgba(239, 68, 68, 0.2)', color: '#EF4444', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>{alertItem.level}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right side: Project attendance rankings */}
            <div className="glass-card" style={{  }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: 800, fontFamily: "'Poppins', sans-serif" }}>Project Attendance Ranking</h4>
              <p style={{ margin: '0 0 20px 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Compare attendance across different program tracks and phases.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[
                  { name: '1. Security Audit Phase 1', pct: '92%', col: '#22C55E' },
                  { name: '2. Compliance Training', pct: '88%', col: 'var(--primary)' },
                  { name: '3. Security Audit Phase 2', pct: '83%', col: '#FBBF24' }
                ].map((proj, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700 }}>
                      <span style={{ color: 'var(--text-primary)' }}>{proj.name}</span>
                      <span style={{ color: proj.col }}>{proj.pct}</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ width: proj.pct, height: '100%', background: proj.col, borderRadius: '10px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ─── TAB CONTENT: QUIZ SESSIONS ─── */}
      {activeTab === 'quiz' && (
        <div style={{ background: 'var(--bg-glass)', padding: '24px', borderRadius: '24px', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, fontFamily: "'Poppins', sans-serif" }}>Recent Quiz Sessions</h4>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Interactive analytics cards for past checks</p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}>View All</span>
              
              {/* Search filter */}
              <div style={{ display: 'flex', gap: '10px', width: '260px', background: 'var(--bg-glass)', border: '1px solid #E2E8F0', padding: '8px 14px', borderRadius: '8px', alignItems: 'center' }}>
                <Search size={16} color="#94A3B8" />
                <input 
                  type="text" 
                  placeholder="Search sessions..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ background: 'none', border: 'none', width: '100%', fontSize: '0.82rem', outline: 'none', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '20px' }}>
            {filteredReports.map((r) => (
              <div key={r.id} style={{
                background: 'var(--bg-glass)',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '220px'
              }}>
                <div>
                  {/* Badge & Options menu */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ 
                      fontSize: '0.65rem', fontWeight: 800, padding: '4px 10px', borderRadius: '12px',
                      color: '#F36F21', background: 'rgba(243, 111, 33, 0.15)', letterSpacing: '0.5px'
                    }}>
                      {r.projectName ? r.projectName.toUpperCase() : 'GENERAL'}
                    </span>
                    <button style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }} title="More options">
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                      </svg>
                    </button>
                  </div>

                  {/* Title */}
                  <h5 style={{ margin: '0 0 16px 0', fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Poppins', sans-serif", lineHeight: '1.3' }}>
                    {r.title}
                  </h5>

                  {/* Metrics rows */}
                  <div style={{ borderTop: '1px solid var(--bg-tertiary)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span>Date Hosted</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{r.date}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span>Participants</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{r.participants}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span>Avg Score</span>
                      <strong style={{ color: '#22C55E', fontWeight: 800 }}>{r.avgScore || '0%'}</strong>
                    </div>
                  </div>
                </div>

                {/* Bottom Action buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                  <button 
                    onClick={() => fetchSessionDetails(r.id)} 
                    disabled={fetchingDetails}
                    style={{ 
                      flex: 1.8, padding: '8px 12px', borderRadius: '8px', 
                      border: '1.5px solid #E2E8F0', background: 'var(--bg-glass)', 
                      color: 'var(--primary)', fontWeight: 800, fontSize: '0.78rem', 
                      cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s'
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-glass)'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-glass)'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                  >
                    View Analytics
                  </button>
                  <button 
                    onClick={() => handleDownloadSessionExcel(r.id)} 
                    style={{ 
                      padding: '8px 10px', borderRadius: '8px', 
                      border: 'none', background: 'rgba(34, 197, 94, 0.2)', 
                      color: '#16A34A', fontWeight: 800, fontSize: '0.72rem', 
                      cursor: 'pointer', display: 'flex', alignItems: 'center', 
                      justifyContent: 'center', gap: '4px', transition: 'all 0.15s' 
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = '#BBF7D0'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)'; }}
                    title="Download Excel Report"
                  >
                    <FileText size={13} /> Excel
                  </button>
                  <button 
                    onClick={() => handleDownloadSessionPPT(r.id, 'executive')} 
                    style={{ 
                      padding: '8px 10px', borderRadius: '8px', 
                      border: 'none', background: 'rgba(243, 111, 33, 0.15)', 
                      color: '#F36F21', fontWeight: 800, fontSize: '0.72rem', 
                      cursor: 'pointer', display: 'flex', alignItems: 'center', 
                      justifyContent: 'center', gap: '4px', transition: 'all 0.15s' 
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = '#FFEDD5'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(243, 111, 33, 0.15)'; }}
                    title="Download PPT Slides"
                  >
                    <Presentation size={13} /> PPT
                  </button>
                </div>
              </div>
            ))}
            {filteredReports.length === 0 && (
              <div style={{ width: '100%', padding: '48px', textAlign: 'center', color: '#94A3B8', gridColumn: '1 / -1' }}>
                No sessions found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT: ATTENDANCE ─── */}
      {activeTab === 'attendance' && (
        <div style={{ background: 'var(--bg-glass)', padding: '24px', borderRadius: '24px', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, fontFamily: "'Poppins', sans-serif" }}>Attendance Directory</h4>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Audit individual trainee login and participation records.</p>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={() => onExportExcel(attendanceSubTab === 'quiz' ? 'attendance-quiz' : 'attendance-training')} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '8px 14px' }}>
                <FileText size={14} /> Excel Export
              </button>
              <button className="btn btn-secondary" onClick={() => onExportPPT('attendance')} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '8px 14px' }}>
                <Presentation size={14} /> PPT Export
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
            {['quiz', 'training'].map(t => (
              <button key={t} onClick={() => setAttendanceSubTab(t)} style={{
                padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
                background: attendanceSubTab === t ? '#F36F21' : 'transparent',
                color: attendanceSubTab === t ? 'var(--bg-glass)' : 'var(--text-secondary)',
                transition: 'all 0.2s',
                fontFamily: "'Poppins', sans-serif"
              }}>
                {t === 'quiz' ? '🎯 Quiz Attendance' : '📚 Training Attendance'}
              </button>
            ))}
          </div>

          <div style={{ overflowX: 'auto' }}>
            {attendanceSubTab === 'quiz' ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.8px', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px' }}>Emp ID</th>
                    <th style={{ padding: '12px' }}>Name</th>
                    <th style={{ padding: '12px' }}>Role</th>
                    <th style={{ padding: '12px' }}>Project</th>
                    <th style={{ padding: '12px' }}>Dates Attended</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Quizzes</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {quizAttendance.map((e, i) => (
                    <tr key={e.userId} style={{ borderBottom: '1px solid var(--bg-tertiary)', background: i % 2 === 0 ? 'transparent' : 'rgba(37,99,235,0.01)' }}>
                      <td style={{ padding: '12px' }}><code style={{ fontSize: '0.8rem', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>{e.employeeId}</code></td>
                      <td style={{ padding: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{e.name}</td>
                      <td style={{ padding: '12px' }}><span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary)', fontWeight: 700 }}>{e.roleName}</span></td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{e.projectName}</td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{e.dates}</td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>{e.quizCount}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}><span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', background: 'rgba(34, 197, 94, 0.2)', color: '#15803D', fontWeight: 700 }}>{e.avgScore}</span></td>
                    </tr>
                  ))}
                  {quizAttendance.length === 0 && <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>No records found.</td></tr>}
                </tbody>
              </table>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.8px', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px' }}>Name</th>
                    <th style={{ padding: '12px' }}>Role</th>
                    <th style={{ padding: '12px' }}>Project</th>
                    <th style={{ padding: '12px' }}>Training Topic</th>
                    <th style={{ padding: '12px' }}>Date</th>
                    <th style={{ padding: '12px' }}>Time Spent</th>
                    <th style={{ padding: '12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trainingAttendance.map((e, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--bg-tertiary)', background: i % 2 === 0 ? 'transparent' : 'rgba(37,99,235,0.01)' }}>
                      <td style={{ padding: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{e.name}</td>
                      <td style={{ padding: '12px' }}><span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary)', fontWeight: 700 }}>{e.roleName}</span></td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{e.projectName}</td>
                      <td style={{ padding: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>{e.topic}</td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{e.date}</td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{e.timeSpent}</td>
                      <td style={{ padding: '12px' }}><span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', background: e.status === 'Completed' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.15)', color: e.status === 'Completed' ? '#15803D' : '#D97706', fontWeight: 700 }}>{e.status}</span></td>
                    </tr>
                  ))}
                  {trainingAttendance.length === 0 && <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>No records found.</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT: PROJECT USERS ─── */}
      {activeTab === 'users' && (
        <div style={{ background: 'var(--bg-glass)', padding: '24px', borderRadius: '24px', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, fontFamily: "'Poppins', sans-serif" }}>Project Members Center</h4>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Enrolled users under project track: <strong>{projectInfo ? projectInfo.name : 'All Assigned Projects'}</strong></p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '8px', width: '250px', background: 'var(--bg-glass)', border: '1px solid #E2E8F0', padding: '6px 12px', borderRadius: '10px' }}>
                <Search size={16} color="#94A3B8" style={{ marginTop: '2px' }} />
                <input 
                  type="text" 
                  placeholder="Search members..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ background: 'none', border: 'none', width: '100%', fontSize: '0.82rem', outline: 'none' }}
                />
              </div>
              <button className="btn btn-secondary" onClick={() => onExportExcel('users')} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                <FileText size={14} /> Excel Export
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.8px', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px' }}>Employee ID</th>
                  <th style={{ padding: '12px' }}>Name</th>
                  <th style={{ padding: '12px' }}>Email</th>
                  <th style={{ padding: '12px' }}>Role</th>
                  <th style={{ padding: '12px' }}>Location</th>
                  <th style={{ padding: '12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--bg-tertiary)', background: i % 2 === 0 ? 'transparent' : 'rgba(7,27,54,0.01)' }}>
                    <td style={{ padding: '12px' }}><code style={{ fontSize: '0.8rem', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>{u.employee_id || 'N/A'}</code></td>
                    <td style={{ padding: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{u.name}</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td style={{ padding: '12px' }}><span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary)', fontWeight: 700 }}>{u.Role?.role_name || 'Employee'}</span></td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{u.location || 'Pan India'}</td>
                    <td style={{ padding: '12px' }}><span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', background: u.status === 'Active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: u.status === 'Active' ? '#15803D' : '#EF4444', fontWeight: 700 }}>{u.status || 'Active'}</span></td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>No members found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT: REPORTS ─── */}
      {activeTab === 'reports' && (
        <div className="glass-card" style={{  }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, fontFamily: "'Poppins', sans-serif" }}>Reports &amp; Exports Center</h4>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Download standardized program evaluation packages and spreadsheets.</p>
            </div>
            
            {/* Search filter */}
            <div style={{ display: 'flex', gap: '10px', width: '280px', background: 'var(--bg-glass)', border: '1.5px solid #E2E8F0', padding: '8px 18px', borderRadius: '24px', alignItems: 'center' }}>
              <Search size={16} color="#94A3B8" />
              <input 
                type="text" 
                placeholder="Search topics or projects..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ background: 'none', border: 'none', width: '100%', fontSize: '0.82rem', outline: 'none', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
          
          {/* === 15-PAGE PM EXECUTIVE REPORT — FEATURED CARD === */}
          <div style={{
            marginBottom: '24px',
            padding: '28px 32px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 60%, #1D4ED8 100%)',
            border: '1.5px solid #2563EB',
            boxShadow: '0 8px 32px rgba(29, 78, 216, 0.18)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px',
            flexWrap: 'wrap'
          }}>
            <div style={{ flex: 1, minWidth: '260px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ background: 'var(--primary)', color: '#fff', fontSize: '0.68rem', fontWeight: 800, padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Featured</span>
                <span style={{ background: 'rgba(255,255,255,0.1)', color: '#93C5FD', fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>15 Pages / Sheets</span>
              </div>
              <div style={{ fontWeight: 900, fontSize: '1.15rem', color: 'var(--bg-glass)', fontFamily: "'Poppins', sans-serif", marginBottom: '6px' }}>PM Executive Report</div>
              <div style={{ fontSize: '0.82rem', color: '#93C5FD', lineHeight: '1.5' }}>Comprehensive 15-page executive report covering all sessions, attendance, KPIs, leaderboard, trainer performance, compliance, knowledge gaps &amp; action plan.</div>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
              <button
                onClick={() => onExportPMExcel && onExportPMExcel()}
                style={{ padding: '11px 22px', background: '#22C55E', color: '#fff', border: 'none', borderRadius: '28px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.18s' }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'none'}>
                <FileText size={15} /> Excel (15 Sheets)
              </button>
              <button
                onClick={() => onExportPMPPT && onExportPMPPT()}
                style={{ padding: '11px 22px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '28px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow-primary)', transition: 'all 0.18s' }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'none'}>
                <Presentation size={15} /> PPT (15 Slides)
              </button>
            </div>
          </div>

          {/* Existing report cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            {[
              { id: 'attendance', name: 'Attendance Report', desc: 'Summary of quiz participations and training sessions log.', formats: ['Excel', 'PPT'] },
              { id: 'reports', name: 'Quiz Performance Report', desc: 'Score details, averages, accuracy rankings, and time indicators.', formats: ['Excel', 'PPT'] },
              { id: 'users', name: 'Project Summary Report', desc: 'Overview of team status, profiles, and geographical location mappings.', formats: ['Excel'] },
              { id: 'trainers', name: 'Trainer Effectiveness Report', desc: 'Details sessions conducted, ratings, and course ratings.', formats: ['Excel'] },
              { id: 'compliance', name: 'Compliance Report', desc: 'Compliance status donut percentages, completed vs pending modules.', formats: ['Excel'] }
            ].map((rep, idx) => (
              <div key={idx} style={{
                padding: '24px', border: '1px solid #E2E8F0', borderRadius: '20px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'var(--bg-glass)' }}>
                <div style={{ paddingRight: '12px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-primary)', fontFamily: "'Poppins', sans-serif" }}>{rep.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>{rep.desc}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                  {rep.formats.includes('Excel') && (
                    <button onClick={() => onExportExcel(rep.id === 'reports' ? 'reports' : rep.id === 'attendance' ? 'attendance-quiz' : rep.id)} style={{
                      padding: '8px 16px', background: '#22C55E', color: 'var(--bg-glass)', border: 'none',
                      borderRadius: '24px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
                      justifyContent: 'center', transition: 'all 0.15s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#16A34A'}
                    onMouseOut={e => e.currentTarget.style.background = '#22C55E'}>
                      <FileText size={14} /> Excel
                    </button>
                  )}
                  {rep.formats.includes('PPT') && (
                    <button onClick={() => onExportPPT(rep.id)} style={{
                      padding: '8px 16px', background: 'var(--primary)', color: 'var(--bg-glass)', border: 'none',
                      borderRadius: '24px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
                      justifyContent: 'center', transition: 'all 0.15s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--primary)'}
                    onMouseOut={e => e.currentTarget.style.background = 'var(--primary)'}>
                      <Presentation size={14} /> PPT
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Topic-Wise Data Table Section */}
          <hr style={{ margin: '32px 0 24px 0', border: 'none', borderTop: '1.5px solid #E2E8F0' }} />
          
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, fontFamily: "'Poppins', sans-serif" }}>Topic-Wise Performance Analytics</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Trainee score results and session participation counts aggregated by training quiz topics.</p>
              </div>
              {searchQuery && (
                <span style={{ fontSize: '0.72rem', background: 'rgba(243, 111, 33, 0.15)', color: '#F36F21', padding: '4px 10px', borderRadius: '6px', fontWeight: 700 }}>
                  Filtering results: "{searchQuery}"
                </span>
              )}
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-glass)', borderBottom: '2px solid #E2E8F0', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.8px', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '14px 16px' }}>Learning Topic / Quiz</th>
                    <th style={{ padding: '14px 16px' }}>Project Scope</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center' }}>Sessions Run</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center' }}>Trainees Evaluated</th>
                    <th style={{ padding: '14px 16px' }}>Average Topic Score</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Latest Evaluation</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const topicGroups = {};
                    filteredReports.forEach(r => {
                      const topic = r.title || 'General Topic';
                      if (!topicGroups[topic]) {
                        topicGroups[topic] = {
                          topic: topic,
                          projectName: r.projectName,
                          sessionsCount: 0,
                          totalParticipants: 0,
                          sumScore: 0,
                          scoreCount: 0,
                          latestDate: r.date
                        };
                      }
                      const group = topicGroups[topic];
                      group.sessionsCount += 1;
                      group.totalParticipants += parseInt(r.participants) || 0;
                      const scoreVal = parseFloat(r.avgScore) || 0;
                      if (scoreVal > 0) {
                        group.sumScore += scoreVal;
                        group.scoreCount += 1;
                      }
                      if (new Date(r.date) > new Date(group.latestDate)) {
                        group.latestDate = r.date;
                      }
                    });

                    const topicsList = Object.values(topicGroups).map(g => {
                      const avgScore = g.scoreCount > 0 ? Math.round(g.sumScore / g.scoreCount) : 80;
                      return {
                        topic: g.topic,
                        projectName: g.projectName || 'General',
                        sessionsCount: g.sessionsCount,
                        totalParticipants: g.totalParticipants,
                        avgScore: `${avgScore}%`,
                        latestDate: g.latestDate
                      };
                    });

                    if (topicsList.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>
                            No topic analytics found matching search criteria.
                          </td>
                        </tr>
                      );
                    }

                    return topicsList.map((t, idx) => {
                      const scoreInt = parseInt(t.avgScore) || 0;
                      const barColor = scoreInt >= 90 ? '#22C55E' : scoreInt >= 75 ? '#F97316' : '#EF4444';
                      
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--bg-tertiary)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background='rgba(243,111,33,0.01)'} onMouseOut={e => e.currentTarget.style.background='none'}>
                          <td style={{ padding: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '1.1rem' }}>📘</span>
                              <span>{t.topic}</span>
                            </div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.72rem', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary)', fontWeight: 700 }}>
                              {t.projectName}
                            </span>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center', fontWeight: 600 }}>{t.sessionsCount}</td>
                          <td style={{ padding: '16px', textAlign: 'center', fontWeight: 600 }}>{t.totalParticipants}</td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '120px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                                <span>{t.avgScore}</span>
                              </div>
                              <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: t.avgScore, height: '100%', background: barColor, borderRadius: '3px' }} />
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600 }}>{t.latestDate}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT: AUDIT LOGS ─── */}
      {activeTab === 'audit' && (
        <div style={{ background: 'var(--bg-glass)', padding: '24px', borderRadius: '24px', border: '1px solid #E2E8F0' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: 800, fontFamily: "'Poppins', sans-serif" }}>System Audit Trail</h4>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Trace data integrity, downloads, logins, and operational status logs.</p>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.8px', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px' }}>Timestamp</th>
                  <th style={{ padding: '12px' }}>User</th>
                  <th style={{ padding: '12px' }}>Action Event</th>
                  <th style={{ padding: '12px' }}>Project/Scope</th>
                  <th style={{ padding: '12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { time: '05 Jun 2026 12:05 PM', user: 'Demo Program Manager', action: 'Report Downloaded', scope: 'Security Audit Phase 1', status: 'Success' },
                  { time: '05 Jun 2026 11:45 AM', user: 'Rajiv Sharma (Trainer)', action: 'Attendance Update', scope: 'Security Audit Phase 1', status: 'Success' },
                  { time: '05 Jun 2026 10:15 AM', user: 'Amit Kumar', action: 'Quiz Session Completed', scope: 'Security Audit Phase 2', status: 'Success' },
                  { time: '04 Jun 2026 04:30 PM', user: 'System Agent', action: 'Certificate Issued', scope: 'Compliance Training', status: 'Success' },
                  { time: '04 Jun 2026 02:00 PM', user: 'Demo Program Manager', action: 'New Subproject Created', scope: 'Safety & Compliance', status: 'Success' }
                ].map((log, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--bg-tertiary)' }}>
                    <td style={{ padding: '12px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{log.time}</td>
                    <td style={{ padding: '12px', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{log.user}</td>
                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--primary)', fontSize: '0.85rem' }}>{log.action}</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{log.scope}</td>
                    <td style={{ padding: '12px' }}><span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', background: 'rgba(34, 197, 94, 0.2)', color: '#15803D', fontWeight: 800 }}>{log.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
