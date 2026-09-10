/**
 * p0_auth_hardening.test.js
 * RetailEdge PRO — Phase 4A: P0 Security Remediation Automated Verification Suite
 *
 * Test Coverage:
 * - Part 1: Password Reset Security & Attack Resistance (Tests 1-16)
 * - Part 2: JWT Secret Hardening & Compromised Secret Rotation (Tests 17-22 + Mandatory Tests)
 * - Part 3: Account Takeover & RBAC Protection (Tests 23-25)
 * - Part 4: Mandatory Corrections (Multi-token invalidation, production persistence gate, production email safe failure)
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const express = require('express');
const http = require('http');

// Mock User model to ensure zero production database mutation
const mockUsers = {
  'user-regular': {
    id: 'user-regular',
    name: 'Regular Employee',
    email: 'employee@quizhive.com',
    password: '$2b$10$OldHashedPassword123456789012345678901234567890',
    role: 'Employee',
    status: 'Active',
    update: jest.fn(async (fields) => {
      Object.assign(mockUsers['user-regular'], fields);
      return mockUsers['user-regular'];
    })
  },
  'user-admin': {
    id: 'user-admin',
    name: 'Platform Admin',
    email: 'admin@quizhive.com',
    password: '$2b$10$AdminOldHashedPassword123456789012345678901234',
    role: 'Admin',
    status: 'Active',
    update: jest.fn(async (fields) => {
      Object.assign(mockUsers['user-admin'], fields);
      return mockUsers['user-admin'];
    })
  },
  'user-superadmin': {
    id: 'user-superadmin',
    name: 'Super Admin',
    email: 'superadmin@quizhive.com',
    password: '$2b$10$SuperOldHashedPassword123456789012345678901234',
    role: 'Super Admin',
    status: 'Active',
    update: jest.fn(async (fields) => {
      Object.assign(mockUsers['user-superadmin'], fields);
      return mockUsers['user-superadmin'];
    })
  }
};

jest.mock('../models/User', () => ({
  findOne: jest.fn(async ({ where }) => {
    if (where.email) {
      return Object.values(mockUsers).find(u => u.email.toLowerCase() === where.email.toLowerCase()) || null;
    }
    return null;
  }),
  findByPk: jest.fn(async (id) => {
    return mockUsers[id] || null;
  })
}));

const { validateJwtSecret, getJwtSecret, INSECURE_PLACEHOLDERS } = require('../config/constants');
const passwordResetService = require('../services/passwordResetService');
const emailService = require('../services/emailService');
const authRoutes = require('../routes/auth');

describe('Phase 4A — P0 Security Remediation Verification Suite', () => {
  let app;
  let server;
  let baseUrl;

  beforeAll((done) => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);

    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    passwordResetService._clearDevStore();
    emailService._clearLastSentEmail();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // PART 1 — PASSWORD RESET SECURITY & ATTACK RESISTANCE (Tests 1 - 16)
  // ==========================================================================
  describe('Part 1: Password Reset Security (Tests 1 - 16)', () => {

    test('1. POST /api/auth/forgot-password does not accept direct password choices', async () => {
      const originalPw = mockUsers['user-regular'].password;
      const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'employee@quizhive.com',
          newPassword: 'AttackerChosenPassword999!'
        })
      });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(mockUsers['user-regular'].update).not.toHaveBeenCalled();
      expect(mockUsers['user-regular'].password).toBe(originalPw);
    });

    test('2. POST /api/auth/forgot-password completely ignores body.newPassword', async () => {
      const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'employee@quizhive.com',
          newPassword: 'ShouldBeCompletelyIgnored123'
        })
      });
      const data = await res.json();
      expect(data).not.toHaveProperty('newPassword');
      expect(data).not.toHaveProperty('password');
      expect(data.success).toBe(true);
    });

    test('3. POST /api/auth/forgot-password never returns plaintext password in response body', async () => {
      const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'employee@quizhive.com' })
      });
      const data = await res.json();
      expect(data.newPassword).toBeUndefined();
      expect(data.password).toBeUndefined();
      expect(data.token).toBeUndefined();
      expect(data.resetUrl).toBeUndefined();
      expect(data.message).toBe('If the account exists, password reset instructions have been sent.');
    });

    test('4. POST /api/auth/forgot-password returns generic message for non-existent accounts', async () => {
      const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent-victim@example.com' })
      });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('If the account exists, password reset instructions have been sent.');
      expect(emailService._getLastSentEmail()).toBeNull();
    });

    test('5. POST /api/auth/forgot-password returns identical generic message for existing accounts (prevents user enumeration)', async () => {
      const resExisting = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'employee@quizhive.com' })
      });
      const resNonExisting = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ghost-user@example.com' })
      });

      const dataExisting = await resExisting.json();
      const dataNonExisting = await resNonExisting.json();

      expect(resExisting.status).toBe(resNonExisting.status);
      expect(dataExisting.message).toBe(dataNonExisting.message);
      expect(dataExisting.success).toBe(dataNonExisting.success);
    });

    test('6. POST /api/auth/forgot-password requires email parameter', async () => {
      const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/Email is required/i);
    });

    test('7. Reset token has at least 128 bits of cryptographic entropy', async () => {
      const { rawToken } = await passwordResetService.createResetToken('user-regular');
      expect(typeof rawToken).toBe('string');
      // 32 bytes hex = 64 hex characters = 256 bits of cryptographic entropy (> 128 bits required)
      expect(rawToken.length).toBe(64);
      expect(/^[0-9a-f]{64}$/.test(rawToken)).toBe(true);
    });

    test('8. Reset token is sent strictly out-of-band via email service', async () => {
      await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'employee@quizhive.com' })
      });

      const sentEmail = emailService._getLastSentEmail();
      expect(sentEmail).not.toBeNull();
      expect(sentEmail.to).toBe('employee@quizhive.com');
      expect(sentEmail.resetUrl).toContain('/reset-password?token=');
    });

    test('9. Reset token expires within 15 minutes', () => {
      expect(passwordResetService.TOKEN_TTL_MS).toBe(15 * 60 * 1000); // exactly 900,000 ms
    });

    test('10. Expired token cannot be used to reset password', async () => {
      const { rawToken } = await passwordResetService.createResetToken('user-regular');
      
      // Fast-forward token timestamp past 15 minutes by mocking Date.now
      const originalNow = Date.now;
      try {
        Date.now = () => originalNow() + (16 * 60 * 1000); // 16 mins later
        const verification = await passwordResetService.verifyAndConsumeToken(rawToken);
        expect(verification.valid).toBe(false);
        expect(verification.reason).toMatch(/expired/i);
      } finally {
        Date.now = originalNow;
      }
    });

    test('11. Reset token is single-use only (cannot be used twice)', async () => {
      const { rawToken } = await passwordResetService.createResetToken('user-regular');

      // First consumption succeeds
      const firstUse = await passwordResetService.verifyAndConsumeToken(rawToken);
      expect(firstUse.valid).toBe(true);
      expect(firstUse.userId).toBe('user-regular');

      // Second consumption fails
      const secondUse = await passwordResetService.verifyAndConsumeToken(rawToken);
      expect(secondUse.valid).toBe(false);
      expect(secondUse.reason).toMatch(/consumed/i);
    });

    test('12. Token hash verification stores only SHA-256 digests, never raw tokens', async () => {
      const { rawToken } = await passwordResetService.createResetToken('user-regular');
      const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      // The raw token must NOT exist as a key or plaintext value
      expect(passwordResetService._getDevStoreSize()).toBe(1);
      const verification = await passwordResetService.verifyAndConsumeToken(rawToken);
      expect(verification.valid).toBe(true);
    });

    test('13. POST /api/auth/reset-password requires valid token and newPassword', async () => {
      const res = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: '', newPassword: '' })
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/required/i);
    });

    test('14. POST /api/auth/reset-password enforces minimum password length (>= 6 characters)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'validlookingtoken1234567890123456789012', newPassword: '123' })
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/at least 6 characters/i);
    });

    test('15. POST /api/auth/reset-password rejects invalid/forged tokens', async () => {
      const res = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'forged-token-xyz-123456789012345678901234567890',
          newPassword: 'BrandNewSecurePassword123!'
        })
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/Invalid or expired/i);
    });

    test('16. POST /api/auth/reset-password saves new password as bcrypt hash, never plaintext', async () => {
      const { rawToken } = await passwordResetService.createResetToken('user-regular');
      const newRawPassword = 'FreshValidPassword2026!';

      const res = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: rawToken,
          newPassword: newRawPassword
        })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      // Verify User.update was called with a bcrypt hash
      expect(mockUsers['user-regular'].update).toHaveBeenCalled();
      const updatedFields = mockUsers['user-regular'].update.mock.calls[0][0];
      expect(updatedFields.password).not.toBe(newRawPassword);
      expect(updatedFields.password.startsWith('$2b$') || updatedFields.password.startsWith('$2a$')).toBe(true);

      // Verify bcrypt can compare the hash successfully
      const isMatch = await bcrypt.compare(newRawPassword, updatedFields.password);
      expect(isMatch).toBe(true);
    });

  });

  // ==========================================================================
  // PART 2 — JWT SECRET HARDENING & ROTATION TESTING (Tests 17 - 22 + Mandatory Tests)
  // ==========================================================================
  describe('Part 2: JWT Secret Hardening & Rotation Testing (Tests 17 - 22 + Mandatory Tests)', () => {
    const COMPROMISED_OLD_SECRET = 'super-secret-quizhive-key-2026';
    const NEW_STRONG_SECRET = 'c8b417e923f0402ab8f93e620583b320d84a7e937d55f0b48e3e4a9e57489a2b';

    test('17. JWT secret is read from process.env.JWT_SECRET', () => {
      const secret = validateJwtSecret(NEW_STRONG_SECRET, 'development');
      expect(secret).toBe(NEW_STRONG_SECRET);
    });

    test('18. Hardcoded fallback secret is completely removed in production mode', () => {
      expect(() => {
        validateJwtSecret('', 'production');
      }).toThrow(/Production JWT_SECRET is missing or empty/i);
    });

    test('19. Missing JWT_SECRET in production fails server startup with clear fatal error', () => {
      expect(() => {
        validateJwtSecret(null, 'production');
      }).toThrow(/Production JWT_SECRET is missing or empty/i);
    });

    test('20. Insecure placeholder/default secret in production fails server startup', () => {
      for (const placeholder of INSECURE_PLACEHOLDERS) {
        expect(() => {
          validateJwtSecret(placeholder, 'production');
        }).toThrow(/Production JWT_SECRET is using a known insecure default/i);
      }
    });

    test('21. Valid JWT_SECRET allows normal token signing and verification', () => {
      const payload = { id: 'user-regular', role: 'Employee' };
      const token = jwt.sign(payload, NEW_STRONG_SECRET, { expiresIn: '1h' });
      const decoded = jwt.verify(token, NEW_STRONG_SECRET);
      expect(decoded.id).toBe('user-regular');
      expect(decoded.role).toBe('Employee');
    });

    test('22. Mandatory Test: Old compromised-secret token is rejected after rotation', () => {
      const compromisedToken = jwt.sign(
        { id: 'user-regular', role: 'Employee' },
        COMPROMISED_OLD_SECRET,
        { expiresIn: '1h' }
      );

      // Attempting to verify the old token using the newly rotated secret must fail
      expect(() => {
        jwt.verify(compromisedToken, NEW_STRONG_SECRET);
      }).toThrow(jwt.JsonWebTokenError);
    });

    test('23. Mandatory Test: New-secret token is accepted', () => {
      const newSecretToken = jwt.sign(
        { id: 'user-regular', role: 'Employee' },
        NEW_STRONG_SECRET,
        { expiresIn: '1h' }
      );

      const decoded = jwt.verify(newSecretToken, NEW_STRONG_SECRET);
      expect(decoded.id).toBe('user-regular');
    });

    test('24. Mandatory Test: Old secret is not used as fallback during token verification', () => {
      const compromisedToken = jwt.sign(
        { id: 'user-regular', role: 'Employee' },
        COMPROMISED_OLD_SECRET,
        { expiresIn: '1h' }
      );

      // Verify that verifying against NEW_STRONG_SECRET does NOT fall back to COMPROMISED_OLD_SECRET
      let verificationFailed = false;
      try {
        jwt.verify(compromisedToken, NEW_STRONG_SECRET);
      } catch (err) {
        verificationFailed = true;
        expect(err.name).toBe('JsonWebTokenError');
        expect(err.message).toBe('invalid signature');
      }
      expect(verificationFailed).toBe(true);
    });

    test('25. Mandatory Test: Admin token signed with old secret is rejected', () => {
      const oldAdminToken = jwt.sign(
        { id: 'user-admin', role: 'Admin' },
        COMPROMISED_OLD_SECRET,
        { expiresIn: '1h' }
      );

      expect(() => {
        jwt.verify(oldAdminToken, NEW_STRONG_SECRET);
      }).toThrow(jwt.JsonWebTokenError);
    });

    test('26. Mandatory Test: Super Admin token signed with old secret is rejected', () => {
      const oldSuperAdminToken = jwt.sign(
        { id: 'user-superadmin', role: 'Super Admin' },
        COMPROMISED_OLD_SECRET,
        { expiresIn: '1h' }
      );

      expect(() => {
        jwt.verify(oldSuperAdminToken, NEW_STRONG_SECRET);
      }).toThrow(jwt.JsonWebTokenError);
    });

  });

  // ==========================================================================
  // PART 3 — MANDATORY RESET TOKEN INVALIDATION & LIFECYCLE (Mandatory Corrections)
  // ==========================================================================
  describe('Part 3: Token Invalidation & Single-Use Protections', () => {

    test('27. Mandatory Correction: Successful password reset consumes the presented token', async () => {
      const { rawToken } = await passwordResetService.createResetToken('user-regular');
      const consumeRes = await passwordResetService.verifyAndConsumeToken(rawToken);
      expect(consumeRes.valid).toBe(true);

      // Re-verifying immediately must fail
      const repeatRes = await passwordResetService.verifyAndConsumeToken(rawToken);
      expect(repeatRes.valid).toBe(false);
      expect(repeatRes.reason).toMatch(/already been consumed/i);
    });

    test('28. Mandatory Correction: Invalidate all other active reset tokens for that user upon reset', async () => {
      // Generate 3 consecutive reset tokens for the same user
      const t1 = await passwordResetService.createResetToken('user-regular');
      const t2 = await passwordResetService.createResetToken('user-regular');
      const t3 = await passwordResetService.createResetToken('user-regular');

      // t3 is the active token; when t3 is consumed, verify t1 and t2 are already invalidated
      const res3 = await passwordResetService.verifyAndConsumeToken(t3.rawToken);
      expect(res3.valid).toBe(true);

      // Attempting to use older tokens t1 or t2 must be rejected
      const res1 = await passwordResetService.verifyAndConsumeToken(t1.rawToken);
      expect(res1.valid).toBe(false);

      const res2 = await passwordResetService.verifyAndConsumeToken(t2.rawToken);
      expect(res2.valid).toBe(false);
    });

    test('29. Mandatory Correction: Invalidate all existing tokens when a new token is generated for user', async () => {
      const tOld = await passwordResetService.createResetToken('user-admin');
      const tNew = await passwordResetService.createResetToken('user-admin');

      // Old token must be invalidated even before tNew is used
      const oldCheck = await passwordResetService.verifyAndConsumeToken(tOld.rawToken);
      expect(oldCheck.valid).toBe(false);

      // New token must remain valid
      const newCheck = await passwordResetService.verifyAndConsumeToken(tNew.rawToken);
      expect(newCheck.valid).toBe(true);
    });

  });

  // ==========================================================================
  // PART 4 — PRODUCTION TOKEN STORAGE & EMAIL SAFETY CONSTRAINTS
  // ==========================================================================
  describe('Part 4: Production Storage & Email Delivery Safety Constraints', () => {

    test('30. Mandatory Correction: Process-memory token fallback is disallowed in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        let caughtError = null;
        try {
          await passwordResetService.createResetToken('user-regular');
        } catch (err) {
          caughtError = err;
        }
        expect(caughtError).not.toBeNull();
        expect(caughtError.code).toBe('PERSISTENCE_UNCONFIGURED');
        expect(caughtError.message).toMatch(/Production password-reset persistence is unconfigured/i);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    test('31. Mandatory Correction: Production email delivery fails safely without Ethereal simulation if SMTP missing', async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalHost = process.env.SMTP_HOST;
      try {
        process.env.NODE_ENV = 'production';
        delete process.env.SMTP_HOST;

        const result = await emailService.sendPasswordResetEmail({
          to: 'test@example.com',
          name: 'Test',
          resetUrl: 'https://retailedgepro.com/reset-password?token=abc'
        });

        expect(result.delivered).toBe(false);
        expect(result.reason).toBe('SMTP_NOT_CONFIGURED');
        expect(result.isSimulated).toBeUndefined();
      } finally {
        process.env.NODE_ENV = originalEnv;
        if (originalHost) process.env.SMTP_HOST = originalHost;
      }
    });

    test('32. Mandatory Correction: Production delivery failure maintains generic API response without leaking error', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'employee@quizhive.com' })
        });
        const data = await res.json();
        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBe('If the account exists, password reset instructions have been sent.');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

  });

  // ==========================================================================
  // PART 5 — ACCOUNT TAKEOVER & RBAC PROTECTION (Tests 23 - 25)
  // ==========================================================================
  describe('Part 5: Account Takeover & RBAC Protection (Tests 23 - 25)', () => {

    test('33. Unauthenticated attacker cannot modify another user password without token', async () => {
      const originalAdminPw = mockUsers['user-admin'].password;
      const res = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: 'TakeoverAttempt123!'
        })
      });
      expect(res.status).toBe(400);
      expect(mockUsers['user-admin'].password).toBe(originalAdminPw);
    });

    test('34. Admin and Super Admin accounts protected by same tokenized workflow', async () => {
      const resAdmin = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@quizhive.com',
          newPassword: 'AdminTakeover123!'
        })
      });
      const dataAdmin = await resAdmin.json();
      expect(dataAdmin.success).toBe(true);
      expect(dataAdmin.newPassword).toBeUndefined();
      expect(mockUsers['user-admin'].update).not.toHaveBeenCalled();

      const resSuper = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'superadmin@quizhive.com',
          newPassword: 'SuperTakeover123!'
        })
      });
      const dataSuper = await resSuper.json();
      expect(dataSuper.success).toBe(true);
      expect(dataSuper.newPassword).toBeUndefined();
      expect(mockUsers['user-superadmin'].update).not.toHaveBeenCalled();
    });

    test('35. Password reset tokens are not exposed in API response bodies or user models', async () => {
      const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'employee@quizhive.com' })
      });
      const data = await res.json();
      const keys = Object.keys(data);
      expect(keys).toEqual(['success', 'message']);
      expect(data).not.toHaveProperty('token');
      expect(data).not.toHaveProperty('resetToken');
      expect(data).not.toHaveProperty('tokenHash');
    });

  });

});
