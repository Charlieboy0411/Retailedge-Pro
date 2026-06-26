const sequelize = require('./config/database');
const Role = require('./models/Role');
const User = require('./models/User');
const Project = require('./models/Project');
const bcrypt = require('bcrypt');

async function seedMarketing() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // 1. Find or create Marketing Manager role
    const [mktRole, createdRole] = await Role.findOrCreate({
      where: { role_name: 'Marketing Manager' },
      defaults: {
        role_name: 'Marketing Manager',
        permissions: {
          can_create_projects: false,
          can_manage_users: false,
          can_create_quizzes: true,
          read_only: false
        }
      }
    });

    if (createdRole) {
      console.log('Created Marketing Manager Role');
    } else {
      console.log('Marketing Manager Role already exists');
    }

    // 2. Fetch Project Alpha or any project to link user to
    const project = await Project.findOne();
    const projectId = project ? project.id : null;
    console.log(`Using default Project ID: ${projectId} (${project ? project.name : 'None'})`);

    const hashedPassword = await bcrypt.hash('password123', 10);

    // 3. Create marketing user
    const [u, createdUser] = await User.findOrCreate({
      where: { email: 'marketing@quizhive.com' },
      defaults: {
        name: 'Demo Marketing Manager',
        email: 'marketing@quizhive.com',
        password: hashedPassword,
        roleId: mktRole.id,
        employee_id: 'MKT001',
        projectId: projectId,
        status: 'Active'
      }
    });

    if (createdUser) {
      console.log('Created Marketing User: marketing@quizhive.com / password123');
    } else {
      await u.update({ roleId: mktRole.id, projectId: projectId });
      console.log('Updated Marketing User settings.');
    }

    console.log('Marketing user seeding complete!');
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    process.exit(0);
  }
}

seedMarketing();
