/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const widthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0b141a]/80 backdrop-blur-md transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modal Card / Bottom Sheet on Mobile */}
      <div
        className={`relative z-10 w-full ${widthClasses[maxWidth]} overflow-hidden rounded-t-3xl sm:rounded-2xl border-t sm:border border-[#222d34] bg-[#111b21] shadow-2xl transition-all duration-200 animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 sm:my-auto max-h-[90dvh] flex flex-col`}
      >
        {/* Mobile Drag Handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-[#202c33] flex-shrink-0">
          <div className="h-1 w-10 rounded-full bg-[#374248]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#222d34] bg-[#202c33] px-5 py-3 flex-shrink-0">
          <div className="min-w-0 pr-2">
            <h3 className="text-sm sm:text-base font-bold text-[#e9edef] truncate">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-[#8696a0] truncate">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-[#8696a0] hover:bg-[#111b21] hover:text-[#e9edef] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 no-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};
