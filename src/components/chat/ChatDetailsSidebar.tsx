/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Phone,
  Video,
  Search,
  Lock,
  Star,
  Bell,
  Clock,
  Shield,
  Trash2,
  Ban,
  Flag,
  UserPlus,
  Users,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { Conversation, Message, UserProfile } from '../../types';
import { Avatar } from '../common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { isUserOnline, formatLastSeen } from '../../utils/presenceUtils';
import {
  removeGroupMember,
  toggleGroupAdmin,
  submitReport,
  toggleMuteConversation,
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
  const [activeMediaTab, setActiveMediaTab] = useState<'media' | 'docs'>('media');
  const [isMuted, setIsMuted] = useState(
    conversation.mutedBy?.includes(user?.uid || '') || false
  );
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const isDirect = conversation.type === 'direct';
  const partnerId = isDirect
    ? conversation.participantIds?.find((id) => id !== user?.uid) || user?.uid
    : null;
  const partnerProfile = partnerId ? userCache[partnerId] : null;

  const isGroupAdmin =
    conversation.type === 'group' &&
    conversation.adminIds?.includes(user?.uid || '');

  // Filter media & files
  const mediaMessages = (messages || []).filter(
    (m) => m.type === 'image' && m.fileUrl
  );
  const fileMessages = (messages || []).filter(
    (m) => m.type === 'file' && m.fileUrl
  );

  const title = isDirect
    ? partnerProfile?.displayName || 'DEV CHAT User'
    : conversation.name || 'Group Chat';

  const avatarSrc = isDirect
    ? partnerProfile?.photoURL
    : conversation.photoURL;

  const isOnline = isDirect ? isUserOnline(partnerProfile) : false;

  const handleToggleMute = async () => {
    if (!user) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    await toggleMuteConversation(conversation.id, user.uid, nextMuted);
    showToast(nextMuted ? 'Muted notifications' : 'Unmuted notifications', 'info');
  };

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
    await submitReport(
      user.uid,
      reportedId,
      reportReason.trim(),
      `Report on chat: ${conversation.id}`
    );
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
    <aside className="flex h-full w-80 lg:w-[360px] flex-shrink-0 flex-col border-l border-[#222d34] bg-[#111b21] select-none overflow-hidden animate-in slide-in-from-right">
      {/* Top Header */}
      <div className="flex h-15 items-center justify-between border-b border-[#222d34] bg-[#202c33] px-5 py-3">
        <h3 className="text-sm font-semibold text-[#e9edef]">
          {isDirect ? 'Contact info' : 'Group info'}
        </h3>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-[#8696a0] hover:bg-[#111b21] hover:text-white transition"
          title="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-8">
        {/* Profile Card */}
        <div className="flex flex-col items-center bg-[#111b21] p-6 text-center border-b border-[#222d34]">
          <Avatar
            src={avatarSrc}
            name={title}
            size="2xl"
            isOnline={isOnline}
            showPresence={isDirect}
            className="mb-4 shadow-xl ring-2 ring-[#202c33]"
          />
          <h2 className="text-lg font-semibold text-[#e9edef] truncate max-w-full">
            {title}
          </h2>
          <p className="text-xs text-[#8696a0] mt-1 font-mono">
            {isDirect
              ? partnerProfile?.phoneNumber || `@${partnerProfile?.username || 'user'}`
              : `${conversation.participantIds?.length || 0} members`}
          </p>
        </div>

        {/* About Section */}
        {isDirect && (
          <div className="bg-[#111b21] px-6 py-4 border-b border-[#222d34] space-y-1">
            <span className="text-[11px] font-medium text-[#8696a0]">About</span>
            <p className="text-xs text-[#e9edef]">
              {partnerProfile?.bio || 'Hey there! I am using DEV CHAT.'}
            </p>
          </div>
        )}

        {/* Media, Links and Docs */}
        <div className="bg-[#111b21] p-5 border-b border-[#222d34] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#e9edef]">
              Media, links and docs
            </span>
            <span className="text-xs text-[#8696a0]">
              {mediaMessages.length + fileMessages.length}
            </span>
          </div>

          {mediaMessages.length > 0 ? (
            <div className="grid grid-cols-3 gap-1.5">
              {mediaMessages.slice(0, 6).map((m) => (
                <div
                  key={m.id}
                  className="aspect-square overflow-hidden rounded-lg bg-[#202c33] cursor-pointer hover:opacity-80 transition"
                >
                  <img
                    src={m.fileUrl}
                    alt="Media"
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#8696a0]">No media shared yet</p>
          )}
        </div>

        {/* Chat Settings Options */}
        <div className="bg-[#111b21] divide-y divide-[#222d34] border-b border-[#222d34]">
          {/* Mute Notifications */}
          <div className="flex items-center justify-between px-6 py-3.5">
            <div className="flex items-center gap-4 text-[#e9edef]">
              <Bell className="h-5 w-5 text-[#8696a0]" />
              <span className="text-xs">Mute notifications</span>
            </div>
            <input
              type="checkbox"
              checked={isMuted}
              onChange={handleToggleMute}
              className="h-4 w-4 rounded accent-[#00a884] cursor-pointer"
            />
          </div>

          {/* Starred Messages */}
          <div className="flex items-center justify-between px-6 py-3.5 cursor-pointer hover:bg-[#202c33] transition">
            <div className="flex items-center gap-4 text-[#e9edef]">
              <Star className="h-5 w-5 text-[#8696a0]" />
              <span className="text-xs">Starred messages</span>
            </div>
            <ChevronRight className="h-4 w-4 text-[#8696a0]" />
          </div>

          {/* Disappearing Messages */}
          <div className="flex items-center justify-between px-6 py-3.5 cursor-pointer hover:bg-[#202c33] transition">
            <div className="flex items-center gap-4 text-[#e9edef]">
              <Clock className="h-5 w-5 text-[#8696a0]" />
              <div>
                <span className="text-xs block">Disappearing messages</span>
                <span className="text-[10px] text-[#8696a0]">Off</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-[#8696a0]" />
          </div>

          {/* Encryption */}
          <div className="px-6 py-3.5 space-y-1">
            <div className="flex items-center gap-4 text-[#e9edef]">
              <Lock className="h-5 w-5 text-[#8696a0]" />
              <span className="text-xs">Encryption</span>
            </div>
            <p className="text-[11px] text-[#8696a0] pl-9">
              Messages and calls are end-to-end encrypted. Tap to verify.
            </p>
          </div>
        </div>

        {/* Group Participants (if group) */}
        {!isDirect && (
          <div className="bg-[#111b21] p-5 border-b border-[#222d34] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#e9edef]">
                {conversation.participantIds?.length || 0} members
              </span>
              {isGroupAdmin && onOpenAddMembers && (
                <button
                  onClick={onOpenAddMembers}
                  className="flex items-center gap-1 text-xs text-[#00a884] hover:underline"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Add member</span>
                </button>
              )}
            </div>

            <div className="divide-y divide-[#222d34]">
              {conversation.participantIds?.map((uid) => {
                const uProfile = userCache[uid];
                const isAdmin = conversation.adminIds?.includes(uid);
                const isCurrent = uid === user?.uid;

                return (
                  <div
                    key={uid}
                    className="flex items-center justify-between py-2.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={uProfile?.photoURL}
                        name={uProfile?.displayName || 'User'}
                        size="sm"
                      />
                      <div className="min-w-0 truncate">
                        <span className="text-xs font-medium text-[#e9edef] truncate block">
                          {isCurrent ? 'You' : uProfile?.displayName || 'Member'}
                        </span>
                        <span className="text-[10px] text-[#8696a0] truncate block">
                          {uProfile?.bio || 'DEV CHAT Member'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <span className="rounded bg-[#00a884]/20 px-2 py-0.5 text-[9px] font-bold text-[#00a884]">
                          Group Admin
                        </span>
                      )}
                      {isGroupAdmin && !isCurrent && (
                        <button
                          onClick={() => handleRemoveMember(uid)}
                          className="text-[10px] text-rose-400 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons: Block / Report */}
        <div className="bg-[#111b21] divide-y divide-[#222d34] border-b border-[#222d34]">
          {isDirect && (
            <button
              onClick={handleBlockUser}
              className="flex w-full items-center gap-4 px-6 py-3.5 text-xs text-rose-400 hover:bg-[#202c33] transition"
            >
              <Ban className="h-4 w-4" />
              <span>Block {title}</span>
            </button>
          )}

          <button
            onClick={() => setReporting(true)}
            className="flex w-full items-center gap-4 px-6 py-3.5 text-xs text-rose-400 hover:bg-[#202c33] transition"
          >
            <Flag className="h-4 w-4" />
            <span>Report {title}</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
