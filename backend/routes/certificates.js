const express = require('express');
const router = express.Router();
const Certificate = require('../models/Certificate');
const User = require('../models/User');
const Project = require('../models/Project');
const { requireAuth } = require('../middleware/authMiddleware');
const { Op } = require('sequelize');

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

// GET /api/certificates - Fetch certificates with RBAC visibility
router.get('/', requireAuth, async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;
    const userProjectId = req.user.projectId;

    const includeOptions = [
      {
        model: User,
        attributes: ['id', 'name', 'email', 'designation', 'employee_id']
      },
      {
        model: Project,
        attributes: ['id', 'name']
      }
    ];

    let whereClause = {};

    // Apply role-based filtering
    if (['Admin', 'Super Admin'].includes(userRole)) {
      // Admins/Super Admins see everything
    } else if (['MD', 'COO', 'VP Operations'].includes(userRole)) {
      if (!userProjectId) {
        return res.status(403).json({ error: 'You are not assigned to a project.' });
      }
      const projectIds = await getAccessibleProjectIds(userProjectId);
      whereClause.projectId = { [Op.in]: projectIds };
    } else if (['Client', 'Program Manager', 'Manager'].includes(userRole)) {
      // Clients, Program Managers, and Supervisors see only certificates for their project
      if (!userProjectId) {
        return res.status(403).json({ error: 'You are not assigned to a project.' });
      }
      const projectIds = await getAccessibleProjectIds(userProjectId);
      whereClause.projectId = { [Op.in]: projectIds };
    } else {
      // Learners (Staff) and other roles only see their own certificates
      whereClause.userId = userId;
    }

    const certificates = await Certificate.findAll({
      where: whereClause,
      include: includeOptions,
      order: [['createdAt', 'DESC']]
    });

    res.json(certificates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch certificates', details: error.message });
  }
});

// POST /api/certificates/claim - Manual claiming route
router.post('/claim', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.body;
    const userId = req.user.id;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required to claim a certificate.' });
    }

    // Verify if already claimed
    const existing = await Certificate.findOne({ where: { userId, projectId } });
    if (existing) {
      return res.status(400).json({ error: 'Certificate already claimed for this project.' });
    }

    // Double check if training is completed
    const Training = require('../models/Training');
    const TrainingProgress = require('../models/TrainingProgress');

    const totalTrainings = await Training.count({ where: { projectId } });
    if (totalTrainings === 0) {
      return res.status(400).json({ error: 'No training modules found for this project.' });
    }

    const completedCount = await TrainingProgress.count({
      where: { userId, completed: true },
      include: [{
        model: Training,
        where: { projectId }
      }]
    });

    if (completedCount < totalTrainings) {
      return res.status(400).json({ 
        error: `Incomplete training: Completed ${completedCount}/${totalTrainings} modules.` 
      });
    }

    const cert = await Certificate.create({
      userId,
      projectId,
      issueDate: new Date(),
      qrCode: `CERT-QR-${userId.substring(0, 5)}-${projectId.substring(0, 5)}-${Date.now()}`
    });

    res.status(201).json({ message: 'Certificate issued successfully!', cert });
  } catch (error) {
    res.status(500).json({ error: 'Failed to claim certificate', details: error.message });
  }
});

// GET /api/certificates/:id/download - Download certificate as PDF
router.get('/:id/download', requireAuth, async (req, res) => {
  try {
    const certId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    const userProjectId = req.user.projectId;

    const cert = await Certificate.findByPk(certId, {
      include: [
        { model: User, attributes: ['id', 'name', 'email'] },
        { model: Project, attributes: ['id', 'name'] }
      ]
    });

    if (!cert) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    // Basic RBAC check
    if (!['Admin', 'Super Admin'].includes(userRole)) {
      if (['MD', 'COO', 'VP Operations', 'Client', 'Program Manager', 'Manager'].includes(userRole)) {
        const projectIds = await getAccessibleProjectIds(userProjectId);
        if (!projectIds.includes(String(cert.projectId))) {
          return res.status(403).json({ error: 'Not authorized to download this certificate' });
        }
      } else {
        if (cert.userId !== userId) {
          return res.status(403).json({ error: 'Not authorized to download this certificate' });
        }
      }
    }

    const { generatePDFBuffer } = require('../utils/pdfGenerator');
    const pdfBuffer = await generatePDFBuffer(cert);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Certificate_${cert.User?.name.replace(/\\s+/g, '_') || 'Student'}.pdf`);
    res.send(Buffer.from(pdfBuffer));
  } catch (error) {
    console.error('PDF download error:', error);
    res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
  }
});

module.exports = router;
