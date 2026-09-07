const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const clientService = require('../utils/clientService');
const Project = require('../models/Project');
const { Op } = require('sequelize');

/**
 * All Client endpoints require authentication and 'Client' role
 * (Super Admin & Admin can also access for system oversight)
 */
const CLIENT_ROLES = ['Client', 'Admin', 'Super Admin'];

// GET /api/client/projects - List client-scoped authorized projects & subprojects
router.get('/projects', requireAuth, requireRole(CLIENT_ROLES), async (req, res) => {
  try {
    const accessibleIds = await clientService.getAccessibleClientProjectIds(req.user, 'all', 'all');
    if (accessibleIds.length === 0) {
      return res.json([]);
    }

    const projects = await Project.findAll({
      where: { id: { [Op.in]: accessibleIds } },
      attributes: ['id', 'name', 'project_code', 'status', 'start_date', 'end_date', 'parentId'],
      include: [
        { model: Project, as: 'parent', attributes: ['id', 'name'] },
        { model: Project, as: 'subProjects', attributes: ['id', 'name', 'status'] }
      ],
      order: [['name', 'ASC']]
    });

    res.json(projects);
  } catch (error) {
    console.error('GET /api/client/projects error:', error);
    res.status(500).json({ error: 'Failed to fetch client projects', details: error.message });
  }
});

// GET /api/client/cockpit - Real database KPIs and project breakdown
router.get('/cockpit', requireAuth, requireRole(CLIENT_ROLES), async (req, res) => {
  try {
    const { projectId = 'all', subProjectId = 'all' } = req.query;
    const metrics = await clientService.getClientCockpitMetrics(req.user, projectId, subProjectId);
    res.json(metrics);
  } catch (error) {
    console.error('GET /api/client/cockpit error:', error);
    const status = error.status || (error.message.includes('Forbidden') ? 403 : 500);
    res.status(status).json({ error: error.message || 'Failed to fetch cockpit metrics' });
  }
});

// GET /api/client/participants - Client-scoped participant performance roster
router.get('/participants', requireAuth, requireRole(CLIENT_ROLES), async (req, res) => {
  try {
    const { projectId = 'all', subProjectId = 'all', search = '' } = req.query;
    const participants = await clientService.getClientParticipants(req.user, projectId, subProjectId, search);
    res.json(participants);
  } catch (error) {
    console.error('GET /api/client/participants error:', error);
    const status = error.status || (error.message.includes('Forbidden') ? 403 : 500);
    res.status(status).json({ error: error.message || 'Failed to fetch participants' });
  }
});

module.exports = router;
