const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Project = require('./Project');
const User = require('./User');

const Escalation = sequelize.define('Escalation', {
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
  status: {
    type: DataTypes.ENUM('Open', 'Resolved'),
    defaultValue: 'Open',
  },
  replyText: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  repliedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  }
}, {
  timestamps: true,
});

// Relationships
Escalation.belongsTo(Project, { foreignKey: 'projectId', onDelete: 'CASCADE' });
Project.hasMany(Escalation, { foreignKey: 'projectId' });

Escalation.belongsTo(User, { as: 'raisedBy', foreignKey: 'raisedById', onDelete: 'CASCADE' });
User.hasMany(Escalation, { as: 'escalationsRaised', foreignKey: 'raisedById' });

Escalation.belongsTo(User, { as: 'repliedBy', foreignKey: 'repliedById', onDelete: 'SET NULL' });
User.hasMany(Escalation, { as: 'escalationsReplied', foreignKey: 'repliedById' });

module.exports = Escalation;
