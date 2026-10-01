/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Download, Share2, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{
  compact?: boolean;
  variant?: 'button' | 'menu-item' | 'banner';
}> = ({ compact = false, variant = 'button' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running inside standalone PWA mode, hide
  if (isInstalled) {
    return null;
  }

  // Handle click action
  const handleAction = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  // If not installable and not iOS, don't show unless in menu
  if (!isInstallable && !isIOS && variant !== 'menu-item') {
    return null;
  }

  // Render as dropdown menu item
  if (variant === 'menu-item') {
    return (
      <>
        <button
          onClick={handleAction}
          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs text-[#d1d7db] hover:bg-[#182229] transition cursor-pointer"
        >
          <Download className="h-4 w-4 text-[#00a884]" />
          <span>Install DEV CHAT App</span>
        </button>

        {showIOSGuide && (
          <IOSInstallGuideModal onClose={() => setShowIOSGuide(false)} />
        )}
      </>
    );
  }

  // Render as banner
  if (variant === 'banner') {
    return (
      <>
        <div className="mx-3 my-2 p-3 rounded-xl bg-[#202c33] border border-[#00a884]/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-[#00a884]/20 border border-[#00a884]/40 flex items-center justify-center text-[#00a884] flex-shrink-0">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-white">Install DEV CHAT</p>
              <p className="text-[11px] text-[#8696a0]">Faster messaging & offline access</p>
            </div>
          </div>
          <button
            onClick={handleAction}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] text-xs font-bold transition cursor-pointer flex-shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Install</span>
          </button>
        </div>

        {showIOSGuide && (
          <IOSInstallGuideModal onClose={() => setShowIOSGuide(false)} />
        )}
      </>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={handleAction}
        className={`flex items-center justify-center gap-1.5 rounded-xl bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] font-semibold transition-all shadow-md shadow-[#00a884]/20 cursor-pointer ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-xs'
        }`}
        title="Install DEV CHAT App"
        aria-label="Install DEV CHAT App"
      >
        <Download className="h-3.5 w-3.5 stroke-[2.5]" />
        {!compact && <span>Install App</span>}
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center justify-center gap-1.5 rounded-xl border border-[#222d34] bg-[#202c33] text-[#d1d7db] hover:text-white hover:border-[#00a884]/50 font-medium transition-all cursor-pointer ${
            compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-1.5 text-xs'
          }`}
          title="Install on iPhone / iPad"
          aria-label="Install on iPhone / iPad"
        >
          <Share2 className="h-3.5 w-3.5 text-[#00a884]" />
          {!compact && <span>Install</span>}
        </button>

        {showIOSGuide && (
          <IOSInstallGuideModal onClose={() => setShowIOSGuide(false)} />
        )}
      </>
    );
  }

  return null;
};

const IOSInstallGuideModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-install-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-sm rounded-2xl bg-[#111b21] border border-[#222d34] p-6 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-[#00a884]/20 border border-[#00a884]/40 flex items-center justify-center text-[#00a884]">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h3 id="ios-install-title" className="text-sm font-semibold text-white">
              Install DEV CHAT on iOS
            </h3>
            <p className="text-[11px] text-[#8696a0]">Full-screen app experience</p>
          </div>
        </div>

        <ol className="space-y-3 text-xs text-[#d1d7db] bg-[#202c33] p-4 rounded-xl border border-[#222d34]">
          <li className="flex items-start gap-2.5">
            <span className="flex h-5 w-5 rounded-full bg-[#00a884] text-[#111b21] font-bold text-[10px] items-center justify-center flex-shrink-0 mt-0.5">
              1
            </span>
            <span>
              Tap the <strong className="text-white">Share</strong> button (
              <Share2 className="inline h-3.5 w-3.5 text-[#00a884]" />) in Safari's toolbar.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="flex h-5 w-5 rounded-full bg-[#00a884] text-[#111b21] font-bold text-[10px] items-center justify-center flex-shrink-0 mt-0.5">
              2
            </span>
            <span>
              Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="flex h-5 w-5 rounded-full bg-[#00a884] text-[#111b21] font-bold text-[10px] items-center justify-center flex-shrink-0 mt-0.5">
              3
            </span>
            <span>
              Launch DEV CHAT from your home screen for an app-like experience!
            </span>
          </li>
        </ol>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-[#00a884] py-2.5 text-xs font-semibold text-[#111b21] hover:bg-[#06cf9c] transition cursor-pointer"
        >
          Got It
        </button>
      </div>
    </div>
  );
};
