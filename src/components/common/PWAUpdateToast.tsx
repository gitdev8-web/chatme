/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { RefreshCw, X, Sparkles } from 'lucide-react';
import { SWUpdateEventDetail } from '../../services/serviceWorkerRegistration';

export const PWAUpdateToast: React.FC = () => {
  const [updateDetail, setUpdateDetail] = useState<SWUpdateEventDetail | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [needsTypingConfirm, setNeedsTypingConfirm] = useState(false);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<SWUpdateEventDetail>;
      if (customEvent.detail) {
        setUpdateDetail(customEvent.detail);
        setNeedsTypingConfirm(false);
      }
    };

    window.addEventListener('devchat-sw-update', handleUpdate);
    return () => {
      window.removeEventListener('devchat-sw-update', handleUpdate);
    };
  }, []);

  if (!updateDetail) return null;

  const handleApplyUpdate = () => {
    const activeEl = document.activeElement;
    const isTyping =
      activeEl &&
      (activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true');

    if (isTyping && !needsTypingConfirm) {
      setNeedsTypingConfirm(true);
      return;
    }

    setIsUpdating(true);
    updateDetail.update();
  };

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[9999] max-w-sm w-full mx-auto p-4 rounded-2xl bg-[#111b21] border border-[#00a884]/40 shadow-2xl shadow-black/80 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 rounded-xl bg-[#00a884]/15 border border-[#00a884]/30 flex items-center justify-center flex-shrink-0 text-[#00a884]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex flex-col text-left min-w-0">
          <p className="text-xs font-semibold text-[#e9edef]">
            {needsTypingConfirm ? 'Draft in progress' : 'Update Available'}
          </p>
          <p className="text-[11px] text-[#8696a0]">
            {needsTypingConfirm
              ? 'Restart now to finish updating?'
              : 'A newer version of DEV CHAT is ready.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={handleApplyUpdate}
          disabled={isUpdating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00a884] text-[#0b141a] hover:bg-[#06cf9c] font-semibold text-xs transition shadow-md disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-3 w-3 ${isUpdating ? 'animate-spin' : ''}`} />
          <span>{isUpdating ? 'Updating...' : needsTypingConfirm ? 'Reload Now' : 'Update'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (needsTypingConfirm) setNeedsTypingConfirm(false);
            else setUpdateDetail(null);
          }}
          className="p-1 rounded-lg text-[#8696a0] hover:text-[#e9edef] hover:bg-[#202c33] transition cursor-pointer"
          title="Dismiss"
          aria-label="Dismiss update notice"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
};
