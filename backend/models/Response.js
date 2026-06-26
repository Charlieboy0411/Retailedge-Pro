const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Participant = require('./Participant');
const Question = require('./Question');

const Response = sequelize.define('Response', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  answer: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  response_time: {
    type: DataTypes.INTEGER, // time taken to respond in milliseconds
    allowNull: true,
  },
  points_awarded: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['participantId'] },
    { fields: ['questionId'] }
  ]
});

Response.belongsTo(Participant, { foreignKey: 'participantId' });
Participant.hasMany(Response, { foreignKey: 'participantId' });

Response.belongsTo(Question, { foreignKey: 'questionId' });
Question.hasMany(Response, { foreignKey: 'questionId' });

module.exports = Response;
