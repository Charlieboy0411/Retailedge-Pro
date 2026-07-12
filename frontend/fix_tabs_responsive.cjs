const fs = require('fs');
const path = require('path');

const dir = 'src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx') && f.includes('Dashboard'));

let updatedCount = 0;

for (const file of files) {
  const fullPath = path.join(dir, file);
  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;

  // We are looking for something like:
  // <div style={{ display: 'flex', gap: '8px', ... }}>
  //   <button ... setActiveTab ...
  
  // A simple way to fix this is to find `<div style={{ display: 'flex'` 
  // that is close to `setActiveTab` and ensure it has `flexWrap: 'wrap'`
  
  const chunks = content.split('setActiveTab');
  if (chunks.length > 1) {
      // It has setActiveTab. Let's just do a regex replace on all flex containers that might be the tab bar.
      // Usually it's the one with `gap: '10px'` or `gap: '8px'` or `marginBottom: '20px'`
      // Let's just add `flexWrap: 'wrap'` to any flex div that contains a button with setActiveTab.
      // Since regex on HTML/JSX is tricky, I'll replace `display: 'flex'` with `display: 'flex', flexWrap: 'wrap'` 
      // where it's part of a nav/tab block.
      
      // Let's look for: display: 'flex', gap: '8px' or '10px'
      // and inject flexWrap
      
      content = content.replace(/display:\s*'flex',\s*gap:\s*'8px'/g, "display: 'flex', flexWrap: 'wrap', gap: '8px'");
      content = content.replace(/display:\s*'flex',\s*gap:\s*'10px'/g, "display: 'flex', flexWrap: 'wrap', gap: '10px'");
      content = content.replace(/display:\s*'flex',\s*gap:\s*'12px'/g, "display: 'flex', flexWrap: 'wrap', gap: '12px'");
      content = content.replace(/display:\s*'flex',\s*gap:\s*'16px'/g, "display: 'flex', flexWrap: 'wrap', gap: '16px'");
      
      // Deduplicate in case it was already there or we injected multiple times
      content = content.replace(/flexWrap:\s*'wrap',\s*flexWrap:\s*'wrap'/g, "flexWrap: 'wrap'");
  }

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated ${file}`);
    updatedCount++;
  }
}

console.log(`Done. Updated ${updatedCount} files.`);
