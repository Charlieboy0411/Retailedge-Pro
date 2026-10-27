-- ============================================================================
-- RETAILEDGE PRO — MIGRATION: 20261027_add_trainer_and_scheduling_to_trainings.sql
-- Description: Add trainerId, createdBy, platform, and status columns to Trainings
--              with lookup and composite indexes.
-- Idempotent: Uses IF NOT EXISTS for all columns and indexes.
-- Non-Destructive: All columns are nullable or have sensible defaults.
-- ============================================================================

-- 1. Add trainerId column referencing Users (nullable for non-meeting or historical records)
ALTER TABLE "Trainings" ADD COLUMN IF NOT EXISTS "trainerId" UUID REFERENCES "Users"("id") ON DELETE SET NULL;

-- 2. Add createdBy audit column referencing Users (nullable for historical records)
ALTER TABLE "Trainings" ADD COLUMN IF NOT EXISTS "createdBy" UUID REFERENCES "Users"("id") ON DELETE SET NULL;

-- 3. Add platform column for meeting provider ('google_meet', 'jitsi', etc.)
ALTER TABLE "Trainings" ADD COLUMN IF NOT EXISTS "platform" VARCHAR(50) DEFAULT 'google_meet';

-- 4. Add status column for meeting lifecycle ('Scheduled', 'Ongoing', 'Completed', 'Cancelled')
ALTER TABLE "Trainings" ADD COLUMN IF NOT EXISTS "status" VARCHAR(50) DEFAULT 'Scheduled';

-- 5. Index on trainerId for fast trainer dashboard & calendar lookups
CREATE INDEX IF NOT EXISTS "idx_trainings_trainer_id" ON "Trainings" ("trainerId");

-- 6. Composite index on (projectId, trainerId) for project-scoped trainer session queries
CREATE INDEX IF NOT EXISTS "idx_trainings_proj_trainer" ON "Trainings" ("projectId", "trainerId");

-- ============================================================================
-- SAFE ROLLBACK GUIDANCE:
-- In the event of a rollback, DO NOT DROP columns if training sessions have been
-- assigned to trainers. The columns are nullable with non-destructive defaults.
-- To revert indexes only:
--   DROP INDEX IF EXISTS "idx_trainings_proj_trainer";
--   DROP INDEX IF EXISTS "idx_trainings_trainer_id";
-- If full DDL rollback is explicitly required and verified safe:
--   ALTER TABLE "Trainings" DROP COLUMN IF EXISTS "trainerId";
--   ALTER TABLE "Trainings" DROP COLUMN IF EXISTS "createdBy";
--   ALTER TABLE "Trainings" DROP COLUMN IF EXISTS "platform";
--   ALTER TABLE "Trainings" DROP COLUMN IF EXISTS "status";
-- ============================================================================
