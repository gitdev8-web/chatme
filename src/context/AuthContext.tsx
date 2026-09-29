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
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
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
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
        return data;
      } else {
        // Create initial profile if first login (e.g. Google Sign In)
        const defaultUsername = (currentUser.email?.split('@')[0] || 'user')
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '')
          .slice(0, 20);

        const newProfile: UserProfile = {
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || 'Chattr User',
          username: defaultUsername || `user_${currentUser.uid.slice(0, 5)}`,
          photoURL: currentUser.photoURL || '',
          bio: 'Hey there! I am using Chattr.',
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

        await setDoc(userDocRef, newProfile);
        setProfile(newProfile);
        return newProfile;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
      return null;
    }
  };

  // Check admin authorization
  const checkAdminStatus = async (currentUser: User) => {
    // Check runtime bootstrapped email
    if (currentUser.email?.toLowerCase() === 'gitdev8@gmail.com') {
      setIsAdmin(true);
      return;
    }

    try {
      const adminSnap = await getDoc(doc(db, 'admins', currentUser.uid));
      if (adminSnap.exists()) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } catch {
      setIsAdmin(false);
    }
  };

  // Manage Presence
  const updatePresence = async (isOnline: boolean) => {
    if (!auth.currentUser) return;
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        isOnline,
        lastSeen: new Date().toISOString(),
      });
    } catch {
      // Ignore background presence failures on unload
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchUserProfile(currentUser);
        await checkAdminStatus(currentUser);
        await updatePresence(true);
      } else {
        setProfile(null);
        setIsAdmin(false);
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
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const checkUsernameAvailable = async (username: string): Promise<boolean> => {
    const cleaned = username.trim().toLowerCase();
    if (!cleaned || cleaned.length < 3) return false;
    try {
      const q = query(collection(db, 'users'), where('username', '==', cleaned));
      const snap = await getDocs(q);
      if (snap.empty) return true;
      // If current user already owns this username
      if (user && snap.docs[0].id === user.uid) return true;
      return false;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'users');
      return false;
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
    const isAvail = await checkUsernameAvailable(username);
    if (!isAvail) {
      throw new Error(`Username "@${username}" is already taken. Please choose another.`);
    }

    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const currentUser = cred.user;

    await updateProfile(currentUser, {
      displayName,
      photoURL: photoURL || '',
    });

    const newProfile: UserProfile = {
      uid: currentUser.uid,
      email: currentUser.email || email,
      displayName,
      username: username.toLowerCase().trim(),
      photoURL: photoURL || '',
      bio: bio || 'Hey there! I am using Chattr.',
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

    try {
      await setDoc(doc(db, 'users', currentUser.uid), newProfile);
      setProfile(newProfile);
      await checkAdminStatus(currentUser);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
    }
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
    if (!user) throw new Error('Not authenticated');

    if (updates.username && updates.username !== profile?.username) {
      const isAvail = await checkUsernameAvailable(updates.username);
      if (!isAvail) {
        throw new Error(`Username "@${updates.username}" is already taken.`);
      }
    }

    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    try {
      await updateDoc(doc(db, 'users', user.uid), payload);
      setProfile((prev) => (prev ? { ...prev, ...payload } : null));

      if (updates.displayName || updates.photoURL !== undefined) {
        await updateProfile(user, {
          displayName: updates.displayName || user.displayName,
          photoURL: updates.photoURL ?? user.photoURL,
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isDisabled: true,
        displayName: 'Deleted User',
        bio: '',
        status: '',
      });
      await deleteUser(user);
    } catch (err) {
      console.error('Delete account error:', err);
      throw err;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user);
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
