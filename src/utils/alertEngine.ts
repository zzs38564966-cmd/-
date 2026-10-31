/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AlertItem,
  AlertRuleConfig,
  BudgetSettings,
  RecurringBill,
  Transaction,
} from '../types/finance';

export const DEFAULT_RECURRING_BILLS: RecurringBill[] = [
  {
    id: 'bill_campus_net',
    name: '校园网宽带费',
    amount: 30,
    dueDayOfMonth: 1,
    category: '学习',
    channel: '微信支付',
    note: '月初校园网自动续费',
    enabled: true,
  },
  {
    id: 'bill_phone_plan',
    name: '手机套餐月租',
    amount: 39,
    dueDayOfMonth: 25,
    category: '手机及日常通信',
    channel: '支付宝',
    note: '月末手机资费代扣',
    enabled: true,
  },
  {
    id: 'bill_ai_sub',
    name: 'AI 漫剧工具订阅',
    amount: 140,
    dueDayOfMonth: 15,
    category: 'AI 软件及订阅',
    channel: '微信支付',
    note: 'Midjourney/绘画算力包月',
    enabled: true,
  },
];

export const DEFAULT_ALERT_CONFIG: AlertRuleConfig = {
  lowBalance: {
    enabled: true,
    threshold: 200, // 账本估算结余低于 200 元时提醒
  },
  dailySpend: {
    enabled: true,
    threshold: 100, // 单日净消费超过 100 元时提醒
  },
  category80: {
    enabled: true,
  },
  categoryOverspend: {
    enabled: true,
  },
  projectedMonthOverspend: {
    enabled: true,
  },
  billDue: {
    enabled: true,
    advanceDays: 3, // 提前 3 天提醒
    bills: DEFAULT_RECURRING_BILLS,
  },
  consecutiveSpike: {
    enabled: true,
    days: 3,
    dailyThreshold: 80, // 连续 3 天单日支出超过 80 元
  },
  channels: {
    inAppCenter: true,
    inPageBanner: true,
    browserDesktop: false,
  },
  quietHours: {
    enabled: true,
    start: '23:00',
    end: '08:00',
  },
  cooldownHours: 24,
};

export interface AlertHistoryRecord {
  id: string;
  dismissedAt?: number;
  snoozedUntil?: number;
  lastNotifiedAt?: number;
}

const STORAGE_KEY_ALERT_CONFIG = 'finance_alerts_config_v1';
const STORAGE_KEY_ALERT_HISTORY = 'finance_alerts_history_v1';

/**
 * Load alert configuration from local cache
 */
export function loadLocalAlertConfig(): AlertRuleConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ALERT_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_ALERT_CONFIG,
        ...parsed,
        lowBalance: { ...DEFAULT_ALERT_CONFIG.lowBalance, ...parsed.lowBalance },
        dailySpend: { ...DEFAULT_ALERT_CONFIG.dailySpend, ...parsed.dailySpend },
        billDue: {
          ...DEFAULT_ALERT_CONFIG.billDue,
          ...parsed.billDue,
          bills: parsed.billDue?.bills || DEFAULT_RECURRING_BILLS,
        },
        consecutiveSpike: {
          ...DEFAULT_ALERT_CONFIG.consecutiveSpike,
          ...parsed.consecutiveSpike,
        },
        channels: { ...DEFAULT_ALERT_CONFIG.channels, ...parsed.channels },
        quietHours: { ...DEFAULT_ALERT_CONFIG.quietHours, ...parsed.quietHours },
      };
    }
  } catch (e) {
    console.warn('Failed to load local alert config:', e);
  }
  return DEFAULT_ALERT_CONFIG;
}

/**
 * Save alert configuration to local cache
 */
export function saveLocalAlertConfig(config: AlertRuleConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_ALERT_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save alert config to localStorage:', e);
  }
}

/**
 * Load alert history (cooldown & snoozes)
 */
export function loadAlertHistory(): Record<string, AlertHistoryRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ALERT_HISTORY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to load alert history:', e);
  }
  return {};
}

/**
 * Save alert history
 */
export function saveAlertHistory(history: Record<string, AlertHistoryRecord>): void {
  try {
    localStorage.setItem(STORAGE_KEY_ALERT_HISTORY, JSON.stringify(history));
  } catch (e) {
    console.warn('Failed to save alert history:', e);
  }
}

/**
 * Get current date string (YYYY-MM-DD) in local user timezone
 */
export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Check if the current time falls inside quiet hours (免打扰时段)
 */
export function isCurrentlyInQuietHours(startStr: string, endStr: string): boolean {
  try {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);

    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    if (startTotal <= endTotal) {
      // e.g. 01:00 to 07:00
      return currentMinutes >= startTotal && currentMinutes < endTotal;
    } else {
      // Over midnight, e.g. 23:00 to 08:00
      return currentMinutes >= startTotal || currentMinutes < endTotal;
    }
  } catch {
    return false;
  }
}

/**
 * Core Financial Alert Engine
 * Evaluates all transactions, budgets, settings, and cooldown states
 */
export function evaluateFinancialAlerts(
  transactions: Transaction[],
  budget: BudgetSettings,
  config: AlertRuleConfig,
  history: Record<string, AlertHistoryRecord> = {}
): AlertItem[] {
  const alerts: AlertItem[] = [];
  const nowMs = Date.now();
  const today = new Date();
  const todayStr = getLocalDateString(today);
  const currentMonthStr = todayStr.slice(0, 7);
  const cooldownLimitMs = (config.cooldownHours || 24) * 60 * 60 * 1000;

  // Helper: check if alert is suppressed by snooze or cooldown
  const isSuppressed = (alertId: string): boolean => {
    const record = history[alertId];
    if (!record) return false;

    // Check Snooze
    if (record.snoozedUntil && record.snoozedUntil > nowMs) {
      return true;
    }

    // Check Dismiss Cooldown
    if (record.dismissedAt && nowMs - record.dismissedAt < cooldownLimitMs) {
      return true;
    }

    return false;
  };

  // 1. 可用余额计算与预警 (账本估算结余)
  // 口径：累计总收入 - 累计净支出 (支出扣减退款) - 独立外部转账
  if (config.lowBalance.enabled) {
    let totalIncome = 0;
    let totalNetExpense = 0;
    let totalTransfers = 0;

    transactions.forEach((tx) => {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else if (tx.type === 'expense') {
        if (tx.isRefund) {
          totalNetExpense -= tx.amount;
        } else {
          totalNetExpense += tx.amount;
        }
      } else if (tx.type === 'transfer') {
        // transfers out to investment or emergency
        totalTransfers += tx.amount;
      }
    });

    // 账本估算可用结余
    const bookEstimatedBalance = Math.round((totalIncome - totalNetExpense - totalTransfers) * 100) / 100;
    const threshold = config.lowBalance.threshold;

    if (bookEstimatedBalance < threshold) {
      const alertId = `low_balance_${currentMonthStr}`;
      if (!isSuppressed(alertId)) {
        const isCritical = bookEstimatedBalance <= 50;
        alerts.push({
          id: alertId,
          type: 'low_balance',
          title: isCritical ? '账本估算结余告急！' : '账本估算结余偏低提醒',
          message: `当前账本估算可用结余为 ¥${bookEstimatedBalance.toFixed(2)}，已低于设定的警戒阈值 ¥${threshold.toFixed(2)}。建议缩减非必要弹性支出。`,
          severity: isCritical ? 'danger' : 'warning',
          timestamp: nowMs,
          details: {
            currentValue: bookEstimatedBalance,
            threshold,
            calculationBasis:
              '账本估算结余口径：累计所有录入收入减累计净支出与资金分配，非实时银行卡联网数据。',
          },
        });
      }
    }
  }

  // 2. 单日消费限额预警 (按用户本地时区、扣减当日退款、排除转账)
  if (config.dailySpend.enabled) {
    let todayNormalExpense = 0;
    let todayRefunds = 0;

    transactions.forEach((tx) => {
      if (tx.date === todayStr && tx.type === 'expense') {
        if (tx.isRefund) {
          todayRefunds += tx.amount;
        } else {
          todayNormalExpense += tx.amount;
        }
      }
    });

    const todayNetExpense = Math.max(0, todayNormalExpense - todayRefunds);
    const threshold = config.dailySpend.threshold;

    if (todayNetExpense > threshold) {
      const alertId = `daily_spend_${todayStr}`;
      if (!isSuppressed(alertId)) {
        const isCritical = todayNetExpense > threshold * 1.5;
        alerts.push({
          id: alertId,
          type: 'daily_spend',
          title: isCritical ? '今日支出严重超出单日上限' : '今日支出超出单日限额',
          message: `今日（${todayStr}）净支出已达 ¥${todayNetExpense.toFixed(2)}，已超过您设定的单日限额 ¥${threshold.toFixed(2)}。`,
          severity: isCritical ? 'danger' : 'warning',
          timestamp: nowMs,
          details: {
            currentValue: todayNetExpense,
            threshold,
            calculationBasis: `统计周期：本地时区 ${todayStr} 全天。已自动冲抵退款 ¥${todayRefunds.toFixed(2)}，严格排除账户转账。`,
          },
        });
      }
    }
  }

  // 3. 类别预算达到 80% 与超支预警 (当前月份)
  const currentMonthTransactions = transactions.filter((tx) =>
    tx.date.startsWith(currentMonthStr)
  );

  budget.buckets.forEach((bucket) => {
    let spent = 0;
    currentMonthTransactions.forEach((tx) => {
      if (tx.type === 'expense') {
        let isMatch = false;
        if (bucket.id === 'ai_drama' && (tx.category === 'AI 漫剧' || tx.category === 'AI 软件及订阅')) {
          isMatch = true;
        } else if (bucket.id === 'living' && bucket.categories.includes(tx.category)) {
          isMatch = true;
        } else if (bucket.id === 'invest' && tx.category === '投资') {
          isMatch = true;
        } else if (bucket.id === 'emergency' && tx.category === '应急储蓄') {
          isMatch = true;
        } else if (bucket.categories.includes(tx.category)) {
          isMatch = true;
        }

        if (isMatch) {
          spent += tx.isRefund ? -tx.amount : tx.amount;
        }
      }
    });
    spent = Math.max(0, spent);

    // 检查超支 (100%+)
    if (config.categoryOverspend.enabled && spent > bucket.amount) {
      const alertId = `category_overspend_${bucket.id}_${currentMonthStr}`;
      if (!isSuppressed(alertId)) {
        alerts.push({
          id: alertId,
          type: 'category_overspend',
          title: `类别超支警报：【${bucket.name}】`,
          message: `【${bucket.name}】本月已支出 ¥${spent.toFixed(2)}，已超出额定预算 ¥${bucket.amount.toFixed(2)}（超支 ¥${(spent - bucket.amount).toFixed(2)}）。`,
          severity: 'danger',
          timestamp: nowMs,
          details: {
            currentValue: spent,
            threshold: bucket.amount,
            targetName: bucket.name,
            calculationBasis: `当月累计消费已扣减退款，超支率 ${((spent / bucket.amount) * 100).toFixed(0)}%。`,
          },
        });
      }
    }
    // 检查预警 (80% ~ 100%)
    else if (config.category80.enabled && spent >= bucket.amount * 0.8 && spent <= bucket.amount) {
      const alertId = `category_80_${bucket.id}_${currentMonthStr}`;
      if (!isSuppressed(alertId)) {
        alerts.push({
          id: alertId,
          type: 'category_80',
          title: `预算警戒线：【${bucket.name}】已达 80%`,
          message: `【${bucket.name}】本月已支出 ¥${spent.toFixed(2)}（预算 ¥${bucket.amount.toFixed(2)}，使用率 ${((spent / bucket.amount) * 100).toFixed(0)}%），即将用尽。`,
          severity: 'warning',
          timestamp: nowMs,
          details: {
            currentValue: spent,
            threshold: bucket.amount,
            targetName: bucket.name,
            calculationBasis: `当月净支出已达 ${((spent / bucket.amount) * 100).toFixed(1)}%，剩余额度 ¥${(bucket.amount - spent).toFixed(2)}。`,
          },
        });
      }
    }
  });

  // 4. 预计本月总支出超预算预警 (基于前 N 天外推)
  if (config.projectedMonthOverspend.enabled) {
    const currentDay = today.getDate();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();

    // 至少从第 3 天开始评估，避免月初基数过小导致偏差过大
    if (currentDay >= 3) {
      let monthNormalExpense = 0;
      let monthRefunds = 0;

      currentMonthTransactions.forEach((tx) => {
        if (tx.type === 'expense') {
          if (tx.isRefund) {
            monthRefunds += tx.amount;
          } else {
            monthNormalExpense += tx.amount;
          }
        }
      });

      const totalSpentSoFar = Math.max(0, monthNormalExpense - monthRefunds);

      // 如果尚未直接超支，但按日均外推将超支
      if (totalSpentSoFar <= budget.totalBudget && totalSpentSoFar > 0) {
        const dailyAverage = totalSpentSoFar / currentDay;
        const projectedTotal = Math.round(dailyAverage * daysInMonth);

        if (projectedTotal > budget.totalBudget) {
          const alertId = `projected_overspend_${currentMonthStr}`;
          if (!isSuppressed(alertId)) {
            alerts.push({
              id: alertId,
              type: 'projected_overspend',
              title: '预测本月支出将超出总预算',
              message: `按前 ${currentDay} 天日均支出 ¥${dailyAverage.toFixed(2)} 测算，预计月末累计支出将达 ¥${projectedTotal}，超出基准月预算（¥${budget.totalBudget}）约 ¥${projectedTotal - budget.totalBudget}。`,
              severity: 'warning',
              timestamp: nowMs,
              details: {
                currentValue: projectedTotal,
                threshold: budget.totalBudget,
                calculationBasis: `线性外推公式：(已发生净支出 ¥${totalSpentSoFar.toFixed(0)} ÷ 已过 ${currentDay} 天) × 当月总天数 ${daysInMonth} 天。`,
              },
            });
          }
        }
      }
    }
  }

  // 5. 固定账单到期前提醒 (校园网、话费、AI 工具订阅等)
  if (config.billDue.enabled && config.billDue.bills.length > 0) {
    const currentDay = today.getDate();

    config.billDue.bills
      .filter((b) => b.enabled)
      .forEach((bill) => {
        const dueDay = bill.dueDayOfMonth;
        const advanceDays = config.billDue.advanceDays || 3;

        // 计算距离扣款日的天数 (当月内)
        const daysRemaining = dueDay - currentDay;

        if (daysRemaining >= 0 && daysRemaining <= advanceDays) {
          const alertId = `bill_due_${bill.id}_${currentMonthStr}_${dueDay}`;
          if (!isSuppressed(alertId)) {
            const isToday = daysRemaining === 0;
            alerts.push({
              id: alertId,
              type: 'bill_due',
              title: isToday ? `今日固定账单扣款：${bill.name}` : `固定账单即将扣费：${bill.name}`,
              message: isToday
                ? `【今日扣费】${bill.name} 应付 ¥${bill.amount.toFixed(2)}（每月 ${dueDay} 日），请确保扣款渠道（${bill.channel || '指定账户'}）资金充足。`
                : `【将在 ${daysRemaining} 天后扣费】${bill.name} 应付 ¥${bill.amount.toFixed(2)}（预计每月 ${dueDay} 日），提前提醒备好资金。`,
              severity: isToday ? 'danger' : 'info',
              timestamp: nowMs,
              details: {
                currentValue: bill.amount,
                targetName: bill.name,
                dueDay,
                daysRemaining,
                calculationBasis: `固定周期扣费规则：每月 ${dueDay} 日自动发生，提前 ${advanceDays} 天发出备用金提醒。`,
              },
            });
          }
        }
      });
  }

  // 6. 连续多日消费异常尖峰监控 (连续 N 天均高于指定水平)
  if (config.consecutiveSpike.enabled) {
    const consecutiveDays = config.consecutiveSpike.days || 3;
    const spikeThreshold = config.consecutiveSpike.dailyThreshold || 80;

    // 检查最近 N 天的每日支出
    const lastNDaysDates: string[] = [];
    for (let i = 0; i < consecutiveDays; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      lastNDaysDates.push(getLocalDateString(d));
    }

    const dailyNetExpenses: Record<string, number> = {};
    lastNDaysDates.forEach((dateStr) => {
      let normal = 0;
      let refund = 0;
      transactions.forEach((tx) => {
        if (tx.date === dateStr && tx.type === 'expense') {
          if (tx.isRefund) refund += tx.amount;
          else normal += tx.amount;
        }
      });
      dailyNetExpenses[dateStr] = Math.max(0, normal - refund);
    });

    const isAllSpiking = lastNDaysDates.every(
      (dateStr) => dailyNetExpenses[dateStr] >= spikeThreshold
    );

    if (isAllSpiking) {
      const alertId = `consecutive_spike_${todayStr}`;
      if (!isSuppressed(alertId)) {
        const totalNet = lastNDaysDates.reduce((sum, d) => sum + dailyNetExpenses[d], 0);
        const avg = totalNet / consecutiveDays;

        alerts.push({
          id: alertId,
          type: 'consecutive_spike',
          title: `连续 ${consecutiveDays} 日消费明显偏高`,
          message: `监测到连续 ${consecutiveDays} 天（${lastNDaysDates[lastNDaysDates.length - 1]} 至 ${todayStr}）每日支出均超过 ¥${spikeThreshold}（日均支出高达 ¥${avg.toFixed(2)}）。`,
          severity: 'warning',
          timestamp: nowMs,
          details: {
            currentValue: avg,
            threshold: spikeThreshold,
            calculationBasis: `统计口径：最近 ${consecutiveDays} 天每日净支出（扣减退款），均超设定基线 ¥${spikeThreshold}。`,
          },
        });
      }
    }
  }

  // 按严重程度排序: danger (紧急) -> warning (预警) -> info (提示)
  const severityOrder = { danger: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return alerts;
}

/**
 * Request Browser Desktop Notification permission
 */
export async function requestDesktopNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Failed to request notification permission:', err);
    return 'denied';
  }
}

/**
 * Dispatch desktop notification with privacy desensitization
 * IMPORTANT: Never expose private dollar amounts, bank cards, or merchant details in OS notifications!
 */
export function sendPrivacySafeDesktopNotification(
  alertCount: number,
  highestSeverity: 'danger' | 'warning' | 'info'
): void {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  try {
    const title = '个人财务管理工作台';
    const tag = `finance_alert_${Date.now()}`;
    let body = `您有 ${alertCount} 项新的财务预警，请打开工作台查看详情。`;

    if (highestSeverity === 'danger') {
      body = `工作台检测到紧急收支警戒，请及时进入应用核对预算与余额。`;
    }

    new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag,
      silent: false,
    });
  } catch (e) {
    console.warn('Unable to show Notification:', e);
  }
}
