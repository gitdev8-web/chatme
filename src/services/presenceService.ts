/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, setDoc } from 'firebase/firestore';
import {
  ref,
  onValue,
  set,
  onDisconnect,
  serverTimestamp as rtdbServerTimestamp,
  Unsubscribe,
} from 'firebase/database';
import { db, rtdb } from '../firebase/config';

export interface UserPresenceState {
  isOnline: boolean;
  state: 'online' | 'offline';
  lastSeen: number | string;
}

// In-memory real-time presence cache
const presenceCache: Record<string, UserPresenceState> = {};
const listeners: Record<string, Set<(state: UserPresenceState) => void>> = {};
const allPresenceListeners = new Set<(cache: Record<string, UserPresenceState>) => void>();

let activeHeartbeatInterval: NodeJS.Timeout | null = null;
let currentConnectedUserId: string | null = null;
let rtdbConnectedUnsub: Unsubscribe | null = null;

/**
 * Initializes real-time presence tracking with Firebase RTDB onDisconnect hooks
 * and active session heartbeats synced with Firestore.
 */
export function initializePresence(uid: string): () => void {
  if (!uid) return () => {};
  currentConnectedUserId = uid;

  // 1. Sync immediately to Firestore as online
  setDoc(
    doc(db, 'users', uid),
    {
      isOnline: true,
      lastSeen: new Date().toISOString(),
    },
    { merge: true }
  ).catch(() => {});

  // 2. Set up Firebase Realtime Database onDisconnect hooks if RTDB is available
  if (rtdb) {
    try {
      const userStatusRef = ref(rtdb, `/status/${uid}`);
      const connectedRef = ref(rtdb, '.info/connected');

      rtdbConnectedUnsub = onValue(connectedRef, (snapshot) => {
        if (snapshot.val() === false) {
          return;
        }

        // Setup onDisconnect hook so Firebase automatically sets offline when TCP socket terminates
        onDisconnect(userStatusRef)
          .set({
            isOnline: false,
            state: 'offline',
            lastSeen: rtdbServerTimestamp(),
          })
          .then(() => {
            // Set current state as online in RTDB
            set(userStatusRef, {
              isOnline: true,
              state: 'online',
              lastSeen: rtdbServerTimestamp(),
            });
          })
          .catch((err) => {
            console.warn('Presence onDisconnect setup warning:', err);
          });
      });
    } catch (err) {
      console.warn('RTDB presence listener error:', err);
    }
  }

  // 3. Heartbeat: refreshes presence every 15 seconds while active
  if (activeHeartbeatInterval) {
    clearInterval(activeHeartbeatInterval);
  }

  const triggerHeartbeat = () => {
    const nowIso = new Date().toISOString();
    setDoc(
      doc(db, 'users', uid),
      {
        isOnline: true,
        lastSeen: nowIso,
      },
      { merge: true }
    ).catch(() => {});

    if (rtdb) {
      try {
        const userStatusRef = ref(rtdb, `/status/${uid}`);
        set(userStatusRef, {
          isOnline: true,
          state: 'online',
          lastSeen: rtdbServerTimestamp(),
        }).catch(() => {});
      } catch {
        // Ignore background heartbeat error
      }
    }
  };

  activeHeartbeatInterval = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      triggerHeartbeat();
    }
  }, 15000);

  // 4. Teardown / Offline trigger
  const markOfflineImmediate = () => {
    if (rtdb) {
      try {
        const userStatusRef = ref(rtdb, `/status/${uid}`);
        set(userStatusRef, {
          isOnline: false,
          state: 'offline',
          lastSeen: Date.now(),
        }).catch(() => {});
      } catch {
        // Ignore unload error
      }
    }

    setDoc(
      doc(db, 'users', uid),
      {
        isOnline: false,
        lastSeen: new Date().toISOString(),
      },
      { merge: true }
    ).catch(() => {});
  };

  const handlePageUnload = () => {
    markOfflineImmediate();
  };

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      triggerHeartbeat();
    }
  };

  window.addEventListener('beforeunload', handlePageUnload);
  window.addEventListener('pagehide', handlePageUnload);
  document.addEventListener('visibilitychange', handleVisibility);

  return () => {
    if (activeHeartbeatInterval) {
      clearInterval(activeHeartbeatInterval);
      activeHeartbeatInterval = null;
    }
    if (rtdbConnectedUnsub) {
      rtdbConnectedUnsub();
      rtdbConnectedUnsub = null;
    }
    window.removeEventListener('beforeunload', handlePageUnload);
    window.removeEventListener('pagehide', handlePageUnload);
    document.removeEventListener('visibilitychange', handleVisibility);
    markOfflineImmediate();
    currentConnectedUserId = null;
  };
}

/**
 * Manually updates online presence
 */
export async function setUserOnlineState(uid: string, isOnline: boolean): Promise<void> {
  if (!uid) return;
  const nowIso = new Date().toISOString();

  try {
    await setDoc(
      doc(db, 'users', uid),
      {
        isOnline,
        lastSeen: nowIso,
      },
      { merge: true }
    );

    if (rtdb) {
      const userStatusRef = ref(rtdb, `/status/${uid}`);
      await set(userStatusRef, {
        isOnline,
        state: isOnline ? 'online' : 'offline',
        lastSeen: rtdbServerTimestamp(),
      });
    }
  } catch (err) {
    console.warn('Error setting user online state:', err);
  }
}

/**
 * Subscribes to a single user's real-time presence
 */
export function subscribeToUserPresence(
  uid: string,
  callback: (state: UserPresenceState) => void
): () => void {
  if (!uid) return () => {};

  if (!listeners[uid]) {
    listeners[uid] = new Set();
  }
  listeners[uid].add(callback);

  // Return cached state immediately if exists
  if (presenceCache[uid]) {
    callback(presenceCache[uid]);
  }

  // Subscribe via RTDB if available
  let unsubRtdb: Unsubscribe | null = null;
  if (rtdb) {
    try {
      const statusRef = ref(rtdb, `/status/${uid}`);
      unsubRtdb = onValue(statusRef, (snap) => {
        if (snap.exists()) {
          const val = snap.val();
          const state: UserPresenceState = {
            isOnline: val.isOnline === true || val.state === 'online',
            state: val.state || (val.isOnline ? 'online' : 'offline'),
            lastSeen: val.lastSeen || Date.now(),
          };
          presenceCache[uid] = state;
          listeners[uid]?.forEach((cb) => cb(state));
          allPresenceListeners.forEach((cb) => cb(presenceCache));
        }
      });
    } catch {
      // Fallback to Firestore listener if RTDB fails
    }
  }

  return () => {
    listeners[uid]?.delete(callback);
    if (listeners[uid]?.size === 0) {
      delete listeners[uid];
    }
    if (unsubRtdb) {
      unsubRtdb();
    }
  };
}

/**
 * Subscribes to global presence updates across all users
 */
export function subscribeToAllPresence(
  callback: (cache: Record<string, UserPresenceState>) => void
): () => void {
  allPresenceListeners.add(callback);
  callback(presenceCache);

  let unsubAll: Unsubscribe | null = null;
  if (rtdb) {
    try {
      const allStatusRef = ref(rtdb, '/status');
      unsubAll = onValue(allStatusRef, (snap) => {
        if (snap.exists()) {
          const val = snap.val();
          Object.keys(val).forEach((k) => {
            const item = val[k];
            presenceCache[k] = {
              isOnline: item.isOnline === true || item.state === 'online',
              state: item.state || (item.isOnline ? 'online' : 'offline'),
              lastSeen: item.lastSeen || Date.now(),
            };
          });
          allPresenceListeners.forEach((cb) => cb(presenceCache));
        }
      });
    } catch {
      // Fail safely
    }
  }

  return () => {
    allPresenceListeners.delete(callback);
    if (unsubAll) {
      unsubAll();
    }
  };
}

/**
 * Returns current cached presence for a user if available
 */
export function getCachedPresence(uid: string): UserPresenceState | null {
  return presenceCache[uid] || null;
}
