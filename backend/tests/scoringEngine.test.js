const { isCorrectAnswer, calculatePoints } = require('../sockets/services/scoringEngine');

describe('scoringEngine.js Answer Validation', () => {
  test('returns false for opinion-based question types', () => {
    const pollQuestion = { type: 'poll', correct_answer: 'Yes' };
    expect(isCorrectAnswer(pollQuestion, 'Yes')).toBe(false);

    const cloudQuestion = { type: 'word_cloud', correct_answer: 'Happy' };
    expect(isCorrectAnswer(cloudQuestion, 'Happy')).toBe(false);

    const ratingQuestion = { type: 'rating', correct_answer: '5' };
    expect(isCorrectAnswer(ratingQuestion, '5')).toBe(false);
  });

  test('returns false for missing arguments', () => {
    expect(isCorrectAnswer(null, 'Answer')).toBe(false);
    expect(isCorrectAnswer({ type: 'multiple_choice' }, null)).toBe(false);
  });

  test('validates single choice question types', () => {
    const question = { type: 'multiple_choice', correct_answer: 'Option A' };
    expect(isCorrectAnswer(question, 'Option A')).toBe(true);
    expect(isCorrectAnswer(question, 'option a')).toBe(true); // case-insensitive
    expect(isCorrectAnswer(question, '  Option A  ')).toBe(true); // trims whitespace
    expect(isCorrectAnswer(question, 'Option B')).toBe(false);
  });

  test('validates multi_select question types (array & string options)', () => {
    const question = { type: 'multi_select', correct_answer: ['Option A', 'Option B'] };
    expect(isCorrectAnswer(question, ['Option B', 'Option A'])).toBe(true); // order-insensitive
    expect(isCorrectAnswer(question, ['Option A'])).toBe(false);

    const questionJsonStr = { type: 'multi_select', correct_answer: '["Option A", "Option B"]' };
    expect(isCorrectAnswer(questionJsonStr, 'Option A, Option B')).toBe(true);
    expect(isCorrectAnswer(questionJsonStr, ['Option B', 'Option A'])).toBe(true);
  });
});

describe('scoringEngine.js Score Calculation', () => {
  const question = { time_limit: 30 }; // 30 seconds

  test('returns 0 for incorrect answers', () => {
    expect(calculatePoints(false, question, 1000)).toBe(0);
  });

  test('awards maximum score (1000) for instant correct answers', () => {
    expect(calculatePoints(true, question, 0)).toBe(1000);
  });

  test('awards speed-bonus based points for average response time', () => {
    // 30s limit. 15s taken = half time used.
    // 500 base + 500 * (1 - 15/30) = 750 points
    expect(calculatePoints(true, question, 15000)).toBe(750);
  });

  test('awards base score (500) for correct answer submitted at the last second', () => {
    expect(calculatePoints(true, question, 30000)).toBe(500);
  });

  test('clips values exceeding time limit to base score (500)', () => {
    expect(calculatePoints(true, question, 35000)).toBe(500);
  });

  test('defaults to 30 second time limit if not specified', () => {
    const noLimitQuestion = {};
    expect(calculatePoints(true, noLimitQuestion, 15000)).toBe(750);
  });
});
