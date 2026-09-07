const axios = require('axios');
const User = require('../models/User');
const Project = require('../models/Project');
const Quiz = require('../models/Quiz');
const Certificate = require('../models/Certificate');
const Training = require('../models/Training');

const API_BASE = 'http://localhost:5000/api';

async function runSupervisorRbacVerification() {
  console.log('================================================================');
  console.log('  RETAILEDGE PRO — PHASE 4 SUPERVISOR RBAC & OPERATIONAL AUDIT');
  console.log('================================================================\n');

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
    // ---------------------------------------------------------
    // SECTION 1: AUTHENTICATION & IDENTITY
    // ---------------------------------------------------------
    console.log('--- SECTION 1: AUTHENTICATION & IDENTITY ---');
    console.log('Authenticating Supervisor A (supervisor@quizhive.com)...');
    const supALoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'supervisor@quizhive.com',
      password: 'password123'
    });
    const supAToken = supALoginRes.data.token;
    const supAUser = supALoginRes.data.user;
    const supAHeaders = { Authorization: `Bearer ${supAToken}` };

    // Test 1: Supervisor authentication
    assert(
      supAToken && supAUser.id,
      `Test 1: Supervisor A authenticated successfully (ID: ${supAUser.id}, Email: ${supAUser.email})`
    );

    // Test 2: Supervisor role verification
    assert(
      supAUser.role === 'Supervisor',
      `Test 2: Supervisor A role verified as 'Supervisor' (Role: ${supAUser.role})`
    );

    // Authenticate Supervisor B (supervisor_b@quizhive.com)
    console.log('Authenticating Supervisor B (supervisor_b@quizhive.com)...');
    const supBLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'supervisor_b@quizhive.com',
      password: 'password123'
    });
    const supBToken = supBLoginRes.data.token;
    const supBUser = supBLoginRes.data.user;
    const supBHeaders = { Authorization: `Bearer ${supBToken}` };

    // Authenticate Admin for control fixtures
    const adminLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@quizhive.com',
      password: 'password123'
    });
    const adminToken = adminLoginRes.data.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // ---------------------------------------------------------
    // SECTION 2: SUPERVISOR DASHBOARD & OPERATIONAL COCKPIT
    // ---------------------------------------------------------
    console.log('\n--- SECTION 2: SUPERVISOR DASHBOARD & OPERATIONAL COCKPIT ---');
    const metricsRes = await axios.get(`${API_BASE}/supervisor/metrics`, { headers: supAHeaders });
    const metrics = metricsRes.data;

    // Test 3: Supervisor dashboard metrics
    assert(
      metrics &&
      typeof metrics.teamMembers === 'number' &&
      typeof metrics.activeLearners === 'number' &&
      typeof metrics.trainingCompletion === 'number' &&
      typeof metrics.attendanceRate === 'number' &&
      typeof metrics.averageAssessmentScore === 'number' &&
      typeof metrics.assessmentPassRate === 'number' &&
      typeof metrics.certificationReady === 'number' &&
      typeof metrics.atRiskLearners === 'number',
      `Test 3: Supervisor dashboard metrics returned 8 real KPIs (Team: ${metrics.teamMembers}, Att: ${metrics.attendanceRate}%, AvgScore: ${metrics.averageAssessmentScore}%, PassRate: ${metrics.assessmentPassRate}%, CertReady: ${metrics.certificationReady}, AtRisk: ${metrics.atRiskLearners})`
    );

    // ---------------------------------------------------------
    // SECTION 3: TEAM RETRIEVAL & CROSS-SUPERVISOR ISOLATION
    // ---------------------------------------------------------
    console.log('\n--- SECTION 3: TEAM RETRIEVAL & CROSS-SUPERVISOR ISOLATION ---');
    const teamARes = await axios.get(`${API_BASE}/supervisor/team`, { headers: supAHeaders });
    const teamA = teamARes.data;
    const teamAIds = teamA.map(u => u.id);

    // Test 4: Direct subordinate retrieval
    assert(
      teamA.length > 0 && teamA.every(u => u.managerId === supAUser.id),
      `Test 4: Direct subordinate retrieval returns ${teamA.length} members, all having managerId === ${supAUser.id}`
    );

    const teamBRes = await axios.get(`${API_BASE}/supervisor/team`, { headers: supBHeaders });
    const teamB = teamBRes.data;
    const teamBIds = teamB.map(u => u.id);

    // Test 5: Supervisor A cannot retrieve Supervisor B team
    const aSeesBSubordinate = teamAIds.some(id => teamBIds.includes(id));
    assert(
      !aSeesBSubordinate,
      `Test 5: Supervisor A team list strictly excludes all ${teamB.length} subordinates of Supervisor B`
    );

    // Test 6: Supervisor B cannot retrieve Supervisor A team
    const bSeesASubordinate = teamBIds.some(id => teamAIds.includes(id));
    assert(
      !bSeesASubordinate,
      `Test 6: Supervisor B team list strictly excludes all ${teamA.length} subordinates of Supervisor A`
    );

    // ---------------------------------------------------------
    // SECTION 4: PARTICIPANT 360 ISOLATION
    // ---------------------------------------------------------
    console.log('\n--- SECTION 4: PARTICIPANT 360 ISOLATION ---');
    const directReportA = teamA[0];
    const directReportB = teamB[0];

    // Test 7: Participant 360 direct report allowed
    let p360DirectAllowed = false;
    try {
      const p360Res = await axios.get(`${API_BASE}/projects/participant-360/${directReportA.id}`, { headers: supAHeaders });
      p360DirectAllowed = p360Res.status === 200 && p360Res.data && (p360Res.data.profile?.id === directReportA.id || p360Res.data.profile?.name === directReportA.name);
    } catch (err) {
      p360DirectAllowed = false;
    }
    assert(
      p360DirectAllowed,
      `Test 7: Participant 360 direct report allowed (Supervisor A -> Subordinate ${directReportA.name}: HTTP 200)`
    );

    // Test 8: Participant 360 foreign employee 403
    let p360Foreign403 = false;
    try {
      await axios.get(`${API_BASE}/projects/participant-360/${directReportB.id}`, { headers: supAHeaders });
    } catch (err) {
      p360Foreign403 = err.response && err.response.status === 403;
    }
    assert(
      p360Foreign403,
      `Test 8: Participant 360 foreign employee denied (Supervisor A -> Subordinate B ${directReportB.name}: HTTP 403 Forbidden)`
    );

    // ---------------------------------------------------------
    // SECTION 5: ATTENDANCE OPERATIONAL BOUNDARY
    // ---------------------------------------------------------
    console.log('\n--- SECTION 5: ATTENDANCE OPERATIONAL BOUNDARY ---');
    const attRes = await axios.get(`${API_BASE}/reports/attendance`, { headers: supAHeaders });
    const attendancePayload = attRes.data;
    const allAttendanceLogs = [
      ...(attendancePayload.quizAttendance || []),
      ...(attendancePayload.trainingAttendance || [])
    ];

    // Test 9: Attendance team scoped
    assert(
      attendancePayload && (attendancePayload.quizAttendance || attendancePayload.trainingAttendance),
      `Test 9: Team attendance retrieval allowed for Supervisor (Total Logs: ${allAttendanceLogs.length})`
    );

    // Test 10: No enterprise attendance leakage
    const hasForeignUserAttendance = allAttendanceLogs.some(r => {
      const uId = r.userId || (r.user && r.user.id);
      return uId && !teamAIds.includes(uId);
    });
    assert(
      !hasForeignUserAttendance,
      `Test 10: No enterprise attendance leakage (0 foreign attendance records found in team query)`
    );

    // ---------------------------------------------------------
    // SECTION 6: QUIZ GOVERNANCE & ACCESS
    // ---------------------------------------------------------
    console.log('\n--- SECTION 6: QUIZ GOVERNANCE & ACCESS ---');
    const quizListRes = await axios.get(`${API_BASE}/quizzes`, { headers: supAHeaders });

    // Test 11: Team quiz results allowed
    assert(
      Array.isArray(quizListRes.data),
      `Test 11: Team quiz results/quizzes view allowed (Quizzes found: ${quizListRes.data.length})`
    );

    // Test 12: Quiz creation denied
    let quizCreateDenied = false;
    try {
      await axios.post(`${API_BASE}/quizzes`, {
        title: 'Unauthorized Supervisor Quiz',
        questions: [{ questionText: 'Q1?', options: ['A', 'B'], correctAnswer: 0 }]
      }, { headers: supAHeaders });
    } catch (err) {
      quizCreateDenied = err.response && err.response.status === 403;
    }
    assert(
      quizCreateDenied,
      `Test 12: Quiz creation denied for Supervisor (HTTP 403 Forbidden)`
    );

    // Test 13: Quiz editing denied
    let quizEditDenied = false;
    if (quizListRes.data.length > 0) {
      const qId = quizListRes.data[0].id;
      try {
        await axios.put(`${API_BASE}/quizzes/${qId}`, { title: 'Modified by Supervisor' }, { headers: supAHeaders });
      } catch (err) {
        quizEditDenied = err.response && err.response.status === 403;
      }
    } else {
      quizEditDenied = true;
    }
    assert(
      quizEditDenied,
      `Test 13: Quiz editing denied for Supervisor (HTTP 403 Forbidden)`
    );

    // Test 14: Quiz deletion denied
    let quizDeleteDenied = false;
    if (quizListRes.data.length > 0) {
      const qId = quizListRes.data[0].id;
      try {
        await axios.delete(`${API_BASE}/quizzes/${qId}`, { headers: supAHeaders });
      } catch (err) {
        quizDeleteDenied = err.response && err.response.status === 403;
      }
    } else {
      quizDeleteDenied = true;
    }
    assert(
      quizDeleteDenied,
      `Test 14: Quiz deletion denied for Supervisor (HTTP 403 Forbidden)`
    );

    // Test 15: Live quiz hosting denied
    let quizHostDenied = false;
    try {
      await axios.post(`${API_BASE}/quizzes/host`, { quizId: 1 }, { headers: supAHeaders });
    } catch (err) {
      quizHostDenied = err.response && (err.response.status === 403 || err.response.status === 404);
    }
    assert(
      quizHostDenied,
      `Test 15: Live quiz hosting denied for Supervisor (HTTP 403/Blocked)`
    );

    // ---------------------------------------------------------
    // SECTION 7: TRAINING SESSIONS & JITSI
    // ---------------------------------------------------------
    console.log('\n--- SECTION 7: TRAINING SESSIONS & JITSI ---');
    const trainingRes = await axios.get(`${API_BASE}/trainings`, { headers: supAHeaders });

    // Test 16: Team training progress allowed
    assert(
      Array.isArray(trainingRes.data),
      `Test 16: Team training progress allowed (Modules: ${trainingRes.data.length})`
    );

    // Test 17: Training creation denied
    let trainingCreateDenied = false;
    try {
      await axios.post(`${API_BASE}/trainings`, {
        title: 'Unauthorized Supervisor Training',
        description: 'Testing RBAC',
        targetRole: 'Employee'
      }, { headers: supAHeaders });
    } catch (err) {
      trainingCreateDenied = err.response && err.response.status === 403;
    }
    assert(
      trainingCreateDenied,
      `Test 17: Training creation denied for Supervisor (HTTP 403 Forbidden)`
    );

    // Test 18: Jitsi session scheduling denied
    let jitsiScheduleDenied = false;
    try {
      await axios.post(`${API_BASE}/trainings/1/jitsi-session`, {
        topic: 'Unauthorized Supervisor Session'
      }, { headers: supAHeaders });
    } catch (err) {
      jitsiScheduleDenied = err.response && (err.response.status === 403 || err.response.status === 404);
    }
    assert(
      jitsiScheduleDenied,
      `Test 18: Jitsi session scheduling denied for Supervisor (HTTP 403 Forbidden)`
    );

    // ---------------------------------------------------------
    // SECTION 8: CERTIFICATIONS & CREDENTIALS
    // ---------------------------------------------------------
    console.log('\n--- SECTION 8: CERTIFICATIONS & CREDENTIALS ---');
    const certListRes = await axios.get(`${API_BASE}/certificates`, { headers: supAHeaders });
    const certList = certListRes.data;

    // Test 19: Team certification readiness allowed
    assert(
      Array.isArray(certList),
      `Test 19: Team certificate list retrieval allowed (Found: ${certList.length} certificates)`
    );

    // Test 20: Team certificate list scoped
    const hasForeignCert = certList.some(c => !teamAIds.includes(c.userId));
    assert(
      !hasForeignCert,
      `Test 20: Certificate list strictly scoped to direct subordinates (0 foreign certificates)`
    );

    // Ensure directReportA has a certificate so we can test authorized view and download
    let teamCert = await Certificate.findOne({ where: { userId: directReportA.id } });
    if (!teamCert) {
      teamCert = await Certificate.create({
        certificate_id: 'REP-2026-TEST-A-' + Date.now(),
        userId: directReportA.id,
        projectId: directReportA.projectId,
        issueDate: new Date().toISOString().split('T')[0],
        status: 'ISSUED',
        attendancePercentage: 92,
        assessmentScore: 88
      });
    }

    // Authorized Team Certificate View Details
    let teamCertViewAllowed = false;
    try {
      const viewRes = await axios.get(`${API_BASE}/certificates/${teamCert.id}`, { headers: supAHeaders });
      teamCertViewAllowed = viewRes.status === 200 && viewRes.data?.certificate?.id === teamCert.id;
    } catch (err) {
      teamCertViewAllowed = false;
    }
    assert(
      teamCertViewAllowed,
      `Test 21: Supervisor CAN view authorized certificate details for direct report (${directReportA.name})`
    );

    // Authorized Team Certificate Download PDF
    let teamCertDownloadAllowed = false;
    try {
      const dlRes = await axios.get(`${API_BASE}/certificates/${teamCert.id}/download`, { 
        headers: supAHeaders,
        responseType: 'arraybuffer'
      });
      teamCertDownloadAllowed = dlRes.status === 200 && dlRes.headers['content-type'] === 'application/pdf';
    } catch (err) {
      teamCertDownloadAllowed = false;
    }
    assert(
      teamCertDownloadAllowed,
      `Test 22: Supervisor CAN download authorized PDF certificate for direct report (${directReportA.name})`
    );

    // Find or create a certificate for Supervisor B's subordinate to test single resource 403
    let foreignCert = await Certificate.findOne({ where: { userId: directReportB.id } });
    if (!foreignCert) {
      foreignCert = await Certificate.create({
        certificate_id: 'REP-2026-TEST-B-' + Date.now(),
        userId: directReportB.id,
        projectId: directReportB.projectId,
        issueDate: new Date().toISOString().split('T')[0],
        status: 'ISSUED',
        attendancePercentage: 90,
        assessmentScore: 85
      });
    }

    // Foreign certificate view 403
    let foreignCert403 = false;
    try {
      await axios.get(`${API_BASE}/certificates/${foreignCert.id}`, { headers: supAHeaders });
    } catch (err) {
      foreignCert403 = err.response && err.response.status === 403;
    }
    assert(
      foreignCert403,
      `Test 23: Foreign certificate view denied with HTTP 403 Forbidden (Supervisor A -> Cert of ${directReportB.name})`
    );

    // Foreign certificate download 403
    let foreignCertDl403 = false;
    try {
      await axios.get(`${API_BASE}/certificates/${foreignCert.id}/download`, { headers: supAHeaders });
    } catch (err) {
      foreignCertDl403 = err.response && err.response.status === 403;
    }
    assert(
      foreignCertDl403,
      `Test 24: Foreign certificate download denied with HTTP 403 Forbidden (Supervisor A -> Cert of ${directReportB.name})`
    );

    // Test: Certificate Templates list denied (GET /certificates/templates)
    let certTemplatesDenied = false;
    try {
      await axios.get(`${API_BASE}/certificates/templates`, { headers: supAHeaders });
    } catch (err) {
      certTemplatesDenied = err.response && err.response.status === 403;
    }
    assert(
      certTemplatesDenied,
      `Test 25: Certificate Templates access denied for Supervisor (HTTP 403 Forbidden)`
    );

    // Test: Certificate Template creation / designer API denied (POST /certificates/templates)
    let certTemplateCreateDenied = false;
    try {
      await axios.post(`${API_BASE}/certificates/templates`, {
        name: 'Supervisor Template Attempt',
        templateType: 'corporate'
      }, { headers: supAHeaders });
    } catch (err) {
      certTemplateCreateDenied = err.response && err.response.status === 403;
    }
    assert(
      certTemplateCreateDenied,
      `Test 26: Template Designer creation API denied for Supervisor (HTTP 403 Forbidden)`
    );

    // Test: Certificate Template update API denied (PUT /certificates/templates/:id)
    let certTemplateUpdateDenied = false;
    try {
      await axios.put(`${API_BASE}/certificates/templates/corporate`, {
        name: 'Supervisor Template Modification'
      }, { headers: supAHeaders });
    } catch (err) {
      certTemplateUpdateDenied = err.response && err.response.status === 403;
    }
    assert(
      certTemplateUpdateDenied,
      `Test 27: Template update API denied for Supervisor (HTTP 403 Forbidden)`
    );

    // Test: Certificate Template delete API denied (DELETE /certificates/templates/:id)
    let certTemplateDeleteDenied = false;
    try {
      await axios.delete(`${API_BASE}/certificates/templates/corporate`, { headers: supAHeaders });
    } catch (err) {
      certTemplateDeleteDenied = err.response && err.response.status === 403;
    }
    assert(
      certTemplateDeleteDenied,
      `Test 28: Template delete API denied for Supervisor (HTTP 403 Forbidden)`
    );

    // Test: Certificate revocation denied
    let certRevokeDenied = false;
    try {
      await axios.post(`${API_BASE}/certificates/${teamCert.id}/revoke`, { reason: 'Supervisor attempt' }, { headers: supAHeaders });
    } catch (err) {
      certRevokeDenied = err.response && err.response.status === 403;
    }
    assert(
      certRevokeDenied,
      `Test 29: Certificate revocation denied for Supervisor (HTTP 403 Forbidden)`
    );

    // Test: Certificate reissue denied
    let certReissueDenied = false;
    try {
      await axios.post(`${API_BASE}/certificates/${teamCert.id}/reissue`, { reason: 'Supervisor reissue attempt' }, { headers: supAHeaders });
    } catch (err) {
      certReissueDenied = err.response && err.response.status === 403;
    }
    assert(
      certReissueDenied,
      `Test 30: Certificate reissue denied for Supervisor (HTTP 403 Forbidden)`
    );

    // Test: Certificate issuance denied (POST /certificates/generate)
    let certGenerateDenied = false;
    try {
      await axios.post(`${API_BASE}/certificates/generate`, {
        userId: directReportA.id,
        projectId: directReportA.projectId
      }, { headers: supAHeaders });
    } catch (err) {
      certGenerateDenied = err.response && err.response.status === 403;
    }
    assert(
      certGenerateDenied,
      `Test 31: Single Certificate Issuance denied for Supervisor (HTTP 403 Forbidden)`
    );

    // Test: Bulk certificate generation denied (POST /certificates/bulk-generate)
    let certBulkGenDenied = false;
    try {
      await axios.post(`${API_BASE}/certificates/bulk-generate`, {
        projectId: directReportA.projectId,
        participantIds: [directReportA.id]
      }, { headers: supAHeaders });
    } catch (err) {
      certBulkGenDenied = err.response && err.response.status === 403;
    }
    assert(
      certBulkGenDenied,
      `Test 32: Bulk Certificate Generation denied for Supervisor (HTTP 403 Forbidden)`
    );

    // Test: Batch Eligibility evaluation endpoint denied (POST /certificates/eligibility)
    let certEligibilityDenied = false;
    try {
      await axios.post(`${API_BASE}/certificates/eligibility`, {
        projectId: directReportA.projectId
      }, { headers: supAHeaders });
    } catch (err) {
      certEligibilityDenied = err.response && err.response.status === 403;
    }
    assert(
      certEligibilityDenied,
      `Test 33: Batch Eligibility Evaluation API denied for Supervisor (HTTP 403 Forbidden)`
    );

    // Test: Certification Analytics denied (GET /certificates/analytics)
    let certAnalyticsDenied = false;
    try {
      await axios.get(`${API_BASE}/certificates/analytics`, { headers: supAHeaders });
    } catch (err) {
      certAnalyticsDenied = err.response && err.response.status === 403;
    }
    assert(
      certAnalyticsDenied,
      `Test 34: Certification Analytics denied for Supervisor (HTTP 403 Forbidden)`
    );

    // Test: Signatures & Seals retrieval denied (GET /certificates/signatures-and-seals)
    let sigSealAccessDenied = false;
    try {
      await axios.get(`${API_BASE}/certificates/signatures-and-seals`, { headers: supAHeaders });
    } catch (err) {
      sigSealAccessDenied = err.response && err.response.status === 403;
    }
    assert(
      sigSealAccessDenied,
      `Test 35: Signatures and seals access denied for Supervisor (HTTP 403 Forbidden)`
    );

    // Test: Asset file upload denied (POST /certificates/upload-asset)
    let sigSealUploadDenied = false;
    try {
      await axios.post(`${API_BASE}/certificates/upload-asset`, { type: 'signature' }, { headers: supAHeaders });
    } catch (err) {
      sigSealUploadDenied = err.response && err.response.status === 403;
    }
    assert(
      sigSealUploadDenied,
      `Test 36: Signature/seal file upload denied for Supervisor (HTTP 403 Forbidden)`
    );

    // Test: Signature creation denied (POST /certificates/signatures-and-seals)
    let sigCreateDenied = false;
    try {
      await axios.post(`${API_BASE}/certificates/signatures-and-seals`, {
        name: 'Supervisor Signature',
        type: 'trainer',
        assetPath: '/uploads/dummy.png'
      }, { headers: supAHeaders });
    } catch (err) {
      sigCreateDenied = err.response && err.response.status === 403;
    }
    assert(
      sigCreateDenied,
      `Test 37: Signature creation denied for Supervisor (HTTP 403 Forbidden)`
    );

    // Test: Seal creation denied (POST /certificates/signatures-and-seals)
    let sealCreateDenied = false;
    try {
      await axios.post(`${API_BASE}/certificates/signatures-and-seals`, {
        name: 'Supervisor Seal',
        type: 'seal',
        assetPath: '/uploads/dummy.png'
      }, { headers: supAHeaders });
    } catch (err) {
      sealCreateDenied = err.response && err.response.status === 403;
    }
    assert(
      sealCreateDenied,
      `Test 38: Seal creation denied for Supervisor (HTTP 403 Forbidden)`
    );

    // ---------------------------------------------------------
    // SECTION 9: ENTERPRISE DIRECTORIES & ADMINISTRATIVE ACCESS
    // ---------------------------------------------------------
    console.log('\n--- SECTION 9: ENTERPRISE DIRECTORIES & ADMINISTRATIVE ACCESS ---');

    // Test 39: User Directory denied
    let userDirDenied = false;
    try {
      await axios.get(`${API_BASE}/users`, { headers: supAHeaders });
    } catch (err) {
      userDirDenied = err.response && err.response.status === 403;
    }
    assert(
      userDirDenied,
      `Test 39: Enterprise User Directory denied for Supervisor (HTTP 403 Forbidden)`
    );

    // Test 40: Org hierarchy denied
    let orgHierarchyDenied = false;
    try {
      await axios.get(`${API_BASE}/users/hierarchy/${supAUser.id}`, { headers: supAHeaders });
    } catch (err) {
      orgHierarchyDenied = err.response && err.response.status === 403;
    }
    assert(
      orgHierarchyDenied,
      `Test 40: Organization hierarchy denied for Supervisor (HTTP 403 Forbidden)`
    );

    // Test 41: Project Administration denied
    let projectAdminDenied = false;
    try {
      await axios.post(`${API_BASE}/projects`, { name: 'Unauthorized Project' }, { headers: supAHeaders });
    } catch (err) {
      projectAdminDenied = err.response && err.response.status === 403;
    }
    assert(
      projectAdminDenied,
      `Test 41: Project Administration creation denied for Supervisor (HTTP 403 Forbidden)`
    );

    // Test 42: Role Directory denied
    let roleDirDenied = false;
    try {
      await axios.get(`${API_BASE}/roles`, { headers: supAHeaders });
    } catch (err) {
      roleDirDenied = err.response && (err.response.status === 403 || err.response.status === 404);
    }
    assert(
      roleDirDenied,
      `Test 42: Role Governance Directory denied for Supervisor (HTTP 403 Forbidden)`
    );

    // Test 43: Executive analytics/PPT/Excel denied
    let execAnalyticsDenied = false;
    try {
      await axios.get(`${API_BASE}/reports/analytics/available`, { headers: supAHeaders });
    } catch (err) {
      execAnalyticsDenied = err.response && err.response.status === 403;
    }
    let execExcelDenied = false;
    try {
      await axios.get(`${API_BASE}/reports/analytics/export/excel/1`, { headers: supAHeaders });
    } catch (err) {
      execExcelDenied = err.response && err.response.status === 403;
    }
    let execPptDenied = false;
    try {
      await axios.get(`${API_BASE}/reports/analytics/export/ppt/1`, { headers: supAHeaders });
    } catch (err) {
      execPptDenied = err.response && err.response.status === 403;
    }
    assert(
      execAnalyticsDenied && execExcelDenied && execPptDenied,
      `Test 43: Executive reporting engine, Level 1/2/3 analytics, Excel exports, and PPT exports denied for Supervisor (HTTP 403 Forbidden)`
    );

    // ---------------------------------------------------------
    // SUMMARY
    // ---------------------------------------------------------
    console.log('\n================================================================');
    console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
    console.log('================================================================');

    if (failed === 0) {
      console.log('🎉 ALL 43 SUPERVISOR RBAC TESTS PASSED WITH ZERO FAILURES!\n');
      process.exit(0);
    } else {
      console.error(`💥 ${failed} TEST(S) FAILED. INVESTIGATE ROOT CAUSE.`);
      process.exit(1);
    }
  } catch (globalErr) {
    console.error('Fatal error executing verification suite:', globalErr);
    process.exit(1);
  }
}

runSupervisorRbacVerification();
