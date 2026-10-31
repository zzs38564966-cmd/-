/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  Trash2,
  Edit2,
  ChevronDown,
} from 'lucide-react';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  TRANSFER_CATEGORIES,
  Transaction,
} from '../types/finance';
import { formatCNY } from '../utils/formatters';
import { getCategoryIcon } from '../utils/categoryIcons';
import { Card } from './ui/Card';
import { EmptyState } from './ui/EmptyState';
import { ConfirmModal } from './ConfirmModal';
import { TransactionItem } from './ui/TransactionItem';

interface UnclassifiedViewProps {
  transactions: Transaction[];
  onUpdateTransaction: (updated: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onOpenEditModal: (tx: Transaction) => void;
}

export const UnclassifiedView: React.FC<UnclassifiedViewProps> = ({
  transactions,
  onUpdateTransaction,
  onDeleteTransaction,
  onOpenEditModal,
}) => {
  const unclassifiedItems = transactions.filter(
    (tx) => !tx.isCategorized || tx.category === '待分类'
  );

  const [activeSelectTxId, setActiveSelectTxId] = useState<string | null>(null);
  const [deleteTargetTx, setDeleteTargetTx] = useState<Transaction | null>(null);

  const handleQuickClassify = (tx: Transaction, targetCategory: string) => {
    onUpdateTransaction({
      ...tx,
      category: targetCategory,
      isCategorized: true,
      updatedAt: Date.now(),
    });
    setActiveSelectTxId(null);
  };

  const handleDeleteConfirm = () => {
    if (deleteTargetTx) {
      onDeleteTransaction(deleteTargetTx.id);
      setDeleteTargetTx(null);
    }
  };

  return (
    <div className="space-y-5 pb-12 max-w-5xl mx-auto">
      {/* Top Banner Card */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <span>待分类流水清单</span>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 tabular-nums">
              {unclassifiedItems.length} 笔待处理
            </span>
          </div>
        }
        subtitle="记账时未指定分类的流水汇集在此。点击每笔记录右侧「指定分类」可一键归档并同步至首页预算进度。"
      >
        <div className="text-xs text-slate-500">
          分类完成后，流水将自动移出本清单并进入明细账册。支持修改金额或删除错误记录。
        </div>
      </Card>

      {/* Main List Card */}
      <Card noPadding={true}>
        {unclassifiedItems.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="太棒了！所有交易均已完成分类"
            description="当前没有积压的待分类流水，您的日常生活费与AI漫剧预算数据保持完全最新。"
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {unclassifiedItems.map((tx) => {
              const isOpen = activeSelectTxId === tx.id;
              const options =
                tx.type === 'expense'
                  ? EXPENSE_CATEGORIES
                  : tx.type === 'income'
                  ? INCOME_CATEGORIES
                  : TRANSFER_CATEGORIES;

              return (
                <TransactionItem
                  key={tx.id}
                  transaction={tx}
                  showDate={true}
                  className="px-4 py-3"
                  actions={
                    <div className="flex items-center gap-1.5">
                      {/* Quick Classify Dropdown */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSelectTxId(isOpen ? null : tx.id);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                          <span>指定分类</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>

                        {isOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-full mt-2 z-20 w-64 p-2 bg-white rounded-2xl shadow-xl border border-slate-200"
                          >
                            <p className="text-[11px] font-semibold text-slate-400 px-2 py-1">
                              选择正确的归属类别:
                            </p>
                            <div className="grid grid-cols-2 gap-1 max-h-52 overflow-y-auto p-1">
                              {options.map((cat) => (
                                <button
                                  key={cat}
                                  onClick={() => handleQuickClassify(tx, cat)}
                                  className="flex items-center gap-1.5 p-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors text-left cursor-pointer"
                                >
                                  {getCategoryIcon(cat, 'w-3.5 h-3.5 text-slate-500')}
                                  <span className="truncate">{cat}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Edit Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenEditModal(tx);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        title="修改交易"
                        aria-label="修改交易"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTargetTx(tx);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title="删除交易"
                        aria-label="删除交易"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteTargetTx !== null}
        title="确认删除此笔待分类流水？"
        message={
          deleteTargetTx
            ? `您确定要删除这笔「${deleteTargetTx.note || '未填写备注'}」金额为 ${formatCNY(
                deleteTargetTx.amount
              )} 的记录吗？删除后不可恢复。`
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
