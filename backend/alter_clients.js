const sequelize = require('./config/database');
const Client = require('./models/Client');

async function updateDb() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');
    
    // Sync Client table
    await Client.sync({ alter: true });
    console.log('Client table updated successfully!');
    
    process.exit(0);
  } catch (err) {
    console.error('Error updating database:', err);
    process.exit(1);
  }
}
updateDb();
