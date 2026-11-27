/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Send,
  Paperclip,
  Smile,
  Mic,
  X,
  CornerDownRight,
  Image as ImageIcon,
  File as FileIcon,
  Camera,
  BarChart3,
  MapPin,
  UserCheck,
  Code2,
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { VoiceRecorderComponent } from './VoiceRecorderComponent';
import { MediaPreviewModal } from './MediaPreviewModal';
import { PollModal } from './PollModal';
import { LocationShareModal } from './LocationShareModal';
import { ContactShareModal } from './ContactShareModal';
import { Modal } from '../common/Modal';
import { compressImage } from '../../utils/imageUtils';
import { Emoji3DPicker } from '../emoji/Emoji3DPicker';
import { MessageType, UserProfile } from '../../types';
import { getConversationDraft, setConversationDraft } from '../../utils/draftUtils';

interface MessageComposerProps {
  onSendTextMessage: (text: string) => Promise<void>;
  onSendFileMessage: (
    file: File | Blob,
    type: MessageType,
    fileName: string,
    duration?: number,
    options?: { viewOnce?: boolean; caption?: string }
  ) => Promise<void>;
  maxFileSizeMb?: number;
  disabled?: boolean;
  droppedFile?: File | null;
  onClearDroppedFile?: () => void;
}

const CODE_LANGUAGES = [
  'typescript',
  'javascript',
  'python',
  'bash',
  'json',
  'sql',
  'html',
  'css',
  'go',
  'rust',
  'text',
];

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendTextMessage,
  onSendFileMessage,
  maxFileSizeMb = 25,
  disabled = false,
  droppedFile,
  onClearDroppedFile,
}) => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const {
    activeConversationId,
    activeConversation,
    userCache,
    replyingTo,
    setReplyingTo,
    emitTyping,
    uploadProgress,
    sendPollMessage,
    sendLocationMessage,
    sendContactMessage,
  } = useChat();

  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [pendingMediaFile, setPendingMediaFile] = useState<File | null>(null);
  const [pendingMediaPreview, setPendingMediaPreview] = useState<string | null>(null);
  const [isMediaPreviewOpen, setIsMediaPreviewOpen] = useState(false);

  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  // Code snippet composer modal state
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [codeLang, setCodeLang] = useState('typescript');
  const [codeContent, setCodeContent] = useState('');
  const [codeCaption, setCodeCaption] = useState('');

  // @Mention autocomplete index
  const [mentionIndex, setMentionIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const attachMenuRef = useRef<HTMLDivElement | null>(null);

  const voiceRecorder = useVoiceRecorder();

  // Restore saved draft when switching conversations
  useEffect(() => {
    const saved = getConversationDraft(user?.uid, activeConversationId);
    setText(saved);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      if (saved) {
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = `${Math.min(
              textareaRef.current.scrollHeight,
              120
            )}px`;
          }
        });
      }
    }
  }, [activeConversationId, user?.uid]);

  // Revoke object URL preview on cleanup if applicable
  useEffect(() => {
    return () => {
      if (pendingMediaPreview && pendingMediaPreview.startsWith('blob:')) {
        URL.revokeObjectURL(pendingMediaPreview);
      }
    };
  }, [pendingMediaPreview]);

  // Keep partner updated with live "recording audio..." presence while recording
  useEffect(() => {
    if (!voiceRecorder.isRecording) return;
    emitTyping(true, 'recording');
    const heartbeat = setInterval(() => {
      emitTyping(true, 'recording');
    }, 3500);
    return () => {
      clearInterval(heartbeat);
      emitTyping(false);
    };
  }, [voiceRecorder.isRecording]);

  useEffect(() => {
    if (!showAttachMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAttachMenu]);

  const validateFileSize = (file: File): boolean => {
    const limitBytes = (maxFileSizeMb || 25) * 1024 * 1024;
    if (file.size > limitBytes) {
      showToast(`File exceeds maximum upload limit (${maxFileSizeMb} MB)`, 'error');
      return false;
    }
    return true;
  };

  const openMediaFilePreview = async (file: File) => {
    if (!validateFileSize(file)) return;

    if (file.type.startsWith('video/')) {
      const blobUrl = URL.createObjectURL(file);
      setPendingMediaFile(file);
      setPendingMediaPreview(blobUrl);
      setIsMediaPreviewOpen(true);
      return;
    }

    try {
      const compressed = await compressImage(file, 1280, 0.85);
      setPendingMediaFile(compressed.file);
      setPendingMediaPreview(compressed.dataUrl);
      setIsMediaPreviewOpen(true);
    } catch {
      setPendingMediaFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPendingMediaPreview(reader.result as string);
        setIsMediaPreviewOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle drag-and-drop file handed off from ChatArea
  useEffect(() => {
    if (!droppedFile) return;
    const handleDropped = async () => {
      try {
        if (droppedFile.type.startsWith('image/') || droppedFile.type.startsWith('video/')) {
          await openMediaFilePreview(droppedFile);
        } else if (validateFileSize(droppedFile)) {
          await onSendFileMessage(droppedFile, 'file', droppedFile.name);
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to send dropped file', 'error');
      } finally {
        onClearDroppedFile?.();
      }
    };
    void handleDropped();
  }, [droppedFile]);

  // Group @mention detection at trailing token
  const mentionMatch =
    activeConversation?.type === 'group' ? text.match(/(?:^|\s)@([a-zA-Z0-9_.-]*)$/) : null;
  const mentionQuery = mentionMatch ? mentionMatch[1].toLowerCase() : null;
  const mentionSuggestions: UserProfile[] =
    mentionQuery !== null && activeConversation?.type === 'group'
      ? (activeConversation.participantIds || [])
          .filter((uid) => uid !== user?.uid)
          .map((uid) => userCache[uid])
          .filter((u): u is UserProfile => {
            if (!u) return false;
            if (!mentionQuery) return true;
            return (
              (u.username || '').toLowerCase().includes(mentionQuery) ||
              (u.displayName || '').toLowerCase().includes(mentionQuery)
            );
          })
          .slice(0, 6)
      : [];

  useEffect(() => {
    setMentionIndex(0);
  }, [mentionQuery, mentionSuggestions.length]);

  const insertMention = (member: UserProfile) => {
    const handle = member.username || member.displayName.replace(/\s+/g, '');
    const updated = text.replace(/@([a-zA-Z0-9_.-]*)$/, `@${handle} `);
    setText(updated);
    setConversationDraft(user?.uid, activeConversationId, updated);
    textareaRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextVal = e.target.value;
    setText(nextVal);
    setConversationDraft(user?.uid, activeConversationId, nextVal);
    emitTyping(nextVal.length > 0, 'typing');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % mentionSuggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        insertMention(mentionSuggestions[mentionIndex] || mentionSuggestions[0]);
        return;
      }
    }

    const enterToSend = profile?.enterToSend !== false;
    if (e.key === 'Enter' && !e.shiftKey && enterToSend) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && (item.type.startsWith('image/') || item.type.startsWith('video/'))) {
        const pastedFile = item.getAsFile();
        if (pastedFile) {
          e.preventDefault();
          const namedFile =
            pastedFile.name && pastedFile.name !== 'image.png'
              ? pastedFile
              : new File([pastedFile], `pasted_${Date.now()}.png`, {
                  type: pastedFile.type || 'image/png',
                });
          await openMediaFilePreview(namedFile);
          return;
        }
      }
    }
  };

  const handleSend = async () => {
    if (disabled || !text.trim()) return;
    const content = text;
    setText('');
    setConversationDraft(user?.uid, activeConversationId, '');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setShowEmojiPicker(false);
    await onSendTextMessage(content);
  };

  const handleEmojiClick = (emoji: string) => {
    setText((prev) => {
      const updated = prev + emoji;
      setConversationDraft(user?.uid, activeConversationId, updated);
      return updated;
    });
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setShowAttachMenu(false);
    await openMediaFilePreview(file);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setShowAttachMenu(false);
    if (!validateFileSize(file)) return;
    try {
      await onSendFileMessage(file, 'file', file.name);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to send file', 'error');
    }
  };

  const handleSendMediaWithCaption = async (
    file: File,
    caption: string,
    viewOnce: boolean
  ) => {
    const isVideo = file.type.startsWith('video/');
    try {
      await onSendFileMessage(
        file,
        isVideo ? 'video' : 'image',
        file.name,
        undefined,
        {
          viewOnce: isVideo ? false : viewOnce,
          caption: caption.trim(),
        }
      );
      setPendingMediaFile(null);
      setPendingMediaPreview(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to send media', 'error');
      throw err;
    }
  };

  const handleSendVoiceNote = async () => {
    try {
      const res = await voiceRecorder.stopRecordingAndGetBlob();
      if (res && res.blob) {
        await onSendFileMessage(
          res.blob,
          'voice',
          `voice_${Date.now()}.webm`,
          res.duration
        );
      }
    } catch (err) {
      console.error('Failed to send voice note:', err);
      showToast('Could not send voice note', 'error');
    }
  };

  return (
    <div className="relative border-t border-[#222d34] bg-[#202c33] px-2 sm:px-3.5 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] select-none flex-shrink-0 z-20">
      {/* Upload Progress Bar */}
      {uploadProgress !== null && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#111b21] overflow-hidden z-20">
          <div
            className="h-full bg-gradient-to-r from-[#25d366] to-[#128c7e] transition-all duration-200"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Reply Banner */}
      {replyingTo && (
        <div className="mb-2 flex items-center justify-between rounded-xl border border-[#25d366]/30 bg-[#111b21] p-2 px-3 text-xs text-[#25d366] animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <CornerDownRight className="h-4 w-4 text-[#25d366] flex-shrink-0" />
            <div className="truncate">
              <span className="font-semibold text-[#25d366]">
                Replying to {replyingTo.senderName}:
              </span>{' '}
              <span className="opacity-80 truncate text-[#8696a0]">
                {replyingTo.text || replyingTo.fileName || replyingTo.type}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            aria-label="Cancel reply"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8696a0] hover:text-white flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Voice Recording Mode */}
      {voiceRecorder.isRecording ? (
        <VoiceRecorderComponent
          recorderState={voiceRecorder}
          onCancel={voiceRecorder.cancelRecording}
          onStopAndSend={handleSendVoiceNote}
        />
      ) : (
        <div className="flex items-end gap-1 sm:gap-2" ref={attachMenuRef}>
          {/* 3D Emoji Picker Popup */}
          <Emoji3DPicker
            isOpen={showEmojiPicker}
            onClose={() => setShowEmojiPicker(false)}
            onSelectEmoji={handleEmojiClick}
            position={
              typeof window !== 'undefined' && window.innerWidth < 640
                ? 'bottom-sheet'
                : 'bottom-left'
            }
          />

          {/* Group @Mention Autocomplete Popover */}
          {mentionSuggestions.length > 0 && (
            <div className="absolute bottom-[4.25rem] left-3 right-3 sm:left-24 sm:right-auto sm:w-72 z-30 rounded-2xl border border-[#222d34] bg-[#182229] p-1.5 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8696a0]">
                Mention member
              </div>
              {mentionSuggestions.map((member, idx) => (
                <button
                  key={member.uid}
                  type="button"
                  onClick={() => insertMention(member)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition ${
                    idx === mentionIndex
                      ? 'bg-[#00a884]/20 text-[#25d366]'
                      : 'text-[#e9edef] hover:bg-[#202c33]'
                  }`}
                >
                  <span className="font-semibold truncate">{member.displayName}</span>
                  <span className="font-mono text-[11px] text-[#8696a0] truncate">
                    @{member.username}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* WhatsApp 2x3 Attachment Grid Sheet */}
          {showAttachMenu && (
            <div className="absolute bottom-[4.25rem] left-2 right-2 sm:left-12 sm:right-auto sm:w-80 z-30 rounded-2xl border border-[#222d34] bg-[#182229] p-3.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="flex flex-col items-center gap-1.5 rounded-xl p-2.5 text-[11px] font-medium text-[#e9edef] hover:bg-[#202c33] active:scale-95 transition"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#bf59cf]/20 text-[#bf59cf]">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <span>Gallery</span>
                </button>

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center gap-1.5 rounded-xl p-2.5 text-[11px] font-medium text-[#e9edef] hover:bg-[#202c33] active:scale-95 transition"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e0547d]/20 text-[#e0547d]">
                    <Camera className="h-5 w-5" />
                  </div>
                  <span>Camera</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-1.5 rounded-xl p-2.5 text-[11px] font-medium text-[#e9edef] hover:bg-[#202c33] active:scale-95 transition"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#53bdeb]/20 text-[#53bdeb]">
                    <FileIcon className="h-5 w-5" />
                  </div>
                  <span>Document</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAttachMenu(false);
                    setIsPollModalOpen(true);
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl p-2.5 text-[11px] font-medium text-[#e9edef] hover:bg-[#202c33] active:scale-95 transition"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ffd279]/20 text-[#ffd279]">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <span>Poll</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAttachMenu(false);
                    setIsLocationModalOpen(true);
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl p-2.5 text-[11px] font-medium text-[#e9edef] hover:bg-[#202c33] active:scale-95 transition"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#25d366]/20 text-[#25d366]">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <span>Location</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAttachMenu(false);
                    setIsContactModalOpen(true);
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl p-2.5 text-[11px] font-medium text-[#e9edef] hover:bg-[#202c33] active:scale-95 transition"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00a884]/20 text-[#00a884]">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <span>Contact</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAttachMenu(false);
                    setIsCodeModalOpen(true);
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl p-2.5 text-[11px] font-medium text-[#e9edef] hover:bg-[#202c33] active:scale-95 transition"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400">
                    <Code2 className="h-5 w-5" />
                  </div>
                  <span>Code</span>
                </button>
              </div>
            </div>
          )}

          {/* Hidden File Inputs */}
          <input
            type="file"
            ref={imageInputRef}
            accept="image/*,video/*"
            onChange={handleMediaSelect}
            className="hidden"
          />
          <input
            type="file"
            ref={cameraInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleMediaSelect}
            className="hidden"
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Action Buttons Left (min 44px touch targets) */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowAttachMenu(false);
            }}
            className="flex h-11 w-10 sm:w-11 flex-shrink-0 items-center justify-center rounded-xl text-[#8696a0] hover:bg-[#111b21] hover:text-[#e9edef] active:scale-95 transition disabled:opacity-40"
            title="Emoji"
            aria-label="Open 3D emoji picker"
          >
            <Smile className="h-5 w-5" />
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setShowAttachMenu(!showAttachMenu);
              setShowEmojiPicker(false);
            }}
            className={`flex h-11 w-10 sm:w-11 flex-shrink-0 items-center justify-center rounded-xl transition active:scale-95 disabled:opacity-40 ${
              showAttachMenu
                ? 'bg-[#00a884]/20 text-[#25d366]'
                : 'text-[#8696a0] hover:bg-[#111b21] hover:text-[#e9edef]'
            }`}
            title="Attach file, poll, location, or contact"
            aria-label="Open attachments"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setShowAttachMenu(false);
              setShowEmojiPicker(false);
              setIsCodeModalOpen(true);
            }}
            className="hidden sm:flex h-11 w-10 flex-shrink-0 items-center justify-center rounded-xl text-[#8696a0] hover:bg-[#111b21] hover:text-[#25d366] active:scale-95 transition disabled:opacity-40"
            title="Send code snippet"
            aria-label="Send code snippet"
          >
            <Code2 className="h-5 w-5" />
          </button>

          {/* Auto-growing Text Input (16px on mobile avoids iOS auto-zoom) */}
          <div className="relative flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              rows={1}
              disabled={disabled}
              value={text}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={
                disabled
                  ? 'Messaging temporarily paused'
                  : activeConversation?.type === 'group'
                  ? 'Message (@ to mention, Ctrl+V image)'
                  : 'Message (Ctrl+V image)'
              }
              className="w-full resize-none rounded-2xl border border-transparent focus:border-[#00a884]/40 bg-[#2a3942] px-3.5 sm:px-4 py-2.5 text-[16px] sm:text-xs leading-5 text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none transition max-h-32 disabled:opacity-60"
            />
          </div>

          {/* Voice Note or Send Button */}
          {text.trim() ? (
            <button
              type="button"
              disabled={disabled}
              onClick={handleSend}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#00a884] text-[#0b141a] shadow-md hover:bg-[#06cf9c] active:scale-95 transition disabled:opacity-50"
              title="Send message"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={disabled}
              onClick={voiceRecorder.startRecording}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#00a884]/15 text-[#25d366] hover:bg-[#00a884] hover:text-[#0b141a] active:scale-95 transition disabled:opacity-40"
              title="Record voice message"
              aria-label="Record voice message"
            >
              <Mic className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      {/* Media Preview Modal with View Once Toggle */}
      <MediaPreviewModal
        isOpen={isMediaPreviewOpen}
        file={pendingMediaFile}
        previewUrl={pendingMediaPreview}
        onClose={() => {
          setIsMediaPreviewOpen(false);
          setPendingMediaFile(null);
          setPendingMediaPreview(null);
        }}
        onSend={handleSendMediaWithCaption}
      />

      {/* Poll Creator Modal */}
      <PollModal
        isOpen={isPollModalOpen}
        onClose={() => setIsPollModalOpen(false)}
        onCreatePoll={sendPollMessage}
      />

      {/* Location Share Modal */}
      <LocationShareModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onShareLocation={sendLocationMessage}
      />

      {/* Contact Share Modal */}
      <ContactShareModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        onShareContact={sendContactMessage}
      />

      {/* Code Snippet Composer Modal */}
      <Modal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        title="Send Code Snippet"
        subtitle="Formatted with syntax block & one-click copy"
        maxWidth="md"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!codeContent.trim()) return;
            const prefix = codeCaption.trim() ? `${codeCaption.trim()}\n` : '';
            const payload = `${prefix}\`\`\`${codeLang}\n${codeContent.replace(/\s+$/, '')}\n\`\`\``;
            setCodeContent('');
            setCodeCaption('');
            setIsCodeModalOpen(false);
            await onSendTextMessage(payload);
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-[#8696a0] mb-1">Language</label>
              <select
                value={codeLang}
                onChange={(e) => setCodeLang(e.target.value)}
                className="w-full rounded-xl border border-[#222d34] bg-[#202c33] px-3 py-2 text-xs font-mono text-[#e9edef] focus:border-[#00a884] focus:outline-none"
              >
                {CODE_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#8696a0] mb-1">
                Note (optional)
              </label>
              <input
                type="text"
                value={codeCaption}
                onChange={(e) => setCodeCaption(e.target.value)}
                placeholder="e.g. Auth middleware fix"
                className="w-full rounded-xl border border-[#222d34] bg-[#202c33] px-3 py-2 text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#00a884] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#8696a0] mb-1">Code</label>
            <textarea
              rows={9}
              required
              autoFocus
              value={codeContent}
              onChange={(e) => setCodeContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const el = e.currentTarget;
                  const start = el.selectionStart;
                  const end = el.selectionEnd;
                  const next = `${codeContent.slice(0, start)}  ${codeContent.slice(end)}`;
                  setCodeContent(next);
                  requestAnimationFrame(() => {
                    el.selectionStart = el.selectionEnd = start + 2;
                  });
                }
              }}
              placeholder="Paste or type your code here..."
              className="w-full rounded-xl border border-[#222d34] bg-slate-950 p-3 font-mono text-xs text-slate-100 placeholder:text-slate-500 focus:border-[#00a884] focus:outline-none leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsCodeModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-[#8696a0] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!codeContent.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-[#00a884] px-4 py-2 text-xs font-bold text-[#0b141a] hover:bg-[#06cf9c] disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send Snippet</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
