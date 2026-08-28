// TalkTime Chat Context
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Conversation, ConversationMember, ConversationItem, Message, MessageAttachment } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

interface ChatContextType {
  conversations: ConversationItem[];
  activeConversationId: string | null;
  activeConversation: { conversation: Conversation; members: ConversationMember[] } | null;
  messages: Message[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isLoadingOlder: boolean;
  hasMoreMessages: boolean;
  replyingTo: Message | null;
  editingMessage: Message | null;
  activeTab: 'all' | 'direct' | 'groups' | 'unread';
  searchQuery: string;
  setActiveTab: (tab: 'all' | 'direct' | 'groups' | 'unread') => void;
  setSearchQuery: (q: string) => void;
  selectConversation: (id: string | null) => Promise<void>;
  sendMessage: (content: string, attachments?: MessageAttachment[]) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  deleteMessage: (messageId: string, mode: 'FOR_EVERYONE' | 'FOR_ME') => Promise<void>;
  setReplyingTo: (msg: Message | null) => void;
  setEditingMessage: (msg: Message | null) => void;
  loadOlderMessages: () => Promise<void>;
  createDirectChat: (recipientId: string) => Promise<string>;
  createGroupChat: (name: string, memberIds: string[], avatarUrl?: string) => Promise<string>;
  updateGroup: (id: string, updates: { name?: string; avatarUrl?: string }) => Promise<void>;
  addGroupMembers: (id: string, userIds: string[]) => Promise<void>;
  leaveOrRemoveGroupMember: (id: string, userId: string) => Promise<void>;
  fetchConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { socket, isConnected, emitRead, emitDelivered, joinConversation, registerMessageHandler } = useSocket();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<{ conversation: Conversation; members: ConversationMember[] } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState<boolean>(false);
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'groups' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeConvIdRef = useRef<string | null>(null);
  activeConvIdRef.current = activeConversationId;

  // Fetch all user conversations
  const fetchConversations = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await api.getConversations();
      if (res.success && res.data) {
        setConversations(res.data.conversations);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Select a conversation and load messages
  const selectConversation = useCallback(async (id: string | null) => {
    setActiveConversationId(id);
    setReplyingTo(null);
    setEditingMessage(null);

    if (!id) {
      setActiveConversation(null);
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    joinConversation(id);

    try {
      const [convRes, msgRes] = await Promise.all([
        api.getConversation(id),
        api.getMessages(id, 50),
      ]);

      if (convRes.success && convRes.data) {
        setActiveConversation(convRes.data);
      }

      if (msgRes.success && msgRes.data) {
        setMessages(msgRes.data.messages);
        setHasMoreMessages(msgRes.data.hasMore);
      }

      // Mark conversation as read
      await api.markConversationRead(id);
      emitRead(id);

      // Clear unread count locally
      setConversations(prev =>
        prev.map(c => (c.conversation.id === id ? { ...c, unreadCount: 0 } : c))
      );
    } catch (err) {
      console.error('Failed to load conversation details:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [joinConversation, emitRead]);

  // Load older messages on scroll-up
  const loadOlderMessages = async () => {
    if (!activeConversationId || isLoadingOlder || !hasMoreMessages || messages.length === 0) return;
    setIsLoadingOlder(true);
    try {
      const oldestTimestamp = messages[0].createdAt;
      const res = await api.getMessages(activeConversationId, 40, oldestTimestamp);
      if (res.success && res.data) {
        setMessages(prev => [...res.data.messages, ...prev]);
        setHasMoreMessages(res.data.hasMore);
      }
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      setIsLoadingOlder(false);
    }
  };

  // Send a message
  const sendMessage = async (content: string, attachments: MessageAttachment[] = []) => {
    if (!activeConversationId || (!content.trim() && attachments.length === 0)) return;

    const payload = {
      content: content.trim(),
      messageType: attachments.length > 0 ? 'FILE' : 'TEXT',
      replyToId: replyingTo?.id || null,
      attachments,
    };

    setReplyingTo(null);

    try {
      const res = await api.sendMessage(activeConversationId, payload);
      if (res.success && res.data) {
        const newMsg = res.data.message;

        // Append to current messages if not already added by socket
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // Update conversation item preview
        setConversations(prev =>
          prev.map(c => {
            if (c.conversation.id === activeConversationId) {
              return {
                ...c,
                lastMessage: newMsg,
                conversation: {
                  ...c.conversation,
                  updatedAt: newMsg.createdAt,
                },
              };
            }
            return c;
          }).sort((a, b) => new Date(b.conversation.updatedAt).getTime() - new Date(a.conversation.updatedAt).getTime())
        );
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      throw err;
    }
  };

  // Edit message
  const editMessage = async (messageId: string, newContent: string) => {
    try {
      const res = await api.editMessage(messageId, newContent);
      if (res.success && res.data) {
        setMessages(prev =>
          prev.map(m => (m.id === messageId ? { ...m, content: newContent, isEdited: true } : m))
        );
        setEditingMessage(null);
      }
    } catch (err) {
      console.error('Failed to edit message:', err);
      throw err;
    }
  };

  // Delete message
  const deleteMessage = async (messageId: string, mode: 'FOR_EVERYONE' | 'FOR_ME') => {
    try {
      await api.deleteMessage(messageId, mode);
      if (mode === 'FOR_EVERYONE') {
        setMessages(prev =>
          prev.map(m => (m.id === messageId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m))
        );
      } else {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
      throw err;
    }
  };

  // Create 1-to-1 chat
  const createDirectChat = async (recipientId: string): Promise<string> => {
    const res = await api.createDirectConversation(recipientId);
    if (res.success && res.data) {
      await fetchConversations();
      await selectConversation(res.data.conversation.id);
      return res.data.conversation.id;
    }
    throw new Error('Failed to create direct chat.');
  };

  // Create group chat
  const createGroupChat = async (name: string, memberIds: string[], avatarUrl?: string): Promise<string> => {
    const res = await api.createGroupConversation({ name, memberIds, avatarUrl });
    if (res.success && res.data) {
      await fetchConversations();
      await selectConversation(res.data.conversation.id);
      return res.data.conversation.id;
    }
    throw new Error('Failed to create group chat.');
  };

  // Update group details
  const updateGroup = async (id: string, updates: { name?: string; avatarUrl?: string }) => {
    const res = await api.updateConversation(id, updates);
    if (res.success && res.data) {
      setActiveConversation(prev => prev ? { ...prev, conversation: res.data.conversation } : prev);
      setConversations(prev =>
        prev.map(c => (c.conversation.id === id ? { ...c, conversation: res.data.conversation } : c))
      );
    }
  };

  // Add group members
  const addGroupMembers = async (id: string, userIds: string[]) => {
    const res = await api.addGroupMembers(id, userIds);
    if (res.success && res.data) {
      setActiveConversation(prev => prev ? { ...prev, members: res.data.members } : prev);
      await fetchConversations();
    }
  };

  // Leave or remove group member
  const leaveOrRemoveGroupMember = async (id: string, userId: string) => {
    await api.removeGroupMember(id, userId);
    if (currentUser?.id === userId) {
      selectConversation(null);
      await fetchConversations();
    } else {
      const convRes = await api.getConversation(id);
      if (convRes.success && convRes.data) {
        setActiveConversation(convRes.data);
      }
      await fetchConversations();
    }
  };

  // Listen to incoming messages via Socket.IO
  useEffect(() => {
    const unsubscribe = registerMessageHandler((newMsg: Message) => {
      const currentActiveId = activeConvIdRef.current;

      if (newMsg.conversationId === currentActiveId) {
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // Emit read and delivered
        emitRead(newMsg.conversationId);
        emitDelivered(newMsg.id, newMsg.conversationId);
      }

      // Update conversation item list
      setConversations(prev => {
        const exists = prev.some(c => c.conversation.id === newMsg.conversationId);
        if (!exists) {
          fetchConversations();
          return prev;
        }

        return prev.map(c => {
          if (c.conversation.id === newMsg.conversationId) {
            const isCurrentlyOpen = c.conversation.id === currentActiveId;
            return {
              ...c,
              lastMessage: newMsg,
              unreadCount: isCurrentlyOpen ? 0 : c.unreadCount + 1,
              conversation: {
                ...c.conversation,
                updatedAt: newMsg.createdAt,
              },
            };
          }
          return c;
        }).sort((a, b) => new Date(b.conversation.updatedAt).getTime() - new Date(a.conversation.updatedAt).getTime());
      });
    });

    return unsubscribe;
  }, [registerMessageHandler, emitRead, emitDelivered, fetchConversations]);

  // Listen to socket status updates (message:edited, message:deleted, message:read, message:delivered)
  useEffect(() => {
    if (!socket) return;

    const handleMessageEdited = (data: { message: Message }) => {
      setMessages(prev =>
        prev.map(m => (m.id === data.message.id ? { ...m, content: data.message.content, isEdited: true } : m))
      );
      setConversations(prev =>
        prev.map(c => {
          if (c.lastMessage?.id === data.message.id) {
            return { ...c, lastMessage: { ...c.lastMessage, content: data.message.content, isEdited: true } };
          }
          return c;
        })
      );
    };

    const handleMessageDeleted = (data: { messageId: string; conversationId: string; mode: string }) => {
      if (data.mode === 'FOR_EVERYONE') {
        setMessages(prev =>
          prev.map(m => (m.id === data.messageId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m))
        );
      } else {
        setMessages(prev => prev.filter(m => m.id !== data.messageId));
      }
    };

    const handleMessageRead = (data: { conversationId: string; readerId: string }) => {
      if (data.conversationId === activeConvIdRef.current) {
        setMessages(prev =>
          prev.map(m => (m.senderId === currentUser?.id ? { ...m, deliveryStatus: 'READ' } : m))
        );
      }
    };

    const handleMessageDelivered = (data: { messageId: string; conversationId: string }) => {
      if (data.conversationId === activeConvIdRef.current) {
        setMessages(prev =>
          prev.map(m => (m.id === data.messageId && m.deliveryStatus === 'SENT' ? { ...m, deliveryStatus: 'DELIVERED' } : m))
        );
      }
    };

    const handleConversationNew = () => {
      fetchConversations();
    };

    socket.on('message:edited', handleMessageEdited);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('message:read', handleMessageRead);
    socket.on('message:delivered', handleMessageDelivered);
    socket.on('conversation:new', handleConversationNew);
    socket.on('conversation:updated', handleConversationNew);
    socket.on('conversation:members_updated', handleConversationNew);

    return () => {
      socket.off('message:edited', handleMessageEdited);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('message:read', handleMessageRead);
      socket.off('message:delivered', handleMessageDelivered);
      socket.off('conversation:new', handleConversationNew);
      socket.off('conversation:updated', handleConversationNew);
      socket.off('conversation:members_updated', handleConversationNew);
    };
  }, [socket, currentUser?.id, fetchConversations]);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversationId,
        activeConversation,
        messages,
        isLoadingConversations,
        isLoadingMessages,
        isLoadingOlder,
        hasMoreMessages,
        replyingTo,
        editingMessage,
        activeTab,
        searchQuery,
        setActiveTab,
        setSearchQuery,
        selectConversation,
        sendMessage,
        editMessage,
        deleteMessage,
        setReplyingTo,
        setEditingMessage,
        loadOlderMessages,
        createDirectChat,
        createGroupChat,
        updateGroup,
        addGroupMembers,
        leaveOrRemoveGroupMember,
        fetchConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};
