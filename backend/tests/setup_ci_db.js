const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const sequelize = require('../config/database');

// Explicit approved disposable database directory and file constants
const APPROVED_DISPOSABLE_DIR = path.resolve(__dirname, '..');
const APPROVED_DISPOSABLE_FILENAME = 'uat_test_run.sqlite';
const APPROVED_DISPOSABLE_PATH = path.resolve(APPROVED_DISPOSABLE_DIR, APPROVED_DISPOSABLE_FILENAME);

/**
 * Destructive-operation safety guard.
 * Validates environment, complete resolved path, directory ownership, and symlinks.
 * Permits destructive schema synchronisation ONLY for the explicitly designated
 * disposable CI test database at the exact approved path:
 *   <backend>/uat_test_run.sqlite
 */
function validateSafetyGuards() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SAFETY CHECK FAILED: Refusing to run CI fixture setup in production environment!');
  }
  if (process.env.DB_DIALECT !== 'sqlite') {
    throw new Error(`SAFETY CHECK FAILED: DB_DIALECT must be 'sqlite', got '${process.env.DB_DIALECT}'`);
  }
  const storage = process.env.DB_STORAGE;
  if (!storage || typeof storage !== 'string' || storage.trim() === '') {
    throw new Error('SAFETY CHECK FAILED: DB_STORAGE must be explicitly defined and non-empty');
  }

  // 1. Resolve complete canonical absolute storage path
  const resolvedStoragePath = path.resolve(storage);
  const normalizedStorageLower = resolvedStoragePath.toLowerCase();
  const normalizedApprovedLower = APPROVED_DISPOSABLE_PATH.toLowerCase();
  const fileName = path.basename(resolvedStoragePath).toLowerCase();

  // 2. Reject matching filename located in any other directory
  if (normalizedStorageLower !== normalizedApprovedLower) {
    throw new Error(`SAFETY CHECK FAILED: Destructive schema synchronization permitted ONLY for explicitly designated disposable CI test database at '${APPROVED_DISPOSABLE_PATH}'. Target was: '${resolvedStoragePath}'`);
  }

  if (fileName !== APPROVED_DISPOSABLE_FILENAME) {
    throw new Error(`SAFETY CHECK FAILED: Invalid database filename '${fileName}'. Must be '${APPROVED_DISPOSABLE_FILENAME}'.`);
  }

  // 3. Prohibit any path collision with canonical UAT, developer, or production databases
  const canonicalUatPath = path.resolve(__dirname, '../uat_database.sqlite').toLowerCase();
  const defaultDevDbPath = path.resolve(__dirname, '../quizhive.sqlite').toLowerCase();
  const rootDevDbPath = path.resolve(__dirname, '../../quizhive.sqlite').toLowerCase();

  if (normalizedStorageLower === canonicalUatPath) {
    throw new Error('SAFETY CHECK FAILED: Resolved path matches canonical uat_database.sqlite! Destruction forbidden.');
  }
  if (normalizedStorageLower === defaultDevDbPath || normalizedStorageLower === rootDevDbPath) {
    throw new Error('SAFETY CHECK FAILED: Resolved path matches developer quizhive.sqlite! Destruction forbidden.');
  }

  // 4. Resolve and validate real parent directory to prevent symlink-based directory escapes
  const storageParentDir = path.dirname(resolvedStoragePath);
  if (!fs.existsSync(storageParentDir)) {
    throw new Error(`SAFETY CHECK FAILED: Parent directory does not exist: '${storageParentDir}'`);
  }
  const realParentDir = fs.realpathSync(storageParentDir).toLowerCase();
  const realApprovedDir = fs.realpathSync(APPROVED_DISPOSABLE_DIR).toLowerCase();
  if (realParentDir !== realApprovedDir) {
    throw new Error(`SAFETY CHECK FAILED: Real parent directory '${realParentDir}' does not match approved directory '${realApprovedDir}'`);
  }

  // 5. If target file already exists, resolve symlinks and verify underlying realpath
  if (fs.existsSync(resolvedStoragePath)) {
    const realStoragePath = fs.realpathSync(resolvedStoragePath);
    const realStorageLower = realStoragePath.toLowerCase();
    const realStorageDir = path.dirname(realStoragePath).toLowerCase();
    const realStorageFile = path.basename(realStoragePath).toLowerCase();

    // Must still resolve strictly inside the approved directory and be named uat_test_run.sqlite
    if (realStorageDir !== realApprovedDir || realStorageFile !== APPROVED_DISPOSABLE_FILENAME) {
      throw new Error(`SAFETY CHECK FAILED: Database symlink resolves outside approved disposable directory! Resolved real path: '${realStoragePath}'`);
    }

    if (realStorageLower === canonicalUatPath) {
      throw new Error('SAFETY CHECK FAILED: Target symlink resolves to canonical uat_database.sqlite! Destruction forbidden.');
    }
    if (realStorageLower === defaultDevDbPath || realStorageLower === rootDevDbPath) {
      throw new Error('SAFETY CHECK FAILED: Target symlink resolves to developer quizhive.sqlite! Destruction forbidden.');
    }
  }
}

// Complete model set registration
const Role = require('../models/Role');
const Client = require('../models/Client');
const Project = require('../models/Project');
const User = require('../models/User');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Training = require('../models/Training');
const Session = require('../models/Session');
const Participant = require('../models/Participant');
const Response = require('../models/Response');
const TrainingProgress = require('../models/TrainingProgress');
const Certificate = require('../models/Certificate');
const ProjectAssignment = require('../models/ProjectAssignment');
const ReportAudit = require('../models/ReportAudit');
const JitsiAttendance = require('../models/JitsiAttendance');
const JitsiInterval = require('../models/JitsiInterval');
const Escalation = require('../models/Escalation');
const AuditLog = require('../models/AuditLog');
const ExecutiveMetric = require('../models/ExecutiveMetric');
const OfflineSyncDevice = require('../models/OfflineSyncDevice');
const UserQuery = require('../models/UserQuery');

async function setupCIDatabase() {
  validateSafetyGuards();
  console.log(`🛡️ Safety guards passed. Initializing disposable test database (${process.env.DB_STORAGE})...`);

  await sequelize.authenticate();
  await sequelize.sync({ force: true });
  console.log('✅ Complete model schema synchronized successfully.');

  // 1. Roles
  const roles = [
    { role_name: 'Super Admin', permissions: { all: true } },
    { role_name: 'Admin', permissions: { all: true } },
    { role_name: 'HR Admin', permissions: {} },
    { role_name: 'Manager', permissions: {} },
    { role_name: 'Program Manager', permissions: { can_create_quizzes: true } },
    { role_name: 'Trainer', permissions: { can_create_quizzes: true } },
    { role_name: 'Employee', permissions: {} },
    { role_name: 'Client', permissions: { read_only: true } },
    { role_name: 'MD', permissions: { all: true } },
    { role_name: 'COO', permissions: { all: true } },
    { role_name: 'VP Operations', permissions: { all: true } },
    { role_name: 'Operation Manager', permissions: { can_create_quizzes: true } },
    { role_name: 'Supervisor', permissions: {} },
    { role_name: 'T&D Manager', permissions: {} }
  ];
  const roleMap = {};
  for (const r of roles) {
    const created = await Role.create(r);
    roleMap[r.role_name] = created.id;
  }
  console.log('✅ Application roles seeded.');

  // 2. Deterministic Projects (Galderma, Idonneous, and SSEIL from fixture)
  const galderma = await Project.create({
    id: '71350b15-bbcf-4751-8960-821ece052612',
    name: 'Galderma',
    project_code: 'GLD',
    status: 'Active',
    zone: 'North, South, East, West',
    region: 'North Hub',
    territory: 'Galderma Territory',
    participants_planned: 4
  });

  const idonneous = await Project.create({
    id: '1c4c15a4-88fa-4624-a45a-a97a9fac7907',
    name: 'Idonneous (Mother Project)',
    project_code: 'IDN',
    status: 'Active',
    zone: 'West',
    participants_planned: 10
  });

  const fixturePath = path.join(__dirname, 'fixtures/ci_regression_fixtures.json');
  let fixtures = {};
  if (fs.existsSync(fixturePath)) {
    fixtures = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  }

  if (fixtures.sseilProject) {
    await Project.create(fixtures.sseilProject);
  } else {
    await Project.create({
      id: '3190afd0-2ccb-4c07-822d-5af651bbca9e',
      name: 'SSEIL',
      project_code: 'SSL',
      status: 'Active',
      zone: 'North',
      region: 'North Hub',
      territory: 'SSEIL Metro Territory',
      participants_planned: 21
    });
  }
  console.log('✅ Projects seeded (Galderma, Idonneous, SSEIL).');

  // 3. Core Users & Stakeholders
  const passwordHash = await bcrypt.hash('password123', 10);

  // Canonical Admins
  await User.create({
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Super Admin',
    email: 'admin@idonneous.com',
    password: passwordHash,
    roleId: roleMap['Admin'],
    employee_id: 'ADM001',
    status: 'Active'
  });

  await User.create({
    id: '11111111-aaaa-bbbb-cccc-111111111111',
    name: 'Admin User',
    email: 'admin@retailedgepro.com',
    password: passwordHash,
    roleId: roleMap['Admin'],
    employee_id: 'ADM002',
    status: 'Active'
  });

  // Program Managers
  const pmAmol = await User.create({
    id: '22222222-aaaa-bbbb-cccc-222222222222',
    name: 'Amol Mohite',
    email: 'amol.mohite@idonneous.com',
    password: passwordHash,
    roleId: roleMap['Program Manager'],
    employee_id: 'PM001',
    projectId: null,
    status: 'Active'
  });

  const pmYusuf = await User.create({
    id: '00000000-0000-0000-0000-000000000005',
    name: 'Yusuf Khan',
    email: 'yusuf@idonneous.com',
    password: passwordHash,
    roleId: roleMap['Program Manager'],
    employee_id: 'EMP-PM-001',
    projectId: '3190afd0-2ccb-4c07-822d-5af651bbca9e', // SSEIL
    designation: 'Program Manager',
    zone: 'North',
    status: 'Active'
  });

  // Supervisor
  await User.create({
    id: '00000000-0000-0000-0000-000000000010',
    name: 'Sunil Rao',
    email: 'sunil@idonneous.com',
    password: passwordHash,
    roleId: roleMap['Supervisor'],
    employee_id: 'EMP-SUP-001',
    projectId: '3190afd0-2ccb-4c07-822d-5af651bbca9e', // SSEIL
    designation: 'Supervisor',
    zone: 'North',
    status: 'Active'
  });

  // Employee Staff
  await User.create({
    id: '00000000-0000-0000-0000-000000000009',
    name: 'Kavita Joshi',
    email: 'staff@quizhive.com',
    password: passwordHash,
    roleId: roleMap['Employee'],
    employee_id: 'EMP-EMP-001',
    projectId: '3190afd0-2ccb-4c07-822d-5af651bbca9e', // SSEIL
    designation: 'Employee',
    zone: 'North',
    status: 'Active'
  });

  // Trainers (referenced by SSEIL quizzes & sessions)
  await User.create({
    id: '00000000-0000-0000-0000-000000000007',
    name: 'Divya Gaikwad (Trainer)',
    email: 'trainer@quizhive.com',
    password: passwordHash,
    roleId: roleMap['Trainer'],
    employee_id: 'TRN-001',
    status: 'Active'
  });

  await User.create({
    id: '10000000-0000-0000-0001-000000000007',
    name: 'Divya Gaikwad (Trainer)',
    email: 'divya@idonneous.com',
    password: passwordHash,
    roleId: roleMap['Trainer'],
    employee_id: 'TRN-002',
    status: 'Active'
  });

  await User.create({
    id: '00000000-0000-0000-0000-000000000013',
    name: 'Vikram Mehta (Trainer SSEIL)',
    email: 'trainer.sseil@quizhive.com',
    password: passwordHash,
    roleId: roleMap['Trainer'],
    employee_id: 'TRN-003',
    status: 'Active'
  });

  // Client
  await User.create({
    id: '00000000-0000-0000-0000-000000000006',
    name: 'Dr. Pierre',
    email: 'drpierre@galderma.com',
    password: passwordHash,
    roleId: roleMap['Client'],
    employee_id: 'EMP-CLI-001',
    projectId: galderma.id,
    designation: 'Client',
    status: 'Active'
  });

  // T&D Managers
  const tdCharles = await User.create({
    id: '00000000-0000-0000-0000-000000000011',
    name: 'Charles Richardson (T&D)',
    email: 'charles@idonneous.com',
    password: passwordHash,
    roleId: roleMap['T&D Manager'],
    employee_id: 'EMP-TD-001',
    projectId: null,
    status: 'Active'
  });

  const tdB = await User.create({
    id: '10000000-0000-0000-0001-000000000011',
    name: 'Demo T&D Manager',
    email: 'td@quizhive.com',
    password: passwordHash,
    roleId: roleMap['T&D Manager'],
    employee_id: 'EMP-TD-002',
    projectId: null,
    status: 'Active'
  });

  // 12 Idonneous Learners
  const idonLearners = [];
  for (let i = 1; i <= 12; i++) {
    const l = await User.create({
      id: `00000000-0000-0000-0001-0000000000${String(i).padStart(2, '0')}`,
      name: `Idonneous Learner ${i}`,
      email: `learner${i}@idonneous.com`,
      password: passwordHash,
      roleId: roleMap['Employee'],
      employee_id: `IDN-LRN-${String(i).padStart(3, '0')}`,
      projectId: idonneous.id,
      designation: 'Sales Associate',
      status: 'Active'
    });
    idonLearners.push(l);
  }

  // Galderma 4 Trainees
  const galdermaTrainees = [];
  for (let i = 1; i <= 4; i++) {
    const t = await User.create({
      id: `33333333-aaaa-bbbb-cccc-33333333333${i}`,
      name: `Galderma Trainee ${i}`,
      email: `trainee${i}@galderma.com`,
      password: passwordHash,
      roleId: roleMap['Employee'],
      employee_id: `00010${i}`,
      projectId: galderma.id,
      location: ['North', 'South', 'East', 'West'][i - 1],
      status: 'Active'
    });
    galdermaTrainees.push(t);
  }
  console.log('✅ Deterministic users seeded.');

  // 4. Project Assignments
  await ProjectAssignment.create({
    userId: pmAmol.id,
    projectId: idonneous.id,
    role: 'Program Manager',
    status: 'Active'
  });

  await ProjectAssignment.create({
    userId: pmYusuf.id,
    projectId: '3190afd0-2ccb-4c07-822d-5af651bbca9e', // SSEIL
    role: 'Program Manager',
    zone: 'North',
    status: 'Active'
  });

  await ProjectAssignment.create({
    userId: '00000000-0000-0000-0000-000000000010', // Sunil Rao
    projectId: '3190afd0-2ccb-4c07-822d-5af651bbca9e', // SSEIL
    role: 'Supervisor',
    zone: 'North',
    status: 'Active'
  });

  await ProjectAssignment.create({
    userId: tdCharles.id,
    projectId: idonneous.id,
    role: 'T&D Manager',
    status: 'Active'
  });

  await ProjectAssignment.create({
    userId: tdB.id,
    projectId: idonneous.id,
    role: 'T&D Manager',
    status: 'Active'
  });
  console.log('✅ Project assignments seeded.');

  // 5. Load SSEIL Version-Controlled Fixtures (Quizzes, Questions, Sessions, Participants, Responses, ReportAudits)
  if (fixtures.sseilQuizzes && fixtures.sseilQuizzes.length > 0) {
    const parsedQuizzes = fixtures.sseilQuizzes.map(q => ({
      ...q,
      config: typeof q.config === 'string' ? JSON.parse(q.config) : q.config
    }));
    await Quiz.bulkCreate(parsedQuizzes);
  }
  if (fixtures.sseilQuestions && fixtures.sseilQuestions.length > 0) {
    await Question.bulkCreate(fixtures.sseilQuestions);
  }
  if (fixtures.sseilSessions && fixtures.sseilSessions.length > 0) {
    await Session.bulkCreate(fixtures.sseilSessions);
  }
  if (fixtures.sseilParticipants && fixtures.sseilParticipants.length > 0) {
    await Participant.bulkCreate(fixtures.sseilParticipants);
  }
  if (fixtures.sseilResponses && fixtures.sseilResponses.length > 0) {
    await Response.bulkCreate(fixtures.sseilResponses);
  }
  if (fixtures.reportAudits && fixtures.reportAudits.length > 0) {
    const parsedAudits = fixtures.reportAudits.map(r => ({
      ...r,
      snapshotData: typeof r.snapshotData === 'string' ? JSON.parse(r.snapshotData) : r.snapshotData,
      summaryKPIs: typeof r.summaryKPIs === 'string' ? JSON.parse(r.summaryKPIs) : r.summaryKPIs
    }));
    await ReportAudit.bulkCreate(parsedAudits);
  }
  console.log('✅ SSEIL fixtures and ReportAudit snapshots loaded.');

  // 6. Galderma Activity Fixtures (Training, Quiz, Session & 4 Participants: 3 Pass, 1 Fail -> 75% pass, 100% completion, Score 85, Needs Attention)
  const gldTraining = await Training.create({
    id: '44444444-aaaa-bbbb-cccc-444444444444',
    title: 'Galderma Clinical Product Review',
    description: 'August 2026 Core Training Session',
    type: 'Meeting',
    url: 'https://meet.jit.si/Galderma-August-Review',
    projectId: galderma.id,
    scheduledAt: '2026-08-15T10:00:00.000Z',
    duration: '60 mins',
    status: 'Completed'
  });

  const gldQuiz = await Quiz.create({
    id: '55555555-aaaa-bbbb-cccc-555555555555',
    title: 'Galderma Knowledge Check',
    projectId: galderma.id,
    passing_score: 70,
    status: 'Active'
  });

  const gldQuestion = await Question.create({
    id: '66666666-aaaa-bbbb-cccc-666666666666',
    quizId: gldQuiz.id,
    text: 'What is the standard protocol for skin hydration?',
    type: 'single_choice',
    options: ['Protocol A', 'Protocol B', 'Protocol C'],
    correct_answer: 'Protocol A',
    points: 100
  });

  const gldSession = await Session.create({
    id: '77777777-aaaa-bbbb-cccc-777777777777',
    roomCode: 'GALD-AUG-01',
    quizId: gldQuiz.id,
    trainingId: gldTraining.id,
    projectId: galderma.id,
    status: 'finished',
    session_name: 'Galderma August Session',
    startedAt: '2026-08-15T10:00:00.000Z',
    endedAt: '2026-08-15T11:00:00.000Z'
  });

  const gldScores = [100, 80, 90, 50]; // 3 passed (>= 70), 1 failed (< 70)
  for (let i = 0; i < 4; i++) {
    const trainee = galdermaTrainees[i];
    const score = gldScores[i];
    const part = await Participant.create({
      id: `88888888-aaaa-bbbb-cccc-88888888888${i + 1}`,
      sessionId: gldSession.id,
      userId: trainee.id,
      name: trainee.name,
      employeeId: trainee.employee_id,
      score: score,
      zone: trainee.location,
      connectionStatus: 'active'
    });

    await Response.create({
      id: `99999999-aaaa-bbbb-cccc-99999999999${i + 1}`,
      participantId: part.id,
      questionId: gldQuestion.id,
      answer: score >= 70 ? 'Protocol A' : 'Protocol B',
      points_awarded: score >= 70 ? 100 : 0
    });
  }
  console.log('✅ Galderma activity fixtures seeded (4 participants: 3 pass, 1 fail).');

  // 7. Idonneous T&D Hardening Fixtures (Training, Progress, Attendance, Certificates)
  const idonTraining1 = await Training.create({
    id: '11112222-3333-4444-5555-666677778881',
    title: 'Product Knowledge Mastery',
    description: 'Retail Product Knowledge',
    url: 'https://meet.jit.si/idonneous-pk',
    type: 'Meeting',
    projectId: idonneous.id,
    status: 'Completed',
    createdAt: new Date('2026-08-01')
  });

  const idonTraining2 = await Training.create({
    id: '11112222-3333-4444-5555-666677778882',
    title: 'Advanced Sales Conversation',
    description: 'Retail Sales',
    url: 'https://meet.jit.si/idonneous-sales',
    type: 'Meeting',
    projectId: idonneous.id,
    status: 'Completed',
    createdAt: new Date('2026-08-01')
  });

  const idonTraining3 = await Training.create({
    id: '11112222-3333-4444-5555-666677778883',
    title: 'Customer Engagement Essentials',
    description: 'Customer Engagement',
    url: 'https://meet.jit.si/idonneous-engagement',
    type: 'Meeting',
    projectId: idonneous.id,
    status: 'Completed',
    createdAt: new Date('2026-08-01')
  });

  // TrainingProgress for 12 learners: exactly 1 completed out of 12 (1/12 = 8.33% -> 8%)
  for (let i = 0; i < idonLearners.length; i++) {
    const l = idonLearners[i];
    await TrainingProgress.create({
      userId: l.id,
      trainingId: idonTraining1.id,
      completed: i === 0,
      completedAt: i === 0 ? new Date('2026-08-10') : null
    });
  }

  // Attendance for 3 learners: 100%, 70%, 60% (Average = 76.67% -> 77%, 2 risks < 80%)
  const attData = [
    { learner: idonLearners[0], pct: 100 },
    { learner: idonLearners[1], pct: 70 },
    { learner: idonLearners[2], pct: 60 }
  ];
  for (const a of attData) {
    await JitsiAttendance.create({
      userId: a.learner.id,
      participantName: a.learner.name,
      trainingId: idonTraining1.id,
      projectId: idonneous.id,
      attendancePercentage: a.pct,
      status: 'Present',
      firstJoinedAt: new Date('2026-08-05')
    });
  }

  // 4 Certificates issued in August 2026
  for (let i = 1; i <= 4; i++) {
    const certId = `REP-2026-00000${i}`;
    await Certificate.create({
      certificate_id: certId,
      userId: idonLearners[i - 1].id,
      projectId: idonneous.id,
      trainingId: idonTraining1.id,
      status: 'ISSUED',
      issueDate: `2026-08-1${i}`,
      assessmentScore: 85,
      attendancePercentage: 90,
      verificationToken: `vtok_${certId}`,
      qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    });
  }
  console.log('✅ Idonneous T&D fixtures seeded (12 learners, 8% completion, 77% attendance, 4 August certs).');
  console.log('🎉 Disposable CI Database Provisioning Complete!\n');
}

if (require.main === module) {
  setupCIDatabase().then(() => process.exit(0)).catch(err => {
    console.error('❌ CI Database Setup Error:', err.message, err.stack);
    process.exit(1);
  });
}

module.exports = { setupCIDatabase, validateSafetyGuards };
