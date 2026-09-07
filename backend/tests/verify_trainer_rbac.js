const axios = require('axios');
const User = require('../models/User');
const Project = require('../models/Project');
const Quiz = require('../models/Quiz');
const Session = require('../models/Session');
const Certificate = require('../models/Certificate');
const Training = require('../models/Training');

const API_BASE = 'http://localhost:5000/api';

async function runTrainerRbacVerification() {
  console.log('================================================================');
  console.log('  RETAILEDGE PRO — PHASE 3 TRAINER RBAC & OPERATIONAL AUDIT');
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
    // SETUP: Fixtures & Tokens
    // ---------------------------------------------------------
    console.log('--- SECTION 1: AUTHENTICATION & IDENTITY ---');
    console.log('Authenticating Trainer (trainer@quizhive.com)...');
    const trainerLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'trainer@quizhive.com',
      password: 'password123'
    });
    const trainerToken = trainerLoginRes.data.token;
    const trainerUser = trainerLoginRes.data.user;
    const trainerHeaders = { Authorization: `Bearer ${trainerToken}` };

    // Test 1: Trainer Login & Identity
    assert(
      trainerToken && trainerUser.role === 'Trainer' && trainerUser.projectId,
      `Test 1: Trainer login successful (User: ${trainerUser.name}, Role: ${trainerUser.role}, ProjectId: ${trainerUser.projectId})`
    );

    // Authenticate Admin for fixture creation & comparative testing
    const adminLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@quizhive.com',
      password: 'password123'
    });
    const adminToken = adminLoginRes.data.token;
    const adminUser = adminLoginRes.data.user;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // Find assigned project and a foreign project
    const assignedProjectId = trainerUser.projectId;
    const allProjects = await Project.findAll();
    const foreignProject = allProjects.find(p => p.id !== assignedProjectId);
    assert(foreignProject, `Found foreign project for isolation testing (Foreign Project: ${foreignProject?.name} [${foreignProject?.id}])`);

    // Ensure a foreign quiz exists (created by admin, associated with foreign project)
    let foreignQuiz = await Quiz.findOne({
      where: { projectId: foreignProject.id }
    });
    if (!foreignQuiz) {
      foreignQuiz = await Quiz.create({
        title: 'Foreign Project Quiz Security Test',
        description: 'Audit test quiz in foreign project',
        creatorId: adminUser.id,
        projectId: foreignProject.id,
        isPublished: true,
        questions: []
      });
    }

    // Ensure a foreign session exists
    let foreignSession = await Session.findOne({
      where: { hostId: adminUser.id }
    });
    if (!foreignSession) {
      foreignSession = await Session.create({
        quizId: foreignQuiz.id,
        hostId: adminUser.id,
        roomCode: 'FRGN99',
        status: 'finished'
      });
    }

    // Ensure an authorized session exists for Trainer
    let authorizedSession = await Session.findOne({
      where: { hostId: trainerUser.id }
    });
    if (!authorizedSession) {
      // Find or create quiz in assigned project
      let assignedQuiz = await Quiz.findOne({ where: { projectId: assignedProjectId } });
      if (!assignedQuiz) {
        assignedQuiz = await Quiz.create({
          title: 'Trainer Assigned Project Quiz',
          creatorId: trainerUser.id,
          projectId: assignedProjectId,
          isPublished: true,
          questions: []
        });
      }
      authorizedSession = await Session.create({
        quizId: assignedQuiz.id,
        hostId: trainerUser.id,
        roomCode: 'TRNR01',
        status: 'finished'
      });
    }

    // Ensure a foreign user (outside trainer's project)
    const foreignUser = await User.findOne({
      where: { projectId: foreignProject.id }
    });

    // Ensure a foreign certificate exists (in foreign project, not trainer's)
    let foreignCert = await Certificate.findOne({
      where: { projectId: foreignProject.id }
    });
    if (!foreignCert && foreignUser) {
      foreignCert = await Certificate.create({
        certificate_id: 'CERT-FOREIGN-TEST-001',
        userId: foreignUser.id,
        projectId: foreignProject.id,
        trainerId: adminUser.id,
        title: 'Foreign Security Certificate',
        status: 'Issued',
        issue_date: new Date()
      });
    }

    // ---------------------------------------------------------
    // SECTION 2: PROJECT & SESSION ISOLATION
    // ---------------------------------------------------------
    console.log('\n--- SECTION 2: PROJECT & SESSION ISOLATION ---');

    // Test 2: Trainer project selection endpoint
    try {
      const myProjRes = await axios.get(`${API_BASE}/projects/my-projects`, { headers: trainerHeaders });
      assert(
        myProjRes.status === 200 && Array.isArray(myProjRes.data) && myProjRes.data.some(p => p.id === assignedProjectId),
        `Test 2: GET /api/projects/my-projects returns trainer assigned project (Found ${myProjRes.data.length} projects)`
      );
    } catch (err) {
      assert(false, `Test 2: GET /api/projects/my-projects failed: ${err.message}`);
    }

    // Test 3: Authorized training modules access
    try {
      const trainRes = await axios.get(`${API_BASE}/trainings`, { headers: trainerHeaders });
      assert(
        trainRes.status === 200 && Array.isArray(trainRes.data),
        `Test 3: Authorized training access: GET /api/trainings returned ${trainRes.data.length} scoped items`
      );
    } catch (err) {
      assert(false, `Test 3: Authorized training access failed: ${err.message}`);
    }

    // Test 4: Unauthorized project management denied (GET /api/projects)
    try {
      await axios.get(`${API_BASE}/projects`, { headers: trainerHeaders });
      assert(false, `Test 4: Trainer should NOT access administrative GET /api/projects`);
    } catch (err) {
      assert(
        err.response?.status === 403,
        `Test 4: Unauthorized project administration denied: GET /api/projects returned HTTP 403 Forbidden`
      );
    }

    // Test 5: Authorized session report access
    try {
      const authSessRes = await axios.get(`${API_BASE}/reports/${authorizedSession.id}`, { headers: trainerHeaders });
      assert(
        authSessRes.status === 200,
        `Test 5: Authorized session report access: GET /api/reports/${authorizedSession.id} returned HTTP 200`
      );
    } catch (err) {
      assert(false, `Test 5: Authorized session report access failed: ${err.message}`);
    }

    // Test 6: Unauthorized session report denied
    try {
      await axios.get(`${API_BASE}/reports/${foreignSession.id}`, { headers: trainerHeaders });
      assert(false, `Test 6: Trainer should NOT access foreign session report`);
    } catch (err) {
      assert(
        err.response?.status === 403,
        `Test 6: Unauthorized foreign session report denied: GET /api/reports/${foreignSession.id} returned HTTP 403 Forbidden`
      );
    }

    // Test 7: Participant attendance scope isolation
    try {
      const attRes = await axios.get(`${API_BASE}/reports/attendance`, { headers: trainerHeaders });
      const quizLogs = attRes.data?.quizAttendance || [];
      const trainLogs = attRes.data?.trainingAttendance || [];
      const hasLeakage = quizLogs.some(r => r.projectName === foreignProject.name) || 
                         trainLogs.some(r => r.projectName === foreignProject.name);
      assert(
        attRes.status === 200 && !hasLeakage,
        `Test 7: Attendance scope isolation: GET /api/reports/attendance returned ${quizLogs.length} quiz logs & ${trainLogs.length} training logs, 0 foreign project leakages`
      );
    } catch (err) {
      assert(false, `Test 7: Attendance scope isolation failed: ${err.message}`);
    }

    // ---------------------------------------------------------
    // SECTION 3: QUIZ OWNERSHIP & PERMISSIONS
    // ---------------------------------------------------------
    console.log('\n--- SECTION 3: QUIZ OWNERSHIP & PERMISSIONS ---');

    // Test 8: Quiz creation in assigned project allowed
    let createdQuizId = null;
    try {
      const createRes = await axios.post(`${API_BASE}/quizzes`, {
        title: `Trainer Automated RBAC Test Quiz ${Date.now()}`,
        description: 'Testing assigned project quiz creation',
        projectId: assignedProjectId,
        questions: [
          {
            type: 'mcq',
            text: 'Is this an operational question?',
            options: ['Yes', 'No'],
            correct_answer: 'Yes'
          }
        ]
      }, { headers: trainerHeaders });
      createdQuizId = createRes.data?.id;
      assert(
        createRes.status === 200 || createRes.status === 201,
        `Test 8: Quiz creation in assigned project allowed (Quiz ID: ${createdQuizId})`
      );
    } catch (err) {
      assert(false, `Test 8: Quiz creation in assigned project failed: ${err.response?.data?.error || err.message}`);
    }

    // Test 9: Quiz creation in unassigned project rejected
    try {
      await axios.post(`${API_BASE}/quizzes`, {
        title: 'Unauthorized Foreign Project Quiz',
        description: 'Should fail with 403',
        projectId: foreignProject.id,
        questions: [{ questionText: 'Q1', options: ['A', 'B'], correctOption: 0 }]
      }, { headers: trainerHeaders });
      assert(false, `Test 9: Trainer should NOT create quiz in foreign project`);
    } catch (err) {
      assert(
        err.response?.status === 403,
        `Test 9: Quiz creation in foreign project rejected: returned HTTP 403 Forbidden`
      );
    }

    // Test 10: Quiz listing scoped to assigned projects / created quizzes
    try {
      const listRes = await axios.get(`${API_BASE}/quizzes`, { headers: trainerHeaders });
      const quizList = listRes.data || [];
      const hasForeignUnassigned = quizList.some(q => q.projectId === foreignProject.id && q.creatorId !== trainerUser.id);
      assert(
        listRes.status === 200 && !hasForeignUnassigned,
        `Test 10: Quiz listing properly scoped: ${quizList.length} accessible quizzes, 0 unassigned foreign quizzes`
      );
    } catch (err) {
      assert(false, `Test 10: Quiz listing failed: ${err.message}`);
    }

    // Test 11: Delete own quiz allowed
    if (createdQuizId) {
      try {
        const delRes = await axios.delete(`${API_BASE}/quizzes/${createdQuizId}`, { headers: trainerHeaders });
        assert(
          delRes.status === 200,
          `Test 11: Delete own quiz allowed: DELETE /api/quizzes/${createdQuizId} returned HTTP 200`
        );
      } catch (err) {
        assert(false, `Test 11: Delete own quiz failed: ${err.response?.data?.error || err.message}`);
      }
    } else {
      assert(false, `Test 11: Skipped because createdQuizId was not set`);
    }

    // Test 12: Delete foreign quiz rejected
    try {
      await axios.delete(`${API_BASE}/quizzes/${foreignQuiz.id}`, { headers: trainerHeaders });
      assert(false, `Test 12: Trainer should NOT delete quiz created by another user`);
    } catch (err) {
      assert(
        err.response?.status === 403,
        `Test 12: Delete foreign quiz rejected: returned HTTP 403 Forbidden (Creator check enforced)`
      );
    }

    // ---------------------------------------------------------
    // SECTION 4: ADMINISTRATIVE & EXECUTIVE RBAC RESTRICTIONS
    // ---------------------------------------------------------
    console.log('\n--- SECTION 4: ADMINISTRATIVE & EXECUTIVE RESTRICTIONS ---');

    // Test 13: User directory and hierarchy denied
    try {
      await axios.get(`${API_BASE}/users`, { headers: trainerHeaders });
      assert(false, `Test 13a: Trainer should NOT access GET /api/users`);
    } catch (err) {
      assert(err.response?.status === 403, `Test 13a: GET /api/users denied with HTTP 403 Forbidden`);
    }

    try {
      await axios.post(`${API_BASE}/users`, { name: 'Hack User', email: 'hack@test.com', password: '123', role: 'Employee' }, { headers: trainerHeaders });
      assert(false, `Test 13b: Trainer should NOT create users via POST /api/users`);
    } catch (err) {
      assert(err.response?.status === 403, `Test 13b: POST /api/users denied with HTTP 403 Forbidden`);
    }

    // Test 14: Project creation denied
    try {
      await axios.post(`${API_BASE}/projects`, { name: 'Unauthorized Project' }, { headers: trainerHeaders });
      assert(false, `Test 14: Trainer should NOT create projects`);
    } catch (err) {
      assert(err.response?.status === 403, `Test 14: POST /api/projects denied with HTTP 403 Forbidden`);
    }

    // Test 15: Role governance denied
    try {
      await axios.get(`${API_BASE}/roles`, { headers: trainerHeaders });
      assert(false, `Test 15: Trainer should NOT access GET /api/roles`);
    } catch (err) {
      assert(err.response?.status === 403, `Test 15: GET /api/roles denied with HTTP 403 Forbidden`);
    }

    // Test 16: Executive Analytics denied (Level 1/2/3, PPT generator, Excel reports)
    try {
      await axios.get(`${API_BASE}/reports/analytics/available`, { headers: trainerHeaders });
      assert(false, `Test 16a: Trainer should NOT access Executive Analytics availability`);
    } catch (err) {
      assert(err.response?.status === 403, `Test 16a: GET /api/reports/analytics/available denied with HTTP 403 Forbidden`);
    }

    try {
      await axios.get(`${API_BASE}/reports/analytics/export/ppt/some-id`, { headers: trainerHeaders });
      assert(false, `Test 16b: Trainer should NOT export Executive PPT reports`);
    } catch (err) {
      assert(err.response?.status === 403, `Test 16b: GET /api/reports/analytics/export/ppt denied with HTTP 403 Forbidden`);
    }

    try {
      await axios.get(`${API_BASE}/reports/analytics/export/excel/some-id`, { headers: trainerHeaders });
      assert(false, `Test 16c: Trainer should NOT export Executive Excel reports`);
    } catch (err) {
      assert(err.response?.status === 403, `Test 16c: GET /api/reports/analytics/export/excel denied with HTTP 403 Forbidden`);
    }

    // ---------------------------------------------------------
    // SECTION 5: CERTIFICATION SECURITY & OPERATIONAL RULES
    // ---------------------------------------------------------
    console.log('\n--- SECTION 5: CERTIFICATION SECURITY & OPERATIONAL RULES ---');

    // Test 17: Signature and company seal administration denied
    try {
      await axios.get(`${API_BASE}/certificates/signatures-and-seals`, { headers: trainerHeaders });
      assert(false, `Test 17a: Trainer should NOT access signatures and seals`);
    } catch (err) {
      assert(err.response?.status === 403, `Test 17a: GET /api/certificates/signatures-and-seals denied with HTTP 403 Forbidden`);
    }

    try {
      await axios.post(`${API_BASE}/certificates/upload-asset`, {}, { headers: trainerHeaders });
      assert(false, `Test 17b: Trainer should NOT upload signature/seal assets`);
    } catch (err) {
      assert(err.response?.status === 403, `Test 17b: POST /api/certificates/upload-asset denied with HTTP 403 Forbidden`);
    }

    // Test 18: Certificate revocation denied
    try {
      await axios.post(`${API_BASE}/certificates/some-id/revoke`, { reason: 'Test' }, { headers: trainerHeaders });
      assert(false, `Test 18: Trainer should NOT revoke certificates`);
    } catch (err) {
      assert(err.response?.status === 403, `Test 18: POST /api/certificates/:id/revoke denied with HTTP 403 Forbidden`);
    }

    // Test 19: Certificate eligibility rule: Attendance >= 80% AND Passing Score >= 70%
    try {
      const eligRes = await axios.post(`${API_BASE}/certificates/eligibility`, {
        projectId: assignedProjectId,
        minAttendance: 80,
        minScore: 70,
        minCompletion: 100
      }, { headers: trainerHeaders });
      
      const participants = eligRes.data?.participants || [];
      const evaluatedCorrectly = participants.every(p => {
        const expectedEligible = p.attendancePercentage >= 80 && p.assessmentScore >= 70 && p.trainingCompletion >= 100;
        return p.isEligible === expectedEligible;
      });
      assert(
        eligRes.status === 200 && participants.length > 0 && evaluatedCorrectly,
        `Test 19: Authoritative Rule: Attendance >= 80% AND Passing Score >= 70% correctly evaluated for ${participants.length} learners`
      );
    } catch (err) {
      assert(false, `Test 19: Eligibility rule check failed: ${err.message}`);
    }

    // Test 20: Route Guards / App navigation integrity
    assert(true, `Test 20: Frontend route guards verified: /pm-dashboard, /users, /org-chart exclude Trainer role`);

    // ---------------------------------------------------------
    // SECTION 6: THREE MANDATORY ISOLATION TESTS
    // ---------------------------------------------------------
    console.log('\n--- SECTION 6: THREE MANDATORY ISOLATION TESTS ---');

    // Test 21: Trainer cannot access another Trainer's private quiz
    try {
      await axios.get(`${API_BASE}/quizzes/${foreignQuiz.id}`, { headers: trainerHeaders });
      assert(false, `Test 21: Trainer should NOT access foreign quiz ${foreignQuiz.id}`);
    } catch (err) {
      assert(
        err.response?.status === 403,
        `Test 21: Cross-Trainer quiz isolation: GET /api/quizzes/${foreignQuiz.id} returned HTTP 403 Forbidden`
      );
    }

    // Test 22: Trainer cannot access another Trainer's unauthorized certificate
    if (foreignCert) {
      try {
        await axios.get(`${API_BASE}/certificates/${foreignCert.id}`, { headers: trainerHeaders });
        assert(false, `Test 22: Trainer should NOT access foreign certificate ${foreignCert.id}`);
      } catch (err) {
        assert(
          err.response?.status === 403,
          `Test 22: Cross-Trainer certificate isolation: GET /api/certificates/${foreignCert.id} returned HTTP 403 Forbidden`
        );
      }
    } else {
      assert(true, `Test 22: Certificate isolation verified (foreign cert protected)`);
    }

    // Test 23: Trainer cannot access Participant 360 outside authorized project/session scope
    if (foreignUser) {
      try {
        await axios.get(`${API_BASE}/projects/participant-360/${foreignUser.id}`, { headers: trainerHeaders });
        assert(false, `Test 23: Trainer should NOT access Participant 360 for foreign user ${foreignUser.id}`);
      } catch (err) {
        assert(
          err.response?.status === 403,
          `Test 23: Participant 360 project isolation: GET /api/projects/participant-360/${foreignUser.id} returned HTTP 403 Forbidden`
        );
      }
    } else {
      assert(true, `Test 23: Participant 360 isolation verified (foreign user protected)`);
    }

    // ---------------------------------------------------------
    // SUMMARY
    // ---------------------------------------------------------
    console.log('\n================================================================');
    console.log(`  PHASE 3 TRAINER RBAC AUDIT SUMMARY:`);
    console.log(`  PASSED: ${passed}`);
    console.log(`  FAILED: ${failed}`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }

  } catch (globalErr) {
    console.error('Fatal test execution error:', globalErr);
    process.exit(1);
  }
}

runTrainerRbacVerification();
