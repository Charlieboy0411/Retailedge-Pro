const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\4e49fe9d-64e5-4090-9cce-73da93bfb626';

async function captureVisuals() {
  console.log('Launching browser for fresh visual validation...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 1. Authenticate as Charles Richardson (T&D Manager A - Idonneous Scope)
  console.log('Authenticating as Charles Richardson (charles@idonneous.com)...');
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });

  await page.type('input[type="email"], input[name="email"]', 'charles@idonneous.com');
  await page.type('input[type="password"], input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  // Navigate to Cockpit
  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000)); // Allow metrics to load

  // Capture 1920x1080 Desktop Viewport (Default: Current Month, September 2026)
  console.log('Capturing 1920x1080 Desktop Viewport...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'td_cockpit_1920x1080.png'), fullPage: false });

  // Capture 1440x900 Laptop Viewport (Demonstrating ~15-20% hero vertical tightening)
  console.log('Capturing 1440x900 Laptop Viewport...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'td_cockpit_1440x900.png'), fullPage: false });

  // Capture 1366x768 Compact Viewport
  console.log('Capturing 1366x768 Compact Viewport...');
  await page.setViewport({ width: 1366, height: 768 });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'td_cockpit_1366x768.png'), fullPage: false });

  // Switch to All Time and capture 1920x1080 All Time
  console.log('Selecting All Time period and capturing...');
  await page.setViewport({ width: 1920, height: 1080 });
  const selects = await page.$$('select');
  for (const s of selects) {
    const val = await page.evaluate(el => el.value, s);
    if (val === 'current_month') {
      await s.select('all_time');
      break;
    }
  }
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'td_cockpit_all_time.png'), fullPage: false });

  // Capture Learner Competency Tab
  console.log('Capturing Learner Competency Tab...');
  const tabs = await page.$$('button');
  for (const t of tabs) {
    const text = await page.evaluate(el => el.textContent, t);
    if (text.includes('Learner Competency')) {
      await t.click();
      break;
    }
  }
  await page.evaluate(() => {
    window.scrollTo(0, 750);
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'td_cockpit_learner_tab.png'), fullPage: false });

  // 2. Authenticate as Demo T&D Manager (Manager B - Demo 1 Scope)
  console.log('Authenticating as Manager B (Demo T&D)...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });

  await page.type('input[type="email"], input[name="email"]', 'td@quizhive.com');
  await page.type('input[type="password"], input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  console.log('Capturing Manager B Isolated Cockpit...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'td_cockpit_manager_b.png'), fullPage: false });

  await browser.close();
  console.log('✅ Fresh visual validation screenshots captured successfully!');
}

captureVisuals().catch(console.error);
