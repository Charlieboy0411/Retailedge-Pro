import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import { PlayCircle, ChevronRight, X } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Demo Modal State
  const [showDemo, setShowDemo] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      login(response.data.token, response.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Demo screenshots
  const demoSlides = [
    { src: '/mockups/tour_mockup_live_arena_1781846848205.png', title: 'Live Arena Dashboard', desc: 'Manage live sessions, track participant engagement, and host interactive quizzes in real-time.' },
    { src: '/mockups/tour_mockup_client_reporting_1781846858907.png', title: 'Executive Analytics & Reporting', desc: 'Get a bird\'s-eye view of organizational performance and generate beautiful automated PDF reports.' },
    { src: '/mockups/tour_mockup_gamification_1781846874819.png', title: 'Gamification & Rewards', desc: 'Motivate your workforce with a premium tier-based progress system, badges, and tangible rewards.' },
    { src: '/mockups/tour_mockup_org_chart_1781846886884.png', title: 'Organizational Hierarchy', desc: 'Visualize your entire corporate structure with interactive node-based maps linking Directors to Promoters.' }
  ];
  const [currentSlide, setCurrentSlide] = useState(0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#ECEFF1', overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>
      
      {/* ── HEADER ── */}
      <header style={{ 
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50, 
        padding: '20px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo.png" alt="Idonneous" style={{ height: '40px' }} />
          <div style={{ width: '1px', height: '24px', background: 'rgba(31,35,40,0.2)' }} />
          <span style={{ color: '#1F2328', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '0.5px' }}>RetailEdge Pro</span>
        </div>

        {/* Navigation */}
        <nav style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          {['Product', 'Features', 'Solutions', 'Pricing', 'Support'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} style={{ color: '#5F6875', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 700, transition: 'color 0.2s' }}
               onMouseOver={e => e.currentTarget.style.color = '#3E5C8A'}
               onMouseOut={e => e.currentTarget.style.color = '#5F6875'}>
              {item}
            </a>
          ))}
        </nav>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button onClick={() => setShowDemo(true)} style={{ 
            background: 'transparent', border: '1px solid rgba(31,35,40,0.4)', color: '#1F2328', 
            padding: '10px 20px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
          }} onMouseOver={e => { e.currentTarget.style.background = 'rgba(31,35,40,0.05)'; e.currentTarget.style.borderColor = '#1F2328'; }} onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(31,35,40,0.4)'; }}>
            <PlayCircle size={18} /> Request Demo
          </button>
          <button onClick={() => document.getElementById('email-input').focus()} style={{ 
            background: '#3E5C8A', border: 'none', color: '#FFFFFF', 
            padding: '10px 24px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(62,92,138,0.3)', transition: 'transform 0.2s'
          }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'none'}>
            Sign In
          </button>
        </div>
      </header>

      {/* ── HERO SECTION (SPLIT SCREEN) ── */}
      <div style={{ display: 'flex', minHeight: '100vh', paddingTop: '80px' }}>
        
        {/* LEFT SIDE: 3D Graphite Abstract Background */}
        <div style={{ 
          flex: 1.2, 
          background: 'linear-gradient(135deg, #1F2328 0%, #2D3135 100%)',
          position: 'relative',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '0 80px',
          overflow: 'hidden'
        }}>
          {/* Decorative Elements */}
          <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'rgba(62,92,138,0.15)', filter: 'blur(100px)' }} />
          <div style={{ position: 'absolute', bottom: '-20%', right: '10%', width: '600px', height: '600px', borderRadius: '50%', background: 'rgba(199,154,59,0.08)', filter: 'blur(120px)' }} />
          
          <div style={{ zIndex: 10 }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div style={{ 
                display: 'inline-flex', alignItems: 'center', gap: '8px', 
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                padding: '8px 20px', borderRadius: '40px', marginBottom: '24px' 
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3E5C8A', display: 'inline-block' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#E6E8EB' }}>Enterprise Learning Management</span>
              </div>
              
              <h1 style={{ 
                fontFamily: "'Poppins', sans-serif", fontSize: '4rem', fontWeight: 900, lineHeight: 1.1, 
                color: '#FFFFFF', marginBottom: '24px' 
              }}>
                Elevate Your<br/>Corporate Training.
              </h1>
              
              <p style={{ 
                fontSize: '1.2rem', color: '#B7BEC7', lineHeight: 1.6, maxWidth: '540px', marginBottom: '48px' 
              }}>
                The premier platform for FMCG and promoter teams. Deliver real-time assessments, interactive modules, and generate executive analytics instantly.
              </p>

              <div style={{ display: 'flex', gap: '32px' }}>
                <div>
                  <h3 style={{ color: '#FFFFFF', fontSize: '2rem', fontWeight: 800, margin: '0 0 4px 0' }}>10k+</h3>
                  <p style={{ color: '#727A86', fontSize: '0.9rem', margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>Active Learners</p>
                </div>
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                <div>
                  <h3 style={{ color: '#FFFFFF', fontSize: '2rem', fontWeight: 800, margin: '0 0 4px 0' }}>98%</h3>
                  <p style={{ color: '#727A86', fontSize: '0.9rem', margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>Completion Rate</p>
                </div>
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                <div>
                  <h3 style={{ color: '#FFFFFF', fontSize: '2rem', fontWeight: 800, margin: '0 0 4px 0' }}>24/7</h3>
                  <p style={{ color: '#727A86', fontSize: '0.9rem', margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>Enterprise Support</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* RIGHT SIDE: Platinum Frosted Glass */}
        <div style={{ 
          flex: 0.8, 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#ECEFF1', position: 'relative'
        }}>
          {/* Background Accent */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '1px', background: 'linear-gradient(to bottom, transparent, #B7BEC7, transparent)' }} />
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            style={{ 
              width: '100%', maxWidth: '440px', 
              background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)',
              borderRadius: '24px', padding: '48px 40px', 
              boxShadow: '0 12px 48px rgba(31,35,40,0.08)', border: '1px solid #FFFFFF' 
          }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <img src="/logo.png" alt="Idonneous Logo" style={{ height: '54px', marginBottom: '16px' }} />
              <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1.6rem', fontWeight: 800, color: '#1F2328', margin: '0 0 8px 0' }}>
                Executive Login
              </h2>
              <p style={{ color: '#5F6875', fontSize: '0.95rem', margin: 0 }}>
                Access your dashboard
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{ background: 'rgba(184,74,74,0.1)', color: '#B84A4A', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem', fontWeight: 600, border: '1px solid rgba(184,74,74,0.2)' }}>
                {error}
              </div>
            )}
            
            {/* Forms */}
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1F2328', marginBottom: '8px' }}>Email Address</label>
                <input id="email-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@idonneous.com"
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #B7BEC7', background: '#F4F5F7', fontSize: '0.95rem', outline: 'none' }} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1F2328' }}>Password</label>
                  <button type="button" onClick={() => alert('A password reset link has been sent to your email address if it exists in our system.')} style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.8rem', color: '#3E5C8A', fontWeight: 600, cursor: 'pointer' }}>Forgot?</button>
                </div>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #B7BEC7', background: '#F4F5F7', fontSize: '0.95rem', outline: 'none' }} />
              </div>
              <button type="submit" disabled={isLoading} style={{ 
                marginTop: '12px', width: '100%', padding: '16px', borderRadius: '12px', border: 'none', 
                background: '#3E5C8A', color: '#FFFFFF', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(62,92,138,0.25)', transition: 'transform 0.2s', opacity: isLoading ? 0.7 : 1
              }}>
                {isLoading ? 'Authenticating...' : 'Access Dashboard →'}
              </button>
            </form>

          </motion.div>
        </div>
      </div>

      {/* ── DETAILED SECTIONS ── */}
      
      {/* Product Section */}
      <section id="product" style={{ padding: '100px 48px', background: '#FFFFFF', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2.5rem', color: '#1F2328', fontWeight: 800, marginBottom: '24px' }}>The RetailEdge Pro Product</h2>
        <p style={{ maxWidth: '800px', margin: '0 auto 48px auto', color: '#5F6875', fontSize: '1.1rem', lineHeight: 1.6 }}>
          An all-in-one Enterprise Learning Management System designed to bridge the gap between executive strategy and field-level execution. From interactive live arenas to offline remote assessments, RetailEdge Pro delivers measurable training ROI.
        </p>
      </section>

      {/* Features Section */}
      <section id="features" style={{ padding: '100px 48px', background: '#F4F5F7' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', color: '#1F2328', fontWeight: 800, textAlign: 'center', marginBottom: '64px' }}>Enterprise Features</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
            <div style={{ background: '#FFFFFF', padding: '32px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#1F2328', fontWeight: 700 }}>Real-Time Live Arena</h3>
              <p style={{ color: '#5F6875', marginTop: '12px' }}>Host synchronous sessions with live leaderboards, instantaneous polling, and dynamic gamification elements.</p>
            </div>
            <div style={{ background: '#FFFFFF', padding: '32px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#1F2328', fontWeight: 700 }}>Offline Assessments</h3>
              <p style={{ color: '#5F6875', marginTop: '12px' }}>Deploy self-paced modules to remote teams without requiring an active internet connection or live host.</p>
            </div>
            <div style={{ background: '#FFFFFF', padding: '32px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#1F2328', fontWeight: 700 }}>Automated Certification</h3>
              <p style={{ color: '#5F6875', marginTop: '12px' }}>Instantly generate and distribute beautifully formatted PDF certificates to learners upon quiz completion.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section id="solutions" style={{ padding: '100px 48px', background: '#1F2328', color: '#FFFFFF', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '24px' }}>Solutions Built for Your Scale</h2>
        <p style={{ maxWidth: '800px', margin: '0 auto 48px auto', color: '#B7BEC7', fontSize: '1.1rem', lineHeight: 1.6 }}>
          Whether you're managing a nationwide network of FMCG promoters, coordinating multi-brand retail training, or developing executive leadership, our platform adapts to your organizational hierarchy.
        </p>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{ padding: '100px 48px', background: '#FFFFFF' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.5rem', color: '#1F2328', fontWeight: 800, marginBottom: '48px' }}>Premium Pricing Tiers</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
            <div style={{ padding: '48px', borderRadius: '24px', border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
              <h3 style={{ fontSize: '1.5rem', color: '#1F2328', fontWeight: 800 }}>Corporate</h3>
              <p style={{ color: '#5F6875', margin: '16px 0 32px' }}>For mid-sized organizations</p>
              <h4 style={{ fontSize: '3rem', margin: 0, color: '#1F2328' }}>Custom</h4>
              <button style={{ marginTop: '32px', width: '100%', padding: '16px', borderRadius: '8px', background: '#3E5C8A', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Contact Sales</button>
            </div>
            <div style={{ padding: '48px', borderRadius: '24px', border: '2px solid #3E5C8A', background: '#FFFFFF', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)', background: '#3E5C8A', color: '#fff', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>MOST POPULAR</div>
              <h3 style={{ fontSize: '1.5rem', color: '#1F2328', fontWeight: 800 }}>Enterprise Silver</h3>
              <p style={{ color: '#5F6875', margin: '16px 0 32px' }}>For large scale FMCG networks</p>
              <h4 style={{ fontSize: '3rem', margin: 0, color: '#1F2328' }}>Custom</h4>
              <button style={{ marginTop: '32px', width: '100%', padding: '16px', borderRadius: '8px', background: '#3E5C8A', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Contact Sales</button>
            </div>
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section id="support" style={{ padding: '100px 48px', background: '#F4F5F7', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2.5rem', color: '#1F2328', fontWeight: 800, marginBottom: '24px' }}>24/7 Premium Support</h2>
        <p style={{ maxWidth: '800px', margin: '0 auto', color: '#5F6875', fontSize: '1.1rem', lineHeight: 1.6 }}>
          Our dedicated account managers and technical support teams are available around the clock. We offer comprehensive onboarding, custom API integrations, and SLA-backed reliability guarantees for your enterprise.
        </p>
      </section>

      {/* ── FULL SCREEN DEMO VIDEO MODAL ── */}
      <AnimatePresence>
        {showDemo && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ 
              position: 'fixed', inset: 0, zIndex: 9999, 
              background: '#000000',
              display: 'flex', flexDirection: 'column'
            }}>
            
            {/* Close Button Overlay */}
            <div style={{ position: 'absolute', top: '24px', right: '32px', zIndex: 10 }}>
              <button onClick={() => setShowDemo(false)} style={{ 
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', 
                width: '48px', height: '48px', borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                cursor: 'pointer', color: '#FFFFFF', transition: 'all 0.2s', backdropFilter: 'blur(10px)'
              }} onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.2)'} onMouseOut={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}>
                <X size={24} />
              </button>
            </div>

            {/* Video Player */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              <video 
                src="/RetailEdge_Pro_Final_With_Audio.mp4" 
                autoPlay 
                controls 
                style={{ width: '100%', height: '100%', objectFit: 'contain', outline: 'none' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
