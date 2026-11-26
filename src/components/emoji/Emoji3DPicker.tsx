/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, Star, Clock, X, Sparkles } from 'lucide-react';
import {
  EMOJI_3D_PACK,
  EMOJI_CATEGORIES,
  Emoji3DItem,
  EMOJI_3D_CHAR_MAP,
} from '../../data/emoji3DData';
import { Emoji3DImage } from './Emoji3DImage';

interface Emoji3DPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emojiChar: string) => void;
  position?: 'bottom-left' | 'bottom-right' | 'bottom-sheet';
}

const SKIN_TONE_MODIFIERS = [
  { label: 'Default', value: '' },
  { label: 'Light', value: '🏻' },
  { label: 'Medium-Light', value: '🏼' },
  { label: 'Medium', value: '🏽' },
  { label: 'Medium-Dark', value: '🏾' },
  { label: 'Dark', value: '🏿' },
];

export const Emoji3DPicker: React.FC<Emoji3DPickerProps> = ({
  isOpen,
  onClose,
  onSelectEmoji,
  position = 'bottom-left',
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('smileys');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [favoriteEmojis, setFavoriteEmojis] = useState<string[]>([]);
  const [selectedSkinTone, setSelectedSkinTone] = useState<string>('');

  const pickerRef = useRef<HTMLDivElement | null>(null);

  // Load Recent & Favorites from localStorage
  useEffect(() => {
    try {
      const rec = localStorage.getItem('devchat_recent_emojis');
      if (rec) setRecentEmojis(JSON.parse(rec));
      const fav = localStorage.getItem('devchat_favorite_emojis');
      if (fav) setFavoriteEmojis(JSON.parse(fav));
    } catch {
      // Ignore
    }
  }, []);

  // Close picker on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePickEmoji = (char: string) => {
    // Apply skin tone modifier if applicable and skin tone is chosen
    let finalChar = char;
    if (selectedSkinTone) {
      finalChar = char + selectedSkinTone;
    }

    // Update Recent Emojis (max 18 items)
    const updatedRecent = [char, ...recentEmojis.filter((c) => c !== char)].slice(0, 18);
    setRecentEmojis(updatedRecent);
    try {
      localStorage.setItem('devchat_recent_emojis', JSON.stringify(updatedRecent));
    } catch {
      // Ignore
    }

    onSelectEmoji(finalChar);
  };

  const toggleFavorite = (char: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updated: string[];
    if (favoriteEmojis.includes(char)) {
      updated = favoriteEmojis.filter((c) => c !== char);
    } else {
      updated = [char, ...favoriteEmojis];
    }
    setFavoriteEmojis(updated);
    try {
      localStorage.setItem('devchat_favorite_emojis', JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  // Filter emojis based on activeCategory and searchQuery
  let displayedEmojis: Emoji3DItem[] = [];

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    displayedEmojis = EMOJI_3D_PACK.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.keywords.some((kw) => kw.toLowerCase().includes(q))
    );
  } else if (activeCategory === 'recent') {
    displayedEmojis = recentEmojis
      .map((char) => EMOJI_3D_CHAR_MAP.get(char))
      .filter(Boolean) as Emoji3DItem[];
  } else if (activeCategory === 'favorites') {
    displayedEmojis = favoriteEmojis
      .map((char) => EMOJI_3D_CHAR_MAP.get(char))
      .filter(Boolean) as Emoji3DItem[];
  } else {
    displayedEmojis = EMOJI_3D_PACK.filter((item) => item.category === activeCategory);
  }

  return (
    <div
      ref={pickerRef}
      className={`z-50 flex flex-col bg-[#111b21] dark:bg-[#111b21] border border-[#222d34] shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in duration-200 select-none ${
        position === 'bottom-sheet'
          ? 'fixed inset-x-0 bottom-0 max-h-[75dvh] rounded-t-3xl border-t border-[#00a884]/40 pb-[env(safe-area-inset-bottom)]'
          : 'absolute bottom-14 left-0 w-[340px] sm:w-[380px] max-h-[460px] rounded-2xl zoom-in-95'
      }`}
    >
      {/* Mobile Drag Handle */}
      {position === 'bottom-sheet' && (
        <div className="flex justify-center pt-2 pb-1 bg-[#202c33] flex-shrink-0">
          <div className="h-1 w-10 rounded-full bg-[#374248]" />
        </div>
      )}

      {/* Top Header & Search Bar */}
      <div className="p-3 border-b border-[#222d34] bg-[#202c33] space-y-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#25d366]" />
            <h3 className="text-xs font-bold text-[#e9edef]">3D Emoji Collection</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close emoji picker"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#8696a0] hover:text-[#e9edef] hover:bg-[#111b21] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8696a0]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search realistic 3D emojis (e.g. love, fire, party)..."
            className="w-full rounded-xl bg-[#111b21] border border-[#222d34] pl-9 pr-3 py-2 text-[15px] sm:text-xs text-[#e9edef] placeholder-[#8696a0] focus:border-[#00a884] focus:outline-none transition"
          />
        </div>

        {/* Skin Tone Selector */}
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[10px] text-[#8696a0] uppercase font-semibold tracking-wider">
            Skin Tone
          </span>
          <div className="flex items-center gap-1">
            {SKIN_TONE_MODIFIERS.map((st) => (
              <button
                key={st.label}
                type="button"
                onClick={() => setSelectedSkinTone(st.value)}
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs transition border ${
                  selectedSkinTone === st.value
                    ? 'border-[#25d366] ring-1 ring-[#25d366]'
                    : 'border-transparent hover:border-[#8696a0]'
                }`}
                title={st.label}
              >
                {st.value || '✋'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Emoji Grid Display Area */}
      <div className="flex-1 overflow-y-auto p-3 no-scrollbar min-h-[220px]">
        {displayedEmojis.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-xs text-[#8696a0]">
            <p>No 3D emojis found</p>
            <p className="text-[10px] mt-1 text-[#8696a0]/70">
              {activeCategory === 'recent'
                ? 'Your recently used emojis will appear here.'
                : activeCategory === 'favorites'
                ? 'Star any emoji to add it to your favorites.'
                : 'Try searching for another keyword.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-6 sm:grid-cols-7 gap-1.5 sm:gap-2">
            {displayedEmojis.map((emoji) => {
              const isFav = favoriteEmojis.includes(emoji.char);
              return (
                <div
                  key={emoji.id}
                  onClick={() => handlePickEmoji(emoji.char)}
                  className="group relative flex min-h-[44px] items-center justify-center p-2 rounded-xl hover:bg-[#202c33] active:scale-90 cursor-pointer transition border border-transparent hover:border-[#00a884]/40"
                  title={emoji.name}
                >
                  <Emoji3DImage char={emoji.char} size="lg" />

                  {/* Favorite Star Badge */}
                  <button
                    type="button"
                    onClick={(e) => toggleFavorite(emoji.char, e)}
                    aria-label="Toggle favorite emoji"
                    className={`absolute top-0.5 right-0.5 p-0.5 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition ${
                      isFav ? 'opacity-100 text-amber-400' : 'text-[#8696a0] hover:text-amber-400'
                    }`}
                  >
                    <Star className={`h-2.5 w-2.5 ${isFav ? 'fill-amber-400' : ''}`} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Category Tabs Footer */}
      <div className="flex items-center justify-between p-2 border-t border-[#222d34] bg-[#202c33] overflow-x-auto no-scrollbar flex-shrink-0">
        {EMOJI_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id && !searchQuery;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory(cat.id);
              }}
              className={`min-h-[40px] min-w-[40px] flex items-center justify-center p-2 rounded-xl text-sm transition flex-shrink-0 ${
                isActive
                  ? 'bg-[#00a884] text-white shadow-sm ring-2 ring-[#25d366]/40'
                  : 'text-[#8696a0] hover:text-[#e9edef] hover:bg-[#111b21]'
              }`}
              title={cat.label}
            >
              {cat.icon}
            </button>
          );
        })}
      </div>
    </div>
  );
};
