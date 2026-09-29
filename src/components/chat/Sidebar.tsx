/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Search,
  MessageSquare,
  School,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { ConversationItem } from './ConversationItem';
import { Avatar } from '../common/Avatar';
import { ConversationSkeleton } from '../common/LoadingSkeleton';
import { EmptyState } from '../common/EmptyState';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { Realistic3DIcon } from '../common/Realistic3DIcon';

interface SidebarProps {
  onOpenContacts: () => void;
  onOpenCreateGroup: () => void;
  onOpenSettings: () => void;
  onOpenAdmin: () => void;
  onOpenProfile: () => void;
  onOpenSchoolHub: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenContacts,
  onOpenCreateGroup,
  onOpenSettings,
  onOpenAdmin,
  onOpenProfile,
  onOpenSchoolHub,
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
      if (conv.type === 'group' && conv.name?.toLowerCase().includes(q)) return true;
      if (conv.lastMessage?.text?.toLowerCase().includes(q)) return true;

      // Check partner's name or username
      const partnerId = conv.participantIds.find((id) => id !== user?.uid);
      if (partnerId && userCache[partnerId]) {
        const p = userCache[partnerId];
        return (
          p.displayName.toLowerCase().includes(q) ||
          p.username.toLowerCase().includes(q)
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
          {/* School Hub 3D Icon */}
          <div
            onClick={onOpenSchoolHub}
            className="cursor-pointer"
            title="School Management Hub"
          >
            <Realistic3DIcon name="classes" size="sm" showDots={false} />
          </div>

          {/* New Chat / Directory 3D Icon */}
          <div
            onClick={onOpenContacts}
            className="cursor-pointer"
            title="Student & Teacher Directory"
          >
            <Realistic3DIcon name="students" size="sm" showDots={false} />
          </div>

          {/* New Group 3D Icon */}
          <div
            onClick={onOpenCreateGroup}
            className="cursor-pointer"
            title="Create Class / Group"
          >
            <Realistic3DIcon name="teachers" size="sm" showDots={false} />
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

      {/* School Management Quick Card Banner */}
      <div
        onClick={onOpenSchoolHub}
        className="mx-3 mt-3 p-2.5 rounded-2xl bg-gradient-to-r from-[#005c4b]/50 to-[#128c7e]/20 border border-[#25d366]/20 cursor-pointer hover:border-[#25d366]/40 transition-all flex items-center justify-between shadow-sm"
        title="Open School Management System"
      >
        <div className="flex items-center gap-2.5">
          <Realistic3DIcon name="dashboard" size="sm" showDots={false} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#e9edef]">School Management</span>
              <span className="text-[9px] font-semibold bg-[#25d366]/20 text-[#25d366] px-1.5 py-0.2 rounded-full">
                Active
              </span>
            </div>
            <p className="text-[10px] text-[#8696a0]">
              Students (1,248) • Teachers (64) • Classes (18)
            </p>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-[#25d366] hover:underline">
          Hub →
        </span>
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
          { id: 'groups', label: 'Classes & Groups' },
          { id: 'unread', label: 'Unread' },
          { id: 'archived', label: 'Archived' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id as typeof activeFilter)}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all whitespace-nowrap ${
              activeFilter === tab.id
                ? 'bg-[#005c4b] text-[#25d366] ring-1 ring-[#25d366]/40'
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
                ? 'Try searching with another name or stream.'
                : 'Start a chat with a teacher, student or parent, or launch the School Hub.'
            }
            actionText={searchTerm ? undefined : 'Start a New Chat'}
            onAction={searchTerm ? undefined : onOpenContacts}
            className="pt-12"
          />
        ) : (
          <>
            {/* Pinned Section */}
            {pinnedConversations.length > 0 && (
              <div className="mb-2">
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#8696a0]">
                  Pinned Chats
                </div>
                {pinnedConversations.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isActive={activeConversationId === conv.id}
                    currentUserId={user?.uid || ''}
                    userCache={userCache}
                    onSelect={(id) => setActiveConversationId(id)}
                  />
                ))}
              </div>
            )}

            {/* All / Recent Section */}
            {otherConversations.length > 0 && (
              <div>
                {pinnedConversations.length > 0 && (
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#8696a0]">
                    All Messages
                  </div>
                )}
                {otherConversations.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isActive={activeConversationId === conv.id}
                    currentUserId={user?.uid || ''}
                    userCache={userCache}
                    onSelect={(id) => setActiveConversationId(id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer PWA Install */}
      <div className="border-t border-[#222d34] bg-[#202c33]/50 p-2.5 flex items-center justify-between text-xs text-[#8696a0]">
        <span className="flex items-center gap-1.5 font-semibold text-[#e9edef]">
          <Realistic3DIcon name="whatsapp" size="xs" showDots={false} />
          <span>Chattr</span>
        </span>
        <PWAInstallButton compact />
      </div>
    </aside>
  );
};
