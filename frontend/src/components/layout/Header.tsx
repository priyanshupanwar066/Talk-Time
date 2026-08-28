// TalkTime Main Header Component
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useNotifications } from '../../context/NotificationContext';
import { Avatar } from '../ui/Avatar';
import { NotificationDrawer } from '../notifications/NotificationDrawer';
import { ProfileModal } from '../profile/ProfileModal';
import {
  MessageSquare,
  Bell,
  Volume2,
  VolumeX,
  LogOut,
  User,
  ChevronDown,
} from 'lucide-react';

export const Header: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { isConnected } = useSocket();
  const { unreadCount, soundEnabled, toggleSound } = useNotifications();

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  if (!currentUser) return null;

  return (
    <header
      id="talktime-main-header"
      className="h-16 px-5 bg-white border-b border-slate-200 text-slate-800 flex items-center justify-between shrink-0 select-none z-30 shadow-2xs"
    >
      {/* Brand & Connection State */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-800">TalkTime</h1>
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 hidden sm:inline-block">
              Real-Time
            </span>
          </div>
        </div>

        {/* WebSocket Connection State indicator */}
        <div
          className={`flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full border transition-all ${
            isConnected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-amber-50 border-amber-200 text-amber-700 animate-pulse'
          }`}
          title={isConnected ? 'Connected to WebSocket Server' : 'Connecting to WebSocket...'}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-amber-500'
            }`}
          />
          <span className="hidden md:inline font-semibold">
            {isConnected ? 'Connected' : 'Reconnecting...'}
          </span>
        </div>
      </div>

      {/* Right Action Icons & User Dropdown */}
      <div className="flex items-center gap-2">
        {/* Audio notification toggle */}
        <button
          id="toggle-sound-btn"
          onClick={toggleSound}
          className={`p-2 rounded-xl transition-colors ${
            soundEnabled
              ? 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
          }`}
          title={soundEnabled ? 'Notification sounds enabled' : 'Notification sounds muted'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Notifications trigger with sleek badge */}
        <button
          id="open-notifications-drawer-btn"
          onClick={() => setIsNotificationOpen(true)}
          className="relative p-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <div className="h-2.5 w-2.5 rounded-full bg-red-500 absolute top-1.5 right-1.5 border-2 border-white" />
          )}
        </button>

        {/* User Profile Capsule Dropdown */}
        <div className="relative">
          <button
            id="user-profile-menu-btn"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all text-left"
          >
            <Avatar src={currentUser.avatarUrl} name={currentUser.name} size="xs" isOnline />
            <div className="hidden sm:block">
              <span className="block text-xs font-bold text-slate-800 leading-tight">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-green-600 font-semibold block leading-tight">
                online
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* User Popover Menu */}
          {isUserMenuOpen && (
            <div
              className="absolute right-0 top-13 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 text-slate-800 py-2 z-50 divide-y divide-slate-100"
              onClick={() => setIsUserMenuOpen(false)}
            >
              <div className="px-4 py-2.5">
                <span className="block text-xs font-bold text-slate-900">{currentUser.name}</span>
                <span className="block text-[11px] text-slate-500 truncate">{currentUser.email}</span>
              </div>

              <div className="py-1.5">
                <button
                  id="menu-edit-profile-btn"
                  onClick={() => setIsProfileOpen(true)}
                  className="w-full px-4 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 font-medium flex items-center gap-2.5 transition-colors"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Profile & Settings</span>
                </button>
              </div>

              <div className="py-1.5">
                <button
                  id="menu-logout-btn"
                  onClick={logout}
                  className="w-full px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-semibold flex items-center gap-2.5 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Drawers and Modals */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </header>
  );
};
