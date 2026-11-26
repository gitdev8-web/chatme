/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import {
  Conversation,
  LocationData,
  Message,
  MessageType,
  ModerationReport,
  PinnedMessageInfo,
  PollData,
  ReplyReference,
  SharedContactData,
} from '../types';

/**
 * Remove all undefined properties recursively from an object before Firestore submission
 */
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Partial<T> {
  const clean: any = {};
  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        clean[key] = sanitizeForFirestore(val);
      } else {
        clean[key] = val;
      }
    }
  });
  return clean;
}

export function getDirectConversationId(uid1: string, uid2: string): string {
  const sorted = [uid1, uid2].sort().join('_');
  return `dm_${sorted}`;
}

export async function getOrCreateDirectConversation(
  currentUid: string,
  targetUid: string
): Promise<string> {
  const conversationId = getDirectConversationId(currentUid, targetUid);
  const convRef = doc(db, 'conversations', conversationId);

  const initialConv: Conversation = {
    id: conversationId,
    type: 'direct',
    participantIds: [currentUid, targetUid],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pinnedBy: [],
    mutedBy: [],
    archivedBy: [],
    unreadCounts: {
      [currentUid]: 0,
      [targetUid]: 0,
    },
  };

  try {
    const snap = await getDoc(convRef);
    if (!snap.exists()) {
      await setDoc(convRef, sanitizeForFirestore(initialConv), { merge: true });
    } else {
      const existing = snap.data() as Conversation;
      if (existing.deletedForUsers?.includes(currentUid)) {
        await updateDoc(convRef, {
          deletedForUsers: arrayRemove(currentUid),
          updatedAt: new Date().toISOString(),
        });
      }
    }
    return conversationId;
  } catch (err) {
    try {
      await setDoc(convRef, sanitizeForFirestore(initialConv), { merge: true });
      return conversationId;
    } catch (writeErr) {
      handleFirestoreError(writeErr, OperationType.WRITE, `conversations/${conversationId}`);
      return conversationId;
    }
  }
}

export async function createGroupConversation(
  creatorUid: string,
  name: string,
  description: string,
  photoURL: string,
  participantIds: string[]
): Promise<string> {
  const allParticipants = Array.from(new Set([creatorUid, ...participantIds]));
  const conversationId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const convRef = doc(db, 'conversations', conversationId);

  const initialUnread: Record<string, number> = {};
  allParticipants.forEach((uid) => {
    initialUnread[uid] = 0;
  });

  const groupConv: Conversation = {
    id: conversationId,
    type: 'group',
    name,
    description: description || '',
    photoURL: photoURL || '',
    participantIds: allParticipants,
    adminIds: [creatorUid],
    createdBy: creatorUid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pinnedBy: [],
    mutedBy: [],
    archivedBy: [],
    unreadCounts: initialUnread,
  };

  try {
    await setDoc(convRef, sanitizeForFirestore(groupConv), { merge: true });

    // Add initial system message
    const msgId = `msg_${Date.now()}`;
    const sysMsg: Message = {
      id: msgId,
      conversationId,
      senderId: creatorUid,
      senderName: 'System',
      text: `Group "${name}" was created`,
      type: 'system',
      createdAt: new Date().toISOString(),
      reactions: {},
      readBy: [creatorUid],
      deliveredTo: allParticipants,
    };
    await setDoc(
      doc(db, 'conversations', conversationId, 'messages', msgId),
      sanitizeForFirestore(sysMsg)
    );

    return conversationId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `conversations/${conversationId}`);
    return conversationId;
  }
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  senderName: string,
  senderPhotoURL: string | undefined,
  text: string,
  type: MessageType = 'text',
  options?: {
    replyTo?: ReplyReference | null;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    audioDuration?: number;
    isForwarded?: boolean;
    viewOnce?: boolean;
    poll?: PollData;
    location?: LocationData;
    contactCard?: SharedContactData;
  }
): Promise<string> {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  const now = new Date().toISOString();

  const rawMessage: Record<string, any> = {
    id: messageId,
    conversationId,
    senderId,
    senderName: senderName || 'User',
    senderPhotoURL: senderPhotoURL || '',
    text: (text || '').trim(),
    type,
    createdAt: now,
    updatedAt: now,
    isEdited: false,
    isDeleted: false,
    isForwarded: Boolean(options?.isForwarded),
    deletedFor: [],
    replyTo: options?.replyTo || null,
    reactions: {},
    readBy: [senderId],
    deliveredTo: [senderId],
  };

  if (options?.fileUrl) rawMessage.fileUrl = options.fileUrl;
  if (options?.fileName) rawMessage.fileName = options.fileName;
  if (options?.fileSize !== undefined) rawMessage.fileSize = options.fileSize;
  if (options?.fileType) rawMessage.fileType = options.fileType;
  if (options?.audioDuration !== undefined) rawMessage.audioDuration = options.audioDuration;
  if (options?.viewOnce) {
    rawMessage.viewOnce = true;
    rawMessage.viewedBy = [];
  }
  if (options?.poll) rawMessage.poll = options.poll;
  if (options?.location) rawMessage.location = options.location;
  if (options?.contactCard) rawMessage.contactCard = options.contactCard;

  const cleanMessage = sanitizeForFirestore(rawMessage);

  try {
    await setDoc(msgRef, cleanMessage);

    // Update conversation lastMessage & unread count for other participants
    const convRef = doc(db, 'conversations', conversationId);
    let previewText = text || '';
    if (type === 'image') previewText = options?.viewOnce ? '📷 View once photo' : '📷 Photo';
    else if (type === 'voice') previewText = '🎤 Voice message';
    else if (type === 'file') previewText = `📎 ${options?.fileName || 'File'}`;
    else if (type === 'poll') previewText = `📊 Poll: ${options?.poll?.question || text}`;
    else if (type === 'location') previewText = `📍 ${options?.location?.label || 'Location'}`;
    else if (type === 'contact') previewText = `👤 Contact: ${options?.contactCard?.displayName || text}`;

    try {
      const convSnap = await getDoc(convRef);
      if (convSnap.exists()) {
        const convData = convSnap.data() as Conversation;
        const currentUnread = convData.unreadCounts || {};
        const newUnread: Record<string, number> = { ...currentUnread };

        (convData.participantIds || []).forEach((uid) => {
          if (uid !== senderId) {
            newUnread[uid] = (newUnread[uid] || 0) + 1;
          } else {
            newUnread[uid] = 0;
          }
        });

        await setDoc(
          convRef,
          {
            updatedAt: now,
            deletedForUsers: [],
            lastMessage: {
              id: messageId,
              text: previewText,
              senderId,
              senderName: senderName || 'User',
              timestamp: now,
              type,
            },
            unreadCounts: newUnread,
          },
          { merge: true }
        );
      }
    } catch {
      // Non-critical conversation meta update
    }

    return messageId;
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.WRITE,
      `conversations/${conversationId}/messages/${messageId}`
    );
    return messageId;
  }
}

export async function editMessage(
  conversationId: string,
  messageId: string,
  newText: string
): Promise<void> {
  const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  try {
    await setDoc(
      msgRef,
      {
        text: newText.trim(),
        isEdited: true,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.UPDATE,
      `conversations/${conversationId}/messages/${messageId}`
    );
  }
}

export async function deleteMessageForEveryone(
  conversationId: string,
  messageId: string
): Promise<void> {
  const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  try {
    await setDoc(
      msgRef,
      {
        isDeleted: true,
        text: 'This message was deleted',
        fileUrl: '',
        fileName: '',
        isEdited: false,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.UPDATE,
      `conversations/${conversationId}/messages/${messageId}`
    );
  }
}

export async function deleteMessageForMe(
  conversationId: string,
  messageId: string,
  uid: string
): Promise<void> {
  const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  try {
    await updateDoc(msgRef, {
      deletedFor: arrayUnion(uid),
    });
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.UPDATE,
      `conversations/${conversationId}/messages/${messageId}`
    );
  }
}

export async function toggleMessageReaction(
  conversationId: string,
  messageId: string,
  emoji: string,
  uid: string
): Promise<void> {
  const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  try {
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;
    const data = snap.data() as Message;
    const reactions = data.reactions || {};
    const currentUsers = reactions[emoji] || [];

    let updatedUsers: string[];
    if (currentUsers.includes(uid)) {
      updatedUsers = currentUsers.filter((id) => id !== uid);
    } else {
      updatedUsers = [...currentUsers, uid];
    }

    const updatedReactions = { ...reactions };
    if (updatedUsers.length > 0) {
      updatedReactions[emoji] = updatedUsers;
    } else {
      delete updatedReactions[emoji];
    }

    await setDoc(msgRef, { reactions: updatedReactions }, { merge: true });
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.UPDATE,
      `conversations/${conversationId}/messages/${messageId}`
    );
  }
}

export async function markConversationAsRead(
  conversationId: string,
  currentUid: string,
  unreadMessageIds?: string[]
): Promise<void> {
  try {
    const convRef = doc(db, 'conversations', conversationId);
    await setDoc(
      convRef,
      {
        unreadCounts: {
          [currentUid]: 0,
        },
      },
      { merge: true }
    );

    if (unreadMessageIds && unreadMessageIds.length > 0) {
      const updates = unreadMessageIds.slice(0, 30).map((msgId) => {
        const msgRef = doc(db, 'conversations', conversationId, 'messages', msgId);
        return updateDoc(msgRef, {
          readBy: arrayUnion(currentUid),
          deliveredTo: arrayUnion(currentUid),
        }).catch(() => {});
      });
      await Promise.allSettled(updates);
    }
  } catch {
    // Soft fail
  }
}

export async function markMessagesAsDelivered(
  conversationId: string,
  currentUid: string,
  messageIds: string[]
): Promise<void> {
  if (!messageIds || messageIds.length === 0) return;
  try {
    const updates = messageIds.slice(0, 20).map((msgId) => {
      const msgRef = doc(db, 'conversations', conversationId, 'messages', msgId);
      return updateDoc(msgRef, {
        deliveredTo: arrayUnion(currentUid),
      }).catch(() => {});
    });
    await Promise.allSettled(updates);
  } catch {
    // Non-critical
  }
}

export async function setTypingStatus(
  conversationId: string,
  userId: string,
  displayName: string,
  isTyping: boolean,
  activity: 'typing' | 'recording' = 'typing'
): Promise<void> {
  const typingRef = doc(db, 'conversations', conversationId, 'typing', userId);
  try {
    if (isTyping) {
      await setDoc(
        typingRef,
        {
          userId,
          displayName,
          timestamp: Date.now(),
          activity,
        },
        { merge: true }
      );
    } else {
      await deleteDoc(typingRef);
    }
  } catch {
    // Non-critical
  }
}

export async function togglePinConversation(
  conversationId: string,
  uid: string,
  isPinned: boolean
): Promise<void> {
  const convRef = doc(db, 'conversations', conversationId);
  try {
    await updateDoc(convRef, {
      pinnedBy: isPinned ? arrayUnion(uid) : arrayRemove(uid),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}`);
  }
}

export async function toggleMuteConversation(
  conversationId: string,
  uid: string,
  isMuted: boolean
): Promise<void> {
  const convRef = doc(db, 'conversations', conversationId);
  try {
    await updateDoc(convRef, {
      mutedBy: isMuted ? arrayUnion(uid) : arrayRemove(uid),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}`);
  }
}

export async function toggleArchiveConversation(
  conversationId: string,
  uid: string,
  isArchived: boolean
): Promise<void> {
  const convRef = doc(db, 'conversations', conversationId);
  try {
    await updateDoc(convRef, {
      archivedBy: isArchived ? arrayUnion(uid) : arrayRemove(uid),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}`);
  }
}

export async function deleteConversationForUser(
  conversationId: string,
  currentUid: string
): Promise<void> {
  if (!conversationId || !currentUid) return;
  try {
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, {
      deletedForUsers: arrayUnion(currentUid),
      [`unreadCounts.${currentUid}`]: 0,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `conversations/${conversationId}`);
  }
}

export async function updateGroupInfo(
  conversationId: string,
  updates: { name?: string; description?: string; photoURL?: string }
): Promise<void> {
  const convRef = doc(db, 'conversations', conversationId);
  try {
    await setDoc(
      convRef,
      {
        ...sanitizeForFirestore(updates),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}`);
  }
}

export async function addGroupMembers(
  conversationId: string,
  newMemberUids: string[]
): Promise<void> {
  const convRef = doc(db, 'conversations', conversationId);
  try {
    await updateDoc(convRef, {
      participantIds: arrayUnion(...newMemberUids),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}`);
  }
}

export async function removeGroupMember(
  conversationId: string,
  memberUid: string
): Promise<void> {
  const convRef = doc(db, 'conversations', conversationId);
  try {
    await updateDoc(convRef, {
      participantIds: arrayRemove(memberUid),
      adminIds: arrayRemove(memberUid),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}`);
  }
}

export async function toggleGroupAdmin(
  conversationId: string,
  memberUid: string,
  makeAdmin: boolean
): Promise<void> {
  const convRef = doc(db, 'conversations', conversationId);
  try {
    await updateDoc(convRef, {
      adminIds: makeAdmin ? arrayUnion(memberUid) : arrayRemove(memberUid),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}`);
  }
}

export async function submitReport(
  reporterId: string,
  reportedUserId: string,
  reason: string,
  description: string,
  messageId?: string
): Promise<void> {
  const reportId = `rep_${Date.now()}`;
  const reportData: ModerationReport = {
    id: reportId,
    reporterId,
    reportedUserId,
    messageId: messageId || '',
    reason,
    description,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'reports', reportId), sanitizeForFirestore(reportData), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `reports/${reportId}`);
  }
}

export async function toggleStarMessage(
  conversationId: string,
  messageId: string,
  uid: string,
  shouldStar: boolean
): Promise<void> {
  const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  try {
    await updateDoc(msgRef, {
      starredBy: shouldStar ? arrayUnion(uid) : arrayRemove(uid),
    });
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.UPDATE,
      `conversations/${conversationId}/messages/${messageId}`
    );
  }
}

export async function clearChatForUser(
  conversationId: string,
  currentUid: string
): Promise<void> {
  if (!conversationId || !currentUid) return;
  try {
    const convRef = doc(db, 'conversations', conversationId);
    const clearedTimestamp = new Date().toISOString();
    await updateDoc(convRef, {
      [`clearedAt.${currentUid}`]: clearedTimestamp,
      [`unreadCounts.${currentUid}`]: 0,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}`);
  }
}

export async function updateDisappearingMessages(
  conversationId: string,
  durationSeconds: number
): Promise<void> {
  const convRef = doc(db, 'conversations', conversationId);
  try {
    await updateDoc(convRef, {
      disappearingDuration: durationSeconds,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}`);
  }
}

export async function votePollOption(
  conversationId: string,
  messageId: string,
  optionId: string,
  uid: string
): Promise<void> {
  const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  try {
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;
    const msg = snap.data() as Message;
    if (!msg.poll) return;

    const updatedOptions = msg.poll.options.map((opt) => {
      const hasVoted = (opt.votes || []).includes(uid);
      if (opt.id === optionId) {
        return {
          ...opt,
          votes: hasVoted
            ? opt.votes.filter((id) => id !== uid)
            : [...(opt.votes || []), uid],
        };
      }
      if (!msg.poll!.allowMultiple) {
        return {
          ...opt,
          votes: (opt.votes || []).filter((id) => id !== uid),
        };
      }
      return opt;
    });

    await setDoc(
      msgRef,
      {
        poll: {
          ...msg.poll,
          options: updatedOptions,
        },
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.UPDATE,
      `conversations/${conversationId}/messages/${messageId}`
    );
  }
}

export async function markViewOnceMessageOpened(
  conversationId: string,
  messageId: string,
  uid: string
): Promise<void> {
  const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  try {
    await updateDoc(msgRef, {
      viewedBy: arrayUnion(uid),
    });
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.UPDATE,
      `conversations/${conversationId}/messages/${messageId}`
    );
  }
}

export async function pinMessageInConversation(
  conversationId: string,
  pinned: PinnedMessageInfo
): Promise<void> {
  const convRef = doc(db, 'conversations', conversationId);
  try {
    await setDoc(
      convRef,
      {
        pinnedMessage: sanitizeForFirestore(pinned),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}`);
  }
}

export async function unpinMessageInConversation(
  conversationId: string
): Promise<void> {
  const convRef = doc(db, 'conversations', conversationId);
  try {
    await updateDoc(convRef, {
      pinnedMessage: null,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}`);
  }
}
