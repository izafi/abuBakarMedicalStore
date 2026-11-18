const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongoURI) {
    console.error('CRITICAL ERROR: MONGO_URI / MONGODB_URI is not defined in environment variables.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 8000, // Timeout after 8s if cluster unreachable
    });

    console.log(`[Database] MongoDB Connected: ${conn.connection.host} (DB: ${conn.connection.name})`);

    // Event Listeners for connection lifecycle
    mongoose.connection.on('error', (err) => {
      console.error(`[Database] MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database] MongoDB connection lost. Disconnected.');
    });

    // Graceful process termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('[Database] MongoDB connection closed due to process termination.');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    console.error(`[Database] MongoDB initial connection failed: ${error.message}`);
    // In production/staging, fail fast so orchestrators (docker/k8s/pm2) know the service is down
    process.exit(1);
  }
};

module.exports = connectDB;
