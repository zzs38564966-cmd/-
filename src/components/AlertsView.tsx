/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Bell,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Moon,
  Plus,
  Trash2,
  CheckCircle2,
  Info,
  Laptop,
  Check,
  RotateCcw,
  Sparkles,
  HelpCircle,
  TrendingDown,
  Calendar,
  Wallet,
} from 'lucide-react';
import {
  AlertItem,
  AlertRuleConfig,
  BudgetSettings,
  PaymentChannel,
  PAYMENT_CHANNELS,
  RecurringBill,
  Transaction,
} from '../types/finance';
import { Card } from './ui/Card';
import { formatCNY } from '../utils/formatters';
import {
  isCurrentlyInQuietHours,
  requestDesktopNotificationPermission,
  sendPrivacySafeDesktopNotification,
} from '../utils/alertEngine';

interface AlertsViewProps {
  transactions: Transaction[];
  budget: BudgetSettings;
  config: AlertRuleConfig;
  activeAlerts: AlertItem[];
  onSaveConfig: (newConfig: AlertRuleConfig) => void;
  onSnoozeAlert: (alertId: string) => void;
  onDismissAlert: (alertId: string) => void;
  onResetCooldowns: () => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  transactions,
  budget,
  config,
  activeAlerts,
  onSaveConfig,
  onSnoozeAlert,
  onDismissAlert,
  onResetCooldowns,
}) => {
  const [localConfig, setLocalConfig] = useState<AlertRuleConfig>(config);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'denied'
  );

  // New recurring bill form modal
  const [isAddingBill, setIsAddingBill] = useState(false);
  const [newBillName, setNewBillName] = useState('');
  const [newBillAmount, setNewBillAmount] = useState<number | ''>('');
  const [newBillDay, setNewBillDay] = useState<number>(1);
  const [newBillCategory, setNewBillCategory] = useState('手机及日常通信');
  const [newBillChannel, setNewBillChannel] = useState<PaymentChannel>('微信支付');
  const [newBillNote, setNewBillNote] = useState('');

  // Handle local state updates
  const updateLocal = (updater: (prev: AlertRuleConfig) => AlertRuleConfig) => {
    setLocalConfig((prev) => {
      const next = updater(prev);
      setHasUnsavedChanges(true);
      return next;
    });
  };

  const handleSave = () => {
    onSaveConfig(localConfig);
    setHasUnsavedChanges(false);
  };

  const handleResetToDefault = () => {
    if (confirm('确定要恢复默认预警规则设置吗？')) {
      onSaveConfig(localConfig);
      setHasUnsavedChanges(false);
    }
  };

  // Request browser desktop permission
  const handleRequestPermission = async () => {
    const perm = await requestDesktopNotificationPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      updateLocal((prev) => ({
        ...prev,
        channels: { ...prev.channels, browserDesktop: true },
      }));
      sendPrivacySafeDesktopNotification(1, 'info');
    }
  };

  // Add custom recurring bill
  const handleAddBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBillName.trim() || !newBillAmount || Number(newBillAmount) <= 0) {
      alert('请填写完整的固定账单名称和正确金额');
      return;
    }

    const newBill: RecurringBill = {
      id: `bill_${Date.now()}`,
      name: newBillName.trim(),
      amount: Number(newBillAmount),
      dueDayOfMonth: Math.min(31, Math.max(1, newBillDay)),
      category: newBillCategory,
      channel: newBillChannel,
      note: newBillNote.trim(),
      enabled: true,
    };

    updateLocal((prev) => ({
      ...prev,
      billDue: {
        ...prev.billDue,
        bills: [...prev.billDue.bills, newBill],
      },
    }));

    setNewBillName('');
    setNewBillAmount('');
    setNewBillDay(1);
    setNewBillNote('');
    setIsAddingBill(false);
  };

  const handleDeleteBill = (billId: string) => {
    updateLocal((prev) => ({
      ...prev,
      billDue: {
        ...prev.billDue,
        bills: prev.billDue.bills.filter((b) => b.id !== billId),
      },
    }));
  };

  const handleToggleBill = (billId: string) => {
    updateLocal((prev) => ({
      ...prev,
      billDue: {
        ...prev.billDue,
        bills: prev.billDue.bills.map((b) =>
          b.id === billId ? { ...b, enabled: !b.enabled } : b
        ),
      },
    }));
  };

  // 1. Calculate current book estimated balance
  let totalIncome = 0;
  let totalNetExpense = 0;
  let totalTransfers = 0;
  transactions.forEach((tx) => {
    if (tx.type === 'income') totalIncome += tx.amount;
    else if (tx.type === 'expense') {
      if (tx.isRefund) totalNetExpense -= tx.amount;
      else totalNetExpense += tx.amount;
    } else if (tx.type === 'transfer') totalTransfers += tx.amount;
  });
  const bookEstimatedBalance = Math.round((totalIncome - totalNetExpense - totalTransfers) * 100) / 100;

  // 2. Calculate today's net expense
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
  let todayNormal = 0;
  let todayRefund = 0;
  transactions.forEach((tx) => {
    if (tx.date === todayStr && tx.type === 'expense') {
      if (tx.isRefund) todayRefund += tx.amount;
      else todayNormal += tx.amount;
    }
  });
  const todayNet = Math.max(0, todayNormal - todayRefund);

  const inQuietHours =
    localConfig.quietHours.enabled &&
    isCurrentlyInQuietHours(localConfig.quietHours.start, localConfig.quietHours.end);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Banner & Fast Actions */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-slate-900 text-white rounded-2xl shrink-0 mt-0.5 shadow-xs">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                财务预警与通知中心
              </h2>
              {activeAlerts.length > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  {activeAlerts.length} 项触发中
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>各项平稳</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              严格基于您的真实记账流水与设定的 2,500 元月预算，自动监控超支风险、固定账单到期与消费异常波动。
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
          {hasUnsavedChanges && (
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>保存预警规则</span>
            </button>
          )}
          <button
            onClick={onResetCooldowns}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            title="重置所有已忽略或暂不提醒的冷却状态，重新评估当前所有交易"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重置预警冷却</span>
          </button>
        </div>
      </div>

      {/* Real-time Indicator Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="flex items-center gap-1.5 font-medium">
              <Wallet className="w-3.5 h-3.5 text-blue-600" />
              账本估算结余
            </span>
            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
              算术口径
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900">{formatCNY(bookEstimatedBalance)}</div>
          <p className="text-[11px] text-slate-400 mt-1">
            预警阈值: ¥{localConfig.lowBalance.threshold} · {bookEstimatedBalance < localConfig.lowBalance.threshold ? '已触发预警' : '余额安全'}
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="flex items-center gap-1.5 font-medium">
              <TrendingDown className="w-3.5 h-3.5 text-red-600" />
              今日净消费
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
              已扣减退款
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900">{formatCNY(todayNet)}</div>
          <p className="text-[11px] text-slate-400 mt-1">
            单日限额: ¥{localConfig.dailySpend.threshold} · {todayNet > localConfig.dailySpend.threshold ? '已超单日限额' : '处于正常区间'}
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="flex items-center gap-1.5 font-medium">
              <Laptop className="w-3.5 h-3.5 text-purple-600" />
              桌面通知授权
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                notificationPermission === 'granted'
                  ? 'bg-emerald-50 text-emerald-700'
                  : notificationPermission === 'denied'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {notificationPermission === 'granted'
                ? '已开启'
                : notificationPermission === 'denied'
                ? '已禁止'
                : '未授权'}
            </span>
          </div>
          <div className="text-sm font-bold text-slate-800 mt-1">
            {notificationPermission === 'granted' ? '前台桌面弹窗已就绪' : '仅在应用内提示'}
          </div>
          <div className="mt-1">
            {notificationPermission !== 'granted' && (
              <button
                onClick={handleRequestPermission}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold underline cursor-pointer"
              >
                点击授权浏览器通知
              </button>
            )}
            {notificationPermission === 'granted' && (
              <span className="text-[11px] text-slate-400">含锁屏脱敏与免扰过滤</span>
            )}
          </div>
        </div>
      </div>

      {/* Section 1: 核心收支预警规则 */}
      <Card
        title="一、核心收支预警规则"
        subtitle="针对生活费结余、单日消费限额与各类预算红线进行动态防线布控"
      >
        <div className="space-y-4">
          {/* Rule 1: 可用余额低于指定金额 */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  1. 账本估算结余过低预警
                </span>
                <span className="text-[10px] font-semibold bg-red-100 text-red-800 px-2 py-0.5 rounded-md">
                  生存防线
                </span>
              </div>
              <p className="text-xs text-slate-500">
                当账本累计净结余低于指定金额时，触发黄色/红色警戒提醒，避免月底见底。
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs">
                <span className="text-slate-400">低于 ¥</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={localConfig.lowBalance.threshold}
                  onChange={(e) =>
                    updateLocal((prev) => ({
                      ...prev,
                      lowBalance: {
                        ...prev.lowBalance,
                        threshold: Math.max(0, Number(e.target.value)),
                      },
                    }))
                  }
                  className="w-16 font-bold text-slate-900 outline-none"
                />
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localConfig.lowBalance.enabled}
                  onChange={(e) =>
                    updateLocal((prev) => ({
                      ...prev,
                      lowBalance: { ...prev.lowBalance, enabled: e.target.checked },
                    }))
                  }
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900" />
              </label>
            </div>
          </div>

          {/* Rule 2: 单日消费超过指定金额 */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  2. 单日消费限额预警
                </span>
                <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                  日均节奏
                </span>
              </div>
              <p className="text-xs text-slate-500">
                按本地时区计算当日净支出（自动扣除退款金额），超出设定额度时提醒。
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs">
                <span className="text-slate-400">超过 ¥</span>
                <input
                  type="number"
                  min="10"
                  step="10"
                  value={localConfig.dailySpend.threshold}
                  onChange={(e) =>
                    updateLocal((prev) => ({
                      ...prev,
                      dailySpend: {
                        ...prev.dailySpend,
                        threshold: Math.max(10, Number(e.target.value)),
                      },
                    }))
                  }
                  className="w-16 font-bold text-slate-900 outline-none"
                />
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localConfig.dailySpend.enabled}
                  onChange={(e) =>
                    updateLocal((prev) => ({
                      ...prev,
                      dailySpend: { ...prev.dailySpend, enabled: e.target.checked },
                    }))
                  }
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900" />
              </label>
            </div>
          </div>

          {/* Rule 3: 某类别预算达到 80% */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs sm:text-sm font-bold text-slate-900">
                3. 分类预算达到 80% 警戒线
              </span>
              <p className="text-xs text-slate-500">
                生活费、AI 漫剧项目或学习类开销触及各自月预算的 80% 时发出缓冲提醒。
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={localConfig.category80.enabled}
                onChange={(e) =>
                  updateLocal((prev) => ({
                    ...prev,
                    category80: { enabled: e.target.checked },
                  }))
                }
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900" />
            </label>
          </div>

          {/* Rule 4: 某类别预算超支 100%+ */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs sm:text-sm font-bold text-slate-900">
                4. 分类预算超支预警（100%+）
              </span>
              <p className="text-xs text-slate-500">
                任一子分类支出超出当月限额时立即发出紧急警报，提示冻结非必须消费。
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={localConfig.categoryOverspend.enabled}
                onChange={(e) =>
                  updateLocal((prev) => ({
                    ...prev,
                    categoryOverspend: { enabled: e.target.checked },
                  }))
                }
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900" />
            </label>
          </div>

          {/* Rule 5: 预计本月总支出超预算 */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  5. 预计月末总支出超预算预测
                </span>
                <span className="text-[10px] font-semibold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                  趋势推算
                </span>
              </div>
              <p className="text-xs text-slate-500">
                按当月已过天数的日均支出乘以当月总天数，若月末预计超过 ¥2,500 则提前提示。
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={localConfig.projectedMonthOverspend.enabled}
                onChange={(e) =>
                  updateLocal((prev) => ({
                    ...prev,
                    projectedMonthOverspend: { enabled: e.target.checked },
                  }))
                }
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900" />
            </label>
          </div>
        </div>
      </Card>

      {/* Section 2: 固定账单与周期性开支提醒 */}
      <Card
        title="二、固定账单与周期性支出提醒"
        subtitle="提前提醒校园网费、手机月租与 AI 工具订阅扣款，防止欠费断网或扣款失败"
        action={
          <button
            onClick={() => setIsAddingBill(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>添加固定账单</span>
          </button>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-xs font-medium text-slate-600">
            <div className="flex items-center gap-2">
              <span>提前提醒天数：</span>
              <select
                value={localConfig.billDue.advanceDays}
                onChange={(e) =>
                  updateLocal((prev) => ({
                    ...prev,
                    billDue: { ...prev.billDue, advanceDays: Number(e.target.value) },
                  }))
                }
                className="bg-white border border-slate-200 px-2 py-1 rounded-lg text-slate-900 font-bold outline-none cursor-pointer"
              >
                <option value={1}>提前 1 天</option>
                <option value={2}>提前 2 天</option>
                <option value={3}>提前 3 天 (推荐)</option>
                <option value={5}>提前 5 天</option>
                <option value={7}>提前 7 天</option>
              </select>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localConfig.billDue.enabled}
                onChange={(e) =>
                  updateLocal((prev) => ({
                    ...prev,
                    billDue: { ...prev.billDue, enabled: e.target.checked },
                  }))
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900" />
            </label>
          </div>

          {/* Recurring bills list */}
          <div className="divide-y divide-slate-100">
            {localConfig.billDue.bills.map((bill) => (
              <div
                key={bill.id}
                className="py-3 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {bill.dueDayOfMonth}日
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 truncate">{bill.name}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold text-[10px]">
                        {bill.category}
                      </span>
                      {bill.channel && (
                        <span className="text-[10px] text-slate-400">({bill.channel})</span>
                      )}
                    </div>
                    {bill.note && (
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{bill.note}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold text-slate-900 tabular-nums">
                    {formatCNY(bill.amount)}
                  </span>

                  <button
                    onClick={() => handleToggleBill(bill.id)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                      bill.enabled
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {bill.enabled ? '已启用' : '已暂停'}
                  </button>

                  <button
                    onClick={() => handleDeleteBill(bill.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="删除该账单"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Bill Form Modal/Drawer */}
          {isAddingBill && (
            <form
              onSubmit={handleAddBill}
              className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3"
            >
              <h4 className="text-xs font-bold text-slate-800">添加新的周期性固定账单</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">账单名称</label>
                  <input
                    type="text"
                    placeholder="如：宿舍水费、网易云音乐会员"
                    value={newBillName}
                    onChange={(e) => setNewBillName(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">固定金额 (CNY)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="如：25.00"
                    value={newBillAmount}
                    onChange={(e) =>
                      setNewBillAmount(e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">
                    每月扣款日 (1 - 31日)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={newBillDay}
                    onChange={(e) => setNewBillDay(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">扣款支付渠道</label>
                  <select
                    value={newBillChannel}
                    onChange={(e) => setNewBillChannel(e.target.value as PaymentChannel)}
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-slate-900"
                  >
                    {PAYMENT_CHANNELS.map((ch) => (
                      <option key={ch} value={ch}>
                        {ch}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600">备注说明（可选）</label>
                <input
                  type="text"
                  placeholder="如：微信自动扣费协议"
                  value={newBillNote}
                  onChange={(e) => setNewBillNote(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingBill(false)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  保存固定账单
                </button>
              </div>
            </form>
          )}
        </div>
      </Card>

      {/* Section 3: 连续多日消费异常偏高监测 */}
      <Card
        title="三、连续多日消费突增监测"
        subtitle="检测连续异常高支出周期，及时纠偏消费冲动与盲目囤货"
      >
        <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs sm:text-sm font-bold text-slate-900">
              连续支出高峰监测开关
            </span>
            <p className="text-xs text-slate-500">
              当连续多日每日本地净消费均高出指定基线时，触发理性消费复盘提醒。
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">连续天数：</span>
                <select
                  value={localConfig.consecutiveSpike.days}
                  onChange={(e) =>
                    updateLocal((prev) => ({
                      ...prev,
                      consecutiveSpike: {
                        ...prev.consecutiveSpike,
                        days: Number(e.target.value),
                      },
                    }))
                  }
                  className="bg-white border border-slate-200 px-2 py-1 rounded-lg text-slate-900 font-bold outline-none cursor-pointer"
                >
                  <option value={2}>连续 2 天</option>
                  <option value={3}>连续 3 天 (推荐)</option>
                  <option value={5}>连续 5 天</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">每日基准阈值：</span>
                <div className="flex items-center bg-white border border-slate-200 px-2 py-1 rounded-lg">
                  <span className="text-slate-400">¥</span>
                  <input
                    type="number"
                    min="30"
                    step="10"
                    value={localConfig.consecutiveSpike.dailyThreshold}
                    onChange={(e) =>
                      updateLocal((prev) => ({
                        ...prev,
                        consecutiveSpike: {
                          ...prev.consecutiveSpike,
                          dailyThreshold: Math.max(30, Number(e.target.value)),
                        },
                      }))
                    }
                    className="w-14 text-slate-900 font-bold outline-none ml-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 self-start sm:self-auto">
            <input
              type="checkbox"
              checked={localConfig.consecutiveSpike.enabled}
              onChange={(e) =>
                updateLocal((prev) => ({
                  ...prev,
                  consecutiveSpike: { ...prev.consecutiveSpike, enabled: e.target.checked },
                }))
              }
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900" />
          </label>
        </div>
      </Card>

      {/* Section 4: 通知渠道与免打扰时段 */}
      <Card
        title="四、通知渠道、免打扰与防疲劳策略"
        subtitle="自定义通知触达形式与深夜免打扰，保证预警重要性同时杜绝消息轰炸"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">应用内通知中心</span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-semibold">
                  基础常驻
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                顶部常驻铃铛图标，按预警严重程度红色/黄色徽章高亮显示。
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">首页仪表盘横幅</span>
                <input
                  type="checkbox"
                  checked={localConfig.channels.inPageBanner}
                  onChange={(e) =>
                    updateLocal((prev) => ({
                      ...prev,
                      channels: { ...prev.channels, inPageBanner: e.target.checked },
                    }))
                  }
                  className="rounded text-slate-900 focus:ring-0 cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                在首页顶部显著位置展示最高优先级的一条预警，可直接点击处理。
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">浏览器桌面通知</span>
                <input
                  type="checkbox"
                  disabled={notificationPermission !== 'granted'}
                  checked={localConfig.channels.browserDesktop && notificationPermission === 'granted'}
                  onChange={(e) =>
                    updateLocal((prev) => ({
                      ...prev,
                      channels: { ...prev.channels, browserDesktop: e.target.checked },
                    }))
                  }
                  className="rounded text-slate-900 focus:ring-0 cursor-pointer disabled:opacity-40"
                />
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {notificationPermission === 'granted'
                  ? '已获系统授权，支持前台页面脱敏桌面推送。'
                  : '未授权或被浏览器禁止，点击上方“授权”即可开启。'}
              </p>
            </div>
          </div>

          {/* Quiet Hours Configuration */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-indigo-700" />
                <span className="text-xs sm:text-sm font-bold text-indigo-950">
                  深夜免打扰时段 (DND)
                </span>
                {inQuietHours && (
                  <span className="text-[10px] bg-indigo-200 text-indigo-900 px-1.5 py-0.5 rounded font-bold">
                    当前生效中
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-800/80">
                在此时间段内，桌面通知全部静音，避免深夜或清晨打扰学生作息与睡眠。
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto text-xs">
              <input
                type="time"
                value={localConfig.quietHours.start}
                onChange={(e) =>
                  updateLocal((prev) => ({
                    ...prev,
                    quietHours: { ...prev.quietHours, start: e.target.value },
                  }))
                }
                className="bg-white border border-indigo-200 px-2 py-1 rounded-lg font-bold text-indigo-950 outline-none"
              />
              <span className="text-indigo-400">至</span>
              <input
                type="time"
                value={localConfig.quietHours.end}
                onChange={(e) =>
                  updateLocal((prev) => ({
                    ...prev,
                    quietHours: { ...prev.quietHours, end: e.target.value },
                  }))
                }
                className="bg-white border border-indigo-200 px-2 py-1 rounded-lg font-bold text-indigo-950 outline-none"
              />

              <label className="relative inline-flex items-center cursor-pointer ml-2">
                <input
                  type="checkbox"
                  checked={localConfig.quietHours.enabled}
                  onChange={(e) =>
                    updateLocal((prev) => ({
                      ...prev,
                      quietHours: { ...prev.quietHours, enabled: e.target.checked },
                    }))
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-indigo-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-indigo-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-900" />
              </label>
            </div>
          </div>

          {/* Cooldown Period */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-slate-800">防重复提醒冷却时间</span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                当您手动关闭或忽略一条预警后，系统在此周期内不会因页面刷新或轻微变动反复弹窗。
              </p>
            </div>
            <select
              value={localConfig.cooldownHours}
              onChange={(e) =>
                updateLocal((prev) => ({
                  ...prev,
                  cooldownHours: Number(e.target.value),
                }))
              }
              className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl font-bold text-slate-900 outline-none cursor-pointer"
            >
              <option value={12}>12 小时</option>
              <option value={24}>24 小时 (推荐)</option>
              <option value={48}>48 小时</option>
              <option value={72}>72 小时</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Section 5: 当前活动中的预警清单 (Live sandbox) */}
      <Card
        title={`五、当前正在触发的预警清单 (${activeAlerts.length})`}
        subtitle="实时反映当前账本数据与上述阈值匹配结果"
      >
        {activeAlerts.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-800">未触发任何预警</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              当前累计账本可用结余、单日消费、分类预算及固定账单均处于安全范围内。
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  alert.severity === 'danger'
                    ? 'bg-red-50/70 border-red-200 text-red-950'
                    : alert.severity === 'warning'
                    ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                    : 'bg-blue-50/70 border-blue-200 text-blue-950'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        alert.severity === 'danger'
                          ? 'bg-red-200 text-red-900'
                          : alert.severity === 'warning'
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-blue-200 text-blue-900'
                      }`}
                    >
                      {alert.severity === 'danger' ? '紧急' : alert.severity === 'warning' ? '警戒' : '提示'}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold truncate">{alert.title}</h4>
                  </div>
                  <p className="text-xs opacity-90">{alert.message}</p>
                  {alert.details.calculationBasis && (
                    <p className="text-[11px] opacity-75">{alert.details.calculationBasis}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto text-xs">
                  <button
                    onClick={() => onSnoozeAlert(alert.id)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl font-medium shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                    title="24 小时内不重复通知"
                  >
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>暂不提醒 (24h)</span>
                  </button>
                  <button
                    onClick={() => onDismissAlert(alert.id)}
                    className="px-2.5 py-1 bg-black/5 hover:bg-black/10 text-slate-700 rounded-xl font-medium transition-colors cursor-pointer"
                  >
                    忽略
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Section 6: 技术与计算口径透明度白皮书 */}
      <div className="p-5 bg-slate-900 text-slate-200 rounded-3xl space-y-3 shadow-xs">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Info className="w-4 h-4 text-amber-400" />
          <span>财务计算口径与推送技术真实边界声明</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 leading-relaxed">
          <div>
            <h5 className="font-semibold text-white mb-1">1. 账本估算余额口径</h5>
            <p>
              本应用未直接接入银行真实网银核心接口。页面显示的“可用结余”为<strong>“账本估算余额”</strong>，公式为：累计已录入收入 - 累计已录入净支出 - 外部转出。绝不能与您的银行卡实时物理存款混为一谈。
            </p>
          </div>
          <div>
            <h5 className="font-semibold text-white mb-1">2. 本地时区与退款冲抵</h5>
            <p>
              单日消费统计依据设备当前时区进行全天 00:00 至 23:59 截断，且严格将标记为退款（Credit）的流水全额反向冲抵，排除内部账户互转，杜绝重复计算与虚增支出。
            </p>
          </div>
          <div>
            <h5 className="font-semibold text-white mb-1">3. 桌面通知隐私脱敏保护</h5>
            <p>
              通过浏览器 Web Notification API 推送时，弹窗正文仅包含概括性提示（如“有 1 项财务预警待查看”），绝不将具体的银行账号、账户余额或交易商户泄露在电脑屏幕或锁屏上。
            </p>
          </div>
          <div>
            <h5 className="font-semibold text-white mb-1">4. 手机与后台推送客观边界</h5>
            <p>
              在当前 Web 架构下，浏览器通知在标签页保持运行时即刻生效；iOS iPhone 端离线原生推送需经 PWA 安装及后端 Web Push 专用服务器证书支持。若用户拒绝通知权限，所有预警仍完整呈现在应用内。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
