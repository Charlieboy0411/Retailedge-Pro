const fs = require('fs');
const path = require('path');

const directories = ['src/components', 'src/pages'];

const replacements = [
  // Remaining dark Tailwind grays and standard blacks
  { regex: /'#1a202c'|"#1a202c"|'#1A202C'|"#1A202C"/gi, replacement: "'var(--text-primary)'" },
  { regex: /'#2d3748'|"#2d3748"|'#2D3748'|"#2D3748"/gi, replacement: "'var(--text-secondary)'" },
  { regex: /'#4a5568'|"#4a5568"|'#4A5568'|"#4A5568"/gi, replacement: "'var(--text-secondary)'" },
  { regex: /'#111827'|"#111827"|'#111827'|"#111827"/gi, replacement: "'var(--text-primary)'" },
  { regex: /'#1f2937'|"#1f2937"|'#1F2937'|"#1F2937"/gi, replacement: "'var(--text-secondary)'" },
  { regex: /'#000000'|"#000000"|'#000'|"#000"/gi, replacement: "'var(--text-primary)'" },
  { regex: /'#333333'|"#333333"|'#333'|"#333"/gi, replacement: "'var(--text-primary)'" },
  { regex: /'#555555'|"#555555"|'#555'|"#555"/gi, replacement: "'var(--text-secondary)'" },
  { regex: /'black'|"black"/gi, replacement: "'var(--text-primary)'" },
  { regex: /'darkblue'|"darkblue"/gi, replacement: "'var(--primary)'" }
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
console.log("Dark Text Catch-All Pass complete");
