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
  AlertCircle,
} from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { sound } from '../../hooks/useSound';
import {
  endCall,
  markCallMissed,
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

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 4,
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
  const myRole: 'caller' | 'receiver' = isIncoming ? 'receiver' : 'caller';

  const [callType, setCallType] = useState<'audio' | 'video'>(initialCallType);
  const [callStatus, setCallStatus] = useState<
    'ringing' | 'connecting' | 'connected' | 'declined' | 'missed' | 'ended'
  >(isIncoming ? 'connecting' : 'ringing');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialCallType === 'video');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [micAvailable, setMicAvailable] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState<
    'idle' | 'connecting' | 'connected' | 'reconnecting'
  >('idle');

  const [localStreamState, setLocalStreamState] = useState<MediaStream | null>(null);
  const [remoteStreamState, setRemoteStreamState] = useState<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const missedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isClosingRef = useRef(false);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const processedIceRef = useRef<Set<string>>(new Set());
  const pendingIceRef = useRef<string[]>([]);
  const pendingOfferRef = useRef<{ type: string; sdp: string; by?: 'caller' | 'receiver' } | null>(null);
  const pendingAnswerRef = useRef<{ type: string; sdp: string; by?: 'caller' | 'receiver' } | null>(null);
  const lastHandledOfferSdpRef = useRef<string | null>(null);
  const lastHandledAnswerSdpRef = useRef<string | null>(null);
  const lastSentOfferSdpRef = useRef<string | null>(null);

  useEffect(() => {
    setCallType(initialCallType);
    setIsVideoEnabled(initialCallType === 'video');
  }, [initialCallType, callSessionId]);

  const clearTimers = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (missedTimeoutRef.current) {
      clearTimeout(missedTimeoutRef.current);
      missedTimeoutRef.current = null;
    }
  };

  const cleanupStreamsAndPeer = () => {
    clearTimers();
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;

    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.oniceconnectionstatechange = null;
      peerConnectionRef.current.onconnectionstatechange = null;
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
    setLocalStreamState(null);
    setRemoteStreamState(null);
    setHasRemoteVideo(false);
    setLocalAudioLevel(0);
    setConnectionQuality('idle');

    processedIceRef.current.clear();
    pendingIceRef.current = [];
    pendingOfferRef.current = null;
    pendingAnswerRef.current = null;
    lastHandledOfferSdpRef.current = null;
    lastHandledAnswerSdpRef.current = null;
    lastSentOfferSdpRef.current = null;
  };

  // Attach local video stream whenever video UI mounts/updates
  useEffect(() => {
    if (localVideoRef.current && localStreamState) {
      if (localVideoRef.current.srcObject !== localStreamState) {
        localVideoRef.current.srcObject = localStreamState;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStreamState, isVideoEnabled, isMinimized]);

  // Attach remote video & audio streams whenever UI mounts/updates
  useEffect(() => {
    if (remoteAudioRef.current && remoteStreamState) {
      if (remoteAudioRef.current.srcObject !== remoteStreamState) {
        remoteAudioRef.current.srcObject = remoteStreamState;
      }
      remoteAudioRef.current.muted = !isSpeakerOn;
      remoteAudioRef.current.play().catch(() => {});
    }
    if (remoteVideoRef.current && remoteStreamState) {
      if (remoteVideoRef.current.srcObject !== remoteStreamState) {
        remoteVideoRef.current.srcObject = remoteStreamState;
      }
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStreamState, isVideoEnabled, hasRemoteVideo, isMinimized, isSpeakerOn]);

  const flushPendingIce = async (pc: RTCPeerConnection) => {
    if (!pc.remoteDescription || pc.signalingState === 'closed') return;
    while (pendingIceRef.current.length > 0) {
      const candStr = pendingIceRef.current.shift();
      if (candStr && !processedIceRef.current.has(candStr)) {
        processedIceRef.current.add(candStr);
        try {
          const candidateInit = JSON.parse(candStr);
          await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
        } catch {
          // Ignore stale candidates
        }
      }
    }
  };

  const applyRemoteOfferAndAnswer = async (
    pc: RTCPeerConnection,
    offer: { type: string; sdp: string; by?: 'caller' | 'receiver' }
  ) => {
    if (!offer?.sdp || pc.signalingState === 'closed') return;
    if (offer.sdp === lastHandledOfferSdpRef.current || offer.sdp === lastSentOfferSdpRef.current) return;
    if (offer.by && offer.by === myRole) return;

    try {
      lastHandledOfferSdpRef.current = offer.sdp;
      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: offer.type as RTCSdpType, sdp: offer.sdp })
      );
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (pc.localDescription && callSessionId) {
        await setCallAnswer(callSessionId, {
          type: pc.localDescription.type,
          sdp: pc.localDescription.sdp,
          by: myRole,
        });
      }
      await flushPendingIce(pc);
    } catch (err) {
      console.warn('Remote offer handling warning:', err);
    }
  };

  const applyRemoteAnswer = async (
    pc: RTCPeerConnection,
    answer: { type: string; sdp: string; by?: 'caller' | 'receiver' }
  ) => {
    if (!answer?.sdp || pc.signalingState === 'closed') return;
    if (answer.sdp === lastHandledAnswerSdpRef.current) return;
    if (answer.by && answer.by === myRole) return;
    if (pc.signalingState !== 'have-local-offer') {
      pendingAnswerRef.current = answer;
      return;
    }

    try {
      lastHandledAnswerSdpRef.current = answer.sdp;
      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: answer.type as RTCSdpType, sdp: answer.sdp })
      );
      await flushPendingIce(pc);
    } catch (err) {
      console.warn('Remote answer handling warning:', err);
    }
  };

  const sendRenegotiationOffer = async (pc: RTCPeerConnection) => {
    if (!callSessionId || pc.signalingState !== 'stable') return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (pc.localDescription) {
        lastSentOfferSdpRef.current = pc.localDescription.sdp;
        await setCallOffer(callSessionId, {
          type: pc.localDescription.type,
          sdp: pc.localDescription.sdp,
          by: myRole,
        });
      }
    } catch (err) {
      console.warn('Renegotiation offer error:', err);
    }
  };

  const syncRemoteVideoPresence = (stream: MediaStream) => {
    const hasLiveVideo = stream
      .getVideoTracks()
      .some((track) => track.readyState === 'live' && track.enabled && !track.muted);
    setHasRemoteVideo(hasLiveVideo);
  };

  // Initialize Media Stream & WebRTC PeerConnection once per call session open
  useEffect(() => {
    if (!isOpen) {
      cleanupStreamsAndPeer();
      isClosingRef.current = false;
      setCallStatus(isIncoming ? 'connecting' : 'ringing');
      setCallDuration(0);
      setIsMuted(false);
      setIsMinimized(false);
      setMicAvailable(true);
      sound.stopRingtone();
      return;
    }

    let isMounted = true;
    isClosingRef.current = false;
    setCallStatus(isIncoming ? 'connecting' : 'ringing');
    setCallDuration(0);

    const initPeerConnection = (stream: MediaStream) => {
      try {
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionRef.current = pc;

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        const accumulatedRemoteStream = new MediaStream();
        remoteStreamRef.current = accumulatedRemoteStream;
        setRemoteStreamState(accumulatedRemoteStream);

        pc.ontrack = (event) => {
          const targetStream = event.streams?.[0] || accumulatedRemoteStream;
          if (!event.streams?.[0]) {
            accumulatedRemoteStream.addTrack(event.track);
          } else {
            remoteStreamRef.current = targetStream;
            setRemoteStreamState(targetStream);
          }

          if (event.track.kind === 'video') {
            syncRemoteVideoPresence(targetStream);
            event.track.onmute = () => syncRemoteVideoPresence(targetStream);
            event.track.onunmute = () => syncRemoteVideoPresence(targetStream);
            event.track.onended = () => syncRemoteVideoPresence(targetStream);
          }

          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = targetStream;
            remoteAudioRef.current.muted = !isSpeakerOn;
            remoteAudioRef.current.play().catch(() => {});
          }
          if (remoteVideoRef.current && event.track.kind === 'video') {
            remoteVideoRef.current.srcObject = targetStream;
            remoteVideoRef.current.play().catch(() => {});
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate && callSessionId) {
            addCallIceCandidate(callSessionId, event.candidate.toJSON(), myRole);
          }
        };

        pc.oniceconnectionstatechange = () => {
          const state = pc.iceConnectionState;
          if (state === 'checking') {
            setConnectionQuality('connecting');
          } else if (state === 'connected' || state === 'completed') {
            setConnectionQuality('connected');
            setCallStatus((prev) =>
              prev === 'declined' || prev === 'ended' || prev === 'missed' ? prev : 'connected'
            );
          } else if (state === 'disconnected') {
            setConnectionQuality('reconnecting');
          } else if (state === 'failed') {
            setConnectionQuality('reconnecting');
            try {
              pc.restartIce();
            } catch {
              // Ignore if restartIce unsupported
            }
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') {
            setConnectionQuality('connected');
            setCallStatus((prev) =>
              prev === 'declined' || prev === 'ended' || prev === 'missed' ? prev : 'connected'
            );
          }
        };

        if (!isIncoming && callSessionId) {
          pc.createOffer()
            .then((offer) => pc.setLocalDescription(offer))
            .then(() => {
              if (pc.localDescription && callSessionId) {
                lastSentOfferSdpRef.current = pc.localDescription.sdp;
                return setCallOffer(callSessionId, {
                  type: pc.localDescription.type,
                  sdp: pc.localDescription.sdp,
                  by: 'caller',
                });
              }
            })
            .catch((err) => console.warn('Error creating initial offer:', err));
        }

        if (isIncoming && pendingOfferRef.current) {
          const queuedOffer = pendingOfferRef.current;
          pendingOfferRef.current = null;
          void applyRemoteOfferAndAnswer(pc, queuedOffer);
        }

        if (!isIncoming && pendingAnswerRef.current) {
          const queuedAnswer = pendingAnswerRef.current;
          pendingAnswerRef.current = null;
          void applyRemoteAnswer(pc, queuedAnswer);
        }
      } catch (err) {
        console.warn('WebRTC peer initialization error:', err);
      }
    };

    const setupMedia = async () => {
      let stream: MediaStream | null = null;
      let micOk = true;
      const wantsVideo = initialCallType === 'video';

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: wantsVideo ? { facingMode: 'user' } : false,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch {
        if (wantsVideo) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
              },
              video: false,
            });
            setIsVideoEnabled(false);
          } catch {
            micOk = false;
          }
        } else {
          micOk = false;
        }
      }

      if (!stream) {
        micOk = false;
        try {
          const AudioCtx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          gain.gain.value = 0; // silent fallback track
          const dst = ctx.createMediaStreamDestination();
          osc.connect(gain);
          gain.connect(dst);
          osc.start();
          stream = dst.stream;
        } catch (ctxErr) {
          console.warn('AudioContext destination fallback error:', ctxErr);
        }
      }

      if (!isMounted) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }

      setMicAvailable(micOk);

      if (stream) {
        localStreamRef.current = stream;
        setLocalStreamState(stream);

        if (micOk && stream.getAudioTracks().length > 0) {
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
          } catch {
            // Audio analyser unavailable
          }
        }

        initPeerConnection(stream);
      }
    };

    void setupMedia();

    return () => {
      isMounted = false;
      cleanupStreamsAndPeer();
    };
  }, [isOpen, callSessionId, isIncoming, initialCallType]);

  // Real-time call signaling listener & 45s unanswered timeout
  useEffect(() => {
    if (!isOpen) return;

    if (!isIncoming) {
      sound.startRingtone();
    }

    if (callSessionId) {
      // Unanswered outgoing call timeout (45s)
      if (!isIncoming) {
        missedTimeoutRef.current = setTimeout(async () => {
          if (isClosingRef.current) return;
          isClosingRef.current = true;
          sound.stopRingtone();
          sound.playCallEnd();
          setCallStatus('missed');
          await markCallMissed(callSessionId);
          cleanupStreamsAndPeer();
          closeTimeoutRef.current = setTimeout(() => onCloseRef.current(), 1600);
        }, 45000);
      }

      const unsub = subscribeToCallSession(callSessionId, async (session) => {
        if (!session) return;

        const pc = peerConnectionRef.current;

        if (session.status === 'accepted') {
          if (missedTimeoutRef.current) {
            clearTimeout(missedTimeoutRef.current);
            missedTimeoutRef.current = null;
          }
          sound.stopRingtone();
          setCallStatus((prev) => (prev === 'connected' ? 'connected' : 'connected'));
        } else if (session.status === 'rejected') {
          if (isClosingRef.current) return;
          isClosingRef.current = true;
          clearTimers();
          sound.stopRingtone();
          sound.playCallEnd();
          setCallStatus('declined');
          cleanupStreamsAndPeer();
          closeTimeoutRef.current = setTimeout(() => onCloseRef.current(), 1600);
          return;
        } else if (session.status === 'missed') {
          if (isClosingRef.current) return;
          isClosingRef.current = true;
          clearTimers();
          sound.stopRingtone();
          sound.playCallEnd();
          setCallStatus('missed');
          cleanupStreamsAndPeer();
          closeTimeoutRef.current = setTimeout(() => onCloseRef.current(), 1500);
          return;
        } else if (session.status === 'ended') {
          if (isClosingRef.current) return;
          isClosingRef.current = true;
          clearTimers();
          sound.stopRingtone();
          sound.playCallEnd();
          setCallStatus('ended');
          cleanupStreamsAndPeer();
          closeTimeoutRef.current = setTimeout(() => onCloseRef.current(), 1200);
          return;
        }

        // Handle incoming SDP offer (initial for callee, or mid-call video renegotiation from either peer)
        if (session.offer && session.offer.sdp) {
          const offerFromOther = session.offer.by
            ? session.offer.by !== myRole
            : isIncoming;
          if (
            offerFromOther &&
            session.offer.sdp !== lastHandledOfferSdpRef.current &&
            session.offer.sdp !== lastSentOfferSdpRef.current
          ) {
            if (pc && pc.signalingState !== 'closed') {
              await applyRemoteOfferAndAnswer(pc, session.offer);
            } else {
              pendingOfferRef.current = session.offer;
            }
          }
        }

        // Handle incoming SDP answer
        if (session.answer && session.answer.sdp) {
          const answerFromOther = session.answer.by
            ? session.answer.by !== myRole
            : !isIncoming;
          if (answerFromOther && session.answer.sdp !== lastHandledAnswerSdpRef.current) {
            if (pc && pc.signalingState === 'have-local-offer') {
              await applyRemoteAnswer(pc, session.answer);
            } else {
              pendingAnswerRef.current = session.answer;
            }
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
                } catch {
                  // Ignore transient candidates
                }
              } else if (!pendingIceRef.current.includes(candStr)) {
                pendingIceRef.current.push(candStr);
              }
            }
          }
        }
      });

      return () => {
        unsub();
        clearTimers();
        sound.stopRingtone();
      };
    }

    return () => {
      clearTimers();
      sound.stopRingtone();
    };
  }, [isOpen, callSessionId, isIncoming, myRole]);

  // Call duration counter
  useEffect(() => {
    if (callStatus !== 'connected' || !isOpen) return;

    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [callStatus, isOpen]);

  const unlockRemoteAudio = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !isSpeakerOn;
      remoteAudioRef.current.play().catch(() => {});
    }
  };

  const toggleMute = () => {
    unlockRemoteAudio();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }
  };

  const toggleVideo = async () => {
    unlockRemoteAudio();
    const nextVideo = !isVideoEnabled;
    const stream = localStreamRef.current;
    const pc = peerConnectionRef.current;

    if (!nextVideo) {
      setIsVideoEnabled(false);
      if (stream) {
        stream.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      return;
    }

    setCallType('video');
    setIsVideoEnabled(true);

    if (stream && stream.getVideoTracks().length > 0) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = true;
      });
      return;
    }

    // Upgrade active audio-only call with a live camera track & renegotiate cleanly
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
      });
      const newVideoTrack = videoStream.getVideoTracks()[0];
      if (!newVideoTrack) return;

      if (stream) {
        stream.addTrack(newVideoTrack);
        setLocalStreamState(new MediaStream(stream.getTracks()));
        if (pc && pc.signalingState !== 'closed') {
          pc.addTrack(newVideoTrack, stream);
          await sendRenegotiationOffer(pc);
        }
      }
    } catch {
      setIsVideoEnabled(false);
    }
  };

  const flipCamera = async () => {
    if (!isVideoEnabled) return;
    const nextFacing: 'user' | 'environment' = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacing },
      });
      const newTrack = newStream.getVideoTracks()[0];
      if (!newTrack) return;

      const stream = localStreamRef.current;
      const pc = peerConnectionRef.current;

      if (stream) {
        const oldTracks = stream.getVideoTracks();
        oldTracks.forEach((t) => {
          t.stop();
          stream.removeTrack(t);
        });
        stream.addTrack(newTrack);
        setLocalStreamState(new MediaStream(stream.getTracks()));
      }

      if (pc && pc.signalingState !== 'closed') {
        const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(newTrack);
        }
      }
    } catch {
      // Device may only have a single camera
    }
  };

  const toggleSpeaker = () => {
    const nextSpeaker = !isSpeakerOn;
    setIsSpeakerOn(nextSpeaker);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !nextSpeaker;
      if (nextSpeaker) {
        remoteAudioRef.current.play().catch(() => {});
      }
    }
  };

  const handleHangup = async () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    clearTimers();
    sound.stopRingtone();
    sound.playCallEnd();
    setCallStatus('ended');
    if (callSessionId) {
      await endCall(callSessionId);
    }
    cleanupStreamsAndPeer();
    closeTimeoutRef.current = setTimeout(() => onCloseRef.current(), 450);
  };

  if (!isOpen) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const statusLabel =
    callStatus === 'ringing'
      ? 'Ringing...'
      : callStatus === 'connecting'
      ? 'Connecting...'
      : callStatus === 'declined'
      ? 'Call Declined'
      : callStatus === 'missed'
      ? 'No Answer'
      : callStatus === 'ended'
      ? 'Call Ended'
      : connectionQuality === 'reconnecting'
      ? `Reconnecting... · ${formatDuration(callDuration)}`
      : formatDuration(callDuration);

  return (
    <div
      onClick={unlockRemoteAudio}
      className={`fixed z-50 transition-all duration-200 select-none ${
        isMinimized
          ? 'bottom-20 right-3 sm:right-4 w-72 h-44 rounded-2xl shadow-2xl overflow-hidden border border-white/15 bg-[#0e161b]'
          : 'inset-0 flex items-center justify-center bg-black/90 backdrop-blur-xl sm:p-4'
      }`}
    >
      {/* Dedicated remote audio element for clean audio playback across voice/video/PiP */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      <div
        className={`relative flex flex-col w-full h-full overflow-hidden bg-[#0e161b] text-[#e9edef] shadow-2xl ${
          isMinimized ? '' : 'sm:max-w-xl sm:max-h-[680px] sm:rounded-3xl sm:border sm:border-white/10'
        }`}
      >
        {/* Top Header Bar */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent safe-top">
          <div className="flex items-center gap-2 min-w-0">
            <Shield className="h-3.5 w-3.5 text-[#25d366] flex-shrink-0" />
            <span className="text-xs font-medium text-white/90 truncate">
              DEV CHAT {callType === 'video' ? 'Video' : 'Voice'}
            </span>
            {isMinimized && (
              <span className="text-[11px] font-mono text-white/75 tabular-nums ml-1">
                · {statusLabel}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isVideoEnabled && !isMinimized && (
              <button
                type="button"
                onClick={flipCamera}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white/85 hover:bg-white/15 hover:text-white transition"
                title="Switch camera"
                aria-label="Switch camera"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white/85 hover:bg-white/15 hover:text-white transition"
              title={isMinimized ? 'Expand call' : 'Minimize call'}
              aria-label={isMinimized ? 'Expand call' : 'Minimize call'}
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Call Main Stage */}
        <div className="relative flex-1 flex flex-col items-center justify-center p-6 text-center overflow-hidden bg-[#0b141a]">
          {isVideoEnabled ? (
            <div className="absolute inset-0 w-full h-full bg-[#0e161b]">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${hasRemoteVideo ? 'block' : 'hidden'}`}
              />

              {!hasRemoteVideo && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#131e24] to-[#0b141a] px-4">
                  <Avatar src={contactPhoto} name={contactName} size="xl" className="shadow-2xl mb-4" />
                  <p className="text-base font-semibold text-white">{contactName}</p>
                  <p className="mt-1 text-xs text-white/65 font-mono tabular-nums">{statusLabel}</p>
                </div>
              )}

              {/* Local PiP Video Preview */}
              {!isMinimized && (
                <div className="absolute top-16 right-4 w-24 h-36 sm:w-28 sm:h-40 rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-black z-20">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                  />
                  <span className="absolute bottom-1.5 left-1.5 text-[10px] font-semibold text-white/90 bg-black/55 px-1.5 py-0.5 rounded">
                    You
                  </span>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/55 pointer-events-none" />
            </div>
          ) : (
            <div className="flex flex-col items-center relative z-10">
              <div className="relative mb-5">
                <span
                  className="absolute -inset-5 rounded-full bg-[#00a884]/20 transition-all duration-100"
                  style={{
                    transform: `scale(${1 + localAudioLevel * 0.004})`,
                    opacity: 0.25 + localAudioLevel * 0.007,
                  }}
                />
                <Avatar
                  src={contactPhoto}
                  name={contactName}
                  size={isMinimized ? 'lg' : 'xl'}
                  className="ring-2 ring-[#00a884] shadow-2xl relative"
                />
              </div>

              <h3 className={`${isMinimized ? 'text-base' : 'text-2xl'} font-semibold text-white tracking-tight`}>
                {contactName}
              </h3>

              <p className="mt-1.5 text-sm text-white/70 font-mono tabular-nums">
                {statusLabel}
              </p>

              {!isMinimized && callStatus === 'connected' && (
                <div className="flex items-center gap-1 mt-4 h-5">
                  {[30, 60, 90, 45, 80, 55, 75, 40, 85].map((h, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full bg-[#00a884] transition-all duration-75"
                      style={{
                        height: `${Math.max(20, Math.min(100, (h * (localAudioLevel + 20)) / 60))}%`,
                        opacity: 0.55 + localAudioLevel / 200,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {!isMinimized && !micAvailable && (
            <div className="absolute top-16 left-4 z-20 flex items-center gap-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-[11px] text-amber-200 backdrop-blur-md">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Mic unavailable</span>
            </div>
          )}

          {isVideoEnabled && !isMinimized && hasRemoteVideo && (
            <div className="absolute bottom-24 left-0 right-0 z-20 flex flex-col items-center text-center pointer-events-none">
              <p className="text-xs font-mono text-white/90 bg-black/55 px-3.5 py-1 rounded-full backdrop-blur-md tabular-nums">
                {contactName} · {statusLabel}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Control Actions */}
        {!isMinimized ? (
          <div className="relative z-30 flex items-center justify-center gap-4 sm:gap-5 px-5 py-5 bg-gradient-to-t from-black/95 via-black/75 to-transparent safe-bottom">
            <button
              type="button"
              onClick={toggleMute}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition shadow-lg active:scale-95 ${
                isMuted
                  ? 'bg-rose-500/25 text-rose-300 ring-1 ring-rose-400/60'
                  : 'bg-[#202c33] text-white hover:bg-[#374248]'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>

            <button
              type="button"
              onClick={toggleVideo}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition shadow-lg active:scale-95 ${
                isVideoEnabled
                  ? 'bg-[#00a884] text-[#0b141a]'
                  : 'bg-[#202c33] text-white hover:bg-[#374248]'
              }`}
              title={isVideoEnabled ? 'Turn camera off' : 'Turn camera on'}
              aria-label={isVideoEnabled ? 'Turn camera off' : 'Turn camera on'}
            >
              {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>

            <button
              type="button"
              onClick={toggleSpeaker}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition shadow-lg active:scale-95 ${
                !isSpeakerOn
                  ? 'bg-rose-500/25 text-rose-300'
                  : 'bg-[#202c33] text-white hover:bg-[#374248]'
              }`}
              title={isSpeakerOn ? 'Mute speaker' : 'Unmute speaker'}
              aria-label={isSpeakerOn ? 'Mute speaker' : 'Unmute speaker'}
            >
              {isSpeakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </button>

            <button
              type="button"
              onClick={handleHangup}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ea4335] text-white shadow-xl hover:bg-[#d93025] active:scale-95 transition"
              title="End call"
              aria-label="End call"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
          </div>
        ) : (
          <div className="relative z-30 flex items-center justify-center gap-3 py-2 px-3 bg-black/75 border-t border-white/10">
            <button
              type="button"
              onClick={toggleMute}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                isMuted ? 'bg-rose-500/25 text-rose-300' : 'bg-white/10 text-white'
              }`}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={handleHangup}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ea4335] text-white"
              aria-label="End call"
            >
              <PhoneOff className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
