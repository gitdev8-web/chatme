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
import { PhoneAuthView } from './components/auth/PhoneAuthView';
import { Sidebar } from './components/chat/Sidebar';
import { ChatArea } from './components/chat/ChatArea';
import { ChatDetailsSidebar } from './components/chat/ChatDetailsSidebar';
import { ContactsModal } from './components/contacts/ContactsModal';
import { CreateGroupModal } from './components/groups/CreateGroupModal';
import { GroupsHubModal } from './components/groups/GroupsHubModal';
import { StatusModal } from './components/status/StatusModal';
import { ProfileModal } from './components/profile/ProfileModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { AdminDashboardModal } from './components/admin/AdminDashboardModal';
import { BottomNav, BottomNavTab } from './components/navigation/BottomNav';
import { OfflineBanner } from './components/common/OfflineBanner';
import { Realistic3DIcon } from './components/common/Realistic3DIcon';
import { IncomingCallModal } from './components/calls/IncomingCallModal';
import { CallModal } from './components/calls/CallModal';
import { subscribeToIncomingCalls } from './services/callService';
import { subscribeToStatusStories } from './services/statusService';
import { CallSession } from './types';

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
  const [isGroupsHubOpen, setIsGroupsHubOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<BottomNavTab>('chats');

  // Real-time call states
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [activeCallSession, setActiveCallSession] = useState<CallSession | null>(null);
  const [hasUnreadStatus, setHasUnreadStatus] = useState(false);

  // Subscribe to real-time incoming calls
  React.useEffect(() => {
    if (!user) {
      setIncomingCall(null);
      return;
    }

    const unsub = subscribeToIncomingCalls(user.uid, (call) => {
      setIncomingCall(call);
    });

    return () => unsub();
  }, [user]);

  // Subscribe to real-time status updates for unread dot
  React.useEffect(() => {
    if (!user) return;
    const unsub = subscribeToStatusStories((stories) => {
      const hasUnread = stories.some(
        (s) => s.userId !== user.uid && !s.viewedBy?.includes(user.uid)
      );
      setHasUnreadStatus(hasUnread);
    });
    return () => unsub();
  }, [user]);

  // Synchronize initial URL route on mount
  React.useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/app/chat/')) {
      const convId = path.replace('/app/chat/', '').trim();
      if (convId) setActiveConversationId(convId);
    } else if (path === '/app/status') {
      setIsStatusOpen(true);
    } else if (path === '/app/groups') {
      setIsGroupsHubOpen(true);
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
    } else if (tab === 'status') {
      setIsStatusOpen(true);
    } else if (tab === 'groups') {
      setIsGroupsHubOpen(true);
    } else if (tab === 'contacts') {
      setIsContactsOpen(true);
    } else if (tab === 'settings') {
      setIsSettingsOpen(true);
    }
  };

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-[#0b141a] text-[#e9edef] antialiased select-none relative">
      <OfflineBanner />

      {/* Sidebar: Visible on desktop or when no chat is active on mobile */}
      <div
        className={`${
          activeConversationId ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 lg:w-[360px] xl:w-[390px] flex-shrink-0 h-full overflow-hidden`}
      >
        <Sidebar
          onOpenStatus={() => setIsStatusOpen(true)}
          onOpenGroupsHub={() => setIsGroupsHubOpen(true)}
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
        } flex-1 h-full min-w-0 overflow-hidden`}
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
          hasUnreadStatus={hasUnreadStatus}
        />
      )}

      {/* WhatsApp Status Updates Modal */}
      <StatusModal
        isOpen={isStatusOpen}
        onClose={() => {
          setIsStatusOpen(false);
          setActiveBottomTab('chats');
        }}
      />

      {/* WhatsApp Groups Hub Modal */}
      <GroupsHubModal
        isOpen={isGroupsHubOpen}
        onClose={() => {
          setIsGroupsHubOpen(false);
          setActiveBottomTab('chats');
        }}
        onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
      />

      {/* Contacts / Start Chat Modal */}
      <ContactsModal
        isOpen={isContactsOpen}
        onClose={() => {
          setIsContactsOpen(false);
          setActiveBottomTab('chats');
        }}
      />

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          setActiveBottomTab('chats');
        }}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Admin Dashboard */}
      <AdminDashboardModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
      />

      {/* Real-time Incoming Call Modal */}
      <IncomingCallModal
        call={incomingCall}
        onAccept={(call) => {
          setIncomingCall(null);
          setActiveCallSession(call);
        }}
        onDecline={() => setIncomingCall(null)}
      />

      {/* Active Received Call Modal */}
      {activeCallSession && (
        <CallModal
          isOpen={true}
          isIncoming={true}
          onClose={() => setActiveCallSession(null)}
          contactName={activeCallSession.callerName}
          contactPhoto={activeCallSession.callerPhoto}
          callType={activeCallSession.callType}
          callSessionId={activeCallSession.id}
        />
      )}
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const [authView, setAuthView] = useState<'email-login' | 'email-register' | 'phone'>(
    typeof window !== 'undefined' && window.location.pathname === '/register'
      ? 'email-register'
      : typeof window !== 'undefined' && window.location.pathname === '/phone'
      ? 'phone'
      : 'email-login'
  );

  React.useEffect(() => {
    if (!user && !loading) {
      if (window.location.pathname === '/register') {
        setAuthView('email-register');
      } else if (window.location.pathname === '/phone') {
        setAuthView('phone');
      } else if (window.location.pathname === '/login') {
        setAuthView('email-login');
      }
    }
  }, [user, loading]);

  React.useEffect(() => {
    if (!user && !loading) {
      if (authView === 'email-register') {
        window.history.replaceState(null, '', '/register');
      } else if (authView === 'phone') {
        window.history.replaceState(null, '', '/phone');
      } else {
        window.history.replaceState(null, '', '/login');
      }
    }
  }, [authView, user, loading]);

  React.useEffect(() => {
    if (user && profile) {
      if (
        window.location.pathname === '/login' ||
        window.location.pathname === '/register' ||
        window.location.pathname === '/phone'
      ) {
        window.history.replaceState(null, '', '/');
      }
    }
  }, [user, profile]);

  if (loading) {
    return (
      <div className="flex h-[100dvh] w-screen flex-col items-center justify-center bg-[#0b141a] text-[#e9edef] select-none">
        <div className="mb-4">
          <Realistic3DIcon name="whatsapp" size="2xl" showDots={true} />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5 mt-2">
          <span>DEV CHAT</span>
          <span className="text-[#25d366]">Web</span>
        </h2>
        <p className="mt-2 text-xs text-[#8696a0]">End-to-end encrypted messaging</p>
      </div>
    );
  }

  // Not authenticated: default to Email LoginView
  if (!user) {
    if (authView === 'email-register') {
      return (
        <RegisterView
          onSwitchToLogin={() => setAuthView('email-login')}
          onSwitchToPhone={() => setAuthView('phone')}
        />
      );
    }
    if (authView === 'phone') {
      return <PhoneAuthView onSwitchToEmail={() => setAuthView('email-login')} />;
    }
    return (
      <LoginView
        onSwitchToRegister={() => setAuthView('email-register')}
        onSwitchToPhone={() => setAuthView('phone')}
      />
    );
  }

  // Authenticated, waiting for profile sync
  if (!profile) {
    return (
      <div className="flex h-[100dvh] w-screen flex-col items-center justify-center bg-[#0b141a] text-[#e9edef] select-none">
        <div className="mb-4">
          <Realistic3DIcon name="whatsapp" size="2xl" showDots={true} />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5 mt-2">
          <span>DEV CHAT</span>
          <span className="text-[#25d366]">Web</span>
        </h2>
        <p className="mt-2 text-xs text-[#8696a0]">Opening your chats...</p>
      </div>
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
