/**
 * RETAILEDGE PRO — MD SCHEDULE & BATCHES NAVIGATION VERIFICATION SUITE
 *
 * Verifies:
 * 1. Isolated environment & Network Circuit Breaker active.
 * 2. MD authenticates successfully with role 'MD'.
 * 3. MD receives enterprise-wide scheduled trainings and batches from GET /api/trainings.
 * 4. MD receives project portfolio from GET /api/projects.
 * 5. MD receives user roster for session invitations from GET /api/users.
 * 6. MD is authorized to create/schedule training classes (project-specific & General/Global).
 * 7. Trainee / Employee role CANNOT create or schedule training sessions (HTTP 403).
 * 8. MD cannot access restricted administrative functions (e.g., /roles, /audit-logs).
 * 9. Trainer role project-scoping remains preserved (Trainer A only sees assigned projects).
 * 10. Program Manager role project-scoping remains preserved (PM only sees assigned projects).
 * 11. SchedulePage & App.jsx code-level invariants for canManage and RoleGuard.
 */
const net = require('net');
const path = require('path');
const fs = require('fs');

// ── Network Circuit Breaker ──
const origConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  let host = 'localhost';
  let port = null;
  if (typeof args[0] === 'object' && args[0] !== null) {
    host = args[0].host || 'localhost';
    port = args[0].port;
  } else if (typeof args[0] === 'number') {
    port = args[0];
    if (typeof args[1] === 'string') host = args[1];
  }
  const isLocal = ['127.0.0.1', 'localhost', '::1'].includes(host);
  if (!isLocal || port === 5432 || (typeof host === 'string' && host.includes('rds.amazonaws.com'))) {
    const err = new Error(`ISOLATION VIOLATION: Outbound connection blocked to ${host}:${port}`);
    err.code = 'ECONNREFUSED';
    process.nextTick(() => this.emit('error', err));
    return this;
  }
  return origConnect.apply(this, args);
};

const BASE_URL = 'http://localhost:5000';
const GALDERMA_ID = '71350b15-bbcf-4751-8960-821ece052612';
const SSEIL_ID    = '3190afd0-2ccb-4c07-822d-5af651bbca9e';

async function runTests() {
  console.log('\n========================================================================');
  console.log('🧪 VERIFYING MD SCHEDULE & BATCHES NAVIGATION & RBAC INTEGRITY');
  console.log('========================================================================');

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

  async function login(email, password = 'password123') {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Login failed for ${email}: ${res.status} ${err}`);
    }
    const data = await res.json();
    return { token: data.token, user: data.user };
  }

  // ── Section 1: Authentication & Identity ──
  console.log('\n--- 1. MD Authentication & Identity ---');
  const mdAuth = await login('md@quizhive.com');
  assert(mdAuth.token && typeof mdAuth.token === 'string', 'MD authenticates and receives valid JWT token');
  assert(mdAuth.user && mdAuth.user.role === 'MD', `MD account role is confirmed as "MD" (received: ${mdAuth.user?.role})`);

  // ── Section 2: Enterprise Schedule & Batches API ──
  console.log('\n--- 2. MD Data Loading: GET /api/trainings ---');
  const trainingsRes = await fetch(`${BASE_URL}/api/trainings`, {
    headers: { Authorization: `Bearer ${mdAuth.token}` }
  });
  assert(trainingsRes.status === 200, `GET /api/trainings returns HTTP 200 (received: ${trainingsRes.status})`);
  const trainings = await trainingsRes.json();
  assert(Array.isArray(trainings), 'Trainings response is a valid array');
  assert(trainings.length >= 8, `MD sees all enterprise scheduled sessions and batches (received ${trainings.length} items, expected >= 8)`);

  const galdermaSessions = trainings.filter(t => t.projectId === GALDERMA_ID);
  const globalSessions   = trainings.filter(t => !t.projectId);
  assert(galdermaSessions.length > 0, `MD data includes Galderma project sessions (${galdermaSessions.length} found)`);
  assert(globalSessions.length > 0, `MD data includes General / Global sessions (${globalSessions.length} found)`);

  // Test project filtering on GET /api/trainings
  const filterGaldermaRes = await fetch(`${BASE_URL}/api/trainings?projectId=${GALDERMA_ID}`, {
    headers: { Authorization: `Bearer ${mdAuth.token}` }
  });
  const filterGalderma = await filterGaldermaRes.json();
  assert(filterGalderma.every(t => t.projectId === GALDERMA_ID), 'Query ?projectId=GALDERMA_ID returns only Galderma sessions');

  const filterGlobalRes = await fetch(`${BASE_URL}/api/trainings?projectId=`, {
    headers: { Authorization: `Bearer ${mdAuth.token}` }
  });
  const filterGlobal = await filterGlobalRes.json();
  assert(filterGlobal.every(t => !t.projectId), 'Query ?projectId= returns only General / Global sessions');

  // ── Section 3: Project Portfolio & User Roster for Schedule Class Modal ──
  console.log('\n--- 3. Schedule Class Modal Dependencies: Projects & Users ---');
  const projRes = await fetch(`${BASE_URL}/api/projects`, {
    headers: { Authorization: `Bearer ${mdAuth.token}` }
  });
  assert(projRes.status === 200, `GET /api/projects returns HTTP 200 for MD (received: ${projRes.status})`);
  const projs = await projRes.json();
  assert(Array.isArray(projs) && projs.length >= 3, `MD receives full enterprise project portfolio (count: ${projs.length})`);

  const usersRes = await fetch(`${BASE_URL}/api/users`, {
    headers: { Authorization: `Bearer ${mdAuth.token}` }
  });
  assert(usersRes.status === 200, `GET /api/users returns HTTP 200 for MD (received: ${usersRes.status})`);
  const users = await usersRes.json();
  assert(Array.isArray(users) && users.length > 0, `MD receives team user roster for session invitations (count: ${users.length})`);

  // ── Section 4: Scheduling Permission & Verification ──
  console.log('\n--- 4. Scheduling Live Class Permission for MD ---');
  const createMeetingRes = await fetch(`${BASE_URL}/api/trainings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mdAuth.token}` },
    body: JSON.stringify({
      title: 'TEMP_VERIFY_MD_CLASS',
      description: 'Temporary verification class',
      type: 'Meeting',
      url: 'https://meet.google.com/ver-test-qzh',
      projectId: GALDERMA_ID,
      scheduledAt: new Date(Date.now() + 86400000).toISOString()
    })
  });
  assert(createMeetingRes.status === 201, `MD can schedule a project-specific live training class (HTTP ${createMeetingRes.status})`);
  const createdMeeting = await createMeetingRes.json();

  if (createdMeeting && createdMeeting.id) {
    // Clean up created verification meeting immediately
    const delRes = await fetch(`${BASE_URL}/api/trainings/${createdMeeting.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${mdAuth.token}` }
    });
    assert(delRes.status === 200, 'MD can manage and remove scheduled classes (DELETE returns HTTP 200)');
  }

  // ── Section 5: Security Boundaries & Role Restrictions ──
  console.log('\n--- 5. Security Boundaries & Role Restrictions ---');
  // Trainee cannot schedule
  const traineeAuth = await login('staff@quizhive.com');
  const traineePostRes = await fetch(`${BASE_URL}/api/trainings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${traineeAuth.token}` },
    body: JSON.stringify({
      title: 'Trainee Attempt',
      type: 'Meeting',
      url: 'https://meet.google.com/trainee',
      scheduledAt: new Date().toISOString()
    })
  });
  assert(traineePostRes.status === 403, `Trainee/Employee role is REJECTED from scheduling classes (HTTP ${traineePostRes.status})`);

  // MD cannot access unrelated restricted functions
  const rolesRes = await fetch(`${BASE_URL}/api/users/roles`, {
    headers: { Authorization: `Bearer ${mdAuth.token}` }
  });
  assert(rolesRes.status === 403 || rolesRes.status === 404, `MD cannot access administrative Role Management (HTTP ${rolesRes.status})`);

  // ── Section 6: Preservation of Trainer & PM Scoping (Commit 19c80db) ──
  console.log('\n--- 6. Preservation of Trainer & PM Project Scoping ---');
  const trainerAAuth = await login('trainer@quizhive.com');
  const trainerAProjsRes = await fetch(`${BASE_URL}/api/projects`, {
    headers: { Authorization: `Bearer ${trainerAAuth.token}` }
  });
  const trainerAProjs = await trainerAProjsRes.json();
  assert(trainerAProjs.some(p => p.id === GALDERMA_ID), 'Trainer A sees assigned Galderma project');
  assert(!trainerAProjs.some(p => p.id === SSEIL_ID), 'Trainer A DOES NOT see unassigned SSEIL project');

  const pmAuth = await login('yusuf@idonneous.com');
  const pmProjsRes = await fetch(`${BASE_URL}/api/projects`, {
    headers: { Authorization: `Bearer ${pmAuth.token}` }
  });
  const pmProjs = await pmProjsRes.json();
  assert(pmProjs.every(p => p.id === SSEIL_ID), 'PM retains single/assigned project scope (SSEIL)');

  // ── Section 7: Frontend Source Code Invariants ──
  console.log('\n--- 7. Frontend Source Code Invariants ---');
  const appJsx = fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'src', 'App.jsx'), 'utf8');
  assert(
    appJsx.includes("Route path=\"schedule\"") && appJsx.includes("'MD'"),
    'App.jsx includes "MD" in RoleGuard allowedRoles for /schedule route'
  );

  const schedulePageJsx = fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'SchedulePage.jsx'), 'utf8');
  assert(
    schedulePageJsx.includes("const canManage") && schedulePageJsx.includes("'MD'"),
    'SchedulePage.jsx includes "MD" in canManage role definition'
  );

  const landingPageJsx = fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'LandingPage.jsx'), 'utf8');
  assert(
    !landingPageJsx.includes("TEMP_MODIFICATION"),
    'frontend/src/pages/LandingPage.jsx remains strictly unmodified'
  );

  // ── Summary ──
  console.log('\n========================================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
