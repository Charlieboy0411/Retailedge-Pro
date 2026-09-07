const sequelize = require('../config/database');
const User = require('../models/User');
const Role = require('../models/Role');
const Project = require('../models/Project');
const ProjectAssignment = require('../models/ProjectAssignment');
const bcrypt = require('bcrypt');

async function seedDemoPM() {
  try {
    await sequelize.authenticate();
    console.log('Database connected...');

    // 1. Find or verify the Program Manager role
    const pmRole = await Role.findOne({ where: { role_name: 'Program Manager' } });
    if (!pmRole) {
      throw new Error('Program Manager role not found in database');
    }
    console.log(`Using Program Manager role: ${pmRole.id} (${pmRole.role_name})`);

    // 2. Target Project: Idonneous (active project with data)
    const targetProject = await Project.findByPk('1c4c15a4-88fa-4624-a45a-a97a9fac7907');
    if (!targetProject) {
      throw new Error('Target project not found');
    }
    console.log(`Target project: ${targetProject.id} (${targetProject.name})`);

    // 3. Find or Create Demo PM user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const [pmUser, created] = await User.findOrCreate({
      where: { email: 'pm@quizhive.com' },
      defaults: {
        name: 'Demo PM',
        email: 'pm@quizhive.com',
        password: hashedPassword,
        roleId: pmRole.id,
        employee_id: 'PM001',
        projectId: targetProject.id,
        status: 'Active'
      }
    });

    if (!created) {
      // Ensure role, password, and project are set properly
      await pmUser.update({
        name: 'Demo PM',
        password: hashedPassword,
        roleId: pmRole.id,
        employee_id: 'PM001',
        projectId: targetProject.id,
        status: 'Active'
      });
      console.log('Demo PM user updated successfully.');
    } else {
      console.log('Demo PM user created successfully.');
    }

    // 4. Assign via ProjectAssignment
    const [assignment, assignCreated] = await ProjectAssignment.findOrCreate({
      where: {
        userId: pmUser.id,
        projectId: targetProject.id
      },
      defaults: {
        userId: pmUser.id,
        projectId: targetProject.id,
        role: 'Program Manager',
        status: 'Active'
      }
    });

    console.log(`ProjectAssignment confirmed (ID: ${assignment.id}, Created: ${assignCreated})`);
    console.log('✅ Demo PM setup complete: pm@quizhive.com / password123');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding Demo PM:', error);
    process.exit(1);
  }
}

seedDemoPM();
