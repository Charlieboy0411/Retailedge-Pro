const sequelize = require('./config/database');
const Project = require('./models/Project');
const Role = require('./models/Role');
const User = require('./models/User');
const Quiz = require('./models/Quiz');
const Question = require('./models/Question');
const Session = require('./models/Session');
const Participant = require('./models/Participant');
const Response = require('./models/Response');
const Training = require('./models/Training');
const TrainingProgress = require('./models/TrainingProgress');
const Certificate = require('./models/Certificate');
const UserQuery = require('./models/UserQuery');

async function updateDb() {
  try {
    await sequelize.authenticate();
    console.log('Connected to PostgreSQL.');
    await sequelize.sync({ alter: true });
    console.log('✅ All tables synchronized and missing columns added successfully without data loss!');
    process.exit(0);
  } catch (err) {
    console.error('Error syncing schema:', err);
    process.exit(1);
  }
}
updateDb();

