import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  Sparkles, Radio, Award, BarChart2, CheckCircle2, ArrowRight, Search,
  Building2, Users, Layers, ShieldCheck, FileSpreadsheet, TrendingUp, Target,
  Cpu, ShoppingBag, Smartphone, HeartPulse, Compass, BookOpen, Clock, FileText,
  Check, X, ChevronRight, Lock, Mail, Phone, MapPin, ExternalLink, Eye, EyeOff,
  UserCheck, Briefcase, GraduationCap, LineChart, Presentation, HelpCircle, AlertCircle
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  // Modals
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Demo Request Form State
  const [demoForm, setDemoForm] = useState({
    fullName: '',
    workEmail: '',
    organization: '',
    phone: '',
    teamSize: '500-2,000 associates',
    industry: 'FMCG & CPG',
    timeline: 'Within 30 days',
    notes: ''
  });
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [isSubmittingDemo, setIsSubmittingDemo] = useState(false);

  // Interactive Hero Preview Tabs
  const [activeHeroTab, setActiveHeroTab] = useState('cockpit'); // cockpit | arena | certs | reports

  // Handle Enterprise Demo Submission
  const handleDemoSubmit = (e) => {
    e.preventDefault();
    setIsSubmittingDemo(true);
    setTimeout(() => {
      setIsSubmittingDemo(false);
      setDemoSubmitted(true);
    }, 1200);
  };

  // Quick Demo Login Helper
  const fillDemoCredentials = (role) => {
    switch (role) {
      case 'Super Admin':
        setEmail('admin@quizhive.com');
        setPassword('password');
        break;
      case 'T&D Manager':
        setEmail('td@quizhive.com');
        setPassword('password');
        break;
      case 'Client':
        setEmail('client.unilever@quizhive.com');
        setPassword('password');
        break;
      case 'Supervisor':
        setEmail('supervisor.north@quizhive.com');
        setPassword('password');
        break;
      case 'Trainer':
        setEmail('trainer@quizhive.com');
        setPassword('password');
        break;
      default:
        setEmail('admin@quizhive.com');
        setPassword('password');
    }
  };

  // Handle Login Submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { token, user } = response.data;
      login(token, user);

      const role = user.role || (user.Role ? user.Role.role_name : '');
      if (['Project Manager', 'MD', 'COO', 'VP Operations', 'Client', 'Marketing Manager'].includes(role)) {
        navigate('/pm-dashboard');
      } else if (role === 'T&D Manager') {
        navigate('/td-cockpit');
      } else if (role === 'Supervisor') {
        navigate('/supervisor-cockpit');
      } else if (role === 'Trainer') {
        navigate('/trainer-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setLoginError(err.response?.data?.error || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Quick Search Items
  const SEARCH_ITEMS = [
    { title: 'Live Interactive Arena', category: 'Platform', link: '#pillars' },
    { title: 'Capability Portfolio Cockpit', category: 'Platform', link: '#pillars' },
    { title: 'Automated 15-Slide PowerPoint Decks', category: 'Reporting', link: '#pillars' },
    { title: 'Dual-Gate Certification (80/70 Rule)', category: 'Certification', link: '#workflow' },
    { title: 'Product Knowledge & USPs', category: 'Capabilities', link: '#capabilities' },
    { title: 'In-Store Planogram Execution', category: 'Capabilities', link: '#capabilities' },
    { title: 'FMCG Retail Distribution', category: 'Industries', link: '#industries' },
    { title: 'Consumer Electronics Training', category: 'Industries', link: '#industries' },
    { title: 'T&D Manager Governance', category: 'Stakeholders', link: '#stakeholders' },
    { title: 'Client Partner Transparency', category: 'Stakeholders', link: '#stakeholders' }
  ];

  const filteredSearch = SEARCH_ITEMS.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B132B',
      color: '#FFFFFF',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      overflowX: 'hidden'
    }}>

      {/* ─── 1. CORPORATE ENTERPRISE HEADER ─── */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(11, 19, 43, 0.94)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '0 48px',
        height: '76px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Brand Lockup */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 50%, #38BDF8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(37, 99, 235, 0.3)'
          }}>
            <Compass size={22} color="#FFFFFF" strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#FFFFFF' }}>
                RetailEdge
              </span>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 900,
                letterSpacing: '0.08em',
                background: '#2563EB',
                color: '#FFFFFF',
                padding: '2px 6px',
                borderRadius: '4px',
                textTransform: 'uppercase'
              }}>
                PRO
              </span>
            </div>
            <div style={{
              fontSize: '0.62rem',
              fontWeight: 700,
              color: '#94A3B8',
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}>
              BY IDONNEOUS MARKETING SERVICES
            </div>
          </div>
        </div>

        {/* Boardroom Navigation */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <a href="#pillars" style={{ color: '#E2E8F0', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}>Platform</a>
          <a href="#capabilities" style={{ color: '#E2E8F0', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}>Capabilities</a>
          <a href="#workflow" style={{ color: '#E2E8F0', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}>Journey</a>
          <a href="#stakeholders" style={{ color: '#E2E8F0', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}>Impact</a>
          <a href="#industries" style={{ color: '#E2E8F0', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}>Industries</a>
          <a href="#opportunity" style={{ color: '#E2E8F0', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}>Insights</a>
          <a href="#about" style={{ color: '#E2E8F0', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}>About Us</a>
        </nav>

        {/* Actions & Utilities */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => setShowSearchModal(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#94A3B8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.85rem'
            }}
            title="Search Platform Capabilities"
          >
            <Search size={16} color="#94A3B8" />
            <span style={{ color: '#64748B' }}>Search...</span>
          </button>

          <button
            onClick={() => setShowLoginModal(true)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '9px 20px',
              color: '#FFFFFF',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Sign In
          </button>

          <button
            onClick={() => setShowDemoModal(true)}
            style={{
              background: '#2563EB',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 22px',
              color: '#FFFFFF',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
              transition: 'all 0.2s'
            }}
          >
            Request Demo
          </button>
        </div>
      </header>

      {/* ─── 2. HERO SECTION ─── */}
      <section style={{
        position: 'relative',
        padding: '96px 48px 84px',
        maxWidth: '1280px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        {/* Subtle Background Glow */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '720px',
          height: '320px',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, rgba(11, 19, 43, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Eyebrow */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(37, 99, 235, 0.1)',
            border: '1px solid rgba(37, 99, 235, 0.3)',
            padding: '6px 18px',
            borderRadius: '24px',
            marginBottom: '28px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38BDF8' }} />
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#93C5FD'
            }}>
              EMPOWERING THE FRONTLINE. EVERYDAY.
            </span>
          </div>

          {/* Master Headline */}
          <h1 style={{
            fontSize: 'clamp(2.5rem, 5.5vw, 4.4rem)',
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.035em',
            color: '#FFFFFF',
            maxWidth: '980px',
            margin: '0 auto 24px'
          }}>
            Build Capability. Improve Execution. <br />
            <span style={{ color: '#38BDF8' }}>Measure Performance.</span>
          </h1>

          {/* Supporting Text */}
          <p style={{
            fontSize: '1.25rem',
            lineHeight: 1.65,
            color: '#94A3B8',
            maxWidth: '820px',
            margin: '0 auto 40px',
            fontWeight: 400
          }}>
            RetailEdge PRO is the digital learning and performance engine behind enterprise Training &amp; Development—helping organizations train, assess, certify and measure frontline capability at scale.
          </p>

          {/* Call to Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '64px' }}>
            <button
              onClick={() => {
                const el = document.getElementById('pillars');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                background: '#2563EB',
                color: '#FFFFFF',
                padding: '14px 32px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '1rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 4px 20px rgba(37, 99, 235, 0.4)',
                transition: 'transform 0.2s'
              }}
            >
              <span>Explore RetailEdge PRO</span>
              <ArrowRight size={18} />
            </button>

            <button
              onClick={() => setShowDemoModal(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: '#FFFFFF',
                padding: '14px 28px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>Request Enterprise Demo</span>
            </button>
          </div>

          {/* ─── REALISTIC LAPTOP / DASHBOARD VISUAL ─── */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 24px 70px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.06)',
            maxWidth: '1160px',
            margin: '0 auto',
            textAlign: 'left'
          }}>
            {/* Window Chrome */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#EF4444' }} />
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F59E0B' }} />
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10B981' }} />
                <span style={{ marginLeft: '12px', fontSize: '0.82rem', color: '#94A3B8', fontWeight: 600 }}>
                  RetailEdge PRO — Enterprise Performance Cockpit (Boardroom Analytics View)
                </span>
              </div>

              {/* View Switcher Tabs */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { id: 'cockpit', label: 'Executive Cockpit' },
                  { id: 'arena', label: 'Live Arena' },
                  { id: 'certs', label: 'Certification Status' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveHeroTab(tab.id)}
                    style={{
                      background: activeHeroTab === tab.id ? '#2563EB' : 'rgba(255, 255, 255, 0.05)',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      padding: '5px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dashboard Content Container */}
            {activeHeroTab === 'cockpit' && (
              <div>
                {/* 5 Enterprise KPI Metric Cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '14px',
                  marginBottom: '20px'
                }}>
                  <div style={{ background: '#0B132B', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
                      Active Projects
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                      14
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#10B981', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} /> 100% On-Ground Coverage
                    </div>
                  </div>

                  <div style={{ background: '#0B132B', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
                      Trained Participants
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                      8,420
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#38BDF8', marginTop: '4px' }}>
                      Active Frontline Associates
                    </div>
                  </div>

                  <div style={{ background: '#0B132B', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
                      Attendance Rate
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                      96.4%
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#10B981', marginTop: '4px' }}>
                      +4.2% vs Benchmark
                    </div>
                  </div>

                  <div style={{ background: '#0B132B', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
                      Assessment Score
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38BDF8', letterSpacing: '-0.02em' }}>
                      89.2%
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '4px' }}>
                      Objective Verification
                    </div>
                  </div>

                  <div style={{ background: '#0B132B', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
                      Certification Status
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10B981', letterSpacing: '-0.02em' }}>
                      82.6%
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '4px' }}>
                      6,955 Certified Promoters
                    </div>
                  </div>
                </div>

                {/* Lower Visual Grid: Trend Chart + Top Teams + Governance */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                  {/* Chart Representation */}
                  <div style={{ background: '#0B132B', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF' }}>
                        Training Performance &amp; Capability Progression (Q1–Q4)
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Verified Telemetry</span>
                    </div>
                    {/* Simulated SVG Trend Chart */}
                    <div style={{ height: '140px', width: '100%', display: 'flex', alignItems: 'flex-end', gap: '18px', paddingBottom: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      {[
                        { q: 'Jan', att: 88, score: 76 },
                        { q: 'Feb', att: 91, score: 81 },
                        { q: 'Mar', att: 89, score: 84 },
                        { q: 'Apr', att: 94, score: 86 },
                        { q: 'May', att: 96, score: 88 },
                        { q: 'Jun', att: 95, score: 89 },
                        { q: 'Jul', att: 97, score: 91 },
                        { q: 'Aug', att: 96, score: 92 },
                      ].map((item, idx) => (
                        <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '100%', display: 'flex', gap: '3px', alignItems: 'flex-end', height: '110px' }}>
                            <div style={{ flex: 1, background: '#1E3A8A', height: `${item.att}%`, borderRadius: '3px 3px 0 0' }} title={`Attendance: ${item.att}%`} />
                            <div style={{ flex: 1, background: '#38BDF8', height: `${item.score}%`, borderRadius: '3px 3px 0 0' }} title={`Assessment: ${item.score}%`} />
                          </div>
                          <span style={{ fontSize: '0.68rem', color: '#64748B' }}>{item.q}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '20px', marginTop: '10px', fontSize: '0.72rem', color: '#94A3B8' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', background: '#1E3A8A', borderRadius: '2px' }} /> Attendance %
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', background: '#38BDF8', borderRadius: '2px' }} /> Assessment Score %
                      </span>
                    </div>
                  </div>

                  {/* Top Performing Teams */}
                  <div style={{ background: '#0B132B', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '20px' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '14px' }}>
                      Top Performing Teams
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {[
                        { name: 'North Modern Trade Hub', score: '94.8%', status: 'Certified' },
                        { name: 'West Regional Electronics', score: '92.4%', status: 'Certified' },
                        { name: 'South FMCG Brand Team', score: '90.1%', status: 'Certified' },
                        { name: 'East Key Accounts', score: '88.6%', status: 'Certified' }
                      ].map((team, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', fontSize: '0.78rem' }}>
                          <span style={{ color: '#E2E8F0', fontWeight: 500 }}>{team.name}</span>
                          <span style={{ color: '#38BDF8', fontWeight: 700 }}>{team.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeHeroTab === 'arena' && (
              <div style={{ padding: '20px', background: '#0B132B', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(37, 99, 235, 0.3)', padding: '4px 12px', borderRadius: '20px', marginBottom: '12px' }}>
                  <Radio size={14} color="#38BDF8" />
                  <span style={{ fontSize: '0.72rem', color: '#38BDF8', fontWeight: 700 }}>SYNCHRONOUS LEARNING ARENA ACTIVE</span>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
                  Room PIN: 892 021 — Session &ldquo;Q3 Frontline Product Launch &amp; Merchandising&rdquo;
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#94A3B8', maxWidth: '640px', margin: '0 auto 16px' }}>
                  Live countdown timer, real-time participant response distribution, fastest-finger speed score calculation, and instantaneous answer reveal across 450+ retail promoters.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                  <button onClick={() => navigate('/join')} style={{ background: '#2563EB', color: '#FFFFFF', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                    Join via Participant Mobile
                  </button>
                  <button onClick={() => setShowLoginModal(true)} style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#FFFFFF', border: '1px solid rgba(255, 255, 255, 0.15)', padding: '8px 18px', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                    Host Control Room Demo
                  </button>
                </div>
              </div>
            )}

            {activeHeroTab === 'certs' && (
              <div style={{ padding: '20px', background: '#0B132B', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF' }}>Authoritative Dual-Gate Qualification Engine</h3>
                    <p style={{ fontSize: '0.82rem', color: '#94A3B8' }}>Every certificate requires verified Attendance &ge; 80% AND Assessment Score &ge; 70%.</p>
                  </div>
                  <span style={{ padding: '4px 10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10B981', color: '#10B981', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                    100% Anti-Tamper Secured
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '0.82rem' }}>
                  <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px' }}>
                    <div style={{ color: '#94A3B8', fontSize: '0.72rem' }}>EVALUATED LEARNERS</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', margin: '4px 0' }}>8,420</div>
                    <div style={{ color: '#64748B', fontSize: '0.72rem' }}>Full Workforce Scope</div>
                  </div>
                  <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px' }}>
                    <div style={{ color: '#94A3B8', fontSize: '0.72rem' }}>CERTIFIED ELIGIBLE</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981', margin: '4px 0' }}>6,955</div>
                    <div style={{ color: '#10B981', fontSize: '0.72rem' }}>Att &ge;80% &amp; Score &ge;70%</div>
                  </div>
                  <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px' }}>
                    <div style={{ color: '#94A3B8', fontSize: '0.72rem' }}>COACHING TRIAGE</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F59E0B', margin: '4px 0' }}>1,465</div>
                    <div style={{ color: '#F59E0B', fontSize: '0.72rem' }}>At-Risk Follow-up Scheduled</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── 3. SIX PILLARS SECTION ─── */}
      <section id="pillars" style={{
        padding: '96px 48px',
        background: '#0F172A',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '10px' }}>
              ONE PLATFORM. EVERY FRONTLINE CAPABILITY.
            </div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.03em', maxWidth: '800px', margin: '0 auto 16px' }}>
              A Unified Operating System for Enterprise Frontline Excellence
            </h2>
            <p style={{ fontSize: '1.1rem', color: '#94A3B8', maxWidth: '720px', margin: '0 auto' }}>
              Consolidating training, verification, compliance and analytics into a cohesive, boardroom-ready infrastructure.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
            {[
              {
                icon: BookOpen,
                title: '1. Training',
                eyebrow: 'DELIVERY & CURRICULUM',
                desc: 'Blended modular learning, structured SOP distribution, interactive video modules, and multi-tier project training calendars.'
              },
              {
                icon: Target,
                title: '2. Assessment',
                eyebrow: 'EVALUATION & BENCHMARKS',
                desc: 'Objective evaluations, timer-driven live knowledge quizzes, randomized question pools, and speed-accuracy frontline benchmarking.'
              },
              {
                icon: Clock,
                title: '3. Attendance',
                eyebrow: 'PRESENCE & GOVERNANCE',
                desc: 'Geo-verified session check-ins, Jitsi presence telemetry, automated schedule tracking, and store-level promoter compliance.'
              },
              {
                icon: Award,
                title: '4. Certification',
                eyebrow: 'VERIFIED CREDENTIALS',
                desc: 'Tamper-evident digital certificates, dual-criteria qualification (Attendance ≥80% & Score ≥70%), QR verification, and permanent registry.'
              },
              {
                icon: BarChart2,
                title: '5. Analytics',
                eyebrow: 'PERFORMANCE INTELLIGENCE',
                desc: 'Regional capability heatmaps, operational deficit triage, cohort progress tracking, and supervisor at-risk coaching alerts.'
              },
              {
                icon: FileSpreadsheet,
                title: '6. Reporting',
                eyebrow: 'EXECUTIVE BOARD DECKS',
                desc: 'Automated 15-slide PowerPoint presentations, 21-column audit-ready Excel workbooks, and instant client transparency exports.'
              }
            ].map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={idx}
                  style={{
                    background: '#0B132B',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '32px',
                    transition: 'all 0.25s',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '8px',
                    background: 'rgba(37, 99, 235, 0.12)',
                    border: '1px solid rgba(37, 99, 235, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px'
                  }}>
                    <Icon size={24} color="#38BDF8" />
                  </div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38BDF8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                    {pillar.eyebrow}
                  </div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '12px' }}>
                    {pillar.title}
                  </h3>
                  <p style={{ fontSize: '0.92rem', lineHeight: 1.6, color: '#94A3B8' }}>
                    {pillar.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 4. OPPORTUNITY SECTION ─── */}
      <section id="opportunity" style={{
        padding: '100px 48px',
        maxWidth: '1240px',
        margin: '0 auto'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '56px', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38BDF8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>
              CAPABILITY PARADIGM SHIFT
            </div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.18, letterSpacing: '-0.03em', marginBottom: '20px' }}>
              From Training Activity to Business Capability.
            </h2>
            <p style={{ fontSize: '1.08rem', lineHeight: 1.7, color: '#94A3B8', marginBottom: '32px' }}>
              Traditional training initiatives measure volume—showing how many associates logged in or attended a session. But attendance is not execution. RetailEdge PRO transforms Training &amp; Development into a predictable commercial capability engine that diagnoses skill gaps, verifies competency, and drives measurable store-floor performance.
            </p>

            {/* Comparison Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '10px',
                padding: '20px'
              }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F87171', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Traditional Training: Activity Tracking
                </div>
                <div style={{ fontSize: '0.88rem', color: '#CBD5E1', lineHeight: 1.5 }}>
                  Records attendance sign-ins &bull; Assumes classroom presence equals floor competence &bull; Disconnected from sales conversion &bull; Leaves executives guessing on training ROI.
                </div>
              </div>

              <div style={{
                background: 'rgba(16, 185, 129, 0.06)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '10px',
                padding: '20px'
              }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#34D399', textTransform: 'uppercase', marginBottom: '6px' }}>
                  RetailEdge PRO: Capability Intelligence
                </div>
                <div style={{ fontSize: '0.88rem', color: '#CBD5E1', lineHeight: 1.5 }}>
                  Objectively verifies knowledge retention &bull; Measures real planogram &amp; sales script execution &bull; Identifies at-risk deficit learners for coaching triage &bull; Produces board-ready ROI evidence.
                </div>
              </div>
            </div>
          </div>

          {/* Frontline Retail Imagery */}
          <div style={{ position: 'relative' }}>
            <div style={{
              borderRadius: '16px',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
            }}>
              <img
                src="/images/retailedge_frontline_associate.jpg"
                alt="Frontline Retail Associate with Tablet"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>
            {/* Floating Metric Pill */}
            <div style={{
              position: 'absolute',
              bottom: '-20px',
              left: '30px',
              background: '#0F172A',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '10px',
              padding: '14px 20px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={22} color="#FFFFFF" strokeWidth={3} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>CAPABILITY INDEX</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF' }}>+31.4% Store Execution Lift</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. CAPABILITIES SECTION ─── */}
      <section id="capabilities" style={{
        padding: '96px 48px',
        background: '#0F172A',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38BDF8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
              RETAIL EXCELLENCE DOMAINS
            </div>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.03em', maxWidth: '840px', margin: '0 auto 16px' }}>
              Develop the Capabilities That Drive Retail Performance.
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#94A3B8', maxWidth: '720px', margin: '0 auto' }}>
              Targeted skill modules developed, assessed, and verified across frontline promoter and store teams.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
            {[
              {
                title: 'Product Knowledge',
                desc: 'Deep SKU technical specifications, competitive USPs, new launch readiness, pricing tiers, and consumer-facing value propositions.',
                tag: 'Knowledge Benchmark'
              },
              {
                title: 'Sales Techniques',
                desc: 'Consultative selling frameworks, objection handling, cross-selling, basket-size expansion, and closing strategies.',
                tag: 'Revenue Driver'
              },
              {
                title: 'In-Store Execution',
                desc: 'Planogram compliance, visual merchandising standards, promo display positioning, shelf share, and on-shelf availability audits.',
                tag: 'Floor Standards'
              },
              {
                title: 'Customer Engagement',
                desc: 'Brand storytelling, greeting protocols, experiential product demonstrations, loyalty onboarding, and memorable shopper moments.',
                tag: 'Brand Experience'
              },
              {
                title: 'Compliance & Reporting',
                desc: 'Daily SOP adherence, inventory cycle counts, competition price tracking, counterfeit alert protocols, and verified reporting.',
                tag: 'Governance'
              },
              {
                title: 'Soft Skills',
                desc: 'Active listening, professional body language, customer de-escalation, conflict resolution, and collaborative team communication.',
                tag: 'Workforce Readiness'
              }
            ].map((cap, idx) => (
              <div
                key={idx}
                style={{
                  background: '#0B132B',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '28px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#38BDF8',
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.2)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    display: 'inline-block',
                    marginBottom: '14px'
                  }}>
                    {cap.tag}
                  </span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '10px' }}>
                    {cap.title}
                  </h3>
                  <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#94A3B8' }}>
                    {cap.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 6. PLATFORM WORKFLOW SECTION (DARK NAVY) ─── */}
      <section id="workflow" style={{
        padding: '100px 48px',
        background: '#070E22',
        position: 'relative'
      }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38BDF8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
              OPERATIONAL WORKFLOW
            </div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.03em', marginBottom: '16px' }}>
              A Connected Training &amp; Development Journey.
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#94A3B8', maxWidth: '720px', margin: '0 auto' }}>
              A closed-loop operational pipeline ensuring zero drop-off from curriculum planning to executive boardroom impact.
            </p>
          </div>

          {/* Horizontal 5-Step Process Pipeline */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '16px',
            position: 'relative'
          }}>
            {[
              { step: '01', title: 'Plan', sub: 'Curriculum & Hierarchy', desc: 'Define learning objectives, schedule sessions, assign trainers, and scope multi-tier project structures.' },
              { step: '02', title: 'Train', sub: 'Live Arena & Blended', desc: 'Deliver interactive classroom and synchronous mobile arena sessions with real-time participation.' },
              { step: '03', title: 'Assess', sub: 'Objective Verification', desc: 'Evaluate frontline comprehension with fastest-finger speed drills, timer-driven questions, and answer reveals.' },
              { step: '04', title: 'Certify', sub: 'Dual-Gate Qualification', desc: 'Authoritative rules enforce Attendance ≥80% AND Assessment ≥70% before issuing tamper-evident certificates.' },
              { step: '05', title: 'Analyze', sub: 'Executive Board Decks', desc: 'Generate 15-slide PowerPoint presentations, Excel workbooks, and at-risk coaching alerts.' }
            ].map((st, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '24px 18px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38BDF8' }}>{st.step}</span>
                    <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phase</span>
                  </div>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>{st.title}</h4>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#93C5FD', marginBottom: '12px' }}>{st.sub}</div>
                  <p style={{ fontSize: '0.82rem', lineHeight: 1.55, color: '#94A3B8' }}>{st.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 7. STAKEHOLDER SECTION ─── */}
      <section id="stakeholders" style={{
        padding: '96px 48px',
        maxWidth: '1240px',
        margin: '0 auto'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38BDF8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
            ENTERPRISE ALIGNMENT
          </div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.03em', marginBottom: '16px' }}>
            Role-Based Value. Enterprise-Wide Impact.
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#94A3B8', maxWidth: '720px', margin: '0 auto' }}>
            Purpose-built cockpits and governance workflows tailored for every stakeholder in the training value chain.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {[
            {
              role: 'Trainer',
              icon: Presentation,
              focus: 'Host Control & Synchronous Quizzes',
              impact: 'Runs Live Arena sessions, generates instant QR codes, controls answer reveals, and monitors participant engagement in real-time.'
            },
            {
              role: 'Supervisor',
              icon: UserCheck,
              focus: 'Ground Governance & Operational Triage',
              impact: 'Monitors store-level promoter attendance, tracks individual quiz scores, and prioritizes at-risk learners for immediate coaching.'
            },
            {
              role: 'T&D Manager',
              icon: Compass,
              focus: 'Capability Cockpit & Portfolio Health',
              impact: 'Governs curriculum compliance, monitors regional workforce health scores, and tracks certified promoter density across projects.'
            },
            {
              role: 'Client Partner',
              icon: Briefcase,
              focus: 'Commercial Transparency & Audit Readiness',
              impact: 'Views brand-isolated performance metrics, downloads automated 15-slide board presentations, and verifies agency SLA compliance.'
            },
            {
              role: 'Frontline Participant',
              icon: Smartphone,
              focus: 'Mobile Learning & Verified Credentials',
              impact: 'Joins live arena quizzes with PIN code, receives instant feedback, benchmarks against peers, and downloads verified PDF certificates.'
            },
            {
              role: 'Enterprise Leadership',
              icon: LineChart,
              focus: 'Workforce Readiness & Commercial ROI',
              impact: 'Benchmarks capability across regions, aligns training with sales performance, and receives boardroom-ready executive intelligence.'
            }
          ].map((st, idx) => {
            const Icon = st.icon;
            return (
              <div
                key={idx}
                style={{
                  background: '#0F172A',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '28px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '8px',
                      background: 'rgba(37, 99, 235, 0.15)',
                      border: '1px solid rgba(37, 99, 235, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Icon size={20} color="#38BDF8" />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFFFFF' }}>{st.role}</h4>
                      <div style={{ fontSize: '0.72rem', color: '#38BDF8', fontWeight: 600 }}>{st.focus}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: '#94A3B8' }}>{st.impact}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 8. INDUSTRY SECTORS SECTION ─── */}
      <section id="industries" style={{
        padding: '96px 48px',
        background: '#0F172A',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38BDF8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
              SECTOR EXPERTISE
            </div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.03em', marginBottom: '16px' }}>
              Enabling Frontline Excellence Across Key Sectors.
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#94A3B8', maxWidth: '720px', margin: '0 auto' }}>
              Designed to meet the specific operational, regulatory, and speed-to-market demands of leading enterprise retail verticals.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {[
              { title: 'FMCG & CPG', icon: ShoppingBag, focus: 'High-velocity retail distribution, brand promoters, on-shelf availability, and planogram compliance.' },
              { title: 'Beauty & Personal Care', icon: Sparkles, focus: 'Consultative counter demonstrations, product ingredients, application regimen upselling, and brand trust.' },
              { title: 'Consumer Electronics', icon: Cpu, focus: 'Complex technical feature translation, multi-brand comparisons, live demos, and warranty attachments.' },
              { title: 'Telecom & Digital Services', icon: Smartphone, focus: 'Plan migrations, handset financing guidance, SIM activation compliance, and network advantage communication.' },
              { title: 'Healthcare & Wellness', icon: HeartPulse, focus: 'OTC product knowledge, patient privacy compliance, ethical consultation protocols, and brand credibility.' },
              { title: 'Modern Trade Retail', icon: Building2, focus: 'Hypermarket promoter team coordination, visual merchandising, aisle engagement, and shopper conversion.' }
            ].map((sec, idx) => {
              const Icon = sec.icon;
              return (
                <div
                  key={idx}
                  style={{
                    background: '#0B132B',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '24px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={18} color="#38BDF8" />
                    </div>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>{sec.title}</h4>
                  </div>
                  <p style={{ fontSize: '0.86rem', lineHeight: 1.6, color: '#94A3B8' }}>{sec.focus}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 9. FINAL ENTERPRISE CTA ─── */}
      <section style={{
        padding: '120px 48px',
        background: 'linear-gradient(180deg, #070E22 0%, #030712 100%)',
        textAlign: 'center',
        position: 'relative'
      }}>
        <div style={{ maxWidth: '840px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#38BDF8',
            marginBottom: '16px'
          }}>
            STRATEGIC PARTNERSHIP
          </div>

          <h2 style={{
            fontSize: 'clamp(2.4rem, 4.5vw, 3.6rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            color: '#FFFFFF',
            marginBottom: '20px'
          }}>
            Build the capability your business needs next.
          </h2>

          <p style={{
            fontSize: '1.2rem',
            lineHeight: 1.6,
            color: '#94A3B8',
            marginBottom: '44px'
          }}>
            Partner with Idonneous to empower your frontline teams with RetailEdge PRO.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <button
              onClick={() => setShowDemoModal(true)}
              style={{
                background: '#2563EB',
                color: '#FFFFFF',
                padding: '16px 36px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '1.05rem',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(37, 99, 235, 0.45)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <span>Request an Enterprise Demo</span>
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── 10. ENTERPRISE FOOTER ─── */}
      <footer id="about" style={{
        background: '#040711',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '72px 48px 40px',
        fontSize: '0.88rem'
      }}>
        <div style={{
          maxWidth: '1240px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr',
          gap: '48px',
          paddingBottom: '56px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          {/* Col 1: Brand & Positioning */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '6px', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Compass size={18} color="#FFFFFF" />
              </div>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                RetailEdge <span style={{ color: '#38BDF8' }}>PRO</span>
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
              BY IDONNEOUS MARKETING SERVICES
            </div>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: '#64748B', maxWidth: '340px', marginBottom: '20px' }}>
              Enterprise Training &amp; Development platform designed for commercial retail frontline capability, objective assessment, attendance governance, and client reporting.
            </p>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38BDF8', letterSpacing: '0.05em' }}>
              People. Power. Progress.
            </div>
          </div>

          {/* Col 2: Platform Pillars */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
              Platform
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', color: '#94A3B8', fontSize: '0.85rem' }}>
              <a href="#pillars" style={{ color: '#94A3B8', textDecoration: 'none' }}>Live Interactive Arena</a>
              <a href="#pillars" style={{ color: '#94A3B8', textDecoration: 'none' }}>Capability Cockpit</a>
              <a href="#pillars" style={{ color: '#94A3B8', textDecoration: 'none' }}>Automated Certification</a>
              <a href="#pillars" style={{ color: '#94A3B8', textDecoration: 'none' }}>Executive PPT Decks</a>
              <a href="#pillars" style={{ color: '#94A3B8', textDecoration: 'none' }}>Audit-Ready Excel Reports</a>
            </div>
          </div>

          {/* Col 3: Capabilities */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
              Capabilities
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', color: '#94A3B8', fontSize: '0.85rem' }}>
              <a href="#capabilities" style={{ color: '#94A3B8', textDecoration: 'none' }}>Product Knowledge</a>
              <a href="#capabilities" style={{ color: '#94A3B8', textDecoration: 'none' }}>Sales Techniques</a>
              <a href="#capabilities" style={{ color: '#94A3B8', textDecoration: 'none' }}>In-Store Execution</a>
              <a href="#capabilities" style={{ color: '#94A3B8', textDecoration: 'none' }}>Customer Engagement</a>
              <a href="#capabilities" style={{ color: '#94A3B8', textDecoration: 'none' }}>Compliance &amp; Reporting</a>
            </div>
          </div>

          {/* Col 4: Corporate & Governance */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
              Idonneous
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', color: '#94A3B8', fontSize: '0.85rem' }}>
              <span style={{ color: '#94A3B8' }}>Corporate Headquarters: Mumbai, India</span>
              <span style={{ color: '#94A3B8' }}>Inquiries: enterprise@idonneous.com</span>
              <span style={{ color: '#94A3B8' }}>Compliance: ISO 27001 Aligned</span>
              <span style={{ color: '#94A3B8' }}>Tenant Data Isolation Active</span>
            </div>
          </div>
        </div>

        {/* Legal & Copyright */}
        <div style={{
          maxWidth: '1240px',
          margin: '28px auto 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#64748B',
          fontSize: '0.78rem'
        }}>
          <div>
            &copy; {new Date().getFullYear()} Idonneous Marketing Services Pvt. Ltd. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            <span style={{ cursor: 'pointer' }}>Privacy Policy</span>
            <span style={{ cursor: 'pointer' }}>Terms of Enterprise Use</span>
            <span style={{ cursor: 'pointer' }}>Information Security</span>
            <span style={{ cursor: 'pointer' }}>Audit Architecture</span>
          </div>
        </div>
      </footer>

      {/* ─── MODAL 1: ENTERPRISE DEMO REQUEST ─── */}
      <AnimatePresence>
        {showDemoModal && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                background: '#0F172A',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '16px',
                padding: '36px',
                width: '100%',
                maxWidth: '600px',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)',
                position: 'relative'
              }}
            >
              <button
                onClick={() => { setShowDemoModal(false); setDemoSubmitted(false); }}
                style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>

              {!demoSubmitted ? (
                <>
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38BDF8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      COMMERCIAL CONSULTATION
                    </div>
                    <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
                      Request an Enterprise Demo
                    </h3>
                    <p style={{ fontSize: '0.88rem', color: '#94A3B8' }}>
                      Connect with the Idonneous advisory team to schedule a custom walkthrough tailored to your retail frontline workforce.
                    </p>
                  </div>

                  <form onSubmit={handleDemoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>Full Name *</label>
                        <input
                          type="text"
                          required
                          value={demoForm.fullName}
                          onChange={(e) => setDemoForm({ ...demoForm, fullName: e.target.value })}
                          placeholder="e.g. Rajesh Sharma"
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#0B132B', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#FFFFFF', fontSize: '0.88rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>Work Email *</label>
                        <input
                          type="email"
                          required
                          value={demoForm.workEmail}
                          onChange={(e) => setDemoForm({ ...demoForm, workEmail: e.target.value })}
                          placeholder="r.sharma@enterprise.com"
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#0B132B', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#FFFFFF', fontSize: '0.88rem' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>Organization Name *</label>
                        <input
                          type="text"
                          required
                          value={demoForm.organization}
                          onChange={(e) => setDemoForm({ ...demoForm, organization: e.target.value })}
                          placeholder="e.g. Hindustan Unilever Ltd"
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#0B132B', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#FFFFFF', fontSize: '0.88rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>Contact Phone</label>
                        <input
                          type="tel"
                          value={demoForm.phone}
                          onChange={(e) => setDemoForm({ ...demoForm, phone: e.target.value })}
                          placeholder="+91 98200 XXXXX"
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#0B132B', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#FFFFFF', fontSize: '0.88rem' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>Frontline Team Scope</label>
                        <select
                          value={demoForm.teamSize}
                          onChange={(e) => setDemoForm({ ...demoForm, teamSize: e.target.value })}
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#0B132B', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#FFFFFF', fontSize: '0.88rem' }}
                        >
                          <option>Under 250 associates</option>
                          <option>250–1,000 associates</option>
                          <option>1,000–5,000 associates</option>
                          <option>5,000+ associates (Enterprise)</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>Primary Vertical</label>
                        <select
                          value={demoForm.industry}
                          onChange={(e) => setDemoForm({ ...demoForm, industry: e.target.value })}
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#0B132B', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#FFFFFF', fontSize: '0.88rem' }}
                        >
                          <option>FMCG &amp; CPG</option>
                          <option>Beauty &amp; Personal Care</option>
                          <option>Consumer Electronics</option>
                          <option>Telecom &amp; Digital Services</option>
                          <option>Modern Trade Retail</option>
                          <option>Healthcare &amp; Wellness</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingDemo}
                      style={{
                        marginTop: '8px',
                        background: '#2563EB',
                        border: 'none',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        padding: '13px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      {isSubmittingDemo ? 'Scheduling Consultation...' : 'Confirm Enterprise Demo Request'}
                    </button>
                  </form>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Check size={28} color="#10B981" />
                  </div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
                    Consultation Request Confirmed
                  </h3>
                  <p style={{ fontSize: '0.92rem', color: '#94A3B8', maxWidth: '440px', margin: '0 auto 24px' }}>
                    Thank you, {demoForm.fullName}. An Idonneous Enterprise Solutions Partner will contact you within 4 business hours to arrange your customized walkthrough.
                  </p>
                  <button
                    onClick={() => { setShowDemoModal(false); setDemoSubmitted(false); }}
                    style={{ background: '#2563EB', color: '#FFFFFF', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
                  >
                    Return to Platform Overview
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 2: ENTERPRISE SIGN IN ─── */}
      <AnimatePresence>
        {showLoginModal && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                background: '#0F172A',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '16px',
                padding: '36px',
                width: '100%',
                maxWidth: '480px',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)',
                position: 'relative'
              }}
            >
              <button
                onClick={() => setShowLoginModal(false)}
                style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38BDF8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
                  AUTHORIZED ACCESS ONLY
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '6px' }}>
                  Sign In to RetailEdge PRO
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
                  Access your role-specific capability cockpit, session controls, and reporting.
                </p>
              </div>

              {loginError && (
                <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', borderRadius: '8px', color: '#FCA5A5', fontSize: '0.82rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>Corporate Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@enterprise.com"
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', background: '#0B132B', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#FFFFFF', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', background: '#0B132B', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#FFFFFF', fontSize: '0.88rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  style={{
                    marginTop: '8px',
                    background: '#2563EB',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    padding: '12px',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  {isLoggingIn ? 'Verifying Identity...' : 'Sign In'}
                </button>
              </form>

              {/* Demo Quick-Select Personas */}
              <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  Or Quick-Fill Demo Enterprise Persona:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {['Super Admin', 'T&D Manager', 'Client', 'Supervisor', 'Trainer'].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => fillDemoCredentials(role)}
                      style={{
                        fontSize: '0.72rem',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#93C5FD',
                        cursor: 'pointer'
                      }}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 3: QUICK CAPABILITY SEARCH ─── */}
      <AnimatePresence>
        {showSearchModal && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '100px', paddingLeft: '20px', paddingRight: '20px'
          }}>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{
                background: '#0F172A',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                padding: '20px',
                width: '100%',
                maxWidth: '560px',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px', marginBottom: '16px' }}>
                <Search size={18} color="#38BDF8" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search capabilities, modules, reports, or sectors..."
                  style={{ width: '100%', background: 'transparent', border: 'none', color: '#FFFFFF', fontSize: '0.95rem', outline: 'none' }}
                />
                <button onClick={() => setShowSearchModal(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredSearch.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.link}
                    onClick={() => setShowSearchModal(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      color: '#FFFFFF',
                      textDecoration: 'none',
                      fontSize: '0.88rem'
                    }}
                  >
                    <span>{item.title}</span>
                    <span style={{ fontSize: '0.72rem', color: '#38BDF8', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                      {item.category}
                    </span>
                  </a>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
