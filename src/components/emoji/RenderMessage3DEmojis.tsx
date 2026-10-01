/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Emoji3DImage } from './Emoji3DImage';
import { EMOJI_3D_CHAR_MAP } from '../../data/emoji3DData';

interface RenderMessage3DEmojisProps {
  text: string;
  className?: string;
}

// Regex to capture Unicode emoji tokens
const EMOJI_REGEX = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;

export const RenderMessage3DEmojis: React.FC<RenderMessage3DEmojisProps> = ({
  text,
  className = '',
}) => {
  if (!text) return null;

  // Check if text is emoji-only (1-3 emojis and whitespace only)
  const matches = text.match(EMOJI_REGEX) || [];
  const cleanTextNoEmojis = text.replace(EMOJI_REGEX, '').trim();
  const isEmojiOnly = cleanTextNoEmojis.length === 0 && matches.length >= 1 && matches.length <= 4;

  if (isEmojiOnly) {
    return (
      <div className={`flex items-center gap-1.5 py-1 ${className}`}>
        {matches.map((emojiChar, idx) => (
          <Emoji3DImage
            key={`emoji_only_${idx}_${emojiChar}`}
            char={emojiChar}
            size={matches.length === 1 ? '2xl' : 'xl'}
          />
        ))}
      </div>
    );
  }

  // Mixed text and emojis
  const parts = text.split(EMOJI_REGEX);

  return (
    <span className={`inline-wrap break-words ${className}`}>
      {parts.map((part, idx) => {
        if (!part) return null;
        if (EMOJI_3D_CHAR_MAP.has(part) || EMOJI_REGEX.test(part)) {
          return (
            <Emoji3DImage
              key={`inline_emoji_${idx}_${part}`}
              char={part}
              size="md"
              className="mx-0.5"
            />
          );
        }
        return <span key={`text_part_${idx}`}>{part}</span>;
      })}
    </span>
  );
};
