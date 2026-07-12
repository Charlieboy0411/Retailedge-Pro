const fs = require('fs');
const file = 'src/pages/Login.jsx';
let content = fs.readFileSync(file, 'utf8');

// I will locate the button and replace the corrupted part.
// The corrupted part is around `{ e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(37,99,235,0.45)'; }}`
// Let's just find the whole <form onSubmit={handleLogin} ... </form> block and fix it.

const formRegex = /<form onSubmit=\{handleLogin\}[\s\S]*?<\/form>/;
const fixedForm = `<form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@retailedgepro.com" required style={inputSt}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-glass)'} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Password</label>
                <button type="button" onClick={openFp}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required style={{ ...inputSt, paddingRight: '48px' }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-glass)'} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#94A3B8', padding: '0 2px' }}>
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '-4px', marginBottom: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ accentColor: 'var(--primary)', width: '16px', height: '16px', cursor: 'pointer' }} />
                Remember me for 30 days
              </label>
            </div>
            <button type="submit" disabled={isLoggingIn} style={{ marginTop: '8px', padding: '15px', borderRadius: '14px', border: 'none', background: isLoggingIn ? 'var(--bg-tertiary)' : 'linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%)', color: isLoggingIn ? 'var(--text-secondary)' : '#fff', fontSize: '1rem', fontWeight: 700, fontFamily: 'Poppins, sans-serif', cursor: isLoggingIn ? 'not-allowed' : 'pointer', boxShadow: isLoggingIn ? 'none' : '0 6px 20px rgba(37,99,235,0.35)', transition: 'transform 0.15s ease,box-shadow 0.15s ease' }}
              onMouseOver={e => { if (!isLoggingIn) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(37,99,235,0.45)'; } }}
              onMouseOut={e => { if (!isLoggingIn) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,99,235,0.35)'; } }}>
              {isLoggingIn ? 'Authenticating...' : 'Enter the Arena →'}
            </button>
          </form>`;

content = content.replace(formRegex, fixedForm);
fs.writeFileSync(file, content, 'utf8');
console.log('Fixed syntax error in Login.jsx');
