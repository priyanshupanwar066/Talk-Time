// Message Input Component
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import { api, resolveMediaUrl } from '../../services/api';
import { MessageAttachment } from '../../types';
import {
  Send,
  Paperclip,
  Smile,
  X,
  CornerDownRight,
  Edit2,
  FileText,
  Loader2,
} from 'lucide-react';

const COMMON_EMOJIS = [
  '👍', '❤️', '🔥', '🎉', '😂', '🚀', '🙌', '✨', '👋', '😍', '👏', '💯',
  '🤔', '👀', '😎', '🙏', '💡', '✅', '⭐', '🤝', '🥳', '💪', '🎯', '🍕'
];

export const MessageInput: React.FC = () => {
  const {
    activeConversationId,
    sendMessage,
    replyingTo,
    setReplyingTo,
    editingMessage,
    setEditingMessage,
    editMessage,
  } = useChat();

  const { emitTyping } = useSocket();

  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync editing message content into input
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content);
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  // Handle typing event dispatching with debounce
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    if (!activeConversationId) return;

    // Start typing
    emitTyping(activeConversationId, true);

    // Clear existing timer
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    // Stop typing after 2.5s of inactivity
    typingTimerRef.current = setTimeout(() => {
      emitTyping(activeConversationId, false);
    }, 2500);
  };

  const handleSend = async () => {
    if ((!text.trim() && attachments.length === 0) || isSending || isUploading) return;

    // If we were typing, stop typing immediately
    if (activeConversationId) {
      emitTyping(activeConversationId, false);
    }
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    setIsSending(true);

    try {
      if (editingMessage) {
        await editMessage(editingMessage.id, text.trim());
      } else {
        await sendMessage(text, attachments);
      }
      setText('');
      setAttachments([]);
      setShowEmojiPicker(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Failed to dispatch message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle file uploads
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await api.uploadAttachment(file);
        if (res.success && res.data.attachment) {
          setAttachments((prev) => [...prev, res.data.attachment]);
        }
      }
    } catch (err) {
      console.error('Attachment upload failed:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const addEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  return (
    <div
      id="chat-message-input-bar"
      className="p-4 bg-white border-t border-slate-100 relative select-none"
    >
      {/* Replying Banner */}
      {replyingTo && (
        <div className="mb-2.5 p-2.5 bg-indigo-50 border border-indigo-200/80 rounded-xl flex items-center justify-between text-xs shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <CornerDownRight className="w-4 h-4 text-indigo-600 shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold text-indigo-950 block truncate">
                Replying to {replyingTo.sender?.name || 'User'}
              </span>
              <p className="text-indigo-700/80 text-[11px] truncate">
                {replyingTo.content || 'Attachment'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-indigo-500 hover:text-indigo-800 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editing Banner */}
      {editingMessage && (
        <div className="mb-2.5 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <Edit2 className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-semibold text-amber-900 truncate">Editing message</span>
          </div>
          <button
            onClick={() => {
              setEditingMessage(null);
              setText('');
            }}
            className="text-amber-600 hover:text-amber-900 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-2">
          {attachments.map((att, idx) => {
            const isImg = att.mimetype.startsWith('image/');
            return (
              <div
                key={att.id || idx}
                className="relative flex items-center gap-2 p-1.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs shadow-2xs"
              >
                {isImg ? (
                  <img
                    src={resolveMediaUrl(att.url)}
                    alt={att.originalName}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 object-cover rounded-lg"
                  />
                ) : (
                  <div className="p-2 bg-white rounded-lg text-indigo-600">
                    <FileText className="w-4 h-4" />
                  </div>
                )}
                <span className="max-w-[120px] truncate font-semibold text-indigo-950">
                  {att.originalName}
                </span>
                <button
                  onClick={() => removeAttachment(idx)}
                  className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 left-4 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 w-72">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
            <span className="text-xs font-bold text-slate-700">Quick Emojis</span>
            <button
              onClick={() => setShowEmojiPicker(false)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-6 gap-1.5 text-xl">
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => addEmoji(emoji)}
                className="w-9 h-9 flex items-center justify-center hover:bg-indigo-50 rounded-lg transition-transform hover:scale-110 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Input Controls Row */}
      <div className="flex items-center gap-2 rounded-2xl bg-slate-100 p-2 shadow-inner focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:bg-slate-100/90 transition-all">
        {/* Attachment button */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          id="attach-file-btn"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-xs transition-all shrink-0 disabled:opacity-50 cursor-pointer"
          title="Attach files or photos"
        >
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          ) : (
            <Paperclip className="w-5 h-5" />
          )}
        </button>

        {/* Emoji trigger */}
        <button
          id="emoji-picker-btn"
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-xs transition-all shrink-0 cursor-pointer"
          title="Add emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          id="chat-message-textarea"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 max-h-32 border-none bg-transparent py-2 px-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed"
        />

        {/* Send button */}
        <button
          id="send-message-btn"
          type="button"
          onClick={handleSend}
          disabled={(!text.trim() && attachments.length === 0) || isSending || isUploading}
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md transition-all shrink-0 ${
            text.trim() || attachments.length > 0
              ? 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer scale-100 shadow-indigo-200'
              : 'bg-slate-300 cursor-not-allowed opacity-60'
          }`}
          title="Send message"
        >
          {isSending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      <div className="flex items-center justify-between mt-1.5 px-2 text-[10px] text-slate-400 font-medium select-none">
        <span>Press Enter to send</span>
        <span>Shift + Enter for new line</span>
      </div>
    </div>
  );
};
