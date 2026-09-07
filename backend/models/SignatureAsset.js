const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SignatureAsset = sequelize.define('SignatureAsset', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type: {
    type: DataTypes.ENUM('authorized_signatory', 'trainer_signature', 'company_seal'),
    allowNull: false,
    defaultValue: 'authorized_signatory',
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  designation: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  organization: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Idonneous Marketing Services Pvt. Ltd.',
  },
  assetPath: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  version: {
    type: DataTypes.STRING,
    defaultValue: 'V1',
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive', 'Archived'),
    defaultValue: 'Active',
  },
  effectiveDate: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.STRING,
    defaultValue: 'System Admin',
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['isDefault'] }
  ]
});

module.exports = SignatureAsset;
