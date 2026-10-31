/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  TrendingDown,
  TrendingUp,
  Wallet,
  Calendar,
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  ShieldAlert,
  Plus,
} from 'lucide-react';
import { AlertItem, BudgetSettings, Transaction } from '../types/finance';
import { formatCNY, getCurrentMonthString } from '../utils/formatters';
import { Card } from './ui/Card';
import { StatCard } from './ui/StatCard';
import { TransactionItem } from './ui/TransactionItem';
import { EmptyState } from './ui/EmptyState';

interface DashboardViewProps {
  selectedMonth: string;
  transactions: Transaction[];
  budget: BudgetSettings;
  activeAlerts?: AlertItem[];
  showInPageBanner?: boolean;
  onNavigateToTab: (tab: any) => void;
  onOpenAddModal: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onSnoozeAlert?: (alertId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  selectedMonth,
  transactions,
  budget,
  activeAlerts = [],
  showInPageBanner = true,
  onNavigateToTab,
  onOpenAddModal,
  onEditTransaction,
  onSnoozeAlert,
}) => {
  // Filter transactions for selected month
  const monthTransactions = transactions.filter((tx) => tx.date.startsWith(selectedMonth));

  // 1. 本月支出 (日常与项目消费，自动冲抵退款金额，转账与资金分配独立隔离)
  const normalExpense = monthTransactions
    .filter((tx) => tx.type === 'expense' && !tx.isRefund)
    .reduce((sum, tx) => sum + tx.amount, 0);

  const refundAmount = monthTransactions
    .filter((tx) => tx.isRefund)
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpense = Math.max(0, normalExpense - refundAmount);

  // 2. 本月收入 (生活费与兼职收益)
  const totalIncome = monthTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // 3. 结余 (实际收入 - 实际净支出)
  const balance = totalIncome - totalExpense;

  // 4. 计算今日可用金额 (Today's remaining daily allowance)
  const remainingBudget = budget.totalBudget - totalExpense;
  const isCurrentMonth = selectedMonth === getCurrentMonthString();

  let todayAvailableAmount = 0;
  let remainingDaysText = '';

  if (isCurrentMonth) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const currentDay = today.getDate();
    const remainingDays = Math.max(1, totalDaysInMonth - currentDay + 1);

    todayAvailableAmount = Math.max(0, remainingBudget) / remainingDays;
    remainingDaysText = `本月尚余 ${remainingDays} 天 · 日均建议额`;
  } else {
    remainingDaysText = '历史月份已归档结算';
  }

  // 5. 预算进度与预警
  const budgetExecutionRate = budget.totalBudget > 0 ? (totalExpense / budget.totalBudget) * 100 : 0;
  const isBudgetOver = totalExpense > budget.totalBudget;
  const isBudgetWarning = !isBudgetOver && budgetExecutionRate >= 80;

  // Check specific bucket warnings
  const bucketOverAlerts: string[] = [];
  budget.buckets.forEach((b) => {
    let spent = 0;
    monthTransactions.forEach((tx) => {
      if (tx.type === 'expense') {
        if (b.id === 'ai_drama' && (tx.category === 'AI 漫剧' || tx.category === 'AI 软件及订阅')) {
          spent += tx.amount;
        } else if (b.id === 'living' && b.categories.includes(tx.category)) {
          spent += tx.amount;
        }
      }
    });
    if (spent > b.amount) {
      bucketOverAlerts.push(`${b.name}超额 ¥${(spent - b.amount).toFixed(0)}`);
    }
  });

  // 6. 待分类提醒
  const unclassifiedCount = transactions.filter(
    (tx) => !tx.isCategorized || tx.category === '待分类'
  ).length;

  // 7. 最近交易流水 (5 笔精简展示)
  const recentTransactions = [...monthTransactions]
    .sort(
      (a, b) =>
        new Date(`${b.date}T${b.time || '00:00'}`).getTime() -
        new Date(`${a.date}T${a.time || '00:00'}`).getTime()
    )
    .slice(0, 6);

  const topAlert = activeAlerts.length > 0 ? activeAlerts[0] : null;

  return (
    <div className="space-y-5 pb-10 max-w-6xl mx-auto">
      {/* 财务预警首推横幅 (在存在有效预警且开启首页横幅时展示) */}
      {showInPageBanner && topAlert && (
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border shadow-xs transition-all ${
            topAlert.severity === 'danger'
              ? 'bg-red-50/95 border-red-200'
              : topAlert.severity === 'warning'
              ? 'bg-amber-50/95 border-amber-200'
              : 'bg-blue-50/95 border-blue-200'
          }`}
        >
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                topAlert.severity === 'danger'
                  ? 'bg-red-100 text-red-700'
                  : topAlert.severity === 'warning'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {topAlert.severity === 'danger' ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    topAlert.severity === 'danger'
                      ? 'bg-red-200 text-red-900'
                      : 'bg-amber-200 text-amber-900'
                  }`}
                >
                  {topAlert.severity === 'danger' ? '超支警报' : '财务预警'}
                </span>
                <p
                  className={`text-xs sm:text-sm font-bold truncate ${
                    topAlert.severity === 'danger' ? 'text-red-950' : 'text-amber-950'
                  }`}
                >
                  {topAlert.title}
                </p>
                {activeAlerts.length > 1 && (
                  <span className="text-[11px] text-slate-500 hidden sm:inline">
                    (等共 {activeAlerts.length} 项)
                  </span>
                )}
              </div>
              <p
                className={`text-xs mt-0.5 ${
                  topAlert.severity === 'danger' ? 'text-red-800' : 'text-amber-800'
                }`}
              >
                {topAlert.message}
              </p>
              {topAlert.details.calculationBasis && (
                <p className="text-[10px] text-slate-500 mt-0.5 opacity-90">
                  {topAlert.details.calculationBasis}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            {onSnoozeAlert && (
              <button
                onClick={() => onSnoozeAlert(topAlert.id)}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                title="24 小时内不再提示该项"
              >
                暂不提醒 (24h)
              </button>
            )}
            <button
              onClick={() => onNavigateToTab('alerts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs whitespace-nowrap ${
                topAlert.severity === 'danger'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              <span>查看预警中心</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 待分类提示横幅（仅在存在未分类时显示） */}
      {unclassifiedCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 bg-amber-50/90 border border-amber-200/80 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-amber-900 truncate">
                您有 {unclassifiedCount} 笔流水尚未归类
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                及时归类可确保生活费与AI漫剧预算预警精准无误。
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab('unclassified')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs whitespace-nowrap self-start sm:self-auto"
          >
            <span>立即处理</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 首页 4 大核心指标卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 本月消费支出 */}
        <StatCard
          title="本月消费支出"
          value={formatCNY(totalExpense)}
          subtitle="日常伙食与项目实际支出"
          icon={<TrendingDown className="w-4 h-4" />}
          iconBg="bg-red-50 text-red-600"
          valueColor="text-slate-900"
        />

        {/* 本月收入 */}
        <StatCard
          title="本月累计收入"
          value={formatCNY(totalIncome)}
          subtitle="生活费与兼职/漫剧收益"
          icon={<TrendingUp className="w-4 h-4" />}
          iconBg="bg-emerald-50 text-emerald-600"
          valueColor="text-emerald-600"
        />

        {/* 可用结余 */}
        <StatCard
          title="当月净结余"
          value={formatCNY(balance, true)}
          subtitle="计算口径: 实收减实支"
          icon={<Wallet className="w-4 h-4" />}
          iconBg="bg-blue-50 text-blue-600"
          valueColor={balance >= 0 ? 'text-slate-900' : 'text-red-600'}
        />

        {/* 今日建议可用金额 (核心大学生指标) */}
        <StatCard
          title="今日建议可用"
          value={isCurrentMonth ? formatCNY(todayAvailableAmount) : '已结算'}
          subtitle={remainingDaysText}
          icon={<Calendar className="w-4 h-4" />}
          iconBg="bg-purple-50 text-purple-600"
          valueColor="text-purple-700"
        />
      </div>

      {/* 预算使用进度看板与重要预警 */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <span>月度总预算执行进度</span>
            {isBudgetOver ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>超预算警告</span>
              </span>
            ) : isBudgetWarning ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>已达 80% 警戒线</span>
              </span>
            ) : (
              <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold">
                进度健康
              </span>
            )}
          </div>
        }
        subtitle={`基准月预算 ¥2,500.00 · 已发生 ${formatCNY(totalExpense)} · 剩余 ${formatCNY(
          remainingBudget
        )}`}
        action={
          <button
            onClick={() => onNavigateToTab('budget')}
            className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <span>完整预算方案</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        }
      >
        <div className="space-y-3">
          {/* Progress Bar */}
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isBudgetOver
                  ? 'bg-red-500'
                  : isBudgetWarning
                  ? 'bg-amber-500'
                  : 'bg-slate-900'
              }`}
              style={{ width: `${Math.min(budgetExecutionRate, 100)}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-1">
            <span>
              已用预算: <strong className="text-slate-800 tabular-nums">{budgetExecutionRate.toFixed(1)}%</strong>
            </span>
            {bucketOverAlerts.length > 0 ? (
              <span className="text-red-600 font-semibold">
                ⚠️ 板块预警：{bucketOverAlerts.join('、')}
              </span>
            ) : (
              <span>生活费用 (¥1,080) 与 AI 漫剧 (¥350) 均在规划内</span>
            )}
          </div>
        </div>
      </Card>

      {/* 最近交易流水列表 */}
      <Card
        title="最近交易记录"
        subtitle="本月最新发生的 5~6 笔流水，点击条目可快速修改"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>记一笔</span>
            </button>
            <button
              onClick={() => onNavigateToTab('transactions')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors cursor-pointer ml-1"
            >
              <span>查看全部</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        }
        noPadding={true}
      >
        {recentTransactions.length === 0 ? (
          <EmptyState
            title="本月暂无交易记录"
            description="点击上方「记一笔」按钮，记录您的第一笔开销或生活费。"
            action={{
              label: "+ 记第一笔账",
              onClick: onOpenAddModal,
            }}
          />
        ) : (
          <div className="divide-y divide-slate-100 p-1">
            {recentTransactions.map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                onClick={() => onEditTransaction(tx)}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
