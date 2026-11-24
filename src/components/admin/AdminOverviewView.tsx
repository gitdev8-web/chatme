/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Users,
  MessageSquare,
  PhoneCall,
  Video,
  AlertTriangle,
  Activity,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Radio,
  Sparkles,
  Bell,
  Lock,
  BarChart3,
} from 'lucide-react';
import { DashboardMetrics } from '../../types/admin';
import { AdminTab } from './AdminLayout';

interface AdminOverviewViewProps {
  metrics: DashboardMetrics | null;
  loading: boolean;
  onRefresh: () => void;
  onNavigateTab: (tab: AdminTab) => void;
}

export const AdminOverviewView: React.FC<AdminOverviewViewProps> = ({
  metrics,
  loading,
  onRefresh,
  onNavigateTab,
}) => {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  if (loading || !metrics) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div
              key={n}
              className="h-28 rounded-2xl bg-[#111b21] border border-[#202c33] animate-pulse p-4"
            />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: metrics.totalUsers,
      subValue: `+${metrics.newUsersToday} today`,
      icon: Users,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      onClick: () => onNavigateTab('users'),
    },
    {
      title: 'Active Now',
      value: metrics.activeUsersNow,
      subValue: `${Math.round((metrics.activeUsersNow / Math.max(metrics.totalUsers, 1)) * 100)}% engagement`,
      icon: Activity,
      color: 'text-[#25d366]',
      bgColor: 'bg-[#00a884]/10',
      borderColor: 'border-[#00a884]/30',
      onClick: () => onNavigateTab('users'),
    },
    {
      title: 'Total Messages',
      value: metrics.totalMessages,
      subValue: `+${metrics.messagesToday} active today`,
      icon: MessageSquare,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/20',
      onClick: () => onNavigateTab('chats'),
    },
    {
      title: 'Conversations',
      value: metrics.totalConversations,
      subValue: 'Direct & Group Spaces',
      icon: TrendingUp,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      onClick: () => onNavigateTab('chats'),
    },
    {
      title: 'Voice Calls',
      value: metrics.totalVoiceCalls,
      subValue: 'WebRTC P2P Sessions',
      icon: PhoneCall,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
      onClick: () => onNavigateTab('calls'),
    },
    {
      title: 'Video Calls',
      value: metrics.totalVideoCalls,
      subValue: 'HD Live Streams',
      icon: Video,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      onClick: () => onNavigateTab('calls'),
    },
    {
      title: 'Pending Reports',
      value: metrics.pendingReports,
      subValue: metrics.pendingReports > 0 ? 'Action Required' : 'All Clear',
      icon: AlertTriangle,
      color: metrics.pendingReports > 0 ? 'text-amber-400' : 'text-slate-400',
      bgColor: metrics.pendingReports > 0 ? 'bg-amber-500/10' : 'bg-[#111b21]',
      borderColor: metrics.pendingReports > 0 ? 'border-amber-500/30' : 'border-[#202c33]',
      onClick: () => onNavigateTab('reports'),
    },
    {
      title: 'System Latency',
      value: `${metrics.systemHealth.latencyMs} ms`,
      subValue: metrics.systemHealth.database.toUpperCase(),
      icon: Radio,
      color: metrics.systemHealth.latencyMs < 500 ? 'text-emerald-400' : 'text-amber-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      onClick: () => onNavigateTab('system'),
    },
  ];

  const activity = metrics.dailyActivity || [];
  const maxDayVal = Math.max(
    1,
    ...activity.flatMap((d) => [d.users, d.messages, d.calls])
  );
  const totalCalls = metrics.totalVoiceCalls + metrics.totalVideoCalls;
  const voicePct = totalCalls > 0 ? Math.round((metrics.totalVoiceCalls / totalCalls) * 100) : 50;
  const totalReports = metrics.pendingReports + metrics.resolvedReports;
  const resolvedPct = totalReports > 0 ? Math.round((metrics.resolvedReports / totalReports) * 100) : 100;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0c1317] border border-[#202c33] rounded-2xl p-4 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#00a884]" />
            <span>DEV CHAT Platform Health & Traffic Overview</span>
          </h2>
          <p className="text-xs text-[#8696a0] mt-0.5">
            Realtime database telemetry, 7-day activity trends, and active call traffic.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111b21] hover:bg-[#202c33] border border-[#202c33] text-xs font-semibold text-white transition self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5 text-[#00a884]" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={card.onClick}
              className={`p-4 rounded-2xl bg-[#0c1317] border ${card.borderColor} hover:border-[#00a884]/50 cursor-pointer transition-all shadow-md group`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#8696a0] group-hover:text-white transition">
                  {card.title}
                </span>
                <div className={`p-2 rounded-xl ${card.bgColor} ${card.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold tracking-tight text-white tabular-nums">
                  {card.value}
                </h3>
                <p className="text-[11px] text-[#8696a0] tabular-nums">{card.subValue}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 7-Day Activity Chart + Call & Moderation Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 7-Day Activity Grouped Bar Chart (SVG) */}
        <div className="lg:col-span-2 bg-[#0c1317] border border-[#202c33] rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#202c33] pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#00a884]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                7-Day Platform Activity
              </h3>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5 text-[#8696a0]">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#00a884]" />
                Signups
              </span>
              <span className="flex items-center gap-1.5 text-[#8696a0]">
                <span className="h-2.5 w-2.5 rounded-sm bg-cyan-400" />
                Active Chats
              </span>
              <span className="flex items-center gap-1.5 text-[#8696a0]">
                <span className="h-2.5 w-2.5 rounded-sm bg-purple-400" />
                Calls
              </span>
            </div>
          </div>

          {activity.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-xs text-[#8696a0]">
              No activity recorded in the last 7 days.
            </div>
          ) : (
            <div className="relative pt-2">
              <svg
                viewBox="0 0 560 180"
                className="w-full h-48 overflow-visible"
                role="img"
                aria-label="7-Day Platform Activity Chart"
              >
                {/* Horizontal reference gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const y = 145 - ratio * 120;
                  const val = Math.round(maxDayVal * ratio);
                  return (
                    <g key={i}>
                      <line
                        x1="34"
                        y1={y}
                        x2="550"
                        y2={y}
                        stroke="#202c33"
                        strokeDasharray={i === 0 ? undefined : '3 3'}
                        strokeWidth="1"
                      />
                      <text
                        x="26"
                        y={y + 3}
                        textAnchor="end"
                        fill="#8696a0"
                        fontSize="10"
                        fontFamily="monospace"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Grouped Bars for each day */}
                {activity.map((pt, idx) => {
                  const groupWidth = (550 - 44) / activity.length;
                  const baseX = 44 + idx * groupWidth + groupWidth * 0.18;
                  const barW = Math.min(12, (groupWidth * 0.64) / 3 - 2);
                  const hUsers = Math.max(pt.users > 0 ? 4 : 0, (pt.users / maxDayVal) * 120);
                  const hMsgs = Math.max(pt.messages > 0 ? 4 : 0, (pt.messages / maxDayVal) * 120);
                  const hCalls = Math.max(pt.calls > 0 ? 4 : 0, (pt.calls / maxDayVal) * 120);
                  const isHovered = hoveredDay === idx;

                  return (
                    <g
                      key={pt.date}
                      onMouseEnter={() => setHoveredDay(idx)}
                      onMouseLeave={() => setHoveredDay(null)}
                      className="cursor-pointer"
                    >
                      {isHovered && (
                        <rect
                          x={44 + idx * groupWidth + 2}
                          y={16}
                          width={groupWidth - 4}
                          height={132}
                          rx={8}
                          fill="#111b21"
                          opacity={0.75}
                        />
                      )}
                      <rect
                        x={baseX}
                        y={145 - hUsers}
                        width={barW}
                        height={hUsers}
                        rx={3}
                        fill="#00a884"
                      />
                      <rect
                        x={baseX + barW + 3}
                        y={145 - hMsgs}
                        width={barW}
                        height={hMsgs}
                        rx={3}
                        fill="#22d3ee"
                      />
                      <rect
                        x={baseX + (barW + 3) * 2}
                        y={145 - hCalls}
                        width={barW}
                        height={hCalls}
                        rx={3}
                        fill="#c084fc"
                      />
                      <text
                        x={44 + idx * groupWidth + groupWidth / 2}
                        y={166}
                        textAnchor="middle"
                        fill={isHovered ? '#e9edef' : '#8696a0'}
                        fontSize="11"
                        fontWeight={isHovered ? '700' : '500'}
                      >
                        {pt.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Dynamic Day Readout */}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#111b21] border border-[#202c33]/70 px-3.5 py-2 text-[11px]">
                {hoveredDay !== null && activity[hoveredDay] ? (
                  <>
                    <span className="font-semibold text-white tabular-nums">
                      {activity[hoveredDay].date} ({activity[hoveredDay].label})
                    </span>
                    <div className="flex items-center gap-4 tabular-nums">
                      <span className="text-emerald-400 font-semibold">
                        {activity[hoveredDay].users} new users
                      </span>
                      <span className="text-cyan-400 font-semibold">
                        {activity[hoveredDay].messages} active chats
                      </span>
                      <span className="text-purple-400 font-semibold">
                        {activity[hoveredDay].calls} calls
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-[#8696a0]">
                      Hover any day column to inspect daily totals
                    </span>
                    <span className="text-[#00a884] font-semibold tabular-nums">
                      7-day total: {activity.reduce((s, d) => s + d.users, 0)} users •{' '}
                      {activity.reduce((s, d) => s + d.messages, 0)} chats •{' '}
                      {activity.reduce((s, d) => s + d.calls, 0)} calls
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Call Mix & Capacity Breakdown */}
        <div className="bg-[#0c1317] border border-[#202c33] rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="border-b border-[#202c33] pb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Traffic Breakdown
            </h3>
            <span className="text-[11px] font-mono text-[#8696a0] tabular-nums">
              {metrics.storageUsedMb} MB est.
            </span>
          </div>

          <div className="space-y-4">
            {/* Voice vs Video */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8696a0]">Voice vs Video Calls</span>
                <span className="text-white font-semibold tabular-nums">
                  {metrics.totalVoiceCalls} / {metrics.totalVideoCalls}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[#111b21] overflow-hidden flex border border-[#202c33]">
                <div
                  className="h-full bg-indigo-400 transition-all"
                  style={{ width: `${voicePct}%` }}
                />
                <div
                  className="h-full bg-purple-400 transition-all"
                  style={{ width: `${100 - voicePct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[#8696a0] tabular-nums">
                <span>Voice ({voicePct}%)</span>
                <span>Video ({100 - voicePct}%)</span>
              </div>
            </div>

            {/* Report Resolution Rate */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8696a0]">Moderation Resolution</span>
                <span className="text-emerald-400 font-semibold tabular-nums">
                  {resolvedPct}%
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[#111b21] overflow-hidden border border-[#202c33]">
                <div
                  className="h-full bg-[#00a884] transition-all"
                  style={{ width: `${resolvedPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[#8696a0] tabular-nums">
                <span>Resolved: {metrics.resolvedReports}</span>
                <span>Pending: {metrics.pendingReports}</span>
              </div>
            </div>

            {/* Active Ratio */}
            <div className="p-3 rounded-xl bg-[#111b21] border border-[#202c33]/70 flex items-center justify-between text-xs">
              <span className="text-[#8696a0]">Active Spaces</span>
              <span className="font-bold text-white tabular-nums">
                {metrics.totalConversations} rooms
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Realtime Traffic & System Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* System Health Module */}
        <div className="bg-[#0c1317] border border-[#202c33] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#202c33] pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#00a884]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Infrastructure Status
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('system')}
              className="text-[11px] text-[#00a884] hover:underline font-semibold"
            >
              Full Diagnostics →
            </button>
          </div>

          <div className="space-y-2.5">
            {[
              { label: 'Firestore Database', status: metrics.systemHealth.database },
              { label: 'Firebase Authentication', status: metrics.systemHealth.auth },
              { label: 'Messaging Realtime Sync', status: metrics.systemHealth.messaging },
              { label: 'WebRTC Signaling', status: metrics.systemHealth.webrtc },
              { label: 'PWA Service Worker', status: metrics.systemHealth.pwa },
            ].map((srv, idx) => {
              const isOk = srv.status === 'operational';
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#111b21] border border-[#202c33]/60 text-xs"
                >
                  <span className="text-[#8696a0]">{srv.label}</span>
                  <span
                    className={`flex items-center gap-1.5 font-semibold text-[11px] ${
                      isOk ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isOk ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                    {isOk ? 'Operational' : srv.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Moderation Queue Alert */}
        <div className="lg:col-span-2 bg-[#0c1317] border border-[#202c33] rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#202c33] pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Moderation & Security Alerts
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('reports')}
                className="text-[11px] text-[#00a884] hover:underline font-semibold tabular-nums"
              >
                View All Reports ({metrics.pendingReports}) →
              </button>
            </div>

            {metrics.pendingReports === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-400/80 mb-1" />
                <h4 className="text-xs font-bold text-white">No Pending Reports</h4>
                <p className="text-[11px] text-[#8696a0] max-w-sm">
                  The moderation queue is clear. All user reports and security flags have been
                  reviewed and resolved.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-amber-200 tabular-nums">
                    {metrics.pendingReports} Pending Moderation Report(s)
                  </h4>
                  <p className="text-[11px] text-amber-300/80 leading-relaxed">
                    Users have submitted reports regarding suspicious behavior or chat violations.
                    Please review pending reports in the Moderation Hub.
                  </p>
                  <button
                    onClick={() => onNavigateTab('reports')}
                    className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-400 text-[#111b21] font-bold text-[11px] hover:bg-amber-300 transition"
                  >
                    Review Queue
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Shortcuts Bar */}
          <div className="pt-3 border-t border-[#202c33] grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => onNavigateTab('users')}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#111b21] hover:bg-[#202c33] border border-[#202c33] text-[11px] font-semibold text-[#8696a0] hover:text-white transition"
            >
              <Users className="h-3.5 w-3.5 text-[#00a884]" />
              <span>Manage Users</span>
            </button>
            <button
              onClick={() => onNavigateTab('notifications')}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#111b21] hover:bg-[#202c33] border border-[#202c33] text-[11px] font-semibold text-[#8696a0] hover:text-white transition"
            >
              <Bell className="h-3.5 w-3.5 text-cyan-400" />
              <span>Broadcast Note</span>
            </button>
            <button
              onClick={() => onNavigateTab('security')}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#111b21] hover:bg-[#202c33] border border-[#202c33] text-[11px] font-semibold text-[#8696a0] hover:text-white transition"
            >
              <Lock className="h-3.5 w-3.5 text-amber-400" />
              <span>Audit Trail</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
