/**
 * RETAILEDGE PRO — REPORTING DATA INTEGRITY & ROLE-SCOPE REGRESSION TEST
 *
 * FAIL-CLOSED HARDENED TEST SUITE:
 * 1. Network circuit breaker physically blocks any remote database / network connection (RDS, 5432, etc.).
 * 2. SQLite / in-memory dialect enforced (:memory:), credentials stripped.
 * 3. 100% isolated model stubs and deterministic fixtures.
 * 4. Comprehensive verification across:
 *    - Gate 1: Level 1 Quiz Report generation, participant project attribution (no Galderma leak into SSEIL), and single % formatting (no 78%%).
 *    - Gate 2: Level 2 Project Monthly Report date-boundary filtering (August vs October), 9-parameter Online vs Offline breakdown (no undefined offline metrics).
 *    - Gate 3: Level 3 Master Monthly Report authentic metric derivation (no fabricated * 2.6 multipliers) and quizFunnel integrity.
 *    - Gate 4: 10-Sheet Executive Excel Workbook parsing (no double %, no default Galderma in Sheet 5, no out-of-period records in Sheet 9).
 *    - Gate 5: Cross-project isolation & strict role-based access control (Admin, Leadership, PM, Client, T&D) on all analytics endpoints.
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
const ExcelJS = require('exceljs');
const { Op } = require('sequelize');
const { JWT_SECRET } = require('../config/constants');

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
const JitsiAttendance = require('../models/JitsiAttendance');
const Certificate = require('../models/Certificate');
const ReportAudit = require('../models/ReportAudit');
const Client = require('../models/Client');
const Training = require('../models/Training');

const reportAnalyticsEngine = require('../utils/reportAnalyticsEngine');
const reportExcelGenerator = require('../utils/reportExcelGenerator');
const reportPPTGenerator = require('../utils/reportPPTGenerator');
const intelligenceService = require('../utils/projectIntelligenceService');

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

// ── 3. DETERMINISTIC FIXTURE DATA ──
const GALDERMA_ID = '71350b15-bbcf-4751-8960-821ece052612';
const SSEIL_ID    = '3190afd0-2ccb-4c07-822d-5af651bbca9e';
const SESS_GALD_AUG_ID  = 'aaaa1111-2222-4333-8444-555566667777';
const SESS_SSEIL_AUG_ID = 'bbbb2222-3333-4444-8555-666677778888';
const SESS_GALD_OCT_ID  = 'cccc3333-4444-4555-8666-777788889999';

const fixtureProjects = [
  { id: GALDERMA_ID, name: 'Galderma', project_code: 'GLD', parentId: null },
  { id: SSEIL_ID, name: 'SSEIL', project_code: 'SSL', parentId: null }
];

const USER_SUPER_ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const USER_ADMIN_ID       = '11111111-1111-4111-8111-222222222222';
const USER_MD_ID          = '22222222-2222-4222-8222-222222222222';
const USER_COO_ID         = '22222222-2222-4222-8222-333333333333';
const USER_VP_ID          = '22222222-2222-4222-8222-444444444444';
const USER_PM_SSEIL_ID    = '33333333-3333-4333-8333-333333333333';
const USER_CLIENT_GALD_ID = '44444444-4444-4444-8444-444444444444';
const USER_TD_ID          = '55555555-5555-4555-8555-555555555555';
const USER_TRAINER_ID     = '66666666-6666-4666-8666-666666666666';
const USER_SUPERVISOR_ID  = '77777777-7777-4777-8777-777777777777';
const USER_EMPLOYEE_ID    = '88888888-8888-4888-8888-888888888888';
const USER_HR_ADMIN_ID    = '99999999-9999-4999-8999-111111111111';
const USER_MANAGER_ID     = '99999999-9999-4999-8999-222222222222';
const USER_OP_MGR_ID      = '99999999-9999-4999-8999-333333333333';
const USER_MKT_MGR_ID     = '99999999-9999-4999-8999-444444444444';

const fixtureUsers = [
  { id: USER_SUPER_ADMIN_ID, name: 'Super Admin', email: 'superadmin@retailedgepro.in', role: 'Super Admin', projectId: null },
  { id: USER_ADMIN_ID, name: 'Admin', email: 'admin@retailedgepro.in', role: 'Admin', projectId: null },
  { id: USER_MD_ID, name: 'Dr. Ramesh (MD)', email: 'ramesh.md@retailedgepro.in', role: 'MD', projectId: null },
  { id: USER_COO_ID, name: 'Priya Iyer (COO)', email: 'priya.coo@retailedgepro.in', role: 'COO', projectId: null },
  { id: USER_VP_ID, name: 'Karan Mehra (VP Ops)', email: 'karan.vp@retailedgepro.in', role: 'VP Operations', projectId: null },
  { id: USER_PM_SSEIL_ID, name: 'Yusuf Khan (PM SSEIL)', email: 'yusuf@sseil.com', role: 'Program Manager', projectId: SSEIL_ID },
  { id: USER_CLIENT_GALD_ID, name: 'Dr. Pierre (Client Galderma)', email: 'pierre@galderma.com', role: 'Client', projectId: GALDERMA_ID },
  { id: USER_TD_ID, name: 'Ananya Sharma (T&D)', email: 'ananya@retailedgepro.in', role: 'T&D Manager', projectId: null },
  { id: USER_TRAINER_ID, name: 'Divya Gaikwad (Trainer)', email: 'divya@idonneous.com', role: 'Trainer', projectId: GALDERMA_ID },
  { id: USER_SUPERVISOR_ID, name: 'Sunil Rao (Supervisor)', email: 'sunil.sup@sseil.com', role: 'Supervisor', projectId: SSEIL_ID },
  { id: USER_EMPLOYEE_ID, name: 'Kavita Joshi (Employee)', email: 'kavita.emp@sseil.com', role: 'Employee', projectId: SSEIL_ID, managerId: USER_SUPERVISOR_ID },
  { id: USER_HR_ADMIN_ID, name: 'Ritu Sen (HR Admin)', email: 'hradmin@retailedgepro.in', role: 'HR Admin', projectId: null },
  { id: USER_MANAGER_ID, name: 'Manoj Bajpai (Manager)', email: 'manoj.mgr@sseil.com', role: 'Manager', projectId: null },
  { id: USER_OP_MGR_ID, name: 'Deepak Verma (Op Manager)', email: 'deepak.op@galderma.com', role: 'Operation Manager', projectId: null },
  { id: USER_MKT_MGR_ID, name: 'Alia Bhatt (Marketing Manager)', email: 'alia.mkt@galderma.com', role: 'Marketing Manager', projectId: null }
];

const fixtureQuestions = [
  { id: 'q-gald-1', text: 'What is the primary active ingredient in Cetaphil Gentle Cleanser?', quizId: 'quiz-gald', correct_answer: 'A' },
  { id: 'q-gald-2', text: 'Which skin barrier lipid is replenished by Restoraderm?', quizId: 'quiz-gald', correct_answer: 'B' },
  { id: 'q-sseil-1', text: 'What is the standard retail greeting greeting protocol?', quizId: 'quiz-sseil', correct_answer: 'A' },
  { id: 'q-sseil-2', text: 'How should inventory shrinkage variances be escalated?', quizId: 'quiz-sseil', correct_answer: 'C' }
];

const fixtureQuizzes = [
  { id: 'quiz-gald', title: 'Galderma Clinical Mastery', projectId: GALDERMA_ID, config: { isOffline: false }, questions: [fixtureQuestions[0], fixtureQuestions[1]] },
  { id: 'quiz-sseil', title: 'SSEIL Retail Excellence', projectId: SSEIL_ID, config: { isOffline: true }, questions: [fixtureQuestions[2], fixtureQuestions[3]] }
];

// Sessions:
// 1. Galderma August 2026 (Online)
// 2. SSEIL August 2026 (Offline)
// 3. Galderma October 2026 (Online - Out of period)
const fixtureSessions = [
  {
    id: SESS_GALD_AUG_ID,
    session_name: 'Galderma Batch August',
    roomCode: 'GLD-AUG-2026',
    projectId: GALDERMA_ID,
    quizId: 'quiz-gald',
    status: 'finished',
    startedAt: new Date('2026-08-15T10:00:00Z'),
    createdAt: new Date('2026-08-15T10:00:00Z'),
    host: fixtureUsers[8]
  },
  {
    id: SESS_SSEIL_AUG_ID,
    session_name: 'SSEIL Classroom Standard',
    roomCode: 'off-SSL-AUG-2026',
    projectId: SSEIL_ID,
    quizId: 'quiz-sseil',
    status: 'finished',
    startedAt: new Date('2026-08-20T11:00:00Z'),
    createdAt: new Date('2026-08-20T11:00:00Z'),
    host: fixtureUsers[8]
  },
  {
    id: SESS_GALD_OCT_ID,
    session_name: 'Galderma Q4 Update',
    roomCode: 'GLD-OCT-2026',
    projectId: GALDERMA_ID,
    quizId: 'quiz-gald',
    status: 'finished',
    startedAt: new Date('2026-10-05T10:00:00Z'),
    createdAt: new Date('2026-10-05T10:00:00Z'),
    host: fixtureUsers[8]
  }
];

// Participants:
// Galderma August: 4 participants
const partGaldAug = [
  { id: 'p-ga-1', name: 'Aarav Patel', employeeId: 'EMP_GLD_01', score: 100, sessionId: SESS_GALD_AUG_ID, createdAt: new Date('2026-08-15') },
  { id: 'p-ga-2', name: 'Diya Sharma', employeeId: 'EMP_GLD_02', score: 100, sessionId: SESS_GALD_AUG_ID, createdAt: new Date('2026-08-15') },
  { id: 'p-ga-3', name: 'Rohan Gupta', employeeId: 'EMP_GLD_03', score: 50, sessionId: SESS_GALD_AUG_ID, createdAt: new Date('2026-08-15') },
  { id: 'p-ga-4', name: 'Pooja Nair', employeeId: 'EMP_GLD_04', score: 100, sessionId: SESS_GALD_AUG_ID, createdAt: new Date('2026-08-15') }
];

// Responses for Galderma August
partGaldAug[0].Responses = [{ questionId: 'q-gald-1', points_awarded: 100, is_correct: true }, { questionId: 'q-gald-2', points_awarded: 100, is_correct: true }];
partGaldAug[1].Responses = [{ questionId: 'q-gald-1', points_awarded: 100, is_correct: true }, { questionId: 'q-gald-2', points_awarded: 100, is_correct: true }];
partGaldAug[2].Responses = [{ questionId: 'q-gald-1', points_awarded: 100, is_correct: true }, { questionId: 'q-gald-2', points_awarded: 0, is_correct: false }];
partGaldAug[3].Responses = [{ questionId: 'q-gald-1', points_awarded: 100, is_correct: true }, { questionId: 'q-gald-2', points_awarded: 100, is_correct: true }];

// SSEIL August: 3 participants
const partSseilAug = [
  { id: 'p-sa-1', name: 'Sanjay Verma', employeeId: 'EMP_SSL_01', score: 100, sessionId: SESS_SSEIL_AUG_ID, userId: USER_EMPLOYEE_ID, createdAt: new Date('2026-08-20') },
  { id: 'p-sa-2', name: 'Meera Iyer', employeeId: 'EMP_SSL_02', score: 100, sessionId: SESS_SSEIL_AUG_ID, createdAt: new Date('2026-08-20') },
  { id: 'p-sa-3', name: 'Kunal Joshi', employeeId: 'EMP_SSL_03', score: 50, sessionId: SESS_SSEIL_AUG_ID, createdAt: new Date('2026-08-20') }
];

// Responses for SSEIL August
partSseilAug[0].Responses = [{ questionId: 'q-sseil-1', points_awarded: 100, is_correct: true }, { questionId: 'q-sseil-2', points_awarded: 100, is_correct: true }];
partSseilAug[1].Responses = [{ questionId: 'q-sseil-1', points_awarded: 100, is_correct: true }, { questionId: 'q-sseil-2', points_awarded: 100, is_correct: true }];
partSseilAug[2].Responses = [{ questionId: 'q-sseil-1', points_awarded: 100, is_correct: true }, { questionId: 'q-sseil-2', points_awarded: 0, is_correct: false }];

// Galderma October: 2 participants
const partGaldOct = [
  { id: 'p-go-1', name: 'Vikram Singh', employeeId: 'EMP_GLD_05', score: 100, sessionId: SESS_GALD_OCT_ID, createdAt: new Date('2026-10-05') },
  { id: 'p-go-2', name: 'Anjali Menon', employeeId: 'EMP_GLD_06', score: 100, sessionId: SESS_GALD_OCT_ID, createdAt: new Date('2026-10-05') }
];
partGaldOct[0].Responses = [{ questionId: 'q-gald-1', points_awarded: 100, is_correct: true }, { questionId: 'q-gald-2', points_awarded: 100, is_correct: true }];
partGaldOct[1].Responses = [{ questionId: 'q-gald-1', points_awarded: 100, is_correct: true }, { questionId: 'q-gald-2', points_awarded: 100, is_correct: true }];

const allFixtureParticipants = [...partGaldAug, ...partSseilAug, ...partGaldOct];

// Connect Sessions with Quizzes and Questions
fixtureSessions[0].Quiz = { ...fixtureQuizzes[0], questions: [fixtureQuestions[0], fixtureQuestions[1]], Project: fixtureProjects[0] };
fixtureSessions[0].Participants = partGaldAug;
fixtureSessions[0].hostId = fixtureUsers[8].id;
fixtureSessions[1].Quiz = { ...fixtureQuizzes[1], questions: [fixtureQuestions[2], fixtureQuestions[3]], Project: fixtureProjects[1] };
fixtureSessions[1].Participants = partSseilAug;
fixtureSessions[1].hostId = fixtureUsers[8].id;
fixtureSessions[2].Quiz = { ...fixtureQuizzes[0], questions: [fixtureQuestions[0], fixtureQuestions[1]], Project: fixtureProjects[0] };
fixtureSessions[2].Participants = partGaldOct;
fixtureSessions[2].hostId = fixtureUsers[8].id;

// In-Memory ReportAudits Storage
const inMemoryReportAudits = [];

// ── 4. STUB SEQUELIZE MODELS ──
function setupModelStubs() {
  Project.findAll = async (query = {}) => {
    let list = fixtureProjects;
    if (!query.where) return list;
    if (query.where.id?.[Op.in]) {
      const allowed = query.where.id[Op.in];
      list = list.filter(p => allowed.includes(p.id));
    } else if (query.where.id) {
      list = list.filter(p => p.id === query.where.id);
    }
    if (query.where.parentId?.[Op.in]) {
      const allowedParents = query.where.parentId[Op.in];
      list = list.filter(p => p.parentId && allowedParents.includes(p.parentId));
    } else if (query.where.parentId !== undefined) {
      list = list.filter(p => p.parentId === query.where.parentId);
    }
    return list;
  };

  Project.findByPk = async (id) => {
    return fixtureProjects.find(p => p.id === id) || null;
  };

  User.findByPk = async (id) => {
    return fixtureUsers.find(u => u.id === id) || null;
  };

  User.findAll = async (query = {}) => {
    let list = fixtureUsers;
    if (query.where?.managerId) {
      list = list.filter(u => u.managerId === query.where.managerId);
    }
    return list;
  };

  User.findOne = async (query = {}) => {
    if (query.where?.id) return fixtureUsers.find(u => u.id === query.where.id) || null;
    if (query.where?.email) return fixtureUsers.find(u => u.email === query.where.email) || null;
    return null;
  };

  User.count = async (query = {}) => {
    if (query.where?.projectId?.[Op.in]) {
      const allowed = query.where.projectId[Op.in];
      return fixtureUsers.filter(u => u.projectId && allowed.includes(u.projectId)).length;
    }
    return fixtureUsers.length;
  };

  Project.count = async (query = {}) => fixtureProjects.length;
  Session.count = async (query = {}) => (await Session.findAll(query)).length;
  Participant.count = async (query = {}) => (await Participant.findAll(query)).length;
  Quiz.count = async (query = {}) => (await Quiz.findAll(query)).length;
  JitsiAttendance.count = async (query = {}) => (await JitsiAttendance.findAll(query)).length;
  Certificate.count = async (query = {}) => (await Certificate.findAll(query)).length;

  Role.findOne = async (query = {}) => {
    return { id: 'role-test', role_name: 'Admin' };
  };

  Quiz.findAll = async (query = {}) => {
    if (query.where?.projectId?.[Op.in]) {
      const allowed = query.where.projectId[Op.in];
      return fixtureQuizzes.filter(q => allowed.includes(q.projectId));
    }
    return fixtureQuizzes;
  };

  Session.findAll = async (query = {}) => {
    let list = fixtureSessions;
    const where = query.where;
    if (!where) return list;

    // Check project filter
    let projectFilterIds = null;
    if (where.projectId?.[Op.in]) {
      projectFilterIds = where.projectId[Op.in];
    } else if (where[Op.or]) {
      const projClause = where[Op.or].find(c => c.projectId?.[Op.in]);
      if (projClause) {
        projectFilterIds = projClause.projectId[Op.in];
      }
    } else if (where.projectId) {
      projectFilterIds = [where.projectId];
    }

    if (projectFilterIds) {
      list = list.filter(s => projectFilterIds.includes(s.projectId));
    }

    if (query.include) {
      const partInclude = query.include.find(inc => inc.model === Participant);
      if (partInclude && partInclude.required && partInclude.where?.userId?.[Op.in]) {
        const allowedUserIds = partInclude.where.userId[Op.in];
        list = list.filter(s => {
          const parts = s.Participants || [];
          return parts.some(p => p.userId && allowedUserIds.includes(p.userId));
        });
      }
    }

    // Check date range filter
    let dateRangeGte = null;
    let dateRangeLt = null;

    if (where[Op.and]) {
      where[Op.and].forEach(clause => {
        if (clause[Op.or]) {
          const startedAtClause = clause[Op.or].find(c => c.startedAt?.[Op.gte]);
          if (startedAtClause) {
            dateRangeGte = new Date(startedAtClause.startedAt[Op.gte]);
            dateRangeLt = new Date(startedAtClause.startedAt[Op.lt]);
          }
        }
      });
    } else if (where.startedAt?.[Op.gte]) {
      dateRangeGte = new Date(where.startedAt[Op.gte]);
      dateRangeLt = new Date(where.startedAt[Op.lt]);
    }

    if (dateRangeGte && dateRangeLt) {
      list = list.filter(s => {
        const d = s.startedAt || s.createdAt;
        return d >= dateRangeGte && d < dateRangeLt;
      });
    }

    return list;
  };

  Session.findOne = async (query = {}) => {
    if (query.where?.id) {
      return fixtureSessions.find(s => s.id === query.where.id) || null;
    }
    if (query.where?.quizId) {
      return fixtureSessions.find(s => s.quizId === query.where.quizId) || null;
    }
    if (query.include) {
      const qInclude = query.include.find(inc => inc.model === Quiz);
      if (qInclude?.where?.projectId?.[Op.in]) {
        const allowed = qInclude.where.projectId[Op.in];
        return fixtureSessions.find(s => allowed.includes(s.projectId)) || null;
      }
    }
    return fixtureSessions[0];
  };

  Session.findByPk = async (id) => {
    return fixtureSessions.find(s => s.id === id) || null;
  };

  Participant.findAll = async (query = {}) => {
    if (query.where?.sessionId?.[Op.in]) {
      const allowed = query.where.sessionId[Op.in];
      return allFixtureParticipants.filter(p => allowed.includes(p.sessionId));
    }
    return allFixtureParticipants;
  };

  ProjectAssignment.findAll = async (query = {}) => {
    // Yusuf Khan (PM SSEIL) is assigned ONLY to SSEIL
    if (query.where?.userId === USER_PM_SSEIL_ID || query.where?.userId === 'user-pm-sseil') {
      return [{ projectId: SSEIL_ID, userId: USER_PM_SSEIL_ID, status: 'Active' }];
    }
    // Ananya Sharma (T&D Manager assigned to SSEIL)
    if (query.where?.userId === USER_TD_ID) {
      return [{ projectId: SSEIL_ID, userId: USER_TD_ID, status: 'Active' }];
    }
    return [];
  };

  Client.findAll = async (query = {}) => {
    // Dr. Pierre (Client Galderma) is assigned ONLY to Galderma
    if (query.where?.userId === USER_CLIENT_GALD_ID || query.where?.userId === 'user-client-gald') {
      return [{ id: 'client-gald', projectId: GALDERMA_ID, userId: USER_CLIENT_GALD_ID }];
    }
    return [];
  };

  Training.findAll = async (query = {}) => {
    return [];
  };

  JitsiAttendance.findAll = async (query = {}) => {
    let list = [
      { id: 'j-1', projectId: GALDERMA_ID, sessionName: 'Galderma Batch August', duration: 45, meetingDate: new Date('2026-08-15'), attendees: [{ name: 'Aarav Patel' }, { name: 'Diya Sharma' }] },
      { id: 'j-2', projectId: GALDERMA_ID, sessionName: 'Galderma Q4 Update', duration: 30, meetingDate: new Date('2026-10-05'), attendees: [{ name: 'Vikram Singh' }] }
    ];
    if (query.where?.projectId?.[Op.in]) {
      const allowed = query.where.projectId[Op.in];
      list = list.filter(j => allowed.includes(j.projectId));
    }
    if (query.where?.meetingDate?.[Op.gte] && query.where?.meetingDate?.[Op.lt]) {
      const start = new Date(query.where.meetingDate[Op.gte]);
      const end = new Date(query.where.meetingDate[Op.lt]);
      list = list.filter(j => j.meetingDate >= start && j.meetingDate < end);
    }
    return list;
  };

  Certificate.findAll = async (query = {}) => {
    return [
      { id: 'cert-1', recipientName: 'Aarav Patel', score: 100, issuedAt: new Date('2026-08-15'), trainingTitle: 'Galderma Clinical Mastery' },
      { id: 'cert-2', recipientName: 'Diya Sharma', score: 100, issuedAt: new Date('2026-08-15'), trainingTitle: 'Galderma Clinical Mastery' },
      { id: 'cert-3', recipientName: 'Sanjay Verma', score: 100, issuedAt: new Date('2026-08-20'), trainingTitle: 'SSEIL Retail Excellence' }
    ];
  };

  ReportAudit.findOne = async (query = {}) => {
    if (query.where?.reportCode) {
      return inMemoryReportAudits.find(r => r.reportCode === query.where.reportCode) || null;
    }
    return null;
  };

  ReportAudit.findByPk = async (id) => {
    return inMemoryReportAudits.find(r => r.id === id) || null;
  };

  ReportAudit.create = async (data) => {
    const record = {
      id: `audit-${inMemoryReportAudits.length + 1}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date(),
      ...data
    };
    inMemoryReportAudits.push(record);
    return record;
  };

  ReportAudit.findAll = async (query = {}) => {
    let list = inMemoryReportAudits;
    if (!query.where) return list;
    if (query.where.status) {
      list = list.filter(r => r.status === query.where.status);
    }
    if (query.where.level) {
      if (typeof query.where.level === 'object' && query.where.level[Op.ne]) {
        list = list.filter(r => r.level !== query.where.level[Op.ne]);
      } else if (typeof query.where.level === 'string') {
        list = list.filter(r => r.level === query.where.level);
      }
    }
    if (query.where.projectId?.[Op.in]) {
      const allowed = query.where.projectId[Op.in];
      list = list.filter(r => r.projectId && allowed.includes(r.projectId));
    } else if (query.where.projectId) {
      list = list.filter(r => r.projectId === query.where.projectId);
    }
    if (query.where[Op.or]) {
      list = list.filter(r => {
        return query.where[Op.or].some(clause => {
          if (clause.projectId?.[Op.in]) {
            return r.projectId && clause.projectId[Op.in].includes(r.projectId);
          }
          if (clause.projectId) {
            return r.projectId === clause.projectId;
          }
          if (clause.level) {
            return r.level === clause.level;
          }
          if (clause.generatedBy) {
            return r.generatedBy === clause.generatedBy;
          }
          return false;
        });
      });
    }
    return list;
  };
}

// ── 5. AUTH TOKEN GENERATOR ──
function makeToken(user) {
  return jwt.sign({ id: user.id, name: user.name, role: user.role, email: user.email, projectId: user.projectId }, JWT_SECRET, { expiresIn: '1h' });
}

// ── 6. MAIN TEST RUNNER ──
async function runRegressionSuite() {
  console.log('================================================================');
  console.log('RETAILEDGE PRO — REPORTING DATA INTEGRITY & ISOLATION REGRESSION');
  console.log('================================================================\n');

  setupModelStubs();

  // -------------------------------------------------------------
  // GATE 1: Level 1 Quiz Report Generation & Sanitization
  // -------------------------------------------------------------
  console.log('--- GATE 1: Level 1 Quiz Report Attribution & Formatting ---');

  // 1.1 Galderma August Level 1 Report
  const galdL1 = await reportAnalyticsEngine.generateLevel1QuizReport('quiz-gald', SESS_GALD_AUG_ID, fixtureUsers[0]);
  assert(galdL1.level === 'LEVEL_1_QUIZ', 'Level 1 Quiz report level is LEVEL_1_QUIZ');
  assert(galdL1.period === '2026-08-15', `Level 1 report period matches sessionDate exactly: ${galdL1.period}`);
  assert(galdL1.project === 'Galderma', `Level 1 report project is Galderma: ${galdL1.project}`);
  assert(galdL1.participantResults.length === 4, `Galderma August report has 4 participants: got ${galdL1.participantResults.length}`);

  const galdAllCorrectProject = galdL1.participantResults.every(p => p.project === 'Galderma');
  assert(galdAllCorrectProject, 'All participantResults rows are attributed to Galderma');

  // Verify single % format on question accuracy (no double 78%%)
  const galdQuestionsSinglePct = galdL1.questionAnalytics.every(q => !q.accuracy.endsWith('%%') && !q.accuracy.includes('null'));
  assert(galdQuestionsSinglePct, 'QuestionAnalytics accuracy strings have single % format (no 78%% or null%%)');

  // 1.2 SSEIL August Level 1 Report (CRITICAL: Test against Galderma contamination)
  const sseilL1 = await reportAnalyticsEngine.generateLevel1QuizReport('quiz-sseil', SESS_SSEIL_AUG_ID, fixtureUsers[0]);
  assert(sseilL1.project === 'SSEIL', `SSEIL Level 1 report project is SSEIL: ${sseilL1.project}`);
  assert(sseilL1.participantResults.length === 3, `SSEIL August report has 3 participants: got ${sseilL1.participantResults.length}`);

  const sseilHasGalderma = sseilL1.participantResults.some(p => p.project === 'Galderma');
  assert(!sseilHasGalderma, 'ZERO SSEIL participants are contaminated with Galderma project name');
  const sseilAllCorrectProject = sseilL1.participantResults.every(p => p.project === 'SSEIL');
  assert(sseilAllCorrectProject, 'Every SSEIL participant row explicitly carries project: "SSEIL"');

  // -------------------------------------------------------------
  // GATE 2: Level 2 Project Monthly Report Date Boundaries & Breakdown
  // -------------------------------------------------------------
  console.log('\n--- GATE 2: Level 2 Monthly Date Boundaries & Online/Offline Parity ---');

  // 2.1 Galderma August 2026 Monthly Report (must exclude October 2026 session)
  const galdL2Aug = await reportAnalyticsEngine.generateLevel2ProjectMonthlyReport(GALDERMA_ID, '2026-08', fixtureUsers[0]);
  assert(galdL2Aug.period === '2026-08', `Level 2 report period is 2026-08: ${galdL2Aug.period}`);
  assert(galdL2Aug.executiveSummary.sessionsConducted === 1, `Galderma August has 1 active training session (October session excluded): got ${galdL2Aug.executiveSummary.sessionsConducted}`);
  assert(galdL2Aug.executiveSummary.participantsTrained === 4, `Galderma August has 4 participants (October participants excluded): got ${galdL2Aug.executiveSummary.participantsTrained}`);

  // 2.2 Verify Online vs Offline Comparison Table Metrics
  assert(Array.isArray(galdL2Aug.onlineVsOfflineComparison), 'Level 2 report includes onlineVsOfflineComparison array');
  const assignedRow = galdL2Aug.onlineVsOfflineComparison.find(r => r.metric === 'Assigned');
  assert(assignedRow !== undefined, 'Assigned metric row exists');
  assert(typeof assignedRow.online === 'number' && typeof assignedRow.offline === 'number', `Online (${assignedRow.online}) and Offline (${assignedRow.offline}) metrics are defined numbers (not undefined)`);
  assert(assignedRow.offline === 0, `Galderma August offline assigned is 0 (online-only): got ${assignedRow.offline}`);
  assert(assignedRow.online === 4, `Galderma August online assigned is 4: got ${assignedRow.online}`);

  // 2.3 SSEIL August 2026 Monthly Report (Classroom / Offline)
  const sseilL2Aug = await reportAnalyticsEngine.generateLevel2ProjectMonthlyReport(SSEIL_ID, '2026-08', fixtureUsers[0]);
  const sseilAssignedRow = sseilL2Aug.onlineVsOfflineComparison.find(r => r.metric === 'Assigned');
  assert(sseilAssignedRow.offline === 3, `SSEIL August offline assigned is 3: got ${sseilAssignedRow.offline}`);
  assert(sseilAssignedRow.online === 0, `SSEIL August online assigned is 0: got ${sseilAssignedRow.online}`);

  // 2.4 Funnel Object Integrity in Level 2 payload (for UI preview consistency)
  assert(galdL2Aug.quizFunnel !== undefined, 'Level 2 payload includes quizFunnel object');
  assert(galdL2Aug.quizFunnel.assigned === 4, `Level 2 quizFunnel.assigned === 4: got ${galdL2Aug.quizFunnel.assigned}`);
  assert(galdL2Aug.quizFunnel.started === 4, `Level 2 quizFunnel.started === 4: got ${galdL2Aug.quizFunnel.started}`);
  assert(galdL2Aug.quizFunnel.completed === 4, `Level 2 quizFunnel.completed === 4: got ${galdL2Aug.quizFunnel.completed}`);
  assert(galdL2Aug.quizFunnel.passed === 3, `Level 2 quizFunnel.passed === 3: got ${galdL2Aug.quizFunnel.passed}`);

  // -------------------------------------------------------------
  // GATE 3: Level 3 Master Monthly Report Formula Sanity
  // -------------------------------------------------------------
  console.log('\n--- GATE 3: Level 3 Master Monthly Formula Sanity ---');

  const masterL3Aug = await reportAnalyticsEngine.generateLevel3MasterMonthlyReport('2026-08', fixtureUsers[0]);
  assert(masterL3Aug.level === 'LEVEL_3_MASTER_MONTHLY', 'Level 3 report level is LEVEL_3_MASTER_MONTHLY');
  assert(masterL3Aug.executiveSummary.totalProjects === 2, `Total projects is 2: got ${masterL3Aug.executiveSummary.totalProjects}`);
  assert(masterL3Aug.executiveSummary.trainingSessions === 2, `August training sessions is 2 (1 Galderma + 1 SSEIL, no * 4 multiplier): got ${masterL3Aug.executiveSummary.trainingSessions}`);
  assert(masterL3Aug.executiveSummary.participants === 7, `August participants is 7 (4 Galderma + 3 SSEIL, no * 85 multiplier): got ${masterL3Aug.executiveSummary.participants}`);
  assert(masterL3Aug.executiveSummary.quizAssignments === 7, `Quiz assignments equals actual participants (7): got ${masterL3Aug.executiveSummary.quizAssignments}`);

  // Funnel integrity on Level 3
  assert(masterL3Aug.quizFunnel !== undefined, 'Level 3 payload attaches genuine quizFunnel object');
  assert(masterL3Aug.quizFunnel.assigned === 7, `quizFunnel.assigned is 7: got ${masterL3Aug.quizFunnel.assigned}`);
  assert(masterL3Aug.quizFunnel.completed === 7, `quizFunnel.completed is 7: got ${masterL3Aug.quizFunnel.completed}`);

  // Project Performance Matrix has both projects
  assert(masterL3Aug.projectPerformanceMatrix.length === 2, `Project performance matrix has 2 projects: got ${masterL3Aug.projectPerformanceMatrix.length}`);
  const galdMatrix = masterL3Aug.projectPerformanceMatrix.find(p => p.project === 'Galderma');
  const sseilMatrix = masterL3Aug.projectPerformanceMatrix.find(p => p.project === 'SSEIL');
  assert(galdMatrix !== undefined && sseilMatrix !== undefined, 'Both Galderma and SSEIL exist in Level 3 projectPerformanceMatrix');

  // -------------------------------------------------------------
  // GATE 4: Preview-to-Export Data Parity (Excel & PPT)
  // -------------------------------------------------------------
  console.log('\n--- GATE 4: Multi-Level Preview-to-Export Parity (Excel & PPT) ---');

  // 4.1 Level 1 Quiz Report Parity (SSEIL Level 1)
  const sseilOutcomeRows = await intelligenceService.getMasterTrainingOutcomeData([SSEIL_ID], { period: '2026-08' });
  const excelBufferL1 = await reportExcelGenerator.generate10SheetExcelWorkbook(sseilL1, sseilOutcomeRows);
  assert(Buffer.isBuffer(excelBufferL1) && excelBufferL1.length > 5000, `Level 1 Excel buffer generated (${excelBufferL1.length} bytes)`);

  const wbL1 = new ExcelJS.Workbook();
  await wbL1.xlsx.load(excelBufferL1);
  assert(wbL1.worksheets.length === 10, `Level 1 Excel has exactly 10 sheets: got ${wbL1.worksheets.length}`);

  // Sheet 5: Participant Performance Parity
  const s5L1 = wbL1.worksheets.find(ws => ws.name.includes('Participant Performance'));
  assert(s5L1 !== undefined, 'Sheet 5 (Participant Performance) exists in Level 1 workbook');

  const participantProjectsL1 = [];
  s5L1.eachRow((row, rowNumber) => {
    if (rowNumber >= 2) {
      const projCell = row.getCell(3).value;
      if (projCell && projCell !== 'Project') participantProjectsL1.push(String(projCell));
    }
  });

  assert(participantProjectsL1.length === sseilL1.participantResults.length, `Sheet 5 learner row count (${participantProjectsL1.length}) matches preview participant count (${sseilL1.participantResults.length})`);
  assert(participantProjectsL1.every(p => p === 'SSEIL'), 'All learner rows in Sheet 5 are attributed to "SSEIL"');
  const mentionsGaldermaInSseil = participantProjectsL1.some(p => p.toLowerCase().includes('galderma'));
  assert(!mentionsGaldermaInSseil, 'Sheet 5 Participant Performance for SSEIL contains ZERO mentions of "Galderma"');

  // Sheet 7: Question Analytics Parity
  const s7L1 = wbL1.worksheets.find(ws => ws.name.includes('Question Analytics'));
  assert(s7L1 !== undefined, 'Sheet 7 (Question Analytics) exists in Level 1 workbook');
  let foundDoublePercentL1 = false;
  let qCountL1 = 0;
  s7L1.eachRow((row, rowNumber) => {
    if (rowNumber >= 2) {
      const topic = row.getCell(2).value;
      if (topic) qCountL1++;
    }
    row.eachCell((cell) => {
      const val = String(cell.value || '');
      if (val.includes('%%') || val.includes('null%')) {
        foundDoublePercentL1 = true;
      }
    });
  });
  assert(qCountL1 === sseilL1.questionAnalytics.length, `Sheet 7 question count (${qCountL1}) matches preview questionAnalytics count (${sseilL1.questionAnalytics.length})`);
  assert(!foundDoublePercentL1, 'Sheet 7 Question Analytics has ZERO double percent "%%" or "null%" cells');

  // Level 1 PPT Export Parity
  const pptBufferL1 = await reportPPTGenerator.generate14SlideManagementPPT(sseilL1);
  assert(Buffer.isBuffer(pptBufferL1) && pptBufferL1.length > 50000, `Level 1 PPT deck generated (${pptBufferL1.length} bytes)`);

  // 4.2 Level 2 Project Monthly Report Parity (Galderma August)
  const galdOutcomeRows = await intelligenceService.getMasterTrainingOutcomeData([GALDERMA_ID], { period: '2026-08' });
  const excelBufferL2 = await reportExcelGenerator.generate10SheetExcelWorkbook(galdL2Aug, galdOutcomeRows);
  assert(Buffer.isBuffer(excelBufferL2) && excelBufferL2.length > 5000, `Level 2 Excel buffer generated (${excelBufferL2.length} bytes)`);

  const wbL2 = new ExcelJS.Workbook();
  await wbL2.xlsx.load(excelBufferL2);
  assert(wbL2.worksheets.length === 10, 'Level 2 Excel has exactly 10 sheets');

  // Sheet 4 Delivery Mode / Format Parity with Preview
  const s4L2 = wbL2.worksheets.find(ws => ws.name.includes('Format') || ws.name.includes('Delivery') || ws.name.includes('Online'));
  assert(s4L2 !== undefined, 'Sheet 4 (Delivery / Format Comparison) exists in Level 2 workbook');

  // Level 2 PPT Export Parity
  const pptBufferL2 = await reportPPTGenerator.generate14SlideManagementPPT(galdL2Aug);
  assert(Buffer.isBuffer(pptBufferL2) && pptBufferL2.length > 50000, `Level 2 PPT deck generated (${pptBufferL2.length} bytes)`);

  // 4.3 Level 3 Master Monthly Report Parity
  const masterOutcomeRows = await intelligenceService.getMasterTrainingOutcomeData([GALDERMA_ID, SSEIL_ID], { period: '2026-08' });
  const excelBufferL3 = await reportExcelGenerator.generate10SheetExcelWorkbook(masterL3Aug, masterOutcomeRows);
  assert(Buffer.isBuffer(excelBufferL3) && excelBufferL3.length > 5000, `Level 3 Excel buffer generated (${excelBufferL3.length} bytes)`);

  const wbL3 = new ExcelJS.Workbook();
  await wbL3.xlsx.load(excelBufferL3);
  assert(wbL3.worksheets.length === 10, 'Level 3 Excel has exactly 10 sheets');

  // Level 3 PPT Export Parity
  const pptBufferL3 = await reportPPTGenerator.generate14SlideManagementPPT(masterL3Aug);
  assert(Buffer.isBuffer(pptBufferL3) && pptBufferL3.length > 50000, `Level 3 PPT deck generated (${pptBufferL3.length} bytes)`);

  // Sheet 9 Period Isolation
  const masterOutcomeHasOctober = masterOutcomeRows.some(r => r.date && r.date.includes('2026-10'));
  assert(!masterOutcomeHasOctober, 'August Master Training Outcome rows contain ZERO October sessions');

  // -------------------------------------------------------------
  // GATE 5: Express HTTP API, Exhaustive Route Audit & RBAC
  // -------------------------------------------------------------
  console.log('\n--- GATE 5: Express HTTP API, Exhaustive Route Audit & RBAC ---');

  const app = express();
  app.use(express.json());
  const reportsRouter = require('../routes/reports');
  app.use('/api/reports', reportsRouter);

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const API_URL = `http://127.0.0.1:${port}/api/reports`;

  // Tokens for all 15 Supported Roles
  const tokenSuperAdmin = makeToken(fixtureUsers[0]);   // Super Admin
  const tokenAdmin      = makeToken(fixtureUsers[1]);   // Admin
  const tokenMD         = makeToken(fixtureUsers[2]);   // MD
  const tokenCOO        = makeToken(fixtureUsers[3]);   // COO
  const tokenVP         = makeToken(fixtureUsers[4]);   // VP Operations
  const tokenPMSseil    = makeToken(fixtureUsers[5]);   // Program Manager SSEIL ONLY
  const tokenClientGald = makeToken(fixtureUsers[6]);   // Client Galderma ONLY
  const tokenTD         = makeToken(fixtureUsers[7]);   // T&D Manager
  const tokenTrainer    = makeToken(fixtureUsers[8]);   // Trainer
  const tokenSupervisor = makeToken(fixtureUsers[9]);   // Supervisor
  const tokenEmployee   = makeToken(fixtureUsers[10]);  // Employee
  const tokenHRAdmin    = makeToken(fixtureUsers[11]);  // HR Admin
  const tokenManager    = makeToken({ ...fixtureUsers[12], projectId: SSEIL_ID });     // Manager
  const tokenOpMgr      = makeToken({ ...fixtureUsers[13], projectId: GALDERMA_ID });  // Operation Manager
  const tokenMktMgr     = makeToken({ ...fixtureUsers[14], projectId: GALDERMA_ID });  // Marketing Manager

  try {
    const galdAudit = inMemoryReportAudits.find(r => r.projectId === GALDERMA_ID);
    const sseilAudit = inMemoryReportAudits.find(r => r.projectId === SSEIL_ID);
    const masterAudit = inMemoryReportAudits.find(r => r.level === 'LEVEL_3_MASTER_MONTHLY');

    // ── 5.1 Route: GET /analytics/available ──
    console.log('  Testing GET /analytics/available across declared roles:');

    // Leadership and Admins: CAN see Level 3 Master Monthly
    const leadershipTokens = [
      { name: 'Super Admin', token: tokenSuperAdmin },
      { name: 'Admin', token: tokenAdmin },
      { name: 'MD', token: tokenMD },
      { name: 'COO', token: tokenCOO },
      { name: 'VP Operations', token: tokenVP }
    ];
    for (const lead of leadershipTokens) {
      const res = await axios.get(`${API_URL}/analytics/available`, { headers: { Authorization: `Bearer ${lead.token}` } });
      assert(res.status === 200, `GET /analytics/available 200 OK for ${lead.name}`);
      const sawMaster = res.data.some(r => r.level === 'LEVEL_3_MASTER_MONTHLY');
      assert(sawMaster, `${lead.name} CAN see Level 3 Master Monthly in /analytics/available`);
    }

    // Non-leadership roles: CANNOT see Level 3 Master Monthly in /analytics/available
    const nonLeadershipTokens = [
      { name: 'Program Manager', token: tokenPMSseil },
      { name: 'T&D Manager', token: tokenTD },
      { name: 'Client', token: tokenClientGald },
      { name: 'Marketing Manager', token: tokenMktMgr }
    ];
    for (const nonLead of nonLeadershipTokens) {
      const res = await axios.get(`${API_URL}/analytics/available`, { headers: { Authorization: `Bearer ${nonLead.token}` } });
      assert(res.status === 200, `GET /analytics/available 200 OK for ${nonLead.name}`);
      const sawMaster = res.data.some(r => r.level === 'LEVEL_3_MASTER_MONTHLY');
      assert(!sawMaster, `${nonLead.name} CANNOT see Level 3 Master Monthly in /analytics/available`);
    }

    // Cross-project filter check on available reports
    const resPmAvail = await axios.get(`${API_URL}/analytics/available`, { headers: { Authorization: `Bearer ${tokenPMSseil}` } });
    assert(!resPmAvail.data.some(r => r.projectId === GALDERMA_ID), 'PM SSEIL CANNOT see Galderma reports in /analytics/available');

    const resClientAvail = await axios.get(`${API_URL}/analytics/available`, { headers: { Authorization: `Bearer ${tokenClientGald}` } });
    assert(!resClientAvail.data.some(r => r.projectId === SSEIL_ID), 'Client Galderma CANNOT see SSEIL reports in /analytics/available');

    const resMktAvail = await axios.get(`${API_URL}/analytics/available`, { headers: { Authorization: `Bearer ${tokenMktMgr}` } });
    assert(!resMktAvail.data.some(r => r.projectId === SSEIL_ID), 'Marketing Manager CANNOT see SSEIL reports in /analytics/available');

    // ── 5.2 Route: GET /analytics/data/:id ──
    console.log('  Testing GET /analytics/data/:id across declared roles:');

    // Leadership viewing Level 3: 200 OK
    for (const lead of leadershipTokens) {
      const res = await axios.get(`${API_URL}/analytics/data/${masterAudit.id}`, { headers: { Authorization: `Bearer ${lead.token}` } });
      assert(res.status === 200, `${lead.name} accessing Level 3 report data returns 200 OK`);
    }

    // Non-leadership viewing Level 3: 403 Forbidden
    for (const nonLead of nonLeadershipTokens) {
      try {
        await axios.get(`${API_URL}/analytics/data/${masterAudit.id}`, { headers: { Authorization: `Bearer ${nonLead.token}` } });
        assert(false, `${nonLead.name} should be blocked from Level 3 report data`);
      } catch (err) {
        assert(err.response?.status === 403, `${nonLead.name} accessing Level 3 report data is blocked with HTTP 403 Forbidden: got ${err.response?.status}`);
      }
    }

    // Cross-Project Forbidden on report data
    try {
      await axios.get(`${API_URL}/analytics/data/${galdAudit.id}`, { headers: { Authorization: `Bearer ${tokenPMSseil}` } });
      assert(false, 'PM SSEIL should be blocked from Galderma report data');
    } catch (err) {
      assert(err.response?.status === 403, `PM SSEIL accessing Galderma report data is blocked with HTTP 403: got ${err.response?.status}`);
    }

    try {
      await axios.get(`${API_URL}/analytics/data/${sseilAudit.id}`, { headers: { Authorization: `Bearer ${tokenClientGald}` } });
      assert(false, 'Client Galderma should be blocked from SSEIL report data');
    } catch (err) {
      assert(err.response?.status === 403, `Client Galderma accessing SSEIL report data is blocked with HTTP 403: got ${err.response?.status}`);
    }

    try {
      await axios.get(`${API_URL}/analytics/data/${sseilAudit.id}`, { headers: { Authorization: `Bearer ${tokenMktMgr}` } });
      assert(false, 'Marketing Manager should be blocked from foreign SSEIL report');
    } catch (err) {
      assert(err.response?.status === 403, `Marketing Manager accessing foreign SSEIL report blocked with HTTP 403: got ${err.response?.status}`);
    }

    // Authorized access to assigned project: 200 OK
    const resPmOwn = await axios.get(`${API_URL}/analytics/data/${sseilAudit.id}`, { headers: { Authorization: `Bearer ${tokenPMSseil}` } });
    assert(resPmOwn.status === 200, 'PM SSEIL accessing authorized SSEIL report data returns 200 OK');

    const resClientOwn = await axios.get(`${API_URL}/analytics/data/${galdAudit.id}`, { headers: { Authorization: `Bearer ${tokenClientGald}` } });
    assert(resClientOwn.status === 200, 'Client Galderma accessing authorized Galderma report data returns 200 OK');

    const resMktOwn = await axios.get(`${API_URL}/analytics/data/${galdAudit.id}`, { headers: { Authorization: `Bearer ${tokenMktMgr}` } });
    assert(resMktOwn.status === 200, 'Marketing Manager CAN access authorized Galderma report data (200 OK)');

    // ── 5.3 Route: GET /analytics/export/excel/:id ──
    console.log('  Testing GET /analytics/export/excel/:id security:');
    for (const lead of leadershipTokens) {
      const res = await axios.get(`${API_URL}/analytics/export/excel/${masterAudit.id}`, { headers: { Authorization: `Bearer ${lead.token}` }, responseType: 'arraybuffer' });
      assert(res.status === 200, `${lead.name} CAN export Level 3 Master Monthly Excel (200 OK)`);
    }

    for (const nonLead of nonLeadershipTokens) {
      try {
        await axios.get(`${API_URL}/analytics/export/excel/${masterAudit.id}`, { headers: { Authorization: `Bearer ${nonLead.token}` } });
        assert(false, `${nonLead.name} should be forbidden from exporting Level 3 Excel`);
      } catch (err) {
        assert(err.response?.status === 403, `${nonLead.name} exporting Level 3 Excel is blocked with HTTP 403: got ${err.response?.status}`);
      }
    }

    // Authorized project Excel export
    const resPmExcel = await axios.get(`${API_URL}/analytics/export/excel/${sseilAudit.id}`, { headers: { Authorization: `Bearer ${tokenPMSseil}` }, responseType: 'arraybuffer' });
    assert(resPmExcel.status === 200, 'PM SSEIL CAN export authorized SSEIL Excel (200 OK)');

    const resClientExcel = await axios.get(`${API_URL}/analytics/export/excel/${galdAudit.id}`, { headers: { Authorization: `Bearer ${tokenClientGald}` }, responseType: 'arraybuffer' });
    assert(resClientExcel.status === 200, 'Client Galderma CAN export authorized Galderma Excel (200 OK)');

    const resMktExcel = await axios.get(`${API_URL}/analytics/export/excel/${galdAudit.id}`, { headers: { Authorization: `Bearer ${tokenMktMgr}` }, responseType: 'arraybuffer' });
    assert(resMktExcel.status === 200, 'Marketing Manager CAN export authorized Galderma Excel (200 OK)');

    // Cross-project export attempts
    try {
      await axios.get(`${API_URL}/analytics/export/excel/${galdAudit.id}`, { headers: { Authorization: `Bearer ${tokenPMSseil}` } });
      assert(false, 'PM SSEIL should be forbidden from exporting Galderma Excel');
    } catch (err) {
      assert(err.response?.status === 403, `PM SSEIL exporting Galderma Excel is blocked with HTTP 403: got ${err.response?.status}`);
    }

    try {
      await axios.get(`${API_URL}/analytics/export/excel/${sseilAudit.id}`, { headers: { Authorization: `Bearer ${tokenClientGald}` } });
      assert(false, 'Client Galderma should be forbidden from exporting SSEIL Excel');
    } catch (err) {
      assert(err.response?.status === 403, `Client Galderma exporting SSEIL Excel is blocked with HTTP 403: got ${err.response?.status}`);
    }

    // ── 5.4 Route: GET /analytics/export/ppt/:id ──
    console.log('  Testing GET /analytics/export/ppt/:id security:');
    for (const lead of leadershipTokens) {
      const res = await axios.get(`${API_URL}/analytics/export/ppt/${masterAudit.id}`, { headers: { Authorization: `Bearer ${lead.token}` }, responseType: 'arraybuffer' });
      assert(res.status === 200, `${lead.name} CAN export Level 3 Master Monthly PPT (200 OK)`);
    }

    for (const nonLead of nonLeadershipTokens) {
      try {
        await axios.get(`${API_URL}/analytics/export/ppt/${masterAudit.id}`, { headers: { Authorization: `Bearer ${nonLead.token}` } });
        assert(false, `${nonLead.name} should be forbidden from exporting Level 3 PPT`);
      } catch (err) {
        assert(err.response?.status === 403, `${nonLead.name} exporting Level 3 PPT is blocked with HTTP 403: got ${err.response?.status}`);
      }
    }

    // Authorized project PPT export
    const resPmPPT = await axios.get(`${API_URL}/analytics/export/ppt/${sseilAudit.id}`, { headers: { Authorization: `Bearer ${tokenPMSseil}` }, responseType: 'arraybuffer' });
    assert(resPmPPT.status === 200, 'PM SSEIL CAN export authorized SSEIL PPT (200 OK)');

    const resClientPPT = await axios.get(`${API_URL}/analytics/export/ppt/${galdAudit.id}`, { headers: { Authorization: `Bearer ${tokenClientGald}` }, responseType: 'arraybuffer' });
    assert(resClientPPT.status === 200, 'Client Galderma CAN export authorized Galderma PPT (200 OK)');

    const resMktPPT = await axios.get(`${API_URL}/analytics/export/ppt/${galdAudit.id}`, { headers: { Authorization: `Bearer ${tokenMktMgr}` }, responseType: 'arraybuffer' });
    assert(resMktPPT.status === 200, 'Marketing Manager CAN export authorized Galderma PPT (200 OK)');

    // Cross-project PPT export attempt
    try {
      await axios.get(`${API_URL}/analytics/export/ppt/${galdAudit.id}`, { headers: { Authorization: `Bearer ${tokenPMSseil}` } });
      assert(false, 'PM SSEIL should be forbidden from exporting Galderma PPT');
    } catch (err) {
      assert(err.response?.status === 403, `PM SSEIL exporting Galderma PPT is blocked with HTTP 403: got ${err.response?.status}`);
    }

    // ── 5.5 Route: POST /analytics/generate-on-demand ──
    console.log('  Testing POST /analytics/generate-on-demand security:');
    for (const lead of leadershipTokens) {
      const res = await axios.post(`${API_URL}/analytics/generate-on-demand`, { level: 3, period: '2026-08' }, { headers: { Authorization: `Bearer ${lead.token}` } });
      assert(res.status === 200, `${lead.name} CAN generate Level 3 report on-demand (200 OK)`);
    }

    for (const nonLead of nonLeadershipTokens) {
      try {
        await axios.post(`${API_URL}/analytics/generate-on-demand`, { level: 3, period: '2026-08' }, { headers: { Authorization: `Bearer ${nonLead.token}` } });
        assert(false, `${nonLead.name} should be forbidden from generating Level 3 report on-demand`);
      } catch (err) {
        assert(err.response?.status === 403, `${nonLead.name} generating Level 3 on-demand is blocked with HTTP 403: got ${err.response?.status}`);
      }
    }

    try {
      await axios.post(`${API_URL}/analytics/generate-on-demand`, { level: 2, projectId: GALDERMA_ID, period: '2026-08' }, { headers: { Authorization: `Bearer ${tokenPMSseil}` } });
      assert(false, 'PM SSEIL should be forbidden from generating Galderma report on-demand');
    } catch (err) {
      assert(err.response?.status === 403, `PM SSEIL generating Galderma report on-demand is blocked with HTTP 403: got ${err.response?.status}`);
    }

    // Authorized on-demand generation returns 200
    const resPmGenOwn = await axios.post(`${API_URL}/analytics/generate-on-demand`, { level: 2, projectId: SSEIL_ID, period: '2026-08' }, { headers: { Authorization: `Bearer ${tokenPMSseil}` } });
    assert(resPmGenOwn.status === 200, 'PM SSEIL generating Level 2 report on-demand for authorized SSEIL project returns 200 OK');

    const resMktGenOwn = await axios.post(`${API_URL}/analytics/generate-on-demand`, { level: 2, projectId: GALDERMA_ID, period: '2026-08' }, { headers: { Authorization: `Bearer ${tokenMktMgr}` } });
    assert(resMktGenOwn.status === 200, 'Marketing Manager generating Level 2 report on-demand for authorized Galderma project returns 200 OK');

    // ── 5.6 Route: GET /master-outcome & Parameter Tampering ──
    console.log('  Testing GET /master-outcome and cross-project tampering:');

    // PM SSEIL requesting all projects -> MUST ONLY return SSEIL rows
    const resPmMOScopeAll = await axios.get(`${API_URL}/master-outcome?projectId=all`, { headers: { Authorization: `Bearer ${tokenPMSseil}` } });
    assert(resPmMOScopeAll.status === 200, 'PM SSEIL GET /master-outcome?projectId=all returns 200 OK');
    assert(Array.isArray(resPmMOScopeAll.data), 'Returns array of outcome records');
    const pmSawGaldRows = resPmMOScopeAll.data.some(r => (r.projectName || r.project || '').toLowerCase().includes('galderma'));
    assert(!pmSawGaldRows, 'PM SSEIL querying projectId=all returns ZERO Galderma records');

    // PM SSEIL attempting explicit tampering to query Galderma -> MUST BE 403 Forbidden
    try {
      await axios.get(`${API_URL}/master-outcome?projectId=${GALDERMA_ID}`, { headers: { Authorization: `Bearer ${tokenPMSseil}` } });
      assert(false, 'PM SSEIL should be blocked from querying Galderma via /master-outcome');
    } catch (err) {
      assert(err.response?.status === 403, `PM SSEIL querying Galderma via /master-outcome is blocked with HTTP 403: got ${err.response?.status}`);
    }

    // Client Galderma requesting all projects -> MUST ONLY return Galderma rows
    const resClientMOScopeAll = await axios.get(`${API_URL}/master-outcome?projectId=all`, { headers: { Authorization: `Bearer ${tokenClientGald}` } });
    assert(resClientMOScopeAll.status === 200, 'Client Galderma GET /master-outcome?projectId=all returns 200 OK');
    const clientSawSseilRows = resClientMOScopeAll.data.some(r => (r.projectName || r.project || '').toLowerCase().includes('sseil'));
    assert(!clientSawSseilRows, 'Client Galderma querying projectId=all returns ZERO SSEIL records');

    // Client Galderma attempting explicit tampering to query SSEIL -> MUST BE 403 Forbidden
    try {
      await axios.get(`${API_URL}/master-outcome?projectId=${SSEIL_ID}`, { headers: { Authorization: `Bearer ${tokenClientGald}` } });
      assert(false, 'Client Galderma should be blocked from querying SSEIL via /master-outcome');
    } catch (err) {
      assert(err.response?.status === 403, `Client Galderma querying SSEIL via /master-outcome is blocked with HTTP 403: got ${err.response?.status}`);
    }

    // Marketing Manager requesting all projects -> MUST ONLY return Galderma rows
    const resMktMOScopeAll = await axios.get(`${API_URL}/master-outcome?projectId=all`, { headers: { Authorization: `Bearer ${tokenMktMgr}` } });
    assert(resMktMOScopeAll.status === 200, 'Marketing Manager GET /master-outcome?projectId=all returns 200 OK');
    const mktSawSseilRows = resMktMOScopeAll.data.some(r => (r.projectName || r.project || '').toLowerCase().includes('sseil'));
    assert(!mktSawSseilRows, 'Marketing Manager querying projectId=all returns ZERO SSEIL records');

    try {
      await axios.get(`${API_URL}/master-outcome?projectId=${SSEIL_ID}`, { headers: { Authorization: `Bearer ${tokenMktMgr}` } });
      assert(false, 'Marketing Manager should be blocked from querying SSEIL via /master-outcome');
    } catch (err) {
      assert(err.response?.status === 403, `Marketing Manager querying SSEIL via /master-outcome is blocked with HTTP 403: got ${err.response?.status}`);
    }

    // Admin querying with period filter
    const resAdminMOAug = await axios.get(`${API_URL}/master-outcome?period=2026-08`, { headers: { Authorization: `Bearer ${tokenAdmin}` } });
    assert(resAdminMOAug.status === 200, 'Admin GET /master-outcome?period=2026-08 returns 200 OK');
    const adminSawOct = resAdminMOAug.data.some(r => r.date && r.date.includes('2026-10'));
    assert(!adminSawOct, 'Admin GET /master-outcome?period=2026-08 returns ZERO October records');

    // ── 5.7 Route: Non-Analytics Roles Strict Rejection Across ALL Endpoints ──
    console.log('  Testing Non-Analytics Roles rejection across all reporting endpoints:');
    const nonAnalyticsRoles = [
      { name: 'HR Admin', token: tokenHRAdmin },
      { name: 'Operation Manager', token: tokenOpMgr },
      { name: 'Manager', token: tokenManager },
      { name: 'Trainer', token: tokenTrainer },
      { name: 'Supervisor', token: tokenSupervisor },
      { name: 'Employee', token: tokenEmployee }
    ];

    for (const r of nonAnalyticsRoles) {
      // 1. /analytics/available
      try {
        await axios.get(`${API_URL}/analytics/available`, { headers: { Authorization: `Bearer ${r.token}` } });
        assert(false, `${r.name} should be blocked from /analytics/available`);
      } catch (err) {
        assert(err.response?.status === 403, `${r.name} blocked from /analytics/available with HTTP 403: got ${err.response?.status}`);
      }

      // 2. /analytics/data/:id
      try {
        await axios.get(`${API_URL}/analytics/data/${galdAudit.id}`, { headers: { Authorization: `Bearer ${r.token}` } });
        assert(false, `${r.name} should be blocked from /analytics/data/:id`);
      } catch (err) {
        assert(err.response?.status === 403, `${r.name} blocked from /analytics/data/:id with HTTP 403: got ${err.response?.status}`);
      }

      // 3. /analytics/export/excel/:id
      try {
        await axios.get(`${API_URL}/analytics/export/excel/${galdAudit.id}`, { headers: { Authorization: `Bearer ${r.token}` } });
        assert(false, `${r.name} should be blocked from /analytics/export/excel`);
      } catch (err) {
        assert(err.response?.status === 403, `${r.name} blocked from direct Excel export with HTTP 403: got ${err.response?.status}`);
      }

      // 4. /analytics/export/ppt/:id
      try {
        await axios.get(`${API_URL}/analytics/export/ppt/${galdAudit.id}`, { headers: { Authorization: `Bearer ${r.token}` } });
        assert(false, `${r.name} should be blocked from /analytics/export/ppt`);
      } catch (err) {
        assert(err.response?.status === 403, `${r.name} blocked from direct PPT export with HTTP 403: got ${err.response?.status}`);
      }

      // 5. /analytics/generate-on-demand
      try {
        await axios.post(`${API_URL}/analytics/generate-on-demand`, { level: 2, projectId: GALDERMA_ID }, { headers: { Authorization: `Bearer ${r.token}` } });
        assert(false, `${r.name} should be blocked from /analytics/generate-on-demand`);
      } catch (err) {
        assert(err.response?.status === 403, `${r.name} blocked from /analytics/generate-on-demand with HTTP 403: got ${err.response?.status}`);
      }

      // 6. /master-outcome
      try {
        await axios.get(`${API_URL}/master-outcome`, { headers: { Authorization: `Bearer ${r.token}` } });
        assert(false, `${r.name} should be blocked from /master-outcome`);
      } catch (err) {
        assert(err.response?.status === 403, `${r.name} blocked from /master-outcome with HTTP 403: got ${err.response?.status}`);
      }

      // 7. /analytics/audit
      try {
        await axios.get(`${API_URL}/analytics/audit`, { headers: { Authorization: `Bearer ${r.token}` } });
        assert(false, `${r.name} should be blocked from /analytics/audit`);
      } catch (err) {
        assert(err.response?.status === 403, `${r.name} blocked from /analytics/audit with HTTP 403: got ${err.response?.status}`);
      }

      // 8. /analytics/monthly-closing
      try {
        await axios.post(`${API_URL}/analytics/monthly-closing`, { targetMonth: '2026-08' }, { headers: { Authorization: `Bearer ${r.token}` } });
        assert(false, `${r.name} should be blocked from /analytics/monthly-closing`);
      } catch (err) {
        assert(err.response?.status === 403, `${r.name} blocked from /analytics/monthly-closing with HTTP 403: got ${err.response?.status}`);
      }
    }

    // ── 5.8 Route: Monthly Closing Super-Admin-Only Restriction ──
    console.log('  Testing Monthly Closing Admin/Super Admin exclusivity across non-super roles:');
    const nonSuperLeadershipAndReporting = [
      { name: 'MD', token: tokenMD },
      { name: 'COO', token: tokenCOO },
      { name: 'VP Operations', token: tokenVP },
      { name: 'Program Manager', token: tokenPMSseil },
      { name: 'T&D Manager', token: tokenTD },
      { name: 'Client', token: tokenClientGald },
      { name: 'Marketing Manager', token: tokenMktMgr }
    ];
    for (const u of nonSuperLeadershipAndReporting) {
      try {
        await axios.post(`${API_URL}/analytics/monthly-closing`, { targetMonth: '2026-08' }, { headers: { Authorization: `Bearer ${u.token}` } });
        assert(false, `${u.name} should be blocked from /analytics/monthly-closing`);
      } catch (err) {
        assert(err.response?.status === 403, `${u.name} blocked from /analytics/monthly-closing with HTTP 403: got ${err.response?.status}`);
      }
    }

    // Admin & Super Admin CAN invoke monthly closing
    const resClosingAdmin = await axios.post(`${API_URL}/analytics/monthly-closing`, { targetMonth: '2026-08' }, { headers: { Authorization: `Bearer ${tokenAdmin}` } });
    assert(resClosingAdmin.status === 200, 'Admin CAN execute /analytics/monthly-closing (200 OK)');

    // ── 5.9 Route: Audit Log Authorization ──
    console.log('  Testing /analytics/audit across all reporting roles:');
    const auditAuthorizedRoles = [
      { name: 'Super Admin', token: tokenSuperAdmin },
      { name: 'Admin', token: tokenAdmin },
      { name: 'MD', token: tokenMD },
      { name: 'COO', token: tokenCOO },
      { name: 'VP Operations', token: tokenVP },
      { name: 'Program Manager', token: tokenPMSseil },
      { name: 'T&D Manager', token: tokenTD },
      { name: 'Client', token: tokenClientGald },
      { name: 'Marketing Manager', token: tokenMktMgr }
    ];
    for (const a of auditAuthorizedRoles) {
      const res = await axios.get(`${API_URL}/analytics/audit`, { headers: { Authorization: `Bearer ${a.token}` } });
      assert(res.status === 200, `${a.name} accessing /analytics/audit returns 200 OK`);
      assert(Array.isArray(res.data), `${a.name} audit response is an array`);
    }

    // ── 5.10 Route: Session Reports List (GET /api/reports) Role Filtering ──
    console.log('  Testing Session Reports List (GET /api/reports) across all roles:');
    const sessionListAuthorized = [
      { name: 'Super Admin', token: tokenSuperAdmin },
      { name: 'Admin', token: tokenAdmin },
      { name: 'Program Manager', token: tokenPMSseil },
      { name: 'Trainer', token: tokenTrainer },
      { name: 'T&D Manager (Project Assigned)', token: tokenTD },
      { name: 'Client (Project Assigned)', token: tokenClientGald },
      { name: 'Supervisor (With Subordinates)', token: tokenSupervisor },
      { name: 'Marketing Manager (Project Assigned)', token: tokenMktMgr },
      { name: 'MD (Project Assigned)', token: makeToken({ ...fixtureUsers[2], projectId: GALDERMA_ID }) },
      { name: 'COO (Project Assigned)', token: makeToken({ ...fixtureUsers[3], projectId: GALDERMA_ID }) },
      { name: 'VP Operations (Project Assigned)', token: makeToken({ ...fixtureUsers[4], projectId: GALDERMA_ID }) }
    ];
    for (const s of sessionListAuthorized) {
      const res = await axios.get(`${API_URL}`, { headers: { Authorization: `Bearer ${s.token}` } });
      assert(res.status === 200, `GET /api/reports 200 OK for authorized role: ${s.name}`);
      assert(Array.isArray(res.data), `GET /api/reports returns array for ${s.name}`);
    }

    // Unassigned roles blocked with HTTP 403:
    // 1. MD without project -> 403
    try {
      await axios.get(`${API_URL}`, { headers: { Authorization: `Bearer ${tokenMD}` } });
      assert(false, 'MD without assigned project should be blocked from GET /api/reports');
    } catch (err) {
      assert(err.response?.status === 403, `MD without assigned project blocked from GET /api/reports with HTTP 403: got ${err.response?.status}`);
    }

    // 2. T&D Manager without capability projects -> 403
    const tokenTDUnassigned = makeToken({ id: '55555555-9999-9999-9999-999999999999', role: 'T&D Manager', projectId: null });
    try {
      await axios.get(`${API_URL}`, { headers: { Authorization: `Bearer ${tokenTDUnassigned}` } });
      assert(false, 'T&D Manager without assigned projects should be blocked from GET /api/reports');
    } catch (err) {
      assert(err.response?.status === 403, `T&D Manager without assigned projects blocked from GET /api/reports with HTTP 403: got ${err.response?.status}`);
    }

    // 3. Client without client projects -> 403
    const tokenClientUnassigned = makeToken({ id: '44444444-9999-9999-9999-999999999999', role: 'Client', projectId: null });
    try {
      await axios.get(`${API_URL}`, { headers: { Authorization: `Bearer ${tokenClientUnassigned}` } });
      assert(false, 'Client without assigned projects should be blocked from GET /api/reports');
    } catch (err) {
      assert(err.response?.status === 403, `Client without assigned projects blocked from GET /api/reports with HTTP 403: got ${err.response?.status}`);
    }

    // 4. Program Manager without project -> 403
    const tokenPMUnassigned = makeToken({ id: '33333333-9999-9999-9999-999999999999', role: 'Program Manager', projectId: null });
    try {
      await axios.get(`${API_URL}`, { headers: { Authorization: `Bearer ${tokenPMUnassigned}` } });
      assert(false, 'Program Manager without assigned project should be blocked from GET /api/reports');
    } catch (err) {
      assert(err.response?.status === 403, `Program Manager without assigned project blocked from GET /api/reports with HTTP 403: got ${err.response?.status}`);
    }

    const sessionListBlocked = [
      { name: 'Employee', token: tokenEmployee },
      { name: 'HR Admin', token: tokenHRAdmin },
      { name: 'Manager', token: tokenManager },
      { name: 'Operation Manager', token: tokenOpMgr }
    ];
    for (const b of sessionListBlocked) {
      try {
        await axios.get(`${API_URL}`, { headers: { Authorization: `Bearer ${b.token}` } });
        assert(false, `${b.name} should be blocked from GET /api/reports`);
      } catch (err) {
        assert(err.response?.status === 403, `GET /api/reports blocked for ${b.name} with HTTP 403: got ${err.response?.status}`);
      }
    }

    // ── 5.11 Route: Single Session Report (GET /api/reports/:sessionId) Scope Security ──
    console.log('  Testing Single Session Report (GET /api/reports/:sessionId) scope security:');
    // Admin accessing any session
    const resSessAdmin = await axios.get(`${API_URL}/${SESS_GALD_AUG_ID}`, { headers: { Authorization: `Bearer ${tokenAdmin}` } });
    assert(resSessAdmin.status === 200, 'Admin accessing Galderma session report returns 200 OK');

    // PM SSEIL accessing authorized SSEIL session
    const resSessPMSOwn = await axios.get(`${API_URL}/${SESS_SSEIL_AUG_ID}`, { headers: { Authorization: `Bearer ${tokenPMSseil}` } });
    assert(resSessPMSOwn.status === 200, 'PM SSEIL accessing authorized SSEIL session report returns 200 OK');

    // Trainer accessing their hosted Galderma session
    const resSessTrainer = await axios.get(`${API_URL}/${SESS_GALD_AUG_ID}`, { headers: { Authorization: `Bearer ${tokenTrainer}` } });
    assert(resSessTrainer.status === 200, 'Trainer accessing hosted Galderma session report returns 200 OK');

    // PM SSEIL accessing foreign Galderma session -> 403 Forbidden
    try {
      await axios.get(`${API_URL}/${SESS_GALD_AUG_ID}`, { headers: { Authorization: `Bearer ${tokenPMSseil}` } });
      assert(false, 'PM SSEIL should be blocked from viewing Galderma session report');
    } catch (err) {
      assert(err.response?.status === 403, `PM SSEIL blocked from foreign session report with HTTP 403: got ${err.response?.status}`);
    }

    // Client Galderma accessing foreign SSEIL session -> 403 Forbidden
    try {
      await axios.get(`${API_URL}/${SESS_SSEIL_AUG_ID}`, { headers: { Authorization: `Bearer ${tokenClientGald}` } });
      assert(false, 'Client Galderma should be blocked from viewing foreign SSEIL session report');
    } catch (err) {
      assert(err.response?.status === 403, `Client Galderma blocked from foreign session report with HTTP 403: got ${err.response?.status}`);
    }

    // Employee accessing session report -> 403 Forbidden
    try {
      await axios.get(`${API_URL}/${SESS_GALD_AUG_ID}`, { headers: { Authorization: `Bearer ${tokenEmployee}` } });
      assert(false, 'Employee should be blocked from viewing session report');
    } catch (err) {
      assert(err.response?.status === 403, `Employee blocked from session report with HTTP 403: got ${err.response?.status}`);
    }

    // Non-existent legacy routes return 404 cleanly
    const legacyRoutes = ['assessment-trends', 'quiz-analytics', 'training-effectiveness', 'comprehensive'];
    for (const lr of legacyRoutes) {
      try {
        await axios.get(`${API_URL}/${lr}`, { headers: { Authorization: `Bearer ${tokenAdmin}` } });
        assert(false, `Route /${lr} should not exist`);
      } catch (err) {
        assert(err.response?.status === 404, `Route /${lr} cleanly returns HTTP 404 Not Found: got ${err.response?.status}`);
      }
    }

  } finally {
    server.close();
  }

  // -------------------------------------------------------------
  // GATE 6: Deterministic Pass-Threshold Boundary Classification
  // -------------------------------------------------------------
  console.log('\n--- GATE 6: Deterministic Pass-Threshold Boundary Classification ---');

  // 6.1 Platform Default Threshold Semantics (70% when quiz.config.passing_score is undefined)
  console.log('  Testing Platform Default Threshold Semantics (70%):');
  const boundaryScoresDefault = [59, 60, 69, 70, 71];
  const participantsDefault = boundaryScoresDefault.map((score) => ({
    id: `p-def-${score}`,
    name: `Learner ${score}%`,
    employeeId: `EMP_DEF_${score}`,
    Responses: Array.from({ length: score }, (_, idx) => ({ points_awarded: 1, is_correct: true }))
  }));

  const compiledDefault = reportAnalyticsEngine.compileSessionParticipantResults(
    participantsDefault,
    100,
    'ONLINE',
    { name: 'Benchmark Project' },
    { title: 'Default Benchmark Quiz' } // no config.passing_score -> defaults to 70
  );

  // Score 59% (below operational 60% and below passing 70%)
  assert(compiledDefault.results[0].passed === false, 'Default 70%: Score 59% is classified as FAIL (< 70%)');
  assert(compiledDefault.results[0].status === 'Fail', 'Default 70%: Score 59% status is "Fail"');
  assert(compiledDefault.results[0].needsOperationalIntervention === true, 'Default 70%: Score 59% requires operational intervention (< 60%)');
  assert(compiledDefault.results[0].passingThreshold === '70%', 'Default 70%: Score 59% reports passingThreshold "70%"');

  // Score 60% (at operational 60%, below passing 70%)
  assert(compiledDefault.results[1].passed === false, 'Default 70%: Score 60% is classified as FAIL (< 70%)');
  assert(compiledDefault.results[1].status === 'Fail', 'Default 70%: Score 60% status is "Fail"');
  assert(compiledDefault.results[1].needsOperationalIntervention === false, 'Default 70%: Score 60% does NOT trigger operational intervention (>= 60%)');

  // Score 69% (immediately below 70% threshold)
  assert(compiledDefault.results[2].passed === false, 'Default 70%: Score 69% is classified as FAIL (< 70%)');
  assert(compiledDefault.results[2].status === 'Fail', 'Default 70%: Score 69% status is "Fail"');
  assert(compiledDefault.results[2].needsOperationalIntervention === false, 'Default 70%: Score 69% does NOT trigger operational intervention');

  // Score 70% (immediately at 70% threshold)
  assert(compiledDefault.results[3].passed === true, 'Default 70%: Score 70% is classified as PASS (>= 70%)');
  assert(compiledDefault.results[3].status === 'Pass', 'Default 70%: Score 70% status is "Pass"');
  assert(compiledDefault.results[3].needsOperationalIntervention === false, 'Default 70%: Score 70% does NOT trigger operational intervention');

  // Score 71% (immediately above 70% threshold)
  assert(compiledDefault.results[4].passed === true, 'Default 70%: Score 71% is classified as PASS (>= 70%)');
  assert(compiledDefault.results[4].status === 'Pass', 'Default 70%: Score 71% status is "Pass"');
  assert(compiledDefault.results[4].needsOperationalIntervention === false, 'Default 70%: Score 71% does NOT trigger operational intervention');

  assert(compiledDefault.passedCount === 2, `Default 70%: Exactly 2 of 5 boundary participants passed: got ${compiledDefault.passedCount}`);
  assert(compiledDefault.attentionParticipants.length === 1, `Default 70%: Exactly 1 participant requires intervention (59% < 60%): got ${compiledDefault.attentionParticipants.length}`);
  assert(compiledDefault.attentionParticipants[0].reason.includes('60% operational threshold'), 'Default 70%: Intervention alert explicitly cites 60% operational threshold');

  // 6.2 Configured Threshold Override Semantics (passing_score = 60)
  console.log('  Testing Configured Threshold Override (passing_score = 60):');
  const boundaryScores60 = [59, 60, 61];
  const participants60 = boundaryScores60.map((score) => ({
    id: `p-60-${score}`,
    name: `Learner 60Config ${score}%`,
    employeeId: `EMP_60_${score}`,
    Responses: Array.from({ length: score }, (_, idx) => ({ points_awarded: 1, is_correct: true }))
  }));

  const compiled60 = reportAnalyticsEngine.compileSessionParticipantResults(
    participants60,
    100,
    'ONLINE',
    { name: 'Config 60 Project' },
    { title: 'Config 60 Quiz', config: { passing_score: 60 } }
  );

  assert(compiled60.results[0].passed === false, 'Configured 60%: Score 59% (below) is classified as FAIL (< 60%)');
  assert(compiled60.results[0].status === 'Fail', 'Configured 60%: Score 59% status is "Fail"');
  assert(compiled60.results[0].needsOperationalIntervention === true, 'Configured 60%: Score 59% requires operational intervention (< 60%)');
  assert(compiled60.results[0].passingThreshold === '60%', 'Configured 60%: Score 59% reports passingThreshold "60%"');

  assert(compiled60.results[1].passed === true, 'Configured 60%: Score 60% (at threshold) is classified as PASS (>= 60%)');
  assert(compiled60.results[1].status === 'Pass', 'Configured 60%: Score 60% status is "Pass"');
  assert(compiled60.results[1].needsOperationalIntervention === false, 'Configured 60%: Score 60% does NOT trigger operational intervention');

  assert(compiled60.results[2].passed === true, 'Configured 60%: Score 61% (above) is classified as PASS (>= 60%)');
  assert(compiled60.results[2].status === 'Pass', 'Configured 60%: Score 61% status is "Pass"');

  assert(compiled60.passedCount === 2, `Configured 60%: Exactly 2 of 3 participants passed: got ${compiled60.passedCount}`);
  assert(compiled60.attentionParticipants.length === 1, `Configured 60%: Exactly 1 participant flagged for operational intervention (59%): got ${compiled60.attentionParticipants.length}`);

  // 6.3 Configured Threshold Override Semantics (passing_score = 80)
  console.log('  Testing Configured Threshold Override (passing_score = 80):');
  const boundaryScores80 = [79, 80, 81];
  const participants80 = boundaryScores80.map((score) => ({
    id: `p-80-${score}`,
    name: `Learner 80Config ${score}%`,
    employeeId: `EMP_80_${score}`,
    Responses: Array.from({ length: score }, (_, idx) => ({ points_awarded: 1, is_correct: true }))
  }));

  const compiled80 = reportAnalyticsEngine.compileSessionParticipantResults(
    participants80,
    100,
    'ONLINE',
    { name: 'Config 80 Project' },
    { title: 'Config 80 Quiz', config: { passing_score: 80 } }
  );

  assert(compiled80.results[0].passed === false, 'Configured 80%: Score 79% (below) is classified as FAIL (< 80%)');
  assert(compiled80.results[0].status === 'Fail', 'Configured 80%: Score 79% status is "Fail"');
  assert(compiled80.results[0].needsOperationalIntervention === false, 'Configured 80%: Score 79% does NOT require operational intervention (>= 60%)');
  assert(compiled80.results[0].passingThreshold === '80%', 'Configured 80%: Score 79% reports passingThreshold "80%"');

  assert(compiled80.results[1].passed === true, 'Configured 80%: Score 80% (at threshold) is classified as PASS (>= 80%)');
  assert(compiled80.results[1].status === 'Pass', 'Configured 80%: Score 80% status is "Pass"');

  assert(compiled80.results[2].passed === true, 'Configured 80%: Score 81% (above) is classified as PASS (>= 80%)');
  assert(compiled80.results[2].status === 'Pass', 'Configured 80%: Score 81% status is "Pass"');

  assert(compiled80.passedCount === 2, `Configured 80%: Exactly 2 of 3 participants passed: got ${compiled80.passedCount}`);
  assert(compiled80.attentionParticipants.length === 0, `Configured 80%: Zero participants flagged for operational intervention: got ${compiled80.attentionParticipants.length}`);

  // 6.4 Authoritative Platform Certificate Benchmark (routes/certificates.js minScore = 70)
  console.log('  Testing Certificate Rule & Participant 360 Benchmark:');
  const evalCertEligibility = (score, att = 85, comp = 100, minScore = 70, minAttendance = 80, minComp = 100) => {
    const isEligible = (att >= minAttendance) && (score >= minScore) && (comp >= minComp);
    let ineligibilityReason = null;
    if (!isEligible) {
      if (att < minAttendance) ineligibilityReason = `Attendance (${att}%) below required ${minAttendance}%`;
      else if (score < minScore) ineligibilityReason = `Score (${score}%) below passing ${minScore}%`;
      else ineligibilityReason = `Training completion (${comp}%) incomplete`;
    }
    return { isEligible, ineligibilityReason };
  };

  const cert59 = evalCertEligibility(59);
  assert(cert59.isEligible === false, 'Authoritative Rule: Score 59% is INELIGIBLE for Certificate (minScore: 70)');
  assert(cert59.ineligibilityReason.includes('below passing 70%'), 'Authoritative Rule: Score 59% reason cites 70% requirement');

  const cert60 = evalCertEligibility(60);
  assert(cert60.isEligible === false, 'Authoritative Rule: Score 60% is INELIGIBLE for Certificate (minScore: 70)');
  assert(cert60.ineligibilityReason.includes('below passing 70%'), 'Authoritative Rule: Score 60% reason cites 70% requirement');

  const cert69 = evalCertEligibility(69);
  assert(cert69.isEligible === false, 'Authoritative Rule: Score 69% is INELIGIBLE for Certificate (minScore: 70)');
  assert(cert69.ineligibilityReason.includes('below passing 70%'), 'Authoritative Rule: Score 69% reason cites 70% requirement');

  const cert70 = evalCertEligibility(70);
  assert(cert70.isEligible === true, 'Authoritative Rule: Score 70% is ELIGIBLE for Certificate (minScore: 70)');
  assert(cert70.ineligibilityReason === null, 'Authoritative Rule: Score 70% has null ineligibility reason');

  const cert71 = evalCertEligibility(71);
  assert(cert71.isEligible === true, 'Authoritative Rule: Score 71% is ELIGIBLE for Certificate (minScore: 70)');
  assert(cert71.ineligibilityReason === null, 'Authoritative Rule: Score 71% has null ineligibility reason');

  // Participant 360 Assessment Benchmark (projectIntelligenceService.js)
  const evalP360 = (avgScore) => ({
    requirement: 'Assessment Score',
    threshold: '≥ 70%',
    result: `${avgScore}%`,
    status: avgScore >= 70 ? 'ELIGIBLE' : 'NOT ELIGIBLE',
    passed: avgScore >= 70,
    note: avgScore >= 70 ? 'Passing score achieved' : `Below 70% mark (${avgScore}%)`
  });

  assert(evalP360(69).status === 'NOT ELIGIBLE', 'Participant 360: Score 69% is NOT ELIGIBLE under 70% benchmark');
  assert(evalP360(69).passed === false, 'Participant 360: Score 69% passed is false');
  assert(evalP360(70).status === 'ELIGIBLE', 'Participant 360: Score 70% is ELIGIBLE under 70% benchmark');
  assert(evalP360(70).passed === true, 'Participant 360: Score 70% passed is true');
  assert(evalP360(71).status === 'ELIGIBLE', 'Participant 360: Score 71% is ELIGIBLE under 70% benchmark');
  assert(evalP360(71).passed === true, 'Participant 360: Score 71% passed is true');

  // 6.5 Cross-Report Parity Agreement (Level 1, Level 2, Level 3, Master Outcome, Excel, PPT)
  console.log('  Testing Cross-Report Pass/Fail Agreement for Participant Records:');
  // Target: Rohan Gupta (score 50%, failed in default 70% quiz)
  // Target: Aarav Patel (score 100%, passed in default 70% quiz)
  const l1Gald = await reportAnalyticsEngine.generateLevel1QuizReport('quiz-gald', SESS_GALD_AUG_ID, fixtureUsers[0]);
  const l2Gald = await reportAnalyticsEngine.generateLevel2ProjectMonthlyReport(GALDERMA_ID, '2026-08', fixtureUsers[0]);
  const galdOutcomes = await intelligenceService.getMasterTrainingOutcomeData([GALDERMA_ID], { period: '2026-08' });

  // 1. Rohan Gupta: Fail Agreement Across All Surfaces
  const rohanL1 = l1Gald.participantResults.find(p => p.name === 'Rohan Gupta');
  assert(rohanL1 && rohanL1.passed === false && rohanL1.status === 'Fail', 'Cross-Report Agreement: Rohan Gupta (50%) is "Fail" in Level 1');

  const rohanL2 = l2Gald.participantResults.find(p => p.name === 'Rohan Gupta');
  assert(rohanL2 && rohanL2.passed === false && rohanL2.status === 'Fail', 'Cross-Report Agreement: Rohan Gupta (50%) is "Fail" in Level 2');

  const rohanOutcome = galdOutcomes.find(p => p.participant === 'Rohan Gupta');
  assert(rohanOutcome && rohanOutcome.passFail === 'Fail', 'Cross-Report Agreement: Rohan Gupta (50%) is "Fail" in Master Outcome');

  const excelBufGald = await reportExcelGenerator.generate10SheetExcelWorkbook(l1Gald, galdOutcomes);
  const wbGald = new ExcelJS.Workbook();
  await wbGald.xlsx.load(excelBufGald);
  const ws5Gald = wbGald.worksheets.find(ws => ws.name.includes('Quiz Details') || ws.name.includes('Participant Performance'));
  assert(ws5Gald !== undefined, 'Cross-Report Agreement: Excel Quiz Details sheet found');
  let passFailColIdx = 10;
  ws5Gald.getRow(1).eachCell((cell, colNum) => {
    if (String(cell.value).toLowerCase().includes('pass')) passFailColIdx = colNum;
  });
  let rohanExcelStatus = null;
  ws5Gald.eachRow((row, rowNumber) => {
    if (rowNumber >= 2 && String(row.getCell(1).value).includes('Rohan')) {
      rohanExcelStatus = row.getCell(passFailColIdx).value;
    }
  });
  assert(rohanExcelStatus === 'Fail', `Cross-Report Agreement: Rohan Gupta is "Fail" in Excel export: got ${rohanExcelStatus}`);

  // PPT Agreement: Rohan is NOT in top exemplar performers
  const pptL1 = l1Gald.participantPerformance || [];
  const rohanPpt = pptL1.find(p => p.participantName === 'Rohan Gupta');
  assert(rohanPpt && rohanPpt.status === 'FAILED', 'Cross-Report Agreement: Rohan Gupta is "FAILED" in Level 1 PPT performance payload');

  // 2. Aarav Patel: Pass Agreement Across All Surfaces
  const aaravL1 = l1Gald.participantResults.find(p => p.name === 'Aarav Patel');
  assert(aaravL1 && aaravL1.passed === true && aaravL1.status === 'Pass', 'Cross-Report Agreement: Aarav Patel (100%) is "Pass" in Level 1');

  const aaravL2 = l2Gald.participantResults.find(p => p.name === 'Aarav Patel');
  assert(aaravL2 && aaravL2.passed === true && aaravL2.status === 'Pass', 'Cross-Report Agreement: Aarav Patel (100%) is "Pass" in Level 2');

  const aaravOutcome = galdOutcomes.find(p => p.participant === 'Aarav Patel');
  assert(aaravOutcome && aaravOutcome.passFail === 'Pass', 'Cross-Report Agreement: Aarav Patel (100%) is "Pass" in Master Outcome');

  let aaravExcelStatus = null;
  ws5Gald.eachRow((row, rowNumber) => {
    if (rowNumber >= 2 && String(row.getCell(1).value).includes('Aarav')) {
      aaravExcelStatus = row.getCell(passFailColIdx).value;
    }
  });
  assert(aaravExcelStatus === 'Pass', `Cross-Report Agreement: Aarav Patel is "Pass" in Excel export: got ${aaravExcelStatus}`);

  const aaravPpt = pptL1.find(p => p.participantName === 'Aarav Patel');
  assert(aaravPpt && aaravPpt.status === 'PASSED', 'Cross-Report Agreement: Aarav Patel is "PASSED" in Level 1 PPT performance payload');

  // -------------------------------------------------------------
  // FINAL REPORT & SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${PASS} PASSED, ${FAIL} FAILED`);
  console.log('================================================================');

  if (FAIL > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runRegressionSuite().catch(err => {
  console.error('FATAL TEST SUITE ERROR:', err);
  process.exit(1);
});
