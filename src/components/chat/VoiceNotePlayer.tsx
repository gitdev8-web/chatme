/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Mic } from 'lucide-react';
import { Avatar } from '../common/Avatar';

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
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(initialDuration || 0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [hasPlayed, setHasPlayed] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const waveformBars = useRef<number[]>(generateWaveformBars(messageId, 32)).current;

  // Listen to global stop events when another audio starts playing
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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setHasPlayed(true);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // Pause other audios
      window.dispatchEvent(
        new CustomEvent('stop-other-audios', { detail: { activeId: messageId } })
      );
      audio.play().catch((err) => {
        console.warn('Playback error:', err);
      });
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const waveform = waveformRef.current;
    if (!audio || !waveform) return;

    const rect = waveform.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = pct * (totalDuration || audio.duration || 1);

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
  const effectiveDuration = totalDuration || 1;
  const progressPct = Math.min(100, (currentTime / effectiveDuration) * 100);

  return (
    <div className="flex items-center gap-2.5 py-1 min-w-[240px] max-w-[320px] select-none">
      {/* Hidden native audio element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

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
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-white shadow-md transition hover:scale-105 active:scale-95 ${
          hasPlayed ? 'bg-[#53bdeb] hover:bg-[#3ca9d6]' : 'bg-[#00a884] hover:bg-[#009374]'
        }`}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
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
            {isPlaying ? formatTime(currentTime) : formatTime(totalDuration)}
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
