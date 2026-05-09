import { Request, Response, NextFunction, RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import AppError from '../../utils/AppError';
import logger from '../../utils/logger';
import config from '../../config';

// Must be mounted after all routes
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, StatusCodes.NOT_FOUND, 'NOT_FOUND'));
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
  const appErr = err instanceof AppError ? err : null;
  const statusCode = appErr?.statusCode ?? StatusCodes.INTERNAL_SERVER_ERROR;
  const isOperational = appErr?.isOperational ?? false;

  logger.error(err.message, {
    correlationId: req.correlationId,
    code: appErr?.code,
    statusCode,
    stack: err.stack,
  });

  const body: Record<string, unknown> = {
    success: false,
    error: {
      code: appErr?.code ?? 'INTERNAL_ERROR',
      message: isOperational ? err.message : 'An unexpected error occurred',
    },
    correlationId: req.correlationId,
  };

  if (config.app.isDev && !isOperational) {
    body['stack'] = err.stack;
  }

  res.status(statusCode).json(body);
};
