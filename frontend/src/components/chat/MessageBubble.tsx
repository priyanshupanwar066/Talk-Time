// Message Bubble Component
import React, { useState } from 'react';
import { Message } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { DeliveryStatusIcon } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { resolveMediaUrl } from '../../services/api';
import {
  Reply,
  Edit2,
  Trash2,
  Copy,
  Check,
  FileText,
  Download,
  MoreHorizontal,
  CornerDownRight,
} from 'lucide-react';

interface Props {
  message: Message;
  isGroup: boolean;
  onImageClick?: (url: string) => void;
}

export const MessageBubble: React.FC<Props> = ({ message, isGroup, onImageClick }) => {
  const { currentUser } = useAuth();
  const { setReplyingTo, setEditingMessage, deleteMessage } = useChat();
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const isMine = message.senderId === currentUser?.id;
  const isSystem = message.messageType === 'SYSTEM';

  // Format message time
  const timeStr = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setShowMenu(false);
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <span className="px-3 py-1 bg-slate-100/90 text-slate-500 text-xs rounded-full font-medium shadow-2xs">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      id={`message-${message.id}`}
      className={`group relative flex gap-2.5 my-1.5 px-4 ${
        isMine ? 'justify-end' : 'justify-start'
      }`}
    >
      {/* Received avatar in group */}
      {!isMine && isGroup && (
        <Avatar
          src={message.sender?.avatarUrl}
          name={message.sender?.name || 'User'}
          size="sm"
          className="mt-1"
        />
      )}

      <div className={`relative max-w-[85%] md:max-w-[70%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
        {/* Sender name in group */}
        {!isMine && isGroup && (
          <span className="text-[11px] font-semibold text-slate-500 mb-1 ml-1">
            {message.sender?.name || 'User'}
          </span>
        )}

        {/* Message bubble card */}
        <div
          className={`relative rounded-2xl p-4 shadow-xs text-sm transition-all ${
            isMine
              ? 'bg-indigo-600 text-white rounded-br-none shadow-md'
              : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none shadow-xs'
          } ${message.isDeleted ? 'italic text-opacity-80' : ''}`}
        >
          {/* Replied-To Quote Banner */}
          {message.replyTo && (
            <div
              className={`mb-2.5 p-2 rounded-xl border-l-3 text-xs ${
                isMine
                  ? 'bg-indigo-700/60 border-indigo-200 text-indigo-100'
                  : 'bg-slate-50 border-indigo-500 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-1 font-semibold text-[11px] opacity-90 mb-0.5">
                <CornerDownRight className="w-3 h-3" />
                <span>{message.replyTo.sender?.name || 'User'}</span>
              </div>
              <p className="truncate line-clamp-1">{message.replyTo.content || 'Attachment'}</p>
            </div>
          )}

          {/* Text Content */}
          {message.content && (
            <div className="whitespace-pre-wrap break-words leading-relaxed">
              {message.content}
            </div>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2.5 space-y-2">
              {message.attachments.map((att, idx) => {
                const isImage = att.mimetype?.startsWith('image/');
                return isImage ? (
                  <div
                    key={att.id || idx}
                    onClick={() => onImageClick?.(resolveMediaUrl(att.url) || att.url)}
                    className="relative overflow-hidden rounded-xl cursor-pointer max-w-sm max-h-64 border border-black/10 group/img"
                  >
                    <img
                      src={resolveMediaUrl(att.url)}
                      alt={att.originalName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Download className="w-5 h-5 drop-shadow-md" />
                    </div>
                  </div>
                ) : (
                  <a
                    key={att.id || idx}
                    href={resolveMediaUrl(att.url)}
                    download={att.originalName}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${
                      isMine
                        ? 'bg-indigo-700/60 border-indigo-400/50 text-white hover:bg-indigo-700'
                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${isMine ? 'bg-indigo-800 text-indigo-100' : 'bg-indigo-50 text-indigo-600'}`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold truncate">
                        {att.originalName}
                      </span>
                      <span className="block text-[10px] opacity-75">
                        {formatFileSize(att.size)}
                      </span>
                    </div>
                    <Download className="w-4 h-4 shrink-0 opacity-75" />
                  </a>
                );
              })}
            </div>
          )}

          {/* Footer details: time, edited badge, delivery ticks */}
          <div
            className={`flex items-center justify-end gap-1.5 mt-1.5 text-[10px] ${
              isMine ? 'text-indigo-200' : 'text-slate-400'
            }`}
          >
            {message.isEdited && <span className="italic">edited</span>}
            <span>{timeStr}</span>
            {isMine && !message.isDeleted && (
              <DeliveryStatusIcon status={message.deliveryStatus} />
            )}
          </div>
        </div>

        {/* Hover action bar */}
        {!message.isDeleted && (
          <div
            className={`absolute top-0 ${
              isMine ? '-left-20' : '-right-20'
            } hidden group-hover:flex items-center gap-0.5 bg-white border border-slate-200 shadow-md rounded-lg p-1 z-10 transition-all`}
          >
            <button
              onClick={() => setReplyingTo(message)}
              className="p-1 hover:bg-slate-100 text-slate-600 rounded-md"
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleCopy}
              className="p-1 hover:bg-slate-100 text-slate-600 rounded-md"
              title="Copy message"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {isMine && (
              <>
                <button
                  onClick={() => setEditingMessage(message)}
                  className="p-1 hover:bg-slate-100 text-slate-600 rounded-md"
                  title="Edit message"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="p-1 hover:bg-rose-50 text-rose-600 rounded-md"
                  title="Delete message"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200">
            <h4 className="font-bold text-slate-900 text-base mb-2">Delete message?</h4>
            <p className="text-xs text-slate-500 mb-4">
              Choose whether to delete this message for everyone in this chat or only for yourself.
            </p>
            <div className="flex flex-col gap-2">
              <button
                id="delete-for-everyone-btn"
                onClick={async () => {
                  await deleteMessage(message.id, 'FOR_EVERYONE');
                  setShowDeleteModal(false);
                }}
                className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                Delete for Everyone
              </button>
              <button
                id="delete-for-me-btn"
                onClick={async () => {
                  await deleteMessage(message.id, 'FOR_ME');
                  setShowDeleteModal(false);
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Delete for Me Only
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="w-full py-1.5 text-slate-500 hover:text-slate-700 text-xs font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
