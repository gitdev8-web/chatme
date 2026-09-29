/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface MediaViewerModalProps {
  mediaUrl: string | null;
  fileName?: string;
  onClose: () => void;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  mediaUrl,
  fileName = 'Media',
  onClose,
}) => {
  const [scale, setScale] = useState(1);

  if (!mediaUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = mediaUrl;
    link.download = fileName || 'download';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in select-none">
      {/* Top toolbar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-10">
        <span className="text-xs font-medium text-slate-300 truncate max-w-xs">
          {fileName}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale((s) => Math.min(s + 0.25, 3))}
            className="rounded-xl p-2 bg-slate-900/60 hover:bg-slate-800 text-slate-200 transition"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}
            className="rounded-xl p-2 bg-slate-900/60 hover:bg-slate-800 text-slate-200 transition"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={() => setScale(1)}
            className="rounded-xl p-2 bg-slate-900/60 hover:bg-slate-800 text-slate-200 transition"
            title="Reset Zoom"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={handleDownload}
            className="rounded-xl p-2 bg-slate-900/60 hover:bg-slate-800 text-slate-200 transition"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="rounded-xl p-2 bg-slate-900/60 hover:bg-rose-900/60 text-slate-200 hover:text-rose-200 transition"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Image */}
      <div
        className="flex items-center justify-center max-w-full max-h-full overflow-hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <img
          src={mediaUrl}
          alt={fileName}
          className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl transition-transform duration-150"
          style={{ transform: `scale(${scale})` }}
        />
      </div>
    </div>
  );
};
