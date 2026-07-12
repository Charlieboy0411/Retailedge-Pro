const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/components/ClientDashboard.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Increase spacing and grid gaps to reduce clutter
content = content.replace(/gap: '20px'/g, "gap: '32px'");
content = content.replace(/gap: '16px'/g, "gap: '24px'");
content = content.replace(/padding: '20px'/g, "padding: '32px'");

// Give cards more padding and air
content = content.replace(/padding: '16px'/g, "padding: '24px'");

// Smooth transitions on buttons
content = content.replace(/cursor: 'pointer'/g, "cursor: 'pointer', transition: 'all 0.2s ease'");

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Client dashboard spacing improved successfully.');
