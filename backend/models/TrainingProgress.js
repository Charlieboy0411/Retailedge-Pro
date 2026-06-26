const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Training = require('./Training');

const TrainingProgress = sequelize.define('TrainingProgress', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  timeSpent: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  latitude: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  longitude: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  zone: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  timestamps: true,
});

TrainingProgress.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });
User.hasMany(TrainingProgress, { foreignKey: 'userId' });

TrainingProgress.belongsTo(Training, { foreignKey: 'trainingId', onDelete: 'CASCADE' });
Training.hasMany(TrainingProgress, { foreignKey: 'trainingId' });

module.exports = TrainingProgress;
