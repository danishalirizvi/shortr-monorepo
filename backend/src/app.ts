import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import path from 'path';

import config from './config';
import correlationId from './api/middlewares/correlationId';
import requestLogger from './api/middlewares/requestLogger';
import { globalLimiter } from './api/middlewares/rateLimiter';
import { notFoundHandler, errorHandler } from './api/middlewares/errorHandler';
import apiRoutes from './api/routes';
import urlRoutes from './api/routes/url.routes';
import redirectRoutes from './api/routes/redirect.routes';

export function createApp(): express.Application {
  const app = express();

  // Trust exactly 1 proxy (Cloudflare) so req.ip reflects the real client IP.
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmet({ contentSecurityPolicy: false })); // Adjust as needed for production

  // CORS
  app.use(cors({
    origin: config.app.isDev ? '*' : process.env['ALLOWED_ORIGINS']?.split(','),
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
    exposedHeaders: ['x-correlation-id'],
  }));

  // Response compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Correlation ID — must be before request logger
  app.use(correlationId);

  // Structured request logging
  app.use(requestLogger);

  // Global rate limiter
  app.use(globalLimiter);

  // ─── Routes ───────────────────────────────────────────────────────────────
  // Order is load-bearing:
  //   1. API and Redirection (handled before static files)
  app.use('/api/v1', apiRoutes);
  app.use('/', urlRoutes);
  app.use('/', redirectRoutes);

  // 2. Serve static frontend files
  const frontendPath = process.env.NODE_ENV === 'production' 
    ? path.join('/app', 'out') 
    : path.join(__dirname, '../../frontend/out');
  app.use(express.static(frontendPath));

  // 3. Catch-all for SPA routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });

  // Error handling (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
