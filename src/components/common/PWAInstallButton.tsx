/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Download, Share } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, hide
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium shadow-md shadow-emerald-950/40 hover:from-emerald-500 hover:to-teal-500 transition-all ${
          compact ? 'p-2 text-xs' : 'px-3.5 py-2 text-xs'
        }`}
        title="Install Chattr app to device"
      >
        <Download className="h-4 w-4" />
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
          className={`flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 font-medium transition-all ${
            compact ? 'p-2 text-xs' : 'px-3 py-1.5 text-xs'
          }`}
          title="Install on iPhone / iPad"
        >
          <Share className="h-4 w-4 text-emerald-400" />
          {!compact && <span>Install App</span>}
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-left">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <Download className="h-5 w-5 text-emerald-400" />
                Install Chattr on iOS
              </h3>
              <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                1. Tap the <strong className="text-white">Share</strong> button in your Safari toolbar at the bottom.<br />
                2. Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.<br />
                3. Enjoy full-screen, native performance!
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 transition"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
