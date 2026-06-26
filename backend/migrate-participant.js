/**
 * migrate-participant.js
 * Safely adds new columns to the Participants table without destroying data.
 * Run once: node migrate-participant.js
 */
require('dotenv').config();
const sequelize = require('./config/database');

async function migrate() {
  const qi = sequelize.getQueryInterface();

  const { DataTypes } = require('sequelize');

  const columnsToAdd = [
    { name: 'employeeId',        type: DataTypes.STRING,  allowNull: true },
    { name: 'mobileNumber',      type: DataTypes.STRING,  allowNull: true },
    { name: 'avatar',            type: DataTypes.STRING,  allowNull: true, defaultValue: '🙂' },
    { name: 'connectionStatus',  type: DataTypes.STRING,  allowNull: false, defaultValue: 'waiting' },
    { name: 'deviceId',          type: DataTypes.STRING,  allowNull: true },
  ];

  const tableDesc = await qi.describeTable('Participants');

  for (const col of columnsToAdd) {
    if (!tableDesc[col.name]) {
      console.log(`Adding column: ${col.name}`);
      await qi.addColumn('Participants', col.name, col);
    } else {
      console.log(`Column already exists, skipping: ${col.name}`);
    }
  }

  console.log('\n✅ Migration complete.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
