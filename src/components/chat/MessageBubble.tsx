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
  MoreHorizontal,
  Forward,
} from 'lucide-react';
import { Message, UserProfile } from '../../types';
import { Avatar } from '../common/Avatar';
import { useToast } from '../common/Toast';

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

const COMMON_EMOJIS = ['❤️', '👍', '😂', '🔥', '😮', '😢'];

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
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  // System message styling
  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-3">
        <span className="rounded-full bg-slate-800/80 px-3 py-1 text-[11px] font-medium text-slate-400 border border-slate-700/50 select-none">
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

  const toggleAudio = (url?: string) => {
    if (!url) return;
    const audioEl = document.getElementById(`audio_${message.id}`) as HTMLAudioElement;
    if (audioEl) {
      if (isPlayingAudio) {
        audioEl.pause();
        setIsPlayingAudio(false);
      } else {
        audioEl.play();
        setIsPlayingAudio(true);
      }
    }
  };

  // Reactions summary
  const reactionsEntries = Object.entries(message.reactions || {}).filter(
    ([_, uids]) => uids.length > 0
  );

  return (
    <div
      id={`msg_${message.id}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
      }}
      className={`group relative flex gap-2 my-1.5 px-2 transition-all ${
        isSelf ? 'justify-end' : 'justify-start'
      }`}
    >
      {/* Group partner avatar */}
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
            className={`absolute -top-8 z-20 flex items-center gap-1 rounded-xl border border-slate-700/80 bg-slate-900/95 px-1.5 py-1 shadow-xl backdrop-blur-md animate-in fade-in ${
              isSelf ? 'right-0' : 'left-0'
            }`}
          >
            {/* Quick Reactions */}
            <div className="flex items-center gap-0.5 pr-1 border-r border-slate-700/60">
              {COMMON_EMOJIS.slice(0, 3).map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onReact(message.id, emoji)}
                  className="rounded-lg p-1 text-sm hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
                title="More Reactions"
              >
                <Smile className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Actions */}
            <button
              onClick={() => onReply(message)}
              className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Reply"
            >
              <Reply className="h-3.5 w-3.5" />
            </button>
            {onForward && (
              <button
                onClick={() => onForward(message)}
                className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Forward"
              >
                <Forward className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={handleCopy}
              className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Copy"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            {isSelf && message.type === 'text' && (
              <button
                onClick={() => onEdit(message)}
                className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Edit"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => onDelete(message.id, isSelf)}
              className="rounded-lg p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
              title={isSelf ? 'Delete message' : 'Delete for me'}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Extended Emoji Picker Popup */}
        {showEmojiPicker && (
          <div
            className={`absolute -top-16 z-30 flex items-center gap-1.5 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl backdrop-blur-md ${
              isSelf ? 'right-0' : 'left-0'
            }`}
          >
            {COMMON_EMOJIS.map((emoji) => (
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

        {/* Bubble Body */}
        <div
          className={`rounded-2xl px-3.5 py-2.5 shadow-sm transition-colors ${
            message.isDeleted
              ? 'italic border border-[#222d34] bg-[#111b21]/80 text-[#8696a0]'
              : isSelf
              ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-xs shadow-[#0b141a]/30'
              : 'bg-[#202c33] text-[#e9edef] rounded-tl-xs border border-[#222d34]/60'
          }`}
        >
          {/* Sender header in groups */}
          {!isSelf && isGroup && (
            <div className="mb-1 text-[11px] font-semibold text-[#25d366]">
              {senderName}
            </div>
          )}

          {/* Reply Quote Reference */}
          {message.replyTo && (
            <div
              onClick={() => onScrollToMessage && onScrollToMessage(message.replyTo!.messageId)}
              className={`mb-2 flex items-start gap-1.5 rounded-xl border-l-3 p-2 text-xs cursor-pointer select-none transition ${
                isSelf
                  ? 'border-[#25d366] bg-[#025143] text-[#e9edef] hover:bg-[#024337]'
                  : 'border-[#25d366] bg-[#111b21] text-[#8696a0] hover:bg-[#0b141a]'
              }`}
            >
              <CornerDownRight className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-[#25d366]" />
              <div className="truncate">
                <span className="font-semibold block text-[11px] text-[#25d366]">
                  {message.replyTo.senderName}
                </span>
                <span className="truncate block opacity-85">{message.replyTo.text}</span>
              </div>
            </div>
          )}

          {/* Deleted State */}
          {message.isDeleted ? (
            <span className="text-xs">🚫 This message was deleted</span>
          ) : (
            <>
              {/* Image attachment */}
              {message.type === 'image' && message.fileUrl && (
                <div className="mb-1.5 overflow-hidden rounded-xl border border-black/20">
                  <img
                    src={message.fileUrl}
                    alt={message.fileName || 'Attachment'}
                    onClick={() => onOpenMedia(message.fileUrl!, message.fileName)}
                    className="max-h-72 w-full object-cover cursor-pointer hover:scale-102 transition-transform duration-200"
                    loading="lazy"
                  />
                </div>
              )}

              {/* File attachment */}
              {message.type === 'file' && message.fileUrl && (
                <div
                  onClick={() => onOpenMedia(message.fileUrl!, message.fileName)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition ${
                    isSelf
                      ? 'border-white/20 bg-black/20 hover:bg-black/30'
                      : 'border-slate-700 bg-slate-900/60 hover:bg-slate-900'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{message.fileName || 'Document'}</p>
                    {message.fileSize && (
                      <p className="text-[10px] opacity-70">
                        {(message.fileSize / 1024).toFixed(1)} KB
                      </p>
                    )}
                  </div>
                  <Download className="h-4 w-4 opacity-80" />
                </div>
              )}

              {/* Voice Note */}
              {message.type === 'voice' && message.fileUrl && (
                <div className="flex items-center gap-3 py-1">
                  <button
                    onClick={() => toggleAudio(message.fileUrl)}
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                      isSelf
                        ? 'bg-white text-emerald-700 hover:bg-slate-100'
                        : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                    }`}
                  >
                    {isPlayingAudio ? (
                      <Pause className="h-4 w-4 fill-current" />
                    ) : (
                      <Play className="h-4 w-4 fill-current ml-0.5" />
                    )}
                  </button>

                  <audio
                    id={`audio_${message.id}`}
                    src={message.fileUrl}
                    onEnded={() => setIsPlayingAudio(false)}
                    onTimeUpdate={(e) => {
                      const audio = e.currentTarget;
                      if (audio.duration) {
                        setAudioProgress((audio.currentTime / audio.duration) * 100);
                      }
                    }}
                    className="hidden"
                  />

                  {/* Audio Wave Bar Simulation */}
                  <div className="flex-1 space-y-1">
                    <div className="h-1.5 w-32 sm:w-44 rounded-full bg-black/20 overflow-hidden">
                      <div
                        className="h-full bg-current transition-all"
                        style={{ width: `${audioProgress}%` }}
                      />
                    </div>
                    <span className="text-[10px] opacity-75 font-mono">
                      {message.audioDuration ? `${message.audioDuration}s` : 'Voice note'}
                    </span>
                  </div>
                </div>
              )}

              {/* Standard Text */}
              {message.text && message.type === 'text' && (
                <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                  {message.text}
                </p>
              )}
            </>
          )}

          {/* Footer Metadata */}
          <div
            className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
              isSelf ? 'text-emerald-100/80' : 'text-slate-400'
            }`}
          >
            {message.isEdited && <span className="text-[9px] opacity-80">Edited •</span>}
            <span>{formatTime(message.createdAt)}</span>

            {/* Read/Delivery Receipts */}
            {isSelf && (
              <span
                className="inline-flex items-center"
                title={
                  message.readBy && message.readBy.length > 1
                    ? 'Read'
                    : message.deliveredTo && message.deliveredTo.length > 1
                    ? 'Delivered'
                    : 'Sent'
                }
              >
                {message.readBy && message.readBy.length > 1 ? (
                  <CheckCheck className="h-3 w-3 text-cyan-200" />
                ) : message.deliveredTo && message.deliveredTo.length > 1 ? (
                  <CheckCheck className="h-3 w-3 text-white/70" />
                ) : (
                  <Check className="h-3 w-3 text-white/60" />
                )}
              </span>
            )}
          </div>
        </div>

        {/* Reaction Pill Counters below Bubble */}
        {reactionsEntries.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isSelf ? 'justify-end' : 'justify-start'}`}>
            {reactionsEntries.map(([emoji, uids]) => {
              const hasReacted = isSelf ? uids.includes(message.senderId) : false;
              return (
                <button
                  key={emoji}
                  onClick={() => onReact(message.id, emoji)}
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-transform active:scale-95 ${
                    hasReacted
                      ? 'border-emerald-500/50 bg-emerald-950/70 text-emerald-200'
                      : 'border-slate-700 bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="text-[10px] font-semibold">{uids.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
