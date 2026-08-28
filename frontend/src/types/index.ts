// TalkTime Frontend Shared Types

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  bio: string;
  createdAt: string;
  updatedAt: string;
  presence?: {
    status: 'online' | 'offline';
    lastSeen: string;
  };
}

export interface ConversationMember {
  id: string;
  conversationId: string;
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
  lastReadMessageId: string | null;
  lastReadAt: string | null;
  user: User;
}

export interface Conversation {
  id: string;
  isGroup: boolean;
  name: string | null;
  avatarUrl: string | null;
  creatorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationItem {
  conversation: Conversation;
  members: ConversationMember[];
  lastMessage: Message | null;
  unreadCount: number;
}

export interface MessageAttachment {
  id: string;
  messageId?: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  createdAt?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
  replyToId: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  deletedForUsers?: string[];
  deliveryStatus: 'SENT' | 'DELIVERED' | 'READ';
  createdAt: string;
  updatedAt: string;
  sender: User;
  replyTo?: Message | null;
  attachments: MessageAttachment[];
}

export interface Notification {
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

export interface TypingData {
  conversationId: string;
  userId: string;
  username: string;
  timestamp: number;
}
