// TalkTime Main Application Component
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatArea } from './components/chat/ChatArea';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { Toast } from './components/ui/Toast';
import { MessageSquare, Loader2 } from 'lucide-react';

const AuthenticatedApp: React.FC = () => {
  const { activeConversationId } = useChat();

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 overflow-hidden font-sans text-slate-900 antialiased">
      <Header />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar: On mobile, visible only when no active conversation is selected */}
        <div
          className={`${
            activeConversationId ? 'hidden md:flex' : 'flex'
          } w-full md:w-auto h-full shrink-0`}
        >
          <Sidebar />
        </div>

        {/* Chat Area: On mobile, visible only when a conversation is selected */}
        <div
          className={`${
            activeConversationId ? 'flex' : 'hidden md:flex'
          } flex-1 h-full overflow-hidden`}
        >
          <ChatArea />
        </div>
      </div>

      <Toast />
    </div>
  );
};

const MainContent: React.FC = () => {
  const { currentUser, isLoading } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  if (isLoading) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-3">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
          <MessageSquare className="w-6 h-6 text-white" />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          <span>Starting TalkTime...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {authMode === 'login' ? (
          <LoginForm onSwitchToRegister={() => setAuthMode('register')} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setAuthMode('login')} />
        )}
      </div>
    );
  }

  return (
    <SocketProvider>
      <NotificationProvider>
        <ChatProvider>
          <AuthenticatedApp />
        </ChatProvider>
      </NotificationProvider>
    </SocketProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
