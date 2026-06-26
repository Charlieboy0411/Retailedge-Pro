const sequelize = require('./config/database');
const User = require('./models/User');
const Role = require('./models/Role');

async function check() {
  await sequelize.authenticate();
  const users = await User.findAll({ include: [Role] });
  for (const u of users) {
    console.log(`User: ${u.email} | Role: ${u.Role ? u.Role.role_name : 'No Role'} | Status: ${u.status}`);
  }
  process.exit(0);
}
check();
