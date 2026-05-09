import Redis from 'ioredis';
import config from '../config';
import logger from '../utils/logger';

let client: Redis | null = null;

export function getRedisClient(): Redis {
  if (!client) {
    client = new Redis(config.redis.url, {
      // Don't queue commands when Redis is down — fail fast so the app can
      // fall through to MongoDB instead of stalling under load.
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > 3) return null; // stop retrying after 3 attempts
        return Math.min(times * 200, 1_000);
      },
    });

    client.on('connect', () => logger.info('Redis connected'));
    client.on('error', (err: Error) => logger.warn('Redis error', { message: err.message }));
    client.on('close', () => logger.warn('Redis connection closed'));
  }
  return client;
}

export async function connectRedis(): Promise<void> {
  await getRedisClient().connect();
}

export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
    logger.info('Redis disconnected cleanly');
  }
}
