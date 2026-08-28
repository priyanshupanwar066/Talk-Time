// JWT Authentication Middleware for TalkTime
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { config } from '../config/env';
import { db, UserRecord } from '../database/db';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: Omit<UserRecord, 'passwordHash'>;
}

export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
  iat?: number;
  exp?: number;
}

export function generateToken(payload: { userId: string; email: string; username: string }): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'],
  });
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Missing or malformed token.', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AppError('Authentication token missing.', 401, 'UNAUTHORIZED');
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    } catch (jwtErr: any) {
      logger.warn('Auth', `JWT verification failed: ${jwtErr.message}`);
      throw new AppError('Invalid or expired authentication token.', 401, 'INVALID_TOKEN');
    }

    const user = await db.findUserById(decoded.userId);
    if (!user) {
      throw new AppError('Authenticated user no longer exists.', 401, 'USER_NOT_FOUND');
    }

    const { passwordHash, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (err) {
    next(err);
  }
}
