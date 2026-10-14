/**
 * scoringEngine.js
 * Encapsulates the core business logic for answer validation and scoring.
 * Pure functions designed to be fully testable without database or network states.
 * 
 * SCORING POLICY (RetailEdge PRO Phase 4):
 * - Points earned for a question = configured question points when correct; otherwise 0.
 * - Zero speed bonuses, zero surprise bonuses, zero response-time multipliers.
 * - Elapsed answer time is diagnostic only and does not award points.
 */

/**
 * Validates whether the submitted answer is correct based on the question type and definition.
 * Supports exact text match, option index match, and multi-select sets.
 * 
 * @param {Object} question - The question database object or plain object.
 * @param {any} submittedAnswer - The participant's submitted answer.
 * @returns {boolean} True if correct, false otherwise.
 */
const isCorrectAnswer = (question, submittedAnswer) => {
  if (!question || question.type === 'poll' || question.type === 'word_cloud' || question.type === 'rating') {
    return false; // Opinion-based types have no correct answer
  }

  const correct = question.correct_answer;
  if (correct === undefined || correct === null || submittedAnswer === undefined || submittedAnswer === null) {
    return false;
  }

  // Parse question options array if available
  let options = [];
  if (Array.isArray(question.options)) {
    options = question.options;
  } else if (typeof question.options === 'string') {
    try { options = JSON.parse(question.options); } catch (e) { options = []; }
  }

  if (question.type === 'multi_select') {
    let correctArr = [];
    if (Array.isArray(correct)) correctArr = correct;
    else if (typeof correct === 'string') {
      try { correctArr = JSON.parse(correct); }
      catch (e) { correctArr = correct.split(',').map(s => s.trim()); }
    }

    let submittedArr = [];
    if (Array.isArray(submittedAnswer)) submittedArr = submittedAnswer;
    else if (typeof submittedAnswer === 'string') {
      try { submittedArr = JSON.parse(submittedAnswer); }
      catch (e) { submittedArr = submittedAnswer.split(',').map(s => s.trim()); }
    }

    if (!Array.isArray(correctArr) || !Array.isArray(submittedArr)) return false;
    if (correctArr.length !== submittedArr.length) return false;

    // Normalize elements (resolving indices to text if needed)
    const normCorrect = correctArr.map(c => {
      const idx = parseInt(c, 10);
      if (!isNaN(idx) && String(idx) === String(c).trim() && options[idx]) {
        return String(options[idx]).trim().toLowerCase();
      }
      return String(c).trim().toLowerCase();
    }).sort();

    const normSubmitted = submittedArr.map(s => {
      const idx = parseInt(s, 10);
      if (!isNaN(idx) && String(idx) === String(s).trim() && options[idx]) {
        return String(options[idx]).trim().toLowerCase();
      }
      return String(s).trim().toLowerCase();
    }).sort();

    return normCorrect.every((val, i) => val === normSubmitted[i]);
  }

  // Direct string comparison (case-insensitive & trimmed)
  const strCorrect = String(correct).trim().toLowerCase();
  const strSubmitted = String(submittedAnswer).trim().toLowerCase();

  if (strCorrect === strSubmitted) {
    return true;
  }

  // Option index resolution:
  // e.g., correct_answer is stored as "0" but submittedAnswer is "Option Text"
  if (options.length > 0) {
    const correctIdx = parseInt(strCorrect, 10);
    if (!isNaN(correctIdx) && String(correctIdx) === strCorrect && options[correctIdx]) {
      if (String(options[correctIdx]).trim().toLowerCase() === strSubmitted) {
        return true;
      }
    }

    // Vice versa: submittedAnswer is index "0" but correct_answer is "Option Text"
    const submittedIdx = parseInt(strSubmitted, 10);
    if (!isNaN(submittedIdx) && String(submittedIdx) === strSubmitted && options[submittedIdx]) {
      if (String(options[submittedIdx]).trim().toLowerCase() === strCorrect) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Calculates score based strictly on question correctness and trainer-configured points.
 * Speed bonuses, hidden fast-answer points, and multipliers are strictly prohibited.
 * 
 * @param {boolean} isCorrect - Whether the answer is correct.
 * @param {Object} question - The question database object containing configured `points`.
 * @param {number} [timeTaken] - Diagnostic elapsed time in ms (retained for telemetry, 0 scoring effect).
 * @returns {number} The points awarded: configured question points if correct, strictly 0 if incorrect.
 */
const calculatePoints = (isCorrect, question, timeTaken = null) => {
  if (!isCorrect) return 0;
  
  const rawPts = question && question.points !== undefined && question.points !== null
    ? Number(question.points)
    : 100;

  if (isNaN(rawPts) || rawPts < 0) return 0;
  return Math.round(rawPts);
};

module.exports = {
  isCorrectAnswer,
  calculatePoints
};
