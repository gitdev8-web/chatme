/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';
import { Emoji3DImage } from './Emoji3DImage';
import { EMOJI_3D_CHAR_MAP } from '../../data/emoji3DData';

interface RenderMessage3DEmojisProps {
  text: string;
  className?: string;
}

// Regex to capture Unicode emoji tokens (create fresh / use non-statefully)
const EMOJI_SPLIT_REGEX = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
const EMOJI_SINGLE_REGEX = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})$/u;
const FENCED_CODE_REGEX = /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g;
const INLINE_TOKEN_REGEX = /(https?:\/\/[^\s<>"'`]+|`[^`\n]+`|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g;

const CodeBlockCard: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="my-1.5 overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950 text-left shadow-inner">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-3 py-1.5 text-[10px] text-slate-400">
        <div className="flex items-center gap-1.5 font-mono uppercase tracking-wider">
          <Terminal className="h-3 w-3 text-[#25d366]" />
          <span>{language || 'code'}</span>
        </div>
        <button
          type="button"
          onClick={handleCopyCode}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-slate-100 hover:bg-white/10 transition"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-[#25d366]" />
              <span className="text-[#25d366]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[12px] leading-relaxed text-slate-100 select-text">
        <code>{code.replace(/\n$/, '')}</code>
      </pre>
    </div>
  );
};

function renderTextWithEmojis(rawText: string, keyPrefix: string): React.ReactNode {
  const parts = rawText.split(EMOJI_SPLIT_REGEX);
  return parts.map((part, idx) => {
    if (!part) return null;
    if (EMOJI_3D_CHAR_MAP.has(part) || EMOJI_SINGLE_REGEX.test(part)) {
      return (
        <Emoji3DImage
          key={`${keyPrefix}_em_${idx}`}
          char={part}
          size="md"
          className="mx-0.5"
        />
      );
    }
    return <React.Fragment key={`${keyPrefix}_txt_${idx}`}>{part}</React.Fragment>;
  });
}

function renderFormattedInlineSegment(segment: string, keyPrefix: string): React.ReactNode {
  const tokens: React.ReactNode[] = [];
  let lastIndex = 0;
  let tokenIdx = 0;

  for (const match of segment.matchAll(INLINE_TOKEN_REGEX)) {
    const matched = match[0];
    const start = match.index ?? 0;

    if (start > lastIndex) {
      tokens.push(
        <React.Fragment key={`${keyPrefix}_pre_${tokenIdx}`}>
          {renderTextWithEmojis(segment.slice(lastIndex, start), `${keyPrefix}_pre_${tokenIdx}`)}
        </React.Fragment>
      );
    }

    if (matched.startsWith('http://') || matched.startsWith('https://')) {
      // Strip trailing punctuation like .,!?:) cleanly
      const cleanMatch = matched.replace(/[),.!?:;]+$/, '');
      const trailing = matched.slice(cleanMatch.length);
      tokens.push(
        <React.Fragment key={`${keyPrefix}_url_${tokenIdx}`}>
          <a
            href={cleanMatch}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[#53bdeb] underline decoration-[#53bdeb]/60 underline-offset-2 hover:text-[#7dd3fc] break-all"
          >
            {cleanMatch}
          </a>
          {trailing}
        </React.Fragment>
      );
    } else if (matched.startsWith('`') && matched.endsWith('`')) {
      tokens.push(
        <code
          key={`${keyPrefix}_code_${tokenIdx}`}
          className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[12px] text-[#25d366] border border-white/10"
        >
          {matched.slice(1, -1)}
        </code>
      );
    } else if (matched.startsWith('*') && matched.endsWith('*')) {
      tokens.push(
        <strong key={`${keyPrefix}_b_${tokenIdx}`} className="font-bold">
          {renderTextWithEmojis(matched.slice(1, -1), `${keyPrefix}_b_${tokenIdx}`)}
        </strong>
      );
    } else if (matched.startsWith('_') && matched.endsWith('_')) {
      tokens.push(
        <em key={`${keyPrefix}_i_${tokenIdx}`} className="italic">
          {renderTextWithEmojis(matched.slice(1, -1), `${keyPrefix}_i_${tokenIdx}`)}
        </em>
      );
    } else if (matched.startsWith('~') && matched.endsWith('~')) {
      tokens.push(
        <del key={`${keyPrefix}_s_${tokenIdx}`} className="line-through opacity-75">
          {renderTextWithEmojis(matched.slice(1, -1), `${keyPrefix}_s_${tokenIdx}`)}
        </del>
      );
    }

    lastIndex = start + matched.length;
    tokenIdx += 1;
  }

  if (lastIndex < segment.length) {
    tokens.push(
      <React.Fragment key={`${keyPrefix}_tail`}>
        {renderTextWithEmojis(segment.slice(lastIndex), `${keyPrefix}_tail`)}
      </React.Fragment>
    );
  }

  return tokens;
}

export const RenderMessage3DEmojis: React.FC<RenderMessage3DEmojisProps> = ({
  text,
  className = '',
}) => {
  if (!text) return null;

  // Check if text is emoji-only (1-4 emojis and whitespace only)
  const matches = text.match(EMOJI_SPLIT_REGEX) || [];
  const cleanTextNoEmojis = text.replace(EMOJI_SPLIT_REGEX, '').trim();
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

  // Split by fenced code blocks first
  const blocks: React.ReactNode[] = [];
  let cursor = 0;
  let blockIdx = 0;

  for (const match of text.matchAll(FENCED_CODE_REGEX)) {
    const full = match[0];
    const lang = match[1] || '';
    const code = match[2] || '';
    const start = match.index ?? 0;

    if (start > cursor) {
      const before = text.slice(cursor, start);
      blocks.push(
        <span key={`seg_${blockIdx}`} className="inline-wrap break-words">
          {renderFormattedInlineSegment(before, `seg_${blockIdx}`)}
        </span>
      );
    }

    blocks.push(<CodeBlockCard key={`code_${blockIdx}`} language={lang} code={code} />);
    cursor = start + full.length;
    blockIdx += 1;
  }

  if (cursor < text.length) {
    const rest = text.slice(cursor);
    blocks.push(
      <span key={`seg_end`} className="inline-wrap break-words">
        {renderFormattedInlineSegment(rest, `seg_end`)}
      </span>
    );
  }

  return <div className={`break-words ${className}`}>{blocks}</div>;
};
