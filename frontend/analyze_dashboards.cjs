const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/components');
const files = fs.readdirSync(dir).filter(f => f.includes('Dashboard'));

const result = {};

for (const file of files) {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  // Match <h3> or <h4> tags and extract inner text.
  // We use a non-greedy match to get the text between tags.
  const regex = /<h[34][^>]*>(.*?)<\/h[34]>/gi;
  let match;
  const headers = [];
  while ((match = regex.exec(content)) !== null) {
    // Strip any nested tags (e.g. <span> or {variable})
    let text = match[1].replace(/<[^>]+>/g, '').replace(/\{[^}]+\}/g, '').trim();
    if (text) headers.push(text);
  }
  result[file] = headers;
}

for (const file in result) {
  console.log(`\n=== ${file} ===`);
  result[file].forEach(h => console.log(`- ${h}`));
}
