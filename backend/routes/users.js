const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Project = require('../models/Project');
const Role = require('../models/Role');
const ProjectAssignment = require('../models/ProjectAssignment');
const UserQuery = require('../models/UserQuery');
const sequelize = require('../config/database');
const { Op } = require('sequelize');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.use(requireAuth);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatUserResponse(u) {
  if (!u) return u;
  const uJson = typeof u.toJSON === 'function' ? u.toJSON() : { ...u };
  const assignmentProjectIds = (uJson.ProjectAssignments || [])
    .map(a => a.projectId)
    .filter(Boolean);
  const allProjectIds = Array.from(new Set([uJson.projectId, ...assignmentProjectIds].filter(Boolean)));
  uJson.projectIds = allProjectIds;
  uJson.projectId = allProjectIds.length > 0 ? allProjectIds.join(',') : null;
  return uJson;
}

async function validateAndExtractProjectIds(input) {
  if (input === undefined) return null; // not specified in request
  let ids = [];
  if (Array.isArray(input)) {
    ids = input.map(id => String(id).trim()).filter(Boolean);
  } else if (typeof input === 'string') {
    ids = input.split(',').map(id => id.trim()).filter(Boolean);
  }
  ids = Array.from(new Set(ids));

  for (const id of ids) {
    if (!UUID_REGEX.test(id)) {
      const err = new Error(`Invalid project ID format: "${id}"`);
      err.status = 400;
      throw err;
    }
  }

  if (ids.length > 0) {
    const existing = await Project.findAll({
      where: { id: { [Op.in]: ids } },
      attributes: ['id', 'name']
    });
    if (existing.length !== ids.length) {
      const existingIds = new Set(existing.map(p => p.id));
      const missing = ids.filter(id => !existingIds.has(id));
      const err = new Error(`Selected project does not exist: ${missing.join(', ')}`);
      err.status = 400;
      throw err;
    }
  }

  return ids;
}

// GET /api/users/my-team - List direct reports for the requesting Supervisor / Manager
router.get('/my-team', async (req, res) => {
  try {
    const subordinates = await User.findAll({
      where: { managerId: req.user.id },
      include: [
        { model: Role, attributes: ['id', 'role_name'] },
        { model: Project, attributes: ['id', 'name'] },
        { model: ProjectAssignment, where: { status: 'Active' }, required: false, attributes: ['id', 'projectId', 'role', 'zone', 'status'] }
      ],
      attributes: ['id', 'name', 'email', 'employee_id', 'designation', 'location', 'status', 'createdAt'],
      order: [['name', 'ASC']]
    });
    res.json(subordinates.map(formatUserResponse));
  } catch (error) {
    console.error('GET /api/users/my-team error:', error);
    res.status(500).json({ error: 'Failed to fetch team members', details: error.message });
  }
});

// GET /api/users - List users (Strictly project-scoped for Program Manager and Operation Manager)
router.get('/', requireRole(['Admin', 'Super Admin', 'Program Manager', 'Operation Manager', 'MD', 'COO', 'VP Operations', 'Marketing Manager']), async (req, res) => {
  try {
    const { search, role, project, projectId, status, designation, location, skills } = req.query;
    const userRole = req.user.role || (req.user.Role ? req.user.Role.role_name : '');
    
    const where = {};
    const andConditions = [];

    // Server-side project scoping for Program Manager and Operation Manager
    if (userRole === 'Program Manager' || userRole === 'Operation Manager') {
      const intelligenceService = require('../utils/projectIntelligenceService');
      const targetProj = projectId || project || 'all';

      // If targetProj is a project name rather than UUID, resolve ID
      let resolvedTarget = targetProj;
      if (targetProj !== 'all' && !UUID_REGEX.test(targetProj)) {
        const pMatch = await Project.findOne({ where: { name: targetProj }, attributes: ['id'] });
        if (pMatch) resolvedTarget = pMatch.id;
      }

      const accessibleProjectIds = await intelligenceService.getAccessibleProjectIds(req.user, resolvedTarget, 'all');
      if (accessibleProjectIds.length === 0) {
        return res.json([]);
      }

      const assignedUserRows = await ProjectAssignment.findAll({
        where: { projectId: { [Op.in]: accessibleProjectIds }, status: 'Active' },
        attributes: ['userId']
      });
      const assignedUserIds = assignedUserRows.map(a => a.userId);

      andConditions.push({
        [Op.or]: [
          { projectId: { [Op.in]: accessibleProjectIds } },
          ...(assignedUserIds.length > 0 ? [{ id: { [Op.in]: assignedUserIds } }] : [])
        ]
      });
    } else {
      if (projectId) {
        const assignedUserRows = await ProjectAssignment.findAll({
          where: { projectId, status: 'Active' },
          attributes: ['userId']
        });
        const assignedUserIds = assignedUserRows.map(a => a.userId);
        andConditions.push({
          [Op.or]: [
            { projectId },
            ...(assignedUserIds.length > 0 ? [{ id: { [Op.in]: assignedUserIds } }] : [])
          ]
        });
      }
    }

    if (search) {
      andConditions.push({
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { employee_id: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ]
      });
    }

    if (andConditions.length > 0) {
      where[Op.and] = andConditions;
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
    
    if (project && userRole !== 'Program Manager') include.push({ model: Project, where: { name: project } });
    else include.push({ model: Project });
    
    include.push({ model: User, as: 'manager', attributes: ['id', 'name'] });
    include.push({
      model: ProjectAssignment,
      where: { status: 'Active' },
      required: false,
      attributes: ['id', 'projectId', 'role', 'zone', 'status']
    });

    const users = await User.findAll({
      where,
      include,
      order: [['name', 'ASC']]
    });

    res.json(users.map(formatUserResponse));
  } catch (error) {
    console.error('GET /api/users error:', error);
    const statusCode = error.status || (error.message.includes('Forbidden') || error.message.includes('Unauthorized') ? 403 : 500);
    res.status(statusCode).json({ error: error.message || 'Server error', details: error.message });
  }
});

// GET /api/users/profile - Fetch current user profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [
        Role,
        Project,
        { model: User, as: 'manager', attributes: ['id', 'name'] },
        { model: ProjectAssignment, where: { status: 'Active' }, required: false }
      ]
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(formatUserResponse(user));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users/queries - Submit a user query / helpdesk ticket
router.post('/queries', async (req, res) => {
  try {
    const { subject, description, priority, category, targetDashboard } = req.body;
    if (!subject || !description) {
      return res.status(400).json({ error: 'Subject and description are required' });
    }
    const query = await UserQuery.create({
      userId: req.user.id,
      subject,
      description,
      priority: priority || 'Medium',
      category: category || 'General',
      targetDashboard: targetDashboard || 'General'
    });
    
    const queryWithUser = await UserQuery.findByPk(query.id, {
      include: [{ model: User, attributes: ['id', 'name', 'email', 'employee_id'] }]
    });

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
router.get('/:id', requireRole(['Admin', 'Super Admin', 'Program Manager', 'Operation Manager', 'Trainer', 'MD', 'COO', 'VP Operations', 'Marketing Manager']), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [
        Role,
        Project,
        { model: User, as: 'manager' },
        { model: ProjectAssignment, where: { status: 'Active' }, required: false }
      ]
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (['Program Manager', 'Operation Manager'].includes(req.user.role)) {
      const intelligenceService = require('../utils/projectIntelligenceService');
      const accessibleProjectIds = await intelligenceService.getAccessibleProjectIds(req.user, 'all', 'all');
      const targetAssignments = await ProjectAssignment.findAll({
        where: { userId: user.id, status: 'Active' },
        attributes: ['projectId']
      });
      const targetExistingProjects = Array.from(new Set([user.projectId, ...targetAssignments.map(a => a.projectId)].filter(Boolean)));
      const hasAccess = targetExistingProjects.some(pid => accessibleProjectIds.includes(pid));
      if (!hasAccess && req.user.id !== user.id) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission to view users outside your assigned projects.' });
      }
    }

    res.json(formatUserResponse(user));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users - Create new user (Admin only)
router.post('/', requireRole(['Admin', 'Super Admin']), async (req, res) => {
  try {
    let { 
      name, email, password, employee_id, roleName, projectId, projectIds,
      managerId, designation, location, doj, employment_type, skills 
    } = req.body;

    if (!employee_id || employee_id.trim() === '') {
      employee_id = null;
    }

    const rawProjectInput = projectIds !== undefined ? projectIds : projectId;
    const selectedProjectIds = (await validateAndExtractProjectIds(rawProjectInput)) || [];

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

    const t = await sequelize.transaction();
    let newUser;
    try {
      newUser = await User.create({
        name,
        email,
        password: hashedPassword,
        employee_id,
        roleId: role.id,
        projectId: selectedProjectIds.length > 0 ? selectedProjectIds[0] : null,
        managerId: managerId || null,
        designation,
        location,
        doj,
        employment_type: employment_type || 'Full-time',
        skills: skills || [],
        status: 'Active'
      }, { transaction: t });

      for (const pid of selectedProjectIds) {
        await ProjectAssignment.create({
          userId: newUser.id,
          projectId: pid,
          role: role.role_name,
          status: 'Active'
        }, { transaction: t });
      }

      await t.commit();
    } catch (txError) {
      await t.rollback();
      throw txError;
    }

    const createdUser = await User.findByPk(newUser.id, {
      include: [
        Role,
        Project,
        { model: User, as: 'manager' },
        { model: ProjectAssignment, where: { status: 'Active' }, required: false }
      ]
    });
    
    res.status(201).json(formatUserResponse(createdUser));
  } catch (error) {
    console.error("User creation error:", error.message);
    const statusCode = error.status || 400;
    res.status(statusCode).json({ error: error.message || 'Failed to create user', details: error.message });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', requireRole(['Admin', 'Super Admin', 'Program Manager', 'Operation Manager']), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Extract & validate project IDs if provided in request
    const rawProjectInput = req.body.projectIds !== undefined ? req.body.projectIds : req.body.projectId;
    const selectedProjectIds = await validateAndExtractProjectIds(rawProjectInput);

    // Enforce project authorization for Program Manager and Operation Manager
    if (req.user.role === 'Program Manager' || req.user.role === 'Operation Manager') {
      const intelligenceService = require('../utils/projectIntelligenceService');
      const accessibleProjectIds = await intelligenceService.getAccessibleProjectIds(req.user, 'all', 'all');

      // 1. Check if PM/OM has permission to modify this user
      const targetAssignments = await ProjectAssignment.findAll({
        where: { userId: user.id, status: 'Active' },
        attributes: ['projectId']
      });
      const targetExistingProjects = Array.from(new Set([user.projectId, ...targetAssignments.map(a => a.projectId)].filter(Boolean)));
      
      // Finding 2 fix: target must overlap with accessible projects (or be legitimate self-access)
      const hasAccessToTarget = (user.id === req.user.id) || targetExistingProjects.some(pid => accessibleProjectIds.includes(pid));
      if (!hasAccessToTarget) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission to modify users outside your assigned project.' });
      }

      // Finding 1 fix: Reject role/status/password/credentials tampering for non-admin roles
      const forbiddenFields = ['roleName', 'role', 'roleId', 'status', 'password', 'permissions', 'is_active', 'isActive'];
      const attemptedForbidden = forbiddenFields.filter(f => req.body[f] !== undefined);
      if (attemptedForbidden.length > 0) {
        return res.status(403).json({
          error: `Forbidden: You do not have permission to modify restricted fields (${attemptedForbidden.join(', ')}).`
        });
      }

      // 2. If assigning projects, verify PM cannot assign projects outside their authorized scope
      if (selectedProjectIds !== null) {
        const unauthorizedAssignments = selectedProjectIds.filter(pid => !accessibleProjectIds.includes(pid));
        if (unauthorizedAssignments.length > 0) {
          return res.status(403).json({ error: 'Forbidden: You cannot assign projects outside your authorized scope.' });
        }
      }
    }

    // For non-admin roles: use explicit writable allowlist
    let updateData;
    if (['Program Manager', 'Operation Manager'].includes(req.user.role)) {
      const ALLOWED_WRITABLE_FIELDS = [
        'name',
        'email',
        'phone',
        'designation',
        'location',
        'employee_id',
        'skills',
        'managerId',
        'profile_photo',
        'department',
        'zone'
      ];
      updateData = {};
      for (const field of ALLOWED_WRITABLE_FIELDS) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }
    } else {
      updateData = { ...req.body };
      delete updateData.projectIds;
      delete updateData.ProjectAssignments;
      delete updateData.Role;
      delete updateData.Project;
      delete updateData.manager;
    }

    // Determine target role name
    let targetRoleName;
    if (['Admin', 'Super Admin'].includes(req.user.role)) {
      targetRoleName = updateData.roleName;
      if (updateData.roleName) {
        let role = await Role.findOne({ where: { role_name: updateData.roleName } });
        if (!role) {
          role = await Role.create({
            role_name: updateData.roleName,
            permissions: { can_create_projects: false, can_manage_users: false, can_create_quizzes: false }
          });
        }
        updateData.roleId = role.id;
        delete updateData.roleName;
      } else {
        const currentRole = await Role.findByPk(user.roleId);
        targetRoleName = currentRole ? currentRole.role_name : 'Employee';
      }

      // Password handling for Admin / Super Admin
      if (updateData.password && updateData.password.trim() !== '') {
        const bcrypt = require('bcrypt');
        updateData.password = await bcrypt.hash(updateData.password, 10);
      } else {
        delete updateData.password;
      }
    } else {
      // Non-admin roles cannot change roles or passwords
      const currentRole = await Role.findByPk(user.roleId);
      targetRoleName = currentRole ? currentRole.role_name : 'Employee';
      delete updateData.roleId;
      delete updateData.roleName;
      delete updateData.password;
      delete updateData.status;
    }

    if (typeof updateData.skills === 'string') {
      updateData.skills = updateData.skills.split(',').map(s => s.trim()).filter(Boolean);
    }

    if (updateData.managerId === '') updateData.managerId = null;

    // Database transaction for coordinated User and ProjectAssignment updates
    const t = await sequelize.transaction();
    try {
      if (selectedProjectIds !== null) {
        // In Users table: projectId is a single UUID foreign key.
        // Set to first project in selectedProjectIds, or null if none.
        updateData.projectId = selectedProjectIds.length > 0 ? selectedProjectIds[0] : null;

        await user.update(updateData, { transaction: t });

        // Synchronize ProjectAssignment records
        const existingAssignments = await ProjectAssignment.findAll({
          where: { userId: user.id },
          transaction: t
        });

        // 1. Remove deselected assignments for THIS user only
        const toRemoveIds = existingAssignments
          .filter(a => !selectedProjectIds.includes(a.projectId))
          .map(a => a.id);
        if (toRemoveIds.length > 0) {
          await ProjectAssignment.destroy({
            where: { id: { [Op.in]: toRemoveIds } },
            transaction: t
          });
        }

        // 2. Add or reactivate selected assignments
        for (const pid of selectedProjectIds) {
          const existing = existingAssignments.find(a => a.projectId === pid);
          if (existing) {
            if (existing.status !== 'Active' || existing.role !== targetRoleName) {
              await existing.update({
                status: 'Active',
                role: targetRoleName
              }, { transaction: t });
            }
          } else {
            await ProjectAssignment.create({
              userId: user.id,
              projectId: pid,
              role: targetRoleName,
              status: 'Active'
            }, { transaction: t });
          }
        }
      } else {
        // Project selections unchanged
        delete updateData.projectId;
        await user.update(updateData, { transaction: t });

        // If role was updated, keep role synced on existing active assignments
        if (targetRoleName) {
          await ProjectAssignment.update(
            { role: targetRoleName },
            { where: { userId: user.id, status: 'Active' }, transaction: t }
          );
        }
      }

      await t.commit();
    } catch (txError) {
      await t.rollback();
      throw txError;
    }

    const updatedUser = await User.findByPk(user.id, {
      include: [
        Role,
        Project,
        { model: User, as: 'manager' },
        { model: ProjectAssignment, where: { status: 'Active' }, required: false }
      ]
    });

    res.json(formatUserResponse(updatedUser));
  } catch (error) {
    console.error('PUT /api/users/:id error:', error.message);
    const statusCode = error.status || 400;
    res.status(statusCode).json({ error: error.message || 'Failed to update user', details: error.message });
  }
});

// DELETE /api/users/:id - Delete user (Admin only)
router.delete('/:id', requireRole(['Admin', 'Super Admin']), async (req, res) => {
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
router.get('/hierarchy/:id', requireRole(['Admin', 'Super Admin', 'Program Manager', 'Operation Manager', 'T&D Manager']), async (req, res) => {
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

    if (['Program Manager', 'Operation Manager'].includes(req.user.role)) {
      const intelligenceService = require('../utils/projectIntelligenceService');
      const accessibleProjectIds = await intelligenceService.getAccessibleProjectIds(req.user, 'all', 'all');
      const targetAssignments = await ProjectAssignment.findAll({
        where: { userId: rootUser.id, status: 'Active' },
        attributes: ['projectId']
      });
      const targetExistingProjects = Array.from(new Set([rootUser.projectId, ...targetAssignments.map(a => a.projectId)].filter(Boolean)));
      const hasAccess = targetExistingProjects.some(pid => accessibleProjectIds.includes(pid));
      if (!hasAccess && req.user.id !== rootUser.id) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission to view hierarchy outside your assigned projects.' });
      }
    }

    res.json(rootUser);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching hierarchy', details: error.message });
  }
});

// POST /api/users/bulk-upload - Parse and import CSV rows (Admin only)
router.post('/bulk-upload', requireRole(['Admin', 'Super Admin']), async (req, res) => {
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
