const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/MDDashboard.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace #FFF backgrounds with var(--bg-tertiary)
content = content.replace(/background:\s*'#FFF'/g, "background: 'var(--bg-tertiary)'");

// Replace #FFF colors with var(--text-primary)
content = content.replace(/color:\s*'#FFF'/g, "color: 'var(--text-primary)'");

// Replace #FFFBEB (light yellow bg) with transparent
content = content.replace(/bg:\s*'#FFFBEB'/g, "bg: 'transparent'");

// Replace #FDE68A (yellow border) with var(--border-glass)
content = content.replace(/border:\s*'#FDE68A'/g, "border: 'var(--border-glass)'");

// Replace stroke="#FFF" with stroke="var(--bg-primary)"
content = content.replace(/stroke="#FFF"/g, 'stroke="var(--bg-primary)"');

// Replace fill="#FFF" with fill="var(--text-primary)"
content = content.replace(/fill="#FFF"/g, 'fill="var(--text-primary)"');

fs.writeFileSync(filePath, content, 'utf8');
console.log("MDDashboard #FFF replaced.");
