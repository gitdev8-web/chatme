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
  arrayUnion,
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
  if (!currentUid) return () => {};

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
        const now = Date.now();
        // Return most recent ringing call created within 5 minutes (prevents clock skew issues)
        const docs = snap.docs
          .map((d) => ({ ...d.data(), id: d.id } as CallSession))
          .filter((c) => {
            if (c.status !== 'ringing') return false;
            const created = new Date(c.createdAt || 0).getTime();
            // Allow up to 5 minutes tolerance or future clock skew up to 2 minutes
            return Math.abs(now - created) < 300000;
          });

        if (docs.length > 0) {
          docs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          onIncomingCall(docs[0]);
          return;
        }
      }
      onIncomingCall(null);
    },
    (err) => {
      console.warn('Incoming call listener note:', err);
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

export async function setCallOffer(
  callId: string,
  offer: { type: string; sdp: string }
): Promise<void> {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      offer,
    });
  } catch (err) {
    console.warn('Failed to set call offer:', err);
  }
}

export async function setCallAnswer(
  callId: string,
  answer: { type: string; sdp: string }
): Promise<void> {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      answer,
    });
  } catch (err) {
    console.warn('Failed to set call answer:', err);
  }
}

export async function addCallIceCandidate(
  callId: string,
  candidate: RTCIceCandidateInit,
  role: 'caller' | 'receiver'
): Promise<void> {
  try {
    const callRef = doc(db, 'calls', callId);
    const field = role === 'caller' ? 'callerIce' : 'receiverIce';
    await updateDoc(callRef, {
      [field]: arrayUnion(JSON.stringify(candidate)),
    });
  } catch (err) {
    console.warn('Failed to add ICE candidate:', err);
  }
}

