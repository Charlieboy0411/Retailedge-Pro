const axios = require('axios');
const User = require('../models/User');
const Project = require('../models/Project');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Certificate = require('../models/Certificate');
const Training = require('../models/Training');
const ReportAudit = require('../models/ReportAudit');
const Session = require('../models/Session');
const Participant = require('../models/Participant');
const Response = require('../models/Response');

const API_BASE = 'http://localhost:5000/api';

async function runTDRbacVerification() {
  console.log('================================================================');
  console.log('  RETAILEDGE PRO — PHASE 6 T&D MANAGER RBAC & GOVERNANCE AUDIT');
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
    console.log('Authenticating T&D Manager A (charles@idonneous.com)...');
    const tdALogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'charles@idonneous.com',
      password: 'password123'
    });
    const tdAToken = tdALogin.data.token;
    const tdAUser = tdALogin.data.user;
    const tdAHeaders = { Authorization: `Bearer ${tdAToken}` };

    assert(
      tdAToken && tdAUser.id,
      `Test 1: T&D Manager A authenticated successfully (ID: ${tdAUser.id}, Email: ${tdAUser.email})`
    );

    assert(
      tdAUser.role === 'T&D Manager',
      `Test 2: T&D Manager A role verified as 'T&D Manager' (Role: ${tdAUser.role})`
    );

    console.log('Authenticating T&D Manager B (td@quizhive.com)...');
    const tdBLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'td@quizhive.com',
      password: 'password123'
    });
    const tdBToken = tdBLogin.data.token;
    const tdBUser = tdBLogin.data.user;
    const tdBHeaders = { Authorization: `Bearer ${tdBToken}` };

    assert(
      tdBToken && tdBUser.id,
      `Test 3: T&D Manager B authenticated successfully (ID: ${tdBUser.id}, Email: ${tdBUser.email})`
    );

    assert(
      tdBUser.role === 'T&D Manager',
      `Test 4: T&D Manager B role verified as 'T&D Manager' (Role: ${tdBUser.role})`
    );

    console.log('Authenticating Admin for control fixtures...');
    const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@quizhive.com',
      password: 'password123'
    });
    const adminHeaders = { Authorization: `Bearer ${adminLogin.data.token}` };

    assert(
      adminLogin.data.token,
      `Test 5: Admin authenticated for test fixture setup`
    );

    console.log('Authenticating Trainer control account...');
    const trainerLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'trainer@quizhive.com',
      password: 'password123'
    });
    const trainerHeaders = { Authorization: `Bearer ${trainerLogin.data.token}` };

    assert(
      trainerLogin.data.token,
      `Test 6: Trainer authenticated for delivery controls`
    );

    // ---------------------------------------------------------
    // SECTION 2: CAPABILITY PORTFOLIO ISOLATION & PROJECT SCOPING
    // ---------------------------------------------------------
    console.log('\n--- SECTION 2: CAPABILITY PORTFOLIO ISOLATION & PROJECT SCOPING ---');

    // Fetch Charles's authorized projects
    const tdAProjectsRes = await axios.get(`${API_BASE}/td/projects`, { headers: tdAHeaders });
    const tdAProjectIds = tdAProjectsRes.data.map(p => p.id);

    assert(
      Array.isArray(tdAProjectsRes.data) && tdAProjectsRes.data.length > 0,
      `Test 7: GET /api/td/projects returns authorized capability portfolio (${tdAProjectsRes.data.length} projects)`
    );

    const DEMO1_PROJECT_ID = 'b25600ee-a0a5-49d5-8978-46e9167beeb5';
    assert(
      !tdAProjectIds.includes(DEMO1_PROJECT_ID),
      `Test 8: Demo 1 project strictly excluded from T&D Manager A's portfolio`
    );

    // Fetch Demo T&D's authorized projects
    const tdBProjectsRes = await axios.get(`${API_BASE}/td/projects`, { headers: tdBHeaders });
    const tdBProjectIds = tdBProjectsRes.data.map(p => p.id);

    assert(
      tdBProjectIds.includes(DEMO1_PROJECT_ID),
      `Test 9: GET /api/td/projects for T&D Manager B includes Demo 1 project`
    );

    const IDONNEOUS_PROJECT_ID = '1c4c15a4-88fa-4624-a45a-a97a9fac7907';
    assert(
      !tdBProjectIds.includes(IDONNEOUS_PROJECT_ID),
      `Test 10: Idonneous project strictly excluded from T&D Manager B's portfolio`
    );

    // Foreign project query on cockpit throws 403
    let foreignCockpitBlocked = false;
    try {
      await axios.get(`${API_BASE}/td/cockpit?projectId=${DEMO1_PROJECT_ID}`, { headers: tdAHeaders });
    } catch (err) {
      if (err.response && err.response.status === 403) foreignCockpitBlocked = true;
    }
    assert(
      foreignCockpitBlocked,
      `Test 11: GET /api/td/cockpit with foreign projectId returns HTTP 403 Forbidden`
    );

    // Foreign subproject query on cockpit throws 403
    let foreignSubCockpitBlocked = false;
    try {
      await axios.get(`${API_BASE}/td/cockpit?subProjectId=${DEMO1_PROJECT_ID}`, { headers: tdAHeaders });
    } catch (err) {
      if (err.response && err.response.status === 403) foreignSubCockpitBlocked = true;
    }
    assert(
      foreignSubCockpitBlocked,
      `Test 12: GET /api/td/cockpit with foreign subProjectId returns HTTP 403 Forbidden`
    );

    // GET /api/projects returns only authorized projects
    const allProjRes = await axios.get(`${API_BASE}/projects`, { headers: tdAHeaders });
    const allProjIds = allProjRes.data.map(p => p.id);
    assert(
      !allProjIds.includes(DEMO1_PROJECT_ID),
      `Test 13: GET /api/projects collection only returns authorized portfolio projects (Foreign Demo 1 excluded)`
    );

    // POST /api/projects blocked for T&D Manager
    let projectCreationBlocked = false;
    try {
      await axios.post(`${API_BASE}/projects`, { name: 'Unauthorized Proj', project_code: 'UNAUTH' }, { headers: tdAHeaders });
    } catch (err) {
      if (err.response && err.response.status === 403) projectCreationBlocked = true;
    }
    assert(
      projectCreationBlocked,
      `Test 14: POST /api/projects (enterprise project creation) blocked with HTTP 403 Forbidden`
    );

    // ---------------------------------------------------------
    // SECTION 3: T&D CAPABILITY COCKPIT INTELLIGENCE (9 REAL KPIS)
    // ---------------------------------------------------------
    console.log('\n--- SECTION 3: T&D CAPABILITY COCKPIT INTELLIGENCE ---');

    const cockpitRes = await axios.get(`${API_BASE}/td/cockpit`, { headers: tdAHeaders });
    const kpis = cockpitRes.data.kpis;

    assert(
      kpis && typeof kpis === 'object',
      `Test 15: Cockpit returns KPI metrics object`
    );

    assert(
      typeof kpis.totalLearners === 'number' && kpis.totalLearners >= 0,
      `Test 16: KPI 1: totalLearners is real numeric DB value (${kpis.totalLearners})`
    );

    assert(
      typeof kpis.activeModules === 'number' && kpis.activeModules >= 0,
      `Test 17: KPI 2: activeModules is real numeric DB value (${kpis.activeModules})`
    );

    assert(
      typeof kpis.activeQuizzes === 'number' && kpis.activeQuizzes >= 0,
      `Test 18: KPI 3: activeQuizzes is real numeric DB value (${kpis.activeQuizzes})`
    );

    assert(
      kpis.curriculumCompletionRate === null || (typeof kpis.curriculumCompletionRate === 'number' && kpis.curriculumCompletionRate >= 0 && kpis.curriculumCompletionRate <= 100),
      `Test 19: KPI 4: curriculumCompletionRate satisfies semantic schema (null for unassigned or 0-100%) (Value: ${kpis.curriculumCompletionRate})`
    );

    assert(
      kpis.attendanceRate === null || (typeof kpis.attendanceRate === 'number' && kpis.attendanceRate >= 0 && kpis.attendanceRate <= 100),
      `Test 20: KPI 5: attendanceRate satisfies semantic schema (null for no attendance or 0-100%) (Value: ${kpis.attendanceRate})`
    );

    assert(
      kpis.assessmentAverageScore === null || (typeof kpis.assessmentAverageScore === 'number' && kpis.assessmentAverageScore >= 0 && kpis.assessmentAverageScore <= 100),
      `Test 21: KPI 6: assessmentAverageScore satisfies semantic schema (null for unassessed or 0-100%) (Value: ${kpis.assessmentAverageScore})`
    );

    assert(
      kpis.assessmentPassRate === null || (typeof kpis.assessmentPassRate === 'number' && kpis.assessmentPassRate >= 0 && kpis.assessmentPassRate <= 100),
      `Test 22: KPI 7: assessmentPassRate satisfies semantic schema (null for unassessed or 0-100%) (Value: ${kpis.assessmentPassRate})`
    );

    assert(
      typeof kpis.certificatesIssued === 'number' && kpis.certificatesIssued >= 0,
      `Test 23: KPI 8: certificatesIssued is real count (${kpis.certificatesIssued})`
    );

    assert(
      typeof kpis.skillDeficitsCount === 'number' && kpis.skillDeficitsCount >= 0,
      `Test 24: KPI 9: skillDeficitsCount is real triage count (${kpis.skillDeficitsCount})`
    );

    assert(
      Array.isArray(cockpitRes.data.capabilityMatrix),
      `Test 25: Cockpit returns Capability Framework Matrix array`
    );

    // ---------------------------------------------------------
    // SECTION 4: TRAINING CURRICULUM GOVERNANCE (FULL CRUD)
    // ---------------------------------------------------------
    console.log('\n--- SECTION 4: TRAINING CURRICULUM GOVERNANCE (FULL CRUD) ---');

    // GET /api/trainings returns only authorized
    const trainingsRes = await axios.get(`${API_BASE}/trainings`, { headers: tdAHeaders });
    const trainingProjectIds = trainingsRes.data.map(t => t.projectId).filter(Boolean);

    assert(
      !trainingProjectIds.includes(DEMO1_PROJECT_ID),
      `Test 26: GET /api/trainings returns only authorized curriculum items (Demo 1 trainings excluded)`
    );

    // POST /api/trainings in authorized project
    let createdTrainingId = null;
    try {
      const newTrainingRes = await axios.post(`${API_BASE}/trainings`, {
        title: 'T&D Governed Curriculum Module 101',
        description: 'Advanced retail merchandising standards',
        type: 'Video',
        url: 'https://example.com/curriculum-video.mp4',
        duration: '15 mins',
        projectId: IDONNEOUS_PROJECT_ID
      }, { headers: tdAHeaders });

      createdTrainingId = newTrainingRes.data.id;
      assert(
        createdTrainingId && newTrainingRes.status === 201,
        `Test 27: POST /api/trainings creates module in authorized project (ID: ${createdTrainingId})`
      );
    } catch (e) {
      assert(false, `Test 27: POST /api/trainings failed: ${e.message}`);
    }

    // POST /api/trainings in foreign project throws 403
    let foreignTrainingBlocked = false;
    try {
      await axios.post(`${API_BASE}/trainings`, {
        title: 'Foreign Project Curriculum',
        type: 'Video',
        url: 'https://example.com/video.mp4',
        projectId: DEMO1_PROJECT_ID
      }, { headers: tdAHeaders });
    } catch (err) {
      if (err.response && err.response.status === 403) foreignTrainingBlocked = true;
    }
    assert(
      foreignTrainingBlocked,
      `Test 28: POST /api/trainings for foreign project blocked with HTTP 403 Forbidden`
    );

    // PUT /api/trainings/:id updates module in authorized project
    if (createdTrainingId) {
      try {
        const updateRes = await axios.put(`${API_BASE}/trainings/${createdTrainingId}`, {
          title: 'T&D Governed Curriculum Module 101 (Revised)',
          duration: '20 mins'
        }, { headers: tdAHeaders });

        assert(
          updateRes.data.title.includes('(Revised)'),
          `Test 29: PUT /api/trainings/:id updates training material in authorized project`
        );
      } catch (e) {
        assert(false, `Test 29: PUT /api/trainings/:id failed: ${e.message}`);
      }

      // PUT attempting to assign to foreign project throws 403
      let foreignPutBlocked = false;
      try {
        await axios.put(`${API_BASE}/trainings/${createdTrainingId}`, {
          projectId: DEMO1_PROJECT_ID
        }, { headers: tdAHeaders });
      } catch (err) {
        if (err.response && err.response.status === 403) foreignPutBlocked = true;
      }
      assert(
        foreignPutBlocked,
        `Test 30: PUT /api/trainings/:id moving module to foreign project blocked with HTTP 403 Forbidden`
      );
    }

    // Create a training module in Demo 1 via Admin to test cross-project delete protection
    const foreignTrainingFixture = await Training.create({
      title: 'Demo 1 Isolated Training',
      type: 'Video',
      url: 'https://example.com/demo.mp4',
      projectId: DEMO1_PROJECT_ID
    });

    let deleteForeignTrainingBlocked = false;
    try {
      await axios.delete(`${API_BASE}/trainings/${foreignTrainingFixture.id}`, { headers: tdAHeaders });
    } catch (err) {
      if (err.response && err.response.status === 403) deleteForeignTrainingBlocked = true;
    }
    assert(
      deleteForeignTrainingBlocked,
      `Test 31: DELETE /api/trainings/:id on foreign project training blocked with HTTP 403 Forbidden`
    );

    // DELETE authorized training succeeds
    if (createdTrainingId) {
      const deleteRes = await axios.delete(`${API_BASE}/trainings/${createdTrainingId}`, { headers: tdAHeaders });
      assert(
        deleteRes.status === 200,
        `Test 32: DELETE /api/trainings/:id deletes module in authorized project`
      );
    }

    // Cleanup foreign training fixture
    await foreignTrainingFixture.destroy();

    // ---------------------------------------------------------
    // SECTION 5: SCHEDULE OVERSIGHT & LIVE-HOST SEPARATION
    // ---------------------------------------------------------
    console.log('\n--- SECTION 5: SCHEDULE OVERSIGHT & LIVE-HOST SEPARATION ---');

    // Schedule meeting in authorized project
    let scheduledMeetingId = null;
    try {
      const schedRes = await axios.post(`${API_BASE}/trainings/schedule-meeting`, {
        title: 'T&D Governed Capability Workshop',
        description: 'Quarterly competency alignment',
        projectId: IDONNEOUS_PROJECT_ID,
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        url: 'https://meet.google.com/abc-defg-hij',
        inviteeIds: []
      }, { headers: tdAHeaders });

      scheduledMeetingId = schedRes.data.meeting.id;
      assert(
        schedRes.status === 201 && scheduledMeetingId,
        `Test 33: POST /api/trainings/schedule-meeting schedules session within authorized portfolio`
      );
    } catch (e) {
      assert(false, `Test 33: POST /schedule-meeting failed: ${e.message}`);
    }

    // Schedule meeting in foreign project throws 403
    let foreignScheduleBlocked = false;
    try {
      await axios.post(`${API_BASE}/trainings/schedule-meeting`, {
        title: 'Foreign Schedule',
        projectId: DEMO1_PROJECT_ID,
        scheduledAt: new Date().toISOString(),
        url: 'https://meet.google.com/xyz'
      }, { headers: tdAHeaders });
    } catch (err) {
      if (err.response && err.response.status === 403) foreignScheduleBlocked = true;
    }
    assert(
      foreignScheduleBlocked,
      `Test 34: POST /api/trainings/schedule-meeting in foreign project blocked with HTTP 403 Forbidden`
    );

    // POST /api/trainings/:id/end-meeting blocked for T&D Manager (Live host privileges denied)
    let endMeetingBlocked = false;
    if (scheduledMeetingId) {
      try {
        await axios.post(`${API_BASE}/trainings/${scheduledMeetingId}/end-meeting`, {}, { headers: tdAHeaders });
      } catch (err) {
        if (err.response && err.response.status === 403) endMeetingBlocked = true;
      }
      assert(
        endMeetingBlocked,
        `Test 35: POST /api/trainings/:id/end-meeting blocked for T&D Manager (Live session host separation preserved)`
      );
      // Cleanup scheduled meeting
      await Training.destroy({ where: { id: scheduledMeetingId } });
    }

    // ---------------------------------------------------------
    // SECTION 6: ASSESSMENT STUDIO GOVERNANCE & IMMUTABILITY
    // ---------------------------------------------------------
    console.log('\n--- SECTION 6: ASSESSMENT STUDIO GOVERNANCE & IMMUTABILITY ---');

    // GET /api/quizzes returns only authorized
    const quizzesRes = await axios.get(`${API_BASE}/quizzes`, { headers: tdAHeaders });
    const quizProjectIds = quizzesRes.data.map(q => q.projectId).filter(Boolean);

    assert(
      !quizProjectIds.includes(DEMO1_PROJECT_ID),
      `Test 36: GET /api/quizzes collection excludes foreign project quizzes (Demo 1 excluded)`
    );

    // POST /api/quizzes creates quiz in authorized project
    let createdQuizId = null;
    try {
      const createQuizRes = await axios.post(`${API_BASE}/quizzes`, {
        title: 'Retail Capability Diagnostic Quiz',
        description: 'Testing store merchandiser competencies',
        projectId: IDONNEOUS_PROJECT_ID,
        questions: [
          { type: 'single_select', text: 'What is shelf share?', options: ['Stock %', 'Price', 'Store', 'None'], correct_answer: 'Stock %' }
        ]
      }, { headers: tdAHeaders });

      createdQuizId = createQuizRes.data.id;
      assert(
        createQuizRes.status === 201 && createdQuizId,
        `Test 37: POST /api/quizzes creates assessment in authorized project (ID: ${createdQuizId})`
      );
    } catch (e) {
      assert(false, `Test 37: POST /api/quizzes failed: ${e.message}`);
    }

    // POST /api/quizzes in foreign project throws 403
    let foreignQuizBlocked = false;
    try {
      await axios.post(`${API_BASE}/quizzes`, {
        title: 'Foreign Assessment',
        projectId: DEMO1_PROJECT_ID,
        questions: []
      }, { headers: tdAHeaders });
    } catch (err) {
      if (err.response && err.response.status === 403) foreignQuizBlocked = true;
    }
    assert(
      foreignQuizBlocked,
      `Test 38: POST /api/quizzes in foreign project blocked with HTTP 403 Forbidden`
    );

    // PUT /api/quizzes/:id updates quiz in authorized project
    if (createdQuizId) {
      try {
        const putQuizRes = await axios.put(`${API_BASE}/quizzes/${createdQuizId}`, {
          title: 'Retail Capability Diagnostic Quiz (Updated)',
          questions: [
            { type: 'single_select', text: 'Updated Question?', options: ['A', 'B'], correct_answer: 'A' }
          ]
        }, { headers: tdAHeaders });

        assert(
          putQuizRes.data.title.includes('(Updated)'),
          `Test 39: PUT /api/quizzes/:id updates assessment in authorized project`
        );
      } catch (e) {
        assert(false, `Test 39: PUT /api/quizzes/:id failed: ${e.message}`);
      }

      // PUT /api/quizzes/:id moving to foreign project throws 403
      let moveQuizBlocked = false;
      try {
        await axios.put(`${API_BASE}/quizzes/${createdQuizId}`, {
          projectId: DEMO1_PROJECT_ID
        }, { headers: tdAHeaders });
      } catch (err) {
        if (err.response && err.response.status === 403) moveQuizBlocked = true;
      }
      assert(
        moveQuizBlocked,
        `Test 40: PUT /api/quizzes/:id reassigning quiz to foreign project blocked with HTTP 403 Forbidden`
      );
    }

    // Create foreign quiz fixture via Admin
    const foreignQuizFixture = await Quiz.create({
      title: 'Foreign Isolated Quiz',
      projectId: DEMO1_PROJECT_ID,
      creatorId: adminLogin.data.user.id
    });

    // GET /api/quizzes/:id on foreign quiz throws 403
    let getForeignQuizBlocked = false;
    try {
      await axios.get(`${API_BASE}/quizzes/${foreignQuizFixture.id}`, { headers: tdAHeaders });
    } catch (err) {
      if (err.response && err.response.status === 403) getForeignQuizBlocked = true;
    }
    assert(
      getForeignQuizBlocked,
      `Test 41: GET /api/quizzes/:id on foreign quiz returns HTTP 403 Forbidden`
    );

    // PUT /api/quizzes/:id on foreign quiz throws 403
    let putForeignQuizBlocked = false;
    try {
      await axios.put(`${API_BASE}/quizzes/${foreignQuizFixture.id}`, { title: 'Hack Quiz' }, { headers: tdAHeaders });
    } catch (err) {
      if (err.response && err.response.status === 403) putForeignQuizBlocked = true;
    }
    assert(
      putForeignQuizBlocked,
      `Test 42: PUT /api/quizzes/:id on foreign quiz returns HTTP 403 Forbidden`
    );

    // DELETE /api/quizzes/:id on foreign quiz throws 403
    let deleteForeignQuizBlocked = false;
    try {
      await axios.delete(`${API_BASE}/quizzes/${foreignQuizFixture.id}`, { headers: tdAHeaders });
    } catch (err) {
      if (err.response && err.response.status === 403) deleteForeignQuizBlocked = true;
    }
    assert(
      deleteForeignQuizBlocked,
      `Test 43: DELETE /api/quizzes/:id on foreign quiz returns HTTP 403 Forbidden`
    );

    // Cleanup created quiz and fixture
    if (createdQuizId) await Quiz.destroy({ where: { id: createdQuizId } });
    await foreignQuizFixture.destroy();

    // ---------------------------------------------------------
    // SECTION 7: CERTIFICATE AUTHORITY & GOVERNANCE BOUNDARY
    // ---------------------------------------------------------
    console.log('\n--- SECTION 7: CERTIFICATE AUTHORITY & GOVERNANCE BOUNDARY ---');

    // POST /api/certificates/eligibility in authorized project
    const eligRes = await axios.post(`${API_BASE}/certificates/eligibility`, {
      projectId: IDONNEOUS_PROJECT_ID
    }, { headers: tdAHeaders });

    assert(
      eligRes.status === 200 && Array.isArray(eligRes.data.participants),
      `Test 44: POST /api/certificates/eligibility evaluates learners in authorized project (${eligRes.data.participants.length} learners)`
    );

    // POST /api/certificates/generate in authorized project
    let createdCertId = null;
    const testLearner = await User.findOne({ where: { projectId: IDONNEOUS_PROJECT_ID } });
    if (testLearner) {
      try {
        const genRes = await axios.post(`${API_BASE}/certificates/generate`, {
          userId: testLearner.id,
          projectId: IDONNEOUS_PROJECT_ID,
          templateId: 'corporate',
          signatoryName: 'Mohit Tiku',
          signatoryDesignation: 'Managing Director'
        }, { headers: tdAHeaders });

        createdCertId = genRes.data.certificate.certificate_id;
        assert(
          genRes.status === 201 && createdCertId,
          `Test 45: POST /api/certificates/generate issues certificate in authorized project (Cert ID: ${createdCertId})`
        );
      } catch (e) {
        assert(false, `Test 45: POST /api/certificates/generate failed: ${e.message}`);
      }
    }

    // POST /api/certificates/generate in foreign project throws 403
    let foreignCertGenBlocked = false;
    const foreignLearner = await User.findOne({ where: { projectId: DEMO1_PROJECT_ID } });
    if (foreignLearner) {
      try {
        await axios.post(`${API_BASE}/certificates/generate`, {
          userId: foreignLearner.id,
          projectId: DEMO1_PROJECT_ID
        }, { headers: tdAHeaders });
      } catch (err) {
        if (err.response && err.response.status === 403) foreignCertGenBlocked = true;
      }
      assert(
        foreignCertGenBlocked,
        `Test 46: POST /api/certificates/generate for foreign project blocked with HTTP 403 Forbidden`
      );

      // POST /api/certificates/bulk-generate in foreign project throws 403
      let foreignBulkBlocked = false;
      try {
        await axios.post(`${API_BASE}/certificates/bulk-generate`, {
          participantIds: [foreignLearner.id],
          projectId: DEMO1_PROJECT_ID
        }, { headers: tdAHeaders });
      } catch (err) {
        if (err.response && err.response.status === 403) foreignBulkBlocked = true;
      }
      assert(
        foreignBulkBlocked,
        `Test 47: POST /api/certificates/bulk-generate for foreign project blocked with HTTP 403 Forbidden`
      );
    }

    // GET /api/certificates returns only authorized certificates
    const certsRes = await axios.get(`${API_BASE}/certificates`, { headers: tdAHeaders });
    const certProjectIds = certsRes.data.map(c => c.projectId).filter(Boolean);
    assert(
      !certProjectIds.includes(DEMO1_PROJECT_ID),
      `Test 48: GET /api/certificates ledger excludes foreign project certificates`
    );

    // Template creation blocked with HTTP 403
    let createTemplateBlocked = false;
    try {
      await axios.post(`${API_BASE}/certificates/templates`, { name: 'Hack Template', templateType: 'custom' }, { headers: tdAHeaders });
    } catch (err) {
      if (err.response && err.response.status === 403) createTemplateBlocked = true;
    }
    assert(
      createTemplateBlocked,
      `Test 49: POST /api/certificates/templates (template creation) blocked with HTTP 403 Forbidden`
    );

    // Template update blocked with HTTP 403
    let updateTemplateBlocked = false;
    try {
      await axios.put(`${API_BASE}/certificates/templates/corporate`, { name: 'Changed' }, { headers: tdAHeaders });
    } catch (err) {
      if (err.response && err.response.status === 403) updateTemplateBlocked = true;
    }
    assert(
      updateTemplateBlocked,
      `Test 50: PUT /api/certificates/templates/:id (template edit) blocked with HTTP 403 Forbidden`
    );

    // Template delete blocked with HTTP 403
    let deleteTemplateBlocked = false;
    try {
      await axios.delete(`${API_BASE}/certificates/templates/corporate`, { headers: tdAHeaders });
    } catch (err) {
      if (err.response && err.response.status === 403) deleteTemplateBlocked = true;
    }
    assert(
      deleteTemplateBlocked,
      `Test 51: DELETE /api/certificates/templates/:id (template deletion) blocked with HTTP 403 Forbidden`
    );

    // Signatures & seals management blocked with HTTP 403
    let createSignatureBlocked = false;
    try {
      await axios.post(`${API_BASE}/certificates/signatures-and-seals`, { name: 'Hack Sig', type: 'seal' }, { headers: tdAHeaders });
    } catch (err) {
      if (err.response && err.response.status === 403) createSignatureBlocked = true;
    }
    assert(
      createSignatureBlocked,
      `Test 52: POST /api/certificates/signatures-and-seals (signature creation) blocked with HTTP 403 Forbidden`
    );

    // Upload asset blocked with HTTP 403
    let uploadAssetBlocked = false;
    try {
      await axios.post(`${API_BASE}/certificates/upload-asset`, {}, { headers: tdAHeaders });
    } catch (err) {
      if (err.response && err.response.status === 403) uploadAssetBlocked = true;
    }
    assert(
      uploadAssetBlocked,
      `Test 53: POST /api/certificates/upload-asset blocked with HTTP 403 Forbidden`
    );

    // Revoke certificate blocked for T&D Manager
    let revokeBlocked = false;
    if (createdCertId) {
      try {
        await axios.post(`${API_BASE}/certificates/${createdCertId}/revoke`, { reason: 'Test revoke' }, { headers: tdAHeaders });
      } catch (err) {
        if (err.response && err.response.status === 403) revokeBlocked = true;
      }
      assert(
        revokeBlocked,
        `Test 54: POST /api/certificates/:id/revoke blocked for T&D Manager (Admin privilege preserved)`
      );
      // Cleanup created certificate
      await Certificate.destroy({ where: { certificate_id: createdCertId } });
    }

    // ---------------------------------------------------------
    // SECTION 8: CAPABILITY INTELLIGENCE VS EXECUTIVE LEVEL 3 SEPARATION
    // ---------------------------------------------------------
    console.log('\n--- SECTION 8: CAPABILITY INTELLIGENCE VS EXECUTIVE LEVEL 3 SEPARATION ---');

    // GET /api/reports scoped to authorized projects
    const reportsRes = await axios.get(`${API_BASE}/reports`, { headers: tdAHeaders });
    assert(
      Array.isArray(reportsRes.data),
      `Test 55: GET /api/reports returns scoped session reports (${reportsRes.data.length} reports)`
    );

    // GET /api/reports/analytics/available excludes LEVEL_3_MASTER_MONTHLY
    const availReportsRes = await axios.get(`${API_BASE}/reports/analytics/available`, { headers: tdAHeaders });
    const hasLevel3 = availReportsRes.data.some(r => r.level === 'LEVEL_3_MASTER_MONTHLY');
    assert(
      !hasLevel3,
      `Test 56: GET /api/reports/analytics/available strictly filters out Level 3 Master Monthly executive reports`
    );

    // Query on-demand Level 3 report throws 403
    let genLevel3Blocked = false;
    try {
      await axios.post(`${API_BASE}/reports/analytics/generate-on-demand`, {
        level: 3,
        period: '2026-08'
      }, { headers: tdAHeaders });
    } catch (err) {
      if (err.response && err.response.status === 403) genLevel3Blocked = true;
    }
    assert(
      genLevel3Blocked,
      `Test 57: POST /api/reports/analytics/generate-on-demand for Level 3 blocked with HTTP 403 Forbidden`
    );

    // Monthly closing batch throws 403
    let monthlyClosingBlocked = false;
    try {
      await axios.post(`${API_BASE}/reports/analytics/monthly-closing`, { targetMonth: '2026-08' }, { headers: tdAHeaders });
    } catch (err) {
      if (err.response && err.response.status === 403) monthlyClosingBlocked = true;
    }
    assert(
      monthlyClosingBlocked,
      `Test 58: POST /api/reports/analytics/monthly-closing (Executive Monthly Closing) blocked with HTTP 403 Forbidden`
    );

    // ---------------------------------------------------------
    // SECTION 9: ADMINISTRATIVE & PLATFORM ISOLATION
    // ---------------------------------------------------------
    console.log('\n--- SECTION 9: ADMINISTRATIVE & PLATFORM ISOLATION ---');

    // GET /api/users throws 403
    let usersListBlocked = false;
    try {
      await axios.get(`${API_BASE}/users`, { headers: tdAHeaders });
    } catch (err) {
      if (err.response && err.response.status === 403) usersListBlocked = true;
    }
    assert(
      usersListBlocked,
      `Test 59: GET /api/users (Enterprise user directory) blocked with HTTP 403 Forbidden`
    );

    // POST /api/users throws 403
    let createUserBlocked = false;
    try {
      await axios.post(`${API_BASE}/users`, { name: 'Test', email: 'test@td.com', roleName: 'Employee' }, { headers: tdAHeaders });
    } catch (err) {
      if (err.response && err.response.status === 403) createUserBlocked = true;
    }
    assert(
      createUserBlocked,
      `Test 60: POST /api/users (User creation administration) blocked with HTTP 403 Forbidden`
    );

    // GET /api/roles throws 403
    let rolesListBlocked = false;
    try {
      await axios.get(`${API_BASE}/roles`, { headers: tdAHeaders });
    } catch (err) {
      if (err.response && err.response.status === 403) rolesListBlocked = true;
    }
    assert(
      rolesListBlocked,
      `Test 61: GET /api/roles (Role governance directory) blocked with HTTP 403 Forbidden`
    );

    // GET /api/superadmin throws 403
    let superadminBlocked = false;
    try {
      await axios.get(`${API_BASE}/superadmin/audit-logs`, { headers: tdAHeaders });
    } catch (err) {
      if (err.response && err.response.status === 403) superadminBlocked = true;
    }
    assert(
      superadminBlocked,
      `Test 62: GET /api/superadmin/audit-logs (Platform-level admin logs) blocked with HTTP 403 Forbidden`
    );

    console.log('\n================================================================');
    console.log(`  AUDIT COMPLETE: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests`);
    console.log('================================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }

  } catch (fatal) {
    console.error('Fatal test execution error:', fatal);
    process.exit(1);
  }
}

runTDRbacVerification();
