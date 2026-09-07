const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const JitsiAttendance = require('./JitsiAttendance');

const JitsiInterval = sequelize.define('JitsiInterval', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  jitsiAttendanceId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'JitsiAttendances',
      key: 'id'
    }
  },
  joinedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  leftAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  durationSeconds: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['jitsiAttendanceId'] }
  ]
});

JitsiInterval.belongsTo(JitsiAttendance, { foreignKey: 'jitsiAttendanceId', onDelete: 'CASCADE' });
JitsiAttendance.hasMany(JitsiInterval, { as: 'intervals', foreignKey: 'jitsiAttendanceId' });

module.exports = JitsiInterval;
