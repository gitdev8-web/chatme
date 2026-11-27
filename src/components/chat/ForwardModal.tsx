/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Send, Search, Check } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { Message, Conversation, UserProfile } from '../../types';
import { Avatar } from '../common/Avatar';
import { useToast } from '../common/Toast';
import { sendMessage } from '../../services/chatService';

interface ForwardModalProps {
  message: Message | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({
  message,
  isOpen,
  onClose,
}) => {
  const { user, profile } = useAuth();
  const { conversations, userCache, setActiveConversationId } = useChat();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [sendingToId, setSendingToId] = useState<string | null>(null);

  if (!message) return null;

  const filteredConversations = (conversations || []).filter((c) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (c.type === 'group' && (c.name || '').toLowerCase().includes(term)) return true;

    const partnerId = c.participantIds?.find((id) => id !== user?.uid);
    if (partnerId && userCache[partnerId]) {
      const p = userCache[partnerId];
      return (
        (p?.displayName || '').toLowerCase().includes(term) ||
        (p?.username || '').toLowerCase().includes(term)
      );
    }
    return false;
  });

  const handleForward = async (targetConv: Conversation) => {
    if (!user) return;
    setSendingToId(targetConv.id);
    try {
      await sendMessage(
        targetConv.id,
        user.uid,
        profile?.displayName || 'User',
        profile?.photoURL,
        message.text,
        message.type,
        {
          isForwarded: true,
          fileUrl: message.fileUrl,
          fileName: message.fileName,
          fileSize: message.fileSize,
          fileType: message.fileType,
          audioDuration: message.audioDuration,
          poll: message.poll,
          location: message.location,
          contactCard: message.contactCard,
          meet: message.meet,
        }
      );

      showToast('Message forwarded!', 'success');
      setActiveConversationId(targetConv.id);
      onClose();
    } catch {
      showToast('Failed to forward message', 'error');
    } finally {
      setSendingToId(null);
    }
  };

  const previewLabel =
    message.type === 'text'
      ? message.text
      : message.type === 'image'
      ? '📷 Photo'
      : message.type === 'video'
      ? '🎬 Video'
      : message.type === 'voice'
      ? '🎤 Voice Message'
      : message.type === 'poll'
      ? `📊 ${message.poll?.question || 'Poll'}`
      : message.type === 'location'
      ? `📍 ${message.location?.label || 'Location'}`
      : message.type === 'contact'
      ? `👤 ${message.contactCard?.displayName || 'Contact'}`
      : message.type === 'meet'
      ? `📹 Google Meet (${message.meet?.meetingCode || 'Video Call'})`
      : `📎 ${message.fileName || 'File'}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Forward Message"
      subtitle="Select a chat or group to share this message"
      maxWidth="sm"
    >
      <div className="space-y-3 select-none">
        {/* Message preview snippet */}
        <div className="p-3 rounded-xl bg-[#202c33]/70 border border-[#222d34] text-xs text-[#8696a0] truncate">
          <span className="text-[#25d366] font-semibold mr-1">Forwarding:</span>
          {previewLabel}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696a0]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-xl border border-[#222d34] bg-[#202c33] pl-9 pr-9 py-2.5 text-[16px] sm:text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#25d366] focus:outline-none"
          />
        </div>

        {/* List of conversations */}
        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
          {filteredConversations.length === 0 ? (
            <p className="text-center py-6 text-xs text-[#8696a0]">
              No conversations found.
            </p>
          ) : (
            filteredConversations.map((conv) => {
              const isDirect = conv.type === 'direct';
              const partnerId = isDirect
                ? conv.participantIds.find((id) => id !== user?.uid) || user?.uid
                : null;
              const partnerProfile = partnerId ? userCache[partnerId] : null;
              const title = isDirect
                ? partnerProfile?.displayName || 'Direct Chat'
                : conv.name || 'Group';

              return (
                <div
                  key={conv.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#202c33]/60 hover:bg-[#202c33] transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      src={isDirect ? partnerProfile?.photoURL : conv.photoURL}
                      name={title}
                      size="sm"
                    />
                    <div className="truncate">
                      <span className="text-xs font-semibold text-[#e9edef] block truncate">
                        {title}
                      </span>
                      <span className="text-[10px] text-[#8696a0] block truncate">
                        {conv.type === 'group' ? 'Group' : `@${partnerProfile?.username || 'user'}`}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleForward(conv)}
                    disabled={sendingToId === conv.id}
                    className="min-h-[38px] flex items-center gap-1 rounded-xl bg-[#00a884] px-3.5 py-1.5 text-xs font-bold text-[#0b141a] hover:bg-[#06cf9c] disabled:opacity-50 transition flex-shrink-0"
                  >
                    <Send className="h-3 w-3" />
                    <span>{sendingToId === conv.id ? 'Sending...' : 'Send'}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};
