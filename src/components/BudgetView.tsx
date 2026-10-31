/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  PieChart,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Sliders,
  RotateCcw,
  Save,
  Check,
} from 'lucide-react';
import { BudgetBucket, BudgetSettings, Transaction, ActiveTab } from '../types/finance';
import { formatCNY } from '../utils/formatters';
import { DEFAULT_BUDGET_SETTINGS } from '../utils/storage';
import { Card } from './ui/Card';
import { FinanceSubNav } from './FinanceSubNav';

interface BudgetViewProps {
  selectedMonth: string;
  transactions: Transaction[];
  budget: BudgetSettings;
  onUpdateBudget: (newBudget: BudgetSettings) => void;
  onNavigateToTab?: (tab: ActiveTab) => void;
}

export const BudgetView: React.FC<BudgetViewProps> = ({
  selectedMonth,
  transactions,
  budget,
  onUpdateBudget,
  onNavigateToTab,
}) => {
  const [editingBuckets, setEditingBuckets] = useState<BudgetBucket[]>(budget.buckets);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  const monthTransactions = transactions.filter((tx) => tx.date.startsWith(selectedMonth));

  const bucketSpentMap: Record<string, number> = {};
  budget.buckets.forEach((b) => {
    bucketSpentMap[b.id] = 0;
  });

  monthTransactions.forEach((tx) => {
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

  const currentEditingSum = editingBuckets.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  const isBalanced = Math.abs(currentEditingSum - 2500) < 0.01;
  const delta = currentEditingSum - 2500;

  const handleBucketAmountChange = (id: string, newAmount: number) => {
    setEditingBuckets((prev) =>
      prev.map((b) => (b.id === id ? { ...b, amount: Math.max(0, newAmount) } : b))
    );
    setIsSavedSuccess(false);
  };

  const handleSubBudgetChange = (bucketId: string, catName: string, newAmount: number) => {
    setEditingBuckets((prev) =>
      prev.map((b) => {
        if (b.id !== bucketId || !b.subBudgets) return b;
        return {
          ...b,
          subBudgets: b.subBudgets.map((sub) =>
            sub.category === catName ? { ...sub, amount: Math.max(0, newAmount) } : sub
          ),
        };
      })
    );
    setIsSavedSuccess(false);
  };

  const handleSaveBudget = () => {
    onUpdateBudget({
      totalBudget: 2500,
      buckets: editingBuckets,
    });
    setIsSavedSuccess(true);
    setTimeout(() => setIsSavedSuccess(false), 3000);
  };

  const handleResetToDefault = () => {
    setEditingBuckets(DEFAULT_BUDGET_SETTINGS.buckets);
    onUpdateBudget(DEFAULT_BUDGET_SETTINGS);
    setIsSavedSuccess(true);
    setTimeout(() => setIsSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-5 pb-12 max-w-5xl mx-auto">
      {onNavigateToTab && (
        <FinanceSubNav activeTab="budget" onNavigateToTab={onNavigateToTab} />
      )}

      {/* Configuration Card */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <span>每月预算配置与预警规则</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 tabular-nums">
              基准: ¥2,500.00
            </span>
          </div>
        }
        subtitle="生活费用 (¥1080) + AI漫剧 (¥350) + 投资 (¥300) + 应急储蓄 (¥500) + 灵活资金 (¥270) = 2,500 元"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetToDefault}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重置预置</span>
            </button>
            <button
              onClick={handleSaveBudget}
              className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              {isSavedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>已保存</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>保存设置</span>
                </>
              )}
            </button>
          </div>
        }
      >
        {/* Dynamic balance validator */}
        <div
          className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
            isBalanced
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {isBalanced ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <div>
              <span className="font-bold">各板块预算之和：</span>
              <span className="tabular-nums font-extrabold">{formatCNY(currentEditingSum)}</span>
              <span className="mx-1 text-slate-400">/</span>
              <span>总额基准：¥2,500.00</span>
            </div>
          </div>
          <div>
            {isBalanced ? (
              <span className="font-semibold text-emerald-700">✓ 预算配平，正好等于 2,500 元</span>
            ) : delta > 0 ? (
              <span className="font-bold text-amber-900">
                ⚠️ 各板块之和超出总预算 {formatCNY(delta)}，请调减部分板块
              </span>
            ) : (
              <span className="font-bold text-amber-900">
                ⚠️ 各板块之和尚有 {formatCNY(Math.abs(delta))} 未分配，请补全至 2,500 元
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* 5 Buckets List */}
      <div className="space-y-4">
        {editingBuckets.map((bucket) => {
          const spent = bucketSpentMap[bucket.id] || 0;
          const pct = bucket.amount > 0 ? (spent / bucket.amount) * 100 : 0;
          const isOver = spent > bucket.amount;
          const isWarning = !isOver && pct >= 80;

          return (
            <Card
              key={bucket.id}
              className={isOver ? 'border-red-200' : isWarning ? 'border-amber-200' : ''}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      isOver
                        ? 'bg-red-50 text-red-600'
                        : isWarning
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {isOver ? (
                      <ShieldAlert className="w-5 h-5" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <PieChart className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{bucket.name}</h4>
                      {isOver ? (
                        <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-md">
                          超支
                        </span>
                      ) : isWarning ? (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                          达 80% 警戒线
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md">
                          正常
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{bucket.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <span className="text-xs text-slate-500 font-medium">预算额度:</span>
                  <div className="relative w-28">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      ¥
                    </span>
                    <input
                      type="number"
                      step="10"
                      min="0"
                      value={bucket.amount}
                      onChange={(e) =>
                        handleBucketAmountChange(bucket.id, parseFloat(e.target.value) || 0)
                      }
                      className="w-full pl-6 pr-2 py-1.5 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 tabular-nums text-right"
                    />
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    实际发生: <strong className="text-slate-900 tabular-nums">{formatCNY(spent)}</strong>
                  </span>
                  <span className="font-semibold text-slate-700 tabular-nums">
                    进度: {pct.toFixed(1)}% (
                    {bucket.amount - spent >= 0
                      ? `剩余 ${formatCNY(bucket.amount - spent)}`
                      : `超支 ${formatCNY(spent - bucket.amount)}`}
                    )
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isOver ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-slate-900'
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>

              {/* Subcategories (specifically for 生活费用, e.g. 餐饮, 交通, 通信, 学习) */}
              {bucket.subBudgets && bucket.subBudgets.length > 0 && (
                <div className="mt-3.5 p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <Sliders className="w-3.5 h-3.5 text-slate-400" />
                      <span>子项拆解参考（不重复计入总预算）</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {bucket.subBudgets.map((sub) => (
                      <div
                        key={sub.category}
                        className="p-2 bg-white rounded-lg border border-slate-200/60 text-xs"
                      >
                        <div className="flex items-center justify-between text-slate-700 font-semibold mb-1">
                          <span>{sub.category}</span>
                          <span className="tabular-nums font-bold">¥{sub.amount}</span>
                        </div>
                        <input
                          type="number"
                          step="10"
                          min="0"
                          value={sub.amount}
                          onChange={(e) =>
                            handleSubBudgetChange(
                              bucket.id,
                              sub.category,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full px-2 py-0.5 text-[11px] bg-slate-50 border border-slate-200 rounded-md text-right font-medium text-slate-800 tabular-nums focus:bg-white focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
