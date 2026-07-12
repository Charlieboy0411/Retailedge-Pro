const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/components/ClientDashboard.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace hardcoded borders with more premium variables or softer borders
content = content.replace(/border: '1px solid #B7BEC7'/g, "border: '1px solid var(--border-glass)'");
content = content.replace(/border: `1px solid \${BORDER}`/g, "border: '1px solid var(--border-glass)'");

// Reduce cluttered box shadows on buttons
content = content.replace(/boxShadow: '0 8px 32px 0 rgba\(0, 0, 0, 0\.4\), 0 0 20px rgba\(0, 240, 255, 0\.15\), inset 0 0 30px rgba\(0, 240, 255, 0\.08\)'/g, "boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'");

// Improve spacing and grid
// For the 6 KPI cards, let's use a slightly larger minmax to force them to 3 columns on standard screens instead of being too squished.
content = content.replace(/gridTemplateColumns: 'repeat\\(auto-fit, minmax\\(170px, 1fr\\)\\)'/g, "gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))'");

// Adjust Project Information Banner to be a bit softer and cleaner
content = content.replace(/boxShadow: '0 8px 24px rgba\\(7,27,54,0\\.15\\)'/g, "boxShadow: '0 8px 32px rgba(0,0,0,0.1)'");

// Soften other backgrounds and borders
content = content.replace(/background: 'rgba\\(34, 197, 94, 0\\.15\\)'/g, "background: 'rgba(22, 163, 74, 0.1)'");
content = content.replace(/border: '1\\.5px solid rgba\\(34,197,94,0\\.2\\)'/g, "border: '1px solid rgba(22, 163, 74, 0.2)'");

content = content.replace(/background: 'rgba\\(239, 68, 68, 0\\.15\\)'/g, "background: 'rgba(239, 68, 68, 0.1)'");
content = content.replace(/border: '1\\.5px solid rgba\\(239,68,68,0\\.2\\)'/g, "border: '1px solid rgba(239, 68, 68, 0.2)'");
content = content.replace(/border: '1px solid rgba\\(239,68,68,0\\.15\\)'/g, "border: '1px solid rgba(239, 68, 68, 0.1)'");

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Client dashboard cleaned up successfully.');
