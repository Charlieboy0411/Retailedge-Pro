// ============================================================================
// RETAILEDGE PRO — PRE-JOIN GATE SECURITY HARDENING & REGRESSION SUITE
// Tests:
// 1. Canonical Invitation URL Generation & Origin/Protocol Validation [Unit & Integration]
// 2. JWT Configuration Hardening, Fail-Closed Subprocess Proof & Query Token Rejection [Unit & API]
// 3. Project Authorization & Missing/Invalid Project Zones (Negative Tests) [API]
// 4. Global Meeting Authorization Policy & Supported Guest Registration (Positive & Negative) [API]
// 5. Identity Spoofing & Zone Conflict Guards [API]
// 6. Real Browser Pre-Join Form Rendering & Zone Dropdown Population [Browser E2E]
// 7. Successful Guest Registration & Attendee Badge with Leading Zeros [Browser E2E + API]
// 8. Token Fallback: Cached Invalid + Valid AuthContext Token [Browser E2E]
// 9. Neither Token Valid Keeps Mandatory Pre-Join Form Visible [Browser E2E]
// 10. LMS In-App Join & autoJoin=true Pre-Join Gate Enforcement [Browser E2E]
// 11. Telemetry Idempotency, Duplicate Joins & Leave Interval Reconciliation [API]
// ============================================================================

const path = require('path');
const net = require('net');
const http = require('http');
const fs = require('fs');
const puppeteer = require('puppeteer');
const { spawnSync } = require('child_process');

// ─── Network Circuit Breaker & SQLite UAT Database Isolation ───
process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = process.env.DB_STORAGE || path.resolve(__dirname, '../uat_database.sqlite');
process.env.DB_HOST = '127.0.0.1';
process.env.JWT_SECRET = 'test_secret_retailedge_pro_2026';
process.env.PORT = '5067';
process.env.FRONTEND_URL = `http://127.0.0.1:${process.env.PORT}`;

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

async function runPreJoinGateHardeningTestSuite() {
  console.log('========================================================================');
  console.log('🛡️ RETAILEDGE PRO — PRE-JOIN GATE SECURITY HARDENING & REGRESSION SUITE');
  console.log('Environment: Isolated Local UAT SQLite (Port 5067)');
  console.log('Execution Mode: Real Browser E2E + Authoritative API Guards');
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

  // 1. Initialize Express App serving API + Built Frontend Static Bundle
  const express = require('express');
  const app = express();
  app.use(express.json());

  // Connect to local UAT sqlite database
  const sequelize = require('../config/database');

  // Register API routes
  app.use('/api/auth', require('../routes/auth'));
  app.use('/api/users', require('../routes/users'));
  app.use('/api/projects', require('../routes/projects'));
  const trainingsRouter = require('../routes/trainings');
  app.use('/api/trainings', trainingsRouter);
  app.use('/api/quiz', require('../routes/quiz'));

  // Serve production built frontend assets with dynamic script injection
  const distPath = path.resolve(__dirname, '../../frontend/dist');
  function sendDynamicIndex(req, res) {
    const indexPath = path.join(distPath, 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');
    const assetsDir = path.join(distPath, 'assets');
    if (fs.existsSync(assetsDir)) {
      const jsFiles = fs.readdirSync(assetsDir).filter(f => f.startsWith('index-') && f.endsWith('.js'));
      if (jsFiles.length > 0) {
        jsFiles.sort((a, b) => fs.statSync(path.join(assetsDir, b)).mtimeMs - fs.statSync(path.join(assetsDir, a)).mtimeMs);
        html = html.replace(/\/assets\/index-[^"]+\.js/, `/assets/${jsFiles[0]}`);
      }
    }
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  if (fs.existsSync(distPath)) {
    app.get('/', sendDynamicIndex);
    app.get('/index.html', sendDynamicIndex);
    app.get('/guest-join', sendDynamicIndex);
    app.get('/trainings', sendDynamicIndex);
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      sendDynamicIndex(req, res);
    });
  }

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(process.env.PORT, resolve));
  console.log(`🚀 Test server listening on ${BASE_URL}\n`);

  const Project = require('../models/Project');
  const Training = require('../models/Training');
  const User = require('../models/User');
  const Role = require('../models/Role');
  const ProjectAssignment = require('../models/ProjectAssignment');
  const TrainingProgress = require('../models/TrainingProgress');
  const JitsiAttendance = require('../models/JitsiAttendance');
  const JitsiInterval = require('../models/JitsiInterval');
  const jwt = require('jsonwebtoken');

  let browser;

  try {
    // ─── SETUP TEST FIXTURES ───
    const galdermaProj = await Project.findByPk('71350b15-bbcf-4751-8960-821ece052612');
    assert(Boolean(galdermaProj), 'Multi-zone project Galderma loaded');

    // Create a live training meeting session
    const e2eMeeting = await Training.create({
      title: 'Galderma Q4 National Product Clinic',
      description: 'Mandatory product training session for all regional associates',
      type: 'Meeting',
      projectId: galdermaProj.id,
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      url: 'https://meet.jit.si/QuizHive-gald-q4-clinic'
    });

    // ──────────────────────────────────────────────────────────────────────────
    // SECTION 1: CANONICAL INVITATION URL GENERATION & VALIDATION [Unit & Integration]
    // ──────────────────────────────────────────────────────────────────────────
    console.log('--- SECTION 1: Canonical Invitation URL Generation & Validation ---');
    const frontendBaseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const canonicalExpectedUrl = `${frontendBaseUrl}/guest-join?id=${e2eMeeting.id}`;

    // 1.1 Real function invocation
    const directUrl = trainingsRouter.getCanonicalJoinUrl(e2eMeeting.id);
    assert(
      directUrl === canonicalExpectedUrl,
      `Real getCanonicalJoinUrl() produces expected canonical URL: "${directUrl}"`
    );
    assert(
      directUrl.includes('/guest-join?id='),
      'Canonical meeting join URL uses /guest-join?id=... routing'
    );
    assert(
      !directUrl.includes('meet.jit.si'),
      'Canonical join URL does NOT expose raw external meet.jit.si link'
    );

    // 1.2 Training ID Validation
    let missingIdErr = null;
    try {
      trainingsRouter.getCanonicalJoinUrl();
    } catch (e) {
      missingIdErr = e.message;
    }
    assert(
      missingIdErr && missingIdErr.includes('Valid UUID trainingId is required'),
      'getCanonicalJoinUrl() rejects missing training ID'
    );

    let invalidIdErr = null;
    try {
      trainingsRouter.getCanonicalJoinUrl('invalid-short-id');
    } catch (e) {
      invalidIdErr = e.message;
    }
    assert(
      invalidIdErr && invalidIdErr.includes('Valid UUID trainingId is required'),
      'getCanonicalJoinUrl() rejects non-UUID training ID'
    );

    // 1.3 Invalid Protocol & Malformed Origin
    const origFrontendUrl = process.env.FRONTEND_URL;
    const origNodeEnv = process.env.NODE_ENV;

    let unsupportedProtoErr = null;
    try {
      process.env.FRONTEND_URL = 'ftp://invalid-server.com';
      trainingsRouter.getCanonicalJoinUrl(e2eMeeting.id);
    } catch (e) {
      unsupportedProtoErr = e.message;
    }
    assert(
      unsupportedProtoErr && unsupportedProtoErr.includes('Unsupported protocol'),
      'getCanonicalJoinUrl() rejects unsupported protocol (ftp://)'
    );

    // 1.4 Production Configuration Checks
    let prodMissingErr = null;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.FRONTEND_URL;
      trainingsRouter.getCanonicalJoinUrl(e2eMeeting.id);
    } catch (e) {
      prodMissingErr = e.message;
    }
    assert(
      prodMissingErr && prodMissingErr.includes('FRONTEND_URL is required in non-development environments'),
      'getCanonicalJoinUrl() rejects missing FRONTEND_URL in production mode without falling back to localhost'
    );

    let prodInsecureErr = null;
    try {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'http://retailedgepro.com';
      trainingsRouter.getCanonicalJoinUrl(e2eMeeting.id);
    } catch (e) {
      prodInsecureErr = e.message;
    }
    assert(
      prodInsecureErr && prodInsecureErr.includes('Production FRONTEND_URL must use HTTPS protocol'),
      'getCanonicalJoinUrl() rejects insecure HTTP protocol for remote host in production'
    );

    let prodHttpsUrl = null;
    try {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'https://app.retailedgepro.com';
      prodHttpsUrl = trainingsRouter.getCanonicalJoinUrl(e2eMeeting.id);
    } catch (e) {
      prodHttpsUrl = null;
    }
    assert(
      prodHttpsUrl === `https://app.retailedgepro.com/guest-join?id=${e2eMeeting.id}`,
      'getCanonicalJoinUrl() accepts valid HTTPS configuration in production'
    );

    // 1.5 Email Invitation Content Verification (HTML and Plain-Text with canonical URL)
    const testUser = { name: 'Pooja Verma', email: 'pooja.verma@example.com' };
    const emailPayload = trainingsRouter.buildInviteEmailPayload(
      testUser,
      'Product Launch Workshop',
      'Interactive workshop on Q4 initiatives',
      new Date('2026-11-01T10:00:00.000Z'),
      'Galderma Consumer',
      e2eMeeting.id
    );
    const expectedCanonicalUrl = trainingsRouter.getCanonicalJoinUrl(e2eMeeting.id);
    assert(
      emailPayload.canonicalJoinUrl === expectedCanonicalUrl,
      'buildInviteEmailPayload invokes actual getCanonicalJoinUrl'
    );
    assert(
      emailPayload.text.includes(expectedCanonicalUrl),
      'Plain-text email invitation contains canonical platform join URL'
    );
    assert(
      emailPayload.html.includes(`href="${expectedCanonicalUrl}"`),
      'HTML email invitation contains clickable canonical platform join URL link'
    );
    assert(
      !emailPayload.text.includes('meet.jit.si'),
      'Plain-text email invitation does NOT expose raw external meet.jit.si link'
    );
    assert(
      !emailPayload.html.includes('meet.jit.si'),
      'HTML email invitation does NOT expose raw external meet.jit.si link'
    );

    // Restore test environment variables
    process.env.FRONTEND_URL = origFrontendUrl;
    process.env.NODE_ENV = origNodeEnv;

    // ──────────────────────────────────────────────────────────────────────────
    // SECTION 2: JWT AUTHENTICATION HARDENING, FAIL-CLOSED GUARDS & SUBPROCESS PROOF
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 2: JWT Verification, Fail-Closed Guards & Subprocess Proof ---');

    // 2.1 Subprocess test: Insecure JWT_SECRET in production fails closed
    const insecureSubprocess = spawnSync(
      process.execPath,
      ['-e', `
        const { validateJwtSecret } = require('./backend/config/constants');
        try {
          validateJwtSecret('fallback_secret', 'production');
          console.log('UNEXPECTED_SUCCESS');
          process.exit(0);
        } catch (err) {
          console.error(err.message);
          process.exit(42);
        }
      `],
      { cwd: path.resolve(__dirname, '../..'), encoding: 'utf8' }
    );
    assert(
      insecureSubprocess.status === 42 && insecureSubprocess.stderr.includes('[Security Error] Production JWT_SECRET is using a known insecure default/placeholder'),
      'Canonical validateJwtSecret() in isolated process halts on insecure placeholder secret'
    );

    // 2.2 Subprocess test: Missing JWT_SECRET in production fails closed
    const missingSubprocess = spawnSync(
      process.execPath,
      ['-e', `
        const { validateJwtSecret } = require('./backend/config/constants');
        try {
          validateJwtSecret('', 'production');
          console.log('UNEXPECTED_SUCCESS');
          process.exit(0);
        } catch (err) {
          console.error(err.message);
          process.exit(43);
        }
      `],
      { cwd: path.resolve(__dirname, '../..'), encoding: 'utf8' }
    );
    assert(
      missingSubprocess.status === 43 && missingSubprocess.stderr.includes('[Security Error] Production JWT_SECRET is missing or empty'),
      'Canonical validateJwtSecret() in isolated process halts on missing secret'
    );

    // 2.3 Query-parameter token intake is removed and rejected
    const queryParamRes = await fetch(`${BASE_URL}/api/trainings/${e2eMeeting.id}/join-context?token=some_token_here`);
    const queryParamData = await queryParamRes.json();
    assert(
      queryParamData.verifiedSession === null,
      'Query parameter token (?token=...) is rejected; only standard Authorization header is accepted'
    );

    // 2.4 Malformed / Invalid Token
    const invalidTokenRes = await fetch(`${BASE_URL}/api/trainings/${e2eMeeting.id}/join-context`, {
      headers: { Authorization: 'Bearer totally.invalid.malformed.token' }
    });
    assert(invalidTokenRes.status === 200, 'Invalid token handled safely with HTTP 200 public context');
    const invalidTokenData = await invalidTokenRes.json();
    assert(invalidTokenData.verifiedSession === null, 'Invalid token yields verifiedSession: null');

    // 2.5 Expired Token
    const expiredToken = jwt.sign(
      { id: '00000000-0000-0000-0000-000000000001', role: 'Employee' },
      process.env.JWT_SECRET,
      { expiresIn: '-1h' }
    );
    const expiredTokenRes = await fetch(`${BASE_URL}/api/trainings/${e2eMeeting.id}/join-context`, {
      headers: { Authorization: `Bearer ${expiredToken}` }
    });
    const expiredTokenData = await expiredTokenRes.json();
    assert(expiredTokenData.verifiedSession === null, 'Expired token yields verifiedSession: null');

    // 2.6 Token signed with wrong / unknown secret
    const alienSecretToken = jwt.sign(
      { id: '00000000-0000-0000-0000-000000000001', role: 'Employee' },
      'wrong_untrusted_secret_xyz'
    );
    const alienRes = await fetch(`${BASE_URL}/api/trainings/${e2eMeeting.id}/join-context`, {
      headers: { Authorization: `Bearer ${alienSecretToken}` }
    });
    const alienData = await alienRes.json();
    assert(alienData.verifiedSession === null, 'Alien secret token yields verifiedSession: null');

    // ──────────────────────────────────────────────────────────────────────────
    // SECTION 3: PROJECT AUTHORIZATION & MISSING/INVALID PROJECT ZONES [API]
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 3: Project Authorization & Missing/Invalid Project Zones ---');

    // Create an UNZONED project to verify project-scoped training cannot verify without zones
    const unzonedProject = await Project.create({
      name: 'Unzoned Clinical Project ' + Date.now(),
      project_code: 'UNZONED_' + Date.now(),
      zone: null,
      status: 'Active'
    });

    const unzonedMeeting = await Training.create({
      title: 'Unzoned Session Briefing',
      type: 'Meeting',
      projectId: unzonedProject.id,
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      url: 'https://meet.jit.si/unzoned-meeting-test'
    });

    const unzonedEmployee = await User.create({
      name: 'Unzoned Associate',
      email: `unzoned.${Date.now()}@unzoned.com`,
      password: 'hash',
      roleId: (await Role.findOne({ where: { role_name: 'Employee' } })).id,
      employee_id: `EMP-UNZ-${Date.now().toString().slice(-4)}`,
      projectId: unzonedProject.id
    });

    await ProjectAssignment.create({
      userId: unzonedEmployee.id,
      projectId: unzonedProject.id,
      role: 'Employee',
      status: 'Active'
    });

    const unzonedToken = jwt.sign(
      { id: unzonedEmployee.id, role: 'Employee', projectId: unzonedProject.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 3.1 Unzoned project-scoped meeting cannot grant verifiedSession
    const unzonedContextRes = await fetch(`${BASE_URL}/api/trainings/${unzonedMeeting.id}/join-context`, {
      headers: { Authorization: `Bearer ${unzonedToken}` }
    });
    const unzonedContextData = await unzonedContextRes.json();
    assert(
      unzonedContextData.validZones.length === 0,
      'Unzoned project correctly reports validZones.length === 0'
    );
    assert(
      unzonedContextData.verifiedSession === null,
      'Project-scoped meeting with missing zone configuration denies verifiedSession (fail closed)'
    );

    // 3.2 Unzoned project telemetry join rejected with HTTP 400
    const unzonedTelemetryRes = await fetch(`${BASE_URL}/api/trainings/${unzonedMeeting.id}/jitsi-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${unzonedToken}` },
      body: JSON.stringify({ event: 'join', participantName: unzonedEmployee.name, employeeId: unzonedEmployee.employee_id })
    });
    assert(
      unzonedTelemetryRes.status === 400,
      `Unzoned project meeting telemetry join rejected with HTTP 400 (got: ${unzonedTelemetryRes.status})`
    );

    // 3.3 Invalid zone submitted on zoned project meeting rejected with HTTP 400
    const invalidZoneTelemetryRes = await fetch(`${BASE_URL}/api/trainings/${e2eMeeting.id}/jitsi-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${unzonedToken}` },
      body: JSON.stringify({ event: 'join', participantName: unzonedEmployee.name, employeeId: unzonedEmployee.employee_id, zone: 'Antarctica' })
    });
    assert(
      invalidZoneTelemetryRes.status === 403 || invalidZoneTelemetryRes.status === 400,
      `Invalid/unauthorized project zone rejected with HTTP 400/403 (got: ${invalidZoneTelemetryRes.status})`
    );

    // 3.4 Cross-project isolation: Foreign user without project access
    const foreignProj = await Project.create({
      name: 'SSEIL Operations Project',
      zone: 'East',
      status: 'Active'
    });

    const foreignUser = await User.create({
      name: 'Foreign Project Associate',
      email: `foreign.${Date.now()}@foreign.com`,
      password: 'hash',
      roleId: (await Role.findOne({ where: { role_name: 'Employee' } })).id,
      employee_id: `EMP-FOR-${Date.now().toString().slice(-4)}`,
      projectId: foreignProj.id,
      location: 'East'
    });

    const foreignToken = jwt.sign(
      { id: foreignUser.id, role: 'Employee', projectId: foreignUser.projectId },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const foreignContextRes = await fetch(`${BASE_URL}/api/trainings/${e2eMeeting.id}/join-context`, {
      headers: { Authorization: `Bearer ${foreignToken}` }
    });
    const foreignContextData = await foreignContextRes.json();
    assert(
      foreignContextData.verifiedSession === null,
      'Valid authenticated user from foreign project is denied verifiedSession'
    );

    const probeRes = await fetch(`${BASE_URL}/api/trainings/${e2eMeeting.id}/join-context?employeeId=${foreignUser.employee_id}`);
    const probeData = await probeRes.json();
    assert(
      probeData.matchedEmployee === null,
      'Unassigned employee details are NOT leaked to unauthorized project meetings'
    );

    const foreignTelemetryRes = await fetch(`${BASE_URL}/api/trainings/${e2eMeeting.id}/jitsi-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${foreignToken}` },
      body: JSON.stringify({ event: 'join', participantName: foreignUser.name, employeeId: foreignUser.employee_id, zone: 'East' })
    });
    assert(
      foreignTelemetryRes.status === 403,
      `Foreign project associate telemetry join rejected with HTTP 403 (got: ${foreignTelemetryRes.status})`
    );

    // ──────────────────────────────────────────────────────────────────────────
    // SECTION 4: GLOBAL MEETING AUTHORIZATION & SUPPORTED GUEST REGISTRATION [API]
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 4: Global Meeting Authorization & Guest Registration ---');

    const globalMeeting = await Training.create({
      title: 'Company-Wide General Orientation ' + Date.now(),
      type: 'Meeting',
      projectId: null,
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      url: 'https://meet.jit.si/global-orientation-test'
    });

    // 4.1 Ineligible User A: Client Role cannot access Global Meetings
    const clientRole = await Role.findOne({ where: { role_name: 'Client' } });
    const clientUser = await User.create({
      name: 'Client Stakeholder',
      email: `client.${Date.now()}@client.com`,
      password: 'hash',
      roleId: clientRole.id,
      employee_id: `CLI-${Date.now().toString().slice(-4)}`,
      projectId: foreignProj.id
    });
    const clientToken = jwt.sign(
      { id: clientUser.id, role: 'Client', projectId: foreignProj.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const clientGlobalContextRes = await fetch(`${BASE_URL}/api/trainings/${globalMeeting.id}/join-context`, {
      headers: { Authorization: `Bearer ${clientToken}` }
    });
    const clientGlobalData = await clientGlobalContextRes.json();
    assert(
      clientGlobalData.verifiedSession === null,
      'Client role denied verifiedSession for global meeting (strict client scoping)'
    );

    const clientTelemetryRes = await fetch(`${BASE_URL}/api/trainings/${globalMeeting.id}/jitsi-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientToken}` },
      body: JSON.stringify({ event: 'join', participantName: clientUser.name, employeeId: clientUser.employee_id })
    });
    assert(
      clientTelemetryRes.status === 403,
      `Client role telemetry on global meeting rejected with HTTP 403 (got: ${clientTelemetryRes.status})`
    );

    // 4.2 Ineligible User B: Project Employee NOT invited to Global Meeting
    const uninvitedProjectUser = await User.create({
      name: 'Uninvited Project Employee',
      email: `uninvited.${Date.now()}@project.com`,
      password: 'hash',
      roleId: (await Role.findOne({ where: { role_name: 'Employee' } })).id,
      employee_id: `UNINV-${Date.now().toString().slice(-4)}`,
      projectId: foreignProj.id
    });
    const uninvitedToken = jwt.sign(
      { id: uninvitedProjectUser.id, role: 'Employee', projectId: foreignProj.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const uninvitedContextRes = await fetch(`${BASE_URL}/api/trainings/${globalMeeting.id}/join-context`, {
      headers: { Authorization: `Bearer ${uninvitedToken}` }
    });
    const uninvitedContextData = await uninvitedContextRes.json();
    assert(
      uninvitedContextData.verifiedSession === null,
      'Project employee not invited to global meeting is denied verifiedSession'
    );

    // 4.3 Eligible User A: Unassigned Trainee (no project assignment)
    const unassignedTrainee = await User.create({
      name: 'Unassigned Trainee',
      email: `unassigned.${Date.now()}@trainee.com`,
      password: 'hash',
      roleId: (await Role.findOne({ where: { role_name: 'Employee' } })).id,
      employee_id: `UNASS-${Date.now().toString().slice(-4)}`,
      projectId: null
    });
    const unassignedToken = jwt.sign(
      { id: unassignedTrainee.id, role: 'Employee', projectId: null },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const unassignedContextRes = await fetch(`${BASE_URL}/api/trainings/${globalMeeting.id}/join-context`, {
      headers: { Authorization: `Bearer ${unassignedToken}` }
    });
    const unassignedContextData = await unassignedContextRes.json();
    assert(
      unassignedContextData.verifiedSession !== null && unassignedContextData.verifiedSession.valid === true,
      'Unassigned general trainee is granted verifiedSession for global meeting'
    );

    // 4.4 Eligible User B: Project Employee Invited via TrainingProgress
    const invitedUser = await User.create({
      name: 'Invited Project Trainee',
      email: `invited.${Date.now()}@invited.com`,
      password: 'hash',
      roleId: (await Role.findOne({ where: { role_name: 'Employee' } })).id,
      employee_id: `INV-${Date.now().toString().slice(-4)}`,
      projectId: foreignProj.id
    });
    await TrainingProgress.create({
      userId: invitedUser.id,
      trainingId: globalMeeting.id,
      completed: false,
      timeSpent: 0
    });
    const invitedToken = jwt.sign(
      { id: invitedUser.id, role: 'Employee', projectId: foreignProj.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const invitedContextRes = await fetch(`${BASE_URL}/api/trainings/${globalMeeting.id}/join-context`, {
      headers: { Authorization: `Bearer ${invitedToken}` }
    });
    const invitedContextData = await invitedContextRes.json();
    assert(
      invitedContextData.verifiedSession !== null && invitedContextData.verifiedSession.valid === true,
      'Project employee explicitly invited to global meeting is granted verifiedSession'
    );

    // 4.5 Supported Registered Guest Flow on Global Meeting
    const guestEmpId = `GST-${Date.now().toString().slice(-4)}`;
    const guestRegRes = await fetch(`${BASE_URL}/api/trainings/${globalMeeting.id}/guest-join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Guest Attendee',
        employeeId: guestEmpId,
        zone: 'North'
      })
    });
    assert(guestRegRes.status === 200, 'Supported guest registration succeeds for global meeting');
    const guestRegData = await guestRegRes.json();
    assert(Boolean(guestRegData.token), 'Guest registration returned valid signed JWT token');

    const guestContextRes = await fetch(`${BASE_URL}/api/trainings/${globalMeeting.id}/join-context`, {
      headers: { Authorization: `Bearer ${guestRegData.token}` }
    });
    const guestContextData = await guestContextRes.json();
    assert(
      guestContextData.verifiedSession !== null && guestContextData.verifiedSession.valid === true,
      'Registered guest establishes verifiedSession on global meeting'
    );

    const guestTelemetryRes = await fetch(`${BASE_URL}/api/trainings/${globalMeeting.id}/jitsi-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${guestRegData.token}` },
      body: JSON.stringify({ event: 'join', scheduledDurationMinutes: 60 })
    });
    assert(
      guestTelemetryRes.status === 200,
      'Registered guest records attendance telemetry on global meeting with HTTP 200'
    );

    // ──────────────────────────────────────────────────────────────────────────
    // SECTION 5: IDENTITY SPOOFING & ZONE CONFLICT GUARDS [API]
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 5: Identity Spoofing & Zone Conflict Guards ---');

    // Create an authorized Galderma employee
    const rohanEmpId = `000${Math.floor(100 + Math.random() * 800)}`;
    const galdermaUser = await User.create({
      name: 'Rohan Deshmukh',
      email: `rohan.${Date.now()}@galderma.com`,
      password: 'hash',
      roleId: (await Role.findOne({ where: { role_name: 'Employee' } })).id,
      employee_id: rohanEmpId,
      projectId: galdermaProj.id,
      location: 'West'
    });

    await ProjectAssignment.create({
      userId: galdermaUser.id,
      projectId: galdermaProj.id,
      role: 'Employee',
      zone: 'West',
      status: 'Active'
    });

    const galdermaToken = jwt.sign(
      { id: galdermaUser.id, role: 'Employee', projectId: galdermaProj.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 4.1 Client attempts to forge a different employee ID
    const spoofEmpIdRes = await fetch(`${BASE_URL}/api/trainings/${e2eMeeting.id}/jitsi-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${galdermaToken}` },
      body: JSON.stringify({
        event: 'join',
        employeeId: '999999', // Spoofed employee ID
        zone: 'West'
      })
    });
    assert(
      spoofEmpIdRes.status === 400,
      `Spoofed client employee ID rejected with HTTP 400 (got: ${spoofEmpIdRes.status})`
    );

    // 4.2 Client attempts to forge a different user ID
    const spoofUserIdRes = await fetch(`${BASE_URL}/api/trainings/${e2eMeeting.id}/jitsi-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${galdermaToken}` },
      body: JSON.stringify({
        event: 'join',
        userId: '00000000-0000-0000-0000-000000000000', // Spoofed user ID
        zone: 'West'
      })
    });
    assert(
      spoofUserIdRes.status === 403,
      `Spoofed client user ID rejected with HTTP 403 (got: ${spoofUserIdRes.status})`
    );

    // 4.3 Client attempts to submit conflicting zone
    const zoneConflictRes = await fetch(`${BASE_URL}/api/trainings/${e2eMeeting.id}/jitsi-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${galdermaToken}` },
      body: JSON.stringify({
        event: 'join',
        employeeId: '000456',
        zone: 'East' // Conflicting zone (assigned is West)
      })
    });
    assert(
      zoneConflictRes.status === 400,
      `Conflicting client zone rejected with HTTP 400 (got: ${zoneConflictRes.status})`
    );

    // ──────────────────────────────────────────────────────────────────────────
    // SECTION 6: REAL BROWSER PRE-JOIN FORM RENDERING & VALIDATION [Browser E2E]
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 6: Real Browser Pre-Join Form Rendering ---');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    page.on('console', msg => console.log('  [BROWSER CONSOLE]', msg.text()));
    page.on('pageerror', err => console.error('  [BROWSER PAGEERROR]', err.message));
    await page.setViewport({ width: 1280, height: 800 });

    const guestJoinUrl = `${BASE_URL}/guest-join?id=${e2eMeeting.id}`;
    await page.goto(guestJoinUrl, { waitUntil: 'networkidle2' });

    // Assert Form Elements Render in DOM
    await page.waitForSelector('#guest-full-name', { timeout: 10000 });
    assert(await page.$('#guest-full-name') !== null, 'Full Name input (#guest-full-name) rendered in browser');
    assert(await page.$('#guest-emp-id') !== null, 'Employee ID input (#guest-emp-id) rendered in browser');
    assert(await page.$('#guest-zone-select') !== null, 'Zone selection dropdown (#guest-zone-select) rendered in browser');

    // Verify Dropdown Populates Exact Project Zones
    const selectOptions = await page.$$eval('#guest-zone-select option', opts => opts.map(o => o.value).filter(Boolean));
    assert(
      selectOptions.length === 4 && selectOptions.includes('North') && selectOptions.includes('South') && selectOptions.includes('East') && selectOptions.includes('West'),
      `Zone dropdown populates exactly authorized project zones: ${JSON.stringify(selectOptions)}`
    );

    // Verify Missing-Field Rejection in Browser
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 300));
    assert(await page.$('#guest-full-name') !== null, 'Browser prevents advancing to meeting when fields are missing');

    // ──────────────────────────────────────────────────────────────────────────
    // SECTION 7: SUCCESSFUL REGISTRATION & PERSISTENCE [Browser E2E + API]
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 7: Successful Registration & Attendee Badge ---');
    const sureshEmpId = `000${Math.floor(100 + Math.random() * 800)}`;
    await page.type('#guest-full-name', 'Suresh Raina');
    await page.type('#guest-emp-id', sureshEmpId);
    await page.select('#guest-zone-select', 'South');

    await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/trainings/') && res.url().includes('/guest-join') && res.status() === 200),
      page.click('button[type="submit"]')
    ]);

    await page.waitForSelector('#btn-join-browser', { timeout: 10000 });
    assert(await page.$('#btn-join-browser') !== null, '"Join in Browser (Full Screen)" button rendered upon successful verification');
    assert(await page.$('#btn-join-app') !== null, '"Open in Jitsi Meet App" deep-link button rendered');

    const pageText = await page.evaluate(() => document.body.innerText);
    assert(pageText.includes('Suresh Raina'), 'DOM displays verified attendee name "Suresh Raina"');
    assert(pageText.includes(sureshEmpId), `DOM preserves exact Employee ID string with leading zeros "${sureshEmpId}"`);
    assert(pageText.includes('South'), 'DOM displays authoritative assigned Zone "South"');

    const persistedUser = await User.findOne({ where: { employee_id: sureshEmpId } });
    assert(Boolean(persistedUser), 'User record persisted in database');
    assert(persistedUser.employee_id === sureshEmpId, `Database stored employee_id with intact leading zeros "${sureshEmpId}"`);

    const persistedProgress = await TrainingProgress.findOne({
      where: { userId: persistedUser.id, trainingId: e2eMeeting.id }
    });
    assert(Boolean(persistedProgress), 'TrainingProgress record created before room entry');
    assert(persistedProgress.zone === 'South', 'TrainingProgress zone persisted as authoritative "South"');

    // ──────────────────────────────────────────────────────────────────────────
    // SECTION 8: TOKEN FALLBACK: CACHED INVALID + VALID AUTHCONTEXT TOKEN [Browser E2E]
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 8: Token Fallback (Cached Invalid + Valid AuthContext) ---');

    // Set invalid token in cached meeting session, but valid token in AuthContext ('jwt' & 'user')
    await page.evaluate((mId, validTok, usr) => {
      // Stale cached token for this meeting
      localStorage.setItem(`jitsi_guest_auth_${mId}`, JSON.stringify({
        token: 'expired.stale.cached.token',
        user: { name: 'Old Stale User' },
        meeting: { id: mId }
      }));
      // Fresh valid login session in AuthContext
      localStorage.setItem('jwt', validTok);
      localStorage.setItem('user', JSON.stringify(usr));
    }, e2eMeeting.id, galdermaToken, { id: galdermaUser.id, name: galdermaUser.name, role: 'Employee', location: 'West' });

    // Reload page: fetchJoinContext should fall back to valid AuthContext token!
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('#btn-join-browser', { timeout: 10000 });
    assert(await page.$('#btn-join-browser') !== null, 'Safe fallback to valid AuthContext token restored verified meeting session');

    // ──────────────────────────────────────────────────────────────────────────
    // SECTION 9: NEITHER TOKEN VALID -> MANDATORY FORM VISIBLE [Browser E2E]
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 9: Neither Token Valid -> Mandatory Form Visible ---');
    await page.evaluate((mId) => {
      localStorage.setItem(`jitsi_guest_auth_${mId}`, JSON.stringify({
        token: 'bad.cached.token',
        user: { name: 'Fake' },
        meeting: { id: mId }
      }));
      localStorage.removeItem('jwt');
      localStorage.removeItem('user');
    }, e2eMeeting.id);

    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('#guest-full-name', { timeout: 10000 });
    assert(await page.$('#guest-full-name') !== null, 'Mandatory form remains visible when neither token is valid');

    const clearedCache = await page.evaluate((mId) => localStorage.getItem(`jitsi_guest_auth_${mId}`), e2eMeeting.id);
    assert(clearedCache === null, 'Invalid cached token was purged from localStorage');

    // ──────────────────────────────────────────────────────────────────────────
    // SECTION 10: LMS JOIN LIVE MEETING & autoJoin=true GATE ENFORCEMENT [Browser E2E]
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 10: LMS In-App Join & autoJoin=true Redirection ---');
    await page.evaluate((tok, usr) => {
      localStorage.setItem('jwt', tok);
      localStorage.setItem('user', JSON.stringify(usr));
    }, galdermaToken, { id: galdermaUser.id, name: galdermaUser.name, role: 'Employee' });

    const autoJoinLmsUrl = `${BASE_URL}/trainings?id=${e2eMeeting.id}&autoJoin=true`;
    await page.goto(autoJoinLmsUrl, { waitUntil: 'networkidle2' });

    const currentUrl = page.url();
    assert(
      currentUrl.includes('/guest-join?id=' + e2eMeeting.id),
      `autoJoin=true in LMS immediately redirected to canonical platform join gate (URL: ${currentUrl})`
    );

    // ──────────────────────────────────────────────────────────────────────────
    // SECTION 11: TELEMETRY IDEMPOTENCY & INTERVAL RECONCILIATION [API]
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 11: Telemetry Idempotency & Interval Reconciliation ---');
    const validRainaToken = jwt.sign(
      { id: persistedUser.id, role: 'Employee', projectId: galdermaProj.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const join1 = await fetch(`${BASE_URL}/api/trainings/${e2eMeeting.id}/jitsi-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${validRainaToken}` },
      body: JSON.stringify({ event: 'join', jitsiParticipantId: 'jp-raina-001', scheduledDurationMinutes: 60 })
    });
    assert(join1.status === 200, 'Valid attendee telemetry join accepted with HTTP 200');

    const attRecord = await JitsiAttendance.findOne({
      where: { userId: persistedUser.id, trainingId: e2eMeeting.id }
    });
    assert(Boolean(attRecord), 'JitsiAttendance record created for verified attendee');
    assert(attRecord.zone === 'South', 'JitsiAttendance stores authoritative zone "South"');
    assert(attRecord.status === 'Online', 'JitsiAttendance status initialized to Online');

    // Repeated join (Idempotency)
    const join2 = await fetch(`${BASE_URL}/api/trainings/${e2eMeeting.id}/jitsi-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${validRainaToken}` },
      body: JSON.stringify({ event: 'join', jitsiParticipantId: 'jp-raina-001', scheduledDurationMinutes: 60 })
    });
    assert(join2.status === 200, 'Duplicate join returns HTTP 200 idempotently');
    const attCount = await JitsiAttendance.count({
      where: { userId: persistedUser.id, trainingId: e2eMeeting.id }
    });
    assert(attCount === 1, 'Duplicate join did NOT duplicate JitsiAttendance records (count === 1)');

    // Interval reconciliation on leave
    const leave = await fetch(`${BASE_URL}/api/trainings/${e2eMeeting.id}/jitsi-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${validRainaToken}` },
      body: JSON.stringify({ event: 'leave', jitsiParticipantId: 'jp-raina-001', scheduledDurationMinutes: 60 })
    });
    assert(leave.status === 200, 'Leave event processed with HTTP 200');
    const closedIntervals = await JitsiInterval.findAll({
      where: { jitsiAttendanceId: attRecord.id }
    });
    assert(closedIntervals.length === 1 && closedIntervals[0].leftAt !== null, 'Open interval closed with valid leftAt timestamp');

    console.log('\n========================================================================');
    console.log(`📊 HARDENING & E2E SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log('========================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Test Execution Error:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    server.close();
    process.exit(0);
  }
}

runPreJoinGateHardeningTestSuite();
