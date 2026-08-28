// Centralized Error Handling Middleware for TalkTime
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const statusCode = err.statusCode || 500;
  const code = err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'ERROR');
  const message = err.message || 'An unexpected error occurred';

  if (statusCode >= 500) {
    logger.error('ErrorHandler', `500 Server Error: ${message}`, {
      url: req.originalUrl,
      method: req.method,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  } else {
    logger.warn('ErrorHandler', `${statusCode} ${code}: ${message} (${req.method} ${req.originalUrl})`);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(err.details ? { details: err.details } : {}),
    },
  });
}
