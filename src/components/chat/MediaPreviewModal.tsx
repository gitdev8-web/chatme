/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Send, Smile, Crop, RotateCw, Loader2 } from 'lucide-react';

interface MediaPreviewModalProps {
  isOpen: boolean;
  file: File | null;
  previewUrl: string | null;
  onClose: () => void;
  onSend: (file: File, caption: string) => Promise<void>;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  isOpen,
  file,
  previewUrl,
  onClose,
  onSend,
}) => {
  const [caption, setCaption] = useState('');
  const [sending, setSending] = useState(false);

  if (!isOpen || !file || !previewUrl) return null;

  const handleSend = async () => {
    if (sending) return;
    setSending(true);
    try {
      await onSend(file, caption);
      setCaption('');
      onClose();
    } catch (err) {
      console.error('Error sending media:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-2 sm:p-4 backdrop-blur-xl animate-in fade-in select-none">
      <div className="relative flex h-full max-h-[640px] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-[#111b21] border border-[#222d34] shadow-2xl">
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#202c33] px-4 py-3 z-10">
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-[#8696a0] hover:bg-[#111b21] hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
          <span className="text-xs font-semibold text-white">Send Photo</span>
          <div className="w-8" />
        </div>

        {/* Media Preview Area */}
        <div className="relative flex-1 flex items-center justify-center bg-black overflow-hidden p-2">
          <img
            src={previewUrl}
            alt="Preview"
            className="max-h-full max-w-full object-contain rounded-lg shadow-md"
          />
        </div>

        {/* Caption & Send Bar */}
        <div className="border-t border-[#222d34] bg-[#202c33] p-3 px-4 flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              placeholder="Add a caption..."
              className="w-full rounded-2xl bg-[#2a3942] px-4 py-2.5 text-xs text-white placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#25d366]"
              autoFocus
            />
          </div>

          <button
            onClick={handleSend}
            disabled={sending}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white shadow-lg hover:bg-[#009374] disabled:opacity-50 transition"
            title="Send photo"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
