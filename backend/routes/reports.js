const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const Quiz = require('../models/Quiz');
const User = require('../models/User');
const Project = require('../models/Project');
const Role = require('../models/Role');
const Participant = require('../models/Participant');
const Question = require('../models/Question');
const Response = require('../models/Response');
const Training = require('../models/Training');
const TrainingProgress = require('../models/TrainingProgress');
const { requireAuth } = require('../middleware/authMiddleware');
const { Op } = require('sequelize');

function getZoneFromCoords(lat, lng, defaultLocation) {
  if (lat === undefined || lat === null || lng === undefined || lng === null) {
    if (defaultLocation) {
      const match = defaultLocation.match(/(North|West|East|South)/i);
      return match ? match[0].charAt(0).toUpperCase() + match[0].slice(1).toLowerCase() : 'N/A';
    }
    return 'N/A';
  }

  // Reference coordinates for Indian retail hubs representing zones:
  // Delhi (North): 28.6139, 77.2090
  // Mumbai (West): 19.0760, 72.8777
  // Kolkata (East): 22.5726, 88.3639
  // Bangalore (South): 12.9716, 77.5946
  
  const zones = [
    { name: 'North', lat: 28.6139, lng: 77.2090 },
    { name: 'West', lat: 19.0760, lng: 72.8777 },
    { name: 'East', lat: 22.5726, lng: 88.3639 },
    { name: 'South', lat: 12.9716, lng: 77.5946 }
  ];

  let closestZone = 'N/A';
  let minDistance = Infinity;

  for (const zone of zones) {
    const dist = Math.sqrt(Math.pow(lat - zone.lat, 2) + Math.pow(lng - zone.lng, 2));
    if (dist < minDistance) {
      minDistance = dist;
      closestZone = zone.name;
    }
  }

  return closestZone;
}

async function getAccessibleProjectIds(userProjectId) {
  if (!userProjectId) return [];
  const projectIds = String(userProjectId).split(',').map(id => id.trim()).filter(Boolean);
  if (projectIds.length === 0) return [];
  const subProjects = await Project.findAll({
    where: { parentId: { [Op.in]: projectIds } },
    attributes: ['id']
  });
  return [...projectIds, ...subProjects.map(p => p.id)];
}

// GET /api/reports - Fetch reports with RBAC filtering
router.get('/', requireAuth, async (req, res) => {
  try {
    const userRole = req.user.role;
    const userProjectId = req.user.projectId;

    const includeOptions = [
      {
        model: Quiz,
        include: [
          { model: Project, attributes: ['id', 'name'] },
          { model: Question, as: 'questions', attributes: ['id'] }
        ]
      },
      {
        model: Participant,
        attributes: ['id', 'name', 'score']
      },
      {
        model: User,
        as: 'host',
        attributes: ['id', 'name']
      }
    ];

    const whereClause = {};

    // Apply RBAC filters
    if (['Admin', 'Super Admin', 'T&D Manager'].includes(userRole)) {
      // Super Access: No project filtering needed

    } else if (['MD', 'COO', 'VP Operations', 'Marketing Manager'].includes(userRole)) {
      if (!userProjectId) {
        return res.status(403).json({ error: 'You are not assigned to a project.' });
      }
      const projectIds = await getAccessibleProjectIds(userProjectId);
      whereClause['$Quiz.projectId$'] = { [Op.in]: projectIds };
    } else if (['Client', 'Program Manager', 'Manager'].includes(userRole)) {
      // Restricted to specified project
      if (!userProjectId) {
        return res.status(403).json({ error: 'You are not assigned to a project.' });
      }
      const projectIds = await getAccessibleProjectIds(userProjectId);
      whereClause['$Quiz.projectId$'] = { [Op.in]: projectIds };
    } else {
      // Default / Other roles (e.g., Trainer only sees their own sessions)
      whereClause.hostId = req.user.id;
    }

    const sessions = await Session.findAll({
      where: whereClause,
      include: includeOptions,
      order: [['createdAt', 'DESC']]
    });

    // Map the raw data to a cleaner format for the frontend
    const reports = sessions.map(session => {
      const participants = session.Participants || [];
      const totalScore = participants.reduce((sum, p) => sum + p.score, 0);
      // totalQuestions is the number of questions in the quiz (each correct answer = 1 point)
      const totalQuestions = session.Quiz && session.Quiz.questions ? session.Quiz.questions.length : 0;
      const avgScore = participants.length > 0 && totalQuestions > 0
        ? Math.round((totalScore / (participants.length * totalQuestions)) * 100)
        : participants.length > 0 ? Math.min(100, totalScore) : 0;

      return {
        id: session.id,
        title: session.Quiz ? session.Quiz.title : 'Unknown Quiz',
        projectName: session.Quiz && session.Quiz.Project ? session.Quiz.Project.name : 'N/A',
        hostName: session.host ? session.host.name : 'Unknown Host',
        date: session.startedAt ? new Date(session.startedAt).toISOString().split('T')[0] : new Date(session.createdAt).toISOString().split('T')[0],
        participants: participants.length,
        avgScore: `${avgScore}%`, // Formatting for frontend simplicity
        status: session.status
      };
    });

    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Server error while fetching reports.' });
  }
});

// GET /api/reports/attendance - Fetch attendance based on quiz participation
router.get('/attendance', requireAuth, async (req, res) => {
  try {
    const userRole = req.user.role;
    const userProjectId = req.user.projectId;

    if (userRole === 'Employee') {
      const u = await User.findByPk(req.user.id, {
        include: [
          Role,
          Project,
          {
            model: Participant,
            include: [
              Response,
              {
                model: Session,
                include: [
                  {
                    model: Quiz,
                    include: [
                      { model: Question, as: 'questions' },
                      { model: Project, attributes: ['id', 'name'] }
                    ]
                  }
                ]
              }
            ]
          },
          {
            model: TrainingProgress,
            include: [{
              model: Training,
              include: [{ model: Project, attributes: ['id', 'name'] }]
            }]
          }
        ]
      });

      if (!u) return res.status(404).json({ error: 'User not found' });

      const participations = u.Participants || [];
      const individualLogs = participations.map(p => {
        const totalQuestions = p.Session?.Quiz?.questions ? p.Session.Quiz.questions.length : 0;
        const percentage = totalQuestions > 0 ? Math.round((p.score / totalQuestions) * 100) : 0;
        
        const totalTimeMs = (p.Responses || []).reduce((sum, r) => sum + (r.response_time || 0), 0);
        const timeSpentSec = Math.round(totalTimeMs / 1000);

        return {
          id: p.id,
          date: p.Session?.startedAt ? new Date(p.Session.startedAt).toISOString().split('T')[0] : new Date(p.createdAt).toISOString().split('T')[0],
          quizTitle: p.Session?.Quiz ? p.Session.Quiz.title : 'Unknown Quiz',
          projectId: p.Session?.Quiz?.Project?.id || null,
          projectName: p.Session?.Quiz?.Project?.name || 'General',
          score: `${p.score} / ${totalQuestions}`,
          percentage: `${percentage}%`,
          timeSpent: `${timeSpentSec}s`,
          status: 'Completed'
        };
      });

      const trainingProgresses = u.TrainingProgresses || [];
      const trainingLogs = trainingProgresses
        .filter(tp => tp.Training && tp.Training.type === 'Meeting' && (tp.timeSpent > 0 || tp.completed))
        .map(tp => {
          const hours = Math.floor(tp.timeSpent / 3600);
          const minutes = Math.floor((tp.timeSpent % 3600) / 60);
          const seconds = tp.timeSpent % 60;
          let timeSpentStr = '';
          if (hours > 0) timeSpentStr += `${hours}h `;
          if (minutes > 0 || hours > 0) timeSpentStr += `${minutes}m `;
          timeSpentStr += `${seconds}s`;

          return {
            id: tp.id,
            date: tp.completedAt ? new Date(tp.completedAt).toISOString().split('T')[0] : new Date(tp.updatedAt).toISOString().split('T')[0],
            topic: tp.Training.title,
            projectId: tp.Training.projectId || null,
            projectName: tp.Training.Project?.name || 'General',
            timeSpent: timeSpentStr,
            meetingUrl: tp.Training.url,
            status: tp.completed ? 'Completed' : 'Attended'
          };
        });

      return res.json({
        isEmployee: true,
        summary: {
          quizCount: participations.length,
          avgScore: participations.length > 0 
            ? `${Math.round(participations.reduce((sum, p) => {
                const totalQ = p.Session?.Quiz?.questions ? p.Session.Quiz.questions.length : 0;
                return sum + (totalQ > 0 ? (p.score / totalQ) * 100 : 0);
              }, 0) / participations.length)}%`
            : '0%',
          datesCount: [...new Set([
            ...participations.map(p => new Date(p.Session?.startedAt || p.createdAt).toISOString().split('T')[0]),
            ...trainingLogs.map(tl => tl.date)
          ])].length
        },
        logs: individualLogs,
        trainingLogs
      });
    }

    // Admin/Manager View - Fetch all users
    const whereUser = {};
    if (['MD', 'COO', 'VP Operations', 'Marketing Manager'].includes(userRole)) {
      if (!userProjectId) {
        return res.status(403).json({ error: 'You are not assigned to a project.' });
      }
      const projectIds = await getAccessibleProjectIds(userProjectId);
      whereUser.projectId = { [Op.in]: projectIds };
    } else if (['Client', 'Program Manager', 'Manager'].includes(userRole) && userProjectId) {
      const projectIds = await getAccessibleProjectIds(userProjectId);
      whereUser.projectId = { [Op.in]: projectIds };
    }

    const users = await User.findAll({
      where: whereUser,
      include: [
        Role,
        Project,
        {
          model: Participant,
          include: [
            {
              model: Session,
              include: [
                {
                  model: Quiz,
                  include: [{ model: Question, as: 'questions' }]
                }
              ]
            }
          ]
        },
        {
          model: TrainingProgress,
          include: [
            {
              model: Training,
              include: [{ model: Project, attributes: ['id', 'name'] }]
            }
          ]
        }
      ]
    });

    const quizAttendanceLogs = users
      .filter(u => u.Participants && u.Participants.length > 0)
      .map(u => {
        const participations = u.Participants || [];
        const dates = [...new Set(participations.map(p => {
          const date = p.Session?.startedAt || p.createdAt;
          return new Date(date).toISOString().split('T')[0];
        }))].sort((a,b) => new Date(b) - new Date(a));

        const quizCount = participations.length;
        
        let totalPercentage = 0;
        participations.forEach(p => {
          const totalQuestions = p.Session?.Quiz?.questions ? p.Session.Quiz.questions.length : 0;
          const percentage = totalQuestions > 0 ? (p.score / totalQuestions) * 100 : 0;
          totalPercentage += percentage;
        });

        const avgScore = quizCount > 0 ? Math.round(totalPercentage / quizCount) : 0;

        return {
          userId: u.id,
          name: u.name,
          email: u.email,
          employeeId: u.employee_id || 'N/A',
          projectName: u.Project ? u.Project.name : 'Unassigned',
          roleName: u.Role ? u.Role.role_name : 'Employee',
          dates: dates.join(', ') || 'No attendance',
          quizCount,
          avgScore: `${avgScore}%`,
          zone: u.location ? getZoneFromCoords(null, null, u.location) : 'N/A'
        };
      });

    const trainingAttendanceLogs = [];
    users.forEach(u => {
      const progresses = u.TrainingProgresses || [];
      progresses.forEach(tp => {
        if (tp.Training && tp.Training.type === 'Meeting' && (tp.timeSpent > 0 || tp.completed)) {
          const hours = Math.floor(tp.timeSpent / 3600);
          const minutes = Math.floor((tp.timeSpent % 3600) / 60);
          const seconds = tp.timeSpent % 60;
          let timeSpentStr = '';
          if (hours > 0) timeSpentStr += `${hours}h `;
          if (minutes > 0 || hours > 0) timeSpentStr += `${minutes}m `;
          timeSpentStr += `${seconds}s`;

          // Prefer the training meeting's project name; fall back to user's project
          const meetingProjectName = tp.Training.Project
            ? tp.Training.Project.name
            : (u.Project ? u.Project.name : 'General');

          trainingAttendanceLogs.push({
            userId: u.id,
            employeeId: u.employee_id || 'N/A',
            name: u.name,
            projectName: meetingProjectName,
            roleName: u.Role ? u.Role.role_name : 'Employee',
            topic: tp.Training.title,
            date: tp.completedAt ? new Date(tp.completedAt).toISOString().split('T')[0] : new Date(tp.updatedAt).toISOString().split('T')[0],
            timeSpent: timeSpentStr,
            meetingUrl: tp.Training.url,
            status: tp.completed ? 'Completed' : 'Attended',
            zone: tp.zone || (u.location ? getZoneFromCoords(null, null, u.location) : 'N/A')
          });
        }
      });
    });

    res.json({
      quizAttendance: quizAttendanceLogs,
      trainingAttendance: trainingAttendanceLogs
    });
  } catch (error) {
    console.error('Error fetching attendance reports:', error);
    res.status(500).json({ error: 'Server error while fetching attendance reports.' });
  }
});

// GET /api/reports/leaderboard - Fetch top 5 participants grouped by name/employeeId
router.get('/leaderboard', requireAuth, async (req, res) => {
  try {
    const userRole = req.user.role;
    const userProjectId = req.user.projectId;
    const { projectId, startDate, endDate } = req.query;

    const quizWhere = {};
    if (['Admin', 'Super Admin', 'T&D Manager'].includes(userRole)) {
      if (projectId && projectId !== 'all' && projectId !== 'undefined') {
        const projectIds = await getAccessibleProjectIds(projectId);
        quizWhere.projectId = { [Op.in]: projectIds };
      }
    } else if (userProjectId) {
      const projectIds = await getAccessibleProjectIds(userProjectId);
      quizWhere.projectId = { [Op.in]: projectIds };
    }

    const sessionWhere = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      sessionWhere[Op.or] = [
        { startedAt: { [Op.between]: [start, end] } },
        { startedAt: null, createdAt: { [Op.between]: [start, end] } }
      ];
    }

    const participants = await Participant.findAll({
      include: [
        {
          model: Session,
          where: sessionWhere,
          required: true,
          include: [
            {
              model: Quiz,
              where: quizWhere,
              required: true,
              include: [{ model: Question, as: 'questions' }]
            }
          ]
        }
      ]
    });

    const userStats = {};
    participants.forEach(p => {
      const key = p.employeeId ? p.employeeId.trim().toLowerCase() : p.name.trim().toLowerCase();
      if (!userStats[key]) {
        userStats[key] = {
          name: p.name,
          employeeId: p.employeeId || 'N/A',
          totalScore: 0,
          totalQuestions: 0,
          attempts: 0
        };
      }
      const questionsCount = p.Session?.Quiz?.questions ? p.Session.Quiz.questions.length : 0;
      userStats[key].totalScore += p.score || 0;
      userStats[key].totalQuestions += questionsCount;
      userStats[key].attempts += 1;
    });

    const leaderboard = Object.values(userStats)
      .map(u => {
        const percentage = u.totalQuestions > 0 ? Math.round((u.totalScore / u.totalQuestions) * 100) : 0;
        return {
          name: u.name,
          score: `${percentage}%`,
          completion: '100%'
        };
      })
      .sort((a, b) => parseInt(b.score) - parseInt(a.score))
      .slice(0, 5);

    res.json(leaderboard);
  } catch (error) {
    console.error('Error computing leaderboard:', error);
    res.status(500).json({ error: 'Failed to compute leaderboard' });
  }
});

// GET /api/reports/:sessionId - Fetch detailed report for a specific session
router.get('/:sessionId', requireAuth, async (req, res) => {
  try {
    const session = await Session.findByPk(req.params.sessionId, {
      include: [
        {
          model: Quiz,
          include: [
            { model: Question, as: 'questions' },
            { model: Project, attributes: ['id', 'name'] }
          ]
        },
        {
          model: Participant,
          include: [Response]
        }
      ]
    });

    if (!session) {
      return res.status(404).json({ error: 'Session report not found.' });
    }

    const totalQuestions = session.Quiz && session.Quiz.questions ? session.Quiz.questions.length : 0;

    const participantsDetails = (session.Participants || []).map(p => {
      const totalTimeMs = (p.Responses || []).reduce((sum, r) => sum + (r.response_time || 0), 0);
      const timeSpentSec = Math.round(totalTimeMs / 1000);
      
      const percentage = totalQuestions > 0 ? Math.round((p.score / totalQuestions) * 100) : 0;
      const answeredQuestions = (p.Responses || []).length;
      const completionPercentage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        employeeId: p.employeeId || 'N/A',
        mobileNumber: p.mobileNumber || 'N/A',
        score: `${p.score} / ${totalQuestions}`,
        timeSpent: `${timeSpentSec}s`,
        percentage: `${percentage}%`,
        completion: `${completionPercentage}%`,
        storeName: p.storeName || null,
        responses: (p.Responses || []).map(r => ({
          questionId: r.questionId,
          answer: r.answer
        }))
      };
    });

    res.json({
      sessionId: session.id,
      quizTitle: session.Quiz ? session.Quiz.title : 'Unknown Quiz',
      projectName: session.Quiz && session.Quiz.Project ? session.Quiz.Project.name : 'N/A',
      date: session.startedAt ? new Date(session.startedAt).toISOString().split('T')[0] : new Date(session.createdAt).toISOString().split('T')[0],
      totalQuestions,
      questions: (session.Quiz && session.Quiz.questions || []).map(q => ({
        id: q.id,
        text: q.text,
        correct_answer: q.correct_answer
      })),
      participants: participantsDetails
    });
  } catch (error) {
    console.error('Error fetching session details:', error);
    res.status(500).json({ error: 'Server error while fetching report details.' });
  }
});

// DELETE /api/reports/:id - Delete a session report with cascaded data removal
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;
    const userProjectId = req.user.projectId;
    const reportId = req.params.id;

    // Find the session to validate existence and ownership
    const session = await Session.findByPk(reportId, {
      include: [{ model: Quiz, attributes: ['projectId'] }]
    });

    if (!session) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    // RBAC authorization check
    let authorized = false;

    if (['Admin', 'Super Admin'].includes(userRole)) {
      // Full access
      authorized = true;
    } else if (userRole === 'Trainer') {
      // Trainers can only delete their own sessions
      if (session.hostId === userId) {
        authorized = true;
      }
    } else if (['MD', 'COO', 'VP Operations'].includes(userRole)) {
      // Senior managers can delete within their project hierarchy
      const projectIds = await getAccessibleProjectIds(userProjectId);
      if (session.Quiz && projectIds.includes(session.Quiz.projectId)) {
        authorized = true;
      }
    }

    if (!authorized) {
      return res.status(403).json({ error: 'You are not authorized to delete this report.' });
    }

    // Cascade delete: responses first, then participants, then session
    const participants = await Participant.findAll({ where: { sessionId: reportId } });
    for (const p of participants) {
      await Response.destroy({ where: { participantId: p.id } });
    }
    await Participant.destroy({ where: { sessionId: reportId } });
    await Session.destroy({ where: { id: reportId } });

    const io = req.app.get('io');
    if (io) {
      io.emit('report_deleted', { reportId });
    }

    res.json({ message: 'Report deleted successfully.' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Server error while deleting report.' });
  }
});

module.exports = router;
