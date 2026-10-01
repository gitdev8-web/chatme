/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Plus,
  Camera,
  Edit2,
  ChevronDown,
  ChevronRight,
  Eye,
  Loader2,
  Sparkles,
  Search,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { UserStatusStory } from '../../types';
import { subscribeToStatusStories, createStatusStory } from '../../services/statusService';
import { Avatar } from '../common/Avatar';
import { CreateStatusModal } from './CreateStatusModal';
import { StatusViewerModal } from './StatusViewerModal';
import { Modal } from '../common/Modal';

interface StatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({ isOpen, onClose }) => {
  const { user, profile } = useAuth();
  const { userCache, statusStories } = useChat();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<'text' | 'image'>('text');
  const [activeStoryList, setActiveStoryList] = useState<UserStatusStory[]>([]);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [showViewedSection, setShowViewedSection] = useState(true);
  const [statusSearch, setStatusSearch] = useState('');

  if (!isOpen) return null;

  // Enrich status stories with latest userCache info
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

  // Apply search query filter if typed
  if (statusSearch.trim()) {
    const q = statusSearch.toLowerCase();
    otherStories = otherStories.filter(
      (s) =>
        s.userName.toLowerCase().includes(q) ||
        (s.text && s.text.toLowerCase().includes(q)) ||
        (s.caption && s.caption.toLowerCase().includes(q))
    );
  }

  // Group other stories by user
  const groupedByUser: Record<string, UserStatusStory[]> = {};
  otherStories.forEach((s) => {
    if (!groupedByUser[s.userId]) {
      groupedByUser[s.userId] = [];
    }
    groupedByUser[s.userId].push(s);
  });

  const recentGroups: { userId: string; stories: UserStatusStory[] }[] = [];
  const viewedGroups: { userId: string; stories: UserStatusStory[] }[] = [];

  Object.entries(groupedByUser).forEach(([uid, uStories]) => {
    // If any story in the group is unviewed by current user -> recent, else viewed
    const hasUnviewed = uStories.some((s) => !s.viewedBy?.includes(user?.uid || ''));
    if (hasUnviewed) {
      recentGroups.push({ userId: uid, stories: uStories });
    } else {
      viewedGroups.push({ userId: uid, stories: uStories });
    }
  });

  const handleOpenStories = (stories: UserStatusStory[]) => {
    setActiveStoryList(stories);
    setIsViewerOpen(true);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return `Today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Status"
        subtitle="Share photos, videos and updates that disappear after 24 hours"
        maxWidth="md"
      >
        <div className="space-y-5 select-none relative">
          {/* My Status Section */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#202c33] border border-[#222d34]">
            <div
              onClick={() => {
                if (myStories.length > 0) {
                  handleOpenStories(myStories);
                } else {
                  setCreateMode('text');
                  setIsCreateOpen(true);
                }
              }}
              className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
            >
              <div className="relative">
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
                  <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#00a884] text-white ring-2 ring-[#202c33]">
                    <Plus className="h-3 w-3 stroke-[3]" />
                  </div>
                )}
              </div>

              <div className="min-w-0 truncate">
                <h4 className="text-xs font-bold text-[#e9edef] truncate">My Status</h4>
                <p className="text-[11px] text-[#8696a0] truncate">
                  {myStories.length > 0
                    ? `${myStories.length} update${myStories.length > 1 ? 's' : ''} • ${formatTime(
                        myStories[0].createdAt
                      )}`
                    : 'Tap to add status update'}
                </p>
              </div>
            </div>

            {/* Quick Actions for My Status */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={async () => {
                  if (user) {
                    await createStatusStory(
                      user.uid,
                      profile?.displayName || 'DEV CHAT Tester',
                      profile?.photoURL,
                      'text',
                      {
                        text: '🚀 Testing DEV CHAT 3D Emojis 🔥 and Status Updates! ✨',
                        backgroundColor: '#075e54',
                        fontFamily: 'sans-serif',
                      }
                    );
                  }
                }}
                className="flex items-center gap-1 rounded-full bg-[#00a884]/20 border border-[#00a884]/40 px-2.5 py-1 text-[11px] font-semibold text-[#25d366] hover:bg-[#00a884]/30 transition"
                title="Publish a sample demo status instantly"
              >
                <Sparkles className="h-3 w-3" />
                <span>Demo Status</span>
              </button>

              <button
                onClick={() => {
                  setCreateMode('text');
                  setIsCreateOpen(true);
                }}
                className="rounded-full bg-[#2a3942] p-2 text-[#25d366] hover:bg-[#32434d] transition shadow-sm"
                title="Create Text Status"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  setCreateMode('image');
                  setIsCreateOpen(true);
                }}
                className="rounded-full bg-[#00a884] p-2 text-white hover:bg-[#009374] transition shadow-md"
                title="Create Photo Status"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Status Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8696a0]" />
            <input
              type="text"
              value={statusSearch}
              onChange={(e) => setStatusSearch(e.target.value)}
              placeholder="Search status updates by contact name..."
              className="w-full rounded-xl bg-[#202c33] border border-[#222d34] pl-9 pr-4 py-2 text-xs text-[#e9edef] placeholder-[#8696a0] focus:border-[#00a884] focus:outline-none transition"
            />
          </div>

          {/* Recent Updates */}
          <div className="space-y-2">
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#8696a0] px-1">
              Recent Updates
            </h5>

            {recentGroups.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#8696a0] rounded-2xl bg-[#202c33]/40 border border-[#222d34]/60 p-4 space-y-2">
                <p>No recent status updates from your contacts.</p>
                <button
                  onClick={() => {
                    setCreateMode('text');
                    setIsCreateOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#00a884] px-3.5 py-1.5 text-xs font-semibold text-[#111b21] hover:bg-[#06cf9c] transition shadow-sm mt-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Post your first status</span>
                </button>
              </div>
            ) : (
              recentGroups.map((g) => {
                const latest = g.stories[0];
                return (
                  <div
                    key={g.userId}
                    onClick={() => handleOpenStories(g.stories)}
                    className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#202c33]/60 hover:bg-[#202c33] cursor-pointer transition border border-[#222d34]"
                  >
                    {/* Status Gradient Ring */}
                    <div className="p-0.5 rounded-full bg-gradient-to-tr from-[#25d366] to-[#00a884] ring-2 ring-[#25d366]/60">
                      <Avatar
                        src={latest.userPhotoURL}
                        name={latest.userName}
                        size="md"
                      />
                    </div>
                    <div className="min-w-0 flex-1 truncate">
                      <h4 className="text-xs font-semibold text-[#e9edef] truncate">
                        {latest.userName}
                      </h4>
                      <p className="text-[11px] text-[#8696a0] truncate">
                        {formatTime(latest.createdAt)}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-[#25d366] bg-[#25d366]/10 px-2 py-0.5 rounded-full">
                      {g.stories.length} new
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Viewed Updates Section */}
          {viewedGroups.length > 0 && (
            <div className="space-y-2 pt-1">
              <button
                onClick={() => setShowViewedSection(!showViewedSection)}
                className="flex items-center justify-between w-full text-[11px] font-bold uppercase tracking-wider text-[#8696a0] px-1 hover:text-white transition"
              >
                <span>Viewed Updates ({viewedGroups.length})</span>
                {showViewedSection ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>

              {showViewedSection && (
                <div className="space-y-2">
                  {viewedGroups.map((g) => {
                    const latest = g.stories[0];
                    return (
                      <div
                        key={g.userId}
                        onClick={() => handleOpenStories(g.stories)}
                        className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#202c33]/40 hover:bg-[#202c33] cursor-pointer opacity-75 hover:opacity-100 transition border border-[#222d34]"
                      >
                        {/* Grey Viewed Ring */}
                        <div className="p-0.5 rounded-full bg-[#8696a0]/40 ring-1 ring-[#8696a0]/30">
                          <Avatar
                            src={latest.userPhotoURL}
                            name={latest.userName}
                            size="md"
                          />
                        </div>
                        <div className="min-w-0 flex-1 truncate">
                          <h4 className="text-xs font-semibold text-[#e9edef] truncate">
                            {latest.userName}
                          </h4>
                          <p className="text-[11px] text-[#8696a0] truncate">
                            {formatTime(latest.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Create Status Modal */}
      <CreateStatusModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        initialMode={createMode}
      />

      {/* Fullscreen Story Viewer */}
      <StatusViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        stories={activeStoryList}
      />
    </>
  );
};
