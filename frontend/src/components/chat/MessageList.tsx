// Message List Component
import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { MessageBubble } from './MessageBubble';
import { resolveMediaUrl } from '../../services/api';
import { Loader2, ArrowDown, X, Download } from 'lucide-react';

export const MessageList: React.FC = () => {
  const {
    messages,
    activeConversation,
    isLoadingMessages,
    isLoadingOlder,
    hasMoreMessages,
    loadOlderMessages,
  } = useChat();

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const prevScrollHeightRef = useRef<number>(0);

  // Group messages by date
  const formatDateHeader = (isoDate: string) => {
    const d = new Date(isoDate);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Scroll to bottom on conversation change or new message
  useEffect(() => {
    if (!isLoadingOlder) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isLoadingOlder]);

  // Handle scroll for infinite scroll up and scroll-to-bottom button
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    // Check if scrolled near bottom
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setShowScrollBottom(!isNearBottom);

    // Infinite scroll up
    if (el.scrollTop === 0 && hasMoreMessages && !isLoadingOlder) {
      prevScrollHeightRef.current = el.scrollHeight;
      loadOlderMessages().then(() => {
        // preserve scroll position
        if (el) {
          el.scrollTop = el.scrollHeight - prevScrollHeightRef.current;
        }
      });
    }
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (isLoadingMessages) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-xs font-medium">Loading message history...</span>
      </div>
    );
  }

  // Group messages by date
  const messageGroups: { date: string; items: typeof messages }[] = [];
  messages.forEach((msg) => {
    const dateKey = formatDateHeader(msg.createdAt);
    let group = messageGroups.find((g) => g.date === dateKey);
    if (!group) {
      group = { date: dateKey, items: [] };
      messageGroups.push(group);
    }
    group.items.push(msg);
  });

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 relative flex flex-col space-y-2"
    >
      {/* Loading older messages spinner at top */}
      {isLoadingOlder && (
        <div className="flex justify-center py-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
        </div>
      )}

      {hasMoreMessages && !isLoadingOlder && (
        <div className="flex justify-center py-2">
          <button
            onClick={loadOlderMessages}
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-white px-3.5 py-1 rounded-full border border-slate-200 shadow-2xs cursor-pointer"
          >
            Load older messages
          </button>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 text-2xl shadow-xs border border-indigo-100">
            💬
          </div>
          <h4 className="font-bold text-slate-800 text-sm">No messages here yet</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
            Send a wave, text, or file to start the conversation!
          </p>
        </div>
      ) : (
        messageGroups.map((group) => (
          <div key={group.date} className="space-y-1">
            {/* Date divider pill */}
            <div className="flex justify-center my-4 sticky top-2 z-10">
              <span className="px-3.5 py-1 bg-slate-200/90 backdrop-blur-xs rounded-full text-[10px] font-bold text-slate-600 uppercase tracking-wider shadow-2xs">
                {group.date}
              </span>
            </div>

            {/* Messages */}
            {group.items.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isGroup={Boolean(activeConversation?.conversation.isGroup)}
                onImageClick={(url) => setPreviewImage(url)}
              />
            ))}
          </div>
        ))
      )}

      <div ref={bottomRef} />

      {/* Floating scroll to bottom button */}
      {showScrollBottom && (
        <button
          id="scroll-to-bottom-btn"
          onClick={scrollToBottom}
          className="sticky bottom-4 right-4 ml-auto w-9 h-9 rounded-full bg-white border border-slate-200 text-slate-700 shadow-lg flex items-center justify-center hover:bg-slate-50 hover:text-indigo-600 transition-all z-20 cursor-pointer"
          title="Scroll to latest"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}

      {/* Fullscreen Image Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 p-2"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={resolveMediaUrl(previewImage)}
              alt="Preview"
              referrerPolicy="no-referrer"
              className="max-h-[80vh] w-auto object-contain rounded-xl shadow-2xl border border-white/20"
            />
            <div className="mt-3 flex items-center gap-3">
              <a
                href={previewImage}
                download="image.png"
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold backdrop-blur-md flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Download High-Res</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
