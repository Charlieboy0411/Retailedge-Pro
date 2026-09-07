const sequelize = require('./config/database');
const SignatureAsset = require('./models/SignatureAsset');
const Certificate = require('./models/Certificate');

async function migrate() {
  try {
    console.log('🔄 Checking database columns for Certificates & SignatureAssets...');

    const qi = sequelize.getQueryInterface();

    // 1. Sync SignatureAsset table
    await SignatureAsset.sync({ alter: true });
    console.log('✅ SignatureAssets table synced.');

    // 2. Add columns to Certificates if missing
    const tableInfo = await qi.describeTable('Certificates');

    const newColumns = [
      { name: 'templateVersion', type: 'VARCHAR(255) DEFAULT \'1.0\'' },
      { name: 'signatureAssetId', type: 'VARCHAR(255)' },
      { name: 'sealAssetId', type: 'VARCHAR(255)' },
      { name: 'trainerSignatureUrl', type: 'TEXT' },
      { name: 'authorizedSignatureUrl', type: 'TEXT' },
      { name: 'companySealUrl', type: 'TEXT' },
      { name: 'includeTrainerSignature', type: 'BOOLEAN DEFAULT TRUE' },
      { name: 'includeCompanySeal', type: 'BOOLEAN DEFAULT TRUE' },
      { name: 'sealPosition', type: 'VARCHAR(255) DEFAULT \'bottom-right\'' },
      { name: 'certificateSnapshot', type: 'JSONB' }
    ];

    for (const col of newColumns) {
      if (!tableInfo[col.name]) {
        console.log(`Adding column ${col.name} to Certificates...`);
        await sequelize.query(`ALTER TABLE "Certificates" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type};`);
      }
    }

    // 3. Seed default approved signature and seal assets if empty
    const count = await SignatureAsset.count();
    if (count === 0) {
      console.log('Seeding approved signatures & official Idonneous company seal...');
      
      // Default Authorized Signatory (Mohit Tiku)
      await SignatureAsset.create({
        type: 'authorized_signatory',
        name: 'Mohit Tiku',
        designation: 'Managing Director',
        organization: 'Idonneous Marketing Services Pvt. Ltd.',
        assetPath: '/assets/signatures/mohit_tiku_signature.png',
        version: 'V1',
        isDefault: true,
        status: 'Active',
        createdBy: 'System Super Admin'
      });

      // Default Trainer Signature (Aakash Verma)
      await SignatureAsset.create({
        type: 'trainer_signature',
        name: 'Aakash Verma',
        designation: 'Lead Trainer & Retail Facilitator',
        organization: 'RetailEdge Pro',
        assetPath: '/assets/signatures/aakash_verma_signature.png',
        version: 'V1',
        isDefault: true,
        status: 'Active',
        createdBy: 'System Super Admin'
      });

      // Default Official Idonneous Company Seal
      await SignatureAsset.create({
        type: 'company_seal',
        name: 'Idonneous Official Corporate Seal',
        designation: 'Official Seal of Certification',
        organization: 'Idonneous Marketing Services Pvt. Ltd.',
        assetPath: '/assets/seals/idonneous_official_seal.png',
        version: 'V1',
        isDefault: true,
        status: 'Active',
        createdBy: 'System Super Admin'
      });
      console.log('✅ Approved signatures & official seal seeded.');
    }

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
