/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  Building2,
  Bell,
  HardDriveDownload,
  Sparkles,
  Zap,
  Smartphone,
  LogOut,
  Download,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Database,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ActiveTab, Transaction, BudgetSettings, CategoryRule } from '../types/finance';
import { usePWAInstall } from '../utils/usePWAInstall';
import { useOnlineStatus } from '../utils/useOnlineStatus';

interface ProfileViewProps {
  transactions: Transaction[];
  budget: BudgetSettings;
  rules: CategoryRule[];
  onNavigateToTab: (tab: ActiveTab) => void;
  onOpenPWAInstallModal: () => void;
  unclassifiedCount: number;
  alertCount: number;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  transactions,
  budget,
  rules,
  onNavigateToTab,
  onOpenPWAInstallModal,
  unclassifiedCount,
  alertCount,
}) => {
  const { currentUser, logout } = useAuth();
  const { isStandalone, isIOS } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [backupSuccess, setBackupSuccess] = useState(false);

  // Fast manual JSON export from Profile view
  const handleQuickBackup = () => {
    try {
      const backupData = {
        version: '2.0-pwa',
        exportedAt: new Date().toISOString(),
        userId: currentUser?.uid || 'anonymous',
        userEmail: currentUser?.email || '',
        transactions,
        budget,
        rules,
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `财务工作台_全量备份_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupSuccess(true);
      setTimeout(() => setBackupSuccess(false), 3000);
    } catch (err) {
      alert('备份导出失败，请重试');
    }
  };

  const navMenuItems = [
    {
      id: 'accounts' as ActiveTab,
      title: '支付账户授权与导入',
      description: '微信、支付宝、农行账单合规通道管理',
      icon: Building2,
      badge: null,
      iconBg: 'bg-blue-50 text-blue-600',
    },
    {
      id: 'alerts' as ActiveTab,
      title: '财务预警与提醒',
      description: '预算80%预警、单日消费阈值、免打扰时段',
      icon: Bell,
      badge: alertCount > 0 ? `${alertCount} 项预警` : null,
      badgeColor: 'bg-amber-100 text-amber-800',
      iconBg: 'bg-amber-50 text-amber-600',
    },
    {
      id: 'data' as ActiveTab,
      title: '数据备份与格式导入',
      description: 'CSV账单识别、JSON云端数据迁入迁出',
      icon: HardDriveDownload,
      badge: null,
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
    {
      id: 'rules' as ActiveTab,
      title: '商户自动分类规则',
      description: `已配置 ${rules.length} 条个性化商户记忆映射`,
      icon: Sparkles,
      badge: null,
      iconBg: 'bg-purple-50 text-purple-600',
    },
    {
      id: 'security' as ActiveTab,
      title: '安全与隐私合规审计',
      description: '用户空间物理隔离、安全凭证检查、数据销毁',
      icon: ShieldCheck,
      badge: '已审计',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      iconBg: 'bg-teal-50 text-teal-600',
    },
    {
      id: 'test' as ActiveTab,
      title: '智能语义解析测试台',
      description: '自然语言记账语法与分类沙盒验证',
      icon: Zap,
      badge: null,
      iconBg: 'bg-slate-100 text-slate-700',
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* User Info Header Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-white flex items-center justify-center font-bold text-lg shadow-xs">
              <User className="w-6 h-6 text-slate-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 truncate">
                  {currentUser?.email?.split('@')[0] || '个人财务管理者'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  云端加密
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{currentUser?.email}</p>
            </div>
          </div>

          {/* Network status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-xl text-xs font-medium border border-slate-200/60 text-slate-600">
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[11px] text-slate-700">在线同步</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-[11px] text-amber-700">离线缓存</span>
              </>
            )}
          </div>
        </div>

        {/* Data summary pills */}
        <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-2xl p-2.5 text-center">
            <p className="text-[11px] text-slate-500 font-medium">累计记账</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5 tabular-nums">
              {transactions.length} 笔
            </p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-2.5 text-center">
            <p className="text-[11px] text-slate-500 font-medium">月总预算</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5 tabular-nums">
              ¥{budget.totalBudget.toLocaleString()}
            </p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-2.5 text-center">
            <p className="text-[11px] text-slate-500 font-medium">待分类</p>
            <p
              className={`text-sm font-bold mt-0.5 tabular-nums ${
                unclassifiedCount > 0 ? 'text-amber-600 font-extrabold' : 'text-slate-900'
              }`}
            >
              {unclassifiedCount} 笔
            </p>
          </div>
        </div>
      </div>

      {/* iPhone PWA Status / Installation Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 rounded-3xl p-5 text-white shadow-sm border border-slate-800">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl">
              <Smartphone className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">iPhone PWA 独立应用模式</h3>
                {isStandalone && (
                  <span className="px-2 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px] font-bold">
                    运行中
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {isStandalone
                  ? '您当前已在全屏独立应用模式下运行，支持离线加载与触底安全区域。'
                  : '支持通过 iPhone Safari 一键添加到主屏幕，享受全屏原生交互与独立 App 图标。'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {isIOS ? '检测到 iOS / iPadOS 环境' : '支持 iOS Safari 与现代桌面浏览器'}
          </span>
          <button
            onClick={onOpenPWAInstallModal}
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            {isStandalone ? '检查安装与通知设置' : '查看添加到主屏幕教程'}
          </button>
        </div>
      </div>

      {/* Settings Navigation Menu */}
      <div className="bg-white rounded-3xl border border-slate-200/80 divide-y divide-slate-100 shadow-xs overflow-hidden">
        {navMenuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigateToTab(item.id)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={`p-2.5 rounded-2xl ${item.iconBg} shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-slate-950">
                      {item.title}
                    </p>
                    {item.badge && (
                      <span
                        className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                          item.badgeColor || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{item.description}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0 ml-2" />
            </button>
          );
        })}
      </div>

      {/* Fast Data Backup & Restore Action */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900">数据自主备份</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              一键下载本地全量 JSON 备份，确保个人财务数据在任何时候都受您完全掌控。
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleQuickBackup}
            className="flex-1 py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            {backupSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">备份文件已下载</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-slate-600" />
                <span>立即下载全量备份 (.json)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Account Logout Action */}
      <div className="pt-2">
        <button
          onClick={() => {
            if (window.confirm('确定要退出当前账号吗？已缓存的云端数据将受到安全规则保护。')) {
              logout();
            }
          }}
          className="w-full py-3.5 px-4 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-98 border border-red-200/60"
        >
          <LogOut className="w-4 h-4" />
          <span>退出当前个人账号</span>
        </button>
      </div>

      {/* Footer Version & Security Note */}
      <div className="text-center text-[11px] text-slate-400 pt-4 pb-2 space-y-1">
        <p>个人财务工作台 · v2.0 (iPhone PWA 独立安装版)</p>
        <p>严格遵守中国个人信息保护法 (PIPL) · 数据独立存储于 Firestore 私有空间</p>
      </div>
    </div>
  );
};
