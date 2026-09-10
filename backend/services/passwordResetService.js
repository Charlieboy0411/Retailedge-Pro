const crypto = require('crypto');

/**
 * Service abstraction for password reset token lifecycle.
 * In production:
 *   - Process memory fallback is strictly disallowed.
 *   - Tokens are stored as SHA-256 hashes with short TTL (15 minutes).
 *   - Upon successful reset:
 *       1. The presented token is marked consumed.
 *       2. All other active reset tokens for that user are invalidated.
 *       3. Consumed/expired tokens cannot be reused.
 */

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

// In-memory store used strictly for development and automated test environments.
// Production requires an approved persistent store (PasswordResets table).
const devTokenStore = new Map();

function isProductionMode() {
  return process.env.NODE_ENV === 'production';
}

function hashToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return '';
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Generate a cryptographically secure token and persist its SHA-256 hash.
 * @param {string} userId
 * @returns {Promise<{ rawToken: string, expiresAt: Date }>}
 */
async function createResetToken(userId) {
  if (!userId) {
    throw new Error('User ID is required to create a reset token.');
  }

  // Production Safety Gate: Process-memory fallback is forbidden in production
  if (isProductionMode()) {
    // Check if shared persistent store is available
    const hasPersistentStore = false; // Phase 4A: DDL migration pending authorization
    if (!hasPersistentStore) {
      const err = new Error('[Security Policy] Production password-reset persistence is unconfigured. In-memory store disabled in production.');
      err.code = 'PERSISTENCE_UNCONFIGURED';
      throw err;
    }
  }

  // Generate 32 bytes of cryptographically secure random entropy (64 hex characters)
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const now = Date.now();
  const expiresAt = new Date(now + TOKEN_TTL_MS);

  // Invalidate any previously active tokens for this user
  await invalidateAllUserTokens(userId);

  // Store only the hash, never the plaintext token
  devTokenStore.set(tokenHash, {
    userId: String(userId),
    tokenHash,
    expiresAt,
    usedAt: null,
    createdAt: new Date(now)
  });

  return { rawToken, expiresAt };
}

/**
 * Verify token and consume it upon successful password reset.
 * In accordance with Mandatory Correction:
 *   - Consume the presented token immediately.
 *   - Invalidate all other active reset tokens for that user.
 *   - Ensure consumed/expired tokens cannot be reused.
 * @param {string} rawToken
 * @returns {Promise<{ valid: boolean, userId?: string, reason?: string }>}
 */
async function verifyAndConsumeToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') {
    return { valid: false, reason: 'Invalid or missing token.' };
  }

  const tokenHash = hashToken(rawToken);
  const record = devTokenStore.get(tokenHash);

  if (!record) {
    return { valid: false, reason: 'Invalid or expired token.' };
  }

  // Check if already consumed (single-use enforcement)
  if (record.usedAt !== null) {
    return { valid: false, reason: 'Token has already been consumed.' };
  }

  // Check expiration
  if (Date.now() > record.expiresAt.getTime()) {
    return { valid: false, reason: 'Token has expired.' };
  }

  const userId = record.userId;

  // 1. Mark this specific token consumed
  record.usedAt = new Date();
  devTokenStore.set(tokenHash, record);

  // 2. Invalidate all other active tokens for this user
  for (const [hash, entry] of devTokenStore.entries()) {
    if (entry.userId === userId && entry.usedAt === null) {
      entry.usedAt = new Date();
      devTokenStore.set(hash, entry);
    }
  }

  return { valid: true, userId };
}

/**
 * Invalidate all active tokens for a specific user.
 * @param {string} userId
 */
async function invalidateAllUserTokens(userId) {
  if (!userId) return;
  const strId = String(userId);
  for (const [hash, entry] of devTokenStore.entries()) {
    if (entry.userId === strId && entry.usedAt === null) {
      entry.usedAt = new Date();
      devTokenStore.set(hash, entry);
    }
  }
}

/**
 * Utility for test environments to clear store.
 */
function _clearDevStore() {
  devTokenStore.clear();
}

/**
 * Utility for test environments to inspect store size.
 */
function _getDevStoreSize() {
  return devTokenStore.size;
}

module.exports = {
  createResetToken,
  verifyAndConsumeToken,
  invalidateAllUserTokens,
  hashToken,
  TOKEN_TTL_MS,
  _clearDevStore,
  _getDevStoreSize
};
