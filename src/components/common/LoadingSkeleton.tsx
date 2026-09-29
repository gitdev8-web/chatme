/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export const ConversationSkeleton: React.FC = () => {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
      <div className="w-12 h-12 rounded-full bg-slate-800" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-800 rounded w-1/3" />
        <div className="h-3 bg-slate-800/60 rounded w-2/3" />
      </div>
    </div>
  );
};

export const MessagesSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 p-4 animate-pulse">
      <div className="flex items-start gap-2.5 max-w-xs">
        <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="h-10 bg-slate-800/80 rounded-2xl rounded-tl-sm w-44" />
        </div>
      </div>
      <div className="flex items-start justify-end gap-2.5 ml-auto max-w-xs">
        <div className="space-y-1.5 flex-1 flex flex-col items-end">
          <div className="h-12 bg-emerald-950/40 rounded-2xl rounded-tr-sm w-56" />
        </div>
      </div>
      <div className="flex items-start gap-2.5 max-w-xs">
        <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="h-14 bg-slate-800/80 rounded-2xl rounded-tl-sm w-52" />
        </div>
      </div>
    </div>
  );
};
