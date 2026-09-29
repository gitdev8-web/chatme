/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Pin, VolumeX, Check, CheckCheck, MoreVertical, Archive, Trash2 } from 'lucide-react';
import { Conversation, UserProfile } from '../../types';
import { Avatar } from '../common/Avatar';
import {
  toggleArchiveConversation,
  toggleMuteConversation,
  togglePinConversation,
} from '../../services/chatService';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  currentUserId: string;
  userCache: Record<string, UserProfile>;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  currentUserId,
  userCache,
  onSelect,
  onDelete,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  // Identify partner for direct conversation
  const isDirect = conversation.type === 'direct';
  const partnerId = isDirect
    ? conversation.participantIds.find((id) => id !== currentUserId) || currentUserId
    : null;
  const partnerProfile = partnerId ? userCache[partnerId] : null;

  const title = isDirect
    ? partnerProfile?.displayName || 'Direct Message'
    : conversation.name || 'Group Chat';

  const avatarSrc = isDirect
    ? partnerProfile?.photoURL
    : conversation.photoURL;

  const isOnline = isDirect
    ? (partnerProfile?.showOnlineStatus !== false && partnerProfile?.isOnline)
    : false;

  const isPinned = conversation.pinnedBy?.includes(currentUserId) || false;
  const isMuted = conversation.mutedBy?.includes(currentUserId) || false;
  const isArchived = conversation.archivedBy?.includes(currentUserId) || false;
  const unreadCount = conversation.unreadCounts?.[currentUserId] || 0;

  // Format timestamp nicely
  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    togglePinConversation(conversation.id, currentUserId, !isPinned);
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    toggleMuteConversation(conversation.id, currentUserId, !isMuted);
  };

  const handleToggleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    toggleArchiveConversation(conversation.id, currentUserId, !isArchived);
  };

  return (
    <div
      onClick={() => onSelect(conversation.id)}
      className={`group relative flex items-center gap-3.5 px-3.5 py-3 rounded-2xl cursor-pointer transition-all duration-150 select-none ${
        isActive
          ? 'bg-slate-800/90 text-white shadow-md shadow-slate-950/20 ring-1 ring-emerald-500/20'
          : 'hover:bg-slate-800/40 text-slate-300'
      }`}
    >
      {/* Avatar */}
      <Avatar
        src={avatarSrc}
        name={title}
        size="md"
        isOnline={isOnline}
        showPresence={isDirect}
      />

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span
            className={`text-xs font-semibold truncate ${
              isActive ? 'text-white' : 'text-slate-200'
            }`}
          >
            {title}
          </span>
          <span className="text-[10px] text-slate-400 flex-shrink-0 font-medium">
            {formatTime(conversation.lastMessage?.timestamp || conversation.updatedAt)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          {/* Last message preview */}
          <div className="flex items-center gap-1 min-w-0 text-xs text-slate-400">
            {conversation.lastMessage?.senderId === currentUserId && (
              <CheckCheck className="h-3 w-3 text-emerald-400 flex-shrink-0" />
            )}
            <span className="truncate">
              {conversation.lastMessage?.text || 'No messages yet'}
            </span>
          </div>

          {/* Badges / Status Icons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isMuted && <VolumeX className="h-3.5 w-3.5 text-slate-500" />}
            {isPinned && <Pin className="h-3.5 w-3.5 text-emerald-400 rotate-45" />}
            {unreadCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-slate-950 shadow-sm">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick context dropdown */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-100 transition-opacity rounded-md hover:bg-slate-700/50"
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </button>

      {/* Context Menu */}
      {showMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-3 top-10 z-30 w-36 rounded-xl border border-slate-700/80 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in"
        >
          <button
            onClick={handleTogglePin}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800 transition"
          >
            <Pin className="h-3.5 w-3.5 text-emerald-400" />
            <span>{isPinned ? 'Unpin' : 'Pin'}</span>
          </button>
          <button
            onClick={handleToggleMute}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800 transition"
          >
            <VolumeX className="h-3.5 w-3.5 text-amber-400" />
            <span>{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
          <button
            onClick={handleToggleArchive}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800 transition"
          >
            <Archive className="h-3.5 w-3.5 text-cyan-400" />
            <span>{isArchived ? 'Unarchive' : 'Archive'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
