const sequelize = require('./config/database');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function testPasswords() {
  await sequelize.authenticate();
  const users = await User.findAll();
  console.log('\n--- TESTING PASSWORDS ---');
  for (const u of users) {
    const isP123 = await bcrypt.compare('password123', u.password);
    console.log(`User: ${u.email.padEnd(30)} | Password 'password123' valid: ${isP123}`);
  }
  process.exit(0);
}
testPasswords();
