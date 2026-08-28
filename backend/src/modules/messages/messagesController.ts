// Messages Controller
import { Request, Response, NextFunction } from 'express';
import { db } from '../../database/db';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { storage } from '../../utils/storage';
import { socketHandler } from '../../websocket/socketHandler';
import { logger } from '../../utils/logger';

export const getMessages = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id: conversationId } = req.params;
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const beforeTimestamp = req.query.before as string | undefined;

    // Check membership
    const members = await db.getConversationMembers(conversationId);
    if (!members.some(m => m.userId === userId)) {
      throw new AppError('You are not a member of this conversation.', 403, 'FORBIDDEN');
    }

    const { messages, hasMore } = await db.getMessages(conversationId, userId, limit, beforeTimestamp);

    res.json({
      success: true,
      data: {
        messages,
        hasMore,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const sendMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id: conversationId } = req.params;
    const userId = req.user!.id;
    const { content, messageType, replyToId, attachments } = req.body;

    if (!content && (!attachments || attachments.length === 0)) {
      throw new AppError('Message content or attachment is required.', 400, 'VALIDATION_ERROR');
    }

    // Verify membership
    const members = await db.getConversationMembers(conversationId);
    if (!members.some(m => m.userId === userId)) {
      throw new AppError('You are not a member of this conversation.', 403, 'FORBIDDEN');
    }

    const message = await db.createMessage({
      conversationId,
      senderId: userId,
      content: content ? content.trim() : (attachments?.length ? 'Sent an attachment' : ''),
      messageType: messageType || (attachments?.length ? 'FILE' : 'TEXT'),
      replyToId: replyToId || null,
      attachments: attachments || [],
    });

    const conv = await db.getConversationById(conversationId);

    // Broadcast message:new to conversation room
    socketHandler.emitToConversation(conversationId, 'message:new', {
      message,
    });

    // Also notify offline members with notifications
    for (const member of members) {
      if (member.userId !== userId) {
        const notifTitle = conv?.isGroup ? `${conv.name} (${req.user!.name})` : req.user!.name;
        const notifBody = message.content.length > 80 ? message.content.substring(0, 80) + '...' : message.content;

        const notif = await db.createNotification({
          userId: member.userId,
          actorId: userId,
          conversationId,
          messageId: message.id,
          type: conv?.isGroup ? 'GROUP_ACTIVITY' : 'NEW_MESSAGE',
          title: `New message from ${notifTitle}`,
          body: notifBody,
        });

        socketHandler.emitToUser(member.userId, 'notification:new', notif);
      }
    }

    logger.info('Messages', `Message sent in ${conversationId} by ${req.user!.username}`);

    res.status(201).json({
      success: true,
      data: {
        message,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const uploadAttachment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('No attachment file uploaded.', 400, 'FILE_MISSING');
    }

    const result = await storage.saveFile(req.file);

    res.json({
      success: true,
      data: {
        attachment: {
          filename: result.filename,
          originalName: result.originalName,
          mimetype: result.mimetype,
          size: result.size,
          url: result.url,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const editMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      throw new AppError('Updated content cannot be empty.', 400, 'VALIDATION_ERROR');
    }

    const existing = await db.findMessageById(id);
    if (!existing) {
      throw new AppError('Message not found.', 404, 'MESSAGE_NOT_FOUND');
    }

    if (existing.senderId !== userId) {
      throw new AppError('You can only edit your own messages.', 403, 'FORBIDDEN');
    }

    if (existing.isDeleted) {
      throw new AppError('Cannot edit a deleted message.', 400, 'INVALID_STATE');
    }

    const updated = await db.updateMessage(id, content.trim());

    socketHandler.emitToConversation(existing.conversationId, 'message:edited', {
      message: updated,
    });

    res.json({
      success: true,
      data: {
        message: updated,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const mode = (req.body.mode as 'FOR_EVERYONE' | 'FOR_ME') || 'FOR_ME';

    const existing = await db.findMessageById(id);
    if (!existing) {
      throw new AppError('Message not found.', 404, 'MESSAGE_NOT_FOUND');
    }

    if (mode === 'FOR_EVERYONE' && existing.senderId !== userId) {
      // Check if user is group admin
      const conv = await db.getConversationById(existing.conversationId);
      const members = await db.getConversationMembers(existing.conversationId);
      const requester = members.find(m => m.userId === userId);
      if (!requester || requester.role !== 'ADMIN') {
        throw new AppError('You can only delete your own messages for everyone.', 403, 'FORBIDDEN');
      }
    }

    const deleted = await db.deleteMessage(id, userId, mode);

    if (mode === 'FOR_EVERYONE') {
      socketHandler.emitToConversation(existing.conversationId, 'message:deleted', {
        messageId: id,
        conversationId: existing.conversationId,
        mode: 'FOR_EVERYONE',
        deletedMessage: deleted,
      });
    } else {
      // Notify only caller socket
      socketHandler.emitToUser(userId, 'message:deleted', {
        messageId: id,
        conversationId: existing.conversationId,
        mode: 'FOR_ME',
      });
    }

    res.json({
      success: true,
      data: {
        message: deleted,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const searchMessages = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const query = (req.query.q as string) || '';
    const conversationId = req.query.conversationId as string | undefined;
    const userId = req.user!.id;

    if (!query.trim()) {
      return res.json({ success: true, data: { results: [] } });
    }

    const results = await db.searchMessages(query, userId, conversationId);

    res.json({
      success: true,
      data: {
        results,
      },
    });
  } catch (err) {
    next(err);
  }
};
