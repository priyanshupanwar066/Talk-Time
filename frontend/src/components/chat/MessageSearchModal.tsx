// Message Search Inside Conversation Modal
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useChat } from '../../context/ChatContext';
import { Search, X, Loader2, MessageSquare, Calendar } from 'lucide-react';
import { Avatar } from '../ui/Avatar';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const MessageSearchModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { activeConversationId, selectConversation } = useChat();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      return;
    }

    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await api.searchMessages(query.trim(), activeConversationId || undefined);
        if (res.success && res.data) {
          setResults(res.data.results);
        }
      } catch (err) {
        console.error('Search messages error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [isOpen, query, activeConversationId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Search Messages</h3>
              <p className="text-xs text-slate-500">Find keywords across messages</p>
            </div>
          </div>
          <button
            id="close-message-search-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              id="message-search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search keyword in this chat..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              <span className="text-xs font-medium">Searching messages...</span>
            </div>
          ) : query.trim() && results.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No matching messages found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            results.map((res) => {
              const msg = res.message;
              const sender = res.sender;
              const timeStr = new Date(msg.createdAt).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={msg.id}
                  onClick={() => {
                    if (res.conversationId) {
                      selectConversation(res.conversationId);
                    }
                    onClose();
                  }}
                  className="p-3 hover:bg-indigo-50/70 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Avatar src={sender?.avatarUrl} name={sender?.name || 'User'} size="xs" />
                      <span className="text-xs font-semibold text-slate-900">{sender?.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">{timeStr}</span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium pl-8 break-words line-clamp-2">
                    {msg.content}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
