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
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { VoiceRecorderComponent } from './VoiceRecorderComponent';
import { MediaPreviewModal } from './MediaPreviewModal';
import { compressImage } from '../../utils/imageUtils';
import { Emoji3DPicker } from '../emoji/Emoji3DPicker';

interface MessageComposerProps {
  onSendTextMessage: (text: string) => Promise<void>;
  onSendFileMessage: (
    file: File | Blob,
    type: 'file' | 'image' | 'voice',
    fileName: string,
    duration?: number
  ) => Promise<void>;
  maxFileSizeMb?: number;
  disabled?: boolean;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendTextMessage,
  onSendFileMessage,
  maxFileSizeMb = 25,
  disabled = false,
}) => {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const { replyingTo, setReplyingTo, emitTyping, uploadProgress } = useChat();
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [isMediaPreviewOpen, setIsMediaPreviewOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const attachMenuRef = useRef<HTMLDivElement | null>(null);

  const voiceRecorder = useVoiceRecorder();

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

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    emitTyping(e.target.value.length > 0);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const enterToSend = profile?.enterToSend !== false;
    if (e.key === 'Enter' && !e.shiftKey && enterToSend) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (disabled || !text.trim()) return;
    const content = text;
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setShowEmojiPicker(false);
    await onSendTextMessage(content);
  };

  const handleEmojiClick = (emoji: string) => {
    setText((prev) => prev + emoji);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      e.target.value = '';
      setShowAttachMenu(false);
      if (!validateFileSize(file)) return;
      try {
        const compressed = await compressImage(file, 1280, 0.85);
        setPendingImageFile(compressed.file);
        setPendingImagePreview(compressed.dataUrl);
        setIsMediaPreviewOpen(true);
      } catch {
        setPendingImageFile(file);
        const reader = new FileReader();
        reader.onload = () => {
          setPendingImagePreview(reader.result as string);
          setIsMediaPreviewOpen(true);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      e.target.value = '';
      setShowAttachMenu(false);
      if (!validateFileSize(file)) return;
      onSendFileMessage(file, 'file', file.name);
    }
  };

  const handleSendImageWithCaption = async (file: File, caption: string) => {
    await onSendFileMessage(file, 'image', caption || file.name);
    setPendingImageFile(null);
    setPendingImagePreview(null);
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
    }
  };

  return (
    <div className="relative border-t border-[#222d34] bg-[#202c33] px-2.5 sm:px-3.5 pt-2 sm:pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] select-none flex-shrink-0 z-20">
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
          <div className="flex items-center gap-2 truncate">
            <CornerDownRight className="h-4 w-4 text-[#25d366] flex-shrink-0" />
            <div className="truncate">
              <span className="font-semibold text-[#25d366]">
                Replying to {replyingTo.senderName}:
              </span>{' '}
              <span className="opacity-80 truncate text-[#8696a0]">{replyingTo.text}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            aria-label="Cancel reply"
            className="rounded p-1 text-[#8696a0] hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
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
        <div className="flex items-end gap-1.5 sm:gap-2" ref={attachMenuRef}>
          {/* 3D Emoji Picker Popup */}
          <Emoji3DPicker
            isOpen={showEmojiPicker}
            onClose={() => setShowEmojiPicker(false)}
            onSelectEmoji={handleEmojiClick}
            position={typeof window !== 'undefined' && window.innerWidth < 640 ? 'bottom-sheet' : 'bottom-left'}
          />

          {/* Attachment Popup */}
          {showAttachMenu && (
            <div className="absolute bottom-16 left-12 z-30 flex flex-col gap-1 rounded-2xl border border-[#222d34] bg-[#202c33] p-2 shadow-2xl backdrop-blur-md animate-in fade-in w-48">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#e9edef] hover:bg-[#111b21] transition"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#bf59cf]/20 text-[#bf59cf]">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <span>Photos & Videos</span>
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#e9edef] hover:bg-[#111b21] transition"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e0547d]/20 text-[#e0547d]">
                  <Camera className="h-4 w-4" />
                </div>
                <span>Camera</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#e9edef] hover:bg-[#111b21] transition"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#53bdeb]/20 text-[#53bdeb]">
                  <FileIcon className="h-4 w-4" />
                </div>
                <span>Document</span>
              </button>
            </div>
          )}

          {/* Hidden File Inputs */}
          <input
            type="file"
            ref={imageInputRef}
            accept="image/*,video/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <input
            type="file"
            ref={cameraInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleImageSelect}
            className="hidden"
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Action Buttons Left */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowAttachMenu(false);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[#8696a0] hover:bg-[#111b21] hover:text-[#e9edef] transition disabled:opacity-40"
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
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[#8696a0] hover:bg-[#111b21] hover:text-[#e9edef] transition disabled:opacity-40"
            title="Attach file or photo"
            aria-label="Attach file or photo"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          {/* Auto-growing Text Input */}
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              rows={1}
              disabled={disabled}
              value={text}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={disabled ? 'Messaging temporarily paused' : 'Type a message...'}
              className="w-full resize-none rounded-2xl border border-transparent focus:border-[#00a884]/40 bg-[#2a3942] px-3.5 sm:px-4 py-2.5 text-[15px] sm:text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none transition max-h-32 disabled:opacity-60"
            />
          </div>

          {/* Voice Note or Send Button */}
          {text.trim() ? (
            <button
              type="button"
              disabled={disabled}
              onClick={handleSend}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#00a884] text-[#0b141a] shadow-md hover:bg-[#06cf9c] active:scale-95 transition disabled:opacity-50"
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
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#111b21]/60 text-[#8696a0] hover:bg-[#00a884] hover:text-[#0b141a] transition disabled:opacity-40"
              title="Record voice message"
              aria-label="Record voice message"
            >
              <Mic className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Media Preview Modal */}
      <MediaPreviewModal
        isOpen={isMediaPreviewOpen}
        file={pendingImageFile}
        previewUrl={pendingImagePreview}
        onClose={() => {
          setIsMediaPreviewOpen(false);
          setPendingImageFile(null);
          setPendingImagePreview(null);
        }}
        onSend={handleSendImageWithCaption}
      />
    </div>
  );
};
