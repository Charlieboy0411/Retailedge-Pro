// ============================================================================
// RETAILEDGE PRO — REGRESSION TEST SUITE: MIGRATION GATE PIPELINE
// Dialect: Isolated Mock Client & Circuit Breaker (Zero Remote Connections)
// ============================================================================

const assert = require('assert');
const path = require('path');
const net = require('net');

// Enforce circuit breaker: block any accidental external port 5432 or RDS traffic
const origConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  let host = '127.0.0.1';
  let port = null;
  if (typeof args[0] === 'object' && args[0] !== null) {
    host = args[0].host || '127.0.0.1';
    port = args[0].port;
  } else if (typeof args[0] === 'number') {
    port = args[0];
    if (typeof args[1] === 'string') host = args[1];
  }
  const isLocal = ['127.0.0.1', 'localhost', '::1'].includes(host);
  if (!isLocal || port === 5432 || (typeof host === 'string' && host.includes('rds.amazonaws.com'))) {
    const err = new Error(`ISOLATION VIOLATION: Outbound connection blocked to ${host}:${port}`);
    err.code = 'ECONNREFUSED';
    process.nextTick(() => this.emit('error', err));
    return this;
  }
  return origConnect.apply(this, args);
};

const migrationGate = require('../scripts/deploy_migration_gate');

async function runTests() {
  console.log('========================================================================');
  console.log('🧪 VERIFYING MIGRATION GATEWAY PIPELINE, BACKUP GATE & RETRY SAFETY');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function testAssert(cond, msg) {
    if (cond) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  // --- 1. Migration Ordering & Definition ---
  console.log('--- 1. Deterministic Migration Ordering ---');
  testAssert(Array.isArray(migrationGate.MIGRATION_PIPELINE), 'Pipeline is an array');
  testAssert(migrationGate.MIGRATION_PIPELINE.length === 2, 'Pipeline contains exactly 2 migrations');
  testAssert(
    migrationGate.MIGRATION_PIPELINE[0].name === '20261021_add_zone_to_participants_and_project_assignments',
    'Migration 1 is 20261021 (Participants & ProjectAssignments)'
  );
  testAssert(
    migrationGate.MIGRATION_PIPELINE[1].name === '20261026_add_zone_to_jitsi_attendance',
    'Migration 2 is 20261026 (JitsiAttendances)'
  );

  // --- 2. Secret Masking ---
  console.log('\n--- 2. Secret Masking Functionality ---');
  testAssert(migrationGate.maskSecret('password123') === 'pa***23', 'Passwords and secrets properly masked');
  testAssert(migrationGate.maskSecret(null) === '***', 'Null secret masked');
  testAssert(migrationGate.maskSecret('') === '***', 'Empty secret masked');

  // --- 3. Schema Verification for 20261021 ---
  console.log('\n--- 3. Catalog Verification: 20261021 ---');
  const valid20261021Client = {
    query: async (sql) => {
      if (sql.includes('information_schema.columns')) {
        return {
          rows: [
            { table_name: 'Participants', column_name: 'zone', data_type: 'character varying', character_maximum_length: 255, is_nullable: 'YES' },
            { table_name: 'ProjectAssignments', column_name: 'zone', data_type: 'character varying', character_maximum_length: 255, is_nullable: 'YES' }
          ]
        };
      }
      if (sql.includes('pg_index')) {
        return {
          rows: [
            {
              table_name: 'ProjectAssignments',
              index_name: 'idx_project_assignments_proj_status_zone',
              is_valid: true,
              is_ready: true,
              index_definition: 'CREATE INDEX idx_project_assignments_proj_status_zone ON "ProjectAssignments" ("projectId", "status", "zone")'
            }
          ]
        };
      }
      return { rows: [] };
    }
  };

  const res20261021 = await migrationGate.verifyCatalog20261021(valid20261021Client);
  testAssert(res20261021.allValid === true, 'Valid 20261021 schema correctly identified as allValid');
  testAssert(res20261021.incompatibleError === null, 'No incompatible error on valid 20261021 schema');

  // --- 4. Schema Verification for 20261026 ---
  console.log('\n--- 4. Catalog Verification: 20261026 ---');
  const valid20261026Client = {
    query: async (sql) => {
      if (sql.includes('information_schema.columns')) {
        return {
          rows: [
            { table_name: 'JitsiAttendances', column_name: 'zone', data_type: 'character varying', character_maximum_length: 255, is_nullable: 'YES' }
          ]
        };
      }
      if (sql.includes('pg_index')) {
        return {
          rows: [
            {
              table_name: 'JitsiAttendances',
              index_name: 'idx_jitsi_attendance_proj_zone',
              is_valid: true,
              is_ready: true,
              index_definition: 'CREATE INDEX idx_jitsi_attendance_proj_zone ON "JitsiAttendances" ("projectId", "zone")'
            },
            {
              table_name: 'JitsiAttendances',
              index_name: 'idx_jitsi_attendance_emp_zone',
              is_valid: true,
              is_ready: true,
              index_definition: 'CREATE INDEX idx_jitsi_attendance_emp_zone ON "JitsiAttendances" ("employeeId", "zone")'
            }
          ]
        };
      }
      return { rows: [] };
    }
  };

  const res20261026 = await migrationGate.verifyCatalog20261026(valid20261026Client);
  testAssert(res20261026.allValid === true, 'Valid 20261026 schema correctly identified as allValid');
  testAssert(res20261026.jitsiZoneValid === true, 'JitsiAttendances.zone is valid');
  testAssert(res20261026.projIndexValid === true, 'idx_jitsi_attendance_proj_zone is valid');
  testAssert(res20261026.empIndexValid === true, 'idx_jitsi_attendance_emp_zone is valid');

  // --- 5. Incompatible Schema Definition Detection ---
  console.log('\n--- 5. Incompatible Schema Conflict Detection ---');
  const incompatibleClient = {
    query: async (sql) => {
      if (sql.includes('information_schema.columns')) {
        return {
          rows: [
            // Conflict: zone is INTEGER and NOT NULL
            { table_name: 'JitsiAttendances', column_name: 'zone', data_type: 'integer', character_maximum_length: null, is_nullable: 'NO' }
          ]
        };
      }
      if (sql.includes('pg_index')) {
        return { rows: [] };
      }
      return { rows: [] };
    }
  };

  const incompRes = await migrationGate.verifyCatalog20261026(incompatibleClient);
  testAssert(incompRes.allValid === false, 'Incompatible schema rejected (allValid = false)');
  testAssert(incompRes.incompatibleError !== null, 'Incompatible schema returns descriptive error');
  testAssert(incompRes.incompatibleError.includes('Incompatible column JitsiAttendances.zone'), 'Error identifies JitsiAttendances.zone conflict');

  // --- 6. Missing Objects Detection ---
  console.log('\n--- 6. Missing Objects Catalog Detection ---');
  const emptyClient = {
    query: async () => ({ rows: [] })
  };
  const emptyRes20261026 = await migrationGate.verifyCatalog20261026(emptyClient);
  testAssert(emptyRes20261026.allValid === false, 'Empty catalog correctly identified as not valid');
  testAssert(emptyRes20261026.incompatibleError === null, 'Missing objects do not trigger incompatibility conflict');

  // --- 7. Backup Gate Failure (Fail-Closed) ---
  console.log('\n--- 7. Backup Gate Failure (Fail Closed) ---');
  const origVerified = process.env.RDS_BACKUP_VERIFIED;
  delete process.env.RDS_BACKUP_VERIFIED;
  delete process.env.RDS_SNAPSHOT_IDENTIFIER;

  let backupFailedAsExpected = false;
  try {
    await migrationGate.ensureBackupOrSnapshot({ host: 'dummy.rds.amazonaws.com', port: 5432, database: 'db', user: 'u', password: 'p' });
  } catch (err) {
    backupFailedAsExpected = true;
    testAssert(err.message.includes('MIGRATION ABORTED'), 'Backup gate fails closed when no verified snapshot exists');
  }
  testAssert(backupFailedAsExpected, 'ensureBackupOrSnapshot halts without snapshot evidence');

  // --- 8. Backup Gate Success with Verified Flag ---
  console.log('\n--- 8. Backup Gate Success with Verification Flag ---');
  process.env.RDS_BACKUP_VERIFIED = 'true';
  const backupSuccessRes = await migrationGate.ensureBackupOrSnapshot({ host: 'dummy.rds.amazonaws.com', port: 5432, database: 'db', user: 'u', password: 'p' });
  testAssert(backupSuccessRes.success === true, 'Backup check succeeds when verified by release operator');
  testAssert(backupSuccessRes.type === 'VERIFIED_RDS_SNAPSHOT_EVIDENCE', 'Records verified backup type');
  testAssert(backupSuccessRes.identifier === 'retaildb', 'Records verified snapshot identifier');
  if (origVerified !== undefined) process.env.RDS_BACKUP_VERIFIED = origVerified;

  // --- 9. Pipeline Idempotency & Retry Safety ---
  console.log('\n--- 9. Pipeline Idempotency & Retry Safety ---');
  const ddlExecuted = [];
  const idempotentClient = {
    query: async (sql) => {
      if (sql.includes('information_schema.columns')) {
        return {
          rows: [
            { table_name: 'Participants', column_name: 'zone', data_type: 'character varying', character_maximum_length: 255, is_nullable: 'YES' },
            { table_name: 'ProjectAssignments', column_name: 'zone', data_type: 'character varying', character_maximum_length: 255, is_nullable: 'YES' },
            { table_name: 'JitsiAttendances', column_name: 'zone', data_type: 'character varying', character_maximum_length: 255, is_nullable: 'YES' }
          ]
        };
      }
      if (sql.includes('pg_index')) {
        return {
          rows: [
            {
              table_name: 'ProjectAssignments',
              index_name: 'idx_project_assignments_proj_status_zone',
              is_valid: true,
              is_ready: true,
              index_definition: 'CREATE INDEX idx_project_assignments_proj_status_zone ON "ProjectAssignments" ("projectId", "status", "zone")'
            },
            {
              table_name: 'JitsiAttendances',
              index_name: 'idx_jitsi_attendance_proj_zone',
              is_valid: true,
              is_ready: true,
              index_definition: 'CREATE INDEX idx_jitsi_attendance_proj_zone ON "JitsiAttendances" ("projectId", "zone")'
            },
            {
              table_name: 'JitsiAttendances',
              index_name: 'idx_jitsi_attendance_emp_zone',
              is_valid: true,
              is_ready: true,
              index_definition: 'CREATE INDEX idx_jitsi_attendance_emp_zone ON "JitsiAttendances" ("employeeId", "zone")'
            }
          ]
        };
      }
      ddlExecuted.push(sql);
      return { rows: [] };
    }
  };

  await migrationGate.runMigrationPipeline(idempotentClient, { host: 'localhost', port: 5432, database: 'db', user: 'u', password: 'p' });
  testAssert(ddlExecuted.length === 0, 'Zero DDL statements executed when schema is already up-to-date');

  // --- 10. Pipeline Halts on Catalog Incompatibility ---
  console.log('\n--- 10. Pipeline Halts on Catalog Incompatibility ---');
  const incompPipelineClient = {
    query: async (sql) => {
      if (sql.includes('information_schema.columns')) {
        return {
          rows: [
            { table_name: 'Participants', column_name: 'zone', data_type: 'character varying', character_maximum_length: 255, is_nullable: 'YES' },
            { table_name: 'ProjectAssignments', column_name: 'zone', data_type: 'character varying', character_maximum_length: 255, is_nullable: 'YES' },
            // Incompatible conflict on JitsiAttendances:
            { table_name: 'JitsiAttendances', column_name: 'zone', data_type: 'integer', character_maximum_length: null, is_nullable: 'NO' }
          ]
        };
      }
      if (sql.includes('pg_index')) {
        return {
          rows: [
            {
              table_name: 'ProjectAssignments',
              index_name: 'idx_project_assignments_proj_status_zone',
              is_valid: true,
              is_ready: true,
              index_definition: 'CREATE INDEX idx_project_assignments_proj_status_zone ON "ProjectAssignments" ("projectId", "status", "zone")'
            }
          ]
        };
      }
      return { rows: [] };
    }
  };

  let pipelineHalted = false;
  try {
    await migrationGate.runMigrationPipeline(incompPipelineClient, { host: 'localhost', port: 5432, database: 'db', user: 'u', password: 'p' });
  } catch (err) {
    pipelineHalted = true;
    testAssert(err.message.includes('Aborting due to catalog conflict'), 'Pipeline halts with catalog conflict error');
  }
  testAssert(pipelineHalted === true, 'Pipeline fail-closed behavior verified');

  console.log('\n========================================================================');
  console.log(`📊 MIGRATION GATE TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
