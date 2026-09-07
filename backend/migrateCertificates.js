const sequelize = require('./config/database');

async function migrate() {
  try {
    const qi = sequelize.getQueryInterface();
    const table = await qi.describeTable('Certificates');
    console.log('Existing columns:', Object.keys(table));

    const columnsToAdd = {
      certificate_id: { type: sequelize.Sequelize.STRING, allowNull: true },
      clientId: { type: sequelize.Sequelize.UUID, allowNull: true },
      trainingId: { type: sequelize.Sequelize.UUID, allowNull: true },
      batchName: { type: sequelize.Sequelize.STRING, defaultValue: 'Batch-01' },
      trainerId: { type: sequelize.Sequelize.UUID, allowNull: true },
      templateId: { type: sequelize.Sequelize.STRING, defaultValue: 'corporate' },
      expiryDate: { type: sequelize.Sequelize.DATEONLY, allowNull: true },
      assessmentScore: { type: sequelize.Sequelize.FLOAT, defaultValue: 85 },
      attendancePercentage: { type: sequelize.Sequelize.FLOAT, defaultValue: 95 },
      completionPercentage: { type: sequelize.Sequelize.FLOAT, defaultValue: 100 },
      status: { type: sequelize.Sequelize.STRING, defaultValue: 'ISSUED' },
      verificationToken: { type: sequelize.Sequelize.STRING, allowNull: true },
      pdfPath: { type: sequelize.Sequelize.STRING, allowNull: true },
      signatoryName: { type: sequelize.Sequelize.STRING, defaultValue: 'Mohit Tiku' },
      signatoryDesignation: { type: sequelize.Sequelize.STRING, defaultValue: 'Managing Director' },
      trainerName: { type: sequelize.Sequelize.STRING, defaultValue: 'Aakash Verma' },
      revocationReason: { type: sequelize.Sequelize.TEXT, allowNull: true },
      revokedAt: { type: sequelize.Sequelize.DATE, allowNull: true },
      revokedBy: { type: sequelize.Sequelize.STRING, allowNull: true },
      reissuedFromId: { type: sequelize.Sequelize.STRING, allowNull: true },
      replacedById: { type: sequelize.Sequelize.STRING, allowNull: true },
      metadata: { type: sequelize.Sequelize.JSON, allowNull: true },
      createdBy: { type: sequelize.Sequelize.UUID, allowNull: true }
    };

    for (const [col, def] of Object.entries(columnsToAdd)) {
      if (!table[col]) {
        console.log(`Adding missing column: ${col}`);
        await qi.addColumn('Certificates', col, def);
      }
    }

    // Sync all models including CertificateTemplate and CertificateAuditLog
    await sequelize.sync();

    // Populate existing records with certificate_id if null
    const [existing] = await sequelize.query(`SELECT id FROM "Certificates" WHERE certificate_id IS NULL`);
    for (let i = 0; i < existing.length; i++) {
      const row = existing[i];
      const certId = `REP-2026-${String(i + 1).padStart(6, '0')}`;
      const token = `token-${row.id}`;
      await sequelize.query(`UPDATE "Certificates" SET certificate_id = '${certId}', "verificationToken" = '${token}', status = 'ISSUED' WHERE id = '${row.id}'`);
    }

    console.log('✅ Certificate database migration and sync completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
