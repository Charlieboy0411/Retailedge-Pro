const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Client = require('./Client');

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  project_code: {
    type: DataTypes.STRING,
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Clients',
      key: 'id'
    }
  },
  brand: { type: DataTypes.STRING },
  project_type: { type: DataTypes.STRING },
  business_unit: { type: DataTypes.STRING },
  description: { type: DataTypes.TEXT },
  project_logo: { type: DataTypes.STRING },
  start_date: { type: DataTypes.DATEONLY },
  end_date: { type: DataTypes.DATEONLY },
  project_phase: { type: DataTypes.STRING },
  frequency: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: 'Active' },
  country: { type: DataTypes.STRING },
  zone: { type: DataTypes.STRING },
  region: { type: DataTypes.STRING },
  state: { type: DataTypes.STRING },
  city: { type: DataTypes.STRING },
  store: { type: DataTypes.STRING },
  cluster: { type: DataTypes.STRING },
  territory: { type: DataTypes.STRING },
  participants_planned: { type: DataTypes.INTEGER, defaultValue: 0 },
  sessions_planned: { type: DataTypes.INTEGER, defaultValue: 0 },
  assessment_targets: { type: DataTypes.INTEGER, defaultValue: 0 },
  certification_targets: { type: DataTypes.INTEGER, defaultValue: 0 },
  attendance_targets: { type: DataTypes.INTEGER, defaultValue: 0 },
  completion_targets: { type: DataTypes.INTEGER, defaultValue: 0 },
  parentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Projects',
      key: 'id'
    }
  }
}, {
  timestamps: true,
});

Project.belongsTo(Project, { as: 'parent', foreignKey: 'parentId' });
Project.hasMany(Project, { as: 'subProjects', foreignKey: 'parentId' });
Project.belongsTo(Client, { foreignKey: 'clientId' });
Client.hasMany(Project, { foreignKey: 'clientId' });

module.exports = Project;
