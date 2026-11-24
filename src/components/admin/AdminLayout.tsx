/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Shield,
  LayoutDashboard,
  Users,
  MessageSquare,
  AlertTriangle,
  PhoneCall,
  Bell,
  Activity,
  Lock,
  Sliders,
  LogOut,
  ArrowLeft,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AdminRoleType, ROLE_PERMISSIONS } from '../../types/admin';
import { Avatar } from '../common/Avatar';

export type AdminTab =
  | 'overview'
  | 'users'
  | 'chats'
  | 'reports'
  | 'calls'
  | 'notifications'
  | 'system'
  | 'security'
  | 'settings';

interface AdminLayoutProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  adminRole: AdminRoleType;
  onReturnToApp: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  activeTab,
  onTabChange,
  adminRole,
  onReturnToApp,
  children,
}) => {
  const { user, profile, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const permissions = ROLE_PERMISSIONS[adminRole] || ROLE_PERMISSIONS.SUPPORT;

  const navItems: {
    id: AdminTab;
    label: string;
    icon: React.ElementType;
    badge?: string;
    allowed: boolean;
  }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      allowed: true,
    },
    {
      id: 'users',
      label: 'User Management',
      icon: Users,
      allowed: permissions.canManageUsers || adminRole === 'SUPPORT',
    },
    {
      id: 'chats',
      label: 'Conversations & Metrics',
      icon: MessageSquare,
      allowed: permissions.canViewChats,
    },
    {
      id: 'reports',
      label: 'Moderation & Reports',
      icon: AlertTriangle,
      allowed: permissions.canManageReports,
    },
    {
      id: 'calls',
      label: 'Call Telemetry',
      icon: PhoneCall,
      allowed: permissions.canViewCalls,
    },
    {
      id: 'notifications',
      label: 'Announcements',
      icon: Bell,
      allowed: permissions.canManageAnnouncements,
    },
    {
      id: 'system',
      label: 'System Health',
      icon: Activity,
      allowed: permissions.canViewSystemMetrics,
    },
    {
      id: 'security',
      label: 'Audit & Security',
      icon: Lock,
      allowed: permissions.canViewAuditLogs,
    },
    {
      id: 'settings',
      label: 'Platform Settings',
      icon: Sliders,
      allowed: permissions.canManageSettings,
    },
  ];

  const handleSelectTab = (tab: AdminTab) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  const getRoleBadgeColor = (role: AdminRoleType) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'ADMIN':
        return 'bg-[#00a884]/15 text-[#25d366] border-[#00a884]/30';
      case 'MODERATOR':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'SUPPORT':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-[#080d10] text-[#e9edef] select-none">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 xl:w-72 flex-col flex-shrink-0 bg-[#0c1317] border-r border-[#202c33] z-20">
        {/* Brand Header */}
        <div className="p-4 border-b border-[#202c33] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#00a884] to-[#005c4b] shadow-lg shadow-[#00a884]/20">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-bold tracking-tight text-white">DEV CHAT</h1>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#00a884] bg-[#00a884]/10 px-1.5 py-0.5 rounded">
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-[#8696a0]">Operations Control Center</p>
            </div>
          </div>
        </div>

        {/* Current Admin User Profile Chip */}
        <div className="p-3 mx-3 my-2 rounded-xl bg-[#111b21] border border-[#202c33] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar
              src={profile?.photoURL || user?.photoURL || ''}
              name={profile?.displayName || user?.email || 'Admin'}
              size="sm"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#e9edef] truncate">
                {profile?.displayName || user?.email?.split('@')[0] || 'Admin'}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${getRoleBadgeColor(
                    adminRole
                  )}`}
                >
                  {adminRole.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {navItems
            .filter((item) => item.allowed)
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#00a884] text-[#111b21] font-bold shadow-md shadow-[#00a884]/20'
                      : 'text-[#8696a0] hover:text-[#e9edef] hover:bg-[#111b21]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-4 w-4 ${isActive ? 'text-[#111b21] stroke-[2.5]' : 'text-[#8696a0]'}`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="h-3.5 w-3.5 stroke-[3]" />}
                </button>
              );
            })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-[#202c33] space-y-1">
          <button
            onClick={() => {
              sessionStorage.removeItem('admin_authenticated');
              onReturnToApp();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#8696a0] hover:text-[#e9edef] hover:bg-[#111b21] transition"
          >
            <ArrowLeft className="h-4 w-4 text-[#00a884]" />
            <span>Return to DEV CHAT</span>
          </button>
          <button
            onClick={() => {
              sessionStorage.removeItem('admin_authenticated');
              window.location.reload();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 transition"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 flex-shrink-0 bg-[#0c1317] border-b border-[#202c33] px-4 md:px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-[#8696a0] hover:bg-[#111b21] hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-bold text-white capitalize">
                  {navItems.find((i) => i.id === activeTab)?.label || 'Dashboard'}
                </h2>
                <span className="hidden sm:inline-flex text-[10px] bg-[#202c33] text-[#8696a0] px-2 py-0.5 rounded-full font-mono">
                  /admin/{activeTab}
                </span>
              </div>
              <p className="text-[11px] text-[#8696a0] hidden sm:block">
                DEV CHAT Realtime Control & Analytics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onReturnToApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111b21] border border-[#202c33] hover:border-[#00a884]/40 text-xs font-semibold text-[#8696a0] hover:text-white transition shadow-sm"
            >
              <ExternalLink className="h-3.5 w-3.5 text-[#00a884]" />
              <span className="hidden sm:inline">Open App</span>
            </button>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00a884]/10 border border-[#00a884]/20 text-[#25d366] text-[11px] font-semibold">
              <span className="h-2 w-2 rounded-full bg-[#25d366]" />
              <span>Live</span>
            </div>
          </div>
        </header>

        {/* Dynamic Body */}
        <main className="flex-1 overflow-y-auto bg-[#080d10] p-4 md:p-6 pb-16 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex flex-col w-72 max-w-[85vw] h-full bg-[#0c1317] border-r border-[#202c33] p-4 z-10 shadow-2xl animate-in slide-in-from-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#202c33]">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#00a884]" />
                <span className="font-bold text-sm text-white">DEV CHAT Admin</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-[#8696a0] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-3 space-y-1">
              {navItems
                .filter((item) => item.allowed)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTab(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                        isActive
                          ? 'bg-[#00a884] text-[#111b21] font-bold'
                          : 'text-[#8696a0] hover:text-white hover:bg-[#111b21]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
            </nav>

            <div className="pt-3 border-t border-[#202c33] space-y-2">
              <button
                onClick={() => {
                  sessionStorage.removeItem('admin_authenticated');
                  onReturnToApp();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-[#111b21]"
              >
                <ArrowLeft className="h-4 w-4 text-[#00a884]" />
                <span>Return to DEV CHAT</span>
              </button>
              <button
                onClick={() => {
                  sessionStorage.removeItem('admin_authenticated');
                  window.location.reload();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
