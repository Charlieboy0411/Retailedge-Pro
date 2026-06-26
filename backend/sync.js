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

async function syncDB() {
  try {
    await sequelize.authenticate();
    console.log('Connection to PostgreSQL has been established successfully.');
    
    // Sync all defined models to the DB
    await sequelize.sync({ force: true });
    console.log('All models were synchronized successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    process.exit();
  }
}

syncDB();
