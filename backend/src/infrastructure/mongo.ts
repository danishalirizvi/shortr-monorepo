import mongoose from 'mongoose';
import config from '../config';
import logger from '../utils/logger';

export async function connectMongo(): Promise<void> {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });

  await mongoose.connect(config.mongo.uri, {
    serverSelectionTimeoutMS: 5_000,
    socketTimeoutMS: 45_000,
  });

  logger.info('MongoDB connected', { uri: config.mongo.uri.replace(/\/\/.*@/, '//***@') });
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected cleanly');
}
