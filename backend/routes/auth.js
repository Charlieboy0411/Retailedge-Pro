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

// ── FORGOT PASSWORD (public) ──────────────────────────────────────────────────
// Accepts optional `newPassword` — if provided, uses that; otherwise auto-generates one.
router.post('/forgot-password', async (req, res) => {
  const { email, newPassword: customPassword } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    let lookupEmail = email;
    if (typeof email === 'string' && email.toLowerCase().endsWith('@retailedgepro.com')) {
      lookupEmail = email.toLowerCase().replace('@retailedgepro.com', '@quizhive.com');
    }

    let user = await User.findOne({ where: { email: lookupEmail } });
    if (!user) user = await User.findOne({ where: { email } });

    if (!user) {
      return res.json({ success: true, message: 'If that email is registered, the password has been updated.' });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({ error: 'This account is not active. Contact your administrator.' });
    }

    // Use custom password if provided, otherwise auto-generate
    let plainPassword;
    if (customPassword && customPassword.trim().length >= 6) {
      plainPassword = customPassword.trim();
    } else {
      const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#';
      plainPassword = '';
      for (let i = 0; i < 10; i++) plainPassword += chars[Math.floor(Math.random() * chars.length)];
    }

    const hashed = await bcrypt.hash(plainPassword, 10);
    await user.update({ password: hashed });

    res.json({
      success: true,
      newPassword: customPassword ? null : plainPassword,  // only return generated password, not user's own
      isCustom: !!customPassword,
      name: user.name,
      message: customPassword
        ? 'Password updated successfully. You can now log in with your new password.'
        : 'A new password has been generated. Please copy it and log in, then change it immediately.'
    });
  } catch (err) {
    console.error('Forgot password error:', err);
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
