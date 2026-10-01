/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Lock,
  Moon,
  Wallpaper,
  HelpCircle,
  LogOut,
  Keyboard,
  Shield,
  Eye,
  Volume2,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';
import { useToast } from '../common/Toast';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  onOpenProfile,
}) => {
  const { profile, logout } = useAuth();
  const { showToast } = useToast();
  const [activeSubView, setActiveSubView] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [previewEnabled, setPreviewEnabled] = useState(true);

  if (!isOpen) return null;

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out of DEV CHAT on this device?')) {
      await logout();
      onClose();
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#111b21] transition-transform duration-300 select-none animate-in slide-in-from-left">
      {/* Top Header */}
      <div className="flex h-28 items-end bg-[#202c33] px-5 pb-4">
        <div className="flex items-center gap-6 text-[#e9edef]">
          <button
            onClick={() => {
              if (activeSubView) {
                setActiveSubView(null);
              } else {
                onClose();
              }
            }}
            className="rounded-full p-1 text-[#e9edef] hover:bg-[#111b21]/50 transition"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h2 className="text-lg font-semibold">
            {activeSubView === 'notifications'
              ? 'Notifications'
              : activeSubView === 'privacy'
              ? 'Privacy'
              : activeSubView === 'shortcuts'
              ? 'Keyboard shortcuts'
              : 'Settings'}
          </h2>
        </div>
      </div>

      {/* Main Settings List */}
      <div className="flex-1 overflow-y-auto py-2">
        {activeSubView === null && (
          <>
            {/* User Profile Row */}
            <div
              onClick={() => {
                onClose();
                onOpenProfile();
              }}
              className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-[#202c33] transition border-b border-[#222d34]"
            >
              <Avatar
                src={profile?.photoURL}
                name={profile?.displayName || 'User'}
                size="lg"
              />
              <div className="min-w-0 flex-1 truncate">
                <h3 className="text-sm font-semibold text-[#e9edef] truncate">
                  {profile?.displayName || 'User'}
                </h3>
                <p className="text-xs text-[#8696a0] truncate mt-0.5">
                  {profile?.bio || 'Hey there! I am using DEV CHAT.'}
                </p>
              </div>
            </div>

            {/* PWA Install Banner */}
            <PWAInstallButton variant="banner" />

            {/* Menu Options */}
            <div className="divide-y divide-[#222d34]">
              {/* Notifications */}
              <div
                onClick={() => setActiveSubView('notifications')}
                className="flex items-center gap-5 px-6 py-4 cursor-pointer hover:bg-[#202c33] transition text-[#e9edef]"
              >
                <Bell className="h-5 w-5 text-[#8696a0]" />
                <div className="flex-1">
                  <span className="text-sm font-normal">Notifications</span>
                  <p className="text-[11px] text-[#8696a0]">Sounds, preview notifications</p>
                </div>
              </div>

              {/* Privacy */}
              <div
                onClick={() => setActiveSubView('privacy')}
                className="flex items-center gap-5 px-6 py-4 cursor-pointer hover:bg-[#202c33] transition text-[#e9edef]"
              >
                <Lock className="h-5 w-5 text-[#8696a0]" />
                <div className="flex-1">
                  <span className="text-sm font-normal">Privacy</span>
                  <p className="text-[11px] text-[#8696a0]">Block contacts, disappearing messages</p>
                </div>
              </div>

              {/* Security */}
              <div className="flex items-center gap-5 px-6 py-4 cursor-pointer hover:bg-[#202c33] transition text-[#e9edef]">
                <Shield className="h-5 w-5 text-[#8696a0]" />
                <div className="flex-1">
                  <span className="text-sm font-normal">Security</span>
                  <p className="text-[11px] text-[#8696a0]">End-to-end encryption details</p>
                </div>
              </div>

              {/* Theme & Wallpaper */}
              <div className="flex items-center gap-5 px-6 py-4 cursor-pointer hover:bg-[#202c33] transition text-[#e9edef]">
                <Wallpaper className="h-5 w-5 text-[#8696a0]" />
                <div className="flex-1">
                  <span className="text-sm font-normal">Chat wallpaper</span>
                  <p className="text-[11px] text-[#8696a0]">WhatsApp dark doodle pattern</p>
                </div>
              </div>

              {/* Keyboard Shortcuts */}
              <div
                onClick={() => setActiveSubView('shortcuts')}
                className="flex items-center gap-5 px-6 py-4 cursor-pointer hover:bg-[#202c33] transition text-[#e9edef]"
              >
                <Keyboard className="h-5 w-5 text-[#8696a0]" />
                <div className="flex-1">
                  <span className="text-sm font-normal">Keyboard shortcuts</span>
                  <p className="text-[11px] text-[#8696a0]">Quick navigation keys</p>
                </div>
              </div>

              {/* Help */}
              <div className="flex items-center gap-5 px-6 py-4 cursor-pointer hover:bg-[#202c33] transition text-[#e9edef]">
                <HelpCircle className="h-5 w-5 text-[#8696a0]" />
                <div className="flex-1">
                  <span className="text-sm font-normal">Help & About</span>
                  <p className="text-[11px] text-[#8696a0]">DEV CHAT version 2.24.1</p>
                </div>
              </div>

              {/* Log Out */}
              <div
                onClick={handleLogout}
                className="flex items-center gap-5 px-6 py-4 cursor-pointer hover:bg-[#202c33] transition text-rose-400"
              >
                <LogOut className="h-5 w-5 text-rose-400" />
                <span className="text-sm font-normal">Log out</span>
              </div>
            </div>
          </>
        )}

        {/* Notifications Subview */}
        {activeSubView === 'notifications' && (
          <div className="px-6 py-4 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm text-[#e9edef]">Message sounds</h4>
                <p className="text-xs text-[#8696a0]">Play audio for incoming messages</p>
              </div>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="h-4 w-4 rounded accent-[#00a884]"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm text-[#e9edef]">Show previews</h4>
                <p className="text-xs text-[#8696a0]">Display text previews on alerts</p>
              </div>
              <input
                type="checkbox"
                checked={previewEnabled}
                onChange={(e) => setPreviewEnabled(e.target.checked)}
                className="h-4 w-4 rounded accent-[#00a884]"
              />
            </div>
          </div>
        )}

        {/* Privacy Subview */}
        {activeSubView === 'privacy' && (
          <div className="divide-y divide-[#222d34]">
            <div className="px-6 py-4">
              <h4 className="text-sm text-[#e9edef]">Last seen and online</h4>
              <p className="text-xs text-[#8696a0] mt-0.5">Everyone</p>
            </div>
            <div className="px-6 py-4">
              <h4 className="text-sm text-[#e9edef]">Profile photo</h4>
              <p className="text-xs text-[#8696a0] mt-0.5">Everyone</p>
            </div>
            <div className="px-6 py-4">
              <h4 className="text-sm text-[#e9edef]">Read receipts</h4>
              <p className="text-xs text-[#8696a0] mt-0.5">
                If turned off, you won't send or receive read receipts (blue ticks).
              </p>
            </div>
          </div>
        )}

        {/* Shortcuts Subview */}
        {activeSubView === 'shortcuts' && (
          <div className="px-6 py-4 space-y-4">
            {[
              { label: 'Mark as unread', key: 'Ctrl + Alt + U' },
              { label: 'Mute chat', key: 'Ctrl + Alt + M' },
              { label: 'Archive chat', key: 'Ctrl + Alt + E' },
              { label: 'Delete chat', key: 'Ctrl + Alt + Backspace' },
              { label: 'Pin chat', key: 'Ctrl + Alt + P' },
              { label: 'Search chat', key: 'Ctrl + Alt + /' },
              { label: 'New chat', key: 'Ctrl + Alt + N' },
              { label: 'Next chat', key: 'Ctrl + Alt + Tab' },
              { label: 'Profile & Status', key: 'Ctrl + Alt + P' },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between text-xs">
                <span className="text-[#8696a0]">{s.label}</span>
                <kbd className="rounded-lg bg-[#202c33] border border-[#222d34] px-2 py-1 font-mono text-[#e9edef]">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
