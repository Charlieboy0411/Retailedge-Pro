const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Project = require('./Project');
const Role = require('./Role');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  employee_id: {
    type: DataTypes.STRING,
    unique: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  mobile: {
    type: DataTypes.STRING,
  },
  gender: {
    type: DataTypes.ENUM('Male', 'Female', 'Other'),
  },
  dob: {
    type: DataTypes.DATEONLY,
  },
  designation: {
    type: DataTypes.STRING,
  },
  status: {
    type: DataTypes.ENUM('Active', 'Pending', 'Suspended', 'Archived', 'Deleted'),
    defaultValue: 'Active',
  },
  doj: {
    type: DataTypes.DATEONLY,
  },
  employment_type: {
    type: DataTypes.ENUM('Full-time', 'Contract', 'Part-time', 'Intern'),
    defaultValue: 'Full-time',
  },
  skills: {
    type: DataTypes.JSON, // Stores array of skills
    defaultValue: [],
  },
  profile_photo: {
    type: DataTypes.STRING, // URL to photo
  },
  location: {
    type: DataTypes.STRING,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['email'] },
    { fields: ['employee_id'] },
    { fields: ['roleId'] },
    { fields: ['projectId'] }
  ]
});

// Relationships
User.belongsTo(Project, { foreignKey: 'projectId' });
Project.hasMany(User, { foreignKey: 'projectId' });

User.belongsTo(Role, { foreignKey: 'roleId' });
Role.hasMany(User, { foreignKey: 'roleId' });

User.belongsTo(User, { as: 'manager', foreignKey: 'managerId' });
User.hasMany(User, { as: 'subordinates', foreignKey: 'managerId' });

module.exports = User;
