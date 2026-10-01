/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AdminLayout, AdminTab } from './AdminLayout';
import { AdminOverviewView } from './AdminOverviewView';
import { AdminUsersView } from './AdminUsersView';
import { AdminChatsView } from './AdminChatsView';
import { AdminReportsView } from './AdminReportsView';
import { AdminCallsView } from './AdminCallsView';
import { AdminNotificationsView } from './AdminNotificationsView';
import { AdminSystemView } from './AdminSystemView';
import { AdminSecurityView } from './AdminSecurityView';
import { AdminSettingsView } from './AdminSettingsView';
import { AdminLoginView } from './AdminLoginView';
import {
  getAdminRole,
  getDashboardMetrics,
  getAdminUsers,
  getAdminReports,
} from '../../services/adminService';
import { DashboardMetrics, AdminRoleType, ModerationReportItem } from '../../types/admin';
import { UserProfile } from '../../types';
import { Shield, AlertCircle, ArrowLeft } from 'lucide-react';

interface AdminDashboardProps {
  onReturnToApp: () => void;
  initialPath?: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onReturnToApp,
  initialPath,
}) => {
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [adminRole, setAdminRole] = useState<AdminRoleType>('SUPPORT');
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  // Data States
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<ModerationReportItem[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(false);

  // Synchronize route from URL path
  const syncTabFromUrl = useCallback(() => {
    const path = window.location.pathname;
    if (path.startsWith('/admin/users')) setActiveTab('users');
    else if (path.startsWith('/admin/chats')) setActiveTab('chats');
    else if (path.startsWith('/admin/reports')) setActiveTab('reports');
    else if (path.startsWith('/admin/calls')) setActiveTab('calls');
    else if (path.startsWith('/admin/notifications')) setActiveTab('notifications');
    else if (path.startsWith('/admin/system')) setActiveTab('system');
    else if (path.startsWith('/admin/security')) setActiveTab('security');
    else if (path.startsWith('/admin/settings')) setActiveTab('settings');
    else if (path === '/admin' || path === '/admin/') setActiveTab('overview');
  }, []);

  // Update browser history as tab changes
  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    const targetUrl = tab === 'overview' ? '/admin' : `/admin/${tab}`;
    window.history.pushState(null, '', targetUrl);
  };

  // Check current admin role and authorization
  const verifyAdminAccess = useCallback(async () => {
    setCheckingAuth(true);
    try {
      const isPassVerified = sessionStorage.getItem('admin_authenticated') === 'true';
      if (isPassVerified) {
        setAdminRole('SUPER_ADMIN');
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
    } catch {
      setIsAuthorized(false);
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  // Fetch telemetry and records
  const loadAdminData = useCallback(async () => {
    if (!isAuthorized) return;
    setDataLoading(true);
    try {
      const [m, u, r] = await Promise.all([
        getDashboardMetrics(),
        getAdminUsers(),
        getAdminReports(),
      ]);
      setMetrics(m);
      setUsers(u);
      setReports(r);
    } catch (err) {
      console.error('Error loading admin data payload:', err);
    } finally {
      setDataLoading(false);
    }
  }, [isAuthorized]);

  useEffect(() => {
    verifyAdminAccess();
  }, [verifyAdminAccess]);

  useEffect(() => {
    if (isAuthorized) {
      loadAdminData();
    }
  }, [isAuthorized, loadAdminData]);

  useEffect(() => {
    syncTabFromUrl();
    const handlePopState = () => syncTabFromUrl();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [syncTabFromUrl]);

  // If loading authentication
  if (authLoading || checkingAuth) {
    return (
      <div className="flex h-[100dvh] w-screen items-center justify-center bg-[#080d10] text-[#e9edef]">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00a884]/20 border border-[#00a884]/40 text-[#00a884]">
            <Shield className="h-6 w-6 animate-pulse" />
          </div>
          <p className="text-xs text-[#8696a0]">Verifying administrative credentials...</p>
        </div>
      </div>
    );
  }

  // Not authenticated or unauthorized: render Admin Login
  if (!isAuthorized) {
    return (
      <AdminLoginView
        onSuccess={() => verifyAdminAccess()}
        onReturnToApp={onReturnToApp}
      />
    );
  }

  return (
    <AdminLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      adminRole={adminRole}
      onReturnToApp={onReturnToApp}
    >
      {activeTab === 'overview' && (
        <AdminOverviewView
          metrics={metrics}
          loading={dataLoading}
          onRefresh={loadAdminData}
          onNavigateTab={handleTabChange}
        />
      )}
      {activeTab === 'users' && (
        <AdminUsersView
          users={users}
          loading={dataLoading}
          onRefresh={loadAdminData}
          adminRole={adminRole}
        />
      )}
      {activeTab === 'chats' && <AdminChatsView />}
      {activeTab === 'reports' && (
        <AdminReportsView
          reports={reports}
          loading={dataLoading}
          onRefresh={loadAdminData}
        />
      )}
      {activeTab === 'calls' && <AdminCallsView />}
      {activeTab === 'notifications' && <AdminNotificationsView />}
      {activeTab === 'system' && <AdminSystemView />}
      {activeTab === 'security' && <AdminSecurityView />}
      {activeTab === 'settings' && <AdminSettingsView />}
    </AdminLayout>
  );
};
