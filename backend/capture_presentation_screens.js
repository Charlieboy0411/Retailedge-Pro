const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'scratch', 'screenshots');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function capture() {
  console.log('Starting screenshot capture...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Helper function to handle login and navigation
  async function loginAndCapture(email, password, targetUrl, filename, isMobile = false) {
    console.log(`\n--- Capturing: ${filename} for ${email || 'guest'} on ${targetUrl} ---`);
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    // Helper to safely set React input values via DOM events
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
        await page.setViewport({ width: 1280, height: 800 });
      }

      // Go to login page
      await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
      
      // Clear storage to start fresh
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });

      if (email && password) {
        // Wait 1.5 seconds for React to mount
        await new Promise(r => setTimeout(r, 1500));

        let quickFillRole = null;
        if (email === 'admin@quizhive.com') quickFillRole = 'Admin';
        else if (email === 'trainer@quizhive.com') quickFillRole = 'Trainer';
        else if (email === 'pm@quizhive.com') quickFillRole = 'PM';
        else if (email === 'client@quizhive.com') quickFillRole = 'Client';
        else if (email === 'supervisor@quizhive.com') quickFillRole = 'Supervisor';
        else if (email === 'marketing@quizhive.com') quickFillRole = 'Marketing';

        if (quickFillRole) {
          console.log(`Using Quick Fill button for: ${quickFillRole}`);
          await page.evaluate((r) => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const btn = buttons.find(b => b.textContent.trim().startsWith(r));
            if (btn) btn.click();
          }, quickFillRole);
        } else {
          // Safe type credentials
          await safeType('input[type="email"]', email);
          await safeType('input[type="password"]', password);
        }
        
        await new Promise(r => setTimeout(r, 500));
        await page.click('button[type="submit"]');
        
        // Wait for layout sidebar to load, ensuring login has completed and token is stored
        await page.waitForSelector('nav.sidebar', { timeout: 30000 });
        
        // Small buffer for storage settling
        await new Promise(r => setTimeout(r, 500));
      }

      // Navigate to target URL if it's different or if no login was performed
      if (targetUrl) {
        const currentUrl = page.url();
        if (!email || currentUrl !== targetUrl) {
          await page.goto(targetUrl, { waitUntil: 'networkidle0' }).catch(() => {});
        }
      }

      // Wait for any charts, tables, or details to render fully
      await new Promise(r => setTimeout(r, 4000));

      // Capture screenshot
      const savePath = path.join(SCREENSHOT_DIR, filename);
      await page.screenshot({ path: savePath, fullPage: false });
      console.log(`Saved screenshot: ${savePath}`);
    } catch (err) {
      console.error(`ERROR capturing ${filename}:`, err.message);
      try {
        const currentUrl = page.url();
        console.error(`Current Page URL during failure: ${currentUrl}`);
        const bodyText = await page.evaluate(() => document.body.innerText);
        console.error(`Page body sample: ${bodyText.substring(0, 400)}`);
        const errPath = path.join(SCREENSHOT_DIR, `error_${filename}`);
        await page.screenshot({ path: errPath });
        console.error(`Saved error state screenshot to: ${errPath}`);
      } catch (innerErr) {
        console.error('Failed to capture error details:', innerErr.message);
      }
      throw err; // Re-throw to fail the script
    } finally {
      await page.close();
    }
  }

  try {
    // 1. Landing/Login page (no credentials)
    await loginAndCapture(null, null, 'http://localhost:5173/login', '01_landing.png');

    // 2. Admin dashboard
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/dashboard', '06_home_dashboard.png');

    // 3. Client dashboard
    await loginAndCapture('client@quizhive.com', 'password123', 'http://localhost:5173/pm-dashboard', '07_client_dashboard.png');

    // 4. PM dashboard
    await loginAndCapture('pm@quizhive.com', 'password123', 'http://localhost:5173/pm-dashboard', '09_pm_dashboard.png');

    // 4b. Marketing dashboard
    await loginAndCapture('marketing@quizhive.com', 'password123', 'http://localhost:5173/pm-dashboard', '09b_marketing_dashboard.png');

    // 5. Projects panel
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/projects', '10_create_project.png');

    // 6. User directory
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/users', '11_user_directory.png');

    // 7. Training dashboard (T&D Manager dashboard)
    await loginAndCapture('charles@idonneous.com', 'password123', 'http://localhost:5173/dashboard', '12_training_dashboard.png');

    // 8. Trainings materials page
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/trainings', '13_course_management.png');

    // 9. Quiz Builder
    await loginAndCapture('trainer@quizhive.com', 'password123', 'http://localhost:5173/builder', '14_quiz_builder.png');

    // 10. Supervisor dashboard
    await loginAndCapture('supervisor@quizhive.com', 'password123', 'http://localhost:5173/pm-dashboard', '18_supervisor_dashboard.png');

    // 11. Learner dashboard
    await loginAndCapture('staff@quizhive.com', 'password123', 'http://localhost:5173/dashboard', '20_learner_dashboard.png');

    // 12. MD dashboard
    await loginAndCapture('md@quizhive.com', 'password123', 'http://localhost:5173/pm-dashboard', '24_md_dashboard.png');

    // 13. COO dashboard
    await loginAndCapture('coo@quizhive.com', 'password123', 'http://localhost:5173/pm-dashboard', '25_coo_dashboard.png');

    // 14. VP Operations dashboard
    await loginAndCapture('vp@quizhive.com', 'password123', 'http://localhost:5173/pm-dashboard', '26_vp_dashboard.png');

    // 15. Reports center
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/reports', '28_reports_center.png');

    // 16. Mobile login/join
    await loginAndCapture(null, null, 'http://localhost:5173/login', '31_mobile_home.png', true);

    // 17. Mobile learner dashboard
    await loginAndCapture('staff@quizhive.com', 'password123', 'http://localhost:5173/join', '32_mobile_learner_dashboard.png', true);

    // 18. Mobile live quiz page
    await loginAndCapture(null, null, 'http://localhost:5173/join', '33_mobile_live_quiz.png', true);

    console.log('All screenshots captured successfully!');
  } catch (error) {
    console.error('Screenshot capture failed overall:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
    process.exit(0);
  }
}

capture();
