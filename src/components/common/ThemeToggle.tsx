/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = false }) => {
  const { theme, toggleTheme } = useTheme();
  const { updateProfileData } = useAuth();

  const handleToggle = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    toggleTheme();
    updateProfileData({ theme: nextTheme }).catch(() => {});
  };

  return (
    <button
      onClick={handleToggle}
      className={`p-2 rounded-full hover:bg-[#374248] hover:text-[#e9edef] transition flex items-center gap-2 ${className}`}
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 text-[#25d366]" />
      ) : (
        <Moon className="h-5 w-5 text-[#00a884]" />
      )}
      {showLabel && (
        <span className="text-xs font-medium text-[#e9edef]">
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
};
