import React, { useEffect, useState, useContext } from 'react';
import { Trophy, Star, Zap, Clock, Award, Target, TrendingUp, Shield } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const LEVELS = [
  { name: 'Bronze',       min: 0,    max: 200,  color: '#CD7F32', icon: '🥉' },
  { name: 'Silver',       min: 200,  max: 500,  color: '#C0C0C0', icon: '🥈' },
  { name: 'Gold',         min: 500,  max: 1000, color: '#FFD700', icon: '🥇' },
  { name: 'Platinum',     min: 1000, max: 2000, color: '#2EA8FF', icon: '💎' },
  { name: 'Arena Master', min: 2000, max: 5000, color: '#FF6B35', icon: '🏆' },
];

export default function Gamification() {
  const { token } = useContext(AuthContext);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [selectedProject, setSelectedProject] = useState('All');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('/api/reports/attendance', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAttendance(res.data);
      } catch (err) {
        console.error("Failed to load attendance summary", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const quizLogs = (attendance && attendance.isEmployee) ? attendance.logs : [];
  const trainingLogs = (attendance && attendance.isEmployee) ? attendance.trainingLogs : [];

  const userProjects = [...new Set([
    ...quizLogs.map(l => l.projectName),
    ...trainingLogs.map(l => l.projectName)
  ])].filter(Boolean);

  const isDemoMode = quizLogs.length === 0 && trainingLogs.length === 0;

  const projectOptions = isDemoMode ? ['All', 'Galderma', 'Idonneous'] : ['All', ...userProjects];

  const getProjectBadges = (proj) => {
    const filteredQuizzes = proj === 'All' ? quizLogs : quizLogs.filter(l => l.projectName === proj);
    const filteredMeetings = proj === 'All' ? trainingLogs : trainingLogs.filter(l => l.projectName === proj);

    const championUnlocked = filteredQuizzes.some(l => parseFloat(l.percentage) >= 90);
    const fastestUnlocked = filteredQuizzes.some(l => parseInt(l.timeSpent) < 45);
    const streakUnlocked = filteredMeetings.length >= 2;
    const expertUnlocked = filteredQuizzes.some(l => l.percentage === '100%');
    const teamUnlocked = filteredQuizzes.length > 0 || filteredMeetings.length > 0;
    const perfectUnlocked = filteredQuizzes.some(l => l.status === 'Completed');

    return [
      { id: 'champion',  label: 'Sales Champion',     desc: 'Scored 90%+ on any quiz in this project',       icon: '🏆', color: '#FF6B35', unlocked: championUnlocked  },
      { id: 'fastest',   label: 'Fastest Finger',      desc: 'Completed quiz in under 45 seconds',             icon: '⚡', color: '#F59E0B', unlocked: fastestUnlocked  },
      { id: 'streak',    label: 'Attendance Streak',   desc: '2+ scheduled training meetings attended',        icon: '🔥', color: '#EF4444', unlocked: streakUnlocked },
      { id: 'expert',    label: 'Product Expert',      desc: 'Scored 100% on any quiz in this project',        icon: '📦', color: '#00C896', unlocked: expertUnlocked },
      { id: 'team',      label: 'Zone Warrior',        desc: 'Participated in this project',                   icon: '🎯', color: '#2EA8FF', unlocked: teamUnlocked },
      { id: 'perfect',   label: 'Perfect Session',     desc: 'Completed a quiz session successfully',          icon: '💯', color: '#8B5CF6', unlocked: perfectUnlocked },
    ];
  };

  const getDemoProjectBadges = (proj) => {
    if (proj === 'Galderma') {
      return [
        { id: 'champion',  label: 'Sales Champion',     desc: 'Finished #1 in any session',     icon: '🏆', color: '#FF6B35', unlocked: true  },
        { id: 'fastest',   label: 'Fastest Finger',      desc: 'Answered in under 3 seconds',    icon: '⚡', color: '#F59E0B', unlocked: false },
        { id: 'streak',    label: 'Attendance Streak',   desc: '5 consecutive sessions attended',icon: '🔥', color: '#EF4444', unlocked: false },
        { id: 'expert',    label: 'Product Expert',      desc: 'Scored 100% on any quiz',        icon: '📦', color: '#00C896', unlocked: true  },
        { id: 'team',      label: 'Zone Warrior',        desc: 'Top scorer in your zone',        icon: '🎯', color: '#2EA8FF', unlocked: false },
        { id: 'perfect',   label: 'Perfect Session',     desc: 'Attended all questions on time', icon: '💯', color: '#8B5CF6', unlocked: false },
      ];
    } else if (proj === 'Idonneous') {
      return [
        { id: 'champion',  label: 'Sales Champion',     desc: 'Finished #1 in any session',     icon: '🏆', color: '#FF6B35', unlocked: false },
        { id: 'fastest',   label: 'Fastest Finger',      desc: 'Answered in under 3 seconds',    icon: '⚡', color: '#F59E0B', unlocked: true  },
        { id: 'streak',    label: 'Attendance Streak',   desc: '5 consecutive sessions attended',icon: '🔥', color: '#EF4444', unlocked: false },
        { id: 'expert',    label: 'Product Expert',      desc: 'Scored 100% on any quiz',        icon: '📦', color: '#00C896', unlocked: false },
        { id: 'team',      label: 'Zone Warrior',        desc: 'Top scorer in your zone',        icon: '🎯', color: '#2EA8FF', unlocked: true  },
        { id: 'perfect',   label: 'Perfect Session',     desc: 'Attended all questions on time', icon: '💯', color: '#8B5CF6', unlocked: false },
      ];
    }
    return [
      { id: 'champion',  label: 'Sales Champion',     desc: 'Finished #1 in any session',     icon: '🏆', color: '#FF6B35', unlocked: true  },
      { id: 'fastest',   label: 'Fastest Finger',      desc: 'Answered in under 3 seconds',    icon: '⚡', color: '#F59E0B', unlocked: true  },
      { id: 'streak',    label: 'Attendance Streak',   desc: '5 consecutive sessions attended',icon: '🔥', color: '#EF4444', unlocked: false },
      { id: 'expert',    label: 'Product Expert',      desc: 'Scored 100% on any quiz',        icon: '📦', color: '#00C896', unlocked: false },
      { id: 'team',      label: 'Zone Warrior',        desc: 'Top scorer in your zone',        icon: '🎯', color: '#2EA8FF', unlocked: false },
      { id: 'perfect',   label: 'Perfect Session',     desc: 'Attended all questions on time', icon: '💯', color: '#8B5CF6', unlocked: false },
    ];
  };

  const badgesToRender = isDemoMode ? getDemoProjectBadges(selectedProject) : getProjectBadges(selectedProject);

  // Simulated points based on number of sessions
  const totalPoints  = 340 + quizLogs.length * 15;
  const currentLevel = LEVELS.find(l => totalPoints >= l.min && totalPoints < l.max) || LEVELS[LEVELS.length - 1];
  const nextLevel    = LEVELS[LEVELS.indexOf(currentLevel) + 1];
  const levelPct     = nextLevel
    ? Math.round(((totalPoints - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100)
    : 100;

  const DEMO_LEADERBOARD = [
    { name: 'Arjun Sharma',   pts: 980, level: '🥇 Gold'  },
    { name: 'Priya Mehta',    pts: 870, level: '🥇 Gold'  },
    { name: 'Ravi Kumar',     pts: 640, level: '🥈 Silver' },
    { name: 'Sunita Rao',     pts: 520, level: '🥈 Silver' },
    { name: 'Deepak Singh',   pts: 410, level: '🥈 Silver' },
  ];

  return (
    <div className="view-section active">
      <div className="section-header">
        <div>
          <h2 className="section-title" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800 }}>
            🏟️ Arena Stats
          </h2>
          <p className="section-desc">Your gamification journey — badges, levels, and leaderboard standings.</p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: `rgba(255,107,53,0.08)`,
          border: '1px solid rgba(255,107,53,0.2)',
          borderRadius: '20px', padding: '8px 16px',
          fontSize: '0.85rem', fontWeight: 700, color: '#FF6B35',
          fontFamily: 'Poppins, sans-serif',
        }}>
          {currentLevel.icon} {currentLevel.name}
        </div>
      </div>

      {/* ── Level Progress Card ── */}
      <div className="glass-card" style={{ marginBottom: '24px', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>
              Current Level
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '20px',
                background: `${currentLevel.color}15`,
                border: `2px solid ${currentLevel.color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2rem',
              }}>
                {currentLevel.icon}
              </div>
              <div>
                <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: '2rem', fontWeight: 900, color: currentLevel.color, lineHeight: 1 }}>
                  {currentLevel.name}
                </div>
                {nextLevel && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {nextLevel.min - totalPoints} pts to {nextLevel.icon} {nextLevel.name}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>
              Total Points
            </div>
            <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: '3rem', fontWeight: 900, color: '#FF6B35', lineHeight: 1 }}>
              {totalPoints.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Arena Points</div>
          </div>
        </div>

        {/* Level progression bar */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span>{currentLevel.icon} {currentLevel.name} ({currentLevel.min} pts)</span>
            {nextLevel && <span>{nextLevel.icon} {nextLevel.name} ({nextLevel.min} pts)</span>}
          </div>
          <div style={{ height: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
            <div style={{
              height: '100%',
              width: `${levelPct}%`,
              background: `linear-gradient(90deg, ${currentLevel.color}, #FF6B35)`,
              borderRadius: '8px',
              transition: 'width 1.2s ease',
              boxShadow: `0 0 10px ${currentLevel.color}50`,
            }} />
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>{levelPct}% to next level</div>
        </div>

        {/* Level road */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
          {LEVELS.map((l, i) => {
            const reached = totalPoints >= l.min;
            return (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  height: '8px', borderRadius: '4px',
                  background: reached ? l.color : 'var(--bg-tertiary)',
                  marginBottom: '6px',
                  transition: 'background 0.3s ease',
                  boxShadow: reached ? `0 0 6px ${l.color}60` : 'none',
                }} />
                <div style={{ fontSize: '0.68rem', color: reached ? l.color : 'var(--text-muted)', fontWeight: 600 }}>{l.icon}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Badge Wall ── */}
      <div className="glass-card" style={{ marginBottom: '24px', padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award size={20} color="#FF6B35" /> Badge Collection
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Filter by Project:</span>
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-glass)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {projectOptions.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {badgesToRender.map(b => (
            <div key={b.id} style={{
              padding: '20px',
              borderRadius: '16px',
              background: b.unlocked ? `${b.color}08` : 'var(--bg-tertiary)',
              border: `1.5px solid ${b.unlocked ? b.color + '30' : 'var(--border-glass)'}`,
              display: 'flex', alignItems: 'center', gap: '14px',
              opacity: b.unlocked ? 1 : 0.5,
              transition: 'all 0.2s ease',
              filter: b.unlocked ? 'none' : 'grayscale(1)',
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px',
                background: b.unlocked ? `${b.color}15` : '#E2E8F020',
                border: `2px solid ${b.unlocked ? b.color + '40' : '#E2E8F0'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.6rem', flexShrink: 0,
              }}>
                {b.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: b.unlocked ? 'var(--text-primary)' : 'var(--text-muted)', marginBottom: '3px' }}>{b.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{b.desc}</div>
                {b.unlocked && (
                  <div style={{ fontSize: '0.7rem', color: b.color, fontWeight: 700, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>✓ Earned</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom row: Leaderboard + Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* All-time Leaderboard */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trophy size={20} color="#FF6B35" /> All-Time Leaderboard
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {DEMO_LEADERBOARD.map((p, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                background: i === 0 ? 'rgba(255,107,53,0.07)' : 'var(--bg-tertiary)',
                border: i === 0 ? '1.5px solid rgba(255,107,53,0.2)' : '1px solid var(--border-glass)',
              }}>
                <div style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 900, fontSize: '1rem', color: i === 0 ? '#FF6B35' : 'var(--text-muted)', width: '24px' }}>#{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.level}</div>
                </div>
                <div style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, color: i === 0 ? '#FF6B35' : 'var(--text-secondary)', fontSize: '0.95rem' }}>{p.pts} pts</div>
              </div>
            ))}
          </div>
        </div>

        {/* Achievement Stats */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TrendingUp size={20} color="#00C896" /> Achievement Stats
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { label: 'Sessions Participated', value: quizLogs.length, icon: <Zap size={18} />, color: '#FF6B35' },
              { label: 'Badges Earned',          value: badgesToRender.filter(b => b.unlocked).length,          icon: <Award size={18} />, color: '#F59E0B' },
              { label: 'Avg. Score',             value: attendance?.summary?.avgScore || '0%',                icon: <Target size={18} />, color: '#00C896' },
              { label: 'Fastest Answer',         value: '2.1s',               icon: <Clock size={18} />, color: '#2EA8FF' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px',
                  background: `${s.color}12`, border: `1.5px solid ${s.color}25`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: s.color, flexShrink: 0,
                }}>
                  {s.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{s.label}</div>
                  <div style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: s.color }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
