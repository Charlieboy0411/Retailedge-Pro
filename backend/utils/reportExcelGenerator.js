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
 * Robust sanitizer for percentage values to eliminate double '%', 'null%%', 'NaN%', etc.
 */
function cleanPctString(val) {
  if (val === null || val === undefined || val === '' || val === 'N/A' || val === 'null' || val === 'undefined') {
    return 'N/A';
  }
  const str = String(val).replace(/%/g, '').trim();
  if (str === 'N/A' || str === 'null' || str === 'undefined' || str === 'NaN' || str === '—') {
    return 'N/A';
  }
  const num = parseFloat(str);
  if (isNaN(num)) return 'N/A';
  return `${num}%`;
}

function cleanNum(val, fallback = 0) {
  if (val === null || val === undefined || val === '') return fallback;
  const num = Number(val);
  return isNaN(num) ? fallback : num;
}

/**
 * Builds the strictly 10-Sheet Executive Excel Workbook for RetailEdge Pro
 */
async function generate10SheetExcelWorkbook(reportData, masterOutcomeRows = []) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'RetailEdge Pro Analytics Engine';
  wb.created = new Date();

  const title = reportData.title || 'Training & Assessment Intelligence Report';
  const period = reportData.period || reportData.date || '2026-08';
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

  const priorPeriodLabel = mom.priorPeriod || reportData.comparisonPeriod;
  const comparisonHeader = (priorPeriodLabel && !priorPeriodLabel.includes('N/A'))
    ? `MoM Change (vs ${priorPeriodLabel})`
    : 'Baseline Comparison (N/A)';
  const h1 = ['Metric', 'Current Value', comparisonHeader];
  h1.forEach((h, idx) => {
    const c = ws1.getCell(5, idx + 2);
    c.value = h;
    styleHeaderCell(c);
  });

  const execMetrics = [
    ['Total Projects', cleanNum(exec.totalProjects, 1), '—'],
    ['Training Sessions Conducted', cleanNum(exec.trainingSessions !== undefined ? exec.trainingSessions : exec.sessionsConducted, 0), deltas.sessions?.formatted || '—'],
    ['Participants Reached', cleanNum(exec.participants !== undefined ? exec.participants : exec.participantsTrained, 0), deltas.participants?.formatted || '—'],
    ['Quiz Assignments', cleanNum(exec.quizAssignments !== undefined ? exec.quizAssignments : exec.assigned, 0), '—'],
    ['Quiz Completions', cleanNum(exec.quizCompletions !== undefined ? exec.quizCompletions : exec.completed, 0), deltas.completion?.formatted || '—'],
    ['Quiz Completion Rate', cleanPctString(exec.completionRate !== undefined ? exec.completionRate : exec.quizCompletionRate), deltas.completion?.formatted || '—'],
    ['Average Assessment Score', cleanPctString(exec.averageScore !== undefined ? exec.averageScore : exec.averageQuizScore), deltas.avgScore?.formatted || '—'],
    ['Assessment Pass Rate', cleanPctString(exec.passRate !== undefined ? exec.passRate : exec.quizPassRate), deltas.passRate?.formatted || '—'],
    ['Attendance Rate', cleanPctString(exec.attendanceRate), deltas.attendance?.formatted || '—'],
    ['Certificates Issued', cleanNum(exec.certificatesIssued, 0), deltas.certificates?.formatted || '—']
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

  const matrix = reportData.projectPerformanceMatrix || [];
  if (matrix.length === 0 && reportData.project) {
    matrix.push({
      project: reportData.project,
      participants: cleanNum(exec.participants || exec.participantsTrained, 0),
      sessions: cleanNum(exec.trainingSessions || exec.sessionsConducted, 0),
      attendance: cleanPctString(exec.attendanceRate),
      quizCompletion: cleanPctString(exec.completionRate || exec.quizCompletionRate),
      averageScore: cleanPctString(exec.averageScore || exec.averageQuizScore),
      passRate: cleanPctString(exec.passRate || exec.quizPassRate),
      certificates: cleanNum(exec.certificatesIssued, 0),
      health: reportData.health || '🟢 Healthy'
    });
  }

  matrix.forEach((p, rIdx) => {
    const rowNum = rIdx + 2;
    const row = [
      p.project || p.name || 'Project',
      cleanNum(p.participants, 0),
      cleanNum(p.sessions, 0),
      cleanPctString(p.attendance),
      cleanPctString(p.quizCompletion),
      cleanPctString(p.averageScore),
      cleanPctString(p.passRate),
      cleanNum(p.certificates, 0),
      p.health || '🟢 Healthy'
    ];
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

  const quizzes = reportData.quizSummary || reportData.quizzes || [];
  quizzes.forEach((q, rIdx) => {
    const totalAssignedVal = cleanNum(q.totalAssigned !== undefined ? q.totalAssigned : q.assigned, 0);
    const completedVal = cleanNum(q.completed, 0);
    const attemptedVal = cleanNum(q.attempted !== undefined ? q.attempted : completedVal, completedVal);
    const compRateVal = cleanPctString(q.completionRate !== undefined ? q.completionRate : (q.comp !== undefined ? q.comp : (totalAssignedVal > 0 ? Math.round((completedVal / totalAssignedVal) * 100) : 0)));
    const row = [
      q.quizTitle || q.title || 'Assessment',
      q.project || reportData.project || 'Project',
      q.format || q.mode || reportData.quizMode || 'ONLINE',
      totalAssignedVal,
      attemptedVal,
      completedVal,
      compRateVal,
      cleanPctString(q.passRate !== undefined ? q.passRate : q.pass),
      cleanPctString(q.averageScore !== undefined ? q.averageScore : q.avg)
    ];
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

  let formatRows = reportData.onlineVsOfflineComparison;
  if (!formatRows || formatRows.length === 0) {
    formatRows = [
      { metric: 'Assigned', online: 0, offline: 0, total: 0 },
      { metric: 'Attempted', online: 0, offline: 0, total: 0 },
      { metric: 'Completed', online: 0, offline: 0, total: 0 },
      { metric: 'Pending', online: 0, offline: 0, total: 0 },
      { metric: 'Passed', online: 0, offline: 0, total: 0 },
      { metric: 'Failed', online: 0, offline: 0, total: 0 },
      { metric: 'Completion %', online: '0%', offline: '0%', total: '0%' },
      { metric: 'Pass %', online: '0%', offline: '0%', total: '0%' },
      { metric: 'Avg Score', online: '0%', offline: '0%', total: '0%' }
    ];
  }

  formatRows.forEach((r, rIdx) => {
    const isPct = r.metric.includes('%') || r.metric.includes('Score');
    const onlineVal = isPct ? cleanPctString(r.online) : (r.online !== undefined && r.online !== null ? r.online : 0);
    const offlineVal = isPct ? cleanPctString(r.offline) : (r.offline !== undefined && r.offline !== null ? r.offline : 0);
    const totalVal = isPct ? cleanPctString(r.total) : (r.total !== undefined && r.total !== null ? r.total : 0);
    const row = [r.metric, onlineVal, offlineVal, totalVal];
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
  const s5Headers = ['Participant Name', 'Employee ID', 'Project', 'Zone', 'Territory', 'Quiz Name', 'Mode', 'Score', 'Pass/Fail', 'Attendance %', 'Certification Impact'];
  s5Headers.forEach((h, i) => {
    ws5.getColumn(i + 1).width = i === 0 || i === 5 ? 24 : (i >= 2 && i <= 4 ? 18 : 15);
    const c = ws5.getCell(1, i + 1);
    c.value = h;
    styleHeaderCell(c);
  });

  const participants = reportData.participantResults || [];

  participants.forEach((p, rIdx) => {
    const scorePct = cleanPctString(p.score);
    const zoneVal = p.zone || reportData.zone || 'Unmapped';
    const territoryVal = p.territory || reportData.territory || 'Unmapped';
    const row = [
      p.name || 'Participant',
      p.employeeId || 'N/A',
      p.project || reportData.project || 'Project',
      zoneVal,
      territoryVal,
      p.quiz || reportData.quizName || 'Assessment',
      p.mode || reportData.quizMode || 'ONLINE',
      scorePct,
      p.status || (p.passed !== undefined ? (p.passed ? 'Pass' : 'Fail') : (parseFloat(String(p.score).replace(/%/g, '')) >= (p.passingThreshold ? parseFloat(String(p.passingThreshold).replace(/%/g, '')) : 70) ? 'Pass' : 'Fail')),
      p.attendance ? cleanPctString(p.attendance) : 'N/A',
      p.cert || p.certificationImpact || '—'
    ];
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

  const attendanceData = reportData.recentSessions || reportData.attendance || [];

  attendanceData.forEach((a, rIdx) => {
    const row = [
      a.participant || a.participantName || 'Learner',
      a.employeeId || 'N/A',
      a.meeting || a.trainingTitle || 'Training Meeting',
      a.join || a.joinTime || '—',
      a.leave || a.leaveTime || '—',
      a.dur || a.totalDuration || '—',
      a.rejoins !== undefined ? a.rejoins : '—',
      cleanPctString(a.att || a.attendancePercentage),
      a.status || 'Attended'
    ];
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
    ws7.getColumn(i + 1).width = i === 1 ? 52 : 16;
    const c = ws7.getCell(1, i + 1);
    c.value = h;
    styleHeaderCell(c);
  });

  const qAnalytics = reportData.questionAnalytics || reportData.questionIntelligence || [];

  qAnalytics.forEach((q, rIdx) => {
    const attempts = cleanNum(q.attempts, 0);
    const correct = cleanNum(q.cor !== undefined ? q.cor : q.correct, 0);
    const incorrect = cleanNum(q.inc !== undefined ? q.inc : q.incorrect, Math.max(0, attempts - correct));
    const accuracy = cleanPctString(q.acc || q.accuracy || q.accuracyPercentage || (attempts > 0 ? Math.round((correct / attempts) * 100) : 0));
    const accNum = parseFloat(accuracy.replace(/%/g, '')) || 0;
    const status = q.status || (accNum >= 80 ? 'Mastered' : accNum >= 60 ? 'Moderate' : 'Review');
    const questionText = q.questionText || q.topic || `Question ${q.qNum || rIdx + 1}`;

    const row = [q.qNum || rIdx + 1, questionText, attempts, correct, incorrect, accuracy, status];
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

  const certs = reportData.recentCertificates || reportData.certificates || [];

  certs.forEach((cItem, rIdx) => {
    const row = [
      cItem.id || cItem.certificateId || cItem.certificate_id || 'CERT',
      cItem.name || cItem.participantName || 'Learner',
      cItem.prog || cItem.program || 'RetailEdge Pro Certified',
      cItem.proj || cItem.projectName || reportData.project || 'Project',
      cItem.date || cItem.issueDate || '—',
      cleanPctString(cItem.score),
      cleanPctString(cItem.att || cItem.attendance),
      cItem.status || 'VALID'
    ];
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

  const rows21 = (masterOutcomeRows && masterOutcomeRows.length > 0) ? masterOutcomeRows : (reportData.masterOutcomeRows || []);

  rows21.forEach((item, rIdx) => {
    const row = [
      item.client || 'RetailEdge Client', item.project || reportData.project || 'Project', item.subproject || item.project || 'Subproject',
      item.trainingSession || reportData.quizName || 'Session', item.participant || 'Learner', item.employeeId || 'N/A',
      item.trainer || reportData.trainer || 'Lead Trainer', item.sessionDate || reportData.date || reportData.period || '',
      item.jitsiAttendance || 'No Meeting Recorded',
      item.joinTime || '—', item.leaveTime || '—', item.totalDuration || '—',
      cleanPctString(item.attendancePercentage), cleanNum(item.quizzesAssigned, 1), cleanNum(item.quizzesAttempted, 1),
      item.quizType || reportData.quizMode || 'ONLINE', cleanPctString(item.quizScore), item.passFail || 'Pass',
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

  const actions = reportData.alerts || reportData.actionPlan || [];
  if (actions.length === 0) {
    const row = ['Low', 'Operational Health', 'All Participants', 'All performance benchmarks met SLA standards', 'Maintain current operating tempo', 'Operations Team'];
    row.forEach((val, cIdx) => {
      const c = ws10.getCell(2, cIdx + 1);
      c.value = val;
      styleDataCell(c, false, cIdx === 3 || cIdx === 4 ? 'left' : 'center');
    });
  } else {
    actions.forEach((a, rIdx) => {
      const row = [
        a.priority || 'Medium',
        a.cat || a.area || 'Operational Intervention',
        a.who || (a.count ? `${a.count} Participants` : (a.description ? 'Affected Cohort' : 'Participants')),
        a.issue || a.description || 'Intervention needed',
        a.action || a.recommendedAction || 'Execute operational remediation',
        a.owner || 'PM & Trainer'
      ];
      row.forEach((val, cIdx) => {
        const c = ws10.getCell(rIdx + 2, cIdx + 1);
        c.value = val;
        styleDataCell(c, rIdx % 2 === 1, cIdx === 3 || cIdx === 4 ? 'left' : 'center');
      });
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return buffer;
}

module.exports = {
  generate10SheetExcelWorkbook,
  cleanPctString
};
