import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  PlayCircle, ChevronRight, BarChart2, Smartphone, Shield, Users, 
  Zap, Award, ArrowRight, X, Menu, Mail, Phone, Calendar, Radio, 
  BookOpen, CheckCircle2, Sparkles, Lock, Layers, Briefcase, FileSpreadsheet
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  // Data Fetching
  const [clients, setClients] = useState([]);
  
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await axios.get('/api/clients/public');
        setClients(res.data || []);
      } catch (err) {
        console.error('Failed to load public clients', err);
      }
    };
    fetchClients();
  }, []);

  // Login Modal State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Contact Modal State
  const [showContactModal, setShowContactModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      login(response.data.token, response.data.user);
      if (['Project Manager', 'MD', 'COO', 'VP Operations', 'Client', 'Supervisor', 'Marketing Manager'].includes(response.data.user.role)) {
        navigate('/pm-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const [activeFeature, setActiveFeature] = useState('live');
  const features = {
    live: {
      title: 'Live Interactive Arena',
      desc: 'Real-time quiz arena, synchronous host controls, fastest-finger bonus scoring, and instant participant engagement distribution.',
      badge: 'Synchronous Learning'
    },
    analytics: {
      title: 'Executive Client Analytics',
      desc: 'Automated 15-slide PowerPoint deck generation, comprehensive Excel workbook reporting, and regional workforce capability heatmaps.',
      badge: 'Data Intelligence'
    },
    certification: {
      title: 'Tamper-Proof Certification',
      desc: 'Instant verification, automated PDF credential generation, digital signatures, and permanent audit trails.',
      badge: 'Verified Credentials'
    },
    field: {
      title: 'On-Ground Retail Governance',
      desc: 'Geo-tagged attendance logging, multi-tier project hierarchy trees, and role-based promoter supervision.',
      badge: 'Field Performance'
    }
  };

  const CLIENT_SECTORS = [
    'FMCG', 'Beauty & Personal Care', 'Consumer Electronics', 
    'Telecom', 'Healthcare', 'Modern Trade Retail'
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0B1220', color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ─── ENTERPRISE TOP NAVBAR ─── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(11, 18, 32, 0.85)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #1E293B', padding: '14px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 12px rgba(37, 99, 235, 0.4)'
          }}>
            <Sparkles size={20} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                RETAILEDGE
              </span>
              <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '1.2rem', color: '#2563EB' }}>
                PRO
              </span>
            </div>
            <div style={{ fontSize: '0.62rem', color: '#94A3B8', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              by Idonneous Marketing Services
            </div>
          </div>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <a href="#capabilities" style={{ color: '#CBD5E1', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none' }}>Capabilities</a>
          <a href="#sectors" style={{ color: '#CBD5E1', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none' }}>Industries</a>
          <a href="#reporting" style={{ color: '#CBD5E1', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none' }}>Executive Reports</a>
          <button 
            onClick={() => navigate('/join')} 
            style={{ color: '#06B6D4', fontSize: '0.88rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Radio size={14} /> Join Live Quiz
          </button>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => navigate('/login')}
            style={{
              padding: '8px 18px', borderRadius: '8px',
              background: '#162033', border: '1px solid #1E293B',
              color: '#FFFFFF', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer'
            }}
          >
            Sign In
          </button>
          <button 
            onClick={() => navigate('/login')}
            style={{
              padding: '8px 20px', borderRadius: '8px',
              background: '#2563EB', border: 'none',
              color: '#FFFFFF', fontSize: '0.88rem', fontWeight: 700,
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)', cursor: 'pointer'
            }}
          >
            Launch Command Center
          </button>
        </div>
      </header>

      {/* ─── HERO SECTION ─── */}
      <section style={{
        padding: '90px 40px 70px', textAlign: 'center', maxWidth: '1100px', margin: '0 auto',
        position: 'relative'
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(37, 99, 235, 0.12)', border: '1px solid rgba(37, 99, 235, 0.25)', padding: '6px 16px', borderRadius: '20px', marginBottom: '24px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#06B6D4' }} />
          <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#60A5FA' }}>
            Enterprise Frontline Retail Intelligence &amp; LMS
          </span>
        </div>

        <h1 style={{
          fontFamily: 'Manrope, sans-serif', fontSize: '3.6rem', fontWeight: 800,
          lineHeight: 1.15, letterSpacing: '-0.03em', color: '#FFFFFF', marginBottom: '20px'
        }}>
          Train Better. Perform Better. <br />
          <span style={{ color: '#2563EB' }}>Grow Faster.</span>
        </h1>

        <p style={{
          fontSize: '1.25rem', color: '#94A3B8', maxWidth: '780px', margin: '0 auto 36px',
          lineHeight: 1.6, fontWeight: 400
        }}>
          The complete commercial platform for live interactive training, on-ground attendance governance, rapid assessment certification, and automated executive client reporting.
        </p>

        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', marginBottom: '48px' }}>
          <button 
            onClick={() => navigate('/login')}
            style={{
              padding: '14px 28px', borderRadius: '10px', background: '#2563EB',
              color: '#FFFFFF', fontWeight: 700, fontSize: '1rem', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 18px rgba(37, 99, 235, 0.4)'
            }}
          >
            <span>Explore Demo Command Center</span>
            <ArrowRight size={18} />
          </button>
          <button 
            onClick={() => navigate('/join')}
            style={{
              padding: '14px 24px', borderRadius: '10px', background: '#162033',
              border: '1px solid #1E293B', color: '#FFFFFF', fontWeight: 600,
              fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <Radio size={18} color="#06B6D4" />
            <span>Join Live Arena Session</span>
          </button>
        </div>

        {/* Sector Badges */}
        <div id="sectors" style={{ borderTop: '1px solid #1E293B', paddingTop: '32px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>
            Trusted by Commercial Enterprise Teams Across Key Sectors
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
            {CLIENT_SECTORS.map((sec, i) => (
              <span key={i} style={{ fontSize: '0.82rem', padding: '6px 14px', borderRadius: '8px', background: '#111827', color: '#93C5FD', border: '1px solid #1E293B', fontWeight: 600 }}>
                {sec}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4 CORE CAPABILITIES ─── */}
      <section id="capabilities" style={{ padding: '60px 40px', background: '#0F172A', borderTop: '1px solid #1E293B', borderBottom: '1px solid #1E293B' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '44px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#06B6D4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
              Unified Retail Intelligence Suite
            </div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              Everything Required for Enterprise Workforce Excellence
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            {[
              { icon: Radio, color: '#2563EB', title: '1. Live Learning Arena', desc: 'Real-time quiz competition with dynamic scoring, host controls, and participant metrics.' },
              { icon: BookOpen, color: '#06B6D4', title: '2. Structured Curriculum', desc: 'SOPs, product training videos, and self-paced assessment modules for frontline staff.' },
              { icon: Award, color: '#10B981', title: '3. Automated Certification', desc: 'Instant certificate generation with official validation seals and digital download.' },
              { icon: BarChart2, color: '#8B5CF6', title: '4. Executive Reporting', desc: 'Automated 15-slide PowerPoint decks and formatted Excel workbooks at a single click.' },
            ].map((col, i) => {
              const Icon = col.icon;
              return (
                <div key={i} style={{ background: '#111827', border: '1px solid #1E293B', borderRadius: '14px', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.1)', color: col.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={22} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF' }}>{col.title}</h3>
                  <p style={{ fontSize: '0.88rem', color: '#94A3B8', lineHeight: 1.5, margin: 0 }}>{col.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── INTERACTIVE FEATURE SPOTLIGHT ─── */}
      <section id="reporting" style={{ padding: '80px 40px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '40px', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
              Interactive Feature Spotlight
            </div>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2, marginBottom: '20px', letterSpacing: '-0.02em' }}>
              Designed Specifically for Commercial Client Presentations
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.keys(features).map(key => {
                const f = features[key];
                const isSel = activeFeature === key;
                return (
                  <div
                    key={key}
                    onClick={() => setActiveFeature(key)}
                    style={{
                      padding: '16px 20px', borderRadius: '12px',
                      background: isSel ? '#162033' : '#111827',
                      border: `1.5px solid ${isSel ? '#2563EB' : '#1E293B'}`,
                      cursor: 'pointer', transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.98rem', fontWeight: 700, color: isSel ? '#FFFFFF' : '#CBD5E1' }}>{f.title}</span>
                      <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', background: isSel ? 'rgba(37, 99, 235, 0.2)' : '#0B1220', color: isSel ? '#60A5FA' : '#64748B', fontWeight: 600 }}>
                        {f.badge}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.84rem', color: '#94A3B8', margin: 0, lineHeight: 1.4 }}>{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feature Display Card */}
          <div style={{ background: '#111827', border: '1px solid #1E293B', borderRadius: '16px', padding: '32px', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981' }} />
              <span style={{ fontSize: '0.75rem', color: '#64748B', marginLeft: '8px', fontWeight: 600 }}>
                RetailEdge Pro Executive Engine
              </span>
            </div>

            <div style={{ background: '#0B1220', border: '1px solid #1E293B', borderRadius: '12px', padding: '24px', minHeight: '260px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
                {features[activeFeature].title}
              </div>
              <p style={{ fontSize: '0.92rem', color: '#94A3B8', lineHeight: 1.6, marginBottom: '20px' }}>
                {features[activeFeature].desc}
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => navigate('/login')} className="btn btn-primary" style={{ padding: '10px 18px', fontSize: '0.85rem' }}>
                  View in Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{
        borderTop: '1px solid #1E293B', padding: '36px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#0B1220', color: '#64748B', fontSize: '0.84rem'
      }}>
        <div>
          <strong style={{ color: '#FFFFFF' }}>RetailEdge Pro</strong> by Idonneous Marketing Services © 2026. All rights reserved.
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <button onClick={() => navigate('/login')} style={{ color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}>Sign In</button>
          <button onClick={() => navigate('/join')} style={{ color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}>Join Live Quiz</button>
        </div>
      </footer>

    </div>
  );
}
