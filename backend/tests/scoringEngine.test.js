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
    expect(isCorrectAnswer(questionJsonStr, 'invalid,json,array')).toBe(false);

    const questionWithOptions = {
      type: 'multi_select',
      options: '["Option A", "Option B", "Option C"]', // JSON string options
      correct_answer: ['Option A', 'Option B']
    };
    expect(isCorrectAnswer(questionWithOptions, ['0', '1'])).toBe(true);
    expect(isCorrectAnswer(questionWithOptions, ['Option A', 'Option B', 'Option C'])).toBe(false);

    // Invalid JSON options fallback
    const questionBadJson = {
      type: 'mcq',
      options: 'not-valid-json',
      correct_answer: 'Option A'
    };
    expect(isCorrectAnswer(questionBadJson, 'Option A')).toBe(true);
  });

  test('validates multi_select when single option is numeric string or contains commas', () => {
    // Regression for Q1: numeric string "2017" where JSON.parse("2017") returns number 2017
    const numericMultiSelect = {
      type: 'multi_select',
      options: ['2010', '2014', '2017', '2021'],
      correct_answer: '["2017"]'
    };
    expect(isCorrectAnswer(numericMultiSelect, '2017')).toBe(true);
    expect(isCorrectAnswer(numericMultiSelect, 2017)).toBe(true);
    expect(isCorrectAnswer(numericMultiSelect, '["2017"]')).toBe(true);
    expect(isCorrectAnswer(numericMultiSelect, '2014')).toBe(false);

    // Regression for Q4/Q6/Q8/Q9: single option containing commas
    const commaOptionMultiSelect = {
      type: 'multi_select',
      options: [
        'All Night Comfort Pads (320mm, 400mm)',
        'Daily Panty Liners (150mm, 180mm)'
      ],
      correct_answer: '["All Night Comfort Pads (320mm, 400mm)"]'
    };
    expect(isCorrectAnswer(commaOptionMultiSelect, 'All Night Comfort Pads (320mm, 400mm)')).toBe(true);
    expect(isCorrectAnswer(commaOptionMultiSelect, 'Daily Panty Liners (150mm, 180mm)')).toBe(false);

    // Comma-containing option even when options array is omitted
    const commaNoOptions = {
      type: 'multi_select',
      correct_answer: '["Fragrances, dyes, and phthalates "]'
    };
    expect(isCorrectAnswer(commaNoOptions, 'Fragrances, dyes, and phthalates ')).toBe(true);
  });

  test('validates single choice when correct_answer or submittedAnswer is an option index', () => {
    const questionWithIndex = {
      type: 'mcq',
      options: ['First Choice', 'Second Choice', 'Third Choice'],
      correct_answer: '0' // index 0
    };
    expect(isCorrectAnswer(questionWithIndex, 'First Choice')).toBe(true);
    expect(isCorrectAnswer(questionWithIndex, 'first choice')).toBe(true);
    expect(isCorrectAnswer(questionWithIndex, 'Second Choice')).toBe(false);

    const questionWithText = {
      type: 'mcq',
      options: ['First Choice', 'Second Choice'],
      correct_answer: 'First Choice'
    };
    expect(isCorrectAnswer(questionWithText, '0')).toBe(true);
    expect(isCorrectAnswer(questionWithText, '1')).toBe(false);
  });
});

describe('scoringEngine.js Score Calculation', () => {
  const questionStandard = { points: 100, time_limit: 30 };
  const questionCustom50 = { points: 50, time_limit: 30 };
  const questionCustom250 = { points: 250, time_limit: 45 };
  const questionUnset = { time_limit: 30 };

  test('returns 0 for incorrect answers regardless of time taken', () => {
    expect(calculatePoints(false, questionStandard, 0)).toBe(0);
    expect(calculatePoints(false, questionStandard, 15000)).toBe(0);
    expect(calculatePoints(false, questionStandard, 30000)).toBe(0);
  });

  test('awards strictly configured question points for correct answers without speed bonuses', () => {
    // Instant answer earns exactly configured points (no +500 speed bonus)
    expect(calculatePoints(true, questionStandard, 0)).toBe(100);
    expect(calculatePoints(true, questionStandard, 15000)).toBe(100);
    expect(calculatePoints(true, questionStandard, 29000)).toBe(100);

    // Custom point allocations
    expect(calculatePoints(true, questionCustom50, 1000)).toBe(50);
    expect(calculatePoints(true, questionCustom250, 20000)).toBe(250);
  });

  test('defaults to 100 points when question has no explicit points configuration', () => {
    expect(calculatePoints(true, questionUnset, 5000)).toBe(100);
    expect(calculatePoints(true, { points: undefined }, 5000)).toBe(100);
    expect(calculatePoints(true, { points: null }, 5000)).toBe(100);
    expect(calculatePoints(true, null, 5000)).toBe(100);
  });

  test('handles negative or invalid points gracefully by returning 0', () => {
    expect(calculatePoints(true, { points: -50 }, 1000)).toBe(0);
    expect(calculatePoints(true, { points: 'invalid' }, 1000)).toBe(0);
  });
});
