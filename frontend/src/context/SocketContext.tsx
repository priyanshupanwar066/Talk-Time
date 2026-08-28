// TalkTime Socket.IO Client Context
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Message, TypingData, Notification } from '../types';

interface PresenceStatus {
  status: 'online' | 'offline';
  lastSeen: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  presences: Record<string, PresenceStatus>;
  typingMap: Record<string, TypingData[]>;
  emitTyping: (conversationId: string, isTyping: boolean) => void;
  emitRead: (conversationId: string) => void;
  emitDelivered: (messageId: string, conversationId: string) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  registerMessageHandler: (handler: (message: Message) => void) => () => void;
  registerNotificationHandler: (handler: (notification: Notification) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, currentUser } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [presences, setPresences] = useState<Record<string, PresenceStatus>>({});
  const [typingMap, setTypingMap] = useState<Record<string, TypingData[]>>({});

  const messageHandlersRef = useRef<Set<(message: Message) => void>>(new Set());
  const notificationHandlersRef = useRef<Set<(notification: Notification) => void>>(new Set());

  useEffect(() => {
    if (!token || !currentUser) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
    const socketInstance = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      // Mark self as online
      setPresences(prev => ({
        ...prev,
        [currentUser.id]: { status: 'online', lastSeen: new Date().toISOString() },
      }));
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('user:online', (data: { userId: string; status: 'online'; lastSeen: string }) => {
      setPresences(prev => ({
        ...prev,
        [data.userId]: { status: 'online', lastSeen: data.lastSeen },
      }));
    });

    socketInstance.on('user:offline', (data: { userId: string; status: 'offline'; lastSeen: string }) => {
      setPresences(prev => ({
        ...prev,
        [data.userId]: { status: 'offline', lastSeen: data.lastSeen },
      }));
    });

    socketInstance.on('typing:update', (data: { conversationId: string; typingUsers: TypingData[] }) => {
      setTypingMap(prev => ({
        ...prev,
        [data.conversationId]: data.typingUsers.filter(u => u.userId !== currentUser.id),
      }));
    });

    socketInstance.on('message:new', (data: { message: Message }) => {
      messageHandlersRef.current.forEach(handler => handler(data.message));
    });

    socketInstance.on('notification:new', (notif: Notification) => {
      notificationHandlersRef.current.forEach(handler => handler(notif));
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token, currentUser?.id]);

  const emitTyping = useCallback((conversationId: string, isTyping: boolean) => {
    if (!socket || !isConnected) return;
    socket.emit(isTyping ? 'typing:start' : 'typing:stop', { conversationId });
  }, [socket, isConnected]);

  const emitRead = useCallback((conversationId: string) => {
    if (!socket || !isConnected) return;
    socket.emit('message:read', { conversationId });
  }, [socket, isConnected]);

  const emitDelivered = useCallback((messageId: string, conversationId: string) => {
    if (!socket || !isConnected) return;
    socket.emit('message:delivered', { messageId, conversationId });
  }, [socket, isConnected]);

  const joinConversation = useCallback((conversationId: string) => {
    if (!socket || !isConnected) return;
    socket.emit('conversation:join', conversationId);
  }, [socket, isConnected]);

  const leaveConversation = useCallback((conversationId: string) => {
    if (!socket || !isConnected) return;
    socket.emit('conversation:leave', conversationId);
  }, [socket, isConnected]);

  const registerMessageHandler = useCallback((handler: (message: Message) => void) => {
    messageHandlersRef.current.add(handler);
    return () => {
      messageHandlersRef.current.delete(handler);
    };
  }, []);

  const registerNotificationHandler = useCallback((handler: (notification: Notification) => void) => {
    notificationHandlersRef.current.add(handler);
    return () => {
      notificationHandlersRef.current.delete(handler);
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        presences,
        typingMap,
        emitTyping,
        emitRead,
        emitDelivered,
        joinConversation,
        leaveConversation,
        registerMessageHandler,
        registerNotificationHandler,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};
