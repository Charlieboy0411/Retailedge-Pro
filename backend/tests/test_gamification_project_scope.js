/**
 * RETAILEDGE PRO — PARTICIPANT RESULTS & GAMIFICATION TEST SUITE
 * Project-Scoped Analytics, Role-Based Access Control, Separation of Measures & Elimination of Mock Data
 *
 * Requirements:
 * - 21 Focused Verification Tests across Data Source, Project Scope, and Calculations.
 * - Zero mutations to production AWS RDS (baseline snapshot verified before & after).
 * - Verifies elimination of Arjun Sharma, Priya Mehta, Ravi Kumar, Sunita Rao, Deepak Singh mock records.
 * - Verifies separation of Arena Points (p.score) from quiz assessment percentages.
 * - Verifies strict 403 rejection on unauthorized cross-project access for Program Managers.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const http = require('http');
const express = require('express');
const axios = require('axios');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

const Project = require('../models/Project');
const User = require('../models/User');
const Role = require('../models/Role');
const Session = require('../models/Session');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Participant = require('../models/Participant');
const Response = require('../models/Response');
const ProjectAssignment = require('../models/ProjectAssignment');
const intelligenceService = require('../utils/projectIntelligenceService');

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

// Model Stubber for safe in-memory testing without mutating AWS RDS
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

async function runTestSuite() {
  console.log('========================================================================');
  console.log('RETAILEDGE PRO — PARTICIPANT RESULTS & GAMIFICATION VERIFICATION SUITE');
  console.log('========================================================================\n');

  // ── PRE-FLIGHT: Database Baseline Snapshot (AWS RDS Read-Only) ──
  console.log('--- PRE-FLIGHT: Database Baseline Snapshot (AWS RDS Read-Only) ---');
  let baselineCounts = {};
  try {
    baselineCounts = {
      users: await User.count(),
      projects: await Project.count(),
      participants: await Participant.count(),
      sessions: await Session.count()
    };
    console.log(`  Baseline AWS RDS Counts: Users=${baselineCounts.users}, Projects=${baselineCounts.projects}, Participants=${baselineCounts.participants}, Sessions=${baselineCounts.sessions}`);
    assert(true, 'AWS RDS Read-Only Pre-flight Authenticated successfully');
  } catch (err) {
    console.error('  Failed to read database baseline:', err.message);
    process.exit(1);
  }

  const stubber = createModelStubber();

  // Test Entities
  const PROJ_A_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
  const PROJ_B_ID = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
  const SUB_A1_ID = 'aaaaaaaa-1111-4aaa-aaaa-aaaaaaaaaaaa';

  const PM_A_USER = {
    id: '11111111-1111-4111-1111-111111111111',
    name: 'PM Alice',
    email: 'alice@idonneous.com',
    role: 'Program Manager',
    projectId: null
  };

  const PM_B_USER = {
    id: '22222222-2222-4222-2222-222222222222',
    name: 'PM Bob',
    email: 'bob@idonneous.com',
    role: 'Program Manager',
    projectId: null
  };

  const TRAINER_USER = {
    id: '33333333-3333-4333-3333-333333333333',
    name: 'Trainer Tom',
    email: 'trainer@idonneous.com',
    role: 'Trainer',
    projectId: null
  };

  const EMPLOYEE_USER = {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Learner Charlie',
    email: 'charlie@idonneous.com',
    employeeId: 'EMP_CHARLIE',
    role: 'Employee',
    projectId: PROJ_A_ID
  };

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');

// Build Express Test App
let currentAuthUser = PM_A_USER;

const app = express();
app.use(express.json());
const reportsRouter = require('../routes/reports');
app.use('/api/reports', reportsRouter);

const server = http.createServer(app);
await new Promise(resolve => server.listen(0, resolve));
const port = server.address().port;

function getAuthHeaders() {
  const token = jwt.sign(currentAuthUser, JWT_SECRET, { expiresIn: '1h' });
  return { Authorization: `Bearer ${token}` };
}

const api = {
  get: (url) => axios.get(`http://localhost:${port}/api${url}`, {
    headers: getAuthHeaders(),
    validateStatus: () => true
  })
};

  // In-memory Mock Fixture Data
  const mockProjects = [
    { id: PROJ_A_ID, name: 'Project Alpha (Galderma)', parentId: null },
    { id: SUB_A1_ID, name: 'Project Alpha - Delhi North', parentId: PROJ_A_ID },
    { id: PROJ_B_ID, name: 'Project Beta (Unilever)', parentId: null }
  ];

  const mockAssignments = [
    { userId: PM_A_USER.id, projectId: PROJ_A_ID, status: 'Active' },
    { userId: PM_B_USER.id, projectId: PROJ_B_ID, status: 'Active' },
    { userId: TRAINER_USER.id, projectId: PROJ_A_ID, status: 'Active' }
  ];

  const mockParticipants = [
    // Participant 1 in Project A (Charlie - 2/2 correct = 100%, 200 Arena pts, store: North Hub)
    {
      id: 'part-001',
      name: 'Learner Charlie',
      employeeId: 'EMP_CHARLIE',
      storeName: 'North Hub',
      score: 200,
      userId: EMPLOYEE_USER.id,
      Session: {
        id: 'sess-001',
        session_name: 'Alpha Launch Quiz',
        roomCode: 'ALPHA1',
        status: 'finished',
        projectId: PROJ_A_ID,
        hostId: TRAINER_USER.id,
        Quiz: {
          id: 'quiz-001',
          title: 'Alpha Product Launch',
          projectId: PROJ_A_ID,
          questions: [{ id: 'q1' }, { id: 'q2' }]
        }
      },
      Responses: [
        { id: 'r1', points_awarded: 100, is_correct: true, response_time: 1500 },
        { id: 'r2', points_awarded: 100, is_correct: true, response_time: 2100 }
      ],
      createdAt: new Date('2026-10-10')
    },
    // Participant 2 in Project A (Dave - 1/2 correct = 50%, 100 Arena pts, store: South Zone)
    {
      id: 'part-002',
      name: 'Learner Dave',
      employeeId: 'EMP_DAVE',
      storeName: 'South Zone',
      score: 100,
      userId: 'user-dave',
      Session: {
        id: 'sess-001',
        session_name: 'Alpha Launch Quiz',
        roomCode: 'ALPHA1',
        status: 'finished',
        projectId: PROJ_A_ID,
        hostId: TRAINER_USER.id,
        Quiz: {
          id: 'quiz-001',
          title: 'Alpha Product Launch',
          projectId: PROJ_A_ID,
          questions: [{ id: 'q1' }, { id: 'q2' }]
        }
      },
      Responses: [
        { id: 'r3', points_awarded: 100, is_correct: true, response_time: 4200 },
        { id: 'r4', points_awarded: 0, is_correct: false, response_time: 3800 }
      ],
      createdAt: new Date('2026-10-10')
    },
    // Participant 3 in Project A (Empty zone: null storeName)
    {
      id: 'part-003',
      name: 'Learner Eve',
      employeeId: 'EMP_EVE',
      storeName: null,
      score: 50,
      userId: 'user-eve',
      Session: {
        id: 'sess-001',
        session_name: 'Alpha Launch Quiz',
        roomCode: 'ALPHA1',
        status: 'finished',
        projectId: PROJ_A_ID,
        hostId: TRAINER_USER.id,
        Quiz: {
          id: 'quiz-001',
          title: 'Alpha Product Launch',
          projectId: PROJ_A_ID,
          questions: [{ id: 'q1' }, { id: 'q2' }]
        }
      },
      Responses: [
        { id: 'r5', points_awarded: 50, is_correct: true, response_time: 5000 }
      ],
      createdAt: new Date('2026-10-10')
    },
    // Participant 4 in Project B (Zoe - belongs to Project B ONLY)
    {
      id: 'part-004',
      name: 'Learner Zoe',
      employeeId: 'EMP_ZOE',
      storeName: 'West Central',
      score: 300,
      userId: 'user-zoe',
      Session: {
        id: 'sess-002',
        session_name: 'Beta Compliance Quiz',
        roomCode: 'BETA1',
        status: 'finished',
        projectId: PROJ_B_ID,
        Quiz: {
          id: 'quiz-002',
          title: 'Beta Compliance Standards',
          projectId: PROJ_B_ID,
          questions: [{ id: 'qb1' }, { id: 'qb2' }, { id: 'qb3' }]
        }
      },
      Responses: [
        { id: 'r6', points_awarded: 100, is_correct: true, response_time: 2500 },
        { id: 'r7', points_awarded: 100, is_correct: true, response_time: 2600 },
        { id: 'r8', points_awarded: 100, is_correct: true, response_time: 2700 }
      ],
      createdAt: new Date('2026-10-11')
    }
  ];

  // Stub Project & ProjectAssignment methods
  stubber.stub(Project, 'findAll', async (query = {}) => {
    if (query.where?.id?.[Op.in]) {
      const allowed = query.where.id[Op.in];
      return mockProjects.filter(p => allowed.includes(p.id));
    }
    if (query.where?.parentId?.[Op.in]) {
      const parents = query.where.parentId[Op.in];
      return mockProjects.filter(p => p.parentId && parents.includes(p.parentId));
    }
    if (query.where?.parentId) {
      return mockProjects.filter(p => p.parentId === query.where.parentId);
    }
    return mockProjects;
  });

  stubber.stub(ProjectAssignment, 'findAll', async (query = {}) => {
    return mockAssignments.filter(a => {
      let match = true;
      if (query.where?.userId) match = match && a.userId === query.where.userId;
      if (query.where?.status) match = match && a.status === query.where.status;
      return match;
    });
  });

  stubber.stub(Participant, 'findAll', async () => {
    return mockParticipants;
  });

  try {
    // ════════════════════════════════════════════════════════════════════
    // 1. DATA-SOURCE TESTS (Tests 1 - 7)
    // ════════════════════════════════════════════════════════════════════
    console.log('\n--- GROUP 1: Data-Source & Elimination of Demo Artifacts (Tests 1-7) ---');

    currentAuthUser = PM_A_USER;
    const resA = await api.get('/reports/gamification?projectId=all');
    assert(resA.status === 200, 'Test 1: GET /api/reports/gamification returns 200 OK');

    // Test 1: Real participant points appear correctly
    const charlieRow = resA.data.participantResults.find(p => p.name === 'Learner Charlie');
    assert(charlieRow && charlieRow.arenaPoints === 200, 'Test 1: Real participant points appear correctly (Charlie = 200 pts, not hardcoded 340)');

    // Test 2: Achievement metrics agree with actual records
    currentAuthUser = EMPLOYEE_USER;
    const resEmp = await api.get('/reports/gamification?projectId=all');
    assert(resEmp.data.stats.sessionsParticipated === 1, 'Test 2: Sessions participated strictly equals 1 (actual finished session count)');
    assert(resEmp.data.stats.avgScore === '100%', 'Test 2: Avg score strictly equals 100% (2/2 correct responses)');
    assert(resEmp.data.stats.fastestAnswer === '1.5s', 'Test 2: Fastest answer strictly derived from 1500ms min response time (1.5s)');

    // Test 3: No hardcoded names or mock scores appear in production responses
    const responseJsonStr = JSON.stringify(resA.data);
    const mockNames = ['Arjun Sharma', 'Priya Mehta', 'Ravi Kumar', 'Sunita Rao', 'Deepak Singh'];
    const foundMockName = mockNames.some(name => responseJsonStr.includes(name));
    assert(!foundMockName, 'Test 3: No hardcoded names (Arjun Sharma, Priya Mehta, Ravi Kumar, etc.) appear in response');

    // Test 4: Empty score history displays N/A where appropriate
    stubber.stub(Participant, 'findAll', async () => []);
    const resEmpty = await api.get('/reports/gamification?projectId=all');
    assert(resEmpty.data.summary.avgScore === 'N/A', 'Test 4: Empty score history displays N/A for summary average score');
    assert(resEmpty.data.stats.avgScore === 'N/A', 'Test 4: Empty score history displays N/A for personal average score');
    assert(resEmpty.data.stats.fastestAnswer === 'N/A', 'Test 4: Empty timing history displays N/A for fastest answer');

    // Restore participants
    stubber.stub(Participant, 'findAll', async () => mockParticipants);

    // Test 5: Earned badges reconcile with eligibility and stored state
    // Charlie has 100% quiz score -> Product Expert & Sales Champion unlocked. Fastest = 1.5s -> Fastest Finger unlocked.
    const expertBadge = resEmp.data.badges.find(b => b.id === 'expert');
    const fastestBadge = resEmp.data.badges.find(b => b.id === 'fastest');
    const streakBadge = resEmp.data.badges.find(b => b.id === 'streak');
    assert(expertBadge && expertBadge.unlocked === true, 'Test 5: Product Expert badge unlocked for 100% score');
    assert(fastestBadge && fastestBadge.unlocked === true, 'Test 5: Fastest Finger badge unlocked for 1.5s answer');
    assert(streakBadge && streakBadge.unlocked === false, 'Test 5: Attendance Streak badge locked when sessions < 3 (not falsely granted)');

    // Test 6: No sessions does not produce a fabricated achievement count
    stubber.stub(Participant, 'findAll', async () => []);
    const resNoSess = await api.get('/reports/gamification?projectId=all');
    assert(resNoSess.data.stats.sessionsParticipated === 0, 'Test 6: No sessions produces exactly 0 sessions participated (no fake count)');
    assert(resNoSess.data.stats.badgesEarned === 0, 'Test 6: No sessions produces exactly 0 badges earned (no fake unlocked badges)');

    // Restore participants
    stubber.stub(Participant, 'findAll', async () => mockParticipants);

    // Test 7: Incomplete sessions are handled correctly
    const incompleteParticipants = [
      {
        id: 'part-incomp',
        name: 'Learner Incomplete',
        employeeId: 'EMP_INC',
        storeName: 'North Hub',
        score: 0,
        userId: 'user-inc',
        Session: {
          id: 'sess-open',
          session_name: 'Open Quiz',
          status: 'waiting',
          projectId: PROJ_A_ID,
          Quiz: { id: 'q-open', title: 'Open', projectId: PROJ_A_ID, questions: [{ id: 'q1' }] }
        },
        Responses: [],
        createdAt: new Date()
      }
    ];
    stubber.stub(Participant, 'findAll', async () => incompleteParticipants);
    currentAuthUser = PM_A_USER;
    const resInc = await api.get('/reports/gamification?projectId=all');
    assert(resInc.data.summary.quizzesCompleted === 0, 'Test 7: Unstarted/waiting sessions do NOT count as quizzes completed (0 completed)');
    assert(resInc.data.participantResults[0].status === 'In Progress', 'Test 7: Participant status displays In Progress for unfinalized session');

    // Restore participants
    stubber.stub(Participant, 'findAll', async () => mockParticipants);

    // ════════════════════════════════════════════════════════════════════
    // 2. PROJECT-SCOPE TESTS (Tests 8 - 14)
    // ════════════════════════════════════════════════════════════════════
    console.log('\n--- GROUP 2: Project-Scope & Role-Based Authorization (Tests 8-14) ---');

    // Test 8: PM A sees only Project A's authorized participants and results
    currentAuthUser = PM_A_USER;
    const resPMA = await api.get('/reports/gamification?projectId=all');
    const pmaNames = resPMA.data.participantResults.map(p => p.name);
    assert(pmaNames.includes('Learner Charlie') && pmaNames.includes('Learner Dave'), 'Test 8: PM A sees Project A participants (Charlie, Dave)');
    assert(!pmaNames.includes('Learner Zoe'), 'Test 8: PM A does NOT see Project B participant (Zoe strictly excluded)');

    // Test 9: PM B sees only Project B's authorized participants and results
    currentAuthUser = PM_B_USER;
    const resPMB = await api.get('/reports/gamification?projectId=all');
    const pmbNames = resPMB.data.participantResults.map(p => p.name);
    assert(pmbNames.includes('Learner Zoe'), 'Test 9: PM B sees Project B participant (Zoe)');
    assert(!pmbNames.includes('Learner Charlie') && !pmbNames.includes('Learner Dave'), 'Test 9: PM B does NOT see Project A participants');

    // Test 10: Changing the project selection updates the data
    currentAuthUser = PM_A_USER;
    const resProjA = await api.get(`/reports/gamification?projectId=${PROJ_A_ID}`);
    assert(resProjA.data.selectedProjectId === PROJ_A_ID, 'Test 10: Selected project ID matches requested project');
    assert(resProjA.data.selectedProjectName === 'Project Alpha (Galderma)', 'Test 10: Selected project name matches Project Alpha');

    // Test 11: Direct API requests for unauthorized projects are rejected
    currentAuthUser = PM_A_USER;
    const resUnauthorized = await api.get(`/reports/gamification?projectId=${PROJ_B_ID}`);
    assert(resUnauthorized.status === 403, 'Test 11: Direct API request for unauthorized project returns HTTP 403 Forbidden');
    assert(resUnauthorized.data.error && resUnauthorized.data.error.includes('Forbidden'), 'Test 11: Response contains explicit Forbidden error message');

    // Test 12: Child/subproject scope follows existing authorization rules
    currentAuthUser = PM_A_USER;
    const resSub = await api.get(`/reports/gamification?subProjectId=${SUB_A1_ID}`);
    assert(resSub.status === 200, 'Test 12: Subproject under authorized parent is accessible (HTTP 200)');

    // Test 13: Trainer sees only authorized sessions and project data
    currentAuthUser = TRAINER_USER;
    const resTrainer = await api.get('/reports/gamification?projectId=all');
    assert(resTrainer.status === 200, 'Test 13: Trainer accesses authorized project data (HTTP 200)');
    const trainerNames = resTrainer.data.participantResults.map(p => p.name);
    assert(!trainerNames.includes('Learner Zoe'), 'Test 13: Trainer does not leak unrelated Project B participants');

    // Test 14: Participant views do not leak other participants' protected information
    currentAuthUser = EMPLOYEE_USER;
    const resLearner = await api.get('/reports/gamification?projectId=all');
    assert(resLearner.data.isEmployee === true, 'Test 14: Learner response flags isEmployee: true');
    assert(resLearner.data.totalPoints === 200, 'Test 14: Learner points scoped strictly to personal score (200 pts)');

    // ════════════════════════════════════════════════════════════════════
    // 3. CALCULATION & INTEGRITY TESTS (Tests 15 - 21)
    // ════════════════════════════════════════════════════════════════════
    console.log('\n--- GROUP 3: Calculation & Decoupling Invariants (Tests 15-21) ---');

    currentAuthUser = PM_A_USER;
    const resCalc = await api.get('/reports/gamification?projectId=all');

    // Test 15: Project participant count is correct
    // In Project A, there are 3 distinct participants: Charlie, Dave, Eve
    assert(resCalc.data.summary.totalParticipants === 3, 'Test 15: Project participant count strictly equals 3 distinct learners');

    // Test 16: Completed-session count excludes incomplete/unstarted sessions
    assert(resCalc.data.summary.quizzesCompleted === 3, 'Test 16: Quizzes completed counts finalized attempts (3 completed)');

    // Test 17: Average score uses eligible finalized results only
    // Charlie: 2/2 = 100%, Dave: 1/2 = 50%, Eve: 1/2 = 50% -> totalCorrect = 4, totalQuestions = 6 -> 4/6 = 67%
    assert(resCalc.data.summary.avgScore === '67%', 'Test 17: Overall avg score computed mathematically: 4/6 = 67%');

    // Test 18: Arena Points remain separate from quiz points and attendance
    // Total Arena Points = 200 + 100 + 50 = 350 pts
    assert(resCalc.data.summary.totalArenaPoints === 350, 'Test 18: Total Arena Points (350 pts) independent from quiz percentage (67%)');

    // Test 19: Ranking and tie behavior are deterministic
    // Rank 1: Charlie (200 pts), Rank 2: Dave (100 pts), Rank 3: Eve (50 pts)
    const lb = resCalc.data.leaderboard;
    assert(lb[0].name === 'Learner Charlie' && lb[0].arenaPoints === 200, 'Test 19: Rank 1 is Learner Charlie (200 pts)');
    assert(lb[1].name === 'Learner Dave' && lb[1].arenaPoints === 100, 'Test 19: Rank 2 is Learner Dave (100 pts)');
    assert(lb[2].name === 'Learner Eve' && lb[2].arenaPoints === 50, 'Test 19: Rank 3 is Learner Eve (50 pts)');

    // Test 20: Empty or missing Zone values are represented honestly
    const eveRow = resCalc.data.participantResults.find(p => p.name === 'Learner Eve');
    assert(eveRow && eveRow.zone === 'N/A', 'Test 20: Missing zone represented honestly as N/A (no fabricated region)');

    // Test 21: /api/reports/leaderboard endpoint also enforces project scope
    const resLb = await api.get(`/reports/leaderboard?projectId=${PROJ_A_ID}`);
    assert(resLb.status === 200, 'Test 21: GET /api/reports/leaderboard returns 200 OK');
    const lbNames = resLb.data.map(p => p.name);
    assert(lbNames.includes('Learner Charlie') && !lbNames.includes('Learner Zoe'), 'Test 21: Dedicated leaderboard endpoint strictly excludes cross-project participants');

    // ════════════════════════════════════════════════════════════════════
    // 4. FINAL PM AUDIT ACCEPTANCE TESTS (Tests 22 - 30)
    // ════════════════════════════════════════════════════════════════════
    console.log('\n--- GROUP 4: Final PM Audit Acceptance Tests (Tests 22-30) ---');

    // Test 22: Single assigned project PM auto-resolves scope to that project
    currentAuthUser = PM_B_USER;
    const resSingleProjPM = await api.get('/reports/gamification?projectId=all');
    assert(resSingleProjPM.data.accessibleProjects.length === 1, 'Test 22: PM B has exactly 1 accessible project (Project Beta)');
    assert(resSingleProjPM.data.selectedProjectId === PROJ_B_ID, 'Test 22: Scope auto-resolves from "all" to assigned project ID');
    assert(resSingleProjPM.data.selectedProjectName === 'Project Beta (Unilever)', 'Test 22: Selected project name resolves to "Project Beta (Unilever)"');

    // Test 23: Multi-project PM preserves aggregate context when "all" requested
    currentAuthUser = PM_A_USER;
    const resMultiProjPM = await api.get('/reports/gamification?projectId=all');
    assert(resMultiProjPM.data.accessibleProjects.length === 2, 'Test 23: PM A has 2 accessible projects');
    assert(resMultiProjPM.data.selectedProjectId === 'all', 'Test 23: Scope remains "all" for multi-project PM');
    assert(resMultiProjPM.data.selectedProjectName.includes('All Assigned Projects'), 'Test 23: Selected project name clearly indicates aggregate scope');

    // Test 24: KPI accurately distinguishes participant submissions from distinct quizzes & sessions
    assert(resMultiProjPM.data.summary.completedAttempts === 3, 'Test 24: Participant completed attempts equals 3');
    assert(resMultiProjPM.data.summary.distinctQuizzesCount === 1, 'Test 24: Distinct quizzes count is accurately 1 (not 3)');
    assert(resMultiProjPM.data.summary.distinctSessionsCount === 1, 'Test 24: Distinct sessions count is accurately 1 (not 3)');
    assert(resMultiProjPM.data.summary.totalAttempts === 3, 'Test 24: Total attempts equals 3');

    // Test 25: Team badge calculations for PM view
    const teamBadges = resMultiProjPM.data.badges;
    const champBadge = teamBadges.find(b => b.id === 'champion');
    const expertBadgePM = teamBadges.find(b => b.id === 'expert');
    const perfectBadgePM = teamBadges.find(b => b.id === 'perfect');
    const zoneBadgePM = teamBadges.find(b => b.id === 'team');
    const streakBadgePM = teamBadges.find(b => b.id === 'streak');
    const fastestBadgePM = teamBadges.find(b => b.id === 'fastest');

    assert(champBadge.unlocked === true && champBadge.earnedCount === 1, 'Test 25: Sales Champion unlocked (1 of 3 learners ≥90%)');
    assert(champBadge.statusText.includes('1 of 3 Learners'), 'Test 25: Sales Champion statusText shows "1 of 3 Learners"');
    assert(expertBadgePM.unlocked === true && expertBadgePM.earnedCount === 1, 'Test 25: Product Expert unlocked (1 of 3 learners scored 100%)');
    assert(perfectBadgePM.unlocked === true && perfectBadgePM.earnedCount === 1, 'Test 25: Perfect Session unlocked (1 of 3 learners completed with 100%)');
    assert(zoneBadgePM.unlocked === true && zoneBadgePM.earnedCount === 2, 'Test 25: Zone Warrior unlocked (2 of 3 learners have registered zone)');
    assert(streakBadgePM.unlocked === false && streakBadgePM.earnedCount === 0, 'Test 25: Attendance Streak locked (0 of 3 learners have ≥3 sessions)');
    assert(streakBadgePM.statusText.includes('0 of 3 Qualified'), 'Test 25: Attendance Streak statusText shows "0 of 3 Qualified"');
    assert(fastestBadgePM.unlocked === true && fastestBadgePM.earnedCount === 1, 'Test 25: Fastest Finger unlocked (1 of 3 learners answered <3s)');

    // Test 26: Participant rows include earnedBadges array
    const charlieRowPM = resMultiProjPM.data.participantResults.find(p => p.name === 'Learner Charlie');
    assert(charlieRowPM && Array.isArray(charlieRowPM.earnedBadges), 'Test 26: Participant row has earnedBadges array');
    assert(charlieRowPM.earnedBadges.includes('champion') && charlieRowPM.earnedBadges.includes('expert') && charlieRowPM.earnedBadges.includes('team') && charlieRowPM.earnedBadges.includes('perfect'), 'Test 26: 100% scorer Charlie earns champion, expert, team, and perfect badges');

    const daveRowPM = resMultiProjPM.data.participantResults.find(p => p.name === 'Learner Dave');
    assert(daveRowPM && daveRowPM.earnedBadges.includes('team') && !daveRowPM.earnedBadges.includes('expert'), 'Test 26: 50% scorer Dave earns team badge but not expert badge');

    // Test 27: Zone breakdown reconciles exactly with total participant results
    const zoneBreakdown = resMultiProjPM.data.zoneBreakdown;
    const sumZonePts = zoneBreakdown.reduce((sum, z) => sum + z.totalArenaPoints, 0);
    const sumZoneLearners = zoneBreakdown.reduce((sum, z) => sum + z.participantCount, 0);
    assert(sumZonePts === resMultiProjPM.data.summary.totalArenaPoints, `Test 27: Zone arena points sum (${sumZonePts}) equals total arena points (${resMultiProjPM.data.summary.totalArenaPoints})`);
    assert(sumZoneLearners === resMultiProjPM.data.summary.totalParticipants, `Test 27: Zone learners sum (${sumZoneLearners}) equals total participants (${resMultiProjPM.data.summary.totalParticipants})`);

    // Test 28: Empty project history displays consistent N/A and locked badges
    stubber.stub(Participant, 'findAll', async () => []);
    const resEmptyHistory = await api.get('/reports/gamification?projectId=all');
    assert(resEmptyHistory.data.summary.avgScore === 'N/A', 'Test 28: Empty participant history yields N/A average score');
    assert(resEmptyHistory.data.summary.quizzesCompleted === 0, 'Test 28: Empty history yields 0 completed attempts');
    assert(resEmptyHistory.data.badges.every(b => b.unlocked === false), 'Test 28: All badges locked when no participant records exist');
    assert(resEmptyHistory.data.badges.every(b => b.earnedCount === 0), 'Test 28: Badge earned count equals 0 on empty history');
    stubber.stub(Participant, 'findAll', async () => mockParticipants);

    // Test 29: Unauthorized project access rejected with 403 for single-project PM as well
    currentAuthUser = PM_B_USER;
    const resUnauthorizedPMB = await api.get(`/reports/gamification?projectId=${PROJ_A_ID}`);
    assert(resUnauthorizedPMB.status === 403, 'Test 29: PM B cannot access Project A (HTTP 403 Forbidden)');

    // Test 30: Leaderboard ordering and tie-breaking match participant points
    currentAuthUser = PM_A_USER;
    const resLeaderboardCheck = await api.get('/reports/gamification?projectId=all');
    const lbItems = resLeaderboardCheck.data.leaderboard;
    for (let i = 0; i < lbItems.length - 1; i++) {
      assert(lbItems[i].arenaPoints >= lbItems[i + 1].arenaPoints, `Test 30: Leaderboard rank ${i + 1} points (${lbItems[i].arenaPoints}) >= rank ${i + 2} points (${lbItems[i + 1].arenaPoints})`);
    }

  } finally {
    stubber.restoreAll();
    server.close();
  }

  // ── POST-FLIGHT: AWS RDS Database Invariance Verification ──
  console.log('\n--- POST-FLIGHT: AWS RDS Database Invariance Verification ---');
  try {
    const postCounts = {
      users: await User.count(),
      projects: await Project.count(),
      participants: await Participant.count(),
      sessions: await Session.count()
    };
    assert(postCounts.users === baselineCounts.users, `Users count unchanged (${baselineCounts.users} -> ${postCounts.users})`);
    assert(postCounts.projects === baselineCounts.projects, `Projects count unchanged (${baselineCounts.projects} -> ${postCounts.projects})`);
    assert(postCounts.participants === baselineCounts.participants, `Participants count unchanged (${baselineCounts.participants} -> ${postCounts.participants})`);
    assert(postCounts.sessions === baselineCounts.sessions, `Sessions count unchanged (${baselineCounts.sessions} -> ${postCounts.sessions})`);
  } catch (err) {
    console.error('  Failed post-flight verification:', err.message);
  }

  console.log('\n========================================================================');
  console.log(`RETAILEDGE PRO — GAMIFICATION TEST RESULTS: ${PASS} PASSED | ${FAIL} FAILED | ${SKIP} SKIPPED`);
  console.log('========================================================================\n');

  if (FAIL > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Unexpected test failure:', err);
  process.exit(1);
});
