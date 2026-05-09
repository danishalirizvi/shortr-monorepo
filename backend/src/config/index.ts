import 'dotenv/config';

const config = {
  app: {
    env: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    host: process.env.HOST ?? '0.0.0.0',
    baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',
    get isDev() { return this.env === 'development'; },
    get isProd() { return this.env === 'production'; },
  },
  mongo: {
    uri: process.env.MONGO_URI ?? 'mongodb://localhost:27017/shortr',
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },
  urlShortener: {
    shortCodeLength: 7,
    idRangeSize: 1_000_000,
  },
  auth: {
    apiKey: process.env.API_KEY ?? '',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '100', 10),
    createWindowMs: parseInt(process.env.CREATE_RATE_LIMIT_WINDOW_MS ?? '60000', 10),
    createMax: parseInt(process.env.CREATE_RATE_LIMIT_MAX_REQUESTS ?? '10', 10),
  },
  logging: {
    level: process.env.LOG_LEVEL ?? 'info',
    dir: process.env.LOG_DIR ?? 'logs',
  },
} as const;

export default config;
