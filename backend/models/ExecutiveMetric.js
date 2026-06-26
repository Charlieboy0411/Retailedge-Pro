const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Project = require('./Project');

const ExecutiveMetric = sequelize.define('ExecutiveMetric', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Projects',
      key: 'id'
    }
  },
  metricKey: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  metricValue: {
    type: DataTypes.TEXT,
    allowNull: false,
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['projectId', 'metricKey']
    }
  ]
});

ExecutiveMetric.belongsTo(Project, { foreignKey: 'projectId' });
Project.hasMany(ExecutiveMetric, { foreignKey: 'projectId' });

module.exports = ExecutiveMetric;
