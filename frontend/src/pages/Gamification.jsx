import React, { useEffect, useState, useContext, useMemo } from 'react';
import { 
  Trophy, Award, Target, Zap, Clock, TrendingUp, Search, 
  Users, CheckCircle2, ChevronRight, Filter, AlertCircle, 
  MapPin, RefreshCw, BarChart2, ShieldCheck, Flame, Layers
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

export default function Gamification() {
  const { user, token } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('results'); // 'results' | 'badges'

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
    fetchGamificationData(newProj);
  };

  // Filter participant rows based on search
  const filteredParticipants = useMemo(() => {
    if (!data?.participantResults) return [];
    if (!searchQuery.trim()) return data.participantResults;
    const q = searchQuery.toLowerCase().trim();
    return data.participantResults.filter(p => 
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.employeeId && p.employeeId.toLowerCase().includes(q)) ||
      (p.zone && p.zone.toLowerCase().includes(q)) ||
      (p.quizTitle && p.quizTitle.toLowerCase().includes(q))
    );
  }, [data?.participantResults, searchQuery]);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
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
            <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>•</span>
            <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>
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
              : 'Project-scoped analytics, Live Arena leaderboard standings, and participant assessment outcomes.'}
          </p>
        </div>

        {/* Right side controls: Project Selector & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {accessibleProjects.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="gamification-project-select" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
                Project:
              </label>
              <select
                id="gamification-project-select"
                value={selectedProjectId}
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
                  <option value="all">🌐 All Assigned Projects</option>
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
            title="Refresh Data"
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

      {/* ── View Mode Selector (For Non-Employees) ── */}
      {!isEmployee && (
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          borderBottom: '1px solid #E2E8F0',
          paddingBottom: '12px'
        }}>
          <button
            onClick={() => setActiveTab('results')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'results' ? '#2563EB' : 'transparent',
              color: activeTab === 'results' ? '#FFFFFF' : '#64748B',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease'
            }}
          >
            <Users size={16} />
            <span>Participant Results & Teams</span>
          </button>

          <button
            onClick={() => setActiveTab('badges')}
            style={{
              padding: '8px 18px',
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
              <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem', color: '#0F172A' }}>
                <Trophy size={20} color="#F59E0B" /> Project Leaderboard
              </h3>
              {leaderboard.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center', color: '#94A3B8', fontSize: '0.9rem' }}>
                  No participants have completed assessments in this project yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {leaderboard.slice(0, 5).map((p, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 16px', borderRadius: '12px',
                      background: i === 0 ? '#EFF6FF' : '#F8FAFC',
                      border: i === 0 ? '1.5px solid #BFDBFE' : '1px solid #E2E8F0'
                    }}>
                      <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '0.95rem', color: i === 0 ? '#2563EB' : '#64748B', width: '28px' }}>
                        #{i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Zone: {p.zone} • Quiz: {p.quizScore}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, color: i === 0 ? '#2563EB' : '#0F172A', fontSize: '1rem' }}>
                          {p.arenaPoints} pts
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── PM / TRAINER / ADMIN VIEW ── */}
      {!isEmployee && activeTab === 'results' && (
        <>
          {/* Summary KPI Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            {/* Card 1: Total Participants */}
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
                  {summary.totalParticipants ?? 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '3px' }}>
                  In {selectedProjectName}
                </div>
              </div>
            </div>

            {/* Card 2: Quizzes Completed */}
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
                  Quizzes Completed
                </div>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.65rem', fontWeight: 900, color: '#0F172A', lineHeight: 1.1 }}>
                  {summary.quizzesCompleted ?? 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '3px' }}>
                  {summary.totalAttempts ?? 0} total attempts
                </div>
              </div>
            </div>

            {/* Card 3: Average Finalized Score */}
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
                  Finalized assessment outcomes
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

          {/* ── Team Performance by Zone / Store ── */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '24px 28px',
            marginBottom: '24px',
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

            {zoneBreakdown.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '0.88rem' }}>
                No zone or store performance data recorded for this project.
              </div>
            ) : (
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
            )}
          </div>

          {/* ── Two-Column Row: Project Leaderboard & Scoring Highlights ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            
            {/* Project Leaderboard */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, margin: 0, fontSize: '1.15rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Trophy size={20} color="#F59E0B" />
                  Project Leaderboard
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
                  Top {leaderboard.length} Performers
                </span>
              </div>

              {leaderboard.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center', color: '#94A3B8', fontSize: '0.88rem' }}>
                  No participants have completed assessments in this project yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {leaderboard.map((p, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: i === 0 ? '#EFF6FF' : (i < 3 ? '#F8FAFC' : '#FFFFFF'),
                      border: i === 0 ? '1.5px solid #BFDBFE' : '1px solid #E2E8F0'
                    }}>
                      <div style={{
                        fontFamily: 'Manrope, sans-serif',
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        color: i === 0 ? '#2563EB' : (i === 1 ? '#64748B' : (i === 2 ? '#D97706' : '#94A3B8')),
                        width: '28px',
                        textAlign: 'center'
                      }}>
                        #{i + 1}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          ID: {p.employeeId} • Zone: {p.zone}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '0.98rem', color: '#FF6B35' }}>
                          {p.arenaPoints} pts
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          Score: <span style={{ fontWeight: 700, color: '#10B981' }}>{p.quizScore}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Project Performance Summary */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
            }}>
              <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, margin: '0 0 18px 0', fontSize: '1.15rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={20} color="#2563EB" />
                Performance Metrics Breakdown
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ padding: '14px 16px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>
                    Top Performing Zone / Store
                  </div>
                  <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#0F172A' }}>
                    {zoneBreakdown.length > 0 ? zoneBreakdown[0].zone : 'N/A'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                    {zoneBreakdown.length > 0 ? `${zoneBreakdown[0].totalArenaPoints} total arena pts (${zoneBreakdown[0].avgScore} avg)` : 'No zone data available'}
                  </div>
                </div>

                <div style={{ padding: '14px 16px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>
                    Highest Individual Arena Score
                  </div>
                  <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#FF6B35' }}>
                    {leaderboard.length > 0 ? `${leaderboard[0].arenaPoints} pts (${leaderboard[0].name})` : 'N/A'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                    {leaderboard.length > 0 ? `Zone: ${leaderboard[0].zone} • Assessment: ${leaderboard[0].quizScore}` : 'No scoring records recorded'}
                  </div>
                </div>

                <div style={{ padding: '14px 16px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>
                    Assessment Integrity Note
                  </div>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B', lineHeight: 1.5 }}>
                    Arena Points are recorded strictly from Live Arena sessions and are kept separate from finalized quiz percentages. No speed bonuses are conflated with assessment scores.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Comprehensive Participant Performance Table ── */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '24px 28px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
          }}>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '20px'
            }}>
              <div>
                <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, margin: '0 0 4px 0', fontSize: '1.15rem', color: '#0F172A' }}>
                  Participant Performance Records
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B' }}>
                  Showing {filteredParticipants.length} of {data?.participantResults?.length || 0} recorded attempts.
                </p>
              </div>

              {/* Search filter input */}
              <div style={{ position: 'relative', minWidth: '260px' }}>
                <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search by name, ID, zone, quiz..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
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

            {filteredParticipants.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: '#94A3B8', fontSize: '0.9rem' }}>
                {searchQuery ? 'No participant records match your search filter.' : 'No participant records exist for this project yet.'}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#475569', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '12px 14px' }}>Participant</th>
                      <th style={{ padding: '12px 14px' }}>Employee ID</th>
                      <th style={{ padding: '12px 14px' }}>Zone / Store</th>
                      <th style={{ padding: '12px 14px' }}>Quiz / Session</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Questions</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Correct</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Quiz Score</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Arena Points</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParticipants.map((row, idx) => (
                      <tr key={row.id || idx} style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background 0.15s ease',
                        background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'
                      }}>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A' }}>
                          {row.name}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#64748B', fontFamily: 'monospace' }}>
                          {row.employeeId}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569' }}>
                          {row.zone}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#0F172A' }}>
                          <div style={{ fontWeight: 600 }}>{row.quizTitle}</div>
                          <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{row.sessionName}</div>
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
          </div>
        </>
      )}

      {/* ── BADGE COLLECTION / CRITERIA TAB (For Non-Employees or Tab 2) ── */}
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
              Verified Badge Collection & Qualification Criteria
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
              Badges are awarded strictly upon meeting objective qualification rules on finalized sessions.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {badges.map(b => (
              <div key={b.id} style={{
                padding: '20px',
                borderRadius: '14px',
                background: b.unlocked ? `${b.color}08` : '#F8FAFC',
                border: `1.5px solid ${b.unlocked ? b.color + '40' : '#E2E8F0'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                opacity: b.unlocked ? 1 : 0.6,
                transition: 'all 0.2s ease'
              }}>
                <div style={{
                  width: '50px', height: '50px', borderRadius: '14px',
                  background: b.unlocked ? `${b.color}15` : '#E2E8F0',
                  border: `2px solid ${b.unlocked ? b.color + '40' : '#CBD5E1'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.6rem', flexShrink: 0
                }}>
                  {b.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: b.unlocked ? '#0F172A' : '#64748B', marginBottom: '3px' }}>
                    {b.label}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', lineHeight: 1.4 }}>
                    {b.desc}
                  </div>
                  <div style={{
                    fontSize: '0.7rem',
                    color: b.unlocked ? b.color : '#94A3B8',
                    fontWeight: 700,
                    marginTop: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {b.unlocked ? '✓ Earned' : 'Locked (Criteria Unmet)'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
