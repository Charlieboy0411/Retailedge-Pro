/**
 * RETAILEDGE PRO — GAMIFICATION PROJECT FILTER REGRESSION SUITE (ISOLATED HARDENING)
 * 
 * GUARANTEED COMPLETE ISOLATION:
 * 1. Network circuit breaker physically blocks any remote database / network connection.
 * 2. SQLite in-memory dialect enforced (:memory:), credentials stripped.
 * 3. 100% deterministic in-memory model stubs matching exact platform baseline:
 *    - All Projects: 68 attempts, 63 distinct learners, 7 sessions, 4 quizzes, 70% pooled score
 *    - Galderma: 22 attempts, 22 distinct learners, 1 session, 1 quiz, 86% pooled score
 *    - SSEIL: 18 attempts, 18 distinct learners, 1 session, 1 quiz, 63% pooled score
 *    - Idonneous: 28 attempts, 25 distinct learners, 5 sessions, 2 quizzes, 38% pooled score
 * 4. Comprehensive tests covering:
 *    - Case A: All Projects (projectId=all)
 *    - Case B: Galderma (projectId=71350b15-bbcf-4751-8960-821ece052612)
 *    - Case C: SSEIL (projectId=3190afd0-2ccb-4c07-822d-5af651bbca9e)
 *    - Case D: Idonneous (projectId=1c4c15a4-88fa-4624-a45a-a97a9fac7907) - suppression of child expansion
 *    - Case E: Explicit subProjectId (valid differing from parent, unauthorized rejection, semantics)
 *    - Case F: Invalid / missing / non-existent project IDs (HTTP 403)
 *    - Case G: Inactive / empty projects (clean 0 / N/A state)
 *    - Case H: Multi-role authorization enforcement (Admin, Trainer, single-project PM, cross-project PM)
 *    - Case I: Single-assigned project scope auto-resolution
 */

// ── 1. NETWORK CIRCUIT BREAKER (Enforce Zero Remote Network / DB Access) ──
const net = require('net');
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
    const err = new Error(`ISOLATION VIOLATION: Outbound connection blocked to ${host}:${port}`);
    err.code = 'ECONNREFUSED';
    process.nextTick(() => this.emit('error', err));
    return this;
  }
  return origConnect.apply(this, args);
};

// ── 2. ENVIRONMENT ISOLATION ──
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = ':memory:';
process.env.NODE_ENV = 'test';
delete process.env.DATABASE_URL;
delete process.env.DB_HOST;
delete process.env.DB_PASS;
delete process.env.DB_PASSWORD;

const http = require('http');
const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { JWT_SECRET } = require('../config/constants');

const Project = require('../models/Project');
const User = require('../models/User');
const Role = require('../models/Role');
const Session = require('../models/Session');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Participant = require('../models/Participant');
const Response = require('../models/Response');
const ProjectAssignment = require('../models/ProjectAssignment');

let PASS = 0;
let FAIL = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    PASS++;
  } else {
    console.error(`  [FAIL] ${testName} ${details ? '--> ' + details : ''}`);
    FAIL++;
  }
}

// ── 3. DETERMINISTIC FIXTURE DATA ──
const IDONNEOUS_ID     = '1c4c15a4-88fa-4624-a45a-a97a9fac7907';
const GALDERMA_ID      = '71350b15-bbcf-4751-8960-821ece052612';
const SSEIL_ID         = '3190afd0-2ccb-4c07-822d-5af651bbca9e';
const BEYOND_SNACKS_ID = 'f75ec0ee-38b6-4a6a-b228-d890414d0f0d';
const UNILEVER_ID      = '639188ce-54bc-4f16-bf29-fa901f143f06';
const UNRELATED_ID     = '99999999-9999-4999-9999-999999999999';
const INVALID_UUID     = '00000000-0000-0000-0000-000000000000';

const fixtureProjects = [
  { id: IDONNEOUS_ID, name: 'Idonneous', parentId: null },
  { id: GALDERMA_ID, name: 'Galderma', parentId: IDONNEOUS_ID },
  { id: SSEIL_ID, name: 'SSEIL', parentId: IDONNEOUS_ID },
  { id: BEYOND_SNACKS_ID, name: 'Beyond Snacks', parentId: IDONNEOUS_ID },
  { id: UNILEVER_ID, name: 'Unilever International', parentId: IDONNEOUS_ID },
  { id: UNRELATED_ID, name: 'Foreign Enterprise', parentId: null }
];

const ADMIN_USER = {
  id: '38e25e46-ed43-4f58-bdd9-8cc6af07d2fb',
  name: 'Super Admin',
  email: 'admin@quizhive.com',
  role: 'Admin',
  projectId: null
};

const TRAINER_DIVYA = {
  id: 'c188bd42-16c8-4cd2-924d-59a712ffa978',
  name: 'Divya Gaikwad',
  email: 'divya@idonneous.com',
  role: 'Trainer',
  projectId: IDONNEOUS_ID
};

const PM_RUBANA = {
  id: 'bf58d4e6-0753-4d77-ad02-27340786fdf8',
  name: 'Rubana Mansuri',
  email: 'rubana@idonneous.com',
  role: 'Program Manager',
  projectId: GALDERMA_ID
};

const PM_YUSUF = {
  id: '19ef30ac-0530-469f-8482-7dd4c787446e',
  name: 'Yusuf Khan',
  email: 'yusuf@idonneous.com',
  role: 'Program Manager',
  projectId: SSEIL_ID
};

const PM_UNRELATED = {
  id: '55555555-5555-4555-5555-555555555555',
  name: 'Foreign PM',
  email: 'foreign@enterprise.com',
  role: 'Program Manager',
  projectId: UNRELATED_ID
};

// Quizzes
const fixtureQuizzes = [
  { id: 'quiz-gald-1', title: 'Galderma Clinical Mastery', projectId: GALDERMA_ID, questions: Array.from({ length: 20 }, (_, i) => ({ id: `qg_${i+1}`, points: 100 })) },
  { id: 'quiz-sseil-1', title: 'SSEIL Sales Standard', projectId: SSEIL_ID, questions: Array.from({ length: 20 }, (_, i) => ({ id: `qs_${i+1}`, points: 100 })) },
  { id: 'quiz-idon-1', title: 'Idonneous Foundation A', projectId: IDONNEOUS_ID, questions: Array.from({ length: 5 }, (_, i) => ({ id: `qi1_${i+1}`, points: 100 })) },
  { id: 'quiz-idon-2', title: 'Idonneous Foundation B', projectId: IDONNEOUS_ID, questions: Array.from({ length: 5 }, (_, i) => ({ id: `qi2_${i+1}`, points: 100 })) }
];

// Sessions (7 total: 1 Galderma, 1 SSEIL, 5 Idonneous)
const fixtureSessions = [
  { id: 'sess-gald-1', session_name: 'Galderma Batch A', roomCode: 'GLD01', projectId: GALDERMA_ID, quizId: 'quiz-gald-1', Quiz: fixtureQuizzes[0], status: 'finished', createdAt: new Date('2026-09-01') },
  { id: 'sess-sseil-1', session_name: 'SSEIL Regional 1', roomCode: 'SSL01', projectId: SSEIL_ID, quizId: 'quiz-sseil-1', Quiz: fixtureQuizzes[1], status: 'finished', createdAt: new Date('2026-09-02') },
  { id: 'sess-idon-1', session_name: 'Idonneous Onboarding 1', roomCode: 'IDN01', projectId: IDONNEOUS_ID, quizId: 'quiz-idon-1', Quiz: fixtureQuizzes[2], status: 'finished', createdAt: new Date('2026-09-03') },
  { id: 'sess-idon-2', session_name: 'Idonneous Onboarding 2', roomCode: 'IDN02', projectId: IDONNEOUS_ID, quizId: 'quiz-idon-1', Quiz: fixtureQuizzes[2], status: 'finished', createdAt: new Date('2026-09-04') },
  { id: 'sess-idon-3', session_name: 'Idonneous Advanced 1', roomCode: 'IDN03', projectId: IDONNEOUS_ID, quizId: 'quiz-idon-2', Quiz: fixtureQuizzes[3], status: 'finished', createdAt: new Date('2026-09-05') },
  { id: 'sess-idon-4', session_name: 'Idonneous Advanced 2', roomCode: 'IDN04', projectId: IDONNEOUS_ID, quizId: 'quiz-idon-2', Quiz: fixtureQuizzes[3], status: 'finished', createdAt: new Date('2026-09-06') },
  { id: 'sess-idon-5', session_name: 'Idonneous Advanced 3', roomCode: 'IDN05', projectId: IDONNEOUS_ID, quizId: 'quiz-idon-2', Quiz: fixtureQuizzes[3], status: 'finished', createdAt: new Date('2026-09-07') }
];

// Participants (68 total attempts across 63 distinct learners):
// - Galderma: 22 attempts (22 learners, 379/440 correct = 86.14% -> 86%)
// - SSEIL: 18 attempts (18 learners, 228/360 correct = 63.33% -> 63%)
// - Idonneous: 28 attempts (25 learners, 53/140 correct = 37.86% -> 38%)
// Total correct: 379 + 228 + 53 = 660. Total questions: 440 + 360 + 140 = 940. Pooled: 660/940 = 70.21% -> 70%.
const fixtureParticipants = [];

// Generate Galderma: 22 attempts, 440 questions, 379 correct
let galdCorrectRemaining = 379;
for (let i = 1; i <= 22; i++) {
  const learnerId = `EMP_GLD_${String(i).padStart(2, '0')}`;
  const c = (i === 22) ? galdCorrectRemaining : Math.min(20, Math.max(15, Math.round(galdCorrectRemaining / (23 - i))));
  galdCorrectRemaining -= c;

  fixtureParticipants.push({
    id: `part-gald-${i}`,
    name: `Galderma Learner ${i}`,
    employeeId: learnerId,
    storeName: `North Region ${i % 3}`,
    score: c * 10,
    userId: `user-gald-${i}`,
    sessionId: 'sess-gald-1',
    Session: fixtureSessions[0],
    Responses: Array.from({ length: 20 }, (_, qIndex) => ({
      id: `resp-gald-${i}-${qIndex}`,
      points_awarded: qIndex < c ? 100 : 0,
      is_correct: qIndex < c,
      response_time: 1800 + (qIndex * 50)
    })),
    createdAt: new Date('2026-09-01')
  });
}

// Generate SSEIL: 18 attempts, 360 questions, 228 correct
// In platform baseline: 65 project-learner pairs, 63 distinct learners (2 cross-project learners)
let sseilCorrectRemaining = 228;
for (let i = 1; i <= 18; i++) {
  let learnerId = `EMP_SSEIL_${String(i).padStart(2, '0')}`;
  let learnerName = `SSEIL Learner ${i}`;
  if (i === 1) {
    learnerId = 'EMP_IDON_DIVYA';
    learnerName = 'Divya';
  } else if (i === 2) {
    learnerId = 'EMP_GLD_01';
    learnerName = 'Galderma Learner 1';
  }

  const c = (i === 18) ? sseilCorrectRemaining : Math.min(20, Math.max(10, Math.round(sseilCorrectRemaining / (19 - i))));
  sseilCorrectRemaining -= c;

  fixtureParticipants.push({
    id: `part-sseil-${i}`,
    name: learnerName,
    employeeId: learnerId,
    storeName: `West Hub ${i % 2}`,
    score: c * 10,
    userId: `user-sseil-${i}`,
    sessionId: 'sess-sseil-1',
    Session: fixtureSessions[1],
    Responses: Array.from({ length: 20 }, (_, qIndex) => ({
      id: `resp-sseil-${i}-${qIndex}`,
      points_awarded: qIndex < c ? 100 : 0,
      is_correct: qIndex < c,
      response_time: 2100 + (qIndex * 40)
    })),
    createdAt: new Date('2026-09-02')
  });
}

// Generate Idonneous: 28 attempts across 25 distinct learners, 140 questions, 53 correct
let idonCorrectRemaining = 53;
for (let i = 1; i <= 28; i++) {
  const learnerIndex = i <= 25 ? i : (i - 25);
  const learnerId = learnerIndex === 1 ? 'EMP_IDON_DIVYA' : `EMP_IDON_${String(learnerIndex).padStart(2, '0')}`;
  const learnerName = learnerIndex === 1 ? 'Divya' : `Idonneous Learner ${learnerIndex}`;
  const sess = fixtureSessions[2 + (i % 5)];
  const c = (i === 28) ? idonCorrectRemaining : Math.min(5, Math.max(1, Math.round(idonCorrectRemaining / (29 - i))));
  idonCorrectRemaining -= c;

  fixtureParticipants.push({
    id: `part-idon-${i}`,
    name: learnerName,
    employeeId: learnerId,
    storeName: `Idonneous Store ${learnerIndex % 4}`,
    score: c * 10,
    userId: `user-idon-${learnerIndex}`,
    sessionId: sess.id,
    Session: sess,
    Responses: Array.from({ length: 5 }, (_, qIndex) => ({
      id: `resp-idon-${i}-${qIndex}`,
      points_awarded: qIndex < c ? 100 : 0,
      is_correct: qIndex < c,
      response_time: 2400 + (qIndex * 60)
    })),
    createdAt: new Date('2026-09-03')
  });
}

// ── 4. IN-MEMORY MODEL STUBBER ──
function stubModels() {
  Project.findAll = async (query = {}) => {
    if (query.where?.id?.[Op.in]) {
      const allowed = query.where.id[Op.in];
      return fixtureProjects.filter(p => allowed.includes(p.id));
    }
    if (query.where?.parentId?.[Op.in]) {
      const parents = query.where.parentId[Op.in];
      return fixtureProjects.filter(p => p.parentId && parents.includes(p.parentId));
    }
    if (query.where?.parentId) {
      return fixtureProjects.filter(p => p.parentId === query.where.parentId);
    }
    return fixtureProjects;
  };

  ProjectAssignment.findAll = async (query = {}) => {
    return [];
  };

  User.findByPk = async (id) => {
    const allUsers = [ADMIN_USER, TRAINER_DIVYA, PM_RUBANA, PM_YUSUF, PM_UNRELATED];
    return allUsers.find(u => u.id === id) || null;
  };

  User.findOne = async (query = {}) => {
    const allUsers = [ADMIN_USER, TRAINER_DIVYA, PM_RUBANA, PM_YUSUF, PM_UNRELATED];
    if (query.where?.email) {
      return allUsers.find(u => u.email === query.where.email) || null;
    }
    if (query.where?.id) {
      return allUsers.find(u => u.id === query.where.id) || null;
    }
    return null;
  };

  Quiz.findAll = async (query = {}) => {
    if (query.where?.projectId?.[Op.in]) {
      const allowed = query.where.projectId[Op.in];
      return fixtureQuizzes.filter(q => allowed.includes(q.projectId));
    }
    return fixtureQuizzes;
  };

  Session.findAll = async (query = {}) => {
    if (query.where?.[Op.or]) {
      const projCondition = query.where[Op.or].find(c => c.projectId?.[Op.in]);
      if (projCondition) {
        const allowed = projCondition.projectId[Op.in];
        return fixtureSessions.filter(s => allowed.includes(s.projectId));
      }
    }
    return fixtureSessions;
  };

  Participant.findAll = async () => {
    return fixtureParticipants;
  };
}

async function runRegressionSuite() {
  console.log('========================================================================');
  console.log('RETAILEDGE PRO — GAMIFICATION ISOLATED REGRESSION TEST SUITE');
  console.log('========================================================================\n');

  // Verify Network Guard is active
  console.log('--- PRE-FLIGHT: Network Guard & Circuit Breaker Verification ---');
  let remoteConnectionBlocked = false;
  try {
    const testSocket = new net.Socket();
    testSocket.connect({ host: 'retailedgepro-db.ctdrw76fsnhe.ap-south-1.rds.amazonaws.com', port: 5432 });
    testSocket.on('error', (err) => {
      if (err.message.includes('ISOLATION VIOLATION')) {
        remoteConnectionBlocked = true;
      }
    });
  } catch (err) {
    if (err.message.includes('ISOLATION VIOLATION')) {
      remoteConnectionBlocked = true;
    }
  }
  await new Promise(r => setTimeout(r, 50));
  assert(remoteConnectionBlocked, 'Network Guard: Outbound connection to AWS RDS is physically intercepted & blocked');
  assert(process.env.DB_DIALECT === 'sqlite', 'Environment: DB_DIALECT is strictly sqlite (:memory:)');

  stubModels();

  // Build Express App with reports router
  const app = express();
  app.use(express.json());
  const reportsRouter = require('../routes/reports');
  app.use('/api/reports', reportsRouter);

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  let currentAuthUser = ADMIN_USER;

  function getAuthHeaders() {
    const token = jwt.sign(currentAuthUser, JWT_SECRET, { expiresIn: '1h' });
    return { Authorization: `Bearer ${token}` };
  }

  const api = {
    get: (url) => axios.get(`http://127.0.0.1:${port}/api${url}`, {
      headers: getAuthHeaders(),
      validateStatus: () => true
    })
  };

  try {
    // ════════════════════════════════════════════════════════════════════
    // 1. ALL PROJECTS (projectId=all)
    // ════════════════════════════════════════════════════════════════════
    console.log('\n--- 1. All Projects Scope (projectId=all) ---');
    currentAuthUser = ADMIN_USER;
    const resAll = await api.get('/reports/gamification?projectId=all');
    assert(resAll.status === 200, 'All Projects: GET /api/reports/gamification?projectId=all returns 200 OK');
    assert(resAll.data.summary.totalAttempts === 68, `All Projects: Total attempts equals 68 (got: ${resAll.data.summary.totalAttempts})`);
    assert(resAll.data.summary.totalParticipants === 63, `All Projects: Distinct participants equals 63 (got: ${resAll.data.summary.totalParticipants})`);
    assert(resAll.data.summary.distinctSessionsCount === 7, `All Projects: Distinct sessions equals 7 (got: ${resAll.data.summary.distinctSessionsCount})`);
    assert(resAll.data.summary.distinctQuizzesCount === 4, `All Projects: Distinct quizzes equals 4 (got: ${resAll.data.summary.distinctQuizzesCount})`);
    assert(resAll.data.summary.avgScore === '70%', `All Projects: Pooled score is 70% (got: ${resAll.data.summary.avgScore})`);

    // ════════════════════════════════════════════════════════════════════
    // 2. GALDERMA (Single Project without Children)
    // ════════════════════════════════════════════════════════════════════
    console.log('\n--- 2. Galderma Scope (projectId=Galderma) ---');
    const resGalderma = await api.get(`/reports/gamification?projectId=${GALDERMA_ID}`);
    assert(resGalderma.status === 200, 'Galderma: GET returns 200 OK');
    assert(resGalderma.data.summary.totalAttempts === 22, `Galderma: Attempts equals 22 (got: ${resGalderma.data.summary.totalAttempts})`);
    assert(resGalderma.data.summary.totalParticipants === 22, `Galderma: Participants equals 22 (got: ${resGalderma.data.summary.totalParticipants})`);
    assert(resGalderma.data.summary.distinctSessionsCount === 1, `Galderma: Sessions equals 1 (got: ${resGalderma.data.summary.distinctSessionsCount})`);
    assert(resGalderma.data.summary.distinctQuizzesCount === 1, `Galderma: Quizzes equals 1 (got: ${resGalderma.data.summary.distinctQuizzesCount})`);
    assert(resGalderma.data.summary.avgScore === '86%', `Galderma: Pooled score is 86% (got: ${resGalderma.data.summary.avgScore})`);

    // ════════════════════════════════════════════════════════════════════
    // 3. SSEIL (Single Project without Children)
    // ════════════════════════════════════════════════════════════════════
    console.log('\n--- 3. SSEIL Scope (projectId=SSEIL) ---');
    const resSSEIL = await api.get(`/reports/gamification?projectId=${SSEIL_ID}`);
    assert(resSSEIL.status === 200, 'SSEIL: GET returns 200 OK');
    assert(resSSEIL.data.summary.totalAttempts === 18, `SSEIL: Attempts equals 18 (got: ${resSSEIL.data.summary.totalAttempts})`);
    assert(resSSEIL.data.summary.totalParticipants === 18, `SSEIL: Participants equals 18 (got: ${resSSEIL.data.summary.totalParticipants})`);
    assert(resSSEIL.data.summary.distinctSessionsCount === 1, `SSEIL: Sessions equals 1 (got: ${resSSEIL.data.summary.distinctSessionsCount})`);
    assert(resSSEIL.data.summary.distinctQuizzesCount === 1, `SSEIL: Quizzes equals 1 (got: ${resSSEIL.data.summary.distinctQuizzesCount})`);
    assert(resSSEIL.data.summary.avgScore === '63%', `SSEIL: Pooled score is 63% (got: ${resSSEIL.data.summary.avgScore})`);

    // ════════════════════════════════════════════════════════════════════
    // 4. IDONNEOUS (Mother Project with Children in Projects Hierarchy)
    // CRITICAL: Must return ONLY Idonneous records, NOT expand to children!
    // ════════════════════════════════════════════════════════════════════
    console.log('\n--- 4. Idonneous Scope (Mother Project - Suppression of Child Expansion) ---');
    const resIdonneous = await api.get(`/reports/gamification?projectId=${IDONNEOUS_ID}`);
    assert(resIdonneous.status === 200, 'Idonneous: GET returns 200 OK');
    assert(resIdonneous.data.summary.totalAttempts === 28, `Idonneous: Attempts strictly equals 28 (got: ${resIdonneous.data.summary.totalAttempts}, NOT 68)`);
    assert(resIdonneous.data.summary.totalParticipants === 25, `Idonneous: Distinct participants strictly equals 25 (got: ${resIdonneous.data.summary.totalParticipants}, NOT 63)`);
    assert(resIdonneous.data.summary.distinctSessionsCount === 5, `Idonneous: Sessions count strictly equals 5 (got: ${resIdonneous.data.summary.distinctSessionsCount})`);
    assert(resIdonneous.data.summary.distinctQuizzesCount === 2, `Idonneous: Quizzes count strictly equals 2 (got: ${resIdonneous.data.summary.distinctQuizzesCount})`);
    assert(resIdonneous.data.summary.avgScore === '38%', `Idonneous: Pooled score is approximately 38% (got: ${resIdonneous.data.summary.avgScore}, NOT 70%)`);

    // Verify attempt ID isolation (zero child leak)
    const idonAttemptIds = new Set(resIdonneous.data.participantResults.map(p => p.id));
    const galdAttemptIds = new Set(resGalderma.data.participantResults.map(p => p.id));
    const sseilAttemptIds = new Set(resSSEIL.data.participantResults.map(p => p.id));

    let galdAttemptLeakCount = 0;
    let sseilAttemptLeakCount = 0;
    idonAttemptIds.forEach(id => {
      if (galdAttemptIds.has(id)) galdAttemptLeakCount++;
      if (sseilAttemptIds.has(id)) sseilAttemptLeakCount++;
    });
    assert(galdAttemptLeakCount === 0, 'Idonneous Isolation: Exactly 0 Galderma attempt records leaked into Idonneous');
    assert(sseilAttemptLeakCount === 0, 'Idonneous Isolation: Exactly 0 SSEIL attempt records leaked into Idonneous');
    assert(idonAttemptIds.size === 28, 'Idonneous Isolation: Contains exactly 28 distinct attempt records');

    // ════════════════════════════════════════════════════════════════════
    // 5. EXPLICIT subProjectId CONTRACT (Differing from projectId)
    // ════════════════════════════════════════════════════════════════════
    console.log('\n--- 5. Explicit subProjectId Contract (Differing from projectId) ---');
    // Scenario 5A: Authorized user requests projectId=Idonneous & subProjectId=Galderma
    currentAuthUser = TRAINER_DIVYA; // Authorized for Idonneous + all child subprojects
    const resSubGalderma = await api.get(`/reports/gamification?projectId=${IDONNEOUS_ID}&subProjectId=${GALDERMA_ID}`);
    assert(resSubGalderma.status === 200, 'Explicit subProject: Authorized parent+subproject request returns 200 OK');
    assert(resSubGalderma.data.summary.totalAttempts === 22, `Explicit subProject: Returns strictly Galderma attempts (got: ${resSubGalderma.data.summary.totalAttempts})`);
    assert(resSubGalderma.data.summary.avgScore === '86%', 'Explicit subProject: Returns Galderma 86% pooled score');

    // Scenario 5B: Authorized user requests projectId=Idonneous & subProjectId=SSEIL
    const resSubSSEIL = await api.get(`/reports/gamification?projectId=${IDONNEOUS_ID}&subProjectId=${SSEIL_ID}`);
    assert(resSubSSEIL.status === 200, 'Explicit subProject: Authorized parent+SSEIL request returns 200 OK');
    assert(resSubSSEIL.data.summary.totalAttempts === 18, `Explicit subProject: Returns strictly SSEIL attempts (got: ${resSubSSEIL.data.summary.totalAttempts})`);
    assert(resSubSSEIL.data.summary.avgScore === '63%', 'Explicit subProject: Returns SSEIL 63% pooled score');

    // Scenario 5C: Subproject differ from parent where user has NO permission for subproject
    currentAuthUser = PM_RUBANA; // PM Rubana has access to Galderma ONLY
    const resUnauthorizedSub = await api.get(`/reports/gamification?projectId=${GALDERMA_ID}&subProjectId=${SSEIL_ID}`);
    assert(resUnauthorizedSub.status === 403, 'Explicit subProject: Rejection of unauthorized subproject returns HTTP 403 Forbidden');
    assert(resUnauthorizedSub.data.error.includes('Forbidden'), 'Explicit subProject: Response includes explicit Forbidden error message');

    // Scenario 5D: Subproject differ from parent where subproject is completely invalid/unknown
    currentAuthUser = ADMIN_USER;
    const resInvalidSub = await api.get(`/reports/gamification?projectId=${IDONNEOUS_ID}&subProjectId=${INVALID_UUID}`);
    assert(resInvalidSub.status === 403, 'Explicit subProject: Non-existent subproject UUID returns HTTP 403 Forbidden');

    // ════════════════════════════════════════════════════════════════════
    // 6. INVALID, INACCESSIBLE & EMPTY PROJECTS
    // ════════════════════════════════════════════════════════════════════
    console.log('\n--- 6. Invalid, Inaccessible & Empty Projects ---');
    // Scenario 6A: Invalid / non-existent project ID
    const resInvalidProj = await api.get(`/reports/gamification?projectId=${INVALID_UUID}`);
    assert(resInvalidProj.status === 403, 'Invalid Project: Non-existent projectId returns HTTP 403 Forbidden');

    // Scenario 6B: Legitimate project with no activity (Beyond Snacks)
    const resEmptyProj = await api.get(`/reports/gamification?projectId=${BEYOND_SNACKS_ID}`);
    assert(resEmptyProj.status === 200, 'Empty Project: Inactive project returns 200 OK');
    assert(resEmptyProj.data.summary.totalAttempts === 0, 'Empty Project: Total attempts is 0');
    assert(resEmptyProj.data.summary.totalParticipants === 0, 'Empty Project: Total participants is 0');
    assert(resEmptyProj.data.summary.distinctSessionsCount === 0, 'Empty Project: Distinct sessions count is 0');
    assert(resEmptyProj.data.summary.distinctQuizzesCount === 0, 'Empty Project: Distinct quizzes count is 0');
    assert(resEmptyProj.data.summary.avgScore === 'N/A', 'Empty Project: Average score is N/A');

    // Scenario 6C: Cross-project authorization enforcement
    currentAuthUser = PM_RUBANA; // Galderma only
    const resCrossProj1 = await api.get(`/reports/gamification?projectId=${IDONNEOUS_ID}`);
    assert(resCrossProj1.status === 403, 'Cross-Project Auth: PM assigned to Galderma forbidden from accessing Idonneous (HTTP 403)');

    const resCrossProj2 = await api.get(`/reports/gamification?projectId=${SSEIL_ID}`);
    assert(resCrossProj2.status === 403, 'Cross-Project Auth: PM assigned to Galderma forbidden from accessing SSEIL (HTTP 403)');

    currentAuthUser = PM_YUSUF; // SSEIL only
    const resCrossProj3 = await api.get(`/reports/gamification?projectId=${GALDERMA_ID}`);
    assert(resCrossProj3.status === 403, 'Cross-Project Auth: PM assigned to SSEIL forbidden from accessing Galderma (HTTP 403)');

    currentAuthUser = PM_UNRELATED; // Foreign PM
    const resCrossProj4 = await api.get(`/reports/gamification?projectId=${IDONNEOUS_ID}`);
    assert(resCrossProj4.status === 403, 'Cross-Project Auth: Foreign PM forbidden from accessing Idonneous (HTTP 403)');

    // ════════════════════════════════════════════════════════════════════
    // 7. SINGLE-ASSIGNED PROJECT AUTO-RESOLUTION
    // ════════════════════════════════════════════════════════════════════
    console.log('\n--- 7. Single-Assigned Project Auto-Resolution ---');
    currentAuthUser = PM_RUBANA; // Exactly 1 assigned project (Galderma)
    const resAutoGald = await api.get('/reports/gamification?projectId=all');
    assert(resAutoGald.status === 200, 'Auto-Resolution: PM with single assigned project returns 200 OK');
    assert(resAutoGald.data.selectedProjectId === GALDERMA_ID, 'Auto-Resolution: Scope auto-resolves from "all" to Galderma project ID');
    assert(resAutoGald.data.summary.totalAttempts === 22, 'Auto-Resolution: Returns Galderma 22 attempts');
    assert(resAutoGald.data.summary.avgScore === '86%', 'Auto-Resolution: Returns Galderma 86% pooled score');

    currentAuthUser = PM_YUSUF; // Exactly 1 assigned project (SSEIL)
    const resAutoSSEIL = await api.get('/reports/gamification?projectId=all');
    assert(resAutoSSEIL.status === 200, 'Auto-Resolution: PM with single assigned project returns 200 OK');
    assert(resAutoSSEIL.data.selectedProjectId === SSEIL_ID, 'Auto-Resolution: Scope auto-resolves from "all" to SSEIL project ID');
    assert(resAutoSSEIL.data.summary.totalAttempts === 18, 'Auto-Resolution: Returns SSEIL 18 attempts');
    assert(resAutoSSEIL.data.summary.avgScore === '63%', 'Auto-Resolution: Returns SSEIL 63% pooled score');

  } finally {
    server.close();
  }

  console.log('\n========================================================================');
  console.log(`REGRESSION SUITE COMPLETE: ${PASS} PASSED | ${FAIL} FAILED`);
  console.log('========================================================================\n');

  if (FAIL > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runRegressionSuite().catch(err => {
  console.error('Unhandled hardening test exception:', err);
  process.exit(1);
});
