import { test, expect } from '@playwright/test';

// Configuration for cinematic recording
test.use({
  viewport: { width: 1920, height: 1080 },
  actionTimeout: 10000,
  video: 'on',
});

// Helper for smooth mouse movement
async function cinematicMoveAndClick(page, selector, click = true, delayAfter = 1000, exact = false) {
  const element = page.locator(selector).first();
  await element.scrollIntoViewIfNeeded().catch(() => {});
  
  let box = null;
  try {
    box = await element.boundingBox();
  } catch (e) {
    console.log(`Could not find box for ${selector}`);
  }

  if (box) {
    const targetX = box.x + box.width / 2;
    const targetY = box.y + box.height / 2;
    
    // Smooth move over 25 steps for 60fps feel
    await page.mouse.move(targetX, targetY, { steps: 25 });
    await page.waitForTimeout(400); // Dramatic pause on hover
    
    if (click) {
      await page.mouse.down();
      await page.waitForTimeout(150);
      await page.mouse.up();
    }
  } else if (click) {
    // Fallback if bounding box fails
    await element.click({ force: true }).catch(() => {});
  }
  
  await page.waitForTimeout(delayAfter);
}

// Cinematic 90-second Trainer Workflow Demo
test('RetailEdge Pro Trainer Workflow Demo', async ({ page }) => {
  test.setTimeout(120000); // 120 seconds timeout
  
  // --- SCENE 1: Login (5 sec) ---
  // Wait for page load
  await page.goto('http://localhost:5173/login');
  await page.waitForTimeout(1000);
  
  // Use quick fill for Trainer
  await cinematicMoveAndClick(page, 'button:has-text("Trainer")', true, 500);
  await cinematicMoveAndClick(page, 'button[type="submit"]', true, 2000);
  await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000); // Wait until dashboard loads

  // --- SCENE 2: Trainer Dashboard (8 sec) ---
  // Hover naturally over KPI cards
  await cinematicMoveAndClick(page, '.glass-card:nth-of-type(1)', false, 800);
  await cinematicMoveAndClick(page, '.glass-card:nth-of-type(2)', false, 800);
  await cinematicMoveAndClick(page, '.glass-card:nth-of-type(3)', false, 1500);

  // --- SCENE 3: Create Batch / Schedule Session (10 sec) ---
  // Click Quick Action Dropdown
  await cinematicMoveAndClick(page, 'button:has(.lucide-chevron-down)', true, 1000);
  // Click Schedule Training
  await cinematicMoveAndClick(page, 'div:has-text("Schedule Training")', true, 1000);
  
  // Fill form (simulate typing)
  await page.fill('input[placeholder*="Product Knowledge" i]', 'Morning Product Knowledge Batch').catch(() => {});
  await page.waitForTimeout(300);
  await page.fill('input[type="datetime-local"]', '2026-07-25T10:00').catch(() => {});
  
  // --- SCENE 4: Add Participants (8 sec) ---
  await page.fill('input[placeholder*="Search members" i]', 'EMP').catch(() => {});
  await page.waitForTimeout(500);
  // Select a user from the checklist
  await cinematicMoveAndClick(page, 'input[type="checkbox"]', true, 500);
  // Submit
  await cinematicMoveAndClick(page, 'button:has-text("Schedule & Send")', true, 2000);

  // --- SCENE 5: Launch Live Session (8 sec) ---
  // Wait for success screen
  await page.waitForTimeout(1000);
  // Click Close/Cancel to return to dashboard
  await cinematicMoveAndClick(page, 'button:has-text("Close"), button:has-text("Cancel")', true, 2000);

  // --- SCENE 6: Create Quiz (12 sec) ---
  await cinematicMoveAndClick(page, 'button:has-text("Create Quiz")', true, 1000);
  await cinematicMoveAndClick(page, 'button:has-text("Save Quiz")', true, 2000);
  await page.waitForTimeout(1000);
  await cinematicMoveAndClick(page, 'div:has-text("Create Quiz")', true, 1500); // Opens Builder
  await page.fill('textarea[placeholder*="type your question" i]', 'Which of the following is a key feature of RetailEdge Pro?').catch(() => {});
  await page.waitForTimeout(500);
  
  // Select multiple choice from dropdown
  await page.selectOption('select:has-text("Add Question")', 'mcq').catch(() => {});
  await page.waitForTimeout(1000);
  
  // Fill question
  await page.fill('textarea[placeholder*="Question" i], input[placeholder*="Question" i]', 'Which product has the highest margin?').catch(() => {});
  await cinematicMoveAndClick(page, 'button:has-text("Save & Publish")', true, 2500);

  // --- SCENE 7: Start Live Quiz (10 sec) ---
  // Redirected back to dashboard, click Host Live for the first quiz
  await cinematicMoveAndClick(page, 'button:has-text("Host Live")', true, 2000);
  // Hover over live participants count
  await page.mouse.move(300, 300, { steps: 20 });
  await page.waitForTimeout(1000);
  // Click Next Question
  await cinematicMoveAndClick(page, 'button:has-text("Next"), button:has-text("Start")', true, 2500);
  // Wait for animation
  await page.waitForTimeout(2000);

  // --- SCENE 8: Leaderboard (8 sec) ---
  await cinematicMoveAndClick(page, 'button:has-text("Leaderboard"), a[href="/gamification"]', true, 2000);
  // Hover top participant
  await cinematicMoveAndClick(page, '.leaderboard-entry:nth-of-type(1), .sales-board-top', false, 2500);

  // --- SCENE 9: Generate Certificates (6 sec) ---
  await cinematicMoveAndClick(page, 'a[href="/certificates"]', true, 1500);
  await cinematicMoveAndClick(page, 'button:has-text("Generate"), button:has-text("View")', true, 2500);

  // --- SCENE 10: Reports (8 sec) ---
  await cinematicMoveAndClick(page, 'a[href="/reports"]', true, 1500);
  // Hover over PDF export
  await cinematicMoveAndClick(page, 'button:has-text("PDF"), button:has-text("Export")', false, 2000);

  // --- SCENE 11: Analytics Dashboard (10 sec) ---
  await cinematicMoveAndClick(page, 'a[href="/pm-dashboard"], a[href="/dashboard"]', true, 1500);
  // Smoothly pan across the charts
  await page.mouse.move(500, 500, { steps: 30 });
  await page.waitForTimeout(1500);
  await page.mouse.move(900, 600, { steps: 30 });
  await page.waitForTimeout(1500);

  // --- SCENE 12: Return to Dashboard (5 sec) ---
  await cinematicMoveAndClick(page, 'a[href="/dashboard"]', true, 1500);
  await page.mouse.move(960, 540, { steps: 20 });
  await page.waitForTimeout(2000);

  // --- FINAL SCENE (2 sec) ---
  // (Fade to black will be done in post-production video editing)
  await page.waitForTimeout(2000);
});
