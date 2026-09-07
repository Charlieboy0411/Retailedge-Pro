const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Client = require('../models/Client');
const User = require('../models/User');
const Quiz = require('../models/Quiz');
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

// GET /api/projects - List all projects (Administrative / Management only)
router.get('/', requireAuth, requireRole(['Admin', 'Super Admin', 'Program Manager', 'T&D Manager', 'Client', 'MD', 'COO', 'VP Operations']), async (req, res) => {
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
    }

    const projects = await Project.findAll({
      where: whereClause,
      include: [
        { model: Project, as: 'parent', attributes: ['id', 'name'] },
        { model: Client, attributes: ['id', 'name', 'client_code'] }
      ],
      order: [['name', 'ASC']]
    });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching projects' });
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

// ─── PM INTELLIGENCE & PROJECT SCOPING ENDPOINTS ──────────────────────────────
const intelligenceService = require('../utils/projectIntelligenceService');

// GET /api/projects/my-projects - Returns projects assigned to the calling PM
router.get('/my-projects', requireAuth, async (req, res) => {
  try {
    const accessibleIds = await intelligenceService.getAccessibleProjectIds(req.user, 'all', 'all');
    if (accessibleIds.length === 0) {
      return res.json([]);
    }

    const projects = await Project.findAll({
      where: { id: { [require('sequelize').Op.in]: accessibleIds } },
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

// GET /api/projects/:id - Fetch single project with RBAC (must be at the end to prevent catching subroutes)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role === 'Client') {
      const clientService = require('../utils/clientService');
      const accessibleIds = await clientService.getAccessibleClientProjectIds(req.user, 'all', 'all');
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

