const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Quiz = require('./Quiz');
const User = require('./User');

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
  current_question_index: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['quizId'] },
    { fields: ['status'] }
  ]
});

Session.belongsTo(Quiz, { foreignKey: 'quizId' });
Quiz.hasMany(Session, { foreignKey: 'quizId' });

Session.belongsTo(User, { as: 'host', foreignKey: 'hostId' });
User.hasMany(Session, { foreignKey: 'hostId' });

module.exports = Session;
