-- ============================================================================
-- RETAILEDGE PRO — PRODUCTION SCHEMA COMPATIBILITY MIGRATION
-- Migration Name: 20261026_add_zone_to_jitsi_attendance.sql
-- Database Dialect: PostgreSQL (AWS RDS)
-- ============================================================================
--
-- Objective: Add backward-compatible, nullable 'zone' column to:
--   "JitsiAttendances" (stores authoritative zone captured at session join)
--
-- Prerequisites:
--   - PostgreSQL 12+
--   - Executed within a database transaction
--   - Full pre-deployment backup verified
--
-- Rollback Strategy:
--   See rollback section at the bottom of this file.
-- ============================================================================

BEGIN;

-- 1. Add nullable 'zone' to "JitsiAttendances" table
-- Allows legacy records and unmapped historical telemetry to remain NULL safely.
ALTER TABLE "JitsiAttendances"
  ADD COLUMN IF NOT EXISTS "zone" VARCHAR(255) DEFAULT NULL;

COMMENT ON COLUMN "JitsiAttendances"."zone" IS
  'Authoritative zone recorded during attendee meeting join and reconciled with participant roster';

-- 2. Performance index for zone-filtered attendance reporting
CREATE INDEX IF NOT EXISTS "idx_jitsi_attendance_proj_zone"
  ON "JitsiAttendances" ("projectId", "zone");

CREATE INDEX IF NOT EXISTS "idx_jitsi_attendance_emp_zone"
  ON "JitsiAttendances" ("employeeId", "zone");

COMMIT;

-- ============================================================================
-- ROLLBACK & SAFE RECOVERY PROCEDURE
-- ============================================================================
-- IMPORTANT DATA SAFETY RULE:
-- DO NOT drop the "zone" column if live attendance records have been written,
-- as DROP COLUMN permanently deletes historical zone attendance telemetry.
--
-- Scenario A: Application Code Rollback (Recommended & Safe)
-- If the application deployment must be rolled back, LEAVE the "zone" column
-- in the database. Because "zone" is NULLABLE with a default of NULL:
--   - Prior application versions continue functioning normally without errors.
--   - No attendance or zone telemetry data is lost.
--   - Re-deploying the fix later requires zero database downtime.
--
-- Scenario B: Index Cleanup (Safe - no data loss)
-- If query performance tuning is required during an incident:
-- BEGIN;
-- DROP INDEX IF EXISTS "idx_jitsi_attendance_emp_zone";
-- DROP INDEX IF EXISTS "idx_jitsi_attendance_proj_zone";
-- COMMIT;
--
-- Scenario C: Destructive Column Removal (ONLY after verified data backup)
-- Execute ONLY if the migration was run in error AND verified that no data exists:
--
-- 1. Verify no attendance records have captured zone data:
--    SELECT COUNT(*) FROM "JitsiAttendances" WHERE "zone" IS NOT NULL;
--
-- 2. If COUNT > 0, backup the zone associations first:
--    CREATE TABLE "JitsiAttendances_zone_backup" AS
--      SELECT "id", "employeeId", "projectId", "zone", "createdAt"
--      FROM "JitsiAttendances" WHERE "zone" IS NOT NULL;
--
-- 3. Only then, execute schema revert:
-- BEGIN;
-- DROP INDEX IF EXISTS "idx_jitsi_attendance_emp_zone";
-- DROP INDEX IF EXISTS "idx_jitsi_attendance_proj_zone";
-- ALTER TABLE "JitsiAttendances" DROP COLUMN IF EXISTS "zone";
-- COMMIT;
