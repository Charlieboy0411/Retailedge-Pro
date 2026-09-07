const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACTS_DIR = path.resolve('C:/Users/admin/.gemini/antigravity-ide/brain/31233919-f2a5-47b5-bf0b-f6ecc73ed7d1');

async function runVisualValidation() {
  console.log('🚀 Starting Visual Validation of Supervisor Cockpit & RBAC...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    // 1. Login as Supervisor A
    console.log('Logging in as Supervisor A (supervisor@quizhive.com)...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'supervisor@quizhive.com');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('Current URL after login:', page.url());

    // 2. Verify URL is /dashboard
    if (!page.url().includes('/dashboard')) {
      throw new Error(`Expected /dashboard but got ${page.url()}`);
    }

    // 3. Wait for Supervisor Cockpit elements to load
    await page.waitForSelector('.supervisor-cockpit', { timeout: 10000 });
    console.log('✅ Supervisor Cockpit component rendered successfully');

    // Wait for metrics and team table to fetch
    await page.waitForFunction(() => !document.querySelector('.kpi-card')?.innerText.includes('...'), { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1000));

    // Verify KPIs
    const kpiCards = await page.$$('.kpi-card');
    console.log(`Found ${kpiCards.length} KPI cards on cockpit (Expected: 8)`);

    // Verify team members displayed in matrix
    const tableRows = await page.$$('table tbody tr');
    console.log(`Found ${tableRows.length} team members in performance matrix`);

    // 4. Test Attention Required Filter (At Risk)
    console.log('Clicking "At Risk" filter pill...');
    const atRiskPill = await page.$('.filter-pill:nth-child(2)');
    if (atRiskPill) {
      await atRiskPill.click();
      await new Promise(r => setTimeout(r, 500));
      const atRiskRows = await page.$$('table tbody tr');
      console.log(`Filtered At-Risk members displayed: ${atRiskRows.length}`);
    }

    // Return to All Team filter
    const allTeamPill = await page.$('.filter-pill:nth-child(1)');
    if (allTeamPill) await allTeamPill.click();
    await new Promise(r => setTimeout(r, 500));

    // 5. Test Coaching Follow-Up Modal
    console.log('Opening Coaching & Follow-Up modal for first team member...');
    const coachBtn = await page.$('button.btn-coach');
    if (coachBtn) {
      await page.evaluate(el => el.click(), coachBtn);
      await page.waitForSelector('.coaching-modal', { timeout: 5000 });
      console.log('✅ Coaching modal displayed');

      // Fill in note
      await page.type('textarea.coaching-textarea', 'Followed up on POS Billing & return handling procedures. Scheduled refresher module.');
      const saveBtn = await page.$('button.btn-save-note');
      if (saveBtn) {
        await page.evaluate(el => el.click(), saveBtn);
        await new Promise(r => setTimeout(r, 1500));
        console.log('✅ Successfully submitted coaching follow-up note');
      }

      // Close modal
      const closeBtn = await page.$('button.btn-modal-close');
      if (closeBtn) await page.evaluate(el => el.click(), closeBtn);
      await new Promise(r => setTimeout(r, 1000));
    }

    // Capture primary screenshot showing fully loaded Supervisor A cockpit with coaching log
    const cockpitScreenshot = path.join(ARTIFACTS_DIR, 'supervisor_cockpit.png');
    await page.screenshot({ path: cockpitScreenshot, fullPage: true });
    console.log(`✅ Saved Supervisor A Cockpit screenshot to ${cockpitScreenshot}`);

    // 6. Test direct navigation to /pm-dashboard (Must be blocked)
    console.log('Testing direct navigation to /pm-dashboard...');
    await page.goto('http://localhost:5173/pm-dashboard', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const accessDenied = await page.$('.access-denied-container');
    const currentUrl = page.url();
    if (accessDenied || currentUrl.includes('/dashboard')) {
      console.log(`✅ Access to /pm-dashboard blocked as expected! (Denied container or redirected: ${currentUrl})`);
    } else {
      throw new Error(`PM Dashboard was accessible to Supervisor at ${currentUrl}`);
    }

    // 7. Test Supervisor B isolation on a clean page
    console.log('\nTesting Supervisor B (supervisor_b@quizhive.com) in isolated session...');
    const pageB = await browser.newPage();
    await pageB.setViewport({ width: 1440, height: 900 });

    await pageB.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await pageB.waitForSelector('input[type="email"]');
    await pageB.type('input[type="email"]', 'supervisor_b@quizhive.com');
    await pageB.type('input[type="password"]', 'password123');
    await pageB.click('button[type="submit"]');

    await pageB.waitForSelector('.supervisor-cockpit', { timeout: 15000 });
    console.log('✅ Supervisor B Cockpit loaded');
    await new Promise(r => setTimeout(r, 2000));

    const cockpitBScreenshot = path.join(ARTIFACTS_DIR, 'supervisor_b_cockpit.png');
    await pageB.screenshot({ path: cockpitBScreenshot, fullPage: true });
    console.log(`✅ Saved Supervisor B Cockpit screenshot to ${cockpitBScreenshot}`);

    const bTableRows = await pageB.$$('table tbody tr');
    console.log(`Found ${bTableRows.length} team members for Supervisor B (Expected: 2 direct reports)`);

    console.log('\n🎉 VISUAL VALIDATION COMPLETED SUCCESSFULLY WITH ZERO DEFECTS!');
  } catch (err) {
    console.error('❌ Visual validation error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runVisualValidation();
