/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  MessageSquarePlus,
  Users,
  CircleDashed,
  MoreVertical,
  Filter,
  Archive,
  Phone,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { ConversationItem } from './ConversationItem';
import { Avatar } from '../common/Avatar';
import { ConversationSkeleton } from '../common/LoadingSkeleton';
import { EmptyState } from '../common/EmptyState';
import { UserStatusStory } from '../../types';
import { ProfileDrawer } from '../profile/ProfileDrawer';
import { SettingsDrawer } from '../settings/SettingsDrawer';
import { NewChatDrawer } from '../contacts/NewChatDrawer';
import { StatusViewerModal } from '../status/StatusViewerModal';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { ThemeToggle } from '../common/ThemeToggle';
import { ConfirmModal } from '../common/ConfirmModal';

interface SidebarProps {
  onOpenStatus: () => void;
  onOpenGroupsHub: () => void;
  onOpenContacts: () => void;
  onOpenCreateGroup: () => void;
  onOpenSettings: () => void;
  onOpenAdmin: () => void;
  onOpenProfile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenStatus,
  onOpenGroupsHub,
  onOpenContacts,
  onOpenCreateGroup,
  onOpenSettings,
  onOpenAdmin,
  onOpenProfile,
}) => {
  const { user, profile, isAdmin, logout } = useAuth();
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    userCache,
    loadingConversations,
    activeFilter,
    setActiveFilter,
    statusStories,
    hasUnreadStatuses,
  } = useChat();

  const [searchTerm, setSearchTerm] = useState('');
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [activeStoryList, setActiveStoryList] = useState<UserStatusStory[]>([]);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Slide-over Drawers
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [isNewChatDrawerOpen, setIsNewChatDrawerOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Ctrl/Cmd + K shortcut to focus chat search
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  // Close 3-dots menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenuDropdown(false);
      }
    };
    if (showMenuDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showMenuDropdown]);

  // Filter & sort (pinned first, then updatedAt desc)
  const filteredConversations = conversations
    .filter((conv) => {
      const isArchived = conv.archivedBy?.includes(user?.uid || '');
      if (activeFilter === 'archived') {
        if (!isArchived) return false;
      } else {
        if (isArchived) return false;
      }

      if (activeFilter === 'direct' && conv.type !== 'direct') return false;
      if (activeFilter === 'groups' && conv.type !== 'group') return false;
      if (activeFilter === 'unread') {
        const unread = conv.unreadCounts?.[user?.uid || ''] || 0;
        if (unread === 0) return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        if (conv.type === 'group' && (conv.name || '').toLowerCase().includes(q)) return true;
        if ((conv.lastMessage?.text || '').toLowerCase().includes(q)) return true;

        const partnerId = conv.participantIds?.find((id) => id !== user?.uid);
        if (partnerId && userCache[partnerId]) {
          const p = userCache[partnerId];
          return (
            (p?.displayName || '').toLowerCase().includes(q) ||
            (p?.username || '').toLowerCase().includes(q)
          );
        }
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const aPinned = a.pinnedBy?.includes(user?.uid || '') ? 1 : 0;
      const bPinned = b.pinnedBy?.includes(user?.uid || '') ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

  const archivedCount = conversations.filter((c) =>
    c.archivedBy?.includes(user?.uid || '')
  ).length;

  return (
    <aside className="relative flex h-full w-full flex-col border-r border-[#222d34] bg-[#111b21] select-none overflow-hidden">
      {/* Left Slide-over Drawers */}
      <ProfileDrawer
        isOpen={isProfileDrawerOpen}
        onClose={() => setIsProfileDrawerOpen(false)}
      />
      <SettingsDrawer
        isOpen={isSettingsDrawerOpen}
        onClose={() => setIsSettingsDrawerOpen(false)}
        onOpenProfile={() => {
          setIsSettingsDrawerOpen(false);
          setIsProfileDrawerOpen(true);
        }}
      />
      <NewChatDrawer
        isOpen={isNewChatDrawerOpen}
        onClose={() => setIsNewChatDrawerOpen(false)}
        onOpenCreateGroup={() => {
          setIsNewChatDrawerOpen(false);
          onOpenCreateGroup();
        }}
      />

      {/* Top Header */}
      <div className="flex h-14 md:h-16 items-center justify-between border-b border-[#222d34] bg-[#202c33] px-3.5 sm:px-4 py-2 z-10 flex-shrink-0">
        <button
          type="button"
          onClick={() => setIsProfileDrawerOpen(true)}
          className="flex items-center gap-2.5 cursor-pointer group rounded-xl p-1 -ml-1 hover:bg-[#2a3942]/50 transition min-h-[44px]"
          title="My Profile"
        >
          <Avatar
            src={profile?.photoURL}
            name={profile?.displayName || 'User'}
            size="md"
            isOnline={true}
            showPresence={true}
          />
          <span className="text-base sm:text-sm font-bold tracking-tight text-[#e9edef]">
            DEV CHAT
          </span>
        </button>

        {/* Right Action Icons */}
        <div className="flex items-center gap-0.5 sm:gap-1 text-[#aebac1]">
          <button
            onClick={onOpenGroupsHub}
            className="hidden md:flex h-10 w-10 items-center justify-center rounded-full hover:bg-[#374248] hover:text-[#e9edef] transition"
            title="Communities & Groups"
            aria-label="Communities and Groups"
          >
            <Users className="h-5 w-5" />
          </button>

          <button
            onClick={onOpenStatus}
            className="hidden md:flex relative h-10 w-10 items-center justify-center rounded-full hover:bg-[#374248] hover:text-[#e9edef] transition"
            title="Status Stories"
            aria-label="Status Stories"
          >
            <CircleDashed className="h-5 w-5" />
            {hasUnreadStatuses && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#25d366] ring-2 ring-[#202c33]" />
            )}
          </button>

          <button
            onClick={onOpenContacts}
            className="hidden md:flex h-10 w-10 items-center justify-center rounded-full hover:bg-[#374248] hover:text-[#e9edef] transition"
            title="Calls & Contacts"
            aria-label="Calls and Contacts"
          >
            <Phone className="h-[18px] w-[18px]" />
          </button>

          <button
            onClick={() => setIsNewChatDrawerOpen(true)}
            className="flex h-11 w-11 md:h-10 md:w-10 items-center justify-center rounded-full hover:bg-[#374248] hover:text-[#e9edef] active:scale-95 transition"
            title="New chat"
            aria-label="Start new chat"
          >
            <MessageSquarePlus className="h-5 w-5" />
          </button>

          <ThemeToggle />

          <div className="hidden sm:block">
            <PWAInstallButton compact={true} />
          </div>

          {/* 3-Dots Menu Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenuDropdown(!showMenuDropdown)}
              className="flex h-11 w-11 md:h-10 md:w-10 items-center justify-center rounded-full hover:bg-[#374248] hover:text-[#e9edef] active:scale-95 transition"
              title="Menu"
              aria-label="Menu"
            >
              <MoreVertical className="h-5 w-5" />
            </button>

            {showMenuDropdown && (
              <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-[#222d34] bg-[#233138] py-1.5 shadow-2xl backdrop-blur-md animate-in fade-in">
                <PWAInstallButton variant="menu-item" />
                <div className="px-4 py-2 flex items-center justify-between border-b border-[#222d34]/60">
                  <span className="text-xs text-[#d1d7db]">Theme</span>
                  <ThemeToggle />
                </div>
                <button
                  onClick={() => {
                    setShowMenuDropdown(false);
                    onOpenProfile();
                  }}
                  className="flex w-full items-center px-4 py-2.5 text-xs text-[#d1d7db] hover:bg-[#182229] transition"
                >
                  Profile
                </button>
                <button
                  onClick={() => {
                    setShowMenuDropdown(false);
                    onOpenCreateGroup();
                  }}
                  className="flex w-full items-center px-4 py-2.5 text-xs text-[#d1d7db] hover:bg-[#182229] transition"
                >
                  New group
                </button>
                <button
                  onClick={() => {
                    setShowMenuDropdown(false);
                    onOpenGroupsHub();
                  }}
                  className="flex w-full items-center px-4 py-2.5 text-xs text-[#d1d7db] hover:bg-[#182229] transition"
                >
                  Communities
                </button>
                <button
                  onClick={() => {
                    setShowMenuDropdown(false);
                    onOpenContacts();
                  }}
                  className="flex w-full items-center px-4 py-2.5 text-xs text-[#d1d7db] hover:bg-[#182229] transition"
                >
                  Calls & Contacts
                </button>
                <button
                  onClick={() => {
                    setShowMenuDropdown(false);
                    setActiveFilter('archived');
                  }}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-xs text-[#d1d7db] hover:bg-[#182229] transition"
                >
                  <span>Archived chats</span>
                  <span className="tabular-nums text-[11px] font-semibold text-[#00a884]">{archivedCount}</span>
                </button>
                <button
                  onClick={() => {
                    setShowMenuDropdown(false);
                    setIsSettingsDrawerOpen(true);
                  }}
                  className="flex w-full items-center px-4 py-2.5 text-xs text-[#d1d7db] hover:bg-[#182229] transition"
                >
                  Settings (Quick)
                </button>
                <button
                  onClick={() => {
                    setShowMenuDropdown(false);
                    onOpenSettings();
                  }}
                  className="flex w-full items-center px-4 py-2.5 text-xs text-[#d1d7db] hover:bg-[#182229] transition"
                >
                  All Settings
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setShowMenuDropdown(false);
                      onOpenAdmin();
                    }}
                    className="flex w-full items-center px-4 py-2.5 text-xs font-semibold text-[#25d366] hover:bg-[#182229] transition"
                  >
                    Admin Dashboard
                  </button>
                )}
                <div className="my-1 border-t border-[#222d34]" />
                <button
                  onClick={() => {
                    setShowMenuDropdown(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="flex w-full items-center px-4 py-2.5 text-xs font-medium text-rose-400 hover:bg-[#182229] transition"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar & Filter Unread Toggle */}
      <div className="px-3 py-2.5 border-b border-[#222d34]/60 bg-[#111b21] flex items-center gap-2 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696a0]" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search or start new chat (Ctrl+K)"
            className="w-full rounded-xl border border-transparent bg-[#202c33] pl-10 pr-9 py-2 text-[15px] md:text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884] transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[#8696a0] hover:text-[#e9edef]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() =>
            setActiveFilter(activeFilter === 'unread' ? 'all' : 'unread')
          }
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
            activeFilter === 'unread'
              ? 'bg-[#00a884] text-[#0b141a] shadow-sm'
              : 'text-[#8696a0] hover:bg-[#202c33] hover:text-[#e9edef]'
          }`}
          title="Filter unread chats"
        >
          <Filter className="h-4 w-4" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar border-b border-[#222d34]/40 flex-shrink-0">
        {[
          { id: 'all', label: 'All' },
          { id: 'unread', label: 'Unread' },
          { id: 'direct', label: 'Direct' },
          { id: 'groups', label: 'Groups' },
          ...(archivedCount > 0 || activeFilter === 'archived'
            ? [{ id: 'archived', label: `Archived (${archivedCount})` }]
            : []),
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id as typeof activeFilter)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
              activeFilter === tab.id
                ? 'bg-[#00a884] text-[#0b141a] font-semibold shadow-sm'
                : 'bg-[#202c33] text-[#8696a0] hover:text-[#e9edef]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Archived Banner */}
      {archivedCount > 0 && activeFilter !== 'archived' && (
        <div
          onClick={() => setActiveFilter('archived')}
          className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-[#202c33] transition border-b border-[#222d34]/60 text-[#8696a0]"
        >
          <div className="flex items-center gap-3.5">
            <Archive className="h-4 w-4 text-[#00a884]" />
            <span className="text-xs font-medium text-[#e9edef]">Archived</span>
          </div>
          <span className="tabular-nums text-xs font-semibold text-[#00a884]">
            {archivedCount}
          </span>
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#222d34]/20 pb-20 md:pb-4">
        {loadingConversations ? (
          <div className="space-y-1 pt-2">
            <ConversationSkeleton />
            <ConversationSkeleton />
            <ConversationSkeleton />
          </div>
        ) : filteredConversations.length === 0 ? (
          <EmptyState
            icon={MessageSquarePlus}
            title={searchTerm ? 'No matches found' : activeFilter === 'archived' ? 'No archived chats' : 'No chats yet'}
            description={
              searchTerm
                ? `No chats match "${searchTerm}"`
                : activeFilter === 'archived'
                ? 'Archived conversations will appear here.'
                : 'Start a direct chat or create a group to begin messaging.'
            }
            actionText={activeFilter === 'archived' ? 'Show All Chats' : 'New Chat'}
            onAction={() => {
              if (activeFilter === 'archived') setActiveFilter('all');
              else setIsNewChatDrawerOpen(true);
            }}
          />
        ) : (
          filteredConversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === activeConversationId}
              currentUserId={user?.uid || ''}
              userCache={userCache}
              userStatusStories={statusStories}
              onViewStatus={(stories) => {
                setActiveStoryList(stories);
                setIsStoryViewerOpen(true);
              }}
              onSelect={() => setActiveConversationId(conv.id)}
            />
          ))
        )}

        {/* Developer Credit Footer */}
        <div className="p-3 text-center text-[11px] text-[#8696a0]/80 border-t border-[#222d34]/40 mt-auto">
          <span>DEV CHAT • Built by <strong className="text-[#00a884]">lawrencedev</strong></span>
        </div>
      </div>

      {/* Floating Action Button (FAB) for New Chat */}
      <button
        onClick={() => setIsNewChatDrawerOpen(true)}
        className="absolute right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-6 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00a884] text-[#0b141a] shadow-2xl hover:bg-[#06cf9c] hover:scale-105 active:scale-95 transition-all duration-200 group ring-4 ring-[#111b21]/70"
        title="Start New Chat"
        aria-label="Start New Chat"
      >
        <MessageSquarePlus className="h-6 w-6 stroke-[2.25] group-hover:rotate-6 transition-transform" />
      </button>

      {/* Story Viewer from Avatar click */}
      <StatusViewerModal
        isOpen={isStoryViewerOpen}
        onClose={() => setIsStoryViewerOpen(false)}
        stories={activeStoryList}
      />

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={async () => {
          setShowLogoutConfirm(false);
          await logout();
        }}
        title="Log out of DEV CHAT?"
        description="You will need to sign back in to access your chats, status updates, and calls."
        confirmText="Log out"
        variant="danger"
      />
    </aside>
  );
};
