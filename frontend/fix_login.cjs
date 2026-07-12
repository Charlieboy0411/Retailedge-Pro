const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'pages', 'Login.jsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add states
content = content.replace(
  /const \[tipIndex, setTipIndex\] = useState\(0\);/,
  `const [tipIndex, setTipIndex] = useState(0);\n  const [isLoggingIn, setIsLoggingIn] = useState(false);\n  const [rememberMe, setRememberMe] = useState(false);`
);

// 2. Update handleLogin
content = content.replace(
  /const handleLogin = async \(e\) => \{[\s\S]*?e\.preventDefault\(\);\n\s*setError\(''\);/,
  `const handleLogin = async (e) => {\n    e.preventDefault();\n    setError('');\n    setIsLoggingIn(true);`
);

content = content.replace(
  /\} catch \(err\) \{/,
  `} catch (err) {`
);

// We need to make sure finally block resets isLoggingIn.
content = content.replace(
  /setError\(err\.response\?\.data\?\.error \|\| 'Login failed\. Please check your credentials\.'\);\n\s*\}/,
  `setError(err.response?.data?.error || 'Login failed. Please check your credentials.');\n    } finally {\n      setIsLoggingIn(false);\n    }`
);

// 3. Logo update
content = content.replace(/src="\/logo\.png"/g, `src="/logo-neon.png"`);

// 4. Remember me toggle
const rememberMeJSX = `
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '-4px', marginBottom: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ accentColor: 'var(--primary)', width: '16px', height: '16px', cursor: 'pointer' }} />
                Remember me for 30 days
              </label>
            </div>
`;
content = content.replace(
  /<\/div>\n\n\n            <button type="submit"/,
  `</div>\n${rememberMeJSX}\n            <button type="submit"`
);

// 5. Update Button Text
content = content.replace(
  /Enter the Arena →/,
  `{isLoggingIn ? 'Authenticating...' : 'Enter the Arena →'}`
);

content = content.replace(
  /<button type="submit"([^>]+)>/,
  (match, p1) => {
    return `<button type="submit" disabled={isLoggingIn} ${p1} style={{ marginTop: '8px', padding: '15px', borderRadius: '14px', border: 'none', background: isLoggingIn ? 'var(--bg-tertiary)' : 'linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%)', color: isLoggingIn ? 'var(--text-secondary)' : 'var(--bg-glass)', fontSize: '1rem', fontWeight: 700, fontFamily: 'Poppins, sans-serif', cursor: isLoggingIn ? 'not-allowed' : 'pointer', boxShadow: isLoggingIn ? 'none' : '0 6px 20px rgba(37,99,235,0.35)', transition: 'transform 0.15s ease,box-shadow 0.15s ease' }}`
  }
);
// Above regex might be tricky if style is hardcoded inside.
// Better replace:
content = content.replace(
  /style=\{\{ marginTop: '8px', padding: '15px'[^}]+\}\}/,
  `style={{ marginTop: '8px', padding: '15px', borderRadius: '14px', border: 'none', background: isLoggingIn ? 'var(--bg-tertiary)' : 'linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%)', color: isLoggingIn ? 'var(--text-secondary)' : '#fff', fontSize: '1rem', fontWeight: 700, fontFamily: 'Poppins, sans-serif', cursor: isLoggingIn ? 'not-allowed' : 'pointer', boxShadow: isLoggingIn ? 'none' : '0 6px 20px rgba(37,99,235,0.35)', transition: 'transform 0.15s ease,box-shadow 0.15s ease' }}`
);

// 6. Support Footer
content = content.replace(
  /Participant\? <a href="\/join" style=\{\{ color: 'var\(--primary\)', fontWeight: 600 \}\}>Join a session →<\/a>/,
  `Participant? <a href="/join" style={{ color: 'var(--primary)', fontWeight: 600 }}>Join a session →</a>\n            <br/><br/>\n            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Need help? <a href="#" style={{ color: 'var(--text-primary)', textDecoration: 'underline' }}>Contact IT Support</a></span>`
);

// 7. Styling fixes

// Input borders
content = content.replace(/border: '1\.5px solid #E2E8F0'/g, `border: '1.5px solid var(--border-glass)'`);
content = content.replace(/borderColor = '#E2E8F0'/g, `borderColor = 'var(--border-glass)'`);
content = content.replace(/borderColor = fpConfirm && fpNewPw !== fpConfirm \? '#EF4444' : '#E2E8F0'/g, `borderColor = fpConfirm && fpNewPw !== fpConfirm ? '#EF4444' : 'var(--border-glass)'`);

// Forgot password modal colors
content = content.replace(/background: '#F1F5F9'/g, `background: 'var(--bg-tertiary)'`);
content = content.replace(/background: '#fff'/g, `background: 'transparent'`); // For mode tabs active state, wait mode tabs active state used var(--bg-glass) already. But wait: `background: fpMode === tab.id ? 'var(--bg-glass)' : 'transparent'` is ok.
// Let's check where '#fff' is used in the modal.
// Cancel button: `background: '#fff'` -> `background: 'var(--bg-tertiary)'`
content = content.replace(/background: '#fff', color: 'var\(--text-secondary\)'/g, `background: 'var(--bg-tertiary)', color: 'var(--text-primary)'`);
// Close button
content = content.replace(/border: '1\.5px solid #E2E8F0', background: '#fff'/g, `border: '1.5px solid var(--border-glass)', background: 'var(--bg-tertiary)'`);

// "Your New Password" box
content = content.replace(/border: '2px solid #E2E8F0'/g, `border: '2px solid var(--border-glass)'`);

// Empty Strength bar color
content = content.replace(/#E2E8F0/g, `var(--border-glass)`);

// "Quick Login As" buttons
content = content.replace(/borderColor: '#E2E8F0'/g, `borderColor: 'var(--border-glass)'`);

fs.writeFileSync(file, content, 'utf8');
console.log('Login.jsx updated successfully.');
