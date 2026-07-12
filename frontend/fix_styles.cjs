const fs = require('fs');
const path = require('path');

const directories = ['src/components', 'src/pages'];

const replacements = [
  // White/Light Backgrounds
  { regex: /'#FFFFFF'|"#FFFFFF"|'#ffffff'|"#ffffff"|'#f8fafc'|'#f6fdf9'|'#faf5ff'|'#fffcf5'|'#fffaf5'|'#f3fdfb'/gi, replacement: "'var(--bg-glass)'" },
  
  // Dark Texts
  { regex: /'#1F2328'|"#1F2328"|'#1E293B'|"#1E293B"|'#0F172A'|"#0F172A"|'#000000'|"#000000"/gi, replacement: "'var(--text-primary)'" },
  
  // Muted/Gray Texts
  { regex: /'#5F6875'|"#5F6875"|'#64748B'|"#64748B"|'#475569'|"#475569"|'#6B7280'|"#6B7280"/gi, replacement: "'var(--text-secondary)'" },

  // Gradients containing white colors
  { regex: /'linear-gradient\([^)]+(?:#ffffff|#fff)[^)]+\)'/gi, replacement: "'var(--bg-glass)'" },
  
  // rgba white
  { regex: /'rgba\(255,\s*255,\s*255,\s*1\)'/gi, replacement: "'var(--bg-glass)'" }
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
  } else {
    console.warn(`Directory not found: ${fullDirPath}`);
  }
});

console.log("Cleanup complete!");
