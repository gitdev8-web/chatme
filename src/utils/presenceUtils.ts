/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile } from '../types';
import { getCachedPresence } from '../services/presenceService';

/**
 * Presence & Online Status Verification
 * Evaluates whether a user is genuinely currently online based on real-time presence
 * and active session heartbeat freshness.
 */

// Max threshold in ms (40 seconds, given 15s client session heartbeat)
const ONLINE_FRESHNESS_THRESHOLD_MS = 40 * 1000;

/**
 * Returns true only if the user has isOnline: true, showOnlineStatus !== false,
 * and their lastSeen timestamp is fresh within the active heartbeat window.
 */
export function isUserOnline(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false;
  if (profile.showOnlineStatus === false) return false;

  // 1. Check real-time Firebase RTDB cache if available
  if (profile.uid) {
    const cached = getCachedPresence(profile.uid);
    if (cached) {
      if (!cached.isOnline || cached.state === 'offline') {
        return false;
      }
      const cachedTime =
        typeof cached.lastSeen === 'number'
          ? cached.lastSeen
          : new Date(cached.lastSeen).getTime();
      if (!isNaN(cachedTime)) {
        return Date.now() - cachedTime <= ONLINE_FRESHNESS_THRESHOLD_MS;
      }
    }
  }

  // 2. Check Firestore profile presence flag and timestamp freshness
  if (!profile.isOnline) return false;
  if (!profile.lastSeen) return false;

  try {
    const lastSeenTime = new Date(profile.lastSeen).getTime();
    if (isNaN(lastSeenTime)) return false;
    const now = Date.now();
    return now - lastSeenTime <= ONLINE_FRESHNESS_THRESHOLD_MS;
  } catch {
    return false;
  }
}

/**
 * Formats a user's last seen time into a human-friendly string
 */
export function formatLastSeen(profile: UserProfile | null | undefined): string {
  if (!profile) return '';
  if (profile.showLastSeen === false) return '';

  if (isUserOnline(profile)) {
    return 'online';
  }

  if (!profile.lastSeen) return 'offline';

  try {
    const d = new Date(profile.lastSeen);
    if (isNaN(d.getTime())) return 'offline';

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'last seen just now';
    if (diffMins < 60) return `last seen ${diffMins}m ago`;

    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) {
      return `last seen today at ${timeStr}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return `last seen yesterday at ${timeStr}`;
    }

    return `last seen on ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
  } catch {
    return 'offline';
  }
}
