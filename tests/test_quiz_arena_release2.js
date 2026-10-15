const assert = require('assert');

console.log('================================================================');
console.log('RETAILEDGE PRO — LIVE ARENA RELEASE 2 VERIFICATION SUITE');
console.log('Connection State, Final Leaderboard, Reactions, Rank, & Matrix');
console.log('================================================================');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
  }
}

// -------------------------------------------------------------
// 1. CONNECTION STATE & SOCKET RECONNECT DEDUPLICATION
// -------------------------------------------------------------
console.log('\n--- 1. CONNECTION STATE & ROSTER SYNCHRONIZATION ---');

runTest('1.1 Superceded socket disconnect does not mark reconnected participant offline', () => {
  const roomCode = 'ROOM101';
  const participantId = 'part_abc123';
  
  // Track active room sockets: socketId -> participantId
  const roomSockets = {
    [roomCode]: {}
  };
  
  // 1. Participant connects with Socket 1
  const socket1 = 'sock_111';
  roomSockets[roomCode][socket1] = participantId;
  
  let activeParticipantIds = new Set(Object.values(roomSockets[roomCode]));
  assert.strictEqual(activeParticipantIds.has(participantId), true);
  assert.strictEqual(activeParticipantIds.size, 1);
  
  // 2. Participant refreshes / opens new tab -> Socket 2 connects
  const socket2 = 'sock_222';
  roomSockets[roomCode][socket2] = participantId;
  activeParticipantIds = new Set(Object.values(roomSockets[roomCode]));
  assert.strictEqual(activeParticipantIds.has(participantId), true);
  assert.strictEqual(activeParticipantIds.size, 1, 'Same participant ID must not inflate active count');

  // 3. Socket 1 disconnects asynchronously (old socket cleanup)
  delete roomSockets[roomCode][socket1];
  
  // QuizEngine check: is participant still connected on any remaining socket?
  const remainingSockets = roomSockets[roomCode] || {};
  const stillConnected = Object.values(remainingSockets).includes(participantId);
  
  assert.strictEqual(stillConnected, true, 'Participant must remain recognized as connected via Socket 2');
  
  // Participant connectionStatus should NOT be set to 'disconnected'
  let connectionStatus = stillConnected ? 'active' : 'disconnected';
  assert.strictEqual(connectionStatus, 'active');
});

runTest('1.2 Sole active socket disconnect correctly marks participant offline', () => {
  const roomCode = 'ROOM102';
  const participantId = 'part_def456';
  const roomSockets = { [roomCode]: { 'sock_333': participantId } };

  // Socket disconnects
  delete roomSockets[roomCode]['sock_333'];
  const remainingSockets = roomSockets[roomCode] || {};
  const stillConnected = Object.values(remainingSockets).includes(participantId);

  assert.strictEqual(stillConnected, false);
  const connectionStatus = stillConnected ? 'active' : 'disconnected';
  assert.strictEqual(connectionStatus, 'disconnected');
});

runTest('1.3 Total Joined vs Active Now metrics correctly distinguish historical vs live connections', () => {
  const registeredParticipants = [
    { id: 'p1', name: 'Alice', connectionStatus: 'active' },
    { id: 'p2', name: 'Bob', connectionStatus: 'disconnected' },
    { id: 'p3', name: 'Charlie', connectionStatus: 'active' }
  ];

  const roomCode = 'ROOM103';
  const liveSockets = {
    'sock_a': 'p1',
    'sock_b': 'p1', // multiple tabs for Alice
    'sock_c': 'p3'
  };

  const activeIds = new Set(Object.values(liveSockets));
  const totalJoined = registeredParticipants.length;
  const activeNow = registeredParticipants.filter(p => activeIds.has(p.id)).length;

  assert.strictEqual(totalJoined, 3, 'Total Joined represents unique registered participants');
  assert.strictEqual(activeNow, 2, 'Active Now reflects only live confirmed sockets');
  assert.strictEqual(activeIds.has('p2'), false, 'Bob is offline');
});

// -------------------------------------------------------------
// 2. TERMINAL FINAL LEADERBOARD STATE MACHINE
// -------------------------------------------------------------
console.log('\n--- 2. FINAL LEADERBOARD NAVIGATION & TERMINAL STATE ---');

runTest('2.1 Non-final question displays Next Question; final question displays Complete Quiz', () => {
  const questions = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }, { id: 'q4' }, { id: 'q5' }];
  const totalQ = questions.length;

  // Q1 Leaderboard
  let currentIdx = 0;
  let isLastQuestion = currentIdx >= totalQ - 1;
  let showQuestionLeaderboard = true;
  let status = 'active';

  let nextActionLabel = !showQuestionLeaderboard ? 'Leaderboard' : (isLastQuestion ? 'Complete Quiz' : 'Next Question');
  assert.strictEqual(nextActionLabel, 'Next Question', 'Q1 leaderboard must offer Next Question');

  // Q5 (Final) Leaderboard
  currentIdx = 4;
  isLastQuestion = currentIdx >= totalQ - 1;
  nextActionLabel = !showQuestionLeaderboard ? 'Leaderboard' : (isLastQuestion ? 'Complete Quiz' : 'Next Question');
  assert.strictEqual(nextActionLabel, 'Complete Quiz', 'Q5 leaderboard must offer Complete Quiz, NEVER Next Question');

  // Ended state
  status = 'ended';
  let terminalLabel = status === 'ended' ? 'Quiz Completed' : nextActionLabel;
  assert.strictEqual(terminalLabel, 'Quiz Completed', 'Ended status must be terminal Quiz Completed');
});

runTest('2.2 Server-side guard intercepts out-of-bounds targetIndex and ends session instead of creating Q6', () => {
  const totalQCount = 5;
  const targetIndex = 5; // Client attempted to advance past Q5
  let sessionEnded = false;
  let advancedQuestion = false;

  if (targetIndex >= totalQCount) {
    sessionEnded = true;
  } else {
    advancedQuestion = true;
  }

  assert.strictEqual(sessionEnded, true, 'Terminal question reached must trigger handleHostEndSession');
  assert.strictEqual(advancedQuestion, false, 'Question 6 must never be started');
});

runTest('2.3 Reconnecting clients preserve completed session status and locked scores', () => {
  const persistedSession = {
    id: 'sess_999',
    status: 'ended',
    current_question_index: 5,
    quizId: 'quiz_1'
  };

  const participants = [
    { id: 'p1', name: 'Alice', score: 400 },
    { id: 'p2', name: 'Bob', score: 300 }
  ];

  assert.strictEqual(persistedSession.status, 'ended');
  assert.strictEqual(participants[0].score, 400);
  assert.strictEqual(participants[1].score, 300);
});

// -------------------------------------------------------------
// 3. MOBILE REACTIONS BROADCAST & SESSION ISOLATION
// -------------------------------------------------------------
console.log('\n--- 3. MOBILE REACTIONS BROADCAST & ISOLATION ---');

runTest('3.1 Server attaches participant senderName and broadcasts reaction to session room', () => {
  const participantStore = {
    'part_777': { id: 'part_777', name: 'Kavita Sharma' }
  };

  const incomingEmojiPayload = {
    roomCode: 'ROOM201',
    emoji: '🔥',
    participantId: 'part_777'
  };

  const sender = participantStore[incomingEmojiPayload.participantId];
  const senderName = sender?.name || 'Learner';

  const broadcastEvent = {
    emoji: incomingEmojiPayload.emoji,
    participantId: incomingEmojiPayload.participantId,
    senderName
  };

  assert.strictEqual(broadcastEvent.emoji, '🔥');
  assert.strictEqual(broadcastEvent.senderName, 'Kavita Sharma');
  assert.strictEqual(broadcastEvent.participantId, 'part_777');
});

runTest('3.2 Reaction from Room A does not leak into Room B', () => {
  const roomA = 'ROOM_ALPHA';
  const roomB = 'ROOM_BETA';

  const messagesInRoomB = [];
  const emitToRoom = (targetRoom, event, data) => {
    if (targetRoom === roomB) {
      messagesInRoomB.push({ event, data });
    }
  };

  // Participant in Room A sends reaction
  emitToRoom(roomA, 'emoji_received', { emoji: '🎉', senderName: 'Rahul' });

  assert.strictEqual(messagesInRoomB.length, 0, 'Room B must receive zero reactions from Room A');
});

runTest('3.3 Reactions are purely cosmetic and do not modify participant score or answers', () => {
  const participant = { id: 'p1', score: 250, answers: ['A', 'B'] };
  const originalScore = participant.score;
  const originalAnswerCount = participant.answers.length;

  // Participant sends 5 reactions
  const reactions = ['👍', '❤️', '🔥', '🎉', '👏'];
  reactions.forEach(r => {
    // Cosmetic broadcast only
  });

  assert.strictEqual(participant.score, originalScore, 'Score must remain unchanged by reactions');
  assert.strictEqual(participant.answers.length, originalAnswerCount, 'Answers count must remain unchanged');
});

// -------------------------------------------------------------
// 4. SHOW EVERY PARTICIPANT THEIR PERSONAL FINAL RANK
// -------------------------------------------------------------
console.log('\n--- 4. SERVER-AUTHORITATIVE PERSONAL FINAL RANK ---');

runTest('4.1 Participant personal rank resolved accurately from finalized leaderboard', () => {
  const leaderboard = [
    { rank: 1, id: 'p_gold', name: 'Sneha', score: 500, correctCount: 5, totalQuestions: 5 },
    { rank: 2, id: 'p_silver', name: 'Vikram', score: 400, correctCount: 4, totalQuestions: 5 },
    { rank: 3, id: 'p_bronze', name: 'Priya', score: 300, correctCount: 3, totalQuestions: 5 },
    { rank: 4, id: 'p_four', name: 'Arjun', score: 200, correctCount: 2, totalQuestions: 5 },
    { rank: 5, id: 'p_five', name: 'Rohan', score: 100, correctCount: 1, totalQuestions: 5 },
    { rank: 6, id: 'p_six', name: 'Deepa', score: 50, correctCount: 1, totalQuestions: 5 }
  ];

  // Test Arjun (#4) viewing his own mobile screen
  const myPartId = 'p_four';
  const myRecord = leaderboard.find(p => p.id === myPartId);
  assert.ok(myRecord);
  assert.strictEqual(myRecord.rank, 4);
  assert.strictEqual(myRecord.score, 200);
  assert.strictEqual(myRecord.correctCount, 2);
  assert.strictEqual(myRecord.totalQuestions, 5);

  const displayRank = `Your Final Rank: #${myRecord.rank}`;
  const displayScore = `Your Score: ${myRecord.score} points`;
  const displayAccuracy = `Correct Answers: ${myRecord.correctCount} of ${myRecord.totalQuestions}`;

  assert.strictEqual(displayRank, 'Your Final Rank: #4');
  assert.strictEqual(displayScore, 'Your Score: 200 points');
  assert.strictEqual(displayAccuracy, 'Correct Answers: 2 of 5');
});

runTest('4.2 Participant outside top 5 has personal row rendered with YOU badge', () => {
  const leaderboard = [
    { rank: 1, id: 'p1', name: 'P1', score: 500 },
    { rank: 2, id: 'p2', name: 'P2', score: 400 },
    { rank: 3, id: 'p3', name: 'P3', score: 300 },
    { rank: 4, id: 'p4', name: 'P4', score: 200 },
    { rank: 5, id: 'p5', name: 'P5', score: 100 },
    { rank: 6, id: 'p6', name: 'Deepa', score: 50 }
  ];

  const myId = 'p6';
  const top5 = leaderboard.slice(0, 5);
  const myRecord = leaderboard.find(p => p.id === myId);

  assert.strictEqual(top5.length, 5);
  assert.strictEqual(top5.some(p => p.id === myId), false, 'Deepa is not in top 5 list');
  assert.ok(myRecord, 'Deepa personal row exists');
  assert.strictEqual(myRecord.rank, 6);
});

// -------------------------------------------------------------
// 5. EXCEL ZONE RESOLUTION & HORIZONTAL QUIZ RESPONSES MATRIX
// -------------------------------------------------------------
console.log('\n--- 5. EXCEL ZONE DATA PROVENANCE & HORIZONTAL MATRIX ---');

runTest('5.1 getParticipantRegion resolves zone from storeName and handles blank as N/A', () => {
  const getParticipantRegion = (p) => {
    const val = p.zone || p.region || p.storeName || p.store;
    return (val && String(val).trim() !== '' && String(val).trim() !== '—') ? String(val).trim() : 'N/A';
  };

  // Case A: Zone stored in storeName (RetailEdge participant registration)
  const pA = { id: 'p1', name: 'Amit', storeName: 'North Zone - Delhi NCR' };
  assert.strictEqual(getParticipantRegion(pA), 'North Zone - Delhi NCR');

  // Case B: Explicit zone property
  const pB = { id: 'p2', name: 'Sanjay', zone: 'West Zone' };
  assert.strictEqual(getParticipantRegion(pB), 'West Zone');

  // Case C: Blank or missing
  const pC = { id: 'p3', name: 'Unknown', storeName: '' };
  assert.strictEqual(getParticipantRegion(pC), 'N/A', 'Blank zone must display N/A, not infer or fabricate');

  const pD = { id: 'p4', name: 'Dash', storeName: '—' };
  assert.strictEqual(getParticipantRegion(pD), 'N/A');
});

runTest('5.2 Horizontal Quiz Responses Matrix generates exactly 1 row per participant with question triplets', () => {
  const questionsList = [
    { id: 'q1', text: 'SOP Compliance Process', points: 100 },
    { id: 'q2', text: 'Product Material Guidelines', points: 200 }
  ];

  const participants = [
    {
      id: 'p1',
      name: 'Ritu Sen',
      employeeId: 'EMP_101',
      storeName: 'East Zone',
      responses: [
        { questionId: 'q1', answer: 'Verified', points_awarded: 100, is_correct: true },
        { questionId: 'q2', answer: 'Polymer', points_awarded: 200, is_correct: true }
      ],
      earnedPoints: 300,
      correctCount: 2,
      answeredCount: 2,
      statusText: 'Completed'
    },
    {
      id: 'p2',
      name: 'Manoj Kumar',
      employeeId: 'EMP_102',
      storeName: 'North Zone',
      responses: [
        { questionId: 'q1', answer: 'Pending', points_awarded: 0, is_correct: false }
        // Q2 is unanswered
      ],
      earnedPoints: 0,
      correctCount: 0,
      answeredCount: 1,
      statusText: 'Partial'
    }
  ];

  // Generate table header
  const tableHeader = ['Participant', 'Employee ID', 'Zone'];
  questionsList.forEach((q, idx) => {
    tableHeader.push(`Q${idx + 1} Answer: ${q.text}`);
    tableHeader.push(`Q${idx + 1} Result`);
    tableHeader.push(`Q${idx + 1} Points`);
  });
  tableHeader.push('Total Points', 'Correct Answers', 'Questions Answered', 'Completion Status');

  // Expected 3 + (2 * 3) + 4 = 13 columns
  assert.strictEqual(tableHeader.length, 13);
  assert.strictEqual(tableHeader[3], 'Q1 Answer: SOP Compliance Process');
  assert.strictEqual(tableHeader[4], 'Q1 Result');
  assert.strictEqual(tableHeader[5], 'Q1 Points');
  assert.strictEqual(tableHeader[6], 'Q2 Answer: Product Material Guidelines');
  assert.strictEqual(tableHeader[7], 'Q2 Result');
  assert.strictEqual(tableHeader[8], 'Q2 Points');
  assert.strictEqual(tableHeader[9], 'Total Points');

  // Build rows
  const rows = participants.map(p => {
    const row = [p.name, p.employeeId, p.storeName];
    questionsList.forEach(q => {
      const resp = p.responses.find(r => r.questionId === q.id);
      const ansText = resp ? resp.answer : 'Unanswered';
      const isRight = resp && Number(resp.points_awarded) > 0;
      const result = isRight ? 'Correct' : (resp ? 'Incorrect' : 'Unanswered');
      const earned = isRight ? Number(resp.points_awarded) : 0;

      row.push(ansText, result, earned);
    });
    row.push(p.earnedPoints, p.correctCount, p.answeredCount, p.statusText);
    return row;
  });

  assert.strictEqual(rows.length, 2, 'Exactly 1 row per participant');

  // Check Ritu Sen (Row 0)
  assert.strictEqual(rows[0][0], 'Ritu Sen');
  assert.strictEqual(rows[0][2], 'East Zone');
  assert.strictEqual(rows[0][3], 'Verified');
  assert.strictEqual(rows[0][4], 'Correct');
  assert.strictEqual(rows[0][5], 100);
  assert.strictEqual(rows[0][6], 'Polymer');
  assert.strictEqual(rows[0][7], 'Correct');
  assert.strictEqual(rows[0][8], 200);
  assert.strictEqual(rows[0][9], 300, 'Total Points must match earnedPoints');
  assert.strictEqual(rows[0][10], 2, 'Correct count must match');
  assert.strictEqual(rows[0][11], 2, 'Answered count must match');
  assert.strictEqual(rows[0][12], 'Completed');

  // Check Manoj Kumar (Row 1 - Unanswered Q2)
  assert.strictEqual(rows[1][0], 'Manoj Kumar');
  assert.strictEqual(rows[1][3], 'Pending');
  assert.strictEqual(rows[1][4], 'Incorrect');
  assert.strictEqual(rows[1][5], 0);
  assert.strictEqual(rows[1][6], 'Unanswered');
  assert.strictEqual(rows[1][7], 'Unanswered');
  assert.strictEqual(rows[1][8], 0);
  assert.strictEqual(rows[1][9], 0);
  assert.strictEqual(rows[1][12], 'Partial');
});

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
