/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Users,
  MessageSquare,
  PhoneCall,
  Video,
  AlertTriangle,
  Activity,
  TrendingUp,
  Clock,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  HardDrive,
  Radio,
  Sparkles,
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
      subValue: `+${metrics.messagesToday} sent today`,
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
            Realtime database telemetry, moderation alerts, and active call traffic.
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
                <h3 className="text-2xl font-bold tracking-tight text-white">
                  {card.value}
                </h3>
                <p className="text-[11px] text-[#8696a0]">{card.subValue}</p>
              </div>
            </div>
          );
        })}
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
            ].map((srv, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#111b21] border border-[#202c33]/60 text-xs"
              >
                <span className="text-[#8696a0]">{srv.label}</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Operational
                </span>
              </div>
            ))}
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
                className="text-[11px] text-[#00a884] hover:underline font-semibold"
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
                  <h4 className="text-xs font-bold text-amber-200">
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
          <div className="pt-3 border-t border-[#202c33] grid grid-cols-3 gap-2">
            <button
              onClick={() => onNavigateTab('users')}
              className="py-2 px-3 rounded-xl bg-[#111b21] hover:bg-[#202c33] border border-[#202c33] text-[11px] font-semibold text-[#8696a0] hover:text-white transition text-center"
            >
              👥 Manage Users
            </button>
            <button
              onClick={() => onNavigateTab('notifications')}
              className="py-2 px-3 rounded-xl bg-[#111b21] hover:bg-[#202c33] border border-[#202c33] text-[11px] font-semibold text-[#8696a0] hover:text-white transition text-center"
            >
              📢 Broadcast Note
            </button>
            <button
              onClick={() => onNavigateTab('security')}
              className="py-2 px-3 rounded-xl bg-[#111b21] hover:bg-[#202c33] border border-[#202c33] text-[11px] font-semibold text-[#8696a0] hover:text-white transition text-center"
            >
              🔒 Audit Trail
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
