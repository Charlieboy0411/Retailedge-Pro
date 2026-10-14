// STAGE 3C REMEDIATION — GATE A AUTOMATED VERIFICATION SUITE
// Tests Secure Attendance Event Ingestion at POST /api/trainings/:id/jitsi-event
// Run: node tests/test_gate_a_secure_attendance.js

const axios = require('axios');
const sequelize = require('../config/database');
const JitsiAttendance = require('../models/JitsiAttendance');
const JitsiInterval = require('../models/JitsiInterval');
const Training = require('../models/Training');
const User = require('../models/User');

const BASE = process.env.API_BASE || 'http://localhost:5000/api';
const api = axios.create({ baseURL: BASE, validateStatus: () => true });

function auth(token) { return { headers: { Authorization: 'Bearer ' + token } }; }

let PASS = 0, FAIL = 0, SKIP = 0;

function result(label, condition, note) {
  note = note || '';
  if (condition === null) {
    console.log('  [SKIP] ' + label + (note ? ' -- ' + note : ''));
    SKIP++;
    return;
  }
  if (condition) {
    console.log('  OK  PASS  ' + label);
    PASS++;
  } else {
    console.log('  XX  FAIL  ' + label + (note ? ' -- ' + note : ''));
    FAIL++;
  }
}

async function login(email, password) {
  const r = await api.post('/auth/login', { email, password });
  return r.status === 200 ? r.data.token : null;
}

(async () => {
  console.log('================================================================');
  console.log('RETAILEDGE PRO — STAGE 3C GATE A: SECURE ATTENDANCE INGESTION');
  console.log('================================================================\n');

  // Baseline database snapshot
  const baselineAttCount = await JitsiAttendance.count();
  const baselineIntCount = await JitsiInterval.count();
  const baselineTrnCount = await Training.count();
  console.log(`Baseline DB state: Attendances=${baselineAttCount}, Intervals=${baselineIntCount}, Trainings=${baselineTrnCount}\n`);

  // 1. Authenticate test roles
  console.log('--- 1. Authenticating Roles ---');
  const tokens = {};
  const creds = [
    ['admin',      'admin@quizhive.com',      'password123'],
    ['pm',         'rubana@idonneous.com',    'password123'],
    ['supervisor', 'supervisor@quizhive.com', 'password123'],
    ['client',     'client@quizhive.com',     'password123'],
    ['employee',   'staff@quizhive.com',      'password123']
  ];

  for (const [role, email, pass] of creds) {
    const tok = await login(email, pass);
    tokens[role] = tok;
    result('Login as ' + role, tok !== null, tok ? '' : 'Failed login');
  }

  // Known Production Trainings
  // Galderma project: 71350b15-bbcf-4751-8960-821ece052612
  const galdermaTrainingId = 'db809017-5ea6-4333-9aac-9b7a401c6430';
  // Demo 1 project: b25600ee-a0a5-49d5-8978-46e9167beeb5
  const demo1TrainingId = 'b3e797f8-a20a-4f34-af17-e39fb5fbb239';
  // Security test project (Project Alpha): 2f47614d-d45c-4313-a433-725b1d27119a
  const projectAlphaId = '2f47614d-d45c-4313-a433-725b1d27119a';

  // 2. Unauthenticated request rejection
  console.log('\n--- 2. Unauthenticated Request Rejection ---');
  const rUnauth = await api.post(`/trainings/${galdermaTrainingId}/jitsi-event`, {
    event: 'join',
    participantName: 'Unauth Attacker',
    userId: '00000000-0000-0000-0000-000000000000'
  });
  result('Missing Authorization header rejected with 401', rUnauth.status === 401, `got ${rUnauth.status}`);
  result('401 response contains clean error message without internal leaks', 
    rUnauth.data && rUnauth.data.error && rUnauth.data.error.includes('Unauthorized'), 
    JSON.stringify(rUnauth.data)
  );

  // 3. Invalid token rejection
  console.log('\n--- 3. Invalid Token Rejection ---');
  const rBadToken = await api.post(`/trainings/${galdermaTrainingId}/jitsi-event`, {
    event: 'join'
  }, auth('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.badtoken'));
  result('Invalid / forged token rejected with 401', rBadToken.status === 401, `got ${rBadToken.status}`);

  // 4. Invalid event type rejection
  console.log('\n--- 4. Invalid Event Type Rejection ---');
  const rBadEvent = await api.post(`/trainings/${galdermaTrainingId}/jitsi-event`, {
    event: 'malicious_event'
  }, auth(tokens.admin));
  result('Invalid telemetry event rejected with 400', rBadEvent.status === 400, `got ${rBadEvent.status}`);
  result('400 response specifies supported event types', 
    rBadEvent.data && rBadEvent.data.error && rBadEvent.data.error.includes('join, leave, heartbeat'), 
    JSON.stringify(rBadEvent.data)
  );

  // 5. Non-existent training rejection
  console.log('\n--- 5. Non-existent Training Rejection ---');
  const rBadTraining = await api.post(`/trainings/00000000-0000-0000-0000-000000000000/jitsi-event`, {
    event: 'join'
  }, auth(tokens.admin));
  result('Non-existent training rejected with 404', rBadTraining.status === 404, `got ${rBadTraining.status}`);

  // 6. Cross-project access denial (Participants & Observers)
  console.log('\n--- 6. Cross-Project Access Denial ---');
  // Employee in Project Alpha -> Galderma Training
  const rEmpCross = await api.post(`/trainings/${galdermaTrainingId}/jitsi-event`, {
    event: 'join'
  }, auth(tokens.employee));
  result('Cross-project Employee rejected with 403', rEmpCross.status === 403, `got ${rEmpCross.status}`);
  result('403 indicates permission denial for training', 
    rEmpCross.data && rEmpCross.data.error && rEmpCross.data.error.includes('permission for this training session'), 
    JSON.stringify(rEmpCross.data)
  );

  // Supervisor in Project Alpha -> Galderma Training
  const rSupCross = await api.post(`/trainings/${galdermaTrainingId}/jitsi-event`, {
    event: 'join'
  }, auth(tokens.supervisor));
  result('Cross-project Supervisor observer rejected with 403', rSupCross.status === 403, `got ${rSupCross.status}`);

  // Client in Project Alpha -> Galderma Training
  const rCliCross = await api.post(`/trainings/${galdermaTrainingId}/jitsi-event`, {
    event: 'join'
  }, auth(tokens.client));
  result('Cross-project Client observer rejected with 403', rCliCross.status === 403, `got ${rCliCross.status}`);

  // PM in Galderma -> Demo 1 Training
  const rPmCross = await api.post(`/trainings/${demo1TrainingId}/jitsi-event`, {
    event: 'join'
  }, auth(tokens.pm));
  result('Cross-project PM rejected with 403', rPmCross.status === 403, `got ${rPmCross.status}`);

  // 7. Identity impersonation prevention
  console.log('\n--- 7. Identity Impersonation Prevention ---');
  // Employee tries to submit attendance for PM (Rubana)
  const rubanaUser = await User.findOne({ where: { email: 'rubana@idonneous.com' } });
  const rImpersonate = await api.post(`/trainings/${galdermaTrainingId}/jitsi-event`, {
    event: 'join',
    userId: rubanaUser.id
  }, auth(tokens.employee));
  result('Forged userId payload rejected with 403', rImpersonate.status === 403, `got ${rImpersonate.status}`);
  result('403 indicates identity impersonation prohibited',
    rImpersonate.data && rImpersonate.data.error && rImpersonate.data.error.includes('cannot submit attendance telemetry for another user'),
    JSON.stringify(rImpersonate.data)
  );

  // 8. Authorized Observer Mode Validation (Non-authoritative presence)
  console.log('\n--- 8. Authorized Observer Mode Validation ---');
  // Create a non-production test fixture training in Project Alpha
  const fixtureTraining = await Training.create({
    title: '[NON-PROD TEST FIXTURE] Gate A Jitsi Attendance Session',
    description: 'Automated security test fixture for Stage 3C Gate A',
    type: 'Meeting',
    url: 'https://meet.jit.si/quizhive-gate-a-test-session',
    duration: '60 mins',
    projectId: projectAlphaId
  });

  const countBeforeObserver = await JitsiAttendance.count({ where: { trainingId: fixtureTraining.id } });

  // Authorized Supervisor joins session
  const rSupObserver = await api.post(`/trainings/${fixtureTraining.id}/jitsi-event`, {
    event: 'join'
  }, auth(tokens.supervisor));
  result('Authorized Supervisor treated as observer (200 OK)', rSupObserver.status === 200, `got ${rSupObserver.status}`);
  result('Supervisor observer response flag is true', rSupObserver.data && rSupObserver.data.observer === true, JSON.stringify(rSupObserver.data));
  result('Supervisor attendance percentage is null or 0', rSupObserver.data && (rSupObserver.data.attendancePercentage === 0 || rSupObserver.data.attendancePercentage === null), JSON.stringify(rSupObserver.data));

  // Authorized Client joins session
  const rCliObserver = await api.post(`/trainings/${fixtureTraining.id}/jitsi-event`, {
    event: 'join'
  }, auth(tokens.client));
  result('Authorized Client treated as observer (200 OK)', rCliObserver.status === 200, `got ${rCliObserver.status}`);
  result('Client observer response flag is true', rCliObserver.data && rCliObserver.data.observer === true, JSON.stringify(rCliObserver.data));
  result('Client attendance percentage is null or 0', rCliObserver.data && (rCliObserver.data.attendancePercentage === 0 || rCliObserver.data.attendancePercentage === null), JSON.stringify(rCliObserver.data));

  const countAfterObserver = await JitsiAttendance.count({ where: { trainingId: fixtureTraining.id } });
  result('Observer presence caused exactly 0 attendance records created', countBeforeObserver === 0 && countAfterObserver === 0, `before: ${countBeforeObserver}, after: ${countAfterObserver}`);

  // 9. Authorized Participant Attendance Flow & Idempotency Verification
  console.log('\n--- 9. Authorized Attendance Flow & Idempotency ---');
  // Employee is assigned to Project Alpha -> Authorized participant
  const empUser = await User.findOne({ where: { email: 'staff@quizhive.com' } });

  // First Join
  const empJoin1 = await api.post(`/trainings/${fixtureTraining.id}/jitsi-event`, {
    event: 'join',
    jitsiParticipantId: 'jp-test-emp-01',
    scheduledDurationMinutes: 60
  }, auth(tokens.employee));

  result('Authorized participant join -> 200 OK', empJoin1.status === 200, `got ${empJoin1.status}`);
  result('Attendance record created with status=Online and authoritative userId', 
    empJoin1.data && empJoin1.data.attendance && empJoin1.data.attendance.status === 'Online' && empJoin1.data.attendance.userId === empUser.id,
    JSON.stringify(empJoin1.data && empJoin1.data.attendance)
  );

  const attRecordId = empJoin1.data && empJoin1.data.attendance && empJoin1.data.attendance.id;

  // Verify exactly 1 open interval created
  let intervals = await JitsiInterval.findAll({ where: { jitsiAttendanceId: attRecordId } });
  result('Single open interval created on first join', intervals.length === 1 && intervals[0].leftAt === null, `intervals: ${intervals.length}`);

  // Duplicate / Replayed Join Event (Idempotency Guard)
  const empJoinDuplicate = await api.post(`/trainings/${fixtureTraining.id}/jitsi-event`, {
    event: 'join',
    jitsiParticipantId: 'jp-test-emp-01'
  }, auth(tokens.employee));

  result('Duplicate join -> 200 OK (idempotent)', empJoinDuplicate.status === 200, `got ${empJoinDuplicate.status}`);
  result('Duplicate join response acknowledges idempotent join',
    empJoinDuplicate.data && empJoinDuplicate.data.message && empJoinDuplicate.data.message.includes('Already joined (idempotent)'),
    JSON.stringify(empJoinDuplicate.data)
  );

  intervals = await JitsiInterval.findAll({ where: { jitsiAttendanceId: attRecordId } });
  result('Duplicate join did NOT create duplicate open interval (no interval inflation)', intervals.length === 1 && intervals[0].leftAt === null, `intervals: ${intervals.length}`);

  // Heartbeat Event
  const empHeartbeat = await api.post(`/trainings/${fixtureTraining.id}/jitsi-event`, {
    event: 'heartbeat',
    jitsiParticipantId: 'jp-test-emp-01'
  }, auth(tokens.employee));

  result('Heartbeat -> 200 OK', empHeartbeat.status === 200, `got ${empHeartbeat.status}`);
  intervals = await JitsiInterval.findAll({ where: { jitsiAttendanceId: attRecordId } });
  result('Heartbeat maintained single active interval without creating new intervals', intervals.length === 1, `intervals: ${intervals.length}`);

  // Leave Event
  const empLeave = await api.post(`/trainings/${fixtureTraining.id}/jitsi-event`, {
    event: 'leave',
    jitsiParticipantId: 'jp-test-emp-01'
  }, auth(tokens.employee));

  result('Leave -> 200 OK', empLeave.status === 200, `got ${empLeave.status}`);
  intervals = await JitsiInterval.findAll({ where: { jitsiAttendanceId: attRecordId } });
  result('Open interval closed with leftAt timestamp', intervals.length === 1 && intervals[0].leftAt !== null, `leftAt: ${intervals[0] && intervals[0].leftAt}`);

  // Duplicate Leave Event (Idempotency Guard)
  const empLeaveDuplicate = await api.post(`/trainings/${fixtureTraining.id}/jitsi-event`, {
    event: 'leave',
    jitsiParticipantId: 'jp-test-emp-01'
  }, auth(tokens.employee));

  result('Duplicate leave -> 200 OK (idempotent no-op)', empLeaveDuplicate.status === 200, `got ${empLeaveDuplicate.status}`);
  intervals = await JitsiInterval.findAll({ where: { jitsiAttendanceId: attRecordId } });
  result('Duplicate leave did not modify interval structure or create corrupt records', intervals.length === 1, `intervals: ${intervals.length}`);

  // 10. Strict Test Cleanup (Ensure 0 production footprint)
  console.log('\n--- 10. Cleanup Test Telemetry Records & Non-Prod Fixtures ---');
  if (attRecordId) {
    await JitsiInterval.destroy({ where: { jitsiAttendanceId: attRecordId } });
    await JitsiAttendance.destroy({ where: { id: attRecordId } });
  }
  if (fixtureTraining && fixtureTraining.id) {
    await Training.destroy({ where: { id: fixtureTraining.id } });
  }

  const finalAttCount = await JitsiAttendance.count();
  const finalIntCount = await JitsiInterval.count();
  const finalTrnCount = await Training.count();

  result('Net production JitsiAttendance records changed = 0', finalAttCount === baselineAttCount, `current: ${finalAttCount}, baseline: ${baselineAttCount}`);
  result('Net production JitsiInterval records changed = 0', finalIntCount === baselineIntCount, `current: ${finalIntCount}, baseline: ${baselineIntCount}`);
  result('Net production Training records changed = 0', finalTrnCount === baselineTrnCount, `current: ${finalTrnCount}, baseline: ${baselineTrnCount}`);

  // Results Summary
  console.log('\n================================================================');
  console.log('=== STAGE 3C GATE A TEST SUMMARY ===');
  console.log(`TOTAL CHECKS: ${PASS + FAIL + SKIP} | PASS: ${PASS} | FAIL: ${FAIL} | SKIP: ${SKIP}`);
  console.log('================================================================\n');

  if (FAIL === 0) {
    console.log('>>> ALL GATE A CHECKS PASSED CONGRUENTLY. <<<');
  } else {
    console.log(`>>> ${FAIL} CHECK(S) FAILED. <<<`);
  }

  process.exit(FAIL > 0 ? 1 : 0);
})();
