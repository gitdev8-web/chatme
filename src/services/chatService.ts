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
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import {
  Conversation,
  Message,
  MessageType,
  ReplyReference,
  ModerationReport,
} from '../types';

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

  try {
    const snap = await getDoc(convRef);
    if (!snap.exists()) {
      const newConv: Conversation = {
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
      await setDoc(convRef, newConv, { merge: true });
    }
    return conversationId;
  } catch (err) {
    try {
      const newConv: Conversation = {
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
      await setDoc(convRef, newConv, { merge: true });
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
    description,
    photoURL,
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
    await setDoc(convRef, groupConv);

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
    await setDoc(doc(db, 'conversations', conversationId, 'messages', msgId), sysMsg);

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
  }
): Promise<string> {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  const now = new Date().toISOString();

  const messageData: Message = {
    id: messageId,
    conversationId,
    senderId,
    senderName,
    senderPhotoURL: senderPhotoURL || '',
    text: text.trim(),
    type,
    createdAt: now,
    updatedAt: now,
    isEdited: false,
    isDeleted: false,
    deletedFor: [],
    replyTo: options?.replyTo || null,
    fileUrl: options?.fileUrl,
    fileName: options?.fileName,
    fileSize: options?.fileSize,
    fileType: options?.fileType,
    audioDuration: options?.audioDuration,
    reactions: {},
    readBy: [senderId],
    deliveredTo: [senderId],
  };

  try {
    await setDoc(msgRef, messageData);

    // Update conversation lastMessage & unread count for other participants
    const convRef = doc(db, 'conversations', conversationId);
    const convSnap = await getDoc(convRef);
    if (convSnap.exists()) {
      const convData = convSnap.data() as Conversation;
      const currentUnread = convData.unreadCounts || {};
      const newUnread: Record<string, number> = { ...currentUnread };

      convData.participantIds.forEach((uid) => {
        if (uid !== senderId) {
          newUnread[uid] = (newUnread[uid] || 0) + 1;
        } else {
          newUnread[uid] = 0;
        }
      });

      let previewText = text;
      if (type === 'image') previewText = '📷 Photo';
      else if (type === 'voice') previewText = '🎤 Voice message';
      else if (type === 'file') previewText = `📎 ${options?.fileName || 'File'}`;

      await updateDoc(convRef, {
        updatedAt: now,
        lastMessage: {
          id: messageId,
          text: previewText,
          senderId,
          senderName,
          timestamp: now,
          type,
        },
        unreadCounts: newUnread,
      });
    }

    return messageId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `conversations/${conversationId}/messages/${messageId}`);
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
    await updateDoc(msgRef, {
      text: newText.trim(),
      isEdited: true,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}/messages/${messageId}`);
  }
}

export async function deleteMessageForEveryone(
  conversationId: string,
  messageId: string
): Promise<void> {
  const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  try {
    await updateDoc(msgRef, {
      isDeleted: true,
      text: 'This message was deleted',
      fileUrl: '',
      fileName: '',
      isEdited: false,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}/messages/${messageId}`);
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
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}/messages/${messageId}`);
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

    await updateDoc(msgRef, { reactions: updatedReactions });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}/messages/${messageId}`);
  }
}

export async function markConversationAsRead(
  conversationId: string,
  currentUid: string
): Promise<void> {
  try {
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, {
      [`unreadCounts.${currentUid}`]: 0,
    });
  } catch {
    // Soft fail for read receipts
  }
}

export async function setTypingStatus(
  conversationId: string,
  userId: string,
  displayName: string,
  isTyping: boolean
): Promise<void> {
  const typingRef = doc(db, 'conversations', conversationId, 'typing', userId);
  try {
    if (isTyping) {
      await setDoc(typingRef, {
        userId,
        displayName,
        timestamp: Date.now(),
      });
    } else {
      await deleteDoc(typingRef);
    }
  } catch {
    // Non-critical ephemeral update
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

export async function updateGroupInfo(
  conversationId: string,
  updates: { name?: string; description?: string; photoURL?: string }
): Promise<void> {
  const convRef = doc(db, 'conversations', conversationId);
  try {
    await updateDoc(convRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
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
    await setDoc(doc(db, 'reports', reportId), reportData);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `reports/${reportId}`);
  }
}
