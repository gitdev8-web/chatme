/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  Trash2,
  Send,
  Pause,
  Play,
  Sparkles,
} from 'lucide-react';
import { UserStatusStory } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { markStoryAsViewed, deleteStatusStory } from '../../services/statusService';
import { Avatar } from '../common/Avatar';
import { ConfirmModal } from '../common/ConfirmModal';
import { useToast } from '../common/Toast';
import { RenderMessage3DEmojis } from '../emoji/RenderMessage3DEmojis';
import { Emoji3DImage } from '../emoji/Emoji3DImage';

interface StatusViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  stories: UserStatusStory[];
  initialStoryIndex?: number;
  onStoryDeleted?: () => void;
  onNextGroup?: () => void;
  onPrevGroup?: () => void;
}

const STORY_REACTIONS = ['❤️', '😂', '😮', '😢', '🙏', '👏', '🔥'];

export const StatusViewerModal: React.FC<StatusViewerModalProps> = ({
  isOpen,
  onClose,
  stories,
  initialStoryIndex = 0,
  onStoryDeleted,
  onNextGroup,
  onPrevGroup,
}) => {
  const { user } = useAuth();
  const { startDirectChat, sendTextMessage, userCache } = useChat();
  const { showToast } = useToast();

  const [currentIndex, setCurrentIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dragDownY, setDragDownY] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  const currentStory = stories[currentIndex];
  const isOwnStory = currentStory?.userId === user?.uid;
  const isOfficialSystemStory = currentStory?.userId === 'devchat_team';

  useEffect(() => {
    setCurrentIndex(initialStoryIndex);
    setProgress(0);
    setIsPaused(false);
    setShowViewers(false);
    setShowDeleteConfirm(false);
    setDragDownY(0);
  }, [initialStoryIndex, isOpen, stories]);

  // Mark current story as viewed
  useEffect(() => {
    if (isOpen && currentStory && user?.uid && !isOwnStory) {
      void markStoryAsViewed(currentStory.id, user.uid);
    }
  }, [isOpen, currentStory?.id, user?.uid, isOwnStory]);

  const goToNext = () => {
    setShowViewers(false);
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((c) => c + 1);
      setProgress(0);
    } else if (onNextGroup) {
      onNextGroup();
    } else {
      onClose();
    }
  };

  const goToPrev = () => {
    setShowViewers(false);
    if (currentIndex > 0) {
      setCurrentIndex((c) => c - 1);
      setProgress(0);
    } else if (onPrevGroup) {
      onPrevGroup();
    }
  };

  // Keyboard navigation (Escape, ArrowLeft, ArrowRight, Space to pause)
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
      if (e.key === 'Escape') {
        onClose();
      } else if (!isInput && e.key === 'ArrowRight') {
        goToNext();
      } else if (!isInput && e.key === 'ArrowLeft') {
        goToPrev();
      } else if (!isInput && e.key === ' ') {
        e.preventDefault();
        setIsPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, currentIndex, stories.length, onNextGroup, onPrevGroup]);

  // Slide progress timer (6 seconds per slide)
  useEffect(() => {
    if (
      !isOpen ||
      isPaused ||
      showViewers ||
      showDeleteConfirm ||
      sendingReply ||
      !currentStory
    ) {
      return;
    }

    const interval = 50;
    const totalDuration = 6000;
    const step = (interval / totalDuration) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          goToNext();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [
    isOpen,
    isPaused,
    showViewers,
    showDeleteConfirm,
    sendingReply,
    currentIndex,
    stories.length,
    currentStory?.id,
  ]);

  if (!isOpen || !currentStory) return null;

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteStatusStory(currentStory.id);
      showToast('Status deleted', 'info');
      onStoryDeleted?.();
      setShowDeleteConfirm(false);
      if (stories.length <= 1) {
        onClose();
      } else {
        goToNext();
      }
    } catch {
      showToast('Could not delete status', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleSendReply = async (customText?: string) => {
    const textToSend = (customText ?? replyText).trim();
    if (!textToSend || isOwnStory || isOfficialSystemStory || sendingReply) return;

    setSendingReply(true);
    try {
      const convId = await startDirectChat(currentStory.userId);
      const previewSnippet =
        currentStory.text || currentStory.caption || 'Photo Status';
      await sendTextMessage(
        `Replying to status: "${previewSnippet.slice(0, 75)}"\n\n${textToSend}`,
        convId
      );
      setReplyText('');
      showToast(`Replied to ${currentStory.userName}`, 'success');
      onClose();
    } catch (err) {
      console.error('Error replying to status:', err);
      showToast('Could not send status reply', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  const formatTimeLabel = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      const diffMs = Date.now() - date.getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleStageTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsPaused(true);
    swipeStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleStageTouchMove = (e: React.TouchEvent) => {
    if (!swipeStartRef.current || e.touches.length !== 1) return;
    const dy = e.touches[0].clientY - swipeStartRef.current.y;
    const dx = e.touches[0].clientX - swipeStartRef.current.x;
    if (dy > 14 && dy > Math.abs(dx)) {
      setDragDownY(Math.min(180, dy));
    }
  };

  const handleStageTouchEnd = () => {
    setIsPaused(false);
    if (dragDownY > 95) {
      onClose();
    } else {
      setDragDownY(0);
    }
    swipeStartRef.current = null;
  };

  const viewerIds = (currentStory.viewedBy || []).filter(
    (id) => id !== currentStory.userId
  );

  const backgroundStyle = currentStory.backgroundColor || 'linear-gradient(135deg, #075e54 0%, #00a884 100%)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-0 sm:p-4 backdrop-blur-xl select-none animate-in fade-in">
      <div
        className="relative flex h-[100dvh] sm:h-[700px] sm:max-h-[92dvh] w-full sm:max-w-md flex-col overflow-hidden rounded-none sm:rounded-3xl bg-black shadow-2xl border-0 sm:border border-white/10 transition-transform duration-150 ease-out"
        style={
          dragDownY > 0
            ? {
                transform: `translateY(${dragDownY}px) scale(${Math.max(0.92, 1 - dragDownY / 1200)})`,
                opacity: Math.max(0.55, 1 - dragDownY / 280),
              }
            : undefined
        }
      >
        {/* Top Progress Bars (Clickable segments) */}
        <div className="absolute top-0 left-0 right-0 z-30 flex gap-1.5 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          {stories.map((story, idx) => {
            let barWidth = '0%';
            if (idx < currentIndex) barWidth = '100%';
            else if (idx === currentIndex) barWidth = `${progress}%`;

            return (
              <button
                key={story.id}
                type="button"
                aria-label={`View status ${idx + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                  setProgress(0);
                }}
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/30 cursor-pointer"
              >
                <div
                  className="h-full bg-white transition-all duration-75 ease-linear"
                  style={{ width: barWidth }}
                />
              </button>
            );
          })}
        </div>

        {/* Header with User Profile */}
        <div className="absolute top-6 left-0 right-0 z-30 flex items-center justify-between px-3 sm:px-4 pt-[env(safe-area-inset-top)] py-2.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar
              src={currentStory.userPhotoURL}
              name={currentStory.userName}
              size="sm"
            />
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-white leading-tight truncate">
                {currentStory.userName}
              </h4>
              <p className="tabular-nums text-[11px] text-white/75">
                {formatTimeLabel(currentStory.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsPaused((p) => !p);
              }}
              aria-label={isPaused ? 'Resume story' : 'Pause story'}
              title={isPaused ? 'Resume' : 'Pause'}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white/85 hover:bg-black/75 hover:text-white transition"
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>

            {isOwnStory && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-rose-400 hover:bg-black/75 transition"
                title="Delete Status"
                aria-label="Delete status"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white/85 hover:bg-black/75 hover:text-white transition"
              aria-label="Close status viewer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Story Body Stage (Hold to pause, tap left/right to navigate, swipe down to close) */}
        <div
          className="relative flex-1 flex items-center justify-center overflow-hidden"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={handleStageTouchStart}
          onTouchMove={handleStageTouchMove}
          onTouchEnd={handleStageTouchEnd}
        >
          {currentStory.type === 'text' ? (
            <div
              className="flex h-full w-full items-center justify-center p-8 text-center"
              style={{
                background: backgroundStyle,
                fontFamily: currentStory.fontFamily || 'sans-serif',
              }}
            >
              <div className="text-2xl sm:text-3xl font-bold text-white max-w-sm break-words leading-relaxed drop-shadow-sm">
                <RenderMessage3DEmojis text={currentStory.text || ''} />
              </div>
            </div>
          ) : (
            <div className="relative h-full w-full flex items-center justify-center bg-black">
              <img
                src={currentStory.mediaUrl}
                alt={currentStory.caption || `${currentStory.userName}'s status`}
                className="max-h-full max-w-full object-contain"
              />
              {currentStory.caption && (
                <div className="absolute bottom-4 left-3 right-3 rounded-2xl bg-black/65 backdrop-blur-md px-4 py-2.5 text-center text-xs sm:text-sm font-medium text-white border border-white/10">
                  <RenderMessage3DEmojis text={currentStory.caption} />
                </div>
              )}
            </div>
          )}

          {/* Navigation Click Zones */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goToPrev();
            }}
            className="absolute left-0 top-16 bottom-4 w-1/3 z-20 cursor-pointer opacity-0 hover:opacity-70 transition flex items-center justify-start pl-2"
            aria-label="Previous story"
          >
            <span className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white">
              <ChevronLeft className="h-5 w-5" />
            </span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-0 top-16 bottom-4 w-2/3 z-20 cursor-pointer opacity-0 hover:opacity-70 transition flex items-center justify-end pr-2"
            aria-label="Next story"
          >
            <span className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white">
              <ChevronRight className="h-5 w-5" />
            </span>
          </button>
        </div>

        {/* Story Viewers Drawer (for story owner) */}
        {isOwnStory && showViewers && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-14 z-40 max-h-64 overflow-y-auto rounded-t-3xl border-t border-[#222d34] bg-[#111b21]/95 backdrop-blur-xl p-4 shadow-2xl animate-in slide-in-from-bottom"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="tabular-nums text-xs font-bold text-[#e9edef]">
                Viewed by {viewerIds.length}
              </span>
              <button
                type="button"
                onClick={() => setShowViewers(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8696a0] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {viewerIds.length === 0 ? (
              <p className="py-4 text-center text-xs text-[#8696a0]">No views yet</p>
            ) : (
              <div className="space-y-2">
                {viewerIds.map((vid) => {
                  const viewer = userCache[vid];
                  return (
                    <div key={vid} className="flex items-center gap-3 py-1">
                      <Avatar
                        src={viewer?.photoURL}
                        name={viewer?.displayName || 'Contact'}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#e9edef] truncate">
                          {viewer?.displayName || `Contact ${vid.slice(0, 6)}`}
                        </p>
                        {viewer?.username && (
                          <p className="text-[10px] text-[#8696a0]">@{viewer.username}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Bottom Section */}
        <div className="z-30 bg-gradient-to-t from-black via-black/90 to-transparent px-3.5 pt-2 pb-[max(0.85rem,env(safe-area-inset-bottom))]">
          {isOwnStory ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowViewers((v) => !v);
              }}
              className="flex w-full min-h-[44px] items-center justify-center gap-2 py-2 text-white/90 hover:text-[#25d366] transition"
            >
              <Eye className="h-4 w-4 text-[#25d366]" />
              <span className="tabular-nums text-xs font-semibold">
                {viewerIds.length} {viewerIds.length === 1 ? 'view' : 'views'}
              </span>
              <ChevronUp
                className={`h-3.5 w-3.5 transition-transform ${
                  showViewers ? 'rotate-180' : ''
                }`}
              />
            </button>
          ) : isOfficialSystemStory ? (
            <div className="flex min-h-[44px] items-center justify-center gap-2 text-xs font-medium text-white/75">
              <Sparkles className="h-4 w-4 text-[#25d366]" />
              <span>DEV CHAT Official Welcome Story</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-center gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar">
                {STORY_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    disabled={sendingReply}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSendReply(emoji);
                    }}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 hover:scale-115 active:scale-95 transition"
                  >
                    <Emoji3DImage char={emoji} size="md" />
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendReply();
                  }}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Reply to status..."
                  className="flex-1 rounded-full border border-white/15 bg-white/15 px-4 py-2.5 text-[15px] sm:text-xs text-white placeholder:text-white/60 focus:outline-none focus:border-[#25d366]"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSendReply();
                  }}
                  disabled={!replyText.trim() || sendingReply}
                  aria-label="Send status reply"
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#00a884] text-[#0b141a] hover:bg-[#06cf9c] active:scale-95 disabled:opacity-40 transition"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Status Confirmation */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        loading={deleting}
        onConfirm={handleConfirmDelete}
        title="Delete status update?"
        description="This update will be permanently removed for all of your contacts."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};
