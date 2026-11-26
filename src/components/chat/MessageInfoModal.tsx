/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Check, CheckCheck, Clock } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Avatar } from '../common/Avatar';
import { Message, UserProfile } from '../../types';

interface MessageInfoModalProps {
  isOpen: boolean;
  message: Message | null;
  participantIds: string[];
  currentUserId: string;
  userCache: Record<string, UserProfile>;
  onClose: () => void;
}

export const MessageInfoModal: React.FC<MessageInfoModalProps> = ({
  isOpen,
  message,
  participantIds,
  currentUserId,
  userCache,
  onClose,
}) => {
  if (!message) return null;

  const recipients = participantIds.filter((uid) => uid !== message.senderId);
  const readBy = (message.readBy || []).filter((uid) => uid !== message.senderId);
  const deliveredOnly = (message.deliveredTo || []).filter(
    (uid) => uid !== message.senderId && !readBy.includes(uid)
  );
  const pending = recipients.filter(
    (uid) => !readBy.includes(uid) && !deliveredOnly.includes(uid)
  );

  const renderUserRow = (uid: string, status: 'read' | 'delivered' | 'sent') => {
    const profile = userCache[uid];
    const name = uid === currentUserId ? 'You' : profile?.displayName || 'DEV CHAT User';
    return (
      <div
        key={uid}
        className="flex items-center justify-between gap-3 rounded-xl bg-[#202c33]/70 px-3 py-2.5 border border-[#222d34]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar src={profile?.photoURL} name={name} size="sm" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#e9edef] truncate">{name}</p>
            {profile?.username && (
              <p className="text-[10px] text-[#8696a0] truncate">@{profile.username}</p>
            )}
          </div>
        </div>
        {status === 'read' ? (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#53bdeb]">
            <CheckCheck className="h-3.5 w-3.5" />
            <span>Read</span>
          </span>
        ) : status === 'delivered' ? (
          <span className="flex items-center gap-1 text-[11px] font-medium text-[#8696a0]">
            <CheckCheck className="h-3.5 w-3.5" />
            <span>Delivered</span>
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] text-[#8696a0]/80">
            <Check className="h-3.5 w-3.5" />
            <span>Sent</span>
          </span>
        )}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Message Info"
      subtitle={`Sent ${new Date(message.createdAt).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`}
      maxWidth="sm"
    >
      <div className="space-y-4">
        {/* Preview Bubble */}
        <div className="rounded-xl bg-[#005c4b] px-3.5 py-2.5 text-xs text-[#e9edef] shadow-inner">
          <p className="line-clamp-3 break-words">
            {message.text || message.fileName || message.type}
          </p>
          <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-white/75 tabular-nums">
            <Clock className="h-2.5 w-2.5" />
            <span>
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {/* Read By */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#53bdeb]">
            <CheckCheck className="h-4 w-4" />
            <span>Read by ({readBy.length})</span>
          </div>
          {readBy.length === 0 ? (
            <p className="text-[11px] text-[#8696a0] px-1">Not read yet</p>
          ) : (
            <div className="space-y-1.5">{readBy.map((uid) => renderUserRow(uid, 'read'))}</div>
          )}
        </div>

        {/* Delivered To */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#8696a0]">
            <CheckCheck className="h-4 w-4" />
            <span>Delivered to ({deliveredOnly.length})</span>
          </div>
          {deliveredOnly.length === 0 ? (
            <p className="text-[11px] text-[#8696a0] px-1">
              {readBy.length > 0 ? 'All delivered recipients have read it' : 'Waiting for delivery'}
            </p>
          ) : (
            <div className="space-y-1.5">
              {deliveredOnly.map((uid) => renderUserRow(uid, 'delivered'))}
            </div>
          )}
        </div>

        {/* Pending */}
        {pending.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#8696a0]/80">
              <Check className="h-4 w-4" />
              <span>Pending ({pending.length})</span>
            </div>
            <div className="space-y-1.5">{pending.map((uid) => renderUserRow(uid, 'sent'))}</div>
          </div>
        )}
      </div>
    </Modal>
  );
};
