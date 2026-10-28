const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Client = require('../models/Client');
const User = require('../models/User');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Session = require('../models/Session');
const Participant = require('../models/Participant');
const Response = require('../models/Response');
const Training = require('../models/Training');
const JitsiAttendance = require('../models/JitsiAttendance');
const ExecutiveMetric = require('../models/ExecutiveMetric');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'project_logos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'plogo-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// GET /api/projects - List all projects (Administrative, Management & Training)
router.get('/', requireAuth, requireRole(['Admin', 'Super Admin', 'Program Manager', 'Operation Manager', 'T&D Manager', 'Trainer', 'Supervisor', 'Client', 'MD', 'COO', 'VP Operations']), async (req, res) => {
  try {
    let whereClause = {};

    // Client role scoping: Client only sees their explicitly authorized projects
    if (req.user.role === 'Client') {
      const clientService = require('../utils/clientService');
      const accessibleIds = await clientService.getAccessibleClientProjectIds(req.user, 'all', 'all');
      whereClause.id = { [require('sequelize').Op.in]: accessibleIds };
    } else if (req.user.role === 'T&D Manager') {
      const tdService = require('../utils/tdService');
      const accessibleIds = await tdService.getAccessibleTDProjectIds(req.user, 'all', 'all');
      whereClause.id = { [require('sequelize').Op.in]: accessibleIds };
    } else if (req.user.role === 'Program Manager' || req.user.role === 'Operation Manager' || req.user.role === 'Trainer') {
      const intelligenceService = require('../utils/projectIntelligenceService');
      const accessibleIds = await intelligenceService.getAccessibleProjectIds(req.user, 'all', 'all');
      whereClause.id = { [require('sequelize').Op.in]: accessibleIds.length > 0 ? accessibleIds : ['00000000-0000-0000-0000-000000000000'] };
    }

    const projects = await Project.findAll({
      where: whereClause,
      include: [
        { model: Project, as: 'parent', attributes: ['id', 'name'] },
        { model: Client, attributes: ['id', 'name', 'client_code'] }
      ],
      order: [['name', 'ASC']]
    });

    const { Op } = require('sequelize');
    const { determineProjectHealth } = require('../utils/reportAnalyticsEngine');

    const projectsWithCounts = await Promise.all(projects.map(async (p) => {
      const pJson = p.toJSON();
      const sessions = await Session.findAll({
        where: { projectId: p.id },
        include: [{ model: Quiz, attributes: ['id', 'config'] }]
      });
      const sessionIds = sessions.map(s => s.id);

      let distinctParticipantsCount = 0;
      let totalPassed = 0;
      let totalScored = 0;

      if (sessionIds.length > 0) {
        const parts = await Participant.findAll({
          where: { sessionId: { [Op.in]: sessionIds } },
          attributes: ['id', 'employeeId', 'userId', 'name', 'score', 'sessionId']
        });

        // Deduplicate participants strictly by canonical employeeId when available, or userId, or name
        const uniqueSet = new Set();
        parts.forEach(pt => {
          const key = (pt.employeeId && pt.employeeId.trim() && pt.employeeId !== 'N/A')
            ? pt.employeeId.trim().toLowerCase()
            : (pt.userId || pt.name.trim().toLowerCase());
          uniqueSet.add(key);
        });
        distinctParticipantsCount = uniqueSet.size;

        // Map session passing score threshold
        const sessionMap = new Map();
        sessions.forEach(s => {
          const passingScore = (s.Quiz?.config?.passing_score !== undefined && s.Quiz?.config?.passing_score !== null)
            ? Number(s.Quiz.config.passing_score)
            : 70;
          sessionMap.set(s.id, passingScore);
        });

        parts.forEach(pt => {
          if (pt.score !== null && pt.score !== undefined) {
            totalScored++;
            const thresh = sessionMap.get(pt.sessionId) || 70;
            if (Number(pt.score) >= thresh) {
              totalPassed++;
            }
          }
        });
      }

      pJson.participantCount = distinctParticipantsCount;
      pJson.participants_count = distinctParticipantsCount;
      pJson.participants_covered = distinctParticipantsCount;
      pJson.participants_planned = p.participants_planned || 0;

      // Calculate Project Health dynamically from operational metrics
      if (sessionIds.length === 0 || distinctParticipantsCount === 0 || totalScored === 0) {
        // Missing or incomplete operational inputs
        pJson.healthScore = null;
        pJson.healthStatus = 'Unavailable';
        pJson.healthBadge = '⚪ N/A';
        pJson.passRate = 'N/A';
        pJson.completionRate = p.participants_planned > 0 ? '0%' : 'N/A';
      } else {
        const passRate = Math.round((totalPassed / totalScored) * 100);
        const completionRate = p.participants_planned > 0
          ? Math.min(100, Math.round((distinctParticipantsCount / p.participants_planned) * 100))
          : 100;

        const health = determineProjectHealth(null, completionRate, passRate);
        const healthScore = Math.round(0.6 * passRate + 0.4 * completionRate);

        pJson.healthScore = healthScore;
        pJson.healthStatus = health.status;
        pJson.healthBadge = health.badge;
        pJson.passRate = `${passRate}%`;
        pJson.completionRate = `${completionRate}%`;
      }

      return pJson;
    }));

    res.json(projectsWithCounts);
  } catch (error) {
    console.error('Server error fetching projects:', error);
    res.status(500).json({ error: 'Server error fetching projects' });
  }
});

// ─── PM INTELLIGENCE & PROJECT SCOPING ENDPOINTS ──────────────────────────────
const intelligenceService = require('../utils/projectIntelligenceService');

// GET /api/projects/my-projects - Returns projects assigned to the calling PM or Trainer
router.get('/my-projects', requireAuth, async (req, res) => {
  try {
    const accessibleIds = await intelligenceService.getAccessibleProjectIds(req.user, 'all', 'all');
    let whereClause = {};
    if (accessibleIds.length > 0) {
      whereClause.id = { [require('sequelize').Op.in]: accessibleIds };
    } else if (req.user.role === 'Trainer' || ['Admin', 'Super Admin'].includes(req.user.role)) {
      // Trainers without strict individual project constraints can view all active projects
      whereClause = {};
    } else {
      return res.json([]);
    }

    const projects = await Project.findAll({
      where: whereClause,
      include: [
        { model: Project, as: 'parent', attributes: ['id', 'name'] },
        { model: Project, as: 'subProjects', attributes: ['id', 'name', 'status'] },
        { model: Client, attributes: ['id', 'name', 'client_code'] }
      ],
      order: [['name', 'ASC']]
    });

    res.json(projects);
  } catch (error) {
    console.error('GET /api/projects/my-projects error:', error);
    res.status(500).json({ error: 'Failed to fetch assigned projects', details: error.message });
  }
});

// GET /api/projects/:id/trainers - Returns active, eligible trainers assigned to the project
router.get('/:id/trainers', requireAuth, async (req, res) => {
  try {
    const projectId = req.params.id;
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID format' });
    }

    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const userRole = req.user.role || (req.user.Role ? req.user.Role.role_name : '');
    const isAdmin = ['Admin', 'Super Admin', 'MD', 'COO', 'VP Operations'].includes(userRole);

    // Scoping: verify caller has access to this project
    if (!isAdmin) {
      const accessibleProjectIds = await intelligenceService.getAccessibleProjectIds(req.user, 'all', 'all');
      if (!accessibleProjectIds.includes(projectId)) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission to view trainers for this project' });
      }
    }

    const Role = require('../models/Role');
    const ProjectAssignment = require('../models/ProjectAssignment');
    const { Op } = require('sequelize');

    // Canonical Trainer Role lookup
    const trainerRole = await Role.findOne({ where: { role_name: 'Trainer' } });
    if (!trainerRole) {
      return res.json([]);
    }

    // Effective project IDs: include the project and its parent(s) if this is a subproject
    const effectiveProjectIds = [projectId];
    const visited = new Set([projectId]);
    let curr = project;
    while (curr && curr.parentId && !visited.has(curr.parentId)) {
      visited.add(curr.parentId);
      effectiveProjectIds.push(curr.parentId);
      curr = await Project.findByPk(curr.parentId, { attributes: ['id', 'parentId'] });
    }

    // 1. Find all active ProjectAssignments for this project or its parent hierarchy
    const assignedRows = await ProjectAssignment.findAll({
      where: {
        projectId: { [Op.in]: effectiveProjectIds },
        status: 'Active'
      },
      attributes: ['userId', 'role']
    });

    const candidateUserIds = new Set(assignedRows.map(a => a.userId));

    // 2. Query active users who have canonical role Trainer
    const allTrainers = await User.findAll({
      where: {
        status: 'Active',
        roleId: trainerRole.id
      },
      attributes: ['id', 'name', 'email', 'employee_id', 'designation', 'location', 'projectId'],
      order: [['name', 'ASC']]
    });

    const trainers = allTrainers.filter(t => {
      if (candidateUserIds.has(t.id)) return true;
      if (!t.projectId) return false;
      const userProjects = String(t.projectId).split(',').map(s => s.trim());
      return userProjects.some(pId => effectiveProjectIds.includes(pId));
    }).map(t => {
      const raw = t.toJSON ? t.toJSON() : t;
      const { projectId: _, ...clean } = raw;
      return clean;
    });

    res.json(trainers);
  } catch (error) {
    console.error('GET /api/projects/:id/trainers error:', error);
    res.status(500).json({ error: 'Failed to fetch project trainers', details: error.message });
  }
});

// GET /api/projects/intelligence - Unified scoped intelligence payload for PM Dashboard
router.get('/intelligence', requireAuth, async (req, res) => {
  try {
    const { projectId = 'all', subProjectId = 'all', range = '7d' } = req.query;
    
    // Strict authorization and project resolution
    const projectIds = await intelligenceService.getAccessibleProjectIds(req.user, projectId, subProjectId);

    if (projectIds.length === 0) {
      return res.json({
        kpis: await intelligenceService.getProjectKPIs([]),
        trainingPerformance: await intelligenceService.getProjectTrainingPerformance([]),
        jitsiAttendance: await intelligenceService.getProjectJitsiAttendance([]),
        quizIntelligence: await intelligenceService.getProjectQuizIntelligence([]),
        certificationIntelligence: await intelligenceService.getProjectCertificationIntelligence([]),
        projectComparison: [],
        alerts: []
      });
    }

    const [
      kpis,
      trainingPerformance,
      jitsiAttendance,
      quizIntelligence,
      certificationIntelligence,
      projectComparison,
      alerts
    ] = await Promise.all([
      intelligenceService.getProjectKPIs(projectIds),
      intelligenceService.getProjectTrainingPerformance(projectIds),
      intelligenceService.getProjectJitsiAttendance(projectIds),
      intelligenceService.getProjectQuizIntelligence(projectIds),
      intelligenceService.getProjectCertificationIntelligence(projectIds),
      projectId === 'all' ? intelligenceService.getProjectComparison(req.user) : Promise.resolve([]),
      intelligenceService.getProjectAlerts(projectIds)
    ]);

    res.json({
      kpis,
      trainingPerformance,
      jitsiAttendance,
      quizIntelligence,
      certificationIntelligence,
      projectComparison,
      alerts
    });
  } catch (error) {
    console.error('GET /api/projects/intelligence error:', error);
    const status = error.status || (error.message.includes('Forbidden') || error.message.includes('Unauthorized') ? 403 : 500);
    res.status(status).json({ 
      error: error.message || 'Failed to fetch project intelligence' 
    });
  }
});

// GET /api/projects/participant-360/:participantId - Unified Participant 360 profile
router.get('/participant-360/:participantId', requireAuth, async (req, res) => {
  try {
    const { participantId } = req.params;
    const { projectId = 'all', subProjectId = 'all' } = req.query;
    const projectIds = await intelligenceService.getAccessibleProjectIds(req.user, projectId, subProjectId);

    const participant360 = await intelligenceService.getParticipant360(participantId, projectIds, req.user);
    res.json({ ...participant360, user: participant360.profile });
  } catch (error) {
    console.error('GET /api/projects/participant-360 error:', error);
    const status = error.status || (error.message.includes('Forbidden') || error.message.includes('Unauthorized') ? 403 : 500);
    res.status(status).json({ error: error.message || 'Failed to fetch participant 360 profile', details: error.message });
  }
});

// GET /api/projects/data-integrity - System data reconciliation monitor for Admin
router.get('/data-integrity', requireAuth, async (req, res) => {
  try {
    const userRole = req.user.role || (req.user.Role ? req.user.Role.role_name : '');
    if (!['Admin', 'Super Admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Forbidden: Admin access required for data integrity monitor.' });
    }
    const metrics = await intelligenceService.getDataIntegrityMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data integrity metrics', details: error.message });
  }
});

// GET /api/projects/participant-360 - Support query parameter ?userId= or ?participantId=
router.get('/participant-360', requireAuth, async (req, res) => {
  try {
    const participantId = req.query.userId || req.query.participantId;
    if (!participantId) {
      return res.status(400).json({ error: 'userId or participantId query parameter required' });
    }
    const { projectId = 'all', subProjectId = 'all' } = req.query;
    const projectIds = await intelligenceService.getAccessibleProjectIds(req.user, projectId, subProjectId);

    const participant360 = await intelligenceService.getParticipant360(participantId, projectIds, req.user);
    res.json({ ...participant360, user: participant360.profile });
  } catch (error) {
    console.error('GET /api/projects/participant-360 error:', error);
    const status = error.status || (error.message.includes('Forbidden') || error.message.includes('Unauthorized') ? 403 : 500);
    res.status(status).json({ error: error.message || 'Failed to fetch participant 360 profile', details: error.message });
  }
});

// GET /api/projects/participants - Authoritative project-scoped participants list
router.get('/participants', requireAuth, requireRole(['Admin', 'Super Admin', 'Program Manager', 'Operation Manager', 'MD', 'COO', 'VP Operations', 'Trainer', 'Supervisor']), async (req, res) => {
  try {
    const { projectId = 'all', subProjectId = 'all', search, status, zone } = req.query;
    
    // Server-side strict authorization
    const projectIds = await intelligenceService.getAccessibleProjectIds(req.user, projectId, subProjectId);

    if (!projectIds || projectIds.length === 0) {
      return res.json([]);
    }

    const { Op } = require('sequelize');

    // Retrieve sessions within authorized projects
    const sessions = await Session.findAll({
      where: { projectId: { [Op.in]: projectIds } },
      include: [
        { model: Project, attributes: ['id', 'name', 'project_code'] },
        { model: Quiz, attributes: ['id', 'title'], include: [{ model: Question, as: 'questions', attributes: ['id'] }] },
        { model: Training, attributes: ['id', 'title'] }
      ]
    });
    const sessionIds = sessions.map(s => s.id);

    // Retrieve real participant records
    const participants = sessionIds.length > 0 ? await Participant.findAll({
      where: { sessionId: { [Op.in]: sessionIds } },
      include: [
        {
          model: Session,
          include: [
            { model: Project, attributes: ['id', 'name', 'project_code'] },
            { model: Quiz, attributes: ['id', 'title'], include: [{ model: Question, as: 'questions', attributes: ['id'] }] },
            { model: Training, attributes: ['id', 'title'] }
          ]
        },
        {
          model: User,
          attributes: ['id', 'name', 'email', 'employee_id', 'designation', 'location', 'projectId'],
          include: [{ model: Project, attributes: ['id', 'name'] }]
        },
        {
          model: Response,
          attributes: ['id', 'points_awarded', 'answer']
        }
      ],
      order: [['createdAt', 'DESC']]
    }) : [];

    // Also fetch Jitsi attendance telemetry
    const jitsiRecords = await JitsiAttendance.findAll({
      where: {
        [Op.or]: [
          { projectId: { [Op.in]: projectIds } },
          { subProjectId: { [Op.in]: projectIds } }
        ]
      }
    });
    const jitsiMap = {};
    jitsiRecords.forEach(j => {
      if (j.employeeId) jitsiMap[j.employeeId] = j;
      if (j.participantName) jitsiMap[j.participantName] = j;
      if (j.userId) jitsiMap[j.userId] = j;
    });

    let list = participants.map(p => {
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
        // Telemetry absent: do not infer 100% attendance or certify, but do not falsely penalize quiz passers as genuine 0% attendance
        readinessStatus = scorePct < 60 ? 'At Risk' : 'Pending Attendance';
      }

      return {
        id: p.id,
        participantId: p.id,
        name: p.name,
        employeeId: p.employeeId || p.User?.employee_id || '—',
        email: p.User?.email || '—',
        projectId: p.Session?.projectId || p.User?.projectId || projectIds[0],
        projectName: p.Session?.Project?.name || p.User?.Project?.name || 'Assigned Project',
        zoneStore: p.storeName || p.User?.location || 'General',
        trainingStatus: trainingStatus,
        sessionName: p.Session?.Quiz?.title || p.Session?.Training?.title || 'Launchpad Session',
        quizScore: `${correctCount}/${totalQ}`,
        quizScoreNumber: correctCount,
        quizTotalQuestions: totalQ,
        quizPercentage: scorePct,
        quizPassed: passed,
        attendanceRate: attendancePct,
        hasAttendanceRecord: hasAuthoritativeAttendance,
        readinessStatus: readinessStatus,
        createdAt: p.createdAt
      };
    });

    // Server-side filtering within authorized project scope
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(item =>
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.employeeId && item.employeeId.toLowerCase().includes(q)) ||
        (item.zoneStore && item.zoneStore.toLowerCase().includes(q)) ||
        (item.projectName && item.projectName.toLowerCase().includes(q))
      );
    }
    if (status && status !== 'ALL') {
      const s = status.toUpperCase();
      if (s === 'ATTENDED') list = list.filter(item => item.attendanceRate !== null && item.attendanceRate !== undefined && item.attendanceRate >= 75);
      else if (s === 'PASSED') list = list.filter(item => item.quizPassed);
      else if (s === 'ELIGIBLE') list = list.filter(item => item.readinessStatus === 'Certification Eligible');
      else if (s === 'AT_RISK') list = list.filter(item => item.readinessStatus === 'At Risk');
      else if (s === 'PENDING') list = list.filter(item => item.readinessStatus === 'Pending Attendance');
    }
    if (zone && zone !== 'ALL') {
      list = list.filter(item => item.zoneStore.toLowerCase() === zone.toLowerCase());
    }

    res.json(list);
  } catch (error) {
    console.error('GET /api/projects/participants error:', error);
    const statusCode = error.status || (error.message.includes('Forbidden') || error.message.includes('Unauthorized') ? 403 : 500);
    res.status(statusCode).json({ error: error.message || 'Failed to fetch project participants', details: error.message });
  }
});

// POST /api/projects - Create new project
router.post('/', requireAuth, requireRole(['Admin', 'Super Admin']), upload.single('project_logo'), async (req, res) => {
  try {
    const projectData = req.body;
    if (!projectData.name) return res.status(400).json({ error: 'Project name is required' });
    if (!projectData.project_code) return res.status(400).json({ error: 'Project code is required' });

    if (req.file) {
      projectData.project_logo = `/uploads/project_logos/${req.file.filename}`;
    }

    if (!projectData.parentId) {
      projectData.parentId = null;
    }

    const newProject = await Project.create(projectData);
    res.status(201).json(newProject);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create project', details: error.message });
  }
});

// PUT /api/projects/:id - Update/rename project
router.put('/:id', requireAuth, requireRole(['Admin', 'Super Admin']), upload.single('project_logo'), async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectData = req.body;
    
    // Prevent circular/self-nesting
    if (projectData.parentId && projectData.parentId === id) {
      return res.status(400).json({ error: 'A project cannot be its own parent mother project.' });
    }

    if (req.file) {
      projectData.project_logo = `/uploads/project_logos/${req.file.filename}`;
    }

    if (projectData.parentId === '') {
      projectData.parentId = null;
    }

    await project.update(projectData);

    const updatedProject = await Project.findByPk(id, {
      include: [
        { model: Project, as: 'parent', attributes: ['id', 'name'] },
        { model: Client, attributes: ['id', 'name', 'client_code'] }
      ]
    });

    res.json(updatedProject);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update project', details: error.message });
  }
});

// DELETE /api/projects/:id - Delete project safely
router.delete('/:id', requireAuth, requireRole(['Admin', 'Super Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check for nested sub-projects
    const subProjectsCount = await Project.count({ where: { parentId: id } });
    if (subProjectsCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete project because it has sub-projects. Please delete or reassign them first.' 
      });
    }

    // Check for assigned users (employees)
    const usersCount = await User.count({ where: { projectId: id } });
    if (usersCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete project because employees are currently assigned to it. Please reassign them first.' 
      });
    }

    // Check for assigned quizzes
    const quizzesCount = await Quiz.count({ where: { projectId: id } });
    if (quizzesCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete project because quizzes are currently assigned to it. Please reassign or delete the quizzes first.' 
      });
    }

    await project.destroy();
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project', details: error.message });
  }
});

// GET /api/projects/:id/executive-metrics - Fetch manual metrics for a project
router.get('/:id/executive-metrics', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const metrics = await ExecutiveMetric.findAll({ where: { projectId: id } });
    
    // Convert to a clean key-value object
    const result = {};
    metrics.forEach(m => {
      try {
        result[m.metricKey] = JSON.parse(m.metricValue);
      } catch (e) {
        result[m.metricKey] = m.metricValue;
      }
    });
    
    res.json(result);
  } catch (error) {
    console.error('GET /api/projects/:id/executive-metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch executive metrics', details: error.message });
  }
});

// POST /api/projects/:id/executive-metrics - Save manual metrics (authorized roles only)
router.post('/:id/executive-metrics', requireAuth, requireRole(['Admin', 'Super Admin', 'MD', 'COO', 'VP Operations']), async (req, res) => {
  try {
    const { id } = req.params;
    const { metrics } = req.body;
    
    if (!metrics || typeof metrics !== 'object') {
      return res.status(400).json({ error: 'Invalid metrics object' });
    }

    // Execute writes sequentially to ensure data consistency
    for (const key of Object.keys(metrics)) {
      const valueStr = JSON.stringify(metrics[key]);
      const [metricRecord, created] = await ExecutiveMetric.findOrCreate({
        where: { projectId: id, metricKey: key },
        defaults: { metricValue: valueStr }
      });
      if (!created && metricRecord.metricValue !== valueStr) {
        await metricRecord.update({ metricValue: valueStr });
      }
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('POST /api/projects/:id/executive-metrics error:', error);
    res.status(500).json({ error: 'Failed to save executive metrics', details: error.message });
  }
});

// GET /api/projects/:id/team - Project Team Roster & Directory (read-only for authorized roles)
router.get('/:id/team', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const accessibleProjectIds = await intelligenceService.getAccessibleProjectIds(req.user, 'all', 'all');
    if (!accessibleProjectIds.includes(id)) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to view this project team directory.' });
    }

    const project = await Project.findByPk(id, {
      attributes: ['id', 'name', 'project_code', 'zone', 'region', 'territory']
    });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const STAKEHOLDER_ROLES = ['Client', 'Program Manager', 'Supervisor'];
    const ProjectAssignment = require('../models/ProjectAssignment');
    const Role = require('../models/Role');
    const { Op } = require('sequelize');

    // Query active project assignments strictly for designated stakeholder roles
    const assignments = await ProjectAssignment.findAll({
      where: {
        projectId: id,
        status: 'Active',
        role: { [Op.in]: STAKEHOLDER_ROLES }
      },
      attributes: ['userId', 'role', 'zone', 'status']
    }).catch(() => []);

    const assignedUserIds = assignments.map(a => a.userId);
    const assignmentMap = new Map();
    assignments.forEach(a => assignmentMap.set(a.userId, a));

    let assignedUsers = [];
    if (assignedUserIds.length > 0) {
      assignedUsers = await User.findAll({
        where: { id: { [Op.in]: assignedUserIds } },
        include: [
          {
            model: Role,
            attributes: ['id', 'role_name'],
            where: { role_name: { [Op.in]: STAKEHOLDER_ROLES } }
          }
        ],
        attributes: ['id', 'name', 'email', 'employee_id', 'designation', 'location', 'status', 'projectId']
      });
    }

    const stakeholderMap = new Map();

    assignedUsers.forEach(u => {
      // Disambiguate strictly by employee_id or canonical user ID (never by name alone)
      const dedupeKey = (u.employee_id && u.employee_id.trim() && u.employee_id !== 'N/A')
        ? u.employee_id.trim().toLowerCase()
        : u.id;

      if (!stakeholderMap.has(dedupeKey)) {
        const assignment = assignmentMap.get(u.id);
        const resolvedZone = (assignment?.zone && assignment.zone.trim())
          || (project.zone && project.zone.trim())
          || 'Unmapped';

        stakeholderMap.set(dedupeKey, {
          id: u.id,
          name: u.name,
          employeeId: (u.employee_id && u.employee_id.trim()) ? u.employee_id.trim() : 'N/A',
          email: u.email || '—',
          designation: (u.designation && u.designation.trim()) ? u.designation.trim() : 'Not Configured',
          systemRole: u.Role?.role_name || 'Staff',
          zone: resolvedZone,
          status: u.status || 'Active'
        });
      }
    });

    const distinctStakeholders = Array.from(stakeholderMap.values()).sort((a, b) => {
      const roleOrder = { 'Client': 1, 'Program Manager': 2, 'Supervisor': 3 };
      const orderA = roleOrder[a.systemRole] || 99;
      const orderB = roleOrder[b.systemRole] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });

    // Group distinct stakeholders by Zone
    const zonesMap = new Map();
    const projectZone = project.zone || 'Unmapped';
    zonesMap.set(projectZone, []);

    distinctStakeholders.forEach(st => {
      const z = st.zone || projectZone;
      if (!zonesMap.has(z)) zonesMap.set(z, []);
      zonesMap.get(z).push(st);
    });

    const stakeholdersByZone = Array.from(zonesMap.entries()).map(([zone, stakeholders]) => {
      const presentRoles = new Set(stakeholders.map(s => s.systemRole));
      const missingRoles = STAKEHOLDER_ROLES.filter(r => !presentRoles.has(r));

      return {
        zone,
        stakeholders,
        totalInZone: stakeholders.length,
        missingDesignations: missingRoles
      };
    });

    res.json({
      project: {
        id: project.id,
        name: project.name,
        code: project.project_code,
        zone: project.zone || 'Unmapped',
        territory: project.territory || 'Unmapped'
      },
      totalStakeholders: distinctStakeholders.length,
      teamCount: distinctStakeholders.length,
      team: distinctStakeholders,
      stakeholdersByZone,
      requiredStakeholderRoles: STAKEHOLDER_ROLES
    });
  } catch (error) {
    console.error('GET /api/projects/:id/team error:', error);
    const status = error.status || (error.message.includes('Forbidden') ? 403 : 500);
    res.status(status).json({ error: error.message || 'Failed to fetch project team directory' });
  }
});

// GET /api/projects/:id - Fetch single project with RBAC (must be at the end to prevent catching subroutes)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    // Guard against non-UUID route parameters to avoid Postgres type syntax errors
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (req.user.role === 'Client') {
      const clientService = require('../utils/clientService');
      const accessibleIds = await clientService.getAccessibleClientProjectIds(req.user, 'all', 'all');
      if (!accessibleIds.includes(id)) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission for this project.' });
      }
    } else if (req.user.role === 'Program Manager' || req.user.role === 'Operation Manager' || req.user.role === 'T&D Manager') {
      const accessibleIds = await intelligenceService.getAccessibleProjectIds(req.user, 'all', 'all');
      if (!accessibleIds.includes(id)) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission for this project.' });
      }
    }

    const project = await Project.findByPk(id, {
      include: [
        { model: Project, as: 'parent', attributes: ['id', 'name'] },
        { model: Client, attributes: ['id', 'name', 'client_code'] }
      ]
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching project details' });
  }
});

module.exports = router;

