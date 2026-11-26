/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface StatusRingProps {
  totalSegments: number;
  unviewedCount: number;
  sizePx?: number;
  strokeWidth?: number;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
  className?: string;
}

/**
 * WhatsApp-authentic segmented status ring using SVG arcs.
 * Unviewed story segments render in vibrant emerald (#25d366); viewed segments in muted slate (#667781).
 */
export const StatusRing: React.FC<StatusRingProps> = ({
  totalSegments,
  unviewedCount,
  sizePx = 54,
  strokeWidth = 2.5,
  children,
  onClick,
  title,
  className = '',
}) => {
  const safeTotal = Math.max(0, totalSegments);
  const padding = 3;
  const viewBoxSize = sizePx + padding * 2;
  const center = viewBoxSize / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;

  // Gap between arcs when multiple stories exist
  const gapPx = safeTotal > 1 ? 5 : 0;
  const segmentLength =
    safeTotal > 0 ? Math.max(2, circumference / safeTotal - gapPx) : 0;

  return (
    <div
      onClick={onClick}
      title={title}
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${
        onClick ? 'cursor-pointer group' : ''
      } ${className}`}
      style={{ width: viewBoxSize, height: viewBoxSize }}
    >
      {safeTotal > 0 && (
        <svg
          width={viewBoxSize}
          height={viewBoxSize}
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
          className="absolute inset-0 -rotate-90 pointer-events-none transition-transform duration-200 group-hover:scale-105"
          aria-hidden="true"
        >
          {Array.from({ length: safeTotal }).map((_, idx) => {
            const isUnviewed = idx < unviewedCount;
            const dashOffset = -(idx * (segmentLength + gapPx));
            return (
              <circle
                key={idx}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={isUnviewed ? '#25d366' : '#667781'}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${segmentLength} ${circumference}`}
                strokeDashoffset={dashOffset}
                className="transition-colors duration-300"
              />
            );
          })}
        </svg>
      )}
      <div className="relative z-10 flex items-center justify-center transition-transform duration-200 group-hover:scale-[1.03]">
        {children}
      </div>
    </div>
  );
};
