/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Realistic3DIcon } from '../common/Realistic3DIcon';

export type BottomNavTab = 'chats' | 'contacts' | 'hub' | 'notices' | 'settings';

interface BottomNavProps {
  activeTab: BottomNavTab;
  onTabChange: (tab: BottomNavTab) => void;
  unreadCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  unreadCount = 0,
}) => {
  const tabs = [
    {
      id: 'chats' as BottomNavTab,
      label: 'Chats',
      iconName: 'whatsapp',
      badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
    },
    {
      id: 'contacts' as BottomNavTab,
      label: 'Directory',
      iconName: 'students',
    },
    {
      id: 'hub' as BottomNavTab,
      label: 'School Hub',
      iconName: 'classes',
    },
    {
      id: 'notices' as BottomNavTab,
      label: 'Notices',
      iconName: 'notices',
    },
    {
      id: 'settings' as BottomNavTab,
      label: 'Settings',
      iconName: 'settings',
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-[#222d34] bg-[#111b21]/95 backdrop-blur-xl px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-2xl select-none">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              isActive ? 'scale-105' : 'opacity-70 hover:opacity-100'
            }`}
          >
            {/* 3D Realistic Circular Icon */}
            <div className="relative">
              <Realistic3DIcon
                name={tab.iconName}
                size="sm"
                showDots={isActive}
                badge={tab.badge}
              />
            </div>

            <span
              className={`text-[10px] font-semibold mt-1 transition-colors ${
                isActive ? 'text-[#25d366]' : 'text-[#8696a0]'
              }`}
            >
              {tab.label}
            </span>

            {/* Active pill dot */}
            {isActive && (
              <span className="h-1 w-4 rounded-full bg-[#25d366] mt-0.5 shadow-sm shadow-[#25d366]/50" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
