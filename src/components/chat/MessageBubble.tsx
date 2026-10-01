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
  Play,
  Pause,
  CornerDownRight,
  Forward,
  Star,
  ChevronDown,
  Camera,
} from 'lucide-react';
import { Message, UserProfile } from '../../types';
import { Avatar } from '../common/Avatar';
import { useToast } from '../common/Toast';
import { VoiceNotePlayer } from './VoiceNotePlayer';

interface MessageBubbleProps {
  message: Message;
  isSelf: boolean;
  isGroup: boolean;
  userCache: Record<string, UserProfile>;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onDelete: (messageId: string, forEveryone: boolean) => void;
  onReact: (messageId: string, emoji: string) => void;
  onOpenMedia: (url: string, name?: string) => void;
  onScrollToMessage?: (messageId: string) => void;
  onForward?: (msg: Message) => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const PLAYBACK_SPEEDS = [1, 1.5, 2];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isSelf,
  isGroup,
  userCache,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onOpenMedia,
  onScrollToMessage,
  onForward,
}) => {
  const { showToast } = useToast();
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isStarred, setIsStarred] = useState(false);

  // System message styling
  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-3 select-none">
        <span className="rounded-lg bg-[#182229] px-3 py-1 text-[11px] font-normal text-[#8696a0] shadow-sm">
          {message.text}
        </span>
      </div>
    );
  }

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

  // Reactions summary
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
      className={`group relative flex gap-2 my-1 px-1 sm:px-2 transition-all select-none ${
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
        {/* Floating Quick Action Toolbar */}
        {showActions && !message.isDeleted && (
          <div
            className={`absolute -top-9 z-20 flex items-center gap-1 rounded-xl border border-[#222d34] bg-[#233138] px-2 py-1 shadow-xl backdrop-blur-md animate-in fade-in ${
              isSelf ? 'right-0' : 'left-0'
            }`}
          >
            {/* Quick Reactions */}
            <div className="flex items-center gap-1 pr-1 border-r border-[#374248]">
              {COMMON_EMOJIS.slice(0, 4).map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onReact(message.id, emoji)}
                  className="p-1 text-sm hover:scale-130 transition-transform"
                >
                  {emoji}
                </button>
              ))}
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1 text-[#8696a0] hover:text-white"
                title="More Reactions"
              >
                <Smile className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Actions */}
            <button
              onClick={() => onReply(message)}
              className="p-1 text-[#8696a0] hover:text-white rounded hover:bg-[#182229] transition"
              title="Reply"
            >
              <Reply className="h-3.5 w-3.5" />
            </button>
            {onForward && (
              <button
                onClick={() => onForward(message)}
                className="p-1 text-[#8696a0] hover:text-white rounded hover:bg-[#182229] transition"
                title="Forward"
              >
                <Forward className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => setIsStarred(!isStarred)}
              className={`p-1 rounded hover:bg-[#182229] transition ${
                isStarred ? 'text-[#ffd279]' : 'text-[#8696a0] hover:text-white'
              }`}
              title={isStarred ? 'Unstar' : 'Star'}
            >
              <Star className="h-3.5 w-3.5 fill-current" />
            </button>
            <button
              onClick={handleCopy}
              className="p-1 text-[#8696a0] hover:text-white rounded hover:bg-[#182229] transition"
              title="Copy"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            {isSelf && message.type === 'text' && (
              <button
                onClick={() => onEdit(message)}
                className="p-1 text-[#8696a0] hover:text-white rounded hover:bg-[#182229] transition"
                title="Edit"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => onDelete(message.id, isSelf)}
              className="p-1 text-[#8696a0] hover:text-rose-400 rounded hover:bg-[#182229] transition"
              title={isSelf ? 'Delete message' : 'Delete for me'}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Emoji Bar Picker */}
        {showEmojiPicker && (
          <div
            className={`absolute -top-16 z-30 flex items-center gap-1.5 rounded-2xl border border-[#222d34] bg-[#233138] p-2 shadow-2xl backdrop-blur-md ${
              isSelf ? 'right-0' : 'left-0'
            }`}
          >
            {['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(message.id, emoji);
                  setShowEmojiPicker(false);
                }}
                className="text-lg hover:scale-130 transition-transform p-1"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`relative rounded-lg px-3 py-1.5 shadow-md transition-colors ${
            message.isDeleted
              ? 'italic border border-[#222d34] bg-[#182229] text-[#8696a0]'
              : isSelf
              ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none bubble-outgoing-tail'
              : 'bg-[#202c33] text-[#e9edef] rounded-tl-none bubble-incoming-tail'
          }`}
        >
          {/* Sender header in groups */}
          {!isSelf && isGroup && (
            <div className="mb-0.5 text-xs font-semibold text-[#53bdeb]">
              {senderName}
            </div>
          )}

          {/* Reply Quote Reference */}
          {message.replyTo && (
            <div
              onClick={() => onScrollToMessage && onScrollToMessage(message.replyTo!.messageId)}
              className={`mb-1.5 flex items-start gap-1.5 rounded-md border-l-4 p-1.5 text-xs cursor-pointer select-none transition ${
                isSelf
                  ? 'border-[#00a884] bg-[#025143]/70 text-[#e9edef] hover:bg-[#025143]'
                  : 'border-[#53bdeb] bg-[#111b21] text-[#8696a0] hover:bg-[#0b141a]'
              }`}
            >
              <div className="truncate">
                <span
                  className={`font-semibold block text-[11px] ${
                    isSelf ? 'text-[#00a884]' : 'text-[#53bdeb]'
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
            <span className="text-xs">🚫 This message was deleted</span>
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
                    <p className="mt-1 text-xs text-[#e9edef]">{message.text}</p>
                  )}
                </div>
              )}

              {/* Document / File Attachment */}
              {message.type === 'file' && message.fileUrl && (
                <div
                  onClick={() => onOpenMedia(message.fileUrl!, message.fileName)}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition ${
                    isSelf
                      ? 'border-white/10 bg-black/20 hover:bg-black/30'
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
                      <p className="text-[10px] text-[#8696a0]">
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

              {/* Standard Text Message */}
              {message.text && message.type === 'text' && (
                <p className="text-xs leading-relaxed whitespace-pre-wrap break-words pr-14">
                  {message.text}
                </p>
              )}
            </>
          )}

          {/* Bottom Right Metadata: Time + Star + Double Ticks */}
          <div className="flex items-center justify-end gap-1 text-[10px] text-[#8696a0] mt-0.5 -mb-0.5 ml-auto float-right">
            {isStarred && (
              <Star className="h-2.5 w-2.5 fill-current text-[#ffd279]" />
            )}
            {message.isEdited && <span className="text-[9px]">Edited •</span>}
            <span>{formatTime(message.createdAt)}</span>

            {/* Read/Delivery Receipts (Double Ticks) */}
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
                onClick={() => onReact(message.id, emoji)}
                className="flex items-center gap-1 rounded-full border border-[#222d34] bg-[#202c33] px-1.5 py-0.5 text-xs shadow-sm hover:scale-105 active:scale-95 transition"
              >
                <span>{emoji}</span>
                <span className="text-[10px] font-semibold text-[#8696a0]">
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
