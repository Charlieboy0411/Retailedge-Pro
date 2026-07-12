const fs = require('fs');
const path = require('path');

const dir = 'src/components';
const dashboards = [
  'COODashboard.jsx',
  'SupervisorDashboard.jsx',
  'TDManagerDashboard.jsx',
  'VPOperationsDashboard.jsx',
  'MarketingManagerDashboard.jsx'
];

for (const file of dashboards) {
  const fullPath = path.join(dir, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, 'utf8');
  let original = content;

  // For the standard 4 dashboards (COO, VP, Supervisor, TD)
  const standardMatch = /<div style=\{\{\s*display:\s*'flex',\s*borderBottom:\s*'2px solid #B7BEC7',\s*paddingBottom:\s*'0',\s*gap:\s*'8px',\s*marginBottom:\s*'24px'\s*\}\}>/g;
  content = content.replace(standardMatch, `<div style={{ display: 'flex', flexWrap: 'wrap', overflowX: 'auto', borderBottom: '2px solid #B7BEC7', paddingBottom: '0', gap: '8px', marginBottom: '24px' }}>`);

  // For MarketingManagerDashboard
  const mktMatch = /display:\s*'flex',\s*background:\s*'var\(--bg-glass\)',/g;
  content = content.replace(mktMatch, `display: 'flex',\n        flexWrap: 'wrap',\n        background: 'var(--bg-glass)',`);

  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Successfully fixed tabs flex wrap in ${file}`);
  }
}
