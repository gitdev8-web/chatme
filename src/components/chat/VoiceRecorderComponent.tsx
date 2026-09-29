/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Mic, Trash2, Send, Play, Pause } from 'lucide-react';
import { VoiceRecordingState } from '../../hooks/useVoiceRecorder';

interface VoiceRecorderComponentProps {
  recorderState: VoiceRecordingState;
  onStop: () => void;
  onCancel: () => void;
  onSend: () => void;
}

export const VoiceRecorderComponent: React.FC<VoiceRecorderComponentProps> = ({
  recorderState,
  onStop,
  onCancel,
  onSend,
}) => {
  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  return (
    <div className="flex items-center gap-3 w-full rounded-2xl border border-rose-500/40 bg-slate-900/95 px-4 py-2.5 shadow-xl backdrop-blur-md animate-in fade-in select-none">
      {/* Live Blinking Recording Indicator */}
      <div className="flex items-center gap-2">
        <span className="flex h-3 w-3 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
        </span>
        <span className="font-mono text-xs font-semibold text-rose-400">
          {formatSeconds(recorderState.recordingDuration)}
        </span>
      </div>

      {/* Simulated Live Audio Waveform Bars */}
      <div className="flex-1 flex items-center justify-center gap-1 overflow-hidden h-6">
        {[40, 70, 90, 50, 100, 30, 80, 60, 95, 45, 65, 85, 30, 75].map((h, i) => (
          <div
            key={i}
            className="w-1 rounded-full bg-rose-500/60 animate-pulse"
            style={{
              height: `${Math.max(20, (h * (recorderState.recordingDuration % 3 + 1)) % 100)}%`,
              animationDelay: `${i * 70}ms`,
            }}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onCancel}
          className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition"
          title="Cancel recording"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        <button
          onClick={() => {
            onStop();
            // allow short buffer for blob finalization then send
            setTimeout(onSend, 200);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-md hover:from-emerald-400 hover:to-teal-400 transition"
          title="Send voice note"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
