// Conversation Item Component
import React from 'react';
import { ConversationItem as ConversationItemType } from '../../types';
import { Avatar } from '../ui/Avatar';
import { DeliveryStatusIcon, UnreadBadge } from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { resolveMediaUrl } from '../../services/api';

interface Props {
  item: ConversationItemType;
  isActive: boolean;
  onSelect: () => void;
}

export const ConversationItem: React.FC<Props> = ({ item, isActive, onSelect }) => {
  const { currentUser } = useAuth();
  const { presences, typingMap } = useSocket();
  const { conversation, members, lastMessage, unreadCount } = item;

  // For 1-to-1 conversation, determine the other participant
  const otherMember = !conversation.isGroup
    ? members.find((m) => m.userId !== currentUser?.id)
    : null;

  const otherUser = otherMember?.user;
  const isOnline = otherUser
    ? presences[otherUser.id]?.status === 'online'
    : false;

  const displayName = conversation.isGroup
    ? conversation.name || 'Group Chat'
    : otherUser?.name || 'User';

  const avatarUrl = conversation.isGroup ? conversation.avatarUrl : otherUser?.avatarUrl;

  // Check if someone is typing in this conversation
  const typingUsers = typingMap[conversation.id] || [];
  const isTyping = typingUsers.length > 0;
  const typingText = isTyping
    ? typingUsers.length === 1
      ? `${typingUsers[0].username} is typing...`
      : `${typingUsers.map((u) => u.username).slice(0, 2).join(', ')} are typing...`
    : null;

  // Format timestamp
  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const lastTime = formatTime(lastMessage?.createdAt || conversation.updatedAt);
  const isLastMsgMine = lastMessage?.senderId === currentUser?.id;

  return (
    <div
      id={`conversation-item-${conversation.id}`}
      onClick={onSelect}
      className={`flex items-center gap-3 px-3.5 py-3 rounded-xl cursor-pointer transition-all ${
        isActive
          ? 'bg-indigo-50 border-r-4 border-indigo-600 shadow-2xs'
          : 'hover:bg-slate-50 border-r-4 border-transparent'
      }`}
    >
      <Avatar
        src={resolveMediaUrl(avatarUrl)}
        name={displayName}
        size="md"
        isGroup={conversation.isGroup}
        showPresence={!conversation.isGroup}
        isOnline={isOnline}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <h4
            className={`text-sm font-semibold truncate ${
              isActive ? 'text-slate-900 font-bold' : 'text-slate-800'
            }`}
          >
            {displayName}
          </h4>
          <span className="text-[11px] text-slate-400 shrink-0 font-medium">{lastTime}</span>
        </div>

        <div className="flex items-center justify-between gap-1">
          {isTyping ? (
            <span className="text-xs text-indigo-600 font-medium italic truncate animate-pulse">
              {typingText}
            </span>
          ) : lastMessage ? (
            <div className="flex items-center gap-1 min-w-0 text-xs text-slate-500 truncate">
              {isLastMsgMine && (
                <DeliveryStatusIcon status={lastMessage.deliveryStatus} className="shrink-0" />
              )}
              {conversation.isGroup && !isLastMsgMine && (
                <span className="font-medium text-slate-700 shrink-0">
                  {lastMessage.sender?.name?.split(' ')[0]}:
                </span>
              )}
              <span className="truncate">
                {lastMessage.isDeleted
                  ? '🚫 Message deleted'
                  : lastMessage.content || 'Attachment'}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400 italic">No messages yet</span>
          )}

          <UnreadBadge count={unreadCount} />
        </div>
      </div>
    </div>
  );
};
