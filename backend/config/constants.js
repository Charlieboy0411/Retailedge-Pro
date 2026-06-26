// Shared constants — imported by both auth routes and auth middleware
// to avoid circular dependency between the two modules.
const JWT_SECRET = 'super-secret-quizhive-key-2026';

module.exports = { JWT_SECRET };
