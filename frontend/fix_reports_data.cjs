const fs = require('fs');

const file = 'src/pages/Reports.jsx';
let content = fs.readFileSync(file, 'utf8');

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
    /return \(\n\s*<div style=\{\{ padding: '24px'/,
    `${datasetCode}\n\n  return (\n    <div style={{ padding: '24px'`
  );
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed undefined trendData.');
} else {
  console.log('Already fixed.');
}
