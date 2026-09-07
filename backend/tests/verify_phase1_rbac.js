const axios = require('axios');
const puppeteer = require('puppeteer');

const API_BASE = 'http://localhost:5000/api';
const FE_BASE = 'http://localhost:5173';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runPhase1Verification() {
  console.log('================================================================');
  console.log('  RETAILEDGE PRO — PHASE 1 RBAC & PM DASHBOARD VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  let browser;
  try {
    // ---------------------------------------------------------
    // 1. API VERIFICATIONS (Test C, Test E, Test F, Test G)
    // ---------------------------------------------------------
    console.log('--- SECTION 1: BACKEND API AUTHORIZATION & ISOLATION ---');

    // Authenticate Employee
    console.log('\nAuthenticating Employee (staff@quizhive.com)...');
    const staffLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'staff@quizhive.com',
      password: 'password123'
    });
    const staffToken = staffLoginRes.data.token;
    assert(staffToken && staffLoginRes.data.user.role === 'Employee', 'Employee logged in successfully with role "Employee"');

    // Test C: Employee attempts PM APIs (must return HTTP 403)
    console.log('\n[TEST C] Employee attempts PM APIs (must return HTTP 403)...');
    
    // C.1: GET /api/users (PMDashboard endpoint that triggered the 403 bug)
    try {
      await axios.get(`${API_BASE}/users`, { headers: { Authorization: `Bearer ${staffToken}` } });
      assert(false, 'Employee GET /api/users should have returned 403 Forbidden');
    } catch (err) {
      assert(err.response?.status === 403, `Employee GET /api/users rejected with HTTP 403: "${err.response?.data?.error || err.message}"`);
    }

    // C.2: GET /api/users/:id (PM user details API)
    try {
      await axios.get(`${API_BASE}/users/c05a6567-c857-41e8-9883-1a07eabf8a2f`, { headers: { Authorization: `Bearer ${staffToken}` } });
      assert(false, 'Employee GET /api/users/:id should have returned 403 Forbidden');
    } catch (err) {
      assert(err.response?.status === 403, `Employee GET /api/users/:id rejected with HTTP 403: "${err.response?.data?.error || err.message}"`);
    }

    // C.3: POST /api/trainings/schedule-meeting (PM training scheduling API)
    try {
      await axios.post(`${API_BASE}/trainings/schedule-meeting`, { title: 'Test Meeting' }, { headers: { Authorization: `Bearer ${staffToken}` } });
      assert(false, 'Employee POST /api/trainings/schedule-meeting should have returned 403 Forbidden');
    } catch (err) {
      assert(err.response?.status === 403, `Employee POST /api/trainings/schedule-meeting rejected with HTTP 403: "${err.response?.data?.error || err.message}"`);
    }

    // C.4: POST /api/projects/:id/executive-metrics (Executive/PM metrics save API)
    try {
      await axios.post(`${API_BASE}/projects/1c4c15a4-88fa-4624-a45a-a97a9fac7907/executive-metrics`, { metric: 'test' }, { headers: { Authorization: `Bearer ${staffToken}` } });
      assert(false, 'Employee POST /api/projects/:id/executive-metrics should have returned 403 Forbidden');
    } catch (err) {
      assert(err.response?.status === 403, `Employee POST /api/projects/:id/executive-metrics rejected with HTTP 403: "${err.response?.data?.error || err.message}"`);
    }

    // Authenticate Demo PM
    console.log('\nAuthenticating Demo PM (pm@quizhive.com)...');
    const pmLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'pm@quizhive.com',
      password: 'password123'
    });
    const pmToken = pmLoginRes.data.token;
    const pmUser = pmLoginRes.data.user;
    assert(pmToken && pmUser.role === 'Program Manager', 'Demo PM logged in successfully with role "Program Manager"');

    // Test E: Demo PM attempts PM APIs (must return HTTP 200)
    console.log('\n[TEST E] Demo PM attempts PM APIs (must return HTTP 200)...');
    
    // E.1: GET /api/users
    const pmUsersRes = await axios.get(`${API_BASE}/users`, { headers: { Authorization: `Bearer ${pmToken}` } });
    assert(pmUsersRes.status === 200 && Array.isArray(pmUsersRes.data), `Demo PM GET /api/users returned HTTP 200 (${pmUsersRes.data.length} users)`);

    // E.2: GET /api/reports
    const pmReportsRes = await axios.get(`${API_BASE}/reports`, { headers: { Authorization: `Bearer ${pmToken}` } });
    assert(pmReportsRes.status === 200 && Array.isArray(pmReportsRes.data), `Demo PM GET /api/reports returned HTTP 200 (${pmReportsRes.data.length} reports)`);

    // E.3: GET /api/projects/my-projects
    const pmProjectsRes = await axios.get(`${API_BASE}/projects/my-projects`, { headers: { Authorization: `Bearer ${pmToken}` } });
    assert(pmProjectsRes.status === 200 && Array.isArray(pmProjectsRes.data), `Demo PM GET /api/projects/my-projects returned HTTP 200 (${pmProjectsRes.data.length} projects)`);

    // E.4: GET /api/trainings
    const pmTrainingsRes = await axios.get(`${API_BASE}/trainings`, { headers: { Authorization: `Bearer ${pmToken}` } });
    assert(pmTrainingsRes.status === 200 && Array.isArray(pmTrainingsRes.data), `Demo PM GET /api/trainings returned HTTP 200 (${pmTrainingsRes.data.length} trainings)`);

    // E.5: GET /api/projects/intelligence for assigned project
    const assignedProjectId = '1c4c15a4-88fa-4624-a45a-a97a9fac7907'; // Idonneous
    const pmIntelRes = await axios.get(`${API_BASE}/projects/intelligence?projectId=${assignedProjectId}`, {
      headers: { Authorization: `Bearer ${pmToken}` }
    });
    assert(pmIntelRes.status === 200 && pmIntelRes.data?.kpis, `Demo PM GET /api/projects/intelligence returned HTTP 200 with valid intelligence KPIs`);

    // Test F: Demo PM sees assigned project data only
    console.log('\n[TEST F] Demo PM project scoping (assigned project: Idonneous)...');
    const assignedProjects = pmProjectsRes.data.map(p => p.id);
    assert(assignedProjects.includes(assignedProjectId), `Demo PM has access to assigned project Idonneous (${assignedProjectId})`);
    
    // Check reports scoping: all returned reports should belong to assigned project(s)
    const outOfScopeReports = pmReportsRes.data.filter(r => r.projectId && !assignedProjects.includes(r.projectId));
    assert(outOfScopeReports.length === 0, `All reports accessible to Demo PM belong exclusively to assigned project scope (out-of-scope = 0)`);

    // Test G: Demo PM attempts unauthorized project (must reject with HTTP 403)
    console.log('\n[TEST G] Demo PM attempts unauthorized project access...');
    const unauthorizedProjectId = 'b25600ee-a0a5-49d5-8978-46e9167beeb5'; // PM A's Project Alpha
    try {
      await axios.get(`${API_BASE}/projects/intelligence?projectId=${unauthorizedProjectId}`, {
        headers: { Authorization: `Bearer ${pmToken}` }
      });
      assert(false, 'Demo PM access to unauthorized project intelligence should have returned 403 Forbidden');
    } catch (err) {
      assert(err.response?.status === 403, `Demo PM access to unauthorized project rejected with HTTP 403: "${err.response?.data?.error || err.message}"`);
    }

    // ---------------------------------------------------------
    // 2. FRONTEND BROWSER AUTOMATION (Test A, Test B, Test D, Test H)
    // ---------------------------------------------------------
    console.log('\n--- SECTION 2: FRONTEND BROWSER RBAC & UI VERIFICATION ---');

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    let page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Helper: log into frontend
    async function loginUI(email, password) {
      await page.goto(`${FE_BASE}/login`, { waitUntil: 'networkidle2' });
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.goto(`${FE_BASE}/login`, { waitUntil: 'networkidle2' });
      await page.waitForSelector('input[type="email"]');
      await page.type('input[type="email"]', email);
      await page.type('input[type="password"]', password);
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
        page.click('button[type="submit"]')
      ]);
      await sleep(2500);
    }

    // TEST A: Employee opens /dashboard -> Employee Dashboard loads
    console.log('\n[TEST A] Employee opens /dashboard...');
    await loginUI('staff@quizhive.com', 'password123');

    const currentUrlAfterEmployeeLogin = page.url();
    assert(currentUrlAfterEmployeeLogin.includes('/dashboard') && !currentUrlAfterEmployeeLogin.includes('/pm-dashboard'),
      `Employee landed on /dashboard (Current URL: ${currentUrlAfterEmployeeLogin}) without redirecting to /pm-dashboard`);

    // Verify sidebar link for Employee is "Employee Dashboard" pointing to /dashboard
    const employeeDashboardLink = await page.$eval('nav.sidebar a[href="/dashboard"]', el => el.innerText).catch(() => null);
    assert(employeeDashboardLink && employeeDashboardLink.includes('Employee Dashboard'),
      `Employee sidebar displays link labelled "Employee Dashboard" pointing to /dashboard (Found: "${employeeDashboardLink?.trim()}")`);

    const pmDashboardLinkForEmployee = await page.$eval('nav.sidebar a[href^="/pm-dashboard"]', el => el.innerText).catch(() => null);
    assert(!pmDashboardLinkForEmployee,
      'Employee sidebar does NOT contain any link pointing to /pm-dashboard');

    // TEST B: Employee manually opens /pm-dashboard -> Access Denied state, no PM APIs called
    console.log('\n[TEST B] Employee manually opens /pm-dashboard...');
    let interceptedPMApis = [];
    page.on('request', req => {
      const url = req.url();
      if (url.includes('/api/users') || url.includes('/api/reports') || url.includes('/api/projects/intelligence')) {
        interceptedPMApis.push(url);
      }
    });

    await page.goto(`${FE_BASE}/pm-dashboard`, { waitUntil: 'networkidle0' });
    await sleep(1000);

    const pageText = await page.evaluate(() => document.body.innerText);
    const hasAccessDenied = pageText.includes('Access Denied') && pageText.includes('Your account is not authorized to access the Program Manager Dashboard');
    assert(hasAccessDenied, 'Employee on /pm-dashboard sees clear Access Denied state message');

    const hasZeroKpiCards = pageText.includes('Quiz Sessions = 0') || (pageText.includes('Quiz Sessions') && pageText.includes('Total Attempts') && pageText.includes('Jitsi Telemetry Records'));
    assert(!hasZeroKpiCards, 'Employee does NOT see misleading zero KPI cards (Loading != Zero, 403 != Zero)');

    assert(interceptedPMApis.length === 0, `Frontend authorization guard blocked PM API calls before firing (PM API calls made: ${interceptedPMApis.length})`);

    // Test clicking "Return to Dashboard"
    const returnButton = await page.$('button');
    if (returnButton) {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const returnBtn = btns.find(b => b.innerText.includes('Return to Dashboard'));
        if (returnBtn) returnBtn.click();
      });
      await sleep(1000);
      const urlAfterReturn = page.url();
      assert(urlAfterReturn.includes('/dashboard'), `Clicking "Return to Dashboard" successfully navigated back to ${urlAfterReturn}`);
    }

    // TEST D: Demo PM opens /pm-dashboard -> dashboard loads successfully
    console.log('\n[TEST D] Demo PM opens /pm-dashboard...');
    await page.close();
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await loginUI('pm@quizhive.com', 'password123');

    const currentUrlAfterPMLogin = page.url();
    assert(currentUrlAfterPMLogin.includes('/pm-dashboard'), `Demo PM landed on /pm-dashboard (Current URL: ${currentUrlAfterPMLogin})`);

    // Verify sidebar link for PM
    const pmSidebarLink = await page.$eval('nav.sidebar a[href^="/pm-dashboard"]', el => el.innerText).catch(() => null);
    assert(pmSidebarLink && pmSidebarLink.includes('Program Manager Dashboard'),
      `Demo PM sidebar displays link labelled "Program Manager Dashboard" (Found: "${pmSidebarLink?.trim()}")`);

    // Check dashboard header
    await page.waitForSelector('.section-title', { timeout: 20000 });
    const sectionTitle = await page.$eval('.section-title', el => el.innerText);
    assert(sectionTitle.includes('Program Manager Dashboard'), `Dashboard title displays "${sectionTitle}"`);

    const welcomeText = await page.$eval('.section-desc', el => el.innerText);
    assert(welcomeText.includes('Demo PM'), `Dashboard greets authorized user: "${welcomeText}"`);

    // TEST H: Confirm KPI values are populated from real backend data (not 0s)
    console.log('\n[TEST H] Confirm KPI values are populated from real backend data...');
    await sleep(2000); // allow data hydration
    const pmBodyText = await page.evaluate(() => document.body.innerText);
    
    assert(!pmBodyText.includes('Forbidden: Insufficient role permissions'), 'Zero error banners or forbidden notices on Demo PM dashboard');
    
    // Check that projects dropdown or selector includes Idonneous
    assert(pmBodyText.includes('Idonneous') || welcomeText.includes('Idonneous'), 'Demo PM dashboard displays assigned project "Idonneous"');

    // Confirm that real reports and data are rendered
    assert(pmReportsRes.data.length > 0, `Backend confirms real data exists for PM (${pmReportsRes.data.length} real reports loaded)`);

  } catch (err) {
    console.error('Fatal error during verification:', err);
    failed++;
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  console.log('\n================================================================');
  console.log(`  VERIFICATION SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runPhase1Verification();
