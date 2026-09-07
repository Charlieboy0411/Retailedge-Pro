const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CertificateAuditLog = sequelize.define('CertificateAuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  certificateId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  action: {
    type: DataTypes.ENUM('ISSUED', 'VERIFIED', 'REVOKED', 'REISSUED', 'DOWNLOADED', 'EMAILED', 'SHARED', 'UPDATED'),
    allowNull: false,
  },
  performedBy: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'System Admin',
  },
  performedById: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['certificateId'] },
    { fields: ['action'] }
  ]
});

module.exports = CertificateAuditLog;
