const fs = require('fs');
const content = fs.readFileSync('src/pages/Login.jsx', 'utf8');
const errIndex = 17159;
const start = Math.max(0, errIndex - 200);
const end = Math.min(content.length, errIndex + 200);

console.log("----- SURROUNDING TEXT -----");
console.log(content.substring(start, end));
console.log("----- ERROR POINT -----");
console.log(content.substring(errIndex, errIndex + 20));
