-- ============================================================================
-- RETAILEDGE PRO — PRODUCTION SCHEMA COMPATIBILITY MIGRATION
-- Migration Name: 20261021_add_zone_to_participants_and_project_assignments.sql
-- Database Dialect: PostgreSQL (AWS RDS)
-- ============================================================================
--
-- Objective: Add backward-compatible, nullable 'zone' columns to:
--   1. "Participants" (stores authoritative zone from quiz submission)
--   2. "ProjectAssignments" (stores authoritative zone for project stakeholders)
--
-- Prerequisites:
--   - PostgreSQL 12+
--   - Executed within a transaction
--   - Review and operational approval prior to production execution
--
-- Rollback Strategy:
--   See rollback section at the bottom of this file.
-- ============================================================================

BEGIN;

-- 1. Add nullable 'zone' to "Participants" table
-- Allows legacy records and future unmapped submissions to remain NULL.
ALTER TABLE "Participants"
  ADD COLUMN IF NOT EXISTS "zone" VARCHAR(255) DEFAULT NULL;

COMMENT ON COLUMN "Participants"."zone" IS
  'Authoritative zone recorded directly during learner session/quiz submission';

-- 2. Add nullable 'zone' to "ProjectAssignments" table
-- Allows project stakeholders (Client, PM, Supervisor) to be mapped to a specific zone.
ALTER TABLE "ProjectAssignments"
  ADD COLUMN IF NOT EXISTS "zone" VARCHAR(255) DEFAULT NULL;

COMMENT ON COLUMN "ProjectAssignments"."zone" IS
  'Designated project zone assigned to stakeholder (e.g., North, South, East, West)';

-- 3. Composite performance index on ProjectAssignments
-- Supports fast stakeholder directory queries by (projectId, status, zone)
CREATE INDEX IF NOT EXISTS "idx_project_assignments_proj_status_zone"
  ON "ProjectAssignments" ("projectId", "status", "zone");

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (Execute ONLY if rollback is required)
-- ============================================================================
-- BEGIN;
-- DROP INDEX IF EXISTS "idx_project_assignments_proj_status_zone";
-- ALTER TABLE "ProjectAssignments" DROP COLUMN IF EXISTS "zone";
-- ALTER TABLE "Participants" DROP COLUMN IF EXISTS "zone";
-- COMMIT;
