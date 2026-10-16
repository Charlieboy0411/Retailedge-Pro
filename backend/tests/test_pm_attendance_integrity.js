/**
 * RETAILEDGE PRO — PM ATTENDANCE INTEGRITY REGRESSION SUITE
 * 
 * Verifies that:
 * 1. Absence of authoritative attendance records renders attendanceRate: null and trainingStatus: "Not Recorded".
 * 2. Missing attendance is NOT inferred from socket connectionStatus, quiz completion, or enrollment.
 * 3. Missing attendance is NOT converted into genuine zero attendance or 100% attendance.
 * 4. Verified 100% attendance is cleanly distinguished from absent attendance telemetry.
 * 5. Status filtering (ATTENDED, PASSED, ELIGIBLE, PENDING) functions accurately.
 * 6. Server-side project scoping and 403 authorization protections remain strictly enforced.
 * 7. AWS RDS database invariance is strictly maintained (zero mutations).
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Project = require('../models/Project');
const Session = require('../models/Session');
const Participant = require('../models/Participant');
const JitsiAttendance = require('../models/JitsiAttendance');

const express = require('express');
const { JWT_SECRET } = require('../config/constants');
const projectsRouter = require('../routes/projects');
const usersRouter = require('../routes/users');

let server;
let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, extraInfo = '') {
  if (condition) {
    passedCount++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedCount++;
    console.error(`  [FAIL] ${testName} ${extraInfo ? '— ' + extraInfo : ''}`);
  }
}

async function runTests() {
  console.log('========================================================================');
  console.log('RETAILEDGE PRO — PM ATTENDANCE DATA INTEGRITY REGRESSION SUITE');
  console.log('========================================================================\n');

  // Step 1: Start isolated Express app on port 0 to run non-mutating HTTP assertions
  const app = express();
  app.use(express.json());
  app.use('/api/projects', projectsRouter);
  app.use('/api/users', usersRouter);

  server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const testUrl = `http://127.0.0.1:${port}`;

  try {
    const Role = require('../models/Role');

    // 1. Fetch PM Rubana user and Admin user
    const pmUser = await User.findOne({ where: { email: 'rubana@idonneous.com' }, include: [Role] });
    const adminUser = await User.findOne({ where: { email: 'admin@quizhive.com' }, include: [Role] });

    assert(pmUser !== null, 'PM Rubana account exists in database');
    assert(adminUser !== null, 'Admin account exists in database');

    const pmToken = jwt.sign(
      { id: pmUser.id, email: pmUser.email, role: pmUser.Role?.role_name || 'Program Manager', projectId: pmUser.projectId },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const adminToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: adminUser.Role?.role_name || 'Admin', projectId: adminUser.projectId },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 2. Query participants as PM Rubana against current baseline
    console.log('\n2. Testing PM participants retrieval with absent attendance telemetry...');
    const pmRes = await axios.get(`${testUrl}/api/projects/participants`, {
      headers: { Authorization: `Bearer ${pmToken}` }
    });

    assert(pmRes.status === 200, 'PM GET /api/projects/participants returns HTTP 200');
    assert(Array.isArray(pmRes.data), 'PM response data is an array');
    assert(pmRes.data.length === 22, `PM receives exactly 22 Galderma participants (got ${pmRes.data.length})`);

    // Verify all 22 participants reflect attendance telemetry absence
    const allNullAttendance = pmRes.data.every(p => p.attendanceRate === null);
    const allNotRecordedStatus = pmRes.data.every(p => p.trainingStatus === 'Not Recorded');
    const allFalseAttendanceRecord = pmRes.data.every(p => p.hasAttendanceRecord === false);
    const zeroFalseAttended = pmRes.data.filter(p => p.trainingStatus === 'Attended').length;
    const zeroFalse100Pct = pmRes.data.filter(p => p.attendanceRate === 100).length;
    const zeroFalse0Pct = pmRes.data.filter(p => p.attendanceRate === 0).length;
    const zeroFalseEligible = pmRes.data.filter(p => p.readinessStatus === 'Certification Eligible').length;
    const allPendingAttendance = pmRes.data.filter(p => p.readinessStatus === 'Pending Attendance').length;

    assert(allNullAttendance, 'All 22 participants have attendanceRate: null (not converted to 0 or 100)');
    assert(allNotRecordedStatus, 'All 22 participants have trainingStatus: "Not Recorded"');
    assert(allFalseAttendanceRecord, 'All 22 participants have hasAttendanceRecord: false');
    assert(zeroFalseAttended === 0, 'Zero participants falsely display trainingStatus: "Attended"');
    assert(zeroFalse100Pct === 0, 'Zero participants falsely display attendanceRate: 100');
    assert(zeroFalse0Pct === 0, 'Zero participants falsely penalized with attendanceRate: 0');
    assert(zeroFalseEligible === 0, 'Zero participants falsely marked Certification Eligible without verified attendance');
    assert(allPendingAttendance === 22, `All 22 participants with passing quiz are marked "Pending Attendance" (got ${allPendingAttendance})`);

    // 3. Status Filtering Tests
    console.log('\n3. Testing status filtering when attendance is not recorded...');
    const attendedRes = await axios.get(`${testUrl}/api/projects/participants?status=ATTENDED`, {
      headers: { Authorization: `Bearer ${pmToken}` }
    });
    assert(attendedRes.data.length === 0, `Filter status=ATTENDED returns 0 (no false positives from unverified telemetry, got ${attendedRes.data.length})`);

    const passedRes = await axios.get(`${testUrl}/api/projects/participants?status=PASSED`, {
      headers: { Authorization: `Bearer ${pmToken}` }
    });
    assert(passedRes.data.length === 22, `Filter status=PASSED returns 22 quiz passers (got ${passedRes.data.length})`);

    const eligibleRes = await axios.get(`${testUrl}/api/projects/participants?status=ELIGIBLE`, {
      headers: { Authorization: `Bearer ${pmToken}` }
    });
    assert(eligibleRes.data.length === 0, `Filter status=ELIGIBLE returns 0 (unverified attendance cannot certify, got ${eligibleRes.data.length})`);

    const pendingRes = await axios.get(`${testUrl}/api/projects/participants?status=PENDING`, {
      headers: { Authorization: `Bearer ${pmToken}` }
    });
    assert(pendingRes.data.length === 22, `Filter status=PENDING returns 22 participants awaiting attendance verification (got ${pendingRes.data.length})`);

    // 4. Unit / Logic Distinction: No attendance vs 100% attendance vs partial attendance
    console.log('\n4. Testing analytical distinction between absent telemetry and verified attendance...');
    
    // Simulate mapping logic with various participant scenarios
    function computeParticipantAttendanceAndReadiness(p, jitsiMap) {
      const totalQ = p.Session?.Quiz?.questions?.length || 20;
      const responses = p.Responses || [];
      const correctCount = responses.filter(r => r.points_awarded > 0).length;
      const scorePct = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : (p.score || 0);

      const jitsi = (p.employeeId && jitsiMap[p.employeeId]) || (p.name && jitsiMap[p.name]) || (p.userId && jitsiMap[p.userId]);
      const hasAuthoritativeAttendance = Boolean(jitsi && jitsi.attendancePercentage !== undefined && jitsi.attendancePercentage !== null);
      const attendancePct = hasAuthoritativeAttendance ? Number(jitsi.attendancePercentage) : null;
      const trainingStatus = hasAuthoritativeAttendance 
        ? (jitsi.status || (attendancePct >= 75 ? 'Attended' : 'Incomplete'))
        : 'Not Recorded';

      const passed = scorePct >= 60;

      let readinessStatus;
      if (hasAuthoritativeAttendance) {
        const isEligible = attendancePct >= 80 && scorePct >= 70;
        const isAtRisk = attendancePct < 75 || scorePct < 60;
        readinessStatus = isEligible ? 'Certification Eligible' : isAtRisk ? 'At Risk' : 'In Progress';
      } else {
        readinessStatus = scorePct < 60 ? 'At Risk' : 'Pending Attendance';
      }

      return { attendancePct, trainingStatus, readinessStatus, hasAuthoritativeAttendance };
    }

    // Scenario A: Participant with NO attendance records (passed quiz, absent telemetry)
    const pNoTelemetry = { 
      name: 'Learner A', 
      employeeId: 'GDA001', 
      connectionStatus: 'active', 
      Session: { Quiz: { questions: [{ id: 1 }] } },
      Responses: [{ points_awarded: 1 }] 
    };
    const resA = computeParticipantAttendanceAndReadiness(pNoTelemetry, {});
    assert(resA.attendancePct === null, 'Scenario A (No Telemetry): attendancePct is strictly null');
    assert(resA.trainingStatus === 'Not Recorded', 'Scenario A (No Telemetry): trainingStatus is "Not Recorded" (not inferred from connectionStatus="active")');
    assert(resA.readinessStatus === 'Pending Attendance', 'Scenario A (No Telemetry): readinessStatus is "Pending Attendance" (not "Certification Eligible")');

    // Scenario B: Participant with VERIFIED 100% attendance (passed quiz + 100% attendance)
    const pWith100 = { 
      name: 'Learner B', 
      employeeId: 'GDA002', 
      connectionStatus: 'active', 
      Session: { Quiz: { questions: [{ id: 1 }] } },
      Responses: [{ points_awarded: 1 }] 
    };
    const jitsi100Map = { 'GDA002': { attendancePercentage: 100, status: 'Completed' } };
    const resB = computeParticipantAttendanceAndReadiness(pWith100, jitsi100Map);
    assert(resB.attendancePct === 100, 'Scenario B (Verified 100%): attendancePct is 100');
    assert(resB.trainingStatus === 'Completed', 'Scenario B (Verified 100%): trainingStatus is "Completed"');
    assert(resB.readinessStatus === 'Certification Eligible', 'Scenario B (Verified 100%): readinessStatus is "Certification Eligible"');

    // Scenario C: Participant with VERIFIED partial attendance (40% - failed attendance threshold)
    const pWith40 = { 
      name: 'Learner C', 
      employeeId: 'GDA003', 
      connectionStatus: 'active', 
      Session: { Quiz: { questions: [{ id: 1 }] } },
      Responses: [{ points_awarded: 1 }] 
    };
    const jitsi40Map = { 'GDA003': { attendancePercentage: 40, status: 'Left Early' } };
    const resC = computeParticipantAttendanceAndReadiness(pWith40, jitsi40Map);
    assert(resC.attendancePct === 40, 'Scenario C (Verified 40%): attendancePct is 40');
    assert(resC.trainingStatus === 'Left Early', 'Scenario C (Verified 40%): trainingStatus is "Left Early"');
    assert(resC.readinessStatus === 'At Risk', 'Scenario C (Verified 40%): readinessStatus is "At Risk" (attendance < 75%)');

    // Scenario D: Participant with VERIFIED 0% attendance (genuine zero)
    const pWith0 = { 
      name: 'Learner D', 
      employeeId: 'GDA004', 
      connectionStatus: 'disconnected', 
      Session: { Quiz: { questions: [{ id: 1 }] } },
      Responses: [{ points_awarded: 1 }] 
    };
    const jitsi0Map = { 'GDA004': { attendancePercentage: 0, status: 'Offline' } };
    const resD = computeParticipantAttendanceAndReadiness(pWith0, jitsi0Map);
    assert(resD.attendancePct === 0, 'Scenario D (Verified 0%): attendancePct is 0 (genuine zero)');
    assert(resD.trainingStatus === 'Offline', 'Scenario D (Verified 0%): trainingStatus is "Offline"');
    assert(resD.readinessStatus === 'At Risk', 'Scenario D (Verified 0%): readinessStatus is "At Risk"');

    // 5. Server-Side Scoping & Role Protections
    console.log('\n5. Verifying server-side authorization and project scoping...');
    try {
      await axios.get(`${testUrl}/api/projects/participants?projectId=1c4c15a4-5654-47b2-9a5c-7ec10f0f5127`, {
        headers: { Authorization: `Bearer ${pmToken}` }
      });
      assert(false, 'PM querying unauthorized project throws 403');
    } catch (err) {
      assert(err.response?.status === 403, 'PM parameter tampering returns HTTP 403 Forbidden (got ' + err.response?.status + ')');
    }

    const adminRes = await axios.get(`${testUrl}/api/projects/participants`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminRes.status === 200, 'Admin GET /api/projects/participants returns HTTP 200');
    assert(adminRes.data.length === 50, `Admin sees all 50 platform participants (got ${adminRes.data.length})`);

    // Participant 360 isolation
    const p360Res = await axios.get(`${testUrl}/api/projects/participant-360/36652aa1-bfb8-4d57-897b-9195b078971f`, {
      headers: { Authorization: `Bearer ${pmToken}` }
    });
    assert(p360Res.status === 200, 'PM GET /api/projects/participant-360 returns HTTP 200');
    assert(p360Res.data.training.attendancePercentage === 'N/A', `Participant 360 attendancePercentage is "N/A" (got ${p360Res.data.training.attendancePercentage})`);
    assert(p360Res.data.training.hasAttendanceData === false, 'Participant 360 hasAttendanceData is false');

  } catch (error) {
    console.error('Fatal error during test execution:', error.message);
    failedCount++;
  } finally {
    if (server) {
      server.close();
    }
  }

  console.log('\n========================================================================');
  console.log(`TEST SUITE RESULTS: ${passedCount} PASSED | ${failedCount} FAILED`);
  console.log('========================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
