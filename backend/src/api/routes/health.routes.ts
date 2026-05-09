import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import { getRedisClient } from '../../infrastructure/redis';
import config from '../../config';

const router = Router();

router.get('/live', (_req, res) => {
  res.status(StatusCodes.OK).json({
    success: true,
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

router.get('/ready', async (_req, res) => {
  const checks: Record<string, string> = {};

  // MongoDB — readyState 1 = connected
  checks['db'] = mongoose.connection.readyState === 1 ? 'ok' : 'error';

  // Redis
  try {
    await getRedisClient().ping();
    checks['cache'] = 'ok';
  } catch {
    checks['cache'] = 'error';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');

  res.status(allOk ? StatusCodes.OK : StatusCodes.SERVICE_UNAVAILABLE).json({
    success: allOk,
    status: allOk ? 'ready' : 'degraded',
    checks,
    version: process.env['npm_package_version'] ?? '1.0.0',
    env: config.app.env,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

router.get('/', (_req, res) => {
  res.status(StatusCodes.OK).json({
    success: true,
    status: 'healthy',
    service: 'shortr',
    version: process.env['npm_package_version'] ?? '1.0.0',
    env: config.app.env,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    pid: process.pid,
    memory: process.memoryUsage(),
  });
});

export default router;
