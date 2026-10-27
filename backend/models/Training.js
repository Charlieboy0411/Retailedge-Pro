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
  },
  trainerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  platform: {
    type: DataTypes.STRING(50),
    defaultValue: 'google_meet',
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'Scheduled',
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['projectId'] },
    { fields: ['trainerId'] },
    { fields: ['scheduledAt'] },
    { fields: ['type'] }
  ]
});

const User = require('./User');

Training.belongsTo(Project, { foreignKey: 'projectId', onDelete: 'SET NULL' });
Project.hasMany(Training, { foreignKey: 'projectId' });

Training.belongsTo(User, { as: 'Trainer', foreignKey: 'trainerId', onDelete: 'SET NULL' });
User.hasMany(Training, { as: 'TrainedSessions', foreignKey: 'trainerId' });

Training.belongsTo(User, { as: 'Creator', foreignKey: 'createdBy', onDelete: 'SET NULL' });
User.hasMany(Training, { as: 'CreatedTrainings', foreignKey: 'createdBy' });

module.exports = Training;
