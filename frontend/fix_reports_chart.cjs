const fs = require('fs');

const file = 'src/pages/Reports.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add state variable
if (!content.includes('const [trendPeriod, setTrendPeriod]')) {
  content = content.replace(
    /const \[leaderboard, setLeaderboard\] = useState\(\[\]\);/,
    `const [leaderboard, setLeaderboard] = useState([]);\n  const [trendPeriod, setTrendPeriod] = useState('Monthly');`
  );
}

// 2. Define the datasets right before the render (inside Reports function, maybe just before `return`)
const datasetCode = `
  const getTrendData = () => {
    if (trendPeriod === 'Daily') {
      return [
        { label: '30 May', p: 150, c: 88, s: 72 },
        { label: '31 May', p: 170, c: 90, s: 74 },
        { label: '01 Jun', p: 220, c: 92, s: 80 },
        { label: '02 Jun', p: 180, c: 89, s: 76 },
        { label: '03 Jun', p: 250, c: 91, s: 78 },
        { label: '04 Jun', p: 200, c: 90, s: 77 },
        { label: '05 Jun', p: 190, c: 92, s: 81 },
      ];
    } else if (trendPeriod === 'Weekly') {
      return [
        { label: 'W4 Apr', p: 800, c: 85, s: 70 },
        { label: 'W1 May', p: 850, c: 87, s: 71 },
        { label: 'W2 May', p: 920, c: 88, s: 74 },
        { label: 'W3 May', p: 890, c: 86, s: 73 },
        { label: 'W4 May', p: 950, c: 89, s: 76 },
        { label: 'W1 Jun', p: 1100, c: 91, s: 78 },
        { label: 'W2 Jun', p: 1050, c: 92, s: 80 },
      ];
    } else {
      return [
        { label: 'Dec', p: 3200, c: 80, s: 68 },
        { label: 'Jan', p: 3500, c: 82, s: 70 },
        { label: 'Feb', p: 3100, c: 85, s: 72 },
        { label: 'Mar', p: 3800, c: 86, s: 74 },
        { label: 'Apr', p: 4100, c: 88, s: 75 },
        { label: 'May', p: 4500, c: 90, s: 77 },
        { label: 'Jun', p: 4800, c: 92, s: 79 },
      ];
    }
  };
  const trendData = getTrendData();
  const maxP = Math.max(...trendData.map(d => d.p)) * 1.2;

  // Chart coordinates calculation
  const getX = (index) => 35 + index * 65;
  const getPY = (p) => 155 - (p / maxP) * 140; // Participants Y
  const getCY = (c) => 155 - (c / 100) * 140; // Completion Y
  const getSY = (s) => 155 - (s / 100) * 140; // Score Y

  const cPath = trendData.map((d, i) => \`\${i === 0 ? 'M' : 'L'} \${getX(i)},\${getCY(d.c)}\`).join(' ');
  const sPath = trendData.map((d, i) => \`\${i === 0 ? 'M' : 'L'} \${getX(i)},\${getSY(d.s)}\`).join(' ');
`;

if (!content.includes('const getTrendData = () => {')) {
  content = content.replace(
    /return \(\n\s*<div style=\{\{ display: 'flex'/,
    `${datasetCode}\n  return (\n    <div style={{ display: 'flex'`
  );
}

// 3. Replace the select element to use state
content = content.replace(
  /<select style=\{\{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', background: 'var\(--bg-glass\)', fontSize: '0.72rem', fontWeight: 700, color: 'var\(--text-secondary\)' \}\}>\s*<option>Daily<\/option>\s*<option>Weekly<\/option>\s*<option>Monthly<\/option>\s*<\/select>/,
  `<select value={trendPeriod} onChange={(e) => setTrendPeriod(e.target.value)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)', outline: 'none' }}>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>`
);

// 4. Replace the hardcoded SVG interior with dynamic mapping
// The SVG starts at `<svg viewBox="0 0 460 180"` and ends with `</svg>`
const svgRegex = /<svg viewBox="0 0 460 180" width="100%" height="100%" style=\{\{ overflow: 'visible' \}\}>[\s\S]*?<\/svg>/;

const dynamicSVG = `<svg viewBox="0 0 460 180" width="100%" height="100%" style={{ overflow: 'visible' }}>
              {/* Y Axis Gridlines */}
              <line x1="35" y1="15" x2="425" y2="15" stroke="var(--border-glass)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
              <line x1="35" y1="50" x2="425" y2="50" stroke="var(--border-glass)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
              <line x1="35" y1="85" x2="425" y2="85" stroke="var(--border-glass)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
              <line x1="35" y1="120" x2="425" y2="120" stroke="var(--border-glass)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
              <line x1="35" y1="155" x2="425" y2="155" stroke="var(--border-glass)" strokeWidth="1.5" />

              {/* Y Labels Left (Participants) */}
              <text x="25" y="20" fill="var(--text-secondary)" fontSize="8" textAnchor="end">{Math.round(maxP)}</text>
              <text x="25" y="55" fill="var(--text-secondary)" fontSize="8" textAnchor="end">{Math.round(maxP * 0.75)}</text>
              <text x="25" y="90" fill="var(--text-secondary)" fontSize="8" textAnchor="end">{Math.round(maxP * 0.5)}</text>
              <text x="25" y="125" fill="var(--text-secondary)" fontSize="8" textAnchor="end">{Math.round(maxP * 0.25)}</text>
              <text x="25" y="158" fill="var(--text-secondary)" fontSize="8" textAnchor="end">0</text>

              {/* Y Labels Right (Percentages) */}
              <text x="435" y="20" fill="var(--text-secondary)" fontSize="8">100%</text>
              <text x="435" y="55" fill="var(--text-secondary)" fontSize="8">75%</text>
              <text x="435" y="90" fill="var(--text-secondary)" fontSize="8">50%</text>
              <text x="435" y="125" fill="var(--text-secondary)" fontSize="8">25%</text>
              <text x="435" y="158" fill="var(--text-secondary)" fontSize="8">0%</text>

              {/* Dynamic X Labels and Bars */}
              {trendData.map((d, i) => {
                const x = getX(i);
                const barY = getPY(d.p);
                const barH = 155 - barY;
                return (
                  <g key={'bar'+i}>
                    <text x={x} y="170" fill="var(--text-secondary)" fontSize="8" textAnchor="middle" fontWeight={600}>{d.label}</text>
                    <rect x={x - 12} y={barY} width="24" height={barH} rx="3" fill="var(--primary)" fillOpacity="0.85" />
                  </g>
                );
              })}

              {/* Completion Rate Line (Green) */}
              <path d={cPath} fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {trendData.map((d, i) => <circle key={'cc'+i} cx={getX(i)} cy={getCY(d.c)} r="3" fill="#16A34A" stroke="var(--bg-glass)" strokeWidth="1" />)}

              {/* Avg Score Line (Orange) */}
              <path d={sPath} fill="none" stroke="#EA580C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {trendData.map((d, i) => <circle key={'sc'+i} cx={getX(i)} cy={getSY(d.s)} r="3" fill="#EA580C" stroke="var(--bg-glass)" strokeWidth="1" />)}
            </svg>`;

content = content.replace(svgRegex, dynamicSVG);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed SVG rendering in Reports.jsx');
