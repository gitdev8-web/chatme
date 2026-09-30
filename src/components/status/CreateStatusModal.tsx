/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  X,
  Type,
  Image as ImageIcon,
  Palette,
  Send,
  Loader2,
  Camera,
  Smile,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { createStatusStory } from '../../services/statusService';
import { uploadFileWithProgress } from '../../services/storageService';

const BACKGROUND_COLORS = [
  '#075e54', // WhatsApp Teal
  '#128c7e', // Emerald
  '#1e3a8a', // Deep Blue
  '#581c87', // Purple
  '#831843', // Rose
  '#7c2d12', // Warm Amber
  '#14532d', // Forest
  '#0f172a', // Midnight
];

const FONTS = [
  { id: 'sans-serif', name: 'Sans' },
  { id: 'serif', name: 'Serif' },
  { id: 'monospace', name: 'Mono' },
  { id: 'cursive', name: 'Hand' },
];

const EMOJIS = ['😊', '🔥', '✨', '☕', '❤️', '🎉', '🚀', '🌴', '😎', '🙌', '💯', '🌈'];

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
  const [mode, setMode] = useState<'text' | 'image'>(initialMode);
  const [textContent, setTextContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(BACKGROUND_COLORS[0]);
  const [selectedFont, setSelectedFont] = useState(FONTS[0].id);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen || !user) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const cycleColor = () => {
    const currentIndex = BACKGROUND_COLORS.indexOf(selectedColor);
    const nextIndex = (currentIndex + 1) % BACKGROUND_COLORS.length;
    setSelectedColor(BACKGROUND_COLORS[nextIndex]);
  };

  const cycleFont = () => {
    const currentIndex = FONTS.findIndex((f) => f.id === selectedFont);
    const nextIndex = (currentIndex + 1) % FONTS.length;
    setSelectedFont(FONTS[nextIndex].id);
  };

  const handlePost = async () => {
    if (mode === 'text' && !textContent.trim()) return;
    if (mode === 'image' && !imageFile && !imagePreview) return;

    setLoading(true);
    try {
      let mediaUrl = '';
      if (mode === 'image' && imageFile) {
        const uploadRes = await uploadFileWithProgress(
          imageFile,
          `statuses/${user.uid}`,
          imageFile.name
        );
        mediaUrl = uploadRes.url || imagePreview || '';
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
      onCreated?.();
      onClose();
    } catch (err) {
      console.error('Error posting status:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative flex h-full max-h-[640px] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-[#222d34] bg-[#111b21] shadow-2xl">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-4 py-3 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold text-white">
              {mode === 'text' ? 'New Text Status' : 'New Photo Status'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode switch */}
            <button
              onClick={() => {
                setMode(mode === 'text' ? 'image' : 'text');
                if (mode === 'text' && !imagePreview) {
                  fileInputRef.current?.click();
                }
              }}
              className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/20 transition"
            >
              {mode === 'text' ? <ImageIcon className="h-3.5 w-3.5" /> : <Type className="h-3.5 w-3.5" />}
              <span>{mode === 'text' ? 'Photo' : 'Text'}</span>
            </button>

            {mode === 'text' && (
              <>
                <button
                  onClick={cycleFont}
                  className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition"
                  title="Change font"
                >
                  <Type className="h-4 w-4" />
                </button>
                <button
                  onClick={cycleColor}
                  className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition"
                  title="Change background color"
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
              className="flex h-full w-full flex-col items-center justify-center p-6 text-center transition-colors duration-300 relative"
              style={{ backgroundColor: selectedColor }}
            >
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Type a status..."
                maxLength={300}
                rows={5}
                className="w-full resize-none bg-transparent text-center text-2xl font-bold text-white placeholder:text-white/60 focus:outline-none"
                style={{ fontFamily: selectedFont }}
                autoFocus
              />

              {/* Emoji bar */}
              <div className="absolute bottom-4 flex flex-wrap justify-center gap-2 px-4">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setTextContent((prev) => prev + emoji)}
                    className="rounded-full bg-black/20 p-1.5 text-lg backdrop-blur hover:scale-125 transition"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-black relative">
              {imagePreview ? (
                <div className="relative h-full w-full flex items-center justify-center">
                  <img
                    src={imagePreview}
                    alt="Status preview"
                    className="max-h-full max-w-full object-contain"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute top-4 right-4 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition"
                    title="Choose different photo"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center cursor-pointer p-8 text-center text-slate-400 hover:text-white transition"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 mb-3">
                    <ImageIcon className="h-8 w-8 text-[#25d366]" />
                  </div>
                  <p className="text-sm font-semibold text-white">Tap to choose a photo</p>
                  <p className="text-xs text-slate-400 mt-1">JPEG, PNG, GIF up to 20MB</p>
                </div>
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
        <div className="border-t border-white/10 bg-[#202c33] p-3 px-4 flex items-center gap-2">
          {mode === 'image' && (
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="flex-1 rounded-2xl bg-[#2a3942] px-4 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none"
            />
          )}

          <button
            onClick={handlePost}
            disabled={loading || (mode === 'text' && !textContent.trim()) || (mode === 'image' && !imagePreview)}
            className="ml-auto flex items-center gap-2 rounded-full bg-[#00a884] px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-[#009374] disabled:opacity-50 transition"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Post Status</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
