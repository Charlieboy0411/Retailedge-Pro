const sequelize = require('./config/database');

async function fixDb() {
  try {
    await sequelize.authenticate();
    await sequelize.query('DROP TABLE IF EXISTS "Projects_backup";');
    console.log('Dropped Projects_backup.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
fixDb();
