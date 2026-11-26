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
import { compressImage } from '../../utils/imageUtils';
import { Emoji3DPicker } from '../emoji/Emoji3DPicker';
import { MessageType } from '../../types';

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
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendTextMessage,
  onSendFileMessage,
  maxFileSizeMb = 25,
  disabled = false,
}) => {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const {
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
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [isMediaPreviewOpen, setIsMediaPreviewOpen] = useState(false);

  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const attachMenuRef = useRef<HTMLDivElement | null>(null);

  const voiceRecorder = useVoiceRecorder();

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

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    emitTyping(e.target.value.length > 0, 'typing');

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

  const handleSendImageWithCaption = async (
    file: File,
    caption: string,
    viewOnce: boolean
  ) => {
    await onSendFileMessage(file, 'image', file.name, undefined, {
      viewOnce,
      caption: caption.trim(),
    });
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

          {/* WhatsApp 2x3 Attachment Grid Sheet */}
          {showAttachMenu && (
            <div className="absolute bottom-[4.25rem] left-2 right-2 sm:left-12 sm:right-auto sm:w-72 z-30 rounded-2xl border border-[#222d34] bg-[#182229] p-3.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
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
              </div>
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

          {/* Auto-growing Text Input (16px on mobile avoids iOS auto-zoom) */}
          <div className="relative flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              rows={1}
              disabled={disabled}
              value={text}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={disabled ? 'Messaging temporarily paused' : 'Message'}
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
        file={pendingImageFile}
        previewUrl={pendingImagePreview}
        onClose={() => {
          setIsMediaPreviewOpen(false);
          setPendingImageFile(null);
          setPendingImagePreview(null);
        }}
        onSend={handleSendImageWithCaption}
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
    </div>
  );
};
