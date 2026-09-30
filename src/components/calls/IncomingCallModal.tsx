/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Phone, PhoneOff, Video, Shield } from 'lucide-react';
import { CallSession } from '../../types';
import { Avatar } from '../common/Avatar';
import { sound } from '../../hooks/useSound';
import { acceptCall, rejectCall } from '../../services/callService';

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
  useEffect(() => {
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
    sound.stopRingtone();
    await acceptCall(call.id);
    onAccept(call);
  };

  const handleDecline = async () => {
    sound.stopRingtone();
    await rejectCall(call.id);
    onDecline();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in select-none">
      <div className="relative flex flex-col items-center w-full max-w-sm rounded-3xl border border-[#222d34] bg-[#111b21] p-6 text-center shadow-2xl">
        {/* End-to-end Encrypted Pill */}
        <div className="flex items-center gap-1 rounded-full bg-[#202c33] px-3 py-1 text-[11px] text-[#25d366] font-medium mb-6">
          <Shield className="h-3 w-3" />
          <span>DEV CHAT {call.callType === 'video' ? 'Video' : 'Voice'} Call</span>
        </div>

        {/* Pulsing Avatar */}
        <div className="relative mb-4 flex items-center justify-center">
          <span className="absolute h-28 w-28 rounded-full bg-[#00a884]/20 animate-ping" />
          <span className="absolute h-24 w-24 rounded-full bg-[#00a884]/30" />
          <Avatar
            src={call.callerPhoto}
            name={call.callerName}
            size="xl"
            className="ring-4 ring-[#00a884] shadow-2xl"
          />
        </div>

        {/* Caller Info */}
        <h3 className="text-xl font-medium text-[#e9edef] mt-2">
          {call.callerName}
        </h3>
        <p className="text-xs text-[#8696a0] mt-1">
          Incoming {call.callType === 'video' ? 'video' : 'voice'} call...
        </p>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-12 mt-8 w-full">
          {/* Decline Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={handleDecline}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ea4335] text-white shadow-xl hover:bg-[#d93025] hover:scale-105 active:scale-95 transition"
              title="Decline"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
            <span className="text-[11px] font-medium text-[#8696a0]">Decline</span>
          </div>

          {/* Accept Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={handleAccept}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-xl hover:bg-[#20bd5a] hover:scale-105 active:scale-95 transition animate-bounce"
              title="Accept"
            >
              {call.callType === 'video' ? (
                <Video className="h-6 w-6" />
              ) : (
                <Phone className="h-6 w-6" />
              )}
            </button>
            <span className="text-[11px] font-medium text-[#25d366]">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
};
