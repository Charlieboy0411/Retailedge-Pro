const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/MDDashboard.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace inline card styles to include blur for glass effect
content = content.replace(/background:\s*theme\.card,\s*/g, "background: theme.card, backdropFilter: 'blur(12px)', ");

fs.writeFileSync(filePath, content, 'utf8');
console.log("MDDashboard glassmorphism blur added.");
