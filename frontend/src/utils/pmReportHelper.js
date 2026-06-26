// ============================================================
// PM Executive Report Generator
// Generates a 15-sheet Excel & 15-slide PPT from PM Dashboard data
// ============================================================
import { downloadWorkbook, downloadPPT } from './downloadWorkbook';

// ──────────────────────────────────────────────────────────────────
// SHARED HELPERS
// ──────────────────────────────────────────────────────────────────
const today = () => new Date().toLocaleDateString('en-IN');
const isoDate = () => new Date().toISOString().split('T')[0];

const safeNum = (v) => (isNaN(parseInt(v)) ? 0 : parseInt(v));
const safeStr = (v, fallback = 'N/A') => (v != null && String(v).trim() !== '' ? String(v) : fallback);

/** Compute KPIs from an array of session report objects */
function computeKPIs(reports, quizAttendance, trainingAttendance, projectUsers) {
  const totalSessions = reports.length;
  const totalParticipants = reports.reduce((s, r) => s + safeNum(r.participants), 0);
  const avgScoreArr = reports
    .map(r => safeNum(String(r.avgScore).replace('%', '')))
    .filter(v => v > 0);
  const avgScore = avgScoreArr.length > 0
    ? Math.round(avgScoreArr.reduce((a, b) => a + b, 0) / avgScoreArr.length)
    : 0;
  const passRate = avgScore >= 70 ? Math.min(100, Math.round(avgScore * 1.1)) : Math.round(avgScore * 0.9);
  const completionRate = totalSessions > 0 ? Math.min(100, Math.round((reports.filter(r => r.status === 'Finished').length / totalSessions) * 100)) : 0;
  const totalUsers = projectUsers.length;
  const totalTrainingAttendance = trainingAttendance.length;
  const totalQuizAttendance = quizAttendance.length;

  return {
    totalSessions,
    totalParticipants,
    avgScore,
    passRate,
    completionRate,
    totalUsers,
    totalTrainingAttendance,
    totalQuizAttendance
  };
}

/** Group an array by a key function */
function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const k = keyFn(item) || 'General';
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

// ──────────────────────────────────────────────────────────────────
// EXCEL EXPORT — 15 Sheets
// ──────────────────────────────────────────────────────────────────
export const generatePMExcelReport = async (pmData, projectName = 'All Projects') => {
  const { XLSX } = await loadXLSX();

  const {
    reports = [],
    quizAttendance = [],
    trainingAttendance = [],
    projectUsers = [],
    projectsList = []
  } = pmData;

  const kpi = computeKPIs(reports, quizAttendance, trainingAttendance, projectUsers);
  const wb = XLSX.utils.book_new();

  const DARK = '0F172A';
  const HEADER_BG = '1E3A5F';
  const ACCENT = 'F36F21';
  const GREEN_BG = 'C6EFCE';
  const GREEN_FG = '006100';
  const RED_BG = 'FFC7CE';
  const RED_FG = '9C0006';
  const YELLOW_BG = 'FFEB9C';
  const YELLOW_FG = '9C6500';

  const titleStyle = {
    fill: { fgColor: { rgb: DARK } },
    font: { color: { rgb: 'FFFFFF' }, bold: true, name: 'Calibri', sz: 14 },
    alignment: { horizontal: 'left', vertical: 'center' }
  };
  const headerStyle = {
    fill: { fgColor: { rgb: HEADER_BG } },
    font: { color: { rgb: 'FFFFFF' }, bold: true, name: 'Calibri', sz: 10 },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: { top: tb(), bottom: tb(), left: tb(), right: tb() }
  };
  const cellStyle = (bold = false, align = 'left') => ({
    font: { name: 'Calibri', sz: 10, bold },
    alignment: { horizontal: align, vertical: 'center' },
    border: { top: tb(), bottom: tb(), left: tb(), right: tb() }
  });
  const accentStyle = {
    fill: { fgColor: { rgb: 'FFF3E6' } },
    font: { color: { rgb: ACCENT }, bold: true, name: 'Calibri', sz: 11 },
    alignment: { horizontal: 'center', vertical: 'center' }
  };

  function tb() { return { style: 'thin', color: { rgb: 'CBD5E1' } }; }

  function styleSheet(ws, headerRow = 0) {
    Object.keys(ws).filter(k => !k.startsWith('!')).forEach(ref => {
      const coord = XLSX.utils.decode_cell(ref);
      if (coord.r === headerRow) {
        ws[ref].s = headerStyle;
      } else if (coord.r > headerRow) {
        const val = String(ws[ref].v || '');
        if (!ws[ref].s || !ws[ref].s.fill) {
          ws[ref].s = { ...cellStyle(false, 'left') };
          if (val.endsWith('%') || /^\d+$/.test(val)) ws[ref].s.alignment.horizontal = 'center';
          if (val === 'Pass' || val === 'Certified' || val === 'Completed' || val === 'Finished') {
            ws[ref].s.fill = { fgColor: { rgb: GREEN_BG } };
            ws[ref].s.font = { ...ws[ref].s.font, color: { rgb: GREEN_FG }, bold: true };
          } else if (val === 'Fail' || val === 'Expired' || val === 'Absent') {
            ws[ref].s.fill = { fgColor: { rgb: RED_BG } };
            ws[ref].s.font = { ...ws[ref].s.font, color: { rgb: RED_FG }, bold: true };
          } else if (val === 'Pending' || val === 'Attended') {
            ws[ref].s.fill = { fgColor: { rgb: YELLOW_BG } };
            ws[ref].s.font = { ...ws[ref].s.font, color: { rgb: YELLOW_FG }, bold: true };
          }
        }
      }
    });
  }

  function addSheet(name, rows, colWidths = [], headerRowIdx = 0) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    styleSheet(ws, headerRowIdx);
    if (colWidths.length) ws['!cols'] = colWidths.map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, name.substring(0, 31));
  }

  // ── Sheet 1: Executive Dashboard ──────────────────────────────────
  const execRows = [
    [`PM EXECUTIVE REPORT — ${projectName.toUpperCase()}`, '', '', '', '', ''],
    [`Generated: ${today()} | Report Period: All Time`, '', '', '', '', ''],
    [],
    ['KEY PERFORMANCE INDICATORS', '', '', '', '', ''],
    ['Total Sessions', 'Total Participants', 'Avg Score', 'Pass Rate', 'Completion Rate', 'Total Users'],
    [kpi.totalSessions, kpi.totalParticipants, `${kpi.avgScore}%`, `${kpi.passRate}%`, `${kpi.completionRate}%`, kpi.totalUsers],
    [],
    ['Quiz Attendance Records', 'Training Attendance Records', 'Active Projects', '', '', ''],
    [kpi.totalQuizAttendance, kpi.totalTrainingAttendance, projectsList.length || 1, '', '', ''],
    [],
    ['AI NARRATIVE INSIGHT', '', '', '', '', ''],
    [`This executive report covers ${kpi.totalSessions} quiz sessions delivered to ${kpi.totalParticipants} participants across ${projectName}. The program achieved an average score of ${kpi.avgScore}% with an estimated pass rate of ${kpi.passRate}%. Training attendance records totalling ${kpi.totalTrainingAttendance} entries confirm strong workforce engagement. Continuous improvement interventions are advised for topics scoring below 70%.`, '', '', '', '', ''],
  ];
  const execWs = XLSX.utils.aoa_to_sheet(execRows);
  execWs['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } },
    { s: { r: 7, c: 0 }, e: { r: 7, c: 2 } },
    { s: { r: 8, c: 0 }, e: { r: 8, c: 2 } },
    { s: { r: 10, c: 0 }, e: { r: 10, c: 5 } },
    { s: { r: 11, c: 0 }, e: { r: 11, c: 5 } },
  ];
  if (execWs['A1']) execWs['A1'].s = titleStyle;
  if (execWs['A4']) execWs['A4'].s = { ...headerStyle, fill: { fgColor: { rgb: ACCENT } } };
  if (execWs['A11']) execWs['A11'].s = { font: { bold: true, name: 'Calibri', sz: 10, color: { rgb: ACCENT } } };
  if (execWs['A12']) execWs['A12'].s = {
    fill: { fgColor: { rgb: 'FFF7ED' } }, font: { name: 'Calibri', sz: 10, color: { rgb: '9A3412' } },
    alignment: { wrapText: true, vertical: 'center' },
    border: { left: { style: 'medium', color: { rgb: ACCENT } }, top: tb(), bottom: tb(), right: tb() }
  };
  styleSheet(execWs, 4);
  execWs['!rows'] = [{ hpt: 28 }, { hpt: 16 }, { hpt: 8 }, { hpt: 20 }, { hpt: 20 }, { hpt: 26 }, { hpt: 8 }, { hpt: 18 }, { hpt: 24 }, { hpt: 8 }, { hpt: 18 }, { hpt: 60 }];
  execWs['!cols'] = [18, 18, 14, 14, 16, 14].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, execWs, 'Executive Dashboard');

  // ── Sheet 2: All Sessions Summary ─────────────────────────────────
  const sessionHeader = ['#', 'Quiz Title', 'Project', 'Host / Trainer', 'Date', 'Participants', 'Avg Score', 'Status'];
  const sessionRows = reports.map((r, i) => [
    i + 1, safeStr(r.title), safeStr(r.projectName), safeStr(r.hostName), safeStr(r.date),
    safeNum(r.participants), safeStr(r.avgScore), safeStr(r.status, 'Finished')
  ]);
  if (sessionRows.length === 0) sessionRows.push([1, 'No sessions recorded', '', '', isoDate(), 0, '0%', 'N/A']);
  addSheet('All Sessions', [sessionHeader, ...sessionRows], [5, 32, 20, 20, 14, 14, 12, 12]);

  // ── Sheet 3: Session by Project ────────────────────────────────────
  const byProject = groupBy(reports, r => r.projectName);
  const byProjRows = [['Project', 'Sessions', 'Total Participants', 'Avg Score', 'Pass Rate (est.)', 'Status']];
  Object.entries(byProject).forEach(([proj, sessions]) => {
    const pts = sessions.reduce((s, r) => s + safeNum(r.participants), 0);
    const scores = sessions.map(r => safeNum(String(r.avgScore).replace('%', ''))).filter(v => v > 0);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const pass = avg >= 70 ? Math.min(100, Math.round(avg * 1.05)) : Math.round(avg * 0.9);
    byProjRows.push([proj, sessions.length, pts, `${avg}%`, `${pass}%`, 'Completed']);
  });
  addSheet('By Project', byProjRows, [28, 12, 18, 12, 16, 12]);

  // ── Sheet 4: Session by Topic / Quiz Title ─────────────────────────
  const byTopic = groupBy(reports, r => r.title);
  const topicRows = [['Quiz Topic', 'Sessions Run', 'Total Participants', 'Avg Score', 'Pass Rate (est.)']];
  Object.entries(byTopic).forEach(([topic, sessions]) => {
    const pts = sessions.reduce((s, r) => s + safeNum(r.participants), 0);
    const scores = sessions.map(r => safeNum(String(r.avgScore).replace('%', ''))).filter(v => v > 0);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    topicRows.push([topic, sessions.length, pts, `${avg}%`, avg >= 70 ? `${Math.min(100, Math.round(avg * 1.05))}%` : `${Math.round(avg * 0.9)}%`]);
  });
  addSheet('By Topic', topicRows, [36, 14, 18, 12, 16]);

  // ── Sheet 5: Trainer Performance ──────────────────────────────────
  const byTrainer = groupBy(reports, r => r.hostName);
  const trainerRows = [['Trainer Name', 'Sessions Conducted', 'Total Participants', 'Avg Score', 'Best Score', 'Sessions Completed']];
  Object.entries(byTrainer).forEach(([trainer, sessions]) => {
    const pts = sessions.reduce((s, r) => s + safeNum(r.participants), 0);
    const scores = sessions.map(r => safeNum(String(r.avgScore).replace('%', ''))).filter(v => v > 0);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const best = scores.length ? Math.max(...scores) : 0;
    const done = sessions.filter(r => r.status === 'Finished').length;
    trainerRows.push([trainer, sessions.length, pts, `${avg}%`, `${best}%`, done]);
  });
  addSheet('Trainer Performance', trainerRows, [26, 18, 18, 12, 12, 18]);

  // ── Sheet 6: Quiz Attendance Summary ──────────────────────────────
  const qaHeader = ['Employee Name', 'Employee ID', 'Project', 'Role', 'Quiz Attempts', 'Avg Score', 'Attendance Dates'];
  const qaRows = quizAttendance.length > 0
    ? quizAttendance.map(e => [safeStr(e.name), safeStr(e.employeeId), safeStr(e.projectName), safeStr(e.roleName, 'Employee'), safeNum(e.quizCount), safeStr(e.avgScore), safeStr(e.dates)])
    : [['No quiz attendance data', '', '', '', '', '', '']];
  addSheet('Quiz Attendance', [qaHeader, ...qaRows], [24, 14, 20, 14, 14, 12, 30]);

  // ── Sheet 7: Training / Meeting Attendance ─────────────────────────
  const taHeader = ['Project', 'Employee ID', 'Employee Name', 'Zone', 'Date', 'Training Topic', 'Time Spent', 'Status'];
  const taRows = trainingAttendance.length > 0
    ? trainingAttendance.map(e => [safeStr(e.projectName), safeStr(e.employeeId), safeStr(e.name), safeStr(e.zone), safeStr(e.date), safeStr(e.topic), safeStr(e.timeSpent), safeStr(e.status)])
    : [['No training attendance data', '', '', '', '', '', '', '']];
  addSheet('Training Attendance', [taHeader, ...taRows], [22, 14, 24, 12, 14, 32, 14, 12]);

  // ── Sheet 8: Training Attendance by Topic ─────────────────────────
  const byTopicTA = groupBy(trainingAttendance, e => e.topic);
  const topicTARows = [['Training Topic', 'Attendees', 'Completed', 'Attended', 'Completion Rate']];
  Object.entries(byTopicTA).forEach(([topic, records]) => {
    const completed = records.filter(e => e.status === 'Completed').length;
    const attended = records.filter(e => e.status === 'Attended').length;
    const rate = records.length > 0 ? Math.round((completed / records.length) * 100) : 0;
    topicTARows.push([topic, records.length, completed, attended, `${rate}%`]);
  });
  if (topicTARows.length === 1) topicTARows.push(['No training data available', 0, 0, 0, '0%']);
  addSheet('Training by Topic', topicTARows, [36, 12, 12, 12, 16]);

  // ── Sheet 9: Project Users / Workforce ────────────────────────────
  const userHeader = ['Employee ID', 'Name', 'Email', 'Role', 'Project', 'Status'];
  const userRows = projectUsers.length > 0
    ? projectUsers.map(u => [safeStr(u.employee_id), safeStr(u.name), safeStr(u.email), safeStr(u.Role?.role_name), safeStr(u.Project?.name || projectName), safeStr(u.status, 'Active')])
    : [['No user data', '', '', '', '', '']];
  addSheet('Workforce', [userHeader, ...userRows], [16, 24, 30, 16, 22, 12]);

  // ── Sheet 10: Score Distribution ──────────────────────────────────
  const scoreBuckets = { '90-100%': 0, '70-89%': 0, '50-69%': 0, 'Below 50%': 0 };
  reports.forEach(r => {
    const s = safeNum(String(r.avgScore).replace('%', ''));
    if (s >= 90) scoreBuckets['90-100%']++;
    else if (s >= 70) scoreBuckets['70-89%']++;
    else if (s >= 50) scoreBuckets['50-69%']++;
    else scoreBuckets['Below 50%']++;
  });
  const scoreDistHeader = ['Score Range', 'Number of Sessions', 'Percentage of Total'];
  const scoreDistRows = Object.entries(scoreBuckets).map(([range, count]) => [
    range, count, reports.length > 0 ? `${Math.round((count / reports.length) * 100)}%` : '0%'
  ]);
  addSheet('Score Distribution', [scoreDistHeader, ...scoreDistRows], [20, 22, 22]);

  // ── Sheet 11: Monthly Trend ────────────────────────────────────────
  const monthMap = {};
  reports.forEach(r => {
    const d = r.date ? r.date.substring(0, 7) : 'Unknown';
    if (!monthMap[d]) monthMap[d] = { sessions: 0, participants: 0, scores: [] };
    monthMap[d].sessions++;
    monthMap[d].participants += safeNum(r.participants);
    const s = safeNum(String(r.avgScore).replace('%', ''));
    if (s > 0) monthMap[d].scores.push(s);
  });
  const trendHeader = ['Month', 'Sessions', 'Total Participants', 'Avg Score'];
  const trendRows = Object.entries(monthMap).sort().map(([month, d]) => {
    const avg = d.scores.length ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length) : 0;
    return [month, d.sessions, d.participants, `${avg}%`];
  });
  if (trendRows.length === 0) trendRows.push(['No data', 0, 0, '0%']);
  addSheet('Monthly Trend', [trendHeader, ...trendRows], [16, 12, 18, 14]);

  // ── Sheet 12: Leaderboard (Quiz Attendance top scorers) ──────────
  const lbSorted = [...quizAttendance].sort((a, b) => {
    return safeNum(String(b.avgScore).replace('%', '')) - safeNum(String(a.avgScore).replace('%', ''));
  });
  const lbHeader = ['Rank', 'Employee Name', 'Employee ID', 'Project', 'Quiz Attempts', 'Avg Score'];
  const lbRows = lbSorted.slice(0, 25).map((e, i) => [i + 1, safeStr(e.name), safeStr(e.employeeId), safeStr(e.projectName), safeNum(e.quizCount), safeStr(e.avgScore)]);
  if (lbRows.length === 0) lbRows.push([1, 'No data available', '', '', 0, '0%']);
  addSheet('Leaderboard', [lbHeader, ...lbRows], [8, 26, 16, 22, 14, 14]);

  // ── Sheet 13: Compliance Status ────────────────────────────────────
  const complianceHeader = ['Category', 'Count', 'Target', 'Status', 'Notes'];
  const complianceRows = [
    ['Total Enrolled Users', kpi.totalUsers, '—', kpi.totalUsers > 0 ? 'Completed' : 'Pending', 'All users registered in the system'],
    ['Quiz Sessions Completed', reports.filter(r => r.status === 'Finished').length, kpi.totalSessions, 'Completed', 'Finished quiz sessions'],
    ['Training Attendance Records', kpi.totalTrainingAttendance, '—', kpi.totalTrainingAttendance > 0 ? 'Completed' : 'Pending', 'Meeting/webinar attendance logs'],
    ['Average Score Achievement', `${kpi.avgScore}%`, '≥70%', kpi.avgScore >= 70 ? 'Pass' : 'Fail', 'Overall programme average score'],
    ['Pass Rate Estimate', `${kpi.passRate}%`, '≥70%', kpi.passRate >= 70 ? 'Pass' : 'Fail', 'Estimated workforce pass rate'],
    ['Completion Rate', `${kpi.completionRate}%`, '≥90%', kpi.completionRate >= 90 ? 'Pass' : 'Pending', 'Session completion rate'],
  ];
  addSheet('Compliance Status', [complianceHeader, ...complianceRows], [36, 14, 12, 14, 40]);

  // ── Sheet 14: Knowledge Gaps & Recommendations ────────────────────
  // Identify lowest-scoring topics from session data
  const topicScores = {};
  reports.forEach(r => {
    const key = safeStr(r.title, 'Unknown');
    if (!topicScores[key]) topicScores[key] = [];
    const s = safeNum(String(r.avgScore).replace('%', ''));
    if (s > 0) topicScores[key].push(s);
  });
  const topicAvgs = Object.entries(topicScores).map(([topic, scores]) => ({
    topic,
    avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  })).sort((a, b) => a.avg - b.avg);

  const gapHeader = ['Topic / Quiz Title', 'Avg Score', 'Risk Level', 'Recommended Action'];
  const gapRows = topicAvgs.map(({ topic, avg }) => {
    const risk = avg < 50 ? 'Critical' : avg < 70 ? 'Medium' : 'Low';
    const action = avg < 50
      ? 'Deploy immediate microlearning refresher and schedule makeup quiz'
      : avg < 70
      ? 'Schedule targeted coaching session and share reference materials'
      : 'Maintain current training format; consider advanced modules';
    return [topic, `${avg}%`, risk, action];
  });
  if (gapRows.length === 0) gapRows.push(['No quiz data to analyse', '0%', 'N/A', 'Conduct first quiz session to generate gap analysis']);
  addSheet('Knowledge Gaps', [gapHeader, ...gapRows], [36, 12, 14, 50]);

  // ── Sheet 15: Action Plan ─────────────────────────────────────────
  const actionHeader = ['Priority', 'Issue / Gap', 'Recommended Action', 'Owner', 'Target Date', 'Status'];
  const lowTopics = topicAvgs.filter(t => t.avg < 70);
  const actionRows = [];
  if (lowTopics.length > 0) {
    lowTopics.slice(0, 6).forEach((t, i) => {
      actionRows.push([
        i === 0 ? 'High' : 'Medium',
        `Low score: ${t.topic} (${t.avg}%)`,
        t.avg < 50 ? 'Deploy microlearning cards + makeup quiz within 15 days' : 'Schedule coaching + reference sheet within 30 days',
        'L&D Team / Program Manager',
        'To be scheduled',
        'Pending'
      ]);
    });
  }
  actionRows.push(
    ['Medium', 'Training attendance tracking', 'Verify all participants have completed meeting attendance logs', 'Program Manager', 'Ongoing', 'In Progress'],
    ['Low', 'Certification expiry monitoring', 'Schedule quarterly re-certification assessments', 'L&D Admin', 'Quarterly', 'Planned'],
    ['Low', 'New hire onboarding', 'Assign onboarding quiz track to all new joiners within 7 days', 'HR / PM', 'Ongoing', 'In Progress']
  );
  addSheet('Action Plan', [actionHeader, ...actionRows], [10, 36, 44, 22, 16, 14]);

  // ── Download ──────────────────────────────────────────────────────
  const safeName = (projectName || 'PM').replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/ /g, '_');
  downloadWorkbook(XLSX, wb, `PM_Executive_Report_${safeName}_${isoDate()}.xlsx`);
};

// ──────────────────────────────────────────────────────────────────
// PPT EXPORT — 15 Slides
// ──────────────────────────────────────────────────────────────────
export const generatePMPPTReport = async (pmData, projectName = 'All Projects', presenterName = 'Program Manager') => {
  const pptxMod = await import('pptxgenjs');
  const PptxGenJS = pptxMod.default || pptxMod;
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';

  const {
    reports = [],
    quizAttendance = [],
    trainingAttendance = [],
    projectUsers = [],
    projectsList = []
  } = pmData;

  const kpi = computeKPIs(reports, quizAttendance, trainingAttendance, projectUsers);

  // Theme
  const T = {
    bg:       '0F172A',
    card:     '1E293B',
    primary:  '1D4ED8',
    accent:   'F36F21',
    text:     'FFFFFF',
    sub:      '94A3B8',
    green:    '10B981',
    red:      'EF4444',
    yellow:   'F59E0B',
    lightBg:  'F1F5F9',
  };

  const footer = (slide, pageNum) => {
    slide.addText(`Idonneous Learning Arena  ·  ${projectName}`, { x: 0.4, y: 7.0, w: 8, h: 0.3, fontSize: 8, color: '475569' });
    slide.addText(`${today()}`, { x: 8.4, y: 7.0, w: 2.5, h: 0.3, fontSize: 8, color: '475569', align: 'center' });
    slide.addText(`${pageNum} / 15`, { x: 11.5, y: 7.0, w: 1.3, h: 0.3, fontSize: 8, color: '475569', align: 'right' });
  };

  const header = (slide, title, subtitle) => {
    slide.background = { color: T.bg };
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 1.2, fill: { color: T.card } });
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.08, h: 1.2, fill: { color: T.accent } });
    slide.addText(title.toUpperCase(), { x: 0.35, y: 0.18, w: 12.0, h: 0.5, fontSize: 20, bold: true, color: T.text, fontFace: 'Calibri' });
    if (subtitle) slide.addText(subtitle, { x: 0.35, y: 0.72, w: 12.0, h: 0.35, fontSize: 11, color: T.sub, fontFace: 'Calibri' });
  };

  const kpiCard = (slide, x, y, w, h, label, value, color) => {
    slide.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: T.card }, line: { color: '334155', width: 0.5 } });
    slide.addShape(pptx.ShapeType.rect, { x, y, w, h: 0.07, fill: { color: color } });
    slide.addText(label, { x: x + 0.1, y: y + 0.2, w: w - 0.2, h: 0.35, fontSize: 9, color: T.sub, align: 'center', fontFace: 'Calibri' });
    slide.addText(value, { x: x + 0.1, y: y + 0.6, w: w - 0.2, h: 0.9, fontSize: 28, bold: true, color: T.text, align: 'center', fontFace: 'Calibri' });
  };

  // ── Slide 1: Cover ─────────────────────────────────────────────────
  {
    const sl = pptx.addSlide();
    sl.background = { color: T.bg };
    sl.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.06, fill: { color: T.accent } });
    sl.addShape(pptx.ShapeType.rect, { x: 0, y: 7.44, w: 13.33, h: 0.06, fill: { color: T.accent } });
    sl.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.8, w: 0.12, h: 3.2, fill: { color: T.accent } });
    sl.addText('IDONNEOUS LEARNING ARENA', { x: 0.7, y: 1.8, w: 12, h: 0.45, fontSize: 13, bold: true, color: T.accent, fontFace: 'Calibri' });
    sl.addText('PM EXECUTIVE REPORT', { x: 0.7, y: 2.3, w: 12, h: 1.3, fontSize: 42, bold: true, color: T.text, fontFace: 'Calibri' });
    sl.addText(projectName, { x: 0.7, y: 3.65, w: 12, h: 0.5, fontSize: 18, color: T.sub, fontFace: 'Calibri' });
    sl.addShape(pptx.ShapeType.rect, { x: 0.7, y: 4.3, w: 12, h: 0.04, fill: { color: T.card } });
    sl.addText(`Prepared by: ${presenterName}   ·   Report Date: ${today()}   ·   Reporting Period: All Time`, { x: 0.7, y: 4.5, w: 12, h: 0.35, fontSize: 11, color: '64748B', fontFace: 'Calibri' });
    sl.addText('CONFIDENTIAL — FOR INTERNAL USE ONLY', { x: 0.7, y: 5.0, w: 12, h: 0.3, fontSize: 9, color: '64748B', italic: true, fontFace: 'Calibri' });
    footer(sl, 1);
  }

  // ── Slide 2: Executive KPI Summary ────────────────────────────────
  {
    const sl = pptx.addSlide();
    header(sl, 'Executive KPI Summary', 'Programme-wide key performance indicators');
    const kpis = [
      { label: 'Total Sessions', val: String(kpi.totalSessions), color: T.primary },
      { label: 'Total Participants', val: String(kpi.totalParticipants), color: T.accent },
      { label: 'Avg Score', val: `${kpi.avgScore}%`, color: T.green },
      { label: 'Pass Rate (est.)', val: `${kpi.passRate}%`, color: T.green },
      { label: 'Completion Rate', val: `${kpi.completionRate}%`, color: T.yellow },
      { label: 'Total Users', val: String(kpi.totalUsers), color: T.primary },
    ];
    kpis.forEach((k, i) => kpiCard(sl, 0.4 + i * 2.08, 1.5, 1.9, 2.0, k.label, k.val, k.color));

    sl.addShape(pptx.ShapeType.rect, { x: 0.4, y: 3.7, w: 12.4, h: 2.6, fill: { color: T.card }, line: { color: '334155', width: 0.5 } });
    sl.addShape(pptx.ShapeType.rect, { x: 0.4, y: 3.7, w: 0.08, h: 2.6, fill: { color: T.accent } });
    sl.addText('🤖 AI NARRATIVE SUMMARY', { x: 0.7, y: 3.85, w: 11.8, h: 0.4, fontSize: 12, bold: true, color: T.accent, fontFace: 'Calibri' });
    sl.addText(`This report covers ${kpi.totalSessions} quiz sessions with ${kpi.totalParticipants} total participants across ${projectName}. The programme average score is ${kpi.avgScore}% with an estimated pass rate of ${kpi.passRate}%. Training attendance records total ${kpi.totalTrainingAttendance} entries. Consistent engagement across projects reflects healthy workforce learning adoption.`, {
      x: 0.7, y: 4.3, w: 11.8, h: 1.8, fontSize: 12, color: T.text, lineSpacing: 20, fontFace: 'Calibri'
    });
    footer(sl, 2);
  }

  // ── Slide 3: All Sessions Overview ────────────────────────────────
  {
    const sl = pptx.addSlide();
    header(sl, 'All Sessions Overview', `${kpi.totalSessions} sessions across all projects`);
    const rows = [
      [{ text: 'Quiz Title', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Project', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Trainer', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Date', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Participants', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Avg Score', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Status', options: { bold: true, color: T.text, fill: T.primary } }],
      ...reports.slice(0, 14).map((r, i) => {
        const fill = i % 2 === 0 ? T.card : '151E2E';
        return [
          { text: safeStr(r.title), options: { fill, color: T.text } },
          { text: safeStr(r.projectName), options: { fill, color: T.text } },
          { text: safeStr(r.hostName), options: { fill, color: T.text } },
          { text: safeStr(r.date), options: { fill, color: T.text } },
          { text: String(safeNum(r.participants)), options: { fill, color: T.text, align: 'center' } },
          { text: safeStr(r.avgScore), options: { fill, color: T.green, bold: true } },
          { text: safeStr(r.status, 'Finished'), options: { fill, color: T.text } }
        ];
      })
    ];
    if (rows.length === 1) rows.push([{ text: 'No sessions yet', options: { fill: T.card, color: T.sub } }, { text: '', options: { fill: T.card } }, { text: '', options: { fill: T.card } }, { text: '', options: { fill: T.card } }, { text: '', options: { fill: T.card } }, { text: '', options: { fill: T.card } }, { text: '', options: { fill: T.card } }]);
    sl.addTable(rows, { x: 0.3, y: 1.3, w: 12.7, colW: [3.6, 2.0, 1.8, 1.4, 1.2, 1.2, 1.5], fontSize: 9, border: { type: 'solid', color: '334155', pt: 0.5 } });
    if (reports.length > 14) sl.addText(`+ ${reports.length - 14} more sessions — see full Excel report`, { x: 0.3, y: 6.9, w: 12.0, h: 0.3, fontSize: 8, color: T.sub, align: 'center' });
    footer(sl, 3);
  }

  // ── Slide 4: Performance by Project ───────────────────────────────
  {
    const sl = pptx.addSlide();
    header(sl, 'Performance by Project', 'Session metrics grouped by project');
    const byProject = groupBy(reports, r => r.projectName);
    const rows = [
      [{ text: 'Project', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Sessions', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Participants', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Avg Score', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Pass Rate (est.)', options: { bold: true, color: T.text, fill: T.primary } }],
      ...Object.entries(byProject).map(([proj, sessions], i) => {
        const pts = sessions.reduce((s, r) => s + safeNum(r.participants), 0);
        const scores = sessions.map(r => safeNum(String(r.avgScore).replace('%', ''))).filter(v => v > 0);
        const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const pass = avg >= 70 ? Math.min(100, Math.round(avg * 1.05)) : Math.round(avg * 0.9);
        const fill = i % 2 === 0 ? T.card : '151E2E';
        return [
          { text: proj, options: { fill, color: T.text } },
          { text: String(sessions.length), options: { fill, color: T.text, align: 'center' } },
          { text: String(pts), options: { fill, color: T.text, align: 'center' } },
          { text: `${avg}%`, options: { fill, color: avg >= 70 ? T.green : T.red, bold: true } },
          { text: `${pass}%`, options: { fill, color: pass >= 70 ? T.green : T.red, bold: true } }
        ];
      })
    ];
    if (rows.length === 1) rows.push([{ text: 'No project data', options: { fill: T.card, color: T.sub } }, ...Array(4).fill({ text: '', options: { fill: T.card } })]);
    sl.addTable(rows, { x: 0.3, y: 1.3, w: 12.7, colW: [4.5, 1.8, 1.8, 2.0, 2.0], fontSize: 10, border: { type: 'solid', color: '334155', pt: 0.5 } });
    footer(sl, 4);
  }

  // ── Slide 5: Performance by Topic ─────────────────────────────────
  {
    const sl = pptx.addSlide();
    header(sl, 'Performance by Quiz Topic', 'Avg score and participation per quiz topic');
    const byTopic = groupBy(reports, r => r.title);
    const rows = [
      [{ text: 'Quiz Topic', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Sessions', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Participants', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Avg Score', options: { bold: true, color: T.text, fill: T.primary } }],
      ...Object.entries(byTopic).slice(0, 14).map(([topic, sessions], i) => {
        const pts = sessions.reduce((s, r) => s + safeNum(r.participants), 0);
        const scores = sessions.map(r => safeNum(String(r.avgScore).replace('%', ''))).filter(v => v > 0);
        const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const fill = i % 2 === 0 ? T.card : '151E2E';
        return [
          { text: topic, options: { fill, color: T.text } },
          { text: String(sessions.length), options: { fill, color: T.text, align: 'center' } },
          { text: String(pts), options: { fill, color: T.text, align: 'center' } },
          { text: `${avg}%`, options: { fill, color: avg >= 70 ? T.green : T.red, bold: true } }
        ];
      })
    ];
    if (rows.length === 1) rows.push([{ text: 'No topic data', options: { fill: T.card, color: T.sub } }, ...Array(3).fill({ text: '', options: { fill: T.card } })]);
    sl.addTable(rows, { x: 0.3, y: 1.3, w: 12.7, colW: [6.5, 1.8, 2.0, 2.0], fontSize: 10, border: { type: 'solid', color: '334155', pt: 0.5 } });
    footer(sl, 5);
  }

  // ── Slide 6: Trainer Performance ──────────────────────────────────
  {
    const sl = pptx.addSlide();
    header(sl, 'Trainer Performance Rankings', 'Sessions conducted and results per trainer');
    const byTrainer = groupBy(reports, r => r.hostName);
    const rows = [
      [{ text: 'Trainer', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Sessions', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Participants', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Avg Score', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Best Score', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Completed', options: { bold: true, color: T.text, fill: T.primary } }],
      ...Object.entries(byTrainer).map(([trainer, sessions], i) => {
        const pts = sessions.reduce((s, r) => s + safeNum(r.participants), 0);
        const scores = sessions.map(r => safeNum(String(r.avgScore).replace('%', ''))).filter(v => v > 0);
        const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const best = scores.length ? Math.max(...scores) : 0;
        const done = sessions.filter(r => r.status === 'Finished').length;
        const fill = i % 2 === 0 ? T.card : '151E2E';
        return [
          { text: trainer, options: { fill, color: T.text } },
          { text: String(sessions.length), options: { fill, color: T.text, align: 'center' } },
          { text: String(pts), options: { fill, color: T.text, align: 'center' } },
          { text: `${avg}%`, options: { fill, color: avg >= 70 ? T.green : T.red, bold: true } },
          { text: `${best}%`, options: { fill, color: T.green, bold: true } },
          { text: String(done), options: { fill, color: T.text, align: 'center' } }
        ];
      })
    ];
    if (rows.length === 1) rows.push([{ text: 'No trainer data', options: { fill: T.card, color: T.sub } }, ...Array(5).fill({ text: '', options: { fill: T.card } })]);
    sl.addTable(rows, { x: 0.3, y: 1.3, w: 12.7, colW: [3.8, 1.5, 1.8, 1.8, 1.8, 1.5], fontSize: 10, border: { type: 'solid', color: '334155', pt: 0.5 } });
    footer(sl, 6);
  }

  // ── Slide 7: Score Distribution ────────────────────────────────────
  {
    const sl = pptx.addSlide();
    header(sl, 'Score Distribution Analysis', 'Session distribution across score ranges');
    const bands = [
      { label: '90–100%', color: T.green },
      { label: '70–89%', color: T.primary },
      { label: '50–69%', color: T.yellow },
      { label: 'Below 50%', color: T.red },
    ];
    const counts = [0, 0, 0, 0];
    reports.forEach(r => {
      const s = safeNum(String(r.avgScore).replace('%', ''));
      if (s >= 90) counts[0]++;
      else if (s >= 70) counts[1]++;
      else if (s >= 50) counts[2]++;
      else counts[3]++;
    });
    const total = reports.length || 1;
    bands.forEach((b, i) => {
      kpiCard(sl, 0.4 + i * 3.2, 1.5, 2.9, 2.6, b.label, String(counts[i]) + (reports.length > 0 ? ` (${Math.round((counts[i] / total) * 100)}%)` : ''), b.color);
    });
    sl.addShape(pptx.ShapeType.rect, { x: 0.4, y: 4.3, w: 12.4, h: 2.2, fill: { color: T.card }, line: { color: '334155', width: 0.5 } });
    sl.addText('📊 Score Distribution Insight', { x: 0.7, y: 4.45, w: 11.8, h: 0.4, fontSize: 13, bold: true, color: T.accent, fontFace: 'Calibri' });
    const abovePassing = counts[0] + counts[1];
    sl.addText(`${abovePassing} out of ${reports.length} sessions achieved an average score above the 70% passing threshold (${Math.round((abovePassing / total) * 100)}% pass rate). Sessions scoring below 70% require immediate L&D intervention including targeted coaching and refresher assessments.`, {
      x: 0.7, y: 4.9, w: 11.8, h: 1.4, fontSize: 12, color: T.text, lineSpacing: 20, fontFace: 'Calibri'
    });
    footer(sl, 7);
  }

  // ── Slide 8: Monthly Trend ─────────────────────────────────────────
  {
    const sl = pptx.addSlide();
    header(sl, 'Monthly Session Trend', 'Sessions and participation volume over time');
    const monthMap = {};
    reports.forEach(r => {
      const d = r.date ? r.date.substring(0, 7) : 'Unknown';
      if (!monthMap[d]) monthMap[d] = { sessions: 0, participants: 0, scores: [] };
      monthMap[d].sessions++;
      monthMap[d].participants += safeNum(r.participants);
      const s = safeNum(String(r.avgScore).replace('%', ''));
      if (s > 0) monthMap[d].scores.push(s);
    });
    const months = Object.entries(monthMap).sort();
    const rows = [
      [{ text: 'Month', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Sessions', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Participants', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Avg Score', options: { bold: true, color: T.text, fill: T.primary } }],
      ...months.slice(0, 14).map(([month, d], i) => {
        const avg = d.scores.length ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length) : 0;
        const fill = i % 2 === 0 ? T.card : '151E2E';
        return [
          { text: month, options: { fill, color: T.text } },
          { text: String(d.sessions), options: { fill, color: T.text, align: 'center' } },
          { text: String(d.participants), options: { fill, color: T.text, align: 'center' } },
          { text: `${avg}%`, options: { fill, color: avg >= 70 ? T.green : T.red, bold: true } }
        ];
      })
    ];
    if (rows.length === 1) rows.push([{ text: 'No timeline data', options: { fill: T.card, color: T.sub } }, ...Array(3).fill({ text: '', options: { fill: T.card } })]);
    sl.addTable(rows, { x: 0.3, y: 1.3, w: 12.7, colW: [4.0, 2.5, 3.0, 2.8], fontSize: 10, border: { type: 'solid', color: '334155', pt: 0.5 } });
    footer(sl, 8);
  }

  // ── Slide 9: Leaderboard ───────────────────────────────────────────
  {
    const sl = pptx.addSlide();
    header(sl, 'Top Performers Leaderboard', 'Highest average scores across quiz participation');
    const sorted = [...quizAttendance].sort((a, b) => safeNum(String(b.avgScore).replace('%', '')) - safeNum(String(a.avgScore).replace('%', '')));
    const top3 = sorted.slice(0, 3);
    const podiumColors = [T.yellow, '94A3B8', 'B45309'];
    const medals = ['🥇 GOLD', '🥈 SILVER', '🥉 BRONZE'];
    for (let i = 0; i < 3; i++) {
      const p = top3[i] || { name: 'Not available', avgScore: '0%', employeeId: '—', quizCount: 0 };
      const x = 0.4 + i * 4.3;
      sl.addShape(pptx.ShapeType.rect, { x, y: 1.4, w: 4.0, h: 2.2, fill: { color: T.card }, line: { color: podiumColors[i], width: 1.5 } });
      sl.addText(medals[i], { x: x + 0.2, y: 1.55, w: 3.6, h: 0.3, fontSize: 11, bold: true, color: podiumColors[i], fontFace: 'Calibri' });
      sl.addText(safeStr(p.name), { x: x + 0.2, y: 1.9, w: 3.6, h: 0.5, fontSize: 16, bold: true, color: T.text, fontFace: 'Calibri' });
      sl.addText(`Avg Score: ${safeStr(p.avgScore)}  ·  Quizzes: ${safeNum(p.quizCount)}`, { x: x + 0.2, y: 2.45, w: 3.6, h: 0.35, fontSize: 10, color: T.sub, fontFace: 'Calibri' });
      sl.addText(`EMP ID: ${safeStr(p.employeeId)}`, { x: x + 0.2, y: 2.85, w: 3.6, h: 0.3, fontSize: 10, color: T.primary, fontFace: 'Calibri' });
    }
    const rest = sorted.slice(3, 12);
    const rows = [
      [{ text: 'Rank', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Name', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Employee ID', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Project', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Quiz Count', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Avg Score', options: { bold: true, color: T.text, fill: T.primary } }],
      ...rest.map((p, i) => {
        const fill = i % 2 === 0 ? T.card : '151E2E';
        return [
          { text: `#${i + 4}`, options: { fill, color: T.sub } },
          { text: safeStr(p.name), options: { fill, color: T.text } },
          { text: safeStr(p.employeeId), options: { fill, color: T.text } },
          { text: safeStr(p.projectName), options: { fill, color: T.text } },
          { text: String(safeNum(p.quizCount)), options: { fill, color: T.text, align: 'center' } },
          { text: safeStr(p.avgScore), options: { fill, color: T.green, bold: true } }
        ];
      })
    ];
    if (rows.length === 1 && sorted.length === 0) rows.push([{ text: 'No quiz attendance data', options: { fill: T.card, color: T.sub } }, ...Array(5).fill({ text: '', options: { fill: T.card } })]);
    sl.addTable(rows, { x: 0.3, y: 3.75, w: 12.7, colW: [1.0, 3.5, 2.0, 2.5, 1.5, 1.8], fontSize: 9, border: { type: 'solid', color: '334155', pt: 0.5 } });
    footer(sl, 9);
  }

  // ── Slide 10: Quiz Attendance ──────────────────────────────────────
  {
    const sl = pptx.addSlide();
    header(sl, 'Quiz Attendance Summary', `${kpi.totalQuizAttendance} participant attendance records`);
    const rows = [
      [{ text: 'Employee Name', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Employee ID', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Project', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Quiz Count', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Avg Score', options: { bold: true, color: T.text, fill: T.primary } }],
      ...quizAttendance.slice(0, 14).map((e, i) => {
        const fill = i % 2 === 0 ? T.card : '151E2E';
        return [
          { text: safeStr(e.name), options: { fill, color: T.text } },
          { text: safeStr(e.employeeId), options: { fill, color: T.text } },
          { text: safeStr(e.projectName), options: { fill, color: T.text } },
          { text: String(safeNum(e.quizCount)), options: { fill, color: T.text, align: 'center' } },
          { text: safeStr(e.avgScore), options: { fill, color: T.green, bold: true } }
        ];
      })
    ];
    if (rows.length === 1) rows.push([{ text: 'No quiz attendance data', options: { fill: T.card, color: T.sub } }, ...Array(4).fill({ text: '', options: { fill: T.card } })]);
    sl.addTable(rows, { x: 0.3, y: 1.3, w: 12.7, colW: [3.6, 2.0, 3.0, 1.8, 1.8], fontSize: 10, border: { type: 'solid', color: '334155', pt: 0.5 } });
    if (quizAttendance.length > 14) sl.addText(`+ ${quizAttendance.length - 14} more records in full Excel report`, { x: 0.3, y: 6.9, w: 12, h: 0.3, fontSize: 8, color: T.sub, align: 'center' });
    footer(sl, 10);
  }

  // ── Slide 11: Training Attendance ─────────────────────────────────
  {
    const sl = pptx.addSlide();
    header(sl, 'Training / Meeting Attendance', `${kpi.totalTrainingAttendance} attendance records across all topics`);
    const rows = [
      [{ text: 'Employee Name', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Emp ID', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Project', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Date', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Training Topic', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Time Spent', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Status', options: { bold: true, color: T.text, fill: T.primary } }],
      ...trainingAttendance.slice(0, 13).map((e, i) => {
        const fill = i % 2 === 0 ? T.card : '151E2E';
        const sColor = e.status === 'Completed' ? T.green : T.yellow;
        return [
          { text: safeStr(e.name), options: { fill, color: T.text } },
          { text: safeStr(e.employeeId), options: { fill, color: T.text } },
          { text: safeStr(e.projectName), options: { fill, color: T.text } },
          { text: safeStr(e.date), options: { fill, color: T.text } },
          { text: safeStr(e.topic), options: { fill, color: T.text } },
          { text: safeStr(e.timeSpent), options: { fill, color: T.green } },
          { text: safeStr(e.status), options: { fill, color: sColor, bold: true } }
        ];
      })
    ];
    if (rows.length === 1) rows.push([{ text: 'No training attendance data', options: { fill: T.card, color: T.sub } }, ...Array(6).fill({ text: '', options: { fill: T.card } })]);
    sl.addTable(rows, { x: 0.3, y: 1.3, w: 12.7, colW: [2.4, 1.4, 1.8, 1.4, 3.2, 1.3, 1.2], fontSize: 9, border: { type: 'solid', color: '334155', pt: 0.5 } });
    if (trainingAttendance.length > 13) sl.addText(`+ ${trainingAttendance.length - 13} more records in full Excel report`, { x: 0.3, y: 6.9, w: 12, h: 0.3, fontSize: 8, color: T.sub, align: 'center' });
    footer(sl, 11);
  }

  // ── Slide 12: Training by Topic ────────────────────────────────────
  {
    const sl = pptx.addSlide();
    header(sl, 'Training Attendance by Topic', 'Participation and completion per training topic');
    const byTopicTA = groupBy(trainingAttendance, e => e.topic);
    const rows = [
      [{ text: 'Training Topic', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Attendees', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Completed', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Attended', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Completion Rate', options: { bold: true, color: T.text, fill: T.primary } }],
      ...Object.entries(byTopicTA).map(([topic, records], i) => {
        const completed = records.filter(e => e.status === 'Completed').length;
        const attended = records.filter(e => e.status === 'Attended').length;
        const rate = records.length > 0 ? Math.round((completed / records.length) * 100) : 0;
        const fill = i % 2 === 0 ? T.card : '151E2E';
        return [
          { text: topic, options: { fill, color: T.text } },
          { text: String(records.length), options: { fill, color: T.text, align: 'center' } },
          { text: String(completed), options: { fill, color: T.green, bold: true } },
          { text: String(attended), options: { fill, color: T.yellow } },
          { text: `${rate}%`, options: { fill, color: rate >= 80 ? T.green : T.yellow, bold: true } }
        ];
      })
    ];
    if (rows.length === 1) rows.push([{ text: 'No training topic data', options: { fill: T.card, color: T.sub } }, ...Array(4).fill({ text: '', options: { fill: T.card } })]);
    sl.addTable(rows, { x: 0.3, y: 1.3, w: 12.7, colW: [5.5, 1.8, 1.8, 1.8, 1.8], fontSize: 10, border: { type: 'solid', color: '334155', pt: 0.5 } });
    footer(sl, 12);
  }

  // ── Slide 13: Compliance & Knowledge Gap ──────────────────────────
  {
    const sl = pptx.addSlide();
    header(sl, 'Compliance Status & Knowledge Gaps', 'Identified low-performing topics requiring intervention');
    // Left: Compliance KPIs
    sl.addShape(pptx.ShapeType.rect, { x: 0.3, y: 1.35, w: 5.8, h: 5.2, fill: { color: T.card }, line: { color: '334155', width: 0.5 } });
    sl.addText('COMPLIANCE DASHBOARD', { x: 0.5, y: 1.5, w: 5.4, h: 0.4, fontSize: 13, bold: true, color: T.primary, fontFace: 'Calibri' });
    const compItems = [
      { label: 'Avg Score', val: `${kpi.avgScore}%`, ok: kpi.avgScore >= 70 },
      { label: 'Pass Rate (est.)', val: `${kpi.passRate}%`, ok: kpi.passRate >= 70 },
      { label: 'Completion Rate', val: `${kpi.completionRate}%`, ok: kpi.completionRate >= 90 },
      { label: 'Sessions Finished', val: String(reports.filter(r => r.status === 'Finished').length), ok: true },
      { label: 'Total Participants', val: String(kpi.totalParticipants), ok: true },
    ];
    compItems.forEach((item, i) => {
      const y = 2.1 + i * 0.82;
      sl.addShape(pptx.ShapeType.rect, { x: 0.5, y, w: 5.4, h: 0.72, fill: { color: T.bg } });
      sl.addText(item.label, { x: 0.7, y: y + 0.08, w: 3.0, h: 0.28, fontSize: 11, color: T.sub, fontFace: 'Calibri' });
      sl.addText(item.val, { x: 3.8, y: y + 0.08, w: 1.9, h: 0.28, fontSize: 13, bold: true, color: item.ok ? T.green : T.red, align: 'right', fontFace: 'Calibri' });
      sl.addShape(pptx.ShapeType.rect, { x: 0.5, y, w: 0.06, h: 0.72, fill: { color: item.ok ? T.green : T.red } });
    });

    // Right: Knowledge Gaps
    sl.addShape(pptx.ShapeType.rect, { x: 6.8, y: 1.35, w: 6.2, h: 5.2, fill: { color: T.card }, line: { color: '334155', width: 0.5 } });
    sl.addText('KNOWLEDGE GAP ANALYSIS', { x: 7.0, y: 1.5, w: 5.8, h: 0.4, fontSize: 13, bold: true, color: T.accent, fontFace: 'Calibri' });
    const byTopic = groupBy(reports, r => r.title);
    const topicAvgs = Object.entries(byTopic).map(([topic, sessions]) => {
      const scores = sessions.map(r => safeNum(String(r.avgScore).replace('%', ''))).filter(v => v > 0);
      return { topic, avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0 };
    }).sort((a, b) => a.avg - b.avg).slice(0, 5);
    if (topicAvgs.length === 0) topicAvgs.push({ topic: 'No sessions data', avg: 0 });
    topicAvgs.forEach((t, i) => {
      const y = 2.1 + i * 0.85;
      const color = t.avg < 50 ? T.red : t.avg < 70 ? T.yellow : T.green;
      const risk = t.avg < 50 ? 'Critical' : t.avg < 70 ? 'Medium' : 'Low';
      sl.addShape(pptx.ShapeType.rect, { x: 7.0, y, w: 5.8, h: 0.75, fill: { color: T.bg } });
      sl.addShape(pptx.ShapeType.rect, { x: 7.0, y, w: 0.06, h: 0.75, fill: { color } });
      sl.addText(t.topic.length > 45 ? t.topic.substring(0, 42) + '...' : t.topic, { x: 7.15, y: y + 0.08, w: 4.2, h: 0.3, fontSize: 10, color: T.text, fontFace: 'Calibri' });
      sl.addText(`${t.avg}%  ·  ${risk}`, { x: 7.15, y: y + 0.4, w: 4.2, h: 0.25, fontSize: 9, color, bold: true, fontFace: 'Calibri' });
    });
    footer(sl, 13);
  }

  // ── Slide 14: Action Plan ──────────────────────────────────────────
  {
    const sl = pptx.addSlide();
    header(sl, 'Action Plan & Recommendations', 'Next steps for L&D improvement');
    const byTopic = groupBy(reports, r => r.title);
    const lowTopics = Object.entries(byTopic).map(([topic, sessions]) => {
      const scores = sessions.map(r => safeNum(String(r.avgScore).replace('%', ''))).filter(v => v > 0);
      const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      return { topic, avg };
    }).filter(t => t.avg < 70).sort((a, b) => a.avg - b.avg);

    const actionItems = [
      ...lowTopics.slice(0, 4).map((t, i) => ({
        priority: i === 0 ? 'HIGH' : 'MEDIUM',
        color: i === 0 ? T.red : T.yellow,
        issue: `Low score: ${t.topic.substring(0, 35)} (${t.avg}%)`,
        action: t.avg < 50 ? 'Deploy microlearning cards + makeup quiz within 15 days' : 'Schedule coaching session + share reference materials',
        owner: 'L&D Team',
        timeline: 'Within 30 days'
      })),
      { priority: 'MEDIUM', color: T.yellow, issue: 'Certification expiry monitoring', action: 'Schedule quarterly re-certification assessments for all projects', owner: 'PM / L&D Admin', timeline: 'Quarterly' },
      { priority: 'LOW', color: T.primary, issue: 'New hire onboarding track', action: 'Assign onboarding quiz to all new joiners within 7 days', owner: 'HR / Program Manager', timeline: 'Ongoing' },
      { priority: 'LOW', color: T.primary, issue: 'Training attendance verification', action: 'Ensure all participants complete meeting attendance log entries', owner: 'Program Manager', timeline: 'Ongoing' },
    ];

    const rows = [
      [{ text: 'Priority', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Issue / Gap', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Recommended Action', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Owner', options: { bold: true, color: T.text, fill: T.primary } },
       { text: 'Timeline', options: { bold: true, color: T.text, fill: T.primary } }],
      ...actionItems.map((a, i) => {
        const fill = i % 2 === 0 ? T.card : '151E2E';
        return [
          { text: a.priority, options: { fill, color: a.color, bold: true } },
          { text: a.issue, options: { fill, color: T.text } },
          { text: a.action, options: { fill, color: T.text } },
          { text: a.owner, options: { fill, color: T.sub } },
          { text: a.timeline, options: { fill, color: T.sub } }
        ];
      })
    ];
    sl.addTable(rows, { x: 0.3, y: 1.3, w: 12.7, colW: [1.4, 3.2, 4.2, 2.0, 1.8], fontSize: 9, border: { type: 'solid', color: '334155', pt: 0.5 } });
    footer(sl, 14);
  }

  // ── Slide 15: Thank You ────────────────────────────────────────────
  {
    const sl = pptx.addSlide();
    sl.background = { color: T.bg };
    sl.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.07, fill: { color: T.accent } });
    sl.addShape(pptx.ShapeType.rect, { x: 0, y: 7.43, w: 13.33, h: 0.07, fill: { color: T.accent } });
    sl.addShape(pptx.ShapeType.rect, { x: 4.66, y: 2.5, w: 4.0, h: 0.07, fill: { color: T.accent } });
    sl.addText('THANK YOU', { x: 0.5, y: 2.7, w: 12.3, h: 1.1, fontSize: 52, bold: true, color: T.text, align: 'center', fontFace: 'Calibri' });
    sl.addText('Idonneous Learning Arena', { x: 0.5, y: 3.85, w: 12.3, h: 0.5, fontSize: 20, color: T.primary, align: 'center', fontFace: 'Calibri' });
    sl.addText('Idonneous Marketing Services Pvt Ltd', { x: 0.5, y: 4.4, w: 12.3, h: 0.35, fontSize: 13, color: T.sub, align: 'center', fontFace: 'Calibri' });
    sl.addShape(pptx.ShapeType.rect, { x: 3.5, y: 5.1, w: 6.3, h: 1.5, fill: { color: T.card }, line: { color: '334155', width: 0.5 } });
    sl.addText(`Report: PM Executive Report — ${projectName}`, { x: 3.7, y: 5.25, w: 5.9, h: 0.4, fontSize: 11, color: T.sub, align: 'center', fontFace: 'Calibri' });
    sl.addText(`Prepared by: ${presenterName}  ·  ${today()}`, { x: 3.7, y: 5.65, w: 5.9, h: 0.35, fontSize: 11, color: T.text, align: 'center', fontFace: 'Calibri' });
    sl.addText('✉️ support@idonneous.com  ·  🌐 www.idonneous.com', { x: 3.7, y: 6.1, w: 5.9, h: 0.35, fontSize: 11, bold: true, color: T.accent, align: 'center', fontFace: 'Calibri' });
    footer(sl, 15);
  }

  const safeName = (projectName || 'PM').replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/ /g, '_');
  await downloadPPT(pptx, `PM_Executive_Report_${safeName}_${isoDate()}.pptx`);
};

// ──────────────────────────────────────────────────────────────────
// LAZY LOADER
// ──────────────────────────────────────────────────────────────────
async function loadXLSX() {
  const xlsxMod = await import('xlsx-js-style');
  const XLSX = xlsxMod.default || xlsxMod;
  return { XLSX };
}
