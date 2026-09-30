/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { CallSession } from '../types';
import { sanitizeForFirestore } from './chatService';

export async function initiateCall(
  callerId: string,
  callerName: string,
  callerPhoto: string | undefined,
  receiverId: string,
  receiverName: string | undefined,
  callType: 'audio' | 'video'
): Promise<string> {
  const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const callData: CallSession = {
    id: callId,
    callerId,
    callerName: callerName || 'User',
    callerPhoto: callerPhoto || '',
    receiverId,
    receiverName: receiverName || 'Contact',
    callType,
    status: 'ringing',
    createdAt: now,
  };

  try {
    const callRef = doc(db, 'calls', callId);
    await setDoc(callRef, sanitizeForFirestore(callData), { merge: true });
    return callId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `calls/${callId}`);
    return callId;
  }
}

export function subscribeToCallSession(
  callId: string,
  onUpdate: (session: CallSession | null) => void
): () => void {
  const callRef = doc(db, 'calls', callId);
  return onSnapshot(
    callRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as CallSession);
      } else {
        onUpdate(null);
      }
    },
    () => {
      onUpdate(null);
    }
  );
}

export function subscribeToIncomingCalls(
  currentUid: string,
  onIncomingCall: (session: CallSession | null) => void
): () => void {
  const callsRef = collection(db, 'calls');
  const q = query(
    callsRef,
    where('receiverId', '==', currentUid),
    where('status', '==', 'ringing')
  );

  return onSnapshot(
    q,
    (snap) => {
      if (!snap.empty) {
        // Return most recent ringing call
        const docs = snap.docs.map((d) => d.data() as CallSession);
        docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onIncomingCall(docs[0]);
      } else {
        onIncomingCall(null);
      }
    },
    () => {
      onIncomingCall(null);
    }
  );
}

export async function acceptCall(callId: string): Promise<void> {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      status: 'accepted',
      startedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `calls/${callId}`);
  }
}

export async function rejectCall(callId: string): Promise<void> {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      status: 'rejected',
      endedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `calls/${callId}`);
  }
}

export async function endCall(callId: string): Promise<void> {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      status: 'ended',
      endedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `calls/${callId}`);
  }
}
