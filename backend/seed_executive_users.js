const sequelize = require('./config/database');
const Role = require('./models/Role');
const User = require('./models/User');
const Project = require('./models/Project');
const bcrypt = require('bcrypt');

async function seedExecutives() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // 1. Fetch relevant roles
    const mdRole = await Role.findOne({ where: { role_name: 'MD' } });
    const cooRole = await Role.findOne({ where: { role_name: 'COO' } });
    const vpRole = await Role.findOne({ where: { role_name: 'VP Operations' } });

    if (!mdRole || !cooRole || !vpRole) {
      console.error('Executive roles not found. Please run backend seed first.');
      process.exit(1);
    }

    // 2. Fetch a default project to associate them to (Project Alpha)
    const project = await Project.findOne();
    const projectId = project ? project.id : null;
    console.log(`Using default Project ID: ${projectId} (${project ? project.name : 'None'})`);

    const hashedPassword = await bcrypt.hash('password123', 10);

    const execUsers = [
      { email: 'md@quizhive.com', name: 'Demo MD', roleId: mdRole.id, empId: 'MD001' },
      { email: 'coo@quizhive.com', name: 'Demo COO', roleId: cooRole.id, empId: 'COO001' },
      { email: 'vp@quizhive.com', name: 'Demo VP Operations', roleId: vpRole.id, empId: 'VPO001' }
    ];

    for (const exec of execUsers) {
      const [u, created] = await User.findOrCreate({
        where: { email: exec.email },
        defaults: {
          name: exec.name,
          email: exec.email,
          password: hashedPassword,
          roleId: exec.roleId,
          employee_id: exec.empId,
          projectId: projectId,
          status: 'Active'
        }
      });
      if (created) {
        console.log(`Created Executive User: ${exec.email}`);
      } else {
        await u.update({ roleId: exec.roleId, projectId: projectId });
        console.log(`Updated Executive User: ${exec.email}`);
      }
    }

    console.log('Executive user seeding complete!');
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    process.exit(0);
  }
}

seedExecutives();
