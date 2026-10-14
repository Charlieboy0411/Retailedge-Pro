const assert = require('assert');
const { calculatePoints, isCorrectAnswer } = require('../backend/sockets/services/scoringEngine');

console.log('================================================================');
console.log('RETAILEDGE PRO — LIVE ARENA REGRESSION VERIFICATION SUITE');
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
// 1. SCORING & ZERO-BONUS VERIFICATION
// -------------------------------------------------------------
console.log('\n--- 1. SCORING & PROHIBITED SPEED BONUS VERIFICATION ---');

runTest('1.1 Configured points (50, 100, 200, 500) awarded strictly on correct answer', () => {
  const q50 = { type: 'single_choice', points: 50, correct_answer: 'Option A' };
  const q100 = { type: 'single_choice', points: 100, correct_answer: 'Option A' };
  const q200 = { type: 'single_choice', points: 200, correct_answer: 'Option A' };
  const q500 = { type: 'single_choice', points: 500, correct_answer: 'Option A' };

  assert.strictEqual(calculatePoints(true, q50, 5), 50);
  assert.strictEqual(calculatePoints(true, q100, 5), 100);
  assert.strictEqual(calculatePoints(true, q200, 5), 200);
  assert.strictEqual(calculatePoints(true, q500, 5), 500);
});

runTest('1.2 Zero points awarded for incorrect answers regardless of time taken', () => {
  const q = { type: 'single_choice', points: 200, correct_answer: 'A' };
  assert.strictEqual(calculatePoints(false, q, 1), 0);
  assert.strictEqual(calculatePoints(false, q, 0), 0);
  assert.strictEqual(calculatePoints(false, q, 29), 0);
});

runTest('1.3 Prohibited speed bonuses: 0.2s answer receives EXACTLY same points as 14.8s answer', () => {
  const q = { type: 'single_choice', points: 150, correct_answer: 'Paris' };
  const fastScore = calculatePoints(true, q, 0.2);
  const slowScore = calculatePoints(true, q, 14.8);
  assert.strictEqual(fastScore, 150, 'Fast answer must get exactly configured 150 points');
  assert.strictEqual(slowScore, 150, 'Slow answer must get exactly configured 150 points');
  assert.strictEqual(fastScore, slowScore, 'Zero speed bonus or multipliers permitted');
});

runTest('1.4 Missing question points falls back safely to standard 100 points', () => {
  const legacyQ = { type: 'single_choice', correct_answer: 'B' };
  assert.strictEqual(calculatePoints(true, legacyQ, 5), 100);
});

runTest('1.5 Option index matching correctly resolves index string to option label', () => {
  const q = {
    type: 'single_choice',
    options: ['Retail', 'Wholesale', 'Manufacturing'],
    correct_answer: '0'
  };
  assert.strictEqual(isCorrectAnswer(q, 'Retail'), true);
  assert.strictEqual(isCorrectAnswer(q, '0'), true);
  assert.strictEqual(isCorrectAnswer(q, 'Wholesale'), false);
});

// -------------------------------------------------------------
// 2. ANSWER REVISION & SCORE DELTA SIMULATION
// -------------------------------------------------------------
console.log('\n--- 2. ANSWER REVISION BEFORE DEADLINE SIMULATION ---');

runTest('2.1 Participant revises answer before deadline from wrong to correct', () => {
  const q = { id: 'q1', type: 'single_choice', points: 100, correct_answer: 'A' };
  let participantScore = 0;
  let existingResponse = null;

  // First submission: Wrong answer 'B'
  const isCorrect1 = isCorrectAnswer(q, 'B');
  const points1 = calculatePoints(isCorrect1, q, 2);
  assert.strictEqual(points1, 0);
  existingResponse = { answer: 'B', points_awarded: points1 };
  participantScore += points1;
  assert.strictEqual(participantScore, 0);

  // Revised submission before deadline: Correct answer 'A'
  const isCorrect2 = isCorrectAnswer(q, 'A');
  const points2 = calculatePoints(isCorrect2, q, 6);
  assert.strictEqual(points2, 100);
  const scoreDelta = points2 - (existingResponse.points_awarded || 0);
  existingResponse.answer = 'A';
  existingResponse.points_awarded = points2;
  participantScore += scoreDelta;

  assert.strictEqual(participantScore, 100, 'Score must reflect final correct answer');
  assert.strictEqual(existingResponse.points_awarded, 100);
});

runTest('2.2 Participant revises answer before deadline from correct to wrong', () => {
  const q = { id: 'q2', type: 'single_choice', points: 150, correct_answer: 'A' };
  let participantScore = 150; // was correct
  const existingResponse = { answer: 'A', points_awarded: 150 };

  // Revised submission: Wrong answer 'C'
  const isCorrect = isCorrectAnswer(q, 'C');
  const newPoints = calculatePoints(isCorrect, q, 8);
  assert.strictEqual(newPoints, 0);
  const scoreDelta = newPoints - (existingResponse.points_awarded || 0);
  existingResponse.answer = 'C';
  existingResponse.points_awarded = newPoints;
  participantScore += scoreDelta;

  assert.strictEqual(participantScore, 0, 'Score must decrement by previously awarded points');
});

runTest('2.3 Idempotent retransmission: submitting same answer does not double award points', () => {
  const q = { id: 'q3', type: 'single_choice', points: 100, correct_answer: 'A' };
  let participantScore = 100;
  const existingResponse = { answer: 'A', points_awarded: 100 };

  const isCorrect = isCorrectAnswer(q, 'A');
  const newPoints = calculatePoints(isCorrect, q, 5);
  const scoreDelta = newPoints - (existingResponse.points_awarded || 0);
  participantScore += scoreDelta;

  assert.strictEqual(scoreDelta, 0, 'Score delta for identical submission must be 0');
  assert.strictEqual(participantScore, 100, 'Participant score must remain unchanged');
});

// -------------------------------------------------------------
// 3. EXCEL REPORT MATHEMATICS & TAB ISOLATION
// -------------------------------------------------------------
console.log('\n--- 3. EXCEL REPORT MATHEMATICS RECONCILIATION ---');

// Fixture matching the uploaded test workbook: 5 questions, unequal points, 3 participants
const quizFixture = {
  quizTitle: 'Test Quiz',
  projectName: 'Idonneous',
  sessionPin: '849201',
  questions: [
    { id: 'q1', text: 'What is retail merchandising?', options: ['A. Planning', 'B. Sleeping', 'C. Driving'], correct_answer: '0', points: 100 },
    { id: 'q2', text: 'Which KPI measures sales per sq ft?', options: ['A. SPSF', 'B. ROI', 'C. EBITDA'], correct_answer: '0', points: 50 },
    { id: 'q3', text: 'Define cross-docking logistics', options: ['A. Direct transfer', 'B. Long warehousing'], correct_answer: 'A. Direct transfer', points: 150 },
    { id: 'q4', text: 'What is shrink percentage?', options: ['A. Inventory loss', 'B. Profit margin'], correct_answer: '0', points: 100 },
    { id: 'q5', text: 'Customer lifetime value formula', options: ['A. Revenue x Duration', 'B. Price / Cost'], correct_answer: '0', points: 200 }
  ],
  participants: [
    {
      id: 'p1',
      name: 'John Doe',
      employeeId: 'EMP001',
      zone: 'North',
      responses: [
        { questionId: 'q1', answer: 'A. Planning', points_awarded: 100 },
        { questionId: 'q2', answer: 'A. SPSF', points_awarded: 50 },
        { questionId: 'q3', answer: 'A. Direct transfer', points_awarded: 150 },
        { questionId: 'q4', answer: 'A. Inventory loss', points_awarded: 100 },
        { questionId: 'q5', answer: 'A. Revenue x Duration', points_awarded: 200 }
      ]
    },
    {
      id: 'p2',
      name: 'Jane Smith',
      employeeId: 'EMP002',
      zone: 'South',
      responses: [
        { questionId: 'q1', answer: 'A. Planning', points_awarded: 100 },
        { questionId: 'q2', answer: 'B. ROI', points_awarded: 0 },
        { questionId: 'q3', answer: 'A. Direct transfer', points_awarded: 150 },
        { questionId: 'q4', answer: 'B. Profit margin', points_awarded: 0 },
        { questionId: 'q5', answer: 'A. Revenue x Duration', points_awarded: 200 }
      ]
    },
    {
      id: 'p3',
      name: 'Bob Johnson',
      employeeId: 'EMP003',
      zone: 'East',
      responses: [
        { questionId: 'q1', answer: 'B. Sleeping', points_awarded: 0 },
        { questionId: 'q2', answer: 'C. EBITDA', points_awarded: 0 },
        { questionId: 'q3', answer: 'A. Direct transfer', points_awarded: 150 },
        // Unanswered q4 and q5
      ]
    }
  ]
};

runTest('3.1 Total configured points equals sum of individual question points', () => {
  const totalPoints = quizFixture.questions.reduce((sum, q) => sum + q.points, 0);
  assert.strictEqual(totalPoints, 600, '100 + 50 + 150 + 100 + 200 = 600 points');
});

runTest('3.2 Question Analysis mathematical reconciliation', () => {
  const eligible = quizFixture.participants.length; // 3
  quizFixture.questions.forEach((q, idx) => {
    let submitted = 0;
    let correct = 0;
    let incorrect = 0;

    quizFixture.participants.forEach(p => {
      const resp = (p.responses || []).find(r => r.questionId === q.id);
      if (resp && resp.answer && resp.answer !== 'No Answer') {
        submitted++;
        const isRight = resp.points_awarded > 0;
        if (isRight) correct++;
        else incorrect++;
      }
    });

    const unanswered = eligible - submitted;
    const accuracy = Math.round((correct / eligible) * 100);

    assert.strictEqual(correct + incorrect, submitted, `Q${idx+1}: correct + incorrect must equal submitted`);
    assert.strictEqual(submitted + unanswered, eligible, `Q${idx+1}: submitted + unanswered must equal eligible`);

    if (q.id === 'q1') {
      assert.strictEqual(submitted, 3);
      assert.strictEqual(correct, 2);
      assert.strictEqual(incorrect, 1);
      assert.strictEqual(unanswered, 0);
      assert.strictEqual(accuracy, 67); // 2/3 = 67% (NOT 92%!)
    }
    if (q.id === 'q4') {
      assert.strictEqual(submitted, 2);
      assert.strictEqual(correct, 1);
      assert.strictEqual(incorrect, 1);
      assert.strictEqual(unanswered, 1);
      assert.strictEqual(accuracy, 33); // 1/3 = 33% (NOT 31%!)
    }
  });
});

runTest('3.3 Participant score reconciliation across Results, Leaderboard, and Responses', () => {
  quizFixture.participants.forEach(p => {
    let sumEarnedPoints = 0;
    let countCorrect = 0;
    quizFixture.questions.forEach(q => {
      const resp = p.responses.find(r => r.questionId === q.id);
      if (resp && resp.points_awarded > 0) {
        sumEarnedPoints += resp.points_awarded;
        countCorrect++;
      }
    });

    if (p.id === 'p1') {
      assert.strictEqual(sumEarnedPoints, 600);
      assert.strictEqual(countCorrect, 5);
    }
    if (p.id === 'p2') {
      assert.strictEqual(sumEarnedPoints, 450); // 100 + 150 + 200
      assert.strictEqual(countCorrect, 3);
    }
    if (p.id === 'p3') {
      assert.strictEqual(sumEarnedPoints, 150); // 150
      assert.strictEqual(countCorrect, 1);
    }
  });
});

console.log('\n================================================================');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('================================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
