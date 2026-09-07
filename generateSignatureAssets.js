const fs = require('fs');
const path = require('path');

// 1. Mohit Tiku Signature SVG (Managing Director)
const mohitTikuSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 90" width="300" height="90">
  <path d="M 20 60 C 25 25, 38 12, 48 35 C 55 52, 60 70, 72 38 C 80 18, 92 45, 105 48 C 115 50, 120 35, 132 38 C 145 42, 150 55, 165 42 C 175 32, 190 28, 205 35 C 220 42, 235 30, 255 25 C 240 55, 200 68, 160 72 C 120 76, 70 78, 25 75" 
        fill="none" stroke="#0B1B3D" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M 50 35 Q 95 18 145 32 Q 210 25 275 22" 
        fill="none" stroke="#0B1B3D" stroke-width="2.5" stroke-linecap="round" />
  <path d="M 65 72 Q 130 65 240 58" 
        fill="none" stroke="#0B1B3D" stroke-width="2" stroke-linecap="round" opacity="0.85" />
</svg>`;

// 2. Aakash Verma Signature SVG (Lead Trainer)
const aakashVermaSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 90" width="300" height="90">
  <path d="M 25 65 C 35 30, 45 15, 60 40 C 70 60, 85 20, 100 45 C 112 62, 125 35, 140 40 C 155 45, 170 30, 190 42 C 210 52, 225 35, 250 30 C 230 65, 180 75, 130 75 C 80 75, 40 70, 20 68" 
        fill="none" stroke="#1E293B" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M 45 42 Q 110 32 220 28" 
        fill="none" stroke="#1E293B" stroke-width="2.2" stroke-linecap="round" />
</svg>`;

// 3. Official Idonneous Corporate Seal SVG (Circular embossed badge)
const idonneousSealSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <!-- Circular text paths -->
    <path id="sealTopPath" d="M 25 100 A 75 75 0 0 1 175 100" fill="none" />
    <path id="sealBottomPath" d="M 175 100 A 75 75 0 0 1 25 100" fill="none" />
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#D97706" />
      <stop offset="50%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#B45309" />
    </linearGradient>
  </defs>

  <!-- Outer serrated / beaded ring -->
  <circle cx="100" cy="100" r="94" fill="none" stroke="url(#goldGradient)" stroke-width="2" stroke-dasharray="3, 3" />
  <circle cx="100" cy="100" r="88" fill="none" stroke="#0B1220" stroke-width="2.5" />
  <circle cx="100" cy="100" r="84" fill="none" stroke="url(#goldGradient)" stroke-width="1.5" />

  <!-- Background Tint -->
  <circle cx="100" cy="100" r="82" fill="#FFFFFF" fill-opacity="0.9" />

  <!-- Top Curved Text: IDONNEOUS MARKETING SERVICES -->
  <text font-family="'Inter', 'Arial', sans-serif" font-size="8.5" font-weight="900" fill="#0B1220" letter-spacing="1.8">
    <textPath href="#sealTopPath" startOffset="50%" text-anchor="middle">
      ★ IDONNEOUS MARKETING SERVICES ★
    </textPath>
  </text>

  <!-- Bottom Curved Text: OFFICIAL CORPORATE SEAL -->
  <text font-family="'Inter', 'Arial', sans-serif" font-size="8" font-weight="800" fill="#D97706" letter-spacing="2">
    <textPath href="#sealBottomPath" startOffset="50%" text-anchor="middle">
      • CERTIFIED CREDENTIAL •
    </textPath>
  </text>

  <!-- Inner Rings -->
  <circle cx="100" cy="100" r="54" fill="none" stroke="#0B1220" stroke-width="2" />
  <circle cx="100" cy="100" r="50" fill="none" stroke="url(#goldGradient)" stroke-width="1" />

  <!-- Center Monogram / Star -->
  <g transform="translate(100, 100)">
    <!-- Star Motif -->
    <path d="M 0 -22 L 6 -6 L 22 0 L 6 6 L 0 22 L -6 6 L -22 0 L -6 -6 Z" fill="url(#goldGradient)" />
    <!-- Center Shield / Monogram -->
    <circle cx="0" cy="0" r="10" fill="#0B1220" />
    <text x="0" y="3.5" font-family="'Inter', sans-serif" font-size="9" font-weight="900" fill="#FFFFFF" text-anchor="middle">IMS</text>
    <text x="0" y="30" font-family="'Inter', sans-serif" font-size="6.5" font-weight="800" fill="#0B1220" text-anchor="middle" letter-spacing="1">SEAL OF EXCELLENCE</text>
  </g>
</svg>`;

const locations = [
  path.join(__dirname, 'frontend/public/assets'),
  path.join(__dirname, 'backend/public/assets')
];

for (const loc of locations) {
  fs.writeFileSync(path.join(loc, 'signatures/mohit_tiku_signature.svg'), mohitTikuSvg.trim());
  fs.writeFileSync(path.join(loc, 'signatures/aakash_verma_signature.svg'), aakashVermaSvg.trim());
  fs.writeFileSync(path.join(loc, 'seals/idonneous_official_seal.svg'), idonneousSealSvg.trim());
}

console.log('✅ Signature and Seal SVGs created successfully in frontend and backend public dirs!');
