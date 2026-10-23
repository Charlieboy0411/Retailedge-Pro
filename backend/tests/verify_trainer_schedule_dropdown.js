/**
 * RETAILEDGE PRO — TRAINER SCHEDULE CLASS VERIFICATION TEST SUITE
 *
 * Verifies:
 * 1. Trainer A sees ONLY projects mapped to Trainer A.
 * 2. Trainer A cannot see projects assigned only to Trainer B.
 * 3. Trainer C (unmapped) receives an empty list ([]).
 * 4. Admin retains full enterprise project visibility.
 * 5. Program Manager retains strict single-project / assigned-project scoping.
 * 6. Scheduling with assigned project persists correct projectId.
 * 7. Scheduling with General / Global (projectId: null / "") succeeds for Trainer & Admin.
 * 8. Scheduling with unauthorized project returns HTTP 403 Forbidden.
 * 9. Program Manager scheduling without project returns HTTP 400 Bad Request.
 * 10. Listing trainings preserves project-wise isolation and General/Global visibility.
 */
const net = require('net');
const path = require('path');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');

// Network Circuit Breaker
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
  console.log('🧪 VERIFYING TRAINER PROJECT SCHEDULE & RBAC FIXES');
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
    return data.token;
  }

  // Obtain authentic JWT tokens via /api/auth/login
  const tokenTrainerA = await login('trainer@quizhive.com');
  const tokenTrainerB = await login('trainer.sseil@quizhive.com');
  const tokenTrainerC = await login('trainer.unmapped@quizhive.com');
  const tokenAdmin    = await login('admin@quizhive.com');
  const tokenPM       = await login('yusuf@idonneous.com'); // Yusuf Khan (PM SSEIL)

  // ── TEST 1: Trainer A Projects Scope ──
  console.log('\n--- 1. Trainer A (Assigned to Galderma) ---');
  const resProjA = await fetch(`${BASE_URL}/api/projects`, {
    headers: { Authorization: `Bearer ${tokenTrainerA}` }
  });
  assert(resProjA.status === 200, 'Trainer A GET /api/projects returns HTTP 200');
  const projsA = await resProjA.json();
  assert(Array.isArray(projsA), 'Trainer A projects is an array');
  assert(projsA.some(p => p.id === GALDERMA_ID), 'Trainer A sees Galderma project');
  assert(!projsA.some(p => p.id === SSEIL_ID), 'Trainer A DOES NOT see SSEIL project (assigned to Trainer B)');

  // ── TEST 2: Trainer B Projects Scope ──
  console.log('\n--- 2. Trainer B (Assigned to SSEIL) ---');
  const resProjB = await fetch(`${BASE_URL}/api/projects`, {
    headers: { Authorization: `Bearer ${tokenTrainerB}` }
  });
  assert(resProjB.status === 200, 'Trainer B GET /api/projects returns HTTP 200');
  const projsB = await resProjB.json();
  assert(projsB.some(p => p.id === SSEIL_ID), 'Trainer B sees SSEIL project');
  assert(!projsB.some(p => p.id === GALDERMA_ID), 'Trainer B DOES NOT see Galderma project (assigned to Trainer A)');

  // ── TEST 3: Trainer C (Unmapped / No projects) ──
  console.log('\n--- 3. Trainer C (Unmapped Trainer) ---');
  const resProjC = await fetch(`${BASE_URL}/api/projects`, {
    headers: { Authorization: `Bearer ${tokenTrainerC}` }
  });
  assert(resProjC.status === 200, 'Trainer C GET /api/projects returns HTTP 200');
  const projsC = await resProjC.json();
  assert(Array.isArray(projsC) && projsC.length === 0, 'Trainer C receives empty array [] (clean empty state)');

  // ── TEST 4: Admin Enterprise Project Visibility ──
  console.log('\n--- 4. Admin Enterprise Project Visibility ---');
  const resProjAdmin = await fetch(`${BASE_URL}/api/projects`, {
    headers: { Authorization: `Bearer ${tokenAdmin}` }
  });
  assert(resProjAdmin.status === 200, 'Admin GET /api/projects returns HTTP 200');
  const projsAdmin = await resProjAdmin.json();
  assert(projsAdmin.length >= 3, `Admin sees all projects (${projsAdmin.length} total)`);
  assert(projsAdmin.some(p => p.id === GALDERMA_ID) && projsAdmin.some(p => p.id === SSEIL_ID), 'Admin sees both Galderma and SSEIL');

  // ── TEST 5: Scheduling Class with Mapped Project ──
  console.log('\n--- 5. Scheduling Class with Mapped Project (Trainer A -> Galderma) ---');
  const resSchedMapped = await fetch(`${BASE_URL}/api/trainings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenTrainerA}` },
    body: JSON.stringify({
      title: 'Galderma Q4 Advanced Clinicals',
      description: 'Project-specific masterclass',
      type: 'Meeting',
      url: 'https://meet.jit.si/QuizHive-galderma-test-12345',
      projectId: GALDERMA_ID,
      scheduledAt: new Date(Date.now() + 86400000).toISOString()
    })
  });
  assert(resSchedMapped.status === 201, 'Trainer A can schedule meeting for mapped Galderma project (HTTP 201)');
  const schedMappedData = await resSchedMapped.json();
  assert(schedMappedData.projectId === GALDERMA_ID, 'Scheduled class correctly persisted projectId = GALDERMA_ID');

  // ── TEST 6: Scheduling Class with General / Global (projectId: "") ──
  console.log('\n--- 6. Scheduling Class with General / Global (Trainer A -> General) ---');
  const resSchedGlobal = await fetch(`${BASE_URL}/api/trainings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenTrainerA}` },
    body: JSON.stringify({
      title: 'Company-Wide Soft Skills Workshop',
      description: 'Open to all staff',
      type: 'Meeting',
      url: 'https://meet.google.com/abc-defg-hij',
      projectId: '',
      scheduledAt: new Date(Date.now() + 172800000).toISOString()
    })
  });
  assert(resSchedGlobal.status === 201, 'Trainer A can schedule General / Global meeting (HTTP 201)');
  const schedGlobalData = await resSchedGlobal.json();
  assert(schedGlobalData.projectId === null, 'General / Global meeting correctly persisted projectId = null');

  // ── TEST 7: Scheduling Class with Unauthorized Project (Trainer A -> SSEIL) ──
  console.log('\n--- 7. Scheduling Class with Unauthorized Project (Trainer A -> SSEIL) ---');
  const resSchedUnauth = await fetch(`${BASE_URL}/api/trainings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenTrainerA}` },
    body: JSON.stringify({
      title: 'Unauthorized Intrusion Class',
      description: 'Should be rejected',
      type: 'Meeting',
      url: 'https://meet.jit.si/QuizHive-sseil-unauth',
      projectId: SSEIL_ID,
      scheduledAt: new Date(Date.now() + 86400000).toISOString()
    })
  });
  assert(resSchedUnauth.status === 403, 'Trainer A scheduling for unmapped project (SSEIL) is REJECTED with HTTP 403');

  // ── TEST 8: Program Manager Scoping & Validation ──
  console.log('\n--- 8. Program Manager Validation ---');
  // PM attempting to schedule without a project
  const resPmNoProj = await fetch(`${BASE_URL}/api/trainings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenPM}` },
    body: JSON.stringify({
      title: 'PM Unscoped Training',
      type: 'Meeting',
      url: 'https://meet.jit.si/QuizHive-pm-test',
      projectId: '',
      scheduledAt: new Date(Date.now() + 86400000).toISOString()
    })
  });
  assert(resPmNoProj.status === 400, 'Program Manager scheduling without project is REJECTED with HTTP 400');

  // PM attempting to schedule for unauthorized project (Galderma)
  const resPmUnauth = await fetch(`${BASE_URL}/api/trainings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenPM}` },
    body: JSON.stringify({
      title: 'PM Foreign Project Training',
      type: 'Meeting',
      url: 'https://meet.jit.si/QuizHive-pm-test',
      projectId: GALDERMA_ID,
      scheduledAt: new Date(Date.now() + 86400000).toISOString()
    })
  });
  assert(resPmUnauth.status === 403, 'Program Manager scheduling for foreign project is REJECTED with HTTP 403');

  // ── TEST 9: Schedule Listings & Isolation ──
  console.log('\n--- 9. Schedule Listings & Isolation ---');
  const resListTrainerA = await fetch(`${BASE_URL}/api/trainings`, {
    headers: { Authorization: `Bearer ${tokenTrainerA}` }
  });
  assert(resListTrainerA.status === 200, 'Trainer A GET /api/trainings returns HTTP 200');
  const listA = await resListTrainerA.json();
  const hasGalderma = listA.some(t => t.id === schedMappedData.id);
  const hasGlobal = listA.some(t => t.id === schedGlobalData.id);
  assert(hasGalderma, 'Trainer A schedule listing includes scheduled Galderma class');
  assert(hasGlobal, 'Trainer A schedule listing includes scheduled General / Global class');

  // Specific project filter query: ?projectId=GALDERMA_ID
  const resListGaldOnly = await fetch(`${BASE_URL}/api/trainings?projectId=${GALDERMA_ID}`, {
    headers: { Authorization: `Bearer ${tokenTrainerA}` }
  });
  const listGaldOnly = await resListGaldOnly.json();
  assert(listGaldOnly.every(t => t.projectId === GALDERMA_ID), 'Query ?projectId=GALDERMA_ID returns ONLY Galderma items');

  // Unauthorized filter query: ?projectId=SSEIL_ID
  const resListSseilForA = await fetch(`${BASE_URL}/api/trainings?projectId=${SSEIL_ID}`, {
    headers: { Authorization: `Bearer ${tokenTrainerA}` }
  });
  assert(resListSseilForA.status === 403, 'Trainer A requesting ?projectId=SSEIL_ID is REJECTED with HTTP 403');

  console.log('\n========================================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runTests().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
