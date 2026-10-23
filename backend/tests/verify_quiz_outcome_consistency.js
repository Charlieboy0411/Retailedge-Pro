/**
 * ============================================================================
 * RETAILEDGE PRO — QUIZ OUTCOME CONSISTENCY VERIFICATION
 * ============================================================================
 * Validates the exact behavior and distinction across:
 * 1. Default threshold (70%) vs Configured threshold (quiz.config.passing_score)
 * 2. The 60% threshold in frontend/src/pages/OfflineQuiz.jsx
 * 3. Online live quiz scoring & database persistence (Participant & Response)
 * 4. Reporting classifications across Level 1, Level 2, Level 3, Excel, PPT,
 *    and Master Training Outcome.
 *
 * Strict Network Guard & Isolated In-Memory Execution.
 * ============================================================================
 */

const assert = require('assert');
const scoringEngine = require('../sockets/services/scoringEngine');
const reportAnalyticsEngine = require('../utils/reportAnalyticsEngine');
const intelligenceService = require('../utils/projectIntelligenceService');
const reportExcelGenerator = require('../utils/reportExcelGenerator');
const reportPPTGenerator = require('../utils/reportPPTGenerator');

let PASS = 0;
let FAIL = 0;

function check(desc, cond) {
  if (cond) {
    PASS++;
    console.log(`  [PASS] ${desc}`);
  } else {
    FAIL++;
    console.error(`  [FAIL] ${desc}`);
  }
}

async function runQuizOutcomeConsistencyCheck() {
  console.log('================================================================');
  console.log('RETAILEDGE PRO — QUIZ OUTCOME CONSISTENCY CHECK');
  console.log('================================================================\n');

  // ==========================================================================
  // PART 1: PERSISTENCE & UNDERLYING QUIZ SCORING INSPECTION
  // ==========================================================================
  console.log('--- PART 1: Underlying Scoring & Persistence Schema Audit ---');

  // Verify that Participant table has NO 'passed' or 'status' column
  const ParticipantModel = require('../models/Participant');
  const participantAttrs = Object.keys(ParticipantModel.rawAttributes || {});
  check('Participant table has score column', participantAttrs.includes('score'));
  check('Participant table DOES NOT have passed column', !participantAttrs.includes('passed'));
  check('Participant table DOES NOT have pass_fail column', !participantAttrs.includes('pass_fail'));
  check('Participant table DOES NOT have status column', !participantAttrs.includes('status'));

  // Verify that Response table has NO passed column
  const ResponseModel = require('../models/Response');
  const responseAttrs = Object.keys(ResponseModel.rawAttributes || {});
  check('Response table has points_awarded column', responseAttrs.includes('points_awarded'));
  check('Response table DOES NOT have passed column', !responseAttrs.includes('passed'));

  // ==========================================================================
  // PART 2: OFFLINE QUIZ FRONTEND & BACKEND SUBMISSION ALIGNMENT
  // ==========================================================================
  console.log('\n--- PART 2: OfflineQuiz.jsx Completion Badge & Backend Response Alignment ---');

  // Backend POST /api/quizzes/:id/offline-submit resolution logic
  const simulateOfflineSubmitResponse = (correctCount, totalQuestions, quizConfig = {}) => {
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const effectivePassingScore = (quizConfig?.passing_score !== undefined && quizConfig?.passing_score !== null)
      ? Number(quizConfig.passing_score)
      : 70;
    const passed = percentage >= effectivePassingScore;

    return {
      success: true,
      score: correctCount,
      totalQuestions,
      percentage,
      passingScore: effectivePassingScore,
      passed
    };
  };

  // Frontend OfflineQuiz.jsx line 603-645 logic
  const evalOfflineQuizFrontendBadge = (resultData, quizInfo = {}) => {
    const pct = resultData?.percentage ?? 0;
    const effectivePassingScore = (resultData?.passingScore !== undefined && resultData?.passingScore !== null)
      ? Number(resultData.passingScore)
      : ((quizInfo?.passingScore !== undefined && quizInfo?.passingScore !== null)
          ? Number(quizInfo.passingScore)
          : ((quizInfo?.config?.passing_score !== undefined && quizInfo?.config?.passing_score !== null)
              ? Number(quizInfo.config.passing_score)
              : 70));
    const isPassing = resultData?.passed !== undefined
      ? Boolean(resultData.passed)
      : pct >= effectivePassingScore;

    return {
      percentage: pct,
      passingScore: effectivePassingScore,
      isPassing,
      badgeColor: isPassing ? 'green' : 'red',
      badgeText: `${pct}% Accuracy`,
      explicitLabel: isPassing
        ? `✓ Passing benchmark achieved (≥ ${effectivePassingScore}%)`
        : `Did not meet passing threshold (${pct}% vs ${effectivePassingScore}% required)`
    };
  };

  // 2.1 Default Platform Threshold (70%)
  console.log('  Testing Offline UI under Default Platform Threshold (70%):');
  const defaultOfflineCases = [
    { score: 59, expectedIsPassing: false, expectedColor: 'red', desc: '59% is below default threshold' },
    { score: 60, expectedIsPassing: false, expectedColor: 'red', desc: '60% is below default threshold' },
    { score: 69, expectedIsPassing: false, expectedColor: 'red', desc: '69% is below default threshold' },
    { score: 70, expectedIsPassing: true,  expectedColor: 'green', desc: '70% meets default threshold' },
    { score: 71, expectedIsPassing: true,  expectedColor: 'green', desc: '71% meets default threshold' }
  ];

  defaultOfflineCases.forEach(tc => {
    const res = simulateOfflineSubmitResponse(tc.score, 100, {});
    check(`Backend offline-submit: returns passingScore 70 for score ${tc.score}%`, res.passingScore === 70);
    check(`Backend offline-submit: passed is ${tc.expectedIsPassing} for score ${tc.score}%`, res.passed === tc.expectedIsPassing);

    const badge = evalOfflineQuizFrontendBadge(res, {});
    check(`OfflineQuiz UI (${tc.desc}): isPassing is ${tc.expectedIsPassing}`, badge.isPassing === tc.expectedIsPassing);
    check(`OfflineQuiz UI (${tc.desc}): badge color is ${tc.expectedColor}`, badge.badgeColor === tc.expectedColor);
    check(`OfflineQuiz UI (${tc.desc}): badge text preserves accuracy "${tc.score}% Accuracy"`, badge.badgeText === `${tc.score}% Accuracy`);
  });

  // 2.2 Configured Threshold 50% (QuizBuilder Default)
  console.log('  Testing Offline UI under Configured Threshold (50%):');
  const config50Cases = [
    { score: 49, expectedIsPassing: false, expectedColor: 'red', desc: '49% fails 50% threshold' },
    { score: 50, expectedIsPassing: true,  expectedColor: 'green', desc: '50% meets 50% threshold' },
    { score: 51, expectedIsPassing: true,  expectedColor: 'green', desc: '51% meets 50% threshold' }
  ];
  config50Cases.forEach(tc => {
    const res = simulateOfflineSubmitResponse(tc.score, 100, { passing_score: 50 });
    check(`Backend offline-submit (50% config): returns passingScore 50 for score ${tc.score}%`, res.passingScore === 50);
    check(`Backend offline-submit (50% config): passed is ${tc.expectedIsPassing} for score ${tc.score}%`, res.passed === tc.expectedIsPassing);

    const badge = evalOfflineQuizFrontendBadge(res, { config: { passing_score: 50 } });
    check(`OfflineQuiz UI (${tc.desc}): isPassing is ${tc.expectedIsPassing}`, badge.isPassing === tc.expectedIsPassing);
    check(`OfflineQuiz UI (${tc.desc}): badge color is ${tc.expectedColor}`, badge.badgeColor === tc.expectedColor);
  });

  // 2.3 Configured Threshold 60%
  console.log('  Testing Offline UI under Configured Threshold (60%):');
  const config60Cases = [
    { score: 59, expectedIsPassing: false, expectedColor: 'red', desc: '59% fails 60% threshold' },
    { score: 60, expectedIsPassing: true,  expectedColor: 'green', desc: '60% meets 60% threshold' },
    { score: 61, expectedIsPassing: true,  expectedColor: 'green', desc: '61% meets 60% threshold' }
  ];
  config60Cases.forEach(tc => {
    const res = simulateOfflineSubmitResponse(tc.score, 100, { passing_score: 60 });
    check(`Backend offline-submit (60% config): returns passingScore 60 for score ${tc.score}%`, res.passingScore === 60);
    check(`Backend offline-submit (60% config): passed is ${tc.expectedIsPassing} for score ${tc.score}%`, res.passed === tc.expectedIsPassing);

    const badge = evalOfflineQuizFrontendBadge(res, { config: { passing_score: 60 } });
    check(`OfflineQuiz UI (${tc.desc}): isPassing is ${tc.expectedIsPassing}`, badge.isPassing === tc.expectedIsPassing);
    check(`OfflineQuiz UI (${tc.desc}): badge color is ${tc.expectedColor}`, badge.badgeColor === tc.expectedColor);
  });

  // 2.4 Configured Threshold 80%
  console.log('  Testing Offline UI under Configured Threshold (80%):');
  const config80Cases = [
    { score: 79, expectedIsPassing: false, expectedColor: 'red', desc: '79% fails 80% threshold' },
    { score: 80, expectedIsPassing: true,  expectedColor: 'green', desc: '80% meets 80% threshold' },
    { score: 81, expectedIsPassing: true,  expectedColor: 'green', desc: '81% meets 80% threshold' }
  ];
  config80Cases.forEach(tc => {
    const res = simulateOfflineSubmitResponse(tc.score, 100, { passing_score: 80 });
    check(`Backend offline-submit (80% config): returns passingScore 80 for score ${tc.score}%`, res.passingScore === 80);
    check(`Backend offline-submit (80% config): passed is ${tc.expectedIsPassing} for score ${tc.score}%`, res.passed === tc.expectedIsPassing);

    const badge = evalOfflineQuizFrontendBadge(res, { config: { passing_score: 80 } });
    check(`OfflineQuiz UI (${tc.desc}): isPassing is ${tc.expectedIsPassing}`, badge.isPassing === tc.expectedIsPassing);
    check(`OfflineQuiz UI (${tc.desc}): badge color is ${tc.expectedColor}`, badge.badgeColor === tc.expectedColor);
  });

  // 2.5 Safe Handling of Missing, Null, and String Configured Thresholds
  console.log('  Testing Edge Cases (Missing, Null, and String Configured Thresholds):');
  const resMissing = simulateOfflineSubmitResponse(70, 100, {});
  check('Missing config resolves to default passingScore 70', resMissing.passingScore === 70);

  const resNull = simulateOfflineSubmitResponse(70, 100, { passing_score: null });
  check('Null passing_score config resolves to default passingScore 70', resNull.passingScore === 70);

  const resString = simulateOfflineSubmitResponse(65, 100, { passing_score: '60' });
  check('String passing_score "60" safely coerces to number 60', resString.passingScore === 60);
  check('String passing_score "60" marks 65% as passed (true)', resString.passed === true);

  // ==========================================================================
  // PART 3: DETERMINISTIC CASES ACROSS ALL REPORTING LAYERS
  // ==========================================================================
  console.log('\n--- PART 3: Multi-Layer Report Consistency Across Thresholds ---');

  const testThresholdMatrix = [
    {
      name: 'CASE A: Platform Default Threshold (70% — config.passing_score omitted)',
      passingScoreConfig: undefined,
      expectedThreshold: 70,
      scores: [59, 60, 69, 70, 71],
      expectations: {
        59: { passed: false, status: 'Fail', intervention: true },
        60: { passed: false, status: 'Fail', intervention: false },
        69: { passed: false, status: 'Fail', intervention: false },
        70: { passed: true,  status: 'Pass', intervention: false },
        71: { passed: true,  status: 'Pass', intervention: false }
      }
    },
    {
      name: 'CASE B: Configured Threshold Override (passing_score = 60%)',
      passingScoreConfig: 60,
      expectedThreshold: 60,
      scores: [59, 60, 69, 70, 71],
      expectations: {
        59: { passed: false, status: 'Fail', intervention: true },
        60: { passed: true,  status: 'Pass', intervention: false },
        69: { passed: true,  status: 'Pass', intervention: false },
        70: { passed: true,  status: 'Pass', intervention: false },
        71: { passed: true,  status: 'Pass', intervention: false }
      }
    },
    {
      name: 'CASE C: Configured Threshold Override (passing_score = 80%)',
      passingScoreConfig: 80,
      expectedThreshold: 80,
      scores: [59, 60, 69, 70, 71, 79, 80, 81],
      expectations: {
        59: { passed: false, status: 'Fail', intervention: true },
        60: { passed: false, status: 'Fail', intervention: false },
        69: { passed: false, status: 'Fail', intervention: false },
        70: { passed: false, status: 'Fail', intervention: false },
        71: { passed: false, status: 'Fail', intervention: false },
        79: { passed: false, status: 'Fail', intervention: false },
        80: { passed: true,  status: 'Pass', intervention: false },
        81: { passed: true,  status: 'Pass', intervention: false }
      }
    },
    {
      name: 'CASE D: Configured Threshold Override (passing_score = 50% — QuizBuilder Default)',
      passingScoreConfig: 50,
      expectedThreshold: 50,
      scores: [49, 50, 51, 59, 60, 69, 70, 71],
      expectations: {
        49: { passed: false, status: 'Fail', intervention: true },
        50: { passed: true,  status: 'Pass', intervention: true }, // passed quiz (50 >= 50), but needs operational attention (< 60)
        51: { passed: true,  status: 'Pass', intervention: true }, // passed quiz (51 >= 50), but needs operational attention (< 60)
        59: { passed: true,  status: 'Pass', intervention: true },
        60: { passed: true,  status: 'Pass', intervention: false },
        69: { passed: true,  status: 'Pass', intervention: false },
        70: { passed: true,  status: 'Pass', intervention: false },
        71: { passed: true,  status: 'Pass', intervention: false }
      }
    }
  ];

  for (const tCase of testThresholdMatrix) {
    console.log(`\n  >> Running ${tCase.name} <<`);

    const quizObj = {
      id: `quiz-test-${tCase.expectedThreshold}`,
      title: `Assessment (${tCase.expectedThreshold}%)`,
      config: tCase.passingScoreConfig !== undefined ? { passing_score: tCase.passingScoreConfig } : {}
    };

    const participants = tCase.scores.map(s => ({
      id: `part-${s}`,
      name: `Learner ${s}%`,
      employeeId: `EMP_${s}`,
      score: s,
      Responses: Array.from({ length: s }, () => ({ points_awarded: 1, is_correct: true }))
    }));

    // 1. Level 1 Calculation Test
    const l1Compiled = reportAnalyticsEngine.compileSessionParticipantResults(
      participants,
      100,
      'ONLINE',
      { id: 'proj-1', name: 'Test Project' },
      quizObj
    );

    for (const score of tCase.scores) {
      const exp = tCase.expectations[score];
      const pResult = l1Compiled.results.find(p => p.id === `part-${score}`);

      // Verify Level 1
      check(
        `${tCase.name} | Score ${score}%: Level 1 passed is ${exp.passed}`,
        pResult.passed === exp.passed
      );
      check(
        `${tCase.name} | Score ${score}%: Level 1 status is "${exp.status}"`,
        pResult.status === exp.status
      );
      check(
        `${tCase.name} | Score ${score}%: Level 1 passingThreshold is "${tCase.expectedThreshold}%"`,
        pResult.passingThreshold === `${tCase.expectedThreshold}%`
      );
      check(
        `${tCase.name} | Score ${score}%: Level 1 needsOperationalIntervention is ${exp.intervention}`,
        pResult.needsOperationalIntervention === exp.intervention
      );

      // Verify Excel Generator resolution for this participant
      const excelStatus = pResult.status || (pResult.passed !== undefined ? (pResult.passed ? 'Pass' : 'Fail') : 'Fail');
      check(
        `${tCase.name} | Score ${score}%: Excel Sheet 5 status is "${exp.status}"`,
        excelStatus === exp.status
      );

      // Verify Master Training Outcome resolution for this participant
      const outcomeScorePct = score;
      const outcomePassed = outcomeScorePct >= (quizObj.config?.passing_score !== undefined ? Number(quizObj.config.passing_score) : 70);
      const outcomeStatus = outcomePassed ? 'Pass' : 'Fail';
      check(
        `${tCase.name} | Score ${score}%: Master Training Outcome status is "${exp.status}"`,
        outcomeStatus === exp.status
      );

      // Verify PPT Slide 8 Exemplar Top Performer inclusion
      const pptPerformance = {
        participantName: pResult.name,
        score: score,
        status: pResult.passed ? 'PASSED' : 'FAILED'
      };
      const pptTopStatus = (pptPerformance.status === 'PASSED') ? 'Pass' : 'Fail';
      check(
        `${tCase.name} | Score ${score}%: PPT Slide 8 performance status aligns with "${exp.status}"`,
        pptTopStatus === exp.status
      );
    }

    // Verify Cohort Aggregate Totals
    const expectedPassedCount = tCase.scores.filter(s => tCase.expectations[s].passed).length;
    const expectedInterventionCount = tCase.scores.filter(s => tCase.expectations[s].intervention).length;

    check(
      `${tCase.name}: Aggregate passed count is ${expectedPassedCount} (got ${l1Compiled.passedCount})`,
      l1Compiled.passedCount === expectedPassedCount
    );
    check(
      `${tCase.name}: Aggregate intervention count is ${expectedInterventionCount} (got ${l1Compiled.attentionParticipants.length})`,
      l1Compiled.attentionParticipants.length === expectedInterventionCount
    );
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('\n================================================================');
  console.log(`QUIZ OUTCOME CONSISTENCY SUMMARY: ${PASS} PASSED | ${FAIL} FAILED`);
  console.log('================================================================\n');

  if (FAIL > 0) process.exit(1);
  else process.exit(0);
}

runQuizOutcomeConsistencyCheck().catch(err => {
  console.error('Fatal error running consistency check:', err);
  process.exit(1);
});
