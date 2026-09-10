const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const Role    = require('../models/Role');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const { requireAuth } = require('../middleware/authMiddleware');
const { JWT_SECRET }  = require('../config/constants');


// ── LOGIN ─────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    let lookupEmail = email;
    if (email && typeof email === 'string' && email.toLowerCase().endsWith('@retailedgepro.com')) {
      lookupEmail = email.toLowerCase().replace('@retailedgepro.com', '@quizhive.com');
    }

    let user = await User.findOne({ where: { email: lookupEmail }, include: [Role] });
    if (!user) user = await User.findOne({ where: { email }, include: [Role] });

    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid email or password' });

    if (user.status !== 'Active') {
      return res.status(403).json({ error: 'Account is inactive. Please contact your administrator.' });
    }

    const roleName = user.Role ? user.Role.role_name : null;
    const token = jwt.sign(
      { id: user.id, role: roleName, projectId: user.projectId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: roleName, projectId: user.projectId }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

const passwordResetService = require('../services/passwordResetService');
const emailService = require('../services/emailService');

// ── FORGOT PASSWORD (public) ──────────────────────────────────────────────────
// Strictly generates a single-use token and sends it out-of-band.
// NEVER allows direct password choice; NEVER returns plaintext passwords.
// Always returns a generic response to prevent account enumeration.
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const GENERIC_MSG = 'If the account exists, password reset instructions have been sent.';

  try {
    let lookupEmail = email;
    if (typeof email === 'string' && email.toLowerCase().endsWith('@retailedgepro.com')) {
      lookupEmail = email.toLowerCase().replace('@retailedgepro.com', '@quizhive.com');
    }

    let user = await User.findOne({ where: { email: lookupEmail } });
    if (!user) user = await User.findOne({ where: { email } });

    // Non-existent account: return generic success without leaking existence
    if (!user || user.status !== 'Active') {
      return res.json({ success: true, message: GENERIC_MSG });
    }

    try {
      const { rawToken } = await passwordResetService.createResetToken(user.id);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${rawToken}`;
      await emailService.sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl
      });
    } catch (deliveryErr) {
      // Log operational warning internally without exposing error to caller
      console.error('[PasswordReset Error] Token generation / delivery failed:', deliveryErr.message);
    }

    // Always return generic response to caller; never leak token or account info
    return res.json({
      success: true,
      message: GENERIC_MSG
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    // Generic response even on error to prevent timing/enumeration attacks
    res.json({ success: true, message: GENERIC_MSG });
  }
});

// ── RESET PASSWORD (public with valid token) ──────────────────────────────────
// Consumes single-use token, invalidates user's remaining tokens, and updates password.
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required.' });
  }

  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  try {
    const result = await passwordResetService.verifyAndConsumeToken(token);
    if (!result.valid) {
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    const user = await User.findByPk(result.userId);
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    // Hash the new password with bcrypt
    const hashed = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashed });

    res.json({
      success: true,
      message: 'Password has been reset successfully. You may now log in with your new password.'
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ── CHANGE PASSWORD (authenticated) ──────────────────────────────────────────
router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both current and new password are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) return res.status(401).json({ error: 'Current password is incorrect.' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashed });

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

module.exports = router;
