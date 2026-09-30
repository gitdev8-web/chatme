/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Shield,
  RotateCw,
} from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { sound } from '../../hooks/useSound';
import { endCall, subscribeToCallSession } from '../../services/callService';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactName: string;
  contactPhoto?: string;
  callType: 'audio' | 'video';
  callSessionId?: string;
  isIncoming?: boolean;
}

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  onClose,
  contactName,
  contactPhoto,
  callType: initialCallType,
  callSessionId,
  isIncoming = false,
}) => {
  const [callType, setCallType] = useState<'audio' | 'video'>(initialCallType);
  const [callStatus, setCallStatus] = useState<'ringing' | 'connected' | 'declined' | 'ended'>(
    isIncoming ? 'connected' : 'ringing'
  );
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialCallType === 'video');
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setCallType(initialCallType);
    setIsVideoEnabled(initialCallType === 'video');
  }, [initialCallType]);

  // Real-time call signaling subscription
  useEffect(() => {
    if (!isOpen) {
      setCallStatus(isIncoming ? 'connected' : 'ringing');
      setCallDuration(0);
      sound.stopRingtone();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      return;
    }

    if (!isIncoming) {
      sound.startRingtone();
    }

    if (callSessionId) {
      const unsub = subscribeToCallSession(callSessionId, (session) => {
        if (!session) return;
        if (session.status === 'accepted') {
          sound.stopRingtone();
          setCallStatus('connected');
        } else if (session.status === 'rejected') {
          sound.stopRingtone();
          sound.playCallEnd();
          setCallStatus('declined');
          setTimeout(() => onClose(), 1800);
        } else if (session.status === 'ended') {
          sound.stopRingtone();
          sound.playCallEnd();
          setCallStatus('ended');
          setTimeout(() => onClose(), 1200);
        }
      });
      return () => {
        unsub();
        sound.stopRingtone();
      };
    } else {
      // Local fallback simulation if no remote session ID
      const connectTimeout = setTimeout(() => {
        sound.stopRingtone();
        setCallStatus('connected');
      }, 3000);
      return () => {
        clearTimeout(connectTimeout);
        sound.stopRingtone();
      };
    }
  }, [isOpen, callSessionId, isIncoming]);

  // Call duration timer
  useEffect(() => {
    if (callStatus !== 'connected' || !isOpen) return;

    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [callStatus, isOpen]);

  // Request camera if video call
  useEffect(() => {
    if (!isOpen || !isVideoEnabled) {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      return;
    }

    let isMounted = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.warn('Camera access unavailable or declined:', err);
      });

    return () => {
      isMounted = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    };
  }, [isOpen, isVideoEnabled]);

  if (!isOpen) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
    if (!isVideoEnabled) {
      setCallType('video');
    }
  };

  const handleHangup = async () => {
    sound.stopRingtone();
    sound.playCallEnd();
    setCallStatus('ended');
    if (callSessionId) {
      await endCall(callSessionId);
    }
    setTimeout(() => onClose(), 600);
  };

  return (
    <div
      className={`fixed z-50 transition-all duration-300 select-none ${
        isMinimized
          ? 'bottom-20 right-4 w-72 h-44 rounded-2xl shadow-2xl overflow-hidden border border-[#222d34] bg-[#111b21]'
          : 'inset-0 flex items-center justify-center bg-black/90 backdrop-blur-xl p-2 sm:p-4'
      }`}
    >
      <div
        className={`relative flex flex-col w-full h-full overflow-hidden bg-[#111b21] shadow-2xl ${
          isMinimized
            ? ''
            : 'max-w-lg max-h-[640px] rounded-3xl border border-[#222d34]'
        }`}
      >
        {/* Top Header Bar */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-[#25d366] backdrop-blur-md">
              <Shield className="h-3 w-3" />
              <span>End-to-end encrypted</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="rounded-full p-2 text-[#8696a0] hover:bg-white/10 hover:text-white transition backdrop-blur-md"
              title={isMinimized ? 'Maximize' : 'Minimize'}
            >
              {isMinimized ? (
                <Maximize2 className="h-4 w-4" />
              ) : (
                <Minimize2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Call Body */}
        <div className="relative flex-1 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
          {/* Video Preview */}
          {isVideoEnabled ? (
            <div className="absolute inset-0 w-full h-full bg-[#111b21]">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />

              {/* Small PiP Contact Avatar in Corner */}
              <div className="absolute top-16 right-4 flex items-center gap-2 rounded-2xl bg-black/50 p-2 backdrop-blur-md border border-white/10">
                <Avatar
                  src={contactPhoto}
                  name={contactName}
                  size="sm"
                />
                <span className="text-xs font-medium text-white pr-1">
                  {contactName}
                </span>
              </div>
            </div>
          ) : (
            /* Audio Call Ambient Background */
            <div className="flex flex-col items-center relative z-10">
              <div className="relative mb-6">
                {callStatus === 'ringing' && (
                  <>
                    <span className="absolute -inset-4 rounded-full bg-[#00a884]/20 animate-ping" />
                    <span className="absolute -inset-2 rounded-full bg-[#00a884]/30 animate-pulse" />
                  </>
                )}
                <Avatar
                  src={contactPhoto}
                  name={contactName}
                  size="xl"
                  className="ring-4 ring-[#00a884]/40 shadow-2xl relative"
                />
              </div>

              <h3 className="text-2xl font-light text-[#e9edef] tracking-wide">
                {contactName}
              </h3>

              <p className="mt-2 text-sm text-[#8696a0] font-mono">
                {callStatus === 'ringing'
                  ? 'Ringing...'
                  : callStatus === 'declined'
                  ? 'Call Declined'
                  : callStatus === 'ended'
                  ? 'Call Ended'
                  : formatDuration(callDuration)}
              </p>
            </div>
          )}

          {/* Video Call Name & Status Overlay */}
          {isVideoEnabled && (
            <div className="absolute bottom-28 left-0 right-0 z-20 flex flex-col items-center text-center">
              <p className="text-xs font-mono text-white/90 bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
                {callStatus === 'ringing'
                  ? 'Connecting...'
                  : callStatus === 'declined'
                  ? 'Call Declined'
                  : callStatus === 'ended'
                  ? 'Call Ended'
                  : formatDuration(callDuration)}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Control Actions (Authentic WhatsApp Call Dock) */}
        <div className="relative z-30 flex items-center justify-center gap-4 p-6 bg-gradient-to-t from-black/90 to-transparent">
          {/* Mute Mic */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition shadow-lg ${
              isMuted
                ? 'bg-red-500/20 text-red-400 ring-2 ring-red-500/50'
                : 'bg-[#202c33] text-[#e9edef] hover:bg-[#374248]'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          {/* Toggle Video Camera */}
          <button
            onClick={toggleVideo}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition shadow-lg ${
              isVideoEnabled
                ? 'bg-[#00a884] text-white shadow-[#00a884]/20'
                : 'bg-[#202c33] text-[#e9edef] hover:bg-[#374248]'
            }`}
            title={isVideoEnabled ? 'Turn camera off' : 'Turn camera on'}
          >
            {isVideoEnabled ? (
              <Video className="h-5 w-5" />
            ) : (
              <VideoOff className="h-5 w-5" />
            )}
          </button>

          {/* Toggle Speaker */}
          <button
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition shadow-lg ${
              !isSpeakerOn
                ? 'bg-red-500/20 text-red-400'
                : 'bg-[#202c33] text-[#e9edef] hover:bg-[#374248]'
            }`}
            title={isSpeakerOn ? 'Mute speaker' : 'Unmute speaker'}
          >
            {isSpeakerOn ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
          </button>

          {/* End Call (Red Hangup Button) */}
          <button
            onClick={handleHangup}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ea4335] text-white shadow-xl hover:bg-[#d93025] hover:scale-105 active:scale-95 transition"
            title="End call"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
