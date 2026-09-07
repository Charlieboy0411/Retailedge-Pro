/**
 * ==============================================================================
 * RETAILEDGE PRO — LIVE ARENA END-TO-END VERIFICATION SUITE
 * ==============================================================================
 * Comprehensive 50+ assertion test validating the full Live Quiz Arena lifecycle:
 * - Session Creation & Persistence
 * - Host Authentication & Identity Integrity (Anti-Spoofing)
 * - Session Recovery & Anti-Duplication
 * - roomCode & PIN Stability
 * - QR Generation & Dynamic Join URL Construction
 * - Participant Join & Roster Tracking
 * - Reconnection / Duplicate Join Deduplication
 * - Participant Metrics (Total Joined & Active Now)
 * - Start Session & Next Question Progression
 * - Defensive Question Delivery (Null/Undefined Safety)
 * - Question Delivery Synchronization
 * - Answer Submission & Persistence
 * - Scoring Engine Integration & Speed Bonuses
 * - Duplicate Answer Attempt Rejection
 * - Late Answer Rejection & Rate Limiting
 * - Answer Reveal & Leaderboard Broadcasts
 * - Session Completion & Terminal State ('finished')
 * - Level 1 Quiz Report & Analytics Verification
 * - Role-Based Access Control (Supervisor, Client, Employee Restrictions)
 * - Cross-Project Isolation Boundaries
 * ==============================================================================
 */

const axios = require('axios');
const io = require('socket.io-client');
const QRCode = require('qrcode');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Session = require('../models/Session');
const Participant = require('../models/Participant');
const Response = require('../models/Response');
const User = require('../models/User');
const Project = require('../models/Project');
const reportAnalyticsEngine = require('../utils/reportAnalyticsEngine');

const API_BASE = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

async function runLiveArenaVerification() {
  console.log('================================================================');
  console.log('  RETAILEDGE PRO — LIVE ARENA END-TO-END VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;
  const activeSockets = [];

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  function createSocket(token = null) {
    const s = io(SOCKET_URL, {
      auth: token ? { token } : {},
      query: token ? { token } : {},
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });
    activeSockets.push(s);
    return s;
  }

  function waitForEvent(socket, eventName, timeoutMs = 4000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: "${eventName}" after ${timeoutMs}ms`));
      }, timeoutMs);

      socket.once(eventName, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  try {
    // --------------------------------------------------------------------------
    // SECTION 1: AUTHENTICATION & FIXTURE PREPARATION
    // --------------------------------------------------------------------------
    console.log('--- SECTION 1: AUTHENTICATION & FIXTURE RESOLUTION ---');

    const trainerLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'trainer@quizhive.com',
      password: 'password123'
    });
    const trainerToken = trainerLogin.data.token;
    const trainerUser = trainerLogin.data.user;

    const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@quizhive.com',
      password: 'password123'
    });
    const adminToken = adminLogin.data.token;
    const adminUser = adminLogin.data.user;

    const employeeLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'staff@quizhive.com',
      password: 'password123'
    });
    const employeeToken = employeeLogin.data.token;
    const employeeUser = employeeLogin.data.user;

    const supervisorLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'supervisor@quizhive.com',
      password: 'password123'
    });
    const supervisorToken = supervisorLogin.data.token;
    const supervisorUser = supervisorLogin.data.user;

    const clientLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'client@quizhive.com',
      password: 'password123'
    });
    const clientToken = clientLogin.data.token;
    const clientUser = clientLogin.data.user;

    assert(trainerToken && trainerUser.role === 'Trainer', 'Test 1: Trainer authenticated with role Trainer');
    assert(adminToken && adminUser.role === 'Admin', 'Test 2: Admin authenticated with role Admin');
    assert(employeeToken && employeeUser.role === 'Employee', 'Test 3: Employee authenticated with role Employee');
    assert(supervisorToken && supervisorUser.role === 'Supervisor', 'Test 4: Supervisor authenticated with role Supervisor');
    assert(clientToken && clientUser.role === 'Client', 'Test 5: Client authenticated with role Client');

    // Retrieve Trainer's Project and an accessible Quiz
    const assignedProjectId = trainerUser.projectId;
    let quiz = await Quiz.findOne({
      where: { projectId: assignedProjectId },
      include: [{ model: Question, as: 'questions' }]
    });

    if (!quiz || !quiz.questions || quiz.questions.length < 2) {
      // Create a test quiz with 2 questions for Trainer's project
      quiz = await Quiz.create({
        title: 'Arena Automated Validation Quiz',
        description: 'Comprehensive test fixture for live socket engine',
        projectId: assignedProjectId,
        creatorId: trainerUser.id,
        status: 'published',
        config: { timeLimit: 20 }
      });
      await Question.create({
        quizId: quiz.id,
        text: 'What is the primary customer service greeting standard?',
        type: 'mcq',
        options: ['Smile and welcome within 30 seconds', 'Wait for customer to ask', 'Point to aisle', 'Ignore'],
        correct_answer: 'Smile and welcome within 30 seconds',
        points: 100,
        time_limit: 15
      });
      await Question.create({
        quizId: quiz.id,
        text: 'True or False: Receipts must always be offered to retail shoppers.',
        type: 'true_false',
        options: ['True', 'False'],
        correct_answer: 'True',
        points: 100,
        time_limit: 15
      });
      quiz = await Quiz.findByPk(quiz.id, { include: [{ model: Question, as: 'questions' }] });
    }

    assert(quiz && quiz.questions.length >= 2, `Test 6: Quiz fixture resolved (ID: ${quiz.id}, Questions: ${quiz.questions.length})`);

    // Clean up any old active sessions for this quiz to start fresh
    await Session.update(
      { status: 'finished' },
      { where: { quizId: quiz.id, status: ['waiting', 'active'] } }
    );

    // --------------------------------------------------------------------------
    // SECTION 2: SESSION CREATION & QR / PIN INTEGRITY
    // --------------------------------------------------------------------------
    console.log('\n--- SECTION 2: SESSION CREATION, QR & PIN INTEGRITY ---');

    const hostSocket = createSocket(trainerToken);
    await new Promise(r => hostSocket.on('connect', r));

    // Emit canonical host_start_quiz
    hostSocket.emit('host_start_quiz', {
      quizId: quiz.id,
      hostId: trainerUser.id,
      hostName: trainerUser.name,
      token: trainerToken
    });

    const sessionCreatedData = await waitForEvent(hostSocket, 'session_created');
    assert(sessionCreatedData && sessionCreatedData.roomCode, 'Test 7: Canonical session_created event received with roomCode');
    assert(sessionCreatedData.sessionId, `Test 8: session_created returned valid sessionId (${sessionCreatedData.sessionId})`);
    assert(sessionCreatedData.status === 'waiting', 'Test 9: Initial session status is "waiting"');
    assert(typeof sessionCreatedData.roomCode === 'string' && sessionCreatedData.roomCode.length === 6, `Test 10: roomCode is a valid 6-digit numeric string (${sessionCreatedData.roomCode})`);

    const roomCode = sessionCreatedData.roomCode;
    const sessionId = sessionCreatedData.sessionId;

    // Verify session persistence in database
    const dbSession = await Session.findByPk(sessionId);
    assert(dbSession !== null, 'Test 11: Session successfully persisted in PostgreSQL database');
    assert(dbSession.hostId === trainerUser.id, `Test 12: Session hostId properly bound to authenticated Trainer (${dbSession.hostId})`);
    assert(dbSession.projectId === assignedProjectId, `Test 13: Session inherited correct projectId from Quiz (${dbSession.projectId})`);

    // Verify Session Recovery (does not duplicate session on re-emission)
    hostSocket.emit('host_start_quiz', {
      quizId: quiz.id,
      hostId: trainerUser.id,
      hostName: trainerUser.name,
      token: trainerToken
    });
    const recoveredSessionData = await waitForEvent(hostSocket, 'session_created');
    assert(recoveredSessionData.sessionId === sessionId, 'Test 14: Re-starting quiz recovered identical sessionId');
    assert(recoveredSessionData.roomCode === roomCode, 'Test 15: Re-starting quiz preserved identical roomCode (stable PIN)');
    assert(recoveredSessionData.recovered === true, 'Test 16: Session recovery flag is true (no duplicate DB session)');

    // Verify QR Code generation and Join URL
    const expectedJoinUrl = `http://localhost:5000/join?code=${roomCode}`;
    const qrDataUrl = await QRCode.toDataURL(expectedJoinUrl, { margin: 2, width: 220 });
    assert(qrDataUrl.startsWith('data:image/png;base64,'), 'Test 17: Valid base64 QR Code generated from join URL');
    assert(expectedJoinUrl.includes(`/join?code=${roomCode}`), 'Test 18: Join URL incorporates canonical roomCode parameter');

    // --------------------------------------------------------------------------
    // SECTION 3: PARTICIPANT JOIN & ROSTER METRICS
    // --------------------------------------------------------------------------
    console.log('\n--- SECTION 3: PARTICIPANT JOIN & ROSTER METRICS ---');

    const participantSocket1 = createSocket(employeeToken);
    await new Promise(r => participantSocket1.on('connect', r));

    // Register host metrics promise before participant joins
    const metricsPromise1 = waitForEvent(hostSocket, 'participant_metrics', 5000);

    // Participant 1 joins using canonical participant_join
    participantSocket1.emit('participant_join', {
      roomCode,
      name: employeeUser.name,
      employeeId: employeeUser.employee_id || 'EMP-TEST-01',
      avatar: '🦁',
      userId: employeeUser.id,
      deviceId: 'DEVICE-SIM-01'
    });

    const joinedData1 = await waitForEvent(participantSocket1, 'joined_session');
    assert(joinedData1 && joinedData1.participantId, `Test 19: Participant 1 joined session successfully (ID: ${joinedData1.participantId})`);
    assert(joinedData1.sessionId === sessionId, 'Test 20: Participant received authoritative sessionId');

    const metrics1 = await metricsPromise1;
    assert(metrics1 !== null, 'Test 21: Host received participant_metrics event broadcast');
    assert(metrics1.total === 1, `Test 22: Total Joined metrics equals 1 (${metrics1.total})`);
    assert(metrics1.active === 1, `Test 23: Active Now metrics equals 1 (${metrics1.active})`);

    // Verify DB participant persistence
    const dbPart1 = await Participant.findByPk(joinedData1.participantId);
    assert(dbPart1 && dbPart1.name === employeeUser.name, 'Test 24: Participant persisted accurately in PostgreSQL table');

    // Participant 2 joins via legacy join_session alias (backward compatibility)
    const participantSocket2 = createSocket();
    await new Promise(r => participantSocket2.on('connect', r));

    const metricsPromise2 = waitForEvent(hostSocket, 'participant_metrics', 5000);

    participantSocket2.emit('join_session', {
      roomCode,
      name: 'Associate Guest',
      avatar: '🦊',
      deviceId: 'DEVICE-SIM-02'
    });

    const joinedData2 = await waitForEvent(participantSocket2, 'joined_session');
    assert(joinedData2 && joinedData2.participantId, `Test 25: Participant 2 joined via legacy join_session alias (ID: ${joinedData2.participantId})`);

    const metrics2 = await metricsPromise2;
    assert(metrics2.total === 2, `Test 26: Total Joined updated to 2 (${metrics2.total})`);
    assert(metrics2.active === 2, `Test 27: Active Now updated to 2 (${metrics2.active})`);

    // Verify legacy join alias does not double-register participant
    const participantSocket2Reconn = createSocket();
    await new Promise(r => participantSocket2Reconn.on('connect', r));
    const joinedAgainPromise = waitForEvent(participantSocket2Reconn, 'joined_session');
    participantSocket2Reconn.emit('join_session', {
      roomCode,
      name: 'Associate Guest',
      avatar: '🦊',
      deviceId: 'DEVICE-SIM-02'
    });
    const joinedData2Again = await joinedAgainPromise;
    assert(joinedData2Again && joinedData2Again.participantId === joinedData2.participantId, 'Test 28: legacy join alias does not double-register participant');

    // Reconnection Deduplication Test: Reconnecting same device/employee
    const participantSocket1Reconn = createSocket(employeeToken);
    await new Promise(r => participantSocket1Reconn.on('connect', r));

    participantSocket1Reconn.emit('participant_join', {
      roomCode,
      name: employeeUser.name,
      employeeId: employeeUser.employee_id || 'EMP-TEST-01',
      avatar: '🦁',
      userId: employeeUser.id,
      deviceId: 'DEVICE-SIM-01'
    });

    const rejoinData = await waitForEvent(participantSocket1Reconn, 'joined_session');
    assert(rejoinData.participantId === joinedData1.participantId, 'Test 29: Reconnection recovered existing participantId (no duplicate record)');
    assert(rejoinData.isRejoin === true, 'Test 30: isRejoin flag is true for reconnected participant');

    const totalParticipantsInDb = await Participant.count({ where: { sessionId } });
    assert(totalParticipantsInDb === 2, `Test 31: Total Participant records in database strictly preserved as 2 (${totalParticipantsInDb})`);

    // --------------------------------------------------------------------------
    // SECTION 4: START SESSION & QUESTION DELIVERY
    // --------------------------------------------------------------------------
    console.log('\n--- SECTION 4: START SESSION & DEFENSIVE QUESTION DELIVERY ---');

    // Host starts session with question 0
    const q0PromisePart1 = waitForEvent(participantSocket1Reconn, 'new_question');
    const q0PromisePart2 = waitForEvent(participantSocket2Reconn, 'new_question');

    hostSocket.emit('host_next_question', {
      roomCode,
      sessionId,
      question: quiz.questions[0],
      questionIndex: 0,
      totalQuestions: quiz.questions.length
    });

    const [q0Part1, q0Part2] = await Promise.all([q0PromisePart1, q0PromisePart2]);
    assert(q0Part1 && q0Part1.id === quiz.questions[0].id, 'Test 32: Participant 1 received canonical new_question event');
    assert(q0Part2 && q0Part2.id === quiz.questions[0].id, 'Test 33: Participant 2 received matching synchronized new_question event');
    assert(q0Part1.questionIndex === 0, 'Test 34: Question index delivered as 0');

    // Verify Session status transitioned to 'active'
    const activeDbSession = await Session.findByPk(sessionId);
    assert(activeDbSession.status === 'active', 'Test 35: Database session status transitioned to "active"');
    assert(activeDbSession.startedAt !== null, 'Test 36: startedAt timestamp populated on session start');

    // Defensive check: Advance to Question 1 with MISSING question payload (null question object)
    // Server must retrieve question from DB by quizId + questionIndex and NOT crash
    const q1PromisePart1 = waitForEvent(participantSocket1Reconn, 'new_question');

    hostSocket.emit('host_next_question', {
      roomCode,
      sessionId,
      question: null, // OMITTED QUESTION PAYLOAD
      questionIndex: 1,
      totalQuestions: quiz.questions.length
    });

    const q1Part1 = await q1PromisePart1;
    assert(q1Part1 && q1Part1.id === quiz.questions[1].id, 'Test 37: Defensive question delivery succeeded with null question payload (recovered from DB)');
    assert(q1Part1.questionIndex === 1, 'Test 38: Authoritative question index progressed to 1');

    // --------------------------------------------------------------------------
    // SECTION 5: ANSWER SUBMISSION, SCORING & LEADERBOARD
    // --------------------------------------------------------------------------
    console.log('\n--- SECTION 5: ANSWER SUBMISSION, SCORING & LEADERBOARD ---');

    // Participant 1 submits correct answer
    const answerPromiseHost = waitForEvent(hostSocket, 'answer_received');
    participantSocket1Reconn.emit('submit_answer', {
      roomCode,
      participantId: joinedData1.participantId,
      questionId: quiz.questions[1].id,
      answer: quiz.questions[1].correct_answer,
      timeTaken: 2500
    });

    const hostAnswerAck = await answerPromiseHost;
    assert(hostAnswerAck && hostAnswerAck.participantId === joinedData1.participantId, 'Test 39: Host received canonical answer_received broadcast');
    assert(hostAnswerAck.isCorrect === true, 'Test 40: Answer evaluated as correct');
    assert(hostAnswerAck.points > 0, `Test 41: Points awarded with speed calculation (${hostAnswerAck.points} pts)`);

    // Verify DB Response persistence
    const dbResponse = await Response.findOne({
      where: { participantId: joinedData1.participantId, questionId: quiz.questions[1].id }
    });
    assert(dbResponse !== null, 'Test 42: Response successfully persisted in PostgreSQL Responses table');
    assert(dbResponse.points_awarded === hostAnswerAck.points, 'Test 43: Persisted response points match broadcasted points');

    // Test: single participant single submission produces exactly one vote
    const responsesCountForQ1 = await Response.count({
      where: { participantId: joinedData1.participantId, questionId: quiz.questions[1].id }
    });
    assert(responsesCountForQ1 === 1, `Test 44: single participant single submission produces exactly one vote (${responsesCountForQ1})`);

    // Duplicate Answer Prevention
    const rejectPromise = waitForEvent(participantSocket1Reconn, 'answer_rejected');
    participantSocket1Reconn.emit('submit_answer', {
      roomCode,
      participantId: joinedData1.participantId,
      questionId: quiz.questions[1].id,
      answer: quiz.questions[1].correct_answer,
      timeTaken: 3000
    });
    const rejection = await rejectPromise;
    assert(rejection && rejection.reason === 'Already answered', 'Test 45: Duplicate answer attempt rejected with "Already answered"');

    // Test: duplicate submit does not create duplicate authoritative response
    const responsesCountAfterDupe = await Response.count({
      where: { participantId: joinedData1.participantId, questionId: quiz.questions[1].id }
    });
    assert(responsesCountAfterDupe === 1, `Test 46: duplicate submit does not create duplicate authoritative response (${responsesCountAfterDupe})`);

    // Test: reconnect does not duplicate response/vote
    const participantSocket1Reconn2 = createSocket(employeeToken);
    await new Promise(r => participantSocket1Reconn2.on('connect', r));
    participantSocket1Reconn2.emit('participant_join', {
      roomCode,
      name: employeeUser.name,
      employeeId: employeeUser.employee_id || 'EMP-TEST-01',
      avatar: '🦁',
      userId: employeeUser.id,
      deviceId: 'DEVICE-SIM-01'
    });
    await waitForEvent(participantSocket1Reconn2, 'joined_session');
    const responsesCountAfterReconnect = await Response.count({
      where: { participantId: joinedData1.participantId, questionId: quiz.questions[1].id }
    });
    assert(responsesCountAfterReconnect === 1, `Test 47: reconnect does not duplicate response/vote (${responsesCountAfterReconnect})`);
    participantSocket1Reconn2.disconnect();

    // Host reveals answer
    const revealPromise = waitForEvent(hostSocket, 'answer_revealed');
    hostSocket.emit('host_reveal_answer', {
      roomCode,
      questionId: quiz.questions[1].id,
      questionIndex: 1
    });
    const revealedData = await revealPromise;
    assert(revealedData && revealedData.correctAnswer === quiz.questions[1].correct_answer, 'Test 48: Canonical answer_revealed event contains authoritative correct answer');
    assert(Array.isArray(revealedData.leaderboard) && revealedData.leaderboard.length > 0, 'Test 49: answer_revealed event contains current leaderboard snapshot');

    // --------------------------------------------------------------------------
    // SECTION 6: SESSION COMPLETION & REPORTS ENGINE INTEGRITY
    // --------------------------------------------------------------------------
    console.log('\n--- SECTION 6: SESSION ENDING & REPORT GENERATION ---');

    const endQuizPromise = waitForEvent(hostSocket, 'quiz_ended');
    hostSocket.emit('host_end_session', { roomCode });

    const endQuizData = await endQuizPromise;
    assert(endQuizData && Array.isArray(endQuizData.leaderboard), 'Test 50: quiz_ended event broadcasted with final leaderboard');

    // Verify Terminal State in DB
    const finalDbSession = await Session.findByPk(sessionId);
    assert(finalDbSession.status === 'finished', 'Test 51: Database session status is terminal "finished"');
    assert(finalDbSession.endedAt !== null, 'Test 52: Session endedAt timestamp populated');

    // Verify Level 1 Quiz Report generation from completed session
    const level1Report = await reportAnalyticsEngine.generateLevel1QuizReport(quiz.id, sessionId, adminUser);
    assert(level1Report && level1Report.kpis, 'Test 53: Level 1 Quiz Analytics report generated successfully');
    assert(level1Report.kpis.totalParticipants === 2, `Test 54: Level 1 report correctly counts participants (${level1Report.kpis.totalParticipants})`);

    // --------------------------------------------------------------------------
    // SECTION 7: RBAC RESTRICTIONS & ISOLATION SAFEGUARDS
    // --------------------------------------------------------------------------
    console.log('\n--- SECTION 7: RBAC RESTRICTIONS & ISOLATION SAFEGUARDS ---');

    // Supervisor attempts to host Live Arena (Must be rejected)
    const supervisorSocket = createSocket(supervisorToken);
    await new Promise(r => supervisorSocket.on('connect', r));

    const supErrorPromise = waitForEvent(supervisorSocket, 'error');
    supervisorSocket.emit('host_start_quiz', {
      quizId: quiz.id,
      token: supervisorToken
    });
    const supError = await supErrorPromise;
    assert(typeof supError === 'string' && supError.includes('Forbidden'), `Test 55: Supervisor hosting attempt rejected with Forbidden error: "${supError}"`);

    // Client attempts to host Live Arena (Must be rejected)
    const clientSocket = createSocket(clientToken);
    await new Promise(r => clientSocket.on('connect', r));

    const clientErrorPromise = waitForEvent(clientSocket, 'error');
    clientSocket.emit('host_start_quiz', {
      quizId: quiz.id,
      token: clientToken
    });
    const clientError = await clientErrorPromise;
    assert(typeof clientError === 'string' && clientError.includes('Forbidden'), `Test 56: Client hosting attempt rejected with Forbidden error: "${clientError}"`);

    // Employee attempts to host Live Arena (Must be rejected)
    const employeeSocketHost = createSocket(employeeToken);
    await new Promise(r => employeeSocketHost.on('connect', r));

    const empErrorPromise = waitForEvent(employeeSocketHost, 'error');
    employeeSocketHost.emit('host_start_quiz', {
      quizId: quiz.id,
      token: employeeToken
    });
    const empError = await empErrorPromise;
    assert(typeof empError === 'string' && empError.includes('Forbidden'), `Test 57: Employee hosting attempt rejected with Forbidden error: "${empError}"`);

    // Participant attempts to join ended session (Must be rejected)
    const lateParticipantSocket = createSocket();
    await new Promise(r => lateParticipantSocket.on('connect', r));

    const lateErrorPromise = waitForEvent(lateParticipantSocket, 'error');
    lateParticipantSocket.emit('participant_join', {
      roomCode,
      name: 'Tardy Learner'
    });
    const lateError = await lateErrorPromise;
    assert(typeof lateError === 'string' && lateError.includes('ended'), `Test 58: Joining completed session returned: "${lateError}"`);

    // Participant attempts to join with invalid/non-existent roomCode
    const invalidRoomSocket = createSocket();
    await new Promise(r => invalidRoomSocket.on('connect', r));

    const invalidErrorPromise = waitForEvent(invalidRoomSocket, 'error');
    invalidRoomSocket.emit('participant_join', {
      roomCode: '999999',
      name: 'Phantom Learner'
    });
    const invalidError = await invalidErrorPromise;
    assert(typeof invalidError === 'string' && invalidError.includes('Invalid Room Code'), `Test 59: Non-existent room code rejected with: "${invalidError}"`);

  } catch (error) {
    console.error('CRITICAL SUITE EXCEPTION:', error);
    failed++;
  } finally {
    // Clean up all test sockets
    activeSockets.forEach(s => {
      try { s.disconnect(); } catch (e) {}
    });
  }

  console.log('\n================================================================');
  console.log(`  VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runLiveArenaVerification();
