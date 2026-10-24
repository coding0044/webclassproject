const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const crypto = require('crypto');
const methodOverride = require('method-override');
const { connectDB, disconnectDB, getMongoConfig, hasPlaceholderValue } = require('./config/db');
const Comment = require('./models/Comment');
const User = require('./models/User');
const { hashPassword, verifyPassword } = require('./auth/password');
const {
  clearPasswordResetCookie,
  clearSessionCookie,
  getPasswordResetSession,
  getSessionUser,
  isSessionConfigured,
  setPasswordResetCookie,
  setSessionCookie
} = require('./auth/session');
const { isEmailConfigured, sendPasswordResetCode } = require('./auth/email');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_CONFIGURATION_ERROR = 'Set AUTH_SESSION_SECRET in Vercel > Project Settings > Environment Variables to a stable secret of at least 32 characters, then redeploy.';
let databaseConnected = false;
let databaseInitialization;
const fallbackComments = [
  { _id: 'c1', username: 'Todd', comment: 'lol that is so funny!' },
  { _id: 'c2', username: 'Skyler', comment: 'I like to go birdwatching with my dog' },
  { _id: 'c3', username: 'Sk8erBoi', comment: 'Plz delete your account, Todd' },
  { _id: 'c4', username: 'onlysayswoof', comment: 'woof woof woof' }
];

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  req.user = getSessionUser(req);
  res.locals.user = req.user;
  next();
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(async (req, res, next) => {
  if (!process.env.VERCEL || !isDatabaseConfigured()) {
    return next();
  }

  try {
    databaseInitialization ||= initializeDatabase();
    const connected = await databaseInitialization;
    if (!connected) databaseInitialization = undefined;
    return next();
  } catch (error) {
    return next(error);
  }
});

function isDatabaseConfigured() {
  const { uri, dbName } = getMongoConfig();
  return Boolean(uri) && !hasPlaceholderValue(uri) && Boolean(dbName) && !hasPlaceholderValue(dbName);
}

function normalizeId(record) {
  if (!record) return null;
  return record._id ? String(record._id) : String(record.id || '');
}

function canUseDatabase() {
  return databaseConnected && isDatabaseConfigured();
}

async function ensureDatabaseConnection() {
  if (!isDatabaseConfigured()) return false;

  databaseInitialization ||= initializeDatabase();
  const connected = await databaseInitialization;
  if (!connected) databaseInitialization = undefined;
  return connected;
}

async function getAllComments() {
  if (canUseDatabase()) {
    try {
      return await Comment.find().sort({ createdAt: -1 }).lean();
    } catch (error) {
      console.warn('MongoDB read failed, using in-memory comments instead:', error.message);
    }
  }

  return fallbackComments;
}

async function findCommentById(id) {
  if (canUseDatabase()) {
    try {
      return await Comment.findById(id).lean();
    } catch (error) {
      console.warn('MongoDB find failed, using in-memory comments instead:', error.message);
    }
  }

  return fallbackComments.find((item) => normalizeId(item) === String(id)) || null;
}

async function createCommentRecord(data) {
  if (canUseDatabase()) {
    try {
      return await Comment.create(data);
    } catch (error) {
      console.warn('MongoDB create failed, using in-memory comments instead:', error.message);
    }
  }

  const newComment = {
    _id: `mem-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    username: data.username,
    comment: data.comment
  };
  fallbackComments.unshift(newComment);
  return newComment;
}

async function updateCommentRecord(id, newCommentText) {
  if (canUseDatabase()) {
    try {
      const comment = await Comment.findById(id);
      if (!comment) return null;
      comment.comment = newCommentText;
      await comment.save();
      return comment;
    } catch (error) {
      console.warn('MongoDB update failed, using in-memory comments instead:', error.message);
    }
  }

  const existing = fallbackComments.find((item) => normalizeId(item) === String(id));
  if (!existing) return null;
  existing.comment = newCommentText;
  return existing;
}

async function deleteCommentRecord(id) {
  if (canUseDatabase()) {
    try {
      return await Comment.findByIdAndDelete(id);
    } catch (error) {
      console.warn('MongoDB delete failed, using in-memory comments instead:', error.message);
    }
  }

  const index = fallbackComments.findIndex((item) => normalizeId(item) === String(id));
  if (index === -1) return null;
  const [removed] = fallbackComments.splice(index, 1);
  return removed;
}

async function initializeDatabase() {
  if (!isDatabaseConfigured()) {
    console.warn('MongoDB is not configured yet. Falling back to in-memory comments for local development.');
    return false;
  }

  try {
    await connectDB();
    databaseConnected = true;
    return true;
  } catch (error) {
    console.error('MongoDB startup failed:', error.message);
    return false;
  }
}

app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/signup', (req, res) => {
  res.render('auth/signup', { error: '', values: { username: '', email: '' } });
});

app.post('/signup', async (req, res, next) => {
  const username = String(req.body.username || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || '');
  const values = { username, email };
  let error = '';

  if (username.length < 2 || username.length > 50) {
    error = 'Your name must be between 2 and 50 characters.';
  } else if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    error = 'Enter a valid email address.';
  } else if (password.length < 8 || password.length > 128) {
    error = 'Your password must be between 8 and 128 characters.';
  } else if (password !== confirmPassword) {
    error = 'Your passwords do not match.';
  }

  if (error) return res.status(400).render('auth/signup', { error, values });

  try {
    if (!isSessionConfigured()) {
      return res.status(503).render('auth/signup', {
        error: `Account sign-up is temporarily unavailable. ${SESSION_CONFIGURATION_ERROR}`,
        values
      });
    }

    if (!(await ensureDatabaseConnection())) {
      return res.status(503).render('auth/signup', {
        error: 'Account services are unavailable because the database is not connected.',
        values
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).render('auth/signup', { error: 'An account with that email already exists.', values });
    }

    const user = await User.create({
      username,
      email,
      passwordHash: await hashPassword(password)
    });
    setSessionCookie(res, user);
    return res.redirect('/comments');
  } catch (signupError) {
    if (signupError.code === 11000) {
      return res.status(409).render('auth/signup', { error: 'An account with that email already exists.', values });
    }
    return next(signupError);
  }
});

app.get('/login', (req, res) => {
  res.render('auth/login', {
    error: '',
    email: '',
    passwordReset: req.query.passwordReset === '1'
  });
});

app.post('/login', async (req, res, next) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length > 128) {
    return res.status(400).render('auth/login', { error: 'Enter a valid email and password.', email });
  }

  try {
    if (!isSessionConfigured()) {
      return res.status(503).render('auth/login', {
        error: `Login is temporarily unavailable. ${SESSION_CONFIGURATION_ERROR}`,
        email
      });
    }

    if (!(await ensureDatabaseConnection())) {
      return res.status(503).render('auth/login', {
        error: 'Account services are unavailable because the database is not connected.',
        email
      });
    }

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).render('auth/login', { error: 'Email or password is incorrect.', email });
    }

    setSessionCookie(res, user);
    return res.redirect('/comments');
  } catch (loginError) {
    return next(loginError);
  }
});

app.get('/forgot-password', (req, res) => {
  res.render('auth/forgot-password', { error: '', email: '' });
});

app.post('/forgot-password', async (req, res, next) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).render('auth/forgot-password', {
      error: 'Enter a valid email address.',
      email
    });
  }

  if (!isEmailConfigured()) {
    return res.status(503).render('auth/forgot-password', {
      error: 'Password reset email is not configured. Add the SMTP settings described in the README.',
      email
    });
  }

  if (!isSessionConfigured()) {
    return res.status(503).render('auth/forgot-password', {
      error: `Password reset is temporarily unavailable. ${SESSION_CONFIGURATION_ERROR}`,
      email
    });
  }

  try {
    if (!(await ensureDatabaseConnection())) {
      return res.status(503).render('auth/forgot-password', {
        error: 'Account services are unavailable because the database is not connected.',
        email
      });
    }

    const user = await User.findOne({ email }).select('+resetOtpHash +resetOtpExpiresAt +resetOtpAttempts +resetOtpSentAt');
    if (user && (!user.resetOtpSentAt || Date.now() - user.resetOtpSentAt.getTime() >= 60 * 1000)) {
      const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
      const resetOtpHash = await hashPassword(code);
      user.resetOtpHash = resetOtpHash;
      user.resetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      user.resetOtpAttempts = 0;
      user.resetOtpSentAt = new Date();
      user.resetOtpVerifiedTokenHash = undefined;
      await user.save();

      try {
        await sendPasswordResetCode(user.email, code);
      } catch (emailError) {
        await User.updateOne(
          { _id: user._id, resetOtpHash },
          {
            $unset: {
              resetOtpHash: 1,
              resetOtpExpiresAt: 1,
              resetOtpSentAt: 1,
              resetOtpVerifiedTokenHash: 1
            },
            $set: { resetOtpAttempts: 0 }
          }
        );
        console.error('Password reset email delivery failed:', emailError.message);
        return res.status(503).render('auth/forgot-password', {
          error: 'We could not send a reset code right now. Please check your email settings and try again.',
          email
        });
      }
    }

    return res.render('auth/verify-reset-code', {
      email,
      error: '',
      message: 'If that email belongs to an account, a six-digit reset code has been sent. Check your inbox.'
    });
  } catch (resetRequestError) {
    return next(resetRequestError);
  }
});

app.get('/verify-reset-code', (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  res.render('auth/verify-reset-code', { email, error: '', message: '' });
});

app.post('/verify-reset-code', async (req, res, next) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const code = String(req.body.code || '').trim();
  const values = { email, error: '', message: '' };
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).render('auth/verify-reset-code', {
      ...values,
      error: 'Enter a valid email address.'
    });
  }
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).render('auth/verify-reset-code', {
      ...values,
      error: 'Enter the six-digit code from your email.'
    });
  }

  if (!isSessionConfigured()) {
    return res.status(503).render('auth/verify-reset-code', {
      ...values,
      error: `Password reset is temporarily unavailable. ${SESSION_CONFIGURATION_ERROR}`
    });
  }

  try {
    if (!(await ensureDatabaseConnection())) {
      return res.status(503).render('auth/verify-reset-code', {
        ...values,
        error: 'Account services are unavailable because the database is not connected.'
      });
    }

    const user = await User.findOne({ email }).select('+resetOtpHash +resetOtpExpiresAt +resetOtpAttempts');
    if (!user || !user.resetOtpHash || !user.resetOtpExpiresAt || user.resetOtpExpiresAt <= new Date() || user.resetOtpAttempts >= 5) {
      return res.status(400).render('auth/verify-reset-code', {
        ...values,
        error: 'That code is invalid or expired. Request a new reset code and try again.'
      });
    }

    const attempt = await User.findOneAndUpdate(
      {
        _id: user._id,
        resetOtpHash: user.resetOtpHash,
        resetOtpExpiresAt: { $gt: new Date() },
        resetOtpAttempts: { $lt: 5 }
      },
      { $inc: { resetOtpAttempts: 1 } },
      { new: true }
    ).select('+resetOtpHash');

    if (!attempt || !(await verifyPassword(code, attempt.resetOtpHash))) {
      return res.status(400).render('auth/verify-reset-code', {
        ...values,
        error: 'That code is invalid or expired. Check it and try again.'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = user.resetOtpExpiresAt.getTime();
    const result = await User.updateOne(
      {
        _id: attempt._id,
        resetOtpHash: attempt.resetOtpHash,
        resetOtpExpiresAt: { $gt: new Date(), $eq: user.resetOtpExpiresAt },
        resetOtpAttempts: { $lte: 5 }
      },
      {
        $set: { resetOtpVerifiedTokenHash: resetTokenHash },
        $unset: { resetOtpHash: 1, resetOtpAttempts: 1 }
      }
    );

    if (result.modifiedCount !== 1) {
      return res.status(400).render('auth/verify-reset-code', {
        ...values,
        error: 'That code is invalid or expired. Request a new reset code and try again.'
      });
    }

    setPasswordResetCookie(res, attempt._id, resetToken, expiresAt);
    return res.redirect('/reset-password');
  } catch (otpVerificationError) {
    return next(otpVerificationError);
  }
});

app.get('/reset-password', async (req, res, next) => {
  if (!isSessionConfigured()) {
    return res.status(503).render('auth/reset-password', {
      error: `Password reset is temporarily unavailable. ${SESSION_CONFIGURATION_ERROR}`
    });
  }

  const resetSession = getPasswordResetSession(req);
  if (!resetSession) return res.redirect('/forgot-password');

  try {
    if (!(await ensureDatabaseConnection())) {
      return res.status(503).render('auth/reset-password', {
        error: 'Account services are unavailable because the database is not connected.'
      });
    }

    const resetTokenHash = crypto.createHash('sha256').update(resetSession.token).digest('hex');
    const user = await User.findOne({
      _id: resetSession.id,
      resetOtpVerifiedTokenHash: resetTokenHash,
      resetOtpExpiresAt: { $gt: new Date() }
    });
    if (!user) {
      clearPasswordResetCookie(res);
      return res.redirect('/forgot-password');
    }
    return res.render('auth/reset-password', { error: '' });
  } catch (passwordPageError) {
    return next(passwordPageError);
  }
});

app.post('/reset-password', async (req, res, next) => {
  if (!isSessionConfigured()) {
    return res.status(503).render('auth/reset-password', {
      error: 'Password reset is temporarily unavailable. Configure AUTH_SESSION_SECRET in the deployment environment.'
    });
  }

  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || '');
  const resetSession = getPasswordResetSession(req);
  let error = '';

  if (!resetSession) return res.redirect('/forgot-password');
  if (password.length < 8 || password.length > 128) {
    error = 'Your new password must be between 8 and 128 characters.';
  } else if (password !== confirmPassword) {
    error = 'Your passwords do not match.';
  }

  if (error) return res.status(400).render('auth/reset-password', { error });

  try {
    if (!(await ensureDatabaseConnection())) {
      return res.status(503).render('auth/reset-password', {
        error: 'Account services are unavailable because the database is not connected.'
      });
    }

    const resetTokenHash = crypto.createHash('sha256').update(resetSession.token).digest('hex');
    const passwordHash = await hashPassword(password);
    const result = await User.updateOne(
      {
        _id: resetSession.id,
        resetOtpVerifiedTokenHash: resetTokenHash,
        resetOtpExpiresAt: { $gt: new Date() }
      },
      {
        $set: { passwordHash },
        $unset: {
          resetOtpVerifiedTokenHash: 1,
          resetOtpExpiresAt: 1,
          resetOtpSentAt: 1,
          resetOtpAttempts: 1
        }
      }
    );

    if (result.modifiedCount !== 1) {
      clearPasswordResetCookie(res);
      return res.status(400).render('auth/reset-password', {
        error: 'Your verification expired. Request a new reset code.'
      });
    }

    clearPasswordResetCookie(res);
    return res.redirect('/login?passwordReset=1');
  } catch (passwordResetError) {
    return next(passwordResetError);
  }
});

app.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.redirect('/login');
});

app.use('/comments', (req, res, next) => {
  if (!req.user) return res.redirect('/login');
  return next();
});

app.get('/comments', async (req, res, next) => {
  try {
    const comments = await getAllComments();
    const message = req.query.message || '';
    const messageType = req.query.type || 'success';
    return res.render('comments/index', { comments, message, messageType });
  } catch (error) {
    return next(error);
  }
});

app.get('/comments/new', (req, res) => {
  res.render('comments/new');
});

app.post('/comments', async (req, res, next) => {
  try {
    const { username, comment } = req.body;
    const cleanUsername = String(username || '').trim();
    const cleanComment = String(comment || '').trim();

    if (!cleanUsername || !cleanComment) {
      return res.redirect('/comments/new');
    }

    await createCommentRecord({ username: cleanUsername, comment: cleanComment });
    return res.redirect('/comments?message=Comment%20added%20successfully&type=success');
  } catch (error) {
    return next(error);
  }
});

app.get('/comments/:id', async (req, res, next) => {
  try {
    const comment = await findCommentById(req.params.id);

    if (!comment) {
      return res.redirect('/comments?message=Comment%20not%20found&type=error');
    }

    return res.render('comments/show', { comment });
  } catch (error) {
    return next(error);
  }
});

app.get('/comments/:id/edit', async (req, res, next) => {
  try {
    const comment = await findCommentById(req.params.id);

    if (!comment) {
      return res.redirect('/comments?message=Comment%20not%20found&type=error');
    }

    return res.render('comments/edit', { comment });
  } catch (error) {
    return next(error);
  }
});

app.patch('/comments/:id', async (req, res, next) => {
  try {
    const comment = await findCommentById(req.params.id);

    if (!comment) {
      return res.redirect('/comments?message=Comment%20not%20found&type=error');
    }

    const updatedComment = String(req.body.comment || '').trim();
    if (!updatedComment) {
      return res.redirect(`/comments/${req.params.id}/edit`);
    }

    await updateCommentRecord(req.params.id, updatedComment);
    return res.redirect('/comments?message=Comment%20updated%20successfully&type=success');
  } catch (error) {
    return next(error);
  }
});

app.delete('/comments/:id', async (req, res, next) => {
  try {
    const deleted = await deleteCommentRecord(req.params.id);

    if (!deleted) {
      return res.redirect('/comments?message=Comment%20not%20found&type=error');
    }

    return res.redirect('/comments?message=Comment%20deleted%20successfully&type=success');
  } catch (error) {
    return next(error);
  }
});

app.get('/tacos', (req, res) => {
  res.send('GET /tacos response');
});

app.post('/tacos', (req, res) => {
  const { meat, qty } = req.body;
  res.send(`OK, here are your ${qty} ${meat} tacos`);
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).send('Something went wrong while processing your request.');
});

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`RESTDemo running on http://localhost:${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      console.warn(`Port ${port} is already in use. Retrying on ${nextPort}...`);
      startServer(nextPort);
      return;
    }

    console.error('Unable to start server:', error.message);
    process.exit(1);
  });
}

if (require.main === module) {
  initializeDatabase().then(() => {
    startServer(PORT);
  }).catch((error) => {
    console.error('Unable to start server:', error.message);
    process.exit(1);
  });
}

module.exports = app;
module.exports.app = app;
module.exports.initializeDatabase = initializeDatabase;
module.exports.disconnectDB = disconnectDB;


