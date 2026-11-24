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
  HelpCircle,
  LogOut,
  Keyboard,
  Shield,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';
import { ThemeToggle } from '../common/ThemeToggle';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { ConfirmModal } from '../common/ConfirmModal';
import { useToast } from '../common/Toast';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
}

type SubView = 'notifications' | 'privacy' | 'security' | 'shortcuts' | 'about' | null;

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  onOpenProfile,
}) => {
  const { profile, updateProfileData, logout } = useAuth();
  const { showToast } = useToast();
  const [activeSubView, setActiveSubView] = useState<SubView>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(
    () => typeof window === 'undefined' || localStorage.getItem('devchat_sounds') !== 'false'
  );
  const [previewEnabled, setPreviewEnabled] = useState<boolean>(
    () => typeof window === 'undefined' || localStorage.getItem('devchat_notif_previews') !== 'false'
  );
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (!isOpen) return null;

  const handleTogglePrivacy = async (key: 'showOnlineStatus' | 'showLastSeen' | 'readReceipts', val: boolean) => {
    await updateProfileData({ [key]: val });
    showToast('Privacy setting saved', 'info');
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#111b21] transition-transform duration-300 select-none animate-in slide-in-from-left">
      {/* Top Header */}
      <div className="flex h-24 items-end bg-[#202c33] px-5 pb-4 border-b border-[#222d34]">
        <div className="flex items-center gap-5 text-[#e9edef]">
          <button
            type="button"
            onClick={() => {
              if (activeSubView) {
                setActiveSubView(null);
              } else {
                onClose();
              }
            }}
            className="rounded-full p-1.5 text-[#e9edef] hover:bg-[#111b21]/50 transition"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold">
            {activeSubView === 'notifications'
              ? 'Notifications'
              : activeSubView === 'privacy'
              ? 'Privacy'
              : activeSubView === 'security'
              ? 'Security'
              : activeSubView === 'shortcuts'
              ? 'Keyboard shortcuts'
              : activeSubView === 'about'
              ? 'Help & About'
              : 'Settings'}
          </h2>
        </div>
      </div>

      {/* Main Settings List */}
      <div className="flex-1 overflow-y-auto py-2">
        {activeSubView === null && (
          <>
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
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-[#e9edef] truncate">
                  {profile?.displayName || 'User'}
                </h3>
                <p className="text-xs text-[#8696a0] truncate mt-0.5">
                  {profile?.bio || 'Hey there! I am using DEV CHAT.'}
                </p>
              </div>
            </div>

            <PWAInstallButton variant="banner" />

            <div className="divide-y divide-[#222d34]">
              <button
                type="button"
                onClick={() => setActiveSubView('notifications')}
                className="flex w-full items-center gap-5 px-6 py-4 text-left hover:bg-[#202c33] transition text-[#e9edef]"
              >
                <Bell className="h-5 w-5 text-[#8696a0]" />
                <div className="flex-1">
                  <span className="text-sm font-normal block">Notifications</span>
                  <p className="text-[11px] text-[#8696a0]">Sounds, preview notifications</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubView('privacy')}
                className="flex w-full items-center gap-5 px-6 py-4 text-left hover:bg-[#202c33] transition text-[#e9edef]"
              >
                <Lock className="h-5 w-5 text-[#8696a0]" />
                <div className="flex-1">
                  <span className="text-sm font-normal block">Privacy</span>
                  <p className="text-[11px] text-[#8696a0]">Online status, last seen, read receipts</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubView('security')}
                className="flex w-full items-center gap-5 px-6 py-4 text-left hover:bg-[#202c33] transition text-[#e9edef]"
              >
                <Shield className="h-5 w-5 text-[#8696a0]" />
                <div className="flex-1">
                  <span className="text-sm font-normal block">Security</span>
                  <p className="text-[11px] text-[#8696a0]">End-to-end encryption details</p>
                </div>
              </button>

              <div className="flex items-center justify-between px-6 py-4 hover:bg-[#202c33] transition text-[#e9edef]">
                <div className="flex items-center gap-5">
                  <Moon className="h-5 w-5 text-[#8696a0]" />
                  <div>
                    <span className="text-sm font-normal block">App Theme</span>
                    <p className="text-[11px] text-[#8696a0]">Toggle dark and light mode</p>
                  </div>
                </div>
                <ThemeToggle showLabel={true} />
              </div>

              <button
                type="button"
                onClick={() => setActiveSubView('shortcuts')}
                className="flex w-full items-center gap-5 px-6 py-4 text-left hover:bg-[#202c33] transition text-[#e9edef]"
              >
                <Keyboard className="h-5 w-5 text-[#8696a0]" />
                <div className="flex-1">
                  <span className="text-sm font-normal block">Keyboard shortcuts</span>
                  <p className="text-[11px] text-[#8696a0]">Quick navigation keys</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubView('about')}
                className="flex w-full items-center gap-5 px-6 py-4 text-left hover:bg-[#202c33] transition text-[#e9edef]"
              >
                <HelpCircle className="h-5 w-5 text-[#8696a0]" />
                <div className="flex-1">
                  <span className="text-sm font-normal block">Help & About</span>
                  <p className="text-[11px] text-[#8696a0]">DEV CHAT v2.4.0 • By lawrencedev</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="flex w-full items-center gap-5 px-6 py-4 text-left hover:bg-[#202c33] transition text-rose-400"
              >
                <LogOut className="h-5 w-5 text-rose-400" />
                <span className="text-sm font-normal">Log out</span>
              </button>
            </div>
          </>
        )}

        {activeSubView === 'notifications' && (
          <div className="px-6 py-4 space-y-6">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <h4 className="text-sm text-[#e9edef]">Message sounds</h4>
                <p className="text-xs text-[#8696a0]">Play audio for incoming messages</p>
              </div>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => {
                  const next = e.target.checked;
                  setSoundEnabled(next);
                  localStorage.setItem('devchat_sounds', String(next));
                }}
                className="h-4 w-4 rounded accent-[#00a884] cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <h4 className="text-sm text-[#e9edef]">Show previews</h4>
                <p className="text-xs text-[#8696a0]">Display text previews on alerts</p>
              </div>
              <input
                type="checkbox"
                checked={previewEnabled}
                onChange={(e) => {
                  const next = e.target.checked;
                  setPreviewEnabled(next);
                  localStorage.setItem('devchat_notif_previews', String(next));
                }}
                className="h-4 w-4 rounded accent-[#00a884] cursor-pointer"
              />
            </label>
          </div>
        )}

        {activeSubView === 'privacy' && (
          <div className="divide-y divide-[#222d34]">
            <label className="flex items-center justify-between px-6 py-4 cursor-pointer">
              <div>
                <h4 className="text-sm text-[#e9edef]">Show online status</h4>
                <p className="text-xs text-[#8696a0] mt-0.5">Let contacts see when you are active</p>
              </div>
              <input
                type="checkbox"
                checked={profile?.showOnlineStatus !== false}
                onChange={(e) => handleTogglePrivacy('showOnlineStatus', e.target.checked)}
                className="h-4 w-4 rounded accent-[#00a884] cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between px-6 py-4 cursor-pointer">
              <div>
                <h4 className="text-sm text-[#e9edef]">Show last seen</h4>
                <p className="text-xs text-[#8696a0] mt-0.5">Display your recent activity timestamp</p>
              </div>
              <input
                type="checkbox"
                checked={profile?.showLastSeen !== false}
                onChange={(e) => handleTogglePrivacy('showLastSeen', e.target.checked)}
                className="h-4 w-4 rounded accent-[#00a884] cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between px-6 py-4 cursor-pointer">
              <div>
                <h4 className="text-sm text-[#e9edef]">Read receipts</h4>
                <p className="text-xs text-[#8696a0] mt-0.5">
                  Send blue ticks when you read messages
                </p>
              </div>
              <input
                type="checkbox"
                checked={profile?.readReceipts !== false}
                onChange={(e) => handleTogglePrivacy('readReceipts', e.target.checked)}
                className="h-4 w-4 rounded accent-[#00a884] cursor-pointer"
              />
            </label>
          </div>
        )}

        {activeSubView === 'security' && (
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-[#00a884]/30 bg-[#00a884]/10 p-4">
              <ShieldCheck className="h-7 w-7 text-[#25d366] flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-[#e9edef]">End-to-End Protection</h4>
                <p className="text-xs text-[#8696a0] mt-0.5 leading-relaxed">
                  Personal chats, voice/video streams, and status updates are protected inside DEV CHAT.
                </p>
              </div>
            </div>
            <p className="text-xs text-[#8696a0] leading-relaxed">
              You can verify any conversation's 60-digit security code directly from Contact Info &gt; Encryption.
            </p>
          </div>
        )}

        {activeSubView === 'shortcuts' && (
          <div className="px-6 py-4 space-y-4">
            {[
              { label: 'Close search / modal', key: 'Esc' },
              { label: 'Send message', key: 'Enter' },
              { label: 'New line in message', key: 'Shift + Enter' },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between text-xs">
                <span className="text-[#8696a0]">{s.label}</span>
                <kbd className="rounded-lg bg-[#202c33] border border-[#222d34] px-2.5 py-1 font-mono text-[#e9edef]">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        )}

        {activeSubView === 'about' && (
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="DEV CHAT"
                className="h-12 w-12 rounded-xl border border-[#00a884]/30 object-cover"
              />
              <div>
                <h4 className="text-sm font-bold text-[#e9edef]">DEV CHAT</h4>
                <p className="text-xs text-[#00a884] font-mono">v2.4.0 PWA</p>
              </div>
            </div>
            <p className="text-xs text-[#8696a0] leading-relaxed">
              Modern real-time messaging, WebRTC voice & video calling, 3D animated emojis, status stories, and community channels.
            </p>
            <div className="flex items-center gap-2 rounded-xl bg-[#202c33] p-3 text-xs text-[#e9edef]">
              <Sparkles className="h-4 w-4 text-[#00a884]" />
              <span>Built by <strong className="text-[#00a884]">lawrencedev</strong></span>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={async () => {
          setShowLogoutConfirm(false);
          await logout();
          onClose();
        }}
        title="Log out of DEV CHAT?"
        description="You will be signed out of your account on this device."
        confirmText="Log out"
        variant="danger"
      />
    </div>
  );
};
