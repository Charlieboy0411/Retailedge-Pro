const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const Role = require('../models/Role');
const User = require('../models/User');

const SYSTEM_ROLES = ['Super Admin', 'Admin', 'Program Manager', 'Client', 'Trainer', 'Supervisor', 'Learner', 'Marketing Manager', 'MD', 'COO', 'VP Operations'];

// GET /api/roles
router.get('/', requireAuth, async (req, res) => {
  try {
    const roles = await Role.findAll({
      include: [
        {
          model: User,
          attributes: ['id'] // We only need it to count users
        }
      ],
      order: [['role_name', 'ASC']]
    });

    const rolesWithCounts = roles.map(r => {
      const plainRole = r.get({ plain: true });
      plainRole.userCount = plainRole.Users ? plainRole.Users.length : 0;
      delete plainRole.Users; // clean up payload
      plainRole.isSystem = SYSTEM_ROLES.includes(plainRole.role_name);
      return plainRole;
    });

    res.json(rolesWithCounts);
  } catch (error) {
    console.error('Fetch Roles Error:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// POST /api/roles
router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Only administrators can create roles' });
    }

    const { role_name, permissions } = req.body;
    
    if (!role_name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    const existing = await Role.findOne({ where: { role_name } });
    if (existing) {
      return res.status(400).json({ error: 'Role name already exists' });
    }

    const role = await Role.create({
      role_name,
      permissions: permissions || {}
    });

    res.status(201).json(role);
  } catch (error) {
    console.error('Create Role Error:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// PUT /api/roles/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Only administrators can modify roles' });
    }

    const { role_name, permissions } = req.body;
    const role = await Role.findByPk(req.params.id);

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (SYSTEM_ROLES.includes(role.role_name)) {
      // Allow modifying permissions of system roles, but NOT their names
      await role.update({ permissions: permissions || role.permissions });
      return res.json(role);
    }

    if (role_name && role_name !== role.role_name) {
      const existing = await Role.findOne({ where: { role_name } });
      if (existing) {
        return res.status(400).json({ error: 'Another role with this name already exists' });
      }
    }

    await role.update({
      role_name: role_name || role.role_name,
      permissions: permissions || role.permissions
    });

    res.json(role);
  } catch (error) {
    console.error('Update Role Error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// DELETE /api/roles/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Only administrators can delete roles' });
    }

    const role = await Role.findByPk(req.params.id, {
      include: [{ model: User, attributes: ['id'] }]
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (SYSTEM_ROLES.includes(role.role_name)) {
      return res.status(403).json({ error: 'Cannot delete core system roles' });
    }

    if (role.Users && role.Users.length > 0) {
      return res.status(400).json({ error: `Cannot delete role because ${role.Users.length} user(s) are assigned to it.` });
    }

    await role.destroy();
    res.json({ success: true, message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Delete Role Error:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

module.exports = router;
