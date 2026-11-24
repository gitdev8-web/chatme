/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  Users,
  Lock,
  Layers,
  X,
} from 'lucide-react';
import { Conversation } from '../../types';
import { getAdminConversations } from '../../services/adminService';
import { Avatar } from '../common/Avatar';

interface AdminChatsViewProps {
  onOpenConversation?: (convId: string) => void;
}

export const AdminChatsView: React.FC<AdminChatsViewProps> = ({
  onOpenConversation,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'direct' | 'group'>('all');

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const data = await getAdminConversations(searchTerm);
      setConversations(data);
    } catch (err) {
      console.error('Error fetching admin conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [searchTerm]);

  const filtered = conversations.filter((c) => {
    if (typeFilter === 'direct') return c.type === 'direct';
    if (typeFilter === 'group') return c.type === 'group';
    return true;
  });

  const totalDirect = conversations.filter((c) => c.type === 'direct').length;
  const totalGroup = conversations.filter((c) => c.type === 'group').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Privacy Notice Banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#0c1317] border border-[#202c33] text-xs text-[#8696a0]">
        <Lock className="h-5 w-5 text-[#00a884] flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-white">Privacy-First Architecture</h3>
          <p className="leading-relaxed text-[11px]">
            In compliance with zero-trust privacy standards, administrative views only expose conversation metadata,
            participant statistics, and flagged timestamps. Private message payloads are restricted to end users unless
            specifically cited in an active moderation report.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#0c1317] border border-[#202c33] flex items-center justify-between">
          <div>
            <span className="text-xs text-[#8696a0] font-semibold">Total Spaces</span>
            <h4 className="text-xl font-bold text-white mt-1">{conversations.length}</h4>
          </div>
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
            <MessageSquare className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0c1317] border border-[#202c33] flex items-center justify-between">
          <div>
            <span className="text-xs text-[#8696a0] font-semibold">Direct 1-to-1 DMs</span>
            <h4 className="text-xl font-bold text-white mt-1">{totalDirect}</h4>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0c1317] border border-[#202c33] flex items-center justify-between">
          <div>
            <span className="text-xs text-[#8696a0] font-semibold">Group Communities</span>
            <h4 className="text-xl font-bold text-white mt-1">{totalGroup}</h4>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
            <Layers className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Search & Type Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0c1317] border border-[#202c33] rounded-2xl p-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696a0]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search conversations by space name or ID..."
            className="w-full rounded-xl bg-[#111b21] border border-[#202c33] pl-10 pr-8 py-2 text-xs text-white placeholder-[#8696a0] focus:border-[#00a884] focus:outline-none transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8696a0] hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'direct', 'group'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                typeFilter === t
                  ? 'bg-[#00a884] text-[#111b21]'
                  : 'bg-[#111b21] text-[#8696a0] hover:text-white border border-[#202c33]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-[#8696a0] text-xs">
            Loading space telemetry...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-[#8696a0] text-xs">
            No conversation spaces found.
          </div>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-2xl bg-[#0c1317] border border-[#202c33] hover:border-[#00a884]/40 transition space-y-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar src={c.photoURL} name={c.name || 'Conversation'} size="md" />
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">
                      {c.name || (c.type === 'direct' ? 'Direct Message' : 'Group Channel')}
                    </h4>
                    <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#111b21] text-[#00a884] border border-[#202c33] mt-0.5">
                      {c.type}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-[11px] text-[#8696a0] pt-1 border-t border-[#202c33]/60">
                <div className="flex items-center justify-between">
                  <span>Participants:</span>
                  <span className="font-semibold text-white">{c.participantIds?.length || 0} members</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Created:</span>
                  <span className="text-white">
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last Activity:</span>
                  <span className="text-[#25d366] font-mono text-[10px]">
                    {c.lastMessage?.timestamp
                      ? new Date(c.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
