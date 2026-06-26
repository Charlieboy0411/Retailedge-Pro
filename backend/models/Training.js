const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Project = require('./Project');

const Training = sequelize.define('Training', {
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
  type: {
    type: DataTypes.ENUM('Video', 'PDF', 'PPT', 'Image', 'Audio', 'Meeting'),
    allowNull: false,
    defaultValue: 'Video',
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  duration: {
    type: DataTypes.STRING,
    defaultValue: '10 mins',
  },
  scheduledAt: {
    type: DataTypes.DATE,
    allowNull: true,
  }
}, {
  timestamps: true,
});

Training.belongsTo(Project, { foreignKey: 'projectId', onDelete: 'SET NULL' });
Project.hasMany(Training, { foreignKey: 'projectId' });

module.exports = Training;
