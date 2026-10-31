/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  FileSpreadsheet,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  FileText,
  RotateCcw,
  Trash2,
  Info,
  Check,
  X,
  FileUp,
} from 'lucide-react';
import { BudgetSettings, CategoryRule, Transaction, ActiveTab } from '../types/finance';
import { formatCNY, formatDateCN } from '../utils/formatters';
import {
  CSV_HEADER_STRING,
  CSV_SAMPLE_TEMPLATE,
  exportTransactionsToCSV,
  parseCSVTransactions,
} from '../utils/csv';
import {
  exportBackupJSON,
  resetToDefaultData,
  clearAllData,
  saveTransactions,
  saveBudgetSettings,
} from '../utils/storage';
import { ConfirmModal } from './ConfirmModal';
import { getCategoryIcon } from '../utils/categoryIcons';
import { useAuth } from '../contexts/AuthContext';
import { Cloud, ShieldCheck, UserCheck, Sparkles, Zap } from 'lucide-react';
import { FinanceSubNav } from './FinanceSubNav';
import { BillImportModal } from './BillImportModal';

interface DataManagementViewProps {
  transactions: Transaction[];
  budget: BudgetSettings;
  rules?: CategoryRule[];
  onRefreshData: (txs: Transaction[], bgt: BudgetSettings) => void;
  onBatchImport?: (txs: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  onOpenMigrationModal?: () => void;
  hasLocalData?: boolean;
  onNavigateToTab?: (tab: ActiveTab) => void;
}

export const DataManagementView: React.FC<DataManagementViewProps> = ({
  transactions,
  budget,
  rules = [],
  onRefreshData,
  onBatchImport,
  onOpenMigrationModal,
  hasLocalData,
  onNavigateToTab,
}) => {
  const { currentUser } = useAuth();
  // CSV Import States
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[] | null>(null);
  const [csvErrors, setCsvErrors] = useState<any[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importSuccessMsg, setImportSuccessMsg] = useState('');
  const [isSmartBillModalOpen, setIsSmartBillModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonBackupInputRef = useRef<HTMLInputElement>(null);

  // Modal dialog states
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<{
    transactions: Transaction[];
    budget: BudgetSettings;
  } | null>(null);

  // 1. Download CSV Template
  const handleDownloadTemplate = () => {
    const blob = new Blob([CSV_SAMPLE_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '个人财务管理工作台_标准导入模板.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Export All Transactions to CSV
  const handleExportTransactions = () => {
    const csvStr = exportTransactionsToCSV(transactions);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `全部交易记录备份_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 3. Export JSON Full Backup
  const handleExportJSON = () => {
    const jsonStr = exportBackupJSON(transactions, budget);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `个人财务工作台完整备份_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 4. Handle CSV File Select & Preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const parseResult = parseCSVTransactions(content, transactions);
      setCsvPreviewRows(parseResult.validRows);
      setCsvErrors(parseResult.errors);
      setImportSuccessMsg('');
    };
    reader.readAsText(file, 'utf-8');

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 5. Confirm CSV Import
  const handleConfirmImport = () => {
    if (!csvPreviewRows || csvPreviewRows.length === 0) return;

    const filteredRows = skipDuplicates
      ? csvPreviewRows.filter((r) => !r.isDuplicateCandidate)
      : csvPreviewRows;

    if (filteredRows.length === 0) {
      alert('所有解析出的交易均被判定为重复交易，且您开启了「跳过重复交易」，未导入任何新数据。');
      setCsvPreviewRows(null);
      return;
    }

    const newTransactions: Transaction[] = filteredRows.map((r, idx) => ({
      id: `tx_imported_${Date.now()}_${idx}`,
      type: r.type,
      amount: r.amount,
      date: r.date,
      time: r.time,
      category: r.category,
      channel: r.channel,
      note: r.note,
      isCategorized: r.isCategorized,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));

    const merged = [...transactions, ...newTransactions];
    saveTransactions(merged);
    onRefreshData(merged, budget);

    setImportSuccessMsg(`成功导入 ${newTransactions.length} 笔交易记录！数据已保存至本地。`);
    setCsvPreviewRows(null);
    setCsvErrors([]);
    setTimeout(() => setImportSuccessMsg(''), 5000);
  };

  // 6. Handle JSON Restore File Select
  const handleJSONRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed || !Array.isArray(parsed.transactions)) {
          alert('备份文件格式不正确，缺少 transactions 交易数据数组。');
          return;
        }

        const restoredBudget = parsed.budgetSettings || budget;
        setPendingRestoreData({
          transactions: parsed.transactions,
          budget: restoredBudget,
        });
      } catch (err) {
        alert('解析备份 JSON 文件失败，请确认文件完整有效。');
      }
    };
    reader.readAsText(file, 'utf-8');
    if (jsonBackupInputRef.current) jsonBackupInputRef.current.value = '';
  };

  // 7. Confirm JSON Restore
  const handleConfirmRestore = () => {
    if (!pendingRestoreData) return;
    saveTransactions(pendingRestoreData.transactions);
    saveBudgetSettings(pendingRestoreData.budget);
    onRefreshData(pendingRestoreData.transactions, pendingRestoreData.budget);
    setPendingRestoreData(null);
    setImportSuccessMsg('已成功从备份文件恢复全部数据！');
    setTimeout(() => setImportSuccessMsg(''), 5000);
  };

  // 8. Reset to default demo data
  const handleResetConfirm = () => {
    const res = resetToDefaultData();
    onRefreshData(res.transactions, res.budget);
    setIsResetConfirmOpen(false);
    setImportSuccessMsg('已重置为默认初始预置数据（含演示收支账目）。');
    setTimeout(() => setImportSuccessMsg(''), 5000);
  };

  // 9. Clear all data
  const handleClearConfirm = () => {
    const res = clearAllData();
    onRefreshData(res.transactions, res.budget);
    setIsClearConfirmOpen(false);
    setImportSuccessMsg('已清空全部本地记账记录。');
    setTimeout(() => setImportSuccessMsg(''), 5000);
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {onNavigateToTab && (
        <FinanceSubNav activeTab="data" onNavigateToTab={onNavigateToTab} />
      )}

      {/* Success Notification Banner */}
      {importSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 text-xs font-semibold shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{importSuccessMsg}</span>
        </div>
      )}

      {/* Storage Information & Cloud Status Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl shrink-0">
            <Cloud className="w-6 h-6" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">个人独立云空间存储</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  Firestore 规则加密隔离 · 免费 Spark 方案
                </span>
              </div>
              {currentUser && (
                <span className="text-[11px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-lg">
                  UID: {currentUser.uid.slice(0, 8)}...
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              当前账号：<strong>{currentUser?.email || '已登录用户'}</strong>。您的所有账单流水、预算设置及自定义分类均存储在您专属的云端路径（<code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded text-slate-700">/users/{currentUser?.uid.slice(0, 6)}...</code>）中，跨设备实时同步，且其他任何账号均无权查阅。
            </p>
            {hasLocalData && onOpenMigrationModal && (
              <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-amber-900">
                  <strong>发现此浏览器存有本地离线账目：</strong> 可随时将其安全同步至您的个人云端档案库中。
                </div>
                <button
                  onClick={onOpenMigrationModal}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs whitespace-nowrap self-start sm:self-auto cursor-pointer transition-colors"
                >
                  启动安全数据迁移
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSV Import Section */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">CSV 账单文件导入</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              支持导入您主动整理的微信、支付宝或银行流水表格（导入前提供完整数据预览与查重）
            </p>
          </div>
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>下载标准 CSV 模板</span>
          </button>
        </div>

        {/* CSV Format Specification */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-2">
          <p className="font-bold text-slate-800 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-slate-500" />
            <span>CSV 字段格式规范说明：</span>
          </p>
          <p className="text-slate-600 font-mono text-[11px] bg-white p-2 rounded-lg border border-slate-200 overflow-x-auto">
            {CSV_HEADER_STRING}
          </p>
          <ul className="list-disc list-inside text-[11px] text-slate-500 space-y-1">
            <li><strong>交易日期</strong>：格式必须为 YYYY-MM-DD（例如 2026-10-28）。</li>
            <li><strong>收支类型</strong>：填写「支出」、「收入」或「资金分配」（资金分配不计入日常总支出）。</li>
            <li><strong>金额</strong>：数字，必须大于 0（例如 15.00）。</li>
            <li><strong>是否已分类</strong>：填「是」或「否」。填「否」的记录将自动导入至待分类流水。</li>
            <li>注意：本应用只处理您主动提供的 CSV 文件，不会未经授权擅自扫描手机或银行应用。</li>
          </ul>
        </div>

        {/* File Select Area */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={() => setIsSmartBillModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>智能解析微信/支付宝/银行账单 (带查重与规则分类)</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
            id="csv-file-input"
          />
          <label
            htmlFor="csv-file-input"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all"
          >
            <FileUp className="w-4 h-4" />
            <span>选择标准 CSV 流水</span>
          </label>
        </div>

        {/* CSV Errors Display */}
        {csvErrors.length > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-red-800">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>发现 {csvErrors.length} 处格式错误行（将自动跳过无效行）：</span>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1 text-red-700 text-[11px]">
              {csvErrors.map((err, i) => (
                <div key={i} className="border-b border-red-100 pb-1">
                  第 {err.lineNumber} 行: {err.reason}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CSV Preview Table */}
        {csvPreviewRows && (
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-900">
                  成功解析出 {csvPreviewRows.length} 笔记录
                </span>
                <span className="text-slate-500">
                  （其中{' '}
                  {csvPreviewRows.filter((r) => r.isDuplicateCandidate).length} 笔疑似与现有数据重复）
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-amber-900 font-semibold">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="rounded text-slate-900 focus:ring-0"
                />
                <span>自动跳过可能重复的交易</span>
              </label>
            </div>

            {/* Table preview */}
            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">日期</th>
                    <th className="py-2 px-3">类型</th>
                    <th className="py-2 px-3 text-right">金额</th>
                    <th className="py-2 px-3">类别</th>
                    <th className="py-2 px-3">渠道</th>
                    <th className="py-2 px-3">备注</th>
                    <th className="py-2 px-3">查重检测</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {csvPreviewRows.map((r, i) => (
                    <tr
                      key={i}
                      className={r.isDuplicateCandidate ? 'bg-amber-50/50' : 'hover:bg-slate-50'}
                    >
                      <td className="py-2 px-3 tabular-nums">{r.date}</td>
                      <td className="py-2 px-3">
                        {r.type === 'expense' ? '支出' : r.type === 'income' ? '收入' : '资金分配'}
                      </td>
                      <td className="py-2 px-3 text-right font-bold tabular-nums">
                        {formatCNY(r.amount)}
                      </td>
                      <td className="py-2 px-3">{r.category}</td>
                      <td className="py-2 px-3">{r.channel}</td>
                      <td className="py-2 px-3 truncate max-w-xs">{r.note || '-'}</td>
                      <td className="py-2 px-3">
                        {r.isDuplicateCandidate ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            疑似重复
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-medium">新记录</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                onClick={() => setCsvPreviewRows(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                取消导入
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                确认并正式导入数据
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Export & Backup Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs space-y-4 flex flex-col">
          <div>
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">数据导出</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              将现有账单明细导出为 Excel 兼容的 CSV 表格
            </p>
          </div>

          <div className="space-y-2.5 flex-1 flex flex-col justify-center">
            <button
              onClick={handleExportTransactions}
              className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>导出全部交易明细流水 (.csv)</span>
              </div>
              <span className="text-slate-400 font-normal">UTF-8 BOM 中文无乱码</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-purple-600" />
                <span>下载完整数据备份 (.json)</span>
              </div>
              <span className="text-slate-400 font-normal">含预算与所有账目</span>
            </button>
          </div>
        </div>

        {/* Restore & Danger Zone Card */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs space-y-4 flex flex-col">
          <div>
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-purple-600" />
              <h3 className="text-base font-bold text-slate-900">备份恢复与维护</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">从 JSON 备份文件还原，或重置演示测试数据</p>
          </div>

          <div className="space-y-2.5 flex-1 flex flex-col justify-center">
            {/* Restore from JSON */}
            <div>
              <input
                type="file"
                ref={jsonBackupInputRef}
                accept=".json,application/json"
                onChange={handleJSONRestoreFile}
                className="hidden"
                id="json-restore-input"
              />
              <label
                htmlFor="json-restore-input"
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-purple-600" />
                  <span>从 JSON 备份文件恢复数据</span>
                </div>
                <span className="text-purple-600 font-semibold">选择文件还原</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setIsResetConfirmOpen(true)}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                恢复预置演示数据
              </button>
              <button
                onClick={() => setIsClearConfirmOpen(true)}
                className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                清空全部本地数据
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* JSON Restore Confirmation Modal */}
      <ConfirmModal
        isOpen={pendingRestoreData !== null}
        title="确认从备份文件恢复数据？"
        message={
          pendingRestoreData
            ? `检测到备份文件中包含 ${pendingRestoreData.transactions.length} 笔交易记录与月度预算配置。确认恢复将以备份文件内容替换当前本地数据。`
            : ''
        }
        confirmText="确认恢复"
        cancelText="取消"
        isDanger={false}
        onConfirm={handleConfirmRestore}
        onCancel={() => setPendingRestoreData(null)}
      />

      {/* Reset to Default Confirm Modal */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        title="确认重置为预置演示数据？"
        message="重置后将载入专为大学生定制的 2,500 元初始预算方案与测试交易账目。当前已有数据将被覆盖。"
        confirmText="确认重置"
        cancelText="取消"
        isDanger={false}
        onConfirm={handleResetConfirm}
        onCancel={() => setIsResetConfirmOpen(false)}
      />

      {/* Clear All Confirm Modal */}
      <ConfirmModal
        isOpen={isClearConfirmOpen}
        title="确认清空全部本地账目？"
        message="此操作将永久清空当前浏览器中保存的所有记账明细。清空后不可恢复，请确保已下载备份文件。"
        confirmText="清空所有记录"
        cancelText="取消"
        isDanger={true}
        onConfirm={handleClearConfirm}
        onCancel={() => setIsClearConfirmOpen(false)}
      />

      {/* Intelligent Multi-Platform Bill Import Modal */}
      <BillImportModal
        isOpen={isSmartBillModalOpen}
        onClose={() => setIsSmartBillModalOpen(false)}
        existingTransactions={transactions}
        rules={rules}
        onConfirmImport={async (importedRows) => {
          if (onBatchImport) {
            await onBatchImport(importedRows);
            setImportSuccessMsg(`成功导入 ${importedRows.length} 笔流水账目至您的云端专属账本！`);
          } else {
            const newTxs: Transaction[] = importedRows.map((r, idx) => ({
              ...r,
              id: `tx_imported_${Date.now()}_${idx}`,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }));
            const merged = [...transactions, ...newTxs];
            saveTransactions(merged);
            onRefreshData(merged, budget);
            setImportSuccessMsg(`成功导入 ${importedRows.length} 笔交易记录！数据已保存至本地。`);
          }
          setTimeout(() => setImportSuccessMsg(''), 5000);
        }}
      />
    </div>
  );
};
