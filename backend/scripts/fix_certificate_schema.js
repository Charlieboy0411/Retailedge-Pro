const sequelize = require('../config/database');

async function fixSchema() {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL database connected successfully.');

    // List of columns in Certificates table to alter to TEXT
    const columnsToAlter = [
      'qrCode',
      'trainerSignatureUrl',
      'authorizedSignatureUrl',
      'companySealUrl',
      'revocationReason',
      'sealPosition'
    ];

    for (const col of columnsToAlter) {
      try {
        await sequelize.query(`ALTER TABLE "Certificates" ALTER COLUMN "${col}" TYPE TEXT;`);
        console.log(`✓ Altered column "${col}" to TYPE TEXT`);
      } catch (err) {
        console.warn(`Column "${col}" note:`, err.message);
      }
    }

    console.log('✅ Schema migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sequelize.close();
  }
}

fixSchema();
