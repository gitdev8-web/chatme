/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
  currentUserId: string;
  userCache: Record<string, UserProfile>;
  isSearchMatch?: boolean;
  isCurrentSearchMatch?: boolean;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onDelete: (messageId: string, forEveryone: boolean) => void;
  onReact: (messageId: string, emoji: string) => void;
  onStar: (messageId: string, shouldStar: boolean) => void;
  onOpenMedia: (url: string, name?: string) => void;
  onScrollToMessage?: (messageId: string) => void;
  onForward?: (msg: Message) => void;
  onReport?: (msg: Message) => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isSelf,
  isGroup,
  currentUserId,
  userCache,
  isSearchMatch = false,
  isCurrentSearchMatch = false,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onStar,
  onOpenMedia,
  onScrollToMessage,
  onForward,
  onReport,
}) => {
  const { showToast } = useToast();
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // System message styling
  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-3 select-none">
        <span className="rounded-lg bg-[#182229] border border-[#222d34]/70 px-3.5 py-1 text-[11px] font-medium text-[#8696a0] shadow-sm">
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
    if (message.text) {
      navigator.clipboard.writeText(message.text);
      showToast('Message copied to clipboard', 'info');
    }
    setShowActions(false);
  };

  const reactionsEntries = Object.entries(message.reactions || {}).filter(
    ([_, uids]) => Array.isArray(uids) && uids.length > 0
  );

  return (
    <div
      id={`msg_${message.id}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
      }}
      className={`group relative flex gap-2 my-1.5 px-1 sm:px-2 transition-all select-none ${
        isSelf ? 'justify-end' : 'justify-start'
      }`}
    >
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
      <div className={`relative max-w-[85%] sm:max-w-md ${isSelf ? 'items-end' : 'items-start'}`}>
        {/* Floating Quick Action Toolbar (hover on desktop, tap chevron on mobile) */}
        {showActions && !message.isDeleted && (
          <div
            className={`absolute -top-10 z-20 flex items-center gap-0.5 rounded-xl border border-[#222d34] bg-[#233138] px-2 py-1 shadow-xl backdrop-blur-md animate-in fade-in ${
              isSelf ? 'right-0' : 'left-0'
            }`}
          >
            {/* Quick Reactions */}
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

        {/* Emoji Bar Picker */}
        {showEmojiPicker && (
          <div
            className={`absolute -top-20 z-30 flex items-center gap-1.5 rounded-2xl border border-[#222d34] bg-[#233138] p-2 shadow-2xl backdrop-blur-md ${
              isSelf ? 'right-0' : 'left-0'
            }`}
          >
            {['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉'].map((emoji) => (
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
          className={`relative rounded-xl px-3 py-2 shadow-md transition-all ${
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
          {/* Touch / Mobile Menu Chevron */}
          {!message.isDeleted && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowActions((prev) => !prev);
              }}
              aria-label="Message actions"
              className={`absolute top-1.5 right-1.5 rounded-md p-0.5 opacity-60 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition ${
                isSelf ? 'text-white/80 hover:bg-black/20' : 'text-[#8696a0] hover:bg-black/20 hover:text-[#e9edef]'
              }`}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
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
              {/* Photo / Video Attachment */}
              {message.type === 'image' && message.fileUrl && (
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

              {/* Text Message with 3D Emojis */}
              {message.text && message.type === 'text' && (
                <div className="text-[13px] leading-relaxed whitespace-pre-wrap break-words pr-6">
                  <RenderMessage3DEmojis text={message.text} />
                </div>
              )}
            </>
          )}

          {/* Bottom Right Metadata */}
          <div className="flex items-center justify-end gap-1 text-[10px] text-[#8696a0] mt-1 tabular-nums">
            {isStarred && (
              <Star className="h-2.5 w-2.5 fill-current text-[#ffd279]" />
            )}
            {message.isEdited && <span className="text-[9px]">Edited •</span>}
            <span>{formatTime(message.createdAt)}</span>

            {isSelf && (
              <span className="inline-flex items-center ml-0.5">
                {message.readBy && message.readBy.length > 1 ? (
                  <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
                ) : message.deliveredTo && message.deliveredTo.length > 1 ? (
                  <CheckCheck className="h-3.5 w-3.5 text-[#8696a0]" />
                ) : (
                  <Check className="h-3.5 w-3.5 text-[#8696a0]" />
                )}
              </span>
            )}
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
                className="flex items-center gap-1 rounded-full border border-[#222d34] bg-[#202c33] px-2 py-0.5 text-xs shadow-sm hover:scale-105 active:scale-95 transition"
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
  );
};
