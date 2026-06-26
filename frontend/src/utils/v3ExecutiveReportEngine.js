import ExcelJS from 'exceljs';
import PptxGenJS from 'pptxgenjs';
import { saveAs } from 'file-saver';

// --- DESIGN LANGUAGE (ARGB for Excel, HEX for PPT) ---
const COLORS = {
  TITANIUM: { hex: '25282C', argb: 'FF25282C' },
  PLATINUM: { hex: 'ECEFF1', argb: 'FFECEFF1' },
  SILVER: { hex: 'DDE2E7', argb: 'FFDDE2E7' },
  BLUE: { hex: '3E5C8A', argb: 'FF3E5C8A' },
  EMERALD: { hex: '3B8C68', argb: 'FF3B8C68' },
  GOLD: { hex: 'C79A3B', argb: 'FFC79A3B' },
  RED: { hex: 'B84A4A', argb: 'FFB84A4A' },
  WHITE: { hex: 'FFFFFF', argb: 'FFFFFFFF' }
};

// --- MOCK AI NARRATIVE GENERATORS ---
const generateAISummary = (projectName) => {
  return `Executive Summary for ${projectName}:\nWorkforce readiness improved by 4.2% across major regions. We have observed a strong correlation between recent certification drives and positive client SLA scores. However, early predictive indicators suggest that if intervention is not applied in the Western district, compliance targets may be missed by Q3.`;
};

const getStrategicRecommendations = () => [
  "Prioritize Phase 2 Certification Drive for field teams lacking compliance.",
  "Intervene in the West region to boost falling attendance rates.",
  "Scale the 'Customer Handling' module which generated the highest ROI this quarter."
];

const getPredictiveRisks = () => [
  { area: 'Galderma Certifications', risk: 'High', probability: '85%', impact: 'Missed SLA targets by EOM' },
  { area: 'West Region Attendance', risk: 'Medium', probability: '60%', impact: 'Delayed product rollouts' },
  { area: 'Trainer Capacity', risk: 'Low', probability: '25%', impact: 'Slight scheduling conflicts' }
];

// ============================================================================
// EXCEL INTELLIGENCE PACK (V3.0)
// ============================================================================
export const generateV3ExecutiveExcel = async (data, projectName = 'All Projects') => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RetailEdge Pro AI Reporting Engine';
  workbook.created = new Date();

  const applyHeaderStyle = (cell, color = COLORS.TITANIUM.argb) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    cell.font = { color: { argb: COLORS.WHITE.argb }, bold: true, size: 12 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  };

  const applyTitleStyle = (cell) => {
    cell.font = { size: 18, bold: true, color: { argb: COLORS.TITANIUM.argb } };
  };

  // 1. AI Executive Snapshot
  const s1 = workbook.addWorksheet('1. Executive Snapshot');
  s1.getColumn('B').width = 80;
  s1.getCell('B2').value = `AI Executive Snapshot: ${projectName}`;
  applyTitleStyle(s1.getCell('B2'));
  s1.getCell('B4').value = "AI Insight Narrative:";
  s1.getCell('B4').font = { bold: true, color: { argb: COLORS.BLUE.argb } };
  s1.getCell('B5').value = generateAISummary(projectName);
  s1.getCell('B5').alignment = { wrapText: true, vertical: 'top' };
  s1.getRow(5).height = 80;

  // 2. Executive Scorecard
  const s2 = workbook.addWorksheet('2. Scorecard');
  s2.columns = [
    { header: 'KPI', key: 'kpi', width: 30 },
    { header: 'Current Score', key: 'score', width: 20 },
    { header: 'Trend', key: 'trend', width: 15 },
    { header: 'Status', key: 'status', width: 15 }
  ];
  s2.getRow(1).eachCell((c) => applyHeaderStyle(c, COLORS.BLUE.argb));
  s2.addRows([
    { kpi: 'Revenue Impact', score: '₹ 2.8 Cr', trend: '+12%', status: 'Exceeding' },
    { kpi: 'Client Growth', score: '12 Active', trend: '+2', status: 'On Track' },
    { kpi: 'Workforce Readiness', score: '94%', trend: '+4%', status: 'On Track' },
    { kpi: 'Certification', score: '91%', trend: '+1%', status: 'Warning' },
    { kpi: 'NPS', score: '4.8/5', trend: '+0.2', status: 'Exceeding' },
    { kpi: 'Risk Index', score: '11 Escalations', trend: '-2', status: 'At Risk' }
  ]);

  // 3. Client Health Index
  const s3 = workbook.addWorksheet('3. Client Health');
  s3.columns = [
    { header: 'Client', key: 'client', width: 25 },
    { header: 'SLA Score', key: 'sla', width: 15 },
    { header: 'Completion %', key: 'comp', width: 15 },
    { header: 'Risk Factor', key: 'risk', width: 15 },
    { header: 'Health Index (0-100)', key: 'index', width: 20 }
  ];
  s3.getRow(1).eachCell((c) => applyHeaderStyle(c, COLORS.EMERALD.argb));
  s3.addRows([
    { client: 'Galderma', sla: 92, comp: 88, risk: 15, index: 85 },
    { client: 'Royal Canin', sla: 85, comp: 80, risk: 25, index: 70 },
    { client: 'Unilever', sla: 98, comp: 95, risk: 5, index: 96 }
  ]);

  // 4. Workforce Readiness
  const s4 = workbook.addWorksheet('4. Readiness');
  s4.columns = [{ header: 'Region', key: 'r', width: 20 }, { header: 'Attendance', key: 'a', width: 15 }, { header: 'Knowledge Score', key: 'k', width: 15 }, { header: 'Field Deployment', key: 'f', width: 20 }];
  s4.getRow(1).eachCell((c) => applyHeaderStyle(c, COLORS.TITANIUM.argb));
  s4.addRows([{ r: 'North', a: '92%', k: '88%', f: '95%' }, { r: 'South', a: '89%', k: '85%', f: '91%' }]);

  // 5. Training Effectiveness
  const s5 = workbook.addWorksheet('5. Effectiveness');
  s5.getCell('A1').value = 'Effectiveness metrics simulated for V3 module.';
  
  // 6. Predictive Risk Dashboard
  const s6 = workbook.addWorksheet('6. Predictive Risk');
  s6.columns = [{ header: 'Risk Area', key: 'area', width: 30 }, { header: 'Severity', key: 'sev', width: 15 }, { header: 'Probability', key: 'prob', width: 15 }, { header: 'Business Impact', key: 'impact', width: 40 }];
  s6.getRow(1).eachCell((c) => applyHeaderStyle(c, COLORS.RED.argb));
  getPredictiveRisks().forEach(r => s6.addRow({ area: r.area, sev: r.risk, prob: r.probability, impact: r.impact }));

  // 7. Sentiment & Feedback
  const s7 = workbook.addWorksheet('7. Sentiment Analysis');
  s7.getCell('A1').value = 'Top Keywords: Interactive, Engaging, Needs More Time. Overall Sentiment: 88% Positive.';

  // 8. ROI Analytics
  const s8 = workbook.addWorksheet('8. ROI Analytics');
  s8.columns = [{ header: 'Metric', key: 'm', width: 30 }, { header: 'Value', key: 'v', width: 20 }];
  s8.getRow(1).eachCell((c) => applyHeaderStyle(c, COLORS.GOLD.argb));
  s8.addRows([{ m: 'Training Investment', v: '₹ 12,00,000' }, { m: 'Cost Per Learner', v: '₹ 1,250' }, { m: 'Sales Uplift', v: '+11%' }, { m: 'Net ROI', v: '2.4 X' }]);

  // 9. Benchmarking
  const s9 = workbook.addWorksheet('9. Benchmarking');
  s9.getCell('A1').value = 'Industry vs Internal Benchmarks comparison module.';

  // 10. Scenario Planning
  const s10 = workbook.addWorksheet('10. Scenarios');
  s10.columns = [{ header: 'If this happens...', key: 'h', width: 40 }, { header: 'Then predictive impact is...', key: 'i', width: 40 }];
  s10.getRow(1).eachCell(c => applyHeaderStyle(c, COLORS.BLUE.argb));
  s10.addRows([
    { h: 'Certification improves by 5%', i: 'Productivity gain of 2.1% expected' },
    { h: 'Attendance drops by 10%', i: 'SLA Risk increases by 14% for key clients' }
  ]);

  // 11. Region Intelligence
  const s11 = workbook.addWorksheet('11. Region Heatmap');
  s11.getCell('A1').value = 'Region Health Heatmap Data points.';

  // 12. Strategic Recommendations
  const s12 = workbook.addWorksheet('12. Recommendations');
  s12.columns = [{ header: 'AI Recommended Action', key: 'rec', width: 80 }];
  s12.getRow(1).eachCell(c => applyHeaderStyle(c, COLORS.EMERALD.argb));
  getStrategicRecommendations().forEach(rec => s12.addRow({ rec }));

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Executive_Intelligence_Pack_${projectName}_${new Date().toISOString().split('T')[0]}.xlsx`);
};


// ============================================================================
// BOARD READY PPT DECK (V3.0)
// ============================================================================
export const generateV3ExecutivePPT = async (data, projectName = 'All Projects') => {
  const pptx = new PptxGenJS();
  pptx.author = 'RetailEdge Pro AI Reporting Engine';
  pptx.company = 'RetailEdge Pro';

  const defaultProps = { x: 0.5, w: 9, color: COLORS.TITANIUM.hex, fontFace: 'Arial' };

  // 1. Executive Cover
  const s1 = pptx.addSlide();
  s1.background = { color: COLORS.TITANIUM.hex };
  s1.addText('EXECUTIVE INTELLIGENCE BRIEF', { x: 0.5, y: 1.5, w: 9, h: 1, fontSize: 36, color: COLORS.WHITE.hex, bold: true });
  s1.addText(`Prepared for: Board of Directors\nDate: ${new Date().toLocaleDateString()}`, { x: 0.5, y: 2.8, w: 9, h: 1, fontSize: 16, color: COLORS.PLATINUM.hex });
  s1.addText('AI-Powered Insights Generation', { x: 0.5, y: 5.0, w: 9, fontSize: 12, color: COLORS.GOLD.hex });

  // 2. The Executive Story (Narrative)
  const s2 = pptx.addSlide();
  s2.addText('The Executive Story', { ...defaultProps, y: 0.4, fontSize: 24, bold: true, color: COLORS.BLUE.hex });
  s2.addText('“Why did it happen, and what should we do next?”', { ...defaultProps, y: 1.0, fontSize: 14, italic: true, color: COLORS.GOLD.hex });
  s2.addText(generateAISummary(projectName), { ...defaultProps, y: 2.0, h: 3, fontSize: 16, fill: { color: COLORS.PLATINUM.hex }, align: 'left' });

  // 3. Board Scorecard
  const s3 = pptx.addSlide();
  s3.addText('Executive Scorecard', { ...defaultProps, y: 0.4, fontSize: 24, bold: true, color: COLORS.BLUE.hex });
  
  const drawScoreTile = (x, y, title, val, trend, isGood) => {
    s3.addShape(pptx.shapes.RECTANGLE, { x, y, w: 2.8, h: 1.5, fill: { color: COLORS.PLATINUM.hex }, line: { color: COLORS.SILVER.hex } });
    s3.addText(title, { x: x+0.1, y: y+0.1, w: 2.6, fontSize: 12, color: COLORS.TITANIUM.hex, bold: true });
    s3.addText(val, { x: x+0.1, y: y+0.5, w: 2.6, fontSize: 24, color: COLORS.BLUE.hex, bold: true });
    s3.addText(trend, { x: x+0.1, y: y+1.0, w: 2.6, fontSize: 10, color: isGood ? COLORS.EMERALD.hex : COLORS.RED.hex, bold: true });
  };
  drawScoreTile(0.5, 1.5, 'Revenue Impact', '₹ 2.8 Cr', '▲ +12%', true);
  drawScoreTile(3.5, 1.5, 'Readiness', '94%', '▲ +4%', true);
  drawScoreTile(6.5, 1.5, 'Client NPS', '4.8/5', '▲ +0.2', true);
  drawScoreTile(0.5, 3.5, 'Certification', '91%', '▼ -1%', false);
  drawScoreTile(3.5, 3.5, 'Active Clients', '12', '2 At Risk', false);
  drawScoreTile(6.5, 3.5, 'Net ROI', '2.4 X', '▲ +0.3', true);

  // 4. Client Portfolio Health
  const s4 = pptx.addSlide();
  s4.addText('Client Portfolio Health Matrix', { ...defaultProps, y: 0.4, fontSize: 24, bold: true, color: COLORS.BLUE.hex });
  const matrixRows = [
    [{ text: 'Client', options: { bold: true, fill: COLORS.TITANIUM.hex, color: COLORS.WHITE.hex } }, { text: 'Health Index', options: { bold: true, fill: COLORS.TITANIUM.hex, color: COLORS.WHITE.hex } }, { text: 'Risk Status', options: { bold: true, fill: COLORS.TITANIUM.hex, color: COLORS.WHITE.hex } }],
    ['Galderma', '85 / 100', 'Stable'],
    ['Royal Canin', '70 / 100', 'At Risk'],
    ['Unilever', '96 / 100', 'Healthy']
  ];
  s4.addTable(matrixRows, { x: 0.5, y: 1.5, w: 9, colW: [3, 3, 3], fontSize: 14, border: { type: 'solid', color: COLORS.SILVER.hex } });

  // 5. Capability Heatmap
  const s5 = pptx.addSlide();
  s5.addText('Capability Heatmap', { ...defaultProps, y: 0.4, fontSize: 24, bold: true, color: COLORS.BLUE.hex });
  s5.addText('Region-wise capability indicators.', { x: 0.5, y: 1.5, w: 9, fontSize: 16 });

  // 6. Training Impact Story
  const s6 = pptx.addSlide();
  s6.addText('Training Impact Story', { ...defaultProps, y: 0.4, fontSize: 24, bold: true, color: COLORS.BLUE.hex });
  s6.addText('Completion improved 6% due to higher attendance and supervisor engagement.', { x: 0.5, y: 2, w: 8, h: 2, fill: { color: COLORS.PLATINUM.hex }, fontSize: 18, color: COLORS.TITANIUM.hex });

  // 7. Predictive Risks
  const s7 = pptx.addSlide();
  s7.addText('Predictive Risk Forecast', { ...defaultProps, y: 0.4, fontSize: 24, bold: true, color: COLORS.BLUE.hex });
  const riskRows = [
    [{ text: 'Risk Area', options: { bold: true, fill: COLORS.RED.hex, color: COLORS.WHITE.hex } }, { text: 'Probability', options: { bold: true, fill: COLORS.RED.hex, color: COLORS.WHITE.hex } }, { text: 'Impact', options: { bold: true, fill: COLORS.RED.hex, color: COLORS.WHITE.hex } }],
    ...getPredictiveRisks().map(r => [r.area, r.probability, r.impact])
  ];
  s7.addTable(riskRows, { x: 0.5, y: 1.5, w: 9, colW: [3, 2, 4], fontSize: 14, border: { type: 'solid', color: COLORS.SILVER.hex } });

  // 8. Executive Recommendations
  const s8 = pptx.addSlide();
  s8.addText('AI Strategic Recommendations', { ...defaultProps, y: 0.4, fontSize: 24, bold: true, color: COLORS.BLUE.hex });
  getStrategicRecommendations().forEach((rec, idx) => {
    s8.addText(`► ${rec}`, { x: 0.5, y: 1.5 + (idx * 0.8), w: 9, fontSize: 16, color: COLORS.TITANIUM.hex, bold: true });
  });

  // 9. Strategic Opportunities
  const s9 = pptx.addSlide();
  s9.addText('Strategic Opportunities', { ...defaultProps, y: 0.4, fontSize: 24, bold: true, color: COLORS.BLUE.hex });

  // 10. ROI Storytelling
  const s10 = pptx.addSlide();
  s10.addText('ROI Storytelling', { ...defaultProps, y: 0.4, fontSize: 24, bold: true, color: COLORS.BLUE.hex });

  // 11. Priorities
  const s11 = pptx.addSlide();
  s11.addText('What Leadership Should Focus On', { ...defaultProps, y: 0.4, fontSize: 24, bold: true, color: COLORS.BLUE.hex });
  s11.addText('1. Board Decisions Required: Renew Unilever Contract\n2. Ownership: MD & Program Directors\n3. Deadlines: EOM', { x: 0.5, y: 1.5, w: 9, fontSize: 16 });

  // 12. Appendix
  const s12 = pptx.addSlide();
  s12.addText('Appendix & Data Sources', { ...defaultProps, y: 0.4, fontSize: 24, bold: true, color: COLORS.BLUE.hex });
  s12.addText('Generated by RetailEdge Pro Executive Intelligence Engine v3.0.', { x: 0.5, y: 3, w: 9, fontSize: 14, color: COLORS.SILVER.hex, align: 'center' });

  await pptx.writeFile({ fileName: `Executive_Board_Deck_${projectName}_${new Date().toISOString().split('T')[0]}.pptx` });
};
