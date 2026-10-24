const nodemailer = require('nodemailer');

function getEmailConfig() {
  const host = process.env.MAIL_HOST;
  const port = Number(process.env.MAIL_PORT || 587);
  const user = process.env.MAIL_USER;
  const password = process.env.MAIL_PASS;
  const from = process.env.MAIL_FROM || user;

  if (
    !host ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !from ||
    Boolean(user) !== Boolean(password)
  ) {
    return null;
  }

  return {
    host,
    port,
    secure: process.env.MAIL_SECURE === 'true' || port === 465,
    auth: user ? { user, pass: password } : undefined,
    from
  };
}

function isEmailConfigured() {
  return getEmailConfig() !== null;
}

async function sendPasswordResetCode(email, code) {
  const config = getEmailConfig();
  if (!config) {
    throw new Error('Email is not configured. Set MAIL_HOST, MAIL_PORT, and MAIL_FROM; set MAIL_USER and MAIL_PASS when SMTP authentication is required.');
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth
  });

  await transporter.sendMail({
    from: config.from,
    to: email,
    subject: 'Your Threadline password reset code',
    text: `Your Threadline password reset code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
    html: `<p>Your Threadline password reset code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:8px">${code}</p><p>This code expires in 10 minutes. If you did not request this, you can ignore this email.</p>`
  });
}

module.exports = { isEmailConfigured, sendPasswordResetCode };
