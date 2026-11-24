/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Plus,
  Camera,
  Edit2,
  Search,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  CircleDashed,
  X,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { UserStatusStory } from '../../types';
import { createStatusStory } from '../../services/statusService';
import { Avatar } from '../common/Avatar';
import { CreateStatusModal } from './CreateStatusModal';
import { StatusViewerModal } from './StatusViewerModal';
import { useToast } from '../common/Toast';

interface StatusPageProps {
  onBackMobile?: () => void;
  statusStoriesEnabled?: boolean;
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
  const [activeStoryList, setActiveStoryList] = useState<UserStatusStory[]>([]);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [showViewedSection, setShowViewedSection] = useState(true);
  const [statusSearch, setStatusSearch] = useState('');

  const enrichedStories = (statusStories || []).map((s) => {
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

  const myStories = enrichedStories.filter((s) => s.userId === user?.uid);
  let otherStories = enrichedStories.filter((s) => s.userId !== user?.uid);

  if (statusSearch.trim()) {
    const q = statusSearch.toLowerCase();
    otherStories = otherStories.filter(
      (s) =>
        s.userName.toLowerCase().includes(q) ||
        (s.text && s.text.toLowerCase().includes(q)) ||
        (s.caption && s.caption.toLowerCase().includes(q))
    );
  }

  const groupStoriesByUser = (stories: UserStatusStory[]) => {
    const map = new Map<string, UserStatusStory[]>();
    stories.forEach((s) => {
      const list = map.get(s.userId) || [];
      list.push(s);
      map.set(s.userId, list);
    });
    return Array.from(map.entries()).map(([userId, userStories]) => ({
      userId,
      stories: userStories.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    }));
  };

  const unviewedStories = otherStories.filter(
    (s) => !s.viewedBy?.includes(user?.uid || '')
  );
  const viewedStories = otherStories.filter((s) =>
    s.viewedBy?.includes(user?.uid || '')
  );

  const recentGroups = groupStoriesByUser(unviewedStories);
  const viewedGroups = groupStoriesByUser(viewedStories);

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleOpenStories = (stories: UserStatusStory[]) => {
    setActiveStoryList(stories);
    setIsViewerOpen(true);
  };

  const openCreator = (mode: 'text' | 'image') => {
    if (!statusStoriesEnabled) {
      showToast('Status stories are currently disabled by administrator', 'warning');
      return;
    }
    setCreateMode(mode);
    setIsCreateOpen(true);
  };

  const handlePostDemoStatus = async () => {
    if (!user) return;
    if (!statusStoriesEnabled) {
      showToast('Status stories are currently disabled by administrator', 'warning');
      return;
    }
    await createStatusStory(
      user.uid,
      profile?.displayName || 'DEV CHAT Tester',
      profile?.photoURL,
      'text',
      {
        text: 'Testing DEV CHAT Status Updates by lawrencedev — 3D Emojis & Real-time Sync!',
        backgroundColor: '#075e54',
        fontFamily: 'sans-serif',
      }
    );
    showToast('Status update published!', 'success');
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#0b141a] text-[#e9edef] select-none overflow-hidden">
      {/* Top Header */}
      <div className="flex h-16 items-center justify-between border-b border-[#222d34] bg-[#202c33] px-4 py-3 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          {onBackMobile && (
            <button
              type="button"
              onClick={onBackMobile}
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-full text-[#8696a0] hover:bg-[#111b21] hover:text-white transition"
              title="Back"
              aria-label="Back to chats"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <CircleDashed className="h-5 w-5 text-[#25d366]" />
            <h1 className="text-lg font-semibold text-[#e9edef]">Status Updates</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePostDemoStatus}
            disabled={!statusStoriesEnabled}
            className="flex items-center gap-1.5 rounded-xl bg-[#00a884]/15 border border-[#00a884]/35 px-3 py-2 text-xs font-semibold text-[#25d366] hover:bg-[#00a884]/25 transition disabled:opacity-40"
            title="Publish a quick status story"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Quick Story</span>
            <span className="sm:hidden">Quick</span>
          </button>

          <button
            type="button"
            onClick={() => openCreator('text')}
            disabled={!statusStoriesEnabled}
            className="flex items-center gap-1.5 rounded-xl bg-[#2a3942] px-3.5 py-2 text-xs font-semibold text-[#25d366] hover:bg-[#32434d] transition disabled:opacity-40"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Text Status</span>
          </button>

          <button
            type="button"
            onClick={() => openCreator('image')}
            disabled={!statusStoriesEnabled}
            className="flex items-center gap-1.5 rounded-xl bg-[#00a884] px-3.5 py-2 text-xs font-bold text-[#0b141a] hover:bg-[#06cf9c] transition shadow-md disabled:opacity-40"
          >
            <Camera className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Photo Status</span>
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
            placeholder="Search status updates by contact name or caption..."
            className="w-full rounded-xl bg-[#202c33] border border-[#222d34] pl-10 pr-9 py-2.5 text-xs text-[#e9edef] placeholder-[#8696a0] focus:border-[#00a884] focus:outline-none transition shadow-sm"
          />
          {statusSearch && (
            <button
              type="button"
              onClick={() => setStatusSearch('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8696a0] hover:text-[#e9edef]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* My Status Card */}
        <div className="rounded-2xl border border-[#222d34] bg-[#111b21] p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8696a0]">
              My Status
            </h3>
            {myStories.length > 0 && (
              <span className="tabular-nums text-[11px] font-semibold text-[#25d366]">
                {myStories.length} active update{myStories.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div
            onClick={() => {
              if (myStories.length > 0) {
                handleOpenStories(myStories);
              } else {
                openCreator('text');
              }
            }}
            className="flex items-center justify-between gap-4 p-3 rounded-xl bg-[#202c33]/50 hover:bg-[#202c33] cursor-pointer transition border border-[#222d34]/60"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative flex-shrink-0">
                <div
                  className={`p-0.5 rounded-full ${
                    myStories.length > 0
                      ? 'bg-gradient-to-tr from-[#25d366] to-[#128c7e] ring-2 ring-[#25d366]/40'
                      : ''
                  }`}
                >
                  <Avatar
                    src={profile?.photoURL}
                    name={profile?.displayName || 'My Status'}
                    size="lg"
                  />
                </div>
                {myStories.length === 0 && (
                  <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#00a884] text-[#0b141a] ring-2 ring-[#202c33]">
                    <Plus className="h-3 w-3 stroke-[3]" />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-[#e9edef]">My Status</h4>
                <p className="tabular-nums text-xs text-[#8696a0] truncate">
                  {myStories.length > 0
                    ? `Tap to view your updates • ${formatTime(myStories[0].createdAt)}`
                    : 'Tap to share a 24-hour update'}
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
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2a3942] text-[#25d366] hover:bg-[#32434d] transition disabled:opacity-40"
                title="Create Text Status"
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
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00a884] text-[#0b141a] hover:bg-[#06cf9c] transition shadow-md disabled:opacity-40"
                title="Create Photo Status"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

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
              <p className="font-medium text-[#e9edef]">No recent status updates from contacts</p>
              <p className="text-[11px]">Publish a quick update or share a photo with your contacts!</p>
              <button
                type="button"
                onClick={handlePostDemoStatus}
                disabled={!statusStoriesEnabled}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#00a884] px-4 py-2 text-xs font-bold text-[#0b141a] hover:bg-[#06cf9c] transition shadow-md disabled:opacity-40"
              >
                <Sparkles className="h-4 w-4" />
                <span>Post Quick Status Story</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentGroups.map((g) => {
                const latest = g.stories[0];
                const previewSnippet = latest.text || latest.caption || 'Photo update';
                return (
                  <div
                    key={g.userId}
                    onClick={() => handleOpenStories(g.stories)}
                    className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#111b21] hover:bg-[#202c33] cursor-pointer transition border border-[#222d34] shadow-md group"
                  >
                    <div className="p-0.5 rounded-full bg-gradient-to-tr from-[#25d366] to-[#00a884] ring-2 ring-[#25d366]/60 group-hover:scale-105 transition-transform flex-shrink-0">
                      <Avatar
                        src={latest.userPhotoURL}
                        name={latest.userName}
                        size="md"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-[#e9edef] truncate group-hover:text-[#00a884] transition">
                          {latest.userName}
                        </h4>
                        <span className="tabular-nums text-[10px] text-[#8696a0] flex-shrink-0">
                          {formatTime(latest.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8696a0] truncate mt-0.5">
                        {previewSnippet}
                      </p>
                    </div>
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
              className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-wider text-[#8696a0] px-1 hover:text-[#e9edef] transition"
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
                {viewedGroups.map((g) => {
                  const latest = g.stories[0];
                  return (
                    <div
                      key={g.userId}
                      onClick={() => handleOpenStories(g.stories)}
                      className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#111b21]/70 hover:bg-[#202c33] cursor-pointer transition border border-[#222d34]/60 opacity-85 hover:opacity-100"
                    >
                      <div className="p-0.5 rounded-full ring-1 ring-[#8696a0]/50 flex-shrink-0">
                        <Avatar
                          src={latest.userPhotoURL}
                          name={latest.userName}
                          size="md"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-semibold text-[#e9edef] truncate">
                          {latest.userName}
                        </h4>
                        <p className="tabular-nums text-[11px] text-[#8696a0] truncate mt-0.5">
                          Viewed • {formatTime(latest.createdAt)}
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
          <span>DEV CHAT Status Platform • Developed by <strong className="text-[#00a884]">lawrencedev</strong></span>
        </div>
      </div>

      {/* Create Status Modal */}
      <CreateStatusModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        initialMode={createMode}
      />

      {/* Status Viewer Modal */}
      <StatusViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        stories={activeStoryList}
      />
    </div>
  );
};
