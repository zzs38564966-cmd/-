/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Award,
  Download,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { BudgetSettings, Transaction, ActiveTab } from '../types/finance';
import { formatCNY, formatMonthCN, getPreviousMonthString } from '../utils/formatters';
import { getCategoryColorClass, getCategoryIcon } from '../utils/categoryIcons';
import { exportBudgetSummaryToCSV } from '../utils/csv';
import { Card } from './ui/Card';
import { StatCard } from './ui/StatCard';
import { FinanceSubNav } from './FinanceSubNav';

interface SummaryViewProps {
  selectedMonth: string;
  transactions: Transaction[];
  budget: BudgetSettings;
  onNavigateToTab?: (tab: ActiveTab) => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  selectedMonth,
  transactions,
  budget,
  onNavigateToTab,
}) => {
  const currentMonthTransactions = transactions.filter((tx) => tx.date.startsWith(selectedMonth));

  const totalIncome = currentMonthTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((s, tx) => s + tx.amount, 0);

  const normalExpense = currentMonthTransactions
    .filter((tx) => tx.type === 'expense' && !tx.isRefund)
    .reduce((s, tx) => s + tx.amount, 0);

  const refundAmount = currentMonthTransactions
    .filter((tx) => tx.isRefund)
    .reduce((s, tx) => s + tx.amount, 0);

  const totalExpense = Math.max(0, normalExpense - refundAmount);

  const totalTransfer = currentMonthTransactions
    .filter((tx) => tx.type === 'transfer')
    .reduce((s, tx) => s + tx.amount, 0);

  const balance = totalIncome - totalExpense;

  const unclassifiedCount = currentMonthTransactions.filter(
    (tx) => !tx.isCategorized || tx.category === '待分类'
  ).length;

  const categorySpentMap: Record<string, number> = {};
  currentMonthTransactions
    .filter((tx) => tx.type === 'expense')
    .forEach((tx) => {
      const cat = tx.category || '待分类';
      categorySpentMap[cat] = (categorySpentMap[cat] || 0) + tx.amount;
    });

  const categoryRanking = Object.entries(categorySpentMap).sort((a, b) => b[1] - a[1]);
  const topThree = categoryRanking.slice(0, 3);

  const prevMonthStr = getPreviousMonthString(selectedMonth);
  const prevMonthTransactions = transactions.filter((tx) => tx.date.startsWith(prevMonthStr));
  const hasPrevData = prevMonthTransactions.length > 0;

  const prevMonthExpense = prevMonthTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((s, tx) => s + tx.amount, 0);

  const momExpenseDiff = hasPrevData ? totalExpense - prevMonthExpense : 0;
  const momExpensePct =
    hasPrevData && prevMonthExpense > 0 ? (momExpenseDiff / prevMonthExpense) * 100 : 0;

  const bucketSpentMap: Record<string, number> = {};
  budget.buckets.forEach((b) => {
    bucketSpentMap[b.id] = 0;
  });

  currentMonthTransactions.forEach((tx) => {
    if (tx.type === 'expense') {
      if (tx.category === 'AI 漫剧' || tx.category === 'AI 软件及订阅') {
        bucketSpentMap['ai_drama'] = (bucketSpentMap['ai_drama'] || 0) + tx.amount;
      } else if (tx.category === '投资') {
        bucketSpentMap['invest'] = (bucketSpentMap['invest'] || 0) + tx.amount;
      } else if (tx.category === '应急储蓄') {
        bucketSpentMap['savings'] = (bucketSpentMap['savings'] || 0) + tx.amount;
      } else if (tx.category === '灵活资金') {
        bucketSpentMap['flexible'] = (bucketSpentMap['flexible'] || 0) + tx.amount;
      } else {
        bucketSpentMap['living'] = (bucketSpentMap['living'] || 0) + tx.amount;
      }
    } else if (tx.type === 'transfer') {
      if (tx.category === '投资转入') {
        bucketSpentMap['invest'] = (bucketSpentMap['invest'] || 0) + tx.amount;
      } else if (tx.category === '应急储蓄转入') {
        bucketSpentMap['savings'] = (bucketSpentMap['savings'] || 0) + tx.amount;
      }
    }
  });

  const handleExportSummaryCSV = () => {
    const csvContent = exportBudgetSummaryToCSV(
      formatMonthCN(selectedMonth),
      totalIncome,
      totalExpense,
      totalTransfer,
      budget,
      bucketSpentMap
    );

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `财务月度总结_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 pb-12 max-w-5xl mx-auto">
      {onNavigateToTab && (
        <FinanceSubNav activeTab="summary" onNavigateToTab={onNavigateToTab} />
      )}

      {/* Header Card */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <span>{formatMonthCN(selectedMonth)} 财务执行总结</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              真实核算
            </span>
          </div>
        }
        subtitle="系统根据实际记账流水进行客观汇总，呈现大学生收支平衡与预算把控。"
        action={
          <button
            onClick={handleExportSummaryCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出总结 (CSV)</span>
          </button>
        }
      />

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="本月总收入"
          value={formatCNY(totalIncome)}
          subtitle="生活费与兼职/漫剧收益"
          icon={<TrendingUp className="w-4 h-4" />}
          iconBg="bg-emerald-50 text-emerald-600"
          valueColor="text-emerald-600"
        />

        <StatCard
          title="本月总支出"
          value={formatCNY(totalExpense)}
          subtitle="日常伙食与项目实际花销"
          icon={<TrendingDown className="w-4 h-4" />}
          iconBg="bg-red-50 text-red-600"
          valueColor="text-slate-900"
        />

        <StatCard
          title="本月净结余"
          value={formatCNY(balance, true)}
          subtitle="实收减实支结余"
          icon={<Wallet className="w-4 h-4" />}
          iconBg="bg-blue-50 text-blue-600"
          valueColor={balance >= 0 ? 'text-slate-900' : 'text-red-600'}
        />

        <StatCard
          title="储蓄与投资分配"
          value={formatCNY(totalTransfer)}
          subtitle="转入专户 · 不计入消费"
          icon={<PiggyBank className="w-4 h-4" />}
          iconBg="bg-purple-50 text-purple-600"
          valueColor="text-purple-700"
        />
      </div>

      {/* Top 3 & Month-over-Month Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card
          title={
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>最大的三项支出类别</span>
            </div>
          }
        >
          {topThree.length === 0 ? (
            <div className="text-center text-xs text-slate-400 py-8">本月暂无支出流水</div>
          ) : (
            <div className="space-y-3">
              {topThree.map(([cat, amt], idx) => {
                const ratio = totalExpense > 0 ? (amt / totalExpense) * 100 : 0;
                const colorInfo = getCategoryColorClass(cat);
                return (
                  <div key={cat} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[9px] font-bold">
                          {idx + 1}
                        </span>
                        <span className={`p-1 rounded-md ${colorInfo.bg} ${colorInfo.text}`}>
                          {getCategoryIcon(cat, 'w-3 h-3')}
                        </span>
                        <span className="font-bold text-slate-900">{cat}</span>
                      </div>
                      <div className="text-right tabular-nums">
                        <span className="font-bold text-slate-900">{formatCNY(amt)}</span>
                        <span className="text-[11px] text-slate-500 ml-1.5">占比 {ratio.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-800 rounded-full" style={{ width: `${ratio}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card
          title={
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-500" />
              <span>与上月支出环比对比</span>
            </div>
          }
          action={<span className="text-xs text-slate-400">基准: {formatMonthCN(prevMonthStr)}</span>}
        >
          {hasPrevData ? (
            <div className="space-y-3.5 flex flex-col justify-center">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">上月总支出 ({formatMonthCN(prevMonthStr)}):</span>
                  <span className="font-bold tabular-nums text-slate-800">
                    {formatCNY(prevMonthExpense)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">本月总支出 ({formatMonthCN(selectedMonth)}):</span>
                  <span className="font-bold tabular-nums text-slate-900">{formatCNY(totalExpense)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200/80 flex justify-between items-center">
                  <span className="font-semibold text-slate-700">支出变化幅度:</span>
                  <span
                    className={`font-bold tabular-nums ${
                      momExpenseDiff > 0 ? 'text-red-600' : 'text-emerald-700'
                    }`}
                  >
                    {momExpenseDiff > 0 ? `+${formatCNY(momExpenseDiff)}` : formatCNY(momExpenseDiff)} (
                    {momExpensePct >= 0 ? `+${momExpensePct.toFixed(1)}%` : `${momExpensePct.toFixed(1)}%`})
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {momExpenseDiff > 0
                  ? '注意：本月日常支出较上月有所增加，请重点关注餐饮及AI漫剧订阅开销。'
                  : '太棒了：本月支出较上月有所节约，资金把控良好。'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
              <AlertCircle className="w-7 h-7 text-slate-300 mb-1.5" />
              <p className="text-xs font-semibold text-slate-700">暂无足够历史数据对比</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">
                上个月（{formatMonthCN(prevMonthStr)}）暂无记账记录。系统严格遵守客观原则，不编造虚假数据。
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Budget Execution Table */}
      <Card
        title="各板块预算完成情况"
        subtitle="5大规划板块合计 2,500 元预算执行核验"
        action={
          unclassifiedCount > 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-semibold">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>待分类: {unclassifiedCount} 笔</span>
            </div>
          ) : undefined
        }
        noPadding={true}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-2.5 px-4 sm:px-5">预算板块</th>
                <th className="py-2.5 px-3 text-right">预算金额</th>
                <th className="py-2.5 px-3 text-right">实际发生</th>
                <th className="py-2.5 px-3 text-right">剩余额度</th>
                <th className="py-2.5 px-3 text-center">执行率</th>
                <th className="py-2.5 px-4 sm:px-5 text-center">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {budget.buckets.map((b) => {
                const spent = bucketSpentMap[b.id] || 0;
                const remaining = b.amount - spent;
                const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
                const isOver = spent > b.amount;
                const isWarning = !isOver && pct >= 80;

                return (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 sm:px-5 font-bold text-slate-900">
                      <div>{b.name}</div>
                      <div className="text-[11px] font-normal text-slate-400 truncate max-w-xs">
                        {b.description}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-semibold text-slate-700">
                      {formatCNY(b.amount)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-bold text-slate-900">
                      {formatCNY(spent)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right tabular-nums font-bold ${
                        remaining >= 0 ? 'text-slate-800' : 'text-red-600'
                      }`}
                    >
                      {formatCNY(remaining)}
                    </td>
                    <td className="py-3 px-3 text-center tabular-nums font-semibold">
                      {pct.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 sm:px-5 text-center">
                      {isOver ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                          超出预算
                        </span>
                      ) : isWarning ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          已达 80%
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700">
                          良好
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
