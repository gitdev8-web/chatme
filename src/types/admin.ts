/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AdminRoleType = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'SUPPORT';

export interface AdminRolePermissions {
  canManageUsers: boolean;
  canManageRoles: boolean;
  canSuspendUsers: boolean;
  canDeleteUsers: boolean;
  canManageReports: boolean;
  canManageAnnouncements: boolean;
  canViewAuditLogs: boolean;
  canManageSettings: boolean;
  canViewSystemMetrics: boolean;
  canViewCalls: boolean;
  canViewChats: boolean;
}

export const ROLE_PERMISSIONS: Record<AdminRoleType, AdminRolePermissions> = {
  SUPER_ADMIN: {
    canManageUsers: true,
    canManageRoles: true,
    canSuspendUsers: true,
    canDeleteUsers: true,
    canManageReports: true,
    canManageAnnouncements: true,
    canViewAuditLogs: true,
    canManageSettings: true,
    canViewSystemMetrics: true,
    canViewCalls: true,
    canViewChats: true,
  },
  ADMIN: {
    canManageUsers: true,
    canManageRoles: false,
    canSuspendUsers: true,
    canDeleteUsers: false,
    canManageReports: true,
    canManageAnnouncements: true,
    canViewAuditLogs: true,
    canManageSettings: false,
    canViewSystemMetrics: true,
    canViewCalls: true,
    canViewChats: true,
  },
  MODERATOR: {
    canManageUsers: false,
    canManageRoles: false,
    canSuspendUsers: true,
    canDeleteUsers: false,
    canManageReports: true,
    canManageAnnouncements: false,
    canViewAuditLogs: false,
    canManageSettings: false,
    canViewSystemMetrics: false,
    canViewCalls: false,
    canViewChats: true,
  },
  SUPPORT: {
    canManageUsers: false,
    canManageRoles: false,
    canSuspendUsers: false,
    canDeleteUsers: false,
    canManageReports: false,
    canManageAnnouncements: false,
    canViewAuditLogs: false,
    canManageSettings: false,
    canViewSystemMetrics: true,
    canViewCalls: true,
    canViewChats: false,
  },
};

export interface AdminAuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: 'user' | 'report' | 'role' | 'setting' | 'announcement' | 'system';
  targetId?: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
}

export interface ModerationReportItem {
  id: string;
  reporterId: string;
  reporterName?: string;
  reportedUserId: string;
  reportedUserName?: string;
  messageId?: string;
  reason: string;
  description: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedModeratorId?: string;
  assignedModeratorEmail?: string;
  moderatorNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface SystemHealthStatus {
  database: 'operational' | 'degraded' | 'error';
  auth: 'operational' | 'degraded' | 'error';
  messaging: 'operational' | 'degraded' | 'error';
  webrtc: 'operational' | 'degraded' | 'error';
  storage: 'operational' | 'degraded' | 'error';
  pwa: 'operational' | 'degraded' | 'error';
  notifications: 'operational' | 'degraded' | 'error';
  latencyMs: number;
  lastChecked: string;
}

export interface SystemAnnouncement {
  id: string;
  title: string;
  message: string;
  targetAudience: 'all' | 'active' | 'specific';
  specificUserIds?: string[];
  priority: 'normal' | 'important' | 'critical';
  scheduleDate?: string;
  createdAt: string;
  createdBy: string;
  active: boolean;
}

export interface SystemSettings {
  appName: string;
  maintenanceMode: boolean;
  registrationOpen: boolean;
  voiceCallsEnabled: boolean;
  videoCallsEnabled: boolean;
  statusStoriesEnabled: boolean;
  maxFileSizeMb: number;
  maxGroupMembers: number;
  moderationStrictness: 'low' | 'standard' | 'strict';
  updatedAt: string;
  updatedBy: string;
}

export interface DailyActivityPoint {
  date: string;
  label: string;
  users: number;
  messages: number;
  calls: number;
}

export interface DashboardMetrics {
  totalUsers: number;
  activeUsersNow: number;
  newUsersToday: number;
  totalConversations: number;
  totalMessages: number;
  messagesToday: number;
  totalVoiceCalls: number;
  totalVideoCalls: number;
  pendingReports: number;
  resolvedReports: number;
  storageUsedMb: number;
  dailyActivity: DailyActivityPoint[];
  systemHealth: SystemHealthStatus;
}
