const sequelize = require('./config/database');
const Role = require('./models/Role');
const User = require('./models/User');
const Project = require('./models/Project');
const bcrypt = require('bcrypt');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('DB connected.');

    // 1. Find or create T&D Manager role
    const [tdRole, createdRole] = await Role.findOrCreate({
      where: { role_name: 'T&D Manager' },
      defaults: {
        role_name: 'T&D Manager',
        permissions: { can_create_projects: false, can_manage_users: false, can_create_quizzes: true }
      }
    });
    if (createdRole) console.log('Created T&D Manager Role');

    // 2. Fetch default project
    const project = await Project.findOne();
    const projectId = project ? project.id : null;

    // 3. Create T&D Manager user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const [u, createdUser] = await User.findOrCreate({
      where: { email: 'td@quizhive.com' },
      defaults: {
        name: 'Demo T&D Manager',
        email: 'td@quizhive.com',
        password: hashedPassword,
        roleId: tdRole.id,
        employee_id: 'TD001',
        projectId: projectId,
        status: 'Active'
      }
    });

    if (createdUser) {
      console.log('Created T&D Manager User: td@quizhive.com');
    } else {
      await u.update({ roleId: tdRole.id });
      console.log('Updated T&D Manager User');
    }

    console.log('Seeding additional roles complete!');
  } catch (error) {
    console.error('Error seeding additional roles:', error);
  } finally {
    process.exit(0);
  }
}

run();
