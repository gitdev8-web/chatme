/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Type,
  Image as ImageIcon,
  Palette,
  Send,
  Loader2,
  Camera,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { createStatusStory } from '../../services/statusService';
import { uploadFileWithProgress } from '../../services/storageService';
import { compressImage } from '../../utils/imageUtils';
import { Emoji3DImage } from '../emoji/Emoji3DImage';

const BACKGROUND_PRESETS = [
  'linear-gradient(135deg, #075e54 0%, #00a884 100%)',
  'linear-gradient(135deg, #0b141a 0%, #124e42 100%)',
  'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)',
  'linear-gradient(135deg, #3b0764 0%, #7e22ce 100%)',
  'linear-gradient(135deg, #4c0519 0%, #be123c 100%)',
  'linear-gradient(135deg, #431407 0%, #b45309 100%)',
  'linear-gradient(135deg, #052e16 0%, #15803d 100%)',
  'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
];

const FONTS = [
  { id: 'sans-serif', name: 'Clean' },
  { id: 'serif', name: 'Classic' },
  { id: 'monospace', name: 'Code' },
  { id: 'cursive', name: 'Script' },
];

const QUICK_EMOJIS = ['🔥', '✨', '🚀', '❤️', '😂', '😎', '🎉', '🙌', '💯', '☕', '🌴', '🌈'];

interface CreateStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
  initialMode?: 'text' | 'image';
}

export const CreateStatusModal: React.FC<CreateStatusModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  initialMode = 'text',
}) => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState<'text' | 'image'>(initialMode);
  const [textContent, setTextContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(BACKGROUND_PRESETS[0]);
  const [selectedFont, setSelectedFont] = useState(FONTS[0].id);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync mode whenever modal opens with a specific mode ('text' vs 'image')
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    } else {
      setTextContent('');
      setImageFile(null);
      setImagePreview(null);
      setCaption('');
      setLoading(false);
    }
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      e.target.value = '';
      try {
        const compressed = await compressImage(file, 900, 0.76);
        setImageFile(compressed.file);
        setImagePreview(compressed.dataUrl);
      } catch {
        setImageFile(file);
        const reader = new FileReader();
        reader.onload = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const cycleColor = () => {
    const currentIndex = BACKGROUND_PRESETS.indexOf(selectedColor);
    const nextIndex = (currentIndex + 1) % BACKGROUND_PRESETS.length;
    setSelectedColor(BACKGROUND_PRESETS[nextIndex]);
  };

  const cycleFont = () => {
    const currentIndex = FONTS.findIndex((f) => f.id === selectedFont);
    const nextIndex = (currentIndex + 1) % FONTS.length;
    setSelectedFont(FONTS[nextIndex].id);
  };

  const currentFontLabel = FONTS.find((f) => f.id === selectedFont)?.name || 'Clean';

  const handlePost = async () => {
    if (mode === 'text' && !textContent.trim()) return;
    if (mode === 'image' && !imageFile && !imagePreview) return;

    setLoading(true);
    try {
      let mediaUrl = '';
      if (mode === 'image') {
        if (imageFile) {
          const uploadRes = await uploadFileWithProgress(
            imageFile,
            `statuses/${user.uid}`,
            imageFile.name
          );
          mediaUrl = uploadRes.url || imagePreview || '';
        } else if (imagePreview) {
          mediaUrl = imagePreview;
        }
      }

      await createStatusStory(
        user.uid,
        profile?.displayName || user.displayName || 'User',
        profile?.photoURL || user.photoURL || '',
        mode,
        {
          text: textContent.trim(),
          caption: caption.trim(),
          mediaUrl,
          backgroundColor: selectedColor,
          fontFamily: selectedFont,
        }
      );

      setTextContent('');
      setImageFile(null);
      setImagePreview(null);
      setCaption('');
      showToast('Status update posted!', 'success');
      onCreated?.();
      onClose();
    } catch (err) {
      console.error('Error posting status:', err);
      showToast('Could not publish status. Try a smaller image.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 sm:p-4 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative flex h-[100dvh] sm:h-[640px] sm:max-h-[90dvh] w-full sm:max-w-md flex-col overflow-hidden rounded-none sm:rounded-3xl border-0 sm:border border-[#222d34] bg-[#0b141a] shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-black/45 px-3 sm:px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-md z-10">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close status creator"
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/85 hover:bg-white/10 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold text-white truncate">
              {mode === 'text' ? 'Text Status' : 'Photo Status'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Mode Switch */}
            <button
              type="button"
              onClick={() => {
                const nextMode = mode === 'text' ? 'image' : 'text';
                setMode(nextMode);
                if (nextMode === 'image' && !imagePreview) {
                  setTimeout(() => fileInputRef.current?.click(), 50);
                }
              }}
              className="flex min-h-[38px] items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25 transition"
            >
              {mode === 'text' ? (
                <ImageIcon className="h-3.5 w-3.5" />
              ) : (
                <Type className="h-3.5 w-3.5" />
              )}
              <span>{mode === 'text' ? 'Photo' : 'Text'}</span>
            </button>

            {mode === 'text' && (
              <>
                <button
                  type="button"
                  onClick={cycleFont}
                  className="flex min-h-[38px] items-center gap-1 rounded-xl bg-white/15 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-white/25 transition"
                  title="Change font style"
                >
                  <Type className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">{currentFontLabel}</span>
                </button>
                <button
                  type="button"
                  onClick={cycleColor}
                  aria-label="Cycle background theme"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white hover:bg-white/25 transition"
                  title="Change background"
                >
                  <Palette className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="relative flex-1 overflow-hidden flex items-center justify-center">
          {mode === 'text' ? (
            <div
              className="flex h-full w-full flex-col items-center justify-center p-6 text-center transition-all duration-300 relative"
              style={{ background: selectedColor }}
            >
              {/* Color Swatch Strip */}
              <div className="absolute top-3 left-0 right-0 flex justify-center gap-2 px-4">
                {BACKGROUND_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setSelectedColor(preset)}
                    aria-label="Select background preset"
                    className={`h-6 w-6 rounded-full border-2 transition-transform ${
                      selectedColor === preset
                        ? 'border-white scale-115 shadow-md'
                        : 'border-white/40 hover:scale-105'
                    }`}
                    style={{ background: preset }}
                  />
                ))}
              </div>

              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Type a status..."
                maxLength={280}
                rows={5}
                className="w-full resize-none bg-transparent text-center text-2xl sm:text-3xl font-bold text-white placeholder:text-white/55 focus:outline-none leading-snug"
                style={{ fontFamily: selectedFont }}
                autoFocus
              />

              <span className="tabular-nums text-[11px] font-medium text-white/60 mt-2">
                {textContent.length} / 280
              </span>

              {/* 3D Emoji Quick Bar */}
              <div className="absolute bottom-3 left-0 right-0 flex items-center justify-start sm:justify-center gap-1.5 px-4 overflow-x-auto no-scrollbar">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setTextContent((prev) => prev + emoji)}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-black/25 backdrop-blur-sm hover:scale-115 active:scale-95 transition"
                  >
                    <Emoji3DImage char={emoji} size="md" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-black relative">
              {imagePreview ? (
                <div className="relative h-full w-full flex items-center justify-center p-2">
                  <img
                    src={imagePreview}
                    alt="Status preview"
                    className="max-h-full max-w-full rounded-2xl object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute top-4 right-4 flex h-10 items-center gap-1.5 rounded-xl bg-black/70 border border-white/15 px-3 text-xs font-semibold text-white hover:bg-black/90 transition"
                    title="Choose different photo"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Change</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center cursor-pointer p-8 text-center text-[#8696a0] hover:text-white transition"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00a884]/15 border border-[#00a884]/30 mb-3">
                    <ImageIcon className="h-8 w-8 text-[#25d366]" />
                  </div>
                  <p className="text-sm font-semibold text-white">Tap to choose a photo</p>
                  <p className="text-xs text-[#8696a0] mt-1">
                    Automatically optimized for fast sharing
                  </p>
                </button>
              )}
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 bg-[#182229] px-3.5 sm:px-4 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] flex items-center gap-2.5">
          {mode === 'image' && (
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="flex-1 rounded-xl border border-[#222d34] bg-[#2a3942] px-3.5 py-2.5 text-[16px] sm:text-xs text-white placeholder:text-[#8696a0] focus:border-[#00a884] focus:outline-none"
            />
          )}

          <button
            type="button"
            onClick={handlePost}
            disabled={
              loading ||
              (mode === 'text' && !textContent.trim()) ||
              (mode === 'image' && !imagePreview)
            }
            className="ml-auto flex min-h-[44px] items-center gap-2 rounded-xl bg-[#00a884] px-5 py-2.5 text-xs font-bold text-[#0b141a] shadow-lg hover:bg-[#06cf9c] active:scale-[0.98] disabled:opacity-45 transition"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Share Status</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
