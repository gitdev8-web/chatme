/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
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
  BarChart3,
  MapPin,
  UserCheck,
  Video,
} from 'lucide-react';
import { Conversation, UserProfile, UserStatusStory } from '../../types';
import { Avatar } from '../common/Avatar';
import {
  toggleArchiveConversation,
  toggleMuteConversation,
  togglePinConversation,
} from '../../services/chatService';
import { isUserOnline } from '../../utils/presenceUtils';
import { useChat } from '../../context/ChatContext';
import { ConfirmModal } from '../common/ConfirmModal';
import { useToast } from '../common/Toast';
import { StatusRing } from '../status/StatusRing';
import { isStoryViewedBy } from '../../services/statusService';
import { getConversationDraft, subscribeDraftChanges } from '../../utils/draftUtils';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  currentUserId: string;
  userCache: Record<string, UserProfile>;
  userStatusStories?: UserStatusStory[];
  onSelect: (id: string) => void;
  onViewStatus?: (stories: UserStatusStory[]) => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  currentUserId,
  userCache,
  userStatusStories = [],
  onSelect,
  onViewStatus,
}) => {
  const { deleteConversation } = useChat();
  const { showToast } = useToast();
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [draftText, setDraftText] = useState(() =>
    getConversationDraft(currentUserId, conversation.id)
  );
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraftText(getConversationDraft(currentUserId, conversation.id));
    return subscribeDraftChanges(() => {
      setDraftText(getConversationDraft(currentUserId, conversation.id));
    });
  }, [currentUserId, conversation.id]);

  useEffect(() => {
    if (!showMenu) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showMenu]);

  const isDirect = conversation.type === 'direct';
  const partnerId = isDirect
    ? conversation.participantIds?.find((id) => id !== currentUserId) || currentUserId
    : null;
  const partnerProfile = partnerId ? userCache[partnerId] : null;

  const partnerStories = isDirect && partnerId
    ? userStatusStories.filter((s) => s.userId === partnerId)
    : [];
  const hasActiveStatus = partnerStories.length > 0;
  const unviewedStatusCount = partnerStories.filter(
    (s) => !isStoryViewedBy(s, currentUserId)
  ).length;

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

  const renderMessagePreview = () => {
    if (!isActive && draftText.trim()) {
      return (
        <div className="flex items-center gap-1 min-w-0 text-xs">
          <span className="font-semibold text-[#25d366] flex-shrink-0">Draft:</span>
          <span className="truncate text-[#8696a0]">{draftText.trim()}</span>
        </div>
      );
    }

    const lastMsg = conversation.lastMessage;
    if (!lastMsg) return <span className="text-xs text-[#8696a0]">No messages yet</span>;

    const isSelf = lastMsg.senderId === currentUserId;
    const recipientIds = (conversation.participantIds || []).filter((id) => id !== currentUserId);
    const readOthers = (lastMsg.readBy || []).filter((id) => id !== currentUserId);
    const deliveredOthers = (lastMsg.deliveredTo || []).filter((id) => id !== currentUserId);
    const isLastMsgRead = lastMsg.readBy
      ? isDirect
        ? readOthers.length > 0
        : recipientIds.length > 0 && recipientIds.every((id) => readOthers.includes(id))
      : recipientIds.length > 0 &&
        recipientIds.every((id) => (conversation.unreadCounts?.[id] ?? 0) === 0);
    const isLastMsgDelivered =
      isLastMsgRead ||
      deliveredOthers.length > 0 ||
      !lastMsg.readBy;

    return (
      <div className="flex items-center gap-1.5 min-w-0 text-xs text-[#8696a0]">
        {isSelf && (
          isLastMsgRead ? (
            <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb] flex-shrink-0" aria-label="Read" />
          ) : isLastMsgDelivered ? (
            <CheckCheck className="h-3.5 w-3.5 text-[#8696a0] flex-shrink-0" aria-label="Delivered" />
          ) : (
            <Check className="h-3.5 w-3.5 text-[#8696a0] flex-shrink-0" aria-label="Sent" />
          )
        )}
        {lastMsg.type === 'image' && (
          <Camera className="h-3.5 w-3.5 text-[#8696a0] flex-shrink-0" />
        )}
        {lastMsg.type === 'video' && (
          <Video className="h-3.5 w-3.5 text-[#bf59cf] flex-shrink-0" />
        )}
        {lastMsg.type === 'voice' && (
          <Mic className="h-3.5 w-3.5 text-[#00a884] flex-shrink-0" />
        )}
        {lastMsg.type === 'file' && (
          <FileText className="h-3.5 w-3.5 text-[#8696a0] flex-shrink-0" />
        )}
        {lastMsg.type === 'poll' && (
          <BarChart3 className="h-3.5 w-3.5 text-[#ffd279] flex-shrink-0" />
        )}
        {lastMsg.type === 'location' && (
          <MapPin className="h-3.5 w-3.5 text-[#25d366] flex-shrink-0" />
        )}
        {lastMsg.type === 'contact' && (
          <UserCheck className="h-3.5 w-3.5 text-[#53bdeb] flex-shrink-0" />
        )}
        {lastMsg.type === 'meet' && (
          <Video className="h-3.5 w-3.5 text-[#25d366] flex-shrink-0" />
        )}
        <span className="truncate">
          {lastMsg.text ||
            (lastMsg.type === 'image'
              ? 'Photo'
              : lastMsg.type === 'video'
              ? 'Video'
              : lastMsg.type === 'voice'
              ? 'Voice message'
              : lastMsg.type === 'poll'
              ? 'Poll'
              : lastMsg.type === 'location'
              ? 'Location'
              : lastMsg.type === 'contact'
              ? 'Contact'
              : lastMsg.type === 'meet'
              ? 'Google Meet video call'
              : 'File')}
        </span>
      </div>
    );
  };

  return (
    <>
      <div
        ref={menuContainerRef}
        onClick={() => onSelect(conversation.id)}
        className={`group relative flex items-center gap-3.5 px-4 py-3 cursor-pointer transition-colors duration-150 select-none border-b border-[#222d34]/40 ${
          isActive
            ? 'bg-[#2a3942]'
            : 'hover:bg-[#202c33]'
        }`}
      >
        {/* Avatar with optional segmented status ring */}
        {hasActiveStatus ? (
          <StatusRing
            totalSegments={partnerStories.length}
            unviewedCount={unviewedStatusCount}
            sizePx={42}
            strokeWidth={2}
            onClick={(e) => {
              if (onViewStatus) {
                e.stopPropagation();
                onViewStatus(partnerStories);
              }
            }}
            title={`${title}'s status update`}
          >
            <Avatar
              src={avatarSrc}
              name={title}
              size="md"
              isOnline={isOnline}
              showPresence={false}
            />
          </StatusRing>
        ) : (
          <div className="relative flex-shrink-0">
            {!isDirect && !avatarSrc ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6a7f8a]/30 text-[#e9edef]">
                <Users className="h-5 w-5" />
              </div>
            ) : (
              <Avatar
                src={avatarSrc}
                name={title}
                size="md"
                isOnline={isOnline}
                showPresence={isDirect}
              />
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="text-sm font-medium text-[#e9edef] truncate">
              {title}
            </span>
            <span
              className={`tabular-nums text-[11px] flex-shrink-0 ${
                unreadCount > 0 ? 'font-semibold text-[#25d366]' : 'text-[#8696a0]'
              }`}
            >
              {formatTime(conversation.lastMessage?.timestamp || conversation.updatedAt)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            {renderMessagePreview()}

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {isMuted && <VolumeX className="h-3.5 w-3.5 text-[#8696a0]" />}
              {isPinned && <Pin className="h-3.5 w-3.5 text-[#00a884] rotate-45" />}
              {unreadCount > 0 && (
                <span className="tabular-nums flex h-5 min-w-5 items-center justify-center rounded-full bg-[#25d366] px-1.5 text-[11px] font-bold text-[#0b141a]">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                aria-label="Conversation options"
                className="opacity-70 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 p-1 text-[#8696a0] hover:text-[#e9edef] rounded-lg hover:bg-[#111b21]/50 transition"
                title="Options"
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
            className="absolute right-4 top-11 z-40 w-48 rounded-xl border border-[#222d34] bg-[#233138] p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in"
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

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                setShowDeleteConfirm(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-400 hover:bg-[#182229] transition border-t border-[#222d34]/60 mt-1 pt-2"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-400" />
              <span>Delete chat</span>
            </button>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        loading={deleting}
        onConfirm={async () => {
          setDeleting(true);
          try {
            await deleteConversation(conversation.id);
            showToast(`Deleted chat with ${title}`, 'info');
          } finally {
            setDeleting(false);
            setShowDeleteConfirm(false);
          }
        }}
        title={`Delete chat with ${title}?`}
        description="This will remove the conversation from your chat list. New incoming messages will restore it."
        confirmText="Delete chat"
        variant="danger"
      />
    </>
  );
};
