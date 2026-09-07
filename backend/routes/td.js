const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const tdService = require('../utils/tdService');
const Project = require('../models/Project');
const { Op } = require('sequelize');

/**
 * All T&D endpoints require authentication and 'T&D Manager' role
 * (Super Admin & Admin can also access for platform oversight)
 */
const TD_ROLES = ['T&D Manager', 'Admin', 'Super Admin'];

// GET /api/td/projects - List authorized projects & subprojects for T&D Manager
router.get('/projects', requireAuth, requireRole(TD_ROLES), async (req, res) => {
  try {
    const accessibleIds = await tdService.getAccessibleTDProjectIds(req.user, 'all', 'all');
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
    console.error('GET /api/td/projects error:', error);
    res.status(500).json({ error: 'Failed to fetch T&D projects', details: error.message });
  }
});

// GET /api/td/cockpit - Real database KPIs and capability intelligence
router.get('/cockpit', requireAuth, requireRole(TD_ROLES), async (req, res) => {
  try {
    const { projectId = 'all', subProjectId = 'all', period = 'current_month', startDate, endDate } = req.query;
    const metrics = await tdService.getTDCapabilityCockpitMetrics(req.user, projectId, subProjectId, period, startDate, endDate);
    res.json(metrics);
  } catch (error) {
    console.error('GET /api/td/cockpit error:', error);
    const status = error.status || (error.message.includes('Forbidden') ? 403 : 500);
    res.status(status).json({ error: error.message || 'Failed to fetch cockpit metrics' });
  }
});

// GET /api/td/participants - Scoped participant capability roster
router.get('/participants', requireAuth, requireRole(TD_ROLES), async (req, res) => {
  try {
    const { projectId = 'all', subProjectId = 'all', search = '', period = 'current_month', startDate, endDate } = req.query;
    const participants = await tdService.getTDParticipants(req.user, projectId, subProjectId, search, period, startDate, endDate);
    res.json(participants);
  } catch (error) {
    console.error('GET /api/td/participants error:', error);
    const status = error.status || (error.message.includes('Forbidden') ? 403 : 500);
    res.status(status).json({ error: error.message || 'Failed to fetch participants' });
  }
});

// GET /api/td/reports - Scoped training capability reports
router.get('/reports', requireAuth, requireRole(TD_ROLES), async (req, res) => {
  try {
    const reports = tdService.getTDAvailableReports(req.user);
    res.json(reports);
  } catch (error) {
    console.error('GET /api/td/reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports catalog' });
  }
});

module.exports = router;
