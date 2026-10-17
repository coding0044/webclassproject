const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const methodOverride = require('method-override');
const { connectDB, disconnectDB, getMongoConfig, hasPlaceholderValue } = require('./config/db');
const Comment = require('./models/Comment');

const app = express();
const PORT = process.env.PORT || 3000;
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
  res.redirect('/comments');
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




















