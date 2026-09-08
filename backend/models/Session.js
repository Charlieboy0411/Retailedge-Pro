const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Quiz = require('./Quiz');
const User = require('./User');
const Project = require('./Project');
const Training = require('./Training');

const Session = sequelize.define('Session', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  roomCode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  status: {
    type: DataTypes.ENUM('waiting', 'active', 'finished'),
    defaultValue: 'waiting',
  },
  startedAt: {
    type: DataTypes.DATE,
  },
  endedAt: {
    type: DataTypes.DATE,
  },
  session_name: {
    type: DataTypes.VIRTUAL,
    allowNull: true,
  },
  current_question_index: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Projects',
      key: 'id'
    }
  },
  trainingId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Trainings',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['quizId'] },
    { fields: ['projectId'] },
    { fields: ['trainingId'] },
    { fields: ['status'] }
  ]
});

Session.belongsTo(Quiz, { foreignKey: 'quizId' });
Quiz.hasMany(Session, { foreignKey: 'quizId' });

Session.belongsTo(User, { as: 'host', foreignKey: 'hostId' });
User.hasMany(Session, { foreignKey: 'hostId' });

Session.belongsTo(Project, { foreignKey: 'projectId', onDelete: 'SET NULL' });
Project.hasMany(Session, { foreignKey: 'projectId' });

Session.belongsTo(Training, { foreignKey: 'trainingId', onDelete: 'SET NULL' });
Training.hasMany(Session, { foreignKey: 'trainingId' });

module.exports = Session;
