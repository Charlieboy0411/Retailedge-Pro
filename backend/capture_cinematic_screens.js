const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'scratch', 'cinematic_screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function capture() {
  console.log('Starting high-resolution cinematic screen capture (1920x1080)...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  async function loginAndCapture(email, password, targetUrl, filename, isMobile = false) {
    console.log(`\n--- Capturing: ${filename} for ${email || 'guest'} ---`);
    const page = await browser.newPage();
    
    async function safeType(selector, text) {
      await page.waitForSelector(selector);
      await page.click(selector);
      await page.evaluate((sel, txt) => {
        const input = document.querySelector(sel);
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(input, txt);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }, selector, text);
    }

    try {
      if (isMobile) {
        await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
      } else {
        await page.setViewport({ width: 1920, height: 1080 }); 
      }

      await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2', timeout: 60000 });

      if (email && password) {
        await page.waitForSelector('input[type="email"]', { timeout: 60000 });
        await new Promise(r => setTimeout(r, 1000));
        
        let quickFillRole = null;
        if (email === 'admin@quizhive.com') quickFillRole = 'Admin';
        else if (email === 'trainer@quizhive.com') quickFillRole = 'Trainer';
        else if (email === 'pm@quizhive.com') quickFillRole = 'PM';
        else if (email === 'client@quizhive.com') quickFillRole = 'Client';
        else if (email === 'supervisor@quizhive.com') quickFillRole = 'Supervisor';

        if (quickFillRole) {
          console.log(`Using Quick Fill button for: ${quickFillRole}`);
          await page.evaluate((r) => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const btn = buttons.find(b => b.textContent.trim() === r);
            if (btn) btn.click();
          }, quickFillRole);
        } else {
          await safeType('input[type="email"]', email);
          await safeType('input[type="password"]', password);
        }
        
        await new Promise(r => setTimeout(r, 500));
        await page.click('button[type="submit"]');
        await page.waitForSelector('nav.sidebar', { timeout: 30000 });
        await new Promise(r => setTimeout(r, 1000));
      }

      if (targetUrl) {
        const currentUrl = page.url();
        if (!email || currentUrl !== targetUrl) {
          await page.goto(targetUrl, { waitUntil: 'networkidle0' }).catch(() => {});
        }
      }

      // Wait for rendering
      await new Promise(r => setTimeout(r, 6000));

      const savePath = path.join(SCREENSHOT_DIR, filename);
      await page.screenshot({ path: savePath, fullPage: false });
      console.log(`Saved screenshot: ${savePath}`);
    } catch (err) {
      console.error(`ERROR capturing ${filename}:`, err.message);
    } finally {
      await page.close();
    }
  }

  try {
    // We capture screens needed for the PRD video flow
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/pm-dashboard', 'md_dashboard.png');
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/pm-dashboard', 'coo_dashboard.png');
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/pm-dashboard', 'vp_dashboard.png');
    await loginAndCapture('pm@quizhive.com', 'password123', 'http://localhost:5173/pm-dashboard', 'pm_dashboard.png');
    await loginAndCapture('trainer@quizhive.com', 'password123', 'http://localhost:5173/dashboard', 'trainer_dashboard.png');
    await loginAndCapture('supervisor@quizhive.com', 'password123', 'http://localhost:5173/pm-dashboard', 'supervisor_dashboard.png');
    await loginAndCapture(null, null, 'http://localhost:5173/login', 'learner_login.png');
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/dashboard', 'admin_dashboard.png');
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/trainings', 'course_library.png');
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/trainings', 'course_player.png');
    await loginAndCapture('trainer@quizhive.com', 'password123', 'http://localhost:5173/builder', 'assessments.png');
    await loginAndCapture('trainer@quizhive.com', 'password123', 'http://localhost:5173/dashboard', 'live_quiz.png');
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/certificates', 'certificates.png');
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/pm-dashboard', 'ai_insights.png');
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/reports', 'business_impact.png');
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/join', 'mobile_experience.png', true);

    console.log('All cinematic screenshots captured successfully!');
  } catch (error) {
    console.error('Screenshot capture failed overall:', error.message);
  } finally {
    await browser.close();
    process.exit(0);
  }
}

capture();
