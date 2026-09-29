/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { ToastProvider } from './components/common/Toast';
import { LoginView } from './components/auth/LoginView';
import { RegisterView } from './components/auth/RegisterView';
import { Sidebar } from './components/chat/Sidebar';
import { ChatArea } from './components/chat/ChatArea';
import { ChatDetailsSidebar } from './components/chat/ChatDetailsSidebar';
import { ContactsModal } from './components/contacts/ContactsModal';
import { CreateGroupModal } from './components/groups/CreateGroupModal';
import { ProfileModal } from './components/profile/ProfileModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { AdminDashboardModal } from './components/admin/AdminDashboardModal';
import { OfflineBanner } from './components/common/OfflineBanner';

const MainChatDashboard: React.FC = () => {
  const { user } = useAuth();
  const {
    activeConversationId,
    activeConversation,
    messages,
    userCache,
    setActiveConversationId,
    showChatDetails,
    setShowChatDetails,
  } = useChat();

  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 antialiased select-none">
      <OfflineBanner />

      {/* Sidebar: Visible on desktop or when no chat is active on mobile */}
      <div
        className={`${
          activeConversationId ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 lg:w-96 flex-shrink-0 h-full`}
      >
        <Sidebar
          onOpenContacts={() => setIsContactsOpen(true)}
          onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAdmin={() => setIsAdminOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
        />
      </div>

      {/* Active Chat Area: Visible on desktop or when a chat is selected on mobile */}
      <div
        className={`${
          activeConversationId ? 'flex' : 'hidden md:flex'
        } flex-1 h-full min-w-0`}
      >
        <ChatArea
          onBackMobile={() => setActiveConversationId(null)}
          onToggleDetails={() => setShowChatDetails(!showChatDetails)}
        />
      </div>

      {/* Right Details Sidebar: Desktop toggle */}
      {showChatDetails && activeConversation && (
        <div className="hidden lg:flex h-full">
          <ChatDetailsSidebar
            conversation={activeConversation}
            messages={messages}
            userCache={userCache}
            onClose={() => setShowChatDetails(false)}
            onOpenAddMembers={() => setIsContactsOpen(true)}
          />
        </div>
      )}

      {/* Modals */}
      <ContactsModal
        isOpen={isContactsOpen}
        onClose={() => setIsContactsOpen(false)}
      />

      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      <AdminDashboardModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
      />
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 text-slate-100 select-none">
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute h-20 w-20 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
          <img src="/icon.svg" alt="Chattr" className="h-16 w-16 relative z-10 animate-bounce" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Chattr</span>
        </h2>
        <p className="mt-2 text-xs text-slate-400">Connecting to secure messaging network...</p>
      </div>
    );
  }

  if (!user) {
    return authView === 'login' ? (
      <LoginView onSwitchToRegister={() => setAuthView('register')} />
    ) : (
      <RegisterView onSwitchToLogin={() => setAuthView('login')} />
    );
  }

  return (
    <ChatProvider>
      <MainChatDashboard />
    </ChatProvider>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
