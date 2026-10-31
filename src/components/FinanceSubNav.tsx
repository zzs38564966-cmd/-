/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PieChart, FileText, Database, Sparkles, Zap, Bell, Building2, ShieldCheck } from 'lucide-react';
import { ActiveTab } from '../types/finance';

interface FinanceSubNavProps {
  activeTab: ActiveTab;
  onNavigateToTab: (tab: ActiveTab) => void;
}

export const FinanceSubNav: React.FC<FinanceSubNavProps> = ({
  activeTab,
  onNavigateToTab,
}) => {
  const tabs = [
    { id: 'budget' as ActiveTab, label: '预算额度', icon: PieChart },
    { id: 'alerts' as ActiveTab, label: '预警与通知', icon: Bell },
    { id: 'accounts' as ActiveTab, label: '账户授权', icon: Building2 },
    { id: 'security' as ActiveTab, label: '安全审计', icon: ShieldCheck },
    { id: 'summary' as ActiveTab, label: '月度收支总结', icon: FileText },
    { id: 'rules' as ActiveTab, label: '自动分类规则', icon: Sparkles },
    { id: 'data' as ActiveTab, label: '数据导入与备份', icon: Database },
    { id: 'test' as ActiveTab, label: '智能测试台', icon: Zap },
  ];

  return (
    <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-2xl w-full sm:w-fit overflow-x-auto text-xs font-semibold">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onNavigateToTab(tab.id)}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              isActive
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-900' : 'text-slate-500'}`} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
