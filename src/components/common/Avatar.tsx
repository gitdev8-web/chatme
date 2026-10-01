/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  isOnline?: boolean;
  showPresence?: boolean;
  className?: string;
  onClick?: () => void;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-24 h-24 text-3xl',
};

const presenceSizes = {
  xs: 'w-1.5 h-1.5 right-0 bottom-0 border',
  sm: 'w-2 h-2 right-0 bottom-0 border',
  md: 'w-2.5 h-2.5 right-0.5 bottom-0.5 border-2',
  lg: 'w-3.5 h-3.5 right-0.5 bottom-0.5 border-2',
  xl: 'w-4 h-4 right-1 bottom-1 border-2',
  '2xl': 'w-5 h-5 right-2 bottom-2 border-2',
};

// Authentic WhatsApp muted profile avatar backgrounds
const bgColors = [
  'bg-[#00a884]',
  'bg-[#128c7e]',
  'bg-[#53bdeb]',
  'bg-[#34b7f1]',
  'bg-[#6b7b84]',
  'bg-[#008069]',
  'bg-[#4f5d64]',
  'bg-[#2a3942]',
];

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  isOnline = false,
  showPresence = false,
  className = '',
  onClick,
}) => {
  const getInitials = (str: string) => {
    if (!str) return '?';
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  const getColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % bgColors.length;
    return bgColors[idx];
  };

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex flex-shrink-0 select-none ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover shadow-sm ring-1 ring-white/10`}
          onError={(e) => {
            // fallback if broken image
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full ${getColor(
            name
          )} flex items-center justify-center font-medium text-white shadow-sm ring-1 ring-white/10 tracking-tight`}
        >
          {getInitials(name)}
        </div>
      )}

      {showPresence && (
        <span
          className={`absolute rounded-full border-slate-900 ${
            presenceSizes[size]
          } ${isOnline ? 'bg-emerald-500 ring-1 ring-emerald-400' : 'bg-slate-500'}`}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};
