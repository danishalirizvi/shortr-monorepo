/**
 * Applied only to GET /:shortCode (redirect route).
 *
 * Logs the redirect event immediately, then records a Click document
 * fire-and-forget so the latency of a MongoDB write never impacts the
 * time-to-redirect for the user.
 */
import { RequestHandler } from 'express';
import { Click } from '../../models/Click.model';
import logger from '../../utils/logger';

const analyticsLogger: RequestHandler = (req, _res, next) => {
  const { shortCode } = req.params;
  const ip        = req.ip ?? 'unknown';
  const userAgent = req.get('user-agent') ?? '';

  logger.info('URL redirect', {
    correlationId: req.correlationId,
    shortCode,
    ip,
  });

  // Fire-and-forget — never await, never block the redirect
  Click.create({ shortCode, ip, userAgent }).catch((err: Error) => {
    logger.error('Failed to record click analytics', { shortCode, error: err.message });
  });

  next();
};

export default analyticsLogger;
