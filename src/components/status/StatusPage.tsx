/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  Plus,
  Camera,
  Edit2,
  Search,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  CircleDashed,
  X,
  Lock,
  Eye,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { UserStatusStory } from '../../types';
import { deleteStatusStory, isStoryViewedBy } from '../../services/statusService';
import { Avatar } from '../common/Avatar';
import { ConfirmModal } from '../common/ConfirmModal';
import { CreateStatusModal } from './CreateStatusModal';
import { StatusViewerModal } from './StatusViewerModal';
import { StatusRing } from './StatusRing';
import { useToast } from '../common/Toast';

interface StatusPageProps {
  onBackMobile?: () => void;
  statusStoriesEnabled?: boolean;
}

interface StoryGroup {
  userId: string;
  userName: string;
  userPhotoURL?: string;
  stories: UserStatusStory[];
  unviewedCount: number;
}

export const StatusPage: React.FC<StatusPageProps> = ({
  onBackMobile,
  statusStoriesEnabled = true,
}) => {
  const { user, profile } = useAuth();
  const { userCache, statusStories } = useChat();
  const { showToast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<'text' | 'image'>('text');

  // Viewer navigation across contact groups
  const [viewerQueue, setViewerQueue] = useState<StoryGroup[]>([]);
  const [viewerGroupIndex, setViewerGroupIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const [showMyManage, setShowMyManage] = useState(false);
  const [showViewedSection, setShowViewedSection] = useState(true);
  const [statusSearch, setStatusSearch] = useState('');
  const [storyToDelete, setStoryToDelete] = useState<UserStatusStory | null>(null);
  const [deletingStory, setDeletingStory] = useState(false);

  const enrichedStories = useMemo(() => {
    return (statusStories || []).map((s) => {
      const cachedUser = userCache[s.userId];
      if (cachedUser) {
        return {
          ...s,
          userName: cachedUser.displayName || s.userName,
          userPhotoURL: cachedUser.photoURL || s.userPhotoURL,
        };
      }
      return s;
    });
  }, [statusStories, userCache]);

  const myStories = useMemo(
    () =>
      enrichedStories
        .filter((s) => s.userId === user?.uid)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [enrichedStories, user?.uid]
  );

  const { recentGroups, viewedGroups } = useMemo(() => {
    let others = enrichedStories.filter((s) => s.userId !== user?.uid);
    if (statusSearch.trim()) {
      const q = statusSearch.toLowerCase();
      others = others.filter(
        (s) =>
          s.userName.toLowerCase().includes(q) ||
          (s.text && s.text.toLowerCase().includes(q)) ||
          (s.caption && s.caption.toLowerCase().includes(q))
      );
    }

    const byUser = new Map<string, UserStatusStory[]>();
    others.forEach((s) => {
      const list = byUser.get(s.userId) || [];
      list.push(s);
      byUser.set(s.userId, list);
    });

    const recent: StoryGroup[] = [];
    const viewed: StoryGroup[] = [];

    byUser.forEach((list, uid) => {
      const sorted = [...list].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const unviewedCount = sorted.filter((s) => !isStoryViewedBy(s, user?.uid)).length;
      const latest = sorted[0];
      const group: StoryGroup = {
        userId: uid,
        userName: latest.userName,
        userPhotoURL: latest.userPhotoURL,
        stories: sorted,
        unviewedCount,
      };
      if (unviewedCount > 0) {
        recent.push(group);
      } else {
        viewed.push(group);
      }
    });

    return { recentGroups: recent, viewedGroups: viewed };
  }, [enrichedStories, statusSearch, user?.uid]);

  const formatRelativeTime = (isoString: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const diffMins = Math.floor((Date.now() - d.getTime()) / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const isToday = d.toDateString() === new Date().toDateString();
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return isToday ? `Today, ${timeStr}` : timeStr;
    } catch {
      return '';
    }
  };

  const openViewerQueue = (queue: StoryGroup[], startIndex = 0) => {
    if (queue.length === 0) return;
    setViewerQueue(queue);
    setViewerGroupIndex(startIndex);
    setIsViewerOpen(true);
  };

  const openMyStoriesViewer = () => {
    if (myStories.length === 0) {
      openCreator('text');
      return;
    }
    openViewerQueue(
      [
        {
          userId: user?.uid || '',
          userName: profile?.displayName || 'My Status',
          userPhotoURL: profile?.photoURL,
          stories: myStories,
          unviewedCount: 0,
        },
      ],
      0
    );
  };

  const openCreator = (mode: 'text' | 'image') => {
    if (!statusStoriesEnabled) {
      showToast('Status updates are currently paused by an administrator', 'warning');
      return;
    }
    setCreateMode(mode);
    setIsCreateOpen(true);
  };

  const handleConfirmDeleteOwn = async () => {
    if (!storyToDelete) return;
    setDeletingStory(true);
    try {
      await deleteStatusStory(storyToDelete.id);
      showToast('Status update deleted', 'info');
      setStoryToDelete(null);
    } catch {
      showToast('Failed to delete status update', 'error');
    } finally {
      setDeletingStory(false);
    }
  };

  const activeViewerGroup = viewerQueue[viewerGroupIndex];
  const combinedOtherQueue = [...recentGroups, ...viewedGroups];

  return (
    <div className="flex h-full w-full flex-col bg-[#0b141a] text-[#e9edef] select-none overflow-hidden">
      {/* Top Header */}
      <div className="flex h-14 md:h-16 items-center justify-between border-b border-[#222d34] bg-[#202c33] px-3.5 sm:px-4 py-2 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3">
          {onBackMobile && (
            <button
              type="button"
              onClick={onBackMobile}
              className="md:hidden flex h-11 w-11 items-center justify-center rounded-full text-[#8696a0] hover:bg-[#111b21] hover:text-white transition"
              title="Back"
              aria-label="Back to chats"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <CircleDashed className="h-5 w-5 text-[#25d366]" />
            <h1 className="text-base sm:text-lg font-semibold text-[#e9edef]">Updates</h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => openCreator('text')}
            disabled={!statusStoriesEnabled}
            className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#2a3942] px-3 sm:px-3.5 py-2 text-xs font-semibold text-[#25d366] hover:bg-[#32434d] active:scale-95 transition disabled:opacity-40"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Text</span>
          </button>

          <button
            type="button"
            onClick={() => openCreator('image')}
            disabled={!statusStoriesEnabled}
            className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#00a884] px-3 sm:px-3.5 py-2 text-xs font-bold text-[#0b141a] hover:bg-[#06cf9c] active:scale-95 transition shadow-md disabled:opacity-40"
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Photo</span>
          </button>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-4xl mx-auto w-full pb-24 md:pb-8">
        {!statusStoriesEnabled && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300">
            <Lock className="h-4 w-4 flex-shrink-0" />
            <span>Status story creation has been temporarily paused by an administrator.</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696a0]" />
          <input
            type="text"
            value={statusSearch}
            onChange={(e) => setStatusSearch(e.target.value)}
            placeholder="Search updates by contact or caption..."
            className="w-full rounded-xl bg-[#202c33] border border-[#222d34] pl-10 pr-9 py-2.5 text-[15px] md:text-xs text-[#e9edef] placeholder-[#8696a0] focus:border-[#00a884] focus:outline-none transition shadow-sm"
          />
          {statusSearch && (
            <button
              type="button"
              onClick={() => setStatusSearch('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#8696a0] hover:text-[#e9edef]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* My Status Card */}
        <div className="rounded-2xl border border-[#222d34] bg-[#111b21] p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8696a0]">
              My Status
            </h3>
            {myStories.length > 0 && (
              <button
                type="button"
                onClick={() => setShowMyManage((m) => !m)}
                className="tabular-nums text-xs font-semibold text-[#00a884] hover:underline"
              >
                {showMyManage ? 'Hide list' : `Manage (${myStories.length})`}
              </button>
            )}
          </div>

          <div
            onClick={openMyStoriesViewer}
            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#202c33]/55 hover:bg-[#202c33] cursor-pointer transition border border-[#222d34]/70"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative flex-shrink-0">
                <StatusRing
                  totalSegments={myStories.length}
                  unviewedCount={myStories.length}
                  sizePx={48}
                >
                  <Avatar
                    src={profile?.photoURL}
                    name={profile?.displayName || 'My Status'}
                    size="lg"
                  />
                </StatusRing>
                {myStories.length === 0 && (
                  <div className="absolute bottom-0 right-0 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-[#00a884] text-[#0b141a] ring-2 ring-[#202c33]">
                    <Plus className="h-3 w-3 stroke-[3]" />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-[#e9edef]">My Status</h4>
                <p className="tabular-nums text-xs text-[#8696a0] truncate">
                  {myStories.length > 0
                    ? `${myStories.length} update${myStories.length > 1 ? 's' : ''} · ${formatRelativeTime(
                        myStories[0].createdAt
                      )}`
                    : 'Tap to add a 24-hour update'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openCreator('text');
                }}
                disabled={!statusStoriesEnabled}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2a3942] text-[#25d366] hover:bg-[#32434d] active:scale-95 transition disabled:opacity-40"
                title="Create Text Status"
                aria-label="Create Text Status"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openCreator('image');
                }}
                disabled={!statusStoriesEnabled}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00a884] text-[#0b141a] hover:bg-[#06cf9c] active:scale-95 transition shadow-md disabled:opacity-40"
                title="Create Photo Status"
                aria-label="Create Photo Status"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Manage Individual My Status Updates */}
          {showMyManage && myStories.length > 0 && (
            <div className="divide-y divide-[#222d34]/60 rounded-xl border border-[#222d34] bg-[#0b141a]/60 overflow-hidden animate-in fade-in">
              {myStories.map((story, idx) => {
                const viewCount = (story.viewedBy || []).filter(
                  (id) => id !== story.userId
                ).length;
                return (
                  <div
                    key={story.id}
                    onClick={() =>
                      openViewerQueue(
                        [
                          {
                            userId: user?.uid || '',
                            userName: profile?.displayName || 'My Status',
                            userPhotoURL: profile?.photoURL,
                            stories: myStories,
                            unviewedCount: 0,
                          },
                        ],
                        0
                      )
                    }
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-[#202c33]/60 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {story.type === 'image' && story.mediaUrl ? (
                        <img
                          src={story.mediaUrl}
                          alt={story.caption || `Status ${idx + 1}`}
                          className="h-10 w-10 rounded-xl object-cover border border-[#222d34] flex-shrink-0"
                        />
                      ) : (
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-xl text-[9px] font-bold text-white p-1 text-center overflow-hidden flex-shrink-0"
                          style={{
                            background:
                              story.backgroundColor ||
                              'linear-gradient(135deg, #075e54 0%, #00a884 100%)',
                          }}
                        >
                          <span className="line-clamp-2 leading-tight">
                            {story.text || 'Text'}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#e9edef] truncate">
                          {story.text || story.caption || 'Photo update'}
                        </p>
                        <p className="tabular-nums text-[11px] text-[#8696a0] flex items-center gap-1.5 mt-0.5">
                          <Eye className="h-3 w-3 text-[#00a884]" />
                          <span>
                            {viewCount} {viewCount === 1 ? 'view' : 'views'}
                          </span>
                          <span>·</span>
                          <span>{formatRelativeTime(story.createdAt)}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStoryToDelete(story);
                      }}
                      aria-label="Delete this status"
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-rose-400 hover:bg-rose-500/15 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Story Strip (when contacts have stories) */}
        {combinedOtherQueue.length > 0 && (
          <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar pb-1 px-0.5">
            {combinedOtherQueue.map((group, idx) => {
              const latest = group.stories[0];
              return (
                <button
                  key={group.userId}
                  type="button"
                  onClick={() => openViewerQueue(combinedOtherQueue, idx)}
                  className="flex flex-col items-center gap-1.5 w-16 flex-shrink-0 group"
                >
                  <StatusRing
                    totalSegments={group.stories.length}
                    unviewedCount={group.unviewedCount}
                    sizePx={52}
                  >
                    <Avatar
                      src={latest.userPhotoURL}
                      name={latest.userName}
                      size="lg"
                    />
                  </StatusRing>
                  <span className="w-full truncate text-[11px] font-medium text-[#e9edef] group-hover:text-[#25d366] transition text-center">
                    {latest.userName.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Recent Updates */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="tabular-nums text-xs font-bold uppercase tracking-wider text-[#8696a0]">
              Recent Updates ({recentGroups.length})
            </h3>
          </div>

          {recentGroups.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#8696a0] rounded-2xl bg-[#111b21] border border-[#222d34] p-6 space-y-3">
              <CircleDashed className="h-10 w-10 text-[#00a884] mx-auto opacity-80" />
              <p className="font-semibold text-sm text-[#e9edef]">
                {statusSearch ? 'No matching updates' : 'All caught up'}
              </p>
              <p className="text-xs text-[#8696a0] max-w-xs mx-auto">
                {statusSearch
                  ? `No recent stories match "${statusSearch}".`
                  : 'Share a photo or text update — it stays visible to your contacts for 24 hours.'}
              </p>
              {!statusSearch && (
                <button
                  type="button"
                  onClick={() => openCreator('text')}
                  disabled={!statusStoriesEnabled}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#00a884] px-4 py-2 text-xs font-bold text-[#0b141a] hover:bg-[#06cf9c] active:scale-95 transition shadow-md disabled:opacity-40"
                >
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                  <span>Add Status Update</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentGroups.map((g, idx) => {
                const latest = g.stories[0];
                const previewSnippet = latest.text || latest.caption || 'Photo update';
                return (
                  <div
                    key={g.userId}
                    onClick={() => openViewerQueue(recentGroups, idx)}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#111b21] hover:bg-[#202c33] cursor-pointer transition border border-[#222d34] shadow-sm group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <StatusRing
                        totalSegments={g.stories.length}
                        unviewedCount={g.unviewedCount}
                        sizePx={42}
                      >
                        <Avatar
                          src={latest.userPhotoURL}
                          name={latest.userName}
                          size="md"
                        />
                      </StatusRing>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-bold text-[#e9edef] truncate group-hover:text-[#25d366] transition">
                          {latest.userName}
                        </h4>
                        <p className="text-[11px] text-[#8696a0] truncate mt-0.5">
                          {previewSnippet}
                        </p>
                        <p className="tabular-nums text-[10px] text-[#00a884] font-medium mt-0.5">
                          {formatRelativeTime(latest.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Mini Story Preview Thumbnail */}
                    {latest.type === 'image' && latest.mediaUrl ? (
                      <img
                        src={latest.mediaUrl}
                        alt=""
                        className="h-12 w-10 rounded-xl object-cover border border-[#222d34] flex-shrink-0 group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div
                        className="flex h-12 w-10 items-center justify-center rounded-xl p-1 text-[8px] font-bold text-white text-center overflow-hidden flex-shrink-0 border border-white/10 group-hover:scale-105 transition-transform"
                        style={{
                          background:
                            latest.backgroundColor ||
                            'linear-gradient(135deg, #075e54 0%, #00a884 100%)',
                        }}
                      >
                        <span className="line-clamp-3 leading-tight">
                          {latest.text || 'Update'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Viewed Updates Section */}
        {viewedGroups.length > 0 && (
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => setShowViewedSection(!showViewedSection)}
              className="flex items-center justify-between w-full min-h-[36px] text-xs font-bold uppercase tracking-wider text-[#8696a0] px-1 hover:text-[#e9edef] transition"
            >
              <span className="tabular-nums">Viewed Updates ({viewedGroups.length})</span>
              {showViewedSection ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {showViewedSection && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {viewedGroups.map((g, idx) => {
                  const latest = g.stories[0];
                  return (
                    <div
                      key={g.userId}
                      onClick={() => openViewerQueue(viewedGroups, idx)}
                      className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#111b21]/70 hover:bg-[#202c33] cursor-pointer transition border border-[#222d34]/60 opacity-80 hover:opacity-100"
                    >
                      <StatusRing
                        totalSegments={g.stories.length}
                        unviewedCount={0}
                        sizePx={42}
                      >
                        <Avatar
                          src={latest.userPhotoURL}
                          name={latest.userName}
                          size="md"
                        />
                      </StatusRing>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-semibold text-[#e9edef] truncate">
                          {latest.userName}
                        </h4>
                        <p className="tabular-nums text-[11px] text-[#8696a0] truncate mt-0.5">
                          Viewed · {formatRelativeTime(latest.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Developer Credit Footer */}
        <div className="pt-6 text-center text-xs text-[#8696a0]/70 flex items-center justify-center gap-1.5 border-t border-[#222d34]/40 mt-8">
          <Sparkles className="h-3.5 w-3.5 text-[#00a884]" />
          <span>
            DEV CHAT Updates · Developed by <strong className="text-[#00a884]">lawrencedev</strong>
          </span>
        </div>
      </div>

      {/* Create Status Modal */}
      <CreateStatusModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        initialMode={createMode}
      />

      {/* Status Viewer Modal with Multi-Contact Chaining */}
      <StatusViewerModal
        isOpen={isViewerOpen && Boolean(activeViewerGroup)}
        onClose={() => setIsViewerOpen(false)}
        stories={activeViewerGroup?.stories || []}
        onNextGroup={
          viewerGroupIndex < viewerQueue.length - 1
            ? () => setViewerGroupIndex((i) => i + 1)
            : undefined
        }
        onPrevGroup={
          viewerGroupIndex > 0 ? () => setViewerGroupIndex((i) => i - 1) : undefined
        }
      />

      {/* Delete Own Status Confirmation */}
      <ConfirmModal
        isOpen={Boolean(storyToDelete)}
        onClose={() => setStoryToDelete(null)}
        loading={deletingStory}
        onConfirm={handleConfirmDeleteOwn}
        title="Delete status update?"
        description="This update will be permanently removed for all of your contacts."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};
