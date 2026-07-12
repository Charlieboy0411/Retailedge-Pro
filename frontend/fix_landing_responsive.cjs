const fs = require('fs');

const code = `import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { PlayCircle, ChevronRight, BarChart2, Smartphone, Shield, Users, Zap, Award, ArrowRight, X, Menu } from 'lucide-react';
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
        setClients(res.data);
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

  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      login(response.data.token, response.data.user);
      
      // Route based on role
      if (response.data.user.role === 'Project Manager') {
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

  // Product Tour State
  const [activeFeature, setActiveFeature] = useState('live');
  const features = {
    live: {
      title: 'Live Arena Dashboard',
      desc: 'Manage live sessions, track participant engagement, and host interactive quizzes in real-time.',
      img: '/mockups/tour_mockup_live_arena_1781846848205.png'
    },
    analytics: {
      title: 'Executive Analytics',
      desc: 'Get a bird\\'s-eye view of organizational performance and generate beautiful automated PDF reports.',
      img: '/mockups/tour_mockup_client_reporting_1781846858907.png'
    },
    gamification: {
      title: 'Gamification & Rewards',
      desc: 'Motivate your workforce with a premium tier-based progress system, badges, and tangible rewards.',
      img: '/mockups/tour_mockup_gamification_1781846874819.png'
    }
  };

  // Helper for generating initials fallback for client logos
  const getInitials = (name) => {
    if (!name) return 'C';
    const words = name.split(' ');
    if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  // Responsive CSS & Animations
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = \`
      @keyframes marquee {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      .marquee-container {
        display: flex;
        width: 200%;
        animation: marquee 30s linear infinite;
      }
      .marquee-container:hover {
        animation-play-state: paused;
      }
      .hero-mockup {
        transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      .hero-mockup:hover {
        transform: perspective(1000px) rotateY(-5deg) rotateX(2deg) scale(1.02) !important;
      }

      /* Responsive Styles */
      .nav-links { display: flex; gap: 32px; align-items: center; }
      .mobile-menu-btn { display: none; }
      .hero-container { display: flex; width: 100%; max-width: 1400px; margin: 0 auto; z-index: 10; align-items: center; }
      .hero-left { flex: 1; padding-right: 40px; display: flex; flex-direction: column; justify-content: center; }
      .hero-right { flex: 1.2; display: flex; align-items: center; justify-content: center; perspective: 1200px; }
      .hero-title { font-size: 4.5rem; line-height: 1.05; }
      .tour-container { display: flex; gap: 64px; align-items: center; max-width: 1400px; margin: 0 auto; }
      
      @media (max-width: 992px) {
        .nav-links { display: none; }
        .mobile-menu-btn { display: block; background: transparent; border: none; color: var(--text-primary); cursor: pointer; }
        .hero-container { flex-direction: column; text-align: center; gap: 40px; }
        .hero-left { padding-right: 0; align-items: center; }
        .hero-right { width: 100%; padding: 0 20px; }
        .hero-title { font-size: 3rem; }
        .hero-desc { text-align: center; }
        .hero-actions { justify-content: center; flex-wrap: wrap; }
        .tour-container { flex-direction: column; }
        .metrics-container { flex-direction: column; gap: 40px; }
      }
      @media (max-width: 480px) {
        .hero-title { font-size: 2.2rem; }
        .tour-selector h4 { font-size: 1rem; }
      }
    \`;
    document.head.appendChild(style);
    return () => {
      if(document.head.contains(style)) {
        document.head.removeChild(style);
      }
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'transparent', overflowX: 'hidden', fontFamily: "'Inter', sans-serif" }}>
      
      {/* ── HEADER ── */}
      <header style={{ 
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, 
        padding: '16px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(10, 15, 28, 0.8)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => window.scrollTo(0,0)}>
          <img src="/logo.png" alt="Idonneous" style={{ height: '36px' }} />
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.5px' }}>RetailEdge Pro</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="nav-links">
          {['Platform', 'Features', 'Impact'].map(item => (
            <a key={item} href={\`#\${item.toLowerCase()}\`} style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, transition: 'color 0.2s' }}
               onMouseOver={e => e.currentTarget.style.color = 'var(--text-primary)'}
               onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
              {item}
            </a>
          ))}
        </nav>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button className="nav-links" onClick={() => document.getElementById('impact').scrollIntoView({ behavior: 'smooth' })} style={{ 
            background: 'transparent', border: 'none', color: 'var(--text-primary)', 
            fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'color 0.2s', padding: 0
          }} onMouseOver={e => e.currentTarget.style.color = 'var(--primary)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-primary)'}>
            Contact Sales
          </button>
          <button onClick={() => setShowLoginModal(true)} style={{ 
            background: 'rgba(0, 240, 255, 0.15)', border: '1px solid rgba(0, 240, 255, 0.4)', color: 'var(--text-primary)', 
            padding: '8px 20px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 240, 255, 0.15), inset 0 0 30px rgba(0, 240, 255, 0.08)', transition: 'all 0.2s'
          }} onMouseOver={e => { e.currentTarget.style.background = 'rgba(0, 240, 255, 0.25)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 240, 255, 0.4)'; }} onMouseOut={e => { e.currentTarget.style.background = 'rgba(0, 240, 255, 0.15)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 240, 255, 0.2)'; }}>
            Login
          </button>
          
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{ position: 'fixed', top: '68px', left: 0, right: 0, background: 'rgba(10,15,28,0.95)', backdropFilter: 'blur(10px)', zIndex: 99, borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', padding: '20px 5%' }}
          >
            {['Platform', 'Features', 'Impact'].map(item => (
              <a key={item} href={\`#\${item.toLowerCase()}\`} onClick={() => setIsMobileMenuOpen(false)} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontSize: '1.1rem', fontWeight: 600, padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {item}
              </a>
            ))}
            <button onClick={() => { setIsMobileMenuOpen(false); document.getElementById('impact').scrollIntoView({ behavior: 'smooth' }); }} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '1.1rem', fontWeight: 700, padding: '16px 0', textAlign: 'left', cursor: 'pointer' }}>
              Contact Sales
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LOGIN MODAL ── */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', padding: '20px' }}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="glass-card"
              style={{ width: '100%', maxWidth: '400px', padding: '40px', position: 'relative' }}
            >
              <button onClick={() => setShowLoginModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
              
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <img src="/logo.png" alt="Idonneous Logo" style={{ height: '48px', marginBottom: '16px' }} />
                <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                  Welcome Back
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                  Log in to access your dashboard
                </p>
              </div>

              {error && (
                <div style={{ background: 'rgba(184,74,74,0.1)', color: '#B84A4A', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem', fontWeight: 600, border: '1px solid rgba(184,74,74,0.2)' }}>
                  {error}
                </div>
              )}
              
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Email Address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@idonneous.com"
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Password</label>
                    <button type="button" onClick={() => alert('A password reset link has been sent to your email address if it exists in our system.')} style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>Forgot?</button>
                  </div>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none' }} />
                </div>
                <button type="submit" disabled={isLoading} style={{ 
                  marginTop: '12px', width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0, 240, 255, 0.4)', 
                  background: 'rgba(0, 240, 255, 0.15)', color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 240, 255, 0.15), inset 0 0 30px rgba(0, 240, 255, 0.08)',
                  transition: 'all 0.2s', opacity: isLoading ? 0.7 : 1
                }}>
                  {isLoading ? 'Authenticating...' : 'Sign In'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HERO SECTION ── */}
      <section style={{ 
        position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', 
        padding: '120px 5% 40px 5%', overflow: 'hidden' 
      }}>
        <div style={{ position: 'absolute', top: '10%', left: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'rgba(0, 240, 255, 0.08)', filter: 'blur(100px)', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '-10%', width: '600px', height: '600px', borderRadius: '50%', background: 'rgba(138, 43, 226, 0.08)', filter: 'blur(120px)', zIndex: 0 }} />
        
        <div className="hero-container">
          <div className="hero-left">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div style={{ 
                display: 'inline-flex', alignItems: 'center', gap: '8px', 
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                padding: '6px 16px', borderRadius: '40px', marginBottom: '24px' 
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#E6E8EB' }}>Enterprise L&D Platform</span>
              </div>
              
              <h1 className="hero-title" style={{ 
                fontFamily: "'Poppins', sans-serif", fontWeight: 900, 
                color: 'var(--text-primary)', marginBottom: '24px', letterSpacing: '-1px'
              }}>
                The Ultimate<br/>Performance Engine.
              </h1>
              
              <p className="hero-desc" style={{ 
                fontSize: '1.15rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '500px', marginBottom: '40px' 
              }}>
                Designed for massive FMCG networks. Deploy real-time interactive training, mobilize your promoters, and unlock executive analytics instantly.
              </p>

              <div className="hero-actions" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <button onClick={() => document.getElementById('platform').scrollIntoView({ behavior: 'smooth' })} style={{ 
                  background: 'var(--primary)', border: 'none', color: '#fff', 
                  padding: '14px 28px', borderRadius: '8px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(0, 240, 255, 0.4)',
                  transition: 'all 0.2s'
                }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  Book a Demo <ArrowRight size={18} />
                </button>
                <button onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })} style={{ 
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', 
                  padding: '14px 28px', borderRadius: '8px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
                }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                  <PlayCircle size={18} /> Discover
                </button>
              </div>
            </motion.div>
          </div>

          <div className="hero-right">
            <motion.div 
              initial={{ opacity: 0, x: 40, rotateY: -10 }} 
              animate={{ opacity: 1, x: 0, rotateY: -15, rotateX: 5 }} 
              transition={{ duration: 0.8, delay: 0.2, type: 'spring' }}
              className="hero-mockup glass-card"
              style={{ 
                background: 'rgba(10, 15, 28, 0.6)', 
                padding: '12px', 
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '-20px 30px 60px rgba(0,0,0,0.6), 0 0 40px rgba(0, 240, 255, 0.2)',
                transformStyle: 'preserve-3d'
              }}
            >
              <img src="/mockups/tour_mockup_live_arena_1781846848205.png" alt="Platform Dashboard" style={{ width: '100%', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── TRUST TICKER ── */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)', padding: '30px 0', overflow: 'hidden' }}>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '24px' }}>
          Trusted by Industry Leaders Worldwide
        </p>
        <div style={{ display: 'flex', overflow: 'hidden' }}>
          <div className="marquee-container">
            {[1, 2].map((group) => (
              <div key={group} style={{ display: 'flex', justifyContent: 'space-around', width: '100%', alignItems: 'center' }}>
                {clients && clients.length > 0 ? (
                  clients.map((client, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {client.client_logo ? (
                        <img src={\`/uploads/client_logos/\${client.client_logo}\`} alt={client.name} style={{ height: '40px', objectFit: 'contain', filter: 'grayscale(100%) brightness(200%)' }} />
                      ) : (
                        <div style={{ 
                          width: '44px', height: '44px', borderRadius: '12px', 
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.2rem', fontFamily: "'Poppins', sans-serif"
                        }}>
                          {getInitials(client.name)}
                        </div>
                      )}
                      {!client.client_logo && (
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', fontWeight: 700, fontFamily: "'Poppins', sans-serif" }}>
                          {client.name}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  ['Acme Corp', 'Global Retail', 'FMCG Partners', 'Apex Solutions', 'Nexus Dynamics', 'Peak Brands'].map((logo, i) => (
                    <span key={i} style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1.4rem', fontWeight: 800, fontFamily: "'Poppins', sans-serif" }}>
                      {logo}
                    </span>
                  ))
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ENTERPRISE VALUE PROPS ── */}
      <section id="platform" style={{ padding: '100px 5%', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>Built for Scale and Speed.</h2>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
            Replace outdated LMS systems with a unified platform that drives engagement and measures real-world impact.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
          {[
            { icon: <BarChart2 size={28} color="var(--primary)" />, title: 'Real-Time Analytics', desc: 'Monitor KPIs, drill down into regional performance, and generate automated PDF reports for executives.' },
            { icon: <Smartphone size={28} color="#A855F7" />, title: 'Mobile-First Promoters', desc: 'Deploy offline-capable quizzes and Gamification features tailored specifically for mobile field teams.' },
            { icon: <Shield size={28} color="#10B981" />, title: 'Enterprise RBAC', desc: 'Complex hierarchical access control allowing COOs, VPs, and Supervisors to see exactly what they need.' }
          ].map((feature, i) => (
            <div key={i} className="glass-card" style={{ padding: '40px 32px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                {feature.icon}
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>{feature.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── INTERACTIVE PRODUCT TOUR ── */}
      <section id="features" style={{ padding: '80px 5% 120px 5%', background: 'radial-gradient(ellipse at bottom, rgba(0,240,255,0.05) 0%, transparent 70%)' }}>
        <div className="tour-container">
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '40px' }}>Discover the Platform</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {Object.keys(features).map(key => (
                <div className="tour-selector" key={key} onClick={() => setActiveFeature(key)} style={{ 
                  padding: '24px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.3s',
                  background: activeFeature === key ? 'rgba(255,255,255,0.05)' : 'transparent',
                  border: \`1px solid \${activeFeature === key ? 'rgba(0,240,255,0.3)' : 'transparent'}\`
                }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: activeFeature === key ? 'var(--primary)' : 'var(--text-primary)' }}>{features[key].title}</h4>
                  <AnimatePresence>
                    {activeFeature === key && (
                      <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} 
                        style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, overflow: 'hidden' }}>
                        {features[key].desc}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1.2, position: 'relative', width: '100%' }}>
            <AnimatePresence mode="wait">
              <motion.div 
                key={activeFeature}
                initial={{ opacity: 0, scale: 0.95, y: 10 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4 }}
                className="glass-card"
                style={{ padding: '8px', background: 'rgba(10,15,28,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <img src={features[activeFeature].img} alt={features[activeFeature].title} style={{ width: '100%', borderRadius: '8px' }} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ── ROI IMPACT METRICS ── */}
      <section id="impact" style={{ padding: '80px 5%', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)' }}>
        <div className="metrics-container" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          {[
            { val: '3x', label: 'Faster Onboarding Time', icon: <Zap size={24} color="#A855F7" /> },
            { val: '98%', label: 'Average Completion Rate', icon: <Award size={24} color="var(--primary)" /> },
            { val: '10k+', label: 'Active Daily Learners', icon: <Users size={24} color="#10B981" /> }
          ].map((metric, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1, minWidth: '200px' }}>
              <div style={{ marginBottom: '16px' }}>{metric.icon}</div>
              <div style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{metric.val}</div>
              <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '8px' }}>{metric.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: '100px 5%', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '800px', height: '800px', background: 'radial-gradient(circle, rgba(0,240,255,0.08) 0%, transparent 60%)', zIndex: 0 }} />
        
        <div style={{ position: 'relative', zIndex: 10, maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '24px' }}>Ready to Transform?</h2>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '40px' }}>
            Join the industry leaders who are already using RetailEdge Pro to elevate their corporate training and field performance.
          </p>
          <button onClick={() => window.location.href = "mailto:sales@idonneous.com"} style={{ 
            background: 'var(--primary)', border: 'none', color: '#fff', 
            padding: '16px 40px', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0, 240, 255, 0.4)', transition: 'all 0.2s'
          }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
            Schedule a Consultation
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '40px 5%', display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <div>&copy; 2026 RetailEdge Pro (Idonneous). All rights reserved.</div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Terms of Service</a>
          <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Contact</a>
        </div>
      </footer>

    </div>
  );
}
`;

fs.writeFileSync('src/pages/LandingPage.jsx', code, 'utf8');
console.log('Successfully made LandingPage.jsx responsive');
