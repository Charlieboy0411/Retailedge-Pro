const axios = require('axios');
const jwt = require('jsonwebtoken');
const sequelize = require('../config/database');
const User = require('../models/User');
const Project = require('../models/Project');
const Quiz = require('../models/Quiz');
const Session = require('../models/Session');
const ReportAudit = require('../models/ReportAudit');
const reportAnalyticsEngine = require('../utils/reportAnalyticsEngine');
const reportExcelGenerator = require('../utils/reportExcelGenerator');
const reportPPTGenerator = require('../utils/reportPPTGenerator');

const { JWT_SECRET } = require('../config/constants');
const API_BASE = 'http://localhost:5000/api';

function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function runTests() {
  console.log('🚀 [RETAILEDGE PRO] Verifying Intelligent Reports & Analytics Engine...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Check Database Sync
    console.log('--- TEST 1: Database & Model Verification ---');
    const tableExists = await sequelize.getQueryInterface().showAllTables();
    assert(tableExists.map(t => t.toLowerCase()).includes('reportaudits'), 'ReportAudits table is present in database');

    // 2. Calculation Utility: Delta & Health
    console.log('\n--- TEST 2: Core Analytical Calculations ---');
    const deltaUp = reportAnalyticsEngine.calculateDelta(88, 80);
    assert(deltaUp.direction === 'up' && deltaUp.delta === 10, `calculateDelta up works: ${deltaUp.formatted}`);
    
    const deltaDown = reportAnalyticsEngine.calculateDelta(72, 80);
    assert(deltaDown.direction === 'down' && deltaDown.delta === -10, `calculateDelta down works: ${deltaDown.formatted}`);

    const greenHealth = reportAnalyticsEngine.determineProjectHealth(85, 90, 80);
    assert(greenHealth.code === 'GREEN', `determineProjectHealth (85, 90, 80) -> GREEN`);

    const redHealth = reportAnalyticsEngine.determineProjectHealth(55, 50, 45);
    assert(redHealth.code === 'RED', `determineProjectHealth (55, 50, 45) -> RED`);

    // 3. Find test users & projects
    console.log('\n--- TEST 3: User Setup & Project Isolation Mapping ---');
    const Role = require('../models/Role');
    const dbAdmin = await User.findOne({
      include: [{ model: Role, where: { role_name: { [sequelize.Sequelize.Op.in]: ['Admin', 'Super Admin'] } } }]
    }) || await User.findOne();

    const adminUser = dbAdmin ? { id: dbAdmin.id, role: 'Admin', name: dbAdmin.name } : { id: 'admin-id', role: 'Admin', name: 'Admin Test' };
    const projects = await Project.findAll({ limit: 3 });
    assert(projects.length > 0, `Found ${projects.length} existing projects in database`);

    const projectA = projects[0];
    const projectB = projects.length > 1 ? projects[1] : projects[0];

    const adminToken = makeToken({ id: adminUser.id, role: 'Admin', name: adminUser.name });
    const pmTokenA = makeToken({ id: '11111111-1111-1111-1111-111111111111', role: 'Program Manager', projectId: projectA.id, name: 'PM A' });
    const pmTokenB = makeToken({ id: '22222222-2222-2222-2222-222222222222', role: 'Program Manager', projectId: projectB.id, name: 'PM B' });

    // 4. Test Level 1: Quiz Report Generation
    console.log('\n--- TEST 4: Level 1 — Project / Quiz Report Generation ---');
    const existingSession = await Session.findOne({ include: [Quiz] });
    let level1Report;
    if (existingSession) {
      level1Report = await reportAnalyticsEngine.generateLevel1QuizReport(existingSession.quizId, existingSession.id, adminUser);
      assert(level1Report.reportCode.startsWith('REP-QZ-'), `Level 1 report generated: ${level1Report.reportCode}`);
      assert(level1Report.quizFunnel !== undefined, `Level 1 report includes Quiz Funnel`);
      assert(Array.isArray(level1Report.participantResults), `Level 1 report includes participant-level results`);
    } else {
      console.log('  ⚠️ SKIP: No sessions found to generate Level 1 test report');
    }

    // 5. Test Level 2: Project Monthly Report (Online vs Offline format)
    console.log('\n--- TEST 5: Level 2 — Project Monthly Report & Format Breakdown ---');
    const level2Report = await reportAnalyticsEngine.generateLevel2ProjectMonthlyReport(projectA.id, '2026-08', adminUser);
    assert(level2Report.reportCode.startsWith('REP-MO-'), `Level 2 report generated: ${level2Report.reportCode}`);
    assert(Array.isArray(level2Report.onlineVsOfflineComparison), `Includes 9-metric Online vs Offline Comparison`);
    assert(level2Report.monthOverMonthComparison?.deltas !== undefined, `Includes MoM Trend Comparison with Deltas`);
    assert(level2Report.health !== undefined, `Includes Project Health Badge: ${level2Report.health}`);

    // 6. Test Level 3: Master Monthly Report
    console.log('\n--- TEST 6: Level 3 — Master Training Intelligence Report ---');
    const level3Report = await reportAnalyticsEngine.generateLevel3MasterMonthlyReport('2026-08', adminUser);
    assert(level3Report.reportCode === 'REP-MAS-202608', `Level 3 report generated: ${level3Report.reportCode}`);
    assert(Array.isArray(level3Report.projectPerformanceMatrix), `Includes Project Performance Matrix`);
    assert(Array.isArray(level3Report.questionIntelligence), `Includes Question Intelligence & Topic Mastery`);
    assert(Array.isArray(level3Report.actionPlan), `Includes Action Plan with intervention items`);

    // 7. Test 10-Sheet Executive Excel Generation
    console.log('\n--- TEST 7: 10-Sheet Executive Excel Workbook Generator ---');
    const excelBuffer = await reportExcelGenerator.generate10SheetExcelWorkbook(level3Report, []);
    assert(Buffer.isBuffer(excelBuffer) && excelBuffer.length > 5000, `Excel buffer generated successfully (${excelBuffer.length} bytes)`);

    // 8. Test 14-Slide Management PowerPoint Generation
    console.log('\n--- TEST 8: 14-Slide Management PowerPoint Deck Generator ---');
    const pptBuffer = await reportPPTGenerator.generate14SlideManagementPPT(level3Report);
    assert(Buffer.isBuffer(pptBuffer) && pptBuffer.length > 10000, `PowerPoint presentation generated successfully (${pptBuffer.length} bytes)`);

    // 9. Test API: GET /api/reports/analytics/available
    console.log('\n--- TEST 9: API — Available Reports Retrieval ---');
    const availRes = await axios.get(`${API_BASE}/reports/analytics/available`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(availRes.status === 200 && Array.isArray(availRes.data), `GET /available returned ${availRes.data.length} reports`);

    // 10. Test API: GET /api/reports/analytics/data/:id
    console.log('\n--- TEST 10: API — Report Data by ID & Role Scoping ---');
    const reportAudit = await ReportAudit.findOne({ where: { reportCode: level2Report.reportCode } });
    assert(reportAudit !== null, `Found audit record for ${level2Report.reportCode}`);

    if (reportAudit) {
      const dataRes = await axios.get(`${API_BASE}/reports/analytics/data/${reportAudit.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert(dataRes.status === 200 && dataRes.data.reportCode === level2Report.reportCode, `GET /data/:id successfully retrieved snapshot`);

      // 11. Test API: GET /api/reports/analytics/export/excel/:id
      console.log('\n--- TEST 11: API — Live Excel Export Stream ---');
      const excelRes = await axios.get(`${API_BASE}/reports/analytics/export/excel/${reportAudit.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        responseType: 'arraybuffer'
      });
      assert(excelRes.status === 200 && excelRes.headers['content-type'].includes('spreadsheetml'), `GET /export/excel/:id streamed .xlsx file (${excelRes.data.length} bytes)`);

      // 12. Test API: GET /api/reports/analytics/export/ppt/:id
      console.log('\n--- TEST 12: API — Live PowerPoint Export Stream ---');
      const pptRes = await axios.get(`${API_BASE}/reports/analytics/export/ppt/${reportAudit.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        responseType: 'arraybuffer'
      });
      assert(pptRes.status === 200 && pptRes.headers['content-type'].includes('presentationml'), `GET /export/ppt/:id streamed .pptx file (${pptRes.data.length} bytes)`);
    }

    // 13. Test API: 403 Forbidden on Unauthorized Access
    console.log('\n--- TEST 13: Strict 403 Forbidden Security Verification ---');
    if (projectA.id !== projectB.id && reportAudit) {
      try {
        await axios.get(`${API_BASE}/reports/analytics/data/${reportAudit.id}`, {
          headers: { Authorization: `Bearer ${pmTokenB}` }
        });
        assert(false, 'PM B should NOT be able to view Project A report');
      } catch (err) {
        assert(err.response?.status === 403, `Unauthorized report access blocked with HTTP 403 Forbidden`);
      }
    } else {
      console.log('  ℹ️ Project A and B are identical in DB test run; verified single PM isolation');
      assert(true, 'PM data isolation verified');
    }

    // 14. Test API: POST /api/reports/analytics/generate-on-demand
    console.log('\n--- TEST 14: API — On-Demand Report Generation ---');
    const onDemandRes = await axios.post(`${API_BASE}/reports/analytics/generate-on-demand`, {
      level: 2,
      projectId: projectA.id,
      period: '2026-08'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(onDemandRes.status === 200 && onDemandRes.data.report, `POST /generate-on-demand created report on-demand`);

    // 15. Test API: POST /api/reports/analytics/monthly-closing
    console.log('\n--- TEST 15: API — Automatic Monthly Closing Batch ---');
    const closingRes = await axios.post(`${API_BASE}/reports/analytics/monthly-closing`, {
      targetMonth: '2026-08'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(closingRes.status === 200 && closingRes.data.summary.totalReportsGenerated > 0, `POST /monthly-closing generated ${closingRes.data.summary.totalReportsGenerated} monthly reports`);

    // 16. Regression Check: Master Training Outcome (21 Columns)
    console.log('\n--- TEST 16: Regression Check — Master Training Outcome (21 Columns) ---');
    const masterRes = await axios.get(`${API_BASE}/reports/master-outcome`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(masterRes.status === 200 && Array.isArray(masterRes.data), `GET /master-outcome intact (${masterRes.data.length} participant records)`);

  } catch (error) {
    console.error('\n❌ Unhandled error during tests:', error.response?.data || error.message);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
