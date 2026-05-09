import { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import config from '../../config';
import AppError from '../../utils/AppError';

/**
 * Validates the Authorization: Bearer <key> header against the API_KEY env var.
 * Apply to any route that should be restricted to trusted callers.
 */
export const apiKeyAuth: RequestHandler = (req, _res, next) => {
  try {
    if (!config.auth.apiKey) {
      // API_KEY not configured — fail open in dev, fail closed in prod
      if (config.app.isProd) {
        throw new AppError('API key authentication is not configured.', StatusCodes.INTERNAL_SERVER_ERROR, 'SERVER_MISCONFIGURATION');
      }
      return next();
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('API key required. Use Authorization: Bearer <key>', StatusCodes.UNAUTHORIZED, 'UNAUTHORIZED');
    }

    const provided = authHeader.slice(7).trim();
    if (provided !== config.auth.apiKey) {
      throw new AppError('Invalid API key.', StatusCodes.FORBIDDEN, 'FORBIDDEN');
    }

    next();
  } catch (err) {
    next(err);
  }
};
