/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Ban,
  ArrowRight,
} from 'lucide-react';
import { ModerationReportItem } from '../../types/admin';
import { updateReportStatus, updateUserStatus } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';

interface AdminReportsViewProps {
  reports: ModerationReportItem[];
  loading: boolean;
  onRefresh: () => void;
}

export const AdminReportsView: React.FC<AdminReportsViewProps> = ({
  reports,
  loading,
  onRefresh,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reviewing' | 'resolved' | 'dismissed'>('all');
  const [selectedReport, setSelectedReport] = useState<ModerationReportItem | null>(null);
  const [moderatorNotes, setModeratorNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<ModerationReportItem | null>(null);

  const filtered = reports.filter((r) => {
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  });

  const handleUpdateStatus = async (
    reportId: string,
    newStatus: 'pending' | 'reviewing' | 'resolved' | 'dismissed'
  ) => {
    if (!user) return;
    setActionLoading(true);
    try {
      await updateReportStatus(reportId, newStatus, moderatorNotes, {
        id: user.uid,
        email: user.email || 'admin@devchat.app',
      });
      showToast(`Report status updated to ${newStatus}`, 'success');
      setSelectedReport(null);
      setModeratorNotes('');
      onRefresh();
    } catch (err) {
      showToast('Failed to update report', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmSuspend = async () => {
    if (!user || !suspendTarget) return;
    setActionLoading(true);
    try {
      await updateUserStatus(suspendTarget.reportedUserId, true, {
        id: user.uid,
        email: user.email || 'admin@devchat.app',
      });
      showToast('Reported user suspended', 'success');
      setSuspendTarget(null);
      onRefresh();
    } catch {
      showToast('Failed to suspend user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'high':
        return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'pending':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'reviewing':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'resolved':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'dismissed':
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
      default:
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0c1317] border border-[#202c33] rounded-2xl p-4 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span>Moderation & Incident Reports ({filtered.length})</span>
          </h2>
          <p className="text-xs text-[#8696a0] mt-0.5">
            Audit reported messages, spam complaints, and user violations.
          </p>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(['all', 'pending', 'reviewing', 'resolved', 'dismissed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                statusFilter === s
                  ? 'bg-[#00a884] text-[#111b21]'
                  : 'bg-[#111b21] text-[#8696a0] hover:text-white border border-[#202c33]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-[#8696a0] text-xs">
            Loading moderation records...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center bg-[#0c1317] border border-[#202c33] rounded-2xl p-6 space-y-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-400/80 mb-1" />
            <h4 className="text-xs font-bold text-white">No Reports in this View</h4>
            <p className="text-[11px] text-[#8696a0] max-w-sm">
              There are no reports matching the selected status filter.
            </p>
          </div>
        ) : (
          filtered.map((r) => (
            <div
              key={r.id}
              className="p-5 rounded-2xl bg-[#0c1317] border border-[#202c33] hover:border-[#00a884]/40 transition space-y-3.5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getPriorityBadge(
                        r.priority
                      )}`}
                    >
                      {r.priority}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getStatusBadge(
                        r.status
                      )}`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white">{r.reason}</h4>
                </div>
                <span className="text-[10px] text-[#8696a0] font-mono">
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>

              <p className="text-xs text-[#8696a0] bg-[#111b21] p-3 rounded-xl border border-[#202c33]/60 leading-relaxed">
                "{r.description || 'No detailed statement provided.'}"
              </p>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-[#8696a0] pt-1">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-[#8696a0]/70">Reporter:</span>
                  <span className="text-white font-mono text-[10px] truncate block">
                    {r.reporterName || r.reporterId}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-[#8696a0]/70">Reported User:</span>
                  <span className="text-rose-400 font-mono text-[10px] truncate block">
                    {r.reportedUserName || r.reportedUserId}
                  </span>
                </div>
              </div>

              {r.moderatorNotes && (
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px]">
                  <span className="font-bold">Moderator Note:</span> {r.moderatorNotes}
                </div>
              )}

              <div className="pt-2 border-t border-[#202c33]/60 flex items-center justify-between">
                <button
                  onClick={() => setSuspendTarget(r)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition"
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>Suspend User</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedReport(r);
                    setModeratorNotes(r.moderatorNotes || '');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] text-xs font-bold transition shadow-sm"
                >
                  <span>Review & Act</span>
                  <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Review & Resolution Modal */}
      {selectedReport && (
        <Modal
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          title="Review Moderation Report"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs select-none">
            <div className="p-3.5 rounded-xl bg-[#111b21] border border-[#202c33] space-y-1.5">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-sm">{selectedReport.reason}</h4>
                <span className="text-[10px] text-[#8696a0]">
                  {new Date(selectedReport.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-[#8696a0] leading-relaxed">
                "{selectedReport.description || 'No statement provided'}"
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#8696a0] uppercase tracking-wider">
                Moderator Resolution Notes
              </label>
              <textarea
                value={moderatorNotes}
                onChange={(e) => setModeratorNotes(e.target.value)}
                placeholder="Document actions taken, policy verification, or dismiss reason..."
                rows={3}
                className="w-full rounded-xl bg-[#111b21] border border-[#202c33] p-3 text-white placeholder-[#8696a0] focus:border-[#00a884] focus:outline-none transition resize-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#202c33]">
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateStatus(selectedReport.id, 'reviewing')}
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 font-semibold transition"
                >
                  Mark Reviewing
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedReport.id, 'dismissed')}
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-xl bg-slate-500/15 hover:bg-slate-500/25 border border-slate-500/30 text-slate-400 font-semibold transition"
                >
                  Dismiss
                </button>
              </div>

              <button
                onClick={() => handleUpdateStatus(selectedReport.id, 'resolved')}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] font-bold transition shadow-md"
              >
                {actionLoading ? 'Saving...' : 'Resolve Report'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmModal
        isOpen={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        onConfirm={handleConfirmSuspend}
        title="Suspend Reported User"
        description={
          suspendTarget
            ? `Suspend ${suspendTarget.reportedUserName || suspendTarget.reportedUserId} for "${suspendTarget.reason}"? They will lose access to messaging immediately.`
            : ''
        }
        confirmText="Suspend User"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
};
