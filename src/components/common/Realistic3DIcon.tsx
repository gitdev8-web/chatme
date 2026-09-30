/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Home,
  Users,
  GraduationCap,
  HeartHandshake,
  UserCheck,
  BookOpen,
  Calendar,
  Clock,
  FileText,
  Bookmark,
  Award,
  CheckSquare,
  BarChart2,
  Star,
  Wallet,
  CreditCard,
  Receipt,
  TrendingUp,
  ArrowDownCircle,
  Building,
  Bus,
  MessageCircle,
  Bell,
  Megaphone,
  Newspaper,
  HelpCircle,
  Link2,
  Settings,
  Shield,
  FileClock,
  Globe,
  Sparkles,
  Layers,
  School,
  ClipboardList,
} from 'lucide-react';

export type IconModuleName =
  | 'dashboard'
  | 'students'
  | 'teachers'
  | 'parents'
  | 'staff'
  | 'classes'
  | 'sections'
  | 'subjects'
  | 'academic-years'
  | 'attendance'
  | 'timetable'
  | 'assignments'
  | 'syllabus'
  | 'exams'
  | 'marks'
  | 'results'
  | 'grades'
  | 'finance'
  | 'payments'
  | 'invoices'
  | 'income'
  | 'expenses'
  | 'library'
  | 'hostel'
  | 'transport'
  | 'messages'
  | 'notifications'
  | 'notices'
  | 'news'
  | 'circulars'
  | 'enquiries'
  | 'alumni'
  | 'clubs'
  | 'tasks'
  | 'help'
  | 'help-links'
  | 'settings'
  | 'permissions'
  | 'audit-logs'
  | 'languages'
  | 'whatsapp';

interface Realistic3DIconProps {
  name: IconModuleName | string;
  size?: number | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showDots?: boolean;
  className?: string;
  badge?: number | string;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
}

interface ColorConfig {
  gradient: string;
  glow: string;
  accentDot: string;
  shadow: string;
}

const colorPalettes: Record<string, ColorConfig> = {
  blue: {
    gradient: 'from-blue-400 via-blue-600 to-indigo-900',
    glow: 'rgba(59, 130, 246, 0.45)',
    accentDot: '#60a5fa',
    shadow: 'rgba(30, 64, 175, 0.45)',
  },
  green: {
    gradient: 'from-emerald-400 via-emerald-600 to-teal-900',
    glow: 'rgba(16, 185, 129, 0.45)',
    accentDot: '#34d399',
    shadow: 'rgba(6, 95, 70, 0.45)',
  },
  whatsapp: {
    gradient: 'from-[#25D366] via-[#128C7E] to-[#075E54]',
    glow: 'rgba(37, 211, 102, 0.5)',
    accentDot: '#6ee7b7',
    shadow: 'rgba(7, 94, 84, 0.55)',
  },
  purple: {
    gradient: 'from-purple-400 via-purple-600 to-indigo-950',
    glow: 'rgba(168, 85, 247, 0.45)',
    accentDot: '#c084fc',
    shadow: 'rgba(107, 33, 168, 0.45)',
  },
  orange: {
    gradient: 'from-amber-400 via-orange-500 to-rose-700',
    glow: 'rgba(249, 115, 22, 0.45)',
    accentDot: '#fbbf24',
    shadow: 'rgba(194, 65, 12, 0.45)',
  },
  pink: {
    gradient: 'from-pink-400 via-fuchsia-600 to-purple-900',
    glow: 'rgba(236, 72, 153, 0.45)',
    accentDot: '#f472b6',
    shadow: 'rgba(157, 23, 77, 0.45)',
  },
  teal: {
    gradient: 'from-teal-300 via-cyan-600 to-teal-950',
    glow: 'rgba(20, 184, 166, 0.45)',
    accentDot: '#2dd4bf',
    shadow: 'rgba(15, 118, 110, 0.45)',
  },
  red: {
    gradient: 'from-rose-400 via-red-600 to-rose-950',
    glow: 'rgba(239, 68, 68, 0.45)',
    accentDot: '#f87171',
    shadow: 'rgba(159, 18, 57, 0.45)',
  },
  charcoal: {
    gradient: 'from-slate-600 via-slate-800 to-slate-950',
    glow: 'rgba(148, 163, 184, 0.35)',
    accentDot: '#94a3b8',
    shadow: 'rgba(15, 23, 42, 0.6)',
  },
};

// Map each module to color and Lucide icon
const moduleMapping: Record<
  string,
  { palette: keyof typeof colorPalettes; icon: React.ElementType }
> = {
  dashboard: { palette: 'blue', icon: Home },
  students: { palette: 'green', icon: Users },
  teachers: { palette: 'purple', icon: School },
  parents: { palette: 'orange', icon: HeartHandshake },
  staff: { palette: 'pink', icon: UserCheck },
  classes: { palette: 'blue', icon: GraduationCap },
  sections: { palette: 'purple', icon: Layers },
  subjects: { palette: 'teal', icon: BookOpen },
  'academic-years': { palette: 'red', icon: Calendar },
  attendance: { palette: 'blue', icon: Clock },
  timetable: { palette: 'purple', icon: Calendar },
  assignments: { palette: 'green', icon: FileText },
  syllabus: { palette: 'orange', icon: Bookmark },
  exams: { palette: 'pink', icon: Award },
  marks: { palette: 'blue', icon: CheckSquare },
  results: { palette: 'teal', icon: BarChart2 },
  grades: { palette: 'purple', icon: Star },
  finance: { palette: 'orange', icon: Wallet },
  payments: { palette: 'red', icon: CreditCard },
  invoices: { palette: 'blue', icon: Receipt },
  income: { palette: 'green', icon: TrendingUp },
  expenses: { palette: 'purple', icon: ArrowDownCircle },
  library: { palette: 'pink', icon: BookOpen },
  hostel: { palette: 'blue', icon: Building },
  transport: { palette: 'teal', icon: Bus },
  messages: { palette: 'whatsapp', icon: MessageCircle },
  whatsapp: { palette: 'whatsapp', icon: MessageCircle },
  status: { palette: 'green', icon: Sparkles },
  stories: { palette: 'green', icon: Sparkles },
  groups: { palette: 'purple', icon: Users },
  communities: { palette: 'purple', icon: Users },
  calls: { palette: 'teal', icon: Clock },
  notifications: { palette: 'orange', icon: Bell },
  notices: { palette: 'red', icon: Megaphone },
  news: { palette: 'blue', icon: Newspaper },
  circulars: { palette: 'green', icon: FileText },
  enquiries: { palette: 'purple', icon: HelpCircle },
  alumni: { palette: 'pink', icon: Users },
  clubs: { palette: 'blue', icon: Sparkles },
  tasks: { palette: 'green', icon: ClipboardList },
  help: { palette: 'purple', icon: HelpCircle },
  'help-links': { palette: 'orange', icon: Link2 },
  settings: { palette: 'teal', icon: Settings },
  permissions: { palette: 'charcoal', icon: Shield },
  'audit-logs': { palette: 'red', icon: FileClock },
  languages: { palette: 'blue', icon: Globe },
};

const sizeDimensions: Record<string, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 60,
  '2xl': 76,
};

export const Realistic3DIcon: React.FC<Realistic3DIconProps> = ({
  name,
  size = 'md',
  showDots = true,
  className = '',
  badge,
  onClick,
  title,
}) => {
  const pixelSize =
    typeof size === 'number' ? size : sizeDimensions[size] || 40;

  const info = moduleMapping[name.toLowerCase()] || {
    palette: 'whatsapp',
    icon: Sparkles,
  };

  const palette = colorPalettes[info.palette] || colorPalettes.whatsapp;
  const IconComponent = info.icon;
  const symbolSize = Math.round(pixelSize * 0.48);

  return (
    <div
      onClick={onClick}
      title={title || name}
      className={`relative inline-flex items-center justify-center select-none group transition-transform duration-200 hover:scale-105 active:scale-95 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      style={{
        width: `${pixelSize + (showDots ? 10 : 0)}px`,
        height: `${pixelSize + (showDots ? 10 : 0)}px`,
      }}
    >
      {/* Floating Accent Sphere 1 (Top Right) */}
      {showDots && pixelSize >= 30 && (
        <span
          className="absolute rounded-full transition-transform duration-300 group-hover:scale-125"
          style={{
            width: `${Math.max(4, Math.round(pixelSize * 0.12))}px`,
            height: `${Math.max(4, Math.round(pixelSize * 0.12))}px`,
            top: '2px',
            right: '4px',
            background: `radial-gradient(circle at 35% 30%, #ffffff, ${palette.accentDot})`,
            boxShadow: `0 2px 5px ${palette.glow}, inset 0 1px 1px #fff`,
          }}
        />
      )}

      {/* Floating Accent Sphere 2 (Bottom Left) */}
      {showDots && pixelSize >= 40 && (
        <span
          className="absolute rounded-full transition-transform duration-300 group-hover:scale-125"
          style={{
            width: `${Math.max(3, Math.round(pixelSize * 0.08))}px`,
            height: `${Math.max(3, Math.round(pixelSize * 0.08))}px`,
            bottom: '4px',
            left: '3px',
            background: `radial-gradient(circle at 35% 30%, #ffffff, ${palette.accentDot})`,
            boxShadow: `0 2px 4px ${palette.glow}`,
          }}
        />
      )}

      {/* Main 3D Spherical Orb */}
      <div
        className={`relative rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-tr ${palette.gradient}`}
        style={{
          width: `${pixelSize}px`,
          height: `${pixelSize}px`,
          boxShadow: `
            0 ${Math.round(pixelSize * 0.18)}px ${Math.round(pixelSize * 0.32)}px -${Math.round(pixelSize * 0.06)}px ${palette.shadow},
            0 ${Math.round(pixelSize * 0.08)}px ${Math.round(pixelSize * 0.14)}px rgba(0, 0, 0, 0.45),
            inset 0 ${Math.max(1, Math.round(pixelSize * 0.04))}px ${Math.max(2, Math.round(pixelSize * 0.08))}px rgba(255, 255, 255, 0.8),
            inset 0 -${Math.max(2, Math.round(pixelSize * 0.06))}px ${Math.max(3, Math.round(pixelSize * 0.12))}px rgba(0, 0, 0, 0.55)
          `,
        }}
      >
        {/* Top Gloss Reflection Arc */}
        <div
          className="absolute inset-x-0 top-0 rounded-t-full pointer-events-none"
          style={{
            height: '52%',
            background:
              'radial-gradient(ellipse at 50% 18%, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.25) 45%, rgba(255, 255, 255, 0) 80%)',
          }}
        />

        {/* Specular Highlight Point */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: `${Math.round(pixelSize * 0.3)}px`,
            height: `${Math.round(pixelSize * 0.16)}px`,
            top: `${Math.round(pixelSize * 0.1)}px`,
            left: `${Math.round(pixelSize * 0.22)}px`,
            background:
              'radial-gradient(ellipse, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
            transform: 'rotate(-25deg)',
            filter: 'blur(0.5px)',
          }}
        />

        {/* Bottom Rim Light Reflection */}
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{
            height: '35%',
            background:
              'radial-gradient(ellipse at 50% 100%, rgba(255, 255, 255, 0.25) 0%, transparent 70%)',
          }}
        />

        {/* Crisp White Symbol */}
        <div
          className="relative z-10 text-white flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
          style={{
            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4))',
          }}
        >
          <IconComponent
            size={symbolSize}
            strokeWidth={2.4}
            className="text-white"
          />
        </div>
      </div>

      {/* Optional Badge Indicator */}
      {badge !== undefined && (
        <span
          className="absolute -top-1 -right-1 z-20 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white shadow-md ring-2 ring-slate-900"
        >
          {badge}
        </span>
      )}
    </div>
  );
};
