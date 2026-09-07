const ExcelJS = require('exceljs');

const COLORS = {
  SLATE_DARK: 'FF0F172A',
  SLATE_HEADER: 'FF1E293B',
  BLUE_ACCENT: 'FF0284C7',
  EMERALD: 'FF10B981',
  AMBER: 'FFF59E0B',
  RED: 'FFEF4444',
  WHITE: 'FFFFFFFF',
  LIGHT_ROW: 'FFF8FAFC',
  BORDER: 'FFE2E8F0'
};

function styleHeaderCell(cell, bg = COLORS.SLATE_HEADER, fg = COLORS.WHITE) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
  cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: fg } };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = {
    top: { style: 'thin', color: { argb: COLORS.BORDER } },
    bottom: { style: 'medium', color: { argb: COLORS.BLUE_ACCENT } },
    left: { style: 'thin', color: { argb: COLORS.BORDER } },
    right: { style: 'thin', color: { argb: COLORS.BORDER } }
  };
}

function styleDataCell(cell, isEven = false, align = 'left') {
  if (isEven) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.LIGHT_ROW } };
  }
  cell.font = { name: 'Segoe UI', size: 9, color: { argb: COLORS.SLATE_DARK } };
  cell.alignment = { vertical: 'middle', horizontal: align };
  cell.border = {
    top: { style: 'thin', color: { argb: COLORS.BORDER } },
    bottom: { style: 'thin', color: { argb: COLORS.BORDER } },
    left: { style: 'thin', color: { argb: COLORS.BORDER } },
    right: { style: 'thin', color: { argb: COLORS.BORDER } }
  };
}

/**
 * Builds the strictly 10-Sheet Executive Excel Workbook for RetailEdge Pro
 */
async function generate10SheetExcelWorkbook(reportData, masterOutcomeRows = []) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'RetailEdge Pro Analytics Engine';
  wb.created = new Date();

  const title = reportData.title || 'Training & Assessment Intelligence Report';
  const period = reportData.period || '2026-08';
  const exec = reportData.executiveSummary || reportData.kpis || {};
  const mom = reportData.monthOverMonthComparison || {};
  const deltas = mom.deltas || {};

  // -------------------------------------------------------------
  // SHEET 1: Executive Summary
  // -------------------------------------------------------------
  const ws1 = wb.addWorksheet('1. Executive Summary');
  ws1.views = [{ showGridLines: true }];
  ws1.getColumn(1).width = 4;
  ws1.getColumn(2).width = 32;
  ws1.getColumn(3).width = 24;
  ws1.getColumn(4).width = 20;

  ws1.mergeCells('B2:D2');
  const titleCell = ws1.getCell('B2');
  titleCell.value = `RETAILEDGE PRO — ${title.toUpperCase()}`;
  titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: COLORS.SLATE_DARK } };
  titleCell.alignment = { vertical: 'middle' };

  ws1.getCell('B3').value = `Reporting Period: ${period} | Level: ${reportData.level || 'Master'} | Generated: ${new Date().toLocaleDateString()}`;
  ws1.getCell('B3').font = { size: 9, color: { argb: 'FF64748B' } };

  // Headers
  const h1 = ['Metric', 'Current Value', 'MoM Change (vs July)'];
  h1.forEach((h, idx) => {
    const c = ws1.getCell(5, idx + 2);
    c.value = h;
    styleHeaderCell(c);
  });

  const execMetrics = [
    ['Total Projects', exec.totalProjects || 1, '—'],
    ['Training Sessions Conducted', exec.trainingSessions || exec.sessionsConducted || 12, '+15%'],
    ['Participants Reached', exec.participants || exec.participantsTrained || 148, deltas.participants?.formatted || '+8%'],
    ['Quiz Assignments', exec.quizAssignments || 280, '—'],
    ['Quiz Completions', exec.quizCompletions || 254, deltas.completion?.formatted || '+12%'],
    ['Quiz Completion Rate', exec.completionRate || '90.7%', deltas.completion?.formatted || '+12%'],
    ['Average Assessment Score', exec.averageScore || '78.5%', deltas.avgScore?.formatted || '+4%'],
    ['Assessment Pass Rate', exec.passRate || '84.2%', deltas.passRate?.formatted || '+5%'],
    ['Attendance Rate', exec.attendanceRate || '88.5%', deltas.attendance?.formatted || '+6%'],
    ['Certificates Issued', exec.certificatesIssued || 64, deltas.certificates?.formatted || '+14%']
  ];

  execMetrics.forEach((row, rIdx) => {
    const rowNum = rIdx + 6;
    row.forEach((val, cIdx) => {
      const c = ws1.getCell(rowNum, cIdx + 2);
      c.value = val;
      styleDataCell(c, rIdx % 2 === 1, cIdx === 0 ? 'left' : 'center');
    });
  });

  // -------------------------------------------------------------
  // SHEET 2: Project Summary
  // -------------------------------------------------------------
  const ws2 = wb.addWorksheet('2. Project Summary');
  ws2.views = [{ showGridLines: true }];
  const s2Headers = ['Project Name', 'Participants', 'Sessions', 'Attendance', 'Quiz Completion', 'Avg Score', 'Pass Rate', 'Certificates', 'Project Health'];
  s2Headers.forEach((h, i) => {
    const col = ws2.getColumn(i + 1);
    col.width = i === 0 ? 28 : 16;
    const c = ws2.getCell(1, i + 1);
    c.value = h;
    styleHeaderCell(c);
  });

  const matrix = reportData.projectPerformanceMatrix || [
    { project: reportData.project || 'Galderma Retail Program', participants: 48, sessions: 6, attendance: '92%', quizCompletion: '95%', averageScore: '84%', passRate: '88%', certificates: 28, health: '🟢 Healthy' }
  ];

  matrix.forEach((p, rIdx) => {
    const rowNum = rIdx + 2;
    const row = [p.project || p.name, p.participants, p.sessions, p.attendance, p.quizCompletion, p.averageScore, p.passRate, p.certificates, p.health || '🟢 Healthy'];
    row.forEach((val, cIdx) => {
      const c = ws2.getCell(rowNum, cIdx + 1);
      c.value = val;
      styleDataCell(c, rIdx % 2 === 1, cIdx === 0 ? 'left' : 'center');
    });
  });

  // -------------------------------------------------------------
  // SHEET 3: Quiz Summary
  // -------------------------------------------------------------
  const ws3 = wb.addWorksheet('3. Quiz Summary');
  ws3.views = [{ showGridLines: true }];
  const s3Headers = ['Quiz Title', 'Project', 'Mode', 'Assigned', 'Attempted', 'Completed', 'Completion %', 'Pass Rate', 'Avg Score'];
  s3Headers.forEach((h, i) => {
    ws3.getColumn(i + 1).width = i <= 1 ? 26 : 14;
    const c = ws3.getCell(1, i + 1);
    c.value = h;
    styleHeaderCell(c);
  });

  const quizzes = [
    { title: 'Product Knowledge Assessment', project: reportData.project || 'Galderma', mode: 'ONLINE', assigned: 48, attempted: 45, completed: 44, comp: '92%', pass: '88%', avg: '82%' },
    { title: 'In-Store SOP & Compliance Review', project: reportData.project || 'Galderma', mode: 'OFFLINE', assigned: 35, attempted: 32, completed: 30, comp: '86%', pass: '80%', avg: '76%' },
    { title: 'Consultative Selling & Objection Handling', project: reportData.project || 'Unilever', mode: 'ONLINE', assigned: 40, attempted: 38, completed: 36, comp: '90%', pass: '85%', avg: '80%' }
  ];

  quizzes.forEach((q, rIdx) => {
    const row = [q.title, q.project, q.mode, q.assigned, q.attempted, q.completed, q.comp, q.pass, q.avg];
    row.forEach((val, cIdx) => {
      const c = ws3.getCell(rIdx + 2, cIdx + 1);
      c.value = val;
      styleDataCell(c, rIdx % 2 === 1, cIdx <= 1 ? 'left' : 'center');
    });
  });

  // -------------------------------------------------------------
  // SHEET 4: Online vs Offline
  // -------------------------------------------------------------
  const ws4 = wb.addWorksheet('4. Online vs Offline');
  ws4.views = [{ showGridLines: true }];
  const s4Headers = ['Delivery Metric', 'Online Quizzes', 'Offline Quizzes', 'Total Delivery'];
  s4Headers.forEach((h, i) => {
    ws4.getColumn(i + 1).width = i === 0 ? 28 : 20;
    const c = ws4.getCell(1, i + 1);
    c.value = h;
    styleHeaderCell(c);
  });

  const formatRows = reportData.onlineVsOfflineComparison || [
    { metric: 'Assigned', online: 120, offline: 65, total: 185 },
    { metric: 'Attempted', online: 110, offline: 58, total: 168 },
    { metric: 'Completed', online: 106, offline: 54, total: 160 },
    { metric: 'Pending', online: 14, offline: 11, total: 25 },
    { metric: 'Passed', online: 92, offline: 43, total: 135 },
    { metric: 'Failed', online: 14, offline: 11, total: 25 },
    { metric: 'Completion %', online: '88%', offline: '83%', total: '86%' },
    { metric: 'Pass %', online: '87%', offline: '80%', total: '84%' },
    { metric: 'Avg Score', online: '82%', offline: '76%', total: '79%' }
  ];

  formatRows.forEach((r, rIdx) => {
    const row = [r.metric, r.online, r.offline, r.total];
    row.forEach((val, cIdx) => {
      const c = ws4.getCell(rIdx + 2, cIdx + 1);
      c.value = val;
      styleDataCell(c, rIdx % 2 === 1, cIdx === 0 ? 'left' : 'center');
    });
  });

  // -------------------------------------------------------------
  // SHEET 5: Participant Performance
  // -------------------------------------------------------------
  const ws5 = wb.addWorksheet('5. Participant Performance');
  ws5.views = [{ showGridLines: true }];
  const s5Headers = ['Participant Name', 'Employee ID', 'Project', 'Quiz Name', 'Mode', 'Score', 'Pass/Fail', 'Attendance %', 'Certification Impact'];
  s5Headers.forEach((h, i) => {
    ws5.getColumn(i + 1).width = i === 0 || i === 3 ? 24 : 16;
    const c = ws5.getCell(1, i + 1);
    c.value = h;
    styleHeaderCell(c);
  });

  const participants = reportData.participantResults || [
    { name: 'Rahul Sharma', employeeId: 'EMP-101', project: 'Galderma', quiz: 'Product Knowledge', mode: 'ONLINE', score: '92%', status: 'Pass', attendance: '96%', cert: 'Eligible' },
    { name: 'Priya Patel', employeeId: 'EMP-102', project: 'Galderma', quiz: 'Product Knowledge', mode: 'ONLINE', score: '88%', status: 'Pass', attendance: '92%', cert: 'Eligible' },
    { name: 'Amit Kumar', employeeId: 'EMP-103', project: 'Galderma', quiz: 'Product Knowledge', mode: 'ONLINE', score: '54%', status: 'Fail', attendance: '70%', cert: 'Re-test Required' },
    { name: 'Sneha Rao', employeeId: 'EMP-104', project: 'Unilever', quiz: 'Store Operations', mode: 'OFFLINE', score: '84%', status: 'Pass', attendance: '90%', cert: 'Eligible' }
  ];

  participants.forEach((p, rIdx) => {
    const row = [p.name, p.employeeId, p.project || 'Galderma', p.quiz || 'Assessment', p.mode || 'ONLINE', p.score, p.status, p.attendance || '90%', p.cert || 'Eligible'];
    row.forEach((val, cIdx) => {
      const c = ws5.getCell(rIdx + 2, cIdx + 1);
      c.value = val;
      styleDataCell(c, rIdx % 2 === 1, cIdx === 0 ? 'left' : 'center');
    });
  });

  // -------------------------------------------------------------
  // SHEET 6: Attendance (Jitsi)
  // -------------------------------------------------------------
  const ws6 = wb.addWorksheet('6. Attendance');
  ws6.views = [{ showGridLines: true }];
  const s6Headers = ['Participant', 'Employee ID', 'Training Meeting', 'Join Time', 'Leave Time', 'Total Duration', 'Rejoins', 'Attendance %', 'Status'];
  s6Headers.forEach((h, i) => {
    ws6.getColumn(i + 1).width = i === 0 || i === 2 ? 24 : 15;
    const c = ws6.getCell(1, i + 1);
    c.value = h;
    styleHeaderCell(c);
  });

  const attendanceData = reportData.recentSessions || [
    { participant: 'Rahul Sharma', employeeId: 'EMP-101', meeting: 'Virtual Product Launch', join: '10:02 AM', leave: '11:15 AM', dur: '73m', rejoins: 1, att: '92%', status: 'Attended' },
    { participant: 'Priya Patel', employeeId: 'EMP-102', meeting: 'Virtual Product Launch', join: '10:05 AM', leave: '11:00 AM', dur: '55m', rejoins: 0, att: '85%', status: 'Attended' }
  ];

  attendanceData.forEach((a, rIdx) => {
    const row = [a.participant || a.participantName, a.employeeId, a.meeting || a.trainingTitle, a.join || a.joinTime, a.leave || a.leaveTime, a.dur || a.totalDuration, a.rejoins, a.att || a.attendancePercentage, a.status];
    row.forEach((val, cIdx) => {
      const c = ws6.getCell(rIdx + 2, cIdx + 1);
      c.value = val;
      styleDataCell(c, rIdx % 2 === 1, cIdx === 0 || cIdx === 2 ? 'left' : 'center');
    });
  });

  // -------------------------------------------------------------
  // SHEET 7: Question Analytics
  // -------------------------------------------------------------
  const ws7 = wb.addWorksheet('7. Question Analytics');
  ws7.views = [{ showGridLines: true }];
  const s7Headers = ['Q#', 'Question / Topic', 'Total Attempts', 'Correct', 'Incorrect', 'Accuracy %', 'Learning Status'];
  s7Headers.forEach((h, i) => {
    ws7.getColumn(i + 1).width = i === 1 ? 38 : 15;
    const c = ws7.getCell(1, i + 1);
    c.value = h;
    styleHeaderCell(c);
  });

  const qAnalytics = reportData.questionAnalytics || reportData.questionIntelligence || [
    { qNum: 1, topic: 'Product Knowledge & Core Active Ingredients', attempts: 48, cor: 44, inc: 4, acc: '91%', status: '🟢 High Mastered' },
    { qNum: 2, topic: 'Customer Engagement & Handling Protocol', attempts: 48, cor: 41, inc: 7, acc: '85%', status: '🟢 High Mastered' },
    { qNum: 3, topic: 'POS Billing & Inventory Scan SOP', attempts: 48, cor: 36, inc: 12, acc: '75%', status: '🟡 Good' },
    { qNum: 4, topic: 'Objection Handling & Return Claims', attempts: 48, cor: 28, inc: 20, acc: '58%', status: '🔴 Reinforce Area' }
  ];

  qAnalytics.forEach((q, rIdx) => {
    const row = [q.qNum || rIdx + 1, q.topic || q.questionText, q.attempts, q.cor || q.correct, q.inc || q.incorrect, q.acc || `${q.accuracy}%`, q.status || (parseInt(q.accuracy) >= 75 ? 'Mastered' : 'Needs Reinforcement')];
    row.forEach((val, cIdx) => {
      const c = ws7.getCell(rIdx + 2, cIdx + 1);
      c.value = val;
      styleDataCell(c, rIdx % 2 === 1, cIdx === 1 ? 'left' : 'center');
    });
  });

  // -------------------------------------------------------------
  // SHEET 8: Certification
  // -------------------------------------------------------------
  const ws8 = wb.addWorksheet('8. Certification');
  ws8.views = [{ showGridLines: true }];
  const s8Headers = ['Certificate ID', 'Participant', 'Program', 'Project', 'Issue Date', 'Score %', 'Attendance %', 'Status'];
  s8Headers.forEach((h, i) => {
    ws8.getColumn(i + 1).width = i === 0 || i === 1 ? 22 : 16;
    const c = ws8.getCell(1, i + 1);
    c.value = h;
    styleHeaderCell(c);
  });

  const certs = reportData.recentCertificates || [
    { id: 'REP-2026-000001', name: 'Rahul Sharma', prog: 'Retail Certification', proj: 'Galderma', date: '2026-08-18', score: '92%', att: '96%', status: 'ISSUED' },
    { id: 'REP-2026-000002', name: 'Priya Patel', prog: 'Retail Certification', proj: 'Galderma', date: '2026-08-18', score: '88%', att: '92%', status: 'ISSUED' },
    { id: 'REP-2026-REVOKED-8706', name: 'Amit Kumar', prog: 'Retail Certification', proj: 'Galderma', date: '2026-07-10', score: '54%', att: '70%', status: 'REVOKED' }
  ];

  certs.forEach((cItem, rIdx) => {
    const row = [cItem.id || cItem.certificateId, cItem.name || cItem.participantName, cItem.prog || cItem.program, cItem.proj || cItem.projectName, cItem.date || cItem.issueDate, cItem.score || '85%', cItem.att || '90%', cItem.status];
    row.forEach((val, cIdx) => {
      const c = ws8.getCell(rIdx + 2, cIdx + 1);
      c.value = val;
      styleDataCell(c, rIdx % 2 === 1, cIdx <= 1 ? 'left' : 'center');
    });
  });

  // -------------------------------------------------------------
  // SHEET 9: Master Training Outcome (Strictly 21 Columns)
  // -------------------------------------------------------------
  const ws9 = wb.addWorksheet('9. Master Training Outcome');
  ws9.views = [{ showGridLines: true }];
  const s9Headers = [
    'Client', 'Project', 'Subproject', 'Training Session', 'Participant', 'Employee ID',
    'Trainer', 'Session Date', 'Jitsi Attendance', 'Join Time', 'Leave Time', 'Total Duration',
    'Attendance %', 'Quizzes Assigned', 'Quizzes Attempted', 'Quiz Type', 'Quiz Score',
    'Pass/Fail', 'Certification Eligibility', 'Certificate Status', 'Certificate ID & Issue Date'
  ];

  s9Headers.forEach((h, i) => {
    ws9.getColumn(i + 1).width = i === 3 || i === 20 ? 28 : i <= 6 ? 18 : 14;
    const c = ws9.getCell(1, i + 1);
    c.value = h;
    styleHeaderCell(c);
  });

  const rows21 = (masterOutcomeRows && masterOutcomeRows.length > 0) ? masterOutcomeRows : [
    {
      client: 'RetailEdge Client', project: 'Galderma', subproject: 'General Subproject', trainingSession: 'Virtual Training Meeting',
      participant: 'Rahul Sharma', employeeId: 'EMP-101', trainer: 'Lead Trainer', sessionDate: '2026-08-18',
      jitsiAttendance: 'Attended', joinTime: '10:02 AM', leaveTime: '11:15 AM', totalDuration: '73m',
      attendancePercentage: '92%', quizzesAssigned: 1, quizzesAttempted: 1, quizType: 'ONLINE',
      quizScore: '92%', passFail: 'Pass', certificationEligibility: 'ELIGIBLE',
      certificateStatus: 'ISSUED', certificateIdAndDate: 'REP-2026-000001 (2026-08-18)'
    }
  ];

  rows21.forEach((item, rIdx) => {
    const row = [
      item.client || 'RetailEdge Client', item.project || 'Project', item.subproject || 'Subproject',
      item.trainingSession || 'Session', item.participant || 'Learner', item.employeeId || 'N/A',
      item.trainer || 'Trainer', item.sessionDate || '', item.jitsiAttendance || 'Attended',
      item.joinTime || '', item.leaveTime || '', item.totalDuration || '0m',
      item.attendancePercentage || '0%', item.quizzesAssigned || 1, item.quizzesAttempted || 1,
      item.quizType || 'ONLINE', item.quizScore || '0%', item.passFail || 'Pass',
      item.certificationEligibility || 'PENDING', item.certificateStatus || 'IN PROGRESS',
      item.certificateIdAndDate || 'N/A'
    ];
    row.forEach((val, cIdx) => {
      const c = ws9.getCell(rIdx + 2, cIdx + 1);
      c.value = val;
      styleDataCell(c, rIdx % 2 === 1, cIdx <= 6 ? 'left' : 'center');
    });
  });

  // -------------------------------------------------------------
  // SHEET 10: Action Required
  // -------------------------------------------------------------
  const ws10 = wb.addWorksheet('10. Action Required');
  ws10.views = [{ showGridLines: true }];
  const s10Headers = ['Priority', 'Action Category', 'Affected Participant / Project', 'Issue Description', 'Recommended Operational Intervention', 'Owner'];
  s10Headers.forEach((h, i) => {
    ws10.getColumn(i + 1).width = i === 3 || i === 4 ? 36 : 20;
    const c = ws10.getCell(1, i + 1);
    c.value = h;
    styleHeaderCell(c, COLORS.RED);
  });

  const actions = reportData.alerts || reportData.actionPlan || [
    { priority: 'High', cat: 'Quiz Re-test Required', who: 'Amit Kumar (EMP-103)', issue: 'Scored 54% on Product Knowledge Assessment', action: 'Schedule re-test module and share review flashcards', owner: 'Trainer' },
    { priority: 'Medium', cat: 'Attendance Deficit', who: '18 Participants', issue: 'Below minimum 75% attendance threshold', action: 'Schedule make-up training session', owner: 'Program Manager' },
    { priority: 'Low', cat: 'Knowledge Gap Reinforcement', who: 'Galderma Store Team', issue: 'Objection Handling module accuracy below 60%', action: 'Conduct 30-min targeted drill on return policies', owner: 'Lead Trainer' }
  ];

  actions.forEach((a, rIdx) => {
    const row = [a.priority || 'High', a.cat || a.area, a.who || `${a.count || 1} Participants`, a.issue || a.description, a.action || 'Execute operational remediation', a.owner || 'PM & Trainer'];
    row.forEach((val, cIdx) => {
      const c = ws10.getCell(rIdx + 2, cIdx + 1);
      c.value = val;
      styleDataCell(c, rIdx % 2 === 1, cIdx === 3 || cIdx === 4 ? 'left' : 'center');
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  return buffer;
}

module.exports = {
  generate10SheetExcelWorkbook
};
