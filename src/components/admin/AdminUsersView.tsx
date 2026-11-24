/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Search,
  Shield,
  Ban,
  UserCheck,
  Trash2,
  AlertTriangle,
  XCircle,
  X,
} from 'lucide-react';
import { UserProfile } from '../../types';
import { AdminRoleType } from '../../types/admin';
import { Avatar } from '../common/Avatar';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import {
  updateUserStatus,
  updateUserRole,
  deleteUserAccountAdmin,
} from '../../services/adminService';

interface AdminUsersViewProps {
  users: UserProfile[];
  loading: boolean;
  onRefresh: () => void;
  adminRole: AdminRoleType;
}

export const AdminUsersView: React.FC<AdminUsersViewProps> = ({
  users,
  loading,
  onRefresh,
  adminRole,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'online'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Selected User Modal States
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<UserProfile | null>(null);
  const [roleChangeTarget, setRoleChangeTarget] = useState<UserProfile | null>(null);
  const [newSelectedRole, setNewSelectedRole] = useState<AdminRoleType>('ADMIN');
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isSuperAdmin = adminRole === 'SUPER_ADMIN';

  // Filter and search
  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      u.displayName?.toLowerCase().includes(term) ||
      u.username?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.phoneNumber?.includes(term);

    if (!matchesSearch) return false;

    if (statusFilter === 'suspended') return !!u.isDisabled;
    if (statusFilter === 'active') return !u.isDisabled;
    if (statusFilter === 'online') return !!u.isOnline;

    return true;
  });

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleToggleSuspend = async () => {
    if (!suspendTarget || !user) return;
    setActionLoading(true);
    try {
      const willDisable = !suspendTarget.isDisabled;
      await updateUserStatus(suspendTarget.uid, willDisable, {
        id: user.uid,
        email: user.email || 'admin@devchat.app',
      });
      showToast(
        willDisable
          ? `Account for ${suspendTarget.displayName} suspended`
          : `Account for ${suspendTarget.displayName} restored`,
        'success'
      );
      setSuspendTarget(null);
      onRefresh();
    } catch (err) {
      showToast('Failed to update user status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!roleChangeTarget || !user) return;
    setActionLoading(true);
    try {
      await updateUserRole(
        roleChangeTarget.uid,
        roleChangeTarget.email || `${roleChangeTarget.username}@devchat.app`,
        newSelectedRole,
        { id: user.uid, email: user.email || 'admin@devchat.app' }
      );
      showToast(`Role ${newSelectedRole} assigned to ${roleChangeTarget.displayName}`, 'success');
      setRoleChangeTarget(null);
      onRefresh();
    } catch (err) {
      showToast('Failed to update role', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget || !user) return;
    setActionLoading(true);
    try {
      await deleteUserAccountAdmin(deleteTarget.uid, {
        id: user.uid,
        email: user.email || 'admin@devchat.app',
      });
      showToast(`User ${deleteTarget.displayName} permanently removed`, 'success');
      setDeleteTarget(null);
      onRefresh();
    } catch (err) {
      showToast('Failed to delete account', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0c1317] border border-[#202c33] rounded-2xl p-4 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696a0]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by name, username, email or phone..."
            className="w-full rounded-xl bg-[#111b21] border border-[#202c33] pl-10 pr-8 py-2 text-xs text-white placeholder-[#8696a0] focus:border-[#00a884] focus:outline-none transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8696a0] hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {(['all', 'active', 'online', 'suspended'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => {
                setStatusFilter(filter);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                statusFilter === filter
                  ? 'bg-[#00a884] text-[#111b21]'
                  : 'bg-[#111b21] text-[#8696a0] hover:text-white border border-[#202c33]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-[#0c1317] border border-[#202c33] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111b21] border-b border-[#202c33] text-[#8696a0] uppercase tracking-wider font-bold text-[10px]">
              <tr>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Username</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 hidden md:table-cell">Joined</th>
                <th className="py-3.5 px-4 hidden lg:table-cell">Last Active</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202c33]/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-[#8696a0]">
                    Loading user records...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-[#8696a0]">
                    No users match your criteria.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-[#111b21]/60 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={u.photoURL} name={u.displayName || 'User'} size="sm" />
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">{u.displayName}</p>
                          <p className="text-[11px] text-[#8696a0] truncate">{u.email || u.phoneNumber || 'No email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#00a884]">@{u.username}</td>
                    <td className="py-3 px-4">
                      {u.isDisabled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold text-[10px]">
                          <XCircle className="h-3 w-3" />
                          Suspended
                        </span>
                      ) : u.isOnline ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[10px]">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#202c33] text-[#8696a0] font-semibold text-[10px]">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#8696a0] hidden md:table-cell tabular-nums">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-[#8696a0] hidden lg:table-cell tabular-nums">
                      {u.lastSeen ? new Date(u.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedUser(u)}
                          className="px-2.5 py-1 rounded-lg bg-[#111b21] hover:bg-[#202c33] text-[11px] font-semibold text-[#8696a0] hover:text-white transition"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => setSuspendTarget(u)}
                          className={`p-1.5 rounded-lg transition ${
                            u.isDisabled
                              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                          }`}
                          title={u.isDisabled ? 'Restore Account' : 'Suspend Account'}
                        >
                          {u.isDisabled ? <UserCheck className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={() => {
                              setRoleChangeTarget(u);
                              setNewSelectedRole('ADMIN');
                            }}
                            className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition"
                            title="Assign Admin Role"
                          >
                            <Shield className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition"
                            title="Delete User"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between p-4 border-t border-[#202c33] text-xs text-[#8696a0] tabular-nums">
          <span>
            Showing {filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} -{' '}
            {Math.min(filteredUsers.length, currentPage * pageSize)} of {filteredUsers.length} users
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded-lg bg-[#111b21] hover:bg-[#202c33] disabled:opacity-40 text-white font-semibold transition"
            >
              Previous
            </button>
            <span className="px-2 font-bold text-white tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 rounded-lg bg-[#111b21] hover:bg-[#202c33] disabled:opacity-40 text-white font-semibold transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <Modal
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          title="User Account Record"
          maxWidth="md"
        >
          <div className="space-y-4 select-none">
            <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-[#111b21] border border-[#202c33]">
              <Avatar src={selectedUser.photoURL} name={selectedUser.displayName} size="lg" />
              <div>
                <h3 className="text-sm font-bold text-white">{selectedUser.displayName}</h3>
                <p className="text-xs text-[#00a884] font-mono">@{selectedUser.username}</p>
                <p className="text-[11px] text-[#8696a0] mt-0.5">{selectedUser.bio}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-[#111b21] border border-[#202c33] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#8696a0]">Email</span>
                <p className="text-white truncate">{selectedUser.email || '—'}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#111b21] border border-[#202c33] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#8696a0]">Phone</span>
                <p className="text-white">{selectedUser.phoneNumber || '—'}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#111b21] border border-[#202c33] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#8696a0]">User UID</span>
                <p className="text-white font-mono text-[11px] truncate">{selectedUser.uid}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#111b21] border border-[#202c33] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#8696a0]">Status</span>
                <p className={selectedUser.isDisabled ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {selectedUser.isDisabled ? 'Suspended' : 'Active'}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-xs font-semibold text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Suspend Confirmation Modal */}
      {suspendTarget && (
        <Modal
          isOpen={!!suspendTarget}
          onClose={() => setSuspendTarget(null)}
          title={suspendTarget.isDisabled ? 'Restore Account' : 'Suspend Account'}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs select-none">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
              <span>
                {suspendTarget.isDisabled
                  ? `Restore access for user @${suspendTarget.username}? They will be able to log in and chat immediately.`
                  : `Are you sure you want to suspend @${suspendTarget.username}? This will block active sessions and message sending.`}
              </span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSuspendTarget(null)}
                className="px-3.5 py-2 rounded-xl bg-[#202c33] text-[#8696a0] hover:text-white font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleSuspend}
                disabled={actionLoading}
                className={`px-4 py-2 rounded-xl font-bold text-[#111b21] transition ${
                  suspendTarget.isDisabled ? 'bg-[#00a884] hover:bg-[#06cf9c]' : 'bg-amber-400 hover:bg-amber-300'
                }`}
              >
                {actionLoading ? 'Updating...' : suspendTarget.isDisabled ? 'Restore Account' : 'Suspend Account'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Role Assignment Modal */}
      {roleChangeTarget && (
        <Modal
          isOpen={!!roleChangeTarget}
          onClose={() => setRoleChangeTarget(null)}
          title="Assign Administrator Role"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs select-none">
            <p className="text-[#8696a0]">
              Assign administrative privileges to <strong className="text-white">{roleChangeTarget.displayName}</strong> ({roleChangeTarget.email}):
            </p>
            <div className="space-y-2">
              {(['ADMIN', 'MODERATOR', 'SUPPORT'] as const).map((r) => (
                <label
                  key={r}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                    newSelectedRole === r
                      ? 'bg-[#00a884]/15 border-[#00a884] text-white'
                      : 'bg-[#111b21] border-[#202c33] text-[#8696a0]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="roleSelect"
                      checked={newSelectedRole === r}
                      onChange={() => setNewSelectedRole(r)}
                      className="accent-[#00a884]"
                    />
                    <span className="font-bold">{r}</span>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRoleChangeTarget(null)}
                className="px-3.5 py-2 rounded-xl bg-[#202c33] text-[#8696a0] hover:text-white font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignRole}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] font-bold transition"
              >
                {actionLoading ? 'Assigning...' : 'Save Role'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteTarget && (
        <Modal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Delete Account Permanently"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs select-none">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
              <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0" />
              <span>
                Permanently remove <strong className="text-white">@{deleteTarget.username}</strong>? This action is irreversible and recorded in the audit trail.
              </span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-2 rounded-xl bg-[#202c33] text-[#8696a0] hover:text-white font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition"
              >
                {actionLoading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
