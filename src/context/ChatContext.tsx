/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { useAuth } from './AuthContext';
import { sound } from '../hooks/useSound';
import {
  Conversation,
  Message,
  MessageType,
  TypingStatus,
  UserProfile,
} from '../types';
import {
  createGroupConversation,
  deleteMessageForEveryone,
  deleteMessageForMe,
  editMessage,
  getOrCreateDirectConversation,
  markConversationAsRead,
  sendMessage,
  setTypingStatus,
  toggleMessageReaction,
} from '../services/chatService';
import { uploadFileWithProgress } from '../services/storageService';

interface ChatContextType {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  messages: Message[];
  typingUsers: TypingStatus[];
  userCache: Record<string, UserProfile>;
  loadingConversations: boolean;
  loadingMessages: boolean;
  replyingTo: Message | null;
  showChatDetails: boolean;
  activeFilter: 'all' | 'direct' | 'groups' | 'unread' | 'archived';
  uploadProgress: number | null;
  setActiveConversationId: (id: string | null) => void;
  setReplyingTo: (msg: Message | null) => void;
  setShowChatDetails: (show: boolean) => void;
  setActiveFilter: (filter: 'all' | 'direct' | 'groups' | 'unread' | 'archived') => void;
  startDirectChat: (targetUid: string) => Promise<string>;
  createNewGroup: (
    name: string,
    description: string,
    photoURL: string,
    participantIds: string[]
  ) => Promise<string>;
  sendTextMessage: (text: string) => Promise<void>;
  sendFileMessage: (
    file: File | Blob,
    type: MessageType,
    fileName: string,
    duration?: number
  ) => Promise<void>;
  editCurrentMessage: (messageId: string, text: string) => Promise<void>;
  deleteMessage: (messageId: string, forEveryone: boolean) => Promise<void>;
  reactToMessage: (messageId: string, emoji: string) => Promise<void>;
  emitTyping: (isTyping: boolean) => void;
  getUserProfile: (uid: string) => Promise<UserProfile | null>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingStatus[]>([]);
  const [userCache, setUserCache] = useState<Record<string, UserProfile>>({});
  const [loadingConversations, setLoadingConversations] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showChatDetails, setShowChatDetails] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'direct' | 'groups' | 'unread' | 'archived'>('all');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageSoundRef = useRef<string | null>(null);

  // Helper to fetch and cache user profiles
  const getUserProfile = useCallback(
    async (uid: string): Promise<UserProfile | null> => {
      if (userCache[uid]) return userCache[uid];
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) {
          const uProfile = snap.data() as UserProfile;
          setUserCache((prev) => ({ ...prev, [uid]: uProfile }));
          return uProfile;
        }
      } catch (err) {
        // Continue gracefully
      }
      return null;
    },
    [userCache]
  );

  // Listen to conversations for current user
  useEffect(() => {
    if (!user) {
      setConversations([]);
      setLoadingConversations(false);
      return;
    }

    setLoadingConversations(true);
    const q = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const convList: Conversation[] = [];
        snapshot.forEach((doc) => {
          convList.push(doc.data() as Conversation);
        });

        // Sort by updatedAt descending
        convList.sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        setConversations(convList);
        setLoadingConversations(false);

        // Preload participant user profiles
        convList.forEach((conv) => {
          conv.participantIds.forEach((uid) => {
            if (uid !== user.uid && !userCache[uid]) {
              getUserProfile(uid);
            }
          });
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'conversations');
        setLoadingConversations(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  // Listen to messages of active conversation
  useEffect(() => {
    if (!user || !activeConversationId) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    setLoadingMessages(true);
    const msgsRef = collection(db, 'conversations', activeConversationId, 'messages');
    const q = query(msgsRef, orderBy('createdAt', 'asc'), limit(300));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs: Message[] = [];
        snapshot.forEach((doc) => {
          const msg = doc.data() as Message;
          // Filter out if deleted for current user
          if (!msg.deletedFor?.includes(user.uid)) {
            msgs.push(msg);
          }
        });

        // Trigger sound on new incoming message
        if (msgs.length > 0) {
          const lastMsg = msgs[msgs.length - 1];
          if (
            lastMsg.id !== lastMessageSoundRef.current &&
            lastMsg.senderId !== user.uid &&
            lastMessageSoundRef.current !== null
          ) {
            sound.playReceive();
          }
          lastMessageSoundRef.current = lastMsg.id;
        }

        setMessages(msgs);
        setLoadingMessages(false);

        // Mark as read in real-time
        const unreadMsgIds = msgs
          .filter((m) => m.senderId !== user.uid && (!m.readBy || !m.readBy.includes(user.uid)))
          .map((m) => m.id);

        markConversationAsRead(activeConversationId, user.uid, unreadMsgIds);
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.LIST,
          `conversations/${activeConversationId}/messages`
        );
        setLoadingMessages(false);
      }
    );

    // Listen to typing status in active conversation
    const typingRef = collection(db, 'conversations', activeConversationId, 'typing');
    const typingUnsub = onSnapshot(
      typingRef,
      (snapshot) => {
        const typers: TypingStatus[] = [];
        const now = Date.now();
        snapshot.forEach((doc) => {
          const t = doc.data() as TypingStatus;
          // Only show if not expired (> 8s) and not self
          if (t.userId !== user.uid && now - t.timestamp < 8000) {
            typers.push(t);
          }
        });
        setTypingUsers(typers);
      },
      () => {
        // Ephemeral typing error ignored
      }
    );

    return () => {
      unsubscribe();
      typingUnsub();
    };
  }, [user, activeConversationId]);

  // Real-time listener for active chat partner profile (online presence, last seen, status updates)
  useEffect(() => {
    if (!user || !activeConversation || activeConversation.type !== 'direct') return;

    const partnerId = activeConversation.participantIds?.find((id) => id !== user.uid);
    if (!partnerId) return;

    const unsub = onSnapshot(doc(db, 'users', partnerId), (snap) => {
      if (snap.exists()) {
        const uProfile = snap.data() as UserProfile;
        setUserCache((prev) => ({ ...prev, [partnerId]: uProfile }));
      }
    });

    return () => unsub();
  }, [user, activeConversation?.id]);

  // Start direct chat
  const startDirectChat = async (targetUid: string): Promise<string> => {
    if (!user) throw new Error('Not authenticated');
    const convId = await getOrCreateDirectConversation(user.uid, targetUid);
    setActiveConversationId(convId);
    return convId;
  };

  // Create new group
  const createNewGroup = async (
    name: string,
    description: string,
    photoURL: string,
    participantIds: string[]
  ): Promise<string> => {
    if (!user) throw new Error('Not authenticated');
    const convId = await createGroupConversation(
      user.uid,
      name,
      description,
      photoURL,
      participantIds
    );
    setActiveConversationId(convId);
    return convId;
  };

  // Send text message
  const sendTextMessage = async (text: string) => {
    if (!user || !activeConversationId || !text.trim()) return;

    sound.playSend();
    const replyRef = replyingTo
      ? {
          messageId: replyingTo.id,
          senderName: replyingTo.senderName,
          text: replyingTo.text,
          type: replyingTo.type,
        }
      : null;

    setReplyingTo(null);
    emitTyping(false);

    // Optimistic UI update
    const tempId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const optimisticMsg: Message = {
      id: tempId,
      conversationId: activeConversationId,
      senderId: user.uid,
      senderName: profile?.displayName || user.displayName || 'User',
      senderPhotoURL: profile?.photoURL || user.photoURL || '',
      text: text.trim(),
      type: 'text',
      createdAt: now,
      updatedAt: now,
      isEdited: false,
      isDeleted: false,
      deletedFor: [],
      replyTo: replyRef,
      reactions: {},
      readBy: [user.uid],
      deliveredTo: [user.uid],
    };

    setMessages((prev) => [...(prev || []), optimisticMsg]);

    try {
      await sendMessage(
        activeConversationId,
        user.uid,
        profile?.displayName || user.displayName || 'User',
        profile?.photoURL || user.photoURL || '',
        text.trim(),
        'text',
        { replyTo: replyRef }
      );
    } catch (err) {
      console.warn('Notice sending message:', err);
    }
  };

  // Send file or voice message
  const sendFileMessage = async (
    file: File | Blob,
    type: MessageType,
    fileName: string,
    duration?: number
  ) => {
    if (!user || !activeConversationId) return;

    try {
      setUploadProgress(10);
      const res = await uploadFileWithProgress(
        file,
        `conversations/${activeConversationId}`,
        fileName,
        (p) => setUploadProgress(p)
      );

      setUploadProgress(100);
      sound.playSend();

      const replyRef = replyingTo
        ? {
            messageId: replyingTo.id,
            senderName: replyingTo.senderName,
            text: replyingTo.text,
            type: replyingTo.type,
          }
        : null;

      setReplyingTo(null);

      // Optimistic media message
      const tempId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();
      const optimisticMediaMsg: Message = {
        id: tempId,
        conversationId: activeConversationId,
        senderId: user.uid,
        senderName: profile?.displayName || user.displayName || 'User',
        senderPhotoURL: profile?.photoURL || user.photoURL || '',
        text: type === 'voice' ? 'Voice Message' : fileName,
        type,
        createdAt: now,
        updatedAt: now,
        isEdited: false,
        isDeleted: false,
        deletedFor: [],
        replyTo: replyRef,
        fileUrl: res.url,
        fileName: res.name,
        fileSize: res.size,
        fileType: res.type,
        audioDuration: duration,
        reactions: {},
        readBy: [user.uid],
        deliveredTo: [user.uid],
      };

      setMessages((prev) => [...(prev || []), optimisticMediaMsg]);

      await sendMessage(
        activeConversationId,
        user.uid,
        profile?.displayName || user.displayName || 'User',
        profile?.photoURL || user.photoURL || '',
        type === 'voice' ? 'Voice Message' : fileName,
        type,
        {
          fileUrl: res.url,
          fileName: res.name,
          fileSize: res.size,
          fileType: res.type,
          audioDuration: duration,
          replyTo: replyRef,
        }
      );
    } catch (err) {
      console.warn('Notice sending media message:', err);
    } finally {
      setTimeout(() => setUploadProgress(null), 500);
    }
  };

  // Edit message
  const editCurrentMessage = async (messageId: string, text: string) => {
    if (!activeConversationId) return;
    await editMessage(activeConversationId, messageId, text);
  };

  // Delete message
  const deleteMessage = async (messageId: string, forEveryone: boolean) => {
    if (!user || !activeConversationId) return;
    if (forEveryone) {
      await deleteMessageForEveryone(activeConversationId, messageId);
    } else {
      await deleteMessageForMe(activeConversationId, messageId, user.uid);
    }
  };

  // React to message
  const reactToMessage = async (messageId: string, emoji: string) => {
    if (!user || !activeConversationId) return;
    sound.playPop();
    await toggleMessageReaction(activeConversationId, messageId, emoji, user.uid);
  };

  // Emit typing indicator
  const emitTyping = (isTyping: boolean) => {
    if (!user || !activeConversationId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    setTypingStatus(
      activeConversationId,
      user.uid,
      profile?.displayName || 'Someone',
      isTyping
    );

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        setTypingStatus(
          activeConversationId,
          user.uid,
          profile?.displayName || 'Someone',
          false
        );
      }, 3500);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversationId,
        activeConversation,
        messages,
        typingUsers,
        userCache,
        loadingConversations,
        loadingMessages,
        replyingTo,
        showChatDetails,
        activeFilter,
        uploadProgress,
        setActiveConversationId,
        setReplyingTo,
        setShowChatDetails,
        setActiveFilter,
        startDirectChat,
        createNewGroup,
        sendTextMessage,
        sendFileMessage,
        editCurrentMessage,
        deleteMessage,
        reactToMessage,
        emitTyping,
        getUserProfile,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
