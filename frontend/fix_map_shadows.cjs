const fs = require('fs');
const path = require('path');

const dirs = [
  path.join(__dirname, 'src', 'components'),
  path.join(__dirname, 'src', 'pages')
];

const newShadow = `'0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 240, 255, 0.15), inset 0 0 30px rgba(0, 240, 255, 0.08)'`;
const oldPath = /M 200 20 L 220 50 L 280 100 L 340 100 L 360 120 L 300 150 L 280 180 L 260 250 L 200 360 L 180 360 L 140 250 L 100 160 L 80 150 L 100 100 L 140 60 Z/g;
const newPath = "M 160 40 L 180 10 L 210 20 L 220 50 L 250 80 L 270 90 L 320 90 L 340 100 L 360 120 L 350 140 L 320 150 L 300 140 L 290 160 L 270 190 L 250 240 L 220 300 L 200 360 L 180 360 L 150 280 L 120 220 L 100 190 L 60 170 L 50 150 L 70 130 L 100 140 L 120 110 L 130 80 L 140 50 Z";

for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (!file.endsWith('.jsx')) continue;
    const fullPath = path.join(dir, file);
    let content = fs.readFileSync(fullPath, 'utf8');
    let changed = false;

    // Fix map path
    if (content.match(oldPath)) {
      content = content.replace(oldPath, newPath);
      changed = true;
      console.log(`Updated map in ${file}`);
    }

    // Fix KPI card shadows (dull shadows)
    // Matching variations like boxShadow: '0 2px 12px rgba(15,23,42,0.05)'
    const shadowRegex = /boxShadow:\s*['"`]0\s*[1-4]px\s*\d+px\s*rgba\([^)]+\)['"`]/g;
    if (content.match(shadowRegex)) {
      content = content.replace(shadowRegex, `boxShadow: ${newShadow}`);
      changed = true;
      console.log(`Updated shadows in ${file}`);
    }

    // Also catch some common hex shadow formats if any
    const hexShadowRegex = /boxShadow:\s*['"`]0\s*[1-4]px\s*\d+px\s*#[0-9a-fA-F]{3,8}['"`]/g;
    if (content.match(hexShadowRegex)) {
      content = content.replace(hexShadowRegex, `boxShadow: ${newShadow}`);
      changed = true;
      console.log(`Updated hex shadows in ${file}`);
    }

    if (changed) {
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }
}

console.log("Global fixes applied.");
