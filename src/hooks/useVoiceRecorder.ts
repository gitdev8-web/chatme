/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface VoiceRecordingState {
  isRecording: boolean;
  recordingDuration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  hasPermission: boolean | null;
  error: string | null;
  audioLevels: number[];
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
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Clean up audio analyzer
  const cleanupAudioAnalyser = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const startRecording = useCallback(async () => {
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup Web Audio API analyser for live real waveform levels
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
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
            // Map 0-255 to percentage 15% - 100%
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

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

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
        const type = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        const url = URL.createObjectURL(blob);
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

      recorder.stop();
    });
  }, []);

  const stopRecording = useCallback(() => {
    cleanupAudioAnalyser();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
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
      mediaRecorderRef.current.stop();
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
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
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
