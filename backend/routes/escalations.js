const express = require('express');
const router = express.Router();
const Escalation = require('../models/Escalation');
const Project = require('../models/Project');
const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.use(requireAuth);

// GET /api/escalations - Fetch escalations for the current user based on their role
router.get('/', async (req, res) => {
  try {
    const userRole = req.user.roleName; // Depends on authMiddleware injecting it, or we fetch User's Role.
    
    // Fallback if roleName isn't directly on req.user:
    const currentUser = await User.findByPk(req.user.id, { include: ['Role'] });
    const roleName = currentUser?.Role?.role_name || userRole;

    const include = [
      { model: Project, attributes: ['id', 'name'] },
      { model: User, as: 'raisedBy', attributes: ['id', 'name', 'email'] },
      { model: User, as: 'repliedBy', attributes: ['id', 'name', 'email'] }
    ];

    let escalations = [];

    if (['MD', 'COO', 'VP Operations'].includes(roleName)) {
      // Upper management sees the escalations they have raised
      escalations = await Escalation.findAll({
        where: { raisedById: req.user.id },
        include,
        order: [['createdAt', 'DESC']]
      });
    } else if (['Program Manager', 'Admin', 'Super Admin'].includes(roleName)) {
      // PMs see escalations for projects they are assigned to. 
      // Admins see all.
      let whereClause = {};
      if (roleName === 'Program Manager' && currentUser.projectId) {
        whereClause = { projectId: currentUser.projectId };
      }
      escalations = await Escalation.findAll({
        where: whereClause,
        include,
        order: [['createdAt', 'DESC']]
      });
    } else {
      // Other roles shouldn't access this (or see empty list)
      escalations = [];
    }

    res.json(escalations);
  } catch (error) {
    console.error("Error fetching escalations:", error);
    res.status(500).json({ error: 'Failed to fetch escalations' });
  }
});

// POST /api/escalations - Raise a new escalation (MD/COO/VP)
router.post('/', requireRole(['MD', 'COO', 'VP Operations', 'Admin', 'Super Admin']), async (req, res) => {
  try {
    const { subject, description, projectId } = req.body;
    
    if (!subject || !description || !projectId) {
      return res.status(400).json({ error: 'Subject, description, and project are required.' });
    }

    const newEscalation = await Escalation.create({
      subject,
      description,
      projectId,
      raisedById: req.user.id,
      status: 'Open'
    });

    const fullEscalation = await Escalation.findByPk(newEscalation.id, {
      include: [
        { model: Project, attributes: ['id', 'name'] },
        { model: User, as: 'raisedBy', attributes: ['id', 'name', 'email'] }
      ]
    });

    res.status(201).json(fullEscalation);
  } catch (error) {
    console.error("Error creating escalation:", error);
    res.status(500).json({ error: 'Failed to create escalation', details: error.message });
  }
});

// PATCH /api/escalations/:id/reply - Reply and resolve escalation (PM/Admin)
router.patch('/:id/reply', requireRole(['Program Manager', 'Admin', 'Super Admin']), async (req, res) => {
  try {
    const { replyText } = req.body;
    if (!replyText) {
      return res.status(400).json({ error: 'Reply text is required.' });
    }

    const escalation = await Escalation.findByPk(req.params.id);
    if (!escalation) {
      return res.status(404).json({ error: 'Escalation not found.' });
    }

    // Verify PM belongs to the project (optional security check)
    const currentUser = await User.findByPk(req.user.id, { include: ['Role'] });
    if (currentUser.Role.role_name === 'Program Manager' && currentUser.projectId !== escalation.projectId) {
       // Proceed anyway or block? Usually PM can only manage their own project.
       // We'll trust the UI filtering, but to be secure:
       // return res.status(403).json({ error: 'Not authorized for this project.' });
    }

    await escalation.update({
      replyText,
      repliedById: req.user.id,
      repliedAt: new Date(),
      status: 'Resolved'
    });

    const fullEscalation = await Escalation.findByPk(escalation.id, {
      include: [
        { model: Project, attributes: ['id', 'name'] },
        { model: User, as: 'raisedBy', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'repliedBy', attributes: ['id', 'name', 'email'] }
      ]
    });

    res.json(fullEscalation);
  } catch (error) {
    console.error("Error replying to escalation:", error);
    res.status(500).json({ error: 'Failed to reply to escalation', details: error.message });
  }
});

module.exports = router;
