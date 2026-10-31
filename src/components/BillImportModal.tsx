/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  AlertTriangle,
  CheckCircle2,
  X,
  ShieldCheck,
  RefreshCw,
  HelpCircle,
  FileCheck,
  Tag,
  ArrowRightLeft,
  Calendar,
} from 'lucide-react';
import {
  BillImportRow,
  CategoryRule,
  PaymentChannel,
  Transaction,
  TransactionType,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  TRANSFER_CATEGORIES,
} from '../types/finance';
import { formatCNY } from '../utils/formatters';
import { parseBillFile, BillParseResult } from '../utils/billParser';
import { PRESET_CATEGORY_RULES } from '../utils/rulesEngine';
import { getCategoryIcon, getChannelIcon } from '../utils/categoryIcons';

interface BillImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingTransactions: Transaction[];
  rules?: CategoryRule[];
  initialChannel?: PaymentChannel;
  onConfirmImport: (rows: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
}

export const BillImportModal: React.FC<BillImportModalProps> = ({
  isOpen,
  onClose,
  existingTransactions,
  rules = PRESET_CATEGORY_RULES,
  initialChannel,
  onConfirmImport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parseResult, setParseResult] = useState<BillParseResult | null>(null);
  const [rows, setRows] = useState<BillImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'duplicates' | 'refunds' | 'transfers'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const res = parseBillFile(content, existingTransactions, rules);
      setParseResult(res);
      setRows(res.validRows);
    };

    reader.readAsText(file, 'utf-8');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRowSelect = (id: string, selected: boolean) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected } : r))
    );
  };

  const handleCategoryChange = (id: string, newCategory: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              category: newCategory,
              isCategorized: newCategory !== '待分类',
            }
          : r
      )
    );
  };

  const handleToggleSelectAll = (select: boolean) => {
    setRows((prev) =>
      prev.map((r) => {
        if (skipDuplicates && r.isDuplicateCandidate) {
          return { ...r, selected: false };
        }
        return { ...r, selected: select };
      })
    );
  };

  const filteredRows = rows.filter((r) => {
    if (filterType === 'duplicates') return r.isDuplicateCandidate;
    if (filterType === 'refunds') return r.isRefund;
    if (filterType === 'transfers') return r.type === 'transfer';
    return true;
  });

  const selectedRows = rows.filter((r) => r.selected);
  const selectedExpenseTotal = selectedRows
    .filter((r) => r.type === 'expense' && !r.isRefund)
    .reduce((sum, r) => sum + r.amount, 0);
  const selectedRefundTotal = selectedRows
    .filter((r) => r.isRefund)
    .reduce((sum, r) => sum + r.amount, 0);
  const selectedIncomeTotal = selectedRows
    .filter((r) => r.type === 'income')
    .reduce((sum, r) => sum + r.amount, 0);

  const handleSubmitImport = async () => {
    if (selectedRows.length === 0) {
      alert('请至少勾选一笔需要导入的账目。');
      return;
    }

    setIsSubmitting(true);
    try {
      const txPayloads: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>[] = selectedRows.map((r) => ({
        type: r.type,
        amount: Math.round(r.amount * 100) / 100,
        date: r.date,
        time: r.time,
        category: r.category || '待分类',
        channel: r.channel,
        note: r.note,
        merchant: r.merchant,
        isRefund: r.isRefund,
        isCategorized: r.isCategorized,
        sourceBillType: 'csv',
      }));

      await onConfirmImport(txPayloads);
      onClose();
    } catch (err: any) {
      alert(`导入失败：${err.message || '网络连接超时'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              智能账单文件导入与查重
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* File Picker Zone */}
          {!parseResult ? (
            <div className="space-y-4">
              <div className="p-8 border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center text-center space-y-3 bg-slate-50/40">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    选择微信支付、支付宝或银行卡导出的 CSV/明细文件
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    系统将在本地自动识别账单格式、解析金额与时间、区分消费/退款/转账，并匹配智能分类规则。
                  </p>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,text/csv,text/plain"
                  onChange={handleFileChange}
                  className="hidden"
                  id="smart-bill-upload"
                />
                <label
                  htmlFor="smart-bill-upload"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  点击选择账单文件
                </label>
              </div>

              {/* Security & Reliability Guarantee */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-xs text-emerald-900 space-y-1.5">
                <div className="flex items-center gap-2 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>隐私与真实性说明：</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  本工作台采用 100% 本地解析技术，仅处理您主动下载并选择的账单流水文件。绝不会声称或尝试未经官方授权的网银爬取，不读取您设备上的任何其他私密信息。
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Parsed Summary Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {parseResult.detectedFormatName}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        ({fileName})
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      成功解析 {parseResult.totalRows} 条交易记录 · 自动匹配规则推荐分类
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setParseResult(null);
                      setRows([]);
                    }}
                    className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 cursor-pointer self-start sm:self-auto"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>重新选择文件</span>
                  </button>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">常规消费支出</span>
                    <span className="font-bold text-slate-900 tabular-nums">
                      {parseResult.expenseCount} 笔
                    </span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">退款交易 (冲抵消费)</span>
                    <span className="font-bold text-amber-700 tabular-nums">
                      {parseResult.refundCount} 笔
                    </span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">资金互转/理财分配</span>
                    <span className="font-bold text-purple-700 tabular-nums">
                      {parseResult.transferCount} 笔
                    </span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">疑似重复已有交易</span>
                    <span className="font-bold text-red-600 tabular-nums">
                      {parseResult.duplicateCount} 笔
                    </span>
                  </div>
                </div>
              </div>

              {/* Filter Tabs & Quick Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 text-xs overflow-x-auto">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1.5 rounded-xl font-semibold cursor-pointer ${
                      filterType === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    全部 ({rows.length})
                  </button>
                  <button
                    onClick={() => setFilterType('duplicates')}
                    className={`px-3 py-1.5 rounded-xl font-semibold cursor-pointer ${
                      filterType === 'duplicates' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    疑似重复 ({parseResult.duplicateCount})
                  </button>
                  <button
                    onClick={() => setFilterType('refunds')}
                    className={`px-3 py-1.5 rounded-xl font-semibold cursor-pointer ${
                      filterType === 'refunds' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    退款明细 ({parseResult.refundCount})
                  </button>
                  <button
                    onClick={() => setFilterType('transfers')}
                    className={`px-3 py-1.5 rounded-xl font-semibold cursor-pointer ${
                      filterType === 'transfers' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    互转/分配 ({parseResult.transferCount})
                  </button>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(true)}
                    className="text-slate-600 hover:text-slate-900 cursor-pointer font-medium"
                  >
                    全选当前
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(false)}
                    className="text-slate-600 hover:text-slate-900 cursor-pointer font-medium"
                  >
                    取消全选
                  </button>
                </div>
              </div>

              {/* Transactions Preview Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-10">勾选</th>
                      <th className="py-2.5 px-3">日期/时间</th>
                      <th className="py-2.5 px-3">收支与金额</th>
                      <th className="py-2.5 px-3">商户/描述</th>
                      <th className="py-2.5 px-3">智能推荐分类</th>
                      <th className="py-2.5 px-3">渠道</th>
                      <th className="py-2.5 px-3">状态/查重</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map((r) => {
                      const isExpense = r.type === 'expense';
                      const isIncome = r.type === 'income';

                      return (
                        <tr
                          key={r.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            r.selected ? 'bg-white' : 'bg-slate-50/60 opacity-60'
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-2.5 px-3">
                            <input
                              type="checkbox"
                              checked={r.selected}
                              onChange={(e) => handleRowSelect(r.id, e.target.checked)}
                              className="w-4 h-4 text-slate-900 rounded border-slate-300 cursor-pointer"
                            />
                          </td>

                          {/* Date/Time */}
                          <td className="py-2.5 px-3 whitespace-nowrap tabular-nums text-slate-600">
                            <div>{r.date}</div>
                            <div className="text-[10px] text-slate-400">{r.time}</div>
                          </td>

                          {/* Amount */}
                          <td className="py-2.5 px-3 whitespace-nowrap tabular-nums font-bold">
                            <span
                              className={
                                r.isRefund
                                  ? 'text-amber-700'
                                  : isIncome
                                  ? 'text-emerald-700'
                                  : isExpense
                                  ? 'text-slate-900'
                                  : 'text-purple-700'
                              }
                            >
                              {r.isRefund
                                ? `-¥${r.amount.toFixed(2)} (退款)`
                                : isIncome
                                ? `+¥${r.amount.toFixed(2)}`
                                : isExpense
                                ? `-¥${r.amount.toFixed(2)}`
                                : `¥${r.amount.toFixed(2)} (互转)`}
                            </span>
                          </td>

                          {/* Merchant / Note */}
                          <td className="py-2.5 px-3 max-w-xs">
                            <div className="font-semibold text-slate-900 truncate">
                              {r.merchant || '未知商户'}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">{r.note}</div>
                          </td>

                          {/* Recommended Category Dropdown */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <select
                              value={r.category}
                              onChange={(e) => handleCategoryChange(r.id, e.target.value)}
                              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none"
                            >
                              <option value="待分类">待分类</option>
                              {(r.type === 'expense'
                                ? EXPENSE_CATEGORIES
                                : r.type === 'income'
                                ? INCOME_CATEGORIES
                                : TRANSFER_CATEGORIES
                              ).map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                            {r.ruleMatched && (
                              <div className="text-[9px] text-emerald-700 font-semibold mt-0.5">
                                规则: {r.ruleMatched}
                              </div>
                            )}
                          </td>

                          {/* Channel */}
                          <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">
                            <span className="flex items-center gap-1">
                              <span>{getChannelIcon(r.channel)}</span>
                              <span>{r.channel}</span>
                            </span>
                          </td>

                          {/* Status / Duplicate Candidate Warning */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {r.isDuplicateCandidate ? (
                              <span
                                className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded"
                                title={r.duplicateReason}
                              >
                                疑似重复
                              </span>
                            ) : r.isRefund ? (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                已退款
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                正常流水
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {parseResult && (
          <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-600">
              已勾选 <strong className="text-slate-900">{selectedRows.length}</strong> 笔交易（消费: {formatCNY(selectedExpenseTotal)}
              {selectedRefundTotal > 0 && ` · 退款: -${formatCNY(selectedRefundTotal)}`}
              {selectedIncomeTotal > 0 && ` · 收入: +${formatCNY(selectedIncomeTotal)}`}）
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isSubmitting || selectedRows.length === 0}
                onClick={handleSubmitImport}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <span>正在批量写入...</span>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    <span>确认导入这 {selectedRows.length} 笔交易</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
