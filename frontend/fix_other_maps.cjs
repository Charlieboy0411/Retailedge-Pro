const fs = require('fs');

// MDDashboard
const mdFile = 'src/components/MDDashboard.jsx';
let mdContent = fs.readFileSync(mdFile, 'utf8');

const oldMDSVG = /<svg viewBox="0 0 200 240" width="100%" height="160" style=\{\{ maxWidth: '140px' \}\}>[\s\S]*?<\/svg>/;
const newMDSVG = `<svg viewBox="0 0 400 400" width="100%" height="160" style={{ maxWidth: '140px', overflow: 'visible' }}>
                <path d="M 160 40 L 180 10 L 210 20 L 220 50 L 250 80 L 270 90 L 320 90 L 340 100 L 360 120 L 350 140 L 320 150 L 300 140 L 290 160 L 270 190 L 250 240 L 220 300 L 200 360 L 180 360 L 150 280 L 120 220 L 100 190 L 60 170 L 50 150 L 70 130 L 100 140 L 120 110 L 130 80 L 140 50 Z" 
                  fill="var(--bg-tertiary)" stroke={theme.border} strokeWidth="3" strokeLinejoin="round" 
                />
                <circle cx="200" cy="80" r="45" fill={theme.success} opacity="0.85" />
                <circle cx="120" cy="160" r="45" fill={theme.success} opacity="0.85" />
                <circle cx="200" cy="180" r="45" fill={theme.warning} opacity="0.85" />
                <circle cx="280" cy="160" r="45" fill={theme.success} opacity="0.85" />
                <circle cx="200" cy="280" r="45" fill={theme.success} opacity="0.85" />

                <text x="200" y="85" fill='var(--bg-primary)' fontSize="20" fontWeight="bold" textAnchor="middle">N</text>
                <text x="120" y="165" fill='var(--bg-primary)' fontSize="20" fontWeight="bold" textAnchor="middle">W</text>
                <text x="200" y="185" fill='var(--bg-primary)' fontSize="20" fontWeight="bold" textAnchor="middle">C</text>
                <text x="280" y="165" fill='var(--bg-primary)' fontSize="20" fontWeight="bold" textAnchor="middle">E</text>
                <text x="200" y="285" fill='var(--bg-primary)' fontSize="20" fontWeight="bold" textAnchor="middle">S</text>
              </svg>`;

if (mdContent.match(oldMDSVG)) {
  mdContent = mdContent.replace(oldMDSVG, newMDSVG);
  fs.writeFileSync(mdFile, mdContent, 'utf8');
  console.log('Fixed MDDashboard map.');
}


// MarketingManagerDashboard
const mmFile = 'src/components/MarketingManagerDashboard.jsx';
let mmContent = fs.readFileSync(mmFile, 'utf8');

const oldMMSVG = /<svg viewBox="0 0 360 380" style=\{\{ width: '100%', height: '320px' \}\}>[\s\S]*?<\/svg>/;
const newMMSVG = `<svg viewBox="0 0 400 400" style={{ width: '100%', height: '320px', overflow: 'visible' }}>
                    {/* Outline / base path of India map simplified to zones */}
                    <path 
                      d="M 160 40 L 180 10 L 210 20 L 220 50 L 250 80 L 270 90 L 320 90 L 340 100 L 360 120 L 350 140 L 320 150 L 300 140 L 290 160 L 270 190 L 250 240 L 220 300 L 200 360 L 180 360 L 150 280 L 120 220 L 100 190 L 60 170 L 50 150 L 70 130 L 100 140 L 120 110 L 130 80 L 140 50 Z" 
                      fill="var(--bg-tertiary)" stroke={BORDER} strokeWidth="3" strokeLinejoin="round" 
                    />
                    <g style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}>
                      <circle cx="200" cy="80" r="45" fill={selectedRegion === 'North' || selectedRegion === 'All' ? BLUE : \`\${BLUE}44\`} onClick={() => setSelectedRegion(selectedRegion === 'North' ? 'All' : 'North')} />
                      <text x="200" y="85" fill='var(--bg-glass)' fontSize="13" fontWeight="800" textAnchor="middle" style={{ pointerEvents: 'none' }}>NORTH</text>

                      <circle cx="110" cy="160" r="45" fill={selectedRegion === 'West' || selectedRegion === 'All' ? GREEN : \`\${GREEN}44\`} onClick={() => setSelectedRegion(selectedRegion === 'West' ? 'All' : 'West')} />
                      <text x="110" y="165" fill='var(--bg-glass)' fontSize="13" fontWeight="800" textAnchor="middle" style={{ pointerEvents: 'none' }}>WEST</text>

                      <circle cx="200" cy="180" r="45" fill={selectedRegion === 'Central' || selectedRegion === 'All' ? AMBER : \`\${AMBER}44\`} onClick={() => setSelectedRegion(selectedRegion === 'Central' ? 'All' : 'Central')} />
                      <text x="200" y="185" fill='var(--bg-glass)' fontSize="13" fontWeight="800" textAnchor="middle" style={{ pointerEvents: 'none' }}>CENTRAL</text>

                      <circle cx="290" cy="160" r="45" fill={selectedRegion === 'East' || selectedRegion === 'All' ? AMBER : \`\${AMBER}44\`} onClick={() => setSelectedRegion(selectedRegion === 'East' ? 'All' : 'East')} />
                      <text x="290" y="165" fill='var(--bg-glass)' fontSize="13" fontWeight="800" textAnchor="middle" style={{ pointerEvents: 'none' }}>EAST</text>

                      <circle cx="200" cy="285" r="45" fill={selectedRegion === 'South' || selectedRegion === 'All' ? SKY : \`\${SKY}44\`} onClick={() => setSelectedRegion(selectedRegion === 'South' ? 'All' : 'South')} />
                      <text x="200" y="290" fill='var(--bg-glass)' fontSize="13" fontWeight="800" textAnchor="middle" style={{ pointerEvents: 'none' }}>SOUTH</text>
                    </g>
                  </svg>`;

if (mmContent.match(oldMMSVG)) {
  mmContent = mmContent.replace(oldMMSVG, newMMSVG);
  fs.writeFileSync(mmFile, mmContent, 'utf8');
  console.log('Fixed MarketingManagerDashboard map.');
}
