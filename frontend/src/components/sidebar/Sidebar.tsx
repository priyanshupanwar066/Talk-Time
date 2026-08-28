// Sidebar Component
import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { ConversationItem } from './ConversationItem';
import { UserSearchModal } from './UserSearchModal';
import { CreateGroupModal } from './CreateGroupModal';
import { Avatar } from '../ui/Avatar';
import {
  Search,
  MessageSquarePlus,
  Users,
  MessageCircle,
  Filter,
  Sparkles,
  Loader2,
  X,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    conversations,
    activeConversationId,
    selectConversation,
    isLoadingConversations,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
  } = useChat();

  const { currentUser } = useAuth();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  // Filter conversations
  const filteredConversations = conversations.filter((item) => {
    // Tab filter
    if (activeTab === 'direct' && item.conversation.isGroup) return false;
    if (activeTab === 'groups' && !item.conversation.isGroup) return false;
    if (activeTab === 'unread' && item.unreadCount === 0) return false;

    // Search query filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (item.conversation.isGroup) {
      return item.conversation.name?.toLowerCase().includes(q);
    }
    const otherMember = item.members.find((m) => m.userId !== currentUser?.id);
    return (
      otherMember?.user.name.toLowerCase().includes(q) ||
      otherMember?.user.username.toLowerCase().includes(q)
    );
  });

  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <aside
      id="talktime-sidebar"
      className="w-full md:w-80 lg:w-96 h-full flex flex-col bg-white border-r border-slate-200 shrink-0 select-none"
    >
      {/* Top Action Bar */}
      <div className="p-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            id="new-chat-btn"
            onClick={() => setIsSearchModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
          <button
            id="new-group-btn"
            onClick={() => setIsGroupModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100/80 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Create group"
          >
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Group</span>
          </button>
        </div>

      </div>

      {/* Search Input */}
      <div className="px-3.5 pt-3 pb-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            id="sidebar-search-conversations-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-7 py-2 bg-slate-100 border-none rounded-full text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-3.5 pt-1 pb-1 flex items-center justify-between border-b border-slate-100 text-xs font-semibold">
        <div className="flex items-center gap-1">
          <button
            id="tab-all-btn"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            All
          </button>
          <button
            id="tab-direct-btn"
            onClick={() => setActiveTab('direct')}
            className={`px-3 py-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'direct'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Direct
          </button>
          <button
            id="tab-groups-btn"
            onClick={() => setActiveTab('groups')}
            className={`px-3 py-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'groups'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Groups
          </button>
          <button
            id="tab-unread-btn"
            onClick={() => setActiveTab('unread')}
            className={`px-3 py-1.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'unread'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Unread</span>
            {totalUnread > 0 && (
              <span className="w-4 h-4 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalUnread}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoadingConversations ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="text-xs font-medium">Loading conversations...</span>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-16 px-4 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3 text-indigo-600">
              <MessageCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No conversations found</p>
            <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">
              Start a new direct chat or create a group to begin messaging.
            </p>
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="mt-3 px-3.5 py-1.5 bg-indigo-50 text-indigo-700 font-semibold rounded-xl text-xs hover:bg-indigo-100 transition-colors"
            >
              Find Users
            </button>
          </div>
        ) : (
          filteredConversations.map((item) => (
            <ConversationItem
              key={item.conversation.id}
              item={item}
              isActive={activeConversationId === item.conversation.id}
              onSelect={() => selectConversation(item.conversation.id)}
            />
          ))
        )}
      </div>

      {/* Modals */}
      <UserSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
      <CreateGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
      />
    </aside>
  );
};
