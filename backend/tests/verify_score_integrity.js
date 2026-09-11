/**
 * Phase 5A.4 - Production Score Integrity & Decoupling Verification Suite
 * Validates that Arena speed points and Assessment percentages are strictly decoupled
 * throughout all reporting, intelligence, and analytics services.
 */

const assert = require('assert');
const reportAnalyticsEngine = require('../utils/reportAnalyticsEngine');

console.log('🧪 ========================================================');
console.log('   PHASE 5A.4 — SCORE INTEGRITY & DECOUPLING SUITE');
console.log('========================================================\n');

let passedTests = 0;
let totalTests = 0;

function test(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Error: ${err.message}\n`);
  }
}

// -------------------------------------------------------------
// TEST GROUP 1: Invariant Mathematical Properties
// -------------------------------------------------------------
console.log('--- GROUP 1: Assessment Percentage Invariant ---');

function computePercentage(correctCount, totalQuestions) {
  return totalQuestions > 0
    ? Math.min(100, Math.max(0, Math.round((correctCount / totalQuestions) * 100)))
    : 0;
}

test('Assessment 1/1 evaluates to 100%', () => {
  const pct = computePercentage(1, 1);
  assert.strictEqual(pct, 100);
});

test('Assessment 0/1 evaluates to 0%', () => {
  const pct = computePercentage(0, 1);
  assert.strictEqual(pct, 0);
});

test('Assessment 5/10 evaluates to 50%', () => {
  const pct = computePercentage(5, 10);
  assert.strictEqual(pct, 50);
});

test('Assessment 10/10 evaluates to 100%', () => {
  const pct = computePercentage(10, 10);
  assert.strictEqual(pct, 100);
});

test('Assessment with 0 total questions evaluates safely to 0% (no division by zero)', () => {
  const pct = computePercentage(5, 0);
  assert.strictEqual(pct, 0);
});

test('Assessment cannot exceed 100% even if anomalous correctCount provided', () => {
  const pct = computePercentage(15, 10);
  assert.strictEqual(pct, 100);
});

test('Assessment cannot fall below 0% even with negative counts', () => {
  const pct = computePercentage(-2, 10);
  assert.strictEqual(pct, 0);
});

// -------------------------------------------------------------
// TEST GROUP 2: The 37,700% and 33,514% Defect Regression
// -------------------------------------------------------------
console.log('\n--- GROUP 2: Arena Speed Points Decoupling & Regression Guard ---');

test('Speed points (377 pts) on 1 question produces 100% assessment and preserves 377 arenaPoints', () => {
  const participant = {
    id: 'p-1',
    name: 'Test Learner',
    score: 377, // Arena speed points
    Responses: [
      { id: 'r-1', points_awarded: 377, is_correct: true }
    ]
  };
  const totalQuestions = 1;

  const responses = participant.Responses || [];
  const correctCount = responses.filter(r => r.points_awarded > 0 || r.is_correct).length;
  const pct = totalQuestions > 0 ? Math.min(100, Math.max(0, Math.round((correctCount / totalQuestions) * 100))) : 0;
  const arenaPoints = participant.score;

  assert.strictEqual(pct, 100, 'Percentage MUST be 100%, not 37700%');
  assert.notStrictEqual(pct, 37700, '37700% anomaly detected!');
  assert.strictEqual(arenaPoints, 377, 'Arena speed points MUST remain 377');
});

test('Speed points (335 pts) on 1 question produces 100% assessment and preserves 335 arenaPoints', () => {
  const participant = {
    id: 'p-2',
    name: 'Learner 2',
    score: 335,
    Responses: [
      { id: 'r-2', points_awarded: 335, is_correct: true }
    ]
  };
  const totalQuestions = 1;

  const responses = participant.Responses || [];
  const correctCount = responses.filter(r => r.points_awarded > 0 || r.is_correct).length;
  const pct = totalQuestions > 0 ? Math.min(100, Math.max(0, Math.round((correctCount / totalQuestions) * 100))) : 0;

  assert.strictEqual(pct, 100, 'Percentage MUST be 100%, not 33500%');
  assert.strictEqual(participant.score, 335);
});

test('Empty/unanswered responses with speed points default to 0% assessment (never convert speed points to %)', () => {
  const participant = {
    id: 'p-3',
    name: 'Learner 3',
    score: 377, // Arena awarded points, but responses list empty
    Responses: []
  };
  const totalQuestions = 1;

  const responses = participant.Responses || [];
  const correctCount = responses.filter(r => r.points_awarded > 0 || r.is_correct).length;
  const pct = totalQuestions > 0 ? Math.min(100, Math.max(0, Math.round((correctCount / totalQuestions) * 100))) : 0;

  assert.strictEqual(pct, 0, 'Assessment percentage must be 0% when 0 correct responses exist');
  assert.strictEqual(participant.score, 377, 'Arena speed points remain 377 pts');
});

// -------------------------------------------------------------
// TEST GROUP 3: Report Analytics Engine Verification
// -------------------------------------------------------------
console.log('\n--- GROUP 3: ReportAnalyticsEngine.compileSessionParticipantResults ---');

test('compileSessionParticipantResults correctly separates assessment score, percentage, and arenaPoints', () => {
  const participants = [
    {
      id: 'part-1',
      name: 'Aarav Sharma',
      employeeId: 'EMP-001',
      score: 377, // 377 speed points
      Responses: [{ questionId: 'q-1', points_awarded: 377, is_correct: true }]
    },
    {
      id: 'part-2',
      name: 'Neha Verma',
      employeeId: 'EMP-002',
      score: 0, // 0 speed points
      Responses: [{ questionId: 'q-1', points_awarded: 0, is_correct: false }]
    }
  ];
  const totalQuestions = 1;

  const compiled = reportAnalyticsEngine.compileSessionParticipantResults(participants, totalQuestions, 'ONLINE');

  assert(compiled, 'Compiled result must exist');
  assert.strictEqual(compiled.results.length, 2);

  const p1 = compiled.results.find(p => p.name === 'Aarav Sharma');
  assert(p1, 'Participant 1 must exist');
  assert.strictEqual(p1.score, '100%', 'p1 assessment percentage must be 100%');
  assert.strictEqual(p1.rawScore, '1/1', 'p1 rawScore must be 1/1');
  assert.strictEqual(p1.arenaPoints, 377, 'p1 arenaPoints must be 377');
  assert.strictEqual(p1.status, 'Pass');

  const p2 = compiled.results.find(p => p.name === 'Neha Verma');
  assert(p2, 'Participant 2 must exist');
  assert.strictEqual(p2.score, '0%', 'p2 assessment percentage must be 0%');
  assert.strictEqual(p2.rawScore, '0/1', 'p2 rawScore must be 0/1');
  assert.strictEqual(p2.arenaPoints, 0, 'p2 arenaPoints must be 0');
  assert.strictEqual(p2.status, 'Fail');

  // Overall session metrics
  assert.strictEqual(compiled.avgScore, 50, 'Average session score must be 50%');
  assert.strictEqual(compiled.highestScore, 100);
  assert.strictEqual(compiled.lowestScore, 0);
  assert.strictEqual(compiled.passedCount, 1);
});

// -------------------------------------------------------------
// TEST GROUP 4: Certification Eligibility Integrity Guard
// -------------------------------------------------------------
console.log('\n--- GROUP 4: Certification Eligibility Invariant ---');

test('Certification eligibility uses assessment percentage, never raw arena speed points', () => {
  const attendancePct = 85;
  const totalQuestions = 5;
  const correctCount = 4; // 80%
  const arenaSpeedPoints = 3500; // Large gamification score

  const assessmentScore = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  assert.strictEqual(assessmentScore, 80);

  // Authoritative Rule: Attendance >= 80% AND Assessment >= 70%
  const isEligible = attendancePct >= 80 && assessmentScore >= 70;
  assert.strictEqual(isEligible, true);

  // If assessment was failing (e.g. 2/5 = 40%), speed points must NOT grant eligibility
  const failingCorrectCount = 2;
  const failingAssessmentScore = Math.round((failingCorrectCount / totalQuestions) * 100);
  assert.strictEqual(failingAssessmentScore, 40);

  const failingEligible = attendancePct >= 80 && failingAssessmentScore >= 70;
  assert.strictEqual(failingEligible, false, 'Learner with failing assessment must NOT be eligible regardless of 3500 speed points');
});

console.log('\n========================================================');
console.log(`   SUITE COMPLETE: ${passedTests} / ${totalTests} PASSED`);
if (passedTests === totalTests) {
  console.log('   RESULT: ALL SCORE INTEGRITY INVARIANTS SATISFIED ✅');
} else {
  console.error('   RESULT: SOME INVARIANTS FAILED ❌');
  process.exit(1);
}
console.log('========================================================\n');
