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
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { Modal } from '../common/Modal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
}

type TabType = 'account' | 'privacy' | 'notifications' | 'chat' | 'security';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenProfile,
}) => {
  const { user, profile, updateProfileData, logout, deleteAccount, resetPassword } = useAuth();
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
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete account';
      showToast(msg, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Preferences & Settings"
      subtitle="Configure your DEV CHAT experience"
      maxWidth="lg"
    >
      <div className="flex flex-col sm:flex-row gap-5 min-h-[380px]">
        {/* Navigation Sidebar */}
        <div className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 sm:w-44 border-b sm:border-b-0 sm:border-r border-slate-800 pr-2">
          {[
            { id: 'account', label: 'Account', icon: User },
            { id: 'privacy', label: 'Privacy', icon: Shield },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'chat', label: 'Chat', icon: MessageSquare },
            { id: 'security', label: 'Security', icon: Lock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition text-left whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panes */}
        <div className="flex-1 space-y-4">
          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
                <span className="text-xs text-slate-400 block">Signed in as</span>
                <p className="text-sm font-semibold text-white">{profile?.displayName}</p>
                <p className="text-xs text-slate-300">@{profile?.username}</p>
                <p className="text-xs text-slate-400">{user?.email}</p>
                <button
                  onClick={() => {
                    onClose();
                    onOpenProfile();
                  }}
                  className="mt-2 inline-flex items-center text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  Edit Profile & Bio →
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-medium text-slate-200">Password</h4>
                  <p className="text-[11px] text-slate-400">Request password reset email</p>
                </div>
                <button
                  onClick={handlePasswordReset}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
                >
                  Reset Password
                </button>
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
                <div>
                  <h4 className="text-xs font-medium text-slate-200">Show Online Status</h4>
                  <p className="text-[11px] text-slate-400">
                    Allow others to see when you are active
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={profile?.showOnlineStatus !== false}
                  onChange={(e) => handleToggle('showOnlineStatus', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
                <div>
                  <h4 className="text-xs font-medium text-slate-200">Show Last Seen</h4>
                  <p className="text-[11px] text-slate-400">
                    Display timestamp of your recent activity
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={profile?.showLastSeen !== false}
                  onChange={(e) => handleToggle('showLastSeen', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
                <div>
                  <h4 className="text-xs font-medium text-slate-200">Read Receipts</h4>
                  <p className="text-[11px] text-slate-400">
                    Show double checks when messages are opened
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={profile?.readReceipts !== false}
                  onChange={(e) => handleToggle('readReceipts', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500/20"
                />
              </div>

              {/* Blocked accounts list */}
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
                <h4 className="text-xs font-medium text-slate-200 mb-2">
                  Blocked Users ({profile?.blockedUserIds?.length || 0})
                </h4>
                {profile?.blockedUserIds && profile.blockedUserIds.length > 0 ? (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {profile.blockedUserIds.map((uid) => (
                      <div
                        key={uid}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-800/80 text-xs"
                      >
                        <span className="text-slate-300 font-mono text-[11px] truncate">
                          User ID: {uid.slice(0, 10)}...
                        </span>
                        <button
                          onClick={() => handleUnblock(uid)}
                          className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                        >
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">No blocked users.</p>
                )}
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-medium text-slate-200">In-App Audio Feedback</h4>
                  <p className="text-[11px] text-slate-400">
                    Subtle tones on message send and receive
                  </p>
                </div>
                <span className="text-xs text-emerald-400 font-semibold">Enabled</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-medium text-slate-200">Browser Push Alerts</h4>
                  <p className="text-[11px] text-slate-400">
                    Receive alerts when DEV CHAT is in background
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if ('Notification' in window) {
                      const res = await Notification.requestPermission();
                      showToast(`Browser permission: ${res}`, 'info');
                    } else {
                      showToast('Notification API not supported by browser', 'error');
                    }
                  }}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
                >
                  Enable
                </button>
              </div>
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
                <div>
                  <h4 className="text-xs font-medium text-slate-200">Press Enter to Send</h4>
                  <p className="text-[11px] text-slate-400">
                    Use Enter key to send message, Shift+Enter for new line
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={profile?.enterToSend !== false}
                  onChange={(e) => handleToggle('enterToSend', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-medium text-slate-200">Sign Out</h4>
                  <p className="text-[11px] text-slate-400">
                    Log out of your DEV CHAT session on this device
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await logout();
                    onClose();
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Logout</span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl border border-rose-900/40 bg-rose-950/20 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-rose-300">Delete Account</h4>
                  <p className="text-[11px] text-rose-400/80">
                    Permanently disable your account and data
                  </p>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600/20 border border-rose-500/40 px-3.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-600 hover:text-white transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
              </div>

              {/* Confirmation Dialog */}
              {showDeleteConfirm && (
                <div className="p-4 rounded-xl border border-rose-500/50 bg-rose-950/60 space-y-3 animate-in fade-in">
                  <p className="text-xs text-rose-200">
                    Are you sure? This action is irreversible and your account will be removed.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteLoading}
                      className="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50 transition"
                    >
                      {deleteLoading ? 'Deleting...' : 'Yes, Delete My Account'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
