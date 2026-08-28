// Users Controller
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../../database/db';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { redisService } from '../../database/redis';
import { storage } from '../../utils/storage';
import { logger } from '../../utils/logger';

export const listUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user?.id;
    const users = await db.searchUsers('', currentUserId);
    const safeUsers = users.map(({ passwordHash, ...safe }) => safe);

    const userIds = safeUsers.map(u => u.id);
    const presences = await redisService.getMultiplePresences(userIds);

    const usersWithPresence = safeUsers.map(u => ({
      ...u,
      presence: presences[u.id] || { status: 'offline', lastSeen: u.updatedAt },
    }));

    res.json({
      success: true,
      data: {
        users: usersWithPresence,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const searchUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const query = (req.query.q as string) || '';
    const currentUserId = req.user?.id;
    const users = await db.searchUsers(query, currentUserId);
    const safeUsers = users.map(({ passwordHash, ...safe }) => safe);

    const userIds = safeUsers.map(u => u.id);
    const presences = await redisService.getMultiplePresences(userIds);

    const usersWithPresence = safeUsers.map(u => ({
      ...u,
      presence: presences[u.id] || { status: 'offline', lastSeen: u.updatedAt },
    }));

    res.json({
      success: true,
      data: {
        users: usersWithPresence,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await db.findUserById(id);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    const { passwordHash, ...safeUser } = user;
    const presence = await redisService.getPresence(id);

    res.json({
      success: true,
      data: {
        user: {
          ...safeUser,
          presence: presence || { status: 'offline', lastSeen: user.updatedAt },
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (req.user?.id !== id) {
      throw new AppError('You are not authorized to update this profile', 403, 'FORBIDDEN');
    }

    const { name, username, bio, avatarUrl, oldPassword, newPassword } = req.body;
    const updates: any = {};

    if (name !== undefined) updates.name = name.trim();
    if (bio !== undefined) updates.bio = bio;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

    if (username !== undefined) {
      const trimmed = username.trim().toLowerCase();
      const existing = await db.findUserByEmailOrUsername(trimmed);
      if (existing && existing.id !== id) {
        throw new AppError('Username is already taken.', 409, 'USERNAME_TAKEN');
      }
      updates.username = trimmed;
    }

    if (newPassword) {
      if (!oldPassword) {
        throw new AppError('Current password is required to set a new password.', 400, 'PASSWORD_REQUIRED');
      }
      const currentUser = await db.findUserById(id);
      if (!currentUser) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      const isMatch = await bcrypt.compare(oldPassword, currentUser.passwordHash);
      if (!isMatch) {
        throw new AppError('Current password does not match.', 400, 'INVALID_PASSWORD');
      }
      const salt = await bcrypt.genSalt(10);
      updates.passwordHash = await bcrypt.hash(newPassword, salt);
    }

    const updated = await db.updateUser(id, updates);
    if (!updated) {
      throw new AppError('Failed to update user', 500, 'UPDATE_FAILED');
    }

    logger.info('Users', `User updated profile: ${updated.username}`);

    const { passwordHash, ...safeUser } = updated;
    res.json({
      success: true,
      data: {
        user: safeUser,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const uploadAvatar = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('No avatar file provided.', 400, 'FILE_MISSING');
    }
    const result = await storage.saveFile(req.file);

    if (req.user) {
      await db.updateUser(req.user.id, { avatarUrl: result.url });
    }

    res.json({
      success: true,
      data: {
        url: result.url,
      },
    });
  } catch (err) {
    next(err);
  }
};
