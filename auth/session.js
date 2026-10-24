const crypto = require('crypto');

const COOKIE_NAME = 'comments_session';
const PASSWORD_RESET_COOKIE_NAME = 'password_reset';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const configuredSecret = process.env.AUTH_SESSION_SECRET;
const sessionSecret = configuredSecret && configuredSecret.length >= 32
  ? configuredSecret
  : process.env.NODE_ENV === 'production'
    ? null
    : crypto.randomBytes(32).toString('hex');

function sign(value) {
  if (!sessionSecret) {
    throw new Error('AUTH_SESSION_SECRET must be set to at least 32 characters before account sessions can be used.');
  }
  return crypto.createHmac('sha256', sessionSecret).update(value).digest('base64url');
}

function readSignedCookie(req, name) {
  if (!sessionSecret) return null;
  const cookie = (req.headers.cookie || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (!cookie) return null;
  const token = cookie.slice(name.length + 1);
  const separator = token.lastIndexOf('.');
  if (separator < 1) return null;

  const payload = token.slice(0, separator);
  const providedBytes = Buffer.from(token.slice(separator + 1));
  const expectedBytes = Buffer.from(sign(payload));
  if (providedBytes.length !== expectedBytes.length || !crypto.timingSafeEqual(providedBytes, expectedBytes)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

function getSessionUser(req) {
  const session = readSignedCookie(req, COOKIE_NAME);
  if (
    !session ||
    typeof session.id !== 'string' ||
    !session.id ||
    typeof session.username !== 'string' ||
    typeof session.expiresAt !== 'number' ||
    session.expiresAt <= Date.now()
  ) return null;
  return { id: session.id, username: session.username };
}

function setSignedCookie(res, name, data, ttlSeconds) {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const token = `${payload}.${sign(payload)}`;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const existing = res.getHeader('Set-Cookie');
  const cookies = existing ? (Array.isArray(existing) ? existing : [existing]) : [];
  cookies.push(`${name}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${ttlSeconds}${secure}`);
  res.setHeader('Set-Cookie', cookies);
}

function clearSignedCookie(res, name) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const existing = res.getHeader('Set-Cookie');
  const cookies = existing ? (Array.isArray(existing) ? existing : [existing]) : [];
  cookies.push(`${name}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
  res.setHeader('Set-Cookie', cookies);
}

function setSessionCookie(res, user) {
  setSignedCookie(res, COOKIE_NAME, {
    id: String(user._id),
    username: user.username,
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000
  }, SESSION_TTL_SECONDS);
}

function setPasswordResetCookie(res, userId, token, expiresAt) {
  const ttlSeconds = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  setSignedCookie(res, PASSWORD_RESET_COOKIE_NAME, {
    id: String(userId),
    token,
    expiresAt
  }, ttlSeconds);
}

function getPasswordResetSession(req) {
  const session = readSignedCookie(req, PASSWORD_RESET_COOKIE_NAME);
  if (
    !session ||
    typeof session.id !== 'string' ||
    !session.id ||
    typeof session.token !== 'string' ||
    !session.token ||
    typeof session.expiresAt !== 'number' ||
    session.expiresAt <= Date.now()
  ) return null;
  return session;
}

function clearPasswordResetCookie(res) {
  clearSignedCookie(res, PASSWORD_RESET_COOKIE_NAME);
}

function clearSessionCookie(res) {
  clearSignedCookie(res, COOKIE_NAME);
}

module.exports = {
  clearPasswordResetCookie,
  clearSessionCookie,
  getPasswordResetSession,
  getSessionUser,
  isSessionConfigured: () => Boolean(sessionSecret),
  setPasswordResetCookie,
  setSessionCookie
};
