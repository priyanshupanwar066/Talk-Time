// Redis Presence & Temporary State Manager for TalkTime
import Redis from 'ioredis';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export interface PresenceData {
  userId: string;
  status: 'online' | 'offline';
  lastSeen: string;
  socketId?: string;
}

export interface TypingData {
  conversationId: string;
  userId: string;
  username: string;
  timestamp: number;
}

class RedisService {
  private client: Redis | null = null;
  private isConnected = false;
  // In-memory fallback if Redis is unavailable
  private memoryPresence = new Map<string, PresenceData>();
  private memoryTyping = new Map<string, Map<string, TypingData>>();
  private memorySockets = new Map<string, string>(); // socketId -> userId

  constructor() {
    this.init();
  }

  isReady(): boolean {
    return this.isConnected || !config.isProduction;
  }

  private init() {
    if (!config.redisUrl) {
      logger.info('Redis', 'No REDIS_URL provided, operating in in-memory temporary state mode');
      return;
    }

    try {
      this.client = new Redis(config.redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // Don't spam retries if offline
        enableOfflineQueue: false,
      });

      this.client.connect().then(() => {
        this.isConnected = true;
        logger.info('Redis', 'Connected to Redis server successfully');
      }).catch((err) => {
        this.isConnected = false;
        logger.error('Redis', `Redis not reachable: ${err.message}`);
      });

      this.client.on('error', (err) => {
        if (this.isConnected) {
          logger.warn('Redis', `Redis error: ${err.message}`);
        }
        this.isConnected = false;
      });
    } catch (err: any) {
      this.isConnected = false;
      logger.error('Redis', `Redis initialization failed: ${err.message}`);
    }
  }

  async setPresence(userId: string, status: 'online' | 'offline', socketId?: string): Promise<PresenceData> {
    const data: PresenceData = {
      userId,
      status,
      lastSeen: new Date().toISOString(),
      socketId,
    };

    if (this.isConnected && this.client) {
      try {
        await this.client.set(`presence:${userId}`, JSON.stringify(data));
        if (status === 'online') {
          await this.client.sadd('online_users', userId);
          if (socketId) await this.client.set(`socket:${socketId}`, userId);
        } else {
          await this.client.srem('online_users', userId);
          if (socketId) await this.client.del(`socket:${socketId}`);
        }
      } catch (err: any) {
        logger.debug('Redis', `Falling back to memory on setPresence: ${err.message}`);
      }
    }

    // In-memory update
    this.memoryPresence.set(userId, data);
    if (socketId) {
      if (status === 'online') {
        this.memorySockets.set(socketId, userId);
      } else {
        this.memorySockets.delete(socketId);
      }
    }

    return data;
  }

  async getPresence(userId: string): Promise<PresenceData | null> {
    if (this.isConnected && this.client) {
      try {
        const raw = await this.client.get(`presence:${userId}`);
        if (raw) return JSON.parse(raw);
      } catch (err: any) {
        logger.debug('Redis', `Error getting presence from Redis: ${err.message}`);
      }
    }
    return this.memoryPresence.get(userId) || null;
  }

  async getMultiplePresences(userIds: string[]): Promise<Record<string, PresenceData>> {
    const result: Record<string, PresenceData> = {};
    for (const id of userIds) {
      const p = await this.getPresence(id);
      if (p) {
        result[id] = p;
      } else {
        result[id] = {
          userId: id,
          status: 'offline',
          lastSeen: new Date(0).toISOString(),
        };
      }
    }
    return result;
  }

  async getAllOnlineUsers(): Promise<string[]> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.smembers('online_users');
      } catch (err: any) {
        logger.debug('Redis', `Error fetching online users from Redis: ${err.message}`);
      }
    }
    const online: string[] = [];
    for (const [id, data] of this.memoryPresence.entries()) {
      if (data.status === 'online') online.push(id);
    }
    return online;
  }

  async getUserBySocketId(socketId: string): Promise<string | null> {
    if (this.isConnected && this.client) {
      try {
        const uid = await this.client.get(`socket:${socketId}`);
        if (uid) return uid;
      } catch (err: any) {
        // fallback
      }
    }
    return this.memorySockets.get(socketId) || null;
  }

  async setTyping(conversationId: string, userId: string, username: string, isTyping: boolean): Promise<TypingData[]> {
    let convTyping = this.memoryTyping.get(conversationId);
    if (!convTyping) {
      convTyping = new Map<string, TypingData>();
      this.memoryTyping.set(conversationId, convTyping);
    }

    if (isTyping) {
      convTyping.set(userId, {
        conversationId,
        userId,
        username,
        timestamp: Date.now(),
      });
    } else {
      convTyping.delete(userId);
    }

    // Clean up stale typing > 6 seconds
    const now = Date.now();
    for (const [uid, item] of convTyping.entries()) {
      if (now - item.timestamp > 6000) {
        convTyping.delete(uid);
      }
    }

    return Array.from(convTyping.values());
  }

  async getTypingUsers(conversationId: string): Promise<TypingData[]> {
    const convTyping = this.memoryTyping.get(conversationId);
    if (!convTyping) return [];
    const now = Date.now();
    const active: TypingData[] = [];
    for (const [uid, item] of convTyping.entries()) {
      if (now - item.timestamp <= 6000) {
        active.push(item);
      } else {
        convTyping.delete(uid);
      }
    }
    return active;
  }
}

export const redisService = new RedisService();
