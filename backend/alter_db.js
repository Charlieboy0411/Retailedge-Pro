const sequelize = require('./config/database');
const TrainingProgress = require('./models/TrainingProgress');
const UserQuery = require('./models/UserQuery');

async function updateDb() {
  try {
    await sequelize.authenticate();
    console.log('Connected.');
    await TrainingProgress.sync({ alter: true });
    console.log('TrainingProgress table updated successfully!');
    await UserQuery.sync({ alter: true });
    console.log('UserQuery table created/updated successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}
updateDb();
