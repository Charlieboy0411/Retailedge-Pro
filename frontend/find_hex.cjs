const fs = require('fs');
const path = require('path');

const directories = ['src/components', 'src/pages'];
const hexCounts = {};

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (stat.isFile() && fullPath.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      const regex = /#([0-9a-fA-F]{3,6})\b/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        const hex = match[0].toUpperCase();
        hexCounts[hex] = (hexCounts[hex] || 0) + 1;
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

const sorted = Object.entries(hexCounts).sort((a, b) => b[1] - a[1]);
console.log("Hex Code Frequencies:");
sorted.forEach(([hex, count]) => {
  console.log(`${hex}: ${count}`);
});
