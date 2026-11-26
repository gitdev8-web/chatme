/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
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
  callType: 'audio' | 'video',
  options?: {
    provider?: 'webrtc' | 'google-meet';
    meetUri?: string;
    meetCode?: string;
    meetSpaceName?: string;
  }
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
    provider: options?.provider || 'webrtc',
    meetUri: options?.meetUri,
    meetCode: options?.meetCode,
    meetSpaceName: options?.meetSpaceName,
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
        onUpdate({ ...(snap.data() as CallSession), id: snap.id });
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
        // Return most recent ringing call created within 2 minutes
        const docs = snap.docs
          .map((d) => ({ ...d.data(), id: d.id } as CallSession))
          .filter((c) => {
            if (c.status !== 'ringing' || c.callerId === currentUid) return false;
            const created = new Date(c.createdAt || 0).getTime();
            return Math.abs(now - created) < 120000;
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

export async function acceptCall(callId: string): Promise<boolean> {
  try {
    const callRef = doc(db, 'calls', callId);
    const snap = await getDoc(callRef);
    if (!snap.exists()) return false;
    const data = snap.data() as CallSession;
    if (data.status !== 'ringing') return false;

    await updateDoc(callRef, {
      status: 'accepted',
      startedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `calls/${callId}`);
    return false;
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

export async function markCallMissed(callId: string): Promise<void> {
  try {
    const callRef = doc(db, 'calls', callId);
    const snap = await getDoc(callRef);
    if (!snap.exists()) return;
    const data = snap.data() as CallSession;
    if (data.status !== 'ringing') return;
    await updateDoc(callRef, {
      status: 'missed',
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
  offer: { type: string; sdp: string; by?: 'caller' | 'receiver' }
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
  answer: { type: string; sdp: string; by?: 'caller' | 'receiver' }
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

export function subscribeToUserCallHistory(
  currentUid: string,
  onUpdate: (calls: CallSession[]) => void
): () => void {
  if (!currentUid) {
    onUpdate([]);
    return () => {};
  }

  const callsRef = collection(db, 'calls');
  const qOutgoing = query(callsRef, where('callerId', '==', currentUid));
  const qIncoming = query(callsRef, where('receiverId', '==', currentUid));

  let outgoingCalls: CallSession[] = [];
  let incomingCalls: CallSession[] = [];

  const emitMerged = () => {
    const map = new Map<string, CallSession>();
    [...outgoingCalls, ...incomingCalls].forEach((c) => {
      if (c && c.id) map.set(c.id, c);
    });
    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    onUpdate(merged);
  };

  const unsubOut = onSnapshot(
    qOutgoing,
    (snap) => {
      outgoingCalls = snap.docs.map((d) => ({ ...(d.data() as CallSession), id: d.id }));
      emitMerged();
    },
    () => {
      outgoingCalls = [];
      emitMerged();
    }
  );

  const unsubIn = onSnapshot(
    qIncoming,
    (snap) => {
      incomingCalls = snap.docs.map((d) => ({ ...(d.data() as CallSession), id: d.id }));
      emitMerged();
    },
    () => {
      incomingCalls = [];
      emitMerged();
    }
  );

  return () => {
    unsubOut();
    unsubIn();
  };
}

export function getCallDurationSeconds(call: CallSession): number | null {
  if (!call.startedAt || !call.endedAt) return null;
  const diff = new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime();
  return diff > 0 ? Math.round(diff / 1000) : null;
}
