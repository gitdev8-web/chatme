/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, HelpCircle, Loader2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const iconBg =
    variant === 'danger'
      ? 'bg-red-500/15 text-red-400 border-red-500/20'
      : variant === 'warning'
      ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
      : 'bg-[#00a884]/15 text-[#25d366] border-[#00a884]/25';

  const btnStyle =
    variant === 'danger'
      ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
      : variant === 'warning'
      ? 'bg-amber-500 hover:bg-amber-600 text-[#0b141a] shadow-amber-500/20'
      : 'bg-[#00a884] hover:bg-[#06cf9c] text-[#0b141a] shadow-[#00a884]/20';

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={() => !loading && onClose()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-[#111b21] border border-[#222d34] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
      >
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${iconBg}`}>
              {variant === 'danger' ? (
                <AlertTriangle className="h-5 w-5" />
              ) : variant === 'warning' ? (
                <HelpCircle className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              aria-label="Close confirmation"
              className="rounded-lg p-1.5 text-[#8696a0] hover:bg-[#202c33] hover:text-[#e9edef] transition disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <h3 id="confirm-modal-title" className="mt-4 text-base font-bold text-[#e9edef]">
            {title}
          </h3>
          <p id="confirm-modal-desc" className="mt-1.5 text-sm text-[#8696a0] leading-relaxed">
            {description}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 bg-[#202c33]/60 border-t border-[#222d34] px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="min-h-[40px] rounded-xl px-4 py-2 text-sm font-medium text-[#e9edef] bg-[#2a3942]/80 hover:bg-[#2a3942] transition disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={loading}
            className={`min-h-[40px] inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-lg transition active:scale-[0.98] disabled:opacity-60 ${btnStyle}`}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
