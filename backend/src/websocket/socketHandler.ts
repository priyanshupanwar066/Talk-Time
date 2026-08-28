// TalkTime WebSocket Socket.IO Handler
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { db } from '../database/db';
import { redisService } from '../database/redis';
import { logger } from '../utils/logger';

class SocketHandler {
  private io: Server | null = null;
  private userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds

  init(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: config.isProduction
          ? config.clientUrls
          : (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
            if (!origin || config.clientUrls.includes(origin.replace(/\/$/, '')) ||
                /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
              callback(null, true);
              return;
            }
            callback(new Error('CORS origin not allowed'));
          },
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 30000,
      pingInterval: 10000,
    });

    // Authentication middleware for socket connections
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, config.jwtSecret) as { userId: string; email: string; username: string };
        const user = await db.findUserById(decoded.userId);
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.data.userId = user.id;
        socket.data.user = {
          id: user.id,
          name: user.name,
          username: user.username,
          avatarUrl: user.avatarUrl,
        };
        next();
      } catch (err: any) {
        logger.warn('WebSocket', `Socket connection authentication failed: ${err.message}`);
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });

    logger.info('WebSocket', 'Socket.IO real-time server initialized and listening');
  }

  private async handleConnection(socket: Socket) {
    const userId = socket.data.userId;
    const user = socket.data.user;

    logger.info('WebSocket', `Client connected: ${user.username} (Socket: ${socket.id})`);

    // Track user socket
    let sockets = this.userSockets.get(userId);
    if (!sockets) {
      sockets = new Set();
      this.userSockets.set(userId, sockets);
    }
    sockets.add(socket.id);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Update presence in Redis & broadcast online
    await redisService.setPresence(userId, 'online', socket.id);
    this.io?.emit('user:online', {
      userId,
      status: 'online',
      lastSeen: new Date().toISOString(),
    });

    // Auto-join user to all their conversations
    try {
      const convs = await db.getUserConversations(userId);
      for (const c of convs) {
        socket.join(`conv:${c.conversation.id}`);
      }
    } catch (err: any) {
      logger.error('WebSocket', `Error joining conversation rooms: ${err.message}`);
    }

    // Handle joining specific conversation room
    socket.on('conversation:join', (conversationId: string) => {
      socket.join(`conv:${conversationId}`);
      logger.debug('WebSocket', `User ${user.username} joined room conv:${conversationId}`);
    });

    // Handle leaving specific conversation room
    socket.on('conversation:leave', (conversationId: string) => {
      socket.leave(`conv:${conversationId}`);
    });

    // Handle typing start
    socket.on('typing:start', async ({ conversationId }: { conversationId: string }) => {
      const activeTyping = await redisService.setTyping(conversationId, userId, user.name, true);
      socket.to(`conv:${conversationId}`).emit('typing:update', {
        conversationId,
        typingUsers: activeTyping,
      });
    });

    // Handle typing stop
    socket.on('typing:stop', async ({ conversationId }: { conversationId: string }) => {
      const activeTyping = await redisService.setTyping(conversationId, userId, user.name, false);
      socket.to(`conv:${conversationId}`).emit('typing:update', {
        conversationId,
        typingUsers: activeTyping,
      });
    });

    // Handle message delivery receipt
    socket.on('message:delivered', async ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      socket.to(`conv:${conversationId}`).emit('message:delivered', {
        messageId,
        conversationId,
        deliveredTo: userId,
      });
    });

    // Handle message read receipt
    socket.on('message:read', async ({ conversationId }: { conversationId: string }) => {
      await db.updateDeliveryStatus(conversationId, userId, 'READ');
      socket.to(`conv:${conversationId}`).emit('message:read', {
        conversationId,
        readerId: userId,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle disconnect
    socket.on('disconnect', async (reason) => {
      logger.info('WebSocket', `Client disconnected: ${user.username} (Socket: ${socket.id}, Reason: ${reason})`);

      const userSockSet = this.userSockets.get(userId);
      if (userSockSet) {
        userSockSet.delete(socket.id);
        if (userSockSet.size === 0) {
          this.userSockets.delete(userId);
          const now = new Date().toISOString();
          await redisService.setPresence(userId, 'offline');
          this.io?.emit('user:offline', {
            userId,
            status: 'offline',
            lastSeen: now,
          });
        }
      }
    });
  }

  // Helper method to emit events to a conversation room
  emitToConversation(conversationId: string, event: string, data: any) {
    if (!this.io) return;
    this.io.to(`conv:${conversationId}`).emit(event, data);
  }

  // Helper method to emit events to a specific user's room
  emitToUser(userId: string, event: string, data: any) {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(event, data);
  }

  // Broadcast to all connected clients
  broadcast(event: string, data: any) {
    if (!this.io) return;
    this.io.emit(event, data);
  }
}

export const socketHandler = new SocketHandler();
