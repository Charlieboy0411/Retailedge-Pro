const sequelize = require('./config/database');
const Role = require('./models/Role');
const User = require('./models/User');
const Project = require('./models/Project');
const Training = require('./models/Training');
const Certificate = require('./models/Certificate');
const bcrypt = require('bcrypt');

async function seedDB() {
  try {
    await sequelize.authenticate();
    console.log('Database connected for seeding...');
    
    // Create Roles
    const rolesData = [
      { role_name: 'Super Admin', permissions: { can_create_projects: true, can_manage_users: true, can_create_quizzes: true } },
      { role_name: 'Admin', permissions: { can_create_projects: true, can_manage_users: true, can_create_quizzes: true } },
      { role_name: 'HR Admin', permissions: { can_create_projects: false, can_manage_users: true, can_create_quizzes: false } },
      { role_name: 'Manager', permissions: { can_create_projects: false, can_manage_users: false, can_create_quizzes: false } },
      { role_name: 'Program Manager', permissions: { can_create_projects: false, can_manage_users: false, can_create_quizzes: true } },
      { role_name: 'Trainer', permissions: { can_create_projects: false, can_manage_users: false, can_create_quizzes: true } },
      { role_name: 'Employee', permissions: { can_create_projects: false, can_manage_users: false, can_create_quizzes: false } },
      { role_name: 'Client', permissions: { can_create_projects: false, can_manage_users: false, can_create_quizzes: false, read_only: true } },
      { role_name: 'MD', permissions: { can_create_projects: true, can_manage_users: true, can_create_quizzes: true } },
      { role_name: 'COO', permissions: { can_create_projects: true, can_manage_users: true, can_create_quizzes: true } },
      { role_name: 'VP Operations', permissions: { can_create_projects: true, can_manage_users: true, can_create_quizzes: true } },
      { role_name: 'Operation Manager', permissions: { can_create_projects: false, can_manage_users: true, can_create_quizzes: true } },
      { role_name: 'Supervisor', permissions: { can_create_projects: false, can_manage_users: false, can_create_quizzes: false } },
    ];

    const createdRoles = {};
    for (const role of rolesData) {
      const [r, created] = await Role.findOrCreate({
        where: { role_name: role.role_name },
        defaults: role
      });
      createdRoles[role.role_name] = r.id;
      if (created) console.log(`Created Role: ${role.role_name}`);
    }

    // Create Projects / Teams
    const projectsData = [
      { name: 'Project Alpha (Security Audit)' },
      { name: 'Project Beta (Product Redesign)' },
      { name: 'Project Gamma (Infrastructure)' }
    ];

    const createdProjects = {};
    for (const proj of projectsData) {
      const [p] = await Project.findOrCreate({
        where: { name: proj.name },
        defaults: proj
      });
      createdProjects[proj.name] = p.id;
      console.log(`Created Project: ${proj.name}`);
    }

    // Create Default Users
    const usersToCreate = [
      { email: 'admin@quizhive.com', name: 'Super Admin', role: 'Admin', empId: 'ADMIN001', project: null },
      { email: 'trainer@quizhive.com', name: 'Demo Trainer', role: 'Trainer', empId: 'TRN001', project: 'Project Alpha (Security Audit)' },
      { email: 'pm@quizhive.com', name: 'Demo Program Manager', role: 'Program Manager', empId: 'PM001', project: 'Project Alpha (Security Audit)' },
      { email: 'client@quizhive.com', name: 'Demo Client', role: 'Client', empId: 'CLI001', project: 'Project Alpha (Security Audit)' },
      { email: 'supervisor@quizhive.com', name: 'Demo Supervisor', role: 'Manager', empId: 'SUP001', project: 'Project Alpha (Security Audit)' },
      { email: 'staff@quizhive.com', name: 'Demo Staff member', role: 'Employee', empId: 'STF001', project: 'Project Alpha (Security Audit)' }
    ];

    for (const userData of usersToCreate) {
      const existingUser = await User.findOne({ where: { email: userData.email } });
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash('password123', 10);
        await User.create({
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          roleId: createdRoles[userData.role],
          employee_id: userData.empId,
          projectId: userData.project ? createdProjects[userData.project] : null,
          status: 'Active'
        });
        console.log(`Created Default User: ${userData.email} / password123`);
      } else {
        // Update their project just in case
        if (userData.project) {
          await existingUser.update({ projectId: createdProjects[userData.project] });
        }
        console.log(`User already exists: ${userData.email}. Skipping.`);
      }
    }

    // Seed Trainings/Modules assigned to Project Alpha
    const trainingsData = [
      {
        title: 'Phishing Scams Decoded',
        description: 'Learn how phishing works and how to identify suspicious communication.',
        type: 'Video',
        url: 'https://www.w3schools.com/html/mov_bbb.mp4',
        duration: '12 mins',
        projectId: createdProjects['Project Alpha (Security Audit)']
      },
      {
        title: 'Identifying Suspicious Links',
        description: 'Practical guide to analyzing link structures and preventing clicks on domain copies.',
        type: 'PDF',
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        duration: '5 pages',
        projectId: createdProjects['Project Alpha (Security Audit)']
      },
      {
        title: 'Password Security & Multi-Factor Auth',
        description: 'Implementing strong passphrases and enabling two-factor validation policies.',
        type: 'PPT',
        url: 'https://slides.html5rocks.com/#slide1',
        duration: '8 slides',
        projectId: createdProjects['Project Alpha (Security Audit)']
      }
    ];

    for (const train of trainingsData) {
      await Training.findOrCreate({
        where: { title: train.title },
        defaults: train
      });
      console.log(`Created Training Material: ${train.title}`);
    }

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    process.exit();
  }
}

seedDB();
