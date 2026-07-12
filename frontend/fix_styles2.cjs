const fs = require('fs');
const path = require('path');

const directories = ['src/components', 'src/pages'];

const replacements = [
  { regex: /'#F4F5F7'|"#F4F5F7"|'#f4f5f7'|"#f4f5f7"/gi, replacement: "'var(--bg-tertiary)'" },
  { regex: /'#B7BEC7'|"#B7BEC7"|'#b7bec7'|"#b7bec7"/gi, replacement: "'var(--border-glass)'" },
  { regex: /'#FFFFFF'|"#FFFFFF"|'#ffffff'|"#ffffff"/gi, replacement: "'var(--bg-glass)'" } // Just in case any remain
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
console.log("Pass 2 complete");
