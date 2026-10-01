/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Mic, Loader2, AlertCircle } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import {
  parseAudioUrlToBlob,
  decodeToUniversalWav,
  getAudioContext,
} from '../../utils/audioUtils';

interface VoiceNotePlayerProps {
  messageId: string;
  audioUrl: string;
  duration?: number;
  isSelf: boolean;
  senderName?: string;
  senderPhoto?: string;
}

const SPEED_OPTIONS = [1, 1.5, 2];

// Generate consistent pseudo-random waveform bar heights for an audio message based on its ID
function generateWaveformBars(seed: string, count = 30): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    const val = Math.abs(Math.sin(hash + i * 1.7) * 80) + 20;
    bars.push(Math.round(val));
  }
  return bars;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  messageId,
  audioUrl,
  duration: initialDuration,
  isSelf,
  senderName,
  senderPhoto,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(initialDuration || 0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState<string>('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const fallbackAttemptedRef = useRef<boolean>(false);
  const waveformBars = useRef<number[]>(generateWaveformBars(messageId, 32)).current;

  // Clean up Object URLs on unmount or URL change
  const cleanupObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      try {
        URL.revokeObjectURL(objectUrlRef.current);
      } catch {}
      objectUrlRef.current = null;
    }
  }, []);

  // Prepare playable audio source
  useEffect(() => {
    fallbackAttemptedRef.current = false;
    setHasError(false);

    if (!audioUrl) {
      setResolvedSrc('');
      return;
    }

    if (audioUrl.startsWith('data:')) {
      const blob = parseAudioUrlToBlob(audioUrl);
      if (blob) {
        cleanupObjectUrl();
        const objUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objUrl;
        setResolvedSrc(objUrl);
      } else {
        setResolvedSrc(audioUrl);
      }
    } else {
      setResolvedSrc(audioUrl);
    }

    return () => {
      cleanupObjectUrl();
    };
  }, [audioUrl, cleanupObjectUrl]);

  // Handle fallback using Web Audio API conversion to standard WAV
  const tryFallbackDecoding = useCallback(async (): Promise<boolean> => {
    if (fallbackAttemptedRef.current) return false;
    fallbackAttemptedRef.current = true;
    setIsLoading(true);

    try {
      let audioBlob: Blob | null = null;
      if (audioUrl.startsWith('data:')) {
        audioBlob = parseAudioUrlToBlob(audioUrl);
      } else {
        const resp = await fetch(resolvedSrc || audioUrl);
        audioBlob = await resp.blob();
      }

      if (!audioBlob) {
        setIsLoading(false);
        setHasError(true);
        return false;
      }

      const wavBlob = await decodeToUniversalWav(audioBlob);
      if (wavBlob) {
        cleanupObjectUrl();
        const wavUrl = URL.createObjectURL(wavBlob);
        objectUrlRef.current = wavUrl;
        setResolvedSrc(wavUrl);

        if (audioRef.current) {
          audioRef.current.src = wavUrl;
          audioRef.current.load();
        }
        setIsLoading(false);
        return true;
      }
    } catch (err) {
      console.warn('Fallback audio decoding failed:', err);
    }

    setIsLoading(false);
    setHasError(true);
    return false;
  }, [audioUrl, resolvedSrc, cleanupObjectUrl]);

  // Listen to global stop events when another voice note starts playing
  useEffect(() => {
    const handleGlobalPause = (e: CustomEvent<{ activeId: string }>) => {
      if (e.detail?.activeId !== messageId && audioRef.current && isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };

    window.addEventListener('stop-other-audios' as any, handleGlobalPause as any);
    return () => {
      window.removeEventListener('stop-other-audios' as any, handleGlobalPause as any);
    };
  }, [messageId, isPlaying]);

  // Audio element event bindings
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        setTotalDuration(Math.round(audio.duration));
      } else if (initialDuration && initialDuration > 0) {
        setTotalDuration(initialDuration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        setTotalDuration(Math.round(audio.duration));
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setHasPlayed(true);
      setHasError(false);
    };

    const handleError = async () => {
      console.warn('Audio tag encountered error, attempting universal WAV fallback...');
      if (!fallbackAttemptedRef.current) {
        const recovered = await tryFallbackDecoding();
        if (recovered && audioRef.current) {
          try {
            await audioRef.current.play();
          } catch {}
        }
      } else {
        setIsPlaying(false);
        setHasError(true);
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('error', handleError);
    };
  }, [initialDuration, tryFallbackDecoding]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    // Ensure AudioContext is ready for any web audio operations
    getAudioContext();

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // Pause other audios
      window.dispatchEvent(
        new CustomEvent('stop-other-audios', { detail: { activeId: messageId } })
      );

      try {
        await audio.play();
      } catch (err) {
        console.warn('Direct audio.play() failed, triggering universal decoder fallback:', err);
        const recovered = await tryFallbackDecoding();
        if (recovered && audioRef.current) {
          try {
            await audioRef.current.play();
          } catch (playbackErr) {
            console.error('Final playback attempt failed:', playbackErr);
            setHasError(true);
          }
        } else {
          setHasError(true);
        }
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const waveform = waveformRef.current;
    if (!audio || !waveform) return;

    const rect = waveform.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const maxDur =
      audio.duration && isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : totalDuration || initialDuration || 1;
    const targetTime = pct * maxDur;

    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIdx = (speedIndex + 1) % SPEED_OPTIONS.length;
    setSpeedIndex(nextIdx);
    if (audioRef.current) {
      audioRef.current.playbackRate = SPEED_OPTIONS[nextIdx];
    }
  };

  const formatTime = (seconds: number) => {
    const s = Math.round(seconds);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Progress percentage
  const effectiveDuration = totalDuration || initialDuration || 1;
  const progressPct = Math.min(100, (currentTime / effectiveDuration) * 100);

  return (
    <div className="flex items-center gap-2.5 py-1 min-w-[240px] max-w-[320px] select-none">
      {/* Native audio element */}
      {resolvedSrc && (
        <audio
          ref={audioRef}
          src={resolvedSrc}
          preload="metadata"
          className="hidden"
        />
      )}

      {/* Avatar with Mic Indicator */}
      <div className="relative flex-shrink-0">
        <Avatar
          src={senderPhoto}
          name={senderName || 'Voice'}
          size="sm"
          className="shadow-sm"
        />
        <div
          className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-white ring-2 ring-[#202c33] ${
            hasPlayed ? 'bg-[#53bdeb]' : 'bg-[#00a884]'
          }`}
          title={hasPlayed ? 'Listened' : 'Unplayed'}
        >
          <Mic className="h-2.5 w-2.5" />
        </div>
      </div>

      {/* Circular Play / Pause Button */}
      <button
        onClick={togglePlay}
        disabled={isLoading}
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-white shadow-md transition hover:scale-105 active:scale-95 disabled:opacity-75 ${
          hasError
            ? 'bg-rose-600 hover:bg-rose-700'
            : hasPlayed
            ? 'bg-[#53bdeb] hover:bg-[#3ca9d6]'
            : 'bg-[#00a884] hover:bg-[#009374]'
        }`}
        title={hasError ? 'Retry playback' : isPlaying ? 'Pause' : 'Play'}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : hasError ? (
          <AlertCircle className="h-4 w-4" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="h-4 w-4 fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform Scrubber & Metadata */}
      <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0">
        {/* Clickable Waveform Bars */}
        <div
          ref={waveformRef}
          onClick={handleSeek}
          className="relative flex items-center gap-[2px] h-7 cursor-pointer group py-1"
          title="Click to seek"
        >
          {waveformBars.map((height, i) => {
            const barPct = (i / (waveformBars.length - 1)) * 100;
            const isPlayedBar = barPct <= progressPct;

            return (
              <div
                key={i}
                className="flex-1 rounded-full transition-colors duration-100"
                style={{
                  height: `${height}%`,
                  backgroundColor: isPlayedBar
                    ? hasPlayed
                      ? '#53bdeb'
                      : isSelf
                      ? '#00a884'
                      : '#25d366'
                    : isSelf
                    ? 'rgba(255, 255, 255, 0.35)'
                    : 'rgba(134, 150, 160, 0.4)',
                }}
              />
            );
          })}
        </div>

        {/* Bottom Time & Speed Bar */}
        <div className="flex items-center justify-between text-[11px] font-mono leading-none">
          <span className="text-[#8696a0]">
            {isPlaying ? formatTime(currentTime) : formatTime(totalDuration || initialDuration || 0)}
          </span>

          {/* Speed Toggle Pill */}
          <button
            onClick={cycleSpeed}
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold transition ${
              speedIndex > 0
                ? 'bg-[#00a884]/20 text-[#00a884]'
                : 'text-[#8696a0] hover:text-[#e9edef]'
            }`}
            title="Playback speed"
          >
            {SPEED_OPTIONS[speedIndex]}x
          </button>
        </div>
      </div>
    </div>
  );
};
