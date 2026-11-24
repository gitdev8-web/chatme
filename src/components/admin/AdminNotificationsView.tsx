/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { SystemAnnouncement } from '../../types/admin';
import {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
} from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { ConfirmModal } from '../common/ConfirmModal';

export const AdminNotificationsView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'active' | 'specific'>('all');
  const [priority, setPriority] = useState<'normal' | 'important' | 'critical'>('normal');
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SystemAnnouncement | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAnnouncementsList = async () => {
    setLoading(true);
    try {
      const data = await getAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      console.error('Error fetching announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncementsList();
  }, []);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim() || !user) {
      showToast('Please fill in all required announcement fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await createAnnouncement(
        {
          title: title.trim(),
          message: message.trim(),
          targetAudience,
          priority,
          active: true,
          createdBy: user.email || 'admin@devchat.app',
        },
        { id: user.uid, email: user.email || 'admin@devchat.app' }
      );

      showToast('Announcement broadcast successfully dispatched', 'success');
      setTitle('');
      setMessage('');
      fetchAnnouncementsList();
    } catch (err) {
      showToast('Failed to create announcement', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!user || !deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAnnouncement(deleteTarget.id, {
        id: user.uid,
        email: user.email || 'admin@devchat.app',
      });
      showToast('Announcement removed', 'info');
      setDeleteTarget(null);
      fetchAnnouncementsList();
    } catch {
      showToast('Failed to delete announcement', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'critical':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'important':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      default:
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Description */}
      <div className="bg-[#0c1317] border border-[#202c33] rounded-2xl p-4 shadow-sm">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Bell className="h-4 w-4 text-[#00a884]" />
          <span>System Broadcasts & In-App Announcements</span>
        </h2>
        <p className="text-xs text-[#8696a0] mt-0.5">
          Send high-priority service notifications, feature release updates, and maintenance advisories to users.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Broadcast Form */}
        <div className="lg:col-span-1 bg-[#0c1317] border border-[#202c33] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#202c33] pb-3">
            <Send className="h-4 w-4 text-[#00a884]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Compose Announcement
            </h3>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#8696a0] uppercase tracking-wider">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Scheduled System Maintenance"
                className="w-full rounded-xl bg-[#111b21] border border-[#202c33] px-3.5 py-2 text-white placeholder-[#8696a0] focus:border-[#00a884] focus:outline-none transition"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#8696a0] uppercase tracking-wider">
                Target Audience
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['all', 'active', 'specific'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTargetAudience(t)}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold capitalize border transition ${
                      targetAudience === t
                        ? 'bg-[#00a884]/15 border-[#00a884] text-[#25d366]'
                        : 'bg-[#111b21] border-[#202c33] text-[#8696a0]'
                    }`}
                  >
                    {t === 'all' ? 'All Users' : t === 'active' ? 'Active' : 'Custom'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#8696a0] uppercase tracking-wider">
                Priority Level
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['normal', 'important', 'critical'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold capitalize border transition ${
                      priority === p
                        ? p === 'critical'
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                          : p === 'important'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-blue-500/20 border-blue-500 text-blue-300'
                        : 'bg-[#111b21] border-[#202c33] text-[#8696a0]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#8696a0] uppercase tracking-wider">
                Message Body
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write message details for the notification banner..."
                rows={4}
                className="w-full rounded-xl bg-[#111b21] border border-[#202c33] p-3 text-white placeholder-[#8696a0] focus:border-[#00a884] focus:outline-none transition resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] font-bold shadow-md shadow-[#00a884]/20 transition disabled:opacity-50"
            >
              {submitting ? <span>Dispatching...</span> : <span>Send Announcement</span>}
            </button>
          </form>
        </div>

        {/* Active Broadcasts List */}
        <div className="lg:col-span-2 bg-[#0c1317] border border-[#202c33] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#202c33] pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Active Broadcasts ({announcements.length})
            </h3>
            <span className="text-[11px] text-[#8696a0]">Pushed to connected clients</span>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12 text-[#8696a0] text-xs">
                Loading broadcast records...
              </div>
            ) : announcements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-[#8696a0] space-y-2">
                <CheckCircle2 className="h-8 w-8 text-[#00a884]/80" />
                <p className="text-xs">No active broadcasts currently running.</p>
              </div>
            ) : (
              announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="p-4 rounded-xl bg-[#111b21] border border-[#202c33] space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${getPriorityBadge(
                            ann.priority
                          )}`}
                        >
                          {ann.priority}
                        </span>
                        <span className="text-[10px] text-[#00a884] font-semibold uppercase tracking-wider">
                          Target: {ann.targetAudience}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white">{ann.title}</h4>
                    </div>

                    <button
                      onClick={() => setDeleteTarget(ann)}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition"
                      title="Remove Announcement"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-[#8696a0] leading-relaxed bg-[#0c1317] p-3 rounded-xl border border-[#202c33]/40">
                    {ann.message}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-[#8696a0] font-mono pt-1 tabular-nums">
                    <span>By: {ann.createdBy}</span>
                    <span>{new Date(ann.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Remove Announcement"
        description={
          deleteTarget
            ? `Remove broadcast "${deleteTarget.title}"? Connected users will no longer see this banner.`
            : ''
        }
        confirmText="Remove"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};
