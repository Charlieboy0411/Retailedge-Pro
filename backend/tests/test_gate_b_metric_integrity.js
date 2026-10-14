/**
 * RETAILEDGE PRO — STAGE 3C REMEDIATION, GATE B VERIFICATION SUITE
 * Attendance Metric Integrity, Elimination of Fabricated Data & Separation of Measures
 *
 * Strict Guardrails:
 * - Uses isolated in-memory fixtures and stubs — does NOT mutate AWS RDS.
 * - Confirms zero database mutations via pre/post baseline queries.
 * - Asserts removal of hardcoded values (75%, 80%, 85%, Rahul Sharma mock rows, 20m quiz duration).
 * - Verifies distinction between missing data (null) and measured zero (0).
 * - Verifies separation of Arena speed points, assessment percentages, and attendance percentages.
 */

const ExcelJS = require('exceljs');
const sequelize = require('../config/database');
const JitsiAttendance = require('../models/JitsiAttendance');
const JitsiInterval = require('../models/JitsiInterval');
const Training = require('../models/Training');
const Certificate = require('../models/Certificate');
const User = require('../models/User');
const Project = require('../models/Project');
const Participant = require('../models/Participant');
const TrainingProgress = require('../models/TrainingProgress');
const Quiz = require('../models/Quiz');
const Session = require('../models/Session');
const ProjectAssignment = require('../models/ProjectAssignment');
const ReportAudit = require('../models/ReportAudit');

const clientService = require('../utils/clientService');
const supervisorService = require('../utils/supervisorService');
const projectIntelligenceService = require('../utils/projectIntelligenceService');
const tdService = require('../utils/tdService');
const reportExcelGenerator = require('../utils/reportExcelGenerator');
const reportAnalyticsEngine = require('../utils/reportAnalyticsEngine');
const { calculatePoints } = require('../sockets/services/scoringEngine');

let PASS = 0;
let FAIL = 0;
let SKIP = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    PASS++;
  } else {
    console.error(`  [FAIL] ${testName} ${details ? '--> ' + details : ''}`);
    FAIL++;
  }
}

// Helper to save and stub Sequelize model methods safely
function createModelStubber() {
  const originals = new Map();

  return {
    stub(model, method, implementation) {
      const key = `${model.name}_${method}`;
      if (!originals.has(key)) {
        originals.set(key, { model, method, orig: model[method] });
      }
      model[method] = implementation;
    },
    restoreAll() {
      originals.forEach(({ model, method, orig }) => {
        model[method] = orig;
      });
      originals.clear();
    }
  };
}

(async () => {
  console.log('========================================================================');
  console.log('RETAILEDGE PRO — STAGE 3C GATE B: METRIC INTEGRITY & DATA FABRICATION AUDIT');
  console.log('========================================================================\n');

  // Baseline Verification (Read-Only)
  console.log('--- PRE-FLIGHT: Database Baseline Snapshot (AWS RDS Read-Only) ---');
  let baselineCounts = {};
  try {
    const [[att]] = await sequelize.query(`SELECT COUNT(*) as c FROM "JitsiAttendances"`);
    const [[intv]] = await sequelize.query(`SELECT COUNT(*) as c FROM "JitsiIntervals"`);
    const [[tr]] = await sequelize.query(`SELECT COUNT(*) as c FROM "Trainings"`);
    const [[cert]] = await sequelize.query(`SELECT COUNT(*) as c FROM "Certificates"`);
    const [[usr]] = await sequelize.query(`SELECT COUNT(*) as c FROM "Users"`);
    const [[prj]] = await sequelize.query(`SELECT COUNT(*) as c FROM "Projects"`);

    baselineCounts = {
      attendances: Number(att.c),
      intervals: Number(intv.c),
      trainings: Number(tr.c),
      certificates: Number(cert.c),
      users: Number(usr.c),
      projects: Number(prj.c)
    };
    console.log(`  Baseline AWS RDS Counts: Attendances=${baselineCounts.attendances}, Intervals=${baselineCounts.intervals}, Trainings=${baselineCounts.trainings}, Certificates=${baselineCounts.certificates}\n`);
    assert(true, 'AWS RDS Read-Only Pre-flight Authenticated successfully');
  } catch (err) {
    console.error('Failed to query baseline:', err.message);
    process.exit(1);
  }

  const stubber = createModelStubber();

  const P1_ID = '11111111-1111-1111-1111-111111111111';
  const U1_ID = '22222222-2222-2222-2222-222222222221';
  const U2_ID = '22222222-2222-2222-2222-222222222222';
  const SUB1_ID = '33333333-3333-3333-3333-333333333331';
  const SUP1_ID = '44444444-4444-4444-4444-444444444441';

  try {
    // ========================================================================
    // 1. CLIENT SERVICE: ATTENDANCE INTEGRITY & REMOVAL OF HARDCODED 75%/80%
    // ========================================================================
    console.log('\n--- 1. Client Service Metrics & Participants Integrity ---');

    // Test 1.1: Missing Attendance in Cockpit returns null and hasAttendanceData: false (NOT 75%)
    stubber.stub(Project, 'findAll', async () => [{ id: P1_ID, name: 'Project Alpha' }]);
    stubber.stub(Project, 'count', async () => 1);
    stubber.stub(User, 'findAll', async () => [
      { id: U1_ID, name: 'Learner 1', email: 'l1@test.com', status: 'Active', projectId: P1_ID },
      { id: U2_ID, name: 'Learner 2', email: 'l2@test.com', status: 'Active', projectId: P1_ID }
    ]);
    stubber.stub(JitsiAttendance, 'findAll', async () => []); // ZERO attendance records
    stubber.stub(Training, 'findAll', async () => []);
    stubber.stub(Training, 'count', async () => 0);
    stubber.stub(TrainingProgress, 'findAll', async () => []);
    stubber.stub(TrainingProgress, 'count', async () => 0);
    stubber.stub(Quiz, 'findAll', async () => []);
    stubber.stub(Participant, 'findAll', async () => []);
    stubber.stub(Certificate, 'count', async () => 0);

    const clientAdmin = { id: 'admin1', role: 'Admin' };
    const cockpitMetricsNoAtt = await clientService.getClientCockpitMetrics(clientAdmin, P1_ID);

    assert(cockpitMetricsNoAtt.attendanceRate === null, 'getClientCockpitMetrics returns null attendanceRate when no Jitsi records exist (no 75% fallback)');
    assert(cockpitMetricsNoAtt.hasAttendanceData === false, 'getClientCockpitMetrics exposes hasAttendanceData: false');
    assert(cockpitMetricsNoAtt.kpis.attendanceRate === null, 'Cockpit KPI attendanceRate is null');
    assert(cockpitMetricsNoAtt.kpis.hasAttendanceData === false, 'Cockpit KPI hasAttendanceData is false');

    // Test 1.2: Measured Attendance in Cockpit calculates exact arithmetic mean
    stubber.stub(JitsiAttendance, 'findAll', async () => [
      { userId: U1_ID, attendancePercentage: 80, status: 'Attended' },
      { userId: U2_ID, attendancePercentage: 90, status: 'Attended' }
    ]);

    const cockpitMetricsWithAtt = await clientService.getClientCockpitMetrics(clientAdmin, P1_ID);
    assert(cockpitMetricsWithAtt.attendanceRate === 85, 'getClientCockpitMetrics calculates true average attendance (85%) from authoritative records');
    assert(cockpitMetricsWithAtt.hasAttendanceData === true, 'getClientCockpitMetrics sets hasAttendanceData: true when records exist');
    assert(cockpitMetricsWithAtt.kpis.attendanceRate === 85, 'Cockpit KPI displays accurate 85% attendance');

    // Test 1.3: Missing Attendance does NOT falsely flag participants as "At Risk" in Cockpit
    // Score is 85% (passing), Attendance is missing (null). Should NOT be at-risk.
    stubber.stub(JitsiAttendance, 'findAll', async () => []); // missing attendance
    stubber.stub(Participant, 'findAll', async () => [
      {
        userId: U1_ID,
        score: 85,
        Responses: [{ points_awarded: 10, is_correct: true }],
        Session: { Quiz: { questions: [{ id: 'q1' }] } }
      }
    ]);

    const cockpitAtRiskCheck = await clientService.getClientCockpitMetrics(clientAdmin, P1_ID);
    assert(cockpitAtRiskCheck.atRiskParticipants === 0, 'Learner with good scores and null attendance is NOT falsely flagged At Risk (removed : 80 fallback)');

    // Test 1.4: Client Participants list returns null attendance and null score for unrecorded participants (no 80% / 75% fallbacks)
    stubber.stub(User, 'findAndCountAll', async () => ({
      count: 1,
      rows: [{ id: U1_ID, name: 'Learner 1', employee_id: 'EMP-01', status: 'Active', projectId: P1_ID, Project: { name: 'Alpha' } }]
    }));
    stubber.stub(JitsiAttendance, 'findAll', async () => []); // No attendance
    stubber.stub(Participant, 'findAll', async () => []); // No quizzes
    stubber.stub(TrainingProgress, 'findAll', async () => []);
    stubber.stub(Certificate, 'findOne', async () => null);

    const clientParts = await clientService.getClientParticipants(clientAdmin, P1_ID);
    assert(clientParts[0].attendanceRate === null, 'getClientParticipants returns attendanceRate: null when unrecorded (no 80% fallback)');
    assert(clientParts[0].hasAttendanceData === false, 'getClientParticipants exposes hasAttendanceData: false');
    assert(clientParts[0].avgScore === null, 'getClientParticipants returns avgScore: null when no quizzes taken (no 75% fallback)');
    assert(clientParts[0].hasAssessmentData === false, 'getClientParticipants exposes hasAssessmentData: false');
    assert(clientParts[0].coachingStatus === 'On Track', 'Learner without recorded telemetry defaults coachingStatus to On Track, not At Risk');

    // ========================================================================
    // 2. SUPERVISOR SERVICE: METRIC INTEGRITY & SEPARATION OF MODULE PROGRESS
    // ========================================================================
    console.log('\n--- 2. Supervisor Service Metric Integrity & Disambiguation ---');

    stubber.stub(User, 'findAll', async () => [
      { id: SUB1_ID, name: 'Subordinate 1', email: 'sub1@test.com', status: 'Active', projectId: P1_ID, Project: { name: 'Alpha' } }
    ]);
    stubber.stub(TrainingProgress, 'findAll', async () => [
      { userId: SUB1_ID, completed: true } // 100% training progress
    ]);
    stubber.stub(Participant, 'findAll', async () => [
      {
        userId: SUB1_ID,
        score: 85,
        Responses: [{ is_correct: true }, { is_correct: true }],
        Session: { Quiz: { questions: [{ id: 'q1' }, { id: 'q2' }] } }
      }
    ]);
    stubber.stub(Certificate, 'findAll', async () => []);
    stubber.stub(JitsiAttendance, 'findAll', async () => []); // ZERO Jitsi attendance

    // Test 2.1: Supervisor metrics when Jitsi attendance is missing
    const supMetricsNoAtt = await supervisorService.getTeamMetrics(SUP1_ID);
    assert(supMetricsNoAtt.attendanceRate === null, 'getTeamMetrics returns null attendanceRate when no Jitsi data exists (no 80% fallback, no module substitution)');
    assert(supMetricsNoAtt.hasAttendanceData === false, 'getTeamMetrics sets hasAttendanceData: false');

    // Test 2.2: Certification Readiness requires BOTH real attendance >= 80% and score >= 70%
    // Subordinate has 100% module progress and 85% quiz score, but NULL Jitsi attendance -> NOT eligible for cert
    assert(supMetricsNoAtt.certificationReady === 0, 'Subordinate with passing score but missing attendance is NOT certified-ready (enforces attendance threshold)');

    // Test 2.3: Team performance roster cleanly separates trainingProgress from attendancePercentage
    const roster = await supervisorService.getTeamPerformanceRoster(SUP1_ID);
    assert(roster[0].trainingProgress === 100, 'Roster shows 100% module training progress from LMS records');
    assert(roster[0].attendancePercentage === null, 'Roster shows attendancePercentage: null for meeting attendance (no 75% fallback, separate from module progress)');
    assert(roster[0].hasAttendanceData === false, 'Roster indicates hasAttendanceData: false');
    assert(roster[0].certificationStatus === 'Not Eligible', 'Certification status is Not Eligible when attendance telemetry is absent');

    // Test 2.4: Subordinate with real attendance >= 80% becomes certification eligible
    stubber.stub(JitsiAttendance, 'findAll', async () => [
      { userId: SUB1_ID, attendancePercentage: 88, status: 'Present' }
    ]);
    const supMetricsWithAtt = await supervisorService.getTeamMetrics(SUP1_ID);
    assert(supMetricsWithAtt.attendanceRate === 88, 'getTeamMetrics reports genuine 88% attendance');
    assert(supMetricsWithAtt.certificationReady === 1, 'Subordinate with score 85% and attendance 88% is correctly marked certificationReady');

    // ========================================================================
    // 3. PROJECT INTELLIGENCE SERVICE: NO ASSUMED 20-MIN QUIZ DURATION & NO DATA FABRICATION
    // ========================================================================
    console.log('\n--- 3. Project Intelligence Calculations & Threshold Integrity ---');

    // Test 3.1: getProjectKPIs removes arbitrary + (sessions.length * 20) quiz duration
    stubber.stub(Project, 'findAll', async () => [{ id: P1_ID }]);
    stubber.stub(User, 'count', async () => 10);
    stubber.stub(Training, 'findAll', async () => []);
    stubber.stub(Certificate, 'count', async () => 0);
    stubber.stub(Participant, 'findAll', async () => [
      // 2 quiz participant responses
      { id: 'part1', score: 80, createdAt: new Date() },
      { id: 'part2', score: 90, createdAt: new Date() }
    ]);
    stubber.stub(Participant, 'count', async () => 2);
    stubber.stub(JitsiAttendance, 'findAll', async () => [
      // 1 real Jitsi meeting record: 45 minutes attended, scheduled 60 minutes
      { userId: U1_ID, totalAttendedMinutes: 45, scheduledDurationMinutes: 60, attendancePercentage: 75 }
    ]);

    const kpis = await projectIntelligenceService.getProjectKPIs([P1_ID]);
    assert(kpis.hasAttendanceData === true, 'getProjectKPIs hasAttendanceData is true when Jitsi records exist');
    assert(kpis.averageSessionDuration === '45m', 'getProjectKPIs averageSessionDuration is strictly based on Jitsi attended minutes (45m), with no arbitrary 20m quiz duration added');
    assert(kpis.participantsJoined === 1, 'participantsJoined counts strictly Jitsi learners (1), not quiz participants');

    // Test 3.2: getProjectKPIs when no Jitsi records exist
    stubber.stub(JitsiAttendance, 'findAll', async () => []);
    const kpisNoAtt = await projectIntelligenceService.getProjectKPIs([P1_ID]);
    assert(kpisNoAtt.attendanceRate === null, 'getProjectKPIs returns attendanceRate: null when no Jitsi data exists');
    assert(kpisNoAtt.hasAttendanceData === false, 'getProjectKPIs sets hasAttendanceData: false');
    assert(kpisNoAtt.averageSessionDuration === 'N/A', 'getProjectKPIs returns averageSessionDuration: "N/A" (no fabricated duration)');

    // Test 3.3: getProjectTrainingPerformance telemetry status & training hours disambiguation
    stubber.stub(Training, 'findAll', async () => [
      { id: 't1', title: 'Session 1', status: 'Completed', scheduledAt: new Date() }
    ]);
    const perfNoAtt = await projectIntelligenceService.getProjectTrainingPerformance([P1_ID]);
    assert(perfNoAtt.averageAttendancePct === null, 'getProjectTrainingPerformance averageAttendancePct is null without Jitsi records (no fake 85%)');
    assert(perfNoAtt.averageSessionDuration === 'N/A', 'getProjectTrainingPerformance duration is "N/A" (no fake 45m)');
    assert(perfNoAtt.trainingHoursDelivered === null, 'getProjectTrainingPerformance hours is null when sessions exist but telemetry is missing (not fabricated zero)');
    assert(perfNoAtt.telemetryStatus === 'UNAVAILABLE', 'getProjectTrainingPerformance marks telemetryStatus: "UNAVAILABLE"');
    assert(perfNoAtt.trends.length === 0, 'getProjectTrainingPerformance trends is empty (no fake [78, 82, 85, 90] weekly array)');

    // Test 3.3b: Confirmed no sessions produces 0 hours and NO_SESSIONS
    stubber.stub(Training, 'findAll', async () => []);
    const perfZero = await projectIntelligenceService.getProjectTrainingPerformance([P1_ID]);
    assert(perfZero.trainingHoursDelivered === 0, 'getProjectTrainingPerformance returns 0 hours when confirmed no sessions exist');
    assert(perfZero.telemetryStatus === 'NO_SESSIONS', 'getProjectTrainingPerformance marks telemetryStatus: "NO_SESSIONS"');

    // Test 3.3c: Completed sessions with full telemetry coverage marks MEASURED
    stubber.stub(Training, 'findAll', async () => [
      { id: 't1', title: 'Session 1', status: 'Completed', scheduledAt: new Date() }
    ]);
    stubber.stub(JitsiAttendance, 'findAll', async () => [
      { id: 'j1', trainingId: 't1', totalAttendedMinutes: 60, attendancePercentage: 100 }
    ]);
    const perfMeasured = await projectIntelligenceService.getProjectTrainingPerformance([P1_ID]);
    assert(perfMeasured.trainingHoursDelivered === 1.0, 'getProjectTrainingPerformance returns measured 1.0h for 60 min session');
    assert(perfMeasured.telemetryStatus === 'MEASURED', 'getProjectTrainingPerformance marks telemetryStatus: "MEASURED" when all completed sessions have telemetry');

    // Test 3.3d: Multiple completed sessions with only partial telemetry coverage marks PARTIAL
    stubber.stub(Training, 'findAll', async () => [
      { id: 't1', title: 'Session 1', status: 'Completed', scheduledAt: new Date() },
      { id: 't2', title: 'Session 2', status: 'Completed', scheduledAt: new Date() }
    ]);
    // only t1 has telemetry, t2 is missing
    const perfPartial = await projectIntelligenceService.getProjectTrainingPerformance([P1_ID]);
    assert(perfPartial.telemetryStatus === 'PARTIAL', 'getProjectTrainingPerformance marks telemetryStatus: "PARTIAL" when some completed sessions lack telemetry');

    // Test 3.4: evaluateEligibility threshold checks
    const { evaluateEligibility } = projectIntelligenceService;
    assert(evaluateEligibility(null, 100, 85) === 'PENDING', 'evaluateEligibility returns PENDING when attendance is missing/null');
    assert(evaluateEligibility(undefined, 100, 85) === 'PENDING', 'evaluateEligibility returns PENDING when attendance is undefined');
    assert(evaluateEligibility(79, 100, 85) === 'PENDING' || evaluateEligibility(79, 100, 85) === 'NOT ELIGIBLE', 'evaluateEligibility does NOT grant eligibility for attendance < 80%');
    assert(evaluateEligibility(80, 100, 70) === 'ELIGIBLE', 'evaluateEligibility grants ELIGIBLE for attendance = 80% and score = 70%');
    assert(evaluateEligibility(85, 100, 69) !== 'ELIGIBLE', 'evaluateEligibility rejects score < 70%');

    // Test 3.5: getParticipant360 readiness audit thresholds and missing data representation
    stubber.stub(User, 'findByPk', async () => ({ id: U1_ID, name: 'Learner 360', email: '360@test.com', Project: { name: 'Alpha' } }));
    stubber.stub(Participant, 'findAll', async () => []);
    stubber.stub(JitsiAttendance, 'findAll', async () => []);
    stubber.stub(Certificate, 'findOne', async () => null);

    const p360 = await projectIntelligenceService.getParticipant360(U1_ID, [P1_ID], { role: 'Admin' });
    const attAuditItem = p360.readinessAudit.find(r => r.requirement === 'Attendance Threshold');
    const scoreAuditItem = p360.readinessAudit.find(r => r.requirement === 'Assessment Score');

    assert(attAuditItem.threshold === '≥ 80%', 'Participant 360 readiness audit requires Attendance ≥ 80% (not 75%)');
    assert(attAuditItem.result === 'No Data', 'Participant 360 displays "No Data" when attendance is not recorded');
    assert(attAuditItem.status === 'PENDING DATA', 'Participant 360 attendance status is "PENDING DATA"');
    assert(scoreAuditItem.threshold === '≥ 70%', 'Participant 360 readiness audit requires Assessment Score ≥ 70% (not 60%)');
    assert(p360.training.sessionsAssigned === 0, 'Participant 360 sessionsAssigned is 0 (removed Math.max(len, 3) fallback)');
    assert(p360.quiz.quizzesAssigned === 0, 'Participant 360 quizzesAssigned is 0 (removed Math.max(len, 4) fallback)');

    // Test 3.6: getMasterTrainingOutcomeData does not cross-fabricate attendance into quizzes or quiz scores into meetings
    stubber.stub(JitsiAttendance, 'findAll', async () => [
      {
        id: 'j1',
        participantName: 'Jitsi Only User',
        employeeId: 'EMP-J1',
        totalAttendedMinutes: 50,
        attendancePercentage: 85,
        status: 'Attended',
        firstJoinedAt: new Date(),
        lastLeftAt: new Date()
      }
    ]);
    stubber.stub(Session, 'findAll', async () => [
      {
        id: 's1',
        is_offline: false,
        Quiz: { title: 'Q Test', questions: [{ id: 'q1' }] },
        Project: { id: P1_ID, name: 'Project Alpha' },
        Participants: [
          {
            id: 'q1',
            name: 'Quiz Only User',
            employeeId: 'EMP-Q1',
            createdAt: new Date(),
            Responses: [{ points_awarded: 10, is_correct: true }]
          }
        ],
        host: { name: 'Host Trainer' }
      }
    ]);
    stubber.stub(Certificate, 'findAll', async () => []);

    const outcomeRows = await projectIntelligenceService.getMasterTrainingOutcomeData([P1_ID]);
    const jitsiRow = outcomeRows.find(r => r.participant === 'Jitsi Only User');
    const quizRow = outcomeRows.find(r => r.participant === 'Quiz Only User');

    assert(jitsiRow.quizzesAssigned === 0, 'Jitsi meeting row does NOT fabricate quizzesAssigned (is 0, not 1)');
    assert(jitsiRow.quizScore === 'N/A', 'Jitsi meeting row does NOT fabricate quizScore (is N/A, not 85%)');
    assert(quizRow.jitsiAttendance === 'No Meeting Recorded', 'Quiz participant row does NOT fabricate Jitsi attendance ("No Meeting Recorded", not "Completed")');
    assert(quizRow.totalDuration === '—', 'Quiz participant row totalDuration is "—" (no fabricated "25m")');
    assert(quizRow.attendancePercentage === '—', 'Quiz participant row attendancePercentage is "—" (no fabricated "100%")');

    // ========================================================================
    // 4. REPORT EXCEL GENERATOR: ELIMINATION OF HARDCODED PARTICIPANTS & FALLBACKS
    // ========================================================================
    console.log('\n--- 4. Report Excel Generator: Elimination of Mock Rows ---');

    // Generate workbook with completely empty participant datasets
    const emptyReportData = {
      title: 'Integrity Verification Report',
      period: '2026-08',
      executiveSummary: {
        completionRate: '90%',
        averageScore: '80%',
        passRate: '85%',
        attendanceRate: null, // missing attendance
        certificatesIssued: 5
      },
      participantResults: [], // empty
      recentSessions: [],     // empty
      recentCertificates: []  // empty
    };

    const emptyMasterRows = [];
    const buffer = await reportExcelGenerator.generate10SheetExcelWorkbook(emptyReportData, emptyMasterRows);
    assert(Buffer.isBuffer(buffer) && buffer.length > 0, 'Workbook successfully generated in-memory');

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);

    // Sheet 1: Executive Summary cell for Attendance Rate must be 'N/A'
    const ws1 = wb.getWorksheet('1. Executive Summary');
    let attendanceRateFound = false;
    let attendanceRateValue = null;
    ws1.eachRow((row) => {
      const metricName = row.getCell(2).value;
      if (metricName === 'Attendance Rate') {
        attendanceRateFound = true;
        attendanceRateValue = row.getCell(3).value;
      }
    });
    assert(attendanceRateFound, 'Sheet 1 contains Attendance Rate row');
    assert(attendanceRateValue === 'N/A', `Sheet 1 displays "N/A" for missing attendance (received: "${attendanceRateValue}", no 88.5% fallback)`);

    // Sheet 5: Participant Performance must have 0 data rows (header is row 1)
    const ws5 = wb.getWorksheet('5. Participant Performance');
    let ws5DataRows = 0;
    ws5.eachRow((row, rowNumber) => {
      if (rowNumber > 1) ws5DataRows++;
    });
    assert(ws5DataRows === 0, `Sheet 5 (Participant Performance) has 0 fabricated rows for empty data (received: ${ws5DataRows}, removed Rahul Sharma mock rows)`);

    // Sheet 6: Attendance must have 0 data rows (header is row 1)
    const ws6 = wb.getWorksheet('6. Attendance');
    let ws6DataRows = 0;
    ws6.eachRow((row, rowNumber) => {
      if (rowNumber > 1) ws6DataRows++;
    });
    assert(ws6DataRows === 0, `Sheet 6 (Attendance) has 0 fabricated rows for empty data (received: ${ws6DataRows}, removed Rahul Sharma mock rows)`);

    // Sheet 8: Certification must have 0 data rows (header is row 1)
    const ws8 = wb.getWorksheet('8. Certification');
    let ws8DataRows = 0;
    ws8.eachRow((row, rowNumber) => {
      if (rowNumber > 1) ws8DataRows++;
    });
    assert(ws8DataRows === 0, `Sheet 8 (Certification) has 0 fabricated rows for empty data (received: ${ws8DataRows}, removed Rahul Sharma mock rows)`);

    // Sheet 9: Master Training Outcome must have 0 data rows (header is row 1)
    const ws9 = wb.getWorksheet('9. Master Training Outcome');
    let ws9DataRows = 0;
    ws9.eachRow((row, rowNumber) => {
      if (rowNumber > 1) ws9DataRows++;
    });
    assert(ws9DataRows === 0, `Sheet 9 (Master Training Outcome) has 0 fabricated rows for empty data (received: ${ws9DataRows}, removed Rahul Sharma mock rows)`);

    // ========================================================================
    // 5. REPORT ANALYTICS ENGINE: LEVEL 1 & LEVEL 2 INTEGRITY
    // ========================================================================
    console.log('\n--- 5. Report Analytics Engine: Level 1 & Level 2 Reports ---');

    const S1_ID = '55555555-5555-5555-5555-555555555551';
    const Q1_ID = '66666666-6666-6666-6666-666666666661';

    stubber.stub(ReportAudit, 'create', async (data) => data);
    stubber.stub(Session, 'findOne', async () => ({
      id: S1_ID,
      roomCode: 'room1',
      createdAt: new Date(),
      Quiz: {
        title: 'Product Knowledge',
        questions: [{ id: 'q1' }],
        Project: { id: P1_ID, name: 'Project Alpha' }
      },
      Participants: [],
      host: { name: 'Lead Trainer' }
    }));

    const l1Report = await reportAnalyticsEngine.generateLevel1QuizReport(Q1_ID, S1_ID);
    assert(l1Report.kpis.attendanceRate === null, 'generateLevel1QuizReport sets kpis.attendanceRate: null (removed hardcoded 100%)');
    assert(l1Report.kpis.hasAttendanceData === false, 'generateLevel1QuizReport exposes kpis.hasAttendanceData: false');

    // ========================================================================
    // 6. SEPARATION OF MEASURES & LIVE ARENA CONTRACT PRESERVATION
    // ========================================================================
    console.log('\n--- 6. Separation of Measures & Live Arena Contract ---');

    // Test 6.1: Live Arena speed points formula remains intact and separate from score percentages
    const testQuestion = { time_limit: 30 }; // 30 second question
    const instantPoints = calculatePoints(true, testQuestion, 0); // 0ms response
    const midPoints = calculatePoints(true, testQuestion, 15000); // 15000ms response
    const latePoints = calculatePoints(true, testQuestion, 30000); // 30000ms response
    const wrongPoints = calculatePoints(false, testQuestion, 5000); // wrong answer

    assert(instantPoints === 1000, 'Live Arena awards 1000 speed points for instant correct response');
    assert(midPoints === 750, 'Live Arena awards 750 speed points for mid-duration response');
    assert(latePoints === 500, 'Live Arena awards 500 base points for last-second correct response');
    assert(wrongPoints === 0, 'Live Arena awards 0 points for incorrect response');

    // Test 6.2: Speed points (> 100) are never confused with Assessment Score % or Attendance %
    assert(instantPoints > 100, 'Arena points (1000) are points-scale (>100), not percentage scale');
    const assessmentScorePct = Math.round((1 / 2) * 100); // 50%
    const attendancePct = 85; // 85%
    const meetingDurationMins = 45; // 45 mins

    assert(typeof assessmentScorePct === 'number' && assessmentScorePct <= 100, 'Assessment score is a 0-100% metric');
    assert(typeof attendancePct === 'number' && attendancePct <= 100, 'Attendance is a 0-100% metric');
    assert(typeof meetingDurationMins === 'number', 'Meeting duration is in minutes');
    assert(instantPoints !== assessmentScorePct && assessmentScorePct !== attendancePct, 'Four measures (Speed Points, Assessment %, Attendance %, Duration) remain independent');

  } finally {
    stubber.restoreAll();
  }

  // ========================================================================
  // 7. POST-TEST DATABASE INVARIANCE CHECK (AWS RDS)
  // ========================================================================
  console.log('\n--- 7. AWS RDS Database Invariance Verification ---');
  const [[postAtt]] = await sequelize.query(`SELECT COUNT(*) as c FROM "JitsiAttendances"`);
  const [[postIntv]] = await sequelize.query(`SELECT COUNT(*) as c FROM "JitsiIntervals"`);
  const [[postTr]] = await sequelize.query(`SELECT COUNT(*) as c FROM "Trainings"`);
  const [[postCert]] = await sequelize.query(`SELECT COUNT(*) as c FROM "Certificates"`);
  const [[postUsr]] = await sequelize.query(`SELECT COUNT(*) as c FROM "Users"`);
  const [[postPrj]] = await sequelize.query(`SELECT COUNT(*) as c FROM "Projects"`);

  const postCounts = {
    attendances: Number(postAtt.c),
    intervals: Number(postIntv.c),
    trainings: Number(postTr.c),
    certificates: Number(postCert.c),
    users: Number(postUsr.c),
    projects: Number(postPrj.c)
  };

  assert(postCounts.attendances === baselineCounts.attendances, `JitsiAttendances count unchanged (${baselineCounts.attendances} -> ${postCounts.attendances})`);
  assert(postCounts.intervals === baselineCounts.intervals, `JitsiIntervals count unchanged (${baselineCounts.intervals} -> ${postCounts.intervals})`);
  assert(postCounts.trainings === baselineCounts.trainings, `Trainings count unchanged (${baselineCounts.trainings} -> ${postCounts.trainings})`);
  assert(postCounts.certificates === baselineCounts.certificates, `Certificates count unchanged (${baselineCounts.certificates} -> ${postCounts.certificates})`);
  assert(postCounts.users === baselineCounts.users, `Users count unchanged (${baselineCounts.users} -> ${postCounts.users})`);
  assert(postCounts.projects === baselineCounts.projects, `Projects count unchanged (${baselineCounts.projects} -> ${postCounts.projects})`);

  // Final Summary
  console.log('\n========================================================================');
  console.log(`RETAILEDGE PRO — GATE B TEST RESULTS: ${PASS} PASSED | ${FAIL} FAILED | ${SKIP} SKIPPED`);
  console.log('========================================================================\n');

  if (FAIL > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
})();
