/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const DRAFT_EVENT = 'devchat_draft_change';

function getStorageKey(uid: string): string {
  return `devchat_drafts_${uid}`;
}

export function getAllDrafts(uid?: string | null): Record<string, string> {
  if (!uid || typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(getStorageKey(uid));
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function getConversationDraft(uid: string | null | undefined, conversationId: string | null): string {
  if (!uid || !conversationId) return '';
  const all = getAllDrafts(uid);
  return all[conversationId] || '';
}

export function setConversationDraft(
  uid: string | null | undefined,
  conversationId: string | null,
  text: string
): void {
  if (!uid || !conversationId || typeof window === 'undefined') return;
  try {
    const all = getAllDrafts(uid);
    if (text.trim().length === 0) {
      delete all[conversationId];
    } else {
      all[conversationId] = text;
    }
    localStorage.setItem(getStorageKey(uid), JSON.stringify(all));
    window.dispatchEvent(new CustomEvent(DRAFT_EVENT, { detail: { uid, conversationId, text } }));
  } catch {
    // Ignore quota errors
  }
}

export function subscribeDraftChanges(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(DRAFT_EVENT, handler);
  return () => window.removeEventListener(DRAFT_EVENT, handler);
}
