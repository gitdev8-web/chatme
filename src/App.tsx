/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './components/common/Toast';
import { LoginView } from './components/auth/LoginView';
import { RegisterView } from './components/auth/RegisterView';
import { Sidebar } from './components/chat/Sidebar';
import { ChatArea } from './components/chat/ChatArea';
import { ChatDetailsSidebar } from './components/chat/ChatDetailsSidebar';
import { ContactsModal } from './components/contacts/ContactsModal';
import { CreateGroupModal } from './components/groups/CreateGroupModal';
import { CommunitiesPage } from './components/groups/CommunitiesPage';
import { StatusPage } from './components/status/StatusPage';
import { CallsPage } from './components/calls/CallsPage';
import { ProfileModal } from './components/profile/ProfileModal';
import { SettingsPage } from './components/settings/SettingsPage';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { BottomNav, BottomNavTab } from './components/navigation/BottomNav';
import { OfflineBanner } from './components/common/OfflineBanner';
import { IncomingCallModal } from './components/calls/IncomingCallModal';
import { CallModal } from './components/calls/CallModal';
import { GoogleMeetModal } from './components/calls/GoogleMeetModal';
import { PWAUpdateToast } from './components/common/PWAUpdateToast';
import { subscribeToIncomingCalls } from './services/callService';
import { CallSession } from './types';
import { SystemAnnouncement, SystemSettings } from './types/admin';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase/config';
import { Ban, Lock, LogOut, Megaphone, Wrench, X } from 'lucide-react';

const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  appName: 'DEV CHAT',
  maintenanceMode: false,
  registrationOpen: true,
  voiceCallsEnabled: true,
  videoCallsEnabled: true,
  statusStoriesEnabled: true,
  maxFileSizeMb: 25,
  maxGroupMembers: 256,
  moderationStrictness: 'standard',
  updatedAt: '',
  updatedBy: 'system',
};

interface MainChatDashboardProps {
  systemSettings: SystemSettings;
}

const MainChatDashboard: React.FC<MainChatDashboardProps> = ({ systemSettings }) => {
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
    hasUnreadStatuses,
  } = useChat();

  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<BottomNavTab>('chats');

  // Real-time call states
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [activeCallSession, setActiveCallSession] = useState<CallSession | null>(null);

  // Active platform announcements
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [dismissedAnnIds, setDismissedAnnIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setIncomingCall(null);
      return;
    }
    const unsub = subscribeToIncomingCalls(user.uid, (call) => {
      setIncomingCall(call);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'announcements'), where('active', '==', true));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: SystemAnnouncement[] = [];
        snap.forEach((d) => items.push(d.data() as SystemAnnouncement));
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAnnouncements(items);
      },
      () => {}
    );
    return () => unsub();
  }, [user]);

  // Synchronize initial URL route on mount
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/app/chat/')) {
      const convId = path.replace('/app/chat/', '').trim();
      if (convId) setActiveConversationId(convId);
    } else if (path === '/app/status') {
      setActiveBottomTab('status');
    } else if (path === '/app/groups') {
      setActiveBottomTab('groups');
    } else if (path === '/app/calls' || path === '/app/contacts') {
      setActiveBottomTab('contacts');
    } else if (path === '/app/settings') {
      setActiveBottomTab('settings');
    }
  }, [setActiveConversationId]);

  // Update browser URL state cleanly as user navigates
  useEffect(() => {
    if (activeConversationId) {
      window.history.replaceState({ convId: activeConversationId }, '', `/app/chat/${activeConversationId}`);
    } else if (activeBottomTab === 'status') {
      window.history.replaceState(null, '', '/app/status');
    } else if (activeBottomTab === 'groups') {
      window.history.replaceState(null, '', '/app/groups');
    } else if (activeBottomTab === 'contacts') {
      window.history.replaceState(null, '', '/app/calls');
    } else if (activeBottomTab === 'settings') {
      window.history.replaceState(null, '', '/app/settings');
    } else {
      window.history.replaceState(null, '', '/app/chats');
    }
  }, [activeConversationId, activeBottomTab]);

  // Support mobile hardware and browser back button
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/app/chat/')) {
        const convId = path.replace('/app/chat/', '').trim();
        setActiveConversationId(convId || null);
      } else {
        setActiveConversationId(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setActiveConversationId]);

  const totalUnread = conversations.reduce((acc, conv) => {
    return acc + (conv.unreadCounts?.[user?.uid || ''] || 0);
  }, 0);

  const handleBottomTabChange = (tab: BottomNavTab) => {
    setActiveBottomTab(tab);
    if (tab === 'chats') {
      setActiveFilter('all');
    }
  };

  const activeAnnouncement = announcements.find((a) => !dismissedAnnIds.includes(a.id));

  return (
    <div className="flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#0b141a] text-[#e9edef] antialiased select-none relative">
      <OfflineBanner />

      {/* Broadcast Announcement Banner */}
      {activeAnnouncement && (
        <div
          className={`flex items-center justify-between gap-3 px-4 py-2 text-xs border-b flex-shrink-0 z-30 ${
            activeAnnouncement.priority === 'critical'
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-200'
              : activeAnnouncement.priority === 'important'
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
              : 'bg-[#00a884]/15 border-[#00a884]/30 text-[#d9fdd3]'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Megaphone className="h-4 w-4 flex-shrink-0" />
            <p className="truncate">
              <strong className="font-semibold">{activeAnnouncement.title}:</strong>{' '}
              {activeAnnouncement.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDismissedAnnIds((prev) => [...prev, activeAnnouncement.id])}
            aria-label="Dismiss announcement"
            className="rounded p-1 hover:bg-black/20 transition flex-shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden relative">
        {activeBottomTab === 'status' && !activeConversationId ? (
          <div className="flex-1 h-full w-full">
            <StatusPage
              onBackMobile={() => setActiveBottomTab('chats')}
              statusStoriesEnabled={systemSettings.statusStoriesEnabled}
            />
          </div>
        ) : activeBottomTab === 'groups' && !activeConversationId ? (
          <div className="flex-1 h-full w-full">
            <CommunitiesPage
              onBackMobile={() => setActiveBottomTab('chats')}
              onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
            />
          </div>
        ) : activeBottomTab === 'contacts' && !activeConversationId ? (
          <div className="flex-1 h-full w-full">
            <CallsPage
              onBackMobile={() => setActiveBottomTab('chats')}
              onOpenContacts={() => setIsContactsOpen(true)}
              voiceCallsEnabled={systemSettings.voiceCallsEnabled}
              videoCallsEnabled={systemSettings.videoCallsEnabled}
            />
          </div>
        ) : activeBottomTab === 'settings' && !activeConversationId ? (
          <div className="flex-1 h-full w-full">
            <SettingsPage
              onBackMobile={() => setActiveBottomTab('chats')}
              onOpenProfile={() => setIsProfileOpen(true)}
            />
          </div>
        ) : (
          <>
            {/* Sidebar: Visible on desktop or when no chat is active on mobile */}
            <div
              className={`${
                activeConversationId ? 'hidden md:flex' : 'flex'
              } w-full md:w-80 lg:w-[360px] xl:w-[390px] flex-shrink-0 h-full overflow-hidden`}
            >
              <Sidebar
                onOpenStatus={() => setActiveBottomTab('status')}
                onOpenGroupsHub={() => setActiveBottomTab('groups')}
                onOpenContacts={() => setActiveBottomTab('contacts')}
                onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
                onOpenSettings={() => setActiveBottomTab('settings')}
                onOpenAdmin={() => {
                  window.history.pushState(null, '', '/admin');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                onOpenProfile={() => setIsProfileOpen(true)}
              />
            </div>

            {/* Active Chat Area */}
            <div
              className={`${
                activeConversationId ? 'flex' : 'hidden md:flex'
              } flex-1 h-full min-w-0 overflow-hidden`}
            >
              <ChatArea
                onBackMobile={() => setActiveConversationId(null)}
                onToggleDetails={() => setShowChatDetails(!showChatDetails)}
                voiceCallsEnabled={systemSettings.voiceCallsEnabled}
                videoCallsEnabled={systemSettings.videoCallsEnabled}
                maxFileSizeMb={systemSettings.maxFileSizeMb}
                maintenanceMode={systemSettings.maintenanceMode}
              />
            </div>
          </>
        )}

        {/* Right Details Sidebar */}
        {showChatDetails && activeConversation && (
          <>
            <div className="hidden lg:flex h-full">
              <ChatDetailsSidebar
                conversation={activeConversation}
                messages={messages}
                userCache={userCache}
                onClose={() => setShowChatDetails(false)}
                onOpenAddMembers={() => setIsContactsOpen(true)}
              />
            </div>

            <div className="lg:hidden fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in">
              <div className="w-full max-w-sm h-full bg-[#111b21] shadow-2xl">
                <ChatDetailsSidebar
                  conversation={activeConversation}
                  messages={messages}
                  userCache={userCache}
                  onClose={() => setShowChatDetails(false)}
                  onOpenAddMembers={() => setIsContactsOpen(true)}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      {!activeConversationId && (
        <BottomNav
          activeTab={activeBottomTab}
          onTabChange={handleBottomTabChange}
          unreadCount={totalUnread}
          hasUnreadStatus={hasUnreadStatuses}
        />
      )}

      {/* Contacts / Start Chat Modal */}
      <ContactsModal
        isOpen={isContactsOpen}
        onClose={() => setIsContactsOpen(false)}
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

      {/* Real-time Incoming Call Modal */}
      <IncomingCallModal
        call={activeCallSession ? null : incomingCall}
        onAccept={(call) => {
          setIncomingCall(null);
          setActiveCallSession(call);
        }}
        onDecline={() => setIncomingCall(null)}
      />

      {/* Active Received Call Modal (Google Meet for video, WebRTC for audio/legacy) */}
      {activeCallSession &&
        (activeCallSession.provider === 'google-meet' && activeCallSession.meetUri ? (
          <GoogleMeetModal
            isOpen={true}
            isIncoming={true}
            onClose={() => setActiveCallSession(null)}
            title={activeCallSession.callerName}
            photoURL={activeCallSession.callerPhoto}
            callSessionId={activeCallSession.id}
            initialMeetSpace={{
              meetingUri: activeCallSession.meetUri,
              meetingCode: activeCallSession.meetCode || '',
              spaceName: activeCallSession.meetSpaceName || '',
            }}
          />
        ) : (
          <CallModal
            isOpen={true}
            isIncoming={true}
            onClose={() => setActiveCallSession(null)}
            contactName={activeCallSession.callerName}
            contactPhoto={activeCallSession.callerPhoto}
            callType={activeCallSession.callType}
            callSessionId={activeCallSession.id}
          />
        ))}
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, profile, loading, isAdmin, logout } = useAuth();
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(
    typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
  );
  const [authView, setAuthView] = useState<'email-login' | 'email-register'>(
    typeof window !== 'undefined' && window.location.pathname === '/register'
      ? 'email-register'
      : 'email-login'
  );

  // Listen to global system settings when signed in
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      doc(db, 'system_settings', 'global'),
      (snap) => {
        if (snap.exists()) {
          setSystemSettings({ ...DEFAULT_SYSTEM_SETTINGS, ...(snap.data() as SystemSettings) });
        }
      },
      () => {}
    );
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const handlePopState = () => {
      setIsAdminRoute(window.location.pathname.startsWith('/admin'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!user && !loading && !isAdminRoute) {
      if (window.location.pathname === '/register') {
        setAuthView('email-register');
      } else {
        setAuthView('email-login');
      }
    }
  }, [user, loading, isAdminRoute]);

  useEffect(() => {
    if (!user && !loading && !isAdminRoute) {
      if (authView === 'email-register') {
        window.history.replaceState(null, '', '/register');
      } else {
        window.history.replaceState(null, '', '/login');
      }
    }
  }, [authView, user, loading, isAdminRoute]);

  useEffect(() => {
    if (user && profile && !isAdminRoute) {
      if (
        window.location.pathname === '/login' ||
        window.location.pathname === '/register' ||
        window.location.pathname === '/phone'
      ) {
        window.history.replaceState(null, '', '/');
      }
    }
  }, [user, profile, isAdminRoute]);

  // Admin Dashboard Route handler
  if (isAdminRoute) {
    return (
      <AdminDashboard
        onReturnToApp={() => {
          window.history.pushState(null, '', '/');
          setIsAdminRoute(false);
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex h-[100dvh] w-screen flex-col items-center justify-center bg-[#0c1317] text-[#e9edef] select-none p-6">
        <div className="flex flex-col items-center max-w-sm text-center">
          <img
            src="/logo.png"
            alt="DEV CHAT"
            className="h-16 w-16 rounded-2xl shadow-xl shadow-[#00a884]/25 object-cover border border-[#00a884]/30 mb-6"
          />
          <div className="relative w-56 h-1 bg-[#202c33] rounded-full overflow-hidden mb-4">
            <div className="absolute inset-y-0 left-0 w-2/5 bg-gradient-to-r from-[#00a884] to-[#25d366] rounded-full animate-shimmer" />
          </div>
          <h2 className="text-base font-semibold tracking-tight text-white">
            DEV CHAT Web
          </h2>
          <div className="mt-8 flex items-center gap-1.5 text-xs text-[#8696a0]">
            <Lock className="h-3.5 w-3.5 text-[#00a884]" />
            <span>End-to-end encrypted</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    if (authView === 'email-register') {
      return (
        <RegisterView
          onSwitchToLogin={() => setAuthView('email-login')}
          registrationOpen={systemSettings.registrationOpen}
        />
      );
    }
    return (
      <LoginView
        onSwitchToRegister={() => setAuthView('email-register')}
      />
    );
  }

  if (!profile) {
    return (
      <div className="flex h-[100dvh] w-screen flex-col items-center justify-center bg-[#0c1317] text-[#e9edef] select-none p-6">
        <div className="flex flex-col items-center max-w-sm text-center">
          <img
            src="/logo.png"
            alt="DEV CHAT"
            className="h-16 w-16 rounded-2xl shadow-xl shadow-[#00a884]/25 object-cover border border-[#00a884]/30 mb-6"
          />
          <div className="relative w-56 h-1 bg-[#202c33] rounded-full overflow-hidden mb-4">
            <div className="absolute inset-y-0 left-0 w-2/5 bg-gradient-to-r from-[#00a884] to-[#25d366] rounded-full animate-shimmer" />
          </div>
          <h2 className="text-base font-semibold tracking-tight text-white">
            DEV CHAT Web
          </h2>
          <p className="mt-1 text-xs text-[#8696a0]">Opening your chats...</p>
        </div>
      </div>
    );
  }

  // Suspended user lock screen
  if (profile.isDisabled && !isAdmin) {
    return (
      <div className="flex h-[100dvh] w-screen flex-col items-center justify-center bg-[#0c1317] text-[#e9edef] select-none p-6">
        <div className="max-w-md w-full rounded-2xl border border-rose-500/30 bg-[#111b21] p-7 text-center shadow-2xl space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400">
            <Ban className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-[#e9edef]">Account Suspended</h2>
          <p className="text-xs text-[#8696a0] leading-relaxed">
            Your DEV CHAT account (@{profile.username}) has been suspended by an administrator. Please contact support for assistance.
          </p>
          <button
            type="button"
            onClick={() => logout()}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 text-xs font-semibold text-white hover:bg-rose-600 transition"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    );
  }

  // Maintenance mode lock screen for standard users
  if (systemSettings.maintenanceMode && !isAdmin) {
    return (
      <div className="flex h-[100dvh] w-screen flex-col items-center justify-center bg-[#0c1317] text-[#e9edef] select-none p-6">
        <div className="max-w-md w-full rounded-2xl border border-amber-500/30 bg-[#111b21] p-7 text-center shadow-2xl space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
            <Wrench className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-[#e9edef]">Scheduled Maintenance</h2>
          <p className="text-xs text-[#8696a0] leading-relaxed">
            DEV CHAT is currently undergoing scheduled maintenance to improve performance and security. We will be back shortly.
          </p>
          <button
            type="button"
            onClick={() => logout()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#202c33] px-5 py-2.5 text-xs font-semibold text-[#e9edef] hover:bg-[#2a3942] transition"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    );
  }

  return <MainChatDashboard systemSettings={systemSettings} />;
};

export default function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <ToastProvider>
          <AuthProvider>
            <ChatProvider>
              <AppContent />
              <PWAUpdateToast />
            </ChatProvider>
          </AuthProvider>
        </ToastProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}
