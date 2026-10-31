/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { WifiOff, RefreshCw, ShieldAlert } from 'lucide-react';
import { useOnlineStatus } from '../utils/useOnlineStatus';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-semibold shadow-md flex items-center justify-between gap-3 border-b border-amber-600 transition-all animate-in slide-in-from-top duration-200"
    >
      <div className="flex items-center gap-2 min-w-0">
        <WifiOff className="w-4 h-4 shrink-0 text-slate-900 animate-pulse" />
        <span className="truncate">
          当前处于离线状态：已展示本地缓存数据，已暂停云端同步。请勿将离线缓存误认为已与云端同步的最新数据。
        </span>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-[11px] font-bold transition-colors cursor-pointer shadow-xs active:scale-95"
      >
        <RefreshCw className="w-3 h-3" />
        <span>重新检测</span>
      </button>
    </div>
  );
};
