const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const dbOptions = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  dialect: 'postgres',
  logging: false, // Set to true to see SQL queries in console
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

if (process.env.DB_SSL === 'true') {
  dbOptions.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: false // Railway requires this for SSL
    }
  };
}

const sequelize = new Sequelize(
  process.env.DB_NAME || 'quizhive',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASS || 'password',
  dbOptions
);

module.exports = sequelize;
