const fs = require('fs');
const path = require('path');

const directories = ['src/components', 'src/pages'];

const replacements = [
  // Extremely dark navys/blues used for text
  { regex: /'#071B36'|"#071B36"|'#071b36'|"#071b36"/gi, replacement: "'var(--text-primary)'" },
  { regex: /'#0F1A36'|"#0F1A36"|'#0f1a36'|"#0f1a36"/gi, replacement: "'var(--text-primary)'" },
  { regex: /'#0A1128'|"#0A1128"|'#0a1128'|"#0a1128"/gi, replacement: "'var(--text-primary)'" },
  { regex: /'#152B4F'|"#152B4F"|'#152b4f'|"#152b4f"/gi, replacement: "'var(--text-primary)'" },
  { regex: /'#152A4E'|"#152A4E"|'#152a4e'|"#152a4e"/gi, replacement: "'var(--text-primary)'" },
  { regex: /'#1E3A5F'|"#1E3A5F"|'#1e3a5f'|"#1e3a5f"/gi, replacement: "'var(--text-primary)'" },
  { regex: /'#31448B'|"#31448B"|'#31448b'|"#31448b"/gi, replacement: "'var(--text-primary)'" },
  { regex: /'#1D4ED8'|"#1D4ED8"|'#1d4ed8'|"#1d4ed8"/gi, replacement: "'var(--primary)'" }, // Tailwind blue-700
  { regex: /'#1E40AF'|"#1E40AF"|'#1e40af'|"#1e40af"/gi, replacement: "'var(--primary)'" }, // Tailwind blue-800
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
console.log("Deep Navy / Blue pass complete");
