import { RequestHandler } from 'express';
import logger from '../../utils/logger';

const requestLogger: RequestHandler = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level =
      res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[level](`${req.method} ${req.originalUrl}`, {
      correlationId: req.correlationId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });

  next();
};

export default requestLogger;
