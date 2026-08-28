// Notification Drawer Popover Component
import React from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useChat } from '../../context/ChatContext';
import { Bell, CheckCheck, X, MessageSquare, Users, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<Props> = ({ isOpen, onClose }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { selectConversation } = useChat();

  if (!isOpen) return null;

  const handleNotificationClick = async (notif: typeof notifications[0]) => {
    if (!notif.isRead) {
      await markAsRead(notif.id);
    }
    if (notif.conversationId) {
      selectConversation(notif.conversationId);
    }
    onClose();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'NEW_MESSAGE':
        return <MessageSquare className="w-4 h-4 text-indigo-600" />;
      case 'GROUP_ACTIVITY':
      case 'GROUP_INVITE':
        return <Users className="w-4 h-4 text-indigo-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
      <div
        className="w-full max-w-sm h-full bg-white shadow-2xl flex flex-col border-l border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Notifications</h3>
              <span className="text-[11px] text-slate-500">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                id="mark-all-notifications-read-btn"
                onClick={markAllAsRead}
                className="p-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 rounded-xl hover:bg-indigo-50 transition-colors cursor-pointer"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Read All</span>
              </button>
            )}
            <button
              id="close-notifications-btn"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="text-center py-16 px-4 text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No notifications yet</p>
              <p className="text-xs text-slate-500 mt-1">
                You will receive alerts here when people message you or mention you in groups.
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3 rounded-xl cursor-pointer transition-colors flex items-start gap-3 ${
                  !notif.isRead ? 'bg-indigo-50/70 hover:bg-indigo-50' : 'hover:bg-slate-50'
                }`}
              >
                <div className="p-2 rounded-xl bg-white border border-slate-200 shrink-0 shadow-2xs mt-0.5">
                  {getIcon(notif.type)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{notif.title}</h4>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(notif.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{notif.body}</p>
                </div>

                {!notif.isRead && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-2" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
