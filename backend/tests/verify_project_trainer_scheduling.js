// ============================================================================
// RETAILEDGE PRO — REGRESSION TEST SUITE: PROJECT-BASED TRAINER ASSIGNMENT & SCHEDULING
// Safeguards:
// 1. Mandatory trainer selection on meeting scheduling.
// 2. Active project assignment eligibility enforcement on GET /trainers and backend POST.
// 3. Primary trainer persistence, dashboard & scheduler synchronization.
// 4. Legacy session & trainer-created workflow preservation.
// 5. Strict trainer visibility isolation: Trainer must NOT see another trainer's assigned meeting.
// 6. Honest notification logging & simulation.
// 7. Deduplication guard (60-second window).
// Dialect: Isolated Local UAT SQLite (Circuit Breaker enforced)
// ============================================================================

const path = require('path');
const net = require('net');
const http = require('http');

// ─── Network Circuit Breaker & SQLite UAT Database Isolation ───
process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = path.resolve(__dirname, '../uat_database.sqlite');
process.env.DB_HOST = '127.0.0.1';
process.env.JWT_SECRET = 'test_secret_retailedge_pro_2026';
process.env.PORT = '5077';

// Strict circuit breaker: Block any outbound connection to PostgreSQL / AWS RDS
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

const BASE_URL = `http://127.0.0.1:${process.env.PORT}`;

async function runTestSuite() {
  console.log('========================================================================');
  console.log('🧪 VERIFYING PROJECT-BASED TRAINER ASSIGNMENT & SCHEDULER INTEGRATION');
  console.log('Environment: Isolated Local UAT (Port 5077)');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, detail = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message} ${detail}`);
      failed++;
    }
  }

  // 1. Boot up isolated local server
  const express = require('express');
  const app = express();
  app.use(express.json());

  // Connect to local UAT sqlite database
  const sequelize = require('../config/database');

  // Register routes
  app.use('/api/auth', require('../routes/auth'));
  app.use('/api/users', require('../routes/users'));
  app.use('/api/projects', require('../routes/projects'));
  app.use('/api/trainings', require('../routes/trainings'));

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(process.env.PORT, resolve));
  console.log(`🚀 Isolated test server listening on ${BASE_URL}\n`);

  try {
    const Training = require('../models/Training');
    const Project = require('../models/Project');
    const ProjectAssignment = require('../models/ProjectAssignment');
    const User = require('../models/User');
    const Role = require('../models/Role');
    const bcrypt = require('bcrypt');

    // ─── SETUP TEST SEED DATA ───
    console.log('--- Setting up Test Users, Projects & ProjectAssignments ---');

    // Find or create Trainer Role
    let [trainerRole] = await Role.findOrCreate({
      where: { role_name: 'Trainer' },
      defaults: { id: 'e3a92f3a-4110-41fb-b16e-c9ee7d45cfd1' }
    });

    // Find or create Admin Role
    let [adminRole] = await Role.findOrCreate({
      where: { role_name: 'Admin' },
      defaults: { id: 'a1a1a1a1-4110-41fb-b16e-c9ee7d45cfd1' }
    });

    // Find or create Employee Role
    let [empRole] = await Role.findOrCreate({
      where: { role_name: 'Employee' },
      defaults: { id: 'c3c3c3c3-4110-41fb-b16e-c9ee7d45cfd1' }
    });

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create 2 Test Projects
    const [projectAlpha] = await Project.findOrCreate({
      where: { name: 'Alpha Retail Project' },
      defaults: { status: 'Active', zone: 'North' }
    });

    const [projectBeta] = await Project.findOrCreate({
      where: { name: 'Beta Retail Project' },
      defaults: { status: 'Active', zone: 'South' }
    });

    // Create Admin User
    const [adminUser] = await User.findOrCreate({
      where: { email: 'admin_test@quizhive.com' },
      defaults: {
        name: 'Admin Tester',
        password: hashedPassword,
        roleId: adminRole.id,
        status: 'Active'
      }
    });

    // Create Trainer A (Assigned to Project Alpha)
    const [trainerA] = await User.findOrCreate({
      where: { email: 'trainer_alpha@quizhive.com' },
      defaults: {
        name: 'Trainer Alpha',
        password: hashedPassword,
        roleId: trainerRole.id,
        status: 'Active',
        projectId: projectAlpha.id
      }
    });

    // Create Trainer B (Assigned to Project Beta)
    const [trainerB] = await User.findOrCreate({
      where: { email: 'trainer_beta@quizhive.com' },
      defaults: {
        name: 'Trainer Beta',
        password: hashedPassword,
        roleId: trainerRole.id,
        status: 'Active',
        projectId: projectBeta.id
      }
    });

    // Create an Employee user (Non-trainer)
    const [employeeUser] = await User.findOrCreate({
      where: { email: 'employee_test@quizhive.com' },
      defaults: {
        name: 'Learner One',
        password: hashedPassword,
        roleId: empRole.id,
        status: 'Active',
        projectId: projectAlpha.id
      }
    });

    // Create an Inactive Trainer user
    const [trainerInactive] = await User.findOrCreate({
      where: { email: 'trainer_inactive@quizhive.com' },
      defaults: {
        name: 'Trainer Inactive',
        password: hashedPassword,
        roleId: trainerRole.id,
        status: 'Inactive',
        projectId: projectAlpha.id
      }
    });

    // Ensure explicit active ProjectAssignments
    await ProjectAssignment.findOrCreate({
      where: { userId: trainerA.id, projectId: projectAlpha.id },
      defaults: { status: 'Active', zone: 'North' }
    });

    await ProjectAssignment.findOrCreate({
      where: { userId: trainerB.id, projectId: projectBeta.id },
      defaults: { status: 'Active', zone: 'South' }
    });

    // Get Auth Tokens
    const login = async (email) => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' })
      });
      const data = await res.json();
      return data.token;
    };

    const adminToken = await login('admin_test@quizhive.com');
    const trainerAToken = await login('trainer_alpha@quizhive.com');
    const trainerBToken = await login('trainer_beta@quizhive.com');
    const employeeToken = await login('employee_test@quizhive.com');

    // ─── TEST 1: GET /api/projects/:id/trainers Eligibility Scoping ───
    console.log('\n--- 1. Dedicated Project Trainer Discovery Endpoint ---');
    const alphaTrainersRes = await fetch(`${BASE_URL}/api/projects/${projectAlpha.id}/trainers`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(alphaTrainersRes.status === 200, `GET /api/projects/:id/trainers returns 200 OK (got: ${alphaTrainersRes.status})`);
    const alphaTrainers = await alphaTrainersRes.json();
    assert(Array.isArray(alphaTrainers), 'Returns an array of trainers');
    assert(alphaTrainers.some(t => t.id === trainerA.id), 'Project Alpha contains Trainer Alpha');
    assert(!alphaTrainers.some(t => t.id === trainerB.id), 'Project Alpha does NOT contain Trainer Beta');
    assert(!alphaTrainers.some(t => t.id === employeeUser.id), 'Non-trainer employee is NOT listed as a trainer');

    const betaTrainersRes = await fetch(`${BASE_URL}/api/projects/${projectBeta.id}/trainers`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const betaTrainers = await betaTrainersRes.json();
    assert(betaTrainers.some(t => t.id === trainerB.id), 'Project Beta contains Trainer Beta');
    assert(!betaTrainers.some(t => t.id === trainerA.id), 'Project Beta does NOT contain Trainer Alpha');

    // 1b. Inactive assignment excluded
    await ProjectAssignment.destroy({ where: { userId: trainerB.id, projectId: projectAlpha.id } });
    await ProjectAssignment.create({
      userId: trainerB.id,
      projectId: projectAlpha.id,
      status: 'Inactive',
      zone: 'North'
    });
    const alphaAfterInactiveRes = await fetch(`${BASE_URL}/api/projects/${projectAlpha.id}/trainers`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const alphaAfterInactive = await alphaAfterInactiveRes.json();
    assert(!alphaAfterInactive.some(t => t.id === trainerB.id), 'Trainer with Inactive ProjectAssignment is NOT returned');

    // 1c. Project with no trainers returns empty array
    const [projectGamma] = await Project.findOrCreate({
      where: { name: 'Project Gamma (Empty Trainers)' },
      defaults: { status: 'Active', project_type: 'Standalone' }
    });
    const gammaTrainersRes = await fetch(`${BASE_URL}/api/projects/${projectGamma.id}/trainers`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(gammaTrainersRes.status === 200, `GET /api/projects/:id/trainers on empty project returns 200 OK (got: ${gammaTrainersRes.status})`);
    const gammaTrainers = await gammaTrainersRes.json();
    assert(Array.isArray(gammaTrainers) && gammaTrainers.length === 0, `Empty project returns empty trainer array (got: ${gammaTrainers.length})`);

    // 1d. Safe handling of invalid project IDs
    const invalidFormatRes = await fetch(`${BASE_URL}/api/projects/not-a-valid-uuid/trainers`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(invalidFormatRes.status === 400, `Malformed project ID rejected with 400 (got: ${invalidFormatRes.status})`);

    const nonExistentProjRes = await fetch(`${BASE_URL}/api/projects/00000000-0000-0000-0000-000000000000/trainers`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(nonExistentProjRes.status === 404, `Non-existent project ID rejected with 404 (got: ${nonExistentProjRes.status})`);

    // 1e. Subproject hierarchy: Child subprojects inherit eligible trainers from parent project
    const [projectAlphaSub] = await Project.findOrCreate({
      where: { name: 'Project Alpha - Delhi North Subproject' },
      defaults: { status: 'Active', parentId: projectAlpha.id }
    });
    const subTrainersRes = await fetch(`${BASE_URL}/api/projects/${projectAlphaSub.id}/trainers`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(subTrainersRes.status === 200, `GET /api/projects/:id/trainers on child subproject returns 200 OK (got: ${subTrainersRes.status})`);
    const subTrainers = await subTrainersRes.json();
    assert(Array.isArray(subTrainers), 'Subproject returns an array of trainers');
    assert(subTrainers.some(t => t.id === trainerA.id), 'Child subproject inherits Trainer Alpha from parent Project Alpha');
    assert(!subTrainers.some(t => t.id === trainerB.id), 'Child subproject does NOT include Trainer Beta from unrelated Project Beta');
    assert(!subTrainers.some(t => t.id === employeeUser.id), 'Child subproject does NOT include non-trainer employees');

    // 1f. Multi-tier subproject hierarchy inheritance
    const [projectAlphaSubSub] = await Project.findOrCreate({
      where: { name: 'Project Alpha - Delhi North Store 101' },
      defaults: { status: 'Active', parentId: projectAlphaSub.id }
    });
    const multiTierRes = await fetch(`${BASE_URL}/api/projects/${projectAlphaSubSub.id}/trainers`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(multiTierRes.status === 200, `Multi-tier child project returns 200 OK (got: ${multiTierRes.status})`);
    const multiTierTrainers = await multiTierRes.json();
    assert(multiTierTrainers.some(t => t.id === trainerA.id), 'Multi-tier subproject inherits Trainer Alpha from top parent Project Alpha');
    assert(!multiTierTrainers.some(t => t.id === trainerB.id), 'Multi-tier subproject does NOT include Trainer Beta');

    // 1g. Missing parent handling: project with non-existent parentId does not crash or loop
    const [projectMissingParent] = await Project.findOrCreate({
      where: { name: 'Project With Ghost Parent' },
      defaults: { status: 'Active' }
    });
    const sequelize = require('../config/database');
    await sequelize.query('PRAGMA foreign_keys = OFF;');
    await projectMissingParent.update({ parentId: '00000000-0000-0000-0000-000000000999' });
    await sequelize.query('PRAGMA foreign_keys = ON;');

    const missingParentRes = await fetch(`${BASE_URL}/api/projects/${projectMissingParent.id}/trainers`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(missingParentRes.status === 200, `Project with missing parent returns 200 OK without crashing (got: ${missingParentRes.status})`);
    const missingParentTrainers = await missingParentRes.json();
    assert(Array.isArray(missingParentTrainers), 'Returns valid array for project with missing parent');

    // 1h. Cyclic project hierarchy handling: project A -> B -> A terminates safely
    const [cyclicProjA] = await Project.findOrCreate({
      where: { name: 'Cyclic Project Alpha' },
      defaults: { status: 'Active' }
    });
    const [cyclicProjB] = await Project.findOrCreate({
      where: { name: 'Cyclic Project Beta' },
      defaults: { status: 'Active', parentId: cyclicProjA.id }
    });
    await cyclicProjA.update({ parentId: cyclicProjB.id });

    const cyclicRes = await fetch(`${BASE_URL}/api/projects/${cyclicProjA.id}/trainers`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(cyclicRes.status === 200, `Cyclic project hierarchy terminates safely and returns 200 OK (got: ${cyclicRes.status})`);
    const cyclicTrainers = await cyclicRes.json();
    assert(Array.isArray(cyclicTrainers), 'Returns valid array for cyclic hierarchy');

    // ─── TEST 2: Server-Side Trainer Eligibility Enforcement ───
    console.log('\n--- 2. Server-Side Trainer Eligibility Validation ---');
    const tomorrow = new Date(Date.now() + 86400000).toISOString();

    // 2a. Legacy scheduling on project without trainerId auto-binds to project's active trainer
    const autoBindRes = await fetch(`${BASE_URL}/api/trainings/schedule-meeting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Meeting Auto-Bound to Project Trainer',
        projectId: projectAlpha.id,
        scheduledAt: tomorrow,
        url: 'https://meet.google.com/abc-defg-hij'
      })
    });
    assert(autoBindRes.status === 201, `Scheduling without trainerId on single-trainer project auto-binds and returns 201 (got: ${autoBindRes.status})`);
    const autoBindData = await autoBindRes.json();
    assert(autoBindData.meeting && autoBindData.meeting.trainerId === trainerA.id, `Auto-bound trainerId matches Trainer Alpha (${autoBindData.meeting?.trainerId})`);

    // 2a-2. Passing non-existent trainerId -> 400
    const nonExistentTrainerRes = await fetch(`${BASE_URL}/api/trainings/schedule-meeting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Meeting With Non-existent Trainer',
        projectId: projectAlpha.id,
        trainerId: '00000000-0000-0000-0000-000000000000',
        scheduledAt: tomorrow,
        url: 'https://meet.google.com/abc-defg-hij'
      })
    });
    assert(nonExistentTrainerRes.status === 400, `Scheduling with non-existent trainer rejected with 400 (got: ${nonExistentTrainerRes.status})`);
    const nonExistentData = await nonExistentTrainerRes.json();
    assert(nonExistentData.error.includes('Assigned trainer user not found'), `Returns descriptive error: "${nonExistentData.error}"`);

    // 2b. Passing non-trainer user as trainerId -> 400
    const invalidRoleRes = await fetch(`${BASE_URL}/api/trainings/schedule-meeting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Meeting With Invalid Role',
        projectId: projectAlpha.id,
        trainerId: employeeUser.id,
        scheduledAt: tomorrow,
        url: 'https://meet.google.com/abc-defg-hij'
      })
    });
    assert(invalidRoleRes.status === 400, `Scheduling with non-trainer role rejected with 400 (got: ${invalidRoleRes.status})`);
    const invalidRoleData = await invalidRoleRes.json();
    assert(invalidRoleData.error.includes('does not have the Trainer role'), `Returns descriptive error: "${invalidRoleData.error}"`);

    // 2c. Passing Trainer B on Project Alpha (unassigned trainer) -> 400
    const unassignedTrainerRes = await fetch(`${BASE_URL}/api/trainings/schedule-meeting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Meeting With Unassigned Trainer',
        projectId: projectAlpha.id,
        trainerId: trainerB.id,
        scheduledAt: tomorrow,
        url: 'https://meet.google.com/abc-defg-hij'
      })
    });
    assert(unassignedTrainerRes.status === 400, `Scheduling with unassigned trainer rejected with 400 (got: ${unassignedTrainerRes.status})`);
    const unassignedData = await unassignedTrainerRes.json();
    assert(unassignedData.error.includes('not assigned to this project'), `Returns descriptive error: "${unassignedData.error}"`);

    // 2d. Subproject scheduling with inherited parent trainer -> 201 Created
    const subProjScheduleRes = await fetch(`${BASE_URL}/api/trainings/schedule-meeting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Subproject Session with Inherited Trainer',
        projectId: projectAlphaSub.id,
        trainerId: trainerA.id,
        scheduledAt: tomorrow,
        url: 'https://meet.google.com/sub-proj-meet'
      })
    });
    assert(subProjScheduleRes.status === 201, `Scheduling with inherited parent trainer on subproject returns 201 Created (got: ${subProjScheduleRes.status})`);
    const subProjScheduleData = await subProjScheduleRes.json();
    assert(subProjScheduleData.meeting && subProjScheduleData.meeting.trainerId === trainerA.id, 'Subproject meeting correctly persisted with inherited parent trainer');

    // 2e. Subproject scheduling with unrelated trainer -> 400 Bad Request
    const subProjUnassignedRes = await fetch(`${BASE_URL}/api/trainings/schedule-meeting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Subproject Session with Unrelated Trainer',
        projectId: projectAlphaSub.id,
        trainerId: trainerB.id,
        scheduledAt: tomorrow,
        url: 'https://meet.google.com/sub-proj-fail'
      })
    });
    assert(subProjUnassignedRes.status === 400, `Subproject with unrelated trainer rejected with 400 (got: ${subProjUnassignedRes.status})`);
    const subProjUnassignedData = await subProjUnassignedRes.json();
    assert(subProjUnassignedData.error.includes('not assigned to this project'), `Returns expected assignment rejection error: "${subProjUnassignedData.error}"`);

    // 2f. Multi-tier subproject scheduling with top parent trainer -> 201 Created
    const multiTierScheduleRes = await fetch(`${BASE_URL}/api/trainings/schedule-meeting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Multi-tier Store Session with Top Parent Trainer',
        projectId: projectAlphaSubSub.id,
        trainerId: trainerA.id,
        scheduledAt: tomorrow,
        url: 'https://meet.google.com/sub-sub-meet'
      })
    });
    assert(multiTierScheduleRes.status === 201, `Multi-tier subproject with top parent trainer returns 201 Created (got: ${multiTierScheduleRes.status})`);

    // 2g. Inactive trainer user rejected -> 400 Bad Request
    const inactiveTrainerRes = await fetch(`${BASE_URL}/api/trainings/schedule-meeting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Session With Inactive Trainer',
        projectId: projectAlpha.id,
        trainerId: trainerInactive.id,
        scheduledAt: tomorrow,
        url: 'https://meet.google.com/inactive-fail'
      })
    });
    assert(inactiveTrainerRes.status === 400, `Scheduling with inactive trainer rejected with 400 (got: ${inactiveTrainerRes.status})`);
    const inactiveTrainerData = await inactiveTrainerRes.json();
    assert(inactiveTrainerData.error.includes('is not Active'), `Returns expected inactive rejection error: "${inactiveTrainerData.error}"`);

    // 2h. User without Trainer role (Employee) rejected -> 400 Bad Request
    const nonTrainerRes = await fetch(`${BASE_URL}/api/trainings/schedule-meeting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Session With Non-Trainer User',
        projectId: projectAlpha.id,
        trainerId: employeeUser.id,
        scheduledAt: tomorrow,
        url: 'https://meet.google.com/non-trainer-fail'
      })
    });
    assert(nonTrainerRes.status === 400, `Scheduling with non-trainer user rejected with 400 (got: ${nonTrainerRes.status})`);
    const nonTrainerData = await nonTrainerRes.json();
    assert(nonTrainerData.error.includes('does not have the Trainer role'), `Returns expected non-trainer role rejection: "${nonTrainerData.error}"`);

    // 2i. Exact database verification of persisted Training record
    const TrainingModel = require('../models/Training');
    const persistedTraining = await TrainingModel.findOne({ where: { projectId: projectAlphaSubSub.id } });
    assert(persistedTraining !== null, 'Multi-tier subproject meeting exists in database');
    assert(persistedTraining.projectId === projectAlphaSubSub.id, `Training record preserves subproject ID (${persistedTraining.projectId})`);
    assert(persistedTraining.trainerId === trainerA.id, `Training record preserves parent trainer ID (${persistedTraining.trainerId})`);

    // ─── TEST 3: Successful Meeting Creation with Primary Trainer Assignment ───
    console.log('\n--- 3. Primary Trainer Persistence & Meeting Creation ---');
    const schedAtStr = new Date(Date.now() + 100000000).toISOString();
    const successRes = await fetch(`${BASE_URL}/api/trainings/schedule-meeting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Alpha Retail Masterclass',
        description: 'Advanced retail merchandising session',
        projectId: projectAlpha.id,
        trainerId: trainerA.id,
        scheduledAt: schedAtStr,
        url: 'https://meet.google.com/alp-haaa-cls',
        platform: 'google_meet'
      })
    });
    assert(successRes.status === 201, `Successful meeting creation returns 201 Created (got: ${successRes.status})`);
    const successData = await successRes.json();
    const meetingAlpha = successData.meeting;
    assert(meetingAlpha.trainerId === trainerA.id, `Persisted trainerId matches Trainer Alpha (${meetingAlpha.trainerId})`);
    assert(meetingAlpha.createdBy === adminUser.id, `Persisted createdBy matches Admin (${meetingAlpha.createdBy})`);
    assert(meetingAlpha.platform === 'google_meet', `Persisted platform is google_meet (${meetingAlpha.platform})`);
    assert(meetingAlpha.status === 'Scheduled', `Persisted status is Scheduled (${meetingAlpha.status})`);

    // ─── TEST 4: 60-Second Deduplication Guard ───
    console.log('\n--- 4. 60-Second Deduplication Guard ---');
    const duplicateRes = await fetch(`${BASE_URL}/api/trainings/schedule-meeting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Alpha Retail Masterclass',
        description: 'Advanced retail merchandising session',
        projectId: projectAlpha.id,
        trainerId: trainerA.id,
        scheduledAt: schedAtStr,
        url: 'https://meet.google.com/alp-haaa-cls',
        platform: 'google_meet'
      })
    });
    assert(duplicateRes.status === 409, `Duplicate submission within 60s rejected with 409 Conflict (got: ${duplicateRes.status})`);

    // ─── TEST 5: Trainer Self-Scheduling Workflow ───
    console.log('\n--- 5. Trainer Self-Scheduling Workflow ---');
    const trainerSchedAt = new Date(Date.now() + 150000000).toISOString();
    const trainerSelfRes = await fetch(`${BASE_URL}/api/trainings/schedule-meeting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${trainerAToken}` },
      body: JSON.stringify({
        title: 'Alpha Trainer Created Session',
        projectId: projectAlpha.id,
        scheduledAt: trainerSchedAt,
        url: 'https://meet.jit.si/Alpha-Trainer-Room',
        platform: 'jitsi'
      })
    });
    assert(trainerSelfRes.status === 201, `Trainer scheduling without trainerId returns 201 (got: ${trainerSelfRes.status})`);
    const trainerSelfData = await trainerSelfRes.json();
    assert(trainerSelfData.meeting.trainerId === trainerA.id, 'trainerId defaulted automatically to logged-in trainer');
    assert(trainerSelfData.meeting.createdBy === trainerA.id, 'createdBy is logged-in trainer');

    // ─── TEST 6: SAFEGUARD 5 — TRAINER VISIBILITY & ISOLATION ───
    console.log('\n--- 6. Safeguard 5: Trainer Visibility & Isolation ---');
    // Trainer A queries trainings:
    const trainerAGetRes = await fetch(`${BASE_URL}/api/trainings`, {
      headers: { Authorization: `Bearer ${trainerAToken}` }
    });
    assert(trainerAGetRes.status === 200, 'Trainer A GET /api/trainings returns 200 OK');
    const trainerAItems = await trainerAGetRes.json();
    assert(trainerAItems.some(i => i.id === meetingAlpha.id), 'Trainer A CAN see meeting assigned to Trainer A');

    // Trainer B queries trainings:
    const trainerBGetRes = await fetch(`${BASE_URL}/api/trainings`, {
      headers: { Authorization: `Bearer ${trainerBToken}` }
    });
    assert(trainerBGetRes.status === 200, 'Trainer B GET /api/trainings returns 200 OK');
    const trainerBItems = await trainerBGetRes.json();
    assert(!trainerBItems.some(i => i.id === meetingAlpha.id), 'SAFEGUARD 5 ENFORCED: Trainer B CANNOT see meeting assigned to Trainer A');

    // Create a meeting created by Trainer B, but assigned to Trainer A on Project Alpha
    // (e.g. Trainer B was temporarily assigned or co-admin, or Admin creates it)
    const crossCreatedMeeting = await Training.create({
      title: 'Cross-Created Session',
      type: 'Meeting',
      url: 'https://meet.google.com/crs-ssn-xyz',
      projectId: projectAlpha.id,
      scheduledAt: new Date(Date.now() + 200000000).toISOString(),
      trainerId: trainerA.id,
      createdBy: trainerB.id, // Created by Trainer B!
      platform: 'google_meet',
      status: 'Scheduled'
    });

    const trainerBAfterRes = await fetch(`${BASE_URL}/api/trainings`, {
      headers: { Authorization: `Bearer ${trainerBToken}` }
    });
    const trainerBAfterItems = await trainerBAfterRes.json();
    assert(!trainerBAfterItems.some(i => i.id === crossCreatedMeeting.id),
      'SAFEGUARD 5 ENFORCED: Trainer B CANNOT see meeting merely because they created it (assigned to Trainer A)');

    // ─── TEST 7: SAFEGUARD 4 — LEGACY RECORD PRESERVATION ───
    console.log('\n--- 7. Safeguard 4: Legacy Sessions & Historical Records ---');
    const legacyMeeting = await Training.create({
      title: 'Historical Legacy Session',
      type: 'Meeting',
      url: 'https://meet.google.com/leg-acy-ses',
      projectId: projectAlpha.id,
      scheduledAt: new Date(Date.now() + 250000000).toISOString(),
      trainerId: null, // Legacy: unpopulated
      createdBy: null  // Legacy: unpopulated
    });

    const trainerALegacyCheck = await fetch(`${BASE_URL}/api/trainings`, {
      headers: { Authorization: `Bearer ${trainerAToken}` }
    });
    const trainerALegacyItems = await trainerALegacyCheck.json();
    assert(trainerALegacyItems.some(i => i.id === legacyMeeting.id),
      'SAFEGUARD 4 ENFORCED: Legacy meeting with trainerId=null is preserved and visible to project trainers');

    // Non-meeting training material
    const nonMeetingDoc = await Training.create({
      title: 'Store Operations Guidebook',
      type: 'Document',
      url: '/uploads/operations-guide.pdf',
      projectId: projectAlpha.id,
      trainerId: null,
      createdBy: null
    });

    const trainerADocCheck = await fetch(`${BASE_URL}/api/trainings`, {
      headers: { Authorization: `Bearer ${trainerAToken}` }
    });
    const trainerADocItems = await trainerADocCheck.json();
    assert(trainerADocItems.some(i => i.id === nonMeetingDoc.id),
      'Non-meeting learning module remains visible to project trainers');

    // ─── TEST 8: Non-Trainer Role Access (Admin / PM) ───
    console.log('\n--- 8. Non-Trainer Role Visibility & Associations ---');
    const adminGetRes = await fetch(`${BASE_URL}/api/trainings`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminItems = await adminGetRes.json();
    const fetchedAlpha = adminItems.find(i => i.id === meetingAlpha.id);
    assert(!!fetchedAlpha, 'Admin sees all project meetings');
    assert(fetchedAlpha.Trainer && fetchedAlpha.Trainer.name === 'Trainer Alpha',
      `Meeting includes Trainer association (${fetchedAlpha.Trainer?.name})`);
    assert(fetchedAlpha.Creator && fetchedAlpha.Creator.name === 'Admin Tester',
      `Meeting includes Creator association (${fetchedAlpha.Creator?.name})`);

    // ─── TEST 9: Meeting Lifecycle Management (PUT /:id & DELETE /:id) ───
    console.log('\n--- 9. Meeting Lifecycle Management (Reschedule, Reassign, Cancel, Delete) ---');

    // 9a. Reschedule meeting
    const newScheduledTime = new Date(Date.now() + 300000000).toISOString();
    const rescheduleRes = await fetch(`${BASE_URL}/api/trainings/${meetingAlpha.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        scheduledAt: newScheduledTime
      })
    });
    assert(rescheduleRes.status === 200, `Reschedule PUT /:id returns 200 OK (got: ${rescheduleRes.status})`);
    const rescheduledData = await rescheduleRes.json();
    assert(rescheduledData.scheduledAt === newScheduledTime, 'scheduledAt timestamp updated accurately');

    // 9b. Reassign meeting to Trainer B on Project Beta
    const reassignRes = await fetch(`${BASE_URL}/api/trainings/${meetingAlpha.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        projectId: projectBeta.id,
        trainerId: trainerB.id
      })
    });
    assert(reassignRes.status === 200, `Reassign PUT /:id returns 200 OK (got: ${reassignRes.status})`);
    const reassignedData = await reassignRes.json();
    assert(reassignedData.trainerId === trainerB.id, 'trainerId reassigned to Trainer Beta');

    // Now verify Trainer B sees it and Trainer A does NOT!
    const trainerBRecheck = await fetch(`${BASE_URL}/api/trainings`, {
      headers: { Authorization: `Bearer ${trainerBToken}` }
    });
    const trainerBRecheckItems = await trainerBRecheck.json();
    assert(trainerBRecheckItems.some(i => i.id === meetingAlpha.id), 'Trainer B now sees reassigned meeting');

    const trainerARecheck = await fetch(`${BASE_URL}/api/trainings`, {
      headers: { Authorization: `Bearer ${trainerAToken}` }
    });
    const trainerARecheckItems = await trainerARecheck.json();
    assert(!trainerARecheckItems.some(i => i.id === meetingAlpha.id), 'Trainer A no longer sees reassigned meeting');

    // 9c. Cancel meeting
    const cancelRes = await fetch(`${BASE_URL}/api/trainings/${meetingAlpha.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        status: 'Cancelled'
      })
    });
    assert(cancelRes.status === 200, `Cancel PUT /:id returns 200 OK (got: ${cancelRes.status})`);
    const cancelledData = await cancelRes.json();
    assert(cancelledData.status === 'Cancelled', 'Status updated to Cancelled');

    // 9d. Delete meeting
    const deleteRes = await fetch(`${BASE_URL}/api/trainings/${meetingAlpha.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(deleteRes.status === 200, `DELETE /:id returns 200 OK (got: ${deleteRes.status})`);
    const deletedCheck = await Training.findByPk(meetingAlpha.id);
    assert(deletedCheck === null, 'Meeting successfully deleted from database');

    console.log('\n========================================================================');
    console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    server.close();
  }
}

runTestSuite();
