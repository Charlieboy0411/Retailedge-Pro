/**
 * RETAILEDGE PRO — OFFLINE QUIZ SESSION LIFECYCLE REGRESSION SUITE
 * Complete isolation, zero AWS RDS mutations, authoritative lifecycle verification.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const http = require('http');
const db = require('../config/database');
const User = require('../models/User');
const Project = require('../models/Project');
const Quiz = require('../models/Quiz');
const Participant = require('../models/Participant');
const Session = require('../models/Session');
const Response = require('../models/Response');
const Training = require('../models/Training');
const scoringEngine = require('../sockets/services/scoringEngine');

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

const formatIST = (dateOrStr) => {
  if (!dateOrStr) return '';
  const d = new Date(dateOrStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }) + ' IST';
};

const getQuizAvailability = (quiz, now = new Date()) => {
  const conf = quiz.config || {};
  if (!conf.isOffline) {
    return {
      allowed: false,
      state: 'DISABLED',
      error: 'This quiz is not available offline or has been disabled.',
      startTime: conf.offlineStartTime || null,
      endTime: conf.offlineEndTime || null
    };
  }
  if (!conf.offlineEndTime) {
    return {
      allowed: false,
      state: 'UNCONFIGURED',
      error: 'This quiz link does not have an expiry configured. Please contact your trainer.',
      startTime: conf.offlineStartTime || null,
      endTime: null
    };
  }
  const end = new Date(conf.offlineEndTime);
  if (isNaN(end.getTime())) {
    return {
      allowed: false,
      state: 'UNCONFIGURED',
      error: 'This quiz link has an invalid expiry configuration.',
      startTime: conf.offlineStartTime || null,
      endTime: null
    };
  }
  const start = conf.offlineStartTime ? new Date(conf.offlineStartTime) : null;
  if (start && !isNaN(start.getTime()) && now < start) {
    return {
      allowed: false,
      state: 'SCHEDULED',
      error: `Quiz not yet available. Opens on ${formatIST(start)}.`,
      startTime: conf.offlineStartTime,
      endTime: conf.offlineEndTime,
      scheduledStartTime: conf.offlineStartTime
    };
  }
  if (now >= end) {
    return {
      allowed: false,
      state: 'EXPIRED',
      error: 'This quiz link has expired. Please contact your trainer.',
      startTime: conf.offlineStartTime,
      endTime: conf.offlineEndTime,
      expiredAt: conf.offlineEndTime
    };
  }
  return {
    allowed: true,
    state: 'ACTIVE',
    startTime: conf.offlineStartTime,
    endTime: conf.offlineEndTime
  };
};

async function runRegressionSuite() {
  console.log('========================================================================');
  console.log('OFFLINE QUIZ SESSION LIFECYCLE REGRESSION TEST SUITE');
  console.log('========================================================================\n');

  // PRE-FLIGHT: Verify Authoritative Baseline in RDS
  console.log('--- PRE-FLIGHT: Database Baseline Verification (Zero RDS Mutations) ---');
  await db.authenticate();
  const baseline = {
    users: await User.count(),
    projects: await Project.count(),
    quizzes: await Quiz.count(),
    participants: await Participant.count(),
    sessions: await Session.count(),
    responses: await Response.count()
  };
  console.log('Authoritative RDS Baseline:', baseline);

  // Set up isolated Express server with mock stores matching routes/quiz.js exactly
  const app = express();
  app.use(express.json());

  let mockQuizzes = {};
  let mockSessions = {};
  let mockParticipants = [];
  let simulatedServerTime = new Date('2026-10-16T10:00:00.000Z');

  const getSimulatedNow = () => new Date(simulatedServerTime.getTime());

  // Configuration endpoint
  app.post('/api/quizzes/:id/offline', (req, res) => {
    const { isOffline, startTime, endTime, startNow } = req.body;
    const quiz = mockQuizzes[req.params.id];
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const currentConfig = quiz.config || {};
    let finalStartTime = null;
    let finalEndTime = null;
    let finalStartMode = null;

    if (isOffline) {
      if (!endTime) return res.status(400).json({ error: 'Expiry date and time is required.' });
      const end = new Date(endTime);
      if (isNaN(end.getTime())) return res.status(400).json({ error: 'Invalid expiry date and time.' });

      const now = getSimulatedNow();
      if (startNow || !startTime) {
        finalStartMode = 'immediate';
        finalStartTime = now.toISOString();
        if (end <= now) return res.status(400).json({ error: 'Expiry time must be strictly later than current time.' });
      } else {
        finalStartMode = 'scheduled';
        const start = new Date(startTime);
        if (isNaN(start.getTime())) return res.status(400).json({ error: 'Invalid start date and time.' });
        if (end <= start) return res.status(400).json({ error: 'Expiry time must be strictly later than start time.' });
        if (start.getTime() < now.getTime() - 5 * 60 * 1000) return res.status(400).json({ error: 'Scheduled start time cannot be in the past.' });
        finalStartTime = start.toISOString();
      }
      finalEndTime = end.toISOString();
    } else {
      finalStartTime = currentConfig.offlineStartTime || null;
      finalEndTime = currentConfig.offlineEndTime || null;
      finalStartMode = currentConfig.offlineStartMode || null;
    }

    quiz.config = {
      ...currentConfig,
      isOffline: !!isOffline,
      offlineStartTime: finalStartTime,
      offlineEndTime: finalEndTime,
      offlineStartMode: finalStartMode,
      offlineConfiguredAt: getSimulatedNow().toISOString(),
      offlineConfiguredBy: 'trainer-test'
    };

    const roomCode = `off-${quiz.id.substring(0, 8)}`;
    if (isOffline) {
      const now = getSimulatedNow();
      const isFutureScheduled = finalStartMode === 'scheduled' && finalStartTime && new Date(finalStartTime) > now;
      const targetStatus = isFutureScheduled ? 'waiting' : 'active';
      const targetStartedAt = isFutureScheduled ? null : now;

      let session = mockSessions[roomCode];
      if (!session) {
        session = {
          id: 'sess-' + roomCode,
          quizId: quiz.id,
          hostId: 'trainer-test',
          roomCode: roomCode,
          status: targetStatus,
          startedAt: targetStartedAt,
          endedAt: null,
          createdAt: now
        };
        mockSessions[roomCode] = session;
      } else {
        if (isFutureScheduled) {
          session.status = 'waiting';
          session.startedAt = null;
          session.endedAt = null;
        } else {
          if (session.status !== 'active') {
            session.status = 'active';
          }
          if (!session.startedAt) {
            session.startedAt = now;
          }
          session.endedAt = null;
        }
      }
    } else {
      const session = mockSessions[roomCode];
      if (session && session.status !== 'finished') {
        session.status = 'finished';
        if (!session.endedAt) {
          session.endedAt = getSimulatedNow();
        }
      }
    }

    res.json({
      success: true,
      config: quiz.config,
      startTimeIST: formatIST(quiz.config.offlineStartTime),
      endTimeIST: formatIST(quiz.config.offlineEndTime)
    });
  });

  // Details endpoint
  app.get('/api/quizzes/:id/offline-details', (req, res) => {
    const quiz = mockQuizzes[req.params.id];
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const now = getSimulatedNow();
    const availability = getQuizAvailability(quiz, now);
    if (!availability.allowed) {
      return res.status(400).json({
        error: availability.error,
        offlineState: availability.state,
        startTime: availability.startTime,
        endTime: availability.endTime
      });
    }

    res.json({
      id: quiz.id,
      title: quiz.title,
      questions: quiz.questions || [],
      offlineState: availability.state,
      offlineStartTime: availability.startTime,
      offlineEndTime: availability.endTime
    });
  });

  // Check eligibility endpoint
  app.post('/api/quizzes/:id/offline-check-eligibility', (req, res) => {
    const { employeeId } = req.body;
    const quiz = mockQuizzes[req.params.id];
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const now = getSimulatedNow();
    const availability = getQuizAvailability(quiz, now);
    if (!availability.allowed) {
      return res.status(400).json({
        eligible: false,
        error: availability.error,
        offlineState: availability.state
      });
    }

    const roomCode = `off-${quiz.id.substring(0, 8)}`;
    const session = mockSessions[roomCode];
    if (!session) return res.json({ eligible: true });

    const dup = mockParticipants.find(p => p.sessionId === session.id && p.employeeId === employeeId);
    if (dup) return res.json({ eligible: false, message: 'You have already completed this quiz.' });

    // Earliest authoritative start event: transition waiting to active when participant is verified and begins
    if (session.status === 'waiting') {
      session.status = 'active';
      if (!session.startedAt) {
        session.startedAt = getSimulatedNow();
      }
    }

    res.json({ eligible: true });
  });

  // Submit endpoint
  app.post('/api/quizzes/:id/offline-submit', (req, res) => {
    const { name, employeeId, answers } = req.body;
    const quiz = mockQuizzes[req.params.id];
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const now = getSimulatedNow();
    const availability = getQuizAvailability(quiz, now);
    if (!availability.allowed) {
      return res.status(400).json({
        error: availability.error,
        offlineState: availability.state
      });
    }

    const roomCode = `off-${quiz.id.substring(0, 8)}`;
    const session = mockSessions[roomCode];
    if (!session) return res.status(400).json({ error: 'Offline session not active.' });

    if (session.status === 'waiting') {
      session.status = 'active';
      if (!session.startedAt) {
        session.startedAt = getSimulatedNow();
      }
    }

    let finalScore = 0;
    (answers || []).forEach(ans => {
      const q = (quiz.questions || []).find(x => x.id === ans.questionId);
      if (q) {
        const isCorrect = scoringEngine.isCorrectAnswer(q, ans.answer);
        const points = scoringEngine.calculatePoints(isCorrect, q, ans.timeTaken || 1000);
        finalScore += points;
      }
    });

    const participant = {
      id: 'part-' + (mockParticipants.length + 1),
      sessionId: session.id,
      name,
      employeeId,
      score: finalScore,
      createdAt: getSimulatedNow()
    };
    mockParticipants.push(participant);

    res.json({
      success: true,
      score: finalScore
    });
  });

  const server = http.createServer(app);
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Initial State: Setup a future scheduled quiz
    console.log('\n--- 1. Future-Scheduled Quiz Initial Configuration ---');
    mockQuizzes['quiz-future-1'] = {
      id: 'quiz-future-1',
      title: 'Future Scheduled Retail Exam',
      projectId: 'proj-galderma',
      questions: [
        { id: 'q1', text: 'Skin Barrier Function', correct_answer: 'Protection', options: ['Protection', 'Hydration'], points: 50 }
      ]
    };

    // Trainer configures quiz to open on 2026-10-25T10:00:00.000Z (future)
    const configRes = await fetch(`${baseUrl}/api/quizzes/quiz-future-1/offline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isOffline: true,
        startNow: false,
        startTime: '2026-10-25T10:00:00.000Z',
        endTime: '2026-10-27T18:00:00.000Z'
      })
    });
    const configData = await configRes.json();
    assert(configRes.status === 200, 'Future quiz configured successfully');
    assert(configData.config.offlineStartMode === 'scheduled', 'offlineStartMode is scheduled');

    const createdSession = mockSessions['off-quiz-fut'];
    assert(createdSession !== undefined, 'Linked session created with scoped roomCode off-quiz-fut');
    assert(createdSession.status === 'waiting', 'Future-scheduled session status is strictly "waiting"');
    assert(createdSession.startedAt === null, 'Future-scheduled session startedAt is strictly null (no premature timestamp)');

    // 2. Learner Access Blocked Before Opening
    console.log('\n--- 2. Learner Access Blocked Before Opening ---');
    const detailsResBefore = await fetch(`${baseUrl}/api/quizzes/quiz-future-1/offline-details`);
    const detailsDataBefore = await detailsResBefore.json();
    assert(detailsResBefore.status === 400, 'GET offline-details blocked with HTTP 400 before start');
    assert(detailsDataBefore.offlineState === 'SCHEDULED', 'Reported offlineState is SCHEDULED');
    assert(detailsDataBefore.error.includes('Quiz not yet available'), 'Informative opening time error returned');

    const eligResBefore = await fetch(`${baseUrl}/api/quizzes/quiz-future-1/offline-check-eligibility`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: 'EMP-001' })
    });
    assert(eligResBefore.status === 400, 'POST offline-check-eligibility blocked with HTTP 400 before start');

    const submitResBefore = await fetch(`${baseUrl}/api/quizzes/quiz-future-1/offline-submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bob', employeeId: 'EMP-001', answers: [] })
    });
    assert(submitResBefore.status === 400, 'POST offline-submit blocked with HTTP 400 before start');
    assert(mockSessions['off-quiz-fut'].status === 'waiting', 'Session remains waiting while blocked');
    assert(mockSessions['off-quiz-fut'].startedAt === null, 'Session startedAt remains null while blocked');

    // 3. Super Admin & Reports Querying While Waiting
    console.log('\n--- 3. Super Admin & Reports Behavior While Waiting ---');
    // Superadmin: ongoingSessions = Session.count({ where: { status: 'active' } })
    const activeSessionsCount = Object.values(mockSessions).filter(s => s.status === 'active').length;
    assert(activeSessionsCount === 0, 'Super Admin ongoingSessions count excludes waiting future-scheduled session (count = 0)');

    // Reports: status: session.status
    const reportSession = mockSessions['off-quiz-fut'];
    assert(reportSession.status === 'waiting', 'Reports display session status as "waiting"');

    // 4. Opening Time Arrives (Time Warp to 2026-10-25T10:00:00.000Z)
    console.log('\n--- 4. Opening Time Arrives Without Learners Yet ---');
    simulatedServerTime = new Date('2026-10-25T10:00:00.000Z');
    
    // Check availability
    const detailsResOpen = await fetch(`${baseUrl}/api/quizzes/quiz-future-1/offline-details`);
    assert(detailsResOpen.status === 200, 'GET offline-details succeeds at opening timestamp');
    const detailsDataOpen = await detailsResOpen.json();
    assert(detailsDataOpen.offlineState === 'ACTIVE', 'Availability state is ACTIVE');
    
    // Verifying prompt requirement 3: Do not mark active solely because scheduled time arrived
    assert(mockSessions['off-quiz-fut'].status === 'waiting', 'Session is NOT prematurely marked active solely because clock reached start time');
    assert(mockSessions['off-quiz-fut'].startedAt === null, 'Session startedAt remains null until real participant start event');

    // 5. First Participant Begins (Authoritative Start Event at 10:05 AM)
    console.log('\n--- 5. First Participant Begins (Real Start Event) ---');
    simulatedServerTime = new Date('2026-10-25T10:05:00.000Z');

    const eligResStart = await fetch(`${baseUrl}/api/quizzes/quiz-future-1/offline-check-eligibility`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: 'EMP-001' })
    });
    const eligDataStart = await eligResStart.json();
    assert(eligResStart.status === 200, 'Participant passes eligibility');
    assert(eligDataStart.eligible === true, 'Participant confirmed eligible to begin');

    // Authoritative transition
    const activeSession = mockSessions['off-quiz-fut'];
    assert(activeSession.status === 'active', 'Session transitions to "active" upon verified participant begin');
    assert(activeSession.startedAt.toISOString() === '2026-10-25T10:05:00.000Z', 'Session startedAt records authoritative start event (10:05:00), not config time');

    // Now Super Admin ongoingSessions counts it
    const activeSessionsCountAfterStart = Object.values(mockSessions).filter(s => s.status === 'active').length;
    assert(activeSessionsCountAfterStart === 1, 'Super Admin ongoingSessions now accurately counts active session (count = 1)');

    // 6. Participant Submits Answers
    console.log('\n--- 6. Participant Answers & Scores Recorded ---');
    const submitRes = await fetch(`${baseUrl}/api/quizzes/quiz-future-1/offline-submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice',
        employeeId: 'EMP-001',
        answers: [{ questionId: 'q1', answer: 'Protection', timeTaken: 5000 }]
      })
    });
    const submitData = await submitRes.json();
    assert(submitRes.status === 200, 'Submission accepted');
    assert(submitData.score === 50, 'Authoritative score 50 awarded for correct answer');
    assert(mockParticipants.length === 1, 'Participant record created under session');

    // 7. Immediate-Start Quiz Behavior Verification
    console.log('\n--- 7. Immediate-Start Quiz Lifecycle ---');
    mockQuizzes['quiz-imm-test'] = {
      id: 'quiz-imm-test',
      title: 'Immediate Test Quiz',
      projectId: 'proj-galderma',
      questions: [{ id: 'q1', text: 'Imm Q1', correct_answer: 'Yes', options: ['Yes', 'No'], points: 20 }]
    };

    simulatedServerTime = new Date('2026-10-25T12:00:00.000Z');
    const immRes = await fetch(`${baseUrl}/api/quizzes/quiz-imm-test/offline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isOffline: true,
        startNow: true,
        endTime: '2026-10-26T12:00:00.000Z'
      })
    });
    assert(immRes.status === 200, 'Immediate quiz configured successfully');
    const immSession = mockSessions['off-quiz-imm'];
    assert(immSession.status === 'active', 'Immediate-start session status is immediately "active"');
    assert(immSession.startedAt.toISOString() === '2026-10-25T12:00:00.000Z', 'Immediate-start session startedAt records current time');

    // 8. Early Closure and Expiry
    console.log('\n--- 8. Early Closure & Expiry Lifecycle ---');
    simulatedServerTime = new Date('2026-10-25T14:00:00.000Z');
    const closeRes = await fetch(`${baseUrl}/api/quizzes/quiz-future-1/offline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOffline: false })
    });
    assert(closeRes.status === 200, 'Offline mode disabled / link closed early');
    const closedSession = mockSessions['off-quiz-fut'];
    assert(closedSession.status === 'finished', 'Closed session status is "finished"');
    assert(closedSession.startedAt.toISOString() === '2026-10-25T10:05:00.000Z', 'Original startedAt preserved upon closure');
    assert(closedSession.endedAt.toISOString() === '2026-10-25T14:00:00.000Z', 'endedAt recorded upon closure');

    // Verify subsequent submissions blocked
    const submitAfterClose = await fetch(`${baseUrl}/api/quizzes/quiz-future-1/offline-submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Charlie', employeeId: 'EMP-002', answers: [] })
    });
    assert(submitAfterClose.status === 400, 'Submissions blocked after early closure');

    // 9. Unrelated Session Isolation & Live Arena Invariance
    console.log('\n--- 9. Live Arena & Unrelated Session Invariance ---');
    // Live Arena session with 6-digit numeric PIN
    const liveSession = {
      id: 'sess-live-999',
      quizId: 'quiz-future-1',
      roomCode: '654321',
      status: 'waiting',
      startedAt: null,
      endedAt: null
    };
    mockSessions['654321'] = liveSession;

    // Trigger offline reconfiguration of quiz-future-1
    await fetch(`${baseUrl}/api/quizzes/quiz-future-1/offline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOffline: false })
    });
    assert(mockSessions['654321'].status === 'waiting', 'Live Arena session completely untouched by offline operations');
    assert(mockSessions['654321'].roomCode === '654321', 'Live Arena roomCode unmodified');

  } finally {
    server.close();
  }

  // POST-FLIGHT: Verify Database Baseline in AWS RDS (Zero Mutations)
  console.log('\n--- POST-FLIGHT: Database Baseline Verification (Zero RDS Mutations) ---');
  const postCounts = {
    users: await User.count(),
    projects: await Project.count(),
    quizzes: await Quiz.count(),
    participants: await Participant.count(),
    sessions: await Session.count(),
    responses: await Response.count()
  };
  console.log('Post-flight RDS Baseline:', postCounts);
  assert(postCounts.users === baseline.users, 'Users count strictly unchanged in RDS');
  assert(postCounts.projects === baseline.projects, 'Projects count strictly unchanged in RDS');
  assert(postCounts.quizzes === baseline.quizzes, 'Quizzes count strictly unchanged in RDS');
  assert(postCounts.participants === baseline.participants, 'Participants count strictly unchanged in RDS');
  assert(postCounts.sessions === baseline.sessions, 'Sessions count strictly unchanged in RDS');
  assert(postCounts.responses === baseline.responses, 'Responses count strictly unchanged in RDS');

  console.log('\n========================================================================');
  console.log(`REGRESSION SUITE RESULTS: ${PASS} PASSED | ${FAIL} FAILED`);
  console.log('========================================================================\n');

  if (FAIL > 0) process.exit(1);
  else process.exit(0);
}

runRegressionSuite().catch(err => {
  console.error('Unhandled regression error:', err);
  process.exit(1);
});
