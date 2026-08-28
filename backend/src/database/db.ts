// TalkTime Database Service & Persistence Layer
import { Collection, Db, MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export interface UserRecord {
  id: string;
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl: string | null;
  bio: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMemberRecord {
  id: string;
  conversationId: string;
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
  lastReadMessageId: string | null;
  lastReadAt: string | null;
}

export interface ConversationRecord {
  id: string;
  isGroup: boolean;
  name: string | null;
  avatarUrl: string | null;
  creatorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MessageAttachmentRecord {
  id: string;
  messageId: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  createdAt: string;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
  replyToId: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  deletedForUsers: string[];
  deliveryStatus: 'SENT' | 'DELIVERED' | 'READ';
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  actorId: string | null;
  conversationId: string | null;
  messageId: string | null;
  type: 'NEW_MESSAGE' | 'MENTION' | 'GROUP_INVITE' | 'GROUP_ACTIVITY' | 'SYSTEM';
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

const withoutPassword = (user: UserRecord): Omit<UserRecord, 'passwordHash'> => { const { passwordHash: _passwordHash, ...safe } = user; return safe; };
type HydratedMessage = MessageRecord & { attachments: MessageAttachmentRecord[]; sender: Omit<UserRecord, 'passwordHash'>; replyTo?: MessageRecord | null };
type ConversationSummary = {
  conversation: ConversationRecord;
  members: Array<ConversationMemberRecord & { user: Omit<UserRecord, 'passwordHash'> }>;
  lastMessage: (MessageRecord & { attachments: MessageAttachmentRecord[] }) | null;
  unreadCount: number;
};

class Database {
  private client: MongoClient | null = null;
  private mongoDb: Db | null = null;
  private connected = false;
  private requireDb(): Db { if (!this.mongoDb || !this.connected) throw new Error('Database is not connected'); return this.mongoDb; }
  private collection<T extends object>(name: string): Collection<T> { return this.requireDb().collection<T>(name); }
  async connect(): Promise<void> {
    if (this.connected) return;
    if (!config.mongodbUri) throw new Error('MONGODB_URI is required to connect to MongoDB');
    const client = new MongoClient(config.mongodbUri); await client.connect(); const database = client.db(config.mongodbDb); await database.command({ ping: 1 });
    await Promise.all([
      database.collection<UserRecord>('users').createIndexes([{ key: { id: 1 }, unique: true }, { key: { email: 1 }, unique: true }, { key: { username: 1 }, unique: true }, { key: { name: 1 } }]),
      database.collection<ConversationRecord>('conversations').createIndex({ id: 1 }, { unique: true }),
      database.collection<ConversationMemberRecord>('conversationMembers').createIndexes([{ key: { id: 1 }, unique: true }, { key: { conversationId: 1, userId: 1 }, unique: true }, { key: { userId: 1, conversationId: 1 } }]),
      database.collection<MessageRecord>('messages').createIndexes([{ key: { id: 1 }, unique: true }, { key: { conversationId: 1, createdAt: -1 } }, { key: { senderId: 1, createdAt: -1 } }]),
      database.collection<MessageAttachmentRecord>('attachments').createIndexes([{ key: { id: 1 }, unique: true }, { key: { messageId: 1 } }]),
      database.collection<NotificationRecord>('notifications').createIndexes([{ key: { id: 1 }, unique: true }, { key: { userId: 1, createdAt: -1 } }]),
    ]);
    this.client = client; this.mongoDb = database; this.connected = true; logger.info('Database', `Connected to MongoDB database ${config.mongodbDb}.`);
  }
  isReady(): boolean { return this.connected && this.mongoDb !== null; }
  async close(): Promise<void> { const client = this.client; this.client = null; this.mongoDb = null; this.connected = false; if (client) await client.close(); }

    public async seedInitialData(): Promise<void> {
    if (config.nodeEnv !== 'development' && config.nodeEnv !== 'test') throw new Error('seedInitialData is only available in development or test');
    const db = this.requireDb();
    const salt = bcrypt.genSaltSync(10);
    const defaultPassword = bcrypt.hashSync('Password123!', salt);

    const now = new Date().toISOString();
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const twoHoursAgo = new Date(Date.now() - 7200000).toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();

    const u1: UserRecord = {
      id: 'usr_john_doe',
      name: 'John Doe',
      username: 'johndoe',
      email: 'john@talktime.app',
      passwordHash: defaultPassword,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      bio: 'Product Designer & Coffee lover ☕️',
      createdAt: yesterday,
      updatedAt: now,
    };

    const u2: UserRecord = {
      id: 'usr_sarah_connor',
      name: 'Sarah Connor',
      username: 'sarah',
      email: 'sarah@talktime.app',
      passwordHash: defaultPassword,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      bio: 'Frontend Architect | React & TypeScript enthusiast 🚀',
      createdAt: yesterday,
      updatedAt: now,
    };

    const u3: UserRecord = {
      id: 'usr_alex_rivera',
      name: 'Alex Rivera',
      username: 'alex',
      email: 'alex@talktime.app',
      passwordHash: defaultPassword,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      bio: 'Cloud Engineer & distributed systems fan ☁️',
      createdAt: yesterday,
      updatedAt: now,
    };

    const u4: UserRecord = {
      id: 'usr_elena_rostova',
      name: 'Elena Rostova',
      username: 'elena',
      email: 'elena@talktime.app',
      passwordHash: defaultPassword,
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      bio: 'UX Research & Design Systems Lead ✨',
      createdAt: yesterday,
      updatedAt: now,
    };

    const u5: UserRecord = {
      id: 'usr_marcus_vance',
      name: 'Marcus Vance',
      username: 'marcus',
      email: 'marcus@talktime.app',
      passwordHash: defaultPassword,
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      bio: 'Backend Ninja 🥷 APIs, Databases & Real-time systems',
      createdAt: yesterday,
      updatedAt: now,
    };

    const users = [u1, u2, u3, u4, u5];

    // Conversation 1: 1-to-1 between John and Sarah
    const c1: ConversationRecord = {
      id: 'conv_john_sarah',
      isGroup: false,
      name: null,
      avatarUrl: null,
      creatorId: u1.id,
      createdAt: yesterday,
      updatedAt: now,
    };

    const m1_1: ConversationMemberRecord = {
      id: 'mem_1',
      conversationId: c1.id,
      userId: u1.id,
      role: 'ADMIN',
      joinedAt: yesterday,
      lastReadMessageId: 'msg_2',
      lastReadAt: now,
    };
    const m1_2: ConversationMemberRecord = {
      id: 'mem_2',
      conversationId: c1.id,
      userId: u2.id,
      role: 'ADMIN',
      joinedAt: yesterday,
      lastReadMessageId: 'msg_3',
      lastReadAt: now,
    };

    // Conversation 2: Group "TalkTime Engineering"
    const c2: ConversationRecord = {
      id: 'conv_group_eng',
      isGroup: true,
      name: 'TalkTime Core Team',
      avatarUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80',
      creatorId: u1.id,
      createdAt: yesterday,
      updatedAt: now,
    };

    const m2_1: ConversationMemberRecord = { id: 'mem_g1', conversationId: c2.id, userId: u1.id, role: 'ADMIN', joinedAt: yesterday, lastReadMessageId: 'msg_g3', lastReadAt: now };
    const m2_2: ConversationMemberRecord = { id: 'mem_g2', conversationId: c2.id, userId: u2.id, role: 'MEMBER', joinedAt: yesterday, lastReadMessageId: 'msg_g3', lastReadAt: now };
    const m2_3: ConversationMemberRecord = { id: 'mem_g3', conversationId: c2.id, userId: u3.id, role: 'MEMBER', joinedAt: yesterday, lastReadMessageId: 'msg_g2', lastReadAt: now };
    const m2_4: ConversationMemberRecord = { id: 'mem_g4', conversationId: c2.id, userId: u4.id, role: 'MEMBER', joinedAt: yesterday, lastReadMessageId: 'msg_g3', lastReadAt: now };
    const m2_5: ConversationMemberRecord = { id: 'mem_g5', conversationId: c2.id, userId: u5.id, role: 'MEMBER', joinedAt: yesterday, lastReadMessageId: 'msg_g3', lastReadAt: now };

    // Conversation 3: 1-to-1 between John and Alex
    const c3: ConversationRecord = {
      id: 'conv_john_alex',
      isGroup: false,
      name: null,
      avatarUrl: null,
      creatorId: u1.id,
      createdAt: twoHoursAgo,
      updatedAt: twoHoursAgo,
    };
    const m3_1: ConversationMemberRecord = { id: 'mem_ja1', conversationId: c3.id, userId: u1.id, role: 'ADMIN', joinedAt: twoHoursAgo, lastReadMessageId: 'msg_ja1', lastReadAt: now };
    const m3_2: ConversationMemberRecord = { id: 'mem_ja2', conversationId: c3.id, userId: u3.id, role: 'ADMIN', joinedAt: twoHoursAgo, lastReadMessageId: 'msg_ja1', lastReadAt: now };

    // Messages for Conversation 1
    const msg1: MessageRecord = {
      id: 'msg_1',
      conversationId: c1.id,
      senderId: u2.id,
      content: 'Hey John! Have you reviewed the new WebSocket architecture for TalkTime?',
      messageType: 'TEXT',
      replyToId: null,
      isEdited: false,
      isDeleted: false,
      deletedForUsers: [],
      deliveryStatus: 'READ',
      createdAt: twoHoursAgo,
      updatedAt: twoHoursAgo,
    };
    const msg2: MessageRecord = {
      id: 'msg_2',
      conversationId: c1.id,
      senderId: u1.id,
      content: 'Yes Sarah! The real-time presence and typing synchronization looks super clean.',
      messageType: 'TEXT',
      replyToId: 'msg_1',
      isEdited: false,
      isDeleted: false,
      deletedForUsers: [],
      deliveryStatus: 'READ',
      createdAt: oneHourAgo,
      updatedAt: oneHourAgo,
    };
    const msg3: MessageRecord = {
      id: 'msg_3',
      conversationId: c1.id,
      senderId: u2.id,
      content: 'Awesome! Delivery receipts (sent ✓, delivered ✓✓, read ✓✓) are working seamlessly in real time now.',
      messageType: 'TEXT',
      replyToId: null,
      isEdited: false,
      isDeleted: false,
      deletedForUsers: [],
      deliveryStatus: 'DELIVERED',
      createdAt: new Date(Date.now() - 600000).toISOString(),
      updatedAt: new Date(Date.now() - 600000).toISOString(),
    };

    // Messages for Conversation 2 (Group)
    const msg_g1: MessageRecord = {
      id: 'msg_g1',
      conversationId: c2.id,
      senderId: u1.id,
      content: 'Welcome everyone to the TalkTime core engineering channel! 🚀',
      messageType: 'TEXT',
      replyToId: null,
      isEdited: false,
      isDeleted: false,
      deletedForUsers: [],
      deliveryStatus: 'READ',
      createdAt: yesterday,
      updatedAt: yesterday,
    };
    const msg_g2: MessageRecord = {
      id: 'msg_g2',
      conversationId: c2.id,
      senderId: u3.id,
      content: 'PostgreSQL schema with Prisma models and Redis presence integration are fully ready.',
      messageType: 'TEXT',
      replyToId: null,
      isEdited: false,
      isDeleted: false,
      deletedForUsers: [],
      deliveryStatus: 'READ',
      createdAt: twoHoursAgo,
      updatedAt: twoHoursAgo,
    };
    const msg_g3: MessageRecord = {
      id: 'msg_g3',
      conversationId: c2.id,
      senderId: u4.id,
      content: 'I have tested group creations, member role management, attachments, and user search. All silky smooth!',
      messageType: 'TEXT',
      replyToId: null,
      isEdited: false,
      isDeleted: false,
      deletedForUsers: [],
      deliveryStatus: 'READ',
      createdAt: oneHourAgo,
      updatedAt: oneHourAgo,
    };

    // Messages for Conversation 3
    const msg_ja1: MessageRecord = {
      id: 'msg_ja1',
      conversationId: c3.id,
      senderId: u3.id,
      content: 'Hey John, do you want to verify the readiness probe endpoints?',
      messageType: 'TEXT',
      replyToId: null,
      isEdited: false,
      isDeleted: false,
      deletedForUsers: [],
      deliveryStatus: 'READ',
      createdAt: twoHoursAgo,
      updatedAt: twoHoursAgo,
    };

    // Notifications
    const n1: NotificationRecord = {
      id: 'notif_1',
      userId: u1.id,
      actorId: u2.id,
      conversationId: c1.id,
      messageId: msg3.id,
      type: 'NEW_MESSAGE',
      title: 'Sarah Connor sent a message',
      body: msg3.content,
      isRead: false,
      createdAt: new Date(Date.now() - 600000).toISOString(),
    };
    const n2: NotificationRecord = {
      id: 'notif_2',
      userId: u1.id,
      actorId: u4.id,
      conversationId: c2.id,
      messageId: msg_g3.id,
      type: 'GROUP_ACTIVITY',
      title: 'New message in TalkTime Core Team',
      body: msg_g3.content,
      isRead: true,
      createdAt: oneHourAgo,
    };

    const seedData = {
      users,
      conversations: [c1, c2, c3],
      conversationMembers: [m1_1, m1_2, m2_1, m2_2, m2_3, m2_4, m2_5, m3_1, m3_2],
      messages: [msg1, msg2, msg3, msg_g1, msg_g2, msg_g3, msg_ja1],
      attachments: [] as MessageAttachmentRecord[],
      notifications: [n1, n2],
    };
    for (const [name, records] of Object.entries(seedData)) {
      const collection = db.collection(name);
      await collection.deleteMany({});
      if (records.length) await collection.insertMany(records);
    }
    logger.info('Database', 'Seeded initial development database with 5 users, 3 conversations, and sample messages.');
  }

  async createUser(data: { name: string; username: string; email: string; passwordHash: string; avatarUrl?: string | null; bio?: string }): Promise<UserRecord> { const now = new Date().toISOString(); const user: UserRecord = { id: `usr_${uuidv4().substring(0, 8)}`, name: data.name, username: data.username.toLowerCase().trim(), email: data.email.toLowerCase().trim(), passwordHash: data.passwordHash, avatarUrl: data.avatarUrl || null, bio: data.bio || 'Hey there! I am using TalkTime.', createdAt: now, updatedAt: now }; await this.collection<UserRecord>('users').insertOne(user); return user; }
  async findUserById(id: string): Promise<UserRecord | null> { return await this.collection<UserRecord>('users').findOne({ id }, { projection: { _id: 0 } }) || null; }
  async findUserByEmailOrUsername(identifier: string): Promise<UserRecord | null> { const value = identifier.toLowerCase().trim(); return await this.collection<UserRecord>('users').findOne({ $or: [{ email: value }, { username: value }] }, { projection: { _id: 0 } }) || null; }
  async searchUsers(query: string, excludeUserId?: string): Promise<UserRecord[]> { const q = query.toLowerCase().trim(); const filter: Record<string, unknown> = {}; if (excludeUserId) filter.id = { $ne: excludeUserId }; if (q) filter.$or = [{ name: { $regex: q, $options: 'i' } }, { username: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }]; return this.collection<UserRecord>('users').find(filter, { projection: { _id: 0 } }).sort({ name: 1 }).toArray(); }
  async updateUser(id: string, updates: Partial<Pick<UserRecord, 'name' | 'username' | 'bio' | 'avatarUrl' | 'passwordHash'>>): Promise<UserRecord | null> { const set: Record<string, unknown> = { ...updates, updatedAt: new Date().toISOString() }; if (typeof set.username === 'string') set.username = set.username.toLowerCase().trim(); return await this.collection<UserRecord>('users').findOneAndUpdate({ id }, { $set: set }, { returnDocument: 'after', projection: { _id: 0 } }) || null; }
  async createConversation(data: { isGroup: boolean; name?: string | null; avatarUrl?: string | null; creatorId: string; memberIds: string[] }): Promise<{ conversation: ConversationRecord; members: ConversationMemberRecord[] }> { const now = new Date().toISOString(); const conversation: ConversationRecord = { id: `conv_${uuidv4().substring(0, 8)}`, isGroup: data.isGroup, name: data.name || null, avatarUrl: data.avatarUrl || null, creatorId: data.creatorId, createdAt: now, updatedAt: now }; const ids = Array.from(new Set([data.creatorId, ...data.memberIds])); const members = ids.map(userId => ({ id: `mem_${uuidv4().substring(0, 8)}`, conversationId: conversation.id, userId, role: userId === data.creatorId ? 'ADMIN' as const : 'MEMBER' as const, joinedAt: now, lastReadMessageId: null, lastReadAt: now })); await this.collection<ConversationRecord>('conversations').insertOne(conversation); await this.collection<ConversationMemberRecord>('conversationMembers').insertMany(members); return { conversation, members }; }
  async findDirectConversation(userA: string, userB: string): Promise<ConversationRecord | null> { const rows = await this.collection<ConversationMemberRecord>('conversationMembers').aggregate<any>([{ $match: { userId: { $in: [userA, userB] } } }, { $group: { _id: '$conversationId', users: { $addToSet: '$userId' }, count: { $sum: 1 } } }, { $match: { count: 2, users: { $all: [userA, userB] } } }]).toArray(); return rows.length ? await this.collection<ConversationRecord>('conversations').findOne({ id: { $in: rows.map(r => r._id) }, isGroup: false }, { projection: { _id: 0 } }) || null : null; }
  async getConversationById(id: string): Promise<ConversationRecord | null> { return await this.collection<ConversationRecord>('conversations').findOne({ id }, { projection: { _id: 0 } }) || null; }
  async getConversationMembers(conversationId: string): Promise<Array<ConversationMemberRecord & { user: Omit<UserRecord, 'passwordHash'> }>> { const members = await this.collection<ConversationMemberRecord>('conversationMembers').find({ conversationId }, { projection: { _id: 0 } }).toArray(); return Promise.all(members.map(async m => { const u = await this.findUserById(m.userId); return { ...m, user: u ? withoutPassword(u) : { id: m.userId, name: 'Unknown User', username: 'unknown', email: '', avatarUrl: null, bio: '', createdAt: m.joinedAt, updatedAt: m.joinedAt } }; })); }
  async addMemberToConversation(conversationId: string, userId: string, role: 'ADMIN' | 'MEMBER' = 'MEMBER'): Promise<ConversationMemberRecord> { const existing = await this.collection<ConversationMemberRecord>('conversationMembers').findOne({ conversationId, userId }, { projection: { _id: 0 } }); if (existing) return existing; const now = new Date().toISOString(); const member = { id: `mem_${uuidv4().substring(0, 8)}`, conversationId, userId, role, joinedAt: now, lastReadMessageId: null, lastReadAt: now }; await this.collection<ConversationMemberRecord>('conversationMembers').insertOne(member); return member; }
  async removeMemberFromConversation(conversationId: string, userId: string): Promise<boolean> { return (await this.collection<ConversationMemberRecord>('conversationMembers').deleteOne({ conversationId, userId })).deletedCount > 0; }
  async updateConversation(id: string, updates: Partial<Pick<ConversationRecord, 'name' | 'avatarUrl'>>): Promise<ConversationRecord | null> { return await this.collection<ConversationRecord>('conversations').findOneAndUpdate({ id }, { $set: { ...updates, updatedAt: new Date().toISOString() } }, { returnDocument: 'after', projection: { _id: 0 } }) || null; }
  async deleteConversation(id: string): Promise<boolean> { const messageIds = await this.collection<MessageRecord>('messages').find({ conversationId: id }, { projection: { id: 1, _id: 0 } }).toArray().then(rows => rows.map(row => row.id)); const result = await this.collection<ConversationRecord>('conversations').deleteOne({ id }); await Promise.all([this.collection<ConversationMemberRecord>('conversationMembers').deleteMany({ conversationId: id }), this.collection<MessageRecord>('messages').deleteMany({ conversationId: id }), messageIds.length ? this.collection<MessageAttachmentRecord>('attachments').deleteMany({ messageId: { $in: messageIds } }) : Promise.resolve()]); return result.deletedCount > 0; }
  private async hydrateMessage(m: MessageRecord): Promise<HydratedMessage> { const u = await this.findUserById(m.senderId); const [attachments, replyTo] = await Promise.all([this.collection<MessageAttachmentRecord>('attachments').find({ messageId: m.id }, { projection: { _id: 0 } }).toArray(), m.replyToId ? this.findMessageById(m.replyToId) : Promise.resolve(null)]); return { ...m, attachments, sender: u ? withoutPassword(u) : { id: m.senderId, name: 'User', username: 'user', email: '', avatarUrl: null, bio: '', createdAt: m.createdAt, updatedAt: m.createdAt }, replyTo }; }
  async createMessage(data: { conversationId: string; senderId: string; content: string; messageType?: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM'; replyToId?: string | null; attachments?: Array<{ filename: string; originalName: string; mimetype: string; size: number; url: string }> }): Promise<HydratedMessage> { const now = new Date().toISOString(); const message: MessageRecord = { id: `msg_${uuidv4().substring(0, 8)}`, conversationId: data.conversationId, senderId: data.senderId, content: data.content, messageType: data.messageType || 'TEXT', replyToId: data.replyToId || null, isEdited: false, isDeleted: false, deletedForUsers: [], deliveryStatus: 'SENT', createdAt: now, updatedAt: now }; const attachments = (data.attachments || []).map(a => ({ id: `att_${uuidv4().substring(0, 8)}`, messageId: message.id, ...a, createdAt: now })); await this.collection<MessageRecord>('messages').insertOne(message); if (attachments.length) await this.collection<MessageAttachmentRecord>('attachments').insertMany(attachments); await this.collection<ConversationRecord>('conversations').updateOne({ id: data.conversationId }, { $set: { updatedAt: now } }); return this.hydrateMessage(message); }
  async getMessages(conversationId: string, userId: string, limit = 50, beforeTimestamp?: string): Promise<{ messages: HydratedMessage[]; hasMore: boolean }> { const filter: Record<string, unknown> = { conversationId, deletedForUsers: { $ne: userId } }; if (beforeTimestamp) filter.createdAt = { $lt: beforeTimestamp }; const rows = await this.collection<MessageRecord>('messages').find(filter, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(limit + 1).toArray(); return { messages: await Promise.all(rows.slice(0, limit).reverse().map(m => this.hydrateMessage(m))), hasMore: rows.length > limit }; }
  async findMessageById(id: string): Promise<MessageRecord | null> { return await this.collection<MessageRecord>('messages').findOne({ id }, { projection: { _id: 0 } }) || null; }
  async updateMessage(id: string, content: string): Promise<MessageRecord | null> { return await this.collection<MessageRecord>('messages').findOneAndUpdate({ id }, { $set: { content, isEdited: true, updatedAt: new Date().toISOString() } }, { returnDocument: 'after', projection: { _id: 0 } }) || null; }
  async deleteMessage(id: string, userId: string, mode: 'FOR_EVERYONE' | 'FOR_ME'): Promise<MessageRecord | null> { const update = mode === 'FOR_EVERYONE' ? { $set: { isDeleted: true, content: 'This message was deleted', updatedAt: new Date().toISOString() } } : { $addToSet: { deletedForUsers: userId } }; return await this.collection<MessageRecord>('messages').findOneAndUpdate({ id }, update, { returnDocument: 'after', projection: { _id: 0 } }) || null; }
  async updateDeliveryStatus(conversationId: string, readerUserId: string, status: 'DELIVERED' | 'READ'): Promise<number> { const filter: Record<string, unknown> = { conversationId, senderId: { $ne: readerUserId }, deliveryStatus: status === 'READ' ? { $ne: 'READ' } : 'SENT' }; const result = await this.collection<MessageRecord>('messages').updateMany(filter, { $set: { deliveryStatus: status } }); if (status === 'READ') await this.collection<ConversationMemberRecord>('conversationMembers').updateOne({ conversationId, userId: readerUserId }, { $set: { lastReadAt: new Date().toISOString() } }); return result.modifiedCount; }
  async searchMessages(query: string, userId: string, conversationId?: string): Promise<Array<MessageRecord & { conversationName?: string; senderName?: string }>> { const q = query.trim(); if (!q) return []; const memberships = await this.collection<ConversationMemberRecord>('conversationMembers').find({ userId }, { projection: { conversationId: 1, _id: 0 } }).toArray(); const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); const filter: Record<string, unknown> = { conversationId: conversationId || { $in: memberships.map(m => m.conversationId) }, deletedForUsers: { $ne: userId }, isDeleted: false, content: { $regex: escaped, $options: 'i' } }; const rows = await this.collection<MessageRecord>('messages').find(filter, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(30).toArray(); return Promise.all(rows.map(async m => { const [c, u] = await Promise.all([this.getConversationById(m.conversationId), this.findUserById(m.senderId)]); return { ...m, conversationName: c?.isGroup ? c.name || 'Group' : 'Direct Chat', senderName: u?.name || 'User' }; })); }
  async getUserConversations(userId: string): Promise<ConversationSummary[]> { const memberships = await this.collection<ConversationMemberRecord>('conversationMembers').find({ userId }, { projection: { _id: 0 } }).toArray(); const convs = await this.collection<ConversationRecord>('conversations').find({ id: { $in: memberships.map(m => m.conversationId) } }, { projection: { _id: 0 } }).toArray(); const result = await Promise.all(convs.map(async c => { const member = memberships.find(m => m.conversationId === c.id)!; const members = await this.getConversationMembers(c.id); const rows = await this.collection<MessageRecord>('messages').find({ conversationId: c.id, deletedForUsers: { $ne: userId } }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(1).toArray(); const lastMessage = rows[0] ? await this.hydrateMessage(rows[0]) : null; const unread: Record<string, unknown> = { conversationId: c.id, senderId: { $ne: userId }, deletedForUsers: { $ne: userId } }; if (member.lastReadAt) unread.createdAt = { $gt: member.lastReadAt }; const unreadCount = await this.collection<MessageRecord>('messages').countDocuments(unread); return { conversation: c, members, lastMessage, unreadCount }; })); return result.sort((a,b) => new Date(b.lastMessage?.createdAt || b.conversation.updatedAt).getTime() - new Date(a.lastMessage?.createdAt || a.conversation.updatedAt).getTime()); }
  async createNotification(data: { userId: string; actorId?: string | null; conversationId?: string | null; messageId?: string | null; type: 'NEW_MESSAGE' | 'MENTION' | 'GROUP_INVITE' | 'GROUP_ACTIVITY' | 'SYSTEM'; title: string; body: string }): Promise<NotificationRecord> { const n: NotificationRecord = { id: `notif_${uuidv4().substring(0, 8)}`, userId: data.userId, actorId: data.actorId || null, conversationId: data.conversationId || null, messageId: data.messageId || null, type: data.type, title: data.title, body: data.body, isRead: false, createdAt: new Date().toISOString() }; await this.collection<NotificationRecord>('notifications').insertOne(n); const old = await this.collection<NotificationRecord>('notifications').find({ userId: data.userId }, { projection: { id: 1, _id: 0 } }).sort({ createdAt: -1 }).skip(100).toArray(); if (old.length) await this.collection<NotificationRecord>('notifications').deleteMany({ id: { $in: old.map(x => x.id) } }); return n; }
  async getUserNotifications(userId: string): Promise<NotificationRecord[]> { return this.collection<NotificationRecord>('notifications').find({ userId }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray(); }
  async markNotificationAsRead(id: string, userId: string): Promise<boolean> { return (await this.collection<NotificationRecord>('notifications').updateOne({ id, userId }, { $set: { isRead: true } })).matchedCount > 0; }
  async markAllNotificationsAsRead(userId: string): Promise<number> { return (await this.collection<NotificationRecord>('notifications').updateMany({ userId, isRead: false }, { $set: { isRead: true } })).modifiedCount; }
}
export const db = new Database();
