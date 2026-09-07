const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const supervisorService = require('../utils/supervisorService');

// In-memory or database-backed coaching logs storage
// Keyed by employeeId with manager validation
const coachingFollowUps = [];

router.use(requireAuth);
router.use(requireRole(['Supervisor', 'Admin', 'Super Admin']));

/**
 * GET /api/supervisor/metrics
 * Returns 8 Authoritative Team Operational KPIs
 */
router.get('/metrics', async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const metrics = await supervisorService.getTeamMetrics(supervisorId);
    res.json(metrics);
  } catch (error) {
    console.error('GET /api/supervisor/metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch team metrics', details: error.message });
  }
});

/**
 * GET /api/supervisor/team
 * Returns Detailed Team Performance & Coaching Roster
 */
router.get('/team', async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const roster = await supervisorService.getTeamPerformanceRoster(supervisorId);
    res.json(roster);
  } catch (error) {
    console.error('GET /api/supervisor/team error:', error);
    res.status(500).json({ error: 'Failed to fetch team roster', details: error.message });
  }
});

/**
 * GET /api/supervisor/coaching-logs
 * Returns Coaching follow-up notes for the supervisor's team
 */
router.get('/coaching-logs', async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const subordinateIds = await supervisorService.getTeamSubordinateIds(supervisorId);
    const logs = coachingFollowUps.filter(log => subordinateIds.includes(log.employeeId));
    res.json(logs);
  } catch (error) {
    console.error('GET /api/supervisor/coaching-logs error:', error);
    res.status(500).json({ error: 'Failed to fetch coaching logs' });
  }
});

/**
 * POST /api/supervisor/coaching-log
 * Record a coaching / follow-up note for a subordinate
 */
router.post('/coaching-log', async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const { employeeId, issue, reason, recommendedAction, followUpStatus, nextActionDate } = req.body;

    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID is required.' });
    }

    // Verify employee is a direct subordinate
    const isSubordinate = await supervisorService.isSubordinate(supervisorId, employeeId);
    if (!isSubordinate && !['Admin', 'Super Admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: You can only record coaching notes for direct team members.' });
    }

    const logEntry = {
      id: `coach-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      supervisorId,
      employeeId,
      issue: issue || 'Performance Follow-up',
      reason: reason || 'Remediation review',
      recommendedAction: recommendedAction || 'Refresher training scheduled',
      followUpStatus: followUpStatus || 'Pending',
      nextActionDate: nextActionDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      createdAt: new Date()
    };

    coachingFollowUps.push(logEntry);
    res.status(201).json({ message: 'Coaching follow-up recorded successfully.', log: logEntry });
  } catch (error) {
    console.error('POST /api/supervisor/coaching-log error:', error);
    res.status(500).json({ error: 'Failed to record coaching note', details: error.message });
  }
});

module.exports = router;
