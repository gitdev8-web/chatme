/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
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
  Headphones,
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { VoiceRecorderComponent } from './VoiceRecorderComponent';
import { MediaPreviewModal } from './MediaPreviewModal';

const EMOJI_LIST = [
  '😀', '😂', '😍', '🔥', '👍', '❤️', '🎉', '🙌',
  '😎', '🤔', '👀', '🚀', '💯', '✨', '👋', '🙏',
  '👏', '🥳', '😭', '😇', '💡', '💬', '☕', '⚡',
];

interface MessageComposerProps {
  onSendTextMessage: (text: string) => Promise<void>;
  onSendFileMessage: (
    file: File | Blob,
    type: 'file' | 'image' | 'voice',
    fileName: string,
    duration?: number
  ) => Promise<void>;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendTextMessage,
  onSendFileMessage,
}) => {
  const { profile } = useAuth();
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

  const voiceRecorder = useVoiceRecorder();

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    emitTyping(e.target.value.length > 0);

    // Auto-adjust height
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
    if (!text.trim()) return;
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPendingImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPendingImagePreview(reader.result as string);
        setIsMediaPreviewOpen(true);
      };
      reader.readAsDataURL(file);
      setShowAttachMenu(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setShowAttachMenu(false);
      onSendFileMessage(file, 'file', file.name);
    }
  };

  const handleSendImageWithCaption = async (file: File, caption: string) => {
    await onSendFileMessage(file, 'image', caption || file.name);
    setPendingImageFile(null);
    setPendingImagePreview(null);
  };

  const handleSendVoiceNote = async () => {
    if (voiceRecorder.audioBlob) {
      await onSendFileMessage(
        voiceRecorder.audioBlob,
        'voice',
        `voice_${Date.now()}.webm`,
        voiceRecorder.recordingDuration
      );
      voiceRecorder.cancelRecording();
    }
  };

  return (
    <div className="relative border-t border-[#222d34] bg-[#202c33] px-3.5 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] select-none">
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
            onClick={() => setReplyingTo(null)}
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
          onStop={voiceRecorder.stopRecording}
          onCancel={voiceRecorder.cancelRecording}
          onSend={handleSendVoiceNote}
        />
      ) : (
        <div className="flex items-end gap-2">
          {/* Emoji Picker Popup */}
          {showEmojiPicker && (
            <div className="absolute bottom-16 left-4 z-30 grid grid-cols-8 gap-1.5 rounded-2xl border border-[#222d34] bg-[#202c33] p-3 shadow-2xl backdrop-blur-md animate-in fade-in">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(emoji)}
                  className="rounded-lg p-1.5 text-lg hover:bg-[#111b21] hover:scale-120 transition"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Attachment Popup */}
          {showAttachMenu && (
            <div className="absolute bottom-16 left-12 z-30 flex flex-col gap-1 rounded-2xl border border-[#222d34] bg-[#202c33] p-2 shadow-2xl backdrop-blur-md animate-in fade-in w-48">
              <button
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#e9edef] hover:bg-[#111b21] transition"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#bf59cf]/20 text-[#bf59cf]">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <span>Photos & Videos</span>
              </button>

              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#e9edef] hover:bg-[#111b21] transition"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e0547d]/20 text-[#e0547d]">
                  <Camera className="h-4 w-4" />
                </div>
                <span>Camera</span>
              </button>

              <button
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
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowAttachMenu(false);
            }}
            className="rounded-xl p-2.5 text-[#8696a0] hover:bg-[#111b21] hover:text-[#e9edef] transition"
            title="Emoji"
          >
            <Smile className="h-5 w-5" />
          </button>

          <button
            onClick={() => {
              setShowAttachMenu(!showAttachMenu);
              setShowEmojiPicker(false);
            }}
            className="rounded-xl p-2.5 text-[#8696a0] hover:bg-[#111b21] hover:text-[#e9edef] transition"
            title="Attach file or photo"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          {/* Auto-growing Text Input */}
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="w-full resize-none rounded-2xl border-none bg-[#2a3942] px-4 py-2.5 text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none transition max-h-32"
            />
          </div>

          {/* Voice Note or Send Button */}
          {text.trim() ? (
            <button
              onClick={handleSend}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white shadow-md hover:bg-[#009374] transition"
              title="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={voiceRecorder.startRecording}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#202c33] text-[#8696a0] hover:bg-[#00a884] hover:text-white transition"
              title="Hold to record voice message"
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
