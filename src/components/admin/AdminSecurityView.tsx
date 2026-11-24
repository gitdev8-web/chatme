/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Lock,
  Download,
  Search,
  RefreshCw,
  KeyRound,
  X,
} from 'lucide-react';
import { AdminAuditLog, ROLE_PERMISSIONS, AdminRoleType } from '../../types/admin';
import { getAdminAuditLogs } from '../../services/adminService';
import { useToast } from '../common/Toast';

export const AdminSecurityView: React.FC = () => {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getAdminAuditLogs(100);
      setLogs(data);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `devchat_audit_logs_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Audit log export downloaded', 'success');
  };

  const filteredLogs = logs.filter((l) => {
    const term = searchTerm.toLowerCase();
    return (
      !term ||
      l.action.toLowerCase().includes(term) ||
      l.adminEmail.toLowerCase().includes(term) ||
      l.details.toLowerCase().includes(term) ||
      l.targetId?.toLowerCase().includes(term)
    );
  });

  const roles: AdminRoleType[] = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0c1317] border border-[#202c33] rounded-2xl p-4 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Lock className="h-4 w-4 text-[#00a884]" />
            <span>Immutable Administrative Audit Trail</span>
          </h2>
          <p className="text-xs text-[#8696a0] mt-0.5">
            Cryptographically sealed activity log of all suspension, role modification, broadcast, and settings changes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111b21] hover:bg-[#202c33] border border-[#202c33] text-xs font-semibold text-white transition"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[#00a884]" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] font-bold text-xs shadow-md transition"
          >
            <Download className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Role Permission Matrix */}
      <div className="bg-[#0c1317] border border-[#202c33] rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-[#00a884]" />
          <span>Role-Based Access Control (RBAC) Matrix</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111b21] text-[#8696a0] font-bold text-[10px] uppercase tracking-wider border-b border-[#202c33]">
              <tr>
                <th className="py-2.5 px-3">Permission Capability</th>
                {roles.map((r) => (
                  <th key={r} className="py-2.5 px-3 text-center">
                    {r.replace('_', ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202c33]/60 text-xs">
              {[
                { label: 'Manage Users (View, Search, Filter)', key: 'canManageUsers' },
                { label: 'Suspend / Restore Accounts', key: 'canSuspendUsers' },
                { label: 'Permanently Delete Accounts', key: 'canDeleteUsers' },
                { label: 'Assign Administrative Roles', key: 'canManageRoles' },
                { label: 'Manage Moderation Reports', key: 'canManageReports' },
                { label: 'Broadcast System Announcements', key: 'canManageAnnouncements' },
                { label: 'View Immutable Audit Trail', key: 'canViewAuditLogs' },
                { label: 'Update System & Security Settings', key: 'canManageSettings' },
              ].map((perm, idx) => (
                <tr key={idx} className="hover:bg-[#111b21]/40">
                  <td className="py-2.5 px-3 font-medium text-white">{perm.label}</td>
                  {roles.map((r) => {
                    const hasPerm = (ROLE_PERMISSIONS[r] as any)[perm.key];
                    return (
                      <td key={r} className="py-2.5 px-3 text-center">
                        {hasPerm ? (
                          <span className="inline-block text-emerald-400 font-bold">✓</span>
                        ) : (
                          <span className="inline-block text-slate-600 font-bold">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-[#0c1317] border border-[#202c33] rounded-2xl shadow-sm overflow-hidden space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Audit Activity Records ({filteredLogs.length})
          </h3>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8696a0]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search audit trail..."
              className="w-full rounded-xl bg-[#111b21] border border-[#202c33] pl-9 pr-8 py-1.5 text-xs text-white placeholder-[#8696a0] focus:border-[#00a884] focus:outline-none"
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
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#202c33]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111b21] text-[#8696a0] font-bold text-[10px] uppercase tracking-wider border-b border-[#202c33]">
              <tr>
                <th className="py-3 px-3.5">Action</th>
                <th className="py-3 px-3.5">Admin</th>
                <th className="py-3 px-3.5">Target</th>
                <th className="py-3 px-3.5">Details</th>
                <th className="py-3 px-3.5">Timestamp</th>
                <th className="py-3 px-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202c33]/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-[#8696a0]">
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-[#8696a0]">
                    No audit records recorded yet.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#111b21]/60 transition font-mono text-[11px]">
                    <td className="py-3 px-3.5 font-bold text-[#00a884]">{log.action}</td>
                    <td className="py-3 px-3.5 text-white font-sans">{log.adminEmail}</td>
                    <td className="py-3 px-3.5 text-[#8696a0]">
                      {log.targetType}: {log.targetId || 'global'}
                    </td>
                    <td className="py-3 px-3.5 text-[#8696a0] font-sans max-w-xs truncate">
                      {log.details}
                    </td>
                    <td className="py-3 px-3.5 text-[#8696a0]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-sans font-bold text-[10px] uppercase">
                        {log.status}
                      </span>
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
