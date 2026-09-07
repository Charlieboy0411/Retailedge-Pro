const sequelize = require('../config/database');
const Project = require('../models/Project');
const User = require('../models/User');
const Role = require('../models/Role');
const Quiz = require('../models/Quiz');
const Session = require('../models/Session');
const Training = require('../models/Training');
const JitsiAttendance = require('../models/JitsiAttendance');
const JitsiInterval = require('../models/JitsiInterval');
const ProjectAssignment = require('../models/ProjectAssignment');

async function migratePMIntelligence() {
  try {
    console.log('🔄 Starting RetailEdge Pro PM Intelligence Schema Migration...');
    await sequelize.authenticate();
    console.log('✅ Connected to database.');

    // 1. Sync new models
    console.log('📦 Syncing JitsiAttendance, JitsiInterval, ProjectAssignment, and Session updates...');
    await JitsiAttendance.sync({ alter: true });
    await JitsiInterval.sync({ alter: true });
    await ProjectAssignment.sync({ alter: true });
    await Session.sync({ alter: true });
    console.log('✅ Tables synced successfully.');

    // 2. Backfill Session.projectId from Quiz.projectId where currently null
    console.log('🔗 Backfilling Session.projectId from Quiz relationships...');
    const sessions = await Session.findAll({
      where: { projectId: null },
      include: [{ model: Quiz, attributes: ['id', 'projectId'] }]
    });

    let updatedSessions = 0;
    for (const session of sessions) {
      if (session.Quiz && session.Quiz.projectId) {
        await session.update({ projectId: session.Quiz.projectId });
        updatedSessions++;
      }
    }
    console.log(`✅ Backfilled ${updatedSessions} session project associations.`);

    // 3. Backfill ProjectAssignment from existing User.projectId
    console.log('👥 Backfilling ProjectAssignment records for existing users...');
    const usersWithProject = await User.findAll({
      where: sequelize.literal(`"User"."projectId" IS NOT NULL`),
      include: [{ model: Role, attributes: ['id', 'role_name'] }]
    });

    let createdAssignments = 0;
    for (const user of usersWithProject) {
      const rawProjects = String(user.projectId).split(',').map(p => p.trim()).filter(Boolean);
      for (const pId of rawProjects) {
        // Verify project exists
        const projExists = await Project.findByPk(pId);
        if (projExists) {
          const [assignment, created] = await ProjectAssignment.findOrCreate({
            where: {
              userId: user.id,
              projectId: pId
            },
            defaults: {
              role: user.Role ? user.Role.role_name : 'Program Manager',
              status: 'Active'
            }
          });
          if (created) createdAssignments++;
        }
      }
    }
    console.log(`✅ Created ${createdAssignments} project assignments from existing user records.`);

    // 4. Backfill sample Jitsi telemetry for existing Meeting trainings if none exist
    const meetings = await Training.findAll({ where: { type: 'Meeting' } });
    console.log(`📹 Found ${meetings.length} meeting training records.`);

    for (const meeting of meetings) {
      const existingAttendance = await JitsiAttendance.count({ where: { trainingId: meeting.id } });
      if (existingAttendance === 0) {
        // Find users in the project or demo users to seed realistic telemetry
        const projUsers = meeting.projectId
          ? await User.findAll({ where: { projectId: meeting.projectId }, limit: 4 })
          : await User.findAll({ limit: 4 });

        for (let i = 0; i < projUsers.length; i++) {
          const u = projUsers[i];
          const isFull = i % 2 === 0;
          const rejoins = i === 1 ? 1 : 0;
          const attendedMins = isFull ? 54 : 38;
          const schedMins = 60;
          const pct = Math.round((attendedMins / schedMins) * 100);

          const jAtt = await JitsiAttendance.create({
            trainingId: meeting.id,
            projectId: meeting.projectId,
            userId: u.id,
            participantName: u.name,
            employeeId: u.employee_id || `EMP-00${i+1}`,
            jitsiParticipantId: `jitsi-${u.id.substring(0, 8)}`,
            scheduledDurationMinutes: schedMins,
            totalAttendedMinutes: attendedMins,
            attendancePercentage: pct,
            rejoinCount: rejoins,
            status: isFull ? 'Completed' : 'Left Early',
            firstJoinedAt: meeting.scheduledAt || new Date(Date.now() - 3600000),
            lastLeftAt: new Date(),
            lastHeartbeatAt: new Date()
          });

          // Add interval records
          if (rejoins === 1) {
            await JitsiInterval.create({
              jitsiAttendanceId: jAtt.id,
              joinedAt: new Date(Date.now() - 3600000),
              leftAt: new Date(Date.now() - 2400000),
              durationSeconds: 1200
            });
            await JitsiInterval.create({
              jitsiAttendanceId: jAtt.id,
              joinedAt: new Date(Date.now() - 1800000),
              leftAt: new Date(Date.now() - 720000),
              durationSeconds: 1080
            });
          } else {
            await JitsiInterval.create({
              jitsiAttendanceId: jAtt.id,
              joinedAt: new Date(Date.now() - 3600000),
              leftAt: new Date(Date.now() - (3600000 - attendedMins * 60000)),
              durationSeconds: attendedMins * 60
            });
          }
        }
      }
    }

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migratePMIntelligence();
