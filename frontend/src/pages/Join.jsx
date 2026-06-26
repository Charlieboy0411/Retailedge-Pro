import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

// ─── Avatar options ───────────────────────────────────────────────────────────
const AVATARS = ['🦁', '🦊', '🐨', '🦖', '🚀', '🎯', '⚡', '👾', '🐼', '🐯', '🤖', '👑', '🔥', '🦄', '🌈', '🎨', '🌟', '💎', '🏆', '🎪'];

const SHELFY_TIPS = [
  '💡 Fastest responders earn bonus Arena Points!',
  '🏆 Top performer gets the Sales Champion badge.',
  '📦 Product Knowledge quizzes boost your level.',
  '⚡ Answer in under 5s for a Fastest Finger badge!',
  '🎯 Check the leaderboard after every question.',
  '🔥 5 sessions in a row earns an Attendance Streak!',
];

// ─── Generate a stable device fingerprint stored in localStorage ──────────────
const getDeviceId = () => {
  let id = localStorage.getItem('qh_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('qh_device_id', id);
  }
  return id;
};

// ─── Check if there is a saved session for this room ─────────────────────────
const getSavedSession = (roomCode) => {
  try {
    const raw = localStorage.getItem(`qh_session_${roomCode}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};
const saveSession = (roomCode, data) => {
  localStorage.setItem(`qh_session_${roomCode}`, JSON.stringify(data));
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;900&family=Inter:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .qh-join-root {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: #F8FAFC;
    align-items: center;
    justify-content: center;
    padding: 20px;
    font-family: 'Inter', sans-serif;
    position: relative;
    overflow: hidden;
  }

  /* grid overlay */
  .qh-grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(15,23,42,0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(15,23,42,0.02) 1px, transparent 1px);
    background-size: 30px 30px;
    pointer-events: none;
  }

  /* ambient glows */
  .qh-glow-tr {
    position: absolute; top: -60px; right: -60px;
    width: 340px; height: 340px; border-radius: 50%;
    background: rgba(37,99,235,0.06); filter: blur(90px);
    pointer-events: none;
  }
  .qh-glow-bl {
    position: absolute; bottom: -60px; left: -60px;
    width: 280px; height: 280px; border-radius: 50%;
    background: rgba(147,197,253,0.04); filter: blur(80px);
    pointer-events: none;
  }

  .qh-card {
    width: 100%; max-width: 440px;
    background: #FFFFFF;
    border-radius: 28px;
    padding: 36px 30px;
    border: 1px solid #E2E8F0;
    box-shadow: 0 10px 40px rgba(15,23,42,0.06);
    z-index: 2;
    position: relative;
  }

  /* ── brand badge */
  .qh-brand {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(37,99,235,0.08);
    border: 1px solid rgba(37,99,235,0.2);
    border-radius: 40px; padding: 6px 18px;
    margin-bottom: 10px;
    font-size: 0.75rem; font-weight: 700;
    color: #2563EB; letter-spacing: 1.4px; text-transform: uppercase;
  }

  /* ── page title */
  .qh-title {
    font-family: 'Poppins', sans-serif;
    font-size: 2rem; font-weight: 900;
    background: linear-gradient(135deg, #1E293B 40%, #2563EB 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    margin-bottom: 4px;
  }

  /* ── room code badge */
  .qh-room-badge {
    background: #F8FAFC;
    padding: 14px;
    border-radius: 16px;
    border: 2px dashed rgba(37,99,235,0.35);
    text-align: center;
    margin-bottom: 4px;
  }
  .qh-room-label {
    display: block; font-size: 0.7rem; color: #64748B;
    text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;
  }
  .qh-room-code {
    font-size: 1.7rem; font-weight: 900; letter-spacing: 4px;
    color: #2563EB; font-family: 'Courier New', monospace;
  }

  /* ── inputs */
  .qh-input {
    width: 100%;
    padding: 13px 16px;
    border: 1.5px solid #E2E8F0;
    border-radius: 14px;
    background: #F8FAFC;
    color: #1E293B;
    font-size: 0.97rem;
    outline: none;
    transition: border-color 0.2s;
    font-family: inherit;
    margin-bottom: 0;
  }
  .qh-input:focus { border-color: rgba(37,99,235,0.55); }
  .qh-input::placeholder { color: #94A3B8; }

  /* ── tabs */
  .qh-tabs {
    display: flex; gap: 4px;
    background: #EEF2F7;
    border-radius: 14px; padding: 4px;
    margin-bottom: 20px;
  }
  .qh-tab {
    flex: 1; padding: 9px 6px;
    border: none; border-radius: 11px;
    background: transparent; color: #64748B;
    font-size: 0.82rem; font-weight: 600;
    cursor: pointer; transition: all 0.2s;
    font-family: inherit;
  }
  .qh-tab.active {
    background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
    color: #fff;
    box-shadow: 0 4px 14px rgba(37,99,235,0.25);
  }

  /* ── avatar picker */
  .qh-avatar-grid {
    display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;
    margin: 4px 0;
  }
  .qh-avatar-btn {
    aspect-ratio: 1; border-radius: 12px;
    border: 2px solid #E2E8F0;
    background: #F8FAFC; font-size: 1.5rem;
    cursor: pointer; transition: all 0.18s;
    display: flex; align-items: center; justify-content: center;
  }
  .qh-avatar-btn.selected {
    border-color: #2563EB;
    background: rgba(37,99,235,0.08);
    box-shadow: 0 0 0 3px rgba(37,99,235,0.15);
  }
  .qh-avatar-btn:hover { transform: scale(1.08); }

  /* ── cta button */
  .qh-btn {
    width: 100%; padding: 15px;
    border-radius: 16px; border: none;
    background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
    color: #fff; font-size: 1.05rem; font-weight: 700;
    font-family: 'Poppins', sans-serif;
    cursor: pointer;
    box-shadow: 0 6px 20px rgba(37,99,235,0.25);
    transition: transform 0.15s, box-shadow 0.15s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .qh-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 26px rgba(37,99,235,0.35); }
  .qh-btn:active { transform: translateY(0); }
  .qh-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

  /* ── rejoin card */
  .qh-rejoin {
    background: rgba(37,99,235,0.05);
    border: 2px solid rgba(37,99,235,0.2);
    border-radius: 20px; padding: 20px;
    margin-bottom: 16px; text-align: center;
  }

  /* ── tips card */
  .qh-tips {
    margin-top: 20px; width: 100%; max-width: 440px;
    background: #EEF2F7;
    border: 1px solid #E2E8F0;
    border-radius: 16px; padding: 14px 18px;
    display: flex; align-items: flex-start; gap: 12px;
    z-index: 2;
  }

  /* ── section label */
  .qh-label {
    font-size: 0.72rem; font-weight: 700;
    color: #475569; letter-spacing: 1px;
    text-transform: uppercase; margin-bottom: 6px;
  }

  /* ── error */
  .qh-error {
    background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25);
    border-radius: 10px; padding: 10px 14px;
    color: #ef4444; font-size: 0.85rem; font-weight: 500;
    text-align: center;
  }

  /* ── divider */
  .qh-divider {
    display: flex; align-items: center; gap: 10px;
    margin: 6px 0;
  }
  .qh-divider::before, .qh-divider::after {
    content: ''; flex: 1; height: 1px;
    background: #E2E8F0;
  }
  .qh-divider span { color: #94A3B8; font-size: 0.78rem; }

`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function Join() {
  const { user } = useContext(AuthContext);
  // NOTE: /join is a PUBLIC standalone learner page.
  // Do NOT add role guards here — learners, employees, and guests all need access.
  // Scanning a QR code must always land on this page regardless of login state or role.

  const navigate  = useNavigate();
  const location  = useLocation();

  const [roomCode,     setRoomCode]     = useState('');
  const [isDirectJoin, setIsDirectJoin] = useState(false);
  const [tab,          setTab]          = useState('guest'); // guest | lms
  const [avatar,       setAvatar]       = useState('🦁');
  const [tipIndex,     setTipIndex]     = useState(0);
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);

  // Rejoin state
  const [savedSession, setSavedSession] = useState(null);

  // Guest form
  const [guestName,     setGuestName]     = useState('');
  const [guestEmpId,    setGuestEmpId]    = useState('');
  const [guestZone,     setGuestZone]     = useState('');

  // LMS form
  const [lmsUsername, setLmsUsername] = useState('');
  const [lmsPassword, setLmsPassword] = useState('');

  // OTP form
  const [otpName,       setOtpName]       = useState('');
  const [otpMobile,     setOtpMobile]     = useState('');
  const [otpSent,       setOtpSent]       = useState(false);
  const [otpCode,       setOtpCode]       = useState('');

  // Parse URL params on mount
  useEffect(() => {
    const params    = new URLSearchParams(location.search);
    const codeParam = params.get('code');
    if (codeParam) {
      const clean = codeParam.toUpperCase().replace(/\s+/g, '');
      setRoomCode(clean);
      setIsDirectJoin(true);
      // Check for saved session (rejoin)
      const saved = getSavedSession(clean);
      if (saved) setSavedSession(saved);
    }
  }, [location]);

  // Rotate tips
  useEffect(() => {
    const iv = setInterval(() => setTipIndex(i => (i + 1) % SHELFY_TIPS.length), 4000);
    return () => clearInterval(iv);
  }, []);

  // ── Join handler ──────────────────────────────────────────────────────────
  const handleGuestJoin = (e) => {
    e.preventDefault();
    setError('');
    const code = roomCode.replace(/\s+/g, '');
    const name = guestName.trim();
    if (!code) { setError('Please enter a room code.'); return; }
    if (!name) { setError('Please enter your name.'); return; }
    if (!guestEmpId.trim()) { setError('Please enter your Employee ID.'); return; }
    if (!guestZone) { setError('Please select a Zone.'); return; }

    const session = { name, employeeId: guestEmpId, mobileNumber: guestZone, zone: guestZone, avatar };
    saveSession(code, session);

    navigate(`/live/${code}`, {
      state: { playerName: name, employeeId: guestEmpId, mobileNumber: guestZone, zone: guestZone, avatar, deviceId: getDeviceId() }
    });
  };

  const handleRejoin = () => {
    if (!savedSession) return;
    const code = roomCode.replace(/\s+/g, '');
    navigate(`/live/${code}`, {
      state: { ...savedSession, deviceId: getDeviceId(), isRejoin: true }
    });
  };

  const handleLmsJoin = (e) => {
    e.preventDefault();
    // LMS login flow — for now navigate with username as name
    setError('');
    const code = roomCode.replace(/\s+/g, '');
    if (!code) { setError('Please enter a room code.'); return; }
    if (!lmsUsername.trim()) { setError('Please enter your LMS username.'); return; }
    
    const session = { name: lmsUsername.trim(), employeeId: lmsUsername.trim(), avatar };
    saveSession(code, session);

    navigate(`/live/${code}`, {
      state: { playerName: lmsUsername.trim(), employeeId: lmsUsername.trim(), avatar, deviceId: getDeviceId() }
    });
  };

  const handleSendOtp = () => {
    setError('');
    if (!otpName.trim()) { setError('Please enter your name.'); return; }
    if (!otpMobile.trim()) { setError('Please enter your mobile number.'); return; }
    setOtpSent(true);
  };

  const handleOtpVerify = (e) => {
    e.preventDefault();
    setError('');
    const code = roomCode.replace(/\s+/g, '');
    if (!code) { setError('Please enter a room code.'); return; }
    if (otpCode !== '123456') { setError('Invalid OTP. Please enter 123456.'); return; }

    const session = { name: otpName.trim(), mobileNumber: otpMobile, avatar };
    saveSession(code, session);

    navigate(`/live/${code}`, {
      state: { playerName: otpName.trim(), mobileNumber: otpMobile, avatar, deviceId: getDeviceId() }
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="qh-join-root">
      <style>{css}</style>
      <div className="qh-grid" />
      <div className="qh-glow-tr" />
      <div className="qh-glow-bl" />

      {/* Brand */}
      <div style={{ marginBottom: '20px', textAlign: 'center', zIndex: 2 }}>
        <div className="qh-brand">🛒 RetailEdge Pro</div>
        <h1 className="qh-title">{isDirectJoin ? 'Join Live Quiz' : 'Enter the Arena'}</h1>
      </div>

      <div className="qh-card">

        {/* Room code display / input */}
        {isDirectJoin ? (
          <div className="qh-room-badge" style={{ marginBottom: '20px' }}>
            <span className="qh-room-label">Room Code</span>
            <span className="qh-room-code">{roomCode}</span>
          </div>
        ) : (
          <div style={{ marginBottom: '20px' }}>
            <div className="qh-label">Enter Room Code</div>
            <input
              className="qh-input"
              type="text"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              placeholder="e.g. 483920"
              style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 900, letterSpacing: '4px', fontFamily: 'Courier New, monospace' }}
            />
          </div>
        )}

        {/* Rejoin card (only when saved session exists) */}
        {savedSession && (
          <div className="qh-rejoin" style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '1.4rem', marginBottom: '6px' }}>{savedSession.avatar || '🙂'}</div>
            <div style={{ color: '#fff', fontWeight: 700, marginBottom: '2px' }}>{savedSession.name}</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginBottom: '14px' }}>
              You were in this session before
            </div>
            <button className="qh-btn" onClick={handleRejoin} style={{ padding: '11px' }}>
              🔄 Rejoin as {savedSession.name}
            </button>
            <div className="qh-divider" style={{ marginTop: '12px' }}><span>or join as someone else</span></div>
          </div>
        )}

        {/* Tabs */}
        <div className="qh-tabs">
          <button className={`qh-tab ${tab === 'guest' ? 'active' : ''}`} onClick={() => { setTab('guest'); setError(''); }}>
            👤 Guest
          </button>
          <button className={`qh-tab ${tab === 'lms' ? 'active' : ''}`} onClick={() => { setTab('lms'); setError(''); }}>
            🏢 LMS Login
          </button>
          <button className={`qh-tab ${tab === 'otp' ? 'active' : ''}`} onClick={() => { setTab('otp'); setError(''); }}>
            🔑 OTP Login
          </button>
        </div>

        {/* Guest Form */}
        {tab === 'guest' && (
          <form onSubmit={handleGuestJoin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div className="qh-label">Your Name *</div>
              <input className="qh-input" type="text" value={guestName}
                onChange={e => setGuestName(e.target.value)}
                placeholder="Enter your full name" required />
            </div>
            <div>
              <div className="qh-label">Employee ID *</div>
              <input className="qh-input" type="text" value={guestEmpId}
                onChange={e => setGuestEmpId(e.target.value)}
                placeholder="EMP12345" required />
            </div>
            <div>
              <div className="qh-label">Zone *</div>
              <select className="qh-input" value={guestZone}
                onChange={e => setGuestZone(e.target.value)} required>
                <option value="">-- Select Zone --</option>
                <option value="North">North</option>
                <option value="East">East</option>
                <option value="West">West</option>
                <option value="South">South</option>
              </select>
            </div>

            {/* Avatar picker */}
            <div>
              <div className="qh-label">Pick Your Avatar</div>
              <div className="qh-avatar-grid">
                {AVATARS.map(av => (
                  <button
                    key={av} type="button"
                    className={`qh-avatar-btn ${avatar === av ? 'selected' : ''}`}
                    onClick={() => setAvatar(av)}
                  >{av}</button>
                ))}
              </div>
            </div>

            {error && <div className="qh-error">{error}</div>}

            <button className="qh-btn" type="submit">
              Join Quiz →
            </button>
          </form>
        )}

        {/* LMS Form */}
        {tab === 'lms' && (
          <form onSubmit={handleLmsJoin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div className="qh-label">LMS Username / Employee ID *</div>
              <input className="qh-input" type="text" value={lmsUsername}
                onChange={e => setLmsUsername(e.target.value)}
                placeholder="username or EMP12345" required />
            </div>
            <div>
              <div className="qh-label">Password</div>
              <input className="qh-input" type="password" value={lmsPassword}
                onChange={e => setLmsPassword(e.target.value)}
                placeholder="••••••••" />
            </div>

            {/* Avatar picker */}
            <div>
              <div className="qh-label">Pick Your Avatar</div>
              <div className="qh-avatar-grid">
                {AVATARS.map(av => (
                  <button
                    key={av} type="button"
                    className={`qh-avatar-btn ${avatar === av ? 'selected' : ''}`}
                    onClick={() => setAvatar(av)}
                  >{av}</button>
                ))}
              </div>
            </div>

            {error && <div className="qh-error">{error}</div>}

            <button className="qh-btn" type="submit">
              Join with LMS →
            </button>
          </form>
        )}

        {/* OTP Form */}
        {tab === 'otp' && (
          <form onSubmit={handleOtpVerify} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {!otpSent ? (
              <>
                <div>
                  <div className="qh-label">Your Name *</div>
                  <input className="qh-input" type="text" value={otpName}
                    onChange={e => setOtpName(e.target.value)}
                    placeholder="Enter your name" required />
                </div>
                <div>
                  <div className="qh-label">Mobile Number *</div>
                  <input className="qh-input" type="tel" value={otpMobile}
                    onChange={e => setOtpMobile(e.target.value)}
                    placeholder="+91 98765 43210" required />
                </div>
                {error && <div className="qh-error">{error}</div>}
                <button className="qh-btn" type="button" onClick={handleSendOtp}>
                  💬 Send OTP
                </button>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', background: 'rgba(245,158,11,0.1)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B', fontSize: '0.85rem' }}>
                  OTP sent to <strong>{otpMobile}</strong>. Enter <strong>123456</strong> to verify.
                </div>
                <div>
                  <div className="qh-label">Enter 6-Digit OTP Code</div>
                  <input className="qh-input" type="text" value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                    placeholder="e.g. 123456" maxLength={6} required
                    style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '4px' }} />
                </div>
                {error && <div className="qh-error">{error}</div>}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="qh-btn" type="button" onClick={() => setOtpSent(false)} style={{ background: 'rgba(255,255,255,0.08)', flex: 1 }}>
                    Back
                  </button>
                  <button className="qh-btn" type="submit" style={{ flex: 2 }}>
                    Verify & Join →
                  </button>
                </div>
              </>
            )}

            {/* Avatar picker */}
            <div>
              <div className="qh-label">Pick Your Avatar</div>
              <div className="qh-avatar-grid">
                {AVATARS.map(av => (
                  <button
                    key={av} type="button"
                    className={`qh-avatar-btn ${avatar === av ? 'selected' : ''}`}
                    onClick={() => setAvatar(av)}
                  >{av}</button>
                ))}
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Shelfy tips */}
      <div className="qh-tips">
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
        }}>🛒</div>
        <div>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>
            Shelfy says
          </div>
          <div style={{ fontSize: '0.86rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>
            {SHELFY_TIPS[tipIndex]}
          </div>
        </div>
      </div>

      <p style={{ color: 'rgba(255,255,255,0.3)', marginTop: '18px', fontSize: '0.82rem', zIndex: 2 }}>
        Trainer? <a href="/login" style={{ color: '#2563EB', fontWeight: 600 }}>Login here →</a>
      </p>
    </div>
  );
}
