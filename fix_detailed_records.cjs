const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'frontend/src/components/DetailedRecordsView.jsx');
let content = fs.readFileSync(file, 'utf8');

// Replace the hardcoded styles with className="glass-card" and remove redundant inline styles
content = content.replace(/style=\{\{\s*background:\s*'var\(--bg-glass\)',\s*padding:\s*'28px',\s*borderRadius:\s*'24px',\s*border:\s*'1px solid #E2E8F0',/g, 'className="glass-card" style={{');
content = content.replace(/boxShadow:\s*'0 8px 32px 0 rgba\(0, 0, 0, 0\.4\), 0 0 20px rgba\(0, 240, 255, 0\.15\), inset 0 0 30px rgba\(0, 240, 255, 0\.08\)'/g, '');

// Clean up any stray commas after removing boxShadow
content = content.replace(/,\s*\}\}/g, ' }}');

fs.writeFileSync(file, content);
console.log('Fixed DetailedRecordsView KPI cards');
