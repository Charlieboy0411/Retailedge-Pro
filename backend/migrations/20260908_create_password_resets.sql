-- ============================================================================
-- RetailEdge PRO — Database Migration (PREPARED ONLY — DO NOT RUN IN PHASE 4A)
-- Target Table: PasswordResets
-- Purpose: Persistent, audit-compliant storage for hashed password reset tokens
-- Author: Security Remediation Phase 4A
-- Date: 2026-09-08
--
-- STATUS: PREPARED / BLOCKED
-- In accordance with Phase 4A Operational Rules:
-- "Do NOT execute production DDL during Phase 4A.
--  Prepare the PasswordResets migration;
--  mark production password-reset completion BLOCKED pending authorized DDL
--  and persistence configuration."
-- ============================================================================

-- DDL STATEMENT (To be executed ONLY upon explicit governance authorization):

CREATE TABLE IF NOT EXISTS "PasswordResets" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "usedAt" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Unique index to prevent duplicate token hashes and ensure O(1) lookup
CREATE UNIQUE INDEX IF NOT EXISTS "idx_password_resets_token_hash" 
ON "PasswordResets" ("tokenHash");

-- Index on userId to support fast invalidation of previous user tokens
CREATE INDEX IF NOT EXISTS "idx_password_resets_user_id" 
ON "PasswordResets" ("userId");

-- Index on expiresAt to support periodic cleanup of stale tokens
CREATE INDEX IF NOT EXISTS "idx_password_resets_expires_at" 
ON "PasswordResets" ("expiresAt");

COMMENT ON TABLE "PasswordResets" IS 'Stores SHA-256 hashed single-use password reset tokens with 15-minute TTL';
COMMENT ON COLUMN "PasswordResets"."tokenHash" IS 'Hexadecimal SHA-256 digest of the 32-byte cryptographic entropy token';
COMMENT ON COLUMN "PasswordResets"."usedAt" IS 'Timestamp when the token was consumed. If non-null, token cannot be reused.';
