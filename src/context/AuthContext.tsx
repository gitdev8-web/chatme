/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  deleteUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { UserProfile } from '../types';
import { initializePresence, setUserOnlineState } from '../services/presenceService';
import {
  authorizeGoogleMeet,
  buildMeetGoogleProvider,
  clearMeetAccessToken,
  setMeetAccessToken,
  subscribeMeetAuthState,
} from '../services/googleMeetService';

const PROFILE_CACHE_PREFIX = 'devchat_profile_cache_';

function readCachedProfile(uid: string): UserProfile | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(`${PROFILE_CACHE_PREFIX}${uid}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserProfile;
    return parsed && parsed.uid === uid ? parsed : null;
  } catch {
    return null;
  }
}

function writeCachedProfile(profile: UserProfile | null): void {
  try {
    if (typeof window === 'undefined' || !profile?.uid) return;
    localStorage.setItem(`${PROFILE_CACHE_PREFIX}${profile.uid}`, JSON.stringify(profile));
  } catch {
    // Ignore storage quota errors
  }
}

function clearCachedProfile(uid?: string | null): void {
  try {
    if (typeof window === 'undefined' || !uid) return;
    localStorage.removeItem(`${PROFILE_CACHE_PREFIX}${uid}`);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Firebase Auth rejects data: URLs or URLs exceeding ~2048 chars with auth/invalid-profile-attribute.
 * Keep compressed data: URLs in Firestore while safely syncing short HTTP URLs or clears to Auth.
 */
async function syncFirebaseAuthProfile(
  currentUser: User,
  displayName?: string,
  photoURL?: string
): Promise<void> {
  try {
    const authPayload: { displayName?: string; photoURL?: string | null } = {};
    if (displayName !== undefined) {
      authPayload.displayName = displayName;
    }
    if (photoURL !== undefined) {
      if (photoURL === '') {
        authPayload.photoURL = '';
      } else if (photoURL.startsWith('http') && photoURL.length < 1800) {
        authPayload.photoURL = photoURL;
      }
    }
    if (Object.keys(authPayload).length > 0) {
      await updateProfile(currentUser, authPayload);
    }
  } catch (err) {
    console.warn('Non-blocking Auth profile sync notice:', err);
  }
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  meetConnected: boolean;
  connectGoogleMeet: () => Promise<string>;
  registerWithEmail: (
    email: string,
    pass: string,
    displayName: string,
    username: string,
    photoURL?: string,
    bio?: string
  ) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileData: (updates: Partial<UserProfile>) => Promise<void>;
  deleteAccount: () => Promise<void>;
  checkUsernameAvailable: (username: string) => Promise<boolean>;
  completeProfileSetup: (
    displayName: string,
    username: string,
    photoURL?: string,
    bio?: string
  ) => Promise<UserProfile>;
  demoPhoneLogin: (phoneNumber?: string, testName?: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [meetConnected, setMeetConnected] = useState<boolean>(false);

  useEffect(() => {
    return subscribeMeetAuthState(setMeetConnected);
  }, []);

  // Sync profile from Firestore without ever overwriting an existing profile on slow cold-starts
  const fetchUserProfile = async (currentUser: User): Promise<UserProfile | null> => {
    const userDocRef = doc(db, 'users', currentUser.uid);

    // Instant local hydration while Firestore read is in flight
    const cached = readCachedProfile(currentUser.uid);
    if (cached) {
      setProfile((prev) => prev || cached);
    }

    try {
      const snap = await Promise.race([
        getDoc(userDocRef),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Firestore timeout')), 8000)
        ),
      ]);

      if (snap.exists()) {
        const data = { ...(snap.data() as UserProfile), uid: currentUser.uid };
        setProfile(data);
        writeCachedProfile(data);
        return data;
      }

      // Confirmed document does NOT exist yet — safely create initial profile
      const defaultUsername = (currentUser.email?.split('@')[0] || `user_${currentUser.uid.slice(0, 5)}`)
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 20);

      const newProfile: UserProfile = {
        uid: currentUser.uid,
        email: currentUser.email || '',
        displayName: currentUser.displayName || 'DEV CHAT User',
        username: defaultUsername || `user_${currentUser.uid.slice(0, 5)}`,
        photoURL: currentUser.photoURL || '',
        bio: 'Hey there! I am using DEV CHAT.',
        status: 'Available',
        isOnline: true,
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        showOnlineStatus: true,
        showLastSeen: true,
        readReceipts: true,
        enterToSend: true,
        theme: 'dark',
        blockedUserIds: [],
      };

      setProfile(newProfile);
      writeCachedProfile(newProfile);

      await Promise.allSettled([
        setDoc(userDocRef, newProfile, { merge: true }),
        setDoc(
          doc(db, 'usernames', newProfile.username),
          {
            uid: currentUser.uid,
            username: newProfile.username,
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        ),
      ]);

      return newProfile;
    } catch {
      // On network failure or timeout, NEVER overwrite Firestore with blank defaults.
      // Return cached profile if available, or an in-memory placeholder until onSnapshot syncs.
      if (cached) {
        setProfile(cached);
        return cached;
      }

      const transientUsername = (currentUser.email?.split('@')[0] || `user_${currentUser.uid.slice(0, 5)}`)
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 20);

      const transientProfile: UserProfile = {
        uid: currentUser.uid,
        email: currentUser.email || '',
        displayName: currentUser.displayName || 'DEV CHAT User',
        username: transientUsername || `user_${currentUser.uid.slice(0, 5)}`,
        photoURL: currentUser.photoURL || '',
        bio: 'Hey there! I am using DEV CHAT.',
        status: 'Available',
        isOnline: true,
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        showOnlineStatus: true,
        showLastSeen: true,
        readReceipts: true,
        enterToSend: true,
        theme: 'dark',
        blockedUserIds: [],
      };
      setProfile((prev) => prev || transientProfile);
      return transientProfile;
    }
  };

  const checkAdminStatus = async (currentUser: User) => {
    if (currentUser.email?.toLowerCase() === 'gitdev8@gmail.com') {
      setIsAdmin(true);
      return;
    }

    try {
      const adminSnap = await getDoc(doc(db, 'admins', currentUser.uid));
      setIsAdmin(adminSnap.exists());
    } catch {
      setIsAdmin(false);
    }
  };

  const updatePresence = async (isOnline: boolean) => {
    const currentUser = auth.currentUser || user;
    if (!currentUser) return;
    try {
      await setUserOnlineState(currentUser.uid, isOnline);
    } catch {
      // Ignore background presence failures
    }
  };

  useEffect(() => {
    let profileUnsub: (() => void) | null = null;
    let presenceCleanup: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchUserProfile(currentUser).then(() => {
          checkAdminStatus(currentUser);
        });

        // Initialize Realtime Presence with Firebase onDisconnect hooks & active session heartbeat
        if (presenceCleanup) {
          presenceCleanup();
        }
        presenceCleanup = initializePresence(currentUser.uid);

        // Real-time listener for current user profile changes
        if (profileUnsub) {
          profileUnsub();
        }
        profileUnsub = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
          if (snap.exists()) {
            const data = { ...(snap.data() as UserProfile), uid: currentUser.uid };
            setProfile(data);
            writeCachedProfile(data);
          }
        });
      } else {
        setProfile(null);
        setIsAdmin(false);
        clearMeetAccessToken();
        if (presenceCleanup) {
          presenceCleanup();
          presenceCleanup = null;
        }
        if (profileUnsub) {
          profileUnsub();
          profileUnsub = null;
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (presenceCleanup) presenceCleanup();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const checkUsernameAvailable = async (username: string): Promise<boolean> => {
    const cleaned = username.trim().toLowerCase();
    if (!cleaned || cleaned.length < 3) return false;
    try {
      const snap = await getDoc(doc(db, 'usernames', cleaned));
      if (!snap.exists()) return true;
      const data = snap.data();
      const currentUid = user?.uid || auth.currentUser?.uid;
      if (currentUid && data?.uid === currentUid) return true;
      return false;
    } catch {
      return true;
    }
  };

  const registerWithEmail = async (
    email: string,
    pass: string,
    displayName: string,
    username: string,
    photoURL?: string,
    bio?: string
  ) => {
    const cleanedUsername = username.toLowerCase().trim();

    let cred;
    try {
      cred = await createUserWithEmailAndPassword(auth, email, pass);
    } catch (authErr: unknown) {
      const authMessage = authErr instanceof Error ? authErr.message : String(authErr);
      if (authMessage.includes('auth/operation-not-allowed')) {
        throw new Error(
          'Email/Password sign-in is disabled in Firebase Console. Please enable Email/Password under Firebase Console > Authentication > Sign-in method.'
        );
      }
      throw authErr;
    }

    const currentUser = cred.user;
    setUser(currentUser);

    const newProfile: UserProfile = {
      uid: currentUser.uid,
      email: currentUser.email || email,
      displayName: displayName.trim(),
      username: cleanedUsername,
      photoURL: photoURL || '',
      bio: bio?.trim() || 'Hey there! I am using DEV CHAT.',
      status: 'Available',
      isOnline: true,
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      showOnlineStatus: true,
      showLastSeen: true,
      readReceipts: true,
      enterToSend: true,
      theme: 'dark',
      blockedUserIds: [],
    };

    setProfile(newProfile);
    writeCachedProfile(newProfile);
    if (email.toLowerCase() === 'gitdev8@gmail.com') {
      setIsAdmin(true);
    }

    await Promise.allSettled([
      syncFirebaseAuthProfile(currentUser, displayName.trim(), photoURL || ''),
      setDoc(doc(db, 'users', currentUser.uid), newProfile, { merge: true }),
      setDoc(
        doc(db, 'usernames', cleanedUsername),
        {
          uid: currentUser.uid,
          username: cleanedUsername,
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      ),
    ]);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const loginWithGoogle = async () => {
    const provider = buildMeetGoogleProvider();
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      setMeetAccessToken(credential.accessToken);
    }
  };

  const connectGoogleMeet = async (): Promise<string> => {
    return authorizeGoogleMeet();
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    const currentUid = auth.currentUser?.uid || user?.uid;
    clearMeetAccessToken();
    await updatePresence(false);
    await signOut(auth);
    clearCachedProfile(currentUid);
    setProfile(null);
    setUser(null);
  };

  const updateProfileData = async (updates: Partial<UserProfile>) => {
    const currentUser = user || auth.currentUser;
    if (!currentUser) {
      throw new Error('You must be signed in to update your profile.');
    }

    const baseProfile: UserProfile = profile ||
      readCachedProfile(currentUser.uid) || {
        uid: currentUser.uid,
        email: currentUser.email || '',
        displayName: currentUser.displayName || 'DEV CHAT User',
        username: `user_${currentUser.uid.slice(0, 5)}`,
        photoURL: currentUser.photoURL || '',
        bio: 'Hey there! I am using DEV CHAT.',
        status: 'Available',
        isOnline: true,
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        showOnlineStatus: true,
        showLastSeen: true,
        readReceipts: true,
        enterToSend: true,
        theme: 'dark',
        blockedUserIds: [],
      };

    const updated: UserProfile = {
      ...baseProfile,
      ...updates,
      uid: currentUser.uid,
      updatedAt: new Date().toISOString(),
    };

    // Persist to Firestore first so failures surface clearly, while keeping local cache synced
    await setDoc(doc(db, 'users', currentUser.uid), updated, { merge: true });
    setProfile(updated);
    writeCachedProfile(updated);

    if (updates.username) {
      await setDoc(
        doc(db, 'usernames', updates.username),
        {
          uid: currentUser.uid,
          username: updates.username,
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch(() => {});
    }

    if (updates.displayName !== undefined || updates.photoURL !== undefined) {
      await syncFirebaseAuthProfile(
        currentUser,
        updates.displayName ?? updated.displayName,
        updates.photoURL !== undefined ? updates.photoURL : updated.photoURL
      );
    }
  };

  const completeProfileSetup = async (
    displayName: string,
    username: string,
    photoURL?: string,
    bio?: string
  ): Promise<UserProfile> => {
    const currentUser = user || auth.currentUser;
    if (!currentUser) {
      throw new Error('User session not found. Please log in again.');
    }

    const cleanedUsername = (username || `user_${currentUser.uid.slice(0, 5)}`).toLowerCase().trim();

    const newProfile: UserProfile = {
      uid: currentUser.uid,
      email: currentUser.email || '',
      displayName: displayName.trim() || 'DEV CHAT User',
      username: cleanedUsername,
      photoURL: photoURL || '',
      bio: bio?.trim() || 'Hey there! I am using DEV CHAT.',
      status: 'Available',
      isOnline: true,
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      showOnlineStatus: true,
      showLastSeen: true,
      readReceipts: true,
      enterToSend: true,
      theme: 'dark',
      blockedUserIds: [],
    };

    setUser(currentUser);
    setProfile(newProfile);
    writeCachedProfile(newProfile);

    await Promise.allSettled([
      syncFirebaseAuthProfile(
        currentUser,
        displayName.trim() || 'DEV CHAT User',
        photoURL || ''
      ),
      setDoc(doc(db, 'users', currentUser.uid), newProfile, { merge: true }),
      setDoc(
        doc(db, 'usernames', cleanedUsername),
        {
          uid: currentUser.uid,
          username: cleanedUsername,
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      ),
    ]);

    return newProfile;
  };

  const demoPhoneLogin = async (phoneNumber?: string, testName?: string) => {
    const cred = await signInAnonymously(auth);
    const currentUser = cred.user;
    const name = testName || 'DEV CHAT Developer';
    const num = phoneNumber || '+256700123456';
    const randId = Math.random().toString(36).substring(2, 7);

    const demoProfile: UserProfile = {
      uid: currentUser.uid,
      email: `${randId}@devchat.app`,
      displayName: name,
      username: `user_${randId}`,
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${randId}`,
      bio: `Logged in with ${num}`,
      status: 'Available',
      isOnline: true,
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      showOnlineStatus: true,
      showLastSeen: true,
      readReceipts: true,
      enterToSend: true,
      theme: 'dark',
      blockedUserIds: [],
    };

    setProfile(demoProfile);
    writeCachedProfile(demoProfile);
    setUser(currentUser);

    await Promise.allSettled([
      setDoc(doc(db, 'users', currentUser.uid), demoProfile, { merge: true }),
      setDoc(
        doc(db, 'usernames', demoProfile.username),
        {
          uid: currentUser.uid,
          username: demoProfile.username,
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      ),
    ]);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    const uid = user.uid;
    try {
      await signOut(auth);
      await deleteUser(user);
      clearCachedProfile(uid);
      setProfile(null);
      setUser(null);
    } catch (err) {
      console.error('Delete account error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        loading,
        meetConnected,
        connectGoogleMeet,
        registerWithEmail,
        loginWithEmail,
        loginWithGoogle,
        resetPassword,
        logout,
        updateProfileData,
        deleteAccount,
        checkUsernameAvailable,
        completeProfileSetup,
        demoPhoneLogin,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
