const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'frontend/src/components/ClientDashboard.jsx');
let content = fs.readFileSync(file, 'utf8');

// Replace the inline style overrides that are breaking the CSS hover effects
content = content.replace(/className="glass-card" style=\{\{\s*background:\s*'var\(--bg-glass\)',\s*border:\s*'1px solid var\(--border-glass\)',\s*borderRadius:\s*'16px',\s*padding:\s*'24px',\s*/g, 'className="glass-card" style={{ ');

// Just in case it had padding: '20px' or '16px' if I missed a replacement earlier
content = content.replace(/className="glass-card" style=\{\{\s*background:\s*'var\(--bg-glass\)',\s*border:\s*'1px solid var\(--border-glass\)',\s*borderRadius:\s*'16px',\s*padding:\s*'[0-9]+px',\s*/g, 'className="glass-card" style={{ ');
content = content.replace(/className="glass-card" style=\{\{\s*background:\s*'var\(--bg-glass\)',\s*border:\s*'1px solid #B7BEC7',\s*borderRadius:\s*'16px',\s*padding:\s*'[0-9]+px',\s*/g, 'className="glass-card" style={{ ');

fs.writeFileSync(file, content);
console.log('Fixed glass cards overrides');
