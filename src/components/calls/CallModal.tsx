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

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactName: string;
  contactPhoto?: string;
  callType: 'audio' | 'video';
}

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  onClose,
  contactName,
  contactPhoto,
  callType: initialCallType,
}) => {
  const [callType, setCallType] = useState<'audio' | 'video'>(initialCallType);
  const [callStatus, setCallStatus] = useState<'ringing' | 'connected'>('ringing');
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

  // Handle ringing simulation transition to connected
  useEffect(() => {
    if (!isOpen) {
      setCallStatus('ringing');
      setCallDuration(0);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      return;
    }

    const connectTimeout = setTimeout(() => {
      setCallStatus('connected');
    }, 2800);

    return () => clearTimeout(connectTimeout);
  }, [isOpen]);

  // Call duration counter
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
              className="rounded-full bg-black/40 p-2 text-white/80 hover:bg-black/60 hover:text-white transition"
              title={isMinimized ? 'Expand' : 'Minimize'}
            >
              {isMinimized ? (
                <Maximize2 className="h-4 w-4" />
              ) : (
                <Minimize2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Video Mode or Audio Visualizer Center */}
        <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#182229] to-[#0b141a]">
          {isVideoEnabled ? (
            <div className="relative h-full w-full bg-black flex items-center justify-center">
              {/* Remote simulation video */}
              <div className="flex flex-col items-center justify-center">
                <Avatar
                  src={contactPhoto}
                  name={contactName}
                  size="2xl"
                  className="ring-4 ring-[#25d366]/40"
                />
                <h3 className="text-base font-bold text-white mt-3">{contactName}</h3>
                <p className="text-xs text-[#25d366]">Video Connected</p>
              </div>

              {/* Local picture-in-picture stream */}
              <div className="absolute bottom-24 right-4 h-36 w-24 sm:h-44 sm:w-32 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-900">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover -scale-x-100"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-6 z-10">
              {/* Radar rings when ringing */}
              <div className="relative mb-6">
                {callStatus === 'ringing' && (
                  <>
                    <div className="absolute -inset-4 rounded-full bg-[#25d366]/20 animate-ping pointer-events-none" />
                    <div className="absolute -inset-8 rounded-full bg-[#25d366]/10 animate-pulse pointer-events-none" />
                  </>
                )}
                <div className="p-1 rounded-full bg-gradient-to-tr from-[#25d366] to-[#00a884] ring-4 ring-[#25d366]/30 shadow-2xl">
                  <Avatar
                    src={contactPhoto}
                    name={contactName}
                    size="2xl"
                  />
                </div>
              </div>

              <h2 className="text-lg font-bold text-white tracking-wide">{contactName}</h2>
              <p className="text-xs font-medium text-[#8696a0] mt-1">
                {callStatus === 'ringing'
                  ? 'Ringing...'
                  : `${callType === 'video' ? 'Video' : 'Voice'} Call • ${formatDuration(
                      callDuration
                    )}`}
              </p>
            </div>
          )}
        </div>

        {/* WhatsApp Call Controls Footer */}
        <div className="z-30 bg-[#202c33]/90 backdrop-blur-md p-4 flex items-center justify-around border-t border-[#222d34]">
          {/* Mute Mic */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
              isMuted
                ? 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/50'
                : 'bg-[#2a3942] text-white hover:bg-[#32434d]'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          {/* Toggle Video */}
          <button
            onClick={toggleVideo}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
              !isVideoEnabled
                ? 'bg-[#2a3942] text-[#8696a0] hover:text-white'
                : 'bg-[#00a884] text-white shadow-lg shadow-[#00a884]/30'
            }`}
            title={isVideoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {isVideoEnabled ? (
              <Video className="h-5 w-5" />
            ) : (
              <VideoOff className="h-5 w-5" />
            )}
          </button>

          {/* Speakerphone */}
          <button
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
              !isSpeakerOn
                ? 'bg-[#2a3942] text-[#8696a0]'
                : 'bg-[#2a3942] text-white hover:bg-[#32434d]'
            }`}
            title="Speaker"
          >
            {isSpeakerOn ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
          </button>

          {/* End Call Button */}
          <button
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ea4335] text-white shadow-xl hover:bg-[#d93025] hover:scale-105 active:scale-95 transition-all"
            title="End Call"
          >
            <PhoneOff className="h-5 w-5 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};
