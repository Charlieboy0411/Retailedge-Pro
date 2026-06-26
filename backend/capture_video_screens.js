const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'scratch', 'screenshots_video');

// Ensure directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function capture() {
  console.log('Starting isolated high-resolution video screen capture (1920x1080)...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Helper function to handle login and navigation in an isolated tab
  async function loginAndCapture(email, password, targetUrl, filename, isMobile = false) {
    console.log(`\n--- Capturing: ${filename} for ${email || 'guest'} on ${targetUrl} ---`);
    const page = await browser.newPage();
    
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
        await page.setViewport({ width: 1920, height: 1080 }); // Full HD
      }

      // Go to login page (fresh tab, no cache/cookies/storage)
      await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2', timeout: 60000 });

      if (email && password) {
        // Wait for React input field to mount, ensuring Vite has compiled
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
          // Safe type credentials
          await safeType('input[type="email"]', email);
          await safeType('input[type="password"]', password);
        }
        
        await new Promise(r => setTimeout(r, 500));
        await page.click('button[type="submit"]');
        
        // Wait for login to complete and redirect
        await page.waitForSelector('nav.sidebar', { timeout: 30000 });
        await new Promise(r => setTimeout(r, 1000));
      }

      // Navigate to target URL
      if (targetUrl) {
        const currentUrl = page.url();
        if (!email || currentUrl !== targetUrl) {
          await page.goto(targetUrl, { waitUntil: 'networkidle0' }).catch(() => {});
        }
      }

      // Wait for charts/rendering to settle (increased to prevent blank screenshots)
      await new Promise(r => setTimeout(r, 7000));

      // Capture screenshot
      const savePath = path.join(SCREENSHOT_DIR, filename);
      await page.screenshot({ path: savePath, fullPage: false });
      console.log(`Saved screenshot: ${savePath}`);
    } catch (err) {
      console.error(`ERROR capturing ${filename}:`, err.message);
      try {
        const errPath = path.join(SCREENSHOT_DIR, `error_${filename}`);
        await page.screenshot({ path: errPath });
        console.error(`Saved error state screenshot to: ${errPath}`);
      } catch (innerErr) {
        console.error('Failed to capture error details:', innerErr.message);
      }
    } finally {
      await page.close();
    }
  }

  try {
    // 1. Scene 1: Brand Reveal (Landing / Login Page)
    await loginAndCapture(null, null, 'http://localhost:5173/login', 'scene1_brand_reveal.png');

    // 2. Scene 2: Industry Challenge (User Directory showing some items)
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/users', 'scene2_industry_challenge.png');

    // 3. Scene 3: Solution (Central dashboard admin view)
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/dashboard', 'scene3_solution.png');

    // 4. Scene 4: Login Experience (Login Page)
    await loginAndCapture(null, null, 'http://localhost:5173/login', 'scene4_login.png');

    // 5. Scene 5: Main Dashboard (Admin Dashboard Control Center)
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/dashboard', 'scene5_main_dashboard.png');

    // 6. Scene 6: Managing Director Dashboard
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/pm-dashboard', 'scene6_md_dashboard.png');

    // 7. Scene 7: COO Dashboard
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/pm-dashboard', 'scene7_coo_dashboard.png');

    // 8. Scene 8: VP Operations Dashboard
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/pm-dashboard', 'scene8_vp_dashboard.png');

    // 9. Scene 9: Course Library (Trainings Page)
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/trainings', 'scene9_course_library.png');

    // 10. Scene 10: Course Player (Trainings Page player view)
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/trainings', 'scene10_course_player.png');

    // 11. Scene 11: Assessment Engine (Quiz Builder)
    await loginAndCapture('trainer@quizhive.com', 'password123', 'http://localhost:5173/builder', 'scene11_assessment_engine.png');

    // 12. Scene 12: RetailEdge Pro Quiz Experience (Live Join / Host Room)
    await loginAndCapture('trainer@quizhive.com', 'password123', 'http://localhost:5173/dashboard', 'scene12_live_quiz.png');

    // 13. Scene 13: Certification Journey
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/certificates', 'scene13_certifications.png');

    // 14. Scene 14: Program Manager Dashboard
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/pm-dashboard', 'scene14_pm_dashboard.png');

    // 15. Scene 15: T&D Manager Dashboard
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/dashboard', 'scene15_td_dashboard.png');

    // 16. Scene 16: Supervisor Dashboard
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/pm-dashboard', 'scene16_supervisor_dashboard.png');

    // 17. Scene 17: Marketing Manager Dashboard
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/pm-dashboard', 'scene17_marketing_dashboard.png');

    // 18. Scene 18: Analytics Center (Reports Page)
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/reports', 'scene18_analytics_center.png');

    // 19. Scene 19: AI Insights
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/pm-dashboard', 'scene19_ai_insights.png');

    // 20. Scene 20: Mobile Experience (Mobile view of Join)
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/join', 'scene20_mobile_experience.png', true);

    // 21. Scene 21: Business Impact Section (Reports Page)
    await loginAndCapture('admin@quizhive.com', 'password123', 'http://localhost:5173/reports', 'scene21_business_impact.png');

    // 22. Scene 22: Grand Closing (Login Page cover mockup)
    await loginAndCapture(null, null, 'http://localhost:5173/login', 'scene22_grand_closing.png');

    console.log('All video screenshots captured successfully!');
  } catch (error) {
    console.error('Screenshot capture failed overall:', error.message);
  } finally {
    await browser.close();
    process.exit(0);
  }
}

capture();
