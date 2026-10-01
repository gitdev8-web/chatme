/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getAudioContext } from '../utils/audioUtils';

export interface VoiceRecordingState {
  isRecording: boolean;
  recordingDuration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  hasPermission: boolean | null;
  error: string | null;
  audioLevels: number[];
}

// Determines the best supported audio MIME type across all browsers
function detectSupportedMimeType(): { mimeType: string; cleanType: string } {
  if (typeof MediaRecorder === 'undefined') {
    return { mimeType: '', cleanType: 'audio/webm' };
  }

  // Priority order for recording
  const candidates = [
    { type: 'audio/webm;codecs=opus', clean: 'audio/webm' },
    { type: 'audio/mp4', clean: 'audio/mp4' },
    { type: 'audio/webm', clean: 'audio/webm' },
    { type: 'audio/ogg;codecs=opus', clean: 'audio/ogg' },
    { type: 'audio/wav', clean: 'audio/wav' },
    { type: 'audio/aac', clean: 'audio/aac' },
  ];

  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.type)) {
      return { mimeType: c.type, cleanType: c.clean };
    }
  }

  return { mimeType: '', cleanType: 'audio/webm' };
}

export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecordingState>({
    isRecording: false,
    recordingDuration: 0,
    audioBlob: null,
    audioUrl: null,
    hasPermission: null,
    error: null,
    audioLevels: [20, 30, 25, 40, 20, 50, 30, 45, 20, 35, 60, 25, 40, 20],
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const durationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);

  // Clean up audio analyzer
  const cleanupAudioAnalyser = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    analyserRef.current = null;
  };

  const startRecording = useCallback(async () => {
    // Revoke previous blob URL if any
    if (activeBlobUrlRef.current) {
      try {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      } catch {}
      activeBlobUrlRef.current = null;
    }

    chunksRef.current = [];
    durationRef.current = 0;
    setState((prev) => ({
      ...prev,
      audioBlob: null,
      audioUrl: null,
      error: null,
      recordingDuration: 0,
      audioLevels: [20, 30, 25, 40, 20, 50, 30, 45, 20, 35, 60, 25, 40, 20],
    }));

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setState((prev) => ({
        ...prev,
        error: 'Microphone access is not supported by your browser.',
        hasPermission: false,
      }));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Setup Web Audio API analyser for live real waveform levels
      try {
        const audioCtx = getAudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevels = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          // Pick 14 sample points for visualizer bars
          const sampledLevels: number[] = [];
          const step = Math.max(1, Math.floor(dataArray.length / 14));
          for (let i = 0; i < 14; i++) {
            const val = dataArray[i * step] || 0;
            const pct = Math.max(15, Math.min(100, Math.round((val / 255) * 100)));
            sampledLevels.push(pct);
          }
          setState((prev) => ({ ...prev, audioLevels: sampledLevels }));
          animationFrameRef.current = requestAnimationFrame(updateLevels);
        };
        animationFrameRef.current = requestAnimationFrame(updateLevels);
      } catch (audioErr) {
        console.warn('AudioContext analyser unavailable, falling back:', audioErr);
      }

      const { mimeType } = detectSupportedMimeType();

      const recorderOptions: MediaRecorderOptions = {};
      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }
      // 32kbps audio produces lightweight, crisp voice notes
      recorderOptions.audioBitsPerSecond = 32000;

      const recorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.start(100);

      setState((prev) => ({
        ...prev,
        isRecording: true,
        hasPermission: true,
        error: null,
      }));

      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setState((prev) => ({
          ...prev,
          recordingDuration: durationRef.current,
        }));
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Microphone permission denied';
      setState((prev) => ({
        ...prev,
        isRecording: false,
        hasPermission: false,
        error: msg,
      }));
    }
  }, []);

  const stopRecordingAndGetBlob = useCallback(async (): Promise<{ blob: Blob; duration: number } | null> => {
    cleanupAudioAnalyser();
    const duration = Math.max(1, durationRef.current);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      return null;
    }

    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) {
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const detected = detectSupportedMimeType();
        const rawType = recorder.mimeType || detected.mimeType || 'audio/webm';
        // Clean mime type (e.g. "audio/webm;codecs=opus" -> "audio/webm")
        const cleanType = rawType.split(';')[0].trim() || 'audio/webm';

        const blob = new Blob(chunksRef.current, { type: cleanType });
        const url = URL.createObjectURL(blob);
        activeBlobUrlRef.current = url;

        setState((prev) => ({
          ...prev,
          isRecording: false,
          audioBlob: blob,
          audioUrl: url,
        }));

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        resolve({ blob, duration });
      };

      try {
        // Request any remaining audio data before stopping
        if (recorder.state === 'recording') {
          recorder.requestData();
        }
      } catch {}

      recorder.stop();
    });
  }, []);

  const stopRecording = useCallback(() => {
    cleanupAudioAnalyser();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancelRecording = useCallback(() => {
    cleanupAudioAnalyser();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    chunksRef.current = [];
    durationRef.current = 0;
    setState({
      isRecording: false,
      recordingDuration: 0,
      audioBlob: null,
      audioUrl: null,
      hasPermission: true,
      error: null,
      audioLevels: [20, 30, 25, 40, 20, 50, 30, 45, 20, 35, 60, 25, 40, 20],
    });
  }, []);

  useEffect(() => {
    return () => {
      cleanupAudioAnalyser();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (activeBlobUrlRef.current) {
        try {
          URL.revokeObjectURL(activeBlobUrlRef.current);
        } catch {}
      }
    };
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    stopRecordingAndGetBlob,
    cancelRecording,
  };
}
