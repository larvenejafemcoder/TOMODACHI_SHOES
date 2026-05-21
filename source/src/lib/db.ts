import mongoose from 'mongoose';

let cached: mongoose.Connection | null = null;

export async function connectDB(): Promise<mongoose.Connection> {
  if (cached) return cached;

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tomodachi-shoes';

  try {
    await mongoose.connect(uri, {
      maxPoolSize: 50,
      minPoolSize: 10,
      socketTimeoutMS: 30000,
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
    });

    mongoose.connection.on('error', (err) => {
      console.error('[DB] Connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[DB] Disconnected');
      cached = null;
    });

    cached = mongoose.connection;
    console.log('[DB] Connected to MongoDB');
    return cached;
  } catch (err) {
    console.error('[DB] Failed to connect:', err);
    throw err;
  }
}

export async function disconnectDB(): Promise<void> {
  if (cached) {
    await mongoose.disconnect();
    cached = null;
    console.log('[DB] Disconnected cleanly');
  }
}

export function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export function getConnection(): mongoose.Connection {
  if (!cached) throw new Error('Database not connected. Call connectDB() first.');
  return cached;
}
