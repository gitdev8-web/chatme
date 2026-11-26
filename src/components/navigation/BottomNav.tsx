/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  MessageSquare,
  CircleDashed,
  Users,
  Phone,
  Settings,
} from 'lucide-react';

export type BottomNavTab = 'chats' | 'status' | 'groups' | 'contacts' | 'settings';

interface BottomNavProps {
  activeTab: BottomNavTab;
  onTabChange: (tab: BottomNavTab) => void;
  unreadCount?: number;
  hasUnreadStatus?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  unreadCount = 0,
  hasUnreadStatus = false,
}) => {
  const tabs = [
    {
      id: 'chats' as BottomNavTab,
      label: 'Chats',
      icon: MessageSquare,
      badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
    },
    {
      id: 'status' as BottomNavTab,
      label: 'Updates',
      icon: CircleDashed,
      hasDot: hasUnreadStatus,
    },
    {
      id: 'groups' as BottomNavTab,
      label: 'Communities',
      icon: Users,
    },
    {
      id: 'contacts' as BottomNavTab,
      label: 'Calls',
      icon: Phone,
    },
    {
      id: 'settings' as BottomNavTab,
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <nav
      aria-label="Primary navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-[#222d34] bg-[#111b21]/95 backdrop-blur-md px-1 pt-1.5 pb-[max(0.45rem,env(safe-area-inset-bottom))] shadow-xl select-none"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const IconComponent = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] transition-all active:scale-95 cursor-pointer ${
              isActive ? 'text-[#00a884]' : 'text-[#8696a0] hover:text-[#d1d7db]'
            }`}
          >
            <div
              className={`relative flex items-center justify-center rounded-full px-4 py-1 transition-colors ${
                isActive ? 'bg-[#00a884]/18' : ''
              }`}
            >
              <IconComponent
                className={`h-5 w-5 transition-transform ${
                  isActive ? 'scale-105 stroke-[2.3]' : 'stroke-[1.8]'
                }`}
              />

              {tab.badge && (
                <span className="tabular-nums absolute -top-0.5 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#25d366] px-1 text-[10px] font-bold text-[#0b141a] shadow-sm">
                  {tab.badge}
                </span>
              )}

              {tab.hasDot && (
                <span className="absolute top-0.5 right-2.5 h-2 w-2 rounded-full bg-[#25d366] ring-2 ring-[#111b21]" />
              )}
            </div>

            <span
              className={`text-[10px] mt-0.5 tracking-tight ${
                isActive ? 'font-bold text-[#00a884]' : 'font-medium text-[#8696a0]'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
