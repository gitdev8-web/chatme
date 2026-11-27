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
import { useNotifications } from './NotificationContext';
import { sound } from '../hooks/useSound';
import {
  Conversation,
  LocationData,
  MeetInviteData,
  Message,
  MessageType,
  PollData,
  SharedContactData,
  TypingStatus,
  UserProfile,
  UserStatusStory,
} from '../types';
import {
  subscribeToStatusStories,
  markStoryAsViewed,
  isStoryViewedBy,
  STATUS_VIEWED_EVENT,
} from '../services/statusService';
import {
  clearChatForUser,
  createGroupConversation,
  deleteConversationForUser,
  deleteMessageForEveryone,
  deleteMessageForMe,
  editMessage,
  getOrCreateDirectConversation,
  markConversationAsRead,
  markMessagesAsDelivered,
  markViewOnceMessageOpened,
  pinMessageInConversation,
  sendMessage,
  setTypingStatus,
  toggleMessageReaction,
  toggleStarMessage,
  unpinMessageInConversation,
  votePollOption,
} from '../services/chatService';
import { uploadFileWithProgress } from '../services/storageService';
import { subscribeToAllPresence } from '../services/presenceService';
import { isUserOnline } from '../utils/presenceUtils';

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
  statusStories: UserStatusStory[];
  hasUnreadStatuses: boolean;
  viewStory: (statusId: string) => Promise<void>;
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
  sendTextMessage: (text: string, conversationIdOverride?: string) => Promise<void>;
  sendFileMessage: (
    file: File | Blob,
    type: MessageType,
    fileName: string,
    duration?: number,
    options?: { viewOnce?: boolean; caption?: string }
  ) => Promise<void>;
  sendPollMessage: (poll: PollData) => Promise<void>;
  sendLocationMessage: (location: LocationData) => Promise<void>;
  sendContactMessage: (contact: SharedContactData) => Promise<void>;
  sendMeetMessage: (meet: MeetInviteData, conversationIdOverride?: string) => Promise<void>;
  votePoll: (messageId: string, optionId: string) => Promise<void>;
  pinMessage: (msg: Message) => Promise<void>;
  unpinMessage: () => Promise<void>;
  openViewOnceMedia: (messageId: string) => Promise<void>;
  editCurrentMessage: (messageId: string, text: string) => Promise<void>;
  deleteMessage: (messageId: string, forEveryone: boolean) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  clearConversation: (conversationId: string) => Promise<void>;
  starMessage: (messageId: string, shouldStar: boolean, conversationIdOverride?: string) => Promise<void>;
  reactToMessage: (messageId: string, emoji: string) => Promise<void>;
  emitTyping: (isTyping: boolean, activity?: 'typing' | 'recording') => void;
  markActiveConversationRead: () => void;
  getUserProfile: (uid: string) => Promise<UserProfile | null>;
  highlightedMessageId: string | null;
  clearHighlightedMessage: () => void;
  jumpToMessage: (conversationId: string, messageId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const { notify } = useNotifications();
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
  const [statusStories, setStatusStories] = useState<UserStatusStory[]>([]);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageSoundRef = useRef<string | null>(null);
  const notifiedMsgIdsRef = useRef<Set<string>>(new Set());
  const readReceiptsEnabledRef = useRef<boolean>(profile?.readReceipts !== false);
  const unreadMsgIdsRef = useRef<string[]>([]);
  const activeLastMsgIdRef = useRef<string | undefined>(undefined);
  const activeConversationIdRef = useRef<string | null>(activeConversationId);
  const userCacheRef = useRef<Record<string, UserProfile>>(userCache);
  const profileRef = useRef<UserProfile | null>(profile);
  const prevOnlineMapRef = useRef<Record<string, boolean>>({});
  const onlineCooldownRef = useRef<Record<string, number>>({});
  const initialUsersLoadedRef = useRef<boolean>(false);
  const startDirectChatRef = useRef<(uid: string) => Promise<string>>(async () => '');

  useEffect(() => {
    readReceiptsEnabledRef.current = profile?.readReceipts !== false;
    profileRef.current = profile;
    if (profile?.uid) {
      setUserCache((prev) => ({ ...prev, [profile.uid]: profile }));
    }
  }, [profile]);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    userCacheRef.current = userCache;
  }, [userCache]);

  // Global live subscription to status stories across all users
  useEffect(() => {
    if (!user) {
      setStatusStories([]);
      return;
    }
    const unsub = subscribeToStatusStories((list) => {
      setStatusStories(list);
    });

    const handleLocalView = (e: Event) => {
      const detail = (e as CustomEvent<{ statusId: string; uid: string }>).detail;
      if (!detail?.statusId || !detail?.uid) return;
      setStatusStories((prev) =>
        prev.map((story) =>
          story.id === detail.statusId && !story.viewedBy?.includes(detail.uid)
            ? { ...story, viewedBy: [...(story.viewedBy || []), detail.uid] }
            : story
        )
      );
    };

    window.addEventListener(STATUS_VIEWED_EVENT, handleLocalView);
    return () => {
      unsub();
      window.removeEventListener(STATUS_VIEWED_EVENT, handleLocalView);
    };
  }, [user]);

  const hasUnreadStatuses = statusStories.some(
    (s) => s.userId !== user?.uid && !isStoryViewedBy(s, user?.uid)
  );

  const viewStory = useCallback(
    async (statusId: string) => {
      if (!user) return;
      await markStoryAsViewed(statusId, user.uid);
    },
    [user]
  );

  // Helper to fetch and cache user profiles (stable reference via userCacheRef)
  const getUserProfile = useCallback(
    async (uid: string): Promise<UserProfile | null> => {
      if (userCacheRef.current[uid]) return userCacheRef.current[uid];
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) {
          const uProfile = snap.data() as UserProfile;
          setUserCache((prev) => ({ ...prev, [uid]: uProfile }));
          return uProfile;
        }
      } catch {
        // Continue gracefully
      }
      return null;
    },
    []
  );

  const notifyUserCameOnline = useCallback(
    (uProfile: UserProfile) => {
      if (!user || !uProfile?.uid || uProfile.uid === user.uid) return;
      if (uProfile.isDisabled || uProfile.showOnlineStatus === false) return;
      if (profileRef.current?.blockedUserIds?.includes(uProfile.uid)) return;
      if (typeof window !== 'undefined' && localStorage.getItem('devchat_online_alerts') === 'false') {
        return;
      }

      const now = Date.now();
      const lastNotified = onlineCooldownRef.current[uProfile.uid] || 0;
      if (now - lastNotified < 60000) return;

      onlineCooldownRef.current[uProfile.uid] = now;
      notify({
        kind: 'online',
        title: uProfile.displayName || 'DEV CHAT Contact',
        body: 'is now online',
        icon: uProfile.photoURL,
        senderName: uProfile.displayName,
        onClick: () => {
          void startDirectChatRef.current(uProfile.uid);
        },
      });
    },
    [user, notify]
  );

  // Real-time Firestore + RTDB presence listener to keep userCache synced & notify when contacts come online
  useEffect(() => {
    if (!user) {
      initialUsersLoadedRef.current = false;
      prevOnlineMapRef.current = {};
      return;
    }

    initialUsersLoadedRef.current = false;
    prevOnlineMapRef.current = {};

    const usersQuery = query(
      collection(db, 'users'),
      orderBy('lastSeen', 'desc'),
      limit(100)
    );

    const unsubUsers = onSnapshot(
      usersQuery,
      (snapshot) => {
        const updates: Record<string, UserProfile> = {};

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as UserProfile;
          const uid = data.uid || docSnap.id;
          const uProfile: UserProfile = { ...data, uid };
          updates[uid] = uProfile;

          if (uid !== user.uid) {
            const nowOnline = isUserOnline(uProfile);
            const wasOnline = prevOnlineMapRef.current[uid];

            if (initialUsersLoadedRef.current && wasOnline !== true && nowOnline) {
              notifyUserCameOnline(uProfile);
            }
            prevOnlineMapRef.current[uid] = nowOnline;
          }
        });

        initialUsersLoadedRef.current = true;

        setUserCache((prev) => ({
          ...prev,
          ...updates,
        }));
      },
      () => {
        initialUsersLoadedRef.current = true;
      }
    );

    const unsubPresence = subscribeToAllPresence((presenceMap) => {
      const currentCache = userCacheRef.current;
      const newlyOnlineProfiles: UserProfile[] = [];

      Object.keys(presenceMap).forEach((uid) => {
        const existing = currentCache[uid];
        if (!existing) return;
        const p = presenceMap[uid];
        const pTime =
          typeof p.lastSeen === 'number'
            ? new Date(p.lastSeen).toISOString()
            : p.lastSeen;
        if (existing.isOnline !== p.isOnline || existing.lastSeen !== pTime) {
          const updatedProfile: UserProfile = {
            ...existing,
            isOnline: p.isOnline,
            lastSeen: pTime,
          };
          if (uid !== user.uid && initialUsersLoadedRef.current) {
            const nowOnline = isUserOnline(updatedProfile);
            const wasOnline = prevOnlineMapRef.current[uid];
            if (wasOnline !== true && nowOnline) {
              newlyOnlineProfiles.push(updatedProfile);
            }
            prevOnlineMapRef.current[uid] = nowOnline;
          }
        }
      });

      setUserCache((prev) => {
        let changed = false;
        const next = { ...prev };
        Object.keys(presenceMap).forEach((uid) => {
          if (next[uid]) {
            const p = presenceMap[uid];
            const pTime =
              typeof p.lastSeen === 'number'
                ? new Date(p.lastSeen).toISOString()
                : p.lastSeen;
            if (next[uid].isOnline !== p.isOnline || next[uid].lastSeen !== pTime) {
              next[uid] = {
                ...next[uid],
                isOnline: p.isOnline,
                lastSeen: pTime,
              };
              changed = true;
            }
          }
        });
        return changed ? next : prev;
      });

      newlyOnlineProfiles.forEach((uProfile) => {
        notifyUserCameOnline(uProfile);
      });
    });

    // Sweep stale presence states periodically so offline->online transitions are re-detected
    const staleSweepInterval = setInterval(() => {
      const cached = userCacheRef.current;
      Object.keys(cached).forEach((uid) => {
        if (uid !== user.uid) {
          prevOnlineMapRef.current[uid] = isUserOnline(cached[uid]);
        }
      });
    }, 20000);

    return () => {
      unsubUsers();
      unsubPresence();
      clearInterval(staleSweepInterval);
    };
  }, [user, notifyUserCameOnline]);

  // Listen to conversations for current user
  useEffect(() => {
    if (!user) {
      setConversations([]);
      notifiedMsgIdsRef.current.clear();
      setLoadingConversations(false);
      return;
    }

    setLoadingConversations(true);
    let isInitialConvSnapshot = true;
    notifiedMsgIdsRef.current.clear();

    const q = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const convList: Conversation[] = [];
        snapshot.forEach((docSnap) => {
          const item = docSnap.data() as Conversation;
          if (!item.deletedForUsers?.includes(user.uid)) {
            convList.push(item);
          }
        });

        // Sort by updatedAt descending
        convList.sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        setConversations(convList);
        setLoadingConversations(false);

        const currentActiveId = activeConversationIdRef.current;
        const currentCache = userCacheRef.current;

        // Preload participant user profiles and mark unread conversations as delivered
        convList.forEach((conv) => {
          conv.participantIds.forEach((uid) => {
            if (uid !== user.uid && !currentCache[uid]) {
              void getUserProfile(uid);
            }
          });

          // If conversation has a last message not from self, mark it delivered and dispatch notification
          if (
            conv.lastMessage &&
            conv.lastMessage.senderId !== user.uid &&
            conv.lastMessage.id
          ) {
            if (currentActiveId !== conv.id) {
              void markMessagesAsDelivered(conv.id, user.uid, [conv.lastMessage.id], conv.lastMessage.id);
            }

            // Do not flood old message popups on initial page load
            if (isInitialConvSnapshot) {
              notifiedMsgIdsRef.current.add(conv.lastMessage.id);
              return;
            }

            const isMuted = conv.mutedBy?.includes(user.uid);
            const shouldNotify =
              !notifiedMsgIdsRef.current.has(conv.lastMessage.id) &&
              !isMuted &&
              (currentActiveId !== conv.id || document.visibilityState === 'hidden');

            if (shouldNotify) {
              const msgId = conv.lastMessage.id;
              const msgText = conv.lastMessage.text || 'Sent an attachment';
              const fallbackSenderName = conv.lastMessage.senderName || 'DEV CHAT User';
              const senderId = conv.lastMessage.senderId;

              notifiedMsgIdsRef.current.add(msgId);

              const cachedSender = currentCache[senderId];
              const dispatchMsgPopup = (senderProfile?: UserProfile | null) => {
                const resolvedName = senderProfile?.displayName || fallbackSenderName;
                const popupTitle =
                  conv.type === 'group'
                    ? `${resolvedName} in ${conv.name || 'Group'}`
                    : resolvedName;
                const popupIcon = senderProfile?.photoURL || conv.photoURL;

                notify({
                  kind: 'message',
                  title: popupTitle,
                  body: msgText,
                  icon: popupIcon,
                  senderName: resolvedName,
                  conversationId: conv.id,
                  onClick: () => setActiveConversationId(conv.id),
                });
              };

              if (cachedSender) {
                dispatchMsgPopup(cachedSender);
              } else {
                void getUserProfile(senderId).then((fetched) => {
                  dispatchMsgPopup(fetched);
                });
              }
            } else {
              notifiedMsgIdsRef.current.add(conv.lastMessage.id);
            }
          }
        });

        isInitialConvSnapshot = false;
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'conversations');
        setLoadingConversations(false);
      }
    );

    return () => unsubscribe();
  }, [user, notify, getUserProfile]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  useEffect(() => {
    activeLastMsgIdRef.current = activeConversation?.lastMessage?.id;
  }, [activeConversation?.lastMessage?.id]);

  const markActiveConversationRead = useCallback(() => {
    if (!user || !activeConversationId) return;
    const unreadIds = unreadMsgIdsRef.current;
    const isVisible = document.visibilityState === 'visible';
    const sendReadReceipts = readReceiptsEnabledRef.current;
    const lastMsgId = activeLastMsgIdRef.current;

    if (unreadIds.length === 0) return;

    if (isVisible) {
      if (sendReadReceipts) {
        markConversationAsRead(activeConversationId, user.uid, unreadIds, lastMsgId);
      } else {
        markConversationAsRead(activeConversationId, user.uid, [], lastMsgId);
        markMessagesAsDelivered(activeConversationId, user.uid, unreadIds, lastMsgId);
      }
    } else {
      markMessagesAsDelivered(activeConversationId, user.uid, unreadIds, lastMsgId);
    }
  }, [user, activeConversationId]);

  useEffect(() => {
    if (profile?.readReceipts !== false) {
      markActiveConversationRead();
    }
  }, [profile?.readReceipts, markActiveConversationRead]);

  // Listen to messages of active conversation
  useEffect(() => {
    if (!user || !activeConversationId) {
      setMessages([]);
      unreadMsgIdsRef.current = [];
      setLoadingMessages(false);
      return;
    }

    setLoadingMessages(true);
    const msgsRef = collection(db, 'conversations', activeConversationId, 'messages');
    const q = query(msgsRef, orderBy('createdAt', 'asc'), limit(300));

    unreadMsgIdsRef.current = [];

    const userClearedAt = activeConversation?.clearedAt?.[user.uid];
    const clearedAtMs = userClearedAt ? new Date(userClearedAt).getTime() : 0;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs: Message[] = [];
        snapshot.forEach((doc) => {
          const msg = doc.data() as Message;
          const msgMs = msg.createdAt ? new Date(msg.createdAt).getTime() : 0;
          const hiddenByClear = clearedAtMs > 0 && msgMs <= clearedAtMs;
          // Filter out if deleted for current user or cleared before timestamp
          if (!msg.deletedFor?.includes(user.uid) && !hiddenByClear) {
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

        // Filter unread message IDs from other participants
        unreadMsgIdsRef.current = msgs
          .filter((m) => m.senderId !== user.uid && (!m.readBy || !m.readBy.includes(user.uid)))
          .map((m) => m.id);

        if (msgs.length > 0) {
          activeLastMsgIdRef.current = msgs[msgs.length - 1].id;
        }

        markActiveConversationRead();
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

    const handleWindowFocus = () => {
      markActiveConversationRead();
    };

    const handleVisibility = () => {
      markActiveConversationRead();
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibility);

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
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user, activeConversationId, markActiveConversationRead]);

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
  const startDirectChat = useCallback(
    async (targetUid: string): Promise<string> => {
      if (!user) throw new Error('Not authenticated');
      const convId = await getOrCreateDirectConversation(user.uid, targetUid);
      setActiveConversationId(convId);
      return convId;
    },
    [user]
  );

  useEffect(() => {
    startDirectChatRef.current = startDirectChat;
  }, [startDirectChat]);

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
  const sendTextMessage = async (text: string, conversationIdOverride?: string) => {
    const targetConvId = conversationIdOverride || activeConversationId;
    if (!user || !targetConvId || !text.trim()) return;

    sound.playSend();
    const replyRef =
      !conversationIdOverride && replyingTo
        ? {
            messageId: replyingTo.id,
            senderName: replyingTo.senderName,
            text: replyingTo.text,
            type: replyingTo.type,
          }
        : null;

    if (!conversationIdOverride) {
      setReplyingTo(null);
      emitTyping(false);
    }

    // Optimistic UI update when targeting active chat
    if (targetConvId === activeConversationId) {
      const tempId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();
      const optimisticMsg: Message = {
        id: tempId,
        conversationId: targetConvId,
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
    }

    try {
      await sendMessage(
        targetConvId,
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
    duration?: number,
    options?: { viewOnce?: boolean; caption?: string }
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

      const messageText =
        type === 'voice'
          ? 'Voice Message'
          : options?.caption !== undefined
          ? options.caption
          : fileName;

      // Optimistic media message
      const tempId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();
      const optimisticMediaMsg: Message = {
        id: tempId,
        conversationId: activeConversationId,
        senderId: user.uid,
        senderName: profile?.displayName || user.displayName || 'User',
        senderPhotoURL: profile?.photoURL || user.photoURL || '',
        text: messageText,
        type,
        createdAt: now,
        updatedAt: now,
        isEdited: false,
        isDeleted: false,
        viewOnce: options?.viewOnce,
        viewedBy: options?.viewOnce ? [] : undefined,
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
        messageText,
        type,
        {
          fileUrl: res.url,
          fileName: res.name,
          fileSize: res.size,
          fileType: res.type,
          audioDuration: duration,
          viewOnce: options?.viewOnce,
          replyTo: replyRef,
        }
      );
    } catch (err) {
      console.warn('Notice sending media message:', err);
      throw err;
    } finally {
      setTimeout(() => setUploadProgress(null), 500);
    }
  };

  // Send interactive poll message
  const sendPollMessage = async (poll: PollData) => {
    if (!user || !activeConversationId || !poll.question.trim()) return;
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

    await sendMessage(
      activeConversationId,
      user.uid,
      profile?.displayName || user.displayName || 'User',
      profile?.photoURL || user.photoURL || '',
      poll.question.trim(),
      'poll',
      { poll, replyTo: replyRef }
    );
  };

  // Send location card message
  const sendLocationMessage = async (location: LocationData) => {
    if (!user || !activeConversationId) return;
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

    await sendMessage(
      activeConversationId,
      user.uid,
      profile?.displayName || user.displayName || 'User',
      profile?.photoURL || user.photoURL || '',
      location.label || 'Shared Location',
      'location',
      { location, replyTo: replyRef }
    );
  };

  // Send shared contact card
  const sendContactMessage = async (contact: SharedContactData) => {
    if (!user || !activeConversationId) return;
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

    await sendMessage(
      activeConversationId,
      user.uid,
      profile?.displayName || user.displayName || 'User',
      profile?.photoURL || user.photoURL || '',
      contact.displayName,
      'contact',
      { contactCard: contact, replyTo: replyRef }
    );
  };

  // Send Google Meet video session invite card
  const sendMeetMessage = async (
    meet: MeetInviteData,
    conversationIdOverride?: string
  ) => {
    const targetConvId = conversationIdOverride || activeConversationId;
    if (!user || !targetConvId) return;
    sound.playSend();
    const replyRef =
      !conversationIdOverride && replyingTo
        ? {
            messageId: replyingTo.id,
            senderName: replyingTo.senderName,
            text: replyingTo.text,
            type: replyingTo.type,
          }
        : null;
    if (!conversationIdOverride) {
      setReplyingTo(null);
    }

    await sendMessage(
      targetConvId,
      user.uid,
      profile?.displayName || user.displayName || 'User',
      profile?.photoURL || user.photoURL || '',
      `Google Meet video call (${meet.meetingCode})`,
      'meet',
      { meet, replyTo: replyRef }
    );
  };

  // Vote on poll option
  const votePoll = async (messageId: string, optionId: string) => {
    if (!user || !activeConversationId) return;
    sound.playPop();
    await votePollOption(activeConversationId, messageId, optionId, user.uid);
  };

  // Pin message in active conversation
  const pinMessage = async (msg: Message) => {
    if (!user || !activeConversationId) return;
    let snippet = msg.text || '';
    if (!snippet) {
      if (msg.type === 'image') snippet = '📷 Photo';
      else if (msg.type === 'video') snippet = '🎬 Video';
      else if (msg.type === 'voice') snippet = '🎤 Voice message';
      else if (msg.type === 'file') snippet = `📎 ${msg.fileName || 'Document'}`;
      else if (msg.type === 'poll') snippet = `📊 ${msg.poll?.question || 'Poll'}`;
      else if (msg.type === 'location') snippet = '📍 Location';
      else if (msg.type === 'contact') snippet = `👤 ${msg.contactCard?.displayName || 'Contact'}`;
      else if (msg.type === 'meet') snippet = `📹 Google Meet (${msg.meet?.meetingCode || 'Video Call'})`;
    }
    await pinMessageInConversation(activeConversationId, {
      messageId: msg.id,
      text: snippet.slice(0, 140),
      senderName: msg.senderName,
      type: msg.type,
      pinnedBy: user.uid,
      pinnedAt: new Date().toISOString(),
    });
  };

  // Unpin active message
  const unpinMessage = async () => {
    if (!activeConversationId) return;
    await unpinMessageInConversation(activeConversationId);
  };

  // Mark view-once photo opened
  const openViewOnceMedia = async (messageId: string) => {
    if (!user || !activeConversationId) return;
    await markViewOnceMessageOpened(activeConversationId, messageId, user.uid);
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

  // Delete conversation for current user
  const deleteConversation = async (conversationId: string) => {
    if (!user || !conversationId) return;
    await deleteConversationForUser(conversationId, user.uid);
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
      setShowChatDetails(false);
    }
  };

  // Clear messages in conversation for current user
  const clearConversation = async (conversationId: string) => {
    if (!user || !conversationId) return;
    await clearChatForUser(conversationId, user.uid);
    if (activeConversationId === conversationId) {
      setMessages([]);
    }
  };

  // Star or unstar a message persistently
  const starMessage = async (
    messageId: string,
    shouldStar: boolean,
    conversationIdOverride?: string
  ) => {
    const targetConvId = conversationIdOverride || activeConversationId;
    if (!user || !targetConvId) return;
    sound.playPop();
    await toggleStarMessage(targetConvId, messageId, user.uid, shouldStar);
  };

  const clearHighlightedMessage = useCallback(() => {
    setHighlightedMessageId(null);
  }, []);

  const jumpToMessage = useCallback((conversationId: string, messageId: string) => {
    setActiveConversationId(conversationId);
    setHighlightedMessageId(messageId);
  }, []);

  // React to message
  const reactToMessage = async (messageId: string, emoji: string) => {
    if (!user || !activeConversationId) return;
    sound.playPop();
    await toggleMessageReaction(activeConversationId, messageId, emoji, user.uid);
  };

  // Emit typing or audio recording indicator
  const emitTyping = (isTyping: boolean, activity: 'typing' | 'recording' = 'typing') => {
    if (!user || !activeConversationId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    setTypingStatus(
      activeConversationId,
      user.uid,
      profile?.displayName || 'Someone',
      isTyping,
      activity
    );

    if (isTyping) {
      const expireMs = activity === 'recording' ? 6500 : 3500;
      typingTimeoutRef.current = setTimeout(() => {
        setTypingStatus(
          activeConversationId,
          user.uid,
          profile?.displayName || 'Someone',
          false
        );
      }, expireMs);
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
        statusStories,
        hasUnreadStatuses,
        viewStory,
        setActiveConversationId,
        setReplyingTo,
        setShowChatDetails,
        setActiveFilter,
        startDirectChat,
        createNewGroup,
        sendTextMessage,
        sendFileMessage,
        sendPollMessage,
        sendLocationMessage,
        sendContactMessage,
        sendMeetMessage,
        votePoll,
        pinMessage,
        unpinMessage,
        openViewOnceMedia,
        editCurrentMessage,
        deleteMessage,
        deleteConversation,
        clearConversation,
        starMessage,
        reactToMessage,
        emitTyping,
        markActiveConversationRead,
        getUserProfile,
        highlightedMessageId,
        clearHighlightedMessage,
        jumpToMessage,
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
