/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ChatWallpaperId =
  | 'default'
  | 'emerald'
  | 'midnight'
  | 'forest-dots'
  | 'obsidian';

export interface WallpaperOption {
  id: ChatWallpaperId;
  label: string;
  className: string;
  previewBg: string;
}

export const CHAT_WALLPAPERS: WallpaperOption[] = [
  {
    id: 'default',
    label: 'Default Pattern',
    className: 'devchat-pattern-bg',
    previewBg: 'linear-gradient(135deg, #0b141a 0%, #102420 100%)',
  },
  {
    id: 'emerald',
    label: 'Emerald Grid',
    className: 'wallpaper-emerald',
    previewBg: 'linear-gradient(135deg, #071916 0%, #0d3a30 100%)',
  },
  {
    id: 'midnight',
    label: 'Midnight Aurora',
    className: 'wallpaper-midnight',
    previewBg: 'linear-gradient(135deg, #090e17 0%, #112240 100%)',
  },
  {
    id: 'forest-dots',
    label: 'Matrix Dots',
    className: 'wallpaper-forest-dots',
    previewBg: 'radial-gradient(circle, #00a884 1px, #0b141a 1px)',
  },
  {
    id: 'obsidian',
    label: 'Solid Obsidian',
    className: 'wallpaper-obsidian',
    previewBg: '#080c10',
  },
];

const STORAGE_KEY = 'devchat_wallpaper';
const EVENT_NAME = 'devchat-wallpaper-changed';

export function getSavedWallpaper(): ChatWallpaperId {
  try {
    const val = localStorage.getItem(STORAGE_KEY) as ChatWallpaperId | null;
    if (val && CHAT_WALLPAPERS.some((w) => w.id === val)) {
      return val;
    }
  } catch {
    // Ignore storage access failures
  }
  return 'default';
}

export function setSavedWallpaper(id: ChatWallpaperId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: id }));
  } catch {
    // Ignore
  }
}

export function getWallpaperClass(id: ChatWallpaperId): string {
  return CHAT_WALLPAPERS.find((w) => w.id === id)?.className || 'devchat-pattern-bg';
}

export function subscribeToWallpaperChange(cb: (id: ChatWallpaperId) => void): () => void {
  const handler = (e: Event) => {
    const custom = e as CustomEvent<ChatWallpaperId>;
    if (custom.detail) cb(custom.detail);
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
