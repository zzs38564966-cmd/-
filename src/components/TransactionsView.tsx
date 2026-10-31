/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  Trash2,
  Edit2,
  X,
  Eye,
} from 'lucide-react';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  TRANSFER_CATEGORIES,
  PAYMENT_CHANNELS,
  Transaction,
  TransactionType,
} from '../types/finance';
import { formatCNY, formatDateCN } from '../utils/formatters';
import { Card } from './ui/Card';
import { EmptyState } from './ui/EmptyState';
import { TransactionItem } from './ui/TransactionItem';
import { ConfirmModal } from './ConfirmModal';

interface TransactionsViewProps {
  transactions: Transaction[];
  selectedMonth: string;
  onOpenAddModal: () => void;
  onOpenEditModal: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  selectedMonth,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteTransaction,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilterMode, setDateFilterMode] = useState<'thisMonth' | 'all' | 'custom'>('thisMonth');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');

  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const [deleteTargetTx, setDeleteTargetTx] = useState<Transaction | null>(null);
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);

  const allCategoryOptions = useMemo(() => {
    const set = new Set<string>();
    EXPENSE_CATEGORIES.forEach((c) => set.add(c));
    INCOME_CATEGORIES.forEach((c) => set.add(c));
    TRANSFER_CATEGORIES.forEach((c) => set.add(c));
    set.add('待分类');
    return Array.from(set);
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchNote = tx.note?.toLowerCase().includes(q);
          const matchCat = tx.category.toLowerCase().includes(q);
          const matchChannel = tx.channel.toLowerCase().includes(q);
          const matchAmount = tx.amount.toString().includes(q);
          if (!matchNote && !matchCat && !matchChannel && !matchAmount) return false;
        }

        if (dateFilterMode === 'thisMonth') {
          if (!tx.date.startsWith(selectedMonth)) return false;
        } else if (dateFilterMode === 'custom') {
          if (customStartDate && tx.date < customStartDate) return false;
          if (customEndDate && tx.date > customEndDate) return false;
        }

        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
        if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
        if (channelFilter !== 'all' && tx.channel !== channelFilter) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortField === 'date') {
          const timeA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
          const timeB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
          return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
        } else {
          return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
        }
      });
  }, [
    transactions,
    searchQuery,
    dateFilterMode,
    selectedMonth,
    customStartDate,
    customEndDate,
    typeFilter,
    categoryFilter,
    channelFilter,
    sortField,
    sortOrder,
  ]);

  const filteredStats = useMemo(() => {
    let incomeSum = 0;
    let expenseSum = 0;
    let transferSum = 0;

    filteredTransactions.forEach((tx) => {
      if (tx.type === 'income') incomeSum += tx.amount;
      else if (tx.type === 'expense') expenseSum += tx.amount;
      else if (tx.type === 'transfer') transferSum += tx.amount;
    });

    return {
      count: filteredTransactions.length,
      incomeSum,
      expenseSum,
      transferSum,
    };
  }, [filteredTransactions]);

  const handleDeleteConfirm = () => {
    if (deleteTargetTx) {
      onDeleteTransaction(deleteTargetTx.id);
      setDeleteTargetTx(null);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setDateFilterMode('thisMonth');
    setCustomStartDate('');
    setCustomEndDate('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setChannelFilter('all');
    setSortField('date');
    setSortOrder('desc');
  };

  return (
    <div className="space-y-5 pb-12 max-w-6xl mx-auto">
      {/* Search & Filter Card */}
      <Card>
        <div className="space-y-3.5">
          {/* Top row: search + date mode */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索备注、类别、支付渠道或金额..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-medium self-start sm:self-auto">
              <button
                onClick={() => setDateFilterMode('thisMonth')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  dateFilterMode === 'thisMonth'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                本月账目
              </button>
              <button
                onClick={() => setDateFilterMode('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  dateFilterMode === 'all'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                全部历史
              </button>
              <button
                onClick={() => setDateFilterMode('custom')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  dateFilterMode === 'custom'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                自定义区间
              </button>
            </div>
          </div>

          {/* Custom Date Range */}
          {dateFilterMode === 'custom' && (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="font-semibold text-slate-700">自定义区间:</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs"
                />
                <span className="text-slate-400">至</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs"
                />
              </div>
            </div>
          )}

          {/* Dropdown Filters & Sorting */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-medium cursor-pointer"
            >
              <option value="all">全部类型</option>
              <option value="expense">日常/项目支出</option>
              <option value="income">收入</option>
              <option value="transfer">资金分配/转账</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-medium cursor-pointer"
            >
              <option value="all">全部类别</option>
              {allCategoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-medium cursor-pointer"
            >
              <option value="all">全部渠道</option>
              {PAYMENT_CHANNELS.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => {
                  if (sortField === 'date') {
                    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                  } else {
                    setSortField('date');
                    setSortOrder('desc');
                  }
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                  sortField === 'date'
                    ? 'border-slate-900 bg-slate-900 text-white font-semibold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>日期</span>
                <ArrowUpDown className="w-3 h-3" />
                <span>{sortField === 'date' ? (sortOrder === 'desc' ? '最新' : '最早') : ''}</span>
              </button>

              <button
                onClick={() => {
                  if (sortField === 'amount') {
                    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                  } else {
                    setSortField('amount');
                    setSortOrder('desc');
                  }
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                  sortField === 'amount'
                    ? 'border-slate-900 bg-slate-900 text-white font-semibold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>金额</span>
                <ArrowUpDown className="w-3 h-3" />
                <span>{sortField === 'amount' ? (sortOrder === 'desc' ? '从高到低' : '从低到高') : ''}</span>
              </button>

              {(searchQuery ||
                typeFilter !== 'all' ||
                categoryFilter !== 'all' ||
                channelFilter !== 'all' ||
                dateFilterMode !== 'thisMonth') && (
                <button
                  onClick={handleResetFilters}
                  className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  重置
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Ribbon Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-100/80 rounded-2xl text-xs">
        <div className="flex items-center gap-4 text-slate-600 font-medium">
          <span>
            筛选记录: <strong className="text-slate-900 tabular-nums">{filteredStats.count}</strong> 笔
          </span>
          <span aria-hidden="true">·</span>
          <span>
            总支出: <strong className="text-red-600 tabular-nums">{formatCNY(filteredStats.expenseSum)}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            总收入: <strong className="text-emerald-700 tabular-nums">{formatCNY(filteredStats.incomeSum)}</strong>
          </span>
          {filteredStats.transferSum > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                资金分配: <strong className="text-sky-700 tabular-nums">{formatCNY(filteredStats.transferSum)}</strong>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Transactions List Card */}
      <Card noPadding={true}>
        {filteredTransactions.length === 0 ? (
          <EmptyState
            title="没有符合筛选条件的流水记录"
            description="您可以尝试清除搜索关键词或放宽筛选条件。"
            action={{
              label: "清空筛选条件",
              onClick: handleResetFilters,
            }}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTransactions.map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                onClick={() => setDetailTx(tx)}
                actions={
                  <div className="flex items-center gap-0.5 text-slate-400">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailTx(tx);
                      }}
                      className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="详情"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenEditModal(tx);
                      }}
                      className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="编辑"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTargetTx(tx);
                      }}
                      className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      {detailTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">交易流水详情</h3>
              <button
                onClick={() => setDetailTx(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3.5 text-xs">
              <div className="text-center py-2">
                <div
                  className={`text-2xl font-bold tabular-nums ${
                    detailTx.type === 'income'
                      ? 'text-emerald-600'
                      : detailTx.type === 'transfer'
                      ? 'text-sky-600'
                      : 'text-slate-900'
                  }`}
                >
                  {detailTx.type === 'income' ? '+' : detailTx.type === 'expense' ? '-' : '⇄ '}
                  {formatCNY(detailTx.amount)}
                </div>
                <p className="text-slate-500 mt-1 font-medium">
                  {detailTx.type === 'expense'
                    ? '日常/项目支出'
                    : detailTx.type === 'income'
                    ? '月度收入'
                    : '独立资金分配/转账'}
                </p>
              </div>

              <div className="divide-y divide-slate-100 border-t border-b border-slate-100 py-1">
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">交易日期</span>
                  <span className="font-semibold text-slate-900">{formatDateCN(detailTx.date)}</span>
                </div>
                {detailTx.time && (
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500">交易时间</span>
                    <span className="font-semibold text-slate-900">{detailTx.time}</span>
                  </div>
                )}
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">交易类别</span>
                  <span className="font-semibold text-slate-900">{detailTx.category}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">支付渠道</span>
                  <span className="font-semibold text-slate-900">{detailTx.channel}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">备注说明</span>
                  <span className="font-semibold text-slate-900">{detailTx.note || '无备注'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">分类状态</span>
                  <span
                    className={`font-semibold ${
                      detailTx.isCategorized ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {detailTx.isCategorized ? '已归类' : '待分类'}
                  </span>
                </div>
                {detailTx.targetAccount && (
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500">转入专户</span>
                    <span className="font-semibold text-sky-700">{detailTx.targetAccount}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    const tx = detailTx;
                    setDetailTx(null);
                    onOpenEditModal(tx);
                  }}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
                >
                  修改这笔交易
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteTargetTx !== null}
        title="确认删除该笔交易？"
        message={
          deleteTargetTx
            ? `确定要删除这笔「${deleteTargetTx.note || deleteTargetTx.category}」金额为 ${formatCNY(
                deleteTargetTx.amount
              )} 的记录吗？删除后统计数据将实时同步更新。`
            : ''
        }
        confirmText="确认删除"
        cancelText="取消"
        isDanger={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetTx(null)}
      />
    </div>
  );
};
