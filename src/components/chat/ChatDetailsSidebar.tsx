/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  User,
  Users,
  Shield,
  Ban,
  Flag,
  FileText,
  Image as ImageIcon,
  UserPlus,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import { Conversation, Message, UserProfile } from '../../types';
import { Avatar } from '../common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import {
  removeGroupMember,
  toggleGroupAdmin,
  submitReport,
} from '../../services/chatService';

interface ChatDetailsSidebarProps {
  conversation: Conversation;
  messages: Message[];
  userCache: Record<string, UserProfile>;
  onClose: () => void;
  onOpenAddMembers?: () => void;
}

export const ChatDetailsSidebar: React.FC<ChatDetailsSidebarProps> = ({
  conversation,
  messages,
  userCache,
  onClose,
  onOpenAddMembers,
}) => {
  const { user, profile, updateProfileData } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'info' | 'media' | 'files'>('info');
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const isDirect = conversation.type === 'direct';
  const partnerId = isDirect
    ? conversation.participantIds.find((id) => id !== user?.uid) || user?.uid
    : null;
  const partnerProfile = partnerId ? userCache[partnerId] : null;

  const isGroupAdmin = conversation.type === 'group' && conversation.adminIds?.includes(user?.uid || '');

  // Filter media & files
  const mediaMessages = messages.filter((m) => m.type === 'image' && m.fileUrl);
  const fileMessages = messages.filter((m) => m.type === 'file' && m.fileUrl);

  const title = isDirect
    ? partnerProfile?.displayName || 'Chat Partner'
    : conversation.name || 'Group Chat';

  const isOnline = isDirect
    ? (partnerProfile?.showOnlineStatus !== false && partnerProfile?.isOnline)
    : false;

  const handleBlockUser = async () => {
    if (!partnerId) return;
    const currentBlocked = profile?.blockedUserIds || [];
    const isBlocked = currentBlocked.includes(partnerId);
    const updated = isBlocked
      ? currentBlocked.filter((id) => id !== partnerId)
      : [...currentBlocked, partnerId];

    await updateProfileData({ blockedUserIds: updated });
    showToast(isBlocked ? 'User unblocked' : 'User blocked', 'info');
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !reportReason.trim()) return;
    const reportedId = partnerId || conversation.createdBy || 'unknown';
    await submitReport(user.uid, reportedId, reportReason.trim(), `Report on chat: ${conversation.id}`);
    setReporting(false);
    setReportReason('');
    showToast('Report submitted for review', 'success');
  };

  const handleToggleAdmin = async (memberUid: string, currentIsAdmin: boolean) => {
    await toggleGroupAdmin(conversation.id, memberUid, !currentIsAdmin);
    showToast(currentIsAdmin ? 'Admin role removed' : 'Promoted to admin', 'info');
  };

  const handleRemoveMember = async (memberUid: string) => {
    await removeGroupMember(conversation.id, memberUid);
    showToast('Member removed from group', 'info');
  };

  return (
    <aside className="flex h-full w-80 flex-shrink-0 flex-col border-l border-slate-800/80 bg-slate-900/95 backdrop-blur-xl select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3.5">
        <h3 className="text-xs font-semibold text-slate-100">
          {isDirect ? 'Contact Info' : 'Group Details'}
        </h3>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Profile Card Top */}
        <div className="flex flex-col items-center text-center">
          <Avatar
            src={isDirect ? partnerProfile?.photoURL : conversation.photoURL}
            name={title}
            size="xl"
            isOnline={isOnline}
            showPresence={isDirect}
          />
          <h4 className="mt-3 text-sm font-bold text-white">{title}</h4>
          {isDirect && partnerProfile?.username && (
            <p className="text-xs text-slate-400">@{partnerProfile.username}</p>
          )}

          {/* Status / Presence */}
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
            {isDirect ? (
              partnerProfile?.showOnlineStatus !== false && partnerProfile?.isOnline ? (
                <span className="text-emerald-400 font-medium">Online</span>
              ) : (
                <span>
                  Last seen{' '}
                  {partnerProfile?.lastSeen
                    ? new Date(partnerProfile.lastSeen).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'recently'}
                </span>
              )
            ) : (
              <span>{conversation.participantIds.length} members</span>
            )}
          </div>

          {/* Bio / Description */}
          <p className="mt-3 text-xs text-slate-300 bg-slate-800/50 p-3 rounded-xl border border-slate-800 w-full text-left leading-relaxed">
            {isDirect
              ? partnerProfile?.bio || 'No bio provided.'
              : conversation.description || 'No description provided for this group.'}
          </p>
        </div>

        {/* Tab selection for media / files */}
        <div className="flex rounded-xl bg-slate-800/60 p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 rounded-lg py-1.5 text-[11px] font-medium transition ${
              activeTab === 'info'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isDirect ? 'About' : 'Members'}
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`flex-1 rounded-lg py-1.5 text-[11px] font-medium transition ${
              activeTab === 'media'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Media ({mediaMessages.length})
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`flex-1 rounded-lg py-1.5 text-[11px] font-medium transition ${
              activeTab === 'files'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Files ({fileMessages.length})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'info' && (
          <div>
            {!isDirect && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    Members ({conversation.participantIds.length})
                  </span>
                  {isGroupAdmin && onOpenAddMembers && (
                    <button
                      onClick={onOpenAddMembers}
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Add
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {conversation.participantIds.map((memberUid) => {
                    const memberProfile = userCache[memberUid];
                    const isAdmin = conversation.adminIds?.includes(memberUid);
                    const isSelfMember = memberUid === user?.uid;

                    return (
                      <div
                        key={memberUid}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar
                            src={memberProfile?.photoURL}
                            name={memberProfile?.displayName || 'User'}
                            size="sm"
                          />
                          <div className="min-w-0 truncate">
                            <span className="text-xs font-medium text-slate-200 block truncate">
                              {memberProfile?.displayName || 'User'}{' '}
                              {isSelfMember && <span className="text-[10px] text-slate-500">(You)</span>}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              @{memberProfile?.username || 'user'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {isAdmin && (
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-400 border border-emerald-500/20">
                              Admin
                            </span>
                          )}

                          {isGroupAdmin && !isSelfMember && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleToggleAdmin(memberUid, !!isAdmin)}
                                className="rounded p-1 text-slate-400 hover:text-emerald-400"
                                title={isAdmin ? 'Demote admin' : 'Make admin'}
                              >
                                <Shield className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleRemoveMember(memberUid)}
                                className="rounded p-1 text-slate-400 hover:text-rose-400"
                                title="Remove member"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Direct Chat user details */}
            {isDirect && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800">
                  <span className="text-slate-400 block mb-1">Email Address</span>
                  <span className="text-slate-200 font-medium">{partnerProfile?.email || 'Hidden'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800">
                  <span className="text-slate-400 block mb-1">Status</span>
                  <span className="text-slate-200 font-medium">{partnerProfile?.status || 'Available'}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'media' && (
          <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto">
            {mediaMessages.length === 0 ? (
              <p className="col-span-3 text-center text-xs text-slate-500 py-6">No shared photos</p>
            ) : (
              mediaMessages.map((m) => (
                <img
                  key={m.id}
                  src={m.fileUrl}
                  alt={m.fileName}
                  className="aspect-square w-full rounded-xl object-cover cursor-pointer hover:opacity-80 transition"
                  onClick={() => window.open(m.fileUrl, '_blank')}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {fileMessages.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-6">No shared documents</p>
            ) : (
              fileMessages.map((m) => (
                <a
                  key={m.id}
                  href={m.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition"
                >
                  <FileText className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-xs text-slate-200 truncate flex-1">{m.fileName}</span>
                </a>
              ))
            )}
          </div>
        )}

        {/* Security & Moderation Actions */}
        <div className="border-t border-slate-800/80 pt-4 space-y-2">
          {isDirect && partnerId && (
            <button
              onClick={handleBlockUser}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-950/30 transition"
            >
              <Ban className="h-4 w-4" />
              <span>
                {profile?.blockedUserIds?.includes(partnerId)
                  ? 'Unblock User'
                  : 'Block User'}
              </span>
            </button>
          )}

          <button
            onClick={() => setReporting(!reporting)}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-amber-400 hover:bg-amber-950/30 transition"
          >
            <Flag className="h-4 w-4" />
            <span>Report Conversation</span>
          </button>

          {reporting && (
            <form onSubmit={handleReport} className="space-y-2 pt-2 animate-in fade-in">
              <textarea
                required
                rows={2}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Reason for reporting (e.g. spam, harassment)..."
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-amber-600 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 transition"
                >
                  Submit Report
                </button>
                <button
                  type="button"
                  onClick={() => setReporting(false)}
                  className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </aside>
  );
};
