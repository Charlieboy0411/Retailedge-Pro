/**
 * RETAILEDGE PRO — MULTI-PROJECT ASSIGNMENT REGRESSION TEST SUITE
 *
 * Deterministic tests verifying:
 * 1. Assigning one project to a user.
 * 2. Assigning multiple projects to a Program Manager.
 * 3. Confirming assignments persist after reloading the employee (GET /api/users/:id).
 * 4. Confirming assigned projects appear in user's authorized project dropdowns (GET /api/projects).
 * 5. Replacing one set of project assignments with another.
 * 6. Removing a deselected project without affecting remaining projects or other users.
 * 7. Saving unchanged selections twice without creating duplicates (idempotency).
 * 8. Rejecting an invalid project ID format (HTTP 400).
 * 9. Rejecting non-existent project IDs (HTTP 400).
 * 10. Rejecting unauthorized project assignment changes by a Program Manager (HTTP 403).
 * 11. Preserving existing password when password field is blank/empty string.
 * 12. Multi-project assignment support for Trainers.
 */

const net = require('net');

// ─── Network Circuit Breaker ───
const origConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  let host = '127.0.0.1';
  let port = null;
  if (typeof args[0] === 'object' && args[0] !== null) {
    host = args[0].host || '127.0.0.1';
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

const BASE_URL = 'http://127.0.0.1:5000';
const GALDERMA_ID = '71350b15-bbcf-4751-8960-821ece052612';
const SSEIL_ID    = '3190afd0-2ccb-4c07-822d-5af651bbca9e';

async function runTests() {
  console.log('\n========================================================================');
  console.log('🧪 VERIFYING PROGRAM MANAGER & MULTI-PROJECT ASSIGNMENT FIXES');
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

  const adminAuth = await login('admin@quizhive.com');
  const pmAuth    = await login('yusuf@idonneous.com'); // PM assigned strictly to SSEIL
  const adminToken = adminAuth.token;
  const pmToken    = pmAuth.token;

  // ── Create a dedicated test Program Manager ──
  console.log('\n--- Setup: Dedicated Test Program Manager ---');
  const testEmail = `test.pm.multi.${Date.now()}@quizhive.com`;
  const initialPassword = 'OriginalSecretPassword123!';

  const createRes = await fetch(`${BASE_URL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Test Multi PM',
      email: testEmail,
      password: initialPassword,
      employee_id: `TPM${Math.floor(Math.random() * 90000 + 10000)}`,
      roleName: 'Program Manager',
      projectId: GALDERMA_ID,
      status: 'Active'
    })
  });
  assert(createRes.status === 201, `POST /api/users creates test user (got: ${createRes.status})`);
  const createdUser = await createRes.json();
  const testUserId = createdUser.id;
  assert(createdUser.projectIds?.includes(GALDERMA_ID), `Initial project assigned: ${GALDERMA_ID}`);

  // ── TEST 1: Assigning One Project ──
  console.log('\n--- 1. Assigning One Project ---');
  const res1 = await fetch(`${BASE_URL}/api/users/${testUserId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Test Multi PM',
      email: testEmail,
      roleName: 'Program Manager',
      projectId: GALDERMA_ID
    })
  });
  assert(res1.status === 200, `PUT /api/users/:id with single project returns HTTP 200 (got: ${res1.status})`);
  const data1 = await res1.json();
  assert(data1.projectIds?.length === 1 && data1.projectIds[0] === GALDERMA_ID, `User has exactly 1 project assigned: ${GALDERMA_ID}`);
  assert(data1.projectId === GALDERMA_ID, `data.projectId returns ${GALDERMA_ID}`);

  // ── TEST 2: Assigning Multiple Projects ──
  console.log('\n--- 2. Assigning Multiple Projects (Comma-Separated string or array) ---');
  const multiProjStr = `${GALDERMA_ID},${SSEIL_ID}`;
  const res2 = await fetch(`${BASE_URL}/api/users/${testUserId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Test Multi PM',
      email: testEmail,
      roleName: 'Program Manager',
      projectId: multiProjStr
    })
  });
  assert(res2.status === 200, `PUT /api/users/:id with multiple projects returns HTTP 200 (got: ${res2.status})`);
  const data2 = await res2.json();
  assert(data2.projectIds?.length === 2, `User now has 2 projects assigned (count: ${data2.projectIds?.length})`);
  assert(data2.projectIds.includes(GALDERMA_ID) && data2.projectIds.includes(SSEIL_ID), `Both Galderma and SSEIL are present in projectIds`);
  assert(data2.projectId?.includes(GALDERMA_ID) && data2.projectId?.includes(SSEIL_ID), `data2.projectId includes both comma-separated IDs`);

  // ── TEST 3: Confirm Assignments Persist After Reload ──
  console.log('\n--- 3. Confirming Assignments Persist After Reload (GET /api/users/:id) ---');
  const reloadRes = await fetch(`${BASE_URL}/api/users/${testUserId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(reloadRes.status === 200, `GET /api/users/:id returns HTTP 200`);
  const reloaded = await reloadRes.json();
  assert(reloaded.projectIds?.length === 2, `Reloaded user retains 2 projects in projectIds`);
  assert(reloaded.projectIds.includes(GALDERMA_ID) && reloaded.projectIds.includes(SSEIL_ID), `Reloaded user has both Galderma and SSEIL`);

  // ── TEST 4: Authorized Project Dropdowns (GET /api/projects for the updated user) ──
  console.log('\n--- 4. Authorized Projects Appear in User Project Listing ---');
  const testUserAuth = await login(testEmail, initialPassword);
  const projRes = await fetch(`${BASE_URL}/api/projects`, {
    headers: { Authorization: `Bearer ${testUserAuth.token}` }
  });
  assert(projRes.status === 200, `GET /api/projects for multi-project PM returns HTTP 200`);
  const userProjects = await projRes.json();
  assert(Array.isArray(userProjects), `Projects response is array`);
  const userProjIds = userProjects.map(p => p.id);
  assert(userProjIds.includes(GALDERMA_ID), `Multi-project PM sees Galderma project in dropdown list`);
  assert(userProjIds.includes(SSEIL_ID), `Multi-project PM sees SSEIL project in dropdown list`);

  // ── TEST 5: Replacing Assignments (Galderma + SSEIL -> SSEIL only) ──
  console.log('\n--- 5. Replacing Project Assignments (Deselect Galderma) ---');
  const resReplace = await fetch(`${BASE_URL}/api/users/${testUserId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Test Multi PM',
      email: testEmail,
      roleName: 'Program Manager',
      projectId: SSEIL_ID
    })
  });
  assert(resReplace.status === 200, `PUT /api/users/:id deselecting Galderma returns HTTP 200`);
  const dataReplace = await resReplace.json();
  assert(dataReplace.projectIds?.length === 1 && dataReplace.projectIds[0] === SSEIL_ID, `User now has only SSEIL assigned`);
  assert(!dataReplace.projectIds.includes(GALDERMA_ID), `Galderma was successfully removed`);

  // ── TEST 6: Other Users Assignments Are Untouched ──
  console.log('\n--- 6. Removing Deselected Project Without Affecting Other Users ---');
  // Verify other users (e.g. Yusuf Khan for SSEIL, Trainer for Galderma) still retain their assignments
  const allUsersRes = await fetch(`${BASE_URL}/api/users`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const allUsers = await allUsersRes.json();
  const yusufUser = allUsers.find(u => u.email === 'yusuf@idonneous.com');
  const trainerUser = allUsers.find(u => u.email === 'trainer@quizhive.com');
  assert(yusufUser && (yusufUser.projectId?.includes(SSEIL_ID) || yusufUser.projectIds?.includes(SSEIL_ID)), `Yusuf Khan still assigned to SSEIL`);
  assert(trainerUser && (trainerUser.projectId?.includes(GALDERMA_ID) || trainerUser.projectIds?.includes(GALDERMA_ID)), `Trainer A still assigned to Galderma`);

  // ── TEST 7: Idempotency (Save Unchanged Selections Twice) ──
  console.log('\n--- 7. Idempotent Resave (Save Unchanged Selections Twice) ---');
  const resIdempotent1 = await fetch(`${BASE_URL}/api/users/${testUserId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      projectId: SSEIL_ID
    })
  });
  assert(resIdempotent1.status === 200, `First resave returns HTTP 200`);

  const resIdempotent2 = await fetch(`${BASE_URL}/api/users/${testUserId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      projectId: SSEIL_ID
    })
  });
  assert(resIdempotent2.status === 200, `Second resave returns HTTP 200 without duplicate key errors`);
  const dataIdempotent = await resIdempotent2.json();
  assert(dataIdempotent.projectIds?.length === 1 && dataIdempotent.projectIds[0] === SSEIL_ID, `Project assignments remain clean and deduplicated`);

  // ── TEST 8: Reject Invalid Project ID Format ──
  console.log('\n--- 8. Reject Invalid Project ID Format ---');
  const resBadFormat = await fetch(`${BASE_URL}/api/users/${testUserId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      projectId: 'not-a-valid-uuid'
    })
  });
  assert(resBadFormat.status === 400, `Invalid project ID format rejected with HTTP 400 (got: ${resBadFormat.status})`);
  const badFormatData = await resBadFormat.json();
  assert(badFormatData.error?.includes('Invalid project ID format'), `Error message clearly explains invalid format (got: "${badFormatData.error}")`);

  // ── TEST 9: Reject Non-Existent Project ID ──
  console.log('\n--- 9. Reject Non-Existent Project ID ---');
  const fakeUuid = '00000000-0000-0000-0000-999999999999';
  const resMissingProj = await fetch(`${BASE_URL}/api/users/${testUserId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      projectId: fakeUuid
    })
  });
  assert(resMissingProj.status === 400, `Non-existent project UUID rejected with HTTP 400 (got: ${resMissingProj.status})`);
  const missingData = await resMissingProj.json();
  assert(missingData.error?.includes('Selected project does not exist'), `Error explains project does not exist (got: "${missingData.error}")`);

  // ── TEST 10: Reject Unauthorized Assignment by Program Manager ──
  console.log('\n--- 10. Reject Unauthorized Project Assignment Changes by Program Manager ---');
  // PM Yusuf is authorized only for SSEIL, NOT Galderma
  const resUnauthorized = await fetch(`${BASE_URL}/api/users/${testUserId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pmToken}` },
    body: JSON.stringify({
      name: 'Attempted Hijack',
      projectId: GALDERMA_ID // Unauthorized project for Yusuf
    })
  });
  assert(resUnauthorized.status === 403, `PM assigning unauthorized project returns HTTP 403 Forbidden (got: ${resUnauthorized.status})`);

  // ── TEST 11: Preserve Password When Password Field Is Blank ──
  console.log('\n--- 11. Preserve Password When Password Field Is Blank ---');
  const resBlankPass = await fetch(`${BASE_URL}/api/users/${testUserId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Test Multi PM - Updated Name',
      password: '', // Blank password field
      projectId: SSEIL_ID
    })
  });
  assert(resBlankPass.status === 200, `Update with blank password returns HTTP 200`);

  // Verify login still works with original password!
  const loginWithOriginalPass = await login(testEmail, initialPassword);
  assert(!!loginWithOriginalPass.token, `Original password was preserved and still logs in successfully`);

  // ── TEST 12: Multi-Project Assignment for Trainers ──
  console.log('\n--- 12. Multi-Project Assignment for Trainer Role ---');
  // Assign both Galderma and SSEIL to Trainer A
  const trainer = allUsers.find(u => u.email === 'trainer@quizhive.com');
  const resTrainerMulti = await fetch(`${BASE_URL}/api/users/${trainer.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      roleName: 'Trainer',
      projectId: `${GALDERMA_ID},${SSEIL_ID}`
    })
  });
  assert(resTrainerMulti.status === 200, `Multi-project assignment for Trainer returns HTTP 200`);
  const dataTrainerMulti = await resTrainerMulti.json();
  assert(dataTrainerMulti.projectIds?.includes(GALDERMA_ID) && dataTrainerMulti.projectIds?.includes(SSEIL_ID), `Trainer has both Galderma and SSEIL assigned`);

  // Verify Trainer projects list now includes both
  const trainerAuth = await login('trainer@quizhive.com');
  const trainerProjsRes = await fetch(`${BASE_URL}/api/projects`, {
    headers: { Authorization: `Bearer ${trainerAuth.token}` }
  });
  const trainerProjs = await trainerProjsRes.json();
  const tProjIds = trainerProjs.map(p => p.id);
  assert(tProjIds.includes(GALDERMA_ID) && tProjIds.includes(SSEIL_ID), `Trainer sees both assigned projects in GET /api/projects`);

  // Restore Trainer A back to Galderma only
  await fetch(`${BASE_URL}/api/users/${trainer.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      roleName: 'Trainer',
      projectId: GALDERMA_ID
    })
  });

  // ── Clean Up Test User ──
  console.log('\n--- Cleanup: Dedicated Test User ---');
  const delRes = await fetch(`${BASE_URL}/api/users/${testUserId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(delRes.status === 200, `Test user cleaned up successfully`);

  console.log('\n========================================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('\n❌ Unhandled error during test execution:', err);
  process.exit(1);
});
