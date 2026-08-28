// Details & Member Management Drawer
import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Avatar } from '../ui/Avatar';
import { resolveMediaUrl } from '../../services/api';
import {
  X,
  UserPlus,
  LogOut,
  Shield,
  Trash2,
  Edit2,
  Check,
  Loader2,
  Calendar,
  Image as ImageIcon,
  Link2,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { UserSearchModal } from '../sidebar/UserSearchModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const GroupInfoDrawer: React.FC<Props> = ({ isOpen, onClose }) => {
  const { activeConversation, updateGroup, leaveOrRemoveGroupMember, messages } = useChat();
  const { currentUser } = useAuth();
  const { presences } = useSocket();

  const [isEditingName, setIsEditingName] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);

  if (!isOpen || !activeConversation) return null;

  const { conversation, members } = activeConversation;
  const isGroup = Boolean(conversation.isGroup);

  const otherMember = !isGroup
    ? members.find((m) => m.userId !== currentUser?.id)
    : null;
  const otherUser = otherMember?.user;
  const isOnline = otherUser ? presences[otherUser.id]?.status === 'online' : false;

  const currentMember = members.find((m) => m.userId === currentUser?.id);
  const isAdmin = isGroup && currentMember?.role === 'ADMIN';

  // Gather media and shared links from conversation messages
  const mediaAttachments = messages
    .flatMap((m) => m.attachments || [])
    .filter((a) => a.mimetype?.startsWith('image/'));

  const linkRegex = /(https?:\/\/[^\s]+)/g;
  const sharedLinks = messages
    .filter((m) => !m.isDeleted && m.content && linkRegex.test(m.content))
    .flatMap((m) => {
      const matches = m.content.match(linkRegex);
      return matches ? matches.map((url) => ({ url, sender: m.sender?.name, date: m.createdAt })) : [];
    });

  const handleSaveName = async () => {
    if (!groupName.trim()) return;
    setIsUpdating(true);
    try {
      await updateGroup(conversation.id, { name: groupName.trim() });
      setIsEditingName(false);
    } catch (err) {
      console.error('Failed to update group name:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (confirm('Are you sure you want to remove this member from the group?')) {
      try {
        await leaveOrRemoveGroupMember(conversation.id, userId);
      } catch (err) {
        console.error('Failed to remove member:', err);
      }
    }
  };

  const handleLeaveGroup = async () => {
    if (confirm('Are you sure you want to leave this group?')) {
      try {
        if (currentUser) {
          await leaveOrRemoveGroupMember(conversation.id, currentUser.id);
          onClose();
        }
      } catch (err) {
        console.error('Failed to leave group:', err);
      }
    }
  };

  const formattedCreatedDate = new Date(conversation.createdAt).toLocaleDateString([], {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const displayName = isGroup ? conversation.name || 'Group Chat' : otherUser?.name || 'User';
  const displayAvatar = isGroup ? conversation.avatarUrl : otherUser?.avatarUrl;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-sm bg-white border-l border-slate-200 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-bold text-slate-900 text-sm">
          {isGroup ? 'Group Information' : 'Contact Information'}
        </h3>
        <button
          id="close-group-info-drawer-btn"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Profile Card matching design mockup */}
        <div className="flex flex-col items-center text-center">
          <div className="h-24 w-24 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center p-1.5 shadow-sm mb-3">
            <Avatar
              src={displayAvatar}
              name={displayName}
              size="xl"
              isGroup={isGroup}
              showPresence={!isGroup}
              isOnline={isOnline}
              className="w-full h-full rounded-2xl"
            />
          </div>

          {isEditingName ? (
            <div className="flex items-center gap-1 w-full max-w-xs mt-1">
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-2.5 py-1 text-sm border border-indigo-400 rounded-lg focus:outline-none"
                autoFocus
              />
              <button
                onClick={handleSaveName}
                disabled={isUpdating}
                className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsEditingName(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-slate-900">{displayName}</h2>
              {isAdmin && (
                <button
                  onClick={() => {
                    setGroupName(conversation.name || '');
                    setIsEditingName(true);
                  }}
                  className="text-slate-400 hover:text-slate-700 p-1"
                  title="Rename group"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {!isGroup && otherUser && (
            <p className="text-xs text-slate-500 mt-0.5">
              @{otherUser.username} {otherUser.bio ? `• ${otherUser.bio}` : ''}
            </p>
          )}

          <div className="mt-2">
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                isGroup
                  ? 'bg-indigo-50 border-indigo-100 text-indigo-700'
                  : isOnline
                  ? 'bg-green-50 border-green-100 text-green-600'
                  : 'bg-slate-100 border-slate-200 text-slate-500'
              }`}
            >
              {isGroup ? `${members.length} Members` : isOnline ? 'Active Now' : 'Offline'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-3">
            <Calendar className="w-3.5 h-3.5" />
            <span>Created on {formattedCreatedDate}</span>
          </div>
        </div>

        {/* Media & Files Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>Media & Files ({mediaAttachments.length})</span>
            </h4>
          </div>

          {mediaAttachments.length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400">
              No photos or media shared yet
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {mediaAttachments.slice(0, 6).map((att, i) => (
                <a
                  key={i}
                  href={att.url}
                  target="_blank"
                  rel="noreferrer"
                  className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 hover:opacity-90 transition-opacity"
                >
                  <img
                    src={resolveMediaUrl(att.url)}
                    alt="Media"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Shared Links */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Shared Links ({sharedLinks.length})</span>
            </h4>
          </div>

          {sharedLinks.length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400">
              No links shared in this conversation
            </div>
          ) : (
            <div className="space-y-2">
              {sharedLinks.slice(0, 3).map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl block text-xs transition-colors"
                >
                  <span className="font-semibold text-indigo-600 truncate block">{link.url}</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Shared by {link.sender}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Members Section for Group Chats */}
        {isGroup && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Members ({members.length})
              </h4>
              {isAdmin && (
                <button
                  onClick={() => setShowAddMembersModal(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Member</span>
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden shadow-2xs">
              {members.map((member) => {
                const isUserAdmin = member.role === 'ADMIN';
                const isSelf = member.userId === currentUser?.id;
                const isMemberOnline = presences[member.userId]?.status === 'online';

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        src={resolveMediaUrl(member.user.avatarUrl)}
                        name={member.user.name}
                        size="sm"
                        showPresence
                        isOnline={isMemberOnline}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-slate-900 truncate">
                            {member.user.name}
                          </span>
                          {isSelf && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                              You
                            </span>
                          )}
                          {isUserAdmin && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5">
                              <Shield className="w-2.5 h-2.5" />
                              Admin
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block truncate">
                          @{member.user.username}
                        </span>
                      </div>
                    </div>

                    {isAdmin && !isSelf && (
                      <button
                        onClick={() => handleRemoveMember(member.userId)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Remove from group"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Leave Group Action for Groups */}
        {isGroup && (
          <div className="pt-4 border-t border-slate-100">
            <button
              id="leave-group-btn"
              onClick={handleLeaveGroup}
              className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Leave Group</span>
            </button>
          </div>
        )}
      </div>

      {/* Add Members Modal */}
      {showAddMembersModal && (
        <UserSearchModal
          isOpen={showAddMembersModal}
          onClose={() => setShowAddMembersModal(false)}
        />
      )}
    </div>
  );
};
