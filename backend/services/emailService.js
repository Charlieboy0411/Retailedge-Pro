const nodemailer = require('nodemailer');

let lastSentEmailForTesting = null;

function isProductionMode() {
  return process.env.NODE_ENV === 'production';
}

/**
 * Sends a password reset email out-of-band.
 * In production:
 *   - Strictly uses verified SMTP configuration from process.env.
 *   - NEVER falls back to Ethereal, simulation, or console links.
 *   - Fails safely if SMTP is unconfigured without revealing status to caller.
 * In test/development:
 *   - Records sent details in memory for test assertions.
 * @param {object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.name - Recipient full name
 * @param {string} params.resetUrl - Full reset link with single-use token
 * @returns {Promise<{ delivered: boolean, reason?: string }>}
 */
async function sendPasswordResetEmail({ to, name, resetUrl }) {
  if (!to || !resetUrl) {
    return { delivered: false, reason: 'Missing recipient or reset URL.' };
  }

  const isProd = isProductionMode();
  const hasSmtpConfig = Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );

  // In production, require verified environment configuration
  if (isProd) {
    if (!hasSmtpConfig) {
      // Fail delivery safely without crashing or exposing error to end user
      console.error('[Security/Operations] Production SMTP is unconfigured. Password reset email delivery aborted.');
      return { delivered: false, reason: 'SMTP_NOT_CONFIGURED' };
    }

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"RetailEdge PRO Security" <security@retailedgepro.com>',
        to,
        subject: 'RetailEdge PRO — Password Reset Request',
        text: `Hello ${name || 'User'},\n\nA password reset request was received for your account. Please use the following secure link to reset your password within 15 minutes:\n\n${resetUrl}\n\nIf you did not request this, please disregard this email. Your password will remain unchanged.\n\nRetailEdge PRO Security Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; color: #1E293B;">
            <h2 style="color: #2563EB;">RetailEdge PRO Security</h2>
            <p>Hello <strong>${name || 'User'}</strong>,</p>
            <p>A password reset request was received for your account. Please click the button below to choose a new password. This link is valid for <strong>15 minutes</strong> and can only be used once.</p>
            <div style="margin: 24px 0;">
              <a href="${resetUrl}" style="background: #2563EB; color: #FFFFFF; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="font-size: 0.85rem; color: #64748B;">If you did not request a password reset, please disregard this message. Your credentials will remain unchanged.</p>
            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0;" />
            <p style="font-size: 0.75rem; color: #94A3B8;">RetailEdge PRO Enterprise Learning Management System</p>
          </div>
        `
      });

      return { delivered: true };
    } catch (err) {
      console.error('[EmailService Error] Failed to dispatch production reset email:', err.message);
      return { delivered: false, reason: 'DISPATCH_ERROR' };
    }
  }

  // Non-production (development / test) environment:
  // Capture for automated test verification without browser leakage
  lastSentEmailForTesting = {
    to,
    name,
    resetUrl,
    timestamp: new Date()
  };

  return { delivered: true, isSimulated: true };
}

function _getLastSentEmail() {
  return lastSentEmailForTesting;
}

function _clearLastSentEmail() {
  lastSentEmailForTesting = null;
}

module.exports = {
  sendPasswordResetEmail,
  _getLastSentEmail,
  _clearLastSentEmail
};
