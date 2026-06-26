const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Quiz = require('./Quiz');

const Question = sequelize.define('Question', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'mcq',
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  options: {
    type: DataTypes.JSON, // Stores array of options
    defaultValue: [],
  },
  correct_answer: {
    type: DataTypes.STRING, // Can be the index of option or exact text
    allowNull: true,
  },
  points: {
    type: DataTypes.INTEGER,
    defaultValue: 100,
  },
  time_limit: {
    type: DataTypes.INTEGER, // in seconds
    defaultValue: 30,
  },
  media_url: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  timestamps: true,
});

Question.belongsTo(Quiz, { foreignKey: 'quizId' });
Quiz.hasMany(Question, { as: 'questions', foreignKey: 'quizId' });

module.exports = Question;
