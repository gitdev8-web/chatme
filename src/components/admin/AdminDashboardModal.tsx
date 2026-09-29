/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Shield,
  Users,
  MessageSquare,
  AlertTriangle,
  Search,
  CheckCircle,
  XCircle,
  Ban,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import {
  collection,
  getDocs,
  limit,
  query,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { ModerationReport, UserProfile } from '../../types';
import { Avatar } from '../common/Avatar';
import { Modal } from '../common/Modal';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'reports'>('stats');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [totalConversations, setTotalConversations] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchAdminData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      // Fetch users
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(100)));
      const uList: UserProfile[] = [];
      usersSnap.forEach((d) => uList.push(d.data() as UserProfile));
      setUsers(uList);

      // Fetch conversations count
      const convSnap = await getDocs(query(collection(db, 'conversations'), limit(100)));
      setTotalConversations(convSnap.size);

      // Fetch reports
      const reportsSnap = await getDocs(query(collection(db, 'reports'), limit(100)));
      const rList: ModerationReport[] = [];
      reportsSnap.forEach((d) => rList.push(d.data() as ModerationReport));
      setReports(rList);
    } catch (err) {
      console.error('Error fetching admin data:', err);
      showToast('Error loading admin records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAdmin) {
      fetchAdminData();
    }
  }, [isOpen, isAdmin]);

  if (!isAdmin) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Access Restricted" maxWidth="sm">
        <div className="text-center py-6 space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
            <Shield className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-100">Administrator Only</h4>
          <p className="text-xs text-slate-400">
            You do not have the required permissions to access moderation tools.
          </p>
        </div>
      </Modal>
    );
  }

  const handleToggleDisableUser = async (targetUid: string, currentDisabled: boolean) => {
    try {
      await updateDoc(doc(db, 'users', targetUid), {
        isDisabled: !currentDisabled,
      });
      setUsers((prev) =>
        prev.map((u) => (u.uid === targetUid ? { ...u, isDisabled: !currentDisabled } : u))
      );
      showToast(currentDisabled ? 'Account restored' : 'Account disabled', 'info');
    } catch {
      showToast('Failed to update account status', 'error');
    }
  };

  const handleResolveReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status });
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status } : r))
      );
      showToast(`Report marked as ${status}`, 'success');
    } catch {
      showToast('Failed to update report', 'error');
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term)
    );
  });

  const pendingReportsCount = reports.filter((r) => r.status === 'pending').length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Admin & Moderation Panel"
      subtitle="System telemetry and moderation tools"
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex gap-2">
            {[
              { id: 'stats', label: 'Overview', icon: Shield },
              { id: 'users', label: `Users (${users.length})`, icon: Users },
              {
                id: 'reports',
                label: `Reports (${pendingReportsCount} pending)`,
                icon: AlertTriangle,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Overview Stats */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-1">
              <span className="text-[11px] font-medium text-slate-400">Total Users</span>
              <p className="text-2xl font-bold text-white">{users.length}</p>
              <span className="text-[10px] text-emerald-400">Registered profiles</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-1">
              <span className="text-[11px] font-medium text-slate-400">Active Online</span>
              <p className="text-2xl font-bold text-emerald-400">
                {users.filter((u) => u.isOnline).length}
              </p>
              <span className="text-[10px] text-slate-400">Connected now</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-1">
              <span className="text-[11px] font-medium text-slate-400">Conversations</span>
              <p className="text-2xl font-bold text-cyan-400">{totalConversations}</p>
              <span className="text-[10px] text-slate-400">Active threads</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-1">
              <span className="text-[11px] font-medium text-slate-400">Open Reports</span>
              <p className="text-2xl font-bold text-amber-400">{pendingReportsCount}</p>
              <span className="text-[10px] text-slate-400">Require review</span>
            </div>
          </div>
        )}

        {/* Users Moderation */}
        {activeTab === 'users' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search registered users..."
                className="w-full rounded-xl border border-slate-700/80 bg-slate-800/60 pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {filteredUsers.map((u) => (
                <div
                  key={u.uid}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={u.photoURL}
                      name={u.displayName}
                      size="sm"
                      isOnline={u.isOnline}
                      showPresence={true}
                    />
                    <div className="min-w-0 truncate">
                      <span className="text-xs font-semibold text-slate-200 block truncate">
                        {u.displayName}
                      </span>
                      <span className="text-[11px] text-slate-400 block truncate">
                        @{u.username} • {u.email}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {u.isDisabled ? (
                      <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/20">
                        Disabled
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                        Active
                      </span>
                    )}

                    <button
                      onClick={() => handleToggleDisableUser(u.uid, !!u.isDisabled)}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                        u.isDisabled
                          ? 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30'
                          : 'bg-rose-600/20 text-rose-300 hover:bg-rose-600/30'
                      }`}
                    >
                      {u.isDisabled ? (
                        <>
                          <UserCheck className="h-3 w-3" />
                          <span>Restore</span>
                        </>
                      ) : (
                        <>
                          <Ban className="h-3 w-3" />
                          <span>Disable</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reports Queue */}
        {activeTab === 'reports' && (
          <div className="space-y-3">
            {reports.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-500">
                No moderation reports submitted.
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {reports.map((r) => (
                  <div
                    key={r.id}
                    className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-amber-300">
                        Reason: {r.reason}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          r.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            : r.status === 'resolved'
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 bg-slate-900/60 p-2 rounded-lg">
                      {r.description || 'No description provided.'}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                      <span>Reported User ID: {r.reportedUserId}</span>
                      {r.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResolveReport(r.id, 'resolved')}
                            className="flex items-center gap-1 rounded-lg bg-emerald-600/20 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/30"
                          >
                            <CheckCircle className="h-3 w-3" />
                            <span>Resolve</span>
                          </button>
                          <button
                            onClick={() => handleResolveReport(r.id, 'dismissed')}
                            className="flex items-center gap-1 rounded-lg bg-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-600"
                          >
                            <XCircle className="h-3 w-3" />
                            <span>Dismiss</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
