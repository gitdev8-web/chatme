/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Mic, Trash2, Send, Loader2 } from 'lucide-react';
import { VoiceRecordingState } from '../../hooks/useVoiceRecorder';

interface VoiceRecorderComponentProps {
  recorderState: VoiceRecordingState;
  onCancel: () => void;
  onStopAndSend: () => Promise<void>;
}

export const VoiceRecorderComponent: React.FC<VoiceRecorderComponentProps> = ({
  recorderState,
  onCancel,
  onStopAndSend,
}) => {
  const [isSending, setIsSending] = useState(false);

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  const handleSend = async () => {
    if (isSending) return;
    setIsSending(true);
    try {
      await onStopAndSend();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex items-center gap-3 w-full rounded-2xl border border-rose-500/40 bg-[#111b21] px-4 py-2.5 shadow-xl backdrop-blur-md animate-in fade-in select-none">
      {/* Live Blinking Recording Indicator */}
      <div className="flex items-center gap-2">
        <span className="flex h-3 w-3 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
        </span>
        <span className="font-mono text-xs font-semibold text-rose-400">
          {formatSeconds(recorderState.recordingDuration)}
        </span>
      </div>

      {/* Live Voice Audio Waveform Bars that bounce with real mic volume */}
      <div className="flex-1 flex items-center justify-center gap-1 overflow-hidden h-7">
        {(recorderState.audioLevels && recorderState.audioLevels.length > 0
          ? recorderState.audioLevels
          : [25, 45, 70, 30, 80, 50, 90, 40, 60, 85, 30, 75, 40, 60]
        ).map((lvl, i) => (
          <div
            key={i}
            className="w-1 rounded-full bg-rose-500 transition-all duration-75"
            style={{
              height: `${Math.max(18, Math.min(100, lvl))}%`,
              opacity: 0.6 + (lvl / 250),
            }}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onCancel}
          disabled={isSending}
          className="rounded-xl p-2 text-[#8696a0] hover:bg-[#202c33] hover:text-rose-400 transition"
          title="Cancel recording"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        <button
          onClick={handleSend}
          disabled={isSending}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00a884] text-white shadow-md hover:bg-[#009374] active:scale-95 transition disabled:opacity-50"
          title="Send voice note"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
};
