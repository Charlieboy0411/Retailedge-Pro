const fs = require('fs');
const path = require('path');

const dirsToScan = ['src/components', 'src/pages'];

// Map of pastel hex codes to dark theme equivalents
const replacementMap = {
  // Light Reds
  "'#FEF2F2'": "'rgba(239, 68, 68, 0.15)'",
  "'#FEE2E2'": "'rgba(239, 68, 68, 0.2)'",
  
  // Light Greens
  "'#F0FDF4'": "'rgba(34, 197, 94, 0.15)'",
  "'#DCFCE7'": "'rgba(34, 197, 94, 0.2)'",
  "'#D1FAE5'": "'rgba(16, 185, 129, 0.15)'",

  // Light Oranges/Yellows
  "'#FFF7ED'": "'rgba(234, 88, 12, 0.15)'",
  "'#FFF5F0'": "'rgba(243, 111, 33, 0.15)'",
  "'#FEF3C7'": "'rgba(245, 158, 11, 0.15)'",

  // Light Blues/Indigos/Violets
  "'#EFF6FF'": "'rgba(59, 130, 246, 0.15)'",
  "'#DBEAFE'": "'rgba(59, 130, 246, 0.2)'",
  "'#E0E7FF'": "'rgba(99, 102, 241, 0.15)'",
  "'#EDE9FE'": "'rgba(139, 92, 246, 0.15)'",

  // Light Grays/Whites
  "'#F1F5F9'": "'var(--bg-tertiary)'",
  "'#F9FAFB'": "'var(--bg-tertiary)'",
  "'#E5E7EB'": "'var(--bg-tertiary)'",
  "'#FFF'": "'var(--bg-tertiary)'",
  "'#FFFFFF'": "'var(--bg-tertiary)'",
  "'white'": "'var(--bg-tertiary)'",

  // Without quotes for regex matches
  "#FEF2F2": "rgba(239, 68, 68, 0.15)",
  "#FEE2E2": "rgba(239, 68, 68, 0.2)",
  "#F0FDF4": "rgba(34, 197, 94, 0.15)",
  "#DCFCE7": "rgba(34, 197, 94, 0.2)",
  "#D1FAE5": "rgba(16, 185, 129, 0.15)",
  "#FFF7ED": "rgba(234, 88, 12, 0.15)",
  "#FFF5F0": "rgba(243, 111, 33, 0.15)",
  "#FEF3C7": "rgba(245, 158, 11, 0.15)",
  "#EFF6FF": "rgba(59, 130, 246, 0.15)",
  "#DBEAFE": "rgba(59, 130, 246, 0.2)",
  "#E0E7FF": "rgba(99, 102, 241, 0.15)",
  "#EDE9FE": "rgba(139, 92, 246, 0.15)",
  "#F1F5F9": "var(--bg-tertiary)",
  "#F9FAFB": "var(--bg-tertiary)",
  "#E5E7EB": "var(--bg-tertiary)",
  "#FFFFFF": "var(--bg-tertiary)"
};

let updatedFilesCount = 0;

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;

      // Replace background: '#...' or background: 'white'
      content = content.replace(/background:\s*('[^']+')/gi, (match, p1) => {
        if (replacementMap[p1.toUpperCase()]) {
          return `background: ${replacementMap[p1.toUpperCase()]}`;
        }
        if (replacementMap[p1]) {
           return `background: ${replacementMap[p1]}`;
        }
        return match;
      });

      // Replace bg: '#...'
      content = content.replace(/bg:\s*('[^']+')/gi, (match, p1) => {
        if (replacementMap[p1.toUpperCase()]) {
          return `bg: ${replacementMap[p1.toUpperCase()]}`;
        }
        if (replacementMap[p1]) {
           return `bg: ${replacementMap[p1]}`;
        }
        return match;
      });

      // Replace raw hex codes used directly as strings or in template literals that act as backgrounds
      // We will do a generic replace for these specific hex codes to be safe. 
      // ONLY replace if they are prefixed by `#`.
      Object.keys(replacementMap).forEach(key => {
         if (key.startsWith('#')) {
             const regex = new RegExp(key, 'gi');
             content = content.replace(regex, replacementMap[key]);
         }
      });

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
        updatedFilesCount++;
      }
    }
  }
}

dirsToScan.forEach(scanDir);
console.log(`Done. Updated ${updatedFilesCount} files.`);
