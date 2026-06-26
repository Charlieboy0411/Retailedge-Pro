const sequelize = require('./config/database');
const Escalation = require('./models/Escalation');

async function syncEscalation() {
  try {
    await sequelize.authenticate();
    await Escalation.sync({ alter: true });
    console.log('Escalation synced');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

syncEscalation();
