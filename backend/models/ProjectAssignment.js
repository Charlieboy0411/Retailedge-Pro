const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Project = require('./Project');

const ProjectAssignment = sequelize.define('ProjectAssignment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Projects',
      key: 'id'
    }
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'Program Manager',
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Active',
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['userId', 'projectId'], unique: true },
    { fields: ['projectId'] },
    { fields: ['userId'] }
  ]
});

ProjectAssignment.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });
User.hasMany(ProjectAssignment, { foreignKey: 'userId' });

ProjectAssignment.belongsTo(Project, { foreignKey: 'projectId', onDelete: 'CASCADE' });
Project.hasMany(ProjectAssignment, { foreignKey: 'projectId' });

module.exports = ProjectAssignment;
