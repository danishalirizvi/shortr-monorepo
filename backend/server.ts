import http from 'http';
import { createApp } from './src/app';
import config from './src/config';
import logger from './src/utils/logger';
import { connectMongo, disconnectMongo } from './src/infrastructure/mongo';
import { connectRedis, disconnectRedis } from './src/infrastructure/redis';
import { seedIdRange } from './src/services/idAllocator.service';

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function start(): Promise<void> {
  // 1. Connect to MongoDB (required — fail fast if unavailable)
  await connectMongo();

  // 2. Connect to Redis (best-effort — app works without it via cache-aside fallback)
  try {
    await connectRedis();
  } catch (err) {
    logger.warn('Redis connection failed at startup — continuing without cache', {
      error: (err as Error).message,
    });
  }

  // 3. Seed ID counter so codes never start with leading zeros (62^6 = '1000000')
  await seedIdRange();

  // 4. Start HTTP server
  const app    = createApp();
  const server = http.createServer(app);

  server.listen(config.app.port, config.app.host, () => {
    logger.info('shortr running', {
      host: config.app.host,
      port: config.app.port,
      env:  config.app.env,
      pid:  process.pid,
    });
  });

  // ─── Graceful shutdown ──────────────────────────────────────────────────
  async function gracefulShutdown(signal: string): Promise<void> {
    logger.info(`${signal} received — starting graceful shutdown`);

    const forceExit = setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    server.close(async (err) => {
      if (err) {
        logger.error('Error closing HTTP server', { error: (err as Error).message });
        process.exit(1);
      }
      await Promise.allSettled([disconnectMongo(), disconnectRedis()]);
      logger.info('Shutdown complete');
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
  process.on('SIGINT',  () => void gracefulShutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason: String(reason) });
    process.exit(1);
  });

  process.on('uncaughtException', (err: Error) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });
}

start().catch((err: Error) => {
  // eslint-disable-next-line no-console
  console.error('Fatal: failed to start server', err.message);
  process.exit(1);
});
