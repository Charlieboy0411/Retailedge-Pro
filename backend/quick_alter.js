const sequelize = require('./config/database');

async function run() {
  try {
    await sequelize.authenticate();
    await sequelize.query('ALTER TABLE "Sessions" ADD COLUMN IF NOT EXISTS "session_name" VARCHAR(255);');
    console.log('✅ session_name column successfully ensured on Sessions table.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
