/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  MessageSquare,
  Shield,
  Sparkles,
  ArrowLeft,
  Globe,
  Radio,
  Check,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { Avatar } from '../common/Avatar';
import { CreateGroupModal } from './CreateGroupModal';
import { useToast } from '../common/Toast';

interface CommunitiesPageProps {
  onBackMobile?: () => void;
  onOpenCreateGroup?: () => void;
}

export const CommunitiesPage: React.FC<CommunitiesPageProps> = ({
  onBackMobile,
  onOpenCreateGroup,
}) => {
  const { user } = useAuth();
  const {
    conversations,
    setActiveConversationId,
    setActiveFilter,
    createNewGroup,
  } = useChat();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const groupConversations = conversations.filter((c) => c.type === 'group');

  const filteredGroups = groupConversations.filter((g) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const gName = (g.name || '').toLowerCase();
    const gDesc = (g.description || '').toLowerCase();
    return gName.includes(term) || gDesc.includes(term);
  });

  const handleSelectGroup = (groupId: string) => {
    setActiveConversationId(groupId);
    setActiveFilter('groups');
  };

  const handleJoinFeaturedCommunity = async (
    name: string,
    desc: string,
    photoURL: string
  ) => {
    if (!user) return;
    try {
      // Check if group already exists
      const existing = groupConversations.find(
        (g) => g.name?.toLowerCase() === name.toLowerCase()
      );
      if (existing) {
        handleSelectGroup(existing.id);
        showToast(`Joined ${name}!`, 'success');
        return;
      }

      const newId = await createNewGroup(name, desc, photoURL, []);
      setActiveConversationId(newId);
      setActiveFilter('groups');
      showToast(`Created community: ${name}!`, 'success');
    } catch {
      showToast('Failed to join community', 'error');
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#0b141a] text-[#e9edef] select-none overflow-hidden">
      {/* Top Header */}
      <div className="flex h-16 items-center justify-between border-b border-[#222d34] bg-[#202c33] px-4 py-3 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          {onBackMobile && (
            <button
              onClick={onBackMobile}
              className="md:hidden rounded-full p-1.5 text-[#8696a0] hover:bg-[#111b21] hover:text-white transition"
              title="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-[#00a884]" />
            <h1 className="text-lg font-semibold text-[#e9edef]">Communities</h1>
          </div>
        </div>

        <button
          onClick={() => {
            if (onOpenCreateGroup) {
              onOpenCreateGroup();
            } else {
              setIsCreateModalOpen(true);
            }
          }}
          className="flex items-center gap-1.5 rounded-full bg-[#00a884] px-4 py-2 text-xs font-bold text-[#111b21] hover:bg-[#06cf9c] transition shadow-md"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>New Community</span>
        </button>
      </div>

      {/* Main Page Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-5xl mx-auto w-full pb-20 md:pb-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696a0]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search communities and groups..."
            className="w-full rounded-2xl bg-[#202c33] border border-[#222d34] pl-10 pr-4 py-3 text-xs text-[#e9edef] placeholder-[#8696a0] focus:border-[#00a884] focus:outline-none transition shadow-sm"
          />
        </div>

        {/* Featured Communities Banner */}
        <div className="rounded-3xl border border-[#00a884]/30 bg-gradient-to-r from-[#111b21] via-[#1a2b32] to-[#111b21] p-5 shadow-xl relative overflow-hidden space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#25d366]" />
              <h2 className="text-sm font-bold text-[#e9edef]">
                Recommended Developer Communities
              </h2>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#00a884] bg-[#00a884]/20 px-2.5 py-1 rounded-full">
              Official Hubs
            </span>
          </div>

          <p className="text-xs text-[#8696a0] leading-relaxed">
            Connect with fellow developers worldwide! Join public topic channels or launch your own group community.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {[
              {
                name: 'React & Web Engineers ⚡',
                desc: 'Frontend architecture, Vite, React & Tailwind CSS discussions.',
                photo: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=150&auto=format&fit=crop&q=80',
              },
              {
                name: 'Backend & Cloud DevOps 🚀',
                desc: 'Node.js, PostgreSQL, Cloud SQL, Firebase & Microservices.',
                photo: 'https://images.unsplash.com/photo-1618401471353-b98aedd04e11?w=150&auto=format&fit=crop&q=80',
              },
              {
                name: 'AI & ML Innovations 🤖',
                desc: 'Generative AI, Gemini API, Agents, and LLM Applications.',
                photo: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=150&auto=format&fit=crop&q=80',
              },
            ].map((f) => (
              <div
                key={f.name}
                className="flex flex-col justify-between p-3.5 rounded-2xl bg-[#202c33]/70 hover:bg-[#202c33] border border-[#222d34] transition space-y-3"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={f.photo}
                    alt={f.name}
                    className="h-10 w-10 rounded-xl object-cover border border-[#00a884]/30"
                  />
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-[#e9edef] truncate">{f.name}</h4>
                    <p className="text-[11px] text-[#8696a0] line-clamp-2 mt-0.5">{f.desc}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleJoinFeaturedCommunity(f.name, f.desc, f.photo)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#00a884]/20 border border-[#00a884]/40 py-1.5 text-xs font-bold text-[#25d366] hover:bg-[#00a884] hover:text-[#111b21] transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Join Community</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Your Joined Communities List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8696a0]">
              Your Communities & Groups ({filteredGroups.length})
            </h3>
          </div>

          {filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-3xl bg-[#111b21] border border-[#222d34] p-6 space-y-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#00a884]/20 text-[#00a884] mb-1">
                <Users className="h-7 w-7" />
              </div>
              <h4 className="text-sm font-bold text-[#e9edef]">No communities joined yet</h4>
              <p className="text-xs text-[#8696a0] max-w-sm">
                {searchTerm
                  ? 'No community matches your search query.'
                  : 'Start your own developer community or join one of our featured official channels above!'}
              </p>
              <button
                onClick={() => {
                  if (onOpenCreateGroup) {
                    onOpenCreateGroup();
                  } else {
                    setIsCreateModalOpen(true);
                  }
                }}
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-[#00a884] px-4 py-2 text-xs font-bold text-[#111b21] hover:bg-[#06cf9c] transition shadow-md"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                <span>Create First Community</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredGroups.map((group) => {
                const isAdmin = group.adminIds?.includes(user?.uid || '');
                const memberCount = group.participantIds?.length || 0;
                const unread = group.unreadCounts?.[user?.uid || ''] || 0;

                return (
                  <div
                    key={group.id}
                    onClick={() => handleSelectGroup(group.id)}
                    className="flex items-center justify-between p-4 rounded-2xl bg-[#111b21] hover:bg-[#202c33] cursor-pointer transition border border-[#222d34] shadow-md group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Avatar
                        src={group.photoURL}
                        name={group.name || 'Group'}
                        size="lg"
                      />
                      <div className="min-w-0 truncate">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-[#e9edef] truncate group-hover:text-[#00a884] transition">
                            {group.name}
                          </h4>
                          {isAdmin && (
                            <span className="flex items-center gap-0.5 rounded bg-[#00a884]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#00a884]">
                              <Shield className="h-2.5 w-2.5" />
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#8696a0] truncate mt-0.5">
                          {group.description || `${memberCount} members`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {unread > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#25d366] px-1.5 text-[10px] font-bold text-[#111b21]">
                          {unread}
                        </span>
                      )}
                      <button className="flex items-center gap-1.5 rounded-xl bg-[#202c33] group-hover:bg-[#00a884] group-hover:text-[#111b21] px-3.5 py-2 text-xs font-semibold text-[#25d366] transition shadow-sm">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Chat</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Developer Credit Footer */}
        <div className="pt-8 text-center text-xs text-[#8696a0]/70 flex flex-col items-center justify-center gap-1 border-t border-[#222d34]/40 mt-8">
          <div className="flex items-center gap-1.5 font-medium text-[#8696a0]">
            <Sparkles className="h-3.5 w-3.5 text-[#00a884]" />
            <span>DEV CHAT Communities • Developed by <strong className="text-[#00a884]">lawrencedev</strong></span>
          </div>
        </div>
      </div>

      {/* Create Group / Community Modal */}
      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};
