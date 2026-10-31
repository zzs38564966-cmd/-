/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  Plus,
  PieChart,
  User,
} from 'lucide-react';
import { ActiveTab } from '../types/finance';

interface MobileNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  unclassifiedCount: number;
  onOpenAddModal: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onTabChange,
  unclassifiedCount,
  onOpenAddModal,
}) => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-[env(safe-area-inset-bottom)] shadow-lg select-none">
      <div className="grid grid-cols-5 items-center h-16 max-w-md mx-auto px-1">
        {/* 1. 首页 */}
        <button
          onClick={() => onTabChange('dashboard')}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1 cursor-pointer transition-colors ${
            activeTab === 'dashboard' ? 'text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
          aria-label="首页仪表盘"
        >
          <LayoutDashboard className={`w-5 h-5 ${activeTab === 'dashboard' ? 'text-slate-900 stroke-[2.2]' : ''}`} />
          <span className="text-[10px] mt-1 tracking-tight">首页</span>
        </button>

        {/* 2. 账单 (明细，带待分类徽标) */}
        <button
          onClick={() => onTabChange('transactions')}
          className={`relative flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1 cursor-pointer transition-colors ${
            activeTab === 'transactions' || activeTab === 'unclassified'
              ? 'text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
          aria-label="账单明细"
        >
          <div className="relative">
            <ReceiptText className={`w-5 h-5 ${activeTab === 'transactions' || activeTab === 'unclassified' ? 'text-slate-900 stroke-[2.2]' : ''}`} />
            {unclassifiedCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1.5 py-0.2 bg-amber-500 text-white text-[9px] font-bold rounded-full min-w-4 text-center tabular-nums leading-tight shadow-xs">
                {unclassifiedCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">账单</span>
        </button>

        {/* 3. 记账 (中间快捷加号按钮) */}
        <div className="flex items-center justify-center">
          <button
            onClick={onOpenAddModal}
            className="w-12 h-12 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all -mt-5 cursor-pointer ring-4 ring-white"
            aria-label="快速记一笔"
          >
            <Plus className="w-6 h-6 stroke-[2.6]" />
          </button>
        </div>

        {/* 4. 预算 */}
        <button
          onClick={() => onTabChange('budget')}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1 cursor-pointer transition-colors ${
            activeTab === 'budget' || activeTab === 'summary'
              ? 'text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
          aria-label="每月预算管理"
        >
          <PieChart className={`w-5 h-5 ${activeTab === 'budget' || activeTab === 'summary' ? 'text-slate-900 stroke-[2.2]' : ''}`} />
          <span className="text-[10px] mt-1 tracking-tight">预算</span>
        </button>

        {/* 5. 我的 (个人中心与设置) */}
        <button
          onClick={() => onTabChange('profile')}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1 cursor-pointer transition-colors ${
            activeTab === 'profile' ||
            activeTab === 'accounts' ||
            activeTab === 'alerts' ||
            activeTab === 'security' ||
            activeTab === 'rules' ||
            activeTab === 'data' ||
            activeTab === 'test'
              ? 'text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
          aria-label="我的中心与系统设置"
        >
          <User className={`w-5 h-5 ${activeTab === 'profile' ? 'text-slate-900 stroke-[2.2]' : ''}`} />
          <span className="text-[10px] mt-1 tracking-tight">我的</span>
        </button>
      </div>
    </nav>
  );
};
