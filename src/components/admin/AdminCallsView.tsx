/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  Video,
  PhoneMissed,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import { CallSession } from '../../types';
import { getAdminCalls } from '../../services/adminService';

export const AdminCallsView: React.FC = () => {
  const [calls, setCalls] = useState<CallSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'audio' | 'video'>('all');

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const data = await getAdminCalls();
      setCalls(data);
    } catch (err) {
      console.error('Error fetching admin calls:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  const totalAudio = calls.filter((c) => c.callType === 'audio').length;
  const totalVideo = calls.filter((c) => c.callType === 'video').length;
  const totalAccepted = calls.filter((c) => c.status === 'accepted' || c.status === 'ended').length;
  const totalMissed = calls.filter((c) => c.status === 'missed' || c.status === 'rejected').length;

  const filtered = calls.filter((c) => {
    if (typeFilter === 'audio') return c.callType === 'audio';
    if (typeFilter === 'video') return c.callType === 'video';
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
      case 'ended':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'ringing':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30 animate-pulse';
      case 'missed':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'rejected':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Privacy Notice */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#0c1317] border border-[#202c33] text-xs text-[#8696a0]">
        <ShieldCheck className="h-5 w-5 text-[#00a884] flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-xs font-bold text-white">Encrypted WebRTC Telemetry</h3>
          <p className="text-[11px] leading-relaxed mt-0.5">
            DEV CHAT establishes peer-to-peer WebRTC connections. In accordance with zero-knowledge
            standards, the server monitors signaling state, connection success, and duration metadata only.
            No audio or video payloads are stored or recorded.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0c1317] border border-[#202c33] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8696a0]">Total Calls</span>
            <PhoneCall className="h-4 w-4 text-[#00a884]" />
          </div>
          <h3 className="text-2xl font-bold text-white tabular-nums">{calls.length}</h3>
          <p className="text-[11px] text-[#8696a0]">All recorded sessions</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0c1317] border border-[#202c33] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8696a0]">Completed Rate</span>
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <h3 className="text-2xl font-bold text-emerald-400 tabular-nums">
            {calls.length > 0 ? `${Math.round((totalAccepted / calls.length) * 100)}%` : '100%'}
          </h3>
          <p className="text-[11px] text-[#8696a0] tabular-nums">{totalAccepted} answered</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0c1317] border border-[#202c33] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8696a0]">Voice / Video Ratio</span>
            <Video className="h-4 w-4 text-purple-400" />
          </div>
          <h3 className="text-2xl font-bold text-white tabular-nums">{totalAudio} : {totalVideo}</h3>
          <p className="text-[11px] text-[#8696a0]">Audio vs Video</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0c1317] border border-[#202c33] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8696a0]">Missed / Rejected</span>
            <PhoneMissed className="h-4 w-4 text-rose-400" />
          </div>
          <h3 className="text-2xl font-bold text-rose-400 tabular-nums">{totalMissed}</h3>
          <p className="text-[11px] text-[#8696a0]">Unanswered sessions</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between bg-[#0c1317] border border-[#202c33] rounded-2xl p-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
          Call Activity Logs ({filtered.length})
        </h3>
        <div className="flex items-center gap-2">
          {(['all', 'audio', 'video'] as const).map((t) => (
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

      {/* Calls Table */}
      <div className="bg-[#0c1317] border border-[#202c33] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111b21] border-b border-[#202c33] text-[#8696a0] uppercase tracking-wider font-bold text-[10px]">
              <tr>
                <th className="py-3 px-4">Caller</th>
                <th className="py-3 px-4">Receiver</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Initiated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202c33]/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-[#8696a0]">
                    Loading call session records...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-[#8696a0]">
                    No call sessions recorded.
                  </td>
                </tr>
              ) : (
                filtered.map((call) => (
                  <tr key={call.id} className="hover:bg-[#111b21]/60 transition">
                    <td className="py-3 px-4 font-semibold text-white">
                      {call.callerName || call.callerId}
                    </td>
                    <td className="py-3 px-4 text-[#8696a0]">
                      {call.receiverName || call.receiverId}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white">
                        {call.callType === 'video' ? (
                          <Video className="h-3.5 w-3.5 text-purple-400" />
                        ) : (
                          <PhoneCall className="h-3.5 w-3.5 text-indigo-400" />
                        )}
                        <span className="capitalize">{call.callType}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(
                          call.status
                        )}`}
                      >
                        {call.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#8696a0] font-mono text-[11px] tabular-nums">
                      {call.createdAt ? new Date(call.createdAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
