const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');
const User = require('../models/User');
const Project = require('../models/Project');
const Quiz = require('../models/Quiz');
const Session = require('../models/Session');
const Participant = require('../models/Participant');
const Response = require('../models/Response');

const API_BASE = 'http://localhost:5000/api';
let serverProcess = null;

async function ensureServerRunning() {
  try {
    const res = await axios.get('http://localhost:5000/health', { timeout: 2000 });
    if (res.status === 200) {
      console.log('Backend server already running on port 5000.');
      return;
    }
  } catch (err) {
    // Not running, need to spawn
  }

  console.log('Starting backend server for verification test...');
  serverProcess = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: '5000', DISABLE_TUNNEL: 'true', NODE_ENV: 'test' },
    stdio: 'pipe'
  });

  serverProcess.stdout.on('data', (d) => {
    // console.log(`[server stdout] ${d.toString()}`);
  });
  serverProcess.stderr.on('data', (d) => {
    // console.error(`[server stderr] ${d.toString()}`);
  });

  // Poll until ready
  const start = Date.now();
  while (Date.now() - start < 30000) {
    try {
      const res = await axios.get('http://localhost:5000/health', { timeout: 1000 });
      if (res.status === 200) {
        console.log('Backend server started and healthy.');
        return;
      }
    } catch (e) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('Timed out waiting for backend server to start on port 5000');
}

async function runVerification() {
  console.log('================================================================');
  console.log('  VERIFYING TRAINER PROJECT ASSIGNMENT & MULTI-ROLE REPORT FLOW');
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

  let createdQuiz = null;
  let offlineSession = null;
  let liveSession = null;

  try {
    await ensureServerRunning();

    // 1. Authenticate Trainer
    console.log('\n--- Step 1: Authenticate Trainer ---');
    const trainerLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'trainer@quizhive.com',
      password: 'password123'
    });
    const trainerToken = trainerLoginRes.data.token;
    const trainerUser = trainerLoginRes.data.user;
    const trainerHeaders = { Authorization: `Bearer ${trainerToken}` };
    assert(trainerToken && trainerUser.role === 'Trainer', 'Trainer authentication succeeded');

    // 2. Fetch Projects as Trainer
    console.log('\n--- Step 2: Trainer fetches project dropdown list ---');
    const projectsRes = await axios.get(`${API_BASE}/projects`, { headers: trainerHeaders });
    assert(
      projectsRes.status === 200 && Array.isArray(projectsRes.data) && projectsRes.data.length > 0,
      `Trainer successfully retrieved ${projectsRes.data.length} projects via GET /api/projects`
    );

    // Pick target project (prefer pm's project 1c4c15a4-88fa-4624-a45a-a97a9fac7907 so PM testing works)
    const targetProject = projectsRes.data.find(p => p.id === '1c4c15a4-88fa-4624-a45a-a97a9fac7907') || projectsRes.data[0];
    console.log(`Selected project for quiz assignment: "${targetProject.name}" (ID: ${targetProject.id})`);

    // 3. Trainer creates quiz assigned to targetProject
    console.log('\n--- Step 3: Trainer creates quiz assigned to designated project ---');
    const quizPayload = {
      title: `Project Flow Verification Quiz ${Date.now()}`,
      description: 'End-to-end verification quiz for trainer project assignment',
      projectId: targetProject.id,
      config: {
        category: 'Product Knowledge',
        passing_score: 60,
        time_limit: '30 Sec'
      },
      questions: [
        {
          type: 'mcq',
          text: 'What is the standard retail compliance protocol?',
          options: ['Protocol A', 'Protocol B', 'Protocol C', 'Protocol D'],
          correct_answer: 'Protocol A',
          time_limit: 30,
          points: 5
        },
        {
          type: 'true_false',
          text: 'Trainers can assign quizzes directly to project clients.',
          options: ['True', 'False'],
          correct_answer: 'True',
          time_limit: 20,
          points: 5
        }
      ]
    };

    const createQuizRes = await axios.post(`${API_BASE}/quizzes`, quizPayload, { headers: trainerHeaders });
    createdQuiz = createQuizRes.data;
    assert(
      createQuizRes.status === 201 && createdQuiz.id && createdQuiz.projectId === targetProject.id,
      `Quiz successfully created with designated projectId (${createdQuiz.projectId})`
    );

    // 4. Configure Offline Quiz mode & verify Session.projectId
    console.log('\n--- Step 4: Configure Offline Quiz and verify Session.projectId ---');
    const offlineConfigRes = await axios.post(`${API_BASE}/quizzes/${createdQuiz.id}/offline`, {
      isOffline: true,
      startTime: new Date(Date.now() - 60000).toISOString(),
      endTime: new Date(Date.now() + 86400000).toISOString()
    }, { headers: trainerHeaders });
    assert(offlineConfigRes.data.success === true, 'Offline quiz mode enabled successfully');

    const expectedRoomCode = `off-${createdQuiz.id.substring(0, 8)}`;
    offlineSession = await Session.findOne({ where: { roomCode: expectedRoomCode } });
    assert(
      offlineSession && offlineSession.projectId === targetProject.id,
      `Offline session created with matching Session.projectId (${offlineSession?.projectId})`
    );

    // 5. Submit Offline Quiz responses
    console.log('\n--- Step 5: Participant submits responses for the offline quiz ---');
    const offlineSubmitRes = await axios.post(`${API_BASE}/quizzes/${createdQuiz.id}/offline-submit`, {
      name: 'Test Learner Alpha',
      employeeId: 'EMP-FLOW-001',
      zone: 'North',
      answers: [
        { questionId: createdQuiz.questions[0].id, answer: 'Protocol A', timeTaken: 5000 },
        { questionId: createdQuiz.questions[1].id, answer: 'True', timeTaken: 4000 }
      ]
    });
    assert(
      offlineSubmitRes.status === 200 && offlineSubmitRes.data.score === 10,
      `Participant submitted offline responses successfully (Score: ${offlineSubmitRes.data.score})`
    );

    // 6. Admin sees the report
    console.log('\n--- Step 6: Authenticate Admin & verify report visibility ---');
    const adminLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@quizhive.com',
      password: 'password123'
    });
    const adminToken = adminLoginRes.data.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    const allReportsRes = await axios.get(`${API_BASE}/reports`, { headers: adminHeaders });
    const matchingSessionReport = allReportsRes.data.find(r => r.id === offlineSession.id);
    assert(
      Boolean(matchingSessionReport),
      `Offline session report visible to Admin (Title: "${matchingSessionReport?.title}", Project: "${matchingSessionReport?.projectName}")`
    );
    assert(
      matchingSessionReport?.projectId === targetProject.id,
      `Session report carries accurate projectId (${matchingSessionReport?.projectId})`
    );

    // 7. Program Manager sees the report for their assigned project
    console.log('\n--- Step 7: Authenticate Program Manager & verify project report scoping ---');
    const pmLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'pm@quizhive.com',
      password: 'password123'
    });
    const pmToken = pmLoginRes.data.token;
    const pmHeaders = { Authorization: `Bearer ${pmToken}` };

    const pmReportsRes = await axios.get(`${API_BASE}/reports`, { headers: pmHeaders });
    const pmMatchingReport = pmReportsRes.data.find(r => r.id === offlineSession.id);
    assert(
      Boolean(pmMatchingReport),
      `Offline session report visible to Program Manager (Project: "${pmMatchingReport?.projectName}")`
    );

    // Verify session detail report as PM
    const pmSessionDetailsRes = await axios.get(`${API_BASE}/reports/${offlineSession.id}`, { headers: pmHeaders });
    assert(
      pmSessionDetailsRes.status === 200 && pmSessionDetailsRes.data.participantsCount > 0,
      `PM can access detailed session records (${pmSessionDetailsRes.data.participantsCount} participants)`
    );

    // 8. Live Quiz Session creation & project association
    console.log('\n--- Step 8: Test Live Quiz Arena Session project association ---');
    const liveSessionRoomCode = `live-${Date.now().toString().slice(-6)}`;
    liveSession = await Session.create({
      quizId: createdQuiz.id,
      hostId: trainerUser.id,
      projectId: createdQuiz.projectId,
      roomCode: liveSessionRoomCode,
      status: 'active',
      current_question_index: 1,
      startedAt: new Date()
    });

    await Participant.create({
      sessionId: liveSession.id,
      name: 'Live Learner Beta',
      score: 5,
      connectionStatus: 'active'
    });

    const pmLiveReportsRes = await axios.get(`${API_BASE}/reports`, { headers: pmHeaders });
    const pmMatchingLiveReport = pmLiveReportsRes.data.find(r => r.id === liveSession.id);
    assert(
      Boolean(pmMatchingLiveReport) && pmMatchingLiveReport.projectId === targetProject.id,
      `Live Quiz session report visible to PM & accurately associated with project ("${pmMatchingLiveReport?.projectName}")`
    );

    // 9. Clean up test quiz and sessions
    console.log('\n--- Step 9: Cleanup test fixtures ---');
    if (offlineSession || liveSession) {
      const sIds = [offlineSession?.id, liveSession?.id].filter(Boolean);
      await Response.destroy({ where: { sessionId: sIds } }).catch(() => {});
      await Participant.destroy({ where: { sessionId: sIds } }).catch(() => {});
      await Session.destroy({ where: { id: sIds } }).catch(() => {});
    }
    if (createdQuiz) {
      await Quiz.destroy({ where: { id: createdQuiz.id } }).catch(() => {});
    }
    console.log('Cleaned up test quiz and session fixtures.');

    console.log('\n================================================================');
    console.log(`  FINAL VERIFICATION RESULT: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Verification error:', err.response?.data || err.message);
    if (createdQuiz) {
      try {
        const sIds = [offlineSession?.id, liveSession?.id].filter(Boolean);
        await Response.destroy({ where: { sessionId: sIds } }).catch(() => {});
        await Participant.destroy({ where: { sessionId: sIds } }).catch(() => {});
        await Session.destroy({ where: { id: sIds } }).catch(() => {});
        await Quiz.destroy({ where: { id: createdQuiz.id } }).catch(() => {});
      } catch (e) {}
    }
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
    process.exit(1);
  }
}

runVerification();
