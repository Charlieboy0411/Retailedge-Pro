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
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
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
router.get('/', requireAuth, requireRole(['Admin', 'Super Admin', 'Program Manager', 'Trainer', 'T&D Manager', 'Client', 'MD', 'COO', 'VP Operations', 'Supervisor', 'Marketing Manager']), async (req, res) => {
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
        model: Project,
        attributes: ['id', 'name']
      },
      {
        model: Participant,
        attributes: ['id', 'name', 'score', 'employeeId', 'storeName'],
        include: [{ model: Response, attributes: ['id', 'points_awarded'] }]
      },
      {
        model: User,
        as: 'host',
        attributes: ['id', 'name']
      }
    ];

    const whereClause = {};

    // Apply RBAC filters
    if (['Admin', 'Super Admin'].includes(userRole)) {
      // Super Access: No project filtering needed

    } else if (userRole === 'T&D Manager') {
      const tdService = require('../utils/tdService');
      const projectIds = await tdService.getAccessibleTDProjectIds(req.user, req.query.projectId || 'all', 'all');
      if (!projectIds || projectIds.length === 0) {
        return res.status(403).json({ error: 'Forbidden: You have no assigned capability projects.' });
      }
      whereClause[Op.or] = [
        { '$Quiz.projectId$': { [Op.in]: projectIds } },
        { projectId: { [Op.in]: projectIds } }
      ];
    } else if (['MD', 'COO', 'VP Operations', 'Marketing Manager'].includes(userRole)) {
      if (!userProjectId) {
        return res.status(403).json({ error: 'You are not assigned to a project.' });
      }
      const projectIds = await getAccessibleProjectIds(userProjectId);
      whereClause[Op.or] = [
        { '$Quiz.projectId$': { [Op.in]: projectIds } },
        { projectId: { [Op.in]: projectIds } }
      ];
    } else if (userRole === 'Client') {
      const clientService = require('../utils/clientService');
      const projectIds = await clientService.getAccessibleClientProjectIds(req.user);
      if (!projectIds || projectIds.length === 0) {
        return res.status(403).json({ error: 'Forbidden: You have no assigned client projects.' });
      }
      whereClause[Op.or] = [
        { '$Quiz.projectId$': { [Op.in]: projectIds } },
        { projectId: { [Op.in]: projectIds } }
      ];
    } else if (['Program Manager', 'Manager'].includes(userRole)) {
      // Restricted to specified project
      if (!userProjectId) {
        return res.status(403).json({ error: 'You are not assigned to a project.' });
      }
      const projectIds = await getAccessibleProjectIds(userProjectId);
      whereClause[Op.or] = [
        { '$Quiz.projectId$': { [Op.in]: projectIds } },
        { projectId: { [Op.in]: projectIds } }
      ];
    } else if (userRole === 'Supervisor') {
      const supervisorService = require('../utils/supervisorService');
      const subordinateIds = await supervisorService.getTeamSubordinateIds(req.user.id);
      const participantInclude = includeOptions.find(inc => inc.model === Participant);
      if (participantInclude) {
        participantInclude.where = { userId: { [Op.in]: subordinateIds } };
        participantInclude.required = true;
      }
    } else {
      // Default / Other roles (e.g., Trainer sees their own hosted or created sessions)
      whereClause[Op.or] = [
        { hostId: req.user.id },
        { '$Quiz.creatorId$': req.user.id }
      ];
    }

    const sessions = await Session.findAll({
      where: whereClause,
      include: includeOptions,
      order: [['createdAt', 'DESC']]
    });

    // Map the raw data to a cleaner format for the frontend
    const reports = sessions.map(session => {
      const participants = session.Participants || [];
      const totalQuestions = session.Quiz && session.Quiz.questions ? session.Quiz.questions.length : 0;

      let totalPercentageSum = 0;
      participants.forEach(p => {
        const responses = p.Responses || [];
        const correctCount = responses.filter(r => r.points_awarded > 0 || r.is_correct).length;
        const pPct = totalQuestions > 0 ? Math.min(100, Math.max(0, Math.round((correctCount / totalQuestions) * 100))) : 0;
        totalPercentageSum += pPct;
      });

      const avgScore = participants.length > 0 ? Math.round(totalPercentageSum / participants.length) : 0;
      const resolvedProjectName = (session.Quiz && session.Quiz.Project) ? session.Quiz.Project.name : (session.Project ? session.Project.name : 'N/A');
      const resolvedProjectId = session.Quiz?.projectId || session.projectId || null;

      return {
        id: session.id,
        title: session.Quiz ? session.Quiz.title : 'Unknown Quiz',
        projectName: resolvedProjectName,
        projectId: resolvedProjectId,
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
        const responses = p.Responses || [];
        const correctCount = responses.filter(r => r.points_awarded > 0 || r.is_correct).length;
        const percentage = totalQuestions > 0 ? Math.min(100, Math.max(0, Math.round((correctCount / totalQuestions) * 100))) : 0;
        
        const totalTimeMs = responses.reduce((sum, r) => sum + (r.response_time || 0), 0);
        const timeSpentSec = Math.round(totalTimeMs / 1000);

        return {
          id: p.id,
          date: p.Session?.startedAt ? new Date(p.Session.startedAt).toISOString().split('T')[0] : new Date(p.createdAt).toISOString().split('T')[0],
          quizTitle: p.Session?.Quiz ? p.Session.Quiz.title : 'Unknown Quiz',
          projectId: p.Session?.Quiz?.Project?.id || null,
          projectName: p.Session?.Quiz?.Project?.name || 'General',
          score: `${correctCount} / ${totalQuestions}`,
          percentage: `${percentage}%`,
          arenaPoints: p.score || 0,
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
                const responses = p.Responses || [];
                const correctCount = responses.filter(r => r.points_awarded > 0 || r.is_correct).length;
                const pct = totalQ > 0 ? Math.min(100, Math.max(0, Math.round((correctCount / totalQ) * 100))) : 0;
                return sum + pct;
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
    } else if (userRole === 'Client') {
      const clientService = require('../utils/clientService');
      const projectIds = await clientService.getAccessibleClientProjectIds(req.user);
      whereUser.projectId = { [Op.in]: projectIds };
    } else if (['Program Manager', 'Manager'].includes(userRole) && userProjectId) {
      const projectIds = await getAccessibleProjectIds(userProjectId);
      whereUser.projectId = { [Op.in]: projectIds };
    } else if (userRole === 'Trainer') {
      const intelligenceService = require('../utils/projectIntelligenceService');
      const projectIds = await intelligenceService.getAccessibleProjectIds(req.user, 'all', 'all');
      if (projectIds.length === 0) {
        return res.json({
          summary: { quizCount: 0, avgScore: '0%', datesCount: 0 },
          logs: [],
          trainingLogs: []
        });
      }
      whereUser.projectId = { [Op.in]: projectIds };
    } else if (userRole === 'Supervisor') {
      const supervisorService = require('../utils/supervisorService');
      const subordinateIds = await supervisorService.getTeamSubordinateIds(req.user.id);
      whereUser.id = { [Op.in]: subordinateIds };
    }

    const users = await User.findAll({
      where: whereUser,
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
          const responses = p.Responses || [];
          const correctCount = responses.filter(r => r.points_awarded > 0 || r.is_correct).length;
          const percentage = totalQuestions > 0 ? Math.min(100, Math.max(0, Math.round((correctCount / totalQuestions) * 100))) : 0;
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

// GET /api/reports/gamification - Authoritative, project-scoped Participant Results & Gamification endpoint
router.get('/gamification', requireAuth, async (req, res) => {
  try {
    const userRole = req.user.role || (req.user.Role ? req.user.Role.role_name : '');
    const { projectId = 'all', subProjectId = 'all', quizId = 'all', sessionId = 'all' } = req.query;

    // 1. Resolve all accessible projects for user to determine project selector and authorization
    let allAuthorizedIds = [];
    if (userRole === 'Client') {
      const clientService = require('../utils/clientService');
      allAuthorizedIds = await clientService.getAccessibleClientProjectIds(req.user, 'all', 'all');
    } else if (userRole === 'T&D Manager') {
      const tdService = require('../utils/tdService');
      allAuthorizedIds = await tdService.getAccessibleTDProjectIds(req.user, 'all', 'all');
    } else {
      const intelligenceService = require('../utils/projectIntelligenceService');
      allAuthorizedIds = await intelligenceService.getAccessibleProjectIds(req.user, 'all', 'all');
    }

    const authorizedProjects = await Project.findAll({
      where: { id: { [Op.in]: allAuthorizedIds } },
      attributes: ['id', 'name', 'parentId'],
      order: [['name', 'ASC']]
    });

    const accessibleProjects = authorizedProjects.map(p => ({
      id: p.id,
      name: p.name,
      parentId: p.parentId
    }));

    // Determine effective project scope:
    // If user has exactly one assigned project, auto-resolve target to that single project.
    let targetProjectId = projectId;
    if (accessibleProjects.length === 1 && (!targetProjectId || targetProjectId === 'all')) {
      targetProjectId = accessibleProjects[0].id;
    }

    // Enforce server-side authorization: PM cannot access unauthorized project ID
    if (targetProjectId && targetProjectId !== 'all') {
      if (!allAuthorizedIds.includes(targetProjectId)) {
        const err = new Error('Forbidden: You do not have permission for this project.');
        err.status = 403;
        throw err;
      }
    }

    // 2. Resolve accessible project IDs based on effective targetProjectId
    let accessibleProjectIds = [];
    if (userRole === 'Client') {
      const clientService = require('../utils/clientService');
      accessibleProjectIds = await clientService.getAccessibleClientProjectIds(req.user, targetProjectId, subProjectId);
    } else if (userRole === 'T&D Manager') {
      const tdService = require('../utils/tdService');
      accessibleProjectIds = await tdService.getAccessibleTDProjectIds(req.user, targetProjectId, subProjectId);
    } else {
      const intelligenceService = require('../utils/projectIntelligenceService');
      accessibleProjectIds = await intelligenceService.getAccessibleProjectIds(req.user, targetProjectId, subProjectId);
    }

    // If user has no accessible projects, return legitimate empty state
    if (!accessibleProjectIds || accessibleProjectIds.length === 0) {
      return res.json({
        isEmployee: userRole === 'Employee',
        selectedProjectId: targetProjectId,
        selectedProjectName: 'No Assigned Projects',
        accessibleProjects,
        summary: {
          totalParticipants: 0,
          quizzesCompleted: 0,
          completedAttempts: 0,
          totalAttempts: 0,
          distinctQuizzesCount: 0,
          distinctSessionsCount: 0,
          avgScore: 'N/A',
          totalArenaPoints: 0
        },
        availableQuizzes: [],
        availableSessions: [],
        participantSummaries: [],
        zoneBreakdown: [],
        leaderboard: [],
        participantResults: [],
        badges: [],
        stats: {
          sessionsParticipated: 0,
          badgesEarned: 0,
          avgScore: 'N/A',
          fastestAnswer: 'N/A'
        },
        level: {
          name: 'Bronze',
          min: 0,
          max: 200,
          color: '#CD7F32',
          icon: '🥉',
          progressPct: 0,
          pointsToNext: 200
        },
        totalPoints: 0
      });
    }

    // Selected project name
    let selectedProjectName = 'All Assigned Projects';
    if (targetProjectId && targetProjectId !== 'all') {
      const found = accessibleProjects.find(p => p.id === targetProjectId);
      if (found) selectedProjectName = found.name;
    } else if (accessibleProjects.length > 1) {
      selectedProjectName = `All Assigned Projects (${accessibleProjects.length} Projects)`;
    }

    // 3. Query participants joined with Session, Quiz, Question, Response
    const participants = await Participant.findAll({
      include: [
        Response,
        {
          model: Session,
          required: true,
          include: [
            {
              model: Quiz,
              required: true,
              include: [{ model: Question, as: 'questions' }]
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Strictly scope participants to accessible projects
    const scopedParticipants = participants.filter(p => {
      const pProj = p.Session?.projectId || p.Session?.Quiz?.projectId;
      return pProj && accessibleProjectIds.includes(pProj);
    });

    // Collect available quizzes and sessions in project scope for topic filter
    let availableQuizzes = [];
    try {
      const projectQuizzes = await Quiz.findAll({
        where: { projectId: { [Op.in]: accessibleProjectIds } },
        attributes: ['id', 'title', 'projectId', 'createdAt'],
        include: [{ model: Question, as: 'questions', attributes: ['id', 'points'] }],
        order: [['title', 'ASC']]
      });
      availableQuizzes = (projectQuizzes || []).map(q => ({
        id: q.id,
        title: q.title,
        questionCount: q.questions ? q.questions.length : 0
      }));
    } catch (e) {
      // Graceful fallback if stubbed or model query error
    }

    let availableSessions = [];
    try {
      const projectSessions = await Session.findAll({
        where: {
          [Op.or]: [
            { projectId: { [Op.in]: accessibleProjectIds } },
            { '$Quiz.projectId$': { [Op.in]: accessibleProjectIds } }
          ]
        },
        include: [
          { model: Quiz, attributes: ['id', 'title', 'projectId'] }
        ],
        order: [['createdAt', 'DESC']]
      });
      availableSessions = (projectSessions || []).map(s => ({
        id: s.id,
        sessionName: s.session_name || s.roomCode || 'Session',
        roomCode: s.roomCode,
        quizId: s.Quiz?.id || s.quizId || '',
        quizTitle: s.Quiz?.title || 'Quiz',
        status: s.status,
        createdAt: s.createdAt,
        startedAt: s.startedAt
      }));
    } catch (e) {
      // Graceful fallback if stubbed or model query error
    }

    // 4. Calculate participant-level stats, team leaderboard, and zone performance
    const userAggregates = {};
    const zoneAggregates = {};
    const participantRows = [];
    const distinctQuizIds = new Set();
    const distinctSessionIds = new Set();
    const seenUserSessions = new Set();

    let totalPointsAcrossScope = 0;
    let completedAttemptsCount = 0;
    let totalQuestionsSum = 0;
    let totalCorrectSum = 0;

    scopedParticipants.forEach(p => {
      const questionsCount = p.Session?.Quiz?.questions ? p.Session.Quiz.questions.length : 0;
      const responses = p.Responses || [];
      const correctCount = responses.filter(r => r.points_awarded > 0 || r.is_correct).length;
      const arenaPts = Number(p.score) || 0;
      totalPointsAcrossScope += arenaPts;

      if (p.Session?.Quiz?.id) {
        distinctQuizIds.add(p.Session.Quiz.id);
        if (!availableQuizzes.some(aq => aq.id === p.Session.Quiz.id)) {
          availableQuizzes.push({
            id: p.Session.Quiz.id,
            title: p.Session.Quiz.title || 'Quiz',
            questionCount: questionsCount
          });
        }
      }
      if (p.Session?.id) {
        distinctSessionIds.add(p.Session.id);
        if (!availableSessions.some(as => as.id === p.Session.id)) {
          availableSessions.push({
            id: p.Session.id,
            sessionName: p.Session.session_name || p.Session.roomCode || 'Session',
            roomCode: p.Session.roomCode,
            quizId: p.Session.Quiz?.id || '',
            quizTitle: p.Session.Quiz?.title || 'Quiz',
            status: p.Session.status,
            createdAt: p.Session.createdAt,
            startedAt: p.Session.startedAt
          });
        }
      }

      const isFinished = p.Session?.status === 'finished' || (questionsCount > 0 && responses.length >= questionsCount);
      if (isFinished) completedAttemptsCount += 1;

      if (questionsCount > 0) {
        totalQuestionsSum += questionsCount;
        totalCorrectSum += correctCount;
      }

      // Fastest response time for this participant
      let minResponseTime = Infinity;
      responses.forEach(r => {
        if (r.response_time && r.response_time > 0 && r.response_time < minResponseTime) {
          minResponseTime = r.response_time;
        }
      });

      const participantPercentage = questionsCount > 0
        ? Math.min(100, Math.max(0, Math.round((correctCount / questionsCount) * 100)))
        : null;

      const zoneName = p.storeName && p.storeName.trim() ? p.storeName.trim() : 'N/A';

      // User aggregation for leaderboard & badges
      const userKey = p.employeeId ? p.employeeId.trim().toLowerCase() : p.name.trim().toLowerCase();
      if (!userAggregates[userKey]) {
        userAggregates[userKey] = {
          name: p.name,
          employeeId: p.employeeId && p.employeeId.trim() ? p.employeeId.trim() : 'N/A',
          zone: zoneName,
          arenaPoints: 0,
          totalCorrect: 0,
          totalQuestions: 0,
          attempts: 0,
          completedCount: 0,
          minResponseTime: Infinity,
          bestPercentage: -1,
          hasPerfectSession: false,
          hasRegisteredZone: false,
          userId: p.userId,
          quizzesSet: new Set(),
          lastQuizTimestamp: 0,
          lastQuizDate: 'N/A',
          lastQuizStatus: 'N/A'
        };
      }

      if (p.Session?.Quiz?.id && userAggregates[userKey].quizzesSet) {
        userAggregates[userKey].quizzesSet.add(p.Session.Quiz.id);
      }

      // Score integrity: count each distinct session once per participant
      const sessionKey = `${userKey}_${p.Session?.id || p.id}`;
      if (!seenUserSessions.has(sessionKey)) {
        seenUserSessions.add(sessionKey);
        userAggregates[userKey].arenaPoints += arenaPts;
        userAggregates[userKey].totalCorrect += correctCount;
        userAggregates[userKey].totalQuestions += questionsCount;
        userAggregates[userKey].attempts += 1;
        if (isFinished) userAggregates[userKey].completedCount += 1;
      }

      if (minResponseTime < userAggregates[userKey].minResponseTime) {
        userAggregates[userKey].minResponseTime = minResponseTime;
      }
      if (participantPercentage !== null && participantPercentage > userAggregates[userKey].bestPercentage) {
        userAggregates[userKey].bestPercentage = participantPercentage;
      }
      if (isFinished && participantPercentage === 100) {
        userAggregates[userKey].hasPerfectSession = true;
      }
      if (p.storeName && p.storeName.trim().length > 0) {
        userAggregates[userKey].hasRegisteredZone = true;
      }
      if (zoneName !== 'N/A' && userAggregates[userKey].zone === 'N/A') {
        userAggregates[userKey].zone = zoneName;
      }

      // Track most recent attempt for participant summary
      const attemptTime = p.createdAt ? new Date(p.createdAt).getTime() : (p.Session?.startedAt ? new Date(p.Session.startedAt).getTime() : 0);
      if (attemptTime >= userAggregates[userKey].lastQuizTimestamp) {
        userAggregates[userKey].lastQuizTimestamp = attemptTime;
        userAggregates[userKey].lastQuizDate = p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : (p.Session?.startedAt ? new Date(p.Session.startedAt).toISOString().split('T')[0] : 'N/A');
        userAggregates[userKey].lastQuizStatus = isFinished ? 'Completed' : 'In Progress';
      }

      // Badges earned by this participant on this attempt
      const attemptBadges = [];
      if (participantPercentage !== null && participantPercentage >= 90) attemptBadges.push('champion');
      if (minResponseTime < 3000) attemptBadges.push('fastest');
      if (participantPercentage === 100) attemptBadges.push('expert');
      if (p.storeName && p.storeName.trim().length > 0) attemptBadges.push('team');
      if (isFinished && participantPercentage === 100) attemptBadges.push('perfect');

      // Table row
      participantRows.push({
        id: p.id,
        name: p.name,
        employeeId: p.employeeId && p.employeeId.trim() ? p.employeeId.trim() : 'N/A',
        zone: zoneName,
        sessionId: p.Session?.id || '',
        sessionName: p.Session?.session_name || p.Session?.roomCode || 'Session',
        roomCode: p.Session?.roomCode || '',
        quizId: p.Session?.Quiz?.id || '',
        quizTitle: p.Session?.Quiz?.title || 'Quiz',
        questionsCount,
        answeredCount: responses.length,
        correctCount,
        quizPercentage: participantPercentage !== null ? `${participantPercentage}%` : 'N/A',
        rawPercentage: participantPercentage,
        arenaPoints: arenaPts,
        configuredPoints: arenaPts,
        status: isFinished ? 'Completed' : 'In Progress',
        earnedBadges: attemptBadges,
        createdAt: p.createdAt,
        date: p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : 'N/A'
      });

      // Zone aggregation
      const zKey = zoneName;
      if (!zoneAggregates[zKey]) {
        zoneAggregates[zKey] = {
          zone: zKey,
          participantsSet: new Set(),
          quizzesCompleted: 0,
          totalCorrect: 0,
          totalQuestions: 0,
          totalArenaPoints: 0
        };
      }
      zoneAggregates[zKey].participantsSet.add(userKey);
      if (isFinished) zoneAggregates[zKey].quizzesCompleted += 1;
      zoneAggregates[zKey].totalCorrect += correctCount;
      zoneAggregates[zKey].totalQuestions += questionsCount;
      zoneAggregates[zKey].totalArenaPoints += arenaPts;
    });

    // Sort participantRows by points earned descending by default, then accuracy descending, then participant name alphabetical ascending
    participantRows.sort((a, b) => 
      (b.arenaPoints - a.arenaPoints) || 
      ((b.rawPercentage ?? -1) - (a.rawPercentage ?? -1)) || 
      a.name.localeCompare(b.name)
    );
    // Recalculate ranks from sorted order
    participantRows.forEach((r, idx) => {
      r.rank = idx + 1;
    });

    // Build participantSummaries: Exactly 1 row per unique participant in scope
    const participantSummaries = Object.values(userAggregates).map(u => {
      const overallAccuracy = u.totalQuestions > 0
        ? Math.min(100, Math.max(0, Math.round((u.totalCorrect / u.totalQuestions) * 100)))
        : null;

      const userBadges = [];
      if (u.bestPercentage >= 90) userBadges.push('champion');
      if (u.minResponseTime < 3000) userBadges.push('fastest');
      if (u.completedCount >= 3) userBadges.push('streak');
      if (u.bestPercentage === 100) userBadges.push('expert');
      if (u.hasRegisteredZone) userBadges.push('team');
      if (u.hasPerfectSession) userBadges.push('perfect');

      return {
        userId: u.userId,
        name: u.name,
        employeeId: u.employeeId,
        zone: u.zone,
        quizzesCompleted: u.completedCount,
        distinctQuizzesAttempted: u.quizzesSet && u.quizzesSet.size > 0 ? u.quizzesSet.size : (u.completedCount > 0 ? 1 : 0),
        totalAttempts: u.attempts,
        cumulativeArenaPoints: u.arenaPoints,
        avgScore: overallAccuracy !== null ? `${overallAccuracy}%` : 'N/A',
        overallAccuracy: overallAccuracy !== null ? `${overallAccuracy}%` : 'N/A',
        rawPercentage: overallAccuracy !== null ? overallAccuracy : -1,
        earnedBadges: userBadges,
        lastQuizDate: u.lastQuizDate || 'N/A',
        lastQuizStatus: u.lastQuizStatus || 'N/A'
      };
    }).sort((a, b) => 
      (b.cumulativeArenaPoints - a.cumulativeArenaPoints) || 
      (b.rawPercentage - a.rawPercentage) || 
      a.name.localeCompare(b.name)
    ).map((item, idx) => ({
      ...item,
      rank: idx + 1
    }));

    // Filter participant results if a specific quiz or session was requested
    let filteredParticipantRows = [...participantRows];
    if (quizId && quizId !== 'all') {
      filteredParticipantRows = filteredParticipantRows.filter(r => r.quizId === quizId);
    }
    if (sessionId && sessionId !== 'all') {
      filteredParticipantRows = filteredParticipantRows.filter(r => r.sessionId === sessionId);
    }
    filteredParticipantRows = filteredParticipantRows.map((r, idx) => ({
      ...r,
      rank: idx + 1
    }));

    // Overall average score calculation
    const overallAvgScore = totalQuestionsSum > 0
      ? `${Math.min(100, Math.max(0, Math.round((totalCorrectSum / totalQuestionsSum) * 100)))}%`
      : 'N/A';

    // Build zone breakdown array
    const zoneBreakdown = Object.values(zoneAggregates).map(z => {
      const avgScore = z.totalQuestions > 0
        ? `${Math.min(100, Math.max(0, Math.round((z.totalCorrect / z.totalQuestions) * 100)))}%`
        : 'N/A';
      return {
        zone: z.zone,
        participantCount: z.participantsSet.size,
        quizzesCompleted: z.quizzesCompleted,
        avgScore,
        totalArenaPoints: z.totalArenaPoints
      };
    }).sort((a, b) => b.totalArenaPoints - a.totalArenaPoints || b.participantCount - a.participantCount);

    // Build deterministic leaderboard
    const leaderboard = Object.values(userAggregates).map(u => {
      const percentage = u.totalQuestions > 0
        ? Math.min(100, Math.max(0, Math.round((u.totalCorrect / u.totalQuestions) * 100)))
        : null;
      return {
        name: u.name,
        employeeId: u.employeeId,
        zone: u.zone,
        arenaPoints: u.arenaPoints,
        quizScore: percentage !== null ? `${percentage}%` : 'N/A',
        rawPercentage: percentage !== null ? percentage : -1,
        attempts: u.attempts,
        completedCount: u.completedCount,
        completion: u.attempts > 0 ? `${Math.round((u.completedCount / u.attempts) * 100)}%` : 'N/A'
      };
    }).sort((a, b) => (b.arenaPoints - a.arenaPoints) || (b.rawPercentage - a.rawPercentage) || a.name.localeCompare(b.name))
      .slice(0, 10);

    // 5. Build personal gamification data if Employee (or matching user)
    const LEVELS = [
      { name: 'Bronze',       min: 0,    max: 200,  color: '#CD7F32', icon: '🥉' },
      { name: 'Silver',       min: 200,  max: 500,  color: '#C0C0C0', icon: '🥈' },
      { name: 'Gold',         min: 500,  max: 1000, color: '#FFD700', icon: '🥇' },
      { name: 'Platinum',     min: 1000, max: 2000, color: '#2EA8FF', icon: '💎' },
      { name: 'Arena Master', min: 2000, max: 50000, color: '#FF6B35', icon: '🏆' },
    ];

    let personalAttempts = [];
    if (req.user.id) {
      personalAttempts = scopedParticipants.filter(p =>
        p.userId === req.user.id ||
        (req.user.employeeId && p.employeeId && p.employeeId.trim().toLowerCase() === req.user.employeeId.trim().toLowerCase())
      );
    }

    const personalArenaPoints = personalAttempts.reduce((sum, p) => sum + (Number(p.score) || 0), 0);
    const personalQuestions = personalAttempts.reduce((sum, p) => sum + (p.Session?.Quiz?.questions?.length || 0), 0);
    const personalCorrect = personalAttempts.reduce((sum, p) => {
      const resps = p.Responses || [];
      return sum + resps.filter(r => r.points_awarded > 0 || r.is_correct).length;
    }, 0);

    let personalMinTime = Infinity;
    personalAttempts.forEach(p => {
      (p.Responses || []).forEach(r => {
        if (r.response_time && r.response_time > 0 && r.response_time < personalMinTime) {
          personalMinTime = r.response_time;
        }
      });
    });

    const personalCompletedSessions = personalAttempts.filter(p =>
      p.Session?.status === 'finished' || ((p.Responses || []).length > 0)
    ).length;

    const personalAvgScore = personalQuestions > 0
      ? `${Math.min(100, Math.max(0, Math.round((personalCorrect / personalQuestions) * 100)))}%`
      : 'N/A';

    const personalFastestAnswer = personalMinTime !== Infinity
      ? `${(personalMinTime / 1000).toFixed(1)}s`
      : 'N/A';

    // Current Level strictly calculated from personalArenaPoints
    const currentLevel = LEVELS.find(l => personalArenaPoints >= l.min && personalArenaPoints < l.max) || LEVELS[LEVELS.length - 1];
    const nextLevel = LEVELS[LEVELS.indexOf(currentLevel) + 1] || null;
    const levelPct = nextLevel
      ? Math.min(100, Math.max(0, Math.round(((personalArenaPoints - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100)))
      : 100;
    const pointsToNext = nextLevel ? Math.max(0, nextLevel.min - personalArenaPoints) : 0;

    // Badges evaluated according to role and established product intent:
    // For Employee: personal unlocked status.
    // For Non-Employee (PM / Trainer / Admin): project-team badge achievement counts & criteria.
    const isEmployee = userRole === 'Employee';
    const totalLearners = Object.keys(userAggregates).length;

    // Personal unlocks for employee
    const personalChampionUnlocked = personalAttempts.some(p => {
      const qLen = p.Session?.Quiz?.questions?.length || 0;
      if (qLen === 0) return false;
      const c = (p.Responses || []).filter(r => r.points_awarded > 0 || r.is_correct).length;
      return (c / qLen) >= 0.9;
    });

    const personalFastestUnlocked = personalMinTime < 3000;
    const personalStreakUnlocked = personalCompletedSessions >= 3;
    const personalExpertUnlocked = personalAttempts.some(p => {
      const qLen = p.Session?.Quiz?.questions?.length || 0;
      if (qLen === 0) return false;
      const c = (p.Responses || []).filter(r => r.points_awarded > 0 || r.is_correct).length;
      return c === qLen;
    });
    const personalTeamUnlocked = personalAttempts.some(p => p.storeName && p.storeName.trim().length > 0);
    const personalPerfectUnlocked = personalAttempts.some(p => {
      const qLen = p.Session?.Quiz?.questions?.length || 0;
      if (qLen === 0) return false;
      const isFin = p.Session?.status === 'finished' || (p.Responses || []).length >= qLen;
      const c = (p.Responses || []).filter(r => r.points_awarded > 0 || r.is_correct).length;
      return isFin && c === qLen;
    });

    // Team qualifications across userAggregates
    const usersList = Object.values(userAggregates);
    const teamChampionCount = usersList.filter(u => u.bestPercentage >= 90).length;
    const teamFastestCount = usersList.filter(u => u.minResponseTime < 3000).length;
    const teamStreakCount = usersList.filter(u => u.completedCount >= 3).length;
    const teamExpertCount = usersList.filter(u => u.bestPercentage === 100).length;
    const teamZoneCount = usersList.filter(u => u.hasRegisteredZone).length;
    const teamPerfectCount = usersList.filter(u => u.hasPerfectSession).length;

    const badges = [
      {
        id: 'champion',
        label: 'Sales Champion',
        desc: 'Scored 90%+ on any quiz in this project',
        icon: '🏆',
        color: '#FF6B35',
        unlocked: isEmployee ? personalChampionUnlocked : teamChampionCount > 0,
        earnedCount: isEmployee ? (personalChampionUnlocked ? 1 : 0) : teamChampionCount,
        totalEligible: isEmployee ? 1 : totalLearners,
        statusText: isEmployee
          ? (personalChampionUnlocked ? '✓ Earned' : 'Locked (Criteria Unmet)')
          : (teamChampionCount > 0
              ? `✓ Earned by ${teamChampionCount} of ${totalLearners} Learners (${Math.round((teamChampionCount / (totalLearners || 1)) * 100)}%)`
              : `0 of ${totalLearners} Qualified (Criteria Unmet)`)
      },
      {
        id: 'fastest',
        label: 'Fastest Finger',
        desc: 'Answered in under 3 seconds',
        icon: '⚡',
        color: '#F59E0B',
        unlocked: isEmployee ? personalFastestUnlocked : teamFastestCount > 0,
        earnedCount: isEmployee ? (personalFastestUnlocked ? 1 : 0) : teamFastestCount,
        totalEligible: isEmployee ? 1 : totalLearners,
        statusText: isEmployee
          ? (personalFastestUnlocked ? '✓ Earned' : 'Locked (Criteria Unmet)')
          : (teamFastestCount > 0
              ? `✓ Earned by ${teamFastestCount} of ${totalLearners} Learners (${Math.round((teamFastestCount / (totalLearners || 1)) * 100)}%)`
              : `0 of ${totalLearners} Qualified (Criteria Unmet)`)
      },
      {
        id: 'streak',
        label: 'Attendance Streak',
        desc: '3+ training/quiz sessions completed',
        icon: '🔥',
        color: '#EF4444',
        unlocked: isEmployee ? personalStreakUnlocked : teamStreakCount > 0,
        earnedCount: isEmployee ? (personalStreakUnlocked ? 1 : 0) : teamStreakCount,
        totalEligible: isEmployee ? 1 : totalLearners,
        statusText: isEmployee
          ? (personalStreakUnlocked ? '✓ Earned' : 'Locked (Criteria Unmet)')
          : (teamStreakCount > 0
              ? `✓ Earned by ${teamStreakCount} of ${totalLearners} Learners (${Math.round((teamStreakCount / (totalLearners || 1)) * 100)}%)`
              : `0 of ${totalLearners} Qualified (Criteria Unmet)`)
      },
      {
        id: 'expert',
        label: 'Product Expert',
        desc: 'Scored 100% on any quiz in this project',
        icon: '📦',
        color: '#00C896',
        unlocked: isEmployee ? personalExpertUnlocked : teamExpertCount > 0,
        earnedCount: isEmployee ? (personalExpertUnlocked ? 1 : 0) : teamExpertCount,
        totalEligible: isEmployee ? 1 : totalLearners,
        statusText: isEmployee
          ? (personalExpertUnlocked ? '✓ Earned' : 'Locked (Criteria Unmet)')
          : (teamExpertCount > 0
              ? `✓ Earned by ${teamExpertCount} of ${totalLearners} Learners (${Math.round((teamExpertCount / (totalLearners || 1)) * 100)}%)`
              : `0 of ${totalLearners} Qualified (Criteria Unmet)`)
      },
      {
        id: 'team',
        label: 'Zone Warrior',
        desc: 'Participated with assigned store/zone',
        icon: '🎯',
        color: '#2EA8FF',
        unlocked: isEmployee ? personalTeamUnlocked : teamZoneCount > 0,
        earnedCount: isEmployee ? (personalTeamUnlocked ? 1 : 0) : teamZoneCount,
        totalEligible: isEmployee ? 1 : totalLearners,
        statusText: isEmployee
          ? (personalTeamUnlocked ? '✓ Earned' : 'Locked (Criteria Unmet)')
          : (teamZoneCount > 0
              ? `✓ Earned by ${teamZoneCount} of ${totalLearners} Learners (${Math.round((teamZoneCount / (totalLearners || 1)) * 100)}%)`
              : `0 of ${totalLearners} Qualified (Criteria Unmet)`)
      },
      {
        id: 'perfect',
        label: 'Perfect Session',
        desc: 'Completed a quiz session with 100% score',
        icon: '💯',
        color: '#8B5CF6',
        unlocked: isEmployee ? personalPerfectUnlocked : teamPerfectCount > 0,
        earnedCount: isEmployee ? (personalPerfectUnlocked ? 1 : 0) : teamPerfectCount,
        totalEligible: isEmployee ? 1 : totalLearners,
        statusText: isEmployee
          ? (personalPerfectUnlocked ? '✓ Earned' : 'Locked (Criteria Unmet)')
          : (teamPerfectCount > 0
              ? `✓ Earned by ${teamPerfectCount} of ${totalLearners} Learners (${Math.round((teamPerfectCount / (totalLearners || 1)) * 100)}%)`
              : `0 of ${totalLearners} Qualified (Criteria Unmet)`)
      },
    ];

    res.json({
      isEmployee,
      selectedProjectId: targetProjectId,
      selectedProjectName,
      accessibleProjects,
      selectedQuizId: quizId,
      selectedSessionId: sessionId,
      summary: {
        totalParticipants: totalLearners,
        quizzesCompleted: completedAttemptsCount,
        completedAttempts: completedAttemptsCount,
        inProgressAttempts: Math.max(0, scopedParticipants.length - completedAttemptsCount),
        totalAttempts: scopedParticipants.length,
        distinctQuizzesCount: distinctQuizIds.size,
        distinctSessionsCount: distinctSessionIds.size,
        avgScore: overallAvgScore,
        totalArenaPoints: totalPointsAcrossScope
      },
      availableQuizzes,
      availableSessions,
      participantSummaries,
      zoneBreakdown,
      leaderboard,
      participantResults: (quizId !== 'all' || sessionId !== 'all') ? filteredParticipantRows : participantRows,
      allParticipantResults: participantRows,
      badges,
      stats: {
        sessionsParticipated: personalCompletedSessions,
        badgesEarned: badges.filter(b => b.unlocked).length,
        avgScore: personalAvgScore,
        fastestAnswer: personalFastestAnswer
      },
      level: {
        name: currentLevel.name,
        min: currentLevel.min,
        max: currentLevel.max,
        color: currentLevel.color,
        icon: currentLevel.icon,
        progressPct: levelPct,
        pointsToNext
      },
      totalPoints: personalArenaPoints
    });

  } catch (error) {
    console.error('Error in GET /api/reports/gamification:', error);
    const status = error.status || (error.message && (error.message.includes('Forbidden') || error.message.includes('Unauthorized')) ? 403 : 500);
    res.status(status).json({ error: error.message || 'Failed to fetch gamification and participant results' });
  }
});

// GET /api/reports/leaderboard - Fetch top participants strictly project-scoped and role-authorized
router.get('/leaderboard', requireAuth, async (req, res) => {
  try {
    const userRole = req.user.role || (req.user.Role ? req.user.Role.role_name : '');
    const { projectId = 'all', subProjectId = 'all', startDate, endDate } = req.query;

    let accessibleProjectIds = [];
    if (userRole === 'Client') {
      const clientService = require('../utils/clientService');
      accessibleProjectIds = await clientService.getAccessibleClientProjectIds(req.user, projectId, subProjectId);
    } else if (userRole === 'T&D Manager') {
      const tdService = require('../utils/tdService');
      accessibleProjectIds = await tdService.getAccessibleTDProjectIds(req.user, projectId, subProjectId);
    } else {
      const intelligenceService = require('../utils/projectIntelligenceService');
      accessibleProjectIds = await intelligenceService.getAccessibleProjectIds(req.user, projectId, subProjectId);
    }

    if (!accessibleProjectIds || accessibleProjectIds.length === 0) {
      return res.json([]);
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
        Response,
        {
          model: Session,
          where: sessionWhere,
          required: true,
          include: [
            {
              model: Quiz,
              required: true,
              include: [{ model: Question, as: 'questions' }]
            }
          ]
        }
      ]
    });

    const scopedParticipants = participants.filter(p => {
      const pProj = p.Session?.projectId || p.Session?.Quiz?.projectId;
      return pProj && accessibleProjectIds.includes(pProj);
    });

    const userStats = {};
    scopedParticipants.forEach(p => {
      const key = p.employeeId ? p.employeeId.trim().toLowerCase() : p.name.trim().toLowerCase();
      if (!userStats[key]) {
        userStats[key] = {
          name: p.name,
          employeeId: p.employeeId || 'N/A',
          totalCorrect: 0,
          totalQuestions: 0,
          attempts: 0,
          arenaPoints: 0
        };
      }
      const questionsCount = p.Session?.Quiz?.questions ? p.Session.Quiz.questions.length : 0;
      const responses = p.Responses || [];
      const correctCount = responses.filter(r => r.points_awarded > 0 || r.is_correct).length;
      userStats[key].totalCorrect += correctCount;
      userStats[key].totalQuestions += questionsCount;
      userStats[key].attempts += 1;
      userStats[key].arenaPoints += (Number(p.score) || 0);
    });

    const leaderboard = Object.values(userStats)
      .map(u => {
        const percentage = u.totalQuestions > 0 ? Math.min(100, Math.max(0, Math.round((u.totalCorrect / u.totalQuestions) * 100))) : null;
        return {
          name: u.name,
          employeeId: u.employeeId,
          score: percentage !== null ? `${percentage}%` : 'N/A',
          rawScore: percentage !== null ? percentage : -1,
          arenaPoints: u.arenaPoints,
          completion: '100%'
        };
      })
      .sort((a, b) => (b.arenaPoints - a.arenaPoints) || (b.rawScore - a.rawScore) || a.name.localeCompare(b.name))
      .slice(0, 10);

    res.json(leaderboard);
  } catch (error) {
    console.error('Error computing leaderboard:', error);
    const status = error.status || (error.message && (error.message.includes('Forbidden') || error.message.includes('Unauthorized')) ? 403 : 500);
    res.status(status).json({ error: error.message || 'Failed to compute leaderboard' });
  }
});

// ─── INTELLIGENT REPORTS & ANALYTICS ENGINE ROUTES ────────────────────────────
const reportAnalyticsEngine = require('../utils/reportAnalyticsEngine');
const reportExcelGenerator = require('../utils/reportExcelGenerator');
const reportPPTGenerator = require('../utils/reportPPTGenerator');
const ReportAudit = require('../models/ReportAudit');

// 1. GET /api/reports/analytics/available
router.get('/analytics/available', requireAuth, requireRole(['Admin', 'Super Admin', 'Program Manager', 'T&D Manager', 'Client', 'MD', 'COO', 'VP Operations', 'Marketing Manager']), async (req, res) => {
  try {
    let reports = await reportAnalyticsEngine.getAvailableReports(req.query, req.user);
    if (req.user.role === 'T&D Manager') {
      const tdService = require('../utils/tdService');
      const tdProjectIds = await tdService.getAccessibleTDProjectIds(req.user, 'all', 'all');
      reports = reports.filter(r => r.level !== 'LEVEL_3_MASTER_MONTHLY' && r.projectId && tdProjectIds.includes(r.projectId));
    }
    res.json(reports);
  } catch (error) {
    console.error('GET /api/reports/analytics/available error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch available reports' });
  }
});

// 2. GET /api/reports/analytics/data/:id
router.get('/analytics/data/:id', requireAuth, requireRole(['Admin', 'Super Admin', 'Program Manager', 'T&D Manager', 'Client', 'MD', 'COO', 'VP Operations', 'Marketing Manager']), async (req, res) => {
  try {
    const report = await ReportAudit.findByPk(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Role-based security check
    const user = req.user;
    const isSuper = ['Admin', 'Super Admin'].includes(user.role);
    if (user.role === 'T&D Manager') {
      if (report.level === 'LEVEL_3_MASTER_MONTHLY') {
        return res.status(403).json({ error: 'Forbidden: T&D Managers are not authorized to view enterprise Master Monthly reports' });
      }
      const tdService = require('../utils/tdService');
      const tdProjectIds = await tdService.getAccessibleTDProjectIds(user, 'all', 'all');
      if (!report.projectId || !tdProjectIds.includes(report.projectId)) {
        return res.status(403).json({ error: 'Forbidden: You are not authorized to view reports outside your assigned capability portfolio' });
      }
    } else if (user.role === 'Client') {
      const clientService = require('../utils/clientService');
      const clientProjectIds = await clientService.getAccessibleClientProjectIds(user);
      if (report.level === 'LEVEL_3_MASTER_MONTHLY' || !report.projectId || !clientProjectIds.includes(report.projectId)) {
        return res.status(403).json({ error: 'Forbidden: You are not authorized to view this report' });
      }
    } else if (!isSuper) {
      const accessibleProjectIds = await intelligenceService.getAccessibleProjectIds(user, 'all', 'all');
      if (report.projectId && !accessibleProjectIds.includes(report.projectId)) {
        return res.status(403).json({ error: 'Forbidden: You are not authorized to view this project report' });
      }
    }

    res.json(report.snapshotData || report);
  } catch (error) {
    console.error('GET /api/reports/analytics/data/:id error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch report data' });
  }
});

// 3. GET /api/reports/analytics/export/excel/:id
router.get('/analytics/export/excel/:id', requireAuth, requireRole(['Admin', 'Super Admin', 'Program Manager', 'T&D Manager', 'Client', 'MD', 'COO', 'VP Operations', 'Marketing Manager']), async (req, res) => {
  try {
    const report = await ReportAudit.findByPk(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Security check
    const isSuper = ['Admin', 'Super Admin'].includes(req.user.role);
    if (req.user.role === 'T&D Manager') {
      if (report.level === 'LEVEL_3_MASTER_MONTHLY') {
        return res.status(403).json({ error: 'Forbidden: T&D Managers are not authorized to export enterprise Master Monthly reports' });
      }
      const tdService = require('../utils/tdService');
      const tdProjectIds = await tdService.getAccessibleTDProjectIds(req.user, 'all', 'all');
      if (!report.projectId || !tdProjectIds.includes(report.projectId)) {
        return res.status(403).json({ error: 'Forbidden: You are not authorized to export reports outside your assigned capability portfolio' });
      }
    } else if (req.user.role === 'Client') {
      const clientService = require('../utils/clientService');
      const clientProjectIds = await clientService.getAccessibleClientProjectIds(req.user);
      if (report.level === 'LEVEL_3_MASTER_MONTHLY' || !report.projectId || !clientProjectIds.includes(report.projectId)) {
        return res.status(403).json({ error: 'Forbidden: You are not authorized to export this report' });
      }
    } else if (!isSuper) {
      const accessibleProjectIds = await intelligenceService.getAccessibleProjectIds(req.user, 'all', 'all');
      if (report.projectId && !accessibleProjectIds.includes(report.projectId)) {
        return res.status(403).json({ error: 'Forbidden: You are not authorized to export this report' });
      }
    }

    // Fetch master outcome rows for Sheet 9
    let outcomeRows = [];
    try {
      const pIds = report.projectId ? [report.projectId] : await intelligenceService.getAccessibleProjectIds(req.user, 'all', 'all');
      outcomeRows = await intelligenceService.getMasterTrainingOutcomeData(pIds);
    } catch (e) {
      outcomeRows = [];
    }

    const buffer = await reportExcelGenerator.generate10SheetExcelWorkbook(report.snapshotData || report, outcomeRows);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${report.reportCode || 'Report'}_Analytics.xlsx"`);
    res.send(buffer);
  } catch (error) {
    console.error('GET /api/reports/analytics/export/excel error:', error);
    res.status(500).json({ error: error.message || 'Failed to export Excel report' });
  }
});

// 4. GET /api/reports/analytics/export/ppt/:id
router.get('/analytics/export/ppt/:id', requireAuth, requireRole(['Admin', 'Super Admin', 'Program Manager', 'T&D Manager', 'Client', 'MD', 'COO', 'VP Operations', 'Marketing Manager']), async (req, res) => {
  try {
    const report = await ReportAudit.findByPk(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Security check
    const isSuper = ['Admin', 'Super Admin'].includes(req.user.role);
    if (req.user.role === 'T&D Manager') {
      if (report.level === 'LEVEL_3_MASTER_MONTHLY') {
        return res.status(403).json({ error: 'Forbidden: T&D Managers are not authorized to export enterprise Master Monthly decks' });
      }
      const tdService = require('../utils/tdService');
      const tdProjectIds = await tdService.getAccessibleTDProjectIds(req.user, 'all', 'all');
      if (!report.projectId || !tdProjectIds.includes(report.projectId)) {
        return res.status(403).json({ error: 'Forbidden: You are not authorized to export decks outside your assigned capability portfolio' });
      }
    } else if (req.user.role === 'Client') {
      const clientService = require('../utils/clientService');
      const clientProjectIds = await clientService.getAccessibleClientProjectIds(req.user);
      if (report.level === 'LEVEL_3_MASTER_MONTHLY' || !report.projectId || !clientProjectIds.includes(report.projectId)) {
        return res.status(403).json({ error: 'Forbidden: You are not authorized to export this presentation' });
      }
    } else if (!isSuper) {
      const accessibleProjectIds = await intelligenceService.getAccessibleProjectIds(req.user, 'all', 'all');
      if (report.projectId && !accessibleProjectIds.includes(report.projectId)) {
        return res.status(403).json({ error: 'Forbidden: You are not authorized to export this presentation' });
      }
    }

    const buffer = await reportPPTGenerator.generate14SlideManagementPPT(report.snapshotData || report);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${report.reportCode || 'Report'}_ManagementDeck.pptx"`);
    res.send(buffer);
  } catch (error) {
    console.error('GET /api/reports/analytics/export/ppt error:', error);
    res.status(500).json({ error: error.message || 'Failed to export PowerPoint presentation' });
  }
});

// 5. POST /api/reports/analytics/generate-on-demand
router.post('/analytics/generate-on-demand', requireAuth, requireRole(['Admin', 'Super Admin', 'Program Manager', 'T&D Manager', 'Client', 'MD', 'COO', 'VP Operations', 'Marketing Manager']), async (req, res) => {
  try {
    const { level = 2, projectId, quizId, sessionId, period = '2026-08', format = 'ALL' } = req.body;

    // Check project permission
    const isSuper = ['Admin', 'Super Admin'].includes(req.user.role);
    if (req.user.role === 'T&D Manager') {
      if (Number(level) === 3) {
        return res.status(403).json({ error: 'Forbidden: T&D Managers cannot generate enterprise Master Monthly reports' });
      }
      const tdService = require('../utils/tdService');
      const tdProjectIds = await tdService.getAccessibleTDProjectIds(req.user, 'all', 'all');
      if (Number(level) === 2) {
        if (!projectId || !tdProjectIds.includes(projectId)) {
          return res.status(403).json({ error: 'Forbidden: You are not authorized to generate reports for this project' });
        }
      } else if (Number(level) === 1) {
        const session = await Session.findOne({
          where: sessionId ? { id: sessionId } : { quizId },
          include: [{ model: Quiz, attributes: ['projectId'] }]
        });
        if (!session || !session.Quiz || !tdProjectIds.includes(session.Quiz.projectId)) {
          return res.status(403).json({ error: 'Forbidden: You are not authorized to generate report for this session' });
        }
      }
    } else if (req.user.role === 'Client') {
      if (Number(level) === 3) {
        return res.status(403).json({ error: 'Forbidden: Clients cannot generate enterprise Master Monthly reports' });
      }
      const clientService = require('../utils/clientService');
      const clientProjectIds = await clientService.getAccessibleClientProjectIds(req.user);
      if (Number(level) === 2) {
        if (!projectId || !clientProjectIds.includes(projectId)) {
          return res.status(403).json({ error: 'Forbidden: You are not authorized to generate reports for this project' });
        }
      } else if (Number(level) === 1) {
        const session = await Session.findOne({
          where: sessionId ? { id: sessionId } : { quizId },
          include: [{ model: Quiz, attributes: ['projectId'] }]
        });
        if (!session || !session.Quiz || !clientProjectIds.includes(session.Quiz.projectId)) {
          return res.status(403).json({ error: 'Forbidden: You are not authorized to generate report for this session' });
        }
      }
    } else if (projectId && !isSuper) {
      const accessibleProjectIds = await intelligenceService.getAccessibleProjectIds(req.user, 'all', 'all');
      if (!accessibleProjectIds.includes(projectId)) {
        return res.status(403).json({ error: 'Forbidden: You are not authorized to generate reports for this project' });
      }
    }

    let reportPayload;
    if (Number(level) === 1) {
      reportPayload = await reportAnalyticsEngine.generateLevel1QuizReport(quizId, sessionId, req.user);
    } else if (Number(level) === 2) {
      if (!projectId) {
        return res.status(400).json({ error: 'projectId is required for Level 2 Project Monthly Report' });
      }
      reportPayload = await reportAnalyticsEngine.generateLevel2ProjectMonthlyReport(projectId, period, req.user);
    } else if (Number(level) === 3) {
      reportPayload = await reportAnalyticsEngine.generateLevel3MasterMonthlyReport(period, req.user);
    } else {
      return res.status(400).json({ error: 'Invalid report level requested (must be 1, 2, or 3)' });
    }

    res.json({
      message: 'Report generated successfully',
      report: reportPayload
    });
  } catch (error) {
    console.error('POST /api/reports/analytics/generate-on-demand error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate report' });
  }
});

// 6. POST /api/reports/analytics/monthly-closing
router.post('/analytics/monthly-closing', requireAuth, async (req, res) => {
  try {
    const isSuper = ['Admin', 'Super Admin'].includes(req.user.role);
    if (!isSuper) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges for Monthly Closing' });
    }

    const { targetMonth = '2026-08' } = req.body;
    const closingResult = await reportAnalyticsEngine.runMonthlyClosing(targetMonth, req.user);

    res.json({
      message: `Automatic monthly closing completed successfully for ${targetMonth}`,
      summary: closingResult
    });
  } catch (error) {
    console.error('POST /api/reports/analytics/monthly-closing error:', error);
    res.status(500).json({ error: error.message || 'Monthly closing batch failed' });
  }
});

// 7. GET /api/reports/analytics/audit
router.get('/analytics/audit', requireAuth, async (req, res) => {
  try {
    const isSuper = ['Admin', 'Super Admin'].includes(req.user.role);
    const accessibleProjectIds = isSuper ? null : await intelligenceService.getAccessibleProjectIds(req.user, 'all', 'all');

    const whereClause = {};
    if (!isSuper) {
      whereClause[Op.or] = [
        { projectId: { [Op.in]: accessibleProjectIds } },
        { generatedBy: req.user.id }
      ];
    }

    const audits = await ReportAudit.findAll({
      where: whereClause,
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name'] },
        { model: User, as: 'generator', attributes: ['id', 'name', 'email'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    res.json(audits);
  } catch (error) {
    console.error('GET /api/reports/analytics/audit error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch audit log' });
  }
});

// ─── MASTER TRAINING OUTCOME REPORT (21 Columns) ──────────────────────────────
const intelligenceService = require('../utils/projectIntelligenceService');

router.get('/master-outcome', requireAuth, async (req, res) => {
  try {
    const { projectId = 'all', subProjectId = 'all' } = req.query;
    let projectIds;
    if (req.user.role === 'Client') {
      const clientService = require('../utils/clientService');
      projectIds = await clientService.getAccessibleClientProjectIds(req.user, projectId, subProjectId);
    } else if (req.user.role === 'T&D Manager') {
      const tdService = require('../utils/tdService');
      projectIds = await tdService.getAccessibleTDProjectIds(req.user, projectId, subProjectId);
    } else {
      projectIds = await intelligenceService.getAccessibleProjectIds(req.user, projectId, subProjectId);
    }

    const outcomeData = await intelligenceService.getMasterTrainingOutcomeData(projectIds);
    res.json(outcomeData);
  } catch (error) {
    console.error('GET /api/reports/master-outcome error:', error);
    const status = error.status || (error.message && (error.message.includes('Forbidden') || error.message.includes('Unauthorized')) ? 403 : 500);
    res.status(status).json({ error: error.message || 'Failed to generate master training outcome report' });
  }
});

// GET /api/reports/:sessionId - Fetch detailed report for a specific session
router.get('/:sessionId', requireAuth, async (req, res) => {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.sessionId);
    if (!isUuid) {
      return res.status(404).json({ error: 'Session report not found.' });
    }

    const session = await Session.findByPk(req.params.sessionId, {
      include: [
        {
          model: Quiz,
          include: [
            { model: Question, as: 'questions' },
            { model: Project, attributes: ['id', 'name', 'parentId'] }
          ]
        },
        {
          model: Project,
          attributes: ['id', 'name', 'parentId']
        },
        {
          model: Participant,
          include: [Response]
        },
        {
          model: User,
          as: 'host',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!session) {
      return res.status(404).json({ error: 'Session report not found.' });
    }

    // Strict Scope check for non-Superadmin
    const userRole = req.user.role || (req.user.Role ? req.user.Role.role_name : '');
    const sessionProjId = session.Quiz?.projectId || session.projectId;
    const sessionParentId = session.Quiz?.Project?.parentId || session.Project?.parentId;

    if (userRole === 'Client') {
      const clientService = require('../utils/clientService');
      const clientProjectIds = await clientService.getAccessibleClientProjectIds(req.user);
      if (!sessionProjId || !clientProjectIds.includes(sessionProjId)) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission to view this session report.' });
      }
    } else if (!['Admin', 'Super Admin'].includes(userRole)) {
      const intelligenceService = require('../utils/projectIntelligenceService');
      const accessibleProjectIds = await intelligenceService.getAccessibleProjectIds(req.user, 'all', 'all');
      const isHost = session.hostId === req.user.id || session.Quiz?.creatorId === req.user.id;
      const isProjectAuthorized = sessionProjId && (
        accessibleProjectIds.includes(sessionProjId) ||
        (sessionParentId && accessibleProjectIds.includes(sessionParentId))
      );
      if (!isHost && !isProjectAuthorized) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission to view this session report.' });
      }
    }

    const questions = (session.Quiz && session.Quiz.questions) ? session.Quiz.questions : [];
    const totalQuestions = questions.length;
    const maxPossiblePoints = questions.reduce((sum, q) => sum + (q.points !== undefined && q.points !== null ? Number(q.points) : 100), 0);
    let totalScoreSum = 0;

    const participantsDetails = (session.Participants || []).map(p => {
      const responses = p.Responses || [];
      const totalTimeMs = responses.reduce((sum, r) => sum + (r.response_time || 0), 0);
      const timeSpentSec = Math.round(totalTimeMs / 1000);
      
      const correctCount = responses.filter(r => (r.points_awarded > 0) || r.is_correct).length;
      const pointsEarned = responses.reduce((sum, r) => sum + (Number(r.points_awarded) || 0), 0);
      const percentage = maxPossiblePoints > 0 ? Math.min(100, Math.max(0, Math.round((pointsEarned / maxPossiblePoints) * 100))) : 0;
      totalScoreSum += percentage;

      const answeredQuestions = responses.length;
      const completionPercentage = totalQuestions > 0 ? Math.min(100, Math.max(0, Math.round((answeredQuestions / totalQuestions) * 100))) : 0;

      return {
        id: p.id,
        name: p.name,
        employeeId: p.employeeId || 'N/A',
        mobileNumber: p.mobileNumber || 'N/A',
        score: `${correctCount} / ${totalQuestions}`,
        pointsEarned,
        maxPossiblePoints,
        percentage: `${percentage}%`,
        arenaPoints: p.score !== undefined && p.score !== null ? p.score : pointsEarned,
        timeSpent: `${timeSpentSec}s`,
        completion: `${completionPercentage}%`,
        zone: p.storeName || null,
        region: p.storeName || null,
        storeName: p.storeName || null,
        responses: responses.map(r => ({
          questionId: r.questionId,
          answer: r.answer,
          points_awarded: r.points_awarded
        }))
      };
    });

    const avgScore = participantsDetails.length > 0 ? Math.round(totalScoreSum / participantsDetails.length) : 0;

    res.json({
      sessionId: session.id,
      quizTitle: session.Quiz ? session.Quiz.title : 'Unknown Quiz',
      projectName: session.Quiz && session.Quiz.Project ? session.Quiz.Project.name : (session.Project ? session.Project.name : 'N/A'),
      projectId: sessionProjId || null,
      hostName: session.host ? session.host.name : 'Lead Trainer',
      date: session.startedAt ? new Date(session.startedAt).toISOString().split('T')[0] : new Date(session.createdAt).toISOString().split('T')[0],
      totalQuestions,
      maxPossiblePoints,
      status: session.status || 'Finished',
      avgScore: `${avgScore}%`,
      participantsCount: participantsDetails.length,
      participants: participantsDetails,
      questions: questions.map(q => ({
        id: q.id,
        text: q.text,
        points: q.points !== undefined && q.points !== null ? Number(q.points) : 100,
        options: q.options,
        correct_answer: q.correct_answer
      }))
    });
  } catch (error) {
    console.error('Error fetching session details:', error);
    res.status(500).json({ error: 'Server error while fetching report details.' });
  }
});

// DELETE /api/reports/:id - Delete a session report with cascaded data removal
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id);
    if (!isUuid) {
      return res.status(404).json({ error: 'Report not found.' });
    }

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

