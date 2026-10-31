/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  HelpCircle,
  ReceiptText,
  PieChart,
  CalendarDays,
  HardDriveDownload,
  PlusCircle,
  GraduationCap,
  Sparkles,
  Zap,
  Bell,
  Building2,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { ActiveTab } from '../types/finance';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  unclassifiedCount: number;
  alertCount?: number;
  onOpenAddModal: () => void;
  onOpenPWAInstallModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  unclassifiedCount,
  alertCount = 0,
  onOpenAddModal,
  onOpenPWAInstallModal,
}) => {
  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: '首页仪表盘',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'unclassified' as ActiveTab,
      label: '待分类流水',
      icon: HelpCircle,
      badge: unclassifiedCount > 0 ? unclassifiedCount : null,
      badgeDanger: true,
    },
    {
      id: 'transactions' as ActiveTab,
      label: '明细查询',
      icon: ReceiptText,
      badge: null,
    },
    {
      id: 'budget' as ActiveTab,
      label: '每月预算管理',
      icon: PieChart,
      badge: null,
    },
    {
      id: 'summary' as ActiveTab,
      label: '月度财务总结',
      icon: CalendarDays,
      badge: null,
    },
    {
      id: 'alerts' as ActiveTab,
      label: '预警与通知',
      icon: Bell,
      badge: alertCount > 0 ? alertCount : null,
      badgeDanger: true,
    },
    {
      id: 'accounts' as ActiveTab,
      label: '支付账户授权',
      icon: Building2,
      badge: null,
    },
    {
      id: 'security' as ActiveTab,
      label: '安全与隐私审计',
      icon: ShieldCheck,
      badge: null,
    },
    {
      id: 'rules' as ActiveTab,
      label: '自动分类规则',
      icon: Sparkles,
      badge: null,
    },
    {
      id: 'data' as ActiveTab,
      label: '数据导入导出',
      icon: HardDriveDownload,
      badge: null,
    },
    {
      id: 'test' as ActiveTab,
      label: '智能测试台',
      icon: Zap,
      badge: null,
    },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-lg shadow-xs">
            ¥
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
              个人财务管理
            </h1>
            <p className="text-xs text-slate-500 font-medium">学生预算与项目工作台</p>
          </div>
        </div>
      </div>

      {/* Quick Add Button in Sidebar */}
      <div className="px-4 pt-5 pb-2">
        <button
          onClick={onOpenAddModal}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-xs active:scale-[0.98] transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>记一笔交易</span>
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left ${
                isActive
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== null && (
                <span
                  className={`px-2 py-0.5 text-xs font-semibold rounded-full tabular-nums ${
                    item.badgeDanger
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* PWA App Install Quick Entry */}
      {onOpenPWAInstallModal && (
        <div className="px-3 pb-2">
          <button
            onClick={onOpenPWAInstallModal}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>安装为独立应用</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">PWA</span>
          </button>
        </div>
      )}

      {/* User Profile & Cloud Storage Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-900 truncate">月度可支配: ¥2,500.00</p>
            <p className="text-[11px] text-emerald-700 truncate font-medium">云端独立空间 · 隐私隔离</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 leading-tight">
          已通过 Firebase 规则加密隔离，仅您本人可读写。
        </p>
      </div>
    </aside>
  );
};
