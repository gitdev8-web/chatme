/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GoogleAuthProvider,
  linkWithPopup,
  reauthenticateWithPopup,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../firebase/config';

export const GOOGLE_MEET_SCOPES = [
  'https://www.googleapis.com/auth/meetings.space.created',
  'https://www.googleapis.com/auth/meetings.space.readonly',
  'https://www.googleapis.com/auth/meetings.space.settings',
] as const;

export interface MeetSpaceConfig {
  accessType?: 'ACCESS_TYPE_UNSPECIFIED' | 'OPEN' | 'TRUSTED' | 'RESTRICTED';
  entryPointAccess?: 'ENTRY_POINT_ACCESS_UNSPECIFIED' | 'ALL' | 'CREATOR_APP_ONLY';
  moderation?: 'MODERATION_UNSPECIFIED' | 'OFF' | 'ON';
}

export interface MeetActiveConference {
  conferenceRecord?: string;
}

export interface MeetSpace {
  name: string; // e.g. "spaces/abc-defg-hij"
  meetingUri: string; // e.g. "https://meet.google.com/abc-defg-hij"
  meetingCode: string; // e.g. "abc-defg-hij"
  config?: MeetSpaceConfig;
  activeConference?: MeetActiveConference;
}

// Strict in-memory token cache (never persisted to localStorage or sessionStorage)
let cachedAccessToken: string | null = null;
let tokenAcquiredAt = 0;
const TOKEN_MAX_AGE_MS = 50 * 60 * 1000; // Refresh proactively before 60m expiry
const authListeners = new Set<(connected: boolean) => void>();

function notifyListeners() {
  const connected = Boolean(getMeetAccessToken());
  authListeners.forEach((cb) => cb(connected));
}

export function subscribeMeetAuthState(cb: (connected: boolean) => void): () => void {
  authListeners.add(cb);
  cb(Boolean(getMeetAccessToken()));
  return () => {
    authListeners.delete(cb);
  };
}

export function getMeetAccessToken(): string | null {
  if (!cachedAccessToken) return null;
  if (Date.now() - tokenAcquiredAt > TOKEN_MAX_AGE_MS) {
    cachedAccessToken = null;
    tokenAcquiredAt = 0;
    return null;
  }
  return cachedAccessToken;
}

export function setMeetAccessToken(token: string | null) {
  cachedAccessToken = token;
  tokenAcquiredAt = token ? Date.now() : 0;
  notifyListeners();
}

export function clearMeetAccessToken() {
  cachedAccessToken = null;
  tokenAcquiredAt = 0;
  notifyListeners();
}

export function buildMeetGoogleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  GOOGLE_MEET_SCOPES.forEach((scope) => provider.addScope(scope));
  provider.setCustomParameters({
    prompt: 'select_account',
  });
  return provider;
}

/**
 * Authenticates or re-authorizes the user with Google and requests Google Meet scopes.
 * Preserves existing email/password accounts via linkWithPopup when possible.
 */
export async function authorizeGoogleMeet(): Promise<string> {
  const provider = buildMeetGoogleProvider();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not obtain Google Meet access permission. Please try again.');
    }
    setMeetAccessToken(credential.accessToken);
    return credential.accessToken;
  }

  const hasGoogleProvider = currentUser.providerData.some(
    (p) => p.providerId === 'google.com'
  );

  if (hasGoogleProvider) {
    const result = await reauthenticateWithPopup(currentUser, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google Meet permission was not granted. Please try again.');
    }
    setMeetAccessToken(credential.accessToken);
    return credential.accessToken;
  }

  // User signed in with email/password or anonymous: try linking first to preserve UID
  try {
    const result = await linkWithPopup(currentUser, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google Meet permission was not granted.');
    }
    setMeetAccessToken(credential.accessToken);
    return credential.accessToken;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    const errCred = GoogleAuthProvider.credentialFromError(
      err as Parameters<typeof GoogleAuthProvider.credentialFromError>[0]
    );
    if (errCred?.accessToken) {
      setMeetAccessToken(errCred.accessToken);
      return errCred.accessToken;
    }

    if (
      code === 'auth/credential-already-in-use' ||
      code === 'auth/email-already-in-use' ||
      code === 'auth/provider-already-linked'
    ) {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Google Meet permission was not granted.');
      }
      setMeetAccessToken(credential.accessToken);
      return credential.accessToken;
    }

    throw err;
  }
}

async function meetFetch<T>(
  url: string,
  accessToken: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (res.status === 401) {
    clearMeetAccessToken();
    throw new Error('MEET_AUTH_EXPIRED');
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) {
    const message =
      data?.error?.message || `Google Meet API error (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}

/**
 * Creates a new Google Meet space via Meet REST API v2.
 */
export async function createMeetSpace(
  accessToken: string,
  accessType: 'OPEN' | 'TRUSTED' | 'RESTRICTED' = 'OPEN'
): Promise<MeetSpace> {
  try {
    return await meetFetch<MeetSpace>('https://meet.googleapis.com/v2/spaces', accessToken, {
      method: 'POST',
      body: JSON.stringify({
        config: {
          accessType,
          entryPointAccess: 'ALL',
        },
      }),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'MEET_AUTH_EXPIRED') throw err;
    // Fallback to default workspace policy configuration if OPEN is restricted by org admin
    return meetFetch<MeetSpace>('https://meet.googleapis.com/v2/spaces', accessToken, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }
}

/**
 * Fetches live details & active conference state for a Google Meet space.
 */
export async function getMeetSpace(
  accessToken: string,
  spaceNameOrCode: string
): Promise<MeetSpace> {
  const cleanName = spaceNameOrCode.startsWith('spaces/')
    ? spaceNameOrCode
    : `spaces/${spaceNameOrCode}`;
  return meetFetch<MeetSpace>(
    `https://meet.googleapis.com/v2/${cleanName}`,
    accessToken,
    { method: 'GET' }
  );
}

/**
 * Updates Google Meet space access or moderation settings.
 * Caller must display an explicit confirmation dialog before invoking this mutation.
 */
export async function updateMeetSpaceSettings(
  accessToken: string,
  spaceName: string,
  configUpdates: {
    accessType?: 'OPEN' | 'TRUSTED' | 'RESTRICTED';
    moderation?: 'OFF' | 'ON';
  }
): Promise<MeetSpace> {
  const cleanName = spaceName.startsWith('spaces/') ? spaceName : `spaces/${spaceName}`;
  const masks: string[] = [];
  if (configUpdates.accessType) masks.push('config.accessType');
  if (configUpdates.moderation) masks.push('config.moderation');

  const queryStr = masks.length > 0 ? `?updateMask=${encodeURIComponent(masks.join(','))}` : '';
  return meetFetch<MeetSpace>(
    `https://meet.googleapis.com/v2/${cleanName}${queryStr}`,
    accessToken,
    {
      method: 'PATCH',
      body: JSON.stringify({
        config: configUpdates,
      }),
    }
  );
}

/**
 * Ends an active Google Meet conference in a space.
 * Caller must display an explicit confirmation dialog before invoking this mutation.
 */
export async function endMeetActiveConference(
  accessToken: string,
  spaceName: string
): Promise<void> {
  const cleanName = spaceName.startsWith('spaces/') ? spaceName : `spaces/${spaceName}`;
  await meetFetch<Record<string, never>>(
    `https://meet.googleapis.com/v2/${cleanName}:endActiveConference`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({}),
    }
  );
}
