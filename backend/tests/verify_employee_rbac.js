const axios = require('axios');
const puppeteer = require('puppeteer');

const API_BASE = 'http://localhost:5000/api';
const FE_BASE = 'http://localhost:5173';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runEmployeeRbacVerification() {
  console.log('================================================================');
  console.log('  RETAILEDGE PRO — PHASE 2 EMPLOYEE LEAST-PRIVILEGE RBAC AUDIT');
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
    // 1. AUTHENTICATION
    // ---------------------------------------------------------
    console.log('--- SECTION 1: AUTHENTICATION ---');
    console.log('Authenticating Employee (staff@quizhive.com)...');
    const staffLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'staff@quizhive.com',
      password: 'password123'
    });
    const staffToken = staffLoginRes.data.token;
    const staffUser = staffLoginRes.data.user;
    assert(staffToken && staffUser.role === 'Employee', `Employee login: received valid token and role === "Employee" (${staffUser.name})`);

    const staffHeaders = { Authorization: `Bearer ${staffToken}` };

    // Authenticate PM for comparative data
    console.log('Authenticating Program Manager (pm@quizhive.com)...');
    const pmLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'pm@quizhive.com',
      password: 'password123'
    });
    const pmToken = pmLoginRes.data.token;
    const pmHeaders = { Authorization: `Bearer ${pmToken}` };

    // ---------------------------------------------------------
    // 2. DASHBOARD & OPERATIONAL DATA (OWN SCOPE)
    // ---------------------------------------------------------
    console.log('\n--- SECTION 2: DASHBOARD & OPERATIONAL DATA (OWN SCOPE) ---');
    
    // 2.1: Employee can fetch assigned quizzes
    const quizRes = await axios.get(`${API_BASE}/quizzes`, { headers: staffHeaders });
    assert(quizRes.status === 200 && Array.isArray(quizRes.data), `Employee GET /api/quizzes returned HTTP 200 (${quizRes.data.length} quizzes)`);

    // 2.2: Employee can fetch trainings/meetings
    const trainingsRes = await axios.get(`${API_BASE}/trainings`, { headers: staffHeaders });
    assert(trainingsRes.status === 200 && Array.isArray(trainingsRes.data), `Employee GET /api/trainings returned HTTP 200 (${trainingsRes.data.length} trainings)`);

    // 2.3: Employee cannot fetch user management list (PM Dashboard API)
    try {
      await axios.get(`${API_BASE}/users`, { headers: staffHeaders });
      assert(false, 'Employee GET /api/users should return 403 Forbidden');
    } catch (err) {
      assert(err.response?.status === 403, `Employee PM API (GET /api/users) rejected with HTTP 403: "${err.response?.data?.error || err.message}"`);
    }

    // ---------------------------------------------------------
    // 3. ATTENDANCE & DATA SCOPE (OWN DATA ONLY)
    // ---------------------------------------------------------
    console.log('\n--- SECTION 3: ATTENDANCE & DATA SCOPE ISOLATION ---');
    
    // 3.1: Employee can fetch own attendance
    const attRes = await axios.get(`${API_BASE}/reports/attendance`, { headers: staffHeaders });
    assert(attRes.status === 200 && attRes.data.isEmployee === true, 'Employee GET /api/reports/attendance returns HTTP 200 with isEmployee: true');
    
    // 3.2: Verify attendance data is strictly scoped to Employee
    const logs = attRes.data.logs || [];
    assert(Array.isArray(logs), `Employee attendance returns personal log array (Count: ${logs.length})`);

    // ---------------------------------------------------------
    // 4. CERTIFICATES & CREDENTIALS RBAC
    // ---------------------------------------------------------
    console.log('\n--- SECTION 4: CERTIFICATES RBAC & SCOPE ---');

    // Fetch PM certificates to identify an existing foreign certificate
    const pmCertsRes = await axios.get(`${API_BASE}/certificates`, { headers: pmHeaders });
    const allCerts = Array.isArray(pmCertsRes.data) ? pmCertsRes.data : (pmCertsRes.data?.certificates || []);
    const foreignCert = allCerts.find(c => c.userId !== staffUser.id);

    // 4.1: Employee can fetch their own certificates list
    const staffCertsRes = await axios.get(`${API_BASE}/certificates`, { headers: staffHeaders });
    const staffCerts = Array.isArray(staffCertsRes.data) ? staffCertsRes.data : (staffCertsRes.data?.certificates || []);
    assert(staffCertsRes.status === 200, `Employee GET /api/certificates returns HTTP 200 (${staffCerts.length} certs)`);

    const ownCert = staffCerts.length > 0 ? staffCerts[0] : allCerts.find(c => c.userId === staffUser.id);

    // 4.2: Employee can read their OWN certificate details
    if (ownCert) {
      const ownCertRes = await axios.get(`${API_BASE}/certificates/${ownCert.id}`, { headers: staffHeaders });
      const fetchedCert = ownCertRes.data?.certificate || ownCertRes.data;
      assert(ownCertRes.status === 200 && fetchedCert.id === ownCert.id, `Employee GET /api/certificates/:ownId allowed for personal cert (${ownCert.certificate_id})`);
    } else {
      assert(false, 'No personal cert found for staff user to test personal GET');
    }

    // 4.3: Employee CANNOT read coworker/foreign certificate details
    if (foreignCert) {
      try {
        await axios.get(`${API_BASE}/certificates/${foreignCert.id}`, { headers: staffHeaders });
        assert(false, `Employee GET /api/certificates/:foreignId should return 403 Forbidden`);
      } catch (err) {
        assert(err.response?.status === 403, `Employee GET foreign cert (${foreignCert.certificate_id}) rejected with HTTP 403 Forbidden`);
      }

      // 4.4: Employee CANNOT download coworker/foreign certificate
      try {
        await axios.get(`${API_BASE}/certificates/${foreignCert.id}/download`, { headers: staffHeaders });
        assert(false, `Employee GET /api/certificates/:foreignId/download should return 403 Forbidden`);
      } catch (err) {
        assert(err.response?.status === 403, `Employee download foreign cert rejected with HTTP 403 Forbidden`);
      }
    }

    // 4.5: Employee CANNOT create/generate certificate
    try {
      await axios.post(`${API_BASE}/certificates/generate`, { userId: staffUser.id }, { headers: staffHeaders });
      assert(false, 'Employee POST /api/certificates/generate should return 403 Forbidden');
    } catch (err) {
      assert(err.response?.status === 403, `Employee POST /api/certificates/generate rejected with HTTP 403: "${err.response?.data?.error || err.message}"`);
    }

    // 4.6: Employee CANNOT bulk generate certificates
    try {
      await axios.post(`${API_BASE}/certificates/bulk-generate`, { batchName: 'Test' }, { headers: staffHeaders });
      assert(false, 'Employee POST /api/certificates/bulk-generate should return 403 Forbidden');
    } catch (err) {
      assert(err.response?.status === 403, `Employee POST /api/certificates/bulk-generate rejected with HTTP 403: "${err.response?.data?.error || err.message}"`);
    }

    // 4.7: Employee CANNOT check eligibility
    try {
      await axios.post(`${API_BASE}/certificates/eligibility`, {}, { headers: staffHeaders });
      assert(false, 'Employee POST /api/certificates/eligibility should return 403 Forbidden');
    } catch (err) {
      assert(err.response?.status === 403, `Employee POST /api/certificates/eligibility rejected with HTTP 403: "${err.response?.data?.error || err.message}"`);
    }

    // 4.8: Employee CANNOT revoke certificate
    if (foreignCert) {
      try {
        await axios.post(`${API_BASE}/certificates/${foreignCert.id}/revoke`, { reason: 'Test' }, { headers: staffHeaders });
        assert(false, 'Employee POST /api/certificates/:id/revoke should return 403 Forbidden');
      } catch (err) {
        assert(err.response?.status === 403, `Employee POST /api/certificates/:id/revoke rejected with HTTP 403: "${err.response?.data?.error || err.message}"`);
      }
    }

    // 4.9: Employee CANNOT view certificate analytics
    try {
      await axios.get(`${API_BASE}/certificates/analytics`, { headers: staffHeaders });
      assert(false, 'Employee GET /api/certificates/analytics should return 403 Forbidden');
    } catch (err) {
      assert(err.response?.status === 403, `Employee GET /api/certificates/analytics rejected with HTTP 403: "${err.response?.data?.error || err.message}"`);
    }

    // 4.10: Employee CANNOT view certificate templates
    try {
      await axios.get(`${API_BASE}/certificates/templates`, { headers: staffHeaders });
      assert(false, 'Employee GET /api/certificates/templates should return 403 Forbidden');
    } catch (err) {
      assert(err.response?.status === 403, `Employee GET /api/certificates/templates rejected with HTTP 403: "${err.response?.data?.error || err.message}"`);
    }

    // 4.11: Employee CANNOT view signatures and seals
    try {
      await axios.get(`${API_BASE}/certificates/signatures-and-seals`, { headers: staffHeaders });
      assert(false, 'Employee GET /api/certificates/signatures-and-seals should return 403 Forbidden');
    } catch (err) {
      assert(err.response?.status === 403, `Employee GET /api/certificates/signatures-and-seals rejected with HTTP 403: "${err.response?.data?.error || err.message}"`);
    }

    // ---------------------------------------------------------
    // 5. QUIZ CREATION & MANAGEMENT RBAC
    // ---------------------------------------------------------
    console.log('\n--- SECTION 5: QUIZ CREATION & MANAGEMENT RBAC ---');

    // 5.1: Employee CANNOT create quiz
    try {
      await axios.post(`${API_BASE}/quizzes`, { title: 'Unauthorized Employee Quiz' }, { headers: staffHeaders });
      assert(false, 'Employee POST /api/quizzes should return 403 Forbidden');
    } catch (err) {
      assert(err.response?.status === 403, `Employee POST /api/quizzes rejected with HTTP 403: "${err.response?.data?.error || err.message}"`);
    }

    // 5.2: Employee CANNOT generate quiz with AI
    try {
      await axios.post(`${API_BASE}/quizzes/generate`, { prompt: 'Generate test quiz' }, { headers: staffHeaders });
      assert(false, 'Employee POST /api/quizzes/generate should return 403 Forbidden');
    } catch (err) {
      assert(err.response?.status === 403, `Employee POST /api/quizzes/generate rejected with HTTP 403: "${err.response?.data?.error || err.message}"`);
    }

    // ---------------------------------------------------------
    // 6. MANAGEMENT ENDPOINTS (USERS, PROJECTS, REPORTS)
    // ---------------------------------------------------------
    console.log('\n--- SECTION 6: MANAGEMENT ENDPOINTS (USERS, PROJECTS, REPORTS) ---');

    // 6.1: User Management
    try {
      await axios.post(`${API_BASE}/users`, { name: 'Test New User' }, { headers: staffHeaders });
      assert(false, 'Employee POST /api/users should return 403 Forbidden');
    } catch (err) {
      assert(err.response?.status === 403, `Employee POST /api/users rejected with HTTP 403: "${err.response?.data?.error || err.message}"`);
    }

    // 6.2: Project Management
    try {
      await axios.post(`${API_BASE}/projects`, { name: 'Test New Project' }, { headers: staffHeaders });
      assert(false, 'Employee POST /api/projects should return 403 Forbidden');
    } catch (err) {
      assert(err.response?.status === 403, `Employee POST /api/projects rejected with HTTP 403: "${err.response?.data?.error || err.message}"`);
    }

    // 6.3: Reports & Intelligence
    try {
      await axios.get(`${API_BASE}/reports`, { headers: staffHeaders });
      assert(false, 'Employee GET /api/reports should return 403 Forbidden');
    } catch (err) {
      assert(err.response?.status === 403, `Employee GET /api/reports rejected with HTTP 403: "${err.response?.data?.error || err.message}"`);
    }

    try {
      await axios.get(`${API_BASE}/reports/analytics/available`, { headers: staffHeaders });
      assert(false, 'Employee GET /api/reports/analytics/available should return 403 Forbidden');
    } catch (err) {
      assert(err.response?.status === 403, `Employee GET /api/reports/analytics/available rejected with HTTP 403: "${err.response?.data?.error || err.message}"`);
    }

    try {
      await axios.post(`${API_BASE}/reports/analytics/monthly-closing`, {}, { headers: staffHeaders });
      assert(false, 'Employee POST /api/reports/analytics/monthly-closing should return 403 Forbidden');
    } catch (err) {
      assert(err.response?.status === 403, `Employee POST /api/reports/analytics/monthly-closing rejected with HTTP 403: "${err.response?.data?.error || err.message}"`);
    }

    // ---------------------------------------------------------
    // 7. BROWSER UI & ROUTE GUARD VALIDATION
    // ---------------------------------------------------------
    console.log('\n--- SECTION 7: BROWSER UI & ROUTE GUARD VALIDATION ---');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Login as Employee in UI
    console.log('Navigating to login page...');
    await page.goto(`${FE_BASE}/login`, { waitUntil: 'networkidle2' });
    await page.type('input[type="email"]', 'staff@quizhive.com');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    const currentUrl = page.url();
    assert(currentUrl.includes('/dashboard'), `Employee redirected to /dashboard on login (Current: ${currentUrl})`);

    await sleep(2000);
    await page.screenshot({ path: 'C:/Users/admin/.gemini/antigravity-ide/brain/31233919-f2a5-47b5-bf0b-f6ecc73ed7d1/employee_dashboard.png' });

    // Verify Sidebar Items
    const sidebarText = await page.evaluate(() => {
      const nav = document.querySelector('aside') || document.querySelector('nav');
      return nav ? nav.innerText : '';
    });

    assert(sidebarText.includes('Employee Dashboard'), 'Sidebar contains "Employee Dashboard"');
    
    // Assert exactly 1 "Employee Dashboard" link is rendered
    const employeeDashboardCount = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('aside a, nav a'));
      return links.filter(a => a.innerText.includes('Employee Dashboard')).length;
    });
    assert(employeeDashboardCount === 1, `Sidebar contains exactly 1 "Employee Dashboard" link (Found: ${employeeDashboardCount})`);

    assert(sidebarText.includes('My Quizzes') || sidebarText.includes('Training'), 'Sidebar contains learning links');
    assert(sidebarText.includes('My Attendance'), 'Sidebar contains "My Attendance"');
    assert(sidebarText.includes('My Certificates'), 'Sidebar contains "My Certificates"');
    
    // Negative assertions on sidebar
    assert(!sidebarText.includes('Program Manager Dashboard'), 'Sidebar does NOT contain "Program Manager Dashboard"');
    assert(!sidebarText.includes('Reports & Analytics') && !sidebarText.includes('Intelligent Reports'), 'Sidebar does NOT contain "Reports & Analytics"');
    assert(!sidebarText.includes('User Directory'), 'Sidebar does NOT contain "User Directory"');
    assert(!sidebarText.includes('Project Management'), 'Sidebar does NOT contain "Project Management"');
    assert(!sidebarText.includes('Schedule & Batches'), 'Sidebar does NOT contain "Schedule & Batches"');
    assert(!sidebarText.includes('Settings'), 'Sidebar does NOT contain "Settings"');

    // Test direct navigation guards:
    // Route 1: /pm-dashboard -> Should show Access Denied or redirect to /dashboard
    console.log('Testing direct URL navigation to /pm-dashboard...');
    await page.goto(`${FE_BASE}/pm-dashboard`, { waitUntil: 'networkidle2' });
    await sleep(1500);
    const pmPageText = await page.evaluate(() => document.body.innerText);
    const isDeniedOrRedirected = page.url().includes('/dashboard') || pmPageText.includes('Access Denied');
    assert(isDeniedOrRedirected, 'Direct navigation to /pm-dashboard displays Access Denied screen or redirects to /dashboard');

    // Route 2: /reports -> Should redirect to /dashboard
    console.log('Testing direct URL navigation to /reports...');
    await page.goto(`${FE_BASE}/reports`, { waitUntil: 'networkidle2' });
    await sleep(1500);
    assert(page.url().includes('/dashboard') && !page.url().includes('/reports'), `Direct navigation to /reports redirected to /dashboard (${page.url()})`);

    // Route 3: /builder -> Should redirect to /dashboard
    console.log('Testing direct URL navigation to /builder...');
    await page.goto(`${FE_BASE}/builder`, { waitUntil: 'networkidle2' });
    await sleep(1500);
    assert(page.url().includes('/dashboard') && !page.url().includes('/builder'), `Direct navigation to /builder redirected to /dashboard (${page.url()})`);

    // Route 4: /users -> Should redirect to /dashboard
    console.log('Testing direct URL navigation to /users...');
    await page.goto(`${FE_BASE}/users`, { waitUntil: 'networkidle2' });
    await sleep(1500);
    assert(page.url().includes('/dashboard') && !page.url().includes('/users'), `Direct navigation to /users redirected to /dashboard (${page.url()})`);

    // Route 5: /certificates -> Allowed, but must be Employee-scoped presentation
    console.log('Navigating to /certificates to verify clean participant view...');
    await page.goto(`${FE_BASE}/certificates`, { waitUntil: 'networkidle2' });
    await sleep(2000);
    
    const certPageContent = await page.evaluate(() => document.body.innerText);
    assert(certPageContent.includes('My Certificates'), 'Certificates page displays "My Certificates" header for Employee');
    assert(!certPageContent.includes('Create Certificate'), 'Certificates page does NOT display "Create Certificate" button');
    assert(!certPageContent.includes('Generate Certificates'), 'Certificates page does NOT display "Generate Certificates" button');
    assert(!certPageContent.includes('Certificate Templates'), 'Certificates page does NOT display "Certificate Templates" button');
    assert(!certPageContent.includes('Bulk Generator'), 'Certificates page does NOT display "Bulk Generator" tab');
    assert(!certPageContent.includes('Revoke Certificate'), 'Certificates page does NOT display "Revoke" actions');

  } catch (error) {
    console.error('Test execution error:', error);
    failed++;
  } finally {
    if (browser) await browser.close();
  }

  console.log('\n================================================================');
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runEmployeeRbacVerification();
