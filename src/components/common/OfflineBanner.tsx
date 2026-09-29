/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-full border border-amber-500/40 bg-amber-950/90 backdrop-blur-md px-4 py-1.5 text-xs font-medium text-amber-200 shadow-xl animate-bounce">
      <WifiOff className="h-3.5 w-3.5 text-amber-400" />
      <span>You are offline — cached conversations are displayed.</span>
    </div>
  );
};
