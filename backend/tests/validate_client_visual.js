const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = path.resolve('C:/Users/admin/.gemini/antigravity-ide/brain/4e49fe9d-64e5-4090-9cce-73da93bfb626');

async function runVisualValidation() {
  console.log('🚀 Starting Visual Validation of Client Cockpit & RBAC...');
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    // 1. Login as Client A
    console.log('1. Logging in as Client A (client@quizhive.com)...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'client@quizhive.com');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.client-cockpit', { timeout: 15000 });
    console.log('Current URL after login:', page.url());

    // 2. Wait for Client Cockpit elements
    await page.waitForSelector('.client-cockpit', { timeout: 10000 });
    console.log('✅ Client Cockpit component rendered successfully');

    // Wait for metrics and participants to load
    await page.waitForFunction(() => {
      const text = document.querySelector('.client-cockpit')?.innerText || '';
      return !text.includes('Loading participants...') && !text.includes('—');
    }, { timeout: 15000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 1000));

    // Capture Client A Cockpit
    const clientACockpitPath = path.join(ARTIFACTS_DIR, 'client_a_cockpit.png');
    await page.screenshot({ path: clientACockpitPath, fullPage: false });
    console.log(`📸 Screenshot saved: ${clientACockpitPath}`);

    // 3. Test Participant 360 Modal
    console.log('3. Testing Participant 360 modal for first participant...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.innerText.includes('View 360'));
      if (btn) btn.click();
    });
    await page.waitForSelector('.participant-360-modal', { timeout: 6000 }).catch(() => null);
    await page.waitForFunction(() => {
      const modal = document.querySelector('.participant-360-modal');
      return modal && !modal.innerText.includes('Loading Participant 360 evaluation...');
    }, { timeout: 10000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 1000));
    const p360ScreenshotPath = path.join(ARTIFACTS_DIR, 'client_participant_360.png');
    await page.screenshot({ path: p360ScreenshotPath, fullPage: false });
    console.log(`📸 Screenshot saved: ${p360ScreenshotPath}`);

    // Close modal
    const closeBtn = await page.$('.modal-close, button[aria-label="Close"], button.btn-close');
    if (closeBtn) await page.evaluate(el => el.click(), closeBtn);
    await new Promise(r => setTimeout(r, 500));

    // 4. Navigate to /certificates
    console.log('4. Navigating to /certificates to verify read-only credentials...');
    await page.goto('http://localhost:5173/certificates', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const certScreenshotPath = path.join(ARTIFACTS_DIR, 'client_certificates.png');
    await page.screenshot({ path: certScreenshotPath, fullPage: false });
    console.log(`📸 Screenshot saved: ${certScreenshotPath}`);

    // 5. Test Route Guard: Direct URL navigation to /users
    console.log('5. Testing Route Guard: Navigating to /users...');
    await page.goto('http://localhost:5173/users', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 800));
    const usersGuardPath = path.join(ARTIFACTS_DIR, 'client_users_blocked.png');
    await page.screenshot({ path: usersGuardPath, fullPage: false });
    console.log(`📸 Screenshot saved: ${usersGuardPath}`);

    // 6. Test Route Guard: Direct URL navigation to /pm-dashboard
    console.log('6. Testing Route Guard: Navigating to /pm-dashboard...');
    await page.goto('http://localhost:5173/pm-dashboard', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 800));
    const pmGuardPath = path.join(ARTIFACTS_DIR, 'client_pm_dashboard_blocked.png');
    await page.screenshot({ path: pmGuardPath, fullPage: false });
    console.log(`📸 Screenshot saved: ${pmGuardPath}`);

    // 7. Test Client B Login & Isolation (Ishaan.Batheja@unilever.com)
    console.log('7. Testing Client B (Ishaan.Batheja@unilever.com) in isolated session...');
    const pageB = await browser.newPage();
    await pageB.setViewport({ width: 1440, height: 900 });

    await pageB.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await pageB.waitForSelector('input[type="email"]');
    await pageB.type('input[type="email"]', 'Ishaan.Batheja@unilever.com');
    await pageB.type('input[type="password"]', 'password123');
    await pageB.click('button[type="submit"]');

    await pageB.waitForSelector('.client-cockpit', { timeout: 15000 });
    console.log('✅ Client B Cockpit loaded');
    await pageB.waitForFunction(() => {
      const text = document.querySelector('.client-cockpit')?.innerText || '';
      return !text.includes('Loading participants...') && !text.includes('—');
    }, { timeout: 15000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 1000));

    const clientBCockpitPath = path.join(ARTIFACTS_DIR, 'client_b_cockpit.png');
    await pageB.screenshot({ path: clientBCockpitPath, fullPage: false });
    console.log(`📸 Screenshot saved: ${clientBCockpitPath}`);
    await pageB.close();

    console.log('🎉 Visual validation completed successfully!');
  } catch (err) {
    console.error('❌ Visual validation error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runVisualValidation();
