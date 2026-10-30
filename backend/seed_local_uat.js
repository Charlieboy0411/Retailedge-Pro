const sequelize = require('./config/database');
const bcrypt = require('bcrypt');
const Role = require('./models/Role');
const User = require('./models/User');
const Project = require('./models/Project');
const ProjectAssignment = require('./models/ProjectAssignment');

/**
 * Idempotent seeder for local UAT test environments.
 * Uses findOrCreate to guarantee zero duplicates on re-runs.
 */
async function seedLocalUAT({ force = false } = {}) {
  await sequelize.authenticate();

  const passwordHash = await bcrypt.hash('password123', 10);

  const roles = [
    { role_name: 'Super Admin', permissions: { all: true } },
    { role_name: 'Admin', permissions: { all: true } },
    { role_name: 'HR Admin', permissions: {} },
    { role_name: 'Manager', permissions: {} },
    { role_name: 'Program Manager', permissions: { can_create_quizzes: true } },
    { role_name: 'Trainer', permissions: { can_create_quizzes: true } },
    { role_name: 'Employee', permissions: {} },
    { role_name: 'Client', permissions: { read_only: true } },
    { role_name: 'MD', permissions: { all: true } },
    { role_name: 'COO', permissions: { all: true } },
    { role_name: 'VP Operations', permissions: { all: true } },
    { role_name: 'Operation Manager', permissions: { can_create_quizzes: true } },
    { role_name: 'Supervisor', permissions: {} },
    { role_name: 'T&D Manager', permissions: {} }
  ];

  const roleMap = {};
  for (const r of roles) {
    const [createdRole] = await Role.findOrCreate({
      where: { role_name: r.role_name },
      defaults: r
    });
    roleMap[r.role_name] = createdRole.id;
  }

  // Canonical Projects
  const [sseil] = await Project.findOrCreate({
    where: { id: '3190afd0-2ccb-4c07-822d-5af651bbca9e' },
    defaults: {
      id: '3190afd0-2ccb-4c07-822d-5af651bbca9e',
      name: 'SSEIL',
      project_code: 'SSL',
      status: 'Active',
      zone: 'North',
      region: 'North Hub',
      territory: 'SSEIL Metro Territory',
      participants_planned: 21
    }
  });

  const [galderma] = await Project.findOrCreate({
    where: { id: '71350b15-bbcf-4751-8960-821ece052612' },
    defaults: {
      id: '71350b15-bbcf-4751-8960-821ece052612',
      name: 'Galderma',
      project_code: 'GLD',
      status: 'Active',
      zone: 'North, South, East, West',
      region: 'North Hub',
      territory: 'Galderma Territory',
      participants_planned: 4
    }
  });

  // Users
  const usersToSeed = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Super Admin',
      email: 'admin@idonneous.com',
      employee_id: 'ADM001',
      roleId: roleMap['Admin']
    },
    {
      id: '00000000-0000-0000-0000-000000000005',
      name: 'Yusuf Khan',
      email: 'yusuf@idonneous.com',
      employee_id: 'EMP-PM-001',
      roleId: roleMap['Program Manager'],
      projectId: sseil.id,
      designation: 'Program Manager',
      zone: 'North'
    },
    {
      id: '00000000-0000-0000-0000-000000000010',
      name: 'Sunil Rao',
      email: 'sunil@idonneous.com',
      employee_id: 'EMP-SUP-001',
      roleId: roleMap['Supervisor'],
      projectId: sseil.id,
      designation: 'Supervisor',
      zone: 'North'
    },
    {
      id: '00000000-0000-0000-0000-000000000009',
      name: 'Kavita Joshi',
      email: 'staff@quizhive.com',
      employee_id: 'EMP-EMP-001',
      roleId: roleMap['Employee'],
      projectId: sseil.id,
      designation: 'Employee',
      zone: 'North'
    },
    {
      id: '00000000-0000-0000-0000-000000000006',
      name: 'Dr. Pierre',
      email: 'drpierre@galderma.com',
      employee_id: 'EMP-CLI-001',
      roleId: roleMap['Client'],
      projectId: galderma.id,
      designation: 'Client'
    }
  ];

  for (const u of usersToSeed) {
    await User.findOrCreate({
      where: { email: u.email },
      defaults: {
        ...u,
        password: passwordHash,
        status: 'Active'
      }
    });
  }

  // Project Assignments
  const assignmentsToSeed = [
    {
      userId: '00000000-0000-0000-0000-000000000005', // Yusuf Khan
      projectId: sseil.id,
      role: 'Program Manager',
      zone: 'North',
      status: 'Active'
    },
    {
      userId: '00000000-0000-0000-0000-000000000010', // Sunil Rao
      projectId: sseil.id,
      role: 'Supervisor',
      zone: 'North',
      status: 'Active'
    }
  ];

  for (const pa of assignmentsToSeed) {
    await ProjectAssignment.findOrCreate({
      where: {
        userId: pa.userId,
        projectId: pa.projectId
      },
      defaults: pa
    });
  }
}

module.exports = { seedLocalUAT };

