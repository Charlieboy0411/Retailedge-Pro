const path = require('path');
const Project = require('../models/Project');
const User = require('../models/User');
const Certificate = require('../models/Certificate');
const Quiz = require('../models/Quiz');
const Session = require('../models/Session');
const Participant = require('../models/Participant');
const Training = require('../models/Training');
const TrainingProgress = require('../models/TrainingProgress');
const JitsiAttendance = require('../models/JitsiAttendance');
const tdService = require('../utils/tdService');
const { Op } = require('sequelize');

async function auditData() {
  console.log('====================================================');
  console.log('  T&D CAPABILITY COCKPIT DEEP DATA AUDIT');
  console.log('====================================================\n');

  // 1. Identify Charles Richardson & Authorized Projects
  const charles = await User.findOne({ where: { email: 'charles@idonneous.com' } });
  console.log('Charles Richardson:', { id: charles.id, email: charles.email, role: charles.role, projectId: charles.projectId });

  const accessibleProjectIds = await tdService.getAccessibleTDProjectIds(charles, 'all', 'all');
  console.log('Accessible Project IDs count:', accessibleProjectIds.length);

  const projects = await Project.findAll({
    where: { id: { [Op.in]: accessibleProjectIds } },
    attributes: ['id', 'name', 'project_code', 'parentId']
  });

  const baseProjects = projects.filter(p => !p.parentId);
  const subProjects = projects.filter(p => p.parentId);
  console.log(`Base Projects (${baseProjects.length}):`, baseProjects.map(p => ({ id: p.id, name: p.name })));
  console.log(`Subprojects (${subProjects.length}):`, subProjects.map(p => ({ id: p.id, name: p.name, parentId: p.parentId })));

  // Check if any subproject has a parent that is NOT in baseProjects
  const orphanOrForeignSubs = subProjects.filter(sp => !baseProjects.some(bp => bp.id === sp.parentId));
  console.log('Subprojects with parents outside baseProjects:', orphanOrForeignSubs.length);

  // 2. Audit the 4 Certificates Issued
  console.log('\n--- AUDIT 4 CERTIFICATES ---');
  const certs = await Certificate.findAll({
    where: {
      projectId: { [Op.in]: accessibleProjectIds },
      status: { [Op.in]: ['VALID', 'ISSUED', 'Active', 'Valid'] }
    },
    raw: true
  });

  console.log(`Found ${certs.length} certificates:`);
  for (const c of certs) {
    console.log({
      id: c.id,
      certificate_id: c.certificate_id,
      userId: c.userId,
      projectId: c.projectId,
      trainingId: c.trainingId,
      issueDate: c.issueDate,
      assessmentScore: c.assessmentScore,
      attendancePercentage: c.attendancePercentage,
      status: c.status
    });
  }

  // 3. Audit Assessments, Quizzes, Sessions, Participants for Idonneous
  console.log('\n--- AUDIT ASSESSMENTS & PARTICIPANTS ---');
  const quizzes = await Quiz.findAll({
    where: { projectId: { [Op.in]: accessibleProjectIds } },
    attributes: ['id', 'title', 'projectId', 'createdAt']
  });
  console.log(`Quizzes in scope (${quizzes.length}):`, quizzes.map(q => ({ id: q.id, title: q.title, projectId: q.projectId })));

  const sessions = await Session.findAll({
    where: { projectId: { [Op.in]: accessibleProjectIds } },
    attributes: ['id', 'roomCode', 'quizId', 'projectId', 'status', 'startedAt', 'createdAt']
  });
  console.log(`Sessions in scope (${sessions.length}):`, sessions.map(s => ({ id: s.id, roomCode: s.roomCode, quizId: s.quizId, projectId: s.projectId, status: s.status })));

  const sessionIds = sessions.map(s => s.id);
  const participantsWithSession = await Participant.findAll({
    where: { sessionId: { [Op.in]: sessionIds } },
    attributes: ['id', 'name', 'userId', 'sessionId', 'score', 'createdAt']
  });
  console.log(`Participants joined via Session in scope (${participantsWithSession.length}):`, participantsWithSession);

  const allScopedUsers = await User.findAll({
    where: { projectId: { [Op.in]: accessibleProjectIds } },
    attributes: ['id', 'name', 'email']
  });
  const scopedUserIds = allScopedUsers.map(u => u.id);

  const participantsByUserId = await Participant.findAll({
    where: { userId: { [Op.in]: scopedUserIds } },
    attributes: ['id', 'name', 'userId', 'sessionId', 'score', 'createdAt']
  });
  console.log(`Participants matched by scoped userId (${participantsByUserId.length}):`, participantsByUserId);

  // Check if participants exist anywhere in DB with non-null score
  const allScoredParticipants = await Participant.findAll({
    where: { score: { [Op.gt]: 0 } }
  });
  console.log(`Total scored participants in entire DB (${allScoredParticipants.length}):`, allScoredParticipants.map(p => ({ id: p.id, name: p.name, userId: p.userId, sessionId: p.sessionId, score: p.score })));

  // 4. Audit Training & TrainingProgress
  console.log('\n--- AUDIT TRAINING & PROGRESS ---');
  const trainings = await Training.findAll({
    where: { projectId: { [Op.in]: accessibleProjectIds } },
    attributes: ['id', 'title', 'projectId', 'type']
  });
  console.log(`Trainings in scope (${trainings.length}):`, trainings.map(t => ({ id: t.id, title: t.title, type: t.type })));

  const trainingIds = trainings.map(t => t.id);
  const progresses = await TrainingProgress.findAll({
    where: {
      [Op.or]: [
        { trainingId: { [Op.in]: trainingIds } },
        { userId: { [Op.in]: scopedUserIds } }
      ]
    },
    attributes: ['id', 'userId', 'trainingId', 'completed', 'completedAt']
  });
  console.log(`TrainingProgress in scope (${progresses.length}):`, progresses.map(p => ({ id: p.id, userId: p.userId, trainingId: p.trainingId, completed: p.completed })));

  // 5. Audit JitsiAttendance
  console.log('\n--- AUDIT JITSI ATTENDANCE ---');
  const attendances = await JitsiAttendance.findAll({
    where: {
      [Op.or]: [
        { projectId: { [Op.in]: accessibleProjectIds } },
        { userId: { [Op.in]: scopedUserIds } }
      ]
    },
    attributes: ['id', 'userId', 'trainingId', 'projectId', 'attendancePercentage', 'status', 'firstJoinedAt']
  });
  console.log(`JitsiAttendance in scope (${attendances.length}):`, attendances.map(a => ({ id: a.id, userId: a.userId, trainingId: a.trainingId, pct: a.attendancePercentage, status: a.status })));

  process.exit(0);
}

auditData().catch(e => {
  console.error(e);
  process.exit(1);
});
