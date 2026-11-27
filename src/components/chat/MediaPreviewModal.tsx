/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Send, Loader2, Timer } from 'lucide-react';

interface MediaPreviewModalProps {
  isOpen: boolean;
  file: File | null;
  previewUrl: string | null;
  onClose: () => void;
  onSend: (file: File, caption: string, viewOnce: boolean) => Promise<void>;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  isOpen,
  file,
  previewUrl,
  onClose,
  onSend,
}) => {
  const [caption, setCaption] = useState('');
  const [viewOnce, setViewOnce] = useState(false);
  const [sending, setSending] = useState(false);

  if (!isOpen || !file || !previewUrl) return null;

  const isVideo = file.type.startsWith('video/');

  const handleSend = async () => {
    if (sending) return;
    setSending(true);
    try {
      await onSend(file, caption, isVideo ? false : viewOnce);
      setCaption('');
      setViewOnce(false);
      onClose();
    } catch (err) {
      console.error('Error sending media:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-0 sm:p-4 backdrop-blur-xl animate-in fade-in select-none">
      <div className="relative flex h-[100dvh] sm:h-full sm:max-h-[660px] w-full max-w-lg flex-col overflow-hidden sm:rounded-3xl bg-[#111b21] sm:border border-[#222d34] shadow-2xl">
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#202c33] px-4 py-3 z-10 safe-top">
          <button
            type="button"
            onClick={onClose}
            aria-label={isVideo ? 'Cancel video' : 'Cancel photo'}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#8696a0] hover:bg-[#111b21] hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="text-center">
            <span className="text-xs font-semibold text-white block">
              {isVideo ? 'Send Video' : 'Send Photo'}
            </span>
            {viewOnce && !isVideo && (
              <span className="text-[10px] font-semibold text-[#25d366]">
                View once enabled
              </span>
            )}
          </div>
          <div className="w-10" />
        </div>

        {/* Media Preview Area */}
        <div className="relative flex-1 flex items-center justify-center bg-black overflow-hidden p-3">
          {isVideo ? (
            <video
              src={previewUrl}
              controls
              playsInline
              className="max-h-full max-w-full rounded-xl shadow-md"
            />
          ) : (
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-full max-w-full object-contain rounded-xl shadow-md"
            />
          )}
        </div>

        {/* Caption, View-Once Toggle & Send Bar */}
        <div className="border-t border-[#222d34] bg-[#202c33] px-3 sm:px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-2">
          <div className="relative flex-1 flex items-center gap-1.5 rounded-2xl bg-[#2a3942] px-3 py-1.5">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              placeholder="Add a caption..."
              className="w-full bg-transparent py-1.5 text-[16px] sm:text-xs text-white placeholder:text-[#8696a0] focus:outline-none"
              autoFocus
            />

            {/* View Once Toggle (for photos) */}
            {!isVideo && (
              <button
                type="button"
                onClick={() => setViewOnce((v) => !v)}
                title={viewOnce ? 'View once enabled' : 'Set as View Once photo'}
                aria-label="Toggle View Once photo"
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border transition ${
                  viewOnce
                    ? 'border-[#25d366] bg-[#00a884] text-[#0b141a] font-black shadow'
                    : 'border-[#8696a0]/40 text-[#8696a0] hover:text-white hover:border-white/50'
                }`}
              >
                {viewOnce ? (
                  <span className="text-xs font-extrabold">1</span>
                ) : (
                  <Timer className="h-4 w-4" />
                )}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#00a884] text-[#0b141a] shadow-lg hover:bg-[#06cf9c] disabled:opacity-50 transition active:scale-95"
            title={isVideo ? 'Send video' : 'Send photo'}
            aria-label={isVideo ? 'Send video' : 'Send photo'}
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
