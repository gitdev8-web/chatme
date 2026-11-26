/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  onSnapshot,
  arrayUnion,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { UserStatusStory } from '../types';
import { sanitizeForFirestore } from './chatService';

const VIEWED_LOCAL_KEY = 'devchat_viewed_local_statuses';
export const STATUS_VIEWED_EVENT = 'devchat-status-viewed';

function getLocallyViewedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(VIEWED_LOCAL_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function addLocallyViewedId(statusId: string) {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocallyViewedIds();
    if (!current.includes(statusId)) {
      localStorage.setItem(VIEWED_LOCAL_KEY, JSON.stringify([...current.slice(-40), statusId]));
    }
  } catch {
    // Ignore storage errors
  }
}

export function isStoryViewedBy(story: UserStatusStory, uid?: string): boolean {
  if (!uid) return false;
  if (story.userId === uid) return true;
  if (story.viewedBy?.includes(uid)) return true;
  if (story.id.startsWith('demo_') && getLocallyViewedIds().includes(story.id)) return true;
  return false;
}

export async function createStatusStory(
  userId: string,
  userName: string,
  userPhotoURL: string | undefined,
  type: 'text' | 'image',
  data: {
    text?: string;
    caption?: string;
    mediaUrl?: string;
    backgroundColor?: string;
    fontFamily?: string;
  }
): Promise<string> {
  const statusId = `stat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours expiry

  const statusDoc: UserStatusStory = {
    id: statusId,
    userId,
    userName: userName || 'User',
    userPhotoURL: userPhotoURL || '',
    type,
    text: data.text || '',
    caption: data.caption || '',
    mediaUrl: data.mediaUrl || '',
    backgroundColor: data.backgroundColor || 'linear-gradient(135deg, #075e54 0%, #00a884 100%)',
    fontFamily: data.fontFamily || 'sans-serif',
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    viewedBy: [userId],
  };

  try {
    const statusRef = doc(db, 'statuses', statusId);
    await setDoc(statusRef, sanitizeForFirestore(statusDoc), { merge: true });
    return statusId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `statuses/${statusId}`);
    throw err;
  }
}

export const DEMO_STATUS_STORY: UserStatusStory = {
  id: 'demo_status_devchat_official',
  userId: 'devchat_team',
  userName: 'DEV CHAT Updates',
  userPhotoURL: '/logo.png',
  type: 'text',
  text: 'Welcome to DEV CHAT Updates! Share 24-hour photo & text stories with 3D emojis 🚀✨',
  backgroundColor: 'linear-gradient(135deg, #075e54 0%, #00a884 100%)',
  fontFamily: 'sans-serif',
  createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  viewedBy: [],
};

export function subscribeToStatusStories(
  onUpdate: (stories: UserStatusStory[]) => void
): () => void {
  const statusesRef = collection(db, 'statuses');
  const q = query(statusesRef);

  return onSnapshot(
    q,
    (snapshot) => {
      const all: UserStatusStory[] = [];
      const now = Date.now();
      snapshot.forEach((docSnap) => {
        const item = docSnap.data() as UserStatusStory;
        const expiresTime = new Date(item.expiresAt || 0).getTime();
        // Only keep valid unexpired stories (< 24 hours)
        if (expiresTime > now || !item.expiresAt) {
          all.push({
            ...item,
            id: docSnap.id,
          });
        }
      });

      // Supply welcome story only if no stories exist yet
      if (all.length === 0) {
        all.push(DEMO_STATUS_STORY);
      }

      // Sort newest first
      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(all);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'statuses');
      onUpdate([DEMO_STATUS_STORY]);
    }
  );
}

export async function markStoryAsViewed(statusId: string, currentUid: string): Promise<void> {
  if (!statusId || !currentUid) return;

  if (statusId.startsWith('demo_')) {
    addLocallyViewedId(statusId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(STATUS_VIEWED_EVENT, { detail: { statusId, uid: currentUid } }));
    }
    return;
  }

  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(STATUS_VIEWED_EVENT, { detail: { statusId, uid: currentUid } }));
    }
    const statusRef = doc(db, 'statuses', statusId);
    await updateDoc(statusRef, {
      viewedBy: arrayUnion(currentUid),
    });
  } catch {
    // Non-critical if doc already expired/deleted
  }
}

export async function deleteStatusStory(statusId: string): Promise<void> {
  if (!statusId) return;
  try {
    await deleteDoc(doc(db, 'statuses', statusId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `statuses/${statusId}`);
    throw err;
  }
}
