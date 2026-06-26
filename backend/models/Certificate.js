const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Project = require('./Project');

const Certificate = sequelize.define('Certificate', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  issueDate: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
  },
  qrCode: {
    type: DataTypes.STRING,
    allowNull: false,
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['projectId'] }
  ]
});

Certificate.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });
User.hasMany(Certificate, { foreignKey: 'userId' });

Certificate.belongsTo(Project, { foreignKey: 'projectId', onDelete: 'CASCADE' });
Project.hasMany(Certificate, { foreignKey: 'projectId' });

module.exports = Certificate;
