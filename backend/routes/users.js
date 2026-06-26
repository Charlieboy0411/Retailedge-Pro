const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Project = require('../models/Project');
const Role = require('../models/Role');
const UserQuery = require('../models/UserQuery');
const { Op } = require('sequelize');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.use(requireAuth);

// GET /api/users - List all users
router.get('/', requireRole(['Admin', 'Super Admin', 'Program Manager', 'Trainer', 'Client', 'MD', 'COO', 'VP Operations', 'T&D Manager', 'Marketing Manager']), async (req, res) => {
  try {
    const { search, role, project, status, designation, location, skills } = req.query;
    
    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { employee_id: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) where.status = status;
    if (designation) where.designation = { [Op.like]: `%${designation}%` };
    if (location) where.location = { [Op.like]: `%${location}%` };
    
    // Skills filtering (PostgreSQL native JSON containment)
    if (skills) {
      where.skills = { [Op.contains]: [skills] };
    }

    const include = [];
    if (role) include.push({ model: Role, where: { role_name: role } });
    else include.push({ model: Role });
    
    if (project) include.push({ model: Project, where: { name: project } });
    else include.push({ model: Project });
    
    include.push({ model: User, as: 'manager', attributes: ['id', 'name'] });

    const users = await User.findAll({ where, include });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching users' });
  }
});

// POST /api/users/queries - Create a support query or report a bug
router.post('/queries', async (req, res) => {
  try {
    const { subject, description, dashboard } = req.body;
    if (!subject || !description || !dashboard) {
      return res.status(400).json({ error: 'Subject, description, and dashboard are required.' });
    }
    const newQuery = await UserQuery.create({
      userId: req.user.id,
      subject,
      description,
      dashboard,
      status: 'Open'
    });
    
    // Fetch user details for client notifications
    const queryWithUser = await UserQuery.findByPk(newQuery.id, {
      include: [{ model: User, attributes: ['id', 'name', 'email', 'employee_id'] }]
    });

    // Notify admins via socket
    const io = req.app.get('io');
    if (io) {
      io.emit('new_query_submitted', queryWithUser);
    }
    res.status(201).json(queryWithUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit query', details: error.message });
  }
});

// GET /api/users/queries - Fetch all user queries (Admin only)
router.get('/queries', requireRole(['Admin', 'Super Admin']), async (req, res) => {
  try {
    const queries = await UserQuery.findAll({
      include: [{ model: User, attributes: ['id', 'name', 'email', 'employee_id'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(queries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch queries', details: error.message });
  }
});

// PATCH /api/users/queries/:id/resolve - Mark query as resolved (Admin only)
router.patch('/queries/:id/resolve', requireRole(['Admin', 'Super Admin']), async (req, res) => {
  try {
    const query = await UserQuery.findByPk(req.params.id);
    if (!query) return res.status(404).json({ error: 'Query not found' });
    await query.update({ status: 'Resolved' });
    
    const queryWithUser = await UserQuery.findByPk(query.id, {
      include: [{ model: User, attributes: ['id', 'name', 'email', 'employee_id'] }]
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('query_status_updated', queryWithUser);
    }
    res.json(queryWithUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve query', details: error.message });
  }
});

// GET /api/users/:id - Get specific user
router.get('/:id', requireRole(['Admin', 'Super Admin', 'Program Manager', 'Trainer', 'Client', 'MD', 'COO', 'VP Operations', 'T&D Manager', 'Marketing Manager']), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [Role, Project, { model: User, as: 'manager' }]
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users - Create new user
router.post('/', requireRole(['Admin', 'Super Admin', 'Program Manager']), async (req, res) => {
  try {
    let { 
      name, email, password, employee_id, roleName, projectId, 
      managerId, designation, location, doj, employment_type, skills 
    } = req.body;

    if (!employee_id || employee_id.trim() === '') {
      employee_id = null;
    }
    
    // Find role or create it
    let role = await Role.findOne({ where: { role_name: roleName } });
    if (!role) {
      role = await Role.create({
        role_name: roleName,
        permissions: { can_create_projects: false, can_manage_users: false, can_create_quizzes: false }
      });
    }

    // Hash password
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password || 'password123', 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      employee_id,
      roleId: role.id,
      projectId: projectId || null,
      managerId: managerId || null,
      designation,
      location,
      doj,
      employment_type: employment_type || 'Full-time',
      skills: skills || [],
      status: 'Active'
    });
    
    res.status(201).json(newUser);
  } catch (error) {
    console.error("User creation error:", error);
    res.status(400).json({ error: 'Failed to create user', details: error.message });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', requireRole(['Admin', 'Super Admin', 'Program Manager']), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const updateData = { ...req.body };
    
    if (updateData.roleName) {
      let role = await Role.findOne({ where: { role_name: updateData.roleName } });
      if (!role) {
        role = await Role.create({
          role_name: updateData.roleName,
          permissions: { can_create_projects: false, can_manage_users: false, can_create_quizzes: false }
        });
      }
      updateData.roleId = role.id;
    }
    
    if (updateData.password) {
      const bcrypt = require('bcrypt');
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }
    
    if (typeof updateData.skills === 'string') {
      updateData.skills = updateData.skills.split(',').map(s => s.trim()).filter(s => s);
    }

    if (updateData.projectId === '') updateData.projectId = null;
    if (updateData.managerId === '') updateData.managerId = null;
    
    await user.update(updateData);
    
    const updatedUser = await User.findByPk(user.id, {
      include: [Role, Project, { model: User, as: 'manager' }]
    });
    
    res.json(updatedUser);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update user', details: error.message });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', requireRole(['Admin', 'Super Admin', 'Program Manager']), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    await user.destroy();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});

// GET /api/users/hierarchy/:id - Fetch organizational hierarchy for a user
router.get('/hierarchy/:id', requireRole(['Admin', 'Super Admin', 'Program Manager', 'Trainer', 'T&D Manager']), async (req, res) => {
  try {
    const rootUser = await User.findByPk(req.params.id, {
      attributes: ['id', 'name', 'profile_photo'],
      include: [
        Role,
        {
          model: User,
          as: 'subordinates',
          attributes: ['id', 'name', 'profile_photo'],
          include: [
            Role,
            {
              model: User,
              as: 'subordinates',
              attributes: ['id', 'name', 'profile_photo'],
              include: [Role]
            }
          ]
        }
      ]
    });
    
    if (!rootUser) return res.status(404).json({ error: 'User not found' });
    res.json(rootUser);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching hierarchy', details: error.message });
  }
});

// POST /api/users/bulk-upload - Parse and import CSV rows
router.post('/bulk-upload', requireRole(['Admin', 'Super Admin', 'Program Manager']), async (req, res) => {
  try {
    const { users } = req.body; 
    if (!Array.isArray(users)) return res.status(400).json({ error: 'Invalid data format. Expected array of users.' });
    
    // Hash default passwords for bulk uploaded users
    const bcrypt = require('bcrypt');
    const defaultPassword = await bcrypt.hash('password123', 10);
    
    // Fetch default Role if not specified
    const defaultRole = await Role.findOne({ where: { role_name: 'Employee' } });

    const usersToCreate = users.map(u => ({
      name: u.name,
      email: u.email,
      employee_id: u.employee_id || `EMP${Math.floor(Math.random()*10000)}`,
      password: defaultPassword,
      roleId: defaultRole ? defaultRole.id : null,
      designation: u.designation || 'Employee',
      status: 'Active'
    }));

    const createdUsers = await User.bulkCreate(usersToCreate, { ignoreDuplicates: true });
    res.status(201).json({ message: 'Bulk upload successful', count: createdUsers.length });
  } catch (error) {
    res.status(400).json({ error: 'Bulk upload failed', details: error.message });
  }
});

module.exports = router;
