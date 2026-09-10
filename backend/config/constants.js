// Shared constants — imported by auth routes, middleware, and sockets.
// In production, JWT_SECRET must be provided via process.env.JWT_SECRET.
// Missing or placeholder secrets will halt server startup.
require('dotenv').config();

const INSECURE_PLACEHOLDERS = [
  'super-secret-quizhive-key-2026',
  'your_jwt_secret_key',
  'fallback_secret',
  'secret',
  'password',
  'changeme',
  'default_secret',
  '12345678'
];

function validateJwtSecret(secret, nodeEnv = process.env.NODE_ENV) {
  const isProduction = nodeEnv === 'production';
  const cleanSecret = secret ? String(secret).trim() : '';

  if (isProduction) {
    if (!cleanSecret) {
      throw new Error('[Security Error] Production JWT_SECRET is missing or empty. Server startup halted.');
    }
    if (INSECURE_PLACEHOLDERS.some(p => cleanSecret.toLowerCase() === p.toLowerCase())) {
      throw new Error('[Security Error] Production JWT_SECRET is using a known insecure default/placeholder. Server startup halted.');
    }
    return cleanSecret;
  }

  // Development / Test environments
  if (cleanSecret) {
    return cleanSecret;
  }

  // Fallback ONLY in non-production mode
  return 'dev-only-local-secret-key-do-not-use-in-production';
}

function getJwtSecret() {
  return validateJwtSecret(process.env.JWT_SECRET, process.env.NODE_ENV);
}

// Evaluate on module load
const JWT_SECRET = getJwtSecret();

module.exports = {
  JWT_SECRET,
  getJwtSecret,
  validateJwtSecret,
  INSECURE_PLACEHOLDERS
};
