const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/SupervisorDashboard.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Recharts Imports
if (!content.includes('recharts')) {
  content = content.replace(
    /import { motion } from 'framer-motion';/,
    `import { motion } from 'framer-motion';\nimport { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ComposedChart, Bar, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';`
  );
}

// 2. Add New State & Data
const stateInjection = `
  const [coachingLogs, setCoachingLogs] = useState({});

  const toggleCoaching = (id) => {
    setCoachingLogs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const productivityData = [
    { day: 'Mon', training: 45, output: 85 },
    { day: 'Tue', training: 60, output: 92 },
    { day: 'Wed', training: 80, output: 95 },
    { day: 'Thu', training: 95, output: 98 },
    { day: 'Fri', training: 100, output: 105 },
  ];

  const skillData = [
    { subject: 'POS Systems', A: 85, B: 65, fullMark: 100 },
    { subject: 'Customer Handling', A: 90, B: 70, fullMark: 100 },
    { subject: 'Product Knowledge', A: 75, B: 85, fullMark: 100 },
    { subject: 'Compliance', A: 95, B: 90, fullMark: 100 },
    { subject: 'Troubleshooting', A: 70, B: 60, fullMark: 100 },
  ];

  const shiftData = [
    { name: 'Rahul S.', shift: 'Morning', training: '10:00 AM - 11:30 AM', risk: 'Low' },
    { name: 'Priya R.', shift: 'Evening', training: 'None (Completed)', risk: 'Low' },
    { name: 'Amit K.', shift: 'Morning', training: '09:00 AM - 12:00 PM', risk: 'High (Coverage Alert)' },
    { name: 'Sunita D.', shift: 'Night', training: '08:00 PM - 09:00 PM', risk: 'Medium' },
    { name: 'Vivek N.', shift: 'Morning', training: '11:00 AM - 12:00 PM', risk: 'Medium' },
  ];
`;

content = content.replace(
  /const \[annSent, setAnnSent\] = useState\(false\);/,
  `const [annSent, setAnnSent] = useState(false);\n${stateInjection}`
);

// 3. Update Tabs
content = content.replace(
  /\{ id: 'employees', label: '👤 Employee Monitoring' \},/,
  `{ id: 'employees', label: '👤 Employee Monitoring' },
          { id: 'shift', label: '📅 Shift & Capacity' },
          { id: 'skills', label: '🎯 Skill Matrix' },`
);

// 4. Upgrade Home Tab (Inject composed chart before Team Scoreboard)
const homeUpgradeJSX = `
          {/* Training vs Productivity KPI */}
          {card(
            <>
              <h4 style={{ margin: '0 0 16px 0', fontWeight: 800, color: NAVY, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color={ORANGE} /> Training vs. Floor Productivity
              </h4>
              <div style={{ width: '100%', height: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={productivityData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: MUTED }} dy={5} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: MUTED }} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: MUTED }} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: BG, border: \`1px solid \${BORDER}\`, borderRadius: '8px', color: TEXT }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar yAxisId="left" dataKey="output" name="Floor Output KPI" fill={BLUE} radius={[4, 4, 0, 0]} maxBarSize={30} />
                    <Line yAxisId="right" type="monotone" dataKey="training" name="Training %" stroke={ORANGE} strokeWidth={3} dot={{ r: 4, fill: ORANGE }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* Team Scoreboard + Training status */}
`;

content = content.replace(
  /\{\/\* Team Scoreboard \+ Training status \*\/\}/,
  homeUpgradeJSX
);

// 5. Upgrade Employee Monitoring Tab (Micro-Escalation Logging)
const employeeUpgradeSearch = `Assign Refresher
                    </button>
                  </div>
                </div>
              ))}
              {lowPerformers.length === 0`;

const employeeUpgradeReplace = `Assign Refresher
                    </button>
                    <button onClick={() => toggleCoaching(p.employeeId)} style={{ padding: '4px 8px', borderRadius: '6px', background: coachingLogs[p.employeeId] ? \`\${GREEN}10\` : \`\${RED}10\`, border: \`1px solid \${coachingLogs[p.employeeId] ? GREEN : RED}30\`, color: coachingLogs[p.employeeId] ? GREEN : RED, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                      {coachingLogs[p.employeeId] ? '✓ Coaching Logged' : 'Log 1-on-1 Coaching'}
                    </button>
                  </div>
                </div>
              ))}
              {lowPerformers.length === 0`;

content = content.replace(employeeUpgradeSearch, employeeUpgradeReplace);

// 6. Add New Tabs (Shift & Capacity and Skill Matrix)
const newTabsJSX = `

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB: SHIFT & CAPACITY PLANNING                                */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'shift' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {card(
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontWeight: 800, color: NAVY, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={18} color={BLUE} /> Weekly Roster & Training Deficit Tracker
                </h4>
                <div style={{ padding: '6px 12px', background: \`\${RED}10\`, border: \`1px solid \${RED}30\`, borderRadius: '8px', color: RED, fontSize: '0.75rem', fontWeight: 700 }}>
                  ⚠️ Warning: 14% Capacity Deficit detected during Morning Shift (Thurs)
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: \`1px solid \${BORDER}\`, color: MUTED }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Employee</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Assigned Shift</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Scheduled Training Hrs</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>SLA Impact Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftData.map((row, i) => (
                    <tr key={i} style={{ borderBottom: \`1px solid \${BORDER}\` }}>
                      <td style={{ padding: '12px', fontWeight: 700, color: TEXT }}>{row.name}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={badge(row.shift === 'Morning' ? ORANGE : BLUE)}>{row.shift}</span>
                      </td>
                      <td style={{ padding: '12px', color: TEXT }}>{row.training}</td>
                      <td style={{ padding: '12px', fontWeight: 700, color: row.risk.includes('High') ? RED : row.risk === 'Medium' ? AMBER : GREEN }}>{row.risk}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB: SKILL PROFICIENCY MATRIX                                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'skills' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '20px' }}>
          {card(
            <>
              <h4 style={{ margin: '0 0 16px 0', fontWeight: 800, color: NAVY, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={18} color={GREEN} /> Team Skill Radar
              </h4>
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={skillData}>
                    <PolarGrid stroke={BORDER} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: MUTED, fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: BG, border: \`1px solid \${BORDER}\`, borderRadius: '8px', color: TEXT }} />
                    <Radar name="Team Avg" dataKey="A" stroke={ORANGE} fill={ORANGE} fillOpacity={0.5} />
                    <Radar name="Target" dataKey="B" stroke={BLUE} fill={BLUE} fillOpacity={0.2} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {card(
            <>
              <h4 style={{ margin: '0 0 16px 0', fontWeight: 800, color: NAVY, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color={NAVY} /> Individual Competency Matrix
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'center' }}>
                  <thead>
                    <tr style={{ borderBottom: \`1px solid \${BORDER}\`, color: MUTED }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Employee</th>
                      <th style={{ padding: '8px' }}>POS</th>
                      <th style={{ padding: '8px' }}>Support</th>
                      <th style={{ padding: '8px' }}>Product</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'Rahul S.', scores: [95, 88, 92] },
                      { name: 'Priya R.', scores: [82, 94, 89] },
                      { name: 'Amit K.', scores: [65, 70, 60] },
                      { name: 'Sunita D.', scores: [90, 85, 91] },
                      { name: 'Vivek N.', scores: [72, 68, 75] },
                    ].map((row, i) => (
                      <tr key={i} style={{ borderBottom: \`1px solid \${BORDER}\` }}>
                        <td style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 700, color: TEXT }}>{row.name}</td>
                        {row.scores.map((s, j) => (
                          <td key={j} style={{ padding: '10px 8px' }}>
                            <span style={{ padding: '4px 8px', borderRadius: '4px', background: s >= 90 ? \`\${GREEN}20\` : s >= 75 ? \`\${BLUE}20\` : \`\${RED}20\`, color: s >= 90 ? GREEN : s >= 75 ? BLUE : RED, fontWeight: 700 }}>
                              {s}%
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB: REPORTS                                                  */}
`;

content = content.replace(
  /\{\/\* ══════════════════════════════════════════════════════════════ \*\/\}\s*\{\/\* TAB: REPORTS/,
  newTabsJSX + "      {/* TAB: REPORTS"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("SupervisorDashboard enhancements successfully applied.");
