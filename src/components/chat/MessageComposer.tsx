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
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { VoiceRecorderComponent } from './VoiceRecorderComponent';

const EMOJI_LIST = [
  '😀', '😂', '😍', '🔥', '👍', '❤️', '🎉', '🙌',
  '😎', '🤔', '👀', '🚀', '💯', '✨', '👋', '🙏',
  '👏', '🥳', '😭', '😇', '💡', '💬', '☕', '⚡',
];

interface MessageComposerProps {
  onSendTextMessage: (text: string) => Promise<void>;
  onSendFileMessage: (file: File | Blob, type: 'file' | 'image' | 'voice', fileName: string, duration?: number) => Promise<void>;
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isImage = false) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setShowAttachMenu(false);
      onSendFileMessage(file, isImage ? 'image' : 'file', file.name);
    }
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
    <div className="relative border-t border-slate-800/80 bg-slate-900/95 px-4 py-3 select-none">
      {/* Upload Progress Bar */}
      {uploadProgress !== null && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-200"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Reply Banner */}
      {replyingTo && (
        <div className="mb-2 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-2 px-3 text-xs text-emerald-200 animate-in fade-in">
          <div className="flex items-center gap-2 truncate">
            <CornerDownRight className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <div className="truncate">
              <span className="font-semibold text-emerald-300">
                Replying to {replyingTo.senderName}:
              </span>{' '}
              <span className="opacity-80 truncate">{replyingTo.text}</span>
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="rounded p-1 text-emerald-400 hover:text-white"
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
            <div className="absolute bottom-16 left-4 z-30 grid grid-cols-8 gap-1.5 rounded-2xl border border-slate-700 bg-slate-900 p-3 shadow-2xl backdrop-blur-md animate-in fade-in">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(emoji)}
                  className="rounded-lg p-1.5 text-lg hover:bg-slate-800 hover:scale-120 transition"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Attachment Popup */}
          {showAttachMenu && (
            <div className="absolute bottom-16 left-12 z-30 flex flex-col gap-1 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl backdrop-blur-md animate-in fade-in w-40">
              <button
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition"
              >
                <ImageIcon className="h-4 w-4 text-emerald-400" />
                <span>Photos & Media</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition"
              >
                <FileIcon className="h-4 w-4 text-cyan-400" />
                <span>Document</span>
              </button>
            </div>
          )}

          {/* Hidden File Inputs */}
          <input
            type="file"
            ref={imageInputRef}
            accept="image/*"
            onChange={(e) => handleFileSelect(e, true)}
            className="hidden"
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileSelect(e, false)}
            className="hidden"
          />

          {/* Action Buttons Left */}
          <button
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowAttachMenu(false);
            }}
            className="rounded-xl p-2.5 text-slate-400 hover:bg-slate-800 hover:text-emerald-400 transition"
            title="Emoji"
          >
            <Smile className="h-5 w-5" />
          </button>

          <button
            onClick={() => {
              setShowAttachMenu(!showAttachMenu);
              setShowEmojiPicker(false);
            }}
            className="rounded-xl p-2.5 text-slate-400 hover:bg-slate-800 hover:text-cyan-400 transition"
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
              className="w-full resize-none rounded-2xl border border-slate-700/80 bg-slate-800/70 px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition max-h-32"
            />
          </div>

          {/* Voice Note or Send Button */}
          {text.trim() ? (
            <button
              onClick={handleSend}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-950/40 hover:from-emerald-400 hover:to-teal-400 transition"
              title="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={voiceRecorder.startRecording}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-slate-300 hover:bg-emerald-600 hover:text-white transition"
              title="Hold to record voice message"
            >
              <Mic className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
