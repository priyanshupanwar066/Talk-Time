// Notifications Controller
import { Response, NextFunction } from 'express';
import { db } from '../../database/db';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

export const listNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const notifications = await db.getUserNotifications(userId);
    const unreadCount = notifications.filter(n => !n.isRead).length;

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const success = await db.markNotificationAsRead(id, userId);
    if (!success) {
      throw new AppError('Notification not found or already read.', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      message: 'Notification marked as read.',
    });
  } catch (err) {
    next(err);
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const count = await db.markAllNotificationsAsRead(userId);

    res.json({
      success: true,
      data: {
        markedCount: count,
      },
    });
  } catch (err) {
    next(err);
  }
};
