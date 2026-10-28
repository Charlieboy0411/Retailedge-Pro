/**
 * RETAILEDGE PRO — OPERATION MANAGER RBAC & PROJECT SCOPING VERIFICATION SUITE
 *
 * Validates Phase 1 Implementation across all 7 user requirements:
 * 1. Authorized Operation Manager can retrieve permitted project records.
 * 2. Project and report endpoints return only authorized project data.
 * 3. Unassigned and unrelated project access is strictly rejected (HTTP 403).
 * 4. Scheduling is permitted only where intended, with eligible trainers.
 * 5. User directory and certificate operations enforce their intended permissions.
 * 6. Existing Client, Trainer and Supervisor access rules remain unchanged.
 * 7. Parent-project trainer inheritance and unrelated-project isolation continue to pass.
 *
 * FAIL-CLOSED HARDENED SUITE:
 * - Network circuit breaker physically blocks remote connections (e.g. AWS RDS 5432).
 * - Runs in SQLite/in-memory mode with zero mutation to production data.
 */

// ── 1. NETWORK CIRCUIT BREAKER ──
const net = require('net');
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

// ── 2. ENVIRONMENT ISOLATION ──
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = ':memory:';
process.env.NODE_ENV = 'test';
delete process.env.DATABASE_URL;
delete process.env.DB_HOST;
delete process.env.DB_PASS;
delete process.env.DB_PASSWORD;

const http = require('http');
const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');
const sequelize = require('../config/database');

// Stub nodemailer so no outbound network call is attempted
const nodemailer = require('nodemailer');
nodemailer.createTransport = () => ({
  sendMail: async () => ({ messageId: 'mock-mail-id' })
});
nodemailer.createTestAccount = async () => ({
  user: 'mock@ethereal.email',
  pass: 'mockpass'
});

// Stub pdfGenerator so tests don't launch external browser processes
const pdfGenerator = require('../utils/pdfGenerator');
pdfGenerator.generatePDFBuffer = async () => Buffer.from('%PDF-1.4 Mock PDF Buffer');

// Load all models into Sequelize instance
const fs = require('fs');
const path = require('path');
const modelsDir = path.join(__dirname, '../models');
fs.readdirSync(modelsDir).forEach(file => {
  if (file.endsWith('.js')) {
    require(path.join(modelsDir, file));
  }
});

// Load models
const Project = require('../models/Project');
const User = require('../models/User');
const Role = require('../models/Role');
const Session = require('../models/Session');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Participant = require('../models/Participant');
const Response = require('../models/Response');
const ProjectAssignment = require('../models/ProjectAssignment');
const Certificate = require('../models/Certificate');
const Training = require('../models/Training');
const TrainingProgress = require('../models/TrainingProgress');
const Client = require('../models/Client');
const ExecutiveMetric = require('../models/ExecutiveMetric');
const JitsiAttendance = require('../models/JitsiAttendance');
const ReportAudit = require('../models/ReportAudit');

let PASS = 0;
let FAIL = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    PASS++;
  } else {
    console.error(`  [FAIL] ${testName} ${details ? '--> ' + details : ''}`);
    FAIL++;
  }
}

// ── 3. DETERMINISTIC FIXTURE IDENTIFIERS ──
const PROJ_PARENT_ID    = '11111111-aaaa-4aaa-aaaa-111111111111';
const PROJ_CHILD_ID     = '22222222-aaaa-4aaa-aaaa-222222222222';
const PROJ_UNRELATED_ID = '33333333-bbbb-4bbb-bbbb-333333333333';

const ROLE_SUPER_ADMIN_ID = 'role-sa-0001';
const ROLE_ADMIN_ID       = 'role-ad-0002';
const ROLE_PM_ID          = 'role-pm-0003';
const ROLE_OM_ID          = 'role-om-0004';
const ROLE_TRAINER_ID     = 'role-tr-0005';
const ROLE_SUPERVISOR_ID  = 'role-sp-0006';
const ROLE_CLIENT_ID      = 'role-cl-0007';
const ROLE_EMPLOYEE_ID    = 'role-em-0008';

const USER_OM_AUTH_ID        = 'aaaa1111-1111-4111-8111-aaaaaaaaaaaa';
const USER_OM_UNASSIGNED_ID  = 'aaaa2222-2222-4111-8111-aaaaaaaaaaaa';
const USER_PM_ID             = 'bbbb1111-1111-4111-8111-bbbbbbbbbbbb';
const USER_TRAINER_PARENT_ID = 'cccc1111-1111-4111-8111-cccccccccccc';
const USER_TRAINER_UNREL_ID  = 'cccc2222-2222-4111-8111-cccccccccccc';
const USER_SUPERVISOR_ID     = 'dddd1111-1111-4111-8111-dddddddddddd';
const USER_CLIENT_ID         = 'eeee1111-1111-4111-8111-eeeeeeeeeeee';
const USER_EMP_CHILD_ID      = 'ffff1111-1111-4111-8111-ffffffffffff';
const USER_EMP_UNREL_ID      = 'ffff2222-2222-4111-8111-ffffffffffff';
const USER_EMP_UNASSIGNED_ID = 'ffff3333-3333-4111-8111-ffffffffffff';
const USER_ADMIN_ID          = '99991111-1111-4111-8111-999999999999';

const TRAIN_PARENT_ID   = 'tr-parent-001';
const TRAIN_CHILD_ID    = 'tr-child-002';
const TRAIN_UNREL_ID    = 'tr-unrel-003';
const TRAIN_GLOBAL_ID   = 'tr-global-004';

const QUIZ_CHILD_ID = 'qz-child-001';
const QUIZ_UNREL_ID = 'qz-unrel-002';

const SESS_CHILD_ID = '99990000-0000-4000-8000-000000000001';
const SESS_UNREL_ID = '99990000-0000-4000-8000-000000000002';

const CERT_CHILD_ID = '77770000-0000-4000-8000-000000000001';
const CERT_UNREL_ID = '77770000-0000-4000-8000-000000000002';

// ── 4. POPULATE SQLITE DATABASE ──
async function seedDatabase() {
  await sequelize.sync({ force: true });

  await Role.bulkCreate([
    { id: ROLE_SUPER_ADMIN_ID, role_name: 'Super Admin' },
    { id: ROLE_ADMIN_ID, role_name: 'Admin' },
    { id: ROLE_PM_ID, role_name: 'Program Manager' },
    { id: ROLE_OM_ID, role_name: 'Operation Manager' },
    { id: ROLE_TRAINER_ID, role_name: 'Trainer' },
    { id: ROLE_SUPERVISOR_ID, role_name: 'Supervisor' },
    { id: ROLE_CLIENT_ID, role_name: 'Client' },
    { id: ROLE_EMPLOYEE_ID, role_name: 'Employee' }
  ]);

  await Project.bulkCreate([
    {
      id: PROJ_PARENT_ID,
      name: 'Unilever International',
      project_code: 'UNI-INT',
      parentId: null,
      zone: 'North',
      participants_planned: 100
    },
    {
      id: PROJ_CHILD_ID,
      name: 'Unilever Direct Store',
      project_code: 'UNI-DIR',
      parentId: PROJ_PARENT_ID,
      zone: 'North',
      participants_planned: 50
    },
    {
      id: PROJ_UNRELATED_ID,
      name: 'Galderma India',
      project_code: 'GLD-IND',
      parentId: null,
      zone: 'West',
      participants_planned: 80
    }
  ]);

  await User.bulkCreate([
    {
      id: USER_OM_AUTH_ID,
      name: 'Authorized Operation Manager',
      email: 'om.auth@unilever.com',
      password: 'password_hash_123',
      roleId: ROLE_OM_ID,
      status: 'Active',
      projectId: null
    },
    {
      id: USER_OM_UNASSIGNED_ID,
      name: 'Unassigned Operation Manager',
      email: 'om.unassigned@retailedgepro.in',
      password: 'password_hash_123',
      roleId: ROLE_OM_ID,
      status: 'Active',
      projectId: null
    },
    {
      id: USER_PM_ID,
      name: 'Program Manager Unilever',
      email: 'pm@unilever.com',
      password: 'password_hash_123',
      roleId: ROLE_PM_ID,
      status: 'Active',
      projectId: PROJ_PARENT_ID
    },
    {
      id: USER_TRAINER_PARENT_ID,
      name: 'Parent Trainer Alice',
      email: 'trainer.parent@unilever.com',
      password: 'password_hash_123',
      roleId: ROLE_TRAINER_ID,
      status: 'Active',
      projectId: PROJ_PARENT_ID,
      employee_id: 'TR_UNI_01',
      designation: 'Senior Lead Trainer',
      location: 'Mumbai'
    },
    {
      id: USER_TRAINER_UNREL_ID,
      name: 'Unrelated Trainer Bob',
      email: 'trainer.unrelated@galderma.com',
      password: 'password_hash_123',
      roleId: ROLE_TRAINER_ID,
      status: 'Active',
      projectId: PROJ_UNRELATED_ID,
      employee_id: 'TR_GLD_01',
      designation: 'Clinical Specialist',
      location: 'Bangalore'
    },
    {
      id: USER_SUPERVISOR_ID,
      name: 'Store Supervisor Steve',
      email: 'supervisor@unilever.com',
      password: 'password_hash_123',
      roleId: ROLE_SUPERVISOR_ID,
      status: 'Active',
      projectId: PROJ_CHILD_ID
    },
    {
      id: USER_CLIENT_ID,
      name: 'Client Unilever Lead',
      email: 'client@unilever.com',
      password: 'password_hash_123',
      roleId: ROLE_CLIENT_ID,
      status: 'Active',
      projectId: PROJ_PARENT_ID
    },
    {
      id: USER_EMP_CHILD_ID,
      name: 'Learner Charlie (Child Proj)',
      email: 'learner.child@unilever.com',
      password: 'password_hash_123',
      roleId: ROLE_EMPLOYEE_ID,
      status: 'Active',
      projectId: PROJ_CHILD_ID,
      employee_id: 'EMP_U_CHILD_01',
      designation: 'Store Associate',
      location: 'Delhi',
      managerId: USER_SUPERVISOR_ID
    },
    {
      id: USER_EMP_UNREL_ID,
      name: 'Learner Diana (Unrelated Proj)',
      email: 'learner.unrel@galderma.com',
      password: 'password_hash_123',
      roleId: ROLE_EMPLOYEE_ID,
      status: 'Active',
      projectId: PROJ_UNRELATED_ID,
      employee_id: 'EMP_G_UNREL_01',
      designation: 'Beauty Advisor',
      location: 'Pune'
    },
    {
      id: USER_EMP_UNASSIGNED_ID,
      name: 'Learner Edward (Unassigned)',
      email: 'learner.unassigned@retailedgepro.in',
      password: 'password_hash_123',
      roleId: ROLE_EMPLOYEE_ID,
      status: 'Active',
      projectId: null,
      employee_id: 'EMP_UNASSIGNED_01',
      designation: 'Trainee',
      location: 'N/A'
    },
    {
      id: USER_ADMIN_ID,
      name: 'Platform Administrator',
      email: 'admin@retailedgepro.in',
      password: 'password_hash_123',
      roleId: ROLE_ADMIN_ID,
      status: 'Active',
      projectId: null
    }
  ]);

  await ProjectAssignment.bulkCreate([
    { id: 'asgn-1', userId: USER_OM_AUTH_ID, projectId: PROJ_PARENT_ID, role: 'Operation Manager', status: 'Active', zone: 'North' },
    { id: 'asgn-2', userId: USER_PM_ID, projectId: PROJ_PARENT_ID, role: 'Program Manager', status: 'Active', zone: 'North' },
    { id: 'asgn-3', userId: USER_TRAINER_PARENT_ID, projectId: PROJ_PARENT_ID, role: 'Trainer', status: 'Active', zone: 'North' },
    { id: 'asgn-4', userId: USER_TRAINER_UNREL_ID, projectId: PROJ_UNRELATED_ID, role: 'Trainer', status: 'Active', zone: 'West' },
    { id: 'asgn-5', userId: USER_SUPERVISOR_ID, projectId: PROJ_CHILD_ID, role: 'Supervisor', status: 'Active', zone: 'North' },
    { id: 'asgn-6', userId: USER_CLIENT_ID, projectId: PROJ_PARENT_ID, role: 'Client', status: 'Active', zone: 'North' },
    { id: 'asgn-7', userId: USER_EMP_CHILD_ID, projectId: PROJ_CHILD_ID, role: 'Employee', status: 'Active', zone: 'North' },
    { id: 'asgn-8', userId: USER_EMP_UNREL_ID, projectId: PROJ_UNRELATED_ID, role: 'Employee', status: 'Active', zone: 'West' }
  ]);

  await Training.bulkCreate([
    {
      id: TRAIN_PARENT_ID,
      title: 'Unilever Parent Orientation',
      description: 'Corporate overview and guidelines',
      type: 'Course',
      url: 'https://cdn.example.com/parent.mp4',
      projectId: PROJ_PARENT_ID,
      duration: 30,
      trainerId: USER_TRAINER_PARENT_ID
    },
    {
      id: TRAIN_CHILD_ID,
      title: 'Direct Store Daily Operations',
      description: 'Store floor procedure',
      type: 'Course',
      url: 'https://cdn.example.com/child.mp4',
      projectId: PROJ_CHILD_ID,
      duration: 45,
      trainerId: USER_TRAINER_PARENT_ID
    },
    {
      id: TRAIN_UNREL_ID,
      title: 'Galderma Skin Science',
      description: 'Dermatological formulas',
      type: 'Course',
      url: 'https://cdn.example.com/galderma.mp4',
      projectId: PROJ_UNRELATED_ID,
      duration: 60,
      trainerId: USER_TRAINER_UNREL_ID
    },
    {
      id: TRAIN_GLOBAL_ID,
      title: 'Global Code of Conduct',
      description: 'Applicable to all organizations',
      type: 'Course',
      url: 'https://cdn.example.com/compliance.pdf',
      projectId: null,
      duration: 15,
      trainerId: null
    }
  ]);

  await Quiz.bulkCreate([
    {
      id: QUIZ_CHILD_ID,
      title: 'Store Operations Assessment',
      projectId: PROJ_CHILD_ID,
      creatorId: USER_TRAINER_PARENT_ID,
      config: { isOffline: false, passing_score: 70 }
    },
    {
      id: QUIZ_UNREL_ID,
      title: 'Galderma Assessment',
      projectId: PROJ_UNRELATED_ID,
      creatorId: USER_TRAINER_UNREL_ID,
      config: { isOffline: false, passing_score: 70 }
    }
  ]);

  await Question.bulkCreate([
    { id: 'q-child-1', text: 'Store shelf restocking priority?', quizId: QUIZ_CHILD_ID, correct_answer: 'A', points: 100 },
    { id: 'q-unrel-1', text: 'Moisturizer barrier efficacy?', quizId: QUIZ_UNREL_ID, correct_answer: 'B', points: 100 }
  ]);

  await Session.bulkCreate([
    {
      id: SESS_CHILD_ID,
      session_name: 'Unilever Child Morning Session',
      roomCode: 'UNI-CHILD-01',
      projectId: PROJ_CHILD_ID,
      quizId: QUIZ_CHILD_ID,
      status: 'finished',
      hostId: USER_TRAINER_PARENT_ID,
      startedAt: new Date('2026-10-10T10:00:00Z')
    },
    {
      id: SESS_UNREL_ID,
      session_name: 'Galderma West Afternoon Session',
      roomCode: 'GLD-UNREL-01',
      projectId: PROJ_UNRELATED_ID,
      quizId: QUIZ_UNREL_ID,
      status: 'finished',
      hostId: USER_TRAINER_UNREL_ID,
      startedAt: new Date('2026-10-12T14:00:00Z')
    }
  ]);

  await Participant.bulkCreate([
    {
      id: 'part-c-1',
      name: 'Learner Charlie (Child Proj)',
      employeeId: 'EMP_U_CHILD_01',
      userId: USER_EMP_CHILD_ID,
      score: 90,
      sessionId: SESS_CHILD_ID
    },
    {
      id: 'part-u-1',
      name: 'Learner Diana (Unrelated Proj)',
      employeeId: 'EMP_G_UNREL_01',
      userId: USER_EMP_UNREL_ID,
      score: 85,
      sessionId: SESS_UNREL_ID
    }
  ]);

  await Response.bulkCreate([
    {
      id: 'resp-c-1',
      participantId: 'part-c-1',
      questionId: 'q-child-1',
      answer: 'A',
      points_awarded: 90,
      is_correct: true,
      response_time: 15000
    },
    {
      id: 'resp-u-1',
      participantId: 'part-u-1',
      questionId: 'q-unrel-1',
      answer: 'B',
      points_awarded: 85,
      is_correct: true,
      response_time: 20000
    }
  ]);

  await Certificate.bulkCreate([
    {
      id: CERT_CHILD_ID,
      certificate_id: 'CERT-UNI-0001',
      verificationToken: 'tok-uni-1',
      qrCode: 'qr-uni-1',
      projectId: PROJ_CHILD_ID,
      userId: USER_EMP_CHILD_ID,
      status: 'ISSUED',
      assessmentScore: 90
    },
    {
      id: CERT_UNREL_ID,
      certificate_id: 'CERT-GLD-0002',
      verificationToken: 'tok-gld-2',
      qrCode: 'qr-gld-2',
      projectId: PROJ_UNRELATED_ID,
      userId: USER_EMP_UNREL_ID,
      status: 'ISSUED',
      assessmentScore: 85
    }
  ]);
}

// ── 5. AUTH TOKEN GENERATION ──
function makeToken(user, roleName) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: roleName,
      projectId: user.projectId
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// ── 6. MAIN VERIFICATION SUITE ──
async function runOperationManagerTestSuite() {
  console.log('========================================================================');
  console.log('RETAILEDGE PRO — PHASE 1 OPERATION MANAGER RBAC & SCOPE VERIFICATION');
  console.log('========================================================================\n');

  await seedDatabase();

  // Create Express App
  const app = express();
  app.use(express.json());

  // Mount real route handlers
  app.use('/api/projects', require('../routes/projects'));
  app.use('/api/trainings', require('../routes/trainings'));
  app.use('/api/reports', require('../routes/reports'));
  app.use('/api/users', require('../routes/users'));
  app.use('/api/certificates', require('../routes/certificates'));
  app.use('/api/quizzes', require('../routes/quiz'));
  app.use('/api/roles', require('../routes/roles'));

  const server = http.createServer(app);
  await new Promise(res => server.listen(0, res));
  const port = server.address().port;
  const BASE_URL = `http://127.0.0.1:${port}/api`;

  const tokenOMAuth   = makeToken({ id: USER_OM_AUTH_ID, email: 'om.auth@unilever.com', name: 'Authorized OM', projectId: null }, 'Operation Manager');
  const tokenOMUnasgn = makeToken({ id: USER_OM_UNASSIGNED_ID, email: 'om.unasgn@retailedgepro.in', name: 'Unassigned OM', projectId: null }, 'Operation Manager');
  const tokenTrParent = makeToken({ id: USER_TRAINER_PARENT_ID, email: 'trainer.parent@unilever.com', name: 'Trainer Alice', projectId: PROJ_PARENT_ID }, 'Trainer');
  const tokenSup      = makeToken({ id: USER_SUPERVISOR_ID, email: 'supervisor@unilever.com', name: 'Supervisor Steve', projectId: PROJ_CHILD_ID }, 'Supervisor');
  const tokenClient   = makeToken({ id: USER_CLIENT_ID, email: 'client@unilever.com', name: 'Client Lead', projectId: PROJ_PARENT_ID }, 'Client');
  const tokenAdmin    = makeToken({ id: USER_ADMIN_ID, email: 'admin@retailedgepro.in', name: 'Platform Admin', projectId: null }, 'Admin');
  const tokenPM       = makeToken({ id: USER_PM_ID, email: 'pm@unilever.com', name: 'Program Manager', projectId: PROJ_PARENT_ID }, 'Program Manager');

  const headersOMAuth   = { Authorization: `Bearer ${tokenOMAuth}` };
  const headersOMUnasgn = { Authorization: `Bearer ${tokenOMUnasgn}` };
  const headersTrParent = { Authorization: `Bearer ${tokenTrParent}` };
  const headersSup      = { Authorization: `Bearer ${tokenSup}` };
  const headersClient   = { Authorization: `Bearer ${tokenClient}` };
  const headersAdmin    = { Authorization: `Bearer ${tokenAdmin}` };
  const headersPM       = { Authorization: `Bearer ${tokenPM}` };

  try {
    // ══════════════════════════════════════════════════════════════════════════
    // SECTION 1: Authorized Operation Manager Project Retrieval & Scope
    // ══════════════════════════════════════════════════════════════════════════
    console.log('--- SECTION 1: AUTHORIZED OPERATION MANAGER PROJECT RETRIEVAL & SCOPE ---');

    // 1.1 GET /api/projects returns authorized parent and child subprojects, excludes unrelated
    const resProjects = await axios.get(`${BASE_URL}/projects`, { headers: headersOMAuth });
    assert(resProjects.status === 200, 'OM GET /api/projects returns HTTP 200');
    const returnedProjectIds = resProjects.data.map(p => p.id);
    assert(
      returnedProjectIds.includes(PROJ_PARENT_ID) && returnedProjectIds.includes(PROJ_CHILD_ID),
      'OM receives assigned parent project and inherited child subproject'
    );
    assert(
      !returnedProjectIds.includes(PROJ_UNRELATED_ID),
      'OM project list strictly excludes unrelated project (Galderma)'
    );

    // 1.2 GET /api/projects/:id for authorized parent and child
    const resParent = await axios.get(`${BASE_URL}/projects/${PROJ_PARENT_ID}`, { headers: headersOMAuth });
    assert(resParent.status === 200 && resParent.data.name === 'Unilever International', 'OM retrieves assigned parent project details (HTTP 200)');

    const resChild = await axios.get(`${BASE_URL}/projects/${PROJ_CHILD_ID}`, { headers: headersOMAuth });
    assert(resChild.status === 200 && resChild.data.name === 'Unilever Direct Store', 'OM retrieves child subproject details via parent inheritance (HTTP 200)');

    // 1.3 GET /api/projects/my-projects
    const resMyProjects = await axios.get(`${BASE_URL}/projects/my-projects`, { headers: headersOMAuth });
    assert(resMyProjects.status === 200, 'OM GET /api/projects/my-projects returns HTTP 200');
    const myProjectIds = resMyProjects.data.map(p => p.id);
    assert(myProjectIds.includes(PROJ_PARENT_ID) && myProjectIds.includes(PROJ_CHILD_ID), 'my-projects includes parent & child');
    assert(!myProjectIds.includes(PROJ_UNRELATED_ID), 'my-projects strictly excludes unrelated project');

    // 1.4 GET /api/projects/participants
    const resParts = await axios.get(`${BASE_URL}/projects/participants`, { headers: headersOMAuth });
    assert(resParts.status === 200, 'OM GET /api/projects/participants returns HTTP 200');
    const partsList = Array.isArray(resParts.data) ? resParts.data : (resParts.data.participants || []);
    const partEmpIds = partsList.map(p => p.employeeId);
    assert(partEmpIds.includes('EMP_U_CHILD_01'), 'Participants include child project employee');
    assert(!partEmpIds.includes('EMP_G_UNREL_01'), 'Participants strictly exclude unrelated project employee');

    // 1.5 GET /api/projects/intelligence
    const resIntel = await axios.get(`${BASE_URL}/projects/intelligence`, { headers: headersOMAuth });
    assert(resIntel.status === 200 && resIntel.data.kpis !== undefined, 'OM GET /api/projects/intelligence returns HTTP 200 with KPI metrics');

    // 1.6 GET /api/projects/:id/team
    const resTeam = await axios.get(`${BASE_URL}/projects/${PROJ_PARENT_ID}/team`, { headers: headersOMAuth });
    assert(resTeam.status === 200 && Array.isArray(resTeam.data.team), 'OM GET /api/projects/:id/team returns team directory for authorized project');

    // ══════════════════════════════════════════════════════════════════════════
    // SECTION 2: Project & Report Endpoints Return Authorized Data Only
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- SECTION 2: PROJECT & REPORT ENDPOINTS RETURN AUTHORIZED DATA ONLY ---');

    // 2.1 GET /api/reports/attendance
    const resAttendance = await axios.get(`${BASE_URL}/reports/attendance`, { headers: headersOMAuth });
    assert(resAttendance.status === 200, 'OM GET /api/reports/attendance returns HTTP 200');
    assert(Array.isArray(resAttendance.data.quizAttendance) && Array.isArray(resAttendance.data.projects), 'Attendance payload contains operational quiz and project lists');

    // 2.2 GET /api/reports/gamification
    const resGamification = await axios.get(`${BASE_URL}/reports/gamification`, { headers: headersOMAuth });
    assert(resGamification.status === 200, 'OM GET /api/reports/gamification returns HTTP 200');
    const gamificationProjectIds = (resGamification.data.accessibleProjects || []).map(p => p.id);
    assert(gamificationProjectIds.includes(PROJ_PARENT_ID), 'Gamification projects include authorized parent project');
    assert(!gamificationProjectIds.includes(PROJ_UNRELATED_ID), 'Gamification projects strictly exclude unrelated project');

    // 2.3 GET /api/reports/leaderboard
    const resLeaderboard = await axios.get(`${BASE_URL}/reports/leaderboard`, { headers: headersOMAuth });
    assert(resLeaderboard.status === 200, 'OM GET /api/reports/leaderboard returns HTTP 200');
    const leaderboardNames = resLeaderboard.data.map(l => l.name);
    assert(leaderboardNames.includes('Learner Charlie (Child Proj)'), 'Leaderboard includes authorized child participant');
    assert(!leaderboardNames.includes('Learner Diana (Unrelated Proj)'), 'Leaderboard strictly excludes foreign participant');

    // 2.4 GET /api/reports/:sessionId for authorized session
    const resSession = await axios.get(`${BASE_URL}/reports/${SESS_CHILD_ID}`, { headers: headersOMAuth });
    assert(resSession.status === 200, 'OM retrieves session report for authorized child project (HTTP 200)');

    // 2.5 GET /api/trainings
    const resTrainings = await axios.get(`${BASE_URL}/trainings`, { headers: headersOMAuth });
    assert(resTrainings.status === 200, 'OM GET /api/trainings returns HTTP 200');
    const returnedTrainIds = resTrainings.data.map(t => t.id);
    assert(returnedTrainIds.includes(TRAIN_PARENT_ID) && returnedTrainIds.includes(TRAIN_CHILD_ID), 'Trainings include parent and child project materials');
    assert(!returnedTrainIds.includes(TRAIN_UNREL_ID), 'Trainings strictly exclude unrelated project material');

    // 2.6 GET /api/quizzes
    const resQuizzes = await axios.get(`${BASE_URL}/quizzes`, { headers: headersOMAuth });
    assert(resQuizzes.status === 200, 'OM GET /api/quizzes returns HTTP 200');
    const returnedQuizIds = resQuizzes.data.map(q => q.id);
    assert(returnedQuizIds.includes(QUIZ_CHILD_ID), 'Quizzes include child project quiz');
    assert(!returnedQuizIds.includes(QUIZ_UNREL_ID), 'Quizzes strictly exclude unrelated project quiz');

    // 2.7 GET /api/certificates
    const resCerts = await axios.get(`${BASE_URL}/certificates`, { headers: headersOMAuth });
    assert(resCerts.status === 200, 'OM GET /api/certificates returns HTTP 200');
    const certList = Array.isArray(resCerts.data) ? resCerts.data : (resCerts.data.certificates || []);
    const certIds = certList.map(c => c.id);
    assert(certIds.includes(CERT_CHILD_ID), 'Certificates include child project certificate');
    assert(!certIds.includes(CERT_UNREL_ID), 'Certificates strictly exclude unrelated project certificate');

    // ══════════════════════════════════════════════════════════════════════════
    // SECTION 3: Unassigned and Unrelated Project Access Rejection (HTTP 403)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- SECTION 3: UNASSIGNED AND UNRELATED PROJECT ACCESS REJECTION (HTTP 403) ---');

    // 3.1 Authorized OM accessing foreign project -> 403
    try {
      await axios.get(`${BASE_URL}/projects/${PROJ_UNRELATED_ID}`, { headers: headersOMAuth });
      assert(false, 'OM accessing foreign project should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `OM foreign project access rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 3.2 Authorized OM accessing foreign project trainers -> 403
    try {
      await axios.get(`${BASE_URL}/projects/${PROJ_UNRELATED_ID}/trainers`, { headers: headersOMAuth });
      assert(false, 'OM accessing foreign project trainers should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `OM foreign project trainers rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 3.3 Authorized OM accessing foreign project team -> 403
    try {
      await axios.get(`${BASE_URL}/projects/${PROJ_UNRELATED_ID}/team`, { headers: headersOMAuth });
      assert(false, 'OM accessing foreign project team should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `OM foreign project team rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 3.4 Authorized OM accessing foreign session report -> 403
    try {
      await axios.get(`${BASE_URL}/reports/${SESS_UNREL_ID}`, { headers: headersOMAuth });
      assert(false, 'OM accessing foreign session report should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `OM foreign session report rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 3.5 Authorized OM deleting session report -> 403 (OM cannot delete reports)
    try {
      await axios.delete(`${BASE_URL}/reports/${SESS_CHILD_ID}`, { headers: headersOMAuth });
      assert(false, 'OM deleting session report should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `OM report deletion rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 3.6 Unassigned OM accessing projects -> returns empty array
    const resUnasgnProjects = await axios.get(`${BASE_URL}/projects`, { headers: headersOMUnasgn });
    assert(resUnasgnProjects.status === 200 && resUnasgnProjects.data.length === 0, 'Unassigned OM GET /api/projects returns empty list []');

    // 3.7 Unassigned OM accessing specific project -> 403 Forbidden
    try {
      await axios.get(`${BASE_URL}/projects/${PROJ_PARENT_ID}`, { headers: headersOMUnasgn });
      assert(false, 'Unassigned OM accessing project should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `Unassigned OM project access rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 3.8 Unassigned OM accessing attendance -> returns empty summary safely
    const resUnasgnAtt = await axios.get(`${BASE_URL}/reports/attendance`, { headers: headersOMUnasgn });
    assert(resUnasgnAtt.status === 200 && resUnasgnAtt.data.logs.length === 0, 'Unassigned OM attendance returns empty state gracefully');

    // 3.9 Unassigned OM accessing certificates -> 403 Forbidden
    try {
      await axios.get(`${BASE_URL}/certificates`, { headers: headersOMUnasgn });
      assert(false, 'Unassigned OM accessing certificates should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `Unassigned OM certificates access rejected with HTTP 403: got ${err.response?.status}`);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SECTION 4: Training Scheduling & Meeting Management with Trainer Eligibility
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- SECTION 4: TRAINING SCHEDULING & MEETING MANAGEMENT WITH TRAINER ELIGIBILITY ---');

    // 4.1 OM schedules meeting on authorized child project with inherited parent trainer -> 201 Created
    const resScheduleOk = await axios.post(
      `${BASE_URL}/trainings/schedule-meeting`,
      {
        title: 'Q4 Operations Kickoff',
        description: 'Store targets review',
        projectId: PROJ_CHILD_ID,
        trainerId: USER_TRAINER_PARENT_ID, // Inherited from parent project
        scheduledAt: '2026-11-01 10:00:00',
        url: 'https://meet.jit.si/Q4OpsKickoff'
      },
      { headers: headersOMAuth }
    );
    assert(resScheduleOk.status === 201 && resScheduleOk.data.meeting !== undefined, 'OM successfully schedules meeting on child project using inherited parent trainer');

    // 4.2 OM schedules meeting with ineligible trainer from foreign project -> 400 Bad Request
    try {
      await axios.post(
        `${BASE_URL}/trainings/schedule-meeting`,
        {
          title: 'Illegal Trainer Scheduling',
          projectId: PROJ_CHILD_ID,
          trainerId: USER_TRAINER_UNREL_ID, // Trainer belongs to Galderma, not Unilever
          scheduledAt: '2026-11-02 11:00:00',
          url: 'https://meet.jit.si/IllegalTrainer'
        },
        { headers: headersOMAuth }
      );
      assert(false, 'Scheduling with ineligible foreign trainer should have returned 400');
    } catch (err) {
      assert(err.response?.status === 400, `Scheduling with foreign trainer rejected with HTTP 400: "${err.response?.data?.error}"`);
    }

    // 4.3 OM schedules meeting on unauthorized foreign project -> 403 Forbidden
    try {
      await axios.post(
        `${BASE_URL}/trainings/schedule-meeting`,
        {
          title: 'Unauthorized Project Scheduling',
          projectId: PROJ_UNRELATED_ID,
          trainerId: USER_TRAINER_UNREL_ID,
          scheduledAt: '2026-11-03 14:00:00',
          url: 'https://meet.jit.si/UnauthorizedProj'
        },
        { headers: headersOMAuth }
      );
      assert(false, 'Scheduling on unauthorized project should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `Scheduling on foreign project rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 4.4 OM schedules meeting without specifying project -> 400 Bad Request
    try {
      await axios.post(
        `${BASE_URL}/trainings/schedule-meeting`,
        {
          title: 'Meeting Without Project',
          scheduledAt: '2026-11-04 15:00:00',
          url: 'https://meet.jit.si/NoProj'
        },
        { headers: headersOMAuth }
      );
      assert(false, 'Scheduling meeting without project should have returned 400');
    } catch (err) {
      assert(err.response?.status === 400, `Scheduling meeting without project rejected with HTTP 400: got ${err.response?.status}`);
    }

    // 4.5 OM creates training material on authorized project -> 201 Created
    const resCreateTrain = await axios.post(
      `${BASE_URL}/trainings`,
      {
        title: 'New SOP Checklist',
        description: 'Daily hygiene SOP',
        type: 'Course',
        url: 'https://cdn.example.com/sop.pdf',
        projectId: PROJ_CHILD_ID
      },
      { headers: headersOMAuth }
    );
    assert(resCreateTrain.status === 201 && resCreateTrain.data.id, 'OM creates training material in authorized project (HTTP 201)');

    // 4.6 OM creating training material on foreign project -> 403 Forbidden
    try {
      await axios.post(
        `${BASE_URL}/trainings`,
        {
          title: 'Foreign Material',
          url: 'https://cdn.example.com/foreign.pdf',
          projectId: PROJ_UNRELATED_ID
        },
        { headers: headersOMAuth }
      );
      assert(false, 'Creating training material in foreign project should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `Creating training in foreign project rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 4.7 OM updates training material on authorized project -> 200 OK
    const resUpdateTrain = await axios.put(
      `${BASE_URL}/trainings/${TRAIN_CHILD_ID}`,
      { title: 'Updated Child Operations Manual' },
      { headers: headersOMAuth }
    );
    assert(resUpdateTrain.status === 200, 'OM updates training material in authorized project (HTTP 200)');

    // 4.8 OM updating training material on foreign project -> 403 Forbidden
    try {
      await axios.put(
        `${BASE_URL}/trainings/${TRAIN_UNREL_ID}`,
        { title: 'Unauthorized Modification' },
        { headers: headersOMAuth }
      );
      assert(false, 'Updating training in foreign project should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `Updating training in foreign project rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 4.9 OM updating global training material -> 403 Forbidden
    try {
      await axios.put(
        `${BASE_URL}/trainings/${TRAIN_GLOBAL_ID}`,
        { title: 'Unauthorized Global Modification' },
        { headers: headersOMAuth }
      );
      assert(false, 'Updating global training should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `Updating global training rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 4.10 OM deleting training material on authorized project -> 200 OK
    const resDeleteTrain = await axios.delete(
      `${BASE_URL}/trainings/${TRAIN_CHILD_ID}`,
      { headers: headersOMAuth }
    );
    assert(resDeleteTrain.status === 200, 'OM deletes training material in authorized project (HTTP 200)');

    // 4.11 OM deleting training material on foreign project -> 403 Forbidden
    try {
      await axios.delete(
        `${BASE_URL}/trainings/${TRAIN_UNREL_ID}`,
        { headers: headersOMAuth }
      );
      assert(false, 'Deleting training in foreign project should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `Deleting training in foreign project rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 4.12 OM deleting global training material -> 403 Forbidden
    try {
      await axios.delete(
        `${BASE_URL}/trainings/${TRAIN_GLOBAL_ID}`,
        { headers: headersOMAuth }
      );
      assert(false, 'Deleting global training should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `Deleting global training rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 4.13 OM quiz creation without projectId -> 400 Bad Request
    try {
      await axios.post(
        `${BASE_URL}/quizzes`,
        { title: 'Global Quiz Attempt', questions: [{ text: 'Q1?', correct_answer: 'A' }] },
        { headers: headersOMAuth }
      );
      assert(false, 'OM creating quiz without projectId should have returned 400');
    } catch (err) {
      assert(err.response?.status === 400, `OM creating quiz without projectId rejected with HTTP 400: got ${err.response?.status}`);
    }

    // 4.14 OM quiz creation with authorized projectId -> 201/200 OK
    const resCreateQuiz = await axios.post(
      `${BASE_URL}/quizzes`,
      { title: 'OM Authorized Quiz', projectId: PROJ_CHILD_ID, questions: [{ text: 'Q1?', correct_answer: 'A' }] },
      { headers: headersOMAuth }
    );
    assert([200, 201].includes(resCreateQuiz.status), 'OM creates quiz in authorized project (HTTP 201/200)');
    const createdQuizId = resCreateQuiz.data.id;

    // 4.15 OM quiz creation with foreign projectId -> 403 Forbidden
    try {
      await axios.post(
        `${BASE_URL}/quizzes`,
        { title: 'Foreign Quiz Attempt', projectId: PROJ_UNRELATED_ID, questions: [{ text: 'Q1?', correct_answer: 'A' }] },
        { headers: headersOMAuth }
      );
      assert(false, 'OM creating quiz in foreign project should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `OM creating quiz in foreign project rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 4.16 OM quiz update reassigning to foreign projectId -> 403 Forbidden
    try {
      await axios.put(
        `${BASE_URL}/quizzes/${createdQuizId}`,
        { projectId: PROJ_UNRELATED_ID },
        { headers: headersOMAuth }
      );
      assert(false, 'OM reassigning quiz to foreign project should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `OM reassigning quiz to foreign project rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 4.17 OM quiz update converting to global quiz (projectId: null) -> 403 Forbidden
    try {
      await axios.put(
        `${BASE_URL}/quizzes/${createdQuizId}`,
        { projectId: null },
        { headers: headersOMAuth }
      );
      assert(false, 'OM converting quiz to global quiz should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `OM converting quiz to global quiz rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 4.18 Admin quiz creation globally (projectId: null) -> 200/201 OK
    const resAdminGlobalQuiz = await axios.post(
      `${BASE_URL}/quizzes`,
      { title: 'Admin Global Quiz', projectId: null, questions: [{ text: 'Admin Q?', correct_answer: 'A' }] },
      { headers: headersAdmin }
    );
    assert([200, 201].includes(resAdminGlobalQuiz.status), 'Admin can create global quiz with projectId: null (HTTP 200/201)');

    // ══════════════════════════════════════════════════════════════════════════
    // SECTION 5: User Directory & Certificate Operations Scoping
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- SECTION 5: USER DIRECTORY & CERTIFICATE OPERATIONS SCOPING ---');

    // 5.1 GET /api/users returns only scoped users (self, child/parent users), never foreign or unassigned
    const resUsers = await axios.get(`${BASE_URL}/users`, { headers: headersOMAuth });
    assert(resUsers.status === 200, 'OM GET /api/users returns HTTP 200');
    const userListIds = resUsers.data.map(u => u.id);
    assert(userListIds.includes(USER_EMP_CHILD_ID), 'User directory includes authorized child employee');
    assert(userListIds.includes(USER_OM_AUTH_ID), 'User directory includes the OM themselves');
    assert(!userListIds.includes(USER_EMP_UNREL_ID), 'User directory strictly excludes foreign project employee');
    assert(!userListIds.includes(USER_EMP_UNASSIGNED_ID), 'User directory strictly excludes unassigned employee');

    // 5.2 GET /api/users/:id for authorized child user -> 200 OK
    const resUserChild = await axios.get(`${BASE_URL}/users/${USER_EMP_CHILD_ID}`, { headers: headersOMAuth });
    assert(resUserChild.status === 200 && resUserChild.data.id === USER_EMP_CHILD_ID, 'OM retrieves details of user in authorized project (HTTP 200)');

    // 5.3 GET /api/users/:id for foreign user -> 403 Forbidden
    try {
      await axios.get(`${BASE_URL}/users/${USER_EMP_UNREL_ID}`, { headers: headersOMAuth });
      assert(false, 'Viewing foreign user details should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `Viewing foreign user details rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 5.4 GET /api/users/:id for unassigned user -> 403 Forbidden
    try {
      await axios.get(`${BASE_URL}/users/${USER_EMP_UNASSIGNED_ID}`, { headers: headersOMAuth });
      assert(false, 'Viewing unassigned user details should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `Viewing unassigned user details rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 5.5 PUT /api/users/:id for authorized child user -> 200 OK
    const resUpdateUser = await axios.put(
      `${BASE_URL}/users/${USER_EMP_CHILD_ID}`,
      { designation: 'Senior Store Associate' },
      { headers: headersOMAuth }
    );
    assert(resUpdateUser.status === 200, 'OM updates user in authorized project (HTTP 200)');

    // 5.5.a OM attempting role escalation (roleName: 'Super Admin') -> 403 Forbidden
    try {
      await axios.put(
        `${BASE_URL}/users/${USER_EMP_CHILD_ID}`,
        { roleName: 'Super Admin' },
        { headers: headersOMAuth }
      );
      assert(false, 'OM elevating user to Super Admin should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `OM elevating user to Super Admin rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 5.5.b OM attempting roleId escalation directly -> 403 Forbidden
    try {
      await axios.put(
        `${BASE_URL}/users/${USER_EMP_CHILD_ID}`,
        { roleId: ROLE_SUPER_ADMIN_ID },
        { headers: headersOMAuth }
      );
      assert(false, 'OM setting roleId directly should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `OM setting roleId directly rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 5.5.c OM attempting to alter account status -> 403 Forbidden
    try {
      await axios.put(
        `${BASE_URL}/users/${USER_EMP_CHILD_ID}`,
        { status: 'Inactive' },
        { headers: headersOMAuth }
      );
      assert(false, 'OM modifying account status should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `OM modifying account status rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 5.5.d OM attempting to alter password -> 403 Forbidden
    try {
      await axios.put(
        `${BASE_URL}/users/${USER_EMP_CHILD_ID}`,
        { password: 'hackedPassword123' },
        { headers: headersOMAuth }
      );
      assert(false, 'OM modifying user password should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `OM modifying user password rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 5.5.e PM attempting role escalation -> 403 Forbidden
    try {
      await axios.put(
        `${BASE_URL}/users/${USER_EMP_CHILD_ID}`,
        { roleName: 'Super Admin' },
        { headers: headersPM }
      );
      assert(false, 'PM elevating user to Super Admin should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `PM elevating user to Super Admin rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 5.5.f PM attempting to alter password -> 403 Forbidden
    try {
      await axios.put(
        `${BASE_URL}/users/${USER_EMP_CHILD_ID}`,
        { password: 'pmPasswordChange123' },
        { headers: headersPM }
      );
      assert(false, 'PM modifying user password should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `PM modifying user password rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 5.5.g Admin updating user record -> 200 OK
    const resAdminUpdateUser = await axios.put(
      `${BASE_URL}/users/${USER_EMP_CHILD_ID}`,
      { designation: 'Lead Store Associate' },
      { headers: headersAdmin }
    );
    assert(resAdminUpdateUser.status === 200, 'Admin can update user records (HTTP 200)');

    // 5.6 PUT /api/users/:id for foreign user -> 403 Forbidden
    try {
      await axios.put(
        `${BASE_URL}/users/${USER_EMP_UNREL_ID}`,
        { designation: 'Attempted Update' },
        { headers: headersOMAuth }
      );
      assert(false, 'Updating foreign user should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `Updating foreign user rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 5.6.a OM attempting to modify unassigned user -> 403 Forbidden
    try {
      await axios.put(
        `${BASE_URL}/users/${USER_EMP_UNASSIGNED_ID}`,
        { designation: 'Attempted Adoption' },
        { headers: headersOMAuth }
      );
      assert(false, 'OM modifying unassigned user should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `OM modifying unassigned user rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 5.6.b PM attempting to modify unassigned user -> 403 Forbidden
    try {
      await axios.put(
        `${BASE_URL}/users/${USER_EMP_UNASSIGNED_ID}`,
        { designation: 'Attempted Adoption' },
        { headers: headersPM }
      );
      assert(false, 'PM modifying unassigned user should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `PM modifying unassigned user rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 5.6.c OM legitimate self-update -> 200 OK
    const resOMSelfUpdate = await axios.put(
      `${BASE_URL}/users/${USER_OM_AUTH_ID}`,
      { phone: '+91 9876543210' },
      { headers: headersOMAuth }
    );
    assert(resOMSelfUpdate.status === 200, 'OM can update their own profile (HTTP 200)');

    // 5.7 GET /api/users/hierarchy/:id for authorized user -> 200 OK
    const resHierarchyChild = await axios.get(`${BASE_URL}/users/hierarchy/${USER_EMP_CHILD_ID}`, { headers: headersOMAuth });
    assert(resHierarchyChild.status === 200, 'OM views hierarchy for authorized user (HTTP 200)');

    // 5.8 GET /api/users/hierarchy/:id for foreign user -> 403 Forbidden
    try {
      await axios.get(`${BASE_URL}/users/hierarchy/${USER_EMP_UNREL_ID}`, { headers: headersOMAuth });
      assert(false, 'Viewing foreign user hierarchy should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `Viewing foreign user hierarchy rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 5.9 Certificates: POST /api/certificates/eligibility
    const resEligOk = await axios.post(
      `${BASE_URL}/certificates/eligibility`,
      { projectId: PROJ_CHILD_ID, passingScore: 70 },
      { headers: headersOMAuth }
    );
    assert(resEligOk.status === 200, 'OM checks certificate eligibility for authorized project (HTTP 200)');

    try {
      await axios.post(
        `${BASE_URL}/certificates/eligibility`,
        { projectId: PROJ_UNRELATED_ID, passingScore: 70 },
        { headers: headersOMAuth }
      );
      assert(false, 'Checking eligibility on foreign project should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `Checking eligibility on foreign project rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 5.10 Certificates: POST /api/certificates/generate
    const resGenCert = await axios.post(
      `${BASE_URL}/certificates/generate`,
      {
        userId: USER_EMP_CHILD_ID,
        projectId: PROJ_CHILD_ID,
        courseName: 'Store Operations',
        completionDate: '2026-10-15',
        score: '90%'
      },
      { headers: headersOMAuth }
    );
    assert(resGenCert.status === 201 && resGenCert.data.certificate, 'OM generates certificate for user in authorized project (HTTP 201)');

    try {
      await axios.post(
        `${BASE_URL}/certificates/generate`,
        {
          userId: USER_EMP_UNREL_ID,
          projectId: PROJ_UNRELATED_ID,
          courseName: 'Galderma Skin',
          completionDate: '2026-10-15'
        },
        { headers: headersOMAuth }
      );
      assert(false, 'Generating certificate for foreign project should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `Generating certificate for foreign project rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 5.10.a Individual generation with foreign participant in authorized project -> 400 Bad Request
    try {
      await axios.post(
        `${BASE_URL}/certificates/generate`,
        {
          userId: USER_EMP_UNREL_ID,
          projectId: PROJ_CHILD_ID,
          courseName: 'Store Operations',
          completionDate: '2026-10-15'
        },
        { headers: headersOMAuth }
      );
      assert(false, 'Generating certificate for foreign participant in child project should have returned 400');
    } catch (err) {
      assert(err.response?.status === 400, `Generating cert for foreign participant rejected with HTTP 400: got ${err.response?.status}`);
    }

    // 5.10.b Bulk certificate generation with foreign participant -> 400 Bad Request
    try {
      await axios.post(
        `${BASE_URL}/certificates/bulk-generate`,
        {
          participantIds: [USER_EMP_UNREL_ID],
          projectId: PROJ_CHILD_ID
        },
        { headers: headersOMAuth }
      );
      assert(false, 'Bulk generating certificates with foreign participant should have returned 400');
    } catch (err) {
      assert(err.response?.status === 400, `Bulk generating with foreign participant rejected with HTTP 400: got ${err.response?.status}`);
    }

    // 5.10.c Atomic bulk generation failure: mixed valid + foreign participant
    const preCount = await Certificate.count({ where: { userId: USER_EMP_CHILD_ID } });
    try {
      await axios.post(
        `${BASE_URL}/certificates/bulk-generate`,
        {
          participantIds: [USER_EMP_CHILD_ID, USER_EMP_UNREL_ID],
          projectId: PROJ_CHILD_ID
        },
        { headers: headersOMAuth }
      );
      assert(false, 'Mixed bulk generation should have failed atomically with HTTP 400');
    } catch (err) {
      assert(err.response?.status === 400, `Mixed bulk generation rejected with HTTP 400: got ${err.response?.status}`);
    }
    const postCount = await Certificate.count({ where: { userId: USER_EMP_CHILD_ID } });
    assert(postCount === preCount, `Zero partial certificates created on bulk validation failure (${preCount} === ${postCount})`);

    // 5.11 Certificates: POST /api/certificates/:id/revoke
    const resRevokeCert = await axios.post(
      `${BASE_URL}/certificates/${CERT_CHILD_ID}/revoke`,
      { reason: 'Administrative Correction' },
      { headers: headersOMAuth }
    );
    assert(resRevokeCert.status === 200, 'OM revokes certificate in authorized project (HTTP 200)');

    try {
      await axios.post(
        `${BASE_URL}/certificates/${CERT_UNREL_ID}/revoke`,
        { reason: 'Illegal Revoke' },
        { headers: headersOMAuth }
      );
      assert(false, 'Revoking foreign certificate should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `Revoking foreign certificate rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 5.12 Certificates: POST /api/certificates/:id/reissue
    const resReissueCert = await axios.post(
      `${BASE_URL}/certificates/${CERT_CHILD_ID}/reissue`,
      { reason: 'Updated Name Spelling' },
      { headers: headersOMAuth }
    );
    assert([200, 201].includes(resReissueCert.status), 'OM reissues certificate in authorized project');

    try {
      await axios.post(
        `${BASE_URL}/certificates/${CERT_UNREL_ID}/reissue`,
        { reason: 'Illegal Reissue' },
        { headers: headersOMAuth }
      );
      assert(false, 'Reissuing foreign certificate should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `Reissuing foreign certificate rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 5.13 Bulk ZIP: OM downloading foreign certificate -> 403 Forbidden
    try {
      await axios.post(
        `${BASE_URL}/certificates/bulk-zip`,
        { certificateIds: [CERT_UNREL_ID] },
        { headers: headersOMAuth }
      );
      assert(false, 'OM downloading foreign certificate via bulk-zip should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `OM downloading foreign certificate via bulk-zip rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 5.14 Bulk ZIP: OM downloading mixed (1 authorized + 1 foreign) -> 403 Forbidden (entire batch rejected)
    try {
      await axios.post(
        `${BASE_URL}/certificates/bulk-zip`,
        { certificateIds: [CERT_CHILD_ID, CERT_UNREL_ID] },
        { headers: headersOMAuth }
      );
      assert(false, 'OM downloading mixed certificates via bulk-zip should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `OM downloading mixed certificates via bulk-zip rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 5.15 Bulk ZIP: OM downloading authorized certificates -> 200 OK with zip header
    const resOMZip = await axios.post(
      `${BASE_URL}/certificates/bulk-zip`,
      { certificateIds: [CERT_CHILD_ID] },
      { headers: headersOMAuth, responseType: 'arraybuffer' }
    );
    assert(resOMZip.status === 200 && resOMZip.headers['content-type'].includes('zip'), 'OM downloads authorized certificate via bulk-zip (HTTP 200 ZIP)');

    // 5.16 Bulk ZIP: Admin downloading certificates across projects -> 200 OK
    const resAdminZip = await axios.post(
      `${BASE_URL}/certificates/bulk-zip`,
      { certificateIds: [CERT_CHILD_ID, CERT_UNREL_ID] },
      { headers: headersAdmin, responseType: 'arraybuffer' }
    );
    assert(resAdminZip.status === 200 && resAdminZip.headers['content-type'].includes('zip'), 'Admin downloads certificates across projects via bulk-zip (HTTP 200 ZIP)');

    // ══════════════════════════════════════════════════════════════════════════
    // SECTION 6: Preserving Existing Client, Trainer & Supervisor Access Rules
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- SECTION 6: PRESERVING EXISTING CLIENT, TRAINER & SUPERVISOR ACCESS RULES ---');

    // 6.1 Client isolated to client project
    const resClientProjects = await axios.get(`${BASE_URL}/projects`, { headers: headersClient });
    const clientProjIds = resClientProjects.data.map(p => p.id);
    assert(clientProjIds.includes(PROJ_PARENT_ID), 'Client retrieves permitted Unilever project');
    assert(!clientProjIds.includes(PROJ_UNRELATED_ID), 'Client cannot see foreign project in project list');

    try {
      await axios.get(`${BASE_URL}/projects/${PROJ_UNRELATED_ID}`, { headers: headersClient });
      assert(false, 'Client accessing foreign project should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `Client accessing foreign project rejected with HTTP 403: got ${err.response?.status}`);
    }

    // 6.2 Trainer isolated to permitted project trainings & meetings
    const resTrTrainings = await axios.get(`${BASE_URL}/trainings`, { headers: headersTrParent });
    assert(resTrTrainings.status === 200, 'Trainer retrieves trainings without regression (HTTP 200)');

    // 6.3 Supervisor access rules: cannot schedule meetings, cannot manage users
    try {
      await axios.post(
        `${BASE_URL}/trainings/schedule-meeting`,
        { title: 'Supervisor Meeting', projectId: PROJ_CHILD_ID },
        { headers: headersSup }
      );
      assert(false, 'Supervisor scheduling meeting should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `Supervisor scheduling rejected with HTTP 403: got ${err.response?.status}`);
    }

    try {
      await axios.get(`${BASE_URL}/users`, { headers: headersSup });
      assert(false, 'Supervisor accessing user management should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `Supervisor user management rejected with HTTP 403: got ${err.response?.status}`);
    }

    try {
      await axios.put(
        `${BASE_URL}/users/${USER_EMP_CHILD_ID}`,
        { designation: 'Supervisor update' },
        { headers: headersSup }
      );
      assert(false, 'Supervisor editing user should have returned 403');
    } catch (err) {
      assert(err.response?.status === 403, `Supervisor editing user rejected with HTTP 403: got ${err.response?.status}`);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SECTION 7: Parent-Project Trainer Inheritance & Cross-Project Isolation
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- SECTION 7: PARENT-PROJECT TRAINER INHERITANCE & CROSS-PROJECT ISOLATION ---');

    // 7.1 GET /api/projects/:childId/trainers returns parent-assigned trainer
    const resChildTrainers = await axios.get(`${BASE_URL}/projects/${PROJ_CHILD_ID}/trainers`, { headers: headersOMAuth });
    assert(resChildTrainers.status === 200, 'GET /api/projects/:childId/trainers returns HTTP 200');
    const trainerIds = resChildTrainers.data.map(t => t.id);
    assert(trainerIds.includes(USER_TRAINER_PARENT_ID), 'Child subproject successfully inherits Parent Trainer Alice');
    assert(!trainerIds.includes(USER_TRAINER_UNREL_ID), 'Child subproject strictly excludes unrelated Trainer Bob');

    // 7.2 Parent project trainer discovery directly
    const resParentTrainers = await axios.get(`${BASE_URL}/projects/${PROJ_PARENT_ID}/trainers`, { headers: headersOMAuth });
    const parentTrainerIds = resParentTrainers.data.map(t => t.id);
    assert(parentTrainerIds.includes(USER_TRAINER_PARENT_ID), 'Parent project lists Parent Trainer Alice');
    assert(!parentTrainerIds.includes(USER_TRAINER_UNREL_ID), 'Parent project strictly excludes unrelated Trainer Bob');

    // Close server
    await new Promise(res => server.close(res));

    console.log('\n========================================================================');
    console.log(`FINAL OPERATION MANAGER RBAC RESULTS: ${PASS} PASSED | ${FAIL} FAILED`);
    console.log('========================================================================\n');

    if (FAIL > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Unexpected test execution error:', error);
    if (server) await new Promise(res => server.close(res));
    process.exit(1);
  }
}

runOperationManagerTestSuite();
