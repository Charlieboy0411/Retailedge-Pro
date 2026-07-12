const fs = require('fs');

const file = 'src/components/PMDashboardView.jsx';
let content = fs.readFileSync(file, 'utf8');

// The inline style for KPI cards is:
// <div key={i} style={{ ... }}
// We can just add className="glass-card" to <div key={i} style={{
content = content.replace(
  /<div key=\{i\} style=\{\{/g,
  `<div key={i} className="glass-card" style={{`
);

// There are other cards:
// <div style={{ background: 'var(--bg-glass)', ... boxShadow: ... }}
// Let's replace those too.
content = content.replace(
  /<div style=\{\{ background: 'var\(--bg-glass\)',/g,
  `<div className="glass-card" style={{ background: 'var(--bg-glass)',`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed PMDashboardView.jsx cards');
