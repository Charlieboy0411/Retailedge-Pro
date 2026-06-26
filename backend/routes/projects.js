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

// GET /api/projects - List all projects
router.get('/', requireAuth, async (req, res) => {
  try {
    const projects = await Project.findAll({
      include: [
        { model: Project, as: 'parent', attributes: ['id', 'name'] },
        { model: Client, attributes: ['id', 'name', 'client_code'] }
      ]
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

module.exports = router;
