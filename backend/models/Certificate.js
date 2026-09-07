const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Project = require('./Project');
const Client = require('./Client');
const Training = require('./Training');

const Certificate = sequelize.define('Certificate', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  certificate_id: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Projects',
      key: 'id'
    }
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Clients',
      key: 'id'
    }
  },
  trainingId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Trainings',
      key: 'id'
    }
  },
  batchName: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Batch-01',
  },
  trainerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  templateId: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'corporate',
  },
  templateVersion: {
    type: DataTypes.STRING,
    defaultValue: '1.0',
  },
  issueDate: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
  },
  expiryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  assessmentScore: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 85,
  },
  attendancePercentage: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 95,
  },
  completionPercentage: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 100,
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'GENERATED', 'ISSUED', 'VALID', 'EXPIRED', 'REVOKED', 'REISSUED', 'REPLACED'),
    defaultValue: 'ISSUED',
    allowNull: false,
  },
  verificationToken: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  qrCode: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  pdfPath: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  signatureAssetId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  sealAssetId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  trainerSignatureUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  authorizedSignatureUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  companySealUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  includeTrainerSignature: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  includeCompanySeal: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  sealPosition: {
    type: DataTypes.STRING,
    defaultValue: 'bottom-right',
  },
  signatoryName: {
    type: DataTypes.STRING,
    defaultValue: 'Mohit Tiku',
  },
  signatoryDesignation: {
    type: DataTypes.STRING,
    defaultValue: 'Managing Director',
  },
  trainerName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  certificateSnapshot: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  revocationReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  revokedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  revokedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  reissuedFromId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  replacedById: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['certificate_id'], unique: true },
    { fields: ['userId'] },
    { fields: ['projectId'] },
    { fields: ['clientId'] },
    { fields: ['status'] },
    { fields: ['verificationToken'] }
  ]
});

Certificate.belongsTo(User, { foreignKey: 'userId', as: 'User', onDelete: 'CASCADE' });
User.hasMany(Certificate, { foreignKey: 'userId' });

Certificate.belongsTo(Project, { foreignKey: 'projectId', as: 'Project', onDelete: 'SET NULL' });
Project.hasMany(Certificate, { foreignKey: 'projectId' });

Certificate.belongsTo(Client, { foreignKey: 'clientId', as: 'Client', onDelete: 'SET NULL' });
Client.hasMany(Certificate, { foreignKey: 'clientId' });

Certificate.belongsTo(Training, { foreignKey: 'trainingId', as: 'Training', onDelete: 'SET NULL' });
Training.hasMany(Certificate, { foreignKey: 'trainingId' });

Certificate.belongsTo(User, { foreignKey: 'trainerId', as: 'Trainer', onDelete: 'SET NULL' });

module.exports = Certificate;
