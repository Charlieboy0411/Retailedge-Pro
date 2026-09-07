const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Project = require('./Project');
const Client = require('./Client');
const Training = require('./Training');
const Quiz = require('./Quiz');
const Session = require('./Session');

const ReportAudit = sequelize.define('ReportAudit', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  reportCode: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  level: {
    type: DataTypes.ENUM('LEVEL_1_QUIZ', 'LEVEL_2_PROJECT_MONTHLY', 'LEVEL_3_MASTER_MONTHLY'),
    allowNull: false,
    defaultValue: 'LEVEL_1_QUIZ',
  },
  reportType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'QUIZ', // 'QUIZ', 'PROJECT_MONTHLY', 'MASTER_MONTHLY'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  period: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '2026-08',
  },
  format: {
    type: DataTypes.STRING,
    defaultValue: 'ALL', // 'ALL', 'ONLINE', 'OFFLINE'
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Clients',
      key: 'id',
    },
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Projects',
      key: 'id',
    },
  },
  subProjectId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Projects',
      key: 'id',
    },
  },
  trainingId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Trainings',
      key: 'id',
    },
  },
  quizId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Quizzes',
      key: 'id',
    },
  },
  sessionId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Sessions',
      key: 'id',
    },
  },
  generatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id',
    },
  },
  generatorName: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'System Automation',
  },
  status: {
    type: DataTypes.ENUM('GENERATED', 'FAILED', 'ARCHIVED', 'PROCESSING'),
    defaultValue: 'GENERATED',
  },
  summaryKPIs: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  snapshotData: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  excelPath: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  pptPath: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  comparisonPeriod: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  comparisonKPIs: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: 'ReportAudits',
});

ReportAudit.belongsTo(User, { as: 'generator', foreignKey: 'generatedBy', onDelete: 'SET NULL' });
ReportAudit.belongsTo(Project, { as: 'project', foreignKey: 'projectId', onDelete: 'SET NULL' });
ReportAudit.belongsTo(Project, { as: 'subProject', foreignKey: 'subProjectId', onDelete: 'SET NULL' });
ReportAudit.belongsTo(Client, { as: 'client', foreignKey: 'clientId', onDelete: 'SET NULL' });
ReportAudit.belongsTo(Training, { as: 'training', foreignKey: 'trainingId', onDelete: 'SET NULL' });
ReportAudit.belongsTo(Quiz, { as: 'quiz', foreignKey: 'quizId', onDelete: 'SET NULL' });
ReportAudit.belongsTo(Session, { as: 'session', foreignKey: 'sessionId', onDelete: 'SET NULL' });

module.exports = ReportAudit;
