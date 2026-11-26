/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { Modal } from '../common/Modal';
import {
  CHAT_WALLPAPERS,
  ChatWallpaperId,
  getSavedWallpaper,
  setSavedWallpaper,
} from '../../utils/wallpaperUtils';
import { useToast } from '../common/Toast';

interface WallpaperModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WallpaperModal: React.FC<WallpaperModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { showToast } = useToast();
  const [selected, setSelected] = useState<ChatWallpaperId>(() => getSavedWallpaper());

  const handleSelect = (id: ChatWallpaperId, label: string) => {
    setSelected(id);
    setSavedWallpaper(id);
    showToast(`Chat wallpaper set to ${label}`, 'success');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chat Wallpaper"
      subtitle="Choose a backdrop style for your conversations"
      maxWidth="sm"
    >
      <div className="grid grid-cols-2 gap-3">
        {CHAT_WALLPAPERS.map((wp) => {
          const isActive = selected === wp.id;
          return (
            <button
              key={wp.id}
              type="button"
              onClick={() => handleSelect(wp.id, wp.label)}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border text-left transition ${
                isActive
                  ? 'border-[#00a884] ring-2 ring-[#00a884]/40'
                  : 'border-[#222d34] hover:border-[#00a884]/50'
              }`}
            >
              <div
                className="h-24 w-full relative flex flex-col justify-between p-2.5"
                style={{ background: wp.previewBg }}
              >
                <div className="self-start rounded-lg bg-[#202c33]/90 px-2 py-1 text-[9px] text-[#e9edef] shadow">
                  Hey there!
                </div>
                <div className="self-end rounded-lg bg-[#005c4b]/95 px-2 py-1 text-[9px] text-white shadow">
                  DEV CHAT 🚀
                </div>
                {isActive && (
                  <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#00a884] text-[#0b141a] shadow">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between bg-[#202c33] px-3 py-2.5">
                <span className="text-xs font-semibold text-[#e9edef] truncate">
                  {wp.label}
                </span>
                <Palette className="h-3.5 w-3.5 text-[#8696a0] flex-shrink-0" />
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
};
