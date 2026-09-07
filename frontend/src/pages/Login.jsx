import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { 
  Sparkles, Shield, ArrowRight, Eye, EyeOff, Lock, Mail, 
  CheckCircle2, AlertCircle, Copy, Check, Radio, Award, 
  BarChart3, Users, Briefcase, Zap, BookOpen, Layers
} from 'lucide-react';

const SHELFY_TIPS = [
  "💡 Fastest responders earn bonus points in the live interactive arena.",
  "🏆 Top store supervisors earn verified commercial certifications.",
  "📦 Product Knowledge modules boost on-ground promoter effectiveness.",
  "⚡ Interactive assessments deliver 4x higher retention for field teams.",
  "🎯 Automated attendance and geo-tagging stream straight into client reports.",
  "📊 Executive dashboards offer instant workforce capability insights.",
];

const ENTERPRISE_CAPABILITIES = [
  { icon: Radio,     title: 'Live Interactive Learning', desc: 'Real-time quiz arena & synchronous host controls' },
  { icon: BookOpen,  title: 'Multimedia Training',       desc: 'Video, SOPs, and structured product curriculum' },
  { icon: Award,     title: 'Assessment & Certification',desc: 'Automated evaluation, tamper-proof credentials' },
  { icon: BarChart3, title: 'Client Analytics & Reports', desc: 'Automated executive 15-slide PPT & Excel engines' },
];

const TARGET_SECTORS = [
  'FMCG', 'Beauty & Cosmetics', 'Personal Care', 
  'Consumer Electronics', 'Telecom', 'Healthcare', 'Modern Trade Retail'
];

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useContext(AuthContext);

  // Login form
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [tipIndex, setTipIndex] = useState(0);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Forgot password modal
  const [fpOpen, setFpOpen]           = useState(false);
  const [fpEmail, setFpEmail]         = useState('');
  const [fpLoading, setFpLoading]     = useState(false);
  const [fpError, setFpError]         = useState('');
  const [fpResult, setFpResult]       = useState(null);
  const [fpCopied, setFpCopied]       = useState(false);
  const [fpMode, setFpMode]           = useState('auto');
  const [fpNewPw, setFpNewPw]         = useState('');
  const [fpConfirm, setFpConfirm]     = useState('');
  const [fpShowNew, setFpShowNew]     = useState(false);
  const [fpShowConf, setFpShowConf]   = useState(false);

  // Rotate tips
  useEffect(() => {
    const iv = setInterval(() => setTipIndex(i => (i + 1) % SHELFY_TIPS.length), 4500);
    return () => clearInterval(iv);
  }, []);

  // Close modal on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeFp(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      login(response.data.token, response.data.user);
      const role = response.data.user?.role;
      const isPMRole = ['Program Manager', 'MD', 'COO', 'VP Operations', 'Marketing Manager'].includes(role);
      const defaultTarget = isPMRole ? '/pm-dashboard' : '/dashboard';
      const returnUrl = searchParams.get('returnUrl') || defaultTarget;
      navigate(returnUrl);
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const quickFill = (role) => {
    const creds = {
      Admin:      'admin@quizhive.com',
      Trainer:    'trainer@quizhive.com',
      PM:         'rubana@idonneous.com',
      Client:     'client@quizhive.com',
      Supervisor: 'supervisor@quizhive.com',
      Marketing:  'marketing@quizhive.com',
      Employee:   'staff@quizhive.com',
    };
    setEmail(creds[role] || '');
    setPassword('password123');
  };

  const openFp = () => {
    setFpOpen(true);
    setFpEmail(email);
    setFpError('');
    setFpResult(null);
    setFpCopied(false);
    setFpMode('auto');
    setFpNewPw('');
    setFpConfirm('');
    setFpShowNew(false);
    setFpShowConf(false);
  };

  const closeFp = () => {
    setFpOpen(false);
    setFpResult(null);
    setFpError('');
  };

  const handleFpSubmit = async (e) => {
    e.preventDefault();
    setFpError('');
    setFpLoading(true);
    try {
      const payload = { email: fpEmail };
      if (fpMode === 'manual') {
        if (!fpNewPw || fpNewPw.length < 6) {
          setFpError('Password must be at least 6 characters.');
          setFpLoading(false);
          return;
        }
        if (fpNewPw !== fpConfirm) {
          setFpError('Passwords do not match.');
          setFpLoading(false);
          return;
        }
        payload.newPassword = fpNewPw;
      }
      const res = await axios.post('/api/auth/reset-password', payload);
      if (res.data.manualSet) {
        setFpResult({ manualSet: true, name: res.data.name });
      } else if (res.data.newPassword) {
        setFpResult({ newPassword: res.data.newPassword, name: res.data.name });
      } else {
        setFpResult({ generic: true });
      }
    } catch (err) {
      setFpError(err.response?.data?.error || 'Failed to process request. Please try again.');
    } finally {
      setFpLoading(false);
    }
  };

  const copyPassword = () => {
    if (fpResult?.newPassword) {
      navigator.clipboard.writeText(fpResult.newPassword).catch(() => {});
      setFpCopied(true);
      setTimeout(() => setFpCopied(false), 2500);
    }
  };

  const useNewPassword = () => {
    if (fpResult?.newPassword) {
      setEmail(fpEmail);
      setPassword(fpResult.newPassword);
      closeFp();
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0B1220', overflow: 'hidden' }}>
      
      {/* ─── LEFT HERO PRESENTATION PANEL ─── */}
      <div style={{
        flex: '1.1',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 56px',
        color: '#FFFFFF',
        position: 'relative',
        borderRight: '1px solid #1E293B',
        background: 'radial-gradient(circle at 10% 20%, rgba(37, 99, 235, 0.12) 0%, transparent 60%), #0B1220'
      }}>
        <div style={{ maxWidth: '580px', zIndex: 1 }}>
          {/* Hero Branding Tag */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(37, 99, 235, 0.12)', border: '1px solid rgba(37, 99, 235, 0.25)', padding: '6px 14px', borderRadius: '20px', marginBottom: '24px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#06B6D4' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#60A5FA' }}>
              Enterprise Retail Intelligence Platform
            </span>
          </div>

          <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: '2.85rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '14px', color: '#FFFFFF', letterSpacing: '-0.03em' }}>
            RetailEdge <span style={{ color: '#2563EB' }}>PRO</span>
          </h1>
          <div style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '18px' }}>
            by Idonneous Marketing Services
          </div>

          <p style={{ fontSize: '1.15rem', fontWeight: 600, color: '#E2E8F0', lineHeight: 1.4, marginBottom: '8px' }}>
            "One Platform. Complete Training Control."
          </p>
          <p style={{ fontSize: '0.92rem', color: '#94A3B8', lineHeight: 1.6, marginBottom: '32px' }}>
            Accelerating workforce capability, live learning, on-ground retail execution, and automated client reporting for enterprise frontline teams.
          </p>

          {/* 4 Core Enterprise Capabilities */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '36px' }}>
            {ENTERPRISE_CAPABILITIES.map((cap, i) => {
              const Icon = cap.icon;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: '#111827', padding: '14px', borderRadius: '10px', border: '1px solid #1E293B' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.15)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '2px' }}>{cap.title}</div>
                    <div style={{ fontSize: '0.74rem', color: '#94A3B8', lineHeight: 1.35 }}>{cap.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Commercial Sector Badges */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              Built for Commercial &amp; Modern Trade Clients
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {TARGET_SECTORS.map((sec, i) => (
                <span key={i} style={{ fontSize: '0.74rem', padding: '4px 10px', borderRadius: '6px', background: '#162033', color: '#CBD5E1', border: '1px solid #1E293B', fontWeight: 500 }}>
                  {sec}
                </span>
              ))}
            </div>
          </div>

          {/* Rotating Shelfy Intelligence Tip */}
          <div style={{ background: '#111827', border: '1px solid #1E293B', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'linear-gradient(135deg, #2563EB, #06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
              AI
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Retail Intelligence Tip</div>
              <div style={{ fontSize: '0.84rem', color: '#E2E8F0', lineHeight: 1.4 }}>{SHELFY_TIPS[tipIndex]}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── RIGHT LOGIN CARD PANEL ─── */}
      <div style={{ flex: '0.9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px' }}>
        <div style={{ width: '100%', maxWidth: '440px', background: '#111827', border: '1px solid #1E293B', borderRadius: '16px', padding: '36px', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ display: 'inline-flex', width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)' }}>
              <Lock size={22} color="#FFFFFF" />
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '6px' }}>Enterprise Sign In</h2>
            <p style={{ fontSize: '0.84rem', color: '#94A3B8' }}>Access your personalized RetailEdge Pro command center</p>
          </div>

          {/* Quick Role Fill Pills */}
          <div style={{ marginBottom: '22px' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', textAlign: 'center' }}>
              Quick Demo Access by Role
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
              {['Admin', 'Trainer', 'PM', 'Client', 'Supervisor', 'Marketing', 'Employee'].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => quickFill(role)}
                  style={{
                    fontSize: '0.74rem', padding: '4px 10px', borderRadius: '6px',
                    background: '#162033', border: '1px solid #1E293B', color: '#93C5FD',
                    fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s'
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = '#2563EB'; e.currentTarget.style.color = '#FFFFFF'; }}
                  onMouseOut={e => { e.currentTarget.style.background = '#162033'; e.currentTarget.style.color = '#93C5FD'; }}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#EF4444', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '18px' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#CBD5E1', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'block' }}>Corporate Email</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  style={{
                    width: '100%', padding: '11px 14px 11px 38px', borderRadius: '8px',
                    background: '#0B1220', border: '1.5px solid #1E293B', color: '#FFFFFF',
                    fontSize: '0.9rem', boxSizing: 'border-box'
                  }}
                />
                <Mail size={16} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#CBD5E1', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>Password</label>
                <button
                  type="button"
                  onClick={openFp}
                  style={{ fontSize: '0.75rem', color: '#3B82F6', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  style={{
                    width: '100%', padding: '11px 40px 11px 38px', borderRadius: '8px',
                    background: '#0B1220', border: '1.5px solid #1E293B', color: '#FFFFFF',
                    fontSize: '0.9rem', boxSizing: 'border-box'
                  }}
                />
                <Lock size={16} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px',
                background: '#2563EB', color: '#FFFFFF', fontWeight: 700,
                fontSize: '0.92rem', border: 'none', cursor: isLoggingIn ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                marginTop: '6px', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                transition: 'all 0.15s'
              }}
              onMouseOver={e => { if (!isLoggingIn) e.currentTarget.style.background = '#3B82F6'; }}
              onMouseOut={e => { if (!isLoggingIn) e.currentTarget.style.background = '#2563EB'; }}
            >
              <span>{isLoggingIn ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #1E293B', textAlign: 'center' }}>
            <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
              Learner joining a live quiz session?{' '}
              <button
                type="button"
                onClick={() => navigate('/join')}
                style={{ color: '#06B6D4', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Join with PIN
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ─── FORGOT PASSWORD MODAL ─── */}
      {fpOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '460px', background: '#111827', color: '#FFFFFF', border: '1px solid #1E293B' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #1E293B', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF' }}>Reset Access Credentials</h3>
              <button onClick={closeFp} style={{ color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            {fpResult ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <CheckCircle2 size={44} color="#10B981" style={{ margin: '0 auto 12px auto' }} />
                <h4 style={{ color: '#10B981', fontWeight: 800, margin: '0 0 6px 0' }}>Credentials Updated!</h4>
                {fpResult.newPassword && (
                  <div style={{ background: '#0B1220', border: '1px solid #1E293B', borderRadius: '8px', padding: '12px', margin: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: '#60A5FA', fontWeight: 700 }}>{fpResult.newPassword}</span>
                    <button onClick={copyPassword} style={{ background: '#1E293B', border: 'none', color: '#FFFFFF', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {fpCopied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                      <span>{fpCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                )}
                <button onClick={useNewPassword} className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                  Use Credentials &amp; Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleFpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {fpError && (
                  <div style={{ color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem' }}>
                    {fpError}
                  </div>
                )}
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#CBD5E1', textTransform: 'uppercase' }}>Email Address</label>
                  <input
                    type="email"
                    value={fpEmail}
                    onChange={e => setFpEmail(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0B1220', border: '1.5px solid #1E293B', color: '#FFFFFF', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" onClick={closeFp} className="btn btn-secondary" style={{ background: '#1E293B', color: '#FFFFFF', borderColor: '#334155' }}>Cancel</button>
                  <button type="submit" disabled={fpLoading} className="btn btn-primary">
                    {fpLoading ? 'Processing...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
