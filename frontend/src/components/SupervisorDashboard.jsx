import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, BarChart2, Award, Calendar, CheckCircle, Clock, TrendingUp,
  AlertCircle, FileText, Presentation, Download, Star, AlertTriangle,
  MessageSquare, Bell, ClipboardList, Trophy, UserCheck, ChevronRight,
  Plus, Trash2, Shield, Activity, Target, Zap
} from 'lucide-react';

const NAVY = '#0F172A';
const ORANGE = '#3E5C8A';
const BLUE = '#38BDF8';
const GREEN = '#3B8C68';
const AMBER = '#F59E0B';
const RED = '#EF4444';
const BG = '#F4F5F7';
const CARD = '#FFFFFF';
const TEXT = '#1E293B';
const MUTED = '#5F6875';
const BORDER = '#B7BEC7';

export default function SupervisorDashboard({
  projectUsers = [],
  projectsList = [],
  reports = [],
  attendanceData = {},
  onExportExcel,
  onExportPPT,
  selectedProjectId = 'all',
}) {
  const [activeTab, setActiveTab] = useState('home');
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [newTaskType, setNewTaskType] = useState('Training Task');
  const [newTaskPriority, setNewTaskPriority] = useState('Medium');
  const [annMsg, setAnnMsg] = useState('');
  const [annSent, setAnnSent] = useState(false);

  // ── Load tasks from localStorage ─────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(`sv_tasks_${selectedProjectId}`);
    if (saved) {
      try {
        setTasks(JSON.parse(saved) || []);
      } catch {
        setTasks(getDefaultTasks());
      }
    } else {
      const defaults = getDefaultTasks();
      setTasks(defaults);
      localStorage.setItem(`sv_tasks_${selectedProjectId}`, JSON.stringify(defaults));
    }
  }, [selectedProjectId]);

  const getDefaultTasks = () => [
    { id: 1, text: 'Complete Product Training Module 3 — Rahul, Priya, Amit', type: 'Training Task', priority: 'High', status: 'Pending' },
    { id: 2, text: 'Schedule Refresher Quiz for East Zone team members', type: 'Assessment', priority: 'Medium', status: 'In Progress' },
    { id: 3, text: 'Submit weekly attendance report to Program Manager', type: 'Field Activity', priority: 'High', status: 'Pending' },
    { id: 4, text: 'Follow up with inactive learners — Sunita, Karan, Deepa', type: 'Refresher Course', priority: 'Medium', status: 'Escalated' },
  ];

  const saveTasks = (updated) => {
    setTasks(updated);
    localStorage.setItem(`sv_tasks_${selectedProjectId}`, JSON.stringify(updated));
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    const updated = [{ id: Date.now(), text: newTask.trim(), type: newTaskType, priority: newTaskPriority, status: 'Pending' }, ...tasks];
    saveTasks(updated);
    setNewTask('');
  };

  const handleStatusChange = (id, status) => saveTasks(tasks.map(t => t.id === id ? { ...t, status } : t));
  const handleDeleteTask = (id) => saveTasks(tasks.filter(t => t.id !== id));

  // ── Derived metrics ──────────────────────────────────────────────────
  const quizAttendance = attendanceData?.quizAttendance || [];
  const trainingAttendance = attendanceData?.trainingAttendance || [];
  const completedSessions = reports.filter(r => r.participants > 0);

  const teamSize = projectUsers.length || 24;
  const activeLearners = projectUsers.filter(u => u.status === 'Active').length || Math.round(teamSize * 0.88);
  const avgScore = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((s, r) => s + parseFloat(r.avgScore || 0), 0) / completedSessions.length)
    : 79;
  const certifiedCount = quizAttendance.filter(qa => (parseInt(qa.avgScore) || 0) >= 60).length || Math.round(teamSize * 0.71);
  const certPct = teamSize > 0 ? Math.round((certifiedCount / teamSize) * 100) : 71;
  const completionPct = avgScore;
  const attendancePct = quizAttendance.length > 0 ? Math.min(100, Math.round((quizAttendance.length / Math.max(1, teamSize)) * 100)) : 85;
  const pendingTrainings = Math.max(0, teamSize - quizAttendance.length) || 4;
  const productivityScore = Math.min(100, Math.round((completionPct * 0.4) + (certPct * 0.3) + (attendancePct * 0.3)));

  // ── Sorted performers ────────────────────────────────────────────────
  const sortedByScore = [...quizAttendance].sort((a, b) => (parseInt(b.avgScore) || 0) - (parseInt(a.avgScore) || 0));
  const topPerformers = sortedByScore.slice(0, 5);
  const lowPerformers = sortedByScore.filter(qa => (parseInt(qa.avgScore) || 0) < 60).slice(-3).reverse();
  const inactiveLearners = projectUsers.filter(u => u.status !== 'Active').slice(0, 3);

  // ── Attendance weekly data (simulated) ───────────────────────────────
  const weeklyAttendance = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => ({
    day,
    pct: [92, 88, 95, 85, 90, 72][i]
  }));

  // ── Donut chart calculations ─────────────────────────────────────────
  const r = 40, circ = 2 * Math.PI * r;
  const certOffset = circ - (certPct / 100) * circ;

  const badge = (color) => ({
    padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700,
    background: `${color}15`, color, border: `1px solid ${color}30`
  });

  const card = (children, style = {}) => (
    <div style={{ background: CARD, borderRadius: '16px', padding: '20px', boxShadow: '0 2px 12px rgba(15,23,42,0.05)', border: `1px solid ${BORDER}`, ...style }}>
      {children}
    </div>
  );

  const statusColor = (s) => s === 'Completed' ? GREEN : s === 'In Progress' ? BLUE : s === 'Escalated' ? RED : AMBER;
  const priorityColor = (p) => p === 'High' ? RED : p === 'Medium' ? AMBER : GREEN;

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}>

      {/* ── Tab Navigation ───────────────────────────────────────────── */}
      <div style={{
        display: 'flex', borderBottom: `2px solid ${BORDER}`, marginBottom: '24px',
        background: CARD, borderRadius: '16px 16px 0 0', padding: '0 20px',
        boxShadow: '0 2px 8px rgba(15,23,42,0.04)', overflowX: 'auto', gap: '4px'
      }}>
        {[
          { id: 'home', label: '🏠 Team Overview' },
          { id: 'attendance', label: '📅 Attendance' },
          { id: 'certs', label: '🏆 Certs & Quizzes' },
          { id: 'employees', label: '👤 Employee Monitoring' },
          { id: 'tasks', label: '✅ Task Assignment' },
          { id: 'reports', label: '📋 Reports' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '14px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap',
            color: activeTab === tab.id ? ORANGE : MUTED,
            borderBottom: activeTab === tab.id ? `3px solid ${ORANGE}` : '3px solid transparent',
            marginBottom: '-2px', transition: 'all 0.2s',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB: TEAM OVERVIEW (HOME)                                     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'home' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            {[
              { label: 'Team Members', val: teamSize, color: NAVY, icon: <Users size={20} /> },
              { label: 'Active Learners', val: activeLearners, color: GREEN, icon: <UserCheck size={20} /> },
              { label: 'Completion %', val: `${completionPct}%`, color: ORANGE, icon: <CheckCircle size={20} /> },
              { label: 'Avg Quiz Score', val: `${avgScore}%`, color: BLUE, icon: <BarChart2 size={20} /> },
              { label: 'Certification %', val: `${certPct}%`, color: GREEN, icon: <Award size={20} /> },
              { label: 'Attendance %', val: `${attendancePct}%`, color: AMBER, icon: <Calendar size={20} /> },
              { label: 'Pending Trainings', val: pendingTrainings, color: RED, icon: <AlertCircle size={20} /> },
              { label: 'Productivity Score', val: `${productivityScore}/100`, color: NAVY, icon: <Zap size={20} /> },
            ].map((c, i) => (
              <div key={i} style={{
                background: CARD, padding: '16px 18px', borderRadius: '14px',
                boxShadow: '0 2px 10px rgba(15,23,42,0.06)', borderTop: `4px solid ${c.color}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'transform 0.18s',
              }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'none'}
              >
                <div>
                  <div style={{ fontSize: '0.7rem', color: MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c.label}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: NAVY, fontFamily: 'Poppins, sans-serif', marginTop: '4px' }}>{c.val}</div>
                </div>
                <div style={{ color: c.color, background: `${c.color}12`, width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {c.icon}
                </div>
              </div>
            ))}
          </div>

          {/* Team Scoreboard + Training status */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '20px' }}>

            {/* Team Scoreboard */}
            {card(
              <>
                <h4 style={{ margin: '0 0 16px 0', fontWeight: 800, color: NAVY, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Trophy size={18} color={AMBER} /> Team Performance Scoreboard
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(topPerformers.length > 0 ? topPerformers : [
                    { name: 'Rahul Singh', avgScore: '94', projectName: 'North Zone' },
                    { name: 'Priya Rao', avgScore: '91', projectName: 'South Zone' },
                    { name: 'Amit Kapoor', avgScore: '88', projectName: 'West Zone' },
                    { name: 'Sunita Das', avgScore: '85', projectName: 'East Zone' },
                    { name: 'Vivek Nair', avgScore: '82', projectName: 'North Zone' },
                  ]).map((p, idx) => (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px',
                      background: idx === 0 ? `${AMBER}10` : BG, borderRadius: '10px',
                      border: `1px solid ${idx === 0 ? AMBER : BORDER}`, borderLeft: `3px solid ${[AMBER, BLUE, GREEN, ORANGE, NAVY][idx]}`
                    }}>
                      <span style={{
                        width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: idx === 0 ? AMBER : BORDER, color: idx === 0 ? '#fff' : MUTED, fontSize: '0.75rem', fontWeight: 900, flexShrink: 0
                      }}>
                        #{idx + 1}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: NAVY }}>{p.name}</div>
                        <div style={{ fontSize: '0.7rem', color: MUTED }}>{p.projectName || 'Zone'}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '1rem', fontWeight: 900, color: GREEN }}>{p.avgScore}%</span>
                      </div>
                      <span style={badge(p.avgScore >= 80 ? GREEN : p.avgScore >= 60 ? AMBER : RED)}>
                        {p.avgScore >= 80 ? 'Certified' : p.avgScore >= 60 ? 'In Progress' : 'At Risk'}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Training Status */}
            {card(
              <>
                <h4 style={{ margin: '0 0 16px 0', fontWeight: 800, color: NAVY, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClipboardList size={18} color={BLUE} /> Training Progress Status
                </h4>
                {[
                  { label: 'Assigned', count: teamSize, color: NAVY },
                  { label: 'In Progress', count: Math.round(teamSize * 0.32), color: BLUE },
                  { label: 'Completed', count: quizAttendance.length || Math.round(teamSize * 0.78), color: GREEN },
                  { label: 'Overdue', count: pendingTrainings, color: RED },
                ].map((s, i) => (
                  <div key={i} style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, marginBottom: '5px' }}>
                      <span style={{ color: TEXT }}>{s.label}</span>
                      <span style={{ color: s.color }}>{s.count}</span>
                    </div>
                    <div style={{ height: '8px', background: BORDER, borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, (s.count / teamSize) * 100)}%`, background: s.color, borderRadius: '4px', transition: 'width 0.7s' }} />
                    </div>
                  </div>
                ))}

                {/* Escalation Alert Panel */}
                <div style={{ marginTop: '16px', padding: '12px 14px', background: `${ORANGE}08`, borderRadius: '10px', border: `1px solid ${ORANGE}30`, borderLeft: `4px solid ${ORANGE}` }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: ORANGE, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={14} /> Escalation Alerts
                  </div>
                  <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '0.75rem', color: TEXT, lineHeight: '1.7' }}>
                    <li>{pendingTrainings} members have missed mandatory training deadlines.</li>
                    <li>{Math.round(teamSize * 0.08)} certifications expire in the next 30 days.</li>
                    <li>Quiz pass rate dropped 5% compared to last month.</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB: ATTENDANCE                                               */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'attendance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Attendance Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '14px' }}>
            {[
              { label: 'Today Present', val: Math.round(teamSize * 0.92), total: teamSize, color: GREEN },
              { label: 'This Week Avg', val: `${attendancePct}%`, total: null, color: BLUE },
              { label: 'This Month Avg', val: `${Math.round(attendancePct * 0.95)}%`, total: null, color: ORANGE },
              { label: 'Absent Today', val: Math.round(teamSize * 0.08), total: null, color: RED },
            ].map((s, i) => (
              <div key={i} style={{ background: CARD, padding: '16px', borderRadius: '14px', border: `1px solid ${BORDER}`, borderTop: `4px solid ${s.color}` }}>
                <div style={{ fontSize: '0.72rem', color: MUTED, fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: s.color, marginTop: '6px', fontFamily: 'Poppins, sans-serif' }}>
                  {s.val}{s.total ? ` / ${s.total}` : ''}
                </div>
              </div>
            ))}
          </div>

          {/* Attendance Trend Chart */}
          {card(
            <>
              <h4 style={{ margin: '0 0 16px 0', fontWeight: 800, color: NAVY }}>
                <Activity size={16} style={{ marginRight: '8px', color: BLUE }} />
                Weekly Attendance Trend
              </h4>
              <svg viewBox="0 0 420 140" style={{ width: '100%', height: '140px' }}>
                {[0, 25, 50, 75, 100].map((pct, i) => {
                  const y = 120 - pct * 1.1;
                  return <line key={i} x1="30" y1={y} x2="410" y2={y} stroke={BORDER} strokeWidth="1" strokeDasharray="3,3" />;
                })}
                {weeklyAttendance.map((d, i) => {
                  const x = 50 + i * 64;
                  const barH = d.pct * 1.1;
                  const y = 120 - barH;
                  const col = d.pct >= 90 ? GREEN : d.pct >= 75 ? BLUE : AMBER;
                  return (
                    <g key={i}>
                      <rect x={x - 20} y={y} width="40" height={barH} rx="6" fill={`${col}AA`} />
                      <text x={x} y={y - 6} fill={NAVY} fontSize="10" fontWeight="800" textAnchor="middle">{d.pct}%</text>
                      <text x={x} y="133" fill={MUTED} fontSize="10" fontWeight="600" textAnchor="middle">{d.day}</text>
                    </g>
                  );
                })}
              </svg>
            </>
          )}

          {/* Absent Employees */}
          {card(
            <>
              <h4 style={{ margin: '0 0 14px 0', fontWeight: 800, color: NAVY }}>
                <AlertCircle size={16} style={{ marginRight: '8px', color: RED }} />
                Absent / Non-Compliant Employees
              </h4>
              {[
                { name: 'Deepa Menon', date: 'Today', zone: 'South', reason: 'No login' },
                { name: 'Karan Joshi', date: 'Today', zone: 'East', reason: 'No training' },
                ...(inactiveLearners.map(u => ({ name: u.name, date: 'This week', zone: u.location || 'N/A', reason: 'Inactive' })))
              ].map((e, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: BG, borderRadius: '8px', marginBottom: '6px', border: `1px solid ${BORDER}`, borderLeft: `3px solid ${RED}` }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: NAVY }}>{e.name}</div>
                    <div style={{ fontSize: '0.72rem', color: MUTED }}>{e.zone} Zone · {e.reason}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={badge(AMBER)}>{e.date}</span>
                    <button style={{ padding: '5px 10px', borderRadius: '6px', background: `${ORANGE}10`, border: `1px solid ${ORANGE}30`, color: ORANGE, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                      Remind
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB: CERTIFICATIONS & QUIZ                                    */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'certs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '20px' }}>

            {/* Donut Chart */}
            {card(
              <>
                <h4 style={{ margin: '0 0 16px 0', fontWeight: 800, color: NAVY }}>Certification Status</h4>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: '160px', height: '160px' }}>
                    <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                      <circle cx="50" cy="50" r={r} fill="transparent" stroke={BORDER} strokeWidth="12" />
                      <circle cx="50" cy="50" r={r} fill="transparent" stroke={GREEN} strokeWidth="12"
                        strokeDasharray={circ} strokeDashoffset={certOffset} strokeLinecap="round" />
                    </svg>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '1.8rem', fontWeight: 900, color: NAVY, fontFamily: 'Poppins, sans-serif' }}>{certPct}%</span>
                      <span style={{ fontSize: '0.65rem', color: MUTED, fontWeight: 700, textTransform: 'uppercase' }}>Certified</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '14px', marginTop: '16px', fontSize: '0.78rem' }}>
                    {[{ label: `Certified (${certifiedCount})`, color: GREEN }, { label: `Pending (${teamSize - certifiedCount})`, color: BORDER }].map((l, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: l.color }} />
                        <span style={{ color: TEXT }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '16px', width: '100%' }}>
                    <div style={{ padding: '10px', background: `${AMBER}10`, border: `1px solid ${AMBER}30`, borderRadius: '8px', fontSize: '0.78rem', color: TEXT, textAlign: 'center' }}>
                      ⚠️ <strong>{Math.round(certifiedCount * 0.08)}</strong> certifications expiring within 30 days
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Quiz Performance Table + Leaderboard */}
            {card(
              <>
                <h4 style={{ margin: '0 0 14px 0', fontWeight: 800, color: NAVY, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Trophy size={18} color={AMBER} /> Quiz Performance & Leaderboard
                </h4>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '10px', marginBottom: '16px' }}>
                  {[
                    { label: 'Participated', val: quizAttendance.length || Math.round(teamSize * 0.82), color: BLUE },
                    { label: 'Pass Rate', val: `${certPct}%`, color: GREEN },
                    { label: 'Avg Score', val: `${avgScore}%`, color: ORANGE },
                    { label: 'Sessions', val: reports.length || 12, color: NAVY },
                  ].map((s, i) => (
                    <div key={i} style={{ padding: '10px', background: BG, borderRadius: '8px', border: `1px solid ${BORDER}`, textAlign: 'center' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: s.color }}>{s.val}</div>
                      <div style={{ fontSize: '0.68rem', color: MUTED, fontWeight: 600, marginTop: '2px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Leaderboard */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(topPerformers.length > 0 ? topPerformers : [
                    { name: 'Rahul Singh', avgScore: '94', projectName: 'North' },
                    { name: 'Priya Rao', avgScore: '91', projectName: 'South' },
                    { name: 'Amit Kapoor', avgScore: '88', projectName: 'West' },
                    { name: 'Sunita Das', avgScore: '85', projectName: 'East' },
                    { name: 'Vivek Nair', avgScore: '82', projectName: 'North' },
                  ]).map((p, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: idx === 0 ? `${AMBER}10` : BG, borderRadius: '8px', border: `1px solid ${idx === 0 ? AMBER : BORDER}` }}>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: [AMBER, '#C0C0C0', '#CD7F32', BORDER, BORDER][idx], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 900, flexShrink: 0 }}>
                        {idx + 1}
                      </span>
                      <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 700, color: NAVY }}>{p.name}</span>
                      <span style={{ fontSize: '0.75rem', color: MUTED }}>{p.projectName}</span>
                      <span style={{ fontWeight: 900, color: GREEN, fontSize: '0.9rem' }}>{p.avgScore}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB: EMPLOYEE MONITORING                                      */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'employees' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '20px' }}>

          {/* Top Performers */}
          {card(
            <>
              <h4 style={{ margin: '0 0 14px 0', fontWeight: 800, color: NAVY, display: 'flex', alignItems: 'center', gap: '8px' }}>
                🏆 Top Performers
              </h4>
              {(topPerformers.length > 0 ? topPerformers : [
                { name: 'Rahul Singh', avgScore: '94', projectName: 'North', employeeId: 'EMP001' },
                { name: 'Priya Rao', avgScore: '91', projectName: 'South', employeeId: 'EMP002' },
                { name: 'Amit Kapoor', avgScore: '88', projectName: 'West', employeeId: 'EMP003' },
                { name: 'Sunita Das', avgScore: '85', projectName: 'East', employeeId: 'EMP004' },
                { name: 'Vivek Nair', avgScore: '82', projectName: 'North', employeeId: 'EMP005' },
              ]).map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: BG, borderRadius: '8px', marginBottom: '6px', border: `1px solid ${BORDER}`, borderLeft: `3px solid ${GREEN}` }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: NAVY }}>{p.name}</div>
                    <div style={{ fontSize: '0.7rem', color: MUTED }}>ID: {p.employeeId} · {p.projectName}</div>
                  </div>
                  <span style={{ fontWeight: 900, color: GREEN, fontSize: '0.9rem' }}>{p.avgScore}%</span>
                </div>
              ))}
            </>
          )}

          {/* At-Risk / Low Performers */}
          {card(
            <>
              <h4 style={{ margin: '0 0 14px 0', fontWeight: 800, color: NAVY, display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚠️ At-Risk Employees
              </h4>
              <p style={{ fontSize: '0.75rem', color: MUTED, margin: '-6px 0 12px 0' }}>Scoring below 60% or inactive for 7+ days</p>
              {(lowPerformers.length > 0 ? lowPerformers : [
                { name: 'Deepa Menon', avgScore: '42', employeeId: 'EMP018', projectName: 'South' },
                { name: 'Karan Joshi', avgScore: '55', employeeId: 'EMP024', projectName: 'East' },
                { name: 'Leena Shah', avgScore: '38', employeeId: 'EMP031', projectName: 'West' },
              ]).map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: `${RED}06`, borderRadius: '8px', marginBottom: '6px', border: `1px solid ${RED}20`, borderLeft: `3px solid ${RED}` }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: NAVY }}>{p.name}</div>
                    <div style={{ fontSize: '0.7rem', color: MUTED }}>ID: {p.employeeId} · {p.projectName}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 900, color: RED }}>{p.avgScore}%</span>
                    <button style={{ padding: '4px 8px', borderRadius: '6px', background: `${ORANGE}10`, border: `1px solid ${ORANGE}30`, color: ORANGE, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
                      Assign Refresher
                    </button>
                  </div>
                </div>
              ))}
              {lowPerformers.length === 0 && projectUsers.length > 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: GREEN, fontSize: '0.85rem', fontWeight: 700 }}>
                  <CheckCircle size={24} style={{ display: 'block', margin: '0 auto 8px' }} />
                  All team members are above the 60% threshold!
                </div>
              )}

              {/* Inactive Learners */}
              <h5 style={{ margin: '16px 0 10px 0', fontWeight: 800, color: NAVY, fontSize: '0.85rem' }}>Inactive Learners</h5>
              {(inactiveLearners.length > 0 ? inactiveLearners : [
                { name: 'Rohit Patel', location: 'West', id: 'EMP042' },
              ]).map((u, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: BG, borderRadius: '8px', marginBottom: '4px', border: `1px solid ${BORDER}` }}>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: TEXT }}>{u.name}</div>
                    <div style={{ fontSize: '0.7rem', color: MUTED }}>{u.location || u.employee_id}</div>
                  </div>
                  <span style={badge(MUTED)}>Inactive</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB: TASK ASSIGNMENT                                          */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Add Task Form */}
          {card(
            <>
              <h4 style={{ margin: '0 0 14px 0', fontWeight: 800, color: NAVY, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={16} color={ORANGE} /> Assign New Task
              </h4>
              <form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  value={newTask}
                  onChange={e => setNewTask(e.target.value)}
                  placeholder="Task description (e.g. Assign Module 4 training to East Zone team)..."
                  style={{ padding: '10px 14px', borderRadius: '10px', border: `1px solid ${BORDER}`, fontSize: '0.85rem', color: TEXT, background: BG, outline: 'none' }}
                />
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <select value={newTaskType} onChange={e => setNewTaskType(e.target.value)} style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: `1px solid ${BORDER}`, background: CARD, fontSize: '0.85rem', color: TEXT }}>
                    {['Training Task', 'Assessment', 'Refresher Course', 'Field Activity'].map(t => <option key={t}>{t}</option>)}
                  </select>
                  <select value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value)} style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: `1px solid ${BORDER}`, background: CARD, fontSize: '0.85rem', color: TEXT }}>
                    {['High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
                  </select>
                  <button type="submit" style={{ padding: '9px 20px', borderRadius: '8px', background: ORANGE, color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                    Add Task
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Task Board */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '14px' }}>
            {['Pending', 'In Progress', 'Completed', 'Escalated'].map(col => (
              <div key={col} style={{ background: BG, borderRadius: '12px', padding: '14px', border: `1px solid ${BORDER}` }}>
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: statusColor(col), marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor(col), display: 'inline-block' }} />
                  {col} ({tasks.filter(t => t.status === col).length})
                </div>
                {tasks.filter(t => t.status === col).map(task => (
                  <div key={task.id} style={{ padding: '10px', background: CARD, borderRadius: '8px', marginBottom: '8px', border: `1px solid ${BORDER}`, borderLeft: `3px solid ${priorityColor(task.priority)}` }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: NAVY, lineHeight: '1.4', marginBottom: '8px' }}>{task.text}</div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      <span style={badge(priorityColor(task.priority))}>{task.priority}</span>
                      <span style={badge(BLUE)}>{task.type}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {['Pending', 'In Progress', 'Completed', 'Escalated'].filter(s => s !== col).map(s => (
                        <button key={s} onClick={() => handleStatusChange(task.id, s)} style={{
                          padding: '3px 7px', borderRadius: '5px', border: `1px solid ${BORDER}`, background: CARD,
                          cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700, color: statusColor(s)
                        }}>→ {s}</button>
                      ))}
                      <button onClick={() => handleDeleteTask(task.id)} style={{ padding: '3px 7px', borderRadius: '5px', border: `1px solid ${RED}30`, background: `${RED}10`, cursor: 'pointer', fontSize: '0.65rem', color: RED }}>
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                ))}
                {tasks.filter(t => t.status === col).length === 0 && (
                  <div style={{ textAlign: 'center', fontSize: '0.75rem', color: MUTED, padding: '12px', fontStyle: 'italic' }}>No tasks</div>
                )}
              </div>
            ))}
          </div>

          {/* Team Communication */}
          {card(
            <>
              <h4 style={{ margin: '0 0 12px 0', fontWeight: 800, color: NAVY, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={16} color={BLUE} /> Team Communication Center
              </h4>
              <textarea
                value={annMsg}
                onChange={e => setAnnMsg(e.target.value)}
                placeholder="Write a team announcement, training reminder, or notification..."
                rows={3}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${BORDER}`, fontSize: '0.85rem', color: TEXT, background: BG, resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: '10px' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                {[{ label: '📣 Team Announcement', color: ORANGE }, { label: '📱 Training Reminder', color: BLUE }, { label: '🎉 Event Notification', color: GREEN }].map((btn, i) => (
                  <button key={i} onClick={() => { setAnnSent(true); setTimeout(() => { setAnnSent(false); setAnnMsg(''); }, 2500); }} style={{
                    flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${btn.color}30`,
                    background: `${btn.color}10`, color: btn.color, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer'
                  }}>
                    {btn.label}
                  </button>
                ))}
              </div>
              {annSent && <div style={{ marginTop: '10px', padding: '8px 12px', background: `${GREEN}10`, border: `1px solid ${GREEN}30`, borderRadius: '8px', color: GREEN, fontSize: '0.82rem', fontWeight: 700 }}>✓ Message sent to team!</div>}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB: REPORTS                                                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {card(
            <>
              <h4 style={{ margin: '0 0 16px 0', fontWeight: 800, color: NAVY, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download size={16} color={ORANGE} /> Team Reports Center
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                {[
                  { title: 'Team Training Report', desc: 'Completion status and progress for all assigned courses.', type: 'reports' },
                  { title: 'Attendance Report', desc: 'Daily, weekly, and monthly attendance records.', type: 'attendance-quiz' },
                  { title: 'Certification Report', desc: 'Certified, pending, and expiring certification status.', type: 'reports' },
                  { title: 'Quiz Performance Report', desc: 'Quiz scores, pass rates, and leaderboard rankings.', type: 'attendance-quiz' },
                ].map((r, i) => (
                  <div key={i} style={{ padding: '16px', background: BG, borderRadius: '12px', border: `1px solid ${BORDER}` }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: NAVY, marginBottom: '6px' }}>{r.title}</div>
                    <div style={{ fontSize: '0.75rem', color: MUTED, marginBottom: '14px', lineHeight: '1.4' }}>{r.desc}</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => onExportExcel && onExportExcel(r.type)} style={{ padding: '5px 10px', borderRadius: '6px', background: NAVY, color: '#fff', border: 'none', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FileText size={11} /> Excel
                      </button>
                      <button onClick={() => onExportPPT && onExportPPT(r.type)} style={{ padding: '5px 10px', borderRadius: '6px', background: ORANGE, color: '#fff', border: 'none', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Presentation size={11} /> PPT
                      </button>
                      <span style={badge(BLUE)}>PDF</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Supervisor Permissions Note */}
          {card(
            <>
              <h4 style={{ margin: '0 0 14px 0', fontWeight: 800, color: NAVY, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} color={BLUE} /> Supervisor Access Permissions
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '12px' }}>
                {[
                  { items: ['✅ View Team Data', '✅ Assign Training Tasks', '✅ Track Team Progress', '✅ View Team Reports', '✅ Monitor Certifications', '✅ Send Team Announcements'], label: 'Allowed', color: GREEN },
                  { items: ['❌ Create New Projects', '❌ Manage LMS Settings', '❌ Create Courses or Quizzes', '❌ Manage Other Teams', '❌ Access Admin Panel', '❌ Bulk Upload Users'], label: 'Restricted', color: RED },
                ].map((s, i) => (
                  <div key={i} style={{ padding: '14px', background: `${s.color}08`, borderRadius: '10px', border: `1px solid ${s.color}20` }}>
                    <div style={{ fontWeight: 800, color: s.color, fontSize: '0.82rem', marginBottom: '10px' }}>{s.label}</div>
                    {s.items.map((item, j) => (
                      <div key={j} style={{ fontSize: '0.78rem', color: TEXT, marginBottom: '5px' }}>{item}</div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
