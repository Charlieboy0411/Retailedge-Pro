/**
 * RETAILEDGE PRO — PRODUCTION MIGRATION GATEWAY & BACKUP VERIFIER
 *
 * Executed on the production EC2 host during the deployment workflow.
 *
 * Order of operations:
 * 1. Verify target production database identity (masking all credentials).
 * 2. Pre-inspect database schema:
 *    - If zone columns and composite index already exist with valid definitions,
 *      verify and exit 0 (idempotent, safe).
 *    - If objects exist with unexpected or conflicting definitions, abort and fail closed.
 * 3. Verify / create recoverable database backup:
 *    - Check for AWS CLI and IAM snapshot permissions; create and wait for manual snapshot.
 *    - If AWS CLI lacks IAM permissions, verify logical pg_dump backup capability.
 *    - If no backup can be created or verified, halt with exit code 1.
 * 4. Apply SQL migration on a single connection with 5s lock_timeout and 30s statement_timeout.
 * 5. Independently verify column types, nullability, and index validity.
 * 6. Exit code 0 only upon verified schema compatibility; exit code 1 on any failure.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Client } = require('pg');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const MIGRATION_PATH = path.join(__dirname, '../migrations/20261021_add_zone_to_participants_and_project_assignments.sql');

function maskSecret(val) {
  if (!val) return '***';
  return val.length > 4 ? `${val.slice(0, 2)}***${val.slice(-2)}` : '***';
}

function getDbConfig() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const database = process.env.DB_NAME || 'quizhive';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASS || process.env.DB_PASSWORD || '';
  const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;

  return { host, port, database, user, password, ssl };
}

async function verifySchema(client) {
  // 1. Check Columns
  const colQuery = `
    SELECT table_name, column_name, data_type, character_maximum_length, is_nullable
    FROM information_schema.columns
    WHERE table_name IN ('Participants', 'ProjectAssignments')
      AND column_name = 'zone';
  `;
  const colRes = await client.query(colQuery);
  const participantZone = colRes.rows.find(r => r.table_name === 'Participants');
  const assignmentZone = colRes.rows.find(r => r.table_name === 'ProjectAssignments');

  // 2. Check Index
  const idxQuery = `
    SELECT
      t.relname AS table_name,
      i.relname AS index_name,
      ix.indisvalid AS is_valid,
      ix.indisready AS is_ready,
      pg_get_indexdef(ix.indexrelid) AS index_definition
    FROM pg_index ix
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_class t ON t.oid = ix.indrelid
    WHERE i.relname = 'idx_project_assignments_proj_status_zone';
  `;
  const idxRes = await client.query(idxQuery);
  const compositeIndex = idxRes.rows[0];

  const participantZoneValid = participantZone &&
    participantZone.data_type === 'character varying' &&
    participantZone.character_maximum_length === 255 &&
    participantZone.is_nullable === 'YES';

  const assignmentZoneValid = assignmentZone &&
    assignmentZone.data_type === 'character varying' &&
    assignmentZone.character_maximum_length === 255 &&
    assignmentZone.is_nullable === 'YES';

  const indexValid = compositeIndex &&
    compositeIndex.table_name === 'ProjectAssignments' &&
    compositeIndex.is_valid === true &&
    compositeIndex.is_ready === true &&
    compositeIndex.index_definition.includes('projectId') &&
    compositeIndex.index_definition.includes('status') &&
    compositeIndex.index_definition.includes('zone');

  const allValid = participantZoneValid && assignmentZoneValid && indexValid;
  const anyPresent = !!(participantZone || assignmentZone || compositeIndex);

  return {
    allValid,
    anyPresent,
    participantZone,
    assignmentZone,
    compositeIndex,
    participantZoneValid,
    assignmentZoneValid,
    indexValid
  };
}

async function ensureBackupOrSnapshot(dbConfig) {
  console.log('\n--- Step 2: Backup & Snapshot Readiness Check ---');

  // 1. Try AWS CLI for RDS Snapshot
  let awsAvailable = false;
  try {
    const awsVer = execSync('aws --version', { stdio: 'pipe' }).toString().trim();
    console.log(`[BACKUP] AWS CLI detected: ${awsVer}`);
    awsAvailable = true;
  } catch (err) {
    console.log('[BACKUP] AWS CLI is not installed or not in PATH.');
  }

  if (awsAvailable) {
    try {
      const callerId = execSync('aws sts get-caller-identity --output text', { stdio: 'pipe' }).toString().trim();
      console.log(`[BACKUP] AWS IAM Identity verified: ${callerId.split('\t')[0] || 'Active session'}`);

      // Extract DB instance identifier from host (e.g. retailedgepro-db.ctdrw76fsnhe.ap-south-1.rds.amazonaws.com -> retailedgepro-db)
      const instanceIdentifier = dbConfig.host.split('.')[0];
      const snapshotIdentifier = `retailedgepro-pre-migration-${Date.now()}`;
      const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-south-1';

      console.log(`[BACKUP] Requesting RDS snapshot "${snapshotIdentifier}" for instance "${instanceIdentifier}" (Region: ${region})...`);
      execSync(`aws rds create-db-snapshot --db-instance-identifier "${instanceIdentifier}" --db-snapshot-identifier "${snapshotIdentifier}" --region "${region}"`, { stdio: 'pipe' });

      console.log(`[BACKUP] Waiting for RDS snapshot "${snapshotIdentifier}" to become available...`);
      execSync(`aws rds wait db-snapshot-available --db-instance-identifier "${instanceIdentifier}" --db-snapshot-identifier "${snapshotIdentifier}" --region "${region}"`, { stdio: 'pipe' });

      console.log(`[BACKUP] RDS snapshot "${snapshotIdentifier}" is AVAILABLE and verified.`);
      return { success: true, type: 'RDS_SNAPSHOT', identifier: snapshotIdentifier };
    } catch (err) {
      console.warn(`[BACKUP] AWS CLI could not complete RDS snapshot: ${err.message}`);
    }
  }

  // 2. Fallback: Logical pg_dump backup on EC2
  console.log('[BACKUP] Attempting logical database backup using pg_dump on host...');
  try {
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup_pre_migration_${timestamp}.sql`);

    const env = { ...process.env, PGPASSWORD: dbConfig.password };
    const pgDumpCmd = `pg_dump -h "${dbConfig.host}" -p "${dbConfig.port}" -U "${dbConfig.user}" -d "${dbConfig.database}" -F p --no-owner --no-acl -f "${backupFile}"`;
    execSync(pgDumpCmd, { env, stdio: 'pipe' });

    if (fs.existsSync(backupFile)) {
      const stats = fs.statSync(backupFile);
      if (stats.size > 1024) {
        console.log(`[BACKUP] Logical backup created successfully: ${backupFile} (${(stats.size / 1024).toFixed(1)} KB)`);
        return { success: true, type: 'PG_DUMP', file: backupFile };
      }
    }
  } catch (err) {
    console.warn(`[BACKUP] pg_dump backup attempt failed: ${err.message}`);
  }

  // 3. Fallback: Check if an automated RDS backup was verified by human operator
  if (process.env.RDS_BACKUP_VERIFIED === 'true') {
    console.log('[BACKUP] RDS automated backup window verified by release operator (RDS_BACKUP_VERIFIED=true).');
    return { success: true, type: 'MANUALLY_VERIFIED_RDS' };
  }

  throw new Error(
    'MIGRATION ABORTED: Could not verify or create a production database backup. ' +
    'Neither an AWS RDS snapshot nor a local pg_dump could be completed automatically. ' +
    'Take a manual snapshot in AWS RDS or set RDS_BACKUP_VERIFIED=true in backend/.env before proceeding.'
  );
}

async function run() {
  console.log('========================================================================');
  console.log('🛡️  RETAILEDGE PRO — PRODUCTION MIGRATION GATEWAY');
  console.log('========================================================================\n');

  const dbConfig = getDbConfig();
  console.log('--- Step 1: Target Database Identity Verification ---');
  console.log(`  Database Host:     ${dbConfig.host}`);
  console.log(`  Database Port:     ${dbConfig.port}`);
  console.log(`  Database Name:     ${dbConfig.database}`);
  console.log(`  Database User:     ${dbConfig.user}`);
  console.log(`  SSL Enabled:       ${dbConfig.ssl ? 'Yes (rejectUnauthorized: false)' : 'No'}`);

  if (!fs.existsSync(MIGRATION_PATH)) {
    throw new Error(`Migration SQL file not found at: ${MIGRATION_PATH}`);
  }

  const client = new Client(dbConfig);
  try {
    await client.connect();
    console.log('  [PASS] Successfully established PostgreSQL connection.');
  } catch (err) {
    console.error(`  [FAIL] Failed to connect to database: ${err.message}`);
    process.exit(1);
  }

  try {
    // Check current schema state
    console.log('\n--- Step 2: Pre-Migration Schema Inspection ---');
    const preCheck = await verifySchema(client);

    if (preCheck.allValid) {
      console.log('  ✅ Schema is ALREADY up to date and verified:');
      console.log('     - "Participants"."zone" (VARCHAR(255), NULLABLE) exists');
      console.log('     - "ProjectAssignments"."zone" (VARCHAR(255), NULLABLE) exists');
      console.log('     - "idx_project_assignments_proj_status_zone" (VALID) exists');
      console.log('\nMigration execution is NOT required. Proceeding safely to application deployment.\n');
      await client.end();
      process.exit(0);
    }

    if (preCheck.anyPresent && !preCheck.allValid) {
      console.error('  ❌ UNEXPECTED SCHEMA STATE DETECTED:');
      if (preCheck.participantZone && !preCheck.participantZoneValid) {
        console.error(`     - "Participants"."zone" has unexpected definition: type=${preCheck.participantZone.data_type}, length=${preCheck.participantZone.character_maximum_length}, nullable=${preCheck.participantZone.is_nullable}`);
      }
      if (preCheck.assignmentZone && !preCheck.assignmentZoneValid) {
        console.error(`     - "ProjectAssignments"."zone" has unexpected definition: type=${preCheck.assignmentZone.data_type}, length=${preCheck.assignmentZone.character_maximum_length}, nullable=${preCheck.assignmentZone.is_nullable}`);
      }
      if (preCheck.compositeIndex && !preCheck.indexValid) {
        console.error(`     - Index "idx_project_assignments_proj_status_zone" exists but is INVALID (is_valid=${preCheck.compositeIndex.is_valid})`);
      }
      throw new Error('Conflicting or invalid pre-existing database objects found. Stop and investigate with DBA before retrying.');
    }

    console.log('  [INFO] Target columns and index are absent. Migration is required.');

    // Ensure recoverable backup exists
    await ensureBackupOrSnapshot(dbConfig);

    // Apply Migration
    console.log('\n--- Step 3: Applying SQL Migration Transaction ---');
    console.log(`  Executing: ${MIGRATION_PATH}`);

    // Set lock_timeout and statement_timeout on the EXACT SAME client connection
    console.log('  Enforcing session timeouts: lock_timeout = 5s, statement_timeout = 30s');
    await client.query("SET lock_timeout = '5s'; SET statement_timeout = '30s';");

    const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    await client.query(migrationSql);
    console.log('  ✅ SQL migration transaction committed successfully.');

    // Step 4: Independent Post-Migration Verification
    console.log('\n--- Step 4: Post-Migration Schema Verification ---');
    const postCheck = await verifySchema(client);

    if (!postCheck.allValid) {
      console.error('  ❌ POST-MIGRATION VERIFICATION FAILED:');
      console.error(`     - Participants.zone valid:       ${postCheck.participantZoneValid}`);
      console.error(`     - ProjectAssignments.zone valid: ${postCheck.assignmentZoneValid}`);
      console.error(`     - Composite index valid:          ${postCheck.indexValid}`);
      throw new Error('Database schema verification failed after migration execution.');
    }

    console.log('  ✅ VERIFIED: "Participants"."zone" has type VARCHAR(255) and is NULLABLE.');
    console.log('  ✅ VERIFIED: "ProjectAssignments"."zone" has type VARCHAR(255) and is NULLABLE.');
    console.log('  ✅ VERIFIED: "idx_project_assignments_proj_status_zone" is VALID and targets (projectId, status, zone).');
    console.log('\n========================================================================');
    console.log('🎉 DATABASE MIGRATION & SCHEMA VERIFICATION COMPLETE (PROCEED TO DEPLOY)');
    console.log('========================================================================\n');

    await client.end();
    process.exit(0);

  } catch (err) {
    console.error('\n🚨 MIGRATION GATE FATAL ERROR:', err.message);

    // Attempt to inspect schema state to report actual transaction outcome
    try {
      const inspectCheck = await verifySchema(client);
      console.error('\nCurrent Post-Failure Schema State:');
      console.error(`  - Participants.zone:        ${inspectCheck.participantZone ? 'PRESENT' : 'ABSENT'}`);
      console.error(`  - ProjectAssignments.zone: ${inspectCheck.assignmentZone ? 'PRESENT' : 'ABSENT'}`);
      console.error(`  - Index valid:              ${inspectCheck.indexValid ? 'YES' : 'NO'}`);
    } catch (ignore) {
      // client may already be disconnected
    }

    await client.end().catch(() => {});
    process.exit(1);
  }
}

run();
