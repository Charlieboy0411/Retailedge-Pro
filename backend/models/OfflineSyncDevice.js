const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OfflineSyncDevice = sequelize.define('OfflineSyncDevice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  device_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.STRING,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Pending', // Synced, Pending, Failed, Retrying
  },
  last_sync_timestamp: {
    type: DataTypes.DATE,
  },
  failed_logs: {
    type: DataTypes.JSON,
  }
}, {
  timestamps: true,
});

module.exports = OfflineSyncDevice;
