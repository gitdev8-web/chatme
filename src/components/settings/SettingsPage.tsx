/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  User,
  Shield,
  Bell,
  Palette,
  MessageSquare,
  Lock,
  LogOut,
  Trash2,
  Check,
  Ban,
  Settings,
  ArrowLeft,
  Sparkles,
  Smartphone,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { ThemeToggle } from '../common/ThemeToggle';
import { useToast } from '../common/Toast';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { Avatar } from '../common/Avatar';

interface SettingsPageProps {
  onBackMobile?: () => void;
  onOpenProfile?: () => void;
}

type TabType = 'account' | 'privacy' | 'theme' | 'notifications' | 'chat' | 'security' | 'about';

export const SettingsPage: React.FC<SettingsPageProps> = ({
  onBackMobile,
  onOpenProfile,
}) => {
  const { user, profile, updateProfileData, logout, deleteAccount, resetPassword } = useAuth();
  const { permission, requestPermission } = useNotifications();
  const { theme } = useTheme();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('account');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleToggle = async (key: string, value: boolean) => {
    try {
      await updateProfileData({ [key]: value });
      showToast('Setting updated', 'info');
    } catch {
      showToast('Failed to update setting', 'error');
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      await resetPassword(user.email);
      showToast('Password reset link sent to your email', 'success');
    } catch {
      showToast('Failed to send reset link', 'error');
    }
  };

  const handleUnblock = async (blockedUid: string) => {
    const list = profile?.blockedUserIds || [];
    const updated = list.filter((id) => id !== blockedUid);
    await updateProfileData({ blockedUserIds: updated });
    showToast('User unblocked', 'info');
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await deleteAccount();
      showToast('Account successfully deleted', 'info');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete account';
      showToast(msg, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#0b141a] text-[#e9edef] select-none overflow-hidden">
      {/* Top Header */}
      <div className="flex h-16 items-center justify-between border-b border-[#222d34] bg-[#202c33] px-4 py-3 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          {onBackMobile && (
            <button
              onClick={onBackMobile}
              className="md:hidden rounded-full p-1.5 text-[#8696a0] hover:bg-[#111b21] hover:text-white transition"
              title="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-[#00a884]" />
            <h1 className="text-lg font-semibold text-[#e9edef]">Settings</h1>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-5xl mx-auto w-full pb-20 md:pb-6 space-y-6">
        {/* User Profile Summary Card */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-3xl bg-[#111b21] border border-[#222d34] shadow-xl">
          <div className="flex items-center gap-4 text-center sm:text-left min-w-0">
            <Avatar
              src={profile?.photoURL}
              name={profile?.displayName || 'User'}
              size="2xl"
              className="ring-2 ring-[#00a884]/40 shadow-lg"
            />
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-[#e9edef] truncate">
                {profile?.displayName || 'DEV CHAT User'}
              </h2>
              <p className="text-xs text-[#00a884] font-medium font-mono mt-0.5">
                @{profile?.username || 'user'}
              </p>
              <p className="text-xs text-[#8696a0] mt-1 truncate">
                {profile?.bio || 'Hey there! I am using DEV CHAT.'}
              </p>
            </div>
          </div>

          {onOpenProfile && (
            <button
              onClick={onOpenProfile}
              className="rounded-full bg-[#00a884] px-5 py-2 text-xs font-bold text-[#111b21] hover:bg-[#06cf9c] transition shadow-md whitespace-nowrap"
            >
              Edit Profile
            </button>
          )}
        </div>

        {/* Tab Navigation + Content Layout */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Nav Categories */}
          <div className="flex md:flex-col gap-1.5 overflow-x-auto w-full md:w-56 pb-2 md:pb-0 flex-shrink-0 no-scrollbar">
            {[
              { id: 'account', label: 'Account', icon: User },
              { id: 'privacy', label: 'Privacy', icon: Shield },
              { id: 'theme', label: 'Appearance', icon: Palette },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'chat', label: 'Chat Settings', icon: MessageSquare },
              { id: 'security', label: 'Security & Auth', icon: Lock },
              { id: 'about', label: 'About & Info', icon: Info },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-semibold transition text-left whitespace-nowrap ${
                    isActive
                      ? 'bg-[#00a884] text-[#111b21] shadow-md'
                      : 'bg-[#111b21] text-[#8696a0] hover:bg-[#202c33] hover:text-[#e9edef] border border-[#222d34]'
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Settings Panel */}
          <div className="flex-1 w-full bg-[#111b21] border border-[#222d34] rounded-3xl p-5 md:p-6 shadow-xl space-y-5">
            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#e9edef] border-b border-[#222d34] pb-2">
                  Account Details
                </h3>
                <div className="p-4 rounded-2xl bg-[#202c33]/50 border border-[#222d34] space-y-2">
                  <span className="text-xs text-[#8696a0] block">Email Address</span>
                  <p className="text-xs font-mono font-semibold text-[#e9edef]">{user?.email || 'N/A'}</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#202c33]/50 border border-[#222d34] flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#e9edef]">Password Management</h4>
                    <p className="text-[11px] text-[#8696a0] mt-0.5">Send password reset email to your inbox</p>
                  </div>
                  <button
                    onClick={handlePasswordReset}
                    className="rounded-xl bg-[#2a3942] px-4 py-2 text-xs font-semibold text-[#e9edef] hover:bg-[#32434d] transition shadow-sm"
                  >
                    Reset Password
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-[#202c33]/50 border border-[#222d34] flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#e9edef]">Progressive Web App (PWA)</h4>
                    <p className="text-[11px] text-[#8696a0] mt-0.5">Install DEV CHAT for home screen & offline access</p>
                  </div>
                  <PWAInstallButton />
                </div>
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#e9edef] border-b border-[#222d34] pb-2">
                  Privacy Preferences
                </h3>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#202c33]/50 border border-[#222d34]">
                  <div>
                    <h4 className="text-xs font-bold text-[#e9edef]">Show Online Presence</h4>
                    <p className="text-[11px] text-[#8696a0] mt-0.5">
                      Allow contacts to see when you are active on DEV CHAT
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile?.showOnlineStatus !== false}
                    onChange={(e) => handleToggle('showOnlineStatus', e.target.checked)}
                    className="h-4 w-4 rounded accent-[#00a884] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#202c33]/50 border border-[#222d34]">
                  <div>
                    <h4 className="text-xs font-bold text-[#e9edef]">Show Last Seen</h4>
                    <p className="text-[11px] text-[#8696a0] mt-0.5">
                      Display timestamp of your recent activity
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile?.showLastSeen !== false}
                    onChange={(e) => handleToggle('showLastSeen', e.target.checked)}
                    className="h-4 w-4 rounded accent-[#00a884] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#202c33]/50 border border-[#222d34]">
                  <div>
                    <h4 className="text-xs font-bold text-[#e9edef]">Read Receipts</h4>
                    <p className="text-[11px] text-[#8696a0] mt-0.5">
                      Show double blue ticks when messages are read
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile?.readReceipts !== false}
                    onChange={(e) => handleToggle('readReceipts', e.target.checked)}
                    className="h-4 w-4 rounded accent-[#00a884] cursor-pointer"
                  />
                </div>

                {/* Blocked accounts list */}
                <div className="p-4 rounded-2xl bg-[#202c33]/50 border border-[#222d34] space-y-2">
                  <h4 className="text-xs font-bold text-[#e9edef]">
                    Blocked Users ({profile?.blockedUserIds?.length || 0})
                  </h4>
                  {profile?.blockedUserIds && profile.blockedUserIds.length > 0 ? (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {profile.blockedUserIds.map((uid) => (
                        <div
                          key={uid}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-[#111b21] text-xs border border-[#222d34]"
                        >
                          <span className="text-[#8696a0] font-mono text-[11px] truncate">
                            User ID: {uid.slice(0, 12)}...
                          </span>
                          <button
                            onClick={() => handleUnblock(uid)}
                            className="text-xs text-rose-400 hover:underline font-semibold"
                          >
                            Unblock
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#8696a0]">No blocked users.</p>
                  )}
                </div>
              </div>
            )}

            {/* Theme Tab */}
            {activeTab === 'theme' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#e9edef] border-b border-[#222d34] pb-2">
                  Appearance
                </h3>
                <div className="p-4 rounded-2xl bg-[#202c33]/50 border border-[#222d34] flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#e9edef]">Theme Mode</h4>
                    <p className="text-[11px] text-[#8696a0] mt-0.5">
                      Toggle between Dark and Light mode interface
                    </p>
                  </div>
                  <ThemeToggle showLabel={true} />
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#e9edef] border-b border-[#222d34] pb-2">
                  Notifications & Audio
                </h3>
                <div className="p-4 rounded-2xl bg-[#202c33]/50 border border-[#222d34] flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#e9edef]">In-App Toast Alerts & Sounds</h4>
                    <p className="text-[11px] text-[#8696a0] mt-0.5">
                      Real-time message toasts and notification sound chimes
                    </p>
                  </div>
                  <span className="text-xs text-[#25d366] font-bold bg-[#00a884]/20 px-3 py-1 rounded-lg">
                    Active
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#202c33]/50 border border-[#222d34] flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#e9edef]">Browser Push Alerts</h4>
                    <p className="text-[11px] text-[#8696a0] mt-0.5">
                      Receive desktop push notifications when DEV CHAT is minimized
                    </p>
                  </div>
                  {permission === 'granted' ? (
                    <span className="text-xs text-[#25d366] font-bold bg-[#00a884]/20 px-3 py-1 rounded-lg">
                      Granted
                    </span>
                  ) : (
                    <button
                      onClick={async () => {
                        const res = await requestPermission();
                        showToast(`Browser push permission: ${res}`, res === 'granted' ? 'success' : 'info');
                      }}
                      className="rounded-xl bg-[#00a884] px-4 py-2 text-xs font-bold text-[#111b21] hover:bg-[#06cf9c] transition shadow-md"
                    >
                      Enable Push
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Chat Settings Tab */}
            {activeTab === 'chat' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#e9edef] border-b border-[#222d34] pb-2">
                  Chat Settings
                </h3>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#202c33]/50 border border-[#222d34]">
                  <div>
                    <h4 className="text-xs font-bold text-[#e9edef]">Press Enter to Send</h4>
                    <p className="text-[11px] text-[#8696a0] mt-0.5">
                      Pressing Enter key sends the message instantly (Shift+Enter for newline)
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile?.enterToSend !== false}
                    onChange={(e) => handleToggle('enterToSend', e.target.checked)}
                    className="h-4 w-4 rounded accent-[#00a884] cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#e9edef] border-b border-[#222d34] pb-2">
                  Session & Account Security
                </h3>
                <div className="p-4 rounded-2xl bg-[#202c33]/50 border border-[#222d34] flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#e9edef]">Sign Out</h4>
                    <p className="text-[11px] text-[#8696a0] mt-0.5">Log out of your current session on this device</p>
                  </div>
                  <button
                    onClick={async () => {
                      await logout();
                    }}
                    className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>

                <div className="p-4 rounded-2xl border border-rose-900/40 bg-rose-950/20 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-rose-400">Delete Account</h4>
                    <p className="text-[11px] text-rose-300/80 mt-0.5">Permanently delete your user profile and access</p>
                  </div>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 rounded-xl bg-rose-600/20 border border-rose-500/40 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-600 hover:text-white transition"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                </div>

                {showDeleteConfirm && (
                  <div className="p-4 rounded-2xl border border-rose-500/50 bg-rose-950/60 space-y-3 animate-in fade-in">
                    <p className="text-xs text-rose-200">
                      Are you sure you want to delete your account? This action is permanent and cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteLoading}
                        className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 transition"
                      >
                        {deleteLoading ? 'Deleting...' : 'Yes, Delete My Account'}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="rounded-xl bg-slate-800 px-4 py-2 text-xs text-slate-300 hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* About & Info Tab */}
            {activeTab === 'about' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#e9edef] border-b border-[#222d34] pb-2">
                  About DEV CHAT
                </h3>

                <div className="p-5 rounded-2xl bg-[#202c33]/60 border border-[#222d34] space-y-3 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <img
                      src="/logo.png"
                      alt="DEV CHAT"
                      className="h-14 w-14 rounded-2xl border border-[#00a884]/40 shadow-lg object-cover"
                    />
                    <div>
                      <h4 className="text-base font-bold text-[#e9edef]">DEV CHAT Web Application</h4>
                      <p className="text-xs text-[#00a884] font-semibold">Version 2.4.0 (Production Build)</p>
                    </div>
                  </div>

                  <p className="text-xs text-[#8696a0] leading-relaxed pt-2 border-t border-[#222d34]/60">
                    A modern WhatsApp-style communication platform featuring real-time messaging, audio/video calling, status stories, 3D animated emojis, and end-to-end security.
                  </p>

                  <div className="p-3 rounded-xl bg-[#111b21] border border-[#222d34] flex items-center justify-between text-xs">
                    <span className="text-[#8696a0]">Lead Software Engineer & Author</span>
                    <span className="font-bold text-[#00a884] flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>lawrencedev</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Developer Credit Footer */}
        <div className="pt-8 text-center text-xs text-[#8696a0]/70 flex flex-col items-center justify-center gap-1 border-t border-[#222d34]/40 mt-8">
          <div className="flex items-center gap-1.5 font-medium text-[#8696a0]">
            <Sparkles className="h-3.5 w-3.5 text-[#00a884]" />
            <span>DEV CHAT • Developed with ❤️ by <strong className="text-[#00a884]">lawrencedev</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
