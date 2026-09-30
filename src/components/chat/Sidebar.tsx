/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Search,
  MessageSquare,
  Sparkles,
  Users,
  Plus,
  CircleDashed,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { ConversationItem } from './ConversationItem';
import { Avatar } from '../common/Avatar';
import { ConversationSkeleton } from '../common/LoadingSkeleton';
import { EmptyState } from '../common/EmptyState';
import { Realistic3DIcon } from '../common/Realistic3DIcon';
import { subscribeToStatusStories } from '../../services/statusService';
import { UserStatusStory } from '../../types';

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
  const { user, profile, isAdmin } = useAuth();
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

  // Subscribe to live status updates for the story strip
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
          (p.displayName || '').toLowerCase().includes(q) ||
          (p.username || '').toLowerCase().includes(q)
        );
      }
      return false;
    }

    return true;
  });

  // Separate pinned from normal
  const pinnedConversations = filteredConversations.filter((c) =>
    c.pinnedBy?.includes(user?.uid || '')
  );
  const otherConversations = filteredConversations.filter(
    (c) => !c.pinnedBy?.includes(user?.uid || '')
  );

  const hasUnreadStories = statuses.some(
    (s) => s.userId !== user?.uid && !s.viewedBy?.includes(user?.uid || '')
  );

  return (
    <aside className="flex h-full w-full flex-col border-r border-[#222d34] bg-[#111b21] select-none">
      {/* Top Header - WhatsApp Theme */}
      <div className="flex items-center justify-between border-b border-[#222d34] bg-[#202c33] px-3 py-2.5 sm:px-3.5 sm:py-3">
        <div
          onClick={onOpenProfile}
          className="flex items-center gap-2 cursor-pointer group min-w-0"
          title="My Profile"
        >
          <Avatar
            src={profile?.photoURL}
            name={profile?.displayName || 'User'}
            size="md"
            isOnline={true}
            showPresence={true}
          />
          <div className="min-w-0 max-w-[90px] sm:max-w-[140px]">
            <h2 className="text-xs font-bold text-[#e9edef] truncate group-hover:text-[#25d366] transition-colors">
              {profile?.displayName || 'My Profile'}
            </h2>
            <p className="text-[10px] text-[#8696a0] truncate">
              @{profile?.username || 'user'}
            </p>
          </div>
        </div>

        {/* 3D Action icons toolbar */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {/* WhatsApp Status 3D Icon */}
          <div
            onClick={onOpenStatus}
            className="cursor-pointer relative"
            title="Status Updates"
          >
            <Realistic3DIcon
              name="status"
              size="sm"
              showDots={false}
              badge={hasUnreadStories ? '•' : undefined}
            />
          </div>

          {/* Groups 3D Icon */}
          <div
            onClick={onOpenGroupsHub}
            className="cursor-pointer"
            title="Groups & Communities"
          >
            <Realistic3DIcon name="groups" size="sm" showDots={false} />
          </div>

          {/* New Chat / Contacts 3D Icon */}
          <div
            onClick={onOpenContacts}
            className="cursor-pointer"
            title="New Chat & Contacts"
          >
            <Realistic3DIcon name="students" size="sm" showDots={false} />
          </div>

          {/* Settings 3D Icon */}
          <div
            onClick={onOpenSettings}
            className="cursor-pointer"
            title="Settings & Preferences"
          >
            <Realistic3DIcon name="settings" size="sm" showDots={false} />
          </div>

          {/* Admin 3D Icon */}
          {isAdmin && (
            <div
              onClick={onOpenAdmin}
              className="cursor-pointer"
              title="Admin Permissions & Moderation"
            >
              <Realistic3DIcon name="permissions" size="sm" showDots={false} />
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp Status Story Carousel Banner */}
      <div className="border-b border-[#222d34]/60 bg-[#17242b]/60 px-3 py-2.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8696a0]">
            Status Stories
          </span>
          <button
            onClick={onOpenStatus}
            className="text-[11px] font-semibold text-[#25d366] hover:underline"
          >
            View All →
          </button>
        </div>

        {/* Horizontal Avatar Strip */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-0.5">
          {/* Add My Status */}
          <div
            onClick={onOpenStatus}
            className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0 group"
          >
            <div className="relative">
              <div className="p-0.5 rounded-full ring-2 ring-[#25d366]/40 group-hover:ring-[#25d366] transition">
                <Avatar
                  src={profile?.photoURL}
                  name={profile?.displayName || 'Me'}
                  size="sm"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#00a884] text-white ring-1 ring-[#111b21]">
                <Plus className="h-2.5 w-2.5 stroke-[3]" />
              </div>
            </div>
            <span className="text-[10px] text-[#8696a0] group-hover:text-white truncate max-w-[50px]">
              My Status
            </span>
          </div>

          {/* Contact statuses */}
          {statuses
            .filter((s) => s.userId !== user?.uid)
            .slice(0, 10)
            .map((story) => {
              const isUnviewed = !story.viewedBy?.includes(user?.uid || '');
              return (
                <div
                  key={story.id}
                  onClick={onOpenStatus}
                  className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0 group"
                >
                  <div
                    className={`p-0.5 rounded-full ${
                      isUnviewed
                        ? 'bg-gradient-to-tr from-[#25d366] to-[#128c7e] ring-2 ring-[#25d366]/80 animate-pulse'
                        : 'bg-[#8696a0]/30 ring-1 ring-[#8696a0]/40'
                    }`}
                  >
                    <Avatar
                      src={story.userPhotoURL}
                      name={story.userName}
                      size="sm"
                    />
                  </div>
                  <span className="text-[10px] text-[#8696a0] group-hover:text-white truncate max-w-[55px]">
                    {story.userName.split(' ')[0]}
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Search Bar - WhatsApp Style */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8696a0]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search or start new chat..."
            className="w-full rounded-xl border border-transparent bg-[#202c33] pl-9 pr-3 py-2 text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#25d366] focus:outline-none focus:ring-1 focus:ring-[#25d366] transition"
          />
        </div>
      </div>

      {/* Filter Tabs - WhatsApp Style Pills */}
      <div className="flex items-center gap-1.5 px-3 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'all', label: 'All' },
          { id: 'direct', label: 'Direct' },
          { id: 'groups', label: 'Groups' },
          { id: 'unread', label: 'Unread' },
          { id: 'archived', label: 'Archived' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id as typeof activeFilter)}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all whitespace-nowrap ${
              activeFilter === tab.id
                ? 'bg-[#005c4b] text-[#25d366] ring-1 ring-[#25d366]/40 font-semibold'
                : 'bg-[#202c33] text-[#8696a0] hover:text-[#e9edef]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-20 md:pb-4">
        {loadingConversations ? (
          <div className="space-y-1 pt-2">
            <ConversationSkeleton />
            <ConversationSkeleton />
            <ConversationSkeleton />
          </div>
        ) : filteredConversations.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title={searchTerm ? 'No matches found' : 'No conversations yet'}
            description={
              searchTerm
                ? `No chats match "${searchTerm}"`
                : 'Start a direct chat or create a group to begin messaging.'
            }
            actionText="Start a Chat"
            onAction={onOpenContacts}
          />
        ) : (
          <>
            {/* Pinned Section */}
            {pinnedConversations.length > 0 && (
              <div className="mb-2">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8696a0]">
                  Pinned Chats
                </div>
                {pinnedConversations.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isActive={conv.id === activeConversationId}
                    currentUserId={user?.uid || ''}
                    userCache={userCache}
                    onSelect={() => setActiveConversationId(conv.id)}
                  />
                ))}
              </div>
            )}

            {/* Other Conversations */}
            {otherConversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConversationId}
                currentUserId={user?.uid || ''}
                userCache={userCache}
                onSelect={() => setActiveConversationId(conv.id)}
              />
            ))}
          </>
        )}
      </div>
    </aside>
  );
};
