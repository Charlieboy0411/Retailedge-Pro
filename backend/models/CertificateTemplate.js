const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CertificateTemplate = sequelize.define('CertificateTemplate', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  templateType: {
    type: DataTypes.ENUM('corporate', 'retail_excellence', 'premium_achievement', 'custom'),
    defaultValue: 'corporate',
    allowNull: false,
  },
  orientation: {
    type: DataTypes.ENUM('landscape', 'portrait'),
    defaultValue: 'landscape',
    allowNull: false,
  },
  configuration: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      primaryColor: '#0B1220',
      secondaryColor: '#2563EB',
      accentColor: '#D97706',
      backgroundColor: '#FFFFFF',
      fontFamily: 'Manrope, Inter, sans-serif',
      title: 'CERTIFICATE OF COMPLETION',
      subtitle: 'This is proudly presented to',
      bodyText: 'For successfully completing the comprehensive training curriculum, live interactive assessment milestones, and meeting all professional competency benchmarks in:',
      showLogo: true,
      showClientLogo: true,
      showQrCode: true,
      showScore: true,
      showAttendance: true,
      signatory1Title: 'Trainer & Lead Assessor',
      signatory2Title: 'Managing Director, RetailEdge Pro',
      signatory2Name: 'Mohit Tiku'
    }
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  status: {
    type: DataTypes.ENUM('Active', 'Draft', 'Archived'),
    defaultValue: 'Active',
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
  }
}, {
  timestamps: true,
});

module.exports = CertificateTemplate;
