const fs = require('fs');

const file = 'src/components/PMDashboardView.jsx';
let content = fs.readFileSync(file, 'utf8');

// The shadow string was: boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 240, 255, 0.15), inset 0 0 30px rgba(0, 240, 255, 0.08)'
// Let's remove it globally from inline styles in PMDashboardView.jsx
content = content.replace(/boxShadow:\s*'0 8px 32px 0 rgba\(0, 0, 0, 0\.4\), 0 0 20px rgba\(0, 240, 255, 0\.15\), inset 0 0 30px rgba\(0, 240, 255, 0\.08\)'/g, '');

// Clean up trailing/leading commas from inline styles if any
content = content.replace(/,\s*,/g, ',');
content = content.replace(/\{\{\s*,/g, '{{');

fs.writeFileSync(file, content, 'utf8');
console.log('Removed hardcoded box shadows from PMDashboardView');
