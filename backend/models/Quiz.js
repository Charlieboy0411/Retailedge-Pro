const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Project = require('./Project');

const Quiz = sequelize.define('Quiz', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived'),
    defaultValue: 'draft',
  },
  config: {
    type: DataTypes.JSON, // Stores quiz configurations like time limits, shuffling, etc.
    defaultValue: {},
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['projectId'] },
    { fields: ['status'] }
  ]
});

Quiz.belongsTo(User, { as: 'creator', foreignKey: 'creatorId' });
User.hasMany(Quiz, { foreignKey: 'creatorId' });

Quiz.belongsTo(Project, { foreignKey: 'projectId' });
Project.hasMany(Quiz, { foreignKey: 'projectId' });

module.exports = Quiz;
