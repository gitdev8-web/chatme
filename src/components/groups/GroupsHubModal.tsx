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
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { Avatar } from '../common/Avatar';
import { Modal } from '../common/Modal';

interface GroupsHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateGroup: () => void;
}

export const GroupsHubModal: React.FC<GroupsHubModalProps> = ({
  isOpen,
  onClose,
  onOpenCreateGroup,
}) => {
  const { user } = useAuth();
  const { conversations, setActiveConversationId, setActiveFilter } = useChat();
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

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
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Groups & Communities"
      subtitle="Join group channels, create team spaces and collaborate"
      maxWidth="md"
    >
      <div className="space-y-4 select-none">
        {/* Header Action Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696a0]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search your groups..."
              className="w-full rounded-xl border border-[#222d34] bg-[#202c33] pl-10 pr-4 py-2 text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#25d366] focus:outline-none transition"
            />
          </div>

          <button
            onClick={() => {
              onClose();
              onOpenCreateGroup();
            }}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#25d366] to-[#00a884] px-4 py-2 text-xs font-bold text-white shadow-md hover:from-[#20bd5a] hover:to-[#009374] transition flex-shrink-0"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>New Group</span>
          </button>
        </div>

        {/* Group list */}
        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
          {filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center rounded-2xl bg-[#202c33]/40 border border-[#222d34]">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25d366]/10 text-[#25d366] mb-3">
                <Users className="h-6 w-6" />
              </div>
              <h4 className="text-xs font-bold text-white">No groups found</h4>
              <p className="text-[11px] text-[#8696a0] max-w-xs mt-1">
                {searchTerm
                  ? 'No groups match your search query.'
                  : "You haven't joined or created any groups yet. Start your first group now!"}
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenCreateGroup();
                }}
                className="mt-4 flex items-center gap-1.5 rounded-xl bg-[#00a884] px-4 py-2 text-xs font-semibold text-white hover:bg-[#009374] transition"
              >
                <Plus className="h-4 w-4" />
                <span>Create Group</span>
              </button>
            </div>
          ) : (
            filteredGroups.map((group) => {
              const isAdmin = group.adminIds?.includes(user?.uid || '');
              const memberCount = group.participantIds?.length || 0;
              const unread = group.unreadCounts?.[user?.uid || ''] || 0;

              return (
                <div
                  key={group.id}
                  onClick={() => handleSelectGroup(group.id)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#202c33] hover:bg-[#2a3942] cursor-pointer transition border border-[#222d34]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={group.photoURL}
                      name={group.name || 'Group'}
                      size="md"
                    />
                    <div className="min-w-0 truncate">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-[#e9edef] truncate">
                          {group.name}
                        </h4>
                        {isAdmin && (
                          <span className="flex items-center gap-0.5 rounded bg-[#25d366]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#25d366]">
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
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#25d366] px-1.5 text-[10px] font-bold text-black">
                        {unread}
                      </span>
                    )}
                    <button className="flex items-center gap-1 rounded-xl bg-[#111b21] px-3 py-1.5 text-xs font-semibold text-[#25d366] hover:bg-[#25d366] hover:text-black transition">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Chat</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};
