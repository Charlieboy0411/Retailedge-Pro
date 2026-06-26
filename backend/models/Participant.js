const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Session = require('./Session');
const User = require('./User'); // Optional, if they are logged in

const Participant = sequelize.define('Participant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false, // The nickname they enter to join
  },
  employeeId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  mobileNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  avatar: {
    type: DataTypes.STRING,   // emoji or avatar key
    allowNull: true,
    defaultValue: '🙂',
  },
  connectionStatus: {
    // waiting | active | disconnected | rejoined
    type: DataTypes.ENUM('waiting', 'active', 'disconnected', 'rejoined'),
    defaultValue: 'waiting',
    allowNull: false,
  },
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  deviceId: {
    type: DataTypes.STRING,   // fingerprint for anti-cheat duplicate detection
    allowNull: true,
  },
  storeName: {
    type: DataTypes.STRING,   // store name entered by learner
    allowNull: true,
  },
}, {
  timestamps: true,
});

Participant.belongsTo(Session, { foreignKey: 'sessionId' });
Session.hasMany(Participant, { foreignKey: 'sessionId' });

// Optional relation if they are a logged-in user
Participant.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Participant, { foreignKey: 'userId' });

module.exports = Participant;
