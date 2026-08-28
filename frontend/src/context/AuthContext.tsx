// Auth Context
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: { name: string; username: string; email: string; password: string; bio?: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User> & { oldPassword?: string; newPassword?: string }) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('talktime_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const refreshUser = useCallback(async () => {
    const savedToken = localStorage.getItem('talktime_token');
    if (!savedToken) {
      setCurrentUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await api.getMe();
      if (res.success && res.data.user) {
        setCurrentUser(res.data.user);
        setToken(savedToken);
      } else {
        localStorage.removeItem('talktime_token');
        setToken(null);
        setCurrentUser(null);
      }
    } catch {
      localStorage.removeItem('talktime_token');
      setToken(null);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (identifier: string, password: string) => {
    const res = await api.login({ identifier, password });
    if (res.success && res.data) {
      localStorage.setItem('talktime_token', res.data.token);
      setToken(res.data.token);
      setCurrentUser(res.data.user);
    }
  };

  const register = async (data: { name: string; username: string; email: string; password: string; bio?: string }) => {
    const res = await api.register(data);
    if (res.success && res.data) {
      localStorage.setItem('talktime_token', res.data.token);
      setToken(res.data.token);
      setCurrentUser(res.data.user);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.warn('Logout error:', err);
    } finally {
      localStorage.removeItem('talktime_token');
      setToken(null);
      setCurrentUser(null);
    }
  };

  const updateProfile = async (updates: Partial<User> & { oldPassword?: string; newPassword?: string }) => {
    if (!currentUser) return;
    const res = await api.updateUser(currentUser.id, updates);
    if (res.success && res.data.user) {
      setCurrentUser(res.data.user);
    }
  };

  // Instant switcher for multi-user real-time testing in same/different window
  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
