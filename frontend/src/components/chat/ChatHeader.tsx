// Chat Header Component
import React from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Avatar } from '../ui/Avatar';
import { resolveMediaUrl } from '../../services/api';
import {
  Search,
  Users,
  ArrowLeft,
  Info,
  MoreVertical,
} from 'lucide-react';

interface Props {
  onOpenGroupInfo: () => void;
  onOpenSearch: () => void;
  onBackToSidebar: () => void;
}

export const ChatHeader: React.FC<Props> = ({
  onOpenGroupInfo,
  onOpenSearch,
  onBackToSidebar,
}) => {
  const { activeConversation, activeConversationId } = useChat();
  const { currentUser } = useAuth();
  const { presences, typingMap } = useSocket();

  if (!activeConversation || !activeConversationId) return null;

  const { conversation, members } = activeConversation;

  // Determine direct user or group info
  const isGroup = conversation.isGroup;
  const otherMember = !isGroup
    ? members.find((m) => m.userId !== currentUser?.id)
    : null;
  const otherUser = otherMember?.user;

  const displayName = isGroup ? conversation.name || 'Group Chat' : otherUser?.name || 'User';
  const avatarUrl = isGroup ? conversation.avatarUrl : otherUser?.avatarUrl;

  const isOnline = otherUser ? presences[otherUser.id]?.status === 'online' : false;
  const lastSeen = otherUser ? presences[otherUser.id]?.lastSeen || otherUser.updatedAt : null;

  // Typing status in this conversation
  const typingUsers = typingMap[conversation.id] || [];
  const isTyping = typingUsers.length > 0;
  const typingText = isTyping
    ? typingUsers.length === 1
      ? `${typingUsers[0].username} is typing...`
      : `${typingUsers.map((u) => u.username).join(', ')} are typing...`
    : null;

  // Format last seen
  const formatLastSeen = (iso?: string | null) => {
    if (!iso) return 'Offline';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Offline';
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `Last seen ${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Last seen ${diffHours}h ago`;
    return `Last seen ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  };

  return (
    <div
      id="chat-header"
      className="h-16 px-6 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 select-none shadow-2xs z-10"
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Back Button */}
        <button
          id="mobile-back-to-sidebar-btn"
          onClick={onBackToSidebar}
          className="p-1.5 -ml-1.5 text-slate-500 hover:text-slate-900 rounded-lg md:hidden"
          title="Back to conversations"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div
          onClick={onOpenGroupInfo}
          className="flex items-center gap-3 min-w-0 cursor-pointer group"
        >
          <Avatar
            src={resolveMediaUrl(avatarUrl)}
            name={displayName}
            size="md"
            isGroup={isGroup}
            showPresence={!isGroup}
            isOnline={isOnline}
          />

          <div className="min-w-0">
            <h3 className="font-bold text-sm text-slate-900 truncate leading-tight group-hover:text-indigo-600 transition-colors">
              {displayName}
            </h3>

            {isTyping ? (
              <p className="text-[11px] text-indigo-600 font-semibold italic truncate animate-pulse">
                {typingText}
              </p>
            ) : isGroup ? (
              <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                <Users className="w-3 h-3 text-slate-400" />
                <span>{members.length} members</span>
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isOnline ? 'bg-green-500' : 'bg-slate-300'
                  }`}
                />
                <span className={isOnline ? 'text-green-600 font-bold uppercase tracking-wider text-[10px]' : ''}>
                  {isOnline ? 'Active Now' : formatLastSeen(lastSeen)}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-1.5 text-slate-500">
        <button
          id="open-message-search-btn"
          onClick={onOpenSearch}
          className="p-2 hover:bg-slate-50 hover:text-indigo-600 text-slate-400 rounded-xl transition-colors cursor-pointer"
          title="Search in conversation"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          id="open-group-info-btn"
          onClick={onOpenGroupInfo}
          className="p-2 hover:bg-slate-50 hover:text-indigo-600 text-slate-400 rounded-xl transition-colors cursor-pointer"
          title={isGroup ? 'Group Details' : 'Contact Details'}
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
