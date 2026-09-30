/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Send,
  Heart,
  Smile,
} from 'lucide-react';
import { UserStatusStory } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { markStoryAsViewed, deleteStatusStory } from '../../services/statusService';
import { Avatar } from '../common/Avatar';

interface StatusViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  stories: UserStatusStory[];
  initialStoryIndex?: number;
  onStoryDeleted?: () => void;
}

export const StatusViewerModal: React.FC<StatusViewerModalProps> = ({
  isOpen,
  onClose,
  stories,
  initialStoryIndex = 0,
  onStoryDeleted,
}) => {
  const { user } = useAuth();
  const { startDirectChat, sendTextMessage } = useChat();
  const [currentIndex, setCurrentIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showViewers, setShowViewers] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentStory = stories[currentIndex];
  const isOwnStory = currentStory?.userId === user?.uid;

  useEffect(() => {
    setCurrentIndex(initialStoryIndex);
    setProgress(0);
  }, [initialStoryIndex, isOpen]);

  // Mark current story as viewed
  useEffect(() => {
    if (isOpen && currentStory && user?.uid && !isOwnStory) {
      markStoryAsViewed(currentStory.id, user.uid);
    }
  }, [isOpen, currentStory, user, isOwnStory]);

  // Slide progress timer (5 seconds per slide)
  useEffect(() => {
    if (!isOpen || isPaused || !currentStory) return;

    const interval = 50; // update every 50ms
    const totalDuration = 5000;
    const step = (interval / totalDuration) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex((c) => c + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + step;
      });
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isPaused, currentIndex, stories.length, currentStory, onClose]);

  if (!isOpen || !currentStory) return null;

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((c) => c + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((c) => c - 1);
      setProgress(0);
    }
  };

  const handleDelete = async () => {
    if (confirm('Delete this status update for everyone?')) {
      await deleteStatusStory(currentStory.id);
      onStoryDeleted?.();
      if (stories.length <= 1) {
        onClose();
      } else {
        handleNext();
      }
    }
  };

  const handleSendReply = async (customText?: string) => {
    const textToSend = customText || replyText;
    if (!textToSend.trim() || isOwnStory) return;

    try {
      await startDirectChat(currentStory.userId);
      await sendTextMessage(`*Replying to status:*\n"${currentStory.text || currentStory.caption || 'Photo Status'}"\n\n${textToSend}`);
      setReplyText('');
      onClose();
    } catch (err) {
      console.error('Error replying to status:', err);
    }
  };

  const formatTimeAgo = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-0 sm:p-4 backdrop-blur-xl select-none"
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden rounded-none sm:rounded-3xl bg-black shadow-2xl">
        {/* Top Progress Bars */}
        <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 p-3 pt-4">
          {stories.map((story, idx) => {
            let barWidth = '0%';
            if (idx < currentIndex) barWidth = '100%';
            else if (idx === currentIndex) barWidth = `${progress}%`;

            return (
              <div
                key={story.id}
                className="h-1 flex-1 overflow-hidden rounded-full bg-white/30"
              >
                <div
                  className="h-full bg-white transition-all ease-linear"
                  style={{ width: barWidth }}
                />
              </div>
            );
          })}
        </div>

        {/* Header with User Profile */}
        <div className="absolute top-7 left-0 right-0 z-30 flex items-center justify-between px-4 py-2 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-3">
            <Avatar
              src={currentStory.userPhotoURL}
              name={currentStory.userName}
              size="sm"
            />
            <div>
              <h4 className="text-xs font-bold text-white leading-tight">
                {currentStory.userName}
              </h4>
              <p className="text-[10px] text-white/70">
                {formatTimeAgo(currentStory.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOwnStory && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="rounded-full bg-black/40 p-1.5 text-red-400 hover:bg-black/60 transition"
                title="Delete Status"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="rounded-full bg-black/40 p-1.5 text-white/80 hover:bg-black/60 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Story Body */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden">
          {currentStory.type === 'text' ? (
            <div
              className="flex h-full w-full items-center justify-center p-8 text-center"
              style={{
                backgroundColor: currentStory.backgroundColor || '#075e54',
                fontFamily: currentStory.fontFamily || 'sans-serif',
              }}
            >
              <p className="text-2xl sm:text-3xl font-bold text-white max-w-sm break-words leading-relaxed">
                {currentStory.text}
              </p>
            </div>
          ) : (
            <div className="relative h-full w-full flex items-center justify-center bg-black">
              <img
                src={currentStory.mediaUrl}
                alt="Status story"
                className="max-h-full max-w-full object-contain"
              />
              {currentStory.caption && (
                <div className="absolute bottom-16 left-0 right-0 bg-black/60 backdrop-blur-sm p-3 text-center text-xs font-medium text-white px-6">
                  {currentStory.caption}
                </div>
              )}
            </div>
          )}

          {/* Navigation Click Zones */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-0 top-16 bottom-20 w-1/3 z-20 cursor-pointer opacity-0 hover:opacity-10 transition flex items-center justify-start pl-2"
          >
            <ChevronLeft className="h-8 w-8 text-white drop-shadow-md" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-0 top-16 bottom-20 w-2/3 z-20 cursor-pointer opacity-0 hover:opacity-10 transition flex items-center justify-end pr-2"
          >
            <ChevronRight className="h-8 w-8 text-white drop-shadow-md" />
          </button>
        </div>

        {/* Bottom Section: Reply Bar (for other users) or Views Count (for own story) */}
        <div className="z-30 bg-gradient-to-t from-black/95 to-transparent p-3 pt-2">
          {isOwnStory ? (
            <div className="flex items-center justify-center gap-2 py-1 text-white/90">
              <Eye className="h-4 w-4 text-[#25d366]" />
              <span className="text-xs font-semibold">
                {Math.max(0, (currentStory.viewedBy?.length || 1) - 1)} views
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Quick Emojis */}
              <div className="flex items-center justify-center gap-4">
                {['❤️', '😂', '😮', '😢', '🙏', '👏', '🔥'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSendReply(emoji);
                    }}
                    className="text-lg hover:scale-130 transition"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Reply Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendReply();
                  }}
                  placeholder="Reply to status..."
                  className="flex-1 rounded-full bg-white/20 px-4 py-2 text-xs text-white placeholder:text-white/60 focus:outline-none focus:ring-1 focus:ring-[#25d366]"
                />
                <button
                  onClick={() => handleSendReply()}
                  disabled={!replyText.trim()}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00a884] text-white disabled:opacity-40 transition"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
