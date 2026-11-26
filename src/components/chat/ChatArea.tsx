/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronUp,
  Lock,
  Phone,
  Video,
  MoreVertical,
  X,
  Clock,
  Flag,
  Pin,
  Palette,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { Message } from '../../types';
import { Avatar } from '../common/Avatar';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { MediaViewerModal } from './MediaViewerModal';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';
import { MessagesSkeleton } from '../common/LoadingSkeleton';
import { ForwardModal } from './ForwardModal';
import { MessageInfoModal } from './MessageInfoModal';
import { WallpaperModal } from './WallpaperModal';
import { CallModal } from '../calls/CallModal';
import { StatusViewerModal } from '../status/StatusViewerModal';
import { StatusRing } from '../status/StatusRing';
import { isStoryViewedBy } from '../../services/statusService';
import { initiateCall } from '../../services/callService';
import { submitReport, toggleMuteConversation } from '../../services/chatService';
import { useToast } from '../common/Toast';
import { isUserOnline, formatLastSeen } from '../../utils/presenceUtils';
import {
  ChatWallpaperId,
  getSavedWallpaper,
  getWallpaperClass,
  subscribeToWallpaperChange,
} from '../../utils/wallpaperUtils';

interface ChatAreaProps {
  onBackMobile: () => void;
  onToggleDetails: () => void;
  voiceCallsEnabled?: boolean;
  videoCallsEnabled?: boolean;
  maxFileSizeMb?: number;
  maintenanceMode?: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  onBackMobile,
  onToggleDetails,
  voiceCallsEnabled = true,
  videoCallsEnabled = true,
  maxFileSizeMb = 25,
  maintenanceMode = false,
}) => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const {
    activeConversationId,
    activeConversation,
    messages,
    typingUsers,
    userCache,
    statusStories,
    loadingMessages,
    sendTextMessage,
    sendFileMessage,
    editCurrentMessage,
    deleteMessage,
    clearConversation,
    starMessage,
    reactToMessage,
    votePoll,
    pinMessage,
    unpinMessage,
    openViewOnceMedia,
    startDirectChat,
    setReplyingTo,
    setActiveConversationId,
    markActiveConversationRead,
  } = useChat();

  const [searchInChat, setSearchInChat] = useState(false);
  const [chatSearchTerm, setChatSearchTerm] = useState('');
  const [matchCursor, setMatchCursor] = useState(0);

  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [infoMessage, setInfoMessage] = useState<Message | null>(null);
  const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState(false);
  const [wallpaperId, setWallpaperId] = useState<ChatWallpaperId>(() => getSavedWallpaper());
  const [reportingMessage, setReportingMessage] = useState<Message | null>(null);
  const [reportReason, setReportReason] = useState('Spam or abuse');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const [viewingMediaUrl, setViewingMediaUrl] = useState<string | null>(null);
  const [viewingMediaName, setViewingMediaName] = useState<string | undefined>(undefined);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);

  // Calling state
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [activeCallSessionId, setActiveCallSessionId] = useState<string | undefined>(undefined);

  // Header 3-dots menu
  const [showChatMenu, setShowChatMenu] = useState(false);
  const chatMenuRef = useRef<HTMLDivElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const isDirect = activeConversation?.type === 'direct';
  const partnerId = isDirect
    ? (activeConversation?.participantIds?.find((id) => id !== user?.uid) ||
       (activeConversation?.id?.startsWith('dm_')
         ? activeConversation.id.replace('dm_', '').split('_').find((id) => id !== user?.uid)
         : null))
    : null;
  const partnerProfile = partnerId ? userCache[partnerId] : null;

  const title = isDirect
    ? partnerProfile?.displayName || 'DEV CHAT User'
    : activeConversation?.name || 'Group Chat';

  const avatarSrc = isDirect
    ? partnerProfile?.photoURL
    : activeConversation?.photoURL;

  const isPartnerOnline = isDirect ? isUserOnline(partnerProfile) : false;
  const isMuted = activeConversation?.mutedBy?.includes(user?.uid || '') || false;

  const partnerStories = partnerId
    ? statusStories.filter((s) => s.userId === partnerId)
    : [];
  const hasPartnerStatus = partnerStories.length > 0;
  const unviewedPartnerStatusCount = partnerStories.filter(
    (s) => !isStoryViewedBy(s, user?.uid)
  ).length;
  const [isHeaderStatusViewerOpen, setIsHeaderStatusViewerOpen] = useState(false);

  const recipientIds = useMemo(() => {
    const participants = activeConversation?.participantIds || [];
    if (participants.length > 0) {
      return participants.filter((id) => id !== user?.uid);
    }
    return partnerId ? [partnerId] : [];
  }, [activeConversation?.participantIds, partnerId, user?.uid]);

  const scrollToAndHighlightMessage = (messageId: string) => {
    const el = document.getElementById(`msg_${messageId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('animate-target-flash', 'rounded-xl');
    setTimeout(() => {
      el.classList.remove('animate-target-flash', 'rounded-xl');
    }, 1300);
  };

  // Search matching message IDs (newest-to-oldest order feels natural, or oldest-to-newest)
  const matchingMessageIds = useMemo(() => {
    const q = chatSearchTerm.trim().toLowerCase();
    if (!q) return [];
    return (messages || [])
      .filter((m) => !m.isDeleted && (m.text || '').toLowerCase().includes(q))
      .map((m) => m.id);
  }, [messages, chatSearchTerm]);

  useEffect(() => {
    if (matchingMessageIds.length > 0) {
      const lastIndex = matchingMessageIds.length - 1;
      setMatchCursor(lastIndex);
      const targetId = matchingMessageIds[lastIndex];
      document.getElementById(`msg_${targetId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    } else {
      setMatchCursor(0);
    }
  }, [chatSearchTerm, matchingMessageIds.length]);

  const jumpToMatch = (direction: 'prev' | 'next') => {
    if (matchingMessageIds.length === 0) return;
    const nextIdx =
      direction === 'prev'
        ? (matchCursor - 1 + matchingMessageIds.length) % matchingMessageIds.length
        : (matchCursor + 1) % matchingMessageIds.length;
    setMatchCursor(nextIdx);
    const el = document.getElementById(`msg_${matchingMessageIds[nextIdx]}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Auto-scroll to bottom on conversation/messages change
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    setSearchInChat(false);
    setChatSearchTerm('');
    scrollToBottom(false);
    markActiveConversationRead();
  }, [activeConversation?.id, markActiveConversationRead]);

  useEffect(() => {
    if (!showScrollBottom && !chatSearchTerm.trim()) {
      scrollToBottom(true);
    }
    if ((messages || []).some((m) => m.senderId !== user?.uid && !m.readBy?.includes(user?.uid || ''))) {
      markActiveConversationRead();
    }
  }, [(messages || []).length, markActiveConversationRead]);

  useEffect(() => {
    const unsub = subscribeToWallpaperChange((nextId) => setWallpaperId(nextId));
    return () => unsub();
  }, []);

  // Close header menu on click outside & handle Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target as Node)) {
        setShowChatMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (searchInChat) {
          setSearchInChat(false);
          setChatSearchTerm('');
        } else if (showChatMenu) {
          setShowChatMenu(false);
        }
      }
    };
    if (showChatMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showChatMenu, searchInChat]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distFromBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollBottom(distFromBottom > 150);
  };

  const formatDateHeader = (isoString: string) => {
    const d = new Date(isoString);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return 'TODAY';

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'YESTERDAY';

    return d.toLocaleDateString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const handleStartCall = async (type: 'audio' | 'video') => {
    if (!user) return;
    if (type === 'audio' && !voiceCallsEnabled) {
      showToast('Voice calling is currently disabled by administrator', 'warning');
      return;
    }
    if (type === 'video' && !videoCallsEnabled) {
      showToast('Video calling is currently disabled by administrator', 'warning');
      return;
    }

    setCallType(type);

    let targetUid = partnerId;
    if ((!targetUid || targetUid === user.uid) && activeConversation?.id?.startsWith('dm_')) {
      targetUid = activeConversation.id.replace('dm_', '').split('_').find((id) => id !== user.uid) || null;
    }
    if (!targetUid || targetUid === user.uid) {
      targetUid = activeConversation?.participantIds?.find((id) => id !== user.uid) || null;
    }

    if (!targetUid || targetUid === user.uid) {
      showToast('Cannot call: no recipient contact found', 'error');
      return;
    }

    try {
      const cid = await initiateCall(
        user.uid,
        profile?.displayName || user.displayName || 'DEV CHAT User',
        profile?.photoURL || user.photoURL || '',
        targetUid,
        partnerProfile?.displayName || 'Contact',
        type
      );
      setActiveCallSessionId(cid);
      setIsCallOpen(true);
    } catch (err) {
      console.warn('Call initiation warning:', err);
      showToast('Could not start call. Please try again.', 'error');
    }
  };

  const handleToggleMute = async () => {
    if (!user || !activeConversation) return;
    setShowChatMenu(false);
    const nextMuted = !isMuted;
    await toggleMuteConversation(activeConversation.id, user.uid, nextMuted);
    showToast(nextMuted ? 'Notifications muted' : 'Notifications unmuted', 'info');
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !reportingMessage) return;
    setSubmittingReport(true);
    try {
      await submitReport(
        user.uid,
        reportingMessage.senderId,
        reportReason,
        reportDetails.trim() || `Message content: "${reportingMessage.text?.slice(0, 120) || 'Attachment'}"`,
        reportingMessage.id
      );
      showToast('Message reported for moderation review', 'success');
      setReportingMessage(null);
      setReportDetails('');
    } finally {
      setSubmittingReport(false);
    }
  };

  const typingText = () => {
    if (!typingUsers || typingUsers.length === 0) return null;
    if (typingUsers.length === 1) {
      const first = typingUsers[0];
      if (first?.activity === 'recording') {
        return isDirect ? 'recording audio...' : `${first?.displayName || 'Someone'} is recording audio...`;
      }
      return isDirect ? 'typing...' : `${first?.displayName || 'Someone'} is typing...`;
    }
    if (typingUsers.length === 2) {
      return `${typingUsers[0]?.displayName || 'User'} and ${typingUsers[1]?.displayName || 'User'} are typing...`;
    }
    return 'Several people are typing...';
  };

  // Loading state when a conversation ID is selected but data is being synced
  if (activeConversationId && !activeConversation) {
    return (
      <div className="flex h-full flex-1 flex-col bg-[#0b141a] relative overflow-hidden select-none">
        <div className="flex h-16 items-center border-b border-[#222d34] bg-[#202c33] px-3 sm:px-4 py-2 z-10 shadow-sm flex-shrink-0">
          <button
            onClick={onBackMobile}
            className="md:hidden rounded-full p-2 -ml-1 text-[#8696a0] hover:bg-[#111b21] hover:text-white transition active:scale-95 flex-shrink-0 mr-2"
            title="Back to chats"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#2a3942] animate-pulse flex-shrink-0" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-28 rounded bg-[#2a3942] animate-pulse" />
              <div className="h-2.5 w-16 rounded bg-[#2a3942]/70 animate-pulse" />
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 devchat-pattern-bg">
          <MessagesSkeleton />
        </div>
      </div>
    );
  }

  // Welcome Splash Screen (desktop only when no conversation is selected)
  if (!activeConversation) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center bg-[#182229] p-8 select-none text-center relative border-b-4 border-[#00a884] overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(circle at 50% 42%, rgba(0, 168, 132, 0.12) 0%, transparent 58%)',
          }}
        />
        <div className="relative z-10 flex flex-col items-center max-w-md my-auto">
          <div className="relative mb-7 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="DEV CHAT"
              className="h-28 w-28 rounded-3xl shadow-2xl shadow-[#00a884]/25 border border-[#00a884]/35 object-cover"
            />
          </div>

          <h2 className="text-2xl font-bold text-[#e9edef] tracking-tight text-balance">
            DEV CHAT Web
          </h2>
          <p className="mt-3 text-sm text-[#8696a0] leading-relaxed text-balance">
            Send and receive messages, make real-time audio and video calls, and share status updates across all your devices.
          </p>
        </div>

        <div className="relative z-10 mt-auto pb-4 flex items-center gap-1.5 text-xs text-[#8696a0]">
          <Lock className="h-3.5 w-3.5 text-[#00a884]" />
          <span>Your personal messages and calls are end-to-end encrypted</span>
        </div>
      </div>
    );
  }

  const unreadInActive = activeConversation.unreadCounts?.[user?.uid || ''] || 0;
  const activeMatchId = matchingMessageIds[matchCursor];

  const getMessageReceiptInfo = (
    msg: Message
  ): { status: 'sent' | 'delivered' | 'read'; label: string } => {
    const targetRecipients =
      recipientIds.length > 0
        ? recipientIds
        : (msg.readBy || []).filter((uid) => uid !== msg.senderId);

    const readRecipients = (msg.readBy || []).filter(
      (uid) => uid !== msg.senderId && (recipientIds.length === 0 || recipientIds.includes(uid))
    );
    const deliveredRecipients = (msg.deliveredTo || []).filter(
      (uid) => uid !== msg.senderId && (recipientIds.length === 0 || recipientIds.includes(uid))
    );

    const isRead = isDirect
      ? readRecipients.length > 0
      : targetRecipients.length > 0
      ? targetRecipients.every((uid) => readRecipients.includes(uid))
      : readRecipients.length > 0;

    if (isRead) {
      const readerNames = readRecipients
        .map((uid) => userCache[uid]?.displayName)
        .filter(Boolean);
      const label =
        isDirect && readerNames.length > 0
          ? `Read by ${readerNames[0]}`
          : !isDirect && readRecipients.length > 0
          ? `Read by all (${readRecipients.length})`
          : 'Read';
      return { status: 'read', label };
    }

    const isDelivered = deliveredRecipients.length > 0 || readRecipients.length > 0;
    if (isDelivered) {
      const label =
        !isDirect && readRecipients.length > 0
          ? `Read by ${readRecipients.length} of ${targetRecipients.length}`
          : 'Delivered';
      return { status: 'delivered', label };
    }

    return { status: 'sent', label: 'Sent' };
  };

  return (
    <div className="flex h-full flex-1 flex-col bg-[#0b141a] relative overflow-hidden select-none">
      {/* Top Header */}
      <div className="flex h-14 md:h-16 items-center justify-between border-b border-[#222d34] bg-[#202c33] px-2.5 sm:px-4 py-2 z-10 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            onClick={onBackMobile}
            className="md:hidden flex h-11 w-11 items-center justify-center rounded-full -ml-1 text-[#8696a0] hover:bg-[#111b21] hover:text-white transition active:scale-95 flex-shrink-0"
            title="Back to chats"
            aria-label="Back to chats"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {hasPartnerStatus ? (
            <StatusRing
              totalSegments={partnerStories.length}
              unviewedCount={unviewedPartnerStatusCount}
              sizePx={40}
              strokeWidth={2}
              onClick={() => setIsHeaderStatusViewerOpen(true)}
              title={`View ${title}'s status update`}
            >
              <Avatar
                src={avatarSrc}
                name={title}
                size="md"
                isOnline={isPartnerOnline}
                showPresence={false}
                className="cursor-pointer"
              />
            </StatusRing>
          ) : (
            <div onClick={onToggleDetails} className="cursor-pointer">
              <Avatar
                src={avatarSrc}
                name={title}
                size="md"
                isOnline={isPartnerOnline}
                showPresence={isDirect}
                className="cursor-pointer"
              />
            </div>
          )}

          <div className="min-w-0 cursor-pointer" onClick={onToggleDetails}>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-[#e9edef] truncate hover:underline">
                {title}
              </h3>
              {(activeConversation.disappearingDuration || 0) > 0 && (
                <span
                  title="Disappearing messages active"
                  className="inline-flex items-center rounded bg-[#00a884]/15 px-1.5 py-0.5 text-[9px] font-semibold text-[#25d366]"
                >
                  <Clock className="h-2.5 w-2.5 mr-0.5" />
                  Auto-clear
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#8696a0] truncate">
              {(typingUsers || []).length > 0 ? (
                <span className="text-[#25d366] font-medium">
                  {typingText()}
                </span>
              ) : isDirect ? (
                isPartnerOnline ? (
                  <span className="text-[#25d366] font-medium">online</span>
                ) : (
                  <span>{formatLastSeen(partnerProfile)}</span>
                )
              ) : (
                <span className="tabular-nums">
                  {activeConversation?.participantIds?.length || 0} members
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1 text-[#aebac1] flex-shrink-0">
          {isDirect && (
            <>
              <button
                onClick={() => handleStartCall('video')}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition active:scale-95 ${
                  videoCallsEnabled
                    ? 'hover:bg-[#374248] hover:text-[#e9edef]'
                    : 'opacity-40 cursor-not-allowed'
                }`}
                title={videoCallsEnabled ? 'Video call' : 'Video calls disabled'}
                aria-label="Video call"
              >
                <Video className="h-5 w-5" />
              </button>

              <button
                onClick={() => handleStartCall('audio')}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition active:scale-95 ${
                  voiceCallsEnabled
                    ? 'hover:bg-[#374248] hover:text-[#e9edef]'
                    : 'opacity-40 cursor-not-allowed'
                }`}
                title={voiceCallsEnabled ? 'Voice call' : 'Voice calls disabled'}
                aria-label="Voice call"
              >
                <Phone className="h-5 w-5" />
              </button>

              <div className="hidden sm:block h-4 w-[1px] bg-[#374248] mx-1" />
            </>
          )}

          <button
            onClick={() => {
              setSearchInChat((prev) => !prev);
              if (searchInChat) setChatSearchTerm('');
            }}
            className={`hidden sm:flex h-10 w-10 items-center justify-center rounded-full transition ${
              searchInChat
                ? 'bg-[#00a884] text-[#0b141a]'
                : 'hover:bg-[#374248] hover:text-[#e9edef]'
            }`}
            title="Search in chat"
            aria-label="Search messages in chat"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* 3-Dots Menu Dropdown */}
          <div className="relative" ref={chatMenuRef}>
            <button
              onClick={() => setShowChatMenu(!showChatMenu)}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[#374248] hover:text-[#e9edef] transition"
              title="Menu"
              aria-label="Conversation menu"
            >
              <MoreVertical className="h-5 w-5" />
            </button>

            {showChatMenu && (
              <div className="absolute right-0 top-12 z-50 w-52 rounded-2xl border border-[#222d34] bg-[#233138] py-1.5 shadow-2xl backdrop-blur-md animate-in fade-in">
                <button
                  onClick={() => {
                    setShowChatMenu(false);
                    onToggleDetails();
                  }}
                  className="flex w-full items-center px-4 py-2.5 text-xs text-[#d1d7db] hover:bg-[#182229] transition"
                >
                  {isDirect ? 'Contact info' : 'Group info'}
                </button>
                <button
                  onClick={() => {
                    setShowChatMenu(false);
                    setSearchInChat(true);
                  }}
                  className="flex w-full items-center px-4 py-2.5 text-xs text-[#d1d7db] hover:bg-[#182229] transition"
                >
                  Search messages
                </button>
                <button
                  onClick={() => {
                    setShowChatMenu(false);
                    setIsWallpaperModalOpen(true);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-xs text-[#d1d7db] hover:bg-[#182229] transition"
                >
                  <Palette className="h-3.5 w-3.5 text-[#00a884]" />
                  <span>Chat wallpaper</span>
                </button>
                <button
                  onClick={handleToggleMute}
                  className="flex w-full items-center px-4 py-2.5 text-xs text-[#d1d7db] hover:bg-[#182229] transition"
                >
                  {isMuted ? 'Unmute notifications' : 'Mute notifications'}
                </button>
                <button
                  onClick={() => {
                    setShowChatMenu(false);
                    setShowClearConfirm(true);
                  }}
                  className="flex w-full items-center px-4 py-2.5 text-xs text-amber-400 hover:bg-[#182229] transition"
                >
                  Clear chat messages
                </button>
                <div className="my-1 border-t border-[#222d34]" />
                <button
                  onClick={() => {
                    setShowChatMenu(false);
                    setActiveConversationId(null);
                  }}
                  className="flex w-full items-center px-4 py-2.5 text-xs text-[#d1d7db] hover:bg-[#182229] transition"
                >
                  Close chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pinned Message Banner (WhatsApp In-Chat Pin) */}
      {activeConversation.pinnedMessage && (
        <div
          onClick={() =>
            scrollToAndHighlightMessage(activeConversation.pinnedMessage!.messageId)
          }
          className="flex items-center justify-between gap-2.5 border-b border-[#222d34] bg-[#182229]/95 px-3 sm:px-4 py-2 cursor-pointer hover:bg-[#202c33] transition z-10 flex-shrink-0"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[#00a884]/15 text-[#25d366]">
              <Pin className="h-3.5 w-3.5 rotate-45" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-[#25d366] truncate">
                Pinned by {activeConversation.pinnedMessage.senderName}
              </p>
              <p className="text-xs text-[#e9edef] truncate">
                {activeConversation.pinnedMessage.text}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              unpinMessage();
              showToast('Message unpinned', 'info');
            }}
            aria-label="Unpin message"
            title="Unpin message"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[#8696a0] hover:bg-[#111b21] hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Inline Search Bar with Match Counter & Prev/Next Navigation */}
      {searchInChat && (
        <div className="flex items-center gap-2 border-b border-[#222d34] bg-[#202c33] px-3 sm:px-4 py-2 text-xs animate-in fade-in">
          <Search className="h-4 w-4 text-[#8696a0] flex-shrink-0" />
          <input
            type="text"
            value={chatSearchTerm}
            onChange={(e) => setChatSearchTerm(e.target.value)}
            placeholder="Search messages in this chat..."
            className="flex-1 bg-transparent text-[15px] sm:text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none min-w-0"
            autoFocus
          />
          {chatSearchTerm.trim() && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="tabular-nums text-[11px] text-[#8696a0] mr-1">
                {matchingMessageIds.length > 0
                  ? `${matchCursor + 1} / ${matchingMessageIds.length}`
                  : '0 / 0'}
              </span>
              <button
                type="button"
                disabled={matchingMessageIds.length === 0}
                onClick={() => jumpToMatch('prev')}
                aria-label="Previous match"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#8696a0] hover:bg-[#2a3942] hover:text-[#e9edef] disabled:opacity-40"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={matchingMessageIds.length === 0}
                onClick={() => jumpToMatch('next')}
                aria-label="Next match"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#8696a0] hover:bg-[#2a3942] hover:text-[#e9edef] disabled:opacity-40"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setSearchInChat(false);
              setChatSearchTerm('');
            }}
            aria-label="Close search"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#8696a0] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto px-2.5 sm:px-4 py-4 relative ${getWallpaperClass(wallpaperId)}`}
      >
        <div className="flex justify-center my-3">
          <div className="max-w-md rounded-xl bg-[#182229] px-4 py-2 text-center text-[11px] text-[#ffd279] shadow-sm flex items-center justify-center gap-1.5 leading-relaxed border border-[#ffd279]/15">
            <Lock className="h-3 w-3 flex-shrink-0 text-[#ffd279]" />
            <span>
              Messages and calls are end-to-end encrypted. No one outside of this chat can read or listen to them.
            </span>
          </div>
        </div>

        {loadingMessages ? (
          <div className="space-y-4 pt-4">
            <MessagesSkeleton />
          </div>
        ) : (messages || []).length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center text-xs text-[#8696a0]">
            <span>Say hi to start the conversation!</span>
          </div>
        ) : (
          (messages || []).map((msg, idx) => {
            const prevMsg = messages[idx - 1];
            const showDateHeader =
              !prevMsg ||
              new Date(msg.createdAt).toDateString() !==
                new Date(prevMsg.createdAt).toDateString();
            const isMatch = matchingMessageIds.includes(msg.id);
            const isCurrentMatch = activeMatchId === msg.id;
            const isOutgoing = msg.senderId === user?.uid;
            const receiptInfo = isOutgoing ? getMessageReceiptInfo(msg) : undefined;

            return (
              <React.Fragment key={msg.id}>
                {showDateHeader && (
                  <div className="my-4 flex justify-center sticky top-2 z-10">
                    <span className="rounded-lg bg-[#182229] border border-[#222d34]/70 px-3 py-1 text-[11px] font-medium text-[#8696a0] shadow-sm uppercase tracking-wider">
                      {formatDateHeader(msg.createdAt)}
                    </span>
                  </div>
                )}
                <MessageBubble
                  message={msg}
                  isSelf={isOutgoing}
                  isGroup={activeConversation.type === 'group'}
                  isPinned={activeConversation.pinnedMessage?.messageId === msg.id}
                  currentUserId={user?.uid || ''}
                  userCache={userCache}
                  isSearchMatch={isMatch}
                  isCurrentSearchMatch={isCurrentMatch}
                  receiptStatus={receiptInfo?.status}
                  receiptLabel={receiptInfo?.label}
                  onReply={(m) => setReplyingTo(m)}
                  onEdit={(m) => {
                    setEditingMessage(m);
                    setEditText(m.text);
                  }}
                  onDelete={deleteMessage}
                  onReact={reactToMessage}
                  onStar={starMessage}
                  onPin={async (m) => {
                    await pinMessage(m);
                    showToast('Message pinned to top of chat', 'success');
                  }}
                  onUnpin={async () => {
                    await unpinMessage();
                    showToast('Message unpinned', 'info');
                  }}
                  onInfo={(m) => setInfoMessage(m)}
                  onVotePoll={votePoll}
                  onOpenViewOnce={(m) => openViewOnceMedia(m.id)}
                  onMessageContact={(uid) => startDirectChat(uid)}
                  onOpenMedia={(url, name) => {
                    setViewingMediaUrl(url);
                    setViewingMediaName(name);
                  }}
                  onScrollToMessage={scrollToAndHighlightMessage}
                  onForward={(m) => setForwardingMessage(m)}
                  onReport={(m) => setReportingMessage(m)}
                />
              </React.Fragment>
            );
          })
        )}

        {/* Animated WhatsApp Live Typing Bubble */}
        {(typingUsers || []).length > 0 && (
          <div className="flex items-center gap-2 my-2 px-1 sm:px-2 animate-msg-in">
            <div className="inline-flex items-center gap-2 rounded-2xl rounded-tl-none bg-[#202c33] px-3.5 py-2.5 shadow-md bubble-incoming-tail relative">
              {!isDirect && typingUsers[0]?.displayName && (
                <span className="text-[11px] font-semibold text-[#53bdeb]">
                  {typingUsers[0].displayName}
                </span>
              )}
              {typingUsers[0]?.activity === 'recording' ? (
                <span className="text-xs font-medium text-[#25d366]">
                  Recording voice note...
                </span>
              ) : (
                <div className="flex items-center gap-1 py-0.5" aria-label="Typing">
                  <span className="h-2 w-2 rounded-full bg-[#8696a0] typing-dot" />
                  <span className="h-2 w-2 rounded-full bg-[#8696a0] typing-dot" />
                  <span className="h-2 w-2 rounded-full bg-[#8696a0] typing-dot" />
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Floating Button */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-[4.75rem] right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-[#202c33] text-[#e9edef] shadow-xl hover:bg-[#2a3942] border border-[#222d34] transition hover:scale-105 active:scale-95"
          title="Scroll to bottom"
          aria-label="Scroll to latest messages"
        >
          <ChevronDown className="h-5 w-5" />
          {unreadInActive > 0 && (
            <span className="tabular-nums absolute -top-2 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#25d366] px-1 text-[10px] font-bold text-[#0b141a]">
              {unreadInActive}
            </span>
          )}
        </button>
      )}

      {/* Message Composer (Bottom Bar) */}
      <MessageComposer
        onSendTextMessage={sendTextMessage}
        onSendFileMessage={sendFileMessage}
        maxFileSizeMb={maxFileSizeMb}
        disabled={maintenanceMode}
      />

      {/* Modals */}
      <MediaViewerModal
        mediaUrl={viewingMediaUrl}
        fileName={viewingMediaName}
        onClose={() => setViewingMediaUrl(null)}
      />

      <ForwardModal
        isOpen={!!forwardingMessage}
        message={forwardingMessage}
        onClose={() => setForwardingMessage(null)}
      />

      <MessageInfoModal
        isOpen={!!infoMessage}
        message={infoMessage}
        participantIds={activeConversation.participantIds || []}
        currentUserId={user?.uid || ''}
        userCache={userCache}
        onClose={() => setInfoMessage(null)}
      />

      <WallpaperModal
        isOpen={isWallpaperModalOpen}
        onClose={() => setIsWallpaperModalOpen(false)}
      />

      <StatusViewerModal
        isOpen={isHeaderStatusViewerOpen}
        onClose={() => setIsHeaderStatusViewerOpen(false)}
        stories={partnerStories}
      />

      <CallModal
        isOpen={isCallOpen}
        onClose={() => {
          setIsCallOpen(false);
          setActiveCallSessionId(undefined);
        }}
        contactName={title}
        contactPhoto={avatarSrc}
        callType={callType}
        callSessionId={activeCallSessionId}
      />

      {/* Edit Message Modal */}
      <Modal
        isOpen={!!editingMessage}
        onClose={() => setEditingMessage(null)}
        title="Edit message"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-[#222d34] bg-[#202c33] p-3 text-xs text-[#e9edef] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingMessage(null)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-[#8696a0] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                if (editingMessage && editText.trim()) {
                  await editCurrentMessage(editingMessage.id, editText.trim());
                  setEditingMessage(null);
                }
              }}
              className="rounded-xl bg-[#00a884] px-4 py-2 text-xs font-semibold text-[#0b141a] hover:bg-[#06cf9c]"
            >
              Save
            </button>
          </div>
        </div>
      </Modal>

      {/* Report Message Modal */}
      <Modal
        isOpen={!!reportingMessage}
        onClose={() => setReportingMessage(null)}
        title="Report message"
        maxWidth="sm"
      >
        <form onSubmit={handleReportSubmit} className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300">
            <Flag className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Reports are reviewed by DEV CHAT moderators.</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#8696a0] mb-1.5">Reason</label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full rounded-xl border border-[#222d34] bg-[#202c33] px-3 py-2 text-xs text-[#e9edef] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
            >
              <option value="Spam or abuse">Spam or abuse</option>
              <option value="Harassment or bullying">Harassment or bullying</option>
              <option value="Phishing or malicious link">Phishing or malicious link</option>
              <option value="Inappropriate content">Inappropriate content</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#8696a0] mb-1.5">
              Additional notes (optional)
            </label>
            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              rows={3}
              placeholder="Provide extra context..."
              className="w-full rounded-xl border border-[#222d34] bg-[#202c33] p-3 text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReportingMessage(null)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-[#8696a0] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingReport}
              className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-50"
            >
              {submittingReport ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Clear Chat Confirm */}
      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        loading={clearingChat}
        onConfirm={async () => {
          if (!activeConversation) return;
          setClearingChat(true);
          try {
            await clearConversation(activeConversation.id);
            showToast('Chat messages cleared for you', 'info');
          } finally {
            setClearingChat(false);
            setShowClearConfirm(false);
          }
        }}
        title="Clear all messages?"
        description="Messages in this chat will be cleared from your view. Other participants will still keep their copies."
        confirmText="Clear messages"
        variant="warning"
      />
    </div>
  );
};
