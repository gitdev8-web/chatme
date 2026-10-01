/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile } from '../types';

/**
 * Presence & Online Status Verification
 * Evaluates whether a user is genuinely currently online based on presence flag and heartbeat freshness.
 */

// Max threshold in ms (75 seconds, given a 25-30s client heartbeat)
const ONLINE_FRESHNESS_THRESHOLD_MS = 75 * 1000;

/**
 * Returns true only if the user has isOnline: true, showOnlineStatus !== false,
 * and their lastSeen timestamp is fresh within the threshold.
 */
export function isUserOnline(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false;
  if (profile.showOnlineStatus === false) return false;
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
 * Formats a user's last seen time into a human-friendly string like WhatsApp
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
