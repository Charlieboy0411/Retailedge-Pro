require('dotenv').config();
const { Sequelize } = require('sequelize');
const path = require('path');

// 1. Initialize PostgreSQL Connection (Current config)
const sequelizePg = require('./config/database');

// 2. Initialize SQLite Connection (Old config)
const sequelizeSqlite = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'quizhive.sqlite'),
  logging: false,
});

async function migrate() {
  console.log('🚀 Starting Data Migration: SQLite -> PostgreSQL');
  try {
    await sequelizeSqlite.authenticate();
    console.log('✅ Connected to SQLite source');
    
    await sequelizePg.authenticate();
    console.log('✅ Connected to PostgreSQL destination');

    // Load all models so they are registered with Sequelize
    const fs = require('fs');
    fs.readdirSync(path.join(__dirname, 'models')).forEach(file => {
      if (file.endsWith('.js')) {
        require(path.join(__dirname, 'models', file));
      }
    });

    // Sync PG schema
    console.log('🔄 Syncing PostgreSQL schema...');
    await sequelizePg.sync({ force: true }); // Warning: clears PG database
    console.log('✅ Schema synced.');

    // Define table migration order (respecting foreign keys)
    const tables = [
      'Roles',
      'Clients',
      'Projects',
      'Users',
      'Quizzes',
      'Questions',
      'Sessions',
      'Participants',
      'Responses',
      'Trainings',
      'TrainingProgresses',
      'Certificates',
      'UserQueries',
      'Escalations',
      'ExecutiveMetrics',
      'OfflineSyncDevices',
      'AuditLogs'
    ];

    for (const table of tables) {
      console.log(`\n📦 Migrating table: ${table}...`);
      
      // Fetch all rows from SQLite
      const [rows] = await sequelizeSqlite.query(`SELECT * FROM "${table}"`);
      
      if (rows.length === 0) {
        console.log(`   ⏭️  Table ${table} is empty. Skipping.`);
        continue;
      }

      console.log(`   Fetched ${rows.length} rows from SQLite.`);

      // Convert SQLite stringified JSONs back to objects if necessary (Postgres handles JSON natively)
      // Since we fetch raw rows, we just insert them. Sequelize bulkCreate normally handles formatting, 
      // but here we are using raw inserts to bypass model hooks/validations that might alter data.
      
      const placeholders = Object.keys(rows[0]).map(() => '?').join(', ');
      const columns = Object.keys(rows[0]).map(col => `"${col}"`).join(', ');

      let inserted = 0;
      for (const row of rows) {
        try {
          if (table === 'TrainingProgresses' && row.completed !== undefined) {
            row.completed = row.completed === 1;
          }
          // Parse stringified JSON fields if needed, but for raw inserts, Postgres might need them as strings
          // that are valid JSON. We will just pass the values directly.
          await sequelizePg.query(
            `INSERT INTO "${table}" (${columns}) VALUES (${placeholders})`,
            { replacements: Object.values(row) }
          );
          inserted++;
        } catch (e) {
          console.error(`   ❌ Failed to insert row in ${table}: ${e.message}`);
        }
      }
      console.log(`   ✅ Inserted ${inserted}/${rows.length} rows into PostgreSQL.`);
    }

    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

migrate();
