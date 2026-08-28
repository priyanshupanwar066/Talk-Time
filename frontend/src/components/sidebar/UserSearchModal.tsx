// User Search & New Direct Conversation Modal
import React, { useState, useEffect } from 'react';
import { api, resolveMediaUrl } from '../../services/api';
import { User } from '../../types';
import { Avatar } from '../ui/Avatar';
import { Search, X, MessageSquare, Loader2, UserPlus } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const UserSearchModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { createDirectChat } = useChat();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setUsers([]);
      return;
    }

    let isMounted = true;
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const res = await api.searchUsers(query);
        if (isMounted && res.success) {
          setUsers(res.data.users);
        }
      } catch (err) {
        console.error('Failed to search users:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchUsers, query ? 200 : 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, query]);

  if (!isOpen) return null;

  const handleStartChat = async (user: User) => {
    setIsStartingChat(user.id);
    try {
      await createDirectChat(user.id);
      onClose();
    } catch (err) {
      console.error('Failed to start chat:', err);
    } finally {
      setIsStartingChat(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Start New Conversation</h3>
              <p className="text-xs text-slate-500">Search users by name, username, or email</p>
            </div>
          </div>
          <button
            id="close-user-search-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              id="user-search-modal-input"
              type="text"
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              placeholder="Type username, name, or email..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              <span className="text-sm font-medium">Searching users...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-10 px-4 text-slate-400">
              <p className="text-sm font-medium">No users found</p>
              <p className="text-xs mt-1">Try another search term</p>
            </div>
          ) : (
            users.map((user: User) => {
              const isOnline = user.presence?.status === 'online';
              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={resolveMediaUrl(user.avatarUrl)}
                      name={user.name}
                      size="md"
                      showPresence
                      isOnline={isOnline}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-slate-900 truncate">
                          {user.name}
                        </span>
                        <span className="text-xs text-slate-400 truncate">@{user.username}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{user.bio || user.email}</p>
                    </div>
                  </div>

                  <button
                    id={`start-chat-with-${user.username}-btn`}
                    onClick={() => handleStartChat(user)}
                    disabled={isStartingChat === user.id}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shrink-0 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                  >
                    {isStartingChat === user.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5" />
                    )}
                    <span>Chat</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
