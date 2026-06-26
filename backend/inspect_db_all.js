const sequelize = require('./config/database');

async function inspectAll() {
  try {
    await sequelize.authenticate();
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();
    console.log('=============================================');
    console.log('          QUIZHIVE DATABASE TABLES           ');
    console.log('=============================================');
    console.log(`Found tables: ${tables.join(', ')}\n`);
    
    for (const table of tables) {
      const rows = await sequelize.query(`SELECT * FROM "${table}"`, {
        type: sequelize.QueryTypes.SELECT
      });
      console.log(`---------------------------------------------`);
      console.log(` TABLE: ${table} (${rows.length} total rows)`);
      console.log(`---------------------------------------------`);
      if (rows.length === 0) {
        console.log('(Empty Table)\n');
      } else {
        console.table(rows);
        console.log('\n');
      }
    }
  } catch (error) {
    console.error('Error inspecting database:', error);
  } finally {
    process.exit(0);
  }
}

inspectAll();
