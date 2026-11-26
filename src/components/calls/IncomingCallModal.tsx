/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Phone, PhoneOff, Video, Shield } from 'lucide-react';
import { CallSession } from '../../types';
import { Avatar } from '../common/Avatar';
import { sound } from '../../hooks/useSound';
import { acceptCall, rejectCall } from '../../services/callService';
import { useToast } from '../common/Toast';

interface IncomingCallModalProps {
  call: CallSession | null;
  onAccept: (call: CallSession) => void;
  onDecline: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  call,
  onAccept,
  onDecline,
}) => {
  const { showToast } = useToast();
  const [responding, setResponding] = useState<'accept' | 'decline' | null>(null);

  useEffect(() => {
    setResponding(null);
    if (call && call.status === 'ringing') {
      sound.startRingtone();
    } else {
      sound.stopRingtone();
    }

    return () => {
      sound.stopRingtone();
    };
  }, [call?.id, call?.status]);

  if (!call || call.status !== 'ringing') return null;

  const handleAccept = async () => {
    if (responding) return;
    setResponding('accept');
    sound.stopRingtone();
    const ok = await acceptCall(call.id);
    if (ok) {
      onAccept(call);
    } else {
      showToast('Call ended before connecting', 'info');
      onDecline();
    }
    setResponding(null);
  };

  const handleDecline = async () => {
    if (responding) return;
    setResponding('decline');
    sound.stopRingtone();
    await rejectCall(call.id);
    onDecline();
    setResponding(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in select-none">
      <div className="relative flex flex-col items-center w-full max-w-sm rounded-3xl border border-white/10 bg-[#0e161b] p-6 text-center shadow-2xl text-white">
        <div className="flex items-center gap-1.5 text-xs text-[#25d366] font-medium mb-6">
          <Shield className="h-3.5 w-3.5" />
          <span>
            {call.provider === 'google-meet'
              ? 'Google Meet Video Call'
              : `DEV CHAT ${call.callType === 'video' ? 'Video' : 'Voice'} Call`}
          </span>
        </div>

        <div className="relative mb-5 flex items-center justify-center">
          <span className="absolute h-24 w-24 rounded-full bg-[#00a884]/20 animate-pulse" />
          <Avatar
            src={call.callerPhoto}
            name={call.callerName}
            size="xl"
            className="ring-2 ring-[#00a884] shadow-xl"
          />
        </div>

        <h3 className="text-lg font-semibold text-white mt-1">
          {call.callerName}
        </h3>
        <p className="text-xs text-white/65 mt-1">
          {call.provider === 'google-meet'
            ? `Incoming Google Meet session${call.meetCode ? ` · ${call.meetCode}` : '...'}`
            : `Incoming ${call.callType === 'video' ? 'video' : 'voice'} call...`}
        </p>

        <div className="flex items-center justify-center gap-14 mt-8 w-full">
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={handleDecline}
              disabled={!!responding}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ea4335] text-white shadow-lg hover:bg-[#d93025] active:scale-95 transition cursor-pointer disabled:opacity-60"
              title="Decline"
              aria-label="Decline call"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
            <span className="text-xs font-medium text-white/70">Decline</span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={handleAccept}
              disabled={!!responding}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-[#0b141a] shadow-lg hover:bg-[#20bd5a] active:scale-95 transition cursor-pointer disabled:opacity-60"
              title="Accept"
              aria-label="Accept call"
            >
              {call.callType === 'video' ? (
                <Video className="h-6 w-6" />
              ) : (
                <Phone className="h-6 w-6" />
              )}
            </button>
            <span className="text-xs font-medium text-[#25d366]">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
};
