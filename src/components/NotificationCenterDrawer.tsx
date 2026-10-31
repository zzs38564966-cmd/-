/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Bell,
  X,
  AlertTriangle,
  ShieldAlert,
  Info,
  Clock,
  CheckCircle2,
  Settings,
  Moon,
  ExternalLink,
} from 'lucide-react';
import { AlertItem, ActiveTab } from '../types/finance';
import { isCurrentlyInQuietHours } from '../utils/alertEngine';

interface NotificationCenterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: AlertItem[];
  quietHours: { enabled: boolean; start: string; end: string };
  onSnoozeAlert: (alertId: string) => void;
  onDismissAlert: (alertId: string) => void;
  onNavigateToTab: (tab: ActiveTab) => void;
}

export const NotificationCenterDrawer: React.FC<NotificationCenterDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  quietHours,
  onSnoozeAlert,
  onDismissAlert,
  onNavigateToTab,
}) => {
  if (!isOpen) return null;

  const inQuietHours =
    quietHours.enabled && isCurrentlyInQuietHours(quietHours.start, quietHours.end);

  const dangerCount = alerts.filter((a) => a.severity === 'danger').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-slate-900 text-white rounded-xl shadow-xs">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">财务预警中心</h3>
                <p className="text-[11px] text-slate-500">
                  {alerts.length > 0 ? `当前有 ${alerts.length} 项收支提醒` : '当前各项指标运行平稳'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  onClose();
                  onNavigateToTab('alerts');
                }}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                title="预警与通知规则设置"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                title="关闭面板"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quiet Hours Banner */}
          {inQuietHours && (
            <div className="px-4 py-2.5 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2 text-xs text-indigo-900">
              <Moon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="font-medium">
                当前处于夜间免打扰时段（{quietHours.start} - {quietHours.end}），外部系统弹窗已静音。
              </span>
            </div>
          )}

          {/* Quick Metrics Bar */}
          {alerts.length > 0 && (
            <div className="px-5 py-2.5 bg-slate-100/50 border-b border-slate-100 flex items-center justify-between text-xs font-medium text-slate-600">
              <div className="flex items-center gap-3">
                {dangerCount > 0 && (
                  <span className="flex items-center gap-1 text-red-600 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                    紧急超额: {dangerCount}
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="flex items-center gap-1 text-amber-700 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    警戒预警: {warningCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400">已应用防疲劳冷却机制</span>
            </div>
          )}

          {/* Alert List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
            {alerts.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">全部财务指标正常</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                  可用结余充足、各类预算使用均未超限，暂无即将到期的固定账单。
                </p>
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToTab('alerts');
                  }}
                  className="mt-4 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>调整预警阈值与固定账单</span>
                </button>
              </div>
            ) : (
              alerts.map((alert) => {
                const isDanger = alert.severity === 'danger';
                const isWarning = alert.severity === 'warning';

                return (
                  <div
                    key={alert.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isDanger
                        ? 'bg-red-50/70 border-red-200'
                        : isWarning
                        ? 'bg-amber-50/70 border-amber-200'
                        : 'bg-blue-50/70 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isDanger ? (
                          <div className="p-1 rounded-lg bg-red-100 text-red-700">
                            <ShieldAlert className="w-4 h-4" />
                          </div>
                        ) : isWarning ? (
                          <div className="p-1 rounded-lg bg-amber-100 text-amber-700">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="p-1 rounded-lg bg-blue-100 text-blue-700">
                            <Info className="w-4 h-4" />
                          </div>
                        )}
                        <h4
                          className={`text-xs sm:text-sm font-bold ${
                            isDanger
                              ? 'text-red-950'
                              : isWarning
                              ? 'text-amber-950'
                              : 'text-blue-950'
                          }`}
                        >
                          {alert.title}
                        </h4>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          isDanger
                            ? 'bg-red-200/80 text-red-900'
                            : isWarning
                            ? 'bg-amber-200/80 text-amber-900'
                            : 'bg-blue-200/80 text-blue-900'
                        }`}
                      >
                        {isDanger ? '紧急' : isWarning ? '警戒' : '提示'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                      {alert.message}
                    </p>

                    {/* Calculation Basis / Methodology Footnote */}
                    {alert.details?.calculationBasis && (
                      <div className="mt-2 p-2 bg-white/70 rounded-xl border border-black/5 text-[11px] text-slate-500 leading-normal">
                        <span className="font-semibold text-slate-600">计算口径：</span>
                        {alert.details.calculationBasis}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-black/5 text-xs">
                      <button
                        onClick={() => {
                          onClose();
                          if (alert.type.includes('category') || alert.type.includes('budget')) {
                            onNavigateToTab('budget');
                          } else if (alert.type === 'bill_due' || alert.type === 'consecutive_spike') {
                            onNavigateToTab('transactions');
                          } else {
                            onNavigateToTab('dashboard');
                          }
                        }}
                        className="text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>去处理</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onSnoozeAlert(alert.id)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-medium transition-colors cursor-pointer text-[11px] flex items-center gap-1"
                          title="24 小时内不再针对此项提示"
                        >
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>暂不提醒 (24h)</span>
                        </button>
                        <button
                          onClick={() => onDismissAlert(alert.id)}
                          className="px-2 py-1 text-slate-500 hover:text-slate-800 hover:bg-black/5 rounded-lg font-medium transition-colors cursor-pointer text-[11px]"
                          title="关闭该预警"
                        >
                          忽略
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Legal & Methodological Disclaimer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500 leading-relaxed space-y-1">
            <p className="font-semibold text-slate-700">预警准则与隐私保护：</p>
            <p>
              1. <strong>账本估算余额</strong>为累计所有已录入收入减去净消费后的算术结果，非银行账户真实联网数据。
            </p>
            <p>
              2. 外部桌面通知仅推送脱敏概括，绝不会向操作系统展示任何金额与商户敏感信息。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
