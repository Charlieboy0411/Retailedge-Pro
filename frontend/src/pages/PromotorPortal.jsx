import React, { useEffect, useState, useContext } from 'react';
import { BookOpen, Award, Trophy, Play, Target, Zap, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import CalendarWidget from '../components/CalendarWidget';

export default function PromotorPortal() {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [trainings,     setTrainings]     = useState([]);
  const [certificates,  setCertificates]  = useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [trRes, certRes] = await Promise.all([
          axios.get('/api/trainings',    { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/certificates', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setTrainings(trRes.data    || []);
        setCertificates(certRes.data || []);
      } catch {
        // graceful fallback
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [token]);

  const QUICK_STATS = [
    { label: 'Training Modules',   value: trainings.length || '—',   color: '#2EA8FF', icon: <BookOpen size={22} /> },
    { label: 'Certifications',     value: certificates.length || '—', color: '#00C896', icon: <Award size={22} />   },
    { label: 'Arena Points',       value: '340',                       color: '#FF6B35', icon: <Trophy size={22} />  },
    { label: 'Current Level',      value: '🥉 Bronze',                 color: '#CD7F32', icon: <Target size={22} />  },
  ];

  return (
    <div className="view-section active">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2 className="section-title" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800 }}>
            👤 My Portal
          </h2>
          <p className="section-desc">Welcome, <strong>{user?.name || 'Associate'}</strong>! Your personal training command pad.</p>
        </div>
        <button
          onClick={() => navigate('/join')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'linear-gradient(135deg, #FF6B35, #FF8C42)',
            border: 'none', color: '#FFFFFF',
            padding: '10px 20px', borderRadius: '20px',
            fontWeight: 700, fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(255,107,53,0.3)',
            fontFamily: 'Poppins, sans-serif',
          }}
        >
          <Play size={16} /> Join Live Session
        </button>
      </div>

      {/* Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px', marginBottom: '24px' }}>
        {QUICK_STATS.map((s, i) => (
          <div key={i} className="glass-card stat-card" style={{ borderLeft: `4px solid ${s.color}` }}>
            <div className="stat-info">
              <span className="stat-label">{s.label}</span>
              <span className="stat-value" style={{ color: s.color, fontFamily: 'Poppins, sans-serif' }}>{s.value}</span>
            </div>
            <div className="stat-icon-wrapper" style={{ background: `${s.color}12`, color: s.color }}>
              {s.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '24px' }}>
        {/* Training Modules */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={20} color="#2EA8FF" /> My Training Modules
          </h3>
          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading modules...</p>
          ) : trainings.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {trainings.slice(0, 5).map((t, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-glass)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      background: 'rgba(46,168,255,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      📦
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.title || t.name || `Module ${i + 1}`}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.type || 'Training'} • {t.Project?.name || 'General'}</div>
                    </div>
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📭</div>
              <p>No training modules assigned yet.</p>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Certificates */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Award size={18} color="#00C896" /> Certificates
            </h3>
            {certificates.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {certificates.slice(0, 3).map((c, i) => (
                  <div key={i} style={{
                    padding: '12px 14px',
                    background: 'rgba(0,200,150,0.06)',
                    border: '1px solid rgba(0,200,150,0.2)',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}>
                    🏅 {c.quiz_title || `Certificate ${i + 1}`}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Complete quizzes to earn certificates.</p>
            )}
          </div>

          {/* Arena Stats */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Zap size={18} color="#FF6B35" /> Arena Progress
            </h3>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                <span>🥉 Bronze</span><span>🥈 Silver (200 pts)</span>
              </div>
              <div style={{ height: '10px', background: 'var(--bg-tertiary)', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: '68%',
                  background: 'linear-gradient(90deg, #CD7F32, #FF6B35)',
                  borderRadius: '5px', transition: 'width 1s ease',
                }} />
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>340 / 500 pts</div>
            </div>
            <button
              onClick={() => navigate('/gamification')}
              style={{
                width: '100%', padding: '10px',
                background: 'rgba(255,107,53,0.08)',
                border: '1.5px solid rgba(255,107,53,0.2)',
                borderRadius: '10px', color: '#FF6B35',
                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                fontFamily: 'Poppins, sans-serif',
              }}
            >
              View Full Arena Stats →
            </button>
          </div>        </div>
      </div>
    </div>
  );
}
