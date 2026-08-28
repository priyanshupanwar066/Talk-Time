// Notification Context for TalkTime
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Notification } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  soundEnabled: boolean;
  activeToast: Notification | null;
  toggleSound: () => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  dismissToast: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Web Audio synthesizer for pleasant notification chime
function playNotificationChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // A5
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // audio context might be blocked if no user gesture yet
  }
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { registerNotificationHandler } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('talktime_sound') !== 'false';
  });
  const [activeToast, setActiveToast] = useState<Notification | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await api.getNotifications();
      if (res.success && res.data) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Handle incoming live socket notifications
  useEffect(() => {
    const unsubscribe = registerNotificationHandler((notif: Notification) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
      setActiveToast(notif);

      if (soundEnabled) {
        playNotificationChime();
      }

      // Auto dismiss toast after 5s
      setTimeout(() => {
        setActiveToast(current => (current?.id === notif.id ? null : current));
      }, 5000);
    });

    return unsubscribe;
  }, [registerNotificationHandler, soundEnabled]);

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      localStorage.setItem('talktime_sound', String(next));
      if (next) playNotificationChime();
      return next;
    });
  };

  const markAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const dismissToast = () => setActiveToast(null);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        soundEnabled,
        activeToast,
        toggleSound,
        markAsRead,
        markAllAsRead,
        fetchNotifications,
        dismissToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};
