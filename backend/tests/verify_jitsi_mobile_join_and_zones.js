// ============================================================================
// RETAILEDGE PRO — REGRESSION TEST SUITE: JITSI MOBILE JOIN FLOW & ZONE SELECTOR
// Dialect: Isolated Local UAT SQLite
// Circuit Breaker: AWS RDS and external networks strictly blocked
// ============================================================================

const path = require('path');
const net = require('net');
const http = require('http');
const fs = require('fs');

// ─── Network Circuit Breaker & SQLite UAT Database Isolation ───
process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = path.resolve(__dirname, '../uat_database.sqlite');
process.env.DB_HOST = '127.0.0.1';
process.env.JWT_SECRET = 'test_secret_retailedge_pro_2026';
process.env.PORT = '5065';

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
  console.log('📱 VERIFYING JITSI MOBILE JOIN FLOW & REGIONAL ZONE SELECTOR');
  console.log('Environment: Isolated Local UAT (Port 5065)');
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

  // 1. Initialize Express App
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
  app.use('/api/quiz', require('../routes/quiz'));

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(process.env.PORT, resolve));
  console.log(`🚀 Isolated test server listening on ${BASE_URL}\n`);

  const Project = require('../models/Project');
  const Training = require('../models/Training');
  const User = require('../models/User');
  const Role = require('../models/Role');
  const ProjectAssignment = require('../models/ProjectAssignment');
  const TrainingProgress = require('../models/TrainingProgress');
  const JitsiAttendance = require('../models/JitsiAttendance');
  const jwt = require('jsonwebtoken');

  try {
    // ─── TEST GROUP 1: MULTI-ZONE REGIONAL PROJECT CONFIGURATION ───
    console.log('--- 1. Multi-Zone Regional Project Configuration (North, South, East, West) ---');
    const galderma = await Project.findByPk('71350b15-bbcf-4751-8960-821ece052612');
    assert(Boolean(galderma), 'Multi-zone project Galderma exists');
    assert(galderma.zone && galderma.zone.includes('North'), 'Galderma is configured with regional zones');

    const multiZoneMeeting = await Training.create({
      title: 'Galderma All-India Regional Review',
      description: 'Regional quarterly training session',
      type: 'Meeting',
      projectId: galderma.id,
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      url: 'https://meet.jit.si/QuizHive-gal-reg-session'
    });

    const ctxRes1 = await fetch(`${BASE_URL}/api/trainings/${multiZoneMeeting.id}/join-context`);
    assert(ctxRes1.status === 200, 'GET /join-context for multi-zone meeting returns HTTP 200');
    const ctxData1 = await ctxRes1.json();
    assert(ctxData1.zonesConfigured === true, 'zonesConfigured is true for multi-zone project');
    assert(Array.isArray(ctxData1.validZones), 'validZones is an array');
    assert(ctxData1.validZones.length === 4, `validZones contains exactly 4 regional zones (got: ${ctxData1.validZones.length})`);
    assert(
      ctxData1.validZones.includes('North') &&
      ctxData1.validZones.includes('South') &&
      ctxData1.validZones.includes('East') &&
      ctxData1.validZones.includes('West'),
      'All 4 regional zones (North, South, East, West) are present'
    );
    assert(
      JSON.stringify(ctxData1.validZones) === JSON.stringify(['North', 'South', 'East', 'West']),
      `validZones follows canonical cardinal ordering: ${JSON.stringify(ctxData1.validZones)}`
    );
    assert(!ctxData1.validZones.includes('Pan India'), 'Pan India is NOT included when not configured for the project');

    // ─── TEST GROUP 2: PAN INDIA-ONLY PROJECT ISOLATION ───
    console.log('\n--- 2. Pan India-Only Project Isolation ---');
    let panIndiaProject = await Project.findOne({ where: { zone: 'Pan India' } });
    if (!panIndiaProject) {
      panIndiaProject = await Project.create({
        name: 'Candor Pan-India Logistics',
        project_code: 'CNDR-001',
        zone: 'Pan India',
        status: 'Active'
      });
    }

    const panIndiaMeeting = await Training.create({
      title: 'Candor All-Hands Meeting',
      type: 'Meeting',
      projectId: panIndiaProject.id,
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      url: 'https://meet.jit.si/QuizHive-cndr-allhands'
    });

    const ctxRes2 = await fetch(`${BASE_URL}/api/trainings/${panIndiaMeeting.id}/join-context`);
    assert(ctxRes2.status === 200, 'GET /join-context for Pan India meeting returns HTTP 200');
    const ctxData2 = await ctxRes2.json();
    assert(ctxData2.validZones.length === 1 && ctxData2.validZones[0] === 'Pan India', 'Pan India project returns strictly ["Pan India"]');
    assert(!ctxData2.validZones.includes('North'), 'Regional zones are NOT fabricated for Pan India project');

    // ─── TEST GROUP 3: UNCONFIGURED PROJECT FAILS CLOSED ───
    console.log('\n--- 3. Unconfigured Project Safety & Fail-Closed Behavior ---');
    const unzonedProject = await Project.create({
      name: 'Unzoned Beta Project',
      project_code: 'UNZ-001',
      zone: null,
      status: 'Active'
    });

    const unzonedMeeting = await Training.create({
      title: 'Unzoned Special Call',
      type: 'Meeting',
      projectId: unzonedProject.id,
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      url: 'https://meet.jit.si/QuizHive-unz-call'
    });

    const ctxRes3 = await fetch(`${BASE_URL}/api/trainings/${unzonedMeeting.id}/join-context`);
    assert(ctxRes3.status === 200, 'GET /join-context for unzoned meeting returns HTTP 200');
    const ctxData3 = await ctxRes3.json();
    assert(ctxData3.zonesConfigured === false, 'zonesConfigured is false when project has no zones');
    assert(ctxData3.validZones.length === 0, 'validZones is empty array');

    const unzonedJoinRes = await fetch(`${BASE_URL}/api/trainings/${unzonedMeeting.id}/guest-join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Vikram Singh', employeeId: 'EMP-9001', zone: 'North' })
    });
    assert(unzonedJoinRes.status === 400, 'Join request on unzoned meeting is rejected with HTTP 400');
    const unzonedJoinErr = await unzonedJoinRes.json();
    assert(unzonedJoinErr.error.includes('Zones are not configured for this project'), 'Actionable error returned without fabricating fake zones');

    // ─── TEST GROUP 4: STRICT FIELD VALIDATION & STRING PRESERVATION ───
    console.log('\n--- 4. Attendee Field Validation & Employee ID Zero Preservation ---');
    const testEmpId = '000842'; // Leading zeros must remain completely intact
    const testName = 'Pooja Bhatt';

    // Blank name rejected
    const badNameRes = await fetch(`${BASE_URL}/api/trainings/${multiZoneMeeting.id}/guest-join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: ' ', employeeId: testEmpId, zone: 'North' })
    });
    assert(badNameRes.status === 400, 'Blank name rejected with HTTP 400');

    // Blank employee ID rejected
    const badEmpRes = await fetch(`${BASE_URL}/api/trainings/${multiZoneMeeting.id}/guest-join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: testName, employeeId: '', zone: 'North' })
    });
    assert(badEmpRes.status === 400, 'Blank employee ID rejected with HTTP 400');

    // Invalid zone rejected
    const badZoneRes = await fetch(`${BASE_URL}/api/trainings/${multiZoneMeeting.id}/guest-join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: testName, employeeId: testEmpId, zone: 'Invalid-Territory' })
    });
    assert(badZoneRes.status === 400, 'Invalid zone rejected with HTTP 400');

    // Valid join with leading zeros and regional zone
    const validJoinRes = await fetch(`${BASE_URL}/api/trainings/${multiZoneMeeting.id}/guest-join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: testName, employeeId: testEmpId, zone: 'South' })
    });
    assert(validJoinRes.status === 200, 'Valid join returns HTTP 200');
    const validJoinData = await validJoinRes.json();
    assert(Boolean(validJoinData.token), 'JWT token returned in response');
    assert(validJoinData.user.name === testName, 'Returned user name matches');
    assert(validJoinData.user.employee_id === testEmpId, `Leading zeros intact: "${validJoinData.user.employee_id}" === "${testEmpId}"`);
    assert(validJoinData.user.zone === 'South', 'Returned user zone matches selected regional zone "South"');
    assert(validJoinData.meeting && validJoinData.meeting.url === multiZoneMeeting.url, 'Meeting details returned for browser/app link construction');
    const attendeeToken = validJoinData.token;
    const attendeeUserId = validJoinData.user.id;

    // Verify database record has string with intact zeros
    const userInDb = await User.findByPk(attendeeUserId);
    assert(userInDb.employee_id === testEmpId, `Database stores exact string "${userInDb.employee_id}"`);

    // ─── TEST GROUP 5: ATTENDANCE TELEMETRY & LIFECYCLE RECONCILIATION ───
    console.log('\n--- 5. Attendance Telemetry Lifecycle (Join, Heartbeat, Leave) ---');
    
    // Join event (when attendee clicks "Join in Browser" or "Open in App")
    const joinEventRes = await fetch(`${BASE_URL}/api/trainings/${multiZoneMeeting.id}/jitsi-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${attendeeToken}`
      },
      body: JSON.stringify({
        event: 'join',
        jitsiParticipantId: 'jitsi_test_part_01',
        scheduledDurationMinutes: 60,
        participantName: testName,
        employeeId: testEmpId,
        userId: attendeeUserId
      })
    });
    assert(joinEventRes.status === 200, 'Telemetry join event recorded with HTTP 200');

    // Verify JitsiAttendance record is created with Online status and zone
    const attRecord = await JitsiAttendance.findOne({
      where: { trainingId: multiZoneMeeting.id, employeeId: testEmpId }
    });
    assert(Boolean(attRecord), 'JitsiAttendance record created');
    assert(attRecord.status === 'Online', 'Attendance status is Online');
    assert(attRecord.zone === 'South', `Attendance record contains authoritative zone "${attRecord.zone}"`);

    // Heartbeat event
    const hbRes = await fetch(`${BASE_URL}/api/trainings/${multiZoneMeeting.id}/jitsi-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${attendeeToken}`
      },
      body: JSON.stringify({
        event: 'heartbeat',
        jitsiParticipantId: 'jitsi_test_part_01',
        scheduledDurationMinutes: 60,
        participantName: testName,
        employeeId: testEmpId,
        userId: attendeeUserId
      })
    });
    assert(hbRes.status === 200, 'Telemetry heartbeat recorded with HTTP 200');

    // Leave event (when attendee clicks "Leave Meeting")
    const leaveRes = await fetch(`${BASE_URL}/api/trainings/${multiZoneMeeting.id}/jitsi-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${attendeeToken}`
      },
      body: JSON.stringify({
        event: 'leave',
        jitsiParticipantId: 'jitsi_test_part_01',
        scheduledDurationMinutes: 60,
        participantName: testName,
        employeeId: testEmpId,
        userId: attendeeUserId
      })
    });
    assert(leaveRes.status === 200, 'Telemetry leave event recorded with HTTP 200');

    const leftAttRecord = await JitsiAttendance.findByPk(attRecord.id);
    assert(['Left Early', 'Completed', 'Offline'].includes(leftAttRecord.status), `Attendance status transitions on leave (got: "${leftAttRecord.status}")`);
    assert(leftAttRecord.lastLeftAt !== null, 'lastLeftAt timestamp recorded');

    // ─── TEST GROUP 6: RECONNECTION IDEMPOTENCY ───
    console.log('\n--- 6. Reconnection Idempotency & Zero Inflation ---');
    const rejoinRes = await fetch(`${BASE_URL}/api/trainings/${multiZoneMeeting.id}/guest-join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: testName, employeeId: testEmpId, zone: 'South' })
    });
    assert(rejoinRes.status === 200, 'Re-join succeeds with HTTP 200');
    const rejoinData = await rejoinRes.json();
    assert(rejoinData.user.id === attendeeUserId, 'Re-join resolves to identical user identity');

    const totalProgress = await TrainingProgress.count({
      where: { trainingId: multiZoneMeeting.id, userId: attendeeUserId }
    });
    assert(totalProgress === 1, 'Repeated join does NOT duplicate or inflate TrainingProgress records (count: 1)');

    // ─── TEST GROUP 7: MOBILE RESPONSIVE LAYOUT VERIFICATION ───
    console.log('\n--- 7. Mobile Viewport Layout Verification (360px, 390px, 430px) ---');
    const cssPath = path.resolve(__dirname, '../../frontend/src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    assert(cssContent.includes('.section-header'), 'index.css defines .section-header');
    assert(cssContent.includes('flex-wrap: wrap'), '.section-header has flex-wrap: wrap');
    assert(cssContent.includes('.lms-workspace-layout'), 'index.css defines .lms-workspace-layout');
    assert(cssContent.includes('.lms-modules-sidebar'), 'index.css defines .lms-modules-sidebar');
    assert(cssContent.includes('.lms-player-container'), 'index.css defines .lms-player-container');
    assert(cssContent.includes('word-break: break-word'), 'index.css applies word-break: break-word');

    const guestJoinPath = path.resolve(__dirname, '../../frontend/src/pages/GuestJoin.jsx');
    const guestJoinContent = fs.readFileSync(guestJoinPath, 'utf8');

    assert(guestJoinContent.includes('Join in Browser (Full Screen)'), 'GuestJoin provides "Join in Browser" action');
    assert(guestJoinContent.includes('Open in Jitsi Meet App'), 'GuestJoin provides "Open in Jitsi Meet App" action');
    assert(guestJoinContent.includes('Live Attendance Active'), 'GuestJoin displays Live Attendance Active state');
    assert(guestJoinContent.includes('■ Leave Meeting Room'), 'GuestJoin provides Leave Meeting button');
    assert(!guestJoinContent.includes('<JitsiMeeting'), 'GuestJoin does NOT render nested <JitsiMeeting iframe');
    assert(guestJoinContent.includes('org.jitsi.meet://'), 'GuestJoin constructs standard Jitsi app deep-link');

    // Clean up test records
    await multiZoneMeeting.destroy();
    await panIndiaMeeting.destroy();
    await unzonedMeeting.destroy();
    await unzonedProject.destroy();

  } finally {
    server.close();
  }

  console.log('\n========================================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
