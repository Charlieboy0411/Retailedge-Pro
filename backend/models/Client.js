const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Client = sequelize.define('Client', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  client_code: {
    type: DataTypes.STRING,
  },
  client_logo: {
    type: DataTypes.STRING,
  },
  client_type: {
    type: DataTypes.STRING,
  },
  industry: {
    type: DataTypes.STRING,
  },
  website: {
    type: DataTypes.STRING,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Active',
  },
  primary_contact_name: {
    type: DataTypes.STRING,
  },
  designation: {
    type: DataTypes.STRING,
  },
  primary_contact_email: {
    type: DataTypes.STRING,
  },
  primary_contact_phone: {
    type: DataTypes.STRING,
  },
  alternate_contact_number: {
    type: DataTypes.STRING,
  },
  address: {
    type: DataTypes.STRING,
  },
  city: {
    type: DataTypes.STRING,
  },
  state: {
    type: DataTypes.STRING,
  },
  country: {
    type: DataTypes.STRING,
  },
  pin_code: {
    type: DataTypes.STRING,
  },
  sla_agreement: {
    type: DataTypes.STRING,
  },
  contract_start_date: {
    type: DataTypes.DATEONLY,
  },
  contract_end_date: {
    type: DataTypes.DATEONLY,
  },
  contract_type: {
    type: DataTypes.STRING,
  },
  renewal_frequency: {
    type: DataTypes.STRING,
  },
  notes: {
    type: DataTypes.TEXT,
  },
  pm_name: { // Keeping legacy field for backwards compatibility if needed, or using as primary display
    type: DataTypes.STRING,
  },
  contract_status: {
    type: DataTypes.STRING,
    defaultValue: 'Active',
  },
  sla_tracking: {
    type: DataTypes.STRING,
  }
}, {
  timestamps: true,
});

module.exports = Client;
