/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EMOJI_3D_CHAR_MAP } from '../../data/emoji3DData';

interface Emoji3DImageProps {
  char: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  alt?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4 text-xs',
  md: 'h-5 w-5 text-sm',
  lg: 'h-7 w-7 text-lg',
  xl: 'h-10 w-10 text-2xl',
  '2xl': 'h-14 w-14 text-4xl',
};

export const Emoji3DImage: React.FC<Emoji3DImageProps> = ({
  char,
  size = 'md',
  className = '',
  alt,
}) => {
  const [loadError, setLoadingError] = useState(false);
  const emojiItem = EMOJI_3D_CHAR_MAP.get(char);

  if (!emojiItem || loadError) {
    return (
      <span className={`inline-block align-middle select-none ${sizeClasses[size]} ${className}`}>
        {char}
      </span>
    );
  }

  return (
    <img
      src={emojiItem.url}
      alt={alt || emojiItem.name || char}
      loading="lazy"
      onError={() => setLoadingError(true)}
      className={`inline-block align-middle object-contain filter drop-shadow-sm transition-transform hover:scale-110 select-none ${sizeClasses[size]} ${className}`}
    />
  );
};
