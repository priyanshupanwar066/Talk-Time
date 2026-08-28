// Chat Area Main Container
import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { GroupInfoDrawer } from './GroupInfoDrawer';
import { MessageSearchModal } from './MessageSearchModal';
import { MessageSquare, Users, Sparkles } from 'lucide-react';

export const ChatArea: React.FC = () => {
  const { activeConversationId, activeConversation, selectConversation } = useChat();
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  if (!activeConversationId || !activeConversation) {
    return (
      <main
        id="talktime-empty-chat-area"
        className="hidden md:flex flex-1 h-full flex-col items-center justify-center bg-slate-50 p-8 text-center"
      >
        <div className="max-w-md flex flex-col items-center">
          <div className="w-20 h-20 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 shadow-sm border border-indigo-100">
            <MessageSquare className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Welcome to TalkTime
          </h2>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Select a conversation from the sidebar or start a new direct chat or group to experience
            instant messaging, live presence, and seamless file sharing.
          </p>

          <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-2xs">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Multi-User real-time messaging powered by WebSockets</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      id="talktime-active-chat-area"
      className="flex-1 h-full flex flex-col bg-white overflow-hidden relative"
    >
      <ChatHeader
        onOpenGroupInfo={() => setIsGroupInfoOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onBackToSidebar={() => selectConversation(null)}
      />

      <MessageList />

      <MessageInput />

      {/* Group Info Drawer */}
      <GroupInfoDrawer
        isOpen={isGroupInfoOpen}
        onClose={() => setIsGroupInfoOpen(false)}
      />

      {/* Message Search Modal */}
      <MessageSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </main>
  );
};
