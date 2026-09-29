/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  showPresence?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

const presenceSizes = {
  xs: 'w-1.5 h-1.5 right-0 bottom-0 border',
  sm: 'w-2 h-2 right-0 bottom-0 border',
  md: 'w-2.5 h-2.5 right-0.5 bottom-0.5 border-2',
  lg: 'w-3.5 h-3.5 right-0.5 bottom-0.5 border-2',
  xl: 'w-4 h-4 right-1 bottom-1 border-2',
};

// Deterministic gradient based on string name
const bgGradients = [
  'from-emerald-500 to-teal-700',
  'from-cyan-500 to-blue-700',
  'from-indigo-500 to-purple-700',
  'from-pink-500 to-rose-700',
  'from-amber-500 to-orange-700',
  'from-violet-500 to-fuchsia-700',
];

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  isOnline = false,
  showPresence = false,
  className = '',
}) => {
  const getInitials = (str: string) => {
    if (!str) return '?';
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  const getGradient = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % bgGradients.length;
    return bgGradients[idx];
  };

  return (
    <div className={`relative inline-flex flex-shrink-0 select-none ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover shadow-inner ring-1 ring-slate-700/50`}
          onError={(e) => {
            // fallback if broken image
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-tr ${getGradient(
            name
          )} flex items-center justify-center font-semibold text-white shadow-inner ring-1 ring-white/10`}
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
