// Create Group Conversation Modal
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { User } from '../../types';
import { Avatar } from '../ui/Avatar';
import { Users, X, Search, Check, Loader2 } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateGroupModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { createGroupChat } = useChat();
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setQuery('');
      setSelectedUserIds([]);
      setError(null);
      return;
    }

    const loadUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const res = await api.searchUsers('');
        if (res.success) {
          setAllUsers(res.data.users);
        }
      } catch (err) {
        console.error('Failed to load users for group:', err);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    loadUsers();
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a group name.');
      return;
    }
    if (selectedUserIds.length === 0) {
      setError('Please select at least one member for the group.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await createGroupChat(name.trim(), selectedUserIds);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create group.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = allUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.username.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Create New Group</h3>
              <p className="text-xs text-slate-500">Add members and start a group chat</p>
            </div>
          </div>
          <button
            id="close-create-group-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="flex flex-col flex-1 overflow-hidden">
          {error && (
            <div className="mx-4 mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Group Name Input */}
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Group Name *
              </label>
              <input
                id="group-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Design Team, Weekend Trip, Project Launch"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                required
              />
            </div>

            {/* Selected members pills */}
            {selectedUserIds.length > 0 && (
              <div>
                <span className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Selected Members ({selectedUserIds.length}):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {selectedUserIds.map((uid) => {
                    const u = allUsers.find((user) => user.id === uid);
                    return (
                      <span
                        key={uid}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-medium"
                      >
                        <Avatar src={u?.avatarUrl} name={u?.name || 'User'} size="xs" />
                        <span>{u?.name}</span>
                        <button
                          type="button"
                          onClick={() => toggleUser(uid)}
                          className="text-indigo-500 hover:text-indigo-800 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Search Members */}
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter members to add..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100">
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span className="text-xs font-medium">Loading contacts...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">No matching users</div>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = selectedUserIds.includes(user.id);
                return (
                  <div
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={user.avatarUrl} name={user.name} size="sm" />
                      <div className="min-w-0">
                        <span className="font-semibold text-xs text-slate-900 block truncate">
                          {user.name}
                        </span>
                        <span className="text-[11px] text-slate-400 block truncate">
                          @{user.username}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="confirm-create-group-btn"
              type="submit"
              disabled={isSubmitting || !name.trim() || selectedUserIds.length === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Group ({selectedUserIds.length})</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
