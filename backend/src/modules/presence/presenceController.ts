// Presence Controller
import { Request, Response, NextFunction } from 'express';
import { redisService } from '../../database/redis';

export const getPresence = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const presence = await redisService.getPresence(userId);
    res.json({
      success: true,
      data: {
        presence: presence || { userId, status: 'offline', lastSeen: new Date(0).toISOString() },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getMultiplePresences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userIds = (req.query.userIds as string)?.split(',') || [];
    const presences = await redisService.getMultiplePresences(userIds);
    res.json({
      success: true,
      data: {
        presences,
      },
    });
  } catch (err) {
    next(err);
  }
};
