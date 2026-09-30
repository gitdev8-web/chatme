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

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
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

  // Sync profile from Firestore
  const fetchUserProfile = async (currentUser: User): Promise<UserProfile | null> => {
    const userDocRef = doc(db, 'users', currentUser.uid);
    try {
      const getDocWithTimeout = Promise.race([
        getDoc(userDocRef),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Firestore timeout')), 2500)
        ),
      ]);

      const snap = await getDocWithTimeout;
      if (snap && snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
        return data;
      }
    } catch {
      // Fallback
    }

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

    // Save in background with merge
    Promise.allSettled([
      setDoc(userDocRef, newProfile, { merge: true }),
      setDoc(doc(db, 'usernames', newProfile.username), {
        uid: currentUser.uid,
        username: newProfile.username,
        createdAt: new Date().toISOString(),
      }, { merge: true }),
    ]).catch(() => {});

    return newProfile;
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
      await setDoc(doc(db, 'users', currentUser.uid), {
        isOnline,
        lastSeen: new Date().toISOString(),
      }, { merge: true });
    } catch {
      // Ignore background presence failures
    }
  };

  useEffect(() => {
    let profileUnsub: (() => void) | null = null;
    let heartbeatInterval: NodeJS.Timeout | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchUserProfile(currentUser).then(() => {
          checkAdminStatus(currentUser);
          updatePresence(true);
        });

        // Real-time listener for current user profile changes
        profileUnsub = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          }
        });

        // Periodic presence heartbeat every 45s
        heartbeatInterval = setInterval(() => {
          if (document.visibilityState === 'visible') {
            updatePresence(true);
          }
        }, 45000);
      } else {
        setProfile(null);
        setIsAdmin(false);
        if (profileUnsub) {
          profileUnsub();
          profileUnsub = null;
        }
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
      }
      setLoading(false);
    });

    const handleBeforeUnload = () => {
      updatePresence(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence(true);
      } else {
        updatePresence(false);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubscribe();
      if (profileUnsub) profileUnsub();
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
      return true; // Graceful fallback
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
    if (email.toLowerCase() === 'gitdev8@gmail.com') {
      setIsAdmin(true);
    }

    Promise.allSettled([
      updateProfile(currentUser, {
        displayName: displayName.trim(),
        photoURL: photoURL || '',
      }),
      setDoc(doc(db, 'users', currentUser.uid), newProfile, { merge: true }),
      setDoc(doc(db, 'usernames', cleanedUsername), {
        uid: currentUser.uid,
        username: cleanedUsername,
        createdAt: new Date().toISOString(),
      }, { merge: true }),
    ]).catch(() => {});
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    await updatePresence(false);
    await signOut(auth);
    setProfile(null);
    setUser(null);
  };

  const updateProfileData = async (updates: Partial<UserProfile>) => {
    const currentUser = user || auth.currentUser;
    if (!currentUser) return;
    const currentProfile = profile || {
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
    const updated = { ...currentProfile, ...updates, updatedAt: new Date().toISOString() };
    setProfile(updated);

    try {
      await setDoc(doc(db, 'users', currentUser.uid), updated, { merge: true });
      if (updates.displayName || updates.photoURL !== undefined) {
        await updateProfile(currentUser, {
          displayName: updates.displayName || currentProfile.displayName,
          photoURL: updates.photoURL !== undefined ? updates.photoURL : currentProfile.photoURL,
        });
      }
      if (updates.username) {
        await setDoc(doc(db, 'usernames', updates.username), {
          uid: currentUser.uid,
          username: updates.username,
          createdAt: new Date().toISOString(),
        }, { merge: true });
      }
    } catch (err) {
      console.warn('Profile update notice:', err);
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

    Promise.allSettled([
      updateProfile(currentUser, {
        displayName: displayName.trim() || 'DEV CHAT User',
        photoURL: photoURL || '',
      }),
      setDoc(doc(db, 'users', currentUser.uid), newProfile, { merge: true }),
      setDoc(doc(db, 'usernames', cleanedUsername), {
        uid: currentUser.uid,
        username: cleanedUsername,
        createdAt: new Date().toISOString(),
      }, { merge: true }),
    ]).catch(() => {});

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
    setUser(currentUser);

    Promise.allSettled([
      setDoc(doc(db, 'users', currentUser.uid), demoProfile, { merge: true }),
      setDoc(doc(db, 'usernames', demoProfile.username), {
        uid: currentUser.uid,
        username: demoProfile.username,
        createdAt: new Date().toISOString(),
      }, { merge: true }),
    ]).catch(() => {});
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    try {
      await signOut(auth);
      await deleteUser(user);
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
