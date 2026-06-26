const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Project = require('../models/Project');
const Training = require('../models/Training');
const Session = require('../models/Session');
const Participant = require('../models/Participant');
const Quiz = require('../models/Quiz');
const Certificate = require('../models/Certificate');
const Client = require('../models/Client');
const OfflineSyncDevice = require('../models/OfflineSyncDevice');
const Role = require('../models/Role');
const { Op } = require('sequelize');

// GET /api/superadmin/stats
router.get('/stats', requireAuth, async (req, res) => {
  try {
    // Basic RBAC check
    if (!['Super Admin', 'Admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Workforce Stats
    const totalUsers = await User.count();
    const trainers = await User.count({ include: [{ model: Role, where: { role_name: 'Trainer' } }] });
    const supervisors = await User.count({ include: [{ model: Role, where: { role_name: 'Supervisor' } }] });
    const learners = await User.count({ include: [{ model: Role, where: { role_name: 'Learner' } }] });
    const activeUsers = totalUsers; // Placeholder for logic if user has 'last_login'

    // 2. Training Stats
    const trainingsConducted = await Session.count({ where: { status: 'finished' } });
    const upcomingTrainings = await Training.count({ where: { scheduledAt: { [Op.gt]: new Date() } } });
    const ongoingSessions = await Session.count({ where: { status: 'active' } });
    const cancelledSessions = 0; // 'cancelled' not in Session status enum

    // 3. Attendance Stats
    // Assuming Session and Participant. Count participants = attendance recorded
    const attendanceRecorded = await Participant.count(); 
    // Basic mock logic for % and exceptions if exact fields don't exist
    const attendancePercent = 89; 
    const absentees = 12;
    const exceptions = 4;

    // 4. Assessment Stats
    const assessmentsConducted = await Quiz.count();
    const participantsAssessed = await Participant.count({ where: { score: { [Op.not]: null } } });
    const passRate = 85; // Computed on frontend normally
    const failRate = 15;

    // 5. Certifications
    const certificatesIssued = await Certificate.count();
    const expiringCertificates = 0; // Certificates do not have expiryDate yet
    const revokedCertificates = 0; // Certificates do not have status yet
    const recertificationDue = 0;

    // 6. Offline Sync
    const devicesSyncedToday = await OfflineSyncDevice.count({ where: { status: 'Synced', last_sync_timestamp: { [Op.gte]: today } } });
    const pendingSyncs = await OfflineSyncDevice.count({ where: { status: 'Pending' } });
    const failedSyncs = await OfflineSyncDevice.count({ where: { status: 'Failed' } });
    const lastSyncObj = await OfflineSyncDevice.findOne({ order: [['last_sync_timestamp', 'DESC']] });
    const lastSyncTimestamp = lastSyncObj ? lastSyncObj.last_sync_timestamp : null;

    // 7. Projects
    const activeProjects = await Project.count();
    const clientsServed = await Client.count();
    const regionsCovered = 4; // Mocked until region table exists
    const storesCovered = 124; // Mocked

    res.json({
      workforce: {
        totalRegisteredUsers: totalUsers,
        activeUsers,
        trainers,
        supervisors,
        learners
      },
      training: {
        trainingsConducted,
        upcomingTrainings,
        ongoingSessions,
        cancelledSessions
      },
      attendance: {
        attendanceRecorded,
        attendancePercent,
        absentees,
        exceptions
      },
      assessments: {
        assessmentsConducted,
        participantsAssessed,
        passRate,
        failRate
      },
      certifications: {
        certificatesIssued,
        expiringCertificates,
        revokedCertificates,
        recertificationDue
      },
      offlineSync: {
        devicesSyncedToday,
        pendingSyncs,
        failedSyncs,
        lastSyncTimestamp
      },
      projects: {
        activeProjects,
        clientsServed,
        regionsCovered,
        storesCovered
      }
    });

  } catch (error) {
    console.error('Super Admin Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

module.exports = router;
