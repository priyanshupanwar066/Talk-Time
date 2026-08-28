// Conversations Controller
import { Request, Response, NextFunction } from 'express';
import { db } from '../../database/db';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { redisService } from '../../database/redis';
import { logger } from '../../utils/logger';
import { socketHandler } from '../../websocket/socketHandler';

export const listConversations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const conversations = await db.getUserConversations(userId);

    // Hydrate online presence for member users
    const allUserIds = new Set<string>();
    conversations.forEach(c => c.members.forEach(m => allUserIds.add(m.userId)));
    const presences = await redisService.getMultiplePresences(Array.from(allUserIds));

    const enriched = conversations.map(c => ({
      ...c,
      members: c.members.map(m => ({
        ...m,
        user: {
          ...m.user,
          presence: presences[m.userId] || { status: 'offline', lastSeen: m.user.updatedAt },
        },
      })),
    }));

    res.json({
      success: true,
      data: {
        conversations: enriched,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const createConversation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { isGroup, name, avatarUrl, recipientId, memberIds } = req.body;

    if (!isGroup) {
      if (!recipientId) {
        throw new AppError('recipientId is required for one-to-one conversations.', 400, 'VALIDATION_ERROR');
      }

      if (recipientId === userId) {
        throw new AppError('You cannot create a direct conversation with yourself.', 400, 'INVALID_RECIPIENT');
      }

      const recipient = await db.findUserById(recipientId);
      if (!recipient) {
        throw new AppError('Recipient user not found.', 404, 'USER_NOT_FOUND');
      }

      // Check if existing conversation exists
      const existing = await db.findDirectConversation(userId, recipientId);
      if (existing) {
        const members = await db.getConversationMembers(existing.id);
        return res.json({
          success: true,
          data: {
            conversation: existing,
            members,
            isNew: false,
          },
        });
      }

      const created = await db.createConversation({
        isGroup: false,
        creatorId: userId,
        memberIds: [recipientId],
      });

      const members = await db.getConversationMembers(created.conversation.id);

      // Notify recipient socket
      socketHandler.emitToUser(recipientId, 'conversation:new', {
        conversation: created.conversation,
        members,
      });

      return res.status(201).json({
        success: true,
        data: {
          conversation: created.conversation,
          members,
          isNew: true,
        },
      });
    }

    // Group conversation
    if (!name || name.trim().length === 0) {
      throw new AppError('Group name is required.', 400, 'VALIDATION_ERROR');
    }

    const groupMembers: string[] = Array.isArray(memberIds) ? memberIds : [];
    const created = await db.createConversation({
      isGroup: true,
      name: name.trim(),
      avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(name)}`,
      creatorId: userId,
      memberIds: groupMembers,
    });

    const members = await db.getConversationMembers(created.conversation.id);

    // Notify all group members
    for (const memId of groupMembers) {
      if (memId !== userId) {
        socketHandler.emitToUser(memId, 'conversation:new', {
          conversation: created.conversation,
          members,
        });
        await db.createNotification({
          userId: memId,
          actorId: userId,
          conversationId: created.conversation.id,
          type: 'GROUP_INVITE',
          title: 'Added to group',
          body: `${req.user!.name} added you to group "${name}".`,
        });
        socketHandler.emitToUser(memId, 'notification:new', {
          title: 'Added to group',
          body: `${req.user!.name} added you to group "${name}".`,
        });
      }
    }

    logger.info('Conversations', `Group created: "${name}" (${created.conversation.id}) by user ${req.user!.username}`);

    res.status(201).json({
      success: true,
      data: {
        conversation: created.conversation,
        members,
        isNew: true,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getConversationById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const conv = await db.getConversationById(id);
    if (!conv) {
      throw new AppError('Conversation not found.', 404, 'CONVERSATION_NOT_FOUND');
    }

    const members = await db.getConversationMembers(id);
    const isMember = members.some(m => m.userId === userId);
    if (!isMember) {
      throw new AppError('You are not a member of this conversation.', 403, 'FORBIDDEN');
    }

    const userIds = members.map(m => m.userId);
    const presences = await redisService.getMultiplePresences(userIds);

    const membersWithPresence = members.map(m => ({
      ...m,
      user: {
        ...m.user,
        presence: presences[m.userId] || { status: 'offline', lastSeen: m.user.updatedAt },
      },
    }));

    res.json({
      success: true,
      data: {
        conversation: conv,
        members: membersWithPresence,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateConversation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { name, avatarUrl } = req.body;

    const conv = await db.getConversationById(id);
    if (!conv) throw new AppError('Conversation not found.', 404, 'CONVERSATION_NOT_FOUND');

    const members = await db.getConversationMembers(id);
    const userMembership = members.find(m => m.userId === userId);
    if (!userMembership || (conv.isGroup && userMembership.role !== 'ADMIN' && conv.creatorId !== userId)) {
      throw new AppError('Only group admins can update group details.', 403, 'FORBIDDEN');
    }

    const updated = await db.updateConversation(id, { name, avatarUrl });

    socketHandler.emitToConversation(id, 'conversation:updated', {
      conversation: updated,
    });

    res.json({
      success: true,
      data: {
        conversation: updated,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const addMembers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new AppError('userIds array is required.', 400, 'VALIDATION_ERROR');
    }

    const conv = await db.getConversationById(id);
    if (!conv) throw new AppError('Conversation not found.', 404, 'CONVERSATION_NOT_FOUND');
    if (!conv.isGroup) throw new AppError('Cannot add members to a direct 1-to-1 conversation.', 400, 'NOT_A_GROUP');

    const members = await db.getConversationMembers(id);
    const userMembership = members.find(m => m.userId === userId);
    if (!userMembership || userMembership.role !== 'ADMIN') {
      throw new AppError('Only group admins can add members.', 403, 'FORBIDDEN');
    }

    for (const newUid of userIds) {
      await db.addMemberToConversation(id, newUid, 'MEMBER');
      socketHandler.emitToUser(newUid, 'conversation:new', {
        conversation: conv,
        members: await db.getConversationMembers(id),
      });
      await db.createNotification({
        userId: newUid,
        actorId: userId,
        conversationId: id,
        type: 'GROUP_INVITE',
        title: 'Added to group',
        body: `${req.user!.name} added you to "${conv.name}".`,
      });
    }

    const updatedMembers = await db.getConversationMembers(id);
    socketHandler.emitToConversation(id, 'conversation:members_updated', {
      conversationId: id,
      members: updatedMembers,
    });

    res.json({
      success: true,
      data: {
        members: updatedMembers,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const removeMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id, targetUserId } = req.params;
    const userId = req.user!.id;

    const conv = await db.getConversationById(id);
    if (!conv) throw new AppError('Conversation not found.', 404, 'CONVERSATION_NOT_FOUND');

    const members = await db.getConversationMembers(id);
    const requester = members.find(m => m.userId === userId);
    if (!requester) throw new AppError('You are not a member of this conversation.', 403, 'FORBIDDEN');

    const isSelfLeave = targetUserId === userId;
    if (!isSelfLeave && requester.role !== 'ADMIN' && conv.creatorId !== userId) {
      throw new AppError('Only admins can remove other members.', 403, 'FORBIDDEN');
    }

    await db.removeMemberFromConversation(id, targetUserId);

    const updatedMembers = await db.getConversationMembers(id);
    socketHandler.emitToConversation(id, 'conversation:members_updated', {
      conversationId: id,
      members: updatedMembers,
      removedUserId: targetUserId,
    });

    res.json({
      success: true,
      message: isSelfLeave ? 'Left group successfully.' : 'Member removed successfully.',
    });
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const updatedCount = await db.updateDeliveryStatus(id, userId, 'READ');

    // Notify other participants that messages were read
    socketHandler.emitToConversation(id, 'message:read', {
      conversationId: id,
      readerId: userId,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      data: {
        updatedCount,
      },
    });
  } catch (err) {
    next(err);
  }
};
