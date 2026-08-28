// Auth Controller
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../../database/db';
import { generateToken, AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import { redisService } from '../../database/redis';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, username, email, password, avatarUrl, bio } = req.body;

    if (!name || !username || !email || !password) {
      throw new AppError('Name, username, email, and password are required.', 400, 'VALIDATION_ERROR');
    }

    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters long.', 400, 'WEAK_PASSWORD');
    }

    // Check unique
    const existingEmail = await db.findUserByEmailOrUsername(email);
    if (existingEmail) {
      throw new AppError('User with this email or username already exists.', 409, 'USER_EXISTS');
    }

    const existingUsername = await db.findUserByEmailOrUsername(username);
    if (existingUsername) {
      throw new AppError('Username is already taken.', 409, 'USERNAME_TAKEN');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await db.createUser({
      name: name.trim(),
      username: username.trim(),
      email: email.trim(),
      passwordHash,
      avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`,
      bio: bio || 'Hey there! I am using TalkTime.',
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    logger.info('Auth', `New user registered: ${user.username} (${user.id})`);

    const { passwordHash: _, ...safeUser } = user;

    res.status(201).json({
      success: true,
      data: {
        user: safeUser,
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier, email, username, password } = req.body;
    const loginId = identifier || email || username;

    if (!loginId || !password) {
      throw new AppError('Email/username and password are required.', 400, 'VALIDATION_ERROR');
    }

    const user = await db.findUserByEmailOrUsername(loginId);
    if (!user) {
      logger.warn('Auth', `Failed login attempt for identifier: ${loginId}`);
      throw new AppError('Invalid email/username or password.', 401, 'INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      logger.warn('Auth', `Invalid password for user: ${user.username}`);
      throw new AppError('Invalid email/username or password.', 401, 'INVALID_CREDENTIALS');
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    logger.info('Auth', `User logged in successfully: ${user.username}`);

    const { passwordHash: _, ...safeUser } = user;

    res.json({
      success: true,
      data: {
        user: safeUser,
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user) {
      await redisService.setPresence(req.user.id, 'offline');
      logger.info('Auth', `User logged out: ${req.user.username}`);
    }
    res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401, 'UNAUTHORIZED');
    }
    res.json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (err) {
    next(err);
  }
};
