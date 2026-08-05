/**
 * scoringEngine.js
 * Encapsulates the core business logic for answer validation and scoring.
 * These are pure functions designed to be fully testable without database or network states.
 */

/**
 * Validates whether the submitted answer is correct based on the question type and definition.
 * 
 * @param {Object} question - The question database object.
 * @param {any} submittedAnswer - The participant's submitted answer.
 * @returns {boolean} True if correct, false otherwise.
 */
const isCorrectAnswer = (question, submittedAnswer) => {
  if (!question || question.type === 'poll' || question.type === 'word_cloud' || question.type === 'rating') {
    return false; // Opinion-based types have no correct answer
  }

  const correct = question.correct_answer;
  if (correct === undefined || correct === null) return false;

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

    const sortedCorrect   = [...correctArr].sort();
    const sortedSubmitted = [...submittedArr].sort();
    return sortedCorrect.every((val, i) => val === sortedSubmitted[i]);
  }

  if (typeof correct === 'string' && typeof submittedAnswer === 'string') {
    return correct.trim().toLowerCase() === submittedAnswer.trim().toLowerCase();
  }
  return correct == submittedAnswer; // soft comparison for numeric/string comparisons
};

/**
 * Calculates score based on answer correctness, remaining time, and speed bonus.
 * 
 * @param {boolean} isCorrect - Whether the answer is correct.
 * @param {Object} question - The question database object.
 * @param {number} timeTaken - Time in milliseconds taken to submit the answer.
 * @returns {number} The points awarded (0 if incorrect, 500-1000 if correct).
 */
const calculatePoints = (isCorrect, question, timeTaken) => {
  if (!isCorrect) return 0;
  
  const timeLimitMs = (question?.time_limit || 30) * 1000;
  const elapsed     = Math.min(Math.max(timeTaken, 0), timeLimitMs);
  const speedBonus  = Math.round(500 * Math.max(0, 1 - elapsed / timeLimitMs));
  return 500 + speedBonus;
};

module.exports = {
  isCorrectAnswer,
  calculatePoints
};
