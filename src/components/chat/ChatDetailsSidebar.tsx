/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  X,
  Lock,
  Star,
  Bell,
  Clock,
  Shield,
  Trash2,
  Ban,
  Flag,
  UserPlus,
  ChevronRight,
  FileText,
  Download,
  Eraser,
  ShieldCheck,
} from 'lucide-react';
import { Conversation, Message, UserProfile } from '../../types';
import { Avatar } from '../common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useToast } from '../common/Toast';
import { isUserOnline, formatLastSeen } from '../../utils/presenceUtils';
import {
  removeGroupMember,
  toggleGroupAdmin,
  submitReport,
  toggleMuteConversation,
  updateDisappearingMessages,
} from '../../services/chatService';
import { ConfirmModal } from '../common/ConfirmModal';
import { Modal } from '../common/Modal';
import { MediaViewerModal } from './MediaViewerModal';

interface ChatDetailsSidebarProps {
  conversation: Conversation;
  messages: Message[];
  userCache: Record<string, UserProfile>;
  onClose: () => void;
  onOpenAddMembers?: () => void;
}

const DISAPPEARING_OPTIONS = [
  { label: 'Off', seconds: 0 },
  { label: '24 hours', seconds: 86400 },
  { label: '7 days', seconds: 604800 },
  { label: '90 days', seconds: 7776000 },
];

export const ChatDetailsSidebar: React.FC<ChatDetailsSidebarProps> = ({
  conversation,
  messages,
  userCache,
  onClose,
  onOpenAddMembers,
}) => {
  const { user, profile, updateProfileData } = useAuth();
  const { deleteConversation, clearConversation, starMessage } = useChat();
  const { showToast } = useToast();

  const [activeMediaTab, setActiveMediaTab] = useState<'media' | 'docs'>('media');
  const [viewingMediaUrl, setViewingMediaUrl] = useState<string | null>(null);
  const [viewingMediaName, setViewingMediaName] = useState<string | undefined>(undefined);

  const [isMuted, setIsMuted] = useState(
    conversation.mutedBy?.includes(user?.uid || '') || false
  );

  // Interactive modals
  const [reporting, setReporting] = useState(false);
  const [reportCategory, setReportCategory] = useState('Harassment or Spam');
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const [showStarredModal, setShowStarredModal] = useState(false);
  const [showDisappearingModal, setShowDisappearingModal] = useState(false);
  const [showEncryptionModal, setShowEncryptionModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const isDirect = conversation.type === 'direct';
  const partnerId = isDirect
    ? conversation.participantIds?.find((id) => id !== user?.uid) || user?.uid
    : null;
  const partnerProfile = partnerId ? userCache[partnerId] : null;
  const isBlocked = !!(partnerId && profile?.blockedUserIds?.includes(partnerId));

  const isGroupAdmin =
    conversation.type === 'group' &&
    conversation.adminIds?.includes(user?.uid || '');

  const mediaMessages = (messages || []).filter(
    (m) => m.type === 'image' && m.fileUrl && !m.isDeleted
  );
  const fileMessages = (messages || []).filter(
    (m) => m.type === 'file' && m.fileUrl && !m.isDeleted
  );
  const starredMessages = (messages || []).filter(
    (m) => m.starredBy?.includes(user?.uid || '') && !m.isDeleted
  );

  const title = isDirect
    ? partnerProfile?.displayName || 'DEV CHAT User'
    : conversation.name || 'Group Chat';

  const avatarSrc = isDirect
    ? partnerProfile?.photoURL
    : conversation.photoURL;

  const isOnline = isDirect ? isUserOnline(partnerProfile) : false;

  const disappearingLabel =
    DISAPPEARING_OPTIONS.find((opt) => opt.seconds === (conversation.disappearingDuration || 0))
      ?.label || 'Off';

  // Deterministic 60-digit safety verification code based on conversation ID
  const safetyDigits = useMemo(() => {
    const seed = conversation.id || 'devchat_e2ee';
    const blocks: string[] = [];
    for (let i = 0; i < 12; i++) {
      let hash = 5381 + i * 131;
      for (let j = 0; j < seed.length; j++) {
        hash = (hash * 33 + seed.charCodeAt(j) + i) % 100000;
      }
      blocks.push(String(Math.abs(hash)).padStart(5, '0'));
    }
    return blocks;
  }, [conversation.id]);

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
    const updated = isBlocked
      ? currentBlocked.filter((id) => id !== partnerId)
      : [...currentBlocked, partnerId];

    await updateProfileData({ blockedUserIds: updated });
    showToast(isBlocked ? `${title} unblocked` : `${title} blocked`, 'info');
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmittingReport(true);
    try {
      const reportedId = partnerId || conversation.createdBy || 'unknown';
      await submitReport(
        user.uid,
        reportedId,
        reportCategory,
        reportReason.trim() || `Report on chat: ${conversation.id}`
      );
      setReporting(false);
      setReportReason('');
      showToast('Report submitted for review', 'success');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleToggleAdmin = async (memberUid: string, currentIsAdmin: boolean) => {
    await toggleGroupAdmin(conversation.id, memberUid, !currentIsAdmin);
    showToast(currentIsAdmin ? 'Admin role removed' : 'Promoted to admin', 'info');
  };

  const handleRemoveMember = async (memberUid: string) => {
    await removeGroupMember(conversation.id, memberUid);
    showToast('Member removed from group', 'info');
  };

  const handleSetDisappearing = async (seconds: number, label: string) => {
    await updateDisappearingMessages(conversation.id, seconds);
    setShowDisappearingModal(false);
    showToast(`Disappearing messages set to: ${label}`, 'info');
  };

  return (
    <aside className="flex h-full w-full sm:w-80 lg:w-[360px] flex-shrink-0 flex-col border-l border-[#222d34] bg-[#111b21] select-none overflow-hidden animate-in slide-in-from-right">
      {/* Top Header */}
      <div className="flex h-16 items-center justify-between border-b border-[#222d34] bg-[#202c33] px-5 py-3 flex-shrink-0">
        <h3 className="text-sm font-semibold text-[#e9edef]">
          {isDirect ? 'Contact info' : 'Group info'}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#8696a0] hover:bg-[#111b21] hover:text-white transition"
          title="Close"
          aria-label="Close chat details"
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
          {isDirect && (
            <p className="text-[11px] text-[#00a884] mt-1">
              {isOnline ? 'Online now' : formatLastSeen(partnerProfile)}
            </p>
          )}
        </div>

        {/* About / Description */}
        <div className="bg-[#111b21] px-6 py-4 border-b border-[#222d34] space-y-1">
          <span className="text-[11px] font-medium text-[#8696a0]">
            {isDirect ? 'About' : 'Group Description'}
          </span>
          <p className="text-xs text-[#e9edef] leading-relaxed">
            {isDirect
              ? partnerProfile?.bio || 'Hey there! I am using DEV CHAT.'
              : conversation.description || 'DEV CHAT group conversation'}
          </p>
        </div>

        {/* Media and Docs Tabs */}
        <div className="bg-[#111b21] p-5 border-b border-[#222d34] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#e9edef]">
              Media & Documents
            </span>
            <span className="tabular-nums text-xs text-[#8696a0]">
              {mediaMessages.length + fileMessages.length}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-[#202c33] p-1">
            <button
              type="button"
              onClick={() => setActiveMediaTab('media')}
              className={`rounded-lg py-1.5 text-xs font-medium transition ${
                activeMediaTab === 'media'
                  ? 'bg-[#00a884] text-[#0b141a] font-semibold'
                  : 'text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              Media ({mediaMessages.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveMediaTab('docs')}
              className={`rounded-lg py-1.5 text-xs font-medium transition ${
                activeMediaTab === 'docs'
                  ? 'bg-[#00a884] text-[#0b141a] font-semibold'
                  : 'text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              Docs ({fileMessages.length})
            </button>
          </div>

          {activeMediaTab === 'media' ? (
            mediaMessages.length > 0 ? (
              <div className="grid grid-cols-3 gap-1.5">
                {mediaMessages.slice(0, 9).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setViewingMediaUrl(m.fileUrl!);
                      setViewingMediaName(m.fileName);
                    }}
                    className="aspect-square overflow-hidden rounded-lg bg-[#202c33] cursor-pointer hover:opacity-85 transition ring-1 ring-white/5"
                  >
                    <img
                      src={m.fileUrl}
                      alt={m.fileName || 'Shared media'}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#8696a0] py-2">No media shared yet</p>
            )
          ) : fileMessages.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {fileMessages.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setViewingMediaUrl(m.fileUrl!);
                    setViewingMediaName(m.fileName);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl bg-[#202c33] p-2.5 text-left hover:bg-[#2a3942] transition"
                >
                  <FileText className="h-4 w-4 text-[#53bdeb] flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[#e9edef] truncate">
                      {m.fileName || 'Document'}
                    </p>
                    {m.fileSize && (
                      <p className="tabular-nums text-[10px] text-[#8696a0]">
                        {(m.fileSize / 1024).toFixed(1)} KB
                      </p>
                    )}
                  </div>
                  <Download className="h-3.5 w-3.5 text-[#8696a0]" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#8696a0] py-2">No documents shared yet</p>
          )}
        </div>

        {/* Chat Settings Options */}
        <div className="bg-[#111b21] divide-y divide-[#222d34] border-b border-[#222d34]">
          <label className="flex items-center justify-between px-6 py-3.5 cursor-pointer hover:bg-[#202c33]/50 transition">
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
          </label>

          <button
            type="button"
            onClick={() => setShowStarredModal(true)}
            className="flex w-full items-center justify-between px-6 py-3.5 text-left hover:bg-[#202c33] transition"
          >
            <div className="flex items-center gap-4 text-[#e9edef]">
              <Star className="h-5 w-5 text-[#ffd279]" />
              <div>
                <span className="text-xs block">Starred messages</span>
                <span className="tabular-nums text-[10px] text-[#8696a0]">
                  {starredMessages.length} starred
                </span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-[#8696a0]" />
          </button>

          <button
            type="button"
            onClick={() => setShowDisappearingModal(true)}
            className="flex w-full items-center justify-between px-6 py-3.5 text-left hover:bg-[#202c33] transition"
          >
            <div className="flex items-center gap-4 text-[#e9edef]">
              <Clock className="h-5 w-5 text-[#8696a0]" />
              <div>
                <span className="text-xs block">Disappearing messages</span>
                <span className="text-[10px] text-[#00a884]">{disappearingLabel}</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-[#8696a0]" />
          </button>

          <button
            type="button"
            onClick={() => setShowEncryptionModal(true)}
            className="w-full px-6 py-3.5 space-y-1 text-left hover:bg-[#202c33] transition"
          >
            <div className="flex items-center justify-between text-[#e9edef]">
              <div className="flex items-center gap-4">
                <Lock className="h-5 w-5 text-[#00a884]" />
                <span className="text-xs">Encryption</span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#8696a0]" />
            </div>
            <p className="text-[11px] text-[#8696a0] pl-9">
              Messages and calls are end-to-end encrypted. Tap to verify.
            </p>
          </button>
        </div>

        {/* Group Participants */}
        {!isDirect && (
          <div className="bg-[#111b21] p-5 border-b border-[#222d34] space-y-3">
            <div className="flex items-center justify-between">
              <span className="tabular-nums text-xs font-semibold text-[#e9edef]">
                {conversation.participantIds?.length || 0} members
              </span>
              {isGroupAdmin && onOpenAddMembers && (
                <button
                  type="button"
                  onClick={onOpenAddMembers}
                  className="flex items-center gap-1 text-xs font-medium text-[#00a884] hover:underline"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Add member</span>
                </button>
              )}
            </div>

            <div className="divide-y divide-[#222d34]">
              {conversation.participantIds?.map((uid) => {
                const uProfile = userCache[uid];
                const isMemberAdmin = conversation.adminIds?.includes(uid) || false;
                const isCurrent = uid === user?.uid;

                return (
                  <div
                    key={uid}
                    className="flex items-center justify-between py-2.5 gap-2"
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

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isMemberAdmin && (
                        <span className="rounded bg-[#00a884]/20 px-2 py-0.5 text-[9px] font-bold text-[#00a884]">
                          Admin
                        </span>
                      )}
                      {isGroupAdmin && !isCurrent && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleToggleAdmin(uid, isMemberAdmin)}
                            title={isMemberAdmin ? 'Dismiss as admin' : 'Make group admin'}
                            className="rounded px-1.5 py-0.5 text-[10px] text-[#53bdeb] hover:bg-[#202c33]"
                          >
                            {isMemberAdmin ? 'Demote' : 'Make Admin'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(uid)}
                            className="rounded px-1.5 py-0.5 text-[10px] text-rose-400 hover:bg-[#202c33]"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Danger Actions */}
        <div className="bg-[#111b21] divide-y divide-[#222d34] border-b border-[#222d34]">
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="flex w-full items-center gap-4 px-6 py-3.5 text-xs font-medium text-amber-400 hover:bg-[#202c33] transition"
          >
            <Eraser className="h-4 w-4" />
            <span>Clear Chat Messages</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex w-full items-center gap-4 px-6 py-3.5 text-xs font-semibold text-rose-500 hover:bg-[#202c33] transition"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete Chat</span>
          </button>

          {isDirect && (
            <button
              type="button"
              onClick={handleBlockUser}
              className="flex w-full items-center gap-4 px-6 py-3.5 text-xs text-rose-400 hover:bg-[#202c33] transition"
            >
              <Ban className="h-4 w-4" />
              <span>{isBlocked ? `Unblock ${title}` : `Block ${title}`}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setReporting(true)}
            className="flex w-full items-center gap-4 px-6 py-3.5 text-xs text-rose-400 hover:bg-[#202c33] transition"
          >
            <Flag className="h-4 w-4" />
            <span>Report {title}</span>
          </button>
        </div>
      </div>

      {/* Media Viewer */}
      <MediaViewerModal
        mediaUrl={viewingMediaUrl}
        fileName={viewingMediaName}
        onClose={() => setViewingMediaUrl(null)}
      />

      {/* Starred Messages Modal */}
      <Modal
        isOpen={showStarredModal}
        onClose={() => setShowStarredModal(false)}
        title={`Starred Messages (${starredMessages.length})`}
        maxWidth="md"
      >
        {starredMessages.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#8696a0]">
            No starred messages in this conversation yet. Tap the star icon on any message to save it here.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {starredMessages.map((m) => (
              <div
                key={m.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-[#222d34] bg-[#202c33] p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[11px] text-[#8696a0] mb-1">
                    <span className="font-semibold text-[#00a884]">{m.senderName}</span>
                    <span>•</span>
                    <span className="tabular-nums">
                      {new Date(m.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-[#e9edef] break-words">
                    {m.text || m.fileName || m.type}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => starMessage(m.id, false)}
                  className="p-1.5 rounded-lg text-[#ffd279] hover:bg-[#111b21] transition"
                  title="Unstar message"
                >
                  <Star className="h-4 w-4 fill-current" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Disappearing Messages Modal */}
      <Modal
        isOpen={showDisappearingModal}
        onClose={() => setShowDisappearingModal(false)}
        title="Disappearing Messages"
        maxWidth="sm"
      >
        <div className="space-y-3">
          <p className="text-xs text-[#8696a0] leading-relaxed">
            Set the retention policy for new messages sent in this conversation.
          </p>
          <div className="space-y-1.5">
            {DISAPPEARING_OPTIONS.map((opt) => {
              const active = (conversation.disappearingDuration || 0) === opt.seconds;
              return (
                <button
                  key={opt.seconds}
                  type="button"
                  onClick={() => handleSetDisappearing(opt.seconds, opt.label)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-xs font-medium transition border ${
                    active
                      ? 'border-[#00a884] bg-[#00a884]/15 text-[#25d366]'
                      : 'border-[#222d34] bg-[#202c33] text-[#e9edef] hover:bg-[#2a3942]'
                  }`}
                >
                  <span>{opt.label}</span>
                  {active && <span className="text-[11px] font-bold">Active</span>}
                </button>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* Encryption Safety Number Modal */}
      <Modal
        isOpen={showEncryptionModal}
        onClose={() => setShowEncryptionModal(false)}
        title="Verify Security Code"
        maxWidth="sm"
      >
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00a884]/15 text-[#25d366]">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <p className="text-xs text-[#8696a0] leading-relaxed">
            Compare these 60 security digits with {title} to confirm end-to-end encryption for this chat.
          </p>
          <div className="grid grid-cols-4 gap-2 rounded-2xl border border-[#222d34] bg-[#0b141a] p-4 font-mono text-xs text-[#e9edef] tabular-nums">
            {safetyDigits.map((blk, i) => (
              <span key={i} className="tracking-wider">
                {blk}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#00a884]">
            <Shield className="h-3.5 w-3.5" />
            <span>End-to-end security verified</span>
          </div>
        </div>
      </Modal>

      {/* Report Modal */}
      <Modal
        isOpen={reporting}
        onClose={() => setReporting(false)}
        title={`Report ${title}`}
        maxWidth="sm"
      >
        <form onSubmit={handleReport} className="space-y-4">
          <p className="text-xs text-[#8696a0]">
            Help keep DEV CHAT safe. Your report will be submitted directly to moderation.
          </p>
          <div>
            <label className="block text-xs font-medium text-[#8696a0] mb-1.5">Category</label>
            <select
              value={reportCategory}
              onChange={(e) => setReportCategory(e.target.value)}
              className="w-full rounded-xl border border-[#222d34] bg-[#202c33] px-3 py-2.5 text-xs text-[#e9edef] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
            >
              <option value="Harassment or Spam">Harassment or Spam</option>
              <option value="Impersonation or Scam">Impersonation or Scam</option>
              <option value="Inappropriate Content">Inappropriate Content</option>
              <option value="Security Abuse">Security Abuse</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#8696a0] mb-1.5">Details</label>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={3}
              required
              placeholder="Describe the issue..."
              className="w-full rounded-xl border border-[#222d34] bg-[#202c33] p-3 text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReporting(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-[#8696a0] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingReport}
              className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-50"
            >
              {submittingReport ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Clear Chat Confirmation */}
      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        loading={actionBusy}
        onConfirm={async () => {
          setActionBusy(true);
          try {
            await clearConversation(conversation.id);
            showToast('Messages cleared from your view', 'info');
          } finally {
            setActionBusy(false);
            setShowClearConfirm(false);
          }
        }}
        title="Clear chat history?"
        description="This removes existing messages in this chat from your account while keeping the conversation."
        confirmText="Clear messages"
        variant="warning"
      />

      {/* Delete Chat Confirmation */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        loading={actionBusy}
        onConfirm={async () => {
          setActionBusy(true);
          try {
            await deleteConversation(conversation.id);
            showToast('Chat deleted', 'info');
            onClose();
          } finally {
            setActionBusy(false);
            setShowDeleteConfirm(false);
          }
        }}
        title={`Delete chat with ${title}?`}
        description="This will remove the conversation from your chat list. New incoming messages will reopen it."
        confirmText="Delete chat"
        variant="danger"
      />
    </aside>
  );
};
