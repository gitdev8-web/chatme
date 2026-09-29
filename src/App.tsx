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
import { SchoolHubModal } from './components/campus/SchoolHubModal';
import { BottomNav, BottomNavTab } from './components/navigation/BottomNav';
import { OfflineBanner } from './components/common/OfflineBanner';
import { Realistic3DIcon } from './components/common/Realistic3DIcon';

const MainChatDashboard: React.FC = () => {
  const { user } = useAuth();
  const {
    conversations,
    activeConversationId,
    activeConversation,
    messages,
    userCache,
    setActiveConversationId,
    showChatDetails,
    setShowChatDetails,
    setActiveFilter,
  } = useChat();

  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isSchoolHubOpen, setIsSchoolHubOpen] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<BottomNavTab>('chats');

  // Synchronize initial URL route on mount
  React.useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/app/chat/')) {
      const convId = path.replace('/app/chat/', '').trim();
      if (convId) setActiveConversationId(convId);
    } else if (path === '/app/contacts') {
      setIsContactsOpen(true);
    } else if (path === '/app/settings') {
      setIsSettingsOpen(true);
    } else if (path === '/admin') {
      setIsAdminOpen(true);
    }
  }, [setActiveConversationId]);

  // Update browser URL state as user navigates without reloads
  React.useEffect(() => {
    if (activeConversationId) {
      window.history.replaceState(null, '', `/app/chat/${activeConversationId}`);
    } else {
      window.history.replaceState(null, '', '/app/chats');
    }
  }, [activeConversationId]);

  // Compute total unread across all chats
  const totalUnread = conversations.reduce((acc, conv) => {
    return acc + (conv.unreadCounts?.[user?.uid || ''] || 0);
  }, 0);

  const handleBottomTabChange = (tab: BottomNavTab) => {
    setActiveBottomTab(tab);
    if (tab === 'chats') {
      setActiveConversationId(null);
      setActiveFilter('all');
    } else if (tab === 'contacts') {
      setIsContactsOpen(true);
    } else if (tab === 'hub') {
      setIsSchoolHubOpen(true);
    } else if (tab === 'notices') {
      setActiveConversationId(null);
      setActiveFilter('groups');
    } else if (tab === 'settings') {
      setIsSettingsOpen(true);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0b141a] text-[#e9edef] antialiased select-none relative">
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
          onOpenSchoolHub={() => setIsSchoolHubOpen(true)}
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

      {/* WhatsApp Mobile Bottom Navigation */}
      {!activeConversationId && (
        <BottomNav
          activeTab={activeBottomTab}
          onTabChange={handleBottomTabChange}
          unreadCount={totalUnread}
        />
      )}

      {/* Modals */}
      <SchoolHubModal
        isOpen={isSchoolHubOpen}
        onClose={() => {
          setIsSchoolHubOpen(false);
          setActiveBottomTab('chats');
        }}
        onSelectModule={(mod) => {
          if (mod === 'messages' || mod === 'notices') {
            setActiveFilter(mod === 'messages' ? 'direct' : 'groups');
          } else {
            setIsContactsOpen(true);
          }
        }}
      />

      <ContactsModal
        isOpen={isContactsOpen}
        onClose={() => {
          setIsContactsOpen(false);
          setActiveBottomTab('chats');
        }}
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
        onClose={() => {
          setIsSettingsOpen(false);
          setActiveBottomTab('chats');
        }}
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
  const [authView, setAuthView] = useState<'login' | 'register'>(
    typeof window !== 'undefined' && window.location.pathname === '/register'
      ? 'register'
      : 'login'
  );

  React.useEffect(() => {
    if (!user && !loading) {
      if (window.location.pathname === '/register') {
        setAuthView('register');
      } else if (window.location.pathname === '/login') {
        setAuthView('login');
      }
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0b141a] text-[#e9edef] select-none">
        <div className="mb-4">
          <Realistic3DIcon name="whatsapp" size="2xl" showDots={true} />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5 mt-2">
          <span>Chattr</span>
          <span className="text-[#25d366]">Campus</span>
        </h2>
        <p className="mt-2 text-xs text-[#8696a0]">Connecting to secure school messaging channels...</p>
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
