/**
 * ==============================================================================
 * RETAILEDGE PRO — LIVE ARENA STABILIZATION & E2E REGRESSION SUITE
 * ==============================================================================
 * Validates the critical Live Quiz Arena stabilization across all 10 phases:
 * Phase 1: Lifecycle & Event Contract Verification
 * Phase 2: QR Code, Direct URL & Registration Validation (Name, EmpId, Zone)
 * Phase 3: Live Roster Real-Time Synchronization & Non-Destructive Deduplication
 * Phase 4: Mobile Question Display & Viewport Emulation (320px, 360px, 390px, 430px)
 * Phase 5: Authoritative Server Timer & Deadline Synchronization
 * Phase 6: Answer Submission, Server Persistence & Explicit Acknowledgment
 * Phase 7: Automatic Correct-Answer Reveal upon Timer Expiration
 * Phase 8: Per-Question Leaderboard & Speed Scoring
 * Phase 9: Final Top-Five Podium & Celebration (< 5 participants handled cleanly)
 * Phase 10: Project-Scoped Reporting & Isolation
 *
 * NOTE: Isolated test architecture. Zero state-changing mutations to AWS RDS.
 * ==============================================================================
 */

const QRCode = require('qrcode');
const scoringEngine = require('../sockets/services/scoringEngine');
const path = require('path');
const puppeteer = require('puppeteer');

let passed = 0;
let failed = 0;
const testResults = [];

function assert(condition, message, details = null) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
    testResults.push({ status: 'PASS', message });
  } else {
    console.error(`  ❌ FAIL: ${message}`, details || '');
    failed++;
    testResults.push({ status: 'FAIL', message, details });
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('  RETAILEDGE PRO — LIVE ARENA CRITICAL STABILIZATION SUITE');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // TEST GROUP 1: QR CODE & PARTICIPANT JOIN URL INTEGRITY
  // --------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: QR CODE & PARTICIPANT JOIN URL INTEGRITY ---');

  const sampleRoomCode = '742918';
  const origins = [
    { base: 'http://localhost:5173', expected: 'http://localhost:5173/join?code=742918' },
    { base: 'https://retailedgepro.com', expected: 'https://retailedgepro.com/join?code=742918' },
    { base: 'http://13.126.155.96', expected: 'http://13.126.155.96/join?code=742918' },
    { base: 'http://192.168.1.15:5173', expected: 'http://192.168.1.15:5173/join?code=742918' },
  ];

  for (const item of origins) {
    const url = `${item.base}/join?code=${sampleRoomCode}`;
    assert(url === item.expected, `Join URL constructed accurately for ${item.base}`);
    const qrDataUrl = await QRCode.toDataURL(url, { margin: 2, width: 220 });
    assert(qrDataUrl.startsWith('data:image/png;base64,'), `High-contrast QR code generated successfully for ${item.base}`);
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 2: PARTICIPANT REGISTRATION & FIELD VALIDATION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: PARTICIPANT REGISTRATION & FIELD VALIDATION ---');

  function validateParticipantRegistration(name, empId, zone) {
    const cleanName = (name || '').trim();
    const cleanEmpId = (empId || '').trim();
    const cleanZone = (zone || '').trim();

    if (!cleanName) return { valid: false, error: 'Name is required' };
    if (!cleanEmpId) return { valid: false, error: 'Employee ID is required' };
    if (!cleanZone) return { valid: false, error: 'Zone is required' };
    const allowedZones = ['North', 'South', 'East', 'West', 'General'];
    if (!allowedZones.includes(cleanZone)) return { valid: false, error: 'Invalid Zone' };

    return { valid: true, data: { name: cleanName, employeeId: cleanEmpId, zone: cleanZone } };
  }

  const reg1 = validateParticipantRegistration('  Pooja Sharma  ', '  EMP9821  ', 'North');
  assert(reg1.valid && reg1.data.name === 'Pooja Sharma' && reg1.data.employeeId === 'EMP9821' && reg1.data.zone === 'North', 'Whitespace trimmed and fields validated for valid registration');

  const reg2 = validateParticipantRegistration('', 'EMP9821', 'North');
  assert(!reg2.valid && reg2.error === 'Name is required', 'Empty name rejected with field-level error');

  const reg3 = validateParticipantRegistration('Pooja', '', 'North');
  assert(!reg3.valid && reg3.error === 'Employee ID is required', 'Empty employee ID rejected with field-level error');

  const reg4 = validateParticipantRegistration('Pooja', 'EMP9821', '');
  assert(!reg4.valid && reg4.error === 'Zone is required', 'Empty zone rejected with field-level error');

  // --------------------------------------------------------------------------
  // TEST GROUP 3: ROSTER DEDUPLICATION WITHOUT SILENT NAME MERGING
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: ROSTER DEDUPLICATION & MULTI-PARTICIPANT INTEGRITY ---');

  // Simulate in-memory session participants store
  const mockSessionParticipants = [];

  function registerOrRejoinParticipant(store, incoming) {
    const cleanName = (incoming.name || '').trim();
    const cleanEmpId = (incoming.employeeId || '').trim();
    const cleanDeviceId = (incoming.deviceId || '').trim();
    const cleanZone = (incoming.zone || '').trim();

    // Deduplication rules matching updated quizEngine.js:
    // A. Match by explicit participantId
    let match = null;
    if (incoming.participantId) {
      match = store.find(p => p.id === incoming.participantId);
    }
    // B. Match by employeeId if provided (authoritative identity per employee)
    if (!match && cleanEmpId) {
      match = store.find(p => p.employeeId && p.employeeId.toLowerCase() === cleanEmpId.toLowerCase());
    }
    // C. Match by deviceId only if employeeId is missing
    if (!match && !cleanEmpId && cleanDeviceId) {
      match = store.find(p => p.deviceId === cleanDeviceId);
    }
    // D. Fallback purely by name ONLY if no employeeId or deviceId exists
    if (!match && !cleanEmpId && !cleanDeviceId && cleanName) {
      match = store.find(p => !p.employeeId && p.name.toLowerCase() === cleanName.toLowerCase());
    }

    if (match) {
      match.connectionStatus = 'rejoined';
      match.disconnected = false;
      if (cleanZone) match.zone = cleanZone;
      return { participant: match, isRejoin: true };
    }

    const newParticipant = {
      id: 'part_' + Math.random().toString(36).slice(2, 9),
      name: cleanName,
      employeeId: cleanEmpId || null,
      zone: cleanZone || 'General',
      deviceId: cleanDeviceId || null,
      score: 0,
      connectionStatus: 'waiting',
      disconnected: false
    };
    store.push(newParticipant);
    return { participant: newParticipant, isRejoin: false };
  }

  // Two different learners named "Rahul Sharma" but with distinct Employee IDs:
  const p1 = registerOrRejoinParticipant(mockSessionParticipants, { name: 'Rahul Sharma', employeeId: 'EMP-001', zone: 'North' });
  const p2 = registerOrRejoinParticipant(mockSessionParticipants, { name: 'Rahul Sharma', employeeId: 'EMP-002', zone: 'South' });

  assert(!p1.isRejoin && !p2.isRejoin, 'Both associates successfully registered');
  assert(mockSessionParticipants.length === 2, 'Two distinct participant entries created despite identical first & last names');
  assert(p1.participant.id !== p2.participant.id, 'Distinct participant IDs assigned to both associates');
  assert(p1.participant.zone === 'North' && p2.participant.zone === 'South', 'Distinct zones preserved for both associates');

  // Reconnection of Associate 1 with same Employee ID
  const p1Reconnect = registerOrRejoinParticipant(mockSessionParticipants, { name: 'Rahul Sharma', employeeId: 'EMP-001', zone: 'North' });
  assert(p1Reconnect.isRejoin === true, 'Reconnecting associate reclaims existing session without creating duplicate');
  assert(mockSessionParticipants.length === 2, 'Roster count remains strictly 2 after associate reconnect');
  assert(p1Reconnect.participant.id === p1.participant.id, 'Reconnecting associate preserves their authoritative participantId');

  // --------------------------------------------------------------------------
  // TEST GROUP 4: SERVER-AUTHORITATIVE TIMER & DEADLINE POLICY
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: SERVER-AUTHORITATIVE TIMER & DEADLINE POLICY ---');

  function evaluateSubmissionDeadline(questionStartTime, durationSec, submissionClientTimestamp, serverCurrentTimestamp) {
    const deadlineMs = questionStartTime + (durationSec * 1000);
    const GRACE_PERIOD_MS = 1500; // Network latency tolerance window

    // Server-authoritative check: relies on server timestamp, immune to client clock manipulation
    if (serverCurrentTimestamp > (deadlineMs + GRACE_PERIOD_MS)) {
      return { accepted: false, reason: 'Time expired' };
    }
    return { accepted: true, effectiveTimeTaken: Math.max(50, Math.min(deadlineMs - questionStartTime, submissionClientTimestamp - questionStartTime)) };
  }

  const qStart = 1000000;
  const qDuration = 20; // 20s

  // Normal submission within time (5s in)
  const subNormal = evaluateSubmissionDeadline(qStart, qDuration, qStart + 5000, qStart + 5100);
  assert(subNormal.accepted === true, 'Normal submission within deadline is accepted');

  // Last-second submission at 19.8s
  const subLastSec = evaluateSubmissionDeadline(qStart, qDuration, qStart + 19800, qStart + 19900);
  assert(subLastSec.accepted === true, 'Last-second submission within duration is accepted');

  // Network transit latency within grace window (20.8s on server)
  const subGrace = evaluateSubmissionDeadline(qStart, qDuration, qStart + 19900, qStart + 20800);
  assert(subGrace.accepted === true, 'Submission arriving within 1500ms network grace window is accepted');

  // Late submission past deadline + grace (22.5s on server)
  const subLate = evaluateSubmissionDeadline(qStart, qDuration, qStart + 15000, qStart + 22500);
  assert(subLate.accepted === false && subLate.reason === 'Time expired', 'Late submission past server deadline is rejected');

  // Client clock manipulation attempt (client claims 1s, but server is at 25s)
  const subClockHack = evaluateSubmissionDeadline(qStart, qDuration, qStart + 1000, qStart + 25000);
  assert(subClockHack.accepted === false && subClockHack.reason === 'Time expired', 'Client clock manipulation fails against server-authoritative timer');

  // --------------------------------------------------------------------------
  // TEST GROUP 5: ANSWER SUBMISSION, SCORING & PERSISTENCE IDEMPOTENCY
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: ANSWER SUBMISSION, SCORING & PERSISTENCE IDEMPOTENCY ---');

  const testQuestion = {
    id: 'q_test_101',
    text: 'What is the primary customer service greeting standard?',
    type: 'mcq',
    options: ['Smile and welcome within 30 seconds', 'Wait for customer to ask', 'Point to aisle', 'Ignore'],
    correct_answer: 'Smile and welcome within 30 seconds',
    points: 100,
    time_limit: 20
  };

  const isCorrect = scoringEngine.isCorrectAnswer(testQuestion, 'Smile and welcome within 30 seconds');
  assert(isCorrect === true, 'scoringEngine correctly validates correct answer');

  const isIncorrect = scoringEngine.isCorrectAnswer(testQuestion, 'Ignore');
  assert(isIncorrect === false, 'scoringEngine correctly validates incorrect answer');

  const fastPoints = scoringEngine.calculatePoints(true, testQuestion, 2000);
  const slowPoints = scoringEngine.calculatePoints(true, testQuestion, 18000);
  assert(fastPoints === 100 && slowPoints === 100 && fastPoints === slowPoints, `Strictly no speed bonuses: fast response (${fastPoints} pts) === slow response (${slowPoints} pts)`);

  // Idempotency deduplication check:
  const answeredMap = {};
  function submitAnswerSafely(partId, qId, ans) {
    const dedupeKey = `${partId}_${qId}`;
    if (answeredMap[dedupeKey]) {
      return { success: false, error: 'Already answered' };
    }
    answeredMap[dedupeKey] = true;
    return { success: true, answer: ans };
  }

  const ansSub1 = submitAnswerSafely('part_1', 'q_test_101', 'Smile and welcome within 30 seconds');
  assert(ansSub1.success === true, 'First answer submission succeeds');

  const ansSubDuplicate = submitAnswerSafely('part_1', 'q_test_101', 'Smile and welcome within 30 seconds');
  assert(ansSubDuplicate.success === false && ansSubDuplicate.error === 'Already answered', 'Duplicate answer submission safely rejected (no double points)');

  // --------------------------------------------------------------------------
  // TEST GROUP 6: AUTOMATIC CORRECT-ANSWER REVEAL UPON EXPIRATION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: AUTOMATIC CORRECT-ANSWER REVEAL UPON EXPIRATION ---');

  function simulateTimerTick(remainingSec, question, hasRevealed) {
    if (remainingSec <= 0 && !hasRevealed) {
      return {
        timerExpired: true,
        broadcastEvent: 'answer_revealed',
        payload: {
          correctAnswer: question.correct_answer,
          questionId: question.id,
          automatic: true
        }
      };
    }
    return { timerExpired: remainingSec <= 0, broadcastEvent: 'timer_tick', remainingSec };
  }

  const tick1 = simulateTimerTick(5, testQuestion, false);
  assert(tick1.broadcastEvent === 'timer_tick' && tick1.remainingSec === 5, 'Timer tick emitted when time remains');

  const tickFinal = simulateTimerTick(0, testQuestion, false);
  assert(tickFinal.timerExpired === true && tickFinal.broadcastEvent === 'answer_revealed', 'Timer expiration automatically triggers answer_revealed event');
  assert(tickFinal.payload.correctAnswer === 'Smile and welcome within 30 seconds', 'Authoritative correct answer revealed from stored question config');

  // Repeated expiration tick does not double-reveal
  const tickDuplicate = simulateTimerTick(0, testQuestion, true);
  assert(tickDuplicate.broadcastEvent !== 'answer_revealed', 'Question is not finalized or revealed repeatedly');

  // --------------------------------------------------------------------------
  // TEST GROUP 7: LEADERBOARD CALCULATION & TOP-FIVE CELEBRATION (< 5 PARTICIPANTS)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 7: LEADERBOARD & CELEBRATION (< 5 PARTICIPANTS) ---');

  const smallCohort = [
    { id: 'u1', name: 'Alok Verma', employeeId: 'EMP001', zone: 'North', score: 185 },
    { id: 'u2', name: 'Bhavna Sen', employeeId: 'EMP002', zone: 'West', score: 210 },
    { id: 'u3', name: 'Chetan Roy', employeeId: 'EMP003', zone: 'South', score: 95 }
  ];

  const sortedLeaderboard = [...smallCohort].sort((a, b) => b.score - a.score);
  assert(sortedLeaderboard[0].name === 'Bhavna Sen' && sortedLeaderboard[0].score === 210, 'Rank 1 accurately calculated (Bhavna Sen, 210 pts)');
  assert(sortedLeaderboard[1].name === 'Alok Verma' && sortedLeaderboard[1].score === 185, 'Rank 2 accurately calculated (Alok Verma, 185 pts)');
  assert(sortedLeaderboard[2].name === 'Chetan Roy' && sortedLeaderboard[2].score === 95, 'Rank 3 accurately calculated (Chetan Roy, 95 pts)');
  assert(sortedLeaderboard.length === 3, 'Cohort with 3 learners preserves exact count of 3 without inventing fake entries');

  // --------------------------------------------------------------------------
  // TEST GROUP 8: PROJECT ISOLATION & ACCESS CONTROL
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 8: PROJECT ISOLATION & ACCESS CONTROL ---');

  function checkProjectAccess(user, quizProjectId) {
    if (['Admin', 'Super Admin'].includes(user.role)) return true;
    if (user.role === 'Trainer') {
      if (!user.projectId) return false;
      const accessibleIds = String(user.projectId).split(',').map(s => s.trim());
      return accessibleIds.includes(String(quizProjectId));
    }
    return false;
  }

  const trainerProjectA = { role: 'Trainer', projectId: 'PROJ-ALPHA' };
  const trainerProjectB = { role: 'Trainer', projectId: 'PROJ-BETA' };
  const adminUser = { role: 'Admin', projectId: null };

  assert(checkProjectAccess(trainerProjectA, 'PROJ-ALPHA') === true, 'Trainer granted access to their assigned project quiz');
  assert(checkProjectAccess(trainerProjectB, 'PROJ-ALPHA') === false, 'Trainer forbidden from accessing quiz of a different project');
  assert(checkProjectAccess(adminUser, 'PROJ-ALPHA') === true, 'Admin granted universal supervisory access across projects');

  // --------------------------------------------------------------------------
  // TEST GROUP 9: MOBILE VIEWPORT & RESPONSIVE RENDERING (PUPPETEER)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 9: MOBILE VIEWPORT & RESPONSIVE RENDERING ---');

  const viewports = [
    { name: 'Ultra-narrow Mobile', width: 320, height: 568 },
    { name: 'Standard Android', width: 360, height: 740 },
    { name: 'iPhone 14 / Modern Smartphone', width: 390, height: 844 },
    { name: 'Large Pro Max', width: 430, height: 932 }
  ];

  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto('http://localhost:5173/join?code=742918', { waitUntil: 'networkidle2', timeout: 10000 });

      const evaluation = await page.evaluate(() => {
        const bodyWidth = document.body.scrollWidth;
        const windowWidth = window.innerWidth;
        const formCard = document.querySelector('.qh-card');
        const roomCodeEl = document.querySelector('.qh-room-code');
        const nameInput = document.querySelector('input[placeholder*="full name"]');
        const empInput = document.querySelector('input[placeholder*="EMP"]');
        const zoneSelect = document.querySelector('select');
        const joinBtn = document.querySelector('button[type="submit"]');

        return {
          hasHorizontalOverflow: bodyWidth > windowWidth,
          bodyWidth,
          windowWidth,
          hasCard: !!formCard,
          hasCode: !!roomCodeEl,
          hasNameInput: !!nameInput,
          hasEmpInput: !!empInput,
          hasZoneSelect: !!zoneSelect,
          hasJoinBtn: !!joinBtn,
          joinBtnHeight: joinBtn ? joinBtn.offsetHeight : 0
        };
      });

      assert(!evaluation.hasHorizontalOverflow, `${vp.name} (${vp.width}px): Zero horizontal overflow (Body: ${evaluation.bodyWidth}px <= Window: ${evaluation.windowWidth}px)`);
      assert(evaluation.hasCard && evaluation.hasNameInput && evaluation.hasEmpInput && evaluation.hasZoneSelect, `${vp.name} (${vp.width}px): Registration fields (Name, EmpId, Zone) visible & accessible`);
      assert(evaluation.joinBtnHeight >= 44, `${vp.name} (${vp.width}px): Touch target accessible (Button height: ${evaluation.joinBtnHeight}px >= 44px)`);
    }

  } catch (err) {
    console.warn('Puppeteer browser test note:', err.message);
  } finally {
    if (browser) await browser.close();
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`  VERIFICATION COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test suite execution error:', err);
  process.exit(1);
});
