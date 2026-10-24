const mongoose = require('mongoose');
const dns = require('node:dns');

const PLACEHOLDER_PATTERNS = [
  /YOUR_MONGODB_PASSWORD/i,
  /<password>/i,
  /your_password/i,
  /placeholder/i,
  /example/i,
  /changeme/i
];

function hasPlaceholderValue(value) {
  if (!value || typeof value !== 'string') {
    return true;
  }

  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

function getMongoConfig() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'restdemo';

  return { uri, dbName };
}

async function connectDB() {
  const { uri, dbName } = getMongoConfig();

  if (!uri || hasPlaceholderValue(uri)) {
    throw new Error('MONGODB_URI is missing or still contains a placeholder value. Update the .env file with the real Atlas connection string.');
  }

  if (!dbName || hasPlaceholderValue(dbName)) {
    throw new Error('MONGODB_DB_NAME is missing or still contains a placeholder value. Update the .env file.');
  }

  mongoose.set('strictQuery', true);

  const dnsServers = (process.env.MONGODB_DNS_SERVERS || '')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean);

  if (dnsServers.length > 0) {
    dns.setServers(dnsServers);
  }

  mongoose.connection.on('connected', () => {
    console.log('MongoDB connected successfully.');
  });

  mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error:', error.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected.');
  });

  const connectPromise = mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 15000,
    maxPoolSize: 10,
    retryWrites: true,
    w: 'majority'
  });

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('MongoDB connection timed out. Check that Atlas allows your current IP and your credentials are valid.'));
    }, 15000);
  });

  await Promise.race([connectPromise, timeoutPromise]);

  return mongoose.connection;
}

async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

module.exports = {
  connectDB,
  disconnectDB,
  getMongoConfig,
  hasPlaceholderValue
};
