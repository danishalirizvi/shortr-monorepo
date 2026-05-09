import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { StatusCodes } from 'http-status-codes';
import config from '../../config';
import { getRedisClient } from '../../infrastructure/redis';
import { Request, Response, NextFunction } from 'express';

const rateLimitResponse = (req: Request, res: Response) => {
  res.status(StatusCodes.TOO_MANY_REQUESTS).json({
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later.' },
    correlationId: req.correlationId,
  });
};

// Applied globally to every request.
// Health endpoints are exempt — Fly's Consul health checker must never be
// rate-limited, especially during degraded states when it polls aggressively.
export const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitResponse,
  skip: (req) => req.path.startsWith('/api/v1/health'),
});

// Applied only to POST /create — stricter limit to prevent link-spam / DoS
export const createLimiter = rateLimit({
  windowMs: config.rateLimit.createWindowMs,
  max: config.rateLimit.createMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitResponse,
});

// Applied to POST /api/v1/public-create — Redis-backed so the counter is shared
// across all Fly.io instances (in-memory limiters are per-process).
// 3 requests per hour per IP — strict because this route has no authentication.
let publicCreateLimiterInstance: any;

export const publicCreateLimiter = (req: Request, res: Response, next: NextFunction) => {
  if (!publicCreateLimiterInstance) {
    publicCreateLimiterInstance = rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 3,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      store: new RedisStore({
        // ioredis v5 — arbitrary commands via the generic call interface.
        // Cast required: ioredis types call() as Promise<unknown> but rate-limit-redis
        // expects Promise<RedisReply> (boolean | number | string | array thereof).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sendCommand: (...args: string[]) => (getRedisClient() as any).call(...args) as Promise<boolean | number | string | (boolean | number | string)[]>,
      }),
      handler: (_req: Request, res: Response) => {
        res.status(StatusCodes.TOO_MANY_REQUESTS).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: "You've reached the limit for public link creation. Please try again in an hour.",
          },
        });
      },
    });
  }
  return publicCreateLimiterInstance(req, res, next);
};
