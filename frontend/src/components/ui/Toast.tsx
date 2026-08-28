// Toast Notification Popup
import React from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useChat } from '../../context/ChatContext';
import { MessageSquare, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const { activeToast, dismissToast } = useNotifications();
  const { selectConversation } = useChat();

  if (!activeToast) return null;

  const handleClick = () => {
    if (activeToast.conversationId) {
      selectConversation(activeToast.conversationId);
    }
    dismissToast();
  };

  return (
    <div
      id="talktime-live-toast"
      onClick={handleClick}
      className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900 text-white rounded-2xl shadow-2xl p-4 border border-slate-800 cursor-pointer transition-all hover:scale-[1.02] flex items-start gap-3"
    >
      <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
        <MessageSquare className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold truncate text-slate-100">{activeToast.title}</h4>
        <p className="text-xs text-slate-300 line-clamp-2 mt-0.5">{activeToast.body}</p>
        <span className="text-[10px] text-slate-400 mt-1 block">Click to view conversation</span>
      </div>
      <button
        id="dismiss-toast-btn"
        onClick={(e) => {
          e.stopPropagation();
          dismissToast();
        }}
        className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
