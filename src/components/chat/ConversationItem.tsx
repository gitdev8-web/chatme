/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Pin,
  VolumeX,
  Check,
  CheckCheck,
  ChevronDown,
  Archive,
  Trash2,
  Users,
  Camera,
  Mic,
  FileText,
} from 'lucide-react';
import { Conversation, UserProfile, UserStatusStory } from '../../types';
import { Avatar } from '../common/Avatar';
import {
  toggleArchiveConversation,
  toggleMuteConversation,
  togglePinConversation,
} from '../../services/chatService';
import { isUserOnline } from '../../utils/presenceUtils';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  currentUserId: string;
  userCache: Record<string, UserProfile>;
  userStatusStories?: UserStatusStory[];
  onSelect: (id: string) => void;
  onViewStatus?: (stories: UserStatusStory[]) => void;
  onDelete?: (id: string) => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  currentUserId,
  userCache,
  userStatusStories = [],
  onSelect,
  onViewStatus,
  onDelete,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  // Identify partner for direct conversation
  const isDirect = conversation.type === 'direct';
  const partnerId = isDirect
    ? conversation.participantIds?.find((id) => id !== currentUserId) || currentUserId
    : null;
  const partnerProfile = partnerId ? userCache[partnerId] : null;

  // Check if partner has active status stories
  const partnerStories = isDirect && partnerId
    ? userStatusStories.filter((s) => s.userId === partnerId)
    : [];
  const hasActiveStatus = partnerStories.length > 0;
  const hasUnreadStatus = partnerStories.some((s) => !s.viewedBy?.includes(currentUserId));

  const title = isDirect
    ? partnerProfile?.displayName || 'DEV CHAT User'
    : conversation.name || 'Group';

  const avatarSrc = isDirect
    ? partnerProfile?.photoURL
    : conversation.photoURL;

  const isOnline = isDirect ? isUserOnline(partnerProfile) : false;

  const isPinned = conversation.pinnedBy?.includes(currentUserId) || false;
  const isMuted = conversation.mutedBy?.includes(currentUserId) || false;
  const isArchived = conversation.archivedBy?.includes(currentUserId) || false;
  const unreadCount = conversation.unreadCounts?.[currentUserId] || 0;

  // Format timestamp nicely
  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
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
      return date.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: '2-digit' });
    } catch {
      return '';
    }
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

  // Preview icon for message type
  const renderMessagePreview = () => {
    const lastMsg = conversation.lastMessage;
    if (!lastMsg) return <span>No messages yet</span>;

    const isSelf = lastMsg.senderId === currentUserId;

    return (
      <div className="flex items-center gap-1 min-w-0 text-xs text-[#8696a0]">
        {isSelf && (
          <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb] flex-shrink-0" />
        )}
        {lastMsg.type === 'image' && (
          <Camera className="h-3.5 w-3.5 text-[#8696a0] flex-shrink-0" />
        )}
        {lastMsg.type === 'voice' && (
          <Mic className="h-3.5 w-3.5 text-[#00a884] flex-shrink-0" />
        )}
        {lastMsg.type === 'file' && (
          <FileText className="h-3.5 w-3.5 text-[#8696a0] flex-shrink-0" />
        )}
        <span className="truncate">
          {lastMsg.text || (lastMsg.type === 'image' ? 'Photo' : lastMsg.type === 'voice' ? 'Voice message' : 'File')}
        </span>
      </div>
    );
  };

  return (
    <div
      onClick={() => onSelect(conversation.id)}
      className={`group relative flex items-center gap-3.5 px-4 py-3 cursor-pointer transition-colors duration-150 select-none border-b border-[#222d34]/40 ${
        isActive
          ? 'bg-[#2a3942]'
          : 'hover:bg-[#202c33]'
      }`}
    >
      {/* Avatar with optional status ring */}
      <div
        className="relative flex-shrink-0"
        onClick={(e) => {
          if (hasActiveStatus && onViewStatus) {
            e.stopPropagation();
            onViewStatus(partnerStories);
          }
        }}
      >
        <div
          className={`p-0.5 rounded-full transition-transform ${
            hasActiveStatus
              ? hasUnreadStatus
                ? 'bg-gradient-to-tr from-[#25d366] to-[#00a884] ring-2 ring-[#25d366]/60 cursor-pointer hover:scale-105'
                : 'ring-1 ring-[#8696a0]/50 cursor-pointer hover:scale-105'
              : ''
          }`}
          title={hasActiveStatus ? `${title}'s status story` : undefined}
        >
          {!isDirect && !avatarSrc ? (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6a7f8a]/30 text-[#e9edef]">
              <Users className="h-6 w-6" />
            </div>
          ) : (
            <Avatar
              src={avatarSrc}
              name={title}
              size="md"
              isOnline={isOnline}
              showPresence={isDirect && !hasActiveStatus}
            />
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span
            className="text-sm font-normal text-[#e9edef] truncate"
          >
            {title}
          </span>
          <span
            className={`text-[11px] flex-shrink-0 font-normal ${
              unreadCount > 0 ? 'text-[#25d366]' : 'text-[#8696a0]'
            }`}
          >
            {formatTime(conversation.lastMessage?.timestamp || conversation.updatedAt)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          {renderMessagePreview()}

          {/* Badges / Status Icons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isMuted && <VolumeX className="h-3.5 w-3.5 text-[#8696a0]" />}
            {isPinned && <Pin className="h-3.5 w-3.5 text-[#8696a0] rotate-45" />}
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#25d366] px-1.5 text-[11px] font-bold text-[#111b21]">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}

            {/* Hover Chevron */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-[#8696a0] hover:text-[#e9edef] transition-opacity"
              title="Menu"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {showMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-4 top-10 z-40 w-44 rounded-xl border border-[#222d34] bg-[#233138] p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in"
        >
          <button
            onClick={handleToggleArchive}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[#e9edef] hover:bg-[#182229] transition"
          >
            <Archive className="h-3.5 w-3.5 text-[#8696a0]" />
            <span>{isArchived ? 'Unarchive chat' : 'Archive chat'}</span>
          </button>

          <button
            onClick={handleToggleMute}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[#e9edef] hover:bg-[#182229] transition"
          >
            <VolumeX className="h-3.5 w-3.5 text-[#8696a0]" />
            <span>{isMuted ? 'Unmute notifications' : 'Mute notifications'}</span>
          </button>

          <button
            onClick={handleTogglePin}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[#e9edef] hover:bg-[#182229] transition"
          >
            <Pin className="h-3.5 w-3.5 text-[#8696a0]" />
            <span>{isPinned ? 'Unpin chat' : 'Pin chat'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
