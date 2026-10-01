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
  Phone,
} from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { sound } from '../../hooks/useSound';
import {
  endCall,
  subscribeToCallSession,
  setCallOffer,
  setCallAnswer,
  addCallIceCandidate,
} from '../../services/callService';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactName: string;
  contactPhoto?: string;
  callType: 'audio' | 'video';
  callSessionId?: string;
  isIncoming?: boolean;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

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
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [localAudioLevel, setLocalAudioLevel] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const processedIceRef = useRef<Set<string>>(new Set());
  const pendingIceRef = useRef<string[]>([]);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingAnswerRef = useRef<RTCSessionDescriptionInit | null>(null);
  const offerSetRef = useRef<boolean>(false);
  const answerSetRef = useRef<boolean>(false);

  useEffect(() => {
    setCallType(initialCallType);
    setIsVideoEnabled(initialCallType === 'video');
  }, [initialCallType]);

  // Clean up WebRTC peer and local streams
  const cleanupStreamsAndPeer = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }
    processedIceRef.current.clear();
    pendingIceRef.current = [];
    pendingOfferRef.current = null;
    pendingAnswerRef.current = null;
    offerSetRef.current = false;
    answerSetRef.current = false;
  };

  // Initialize Media Stream & Web Audio Analyser
  useEffect(() => {
    if (!isOpen) {
      cleanupStreamsAndPeer();
      setCallStatus(isIncoming ? 'connected' : 'ringing');
      setCallDuration(0);
      sound.stopRingtone();
      return;
    }

    let isMounted = true;

    const setupMedia = async () => {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: callType === 'video' || isVideoEnabled,
          audio: true,
        });
      } catch (videoErr) {
        // Fallback to audio-only if video failed
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (audioErr) {
          console.warn('Microphone/camera access restricted, using simulated call connection:', audioErr);
          // Dummy silent audio stream so peer connection and signaling succeed even without physical mic
          try {
            const AudioCtx =
              window.AudioContext ||
              (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const dst = ctx.createMediaStreamDestination();
            osc.connect(dst);
            osc.start();
            stream = dst.stream;
          } catch (ctxErr) {
            console.warn('AudioContext destination fallback error:', ctxErr);
          }
        }
      }

      if (!isMounted) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }

      if (stream) {
        localStreamRef.current = stream;
        if (localVideoRef.current && stream.getVideoTracks().length > 0) {
          localVideoRef.current.srcObject = stream;
        }

        // Live mic level analyser
        try {
          const AudioCtx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkVolume = () => {
            if (!analyserRef.current || !isMounted) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setLocalAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
            animFrameRef.current = requestAnimationFrame(checkVolume);
          };
          animFrameRef.current = requestAnimationFrame(checkVolume);
        } catch (e) {
          console.warn('Audio analyser unavailable:', e);
        }

        // Initialize PeerConnection
        initPeerConnection(stream);
      }
    };

    setupMedia();

    return () => {
      isMounted = false;
      cleanupStreamsAndPeer();
    };
  }, [isOpen, callType]);

  // Flush queued ICE candidates once remote description is set
  const flushPendingIce = async (pc: RTCPeerConnection) => {
    if (!pc.remoteDescription) return;
    while (pendingIceRef.current.length > 0) {
      const candStr = pendingIceRef.current.shift();
      if (candStr && !processedIceRef.current.has(candStr)) {
        processedIceRef.current.add(candStr);
        try {
          const candidateInit = JSON.parse(candStr);
          await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
        } catch (e) {
          // Ignore transient candidates
        }
      }
    }
  };

  // WebRTC Peer Connection setup
  const initPeerConnection = (stream: MediaStream) => {
    try {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Add local tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle remote incoming tracks
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        remoteStreamRef.current = remoteStream;

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          setHasRemoteVideo(true);
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.play().catch(() => {});
        }
      };

      // Handle local ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && callSessionId) {
          const role = isIncoming ? 'receiver' : 'caller';
          addCallIceCandidate(callSessionId, event.candidate.toJSON(), role);
        }
      };

      // If caller, create SDP offer
      if (!isIncoming && callSessionId) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            if (pc.localDescription && callSessionId) {
              setCallOffer(callSessionId, {
                type: pc.localDescription.type,
                sdp: pc.localDescription.sdp,
              });
              offerSetRef.current = true;
            }
          })
          .catch((err) => console.warn('Error creating offer:', err));
      }

      // If callee already received offer while media was initializing:
      if (isIncoming && pendingOfferRef.current && !offerSetRef.current) {
        offerSetRef.current = true;
        const offer = pendingOfferRef.current;
        pc.setRemoteDescription(new RTCSessionDescription(offer))
          .then(() => pc.createAnswer())
          .then((answer) => pc.setLocalDescription(answer))
          .then(() => {
            if (pc.localDescription && callSessionId) {
              setCallAnswer(callSessionId, {
                type: pc.localDescription.type,
                sdp: pc.localDescription.sdp,
              });
              answerSetRef.current = true;
            }
            return flushPendingIce(pc);
          })
          .catch((err) => console.warn('Deferred offer handling notice:', err));
      }

      // If caller already received answer while media was initializing:
      if (!isIncoming && pendingAnswerRef.current && !answerSetRef.current) {
        answerSetRef.current = true;
        const answer = pendingAnswerRef.current;
        pc.setRemoteDescription(new RTCSessionDescription(answer))
          .then(() => flushPendingIce(pc))
          .catch((err) => console.warn('Deferred answer handling notice:', err));
      }
    } catch (err) {
      console.warn('WebRTC peer initialization error:', err);
    }
  };

  // Real-time call signaling listener
  useEffect(() => {
    if (!isOpen) return;

    if (!isIncoming) {
      sound.startRingtone();
    }

    if (callSessionId) {
      const unsub = subscribeToCallSession(callSessionId, async (session) => {
        if (!session) return;

        const pc = peerConnectionRef.current;

        // Transition call statuses
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

        // Callee receives offer: set remote desc and send answer
        if (isIncoming && session.offer && !offerSetRef.current) {
          if (pc && pc.signalingState !== 'closed') {
            try {
              offerSetRef.current = true;
              await pc.setRemoteDescription(new RTCSessionDescription(session.offer as RTCSessionDescriptionInit));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              if (pc.localDescription) {
                await setCallAnswer(callSessionId, {
                  type: pc.localDescription.type,
                  sdp: pc.localDescription.sdp,
                });
                answerSetRef.current = true;
              }
              await flushPendingIce(pc);
            } catch (err) {
              console.warn('Callee setRemoteDescription / answer warning:', err);
            }
          } else {
            // Queue pending offer to apply as soon as pc finishes initializing
            pendingOfferRef.current = session.offer as RTCSessionDescriptionInit;
          }
        }

        // Caller receives answer: set remote desc
        if (!isIncoming && session.answer && !answerSetRef.current) {
          if (pc && pc.signalingState === 'have-local-offer') {
            try {
              answerSetRef.current = true;
              await pc.setRemoteDescription(new RTCSessionDescription(session.answer as RTCSessionDescriptionInit));
              await flushPendingIce(pc);
            } catch (err) {
              console.warn('Caller setRemoteDescription warning:', err);
            }
          } else {
            // Queue pending answer to apply as soon as pc finishes initializing
            pendingAnswerRef.current = session.answer as RTCSessionDescriptionInit;
          }
        }

        // Process remote ICE candidates
        const remoteCandidates = isIncoming ? session.callerIce : session.receiverIce;
        if (remoteCandidates && Array.isArray(remoteCandidates)) {
          for (const candStr of remoteCandidates) {
            if (!processedIceRef.current.has(candStr)) {
              if (pc && pc.remoteDescription && pc.signalingState !== 'closed') {
                processedIceRef.current.add(candStr);
                try {
                  const candidateInit = JSON.parse(candStr);
                  await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
                } catch (e) {
                  // Ignore transient candidates before remote description
                }
              } else {
                if (!pendingIceRef.current.includes(candStr)) {
                  pendingIceRef.current.push(candStr);
                }
              }
            }
          }
        }
      });

      return () => {
        unsub();
        sound.stopRingtone();
      };
    } else {
      // Waiting for session to initiate
      const timeout = setTimeout(() => {
        sound.stopRingtone();
        sound.playCallEnd();
        setCallStatus('declined');
        setTimeout(() => onClose(), 1500);
      }, 45000);
      return () => {
        clearTimeout(timeout);
        sound.stopRingtone();
      };
    }
  }, [isOpen, callSessionId, isIncoming, onClose]);

  // Call duration counter
  useEffect(() => {
    if (callStatus !== 'connected' || !isOpen) return;

    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [callStatus, isOpen]);

  // Audio track mute toggle
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }
  };

  // Video camera toggle
  const toggleVideo = () => {
    const nextVideo = !isVideoEnabled;
    setIsVideoEnabled(nextVideo);
    if (nextVideo) setCallType('video');
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = nextVideo;
      });
    }
  };

  // Speaker toggle
  const toggleSpeaker = () => {
    const nextSpeaker = !isSpeakerOn;
    setIsSpeakerOn(nextSpeaker);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !nextSpeaker;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !nextSpeaker;
    }
  };

  const handleHangup = async () => {
    sound.stopRingtone();
    sound.playCallEnd();
    setCallStatus('ended');
    if (callSessionId) {
      await endCall(callSessionId);
    }
    cleanupStreamsAndPeer();
    setTimeout(() => onClose(), 600);
  };

  if (!isOpen) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`fixed z-50 transition-all duration-300 select-none ${
        isMinimized
          ? 'bottom-20 right-4 w-76 h-48 rounded-2xl shadow-2xl overflow-hidden border border-[#222d34] bg-[#111b21]'
          : 'inset-0 flex items-center justify-center bg-black/90 backdrop-blur-xl p-2 sm:p-4'
      }`}
    >
      {/* Hidden remote audio tag for voice / video calls */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      <div
        className={`relative flex flex-col w-full h-full overflow-hidden bg-[#111b21] shadow-2xl ${
          isMinimized ? '' : 'max-w-xl max-h-[660px] rounded-3xl border border-[#222d34]'
        }`}
      >
        {/* Top Header Bar */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-[11px] font-medium text-[#25d366] backdrop-blur-md border border-white/5">
              <Shield className="h-3 w-3" />
              <span>DEV CHAT {callType === 'video' ? 'Video' : 'Voice'} Call</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="rounded-full p-2 text-[#8696a0] hover:bg-white/10 hover:text-white transition backdrop-blur-md"
              title={isMinimized ? 'Maximize' : 'Minimize'}
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Call Main Stage */}
        <div className="relative flex-1 flex flex-col items-center justify-center p-6 text-center overflow-hidden bg-[#0b141a]">
          {/* Video Call View */}
          {isVideoEnabled ? (
            <div className="absolute inset-0 w-full h-full bg-[#111b21]">
              {/* Remote Video Stream if received */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${hasRemoteVideo ? 'block' : 'hidden'}`}
              />

              {/* If waiting for remote video, show caller background */}
              {!hasRemoteVideo && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#111b21] to-[#0b141a]">
                  <Avatar src={contactPhoto} name={contactName} size="xl" className="shadow-2xl mb-4" />
                  <p className="text-sm font-light text-[#8696a0]">Connecting video stream...</p>
                </div>
              )}

              {/* Local PiP Video Preview */}
              <div className="absolute top-16 right-4 w-28 h-40 rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-black z-20">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <span className="absolute bottom-1 left-2 text-[9px] font-semibold text-white/80 bg-black/50 px-1 rounded">
                  You
                </span>
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />
            </div>
          ) : (
            /* Voice Call Ambient View */
            <div className="flex flex-col items-center relative z-10">
              <div className="relative mb-6">
                {/* Real-time Voice Volume Pulse Rings */}
                <span
                  className="absolute -inset-6 rounded-full bg-[#00a884]/20 transition-all duration-100"
                  style={{
                    transform: `scale(${1 + localAudioLevel * 0.005})`,
                    opacity: 0.3 + localAudioLevel * 0.007,
                  }}
                />
                <span
                  className="absolute -inset-3 rounded-full bg-[#00a884]/30 transition-all duration-75"
                  style={{
                    transform: `scale(${1 + localAudioLevel * 0.003})`,
                    opacity: 0.4 + localAudioLevel * 0.006,
                  }}
                />
                <Avatar
                  src={contactPhoto}
                  name={contactName}
                  size="xl"
                  className="ring-4 ring-[#00a884] shadow-2xl relative"
                />
              </div>

              <h3 className="text-2xl font-light text-[#e9edef] tracking-wide">
                {contactName}
              </h3>

              {/* Status or Duration */}
              <p className="mt-2 text-sm text-[#8696a0] font-mono">
                {callStatus === 'ringing'
                  ? 'Ringing...'
                  : callStatus === 'declined'
                  ? 'Call Declined'
                  : callStatus === 'ended'
                  ? 'Call Ended'
                  : formatDuration(callDuration)}
              </p>

              {/* Real-time audio waveform equalizer for Voice calls */}
              {callStatus === 'connected' && (
                <div className="flex items-center gap-1 mt-4 h-6">
                  {[30, 60, 90, 45, 80, 55, 75, 40, 85, 50, 70].map((h, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full bg-[#00a884] transition-all duration-75"
                      style={{
                        height: `${Math.max(20, Math.min(100, (h * (localAudioLevel + 20)) / 60))}%`,
                        opacity: 0.6 + localAudioLevel / 200,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Video Call Name & Status Overlay */}
          {isVideoEnabled && (
            <div className="absolute bottom-28 left-0 right-0 z-20 flex flex-col items-center text-center">
              <p className="text-xs font-mono text-white/90 bg-black/60 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg">
                {callStatus === 'ringing'
                  ? 'Connecting video...'
                  : callStatus === 'declined'
                  ? 'Call Declined'
                  : callStatus === 'ended'
                  ? 'Call Ended'
                  : `${contactName} • ${formatDuration(callDuration)}`}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Control Actions (Call Dock) */}
        <div className="relative z-30 flex items-center justify-center gap-4 p-5 bg-gradient-to-t from-black/95 to-transparent">
          {/* Mute Mic */}
          <button
            onClick={toggleMute}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition shadow-lg ${
              isMuted
                ? 'bg-rose-500/20 text-rose-400 ring-2 ring-rose-500/50'
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
            {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </button>

          {/* Toggle Speaker */}
          <button
            onClick={toggleSpeaker}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition shadow-lg ${
              !isSpeakerOn
                ? 'bg-rose-500/20 text-rose-400'
                : 'bg-[#202c33] text-[#e9edef] hover:bg-[#374248]'
            }`}
            title={isSpeakerOn ? 'Mute speaker' : 'Unmute speaker'}
          >
            {isSpeakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
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
