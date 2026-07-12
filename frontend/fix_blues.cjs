const fs = require('fs');
const path = require('path');

const directories = ['src/components', 'src/pages'];

const replacements = [
  // Dark blues and grays used for text, borders or backgrounds in the light theme
  { regex: /'#3E5C8A'|"#3E5C8A"|'#3e5c8a'|"#3e5c8a"/gi, replacement: "'var(--primary)'" },
  { regex: /'#2563EB'|"#2563EB"|'#2563eb'|"#2563eb"/gi, replacement: "'var(--primary)'" },
  { regex: /'#1E3A8A'|"#1E3A8A"|'#1e3a8a'|"#1e3a8a"/gi, replacement: "'var(--primary)'" },
  { regex: /'#0F1923'|"#0F1923"|'#0f1923'|"#0f1923"/gi, replacement: "'var(--text-primary)'" },
  { regex: /'#1F2328'|"#1F2328"|'#1f2328'|"#1f2328"/gi, replacement: "'var(--text-primary)'" },
  { regex: /'#334155'|"#334155"|'#334155'|"#334155"/gi, replacement: "'var(--text-secondary)'" },
  { regex: /'#64748B'|"#64748B"|'#64748b'|"#64748b"/gi, replacement: "'var(--text-secondary)'" },
  { regex: /'#475569'|"#475569"|'#475569'|"#475569"/gi, replacement: "'var(--text-secondary)'" },
  { regex: /'#081120'|"#081120"|'#081120'|"#081120"/gi, replacement: "'var(--bg-primary)'" },
  
  // also catch non-quoted colors if they exist in standard CSS blocks or template literals?
  // Wait, inline styles usually have quotes: color: '#3E5C8A'. If they don't, it's not valid JS.
  // We'll stick to quoted replacements for safety.
];

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (stat.isFile() && fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      for (const rep of replacements) {
        content = content.replace(rep.regex, rep.replacement);
      }
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

directories.forEach(dir => {
  const fullDirPath = path.join(__dirname, dir);
  if (fs.existsSync(fullDirPath)) {
    processDirectory(fullDirPath);
  }
});
console.log("Dark Blue Pass complete");
