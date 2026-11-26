/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  Check,
  CheckCheck,
  Reply,
  Smile,
  Copy,
  Edit2,
  Trash2,
  Download,
  FileText,
  Forward,
  Star,
  ChevronDown,
  Flag,
  Pin,
  PinOff,
  Info,
  MapPin,
  ExternalLink,
  MessageSquare,
  Timer,
  BarChart3,
  X,
} from 'lucide-react';
import { Message, UserProfile } from '../../types';
import { Avatar } from '../common/Avatar';
import { useToast } from '../common/Toast';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { RenderMessage3DEmojis } from '../emoji/RenderMessage3DEmojis';
import { Emoji3DImage } from '../emoji/Emoji3DImage';

interface MessageBubbleProps {
  message: Message;
  isSelf: boolean;
  isGroup: boolean;
  isPinned?: boolean;
  currentUserId: string;
  userCache: Record<string, UserProfile>;
  isSearchMatch?: boolean;
  isCurrentSearchMatch?: boolean;
  receiptStatus?: 'sent' | 'delivered' | 'read';
  receiptLabel?: string;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onDelete: (messageId: string, forEveryone: boolean) => void;
  onReact: (messageId: string, emoji: string) => void;
  onStar: (messageId: string, shouldStar: boolean) => void;
  onPin?: (msg: Message) => void;
  onUnpin?: () => void;
  onInfo?: (msg: Message) => void;
  onVotePoll?: (messageId: string, optionId: string) => void;
  onOpenViewOnce?: (msg: Message) => void;
  onMessageContact?: (uid: string) => void;
  onOpenMedia: (url: string, name?: string) => void;
  onScrollToMessage?: (messageId: string) => void;
  onForward?: (msg: Message) => void;
  onReport?: (msg: Message) => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉'];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isSelf,
  isGroup,
  isPinned = false,
  currentUserId,
  userCache,
  isSearchMatch = false,
  isCurrentSearchMatch = false,
  receiptStatus,
  receiptLabel,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onStar,
  onPin,
  onUnpin,
  onInfo,
  onVotePoll,
  onOpenViewOnce,
  onMessageContact,
  onOpenMedia,
  onScrollToMessage,
  onForward,
  onReport,
}) => {
  const { showToast } = useToast();
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMobileSheet, setShowMobileSheet] = useState(false);

  // Mobile swipe-right-to-reply gesture state
  const [swipeX, setSwipeX] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number; time: number; locked?: 'h' | 'v' } | null>(
    null
  );
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // System message styling
  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-3 select-none">
        <span className="rounded-lg bg-[#182229] border border-[#222d34]/70 px-3.5 py-1 text-[11px] font-medium text-[#8696a0] shadow-sm text-center max-w-[90%]">
          {message.text}
        </span>
      </div>
    );
  }

  const isStarred = message.starredBy?.includes(currentUserId) || false;
  const senderProfile = userCache[message.senderId];
  const senderName = message.senderName || senderProfile?.displayName || 'User';

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleCopy = () => {
    const copyContent =
      message.text ||
      (message.location
        ? `${message.location.label || 'Location'} (${message.location.latitude}, ${message.location.longitude})`
        : '');
    if (copyContent) {
      navigator.clipboard.writeText(copyContent);
      showToast('Copied to clipboard', 'info');
    }
    setShowActions(false);
    setShowMobileSheet(false);
  };

  // Touch handlers for swipe-to-reply + long press action sheet
  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (message.isDeleted || e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    clearLongPress();
    longPressTimerRef.current = setTimeout(() => {
      if (touchStartRef.current && !touchStartRef.current.locked) {
        setShowMobileSheet(true);
      }
    }, 450);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;

    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      clearLongPress();
    }

    if (!touchStartRef.current.locked) {
      if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) {
        touchStartRef.current.locked = 'v';
        return;
      }
      if (dx > 10 && dx > Math.abs(dy) * 1.35) {
        touchStartRef.current.locked = 'h';
      }
    }

    if (touchStartRef.current.locked === 'h') {
      const clamped = Math.max(0, Math.min(58, dx * 0.72));
      setSwipeX(clamped);
    }
  };

  const handleTouchEnd = () => {
    clearLongPress();
    if (swipeX >= 40 && !message.isDeleted) {
      onReply(message);
    }
    setSwipeX(0);
    touchStartRef.current = null;
  };

  const handleOpenActionsMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setShowMobileSheet(true);
    } else {
      setShowActions((prev) => !prev);
    }
  };

  const reactionsEntries = Object.entries(message.reactions || {}).filter(
    ([_, uids]) => Array.isArray(uids) && uids.length > 0
  );

  // View Once state
  const isViewOnce = Boolean(message.viewOnce && message.type === 'image');
  const hasViewedOnce = Boolean(message.viewedBy?.includes(currentUserId));

  // Poll stats
  const totalPollVotes = message.poll
    ? new Set(message.poll.options.flatMap((o) => o.votes || [])).size
    : 0;

  return (
    <>
      <div
        id={`msg_${message.id}`}
        onMouseEnter={() => {
          if (typeof window !== 'undefined' && window.innerWidth >= 640) {
            setShowActions(true);
          }
        }}
        onMouseLeave={() => {
          setShowActions(false);
          setShowEmojiPicker(false);
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`group relative flex gap-2 my-1.5 px-1 sm:px-2 transition-all select-none animate-msg-in ${
          isSelf ? 'justify-end' : 'justify-start'
        }`}
      >
        {/* Swipe-to-Reply Visual Indicator */}
        {swipeX > 12 && (
          <div
            className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-[#202c33] text-[#25d366] shadow-md pointer-events-none transition-transform"
            style={{
              opacity: Math.min(1, swipeX / 42),
              transform: `translateY(-50%) scale(${swipeX >= 40 ? 1.12 : 0.9})`,
            }}
          >
            <Reply className="h-4 w-4" />
          </div>
        )}

        {/* Group sender avatar */}
        {!isSelf && isGroup && (
          <Avatar
            src={message.senderPhotoURL || senderProfile?.photoURL}
            name={senderName}
            size="sm"
            className="mt-1"
          />
        )}

        {/* Bubble Container */}
        <div
          className={`relative max-w-[86%] sm:max-w-md transition-transform duration-150 ease-out ${
            isSelf ? 'items-end' : 'items-start'
          }`}
          style={swipeX > 0 ? { transform: `translateX(${swipeX}px)` } : undefined}
        >
          {/* Desktop Hover Quick Action Toolbar */}
          {showActions && !message.isDeleted && (
            <div
              className={`hidden sm:flex absolute -top-10 z-20 items-center gap-0.5 rounded-xl border border-[#222d34] bg-[#233138] px-2 py-1 shadow-xl backdrop-blur-md animate-in fade-in ${
                isSelf ? 'right-0' : 'left-0'
              }`}
            >
              <div className="flex items-center gap-0.5 pr-1 border-r border-[#374248]">
                {COMMON_EMOJIS.slice(0, 4).map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onReact(message.id, emoji);
                      setShowActions(false);
                    }}
                    className="p-1 text-sm hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1.5 text-[#8696a0] hover:text-white rounded hover:bg-[#182229] transition"
                  title="More Reactions"
                >
                  <Smile className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  onReply(message);
                  setShowActions(false);
                }}
                className="p-1.5 text-[#8696a0] hover:text-white rounded hover:bg-[#182229] transition"
                title="Reply"
              >
                <Reply className="h-3.5 w-3.5" />
              </button>

              {onForward && (
                <button
                  type="button"
                  onClick={() => {
                    onForward(message);
                    setShowActions(false);
                  }}
                  className="p-1.5 text-[#8696a0] hover:text-white rounded hover:bg-[#182229] transition"
                  title="Forward"
                >
                  <Forward className="h-3.5 w-3.5" />
                </button>
              )}

              {(onPin || onUnpin) && (
                <button
                  type="button"
                  onClick={() => {
                    if (isPinned && onUnpin) onUnpin();
                    else if (onPin) onPin(message);
                    setShowActions(false);
                  }}
                  className={`p-1.5 rounded hover:bg-[#182229] transition ${
                    isPinned ? 'text-[#25d366]' : 'text-[#8696a0] hover:text-white'
                  }`}
                  title={isPinned ? 'Unpin message' : 'Pin message'}
                >
                  {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onStar(message.id, !isStarred);
                  setShowActions(false);
                }}
                className={`p-1.5 rounded hover:bg-[#182229] transition ${
                  isStarred ? 'text-[#ffd279]' : 'text-[#8696a0] hover:text-white'
                }`}
                title={isStarred ? 'Unstar message' : 'Star message'}
              >
                <Star className={`h-3.5 w-3.5 ${isStarred ? 'fill-current' : ''}`} />
              </button>

              {isSelf && onInfo && (
                <button
                  type="button"
                  onClick={() => {
                    onInfo(message);
                    setShowActions(false);
                  }}
                  className="p-1.5 text-[#8696a0] hover:text-[#53bdeb] rounded hover:bg-[#182229] transition"
                  title="Message info"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 text-[#8696a0] hover:text-white rounded hover:bg-[#182229] transition"
                title="Copy text"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>

              {isSelf && message.type === 'text' && (
                <button
                  type="button"
                  onClick={() => {
                    onEdit(message);
                    setShowActions(false);
                  }}
                  className="p-1.5 text-[#8696a0] hover:text-white rounded hover:bg-[#182229] transition"
                  title="Edit"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              )}

              {!isSelf && onReport && (
                <button
                  type="button"
                  onClick={() => {
                    onReport(message);
                    setShowActions(false);
                  }}
                  className="p-1.5 text-[#8696a0] hover:text-amber-400 rounded hover:bg-[#182229] transition"
                  title="Report message"
                >
                  <Flag className="h-3.5 w-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onDelete(message.id, isSelf);
                  setShowActions(false);
                }}
                className="p-1.5 text-[#8696a0] hover:text-rose-400 rounded hover:bg-[#182229] transition"
                title={isSelf ? 'Delete message' : 'Delete for me'}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Desktop Extended Emoji Bar Picker */}
          {showEmojiPicker && (
            <div
              className={`hidden sm:flex absolute -top-20 z-30 items-center gap-1.5 rounded-2xl border border-[#222d34] bg-[#233138] p-2 shadow-2xl backdrop-blur-md ${
                isSelf ? 'right-0' : 'left-0'
              }`}
            >
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onReact(message.id, emoji);
                    setShowEmojiPicker(false);
                    setShowActions(false);
                  }}
                  className="hover:scale-125 transition-transform p-1 rounded-xl hover:bg-[#111b21]"
                >
                  <Emoji3DImage char={emoji} size="lg" />
                </button>
              ))}
            </div>
          )}

          {/* Message Bubble */}
          <div
            className={`relative rounded-2xl sm:rounded-xl px-3 py-2 shadow-md transition-all ${
              message.isDeleted
                ? 'italic border border-[#222d34] bg-[#182229] text-[#8696a0]'
                : isSelf
                ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none bubble-outgoing-tail'
                : 'bg-[#202c33] text-[#e9edef] rounded-tl-none bubble-incoming-tail'
            } ${
              isCurrentSearchMatch
                ? 'ring-2 ring-[#25d366] shadow-[0_0_16px_rgba(37,211,102,0.3)]'
                : isSearchMatch
                ? 'ring-1 ring-[#25d366]/60'
                : ''
            }`}
          >
            {/* Touch / Menu Chevron */}
            {!message.isDeleted && (
              <button
                type="button"
                onClick={handleOpenActionsMenu}
                aria-label="Message actions"
                className={`absolute top-1 right-1 rounded-lg p-1 opacity-75 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition ${
                  isSelf
                    ? 'text-white/80 hover:bg-black/20'
                    : 'text-[#8696a0] hover:bg-black/20 hover:text-[#e9edef]'
                }`}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Forwarded Micro-Badge */}
            {message.isForwarded && !message.isDeleted && (
              <div className="mb-1 flex items-center gap-1 text-[10px] italic text-white/70 pr-5">
                <Forward className="h-3 w-3" />
                <span>Forwarded</span>
              </div>
            )}

            {/* Sender header in groups */}
            {!isSelf && isGroup && (
              <div className="mb-1 text-xs font-semibold text-[#53bdeb] pr-5">
                {senderName}
              </div>
            )}

            {/* Reply Quote Reference */}
            {message.replyTo && (
              <div
                onClick={() => onScrollToMessage && onScrollToMessage(message.replyTo!.messageId)}
                className={`mb-1.5 flex items-start gap-1.5 rounded-lg border-l-2 p-2 text-xs cursor-pointer select-none transition ${
                  isSelf
                    ? 'border-[#25d366] bg-[#025143]/75 text-[#e9edef] hover:bg-[#025143]'
                    : 'border-[#53bdeb] bg-[#111b21]/90 text-[#8696a0] hover:bg-[#0b141a]'
                }`}
              >
                <div className="truncate">
                  <span
                    className={`font-semibold block text-[11px] ${
                      isSelf ? 'text-[#25d366]' : 'text-[#53bdeb]'
                    }`}
                  >
                    {message.replyTo.senderName}
                  </span>
                  <span className="truncate block opacity-85 text-[11px]">
                    {message.replyTo.text}
                  </span>
                </div>
              </div>
            )}

            {/* Deleted State */}
            {message.isDeleted ? (
              <span className="text-xs">This message was deleted</span>
            ) : (
              <>
                {/* View Once Image */}
                {isViewOnce && message.fileUrl ? (
                  isSelf ? (
                    <div className="flex items-center gap-2.5 rounded-xl bg-black/20 px-3 py-2.5 pr-6 text-xs">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#25d366] text-[11px] font-bold text-[#25d366]">
                        1
                      </span>
                      <div>
                        <span className="font-semibold block">Photo</span>
                        <span className="text-[10px] text-white/70">View once sent</span>
                      </div>
                    </div>
                  ) : hasViewedOnce ? (
                    <div className="flex items-center gap-2 rounded-xl bg-black/20 px-3 py-2 pr-6 text-xs text-[#8696a0] italic">
                      <Timer className="h-4 w-4" />
                      <span>Opened</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenViewOnce) onOpenViewOnce(message);
                        onOpenMedia(message.fileUrl!, message.fileName || 'View once photo');
                      }}
                      className="flex items-center gap-2.5 rounded-xl border border-[#25d366]/40 bg-[#0b141a]/60 px-3.5 py-2.5 pr-6 text-left hover:bg-[#0b141a] transition"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00a884] text-xs font-extrabold text-[#0b141a]">
                        1
                      </span>
                      <div>
                        <span className="text-xs font-bold text-[#25d366] block">
                          Photo
                        </span>
                        <span className="text-[10px] text-[#8696a0]">Tap to view once</span>
                      </div>
                    </button>
                  )
                ) : (
                  /* Standard Photo Attachment */
                  message.type === 'image' &&
                  message.fileUrl && (
                    <div className="mb-1 overflow-hidden rounded-lg">
                      <img
                        src={message.fileUrl}
                        alt={message.fileName || 'Attachment'}
                        onClick={() => onOpenMedia(message.fileUrl!, message.fileName)}
                        className="max-h-72 w-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                        loading="lazy"
                      />
                      {message.text && (
                        <p className="mt-1.5 text-[13px] text-[#e9edef]">{message.text}</p>
                      )}
                    </div>
                  )
                )}

                {/* Document / File Attachment */}
                {message.type === 'file' && message.fileUrl && (
                  <div
                    onClick={() => onOpenMedia(message.fileUrl!, message.fileName)}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition ${
                      isSelf
                        ? 'border-white/15 bg-black/20 hover:bg-black/30'
                        : 'border-[#222d34] bg-[#111b21] hover:bg-[#182229]'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-[#53bdeb]/20 text-[#53bdeb]">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate text-[#e9edef]">
                        {message.fileName || 'Document'}
                      </p>
                      {message.fileSize && (
                        <p className="tabular-nums text-[10px] text-[#8696a0]">
                          {(message.fileSize / 1024).toFixed(1)} KB
                        </p>
                      )}
                    </div>
                    <Download className="h-4 w-4 text-[#8696a0]" />
                  </div>
                )}

                {/* Voice Note Player */}
                {message.type === 'voice' && message.fileUrl && (
                  <VoiceNotePlayer
                    messageId={message.id}
                    audioUrl={message.fileUrl}
                    duration={message.audioDuration}
                    isSelf={isSelf}
                    senderName={senderName}
                    senderPhoto={message.senderPhotoURL || senderProfile?.photoURL}
                  />
                )}

                {/* Interactive Poll Card */}
                {message.type === 'poll' && message.poll && (
                  <div className="min-w-[220px] sm:min-w-[260px] space-y-2.5 pr-4 pt-0.5">
                    <div className="flex items-start gap-2">
                      <BarChart3 className="h-4 w-4 text-[#25d366] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs sm:text-[13px] font-bold text-[#e9edef] leading-snug">
                          {message.poll.question}
                        </p>
                        <p className="text-[10px] text-white/65 mt-0.5">
                          {message.poll.allowMultiple ? 'Select one or more' : 'Select one'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {message.poll.options.map((opt) => {
                        const votes = opt.votes || [];
                        const hasVoted = votes.includes(currentUserId);
                        const pct =
                          totalPollVotes > 0
                            ? Math.round((votes.length / totalPollVotes) * 100)
                            : 0;

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => onVotePoll && onVotePoll(message.id, opt.id)}
                            className={`relative w-full overflow-hidden rounded-xl border px-3 py-2 text-left transition active:scale-[0.99] min-h-[40px] ${
                              hasVoted
                                ? 'border-[#25d366] bg-[#0b141a]/45'
                                : isSelf
                                ? 'border-white/15 bg-black/20 hover:bg-black/30'
                                : 'border-[#2a3942] bg-[#111b21]/70 hover:bg-[#111b21]'
                            }`}
                          >
                            <div
                              className="absolute inset-y-0 left-0 bg-[#25d366]/20 transition-all duration-300 pointer-events-none"
                              style={{ width: `${pct}%` }}
                            />
                            <div className="relative flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border ${
                                    hasVoted
                                      ? 'border-[#25d366] bg-[#25d366] text-[#0b141a]'
                                      : 'border-[#8696a0]/60'
                                  }`}
                                >
                                  {hasVoted && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                                </span>
                                <span className="font-medium text-[#e9edef] truncate">
                                  {opt.text}
                                </span>
                              </div>
                              <span className="tabular-nums text-[10px] font-semibold text-white/75 flex-shrink-0">
                                {votes.length}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <p className="tabular-nums text-[10px] text-white/65">
                      {totalPollVotes} {totalPollVotes === 1 ? 'voter' : 'voters'}
                    </p>
                  </div>
                )}

                {/* Location Card */}
                {message.type === 'location' && message.location && (
                  <div className="min-w-[215px] sm:min-w-[245px] overflow-hidden rounded-xl border border-white/10 bg-black/20 mt-0.5">
                    <div className="relative h-24 bg-gradient-to-br from-[#0d3b31] via-[#112a36] to-[#0b141a] flex flex-col items-center justify-center p-3 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25d366]/20 text-[#25d366] ring-2 ring-[#25d366]/40 shadow-lg">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <span className="mt-1 font-mono text-[10px] text-white/75 tabular-nums">
                        {message.location.latitude.toFixed(4)}, {message.location.longitude.toFixed(4)}
                      </span>
                    </div>
                    <div className="p-2.5 space-y-2">
                      <div>
                        <p className="text-xs font-bold text-[#e9edef] truncate">
                          {message.location.label || 'Shared Location'}
                        </p>
                        {message.location.address && (
                          <p className="text-[11px] text-white/70 truncate">
                            {message.location.address}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`https://maps.google.com/?q=${message.location.latitude},${message.location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-[#00a884] px-2.5 py-1.5 text-[11px] font-bold text-[#0b141a] hover:bg-[#06cf9c] transition"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>View Map</span>
                        </a>
                        <button
                          type="button"
                          onClick={handleCopy}
                          className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-white/20 transition"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Shared Contact Card */}
                {message.type === 'contact' && message.contactCard && (
                  <div className="min-w-[215px] sm:min-w-[245px] rounded-xl border border-white/10 bg-black/20 p-3 space-y-2.5 mt-0.5">
                    <div className="flex items-center gap-2.5 min-w-0 pr-4">
                      <Avatar
                        src={message.contactCard.photoURL}
                        name={message.contactCard.displayName}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#e9edef] truncate">
                          {message.contactCard.displayName}
                        </p>
                        <p className="text-[11px] text-[#25d366] font-mono truncate">
                          @{message.contactCard.username}
                        </p>
                        {message.contactCard.phoneNumber && (
                          <p className="text-[10px] text-white/70 font-mono truncate">
                            {message.contactCard.phoneNumber}
                          </p>
                        )}
                      </div>
                    </div>
                    {onMessageContact && message.contactCard.uid !== currentUserId && (
                      <button
                        type="button"
                        onClick={() => onMessageContact(message.contactCard!.uid)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#25d366]/35 bg-[#00a884]/15 py-2 text-xs font-bold text-[#25d366] hover:bg-[#00a884] hover:text-[#0b141a] transition"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Message</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Text Message with 3D Emojis */}
                {message.text && message.type === 'text' && (
                  <div className="text-[14px] sm:text-[13px] leading-relaxed whitespace-pre-wrap break-words pr-6">
                    <RenderMessage3DEmojis text={message.text} />
                  </div>
                )}
              </>
            )}

            {/* Bottom Right Metadata */}
            <div className="flex items-center justify-end gap-1 text-[10px] text-[#8696a0] mt-1 tabular-nums">
              {isPinned && <Pin className="h-2.5 w-2.5 text-[#25d366] rotate-45" />}
              {isStarred && <Star className="h-2.5 w-2.5 fill-current text-[#ffd279]" />}
              {message.isEdited && <span className="text-[9px]">Edited •</span>}
              <span>{formatTime(message.createdAt)}</span>

              {isSelf && (() => {
                const resolvedReceiptStatus: 'sent' | 'delivered' | 'read' =
                  receiptStatus ||
                  ((message.readBy || []).some((uid) => uid !== message.senderId)
                    ? 'read'
                    : (message.deliveredTo || []).some((uid) => uid !== message.senderId)
                    ? 'delivered'
                    : 'sent');

                const resolvedReceiptLabel =
                  receiptLabel ||
                  (resolvedReceiptStatus === 'read'
                    ? 'Read'
                    : resolvedReceiptStatus === 'delivered'
                    ? 'Delivered'
                    : 'Sent');

                return (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onInfo) onInfo(message);
                    }}
                    title={resolvedReceiptLabel}
                    aria-label={resolvedReceiptLabel}
                    data-receipt-status={resolvedReceiptStatus}
                    className="inline-flex items-center ml-0.5 rounded focus:outline-none hover:opacity-90 transition-opacity"
                  >
                    {resolvedReceiptStatus === 'read' ? (
                      <CheckCheck
                        className="h-3.5 w-3.5 text-[#53bdeb] drop-shadow-[0_0_2px_rgba(83,189,235,0.28)]"
                        strokeWidth={2.4}
                      />
                    ) : resolvedReceiptStatus === 'delivered' ? (
                      <CheckCheck className="h-3.5 w-3.5 text-[#8696a0]" />
                    ) : (
                      <Check className="h-3.5 w-3.5 text-[#8696a0]" />
                    )}
                  </button>
                );
              })()}
            </div>
          </div>

          {/* Reaction Pill Counters below Bubble */}
          {reactionsEntries.length > 0 && (
            <div
              className={`flex flex-wrap gap-1 mt-1 ${
                isSelf ? 'justify-end' : 'justify-start'
              }`}
            >
              {reactionsEntries.map(([emoji, uids]) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReact(message.id, emoji)}
                  className="flex items-center gap-1 rounded-full border border-[#222d34] bg-[#202c33] px-2 py-0.5 text-xs shadow-sm hover:scale-105 active:scale-95 transition min-h-[28px]"
                >
                  <Emoji3DImage char={emoji} size="sm" />
                  <span className="tabular-nums text-[10px] font-semibold text-[#8696a0]">
                    {uids.length}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom-Sheet Action Drawer (Thumb-friendly >=44px targets, zero edge clipping) */}
      {showMobileSheet && !message.isDeleted && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm animate-in fade-in sm:hidden"
          onClick={() => setShowMobileSheet(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-t-3xl border-t border-[#222d34] bg-[#111b21] px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl space-y-3 animate-in slide-in-from-bottom-4"
          >
            {/* Grab Handle */}
            <div className="mx-auto h-1.5 w-12 rounded-full bg-[#374248]" />

            {/* Quick 3D Reactions Row */}
            <div className="flex items-center justify-between gap-1 rounded-2xl bg-[#202c33] p-2 overflow-x-auto no-scrollbar">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onReact(message.id, emoji);
                    setShowMobileSheet(false);
                  }}
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl hover:bg-[#111b21] active:scale-90 transition"
                >
                  <Emoji3DImage char={emoji} size="lg" />
                </button>
              ))}
            </div>

            {/* Action Grid */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onReply(message);
                  setShowMobileSheet(false);
                }}
                className="flex min-h-[46px] items-center gap-2.5 rounded-xl bg-[#202c33] px-3.5 text-xs font-semibold text-[#e9edef] active:bg-[#2a3942]"
              >
                <Reply className="h-4 w-4 text-[#00a884]" />
                <span>Reply</span>
              </button>

              {onForward && (
                <button
                  type="button"
                  onClick={() => {
                    onForward(message);
                    setShowMobileSheet(false);
                  }}
                  className="flex min-h-[46px] items-center gap-2.5 rounded-xl bg-[#202c33] px-3.5 text-xs font-semibold text-[#e9edef] active:bg-[#2a3942]"
                >
                  <Forward className="h-4 w-4 text-[#53bdeb]" />
                  <span>Forward</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onStar(message.id, !isStarred);
                  setShowMobileSheet(false);
                }}
                className="flex min-h-[46px] items-center gap-2.5 rounded-xl bg-[#202c33] px-3.5 text-xs font-semibold text-[#e9edef] active:bg-[#2a3942]"
              >
                <Star className={`h-4 w-4 text-[#ffd279] ${isStarred ? 'fill-current' : ''}`} />
                <span>{isStarred ? 'Unstar' : 'Star'}</span>
              </button>

              {(onPin || onUnpin) && (
                <button
                  type="button"
                  onClick={() => {
                    if (isPinned && onUnpin) onUnpin();
                    else if (onPin) onPin(message);
                    setShowMobileSheet(false);
                  }}
                  className="flex min-h-[46px] items-center gap-2.5 rounded-xl bg-[#202c33] px-3.5 text-xs font-semibold text-[#e9edef] active:bg-[#2a3942]"
                >
                  {isPinned ? (
                    <PinOff className="h-4 w-4 text-[#25d366]" />
                  ) : (
                    <Pin className="h-4 w-4 text-[#25d366]" />
                  )}
                  <span>{isPinned ? 'Unpin' : 'Pin message'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCopy}
                className="flex min-h-[46px] items-center gap-2.5 rounded-xl bg-[#202c33] px-3.5 text-xs font-semibold text-[#e9edef] active:bg-[#2a3942]"
              >
                <Copy className="h-4 w-4 text-[#8696a0]" />
                <span>Copy</span>
              </button>

              {isSelf && onInfo && (
                <button
                  type="button"
                  onClick={() => {
                    onInfo(message);
                    setShowMobileSheet(false);
                  }}
                  className="flex min-h-[46px] items-center gap-2.5 rounded-xl bg-[#202c33] px-3.5 text-xs font-semibold text-[#e9edef] active:bg-[#2a3942]"
                >
                  <Info className="h-4 w-4 text-[#53bdeb]" />
                  <span>Message Info</span>
                </button>
              )}

              {isSelf && message.type === 'text' && (
                <button
                  type="button"
                  onClick={() => {
                    onEdit(message);
                    setShowMobileSheet(false);
                  }}
                  className="flex min-h-[46px] items-center gap-2.5 rounded-xl bg-[#202c33] px-3.5 text-xs font-semibold text-[#e9edef] active:bg-[#2a3942]"
                >
                  <Edit2 className="h-4 w-4 text-[#00a884]" />
                  <span>Edit</span>
                </button>
              )}

              {!isSelf && onReport && (
                <button
                  type="button"
                  onClick={() => {
                    onReport(message);
                    setShowMobileSheet(false);
                  }}
                  className="flex min-h-[46px] items-center gap-2.5 rounded-xl bg-[#202c33] px-3.5 text-xs font-semibold text-amber-300 active:bg-[#2a3942]"
                >
                  <Flag className="h-4 w-4" />
                  <span>Report</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onDelete(message.id, isSelf);
                  setShowMobileSheet(false);
                }}
                className="flex min-h-[46px] items-center gap-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 px-3.5 text-xs font-semibold text-rose-400 active:bg-rose-500/25"
              >
                <Trash2 className="h-4 w-4" />
                <span>{isSelf ? 'Delete' : 'Delete for me'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowMobileSheet(false)}
              className="flex w-full min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[#222d34] bg-[#182229] text-xs font-semibold text-[#8696a0]"
            >
              <X className="h-4 w-4" />
              <span>Close</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
