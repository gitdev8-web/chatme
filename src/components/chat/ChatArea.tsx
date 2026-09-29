/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Info,
  Search,
  ChevronDown,
  MessageSquare,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { Message, UserProfile } from '../../types';
import { Avatar } from '../common/Avatar';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { MediaViewerModal } from './MediaViewerModal';
import { Modal } from '../common/Modal';
import { MessagesSkeleton } from '../common/LoadingSkeleton';
import { EmptyState } from '../common/EmptyState';
import { Realistic3DIcon } from '../common/Realistic3DIcon';
import { ForwardModal } from './ForwardModal';

interface ChatAreaProps {
  onBackMobile: () => void;
  onToggleDetails: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  onBackMobile,
  onToggleDetails,
}) => {
  const { user, profile } = useAuth();
  const {
    activeConversation,
    messages,
    typingUsers,
    userCache,
    loadingMessages,
    sendTextMessage,
    sendFileMessage,
    editCurrentMessage,
    deleteMessage,
    reactToMessage,
    setReplyingTo,
  } = useChat();

  const [searchInChat, setSearchInChat] = useState(false);
  const [chatSearchTerm, setChatSearchTerm] = useState('');
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [viewingMediaUrl, setViewingMediaUrl] = useState<string | null>(null);
  const [viewingMediaName, setViewingMediaName] = useState<string | undefined>(undefined);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const isDirect = activeConversation?.type === 'direct';
  const partnerId = isDirect
    ? activeConversation.participantIds.find((id) => id !== user?.uid) || user?.uid
    : null;
  const partnerProfile = partnerId ? userCache[partnerId] : null;

  const title = isDirect
    ? partnerProfile?.displayName || 'Direct Message'
    : activeConversation?.name || 'Group Chat';

  const avatarSrc = isDirect
    ? partnerProfile?.photoURL
    : activeConversation?.photoURL;

  const isPartnerOnline = isDirect
    ? (partnerProfile?.showOnlineStatus !== false && partnerProfile?.isOnline)
    : false;

  // Auto-scroll to bottom on messages change
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [activeConversation?.id]);

  useEffect(() => {
    if (!showScrollBottom) {
      scrollToBottom(true);
    }
  }, [messages.length]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distFromBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollBottom(distFromBottom > 150);
  };

  const handleScrollToMessage = (messageId: string) => {
    const el = document.getElementById(`msg_${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-emerald-500/10');
      setTimeout(() => el.classList.remove('bg-emerald-500/10'), 1500);
    }
  };

  // Group messages by date
  const filteredMessages = messages.filter((m) => {
    if (!chatSearchTerm.trim()) return true;
    return m.text?.toLowerCase().includes(chatSearchTerm.toLowerCase());
  });

  const formatDateHeader = (isoString: string) => {
    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  // Typing indicator text
  const typingText = () => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) {
      return `${typingUsers[0].displayName} is typing...`;
    }
    if (typingUsers.length === 2) {
      return `${typingUsers[0].displayName} and ${typingUsers[1].displayName} are typing...`;
    }
    return 'Several people are typing...';
  };

  if (!activeConversation) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center bg-[#0b141a] p-6 select-none whatsapp-chat-bg text-center">
        <div className="mb-4">
          <Realistic3DIcon name="whatsapp" size="2xl" showDots={true} />
        </div>
        <h3 className="text-base font-bold text-[#e9edef] mt-2">Chattr for Web & Mobile</h3>
        <p className="mt-1.5 max-w-sm text-xs text-[#8696a0] leading-relaxed">
          Send and receive messages in real time with teachers, students, parents, and school staff.
        </p>
        <div className="mt-6 flex items-center gap-1.5 text-[11px] text-[#8696a0] bg-[#111b21] px-3.5 py-1.5 rounded-full border border-[#222d34]">
          <Lock className="h-3 w-3 text-[#25d366]" />
          <span>Protected with Zero-Trust Firestore Security</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col bg-[#0b141a] relative overflow-hidden select-none">
      {/* Top Header - WhatsApp Styling */}
      <div className="flex items-center justify-between border-b border-[#222d34] bg-[#202c33] px-4 py-2.5 z-10 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back Button */}
          <button
            onClick={onBackMobile}
            className="md:hidden rounded-xl p-1.5 text-[#8696a0] hover:bg-[#111b21] hover:text-white transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <Avatar
            src={avatarSrc}
            name={title}
            size="md"
            isOnline={isPartnerOnline}
            showPresence={isDirect}
            className="cursor-pointer"
          />

          <div className="min-w-0 cursor-pointer" onClick={onToggleDetails}>
            <h3 className="text-xs font-bold text-[#e9edef] truncate hover:text-[#25d366] transition-colors">
              {title}
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] text-[#8696a0] truncate">
              {typingUsers.length > 0 ? (
                <span className="text-[#25d366] font-medium animate-pulse">
                  {typingText()}
                </span>
              ) : isDirect ? (
                isPartnerOnline ? (
                  <span className="text-[#25d366] font-medium">online</span>
                ) : (
                  <span>
                    last seen{' '}
                    {partnerProfile?.lastSeen
                      ? new Date(partnerProfile.lastSeen).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'recently'}
                  </span>
                )
              ) : (
                <span>{activeConversation.participantIds.length} members</span>
              )}
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSearchInChat(!searchInChat)}
            className={`rounded-xl p-2 transition ${
              searchInChat
                ? 'bg-[#005c4b] text-[#25d366]'
                : 'text-[#8696a0] hover:bg-[#111b21] hover:text-white'
            }`}
            title="Search messages in chat"
          >
            <Search className="h-4 w-4" />
          </button>

          <button
            onClick={onToggleDetails}
            className="rounded-xl p-2 text-[#8696a0] hover:bg-[#111b21] hover:text-white transition"
            title="Conversation details"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* In-Chat Search Bar */}
      {searchInChat && (
        <div className="border-b border-[#222d34] bg-[#202c33] px-4 py-2 flex items-center gap-2 animate-in fade-in">
          <Search className="h-4 w-4 text-[#8696a0]" />
          <input
            type="text"
            value={chatSearchTerm}
            onChange={(e) => setChatSearchTerm(e.target.value)}
            placeholder="Search within this chat..."
            className="flex-1 bg-transparent text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none"
            autoFocus
          />
          {chatSearchTerm && (
            <button
              onClick={() => setChatSearchTerm('')}
              className="text-xs text-[#8696a0] hover:text-[#e9edef]"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Messages Scroll Container with WhatsApp Background */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-1 relative whatsapp-chat-bg"
      >
        {loadingMessages ? (
          <MessagesSkeleton />
        ) : filteredMessages.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title={chatSearchTerm ? 'No messages matched' : 'Start the conversation'}
            description={
              chatSearchTerm
                ? 'Try a different search term.'
                : 'Send your first message to begin real-time chatting!'
            }
            className="pt-20"
          />
        ) : (
          filteredMessages.map((msg, index) => {
            const isSelf = msg.senderId === user?.uid;
            const prevMsg = filteredMessages[index - 1];
            const isNewDay =
              !prevMsg ||
              formatDateHeader(msg.createdAt) !== formatDateHeader(prevMsg.createdAt);

            return (
              <React.Fragment key={msg.id}>
                {/* Date separator */}
                {isNewDay && (
                  <div className="flex justify-center my-3">
                    <span className="rounded-full bg-slate-800/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border border-slate-700/40">
                      {formatDateHeader(msg.createdAt)}
                    </span>
                  </div>
                )}

                <MessageBubble
                  message={msg}
                  isSelf={isSelf}
                  isGroup={activeConversation.type === 'group'}
                  userCache={userCache}
                  onReply={(m) => setReplyingTo(m)}
                  onEdit={(m) => {
                    setEditingMessage(m);
                    setEditText(m.text);
                  }}
                  onDelete={(id, forEveryone) => deleteMessage(id, forEveryone)}
                  onReact={(id, emoji) => reactToMessage(id, emoji)}
                  onOpenMedia={(url, name) => {
                    setViewingMediaUrl(url);
                    setViewingMediaName(name);
                  }}
                  onScrollToMessage={handleScrollToMessage}
                  onForward={(m) => setForwardingMessage(m)}
                />
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-20 right-6 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-slate-200 shadow-xl hover:bg-slate-700 hover:text-white transition animate-in fade-in"
          title="Scroll to bottom"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      )}

      {/* Composer */}
      <MessageComposer
        onSendTextMessage={sendTextMessage}
        onSendFileMessage={sendFileMessage}
      />

      {/* Forward Modal */}
      <ForwardModal
        message={forwardingMessage}
        isOpen={!!forwardingMessage}
        onClose={() => setForwardingMessage(null)}
      />

      {/* Edit Message Modal */}
      {editingMessage && (
        <Modal
          isOpen={!!editingMessage}
          onClose={() => setEditingMessage(null)}
          title="Edit Message"
          maxWidth="md"
        >
          <div className="space-y-4">
            <textarea
              rows={3}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-xs text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingMessage(null)}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs text-slate-300 hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (editText.trim()) {
                    await editCurrentMessage(editingMessage.id, editText);
                    setEditingMessage(null);
                  }
                }}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Media Viewer Modal */}
      <MediaViewerModal
        mediaUrl={viewingMediaUrl}
        fileName={viewingMediaName}
        onClose={() => setViewingMediaUrl(null)}
      />
    </div>
  );
};
