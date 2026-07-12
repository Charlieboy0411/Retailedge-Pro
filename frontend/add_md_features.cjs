const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/MDDashboard.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update Recharts Imports
content = content.replace(
  /AreaChart,\s*Area,\s*XAxis,\s*YAxis,\s*Tooltip,\s*ResponsiveContainer,\s*PieChart,\s*Pie,\s*Cell/,
  "AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Bar, Line, CartesianGrid, Legend"
);

// 2. Add businessImpactData
const dataInjection = `
  const businessImpactData = [
    { name: 'Jan', completion: 65, sales: 1.2 },
    { name: 'Feb', completion: 72, sales: 1.5 },
    { name: 'Mar', completion: 78, sales: 1.9 },
    { name: 'Apr', completion: 85, sales: 2.3 },
    { name: 'May', completion: 92, sales: 2.8 },
    { name: 'Jun', completion: 96, sales: 3.4 },
  ];
`;

content = content.replace(
  /const escalationData = \[\s*\{ name: 'Critical', value: 1, color: '#EF4444' \},\s*\{ name: 'Medium', value: 3, color: '#F59E0B' \},\s*\{ name: 'Low', value: 7, color: '#10B981' \},\s*\];/g,
  `const escalationData = [
    { name: 'Critical', value: 1, color: '#EF4444' },
    { name: 'Medium', value: 3, color: '#F59E0B' },
    { name: 'Low', value: 7, color: '#10B981' },
  ];
${dataInjection}`
);

// 3. Add the New Row
const newRowJSX = `

      {/* STRATEGIC & FINANCIAL GOVERNANCE ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        
        {/* Business Impact Correlation */}
        <div style={{ background: theme.card, backdropFilter: 'blur(12px)', borderRadius: '12px', border: \`1px solid \${theme.border}\`, padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Business Impact Correlation</h3>
            <span style={{ fontSize: '0.7rem', color: theme.textSecondary }}>Training vs Sales Growth (Cr)</span>
          </div>
          <div style={{ flex: 1, minHeight: '220px', width: '100%', marginTop: '10px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={businessImpactData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: theme.textSecondary }} dy={5} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: theme.textSecondary }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: theme.textSecondary }} tickFormatter={(v) => \`\${v}%\`} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: 'var(--bg-tertiary)', border: \`1px solid \${theme.border}\`, borderRadius: '8px', color: theme.textMain }} />
                <Bar yAxisId="left" dataKey="sales" name="Sales Uplift (Cr)" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Line yAxisId="right" type="monotone" dataKey="completion" name="Training %" stroke={theme.purple} strokeWidth={3} dot={{ r: 4, fill: theme.purple }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget Utilization */}
        <div style={{ background: theme.card, backdropFilter: 'blur(12px)', borderRadius: '12px', border: \`1px solid \${theme.border}\`, padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Budget Utilization</h3>
            <MoreVertical size={16} color={theme.textSecondary} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, marginTop: '10px' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: theme.textSecondary, marginBottom: '4px' }}>YTD Spend</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: theme.textMain }}>₹ 1.8 <span style={{ fontSize: '1.2rem' }}>Cr</span></div>
              <div style={{ fontSize: '0.75rem', color: theme.textSecondary }}>of ₹ 2.5 Cr Annual Budget</div>
            </div>
            
            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '8px', fontWeight: 600 }}>
                <span style={{ color: theme.primary }}>72% Utilized</span>
                <span style={{ color: theme.textSecondary }}>Target: 60% by Q3</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--border-glass)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '72%', height: '100%', background: theme.primary, borderRadius: '4px' }}></div>
              </div>
            </div>

            <div style={{ marginTop: 'auto', background: 'var(--bg-tertiary)', border: \`1px solid \${theme.warning}50\`, padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <AlertTriangle size={20} color={theme.warning} style={{ marginTop: '2px' }} />
              <div style={{ fontSize: '0.8rem', color: theme.textMain }}>
                Run rate implies <span style={{ fontWeight: 700, color: theme.warning }}>₹ 40L overspend</span> by EOY. Reallocation recommended.
              </div>
            </div>
          </div>
        </div>

        {/* Compliance Risk Deficit */}
        <div style={{ background: theme.card, backdropFilter: 'blur(12px)', borderRadius: '12px', border: \`1px solid \${theme.border}\`, padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Compliance Risk Deficit</h3>
            <span style={{ fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.1)', color: theme.danger, padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>High Priority</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', borderLeft: \`3px solid \${theme.danger}\` }}>
              <Shield size={24} color={theme.danger} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: theme.textMain }}>FDA Safety Regs</div>
                <div style={{ fontSize: '0.75rem', color: theme.textSecondary, marginTop: '2px' }}>Galderma • 145 at risk</div>
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: theme.danger }}>Critical</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', borderLeft: \`3px solid \${theme.warning}\` }}>
              <FileText size={24} color={theme.warning} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: theme.textMain }}>Data Privacy (GDPR)</div>
                <div style={{ fontSize: '0.75rem', color: theme.textSecondary, marginTop: '2px' }}>Unilever • 89 missing</div>
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: theme.warning }}>Medium</div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', borderLeft: \`3px solid \${theme.primary}\` }}>
              <AlertTriangle size={24} color={theme.primary} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: theme.textMain }}>Store Operations</div>
                <div style={{ fontSize: '0.75rem', color: theme.textSecondary, marginTop: '2px' }}>Face Shop • 42 pending</div>
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: theme.primary }}>Low</div>
            </div>

          </div>
        </div>

      </div>
`;

content = content.replace(
  /\{\/\* BOTTOM ROW \(3 Columns\) \*\/\}/g,
  newRowJSX + "\n      {/* BOTTOM ROW (3 Columns) */}"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("MDDashboard strategic row added.");
