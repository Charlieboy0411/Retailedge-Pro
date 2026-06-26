const sequelize = require('./config/database');
const Project = require('./models/Project');

async function updateDb() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');
    
    // Drop backup table if it exists
    await sequelize.query('DROP TABLE IF EXISTS "Projects_backup";');

    // Sync Project table
    await Project.sync({ alter: true });
    console.log('Project table updated successfully!');
    
    
    
    process.exit(0);
  } catch (err) {
    console.error('Error updating database:', err);
    process.exit(1);
  }
}
updateDb();
