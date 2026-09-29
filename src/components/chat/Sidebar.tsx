/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Search,
  Plus,
  Users,
  Settings,
  Shield,
  MessageSquare,
  MessageCircle,
  Archive,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { ConversationItem } from './ConversationItem';
import { Avatar } from '../common/Avatar';
import { ConversationSkeleton } from '../common/LoadingSkeleton';
import { EmptyState } from '../common/EmptyState';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface SidebarProps {
  onOpenContacts: () => void;
  onOpenCreateGroup: () => void;
  onOpenSettings: () => void;
  onOpenAdmin: () => void;
  onOpenProfile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
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
    <aside className="flex h-full w-full flex-col border-r border-slate-800/80 bg-slate-900/90 backdrop-blur-xl select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3.5">
        <div
          onClick={onOpenProfile}
          className="flex items-center gap-3 cursor-pointer group"
          title="View & Edit Profile"
        >
          <Avatar
            src={profile?.photoURL}
            name={profile?.displayName || 'User'}
            size="md"
            isOnline={true}
            showPresence={true}
          />
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
              {profile?.displayName || 'My Profile'}
            </h2>
            <p className="text-[11px] text-slate-400 truncate">
              @{profile?.username || 'user'}
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          {isAdmin && (
            <button
              onClick={onOpenAdmin}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-emerald-400 transition-colors"
              title="Admin Panel"
            >
              <Shield className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={onOpenCreateGroup}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title="Create New Group"
          >
            <Users className="h-4 w-4" />
          </button>

          <button
            onClick={onOpenContacts}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-emerald-400 transition-colors"
            title="New Chat / Find Contacts"
          >
            <Plus className="h-4 w-4" />
          </button>

          <button
            onClick={onOpenSettings}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search conversations, names or @username..."
            className="w-full rounded-xl border border-slate-800 bg-slate-800/60 pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
          />
        </div>
      </div>

      {/* Filter Tabs */}
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
            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
              activeFilter === tab.id
                ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-4">
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
                ? 'Try searching with another name or message snippet.'
                : 'Start a conversation with friends, colleagues, or create a group.'
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
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Pinned
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
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    All Chats
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

      {/* Footer PWA / Mobile quick bar */}
      <div className="border-t border-slate-800/80 p-2.5 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5 font-semibold text-slate-300">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Chattr
        </span>
        <PWAInstallButton compact />
      </div>
    </aside>
  );
};
