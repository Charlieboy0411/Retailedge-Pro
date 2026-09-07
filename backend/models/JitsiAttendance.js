const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Training = require('./Training');
const Project = require('./Project');
const User = require('./User');

const JitsiAttendance = sequelize.define('JitsiAttendance', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  trainingId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Trainings',
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
  subProjectId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Projects',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  participantName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  employeeId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  jitsiParticipantId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  scheduledDurationMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 60,
  },
  totalAttendedMinutes: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  attendancePercentage: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  rejoinCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('Online', 'Offline', 'Left Early', 'Completed', 'Late'),
    defaultValue: 'Online',
  },
  firstJoinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  lastLeftAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lastHeartbeatAt: {
    type: DataTypes.DATE,
    allowNull: true,
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['trainingId'] },
    { fields: ['projectId'] },
    { fields: ['subProjectId'] },
    { fields: ['userId'] },
    { fields: ['status'] }
  ]
});

JitsiAttendance.belongsTo(Training, { foreignKey: 'trainingId', onDelete: 'CASCADE' });
Training.hasMany(JitsiAttendance, { foreignKey: 'trainingId' });

JitsiAttendance.belongsTo(Project, { foreignKey: 'projectId', onDelete: 'SET NULL' });
JitsiAttendance.belongsTo(Project, { as: 'subProject', foreignKey: 'subProjectId', onDelete: 'SET NULL' });

JitsiAttendance.belongsTo(User, { foreignKey: 'userId', onDelete: 'SET NULL' });
User.hasMany(JitsiAttendance, { foreignKey: 'userId' });

module.exports = JitsiAttendance;
