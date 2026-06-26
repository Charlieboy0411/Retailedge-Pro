const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const UserQuery = sequelize.define('UserQuery', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  dashboard: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Open', // Open, In Progress, Resolved
  }
}, {
  timestamps: true,
});

// Setup relations
UserQuery.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });
User.hasMany(UserQuery, { foreignKey: 'userId' });

module.exports = UserQuery;
