/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Search,
  ChevronDown,
  Lock,
  Phone,
  Video,
  MoreVertical,
  X,
  Laptop,
  Smartphone,
  Shield,
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
import { ForwardModal } from './ForwardModal';
import { CallModal } from '../calls/CallModal';
import { initiateCall } from '../../services/callService';
import { useToast } from '../common/Toast';

interface ChatAreaProps {
  onBackMobile: () => void;
  onToggleDetails: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  onBackMobile,
  onToggleDetails,
}) => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const {
    activeConversationId,
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
    setActiveConversationId,
  } = useChat();

  const [searchInChat, setSearchInChat] = useState(false);
  const [chatSearchTerm, setChatSearchTerm] = useState('');
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [viewingMediaUrl, setViewingMediaUrl] = useState<string | null>(null);
  const [viewingMediaName, setViewingMediaName] = useState<string | undefined>(undefined);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Calling state
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [activeCallSessionId, setActiveCallSessionId] = useState<string | undefined>(undefined);

  // Header 3-dots menu
  const [showChatMenu, setShowChatMenu] = useState(false);
  const chatMenuRef = useRef<HTMLDivElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const isDirect = activeConversation?.type === 'direct';
  const partnerId = isDirect
    ? (activeConversation?.participantIds?.find((id) => id !== user?.uid) ||
       (activeConversation?.id?.startsWith('dm_')
         ? activeConversation.id.replace('dm_', '').split('_').find((id) => id !== user?.uid)
         : null))
    : null;
  const partnerProfile = partnerId ? userCache[partnerId] : null;

  const title = isDirect
    ? partnerProfile?.displayName || 'DEV CHAT User'
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
  }, [(messages || []).length]);

  // Close header menu on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target as Node)) {
        setShowChatMenu(false);
      }
    };
    if (showChatMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showChatMenu]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distFromBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollBottom(distFromBottom > 150);
  };

  // Group messages by date
  const filteredMessages = (messages || []).filter((m) => {
    if (!chatSearchTerm.trim()) return true;
    return (m.text || '').toLowerCase().includes(chatSearchTerm.toLowerCase());
  });

  const formatDateHeader = (isoString: string) => {
    const d = new Date(isoString);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return 'TODAY';

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'YESTERDAY';

    return d.toLocaleDateString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const handleStartCall = async (type: 'audio' | 'video') => {
    if (!user) return;
    setCallType(type);

    let targetUid = partnerId;
    if ((!targetUid || targetUid === user.uid) && activeConversation?.id?.startsWith('dm_')) {
      targetUid = activeConversation.id.replace('dm_', '').split('_').find((id) => id !== user.uid) || null;
    }
    if (!targetUid || targetUid === user.uid) {
      targetUid = activeConversation?.participantIds?.find((id) => id !== user.uid) || null;
    }

    if (!targetUid || targetUid === user.uid) {
      showToast('Cannot call: no recipient contact found', 'error');
      return;
    }

    try {
      const cid = await initiateCall(
        user.uid,
        profile?.displayName || user.displayName || 'DEV CHAT User',
        profile?.photoURL || user.photoURL || '',
        targetUid,
        partnerProfile?.displayName || 'Contact',
        type
      );
      setActiveCallSessionId(cid);
      setIsCallOpen(true);
    } catch (err) {
      console.warn('Call initiation warning:', err);
      showToast('Could not start call. Please try again.', 'error');
    }
  };

  // Typing indicator text
  const typingText = () => {
    if (!typingUsers || typingUsers.length === 0) return null;
    if (typingUsers.length === 1) {
      return `${typingUsers[0]?.displayName || 'Someone'} is typing...`;
    }
    if (typingUsers.length === 2) {
      return `${typingUsers[0]?.displayName || 'User'} and ${typingUsers[1]?.displayName || 'User'} are typing...`;
    }
    return 'Several people are typing...';
  };

  // Loading state when a conversation ID is selected but data is being synced
  if (activeConversationId && !activeConversation) {
    return (
      <div className="flex h-full flex-1 flex-col bg-[#0b141a] relative overflow-hidden select-none">
        <div className="flex h-16 items-center border-b border-[#222d34] bg-[#202c33] px-3 sm:px-4 py-2 z-10 shadow-sm flex-shrink-0">
          <button
            onClick={onBackMobile}
            className="md:hidden rounded-full p-2 -ml-1 text-[#8696a0] hover:bg-[#111b21] hover:text-white transition active:scale-95 flex-shrink-0 mr-2"
            title="Back to chats"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#2a3942] animate-pulse flex-shrink-0" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-28 rounded bg-[#2a3942] animate-pulse" />
              <div className="h-2.5 w-16 rounded bg-[#2a3942]/70 animate-pulse" />
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 whatsapp-chat-bg">
          <MessagesSkeleton />
        </div>
      </div>
    );
  }

  // WhatsApp Web Welcome Splash Screen (desktop only when no conversation is selected)
  if (!activeConversation) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center bg-[#222e35] p-8 select-none text-center relative border-b-6 border-[#00a884]">
        <div className="flex flex-col items-center max-w-md my-auto">
          {/* Dual Screen Laptop & Phone Illustration */}
          <div className="relative mb-8 flex items-center justify-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#111b21] shadow-2xl border border-[#2a3942]">
              <Laptop className="h-14 w-14 text-[#8696a0]" />
            </div>
            <div className="absolute -bottom-2 -right-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00a884] text-white shadow-xl ring-4 ring-[#222e35]">
              <Smartphone className="h-6 w-6" />
            </div>
          </div>

          <h2 className="text-2xl font-light text-[#e9edef] tracking-wide">
            DEV CHAT Web
          </h2>
          <p className="mt-3 text-sm text-[#8696a0] leading-relaxed">
            Send and receive messages, make real-time audio and video calls, and share status stories across all your devices.
          </p>
        </div>

        {/* Bottom Lock End-to-end Encrypted */}
        <div className="mt-auto pb-4 flex items-center gap-1.5 text-xs text-[#8696a0]">
          <Lock className="h-3.5 w-3.5" />
          <span>Your personal messages and calls are end-to-end encrypted</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col bg-[#0b141a] relative overflow-hidden select-none">
      {/* Top Header - Authentic WhatsApp Web Header */}
      <div className="flex h-16 items-center justify-between border-b border-[#222d34] bg-[#202c33] px-3 sm:px-4 py-2 z-10 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Back Button */}
          <button
            onClick={onBackMobile}
            className="md:hidden rounded-full p-2 -ml-1 text-[#8696a0] hover:bg-[#111b21] hover:text-white transition active:scale-95 flex-shrink-0"
            title="Back to chats"
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
            onClick={onToggleDetails}
          />

          <div className="min-w-0 cursor-pointer" onClick={onToggleDetails}>
            <h3 className="text-sm font-normal text-[#e9edef] truncate hover:underline">
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
                <span>
                  {activeConversation?.participantIds?.length || 0} members
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-2 text-[#aebac1] flex-shrink-0">
          {/* Video Call */}
          <button
            onClick={() => handleStartCall('video')}
            className="p-1.5 sm:p-2 rounded-full hover:bg-[#374248] hover:text-[#e9edef] transition active:scale-95"
            title="Video call"
          >
            <Video className="h-5 w-5" />
          </button>

          {/* Voice Call */}
          <button
            onClick={() => handleStartCall('audio')}
            className="p-1.5 sm:p-2 rounded-full hover:bg-[#374248] hover:text-[#e9edef] transition active:scale-95"
            title="Voice call"
          >
            <Phone className="h-5 w-5" />
          </button>

          <div className="hidden sm:block h-4 w-[1px] bg-[#374248] mx-1" />

          {/* Search in chat */}
          <button
            onClick={() => setSearchInChat(!searchInChat)}
            className={`hidden sm:flex p-2 rounded-full transition ${
              searchInChat
                ? 'bg-[#00a884] text-white'
                : 'hover:bg-[#374248] hover:text-[#e9edef]'
            }`}
            title="Search in chat"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* 3-Dots Menu Dropdown */}
          <div className="relative" ref={chatMenuRef}>
            <button
              onClick={() => setShowChatMenu(!showChatMenu)}
              className="p-2 rounded-full hover:bg-[#374248] hover:text-[#e9edef] transition"
              title="Menu"
            >
              <MoreVertical className="h-5 w-5" />
            </button>

            {showChatMenu && (
              <div className="absolute right-0 top-11 z-50 w-48 rounded-2xl border border-[#222d34] bg-[#233138] py-2 shadow-2xl backdrop-blur-md animate-in fade-in">
                <button
                  onClick={() => {
                    setShowChatMenu(false);
                    onToggleDetails();
                  }}
                  className="flex w-full items-center px-4 py-2.5 text-xs text-[#d1d7db] hover:bg-[#182229] transition"
                >
                  {isDirect ? 'Contact info' : 'Group info'}
                </button>
                <button
                  onClick={() => {
                    setShowChatMenu(false);
                    setSearchInChat(true);
                  }}
                  className="flex w-full items-center px-4 py-2.5 text-xs text-[#d1d7db] hover:bg-[#182229] transition"
                >
                  Search messages
                </button>
                <button
                  onClick={() => {
                    setShowChatMenu(false);
                    setActiveConversationId(null);
                  }}
                  className="flex w-full items-center px-4 py-2.5 text-xs text-[#d1d7db] hover:bg-[#182229] transition"
                >
                  Close chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inline Search Bar */}
      {searchInChat && (
        <div className="flex items-center gap-3 border-b border-[#222d34] bg-[#202c33] px-4 py-2 text-xs">
          <Search className="h-4 w-4 text-[#8696a0]" />
          <input
            type="text"
            value={chatSearchTerm}
            onChange={(e) => setChatSearchTerm(e.target.value)}
            placeholder="Search messages in this chat..."
            className="flex-1 bg-transparent text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none"
            autoFocus
          />
          <button
            onClick={() => {
              setSearchInChat(false);
              setChatSearchTerm('');
            }}
            className="text-[#8696a0] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Messages Scroll Area with WhatsApp Doodle Background */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 whatsapp-chat-bg relative"
      >
        {/* End-to-end Encryption Yellow/Gold Notice Pill */}
        <div className="flex justify-center my-3">
          <div className="max-w-md rounded-lg bg-[#182229] px-4 py-2 text-center text-[11px] text-[#ffd279] shadow-sm flex items-center justify-center gap-1.5 leading-relaxed border border-[#ffd279]/10">
            <Lock className="h-3 w-3 flex-shrink-0 text-[#ffd279]" />
            <span>
              Messages and calls are end-to-end encrypted. No one outside of this chat, not even DEV CHAT, can read or listen to them.
            </span>
          </div>
        </div>

        {loadingMessages ? (
          <div className="space-y-4 pt-4">
            <MessagesSkeleton />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center text-xs text-[#8696a0]">
            <span>{chatSearchTerm ? 'No messages match your search' : 'Say hi to start the conversation!'}</span>
          </div>
        ) : (
          filteredMessages.map((msg, idx) => {
            const prevMsg = filteredMessages[idx - 1];
            const showDateHeader =
              !prevMsg ||
              new Date(msg.createdAt).toDateString() !==
                new Date(prevMsg.createdAt).toDateString();

            return (
              <React.Fragment key={msg.id}>
                {showDateHeader && (
                  <div className="my-4 flex justify-center sticky top-2 z-10">
                    <span className="rounded-lg bg-[#182229] px-3 py-1 text-[11px] font-medium text-[#8696a0] shadow-sm uppercase tracking-wider">
                      {formatDateHeader(msg.createdAt)}
                    </span>
                  </div>
                )}
                <MessageBubble
                  message={msg}
                  isSelf={msg.senderId === user?.uid}
                  isGroup={activeConversation.type === 'group'}
                  userCache={userCache}
                  onReply={(m) => setReplyingTo(m)}
                  onEdit={(m) => {
                    setEditingMessage(m);
                    setEditText(m.text);
                  }}
                  onDelete={deleteMessage}
                  onReact={reactToMessage}
                  onOpenMedia={(url, name) => {
                    setViewingMediaUrl(url);
                    setViewingMediaName(name);
                  }}
                  onScrollToMessage={(mid) => {
                    const el = document.getElementById(`msg_${mid}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  onForward={(m) => setForwardingMessage(m)}
                />
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Floating Button */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-20 right-6 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-[#202c33] text-[#8696a0] shadow-xl hover:text-white border border-[#222d34] transition hover:scale-105"
          title="Scroll to bottom"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      )}

      {/* Message Composer (Bottom Bar) */}
      <MessageComposer
        onSendTextMessage={sendTextMessage}
        onSendFileMessage={sendFileMessage}
      />

      {/* Modals */}
      <MediaViewerModal
        mediaUrl={viewingMediaUrl}
        fileName={viewingMediaName}
        onClose={() => setViewingMediaUrl(null)}
      />

      <ForwardModal
        isOpen={!!forwardingMessage}
        message={forwardingMessage}
        onClose={() => setForwardingMessage(null)}
      />

      {/* Calling Modal */}
      <CallModal
        isOpen={isCallOpen}
        onClose={() => {
          setIsCallOpen(false);
          setActiveCallSessionId(undefined);
        }}
        contactName={title}
        contactPhoto={avatarSrc}
        callType={callType}
        callSessionId={activeCallSessionId}
      />

      {/* Edit Message Modal */}
      <Modal
        isOpen={!!editingMessage}
        onClose={() => setEditingMessage(null)}
        title="Edit message"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-[#222d34] bg-[#202c33] p-3 text-xs text-[#e9edef] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditingMessage(null)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-[#8696a0] hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (editingMessage && editText.trim()) {
                  await editCurrentMessage(editingMessage.id, editText.trim());
                  setEditingMessage(null);
                }
              }}
              className="rounded-xl bg-[#00a884] px-4 py-2 text-xs font-semibold text-white hover:bg-[#009374]"
            >
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
