import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const SHELFY_TIPS = [
  "💡 Quick tip: Fastest responders earn bonus points in the Arena!",
  "🏆 Top performers this month earn a Sales Champion badge.",
  "📦 Product Knowledge quizzes boost your Supervisor level.",
  "⚡ Answer in under 5 seconds for a Fastest Finger badge!",
  "🎯 Consistent attendance unlocks the Attendance Streak reward.",
  "📊 Check your Zone leaderboard after every live session.",
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  // Login form
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [tipIndex, setTipIndex] = useState(0);

  // Forgot password modal
  const [fpOpen, setFpOpen]           = useState(false);
  const [fpEmail, setFpEmail]         = useState('');
  const [fpLoading, setFpLoading]     = useState(false);
  const [fpError, setFpError]         = useState('');
  const [fpResult, setFpResult]       = useState(null);
  const [fpCopied, setFpCopied]       = useState(false);
  // Mode: 'auto' = generate random | 'manual' = user sets own
  const [fpMode, setFpMode]           = useState('auto');
  const [fpNewPw, setFpNewPw]         = useState('');
  const [fpConfirm, setFpConfirm]     = useState('');
  const [fpShowNew, setFpShowNew]     = useState(false);
  const [fpShowConf, setFpShowConf]   = useState(false);

  // Rotate mascot tips
  useEffect(() => {
    const iv = setInterval(() => setTipIndex(i => (i + 1) % SHELFY_TIPS.length), 4000);
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
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      login(response.data.token, response.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    }
  };

  const quickFill = (role) => {
    const creds = {
      Admin:      'admin@quizhive.com',
      Trainer:    'trainer@quizhive.com',
      PM:         'pm@quizhive.com',
      Client:     'client@quizhive.com',
      Supervisor: 'supervisor@quizhive.com',
      Marketing:  'marketing@quizhive.com',
    };
    setEmail(creds[role] || '');
    setPassword('password123');
  };

  // ── Forgot Password handlers ────────────────────────────────────────────────
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
    setFpEmail('');
    setFpError('');
    setFpResult(null);
    setFpLoading(false);
    setFpCopied(false);
    setFpMode('auto');
    setFpNewPw('');
    setFpConfirm('');
  };

  // Password strength helper
  const pwStrength = (pw) => {
    if (!pw) return { score: 0, label: '', color: '#E2E8F0' };
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return {
      score: s,
      label: ['', 'Weak', 'Fair', 'Good', 'Strong'][s],
      color: ['#E2E8F0', '#EF4444', '#F59E0B', '#38BDF8', '#22C55E'][s],
    };

  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!fpEmail.trim()) { setFpError('Please enter your email address.'); return; }

    // Manual mode validation
    if (fpMode === 'manual') {
      if (fpNewPw.length < 6) { setFpError('New password must be at least 6 characters.'); return; }
      if (fpNewPw !== fpConfirm) { setFpError('Passwords do not match.'); return; }
    }

    setFpLoading(true);
    setFpError('');
    setFpResult(null);
    try {
      const payload = { email: fpEmail.trim() };
      if (fpMode === 'manual') payload.newPassword = fpNewPw;

      const res = await axios.post('/api/auth/forgot-password', payload);

      if (res.data.isCustom) {
        // Manual — password set, just show success (don't echo user's password back)
        setFpResult({ isCustom: true, name: res.data.name });
      } else if (res.data.newPassword) {
        setFpResult({ newPassword: res.data.newPassword, name: res.data.name });
      } else {
        setFpResult({ generic: true });
      }
    } catch (err) {
      setFpError(err.response?.data?.error || 'Something went wrong. Please try again.');
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

  const PRD_FEATURES = [
    { icon: '⚡', text: 'Real-time live quizzes — Interactive Arena' },
    { icon: '📦', text: 'Video & document retail training modules' },
    { icon: '🏅', text: 'Gamified badges, levels & leaderboards' },
    { icon: '📊', text: 'Project-wise analytics & certification metrics' },
  ];

  // ── Shared input style ──────────────────────────────────────────────────────
  const inputSt = {
    width: '100%', padding: '13px 16px',
    border: '1.5px solid #E2E8F0', borderRadius: '12px',
    background: '#F8FAFC', fontSize: '0.95rem',
    color: '#0F1923', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC', overflow: 'hidden' }}>

      {/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, background: '#0F172A',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', padding: '60px 48px',
        color: 'white', position: 'relative', overflow: 'hidden',
      }}>
        {/* Grid overlay */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(37,99,235,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,0.04) 1px,transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '-8%', left: '-8%', width: '360px', height: '360px', borderRadius: '50%', background: 'rgba(37,99,235,0.12)', filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '440px', height: '440px', borderRadius: '50%', background: 'rgba(147,197,253,0.08)', filter: 'blur(100px)', pointerEvents: 'none' }} />
        {[20, 42, 64, 82].map((top, i) => (
          <div key={i} style={{ position: 'absolute', top: `${top}%`, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg,transparent,rgba(37,99,235,${0.08 + i * 0.04}),transparent)`, pointerEvents: 'none' }} />
        ))}

        <div style={{ maxWidth: '460px', textAlign: 'center', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', padding: '8px 20px', borderRadius: '40px', marginBottom: '28px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563EB', display: 'inline-block' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#2563EB' }}>Retail LMS & Quiz Arena</span>
          </div>

          <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '3rem', fontWeight: 900, lineHeight: 1.1, marginBottom: '16px', background: 'linear-gradient(135deg,#FFFFFF 40%,#2563EB 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            RetailEdge Pro
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: '36px' }}>
            The complete Retail Staff Training &amp; Real-time Assessment platform for FMCG &amp; Promoter Teams.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left', marginBottom: '40px' }}>
            {PRD_FEATURES.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{f.icon}</div>
                <span style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.88)' }}>{f.text}</span>
              </div>
            ))}
          </div>

          {/* Shelfy tip */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '12px', textAlign: 'left' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg,#2563EB,#60A5FA)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0, boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>🛒</div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Shelfy says</div>
              <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, transition: 'opacity 0.4s ease' }}>{SHELFY_TIPS[tipIndex]}</div>
            </div>
          </div>
        </div>
      </div>


      {/* ── RIGHT PANEL: Login Card ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: '440px', background: '#FFFFFF', borderRadius: '24px', padding: '44px 40px', boxShadow: '0 10px 40px rgba(8,17,32,0.1)', border: '1px solid #E2E8F0' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ width: '220px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <img src="/logo.png" alt="Idonneous Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
            <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, color: '#0F1923', fontSize: '1.5rem', margin: '0 0 6px' }}>Sign in to Arena</h2>
            <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>Manage sessions, training &amp; performance</p>

          </div>

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.07)', color: '#EF4444', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '0.88rem', border: '1px solid rgba(239,68,68,0.15)' }}>
              {error}
            </div>
          )}

          {/* Quick-fill */}
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Quick Login As</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['Admin', 'Trainer', 'PM', 'Client', 'Supervisor', 'Marketing'].map(role => (
                <button key={role} type="button" onClick={() => quickFill(role)}
                  style={{ padding: '6px 14px', borderRadius: '20px', border: '1.5px solid #E2E8F0', background: 'transparent', color: '#475569', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.background = 'rgba(37,99,235,0.05)'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = 'transparent'; }}
                >
                  {role === 'Marketing' ? 'Marketing Mgr' : role}
                </button>
              ))}

            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#0F1923' }}>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@retailedgepro.com" required style={inputSt}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F1923' }}>Password</label>
                <button type="button" onClick={openFp}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.8rem', color: '#2563EB', fontWeight: 600 }}>
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required style={{ ...inputSt, paddingRight: '48px' }}
                  onFocus={e => e.target.style.borderColor = '#2563EB'}
                  onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#94A3B8', padding: '0 2px' }}>
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>


            <button type="submit" style={{ marginTop: '8px', padding: '15px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%)', color: '#FFFFFF', fontSize: '1rem', fontWeight: 700, fontFamily: 'Poppins, sans-serif', cursor: 'pointer', boxShadow: '0 6px 20px rgba(37,99,235,0.35)', transition: 'transform 0.15s ease,box-shadow 0.15s ease' }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(37,99,235,0.45)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,99,235,0.35)'; }}>
              Enter the Arena →
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.8rem', color: '#94A3B8' }}>
            Participant? <a href="/join" style={{ color: '#2563EB', fontWeight: 600 }}>Join a session →</a>
          </p>

        </div>
      </div>

      {/* ── FORGOT PASSWORD MODAL ───────────────────────────────────────────── */}
      {fpOpen && (
        <div onClick={(e) => { if (e.target === e.currentTarget) closeFp(); }} style={{
          position: 'fixed', inset: 0, background: 'rgba(8,17,32,0.65)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '24px',
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '24px', padding: '36px 36px 32px',
            width: '100%', maxWidth: '440px', boxShadow: '0 24px 64px rgba(8,17,32,0.3)',
            border: '1px solid #E2E8F0', position: 'relative',
          }}>
            {/* Close */}
            <button onClick={closeFp} style={{ position: 'absolute', top: '18px', right: '20px', background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#94A3B8', lineHeight: 1 }}>✕</button>

            {/* Icon + title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'rgba(37,99,235,0.08)', border: '1.5px solid rgba(37,99,235,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>🔑</div>
              <div>
                <h3 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, color: '#0F1923', fontSize: '1.25rem', margin: 0 }}>
                  {fpResult ? (fpResult.isCustom ? 'Password Updated!' : fpResult.generic ? 'Request Sent' : 'New Password Generated') : 'Reset Password'}
                </h3>
                <p style={{ color: '#64748B', fontSize: '0.82rem', margin: '4px 0 0', lineHeight: 1.4 }}>
                  {fpResult
                    ? fpResult.isCustom
                      ? `Hi ${fpResult.name}! Your new password has been set. You can log in now.`
                      : fpResult.generic
                        ? 'If that email is registered, the password has been updated.'
                        : `Hi ${fpResult.name}! Your temporary password is below.`
                    : 'Verify your email, then choose how you want to reset.'}
                </p>
              </div>
            </div>


            {/* ── Mode tabs (only show on form screen) ── */}
            {!fpResult && (
              <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '12px', padding: '4px', marginBottom: '20px', gap: '4px' }}>
                {[{ id: 'auto', label: '✨ Generate for me', desc: 'Auto-generate a secure password' }, { id: 'manual', label: '✏️ Set my own', desc: 'Choose your own password' }].map(tab => (
                  <button key={tab.id} type="button" onClick={() => { setFpMode(tab.id); setFpError(''); setFpNewPw(''); setFpConfirm(''); }}
                    style={{
                      flex: 1, padding: '9px 12px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                      background: fpMode === tab.id ? '#FFFFFF' : 'transparent',
                      color: fpMode === tab.id ? '#0F1923' : '#94A3B8',
                      fontWeight: fpMode === tab.id ? 700 : 500,
                      fontSize: '0.82rem',
                      boxShadow: fpMode === tab.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.18s',
                    }}>
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Error */}
            {fpError && (
              <div style={{ background: 'rgba(239,68,68,0.07)', color: '#EF4444', padding: '11px 14px', borderRadius: '10px', marginBottom: '14px', fontSize: '0.85rem', border: '1px solid rgba(239,68,68,0.15)' }}>
                {fpError}
              </div>
            )}

            {/* ── SUCCESS: auto-generated password ── */}
            {fpResult && !fpResult.generic && !fpResult.isCustom && fpResult.newPassword && (
              <div>
                <div style={{ background: '#F8FAFC', border: '2px solid #E2E8F0', borderRadius: '14px', padding: '18px 20px', marginBottom: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>Your New Password</div>
                  <div style={{ fontFamily: 'Courier New, monospace', fontSize: '1.4rem', fontWeight: 800, color: '#0F1923', letterSpacing: '4px', marginBottom: '12px', wordBreak: 'break-all' }}>
                    {fpResult.newPassword}
                  </div>
                  <button onClick={copyPassword} style={{ padding: '7px 18px', borderRadius: '8px', border: '1.5px solid #E2E8F0', background: fpCopied ? 'rgba(34,197,94,0.08)' : '#fff', color: fpCopied ? '#22C55E' : '#475569', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                    {fpCopied ? '✓ Copied!' : '📋 Copy Password'}
                  </button>
                </div>
                <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '10px', padding: '11px 14px', marginBottom: '18px', fontSize: '0.81rem', color: '#92400E', lineHeight: 1.5 }}>
                  ⚠️ Shown once. Copy it now. After login, go to <strong>Settings → Security → Change Password</strong>.
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={useNewPassword} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.25)' }}>
                    Log In Now →
                  </button>
                  <button onClick={closeFp} style={{ padding: '13px 18px', borderRadius: '12px', border: '1.5px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Close</button>
                </div>
              </div>
            )}


            {/* ── SUCCESS: manual password set ── */}
            {fpResult?.isCustom && (
              <div>
                <div style={{ background: 'rgba(34,197,94,0.06)', border: '1.5px solid rgba(34,197,94,0.25)', borderRadius: '14px', padding: '20px', marginBottom: '18px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
                  <div style={{ fontWeight: 700, color: '#0F1923', fontSize: '0.95rem' }}>Password updated successfully!</div>
                  <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '4px' }}>Use your new password to log in.</div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => { setEmail(fpEmail); setPassword(fpNewPw || ''); closeFp(); }} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.25)' }}>
                    Log In Now →
                  </button>
                  <button onClick={closeFp} style={{ padding: '13px 18px', borderRadius: '12px', border: '1.5px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Close</button>
                </div>
              </div>
            )}

            {/* ── Generic / not found ── */}
            {fpResult?.generic && (
              <button onClick={closeFp} style={{ width: '100%', padding: '13px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Back to Login</button>
            )}


            {/* ── FORM ── */}
            {!fpResult && (
              <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Email */}
                <div>
                  <label style={{ display: 'block', marginBottom: '7px', fontSize: '0.83rem', fontWeight: 600, color: '#0F1923' }}>Registered Email Address</label>
                  <input type="email" value={fpEmail} onChange={e => setFpEmail(e.target.value)}
                    placeholder="you@retailedgepro.com" required style={inputSt}
                    onFocus={e => e.target.style.borderColor = '#2563EB'}
                    onBlur={e => e.target.style.borderColor = '#E2E8F0'} />

                </div>

                {/* Manual mode: new + confirm fields */}
                {fpMode === 'manual' && (() => {
                  const str = pwStrength(fpNewPw);
                  return (
                    <>
                      {/* New Password */}
                      <div>
                        <label style={{ display: 'block', marginBottom: '7px', fontSize: '0.83rem', fontWeight: 600, color: '#0F1923' }}>New Password</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={fpShowNew ? 'text' : 'password'}
                            value={fpNewPw} onChange={e => setFpNewPw(e.target.value)}
                            placeholder="Min 6 characters" required
                            style={{ ...inputSt, paddingRight: '44px' }}
                            onFocus={e => e.target.style.borderColor = '#2563EB'}
                            onBlur={e => e.target.style.borderColor = '#E2E8F0'} />

                          <button type="button" onClick={() => setFpShowNew(v => !v)}
                            style={{ position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '1rem' }}>
                            {fpShowNew ? '🙈' : '👁'}
                          </button>
                        </div>
                        {/* Strength bar */}
                        {fpNewPw && (
                          <div style={{ marginTop: '7px' }}>
                            <div style={{ display: 'flex', gap: '3px', marginBottom: '3px' }}>
                              {[1,2,3,4].map(i => (
                                <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i <= str.score ? str.color : '#E2E8F0', transition: 'background 0.25s' }} />
                              ))}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: str.color, fontWeight: 600 }}>{str.label}</div>
                          </div>
                        )}
                      </div>

                      {/* Confirm Password */}
                      <div>
                        <label style={{ display: 'block', marginBottom: '7px', fontSize: '0.83rem', fontWeight: 600, color: '#0F1923' }}>Confirm New Password</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={fpShowConf ? 'text' : 'password'}
                            value={fpConfirm} onChange={e => setFpConfirm(e.target.value)}
                            placeholder="Re-enter password" required
                            style={{
                              ...inputSt, paddingRight: '44px',
                              borderColor: fpConfirm && fpNewPw !== fpConfirm ? '#EF4444' : '#E2E8F0',
                            }}
                            onFocus={e => e.target.style.borderColor = '#2563EB'}
                            onBlur={e => e.target.style.borderColor = fpConfirm && fpNewPw !== fpConfirm ? '#EF4444' : '#E2E8F0'} />

                          <button type="button" onClick={() => setFpShowConf(v => !v)}
                            style={{ position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '1rem' }}>
                            {fpShowConf ? '🙈' : '👁'}
                          </button>
                        </div>
                        {fpConfirm && fpNewPw !== fpConfirm && (
                          <div style={{ fontSize: '0.76rem', color: '#EF4444', marginTop: '4px' }}>Passwords do not match</div>
                        )}
                        {fpConfirm && fpNewPw === fpConfirm && fpConfirm.length >= 6 && (
                          <div style={{ fontSize: '0.76rem', color: '#22C55E', marginTop: '4px' }}>✓ Passwords match</div>
                        )}

                      </div>
                    </>
                  );
                })()}

                {/* Submit */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button type="submit" disabled={fpLoading} style={{
                    flex: 1, padding: '13px', borderRadius: '12px', border: 'none',
                    background: fpLoading ? '#E2E8F0' : 'linear-gradient(135deg,#2563EB,#1D4ED8)',
                    color: fpLoading ? '#94A3B8' : '#fff',
                    fontWeight: 700, fontSize: '0.9rem', cursor: fpLoading ? 'not-allowed' : 'pointer',
                    boxShadow: fpLoading ? 'none' : '0 4px 14px rgba(37,99,235,0.25)',
                    transition: 'all 0.2s',
                  }}>

                    {fpLoading
                      ? (fpMode === 'manual' ? 'Saving...' : 'Generating...')
                      : fpMode === 'manual'
                        ? '🔒 Set New Password'
                        : '🔑 Generate New Password'}
                  </button>
                  <button type="button" onClick={closeFp} style={{ padding: '13px 18px', borderRadius: '12px', border: '1.5px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
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
