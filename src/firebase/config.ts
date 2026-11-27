/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase, Database } from 'firebase/database';
import { getAnalytics, isSupported } from 'firebase/analytics';

const defaultFirebaseConfig = {
  apiKey: 'AIzaSyARiXf6XajidKdHp1ei-iJFO8pOi1Vkhzg',
  authDomain: 'devchat-2e73d.firebaseapp.com',
  databaseURL: 'https://devchat-2e73d-default-rtdb.firebaseio.com',
  projectId: 'devchat-2e73d',
  storageBucket: 'devchat-2e73d.firebasestorage.app',
  messagingSenderId: '450855347917',
  appId: '1:450855347917:web:ae43274b874ce98116ab84',
  measurementId: 'G-34FJGSPXK3',
  firestoreDatabaseId: '(default)',
};

// Support both packaged config and optional environment variables
const resolvedConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL || defaultFirebaseConfig.databaseURL,
  firestoreDatabaseId:
    import.meta.env.VITE_FIREBASE_DATABASE_ID || defaultFirebaseConfig.firestoreDatabaseId || '(default)',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || defaultFirebaseConfig.measurementId,
};

export const app = !getApps().length ? initializeApp(resolvedConfig) : getApps()[0];

// Initialize Firestore with default or specific database ID
export const db =
  resolvedConfig.firestoreDatabaseId && resolvedConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, resolvedConfig.firestoreDatabaseId)
    : getFirestore(app);

export const auth = getAuth(app);
export const storage = getStorage(app);

// Initialize Firebase Realtime Database with fallback
export const rtdb: Database | null = (() => {
  try {
    if (resolvedConfig.databaseURL) {
      return getDatabase(app, resolvedConfig.databaseURL);
    }
    return getDatabase(app);
  } catch (err) {
    console.warn('Realtime database initialization fallback:', err);
    try {
      return getDatabase(app);
    } catch {
      return null;
    }
  }
})();

// Optional Analytics initialization if supported in current environment
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported && resolvedConfig.measurementId) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {
      // Analytics not supported in environment (e.g. iframe restrictions)
    });
}
