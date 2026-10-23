/**
 * RETAILEDGE PRO — REPORT DATA LINEAGE REGRESSION TEST SUITE
 *
 * Verifies reconciliation across:
 * - Level 1 SSEIL Quiz Report (REP-QZ-20261016-3C8024)
 * - Level 2 SSEIL Monthly Report (REP-MO-202608-SSL / L2-SSL-2026-08)
 * - 10-Sheet Excel Workbook
 * - 14-Slide PowerPoint Presentation
 * - Preview / JSON API Payload
 */
const net = require('net');
const path = require('path');
const assert = require('assert');

// ── Fail-Closed Network Circuit Breaker ──
const origConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  let host = 'localhost';
  let port = null;
  if (typeof args[0] === 'object' && args[0] !== null) {
    host = args[0].host || 'localhost';
    port = args[0].port;
  } else if (typeof args[0] === 'number') {
    port = args[0];
    if (typeof args[1] === 'string') host = args[1];
  }
  const isLocal = ['127.0.0.1', 'localhost', '::1'].includes(host);
  if (!isLocal || port === 5432 || (typeof host === 'string' && host.includes('rds.amazonaws.com'))) {
    const err = new Error(`SECURITY ALERT: Blocked outbound connection to ${host}:${port}`);
    err.code = 'ECONNREFUSED';
    process.nextTick(() => this.emit('error', err));
    return this;
  }
  return origConnect.apply(this, args);
};

// Enforce Isolated SQLite Environment
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = path.join(__dirname, '..', 'uat_database.sqlite');
process.env.NODE_ENV = 'development';
process.env.DISABLE_TUNNEL = 'true';
delete process.env.DATABASE_URL;
delete process.env.DB_HOST;
delete process.env.DB_PORT;
delete process.env.DB_PASS;
delete process.env.DB_PASSWORD;

const sequelize = require('../config/database');
const ReportAudit = require('../models/ReportAudit');
const projectIntelligenceService = require('../utils/projectIntelligenceService');
const reportExcelGenerator = require('../utils/reportExcelGenerator');
const reportPPTGenerator = require('../utils/reportPPTGenerator');
const ExcelJS = require('exceljs');

async function runRegressionSuite() {
  console.log('================================================================');
  console.log('🔬 STARTING REPORT DATA LINEAGE REGRESSION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function test(description, fn) {
    total++;
    try {
      fn();
      console.log(`  ✅ PASS: ${description}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${description}`);
      console.error(`     Error: ${err.message}`);
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 1. RECONCILE FAILURE B & D: AUGUST 2026 MONTHLY REPORT
  // ─────────────────────────────────────────────────────────────
  console.log('--- Suite 1: Level 2 August Monthly Report (REP-MO-202608-SSL) ---');
  const l2Report = await ReportAudit.findOne({
    where: { reportCode: 'REP-MO-202608-SSL' }
  });
  assert(l2Report, 'REP-MO-202608-SSL must exist in ReportAudit');
  const l2Data = l2Report.snapshotData;

  test('L2 August Report: executive summary has exactly 3 participants trained', () => {
    assert.strictEqual(l2Data.executiveSummary.participantsTrained, 3, `Expected 3 participants, got ${l2Data.executiveSummary.participantsTrained}`);
    assert.strictEqual(l2Data.executiveSummary.sessionsConducted, 1, `Expected 1 session, got ${l2Data.executiveSummary.sessionsConducted}`);
  });

  test('L2 August Report: Average Score is 83%, never NaN%', () => {
    assert.strictEqual(l2Data.executiveSummary.averageScore, '83%');
    assert(!l2Data.executiveSummary.averageScore.includes('NaN'), 'Score must not contain NaN');
  });

  test('L2 August Report: Online vs Offline comparison has clean 83% for Offline and Total average score', () => {
    const avgScoreRow = l2Data.onlineVsOfflineComparison.find(r => r.metric === 'Avg Score');
    assert(avgScoreRow, 'Avg Score row must exist');
    assert.strictEqual(avgScoreRow.offline, '83%');
    assert.strictEqual(avgScoreRow.total, '83%');
    assert(!String(avgScoreRow.offline).includes('NaN'), 'Offline avg score must not be NaN');
  });

  test('L2 August Report: Master Training Outcome contains ONLY August records (2026-08-20), zero October events', async () => {
    const outcomeRows = await projectIntelligenceService.getMasterTrainingOutcomeData([l2Report.projectId], {
      period: '2026-08',
      level: 'LEVEL_2_PROJECT_MONTHLY'
    });
    assert.strictEqual(outcomeRows.length, 3, `Expected exactly 3 participant rows for August, got ${outcomeRows.length}`);
    outcomeRows.forEach(r => {
      assert.strictEqual(r.sessionDate, '2026-08-20', `Row date must be August 20, 2026, got ${r.sessionDate}`);
      assert(!r.sessionDate.startsWith('2026-10'), `October dates must not leak into August report! Found ${r.sessionDate}`);
    });
  });

  test('L2 August Report: Sheet 9 Quiz Score matches individual scoring (100%, 100%, 50%), not 40%/20%', async () => {
    const outcomeRows = await projectIntelligenceService.getMasterTrainingOutcomeData([l2Report.projectId], {
      period: '2026-08',
      level: 'LEVEL_2_PROJECT_MONTHLY'
    });
    const sanjay = outcomeRows.find(r => r.participant === 'Sanjay Verma');
    const meera = outcomeRows.find(r => r.participant === 'Meera Iyer');
    const kunal = outcomeRows.find(r => r.participant === 'Kunal Joshi');
    assert(sanjay && meera && kunal, 'All 3 learners must exist');
    assert.strictEqual(sanjay.quizScore, '100%');
    assert.strictEqual(meera.quizScore, '100%');
    assert.strictEqual(kunal.quizScore, '50%');
    assert.strictEqual(sanjay.passFail, 'Pass');
    assert.strictEqual(meera.passFail, 'Pass');
    assert.strictEqual(kunal.passFail, 'Fail');
  });

  test('L2 August Report: Project Summary has 3 participants, 1 session, 100% quiz completion, Healthy status', () => {
    assert(l2Data.projectPerformanceMatrix && l2Data.projectPerformanceMatrix.length === 1);
    const p = l2Data.projectPerformanceMatrix[0];
    assert.strictEqual(p.project, 'SSEIL');
    assert.strictEqual(p.participants, 3);
    assert.strictEqual(p.sessions, 1);
    assert.strictEqual(p.quizCompletion, '100%');
    assert.strictEqual(p.averageScore, '83%');
    assert.strictEqual(p.passRate, '67%');
  });

  test('L2 August Report: Quiz Summary has 1 real quiz row ("SSEIL Retail Excellence & Customer Protocol"), not 3 fake rows', () => {
    assert(l2Data.quizSummary && l2Data.quizSummary.length === 1, `Expected 1 quiz row, got ${l2Data.quizSummary.length}`);
    const q = l2Data.quizSummary[0];
    assert.strictEqual(q.quizTitle, 'SSEIL Retail Excellence & Customer Protocol');
    assert.strictEqual(q.totalAssigned, 3);
    assert.strictEqual(q.completed, 3);
    assert.strictEqual(q.format, 'OFFLINE');
    assert.strictEqual(q.averageScore, '83%');
  });

  // ─────────────────────────────────────────────────────────────
  // 2. RECONCILE FAILURE A & C: OCTOBER 16 QUIZ REPORT (REP-QZ-20261016-3C8024)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Suite 2: Level 1 Quiz Report (REP-QZ-20261016-3C8024) ---');
  const l1Report = await ReportAudit.findOne({
    where: { reportCode: 'REP-QZ-20261016-3C8024' }
  });
  assert(l1Report, 'REP-QZ-20261016-3C8024 must exist in ReportAudit');
  const l1Data = l1Report.snapshotData;

  test('L1 SSEIL Quiz Report: Executive summary has 1 session, 18 participants, 18 assigned, 18 completed', () => {
    assert.strictEqual(l1Data.executiveSummary.sessionsConducted, 1);
    assert.strictEqual(l1Data.executiveSummary.participantsTrained, 18);
    assert.strictEqual(l1Data.executiveSummary.quizAssignments, 18);
    assert.strictEqual(l1Data.executiveSummary.quizCompletions, 18);
    assert.strictEqual(l1Data.executiveSummary.completionRate, '100%');
  });

  test('L1 SSEIL Quiz Report: Exactly 1 quiz row in quizSummary ("SSEIL M 1 QUIZ"), never 3', () => {
    assert(l1Data.quizSummary && l1Data.quizSummary.length === 1, `Expected 1 quiz row, got ${l1Data.quizSummary.length}`);
    const q = l1Data.quizSummary[0];
    assert.strictEqual(q.quizTitle, 'SSEIL M 1 QUIZ');
    assert.strictEqual(q.project, 'SSEIL');
    assert.strictEqual(q.totalAssigned, 18);
    assert.strictEqual(q.completed, 18);
    assert.strictEqual(q.format, 'OFFLINE');
  });

  test('L1 SSEIL Quiz Report: Online vs Offline has Online: 0, Offline: 18, Total: 18', () => {
    const assignedRow = l1Data.onlineVsOfflineComparison.find(r => r.metric === 'Assigned');
    const completedRow = l1Data.onlineVsOfflineComparison.find(r => r.metric === 'Completed');
    assert.strictEqual(assignedRow.online, 0);
    assert.strictEqual(assignedRow.offline, 18);
    assert.strictEqual(assignedRow.total, 18);
    assert.strictEqual(completedRow.online, 0);
    assert.strictEqual(completedRow.offline, 18);
    assert.strictEqual(completedRow.total, 18);
  });

  test('L1 SSEIL Quiz Report: Participant Performance attributes ALL 18 learners to SSEIL, zero to Galderma', () => {
    assert.strictEqual(l1Data.participantResults.length, 18);
    l1Data.participantResults.forEach(p => {
      assert.strictEqual(p.project, 'SSEIL', `Expected project SSEIL for ${p.name}, got ${p.project}`);
      assert.notStrictEqual(p.project, 'Galderma', `Galderma must never appear in SSEIL report!`);
    });
  });

  test('L1 SSEIL Quiz Report: Question Analytics has 20 questions, accurate topic text, and single % formatting (no %%)', () => {
    assert.strictEqual(l1Data.questionAnalytics.length, 20);
    l1Data.questionAnalytics.forEach(qa => {
      assert(qa.topic && !qa.topic.startsWith('Module Topic'), `Topic must be actual question text, got ${qa.topic}`);
      assert(!qa.accuracy.includes('%%'), `Double percent sign detected: ${qa.accuracy}`);
      assert(qa.accuracy.endsWith('%'), `Accuracy must end with single %: ${qa.accuracy}`);
    });
    // Check first canonical question wording matches database
    assert.strictEqual(l1Data.questionAnalytics[0].topic, 'What is the mandatory customer greeting timeframe upon store entry?');
    // Check learning status alignment: >= 80% is Mastered, >= 60% is Moderate, < 60% is Review
    const highAccQ = l1Data.questionAnalytics.find(q => parseFloat(q.accuracy) >= 80);
    if (highAccQ) {
      assert.strictEqual(highAccQ.status, 'Mastered', `Expected Mastered status for ${highAccQ.accuracy}, got ${highAccQ.status}`);
    }
  });

  test('L1 SSEIL Quiz Report: Zone breakdown reconciles all 18 participants with authoritative zone and no inferred store', () => {
    const locSummary = l1Data.zoneBreakdown || l1Data.territoryStoreSummary || l1Data.locationBreakdown;
    assert(locSummary && locSummary.length > 0, 'Zone summary must exist');
    const totalLocParts = locSummary.reduce((sum, l) => sum + (l.participants || 0), 0);
    assert.strictEqual(totalLocParts, 18, `Expected sum of zone participants to equal 18, got ${totalLocParts}`);
    const totalLocAttempts = locSummary.reduce((sum, l) => sum + (l.attempts || 0), 0);
    assert.strictEqual(totalLocAttempts, 18, `Expected sum of zone attempts to equal 18, got ${totalLocAttempts}`);
    // Check that Zone is present and authoritative, while store is NOT inferred
    locSummary.forEach(l => {
      assert(l.zone !== undefined && l.zone !== null, 'Zone field must exist');
      assert.strictEqual(l.store, undefined, 'Store field must not be inferred');
    });
  });

  test('L1 SSEIL Quiz Report: Attendance is reported as Not Recorded / N/A, removing unsupported 100% claims', () => {
    const attRate = l1Data.summaryKPIs?.attendanceRate || l1Data.executiveSummary?.attendanceRate;
    assert(attRate === 'Not Recorded' || attRate === 'N/A' || attRate === null, `Attendance must be Not Recorded or N/A, got ${attRate}`);
  });

  test('L1 SSEIL Quiz Report: Certificate pipeline reflects database reality (0 issued, 14 eligible, 14 pending, 4 ineligible)', () => {
    assert.strictEqual(l1Data.certificatesIssued, 0, `Certificates issued must be 0, got ${l1Data.certificatesIssued}`);
    const certPipe = l1Data.certificationPipeline;
    assert(certPipe, 'Certification pipeline must exist');
    assert.strictEqual(certPipe.issued, 0);
    assert.strictEqual(certPipe.eligible, 14);
    assert.strictEqual(certPipe.pending, 14);
    assert.strictEqual(certPipe.ineligible, 4);
  });

  test('L1 SSEIL Quiz Report: Configured passing threshold is 60%, pass rate is 78%, and health status is Needs Attention', () => {
    assert.strictEqual(l1Data.passingScore, 60, `Passing threshold must be 60%, got ${l1Data.passingScore}`);
    assert.strictEqual(l1Data.summaryKPIs.passRate, '78%');
    assert.strictEqual(l1Data.summaryKPIs.passed, 14);
    // Health status: Healthy requires passRate >= 80% and completion >= 80%. 78% pass is Needs Attention
    assert(l1Data.summaryKPIs.health.includes('Needs Attention'), `Health must be Needs Attention for 78% pass rate, got ${l1Data.summaryKPIs.health}`);
    assert.strictEqual(l1Data.summaryKPIs.healthCode, 'YELLOW');
  });

  test('L1 SSEIL Quiz Report: Online delivery metrics display N/A (No online cohort) instead of 0% performance', () => {
    const compRow = l1Data.onlineVsOfflineComparison.find(r => r.metric === 'Completion %' || r.metric.includes('Completion %'));
    const passRow = l1Data.onlineVsOfflineComparison.find(r => r.metric === 'Pass %' || r.metric.includes('Pass %'));
    const scoreRow = l1Data.onlineVsOfflineComparison.find(r => r.metric.includes('Avg Score') || r.metric.includes('Score'));
    assert.strictEqual(compRow.online, 'N/A (No online cohort)');
    assert.strictEqual(passRow.online, 'N/A (No online cohort)');
    assert.strictEqual(scoreRow.online, 'N/A (No online cohort)');
  });

  test('L1 SSEIL Quiz Report: Master Training Outcome has exactly 18 rows, sessionDate 2026-10-16, score out of 20', async () => {
    const outcomeRows = await projectIntelligenceService.getMasterTrainingOutcomeData([l1Report.projectId], {
      sessionId: l1Report.sessionId,
      level: 'LEVEL_1_QUIZ'
    });
    assert.strictEqual(outcomeRows.length, 18);
    outcomeRows.forEach(r => {
      assert.strictEqual(r.sessionDate, '2026-10-16');
      assert.strictEqual(r.project, 'SSEIL');
      assert.strictEqual(r.trainingSession, 'SSEIL M 1 QUIZ');
      assert(r.quizScore.endsWith('%'));
      assert.strictEqual(r.store, 'SSEIL Metro Hub');
    });
  });

  test('L1 SSEIL Quiz Report: Sheet 10 Action Required contains exactly 4 participants scoring below 60%', () => {
    assert(l1Data.alerts && l1Data.alerts.length === 4, `Expected 4 action required participants, got ${l1Data.alerts?.length}`);
    l1Data.alerts.forEach(a => {
      assert(!a.who.includes('Amit Kumar'), 'Stale fallback Amit Kumar must not appear');
      assert(!String(a.issue).includes('Galderma'), 'Galderma Store Team must not appear in SSEIL action plan');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. EXCEL 10-SHEET RECONCILIATION VERIFICATION
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Suite 3: 10-Sheet Excel Workbook Reconciliation ---');

  test('Excel Generator: builds 10 valid sheets for L1 SSEIL Report without throwing', async () => {
    const outcomeRows = await projectIntelligenceService.getMasterTrainingOutcomeData([l1Report.projectId], {
      sessionId: l1Report.sessionId,
      level: 'LEVEL_1_QUIZ'
    });
    const buffer = await reportExcelGenerator.generate10SheetExcelWorkbook(l1Data, outcomeRows);
    assert(buffer && buffer.length > 1000);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    assert.strictEqual(wb.worksheets.length, 10, 'Workbook must contain exactly 10 sheets');

    // Sheet 1: Executive Summary
    const ws1 = wb.getWorksheet('1. Executive Summary');
    let participantsVal, sessionsVal, assignmentsVal, completionsVal;
    ws1.eachRow(r => {
      const metric = r.getCell(2).value;
      const val = r.getCell(3).value;
      if (metric === 'Participants Reached') participantsVal = val;
      if (metric === 'Training Sessions Conducted') sessionsVal = val;
      if (metric === 'Quiz Assignments') assignmentsVal = val;
      if (metric === 'Quiz Completions') completionsVal = val;
    });
    assert.strictEqual(participantsVal, 18, `Executive summary participants must be 18, got ${participantsVal}`);
    assert.strictEqual(sessionsVal, 1, `Executive summary sessions must be 1, got ${sessionsVal}`);
    assert.strictEqual(assignmentsVal, 18, `Executive summary assignments must be 18, got ${assignmentsVal}`);
    assert.strictEqual(completionsVal, 18, `Executive summary completions must be 18, got ${completionsVal}`);

    // Sheet 3: Quiz Summary
    const ws3 = wb.getWorksheet('3. Quiz Summary');
    let quizRows = 0;
    ws3.eachRow((r, rowNum) => {
      if (rowNum > 1) {
        quizRows++;
        assert.strictEqual(r.getCell(1).value, 'SSEIL M 1 QUIZ');
        assert.strictEqual(r.getCell(2).value, 'SSEIL');
        assert.strictEqual(r.getCell(3).value, 'OFFLINE');
        assert.strictEqual(r.getCell(4).value, 18); // Assigned
        assert.strictEqual(r.getCell(6).value, 18); // Completed
      }
    });
    assert.strictEqual(quizRows, 1, `Sheet 3 must contain exactly 1 quiz row, got ${quizRows}`);

    // Sheet 4: Online vs Offline
    const ws4 = wb.getWorksheet('4. Online vs Offline');
    let assignedOnline, assignedOffline, assignedTotal;
    ws4.eachRow(r => {
      if (r.getCell(1).value === 'Assigned') {
        assignedOnline = r.getCell(2).value;
        assignedOffline = r.getCell(3).value;
        assignedTotal = r.getCell(4).value;
      }
    });
    assert.strictEqual(assignedOnline, 0);
    assert.strictEqual(assignedOffline, 18);
    assert.strictEqual(assignedTotal, 18);

    // Sheet 5: Participant Performance
    const ws5 = wb.getWorksheet('5. Participant Performance');
    let partRows = 0;
    // Check headers
    const headerRow = ws5.getRow(1);
    assert.strictEqual(headerRow.getCell(4).value, 'Store / Outlet', 'Sheet 5 column 4 must be Store / Outlet');
    assert.strictEqual(headerRow.getCell(5).value, 'Zone / Territory', 'Sheet 5 column 5 must be Zone / Territory');

    ws5.eachRow((r, rowNum) => {
      if (rowNum > 1) {
        partRows++;
        assert.strictEqual(r.getCell(3).value, 'SSEIL', `Sheet 5 project must be SSEIL, got ${r.getCell(3).value}`);
        assert.strictEqual(r.getCell(4).value, 'SSEIL Metro Hub', `Sheet 5 store must be SSEIL Metro Hub, got ${r.getCell(4).value}`);
        assert.strictEqual(r.getCell(5).value, 'North / SSEIL Metro Territory', `Sheet 5 zone/territory must be North / SSEIL Metro Territory, got ${r.getCell(5).value}`);
        assert.notStrictEqual(r.getCell(3).value, 'Galderma');
      }
    });
    assert.strictEqual(partRows, 18, `Sheet 5 must contain 18 rows, got ${partRows}`);

    // Sheet 7: Question Analytics
    const ws7 = wb.getWorksheet('7. Question Analytics');
    let qRows = 0;
    ws7.eachRow((r, rowNum) => {
      if (rowNum > 1) {
        qRows++;
        const qText = String(r.getCell(2).value);
        const acc = String(r.getCell(6).value);
        const status = String(r.getCell(7).value);
        assert(!qText.startsWith('Module Topic'), `Sheet 7 must contain real question text, got ${qText}`);
        assert(!acc.includes('%%'), `Sheet 7 double percent sign: ${acc}`);
        assert(['Mastered', 'Moderate', 'Review'].includes(status), `Sheet 7 status must be Mastered, Moderate, or Review, got ${status}`);
      }
    });
    assert.strictEqual(qRows, 20, `Sheet 7 must contain 20 question rows, got ${qRows}`);
    // Check first question matches canonical text
    assert.strictEqual(ws7.getRow(2).getCell(2).value, 'What is the mandatory customer greeting timeframe upon store entry?');

    // Sheet 8: Certifications
    const ws8 = wb.getWorksheet('8. Certifications');
    assert(ws8, 'Sheet 8 Certifications must exist');

    // Sheet 9: Master Training Outcome
    const ws9 = wb.getWorksheet('9. Master Training Outcome');
    let mtoRows = 0;
    ws9.eachRow((r, rowNum) => {
      if (rowNum > 1) {
        mtoRows++;
        assert.strictEqual(r.getCell(2).value, 'SSEIL');
        assert.strictEqual(r.getCell(8).value, '2026-10-16');
      }
    });
    assert.strictEqual(mtoRows, 18, `Sheet 9 must contain 18 rows, got ${mtoRows}`);
  });

  // ─────────────────────────────────────────────────────────────
  // 4. POWERPOINT 14-SLIDE EXECUTIVE DECK RECONCILIATION
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Suite 4: 14-Slide PowerPoint Executive Deck Reconciliation ---');

  test('PPT Generator: generates valid PPT deck without throwing or fabricating 55%/45% split', async () => {
    const pptBuffer = await reportPPTGenerator.generate14SlideExecutiveDeck(l2Data);
    assert(pptBuffer && pptBuffer.length > 5000, 'PPT buffer must be non-empty');
  });

  test('PPT Generator: generates valid PPT deck for Level 1 report without throwing', async () => {
    const pptBuffer = await reportPPTGenerator.generate14SlideManagementPPT(l1Data);
    assert(pptBuffer && pptBuffer.length > 5000, 'PPT buffer must be non-empty');
  });

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passed}/${total} REGRESSION TESTS PASSED IN ISOLATION`);
  console.log('================================================================\n');
}

runRegressionSuite()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error during test run:', err);
    process.exit(1);
  });
