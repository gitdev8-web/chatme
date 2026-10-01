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
  Star,
  CheckSquare,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { ConversationItem } from './ConversationItem';
import { Avatar } from '../common/Avatar';
import { ConversationSkeleton } from '../common/LoadingSkeleton';
import { EmptyState } from '../common/EmptyState';
import { subscribeToStatusStories } from '../../services/statusService';
import { UserStatusStory } from '../../types';
import { ProfileDrawer } from '../profile/ProfileDrawer';
import { SettingsDrawer } from '../settings/SettingsDrawer';
import { NewChatDrawer } from '../contacts/NewChatDrawer';
import { StatusViewerModal } from '../status/StatusViewerModal';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { ThemeToggle } from '../common/ThemeToggle';

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
  } = useChat();

  const [searchTerm, setSearchTerm] = useState('');
  const [statuses, setStatuses] = useState<UserStatusStory[]>([]);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [activeStoryList, setActiveStoryList] = useState<UserStatusStory[]>([]);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);

  // Slide-over Drawers
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [isNewChatDrawerOpen, setIsNewChatDrawerOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);

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

  // Subscribe to live status updates
  useEffect(() => {
    const unsub = subscribeToStatusStories((list) => {
      setStatuses(list);
    });
    return () => unsub();
  }, []);

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    // Archived filter logic
    const isArchived = conv.archivedBy?.includes(user?.uid || '');
    if (activeFilter === 'archived') {
      if (!isArchived) return false;
    } else {
      if (isArchived) return false;
    }

    // Type / status filters
    if (activeFilter === 'direct' && conv.type !== 'direct') return false;
    if (activeFilter === 'groups' && conv.type !== 'group') return false;
    if (activeFilter === 'unread') {
      const unread = conv.unreadCounts?.[user?.uid || ''] || 0;
      if (unread === 0) return false;
    }

    // Search query filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      if (conv.type === 'group' && (conv.name || '').toLowerCase().includes(q)) return true;
      if ((conv.lastMessage?.text || '').toLowerCase().includes(q)) return true;

      // Check partner's name or username
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
  });

  const archivedCount = conversations.filter((c) =>
    c.archivedBy?.includes(user?.uid || '')
  ).length;

  const hasUnreadStories = statuses.some(
    (s) => s.userId !== user?.uid && !s.viewedBy?.includes(user?.uid || '')
  );

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
      <div className="flex h-15 items-center justify-between border-b border-[#222d34] bg-[#202c33] px-4 py-2.5 z-10 flex-shrink-0">
        {/* User Profile Avatar */}
        <div
          onClick={() => setIsProfileDrawerOpen(true)}
          className="flex items-center gap-3 cursor-pointer group"
          title="Profile"
        >
          <Avatar
            src={profile?.photoURL}
            name={profile?.displayName || 'User'}
            size="md"
            isOnline={true}
            showPresence={true}
          />
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2 text-[#aebac1]">
          {/* Communities / Groups */}
          <button
            onClick={onOpenGroupsHub}
            className="p-2 rounded-full hover:bg-[#374248] hover:text-[#e9edef] transition"
            title="Communities & Groups"
          >
            <Users className="h-5 w-5" />
          </button>

          {/* Status Updates */}
          <button
            onClick={onOpenStatus}
            className="relative p-2 rounded-full hover:bg-[#374248] hover:text-[#e9edef] transition"
            title="Status"
          >
            <CircleDashed className="h-5 w-5" />
            {hasUnreadStories && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#00a884] ring-2 ring-[#202c33]" />
            )}
          </button>

          {/* New Chat */}
          <button
            onClick={() => setIsNewChatDrawerOpen(true)}
            className="p-2 rounded-full hover:bg-[#374248] hover:text-[#e9edef] transition"
            title="New chat"
          >
            <MessageSquarePlus className="h-5 w-5" />
          </button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Install DEV CHAT PWA App Button */}
          <PWAInstallButton compact={true} />

          {/* 3-Dots Menu Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenuDropdown(!showMenuDropdown)}
              className="p-2 rounded-full hover:bg-[#374248] hover:text-[#e9edef] transition"
              title="Menu"
            >
              <MoreVertical className="h-5 w-5" />
            </button>

            {showMenuDropdown && (
              <div className="absolute right-0 top-11 z-50 w-52 rounded-2xl border border-[#222d34] bg-[#233138] py-2 shadow-2xl backdrop-blur-md animate-in fade-in">
                <PWAInstallButton variant="menu-item" />
                <div className="px-4 py-2 flex items-center justify-between border-b border-[#222d34]/60">
                  <span className="text-xs text-[#d1d7db]">Theme</span>
                  <ThemeToggle />
                </div>
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
                  New community
                </button>
                <button
                  onClick={() => {
                    setShowMenuDropdown(false);
                    setActiveFilter('archived');
                  }}
                  className="flex w-full items-center px-4 py-2.5 text-xs text-[#d1d7db] hover:bg-[#182229] transition"
                >
                  Archived chats ({archivedCount})
                </button>
                <button
                  onClick={() => {
                    setShowMenuDropdown(false);
                    setIsSettingsDrawerOpen(true);
                  }}
                  className="flex w-full items-center px-4 py-2.5 text-xs text-[#d1d7db] hover:bg-[#182229] transition"
                >
                  Settings
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setShowMenuDropdown(false);
                      onOpenAdmin();
                    }}
                    className="flex w-full items-center px-4 py-2.5 text-xs text-[#25d366] hover:bg-[#182229] transition"
                  >
                    Admin Moderation
                  </button>
                )}
                <div className="my-1 border-t border-[#222d34]" />
                <button
                  onClick={() => {
                    setShowMenuDropdown(false);
                    if (confirm('Log out of DEV CHAT?')) logout();
                  }}
                  className="flex w-full items-center px-4 py-2.5 text-xs text-rose-400 hover:bg-[#182229] transition"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar & Filter Unread Toggle */}
      <div className="p-3 border-b border-[#222d34]/60 bg-[#111b21] flex items-center gap-2 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696a0]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search or start new chat"
            className="w-full rounded-lg border border-transparent bg-[#202c33] pl-10 pr-3 py-1.5 text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884] transition"
          />
        </div>

        {/* Unread Filter Button */}
        <button
          onClick={() =>
            setActiveFilter(activeFilter === 'unread' ? 'all' : 'unread')
          }
          className={`p-2 rounded-lg transition ${
            activeFilter === 'unread'
              ? 'bg-[#00a884] text-white shadow-sm'
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
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id as typeof activeFilter)}
            className={`rounded-full px-3 py-1 text-xs font-normal transition-all whitespace-nowrap ${
              activeFilter === tab.id
                ? 'bg-[#00a884] text-[#111b21] font-semibold shadow-sm'
                : 'bg-[#202c33] text-[#8696a0] hover:text-[#e9edef]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Archived Banner (if applicable or active) */}
      {archivedCount > 0 && activeFilter !== 'archived' && (
        <div
          onClick={() => setActiveFilter('archived')}
          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#202c33] transition border-b border-[#222d34]/60 text-[#8696a0]"
        >
          <div className="flex items-center gap-4">
            <Archive className="h-5 w-5 text-[#00a884]" />
            <span className="text-sm text-[#e9edef]">Archived</span>
          </div>
          <span className="text-xs font-semibold text-[#00a884]">
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
            title={searchTerm ? 'No matches found' : 'No chats yet'}
            description={
              searchTerm
                ? `No chats match "${searchTerm}"`
                : 'Start a direct chat or create a group to begin messaging.'
            }
            actionText="New Chat"
            onAction={() => setIsNewChatDrawerOpen(true)}
          />
        ) : (
          filteredConversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === activeConversationId}
              currentUserId={user?.uid || ''}
              userCache={userCache}
              userStatusStories={statuses}
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

      {/* Story Viewer from Avatar click */}
      <StatusViewerModal
        isOpen={isStoryViewerOpen}
        onClose={() => setIsStoryViewerOpen(false)}
        stories={activeStoryList}
      />
    </aside>
  );
};
