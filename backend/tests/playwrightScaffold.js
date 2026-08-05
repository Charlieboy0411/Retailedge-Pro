const { chromium } = require('playwright');

/**
 * Playwright E2E Browser Testing Scaffold
 * Simulates a real-world quiz sequence:
 * 1. Trainer logs in and opens the Host Room.
 * 2. Participant joins the lobby with Name and Employee ID.
 * 3. Trainer starts the quiz.
 * 4. Participant sees the question and submits an answer.
 * 5. Trainer reveals answer.
 * 6. Trainer terminates session.
 * 
 * Run using: node tests/playwrightScaffold.js
 */
(async () => {
  console.log('Kicking off Playwright E2E testing sequence...');
  
  // Launch headless browser
  const browser = await chromium.launch({ headless: true });
  
  // Create isolated contexts (simulating separate network profiles)
  const trainerContext = await browser.newContext();
  const participantContext = await browser.newContext();
  
  const trainerPage = await trainerContext.newPage();
  const participantPage = await participantContext.newPage();
  
  try {
    // 1. Host creates quiz room
    console.log('Step 1: Trainer navigating to Host Control Room...');
    await trainerPage.goto('http://localhost:5173/login');
    // Login sequence (mocked or input credentials)
    await trainerPage.fill('input[type="email"]', 'trainer@retailedge.pro');
    await trainerPage.fill('input[type="password"]', 'password123');
    await trainerPage.click('button[type="submit"]');
    await trainerPage.waitForURL('**/dashboard');
    
    // Create / Host session (assuming quiz ID 1 exists)
    await trainerPage.goto('http://localhost:5173/host/1');
    await trainerPage.waitForSelector('[data-testid="room-code"]');
    const roomCode = await trainerPage.textContent('[data-testid="room-code"]');
    console.log(`Lobby Created. Room Code: ${roomCode}`);
    
    // 2. Participant joins the room
    console.log(`Step 2: Participant joining Room ${roomCode}...`);
    await participantPage.goto('http://localhost:5173/join');
    await participantPage.fill('input[placeholder*="Room"]', roomCode.trim());
    await participantPage.fill('input[placeholder*="Name"]', 'E2E Stress Tester');
    await participantPage.fill('input[placeholder*="Employee ID"]', 'EMP999');
    await participantPage.click('button[type="submit"]');
    
    // Check if participant name is listed in Trainer lobby
    console.log('Step 3: Verifying participant is displayed in lobby...');
    await trainerPage.waitForSelector('text=E2E Stress Tester');
    
    // 3. Trainer starts quiz
    console.log('Step 4: Trainer starts quiz...');
    await trainerPage.click('button:has-text("Start Quiz")');
    
    // 4. Participant receives question and answers
    console.log('Step 5: Participant answering question...');
    await participantPage.waitForSelector('[data-testid="quiz-timer"]');
    await participantPage.click('[data-testid="option-0"]'); // select first option
    await participantPage.click('button:has-text("Submit")');
    
    // 5. Trainer reveals correct answer
    console.log('Step 6: Trainer revealing correct answer...');
    await trainerPage.click('button:has-text("Reveal Answer")');
    await participantPage.waitForSelector('[data-testid="correct-answer-banner"]');
    console.log('Verification Success: Correct answer banner is displayed to participant.');
    
    // 6. End session
    console.log('Step 7: Trainer ending quiz session...');
    await trainerPage.click('button:has-text("End Session")');
    await participantPage.waitForSelector('text=Quiz has ended');
    
    console.log('E2E TEST SEQUENCE PASSED.');
  } catch (error) {
    console.error('E2E TEST SEQUENCE FAILED:', error);
  } finally {
    await browser.close();
  }
})();
