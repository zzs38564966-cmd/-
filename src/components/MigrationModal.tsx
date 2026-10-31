/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CloudUpload,
  Download,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  X,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { BudgetSettings, Transaction } from '../types/finance';
import { exportBackupJSON } from '../utils/storage';
import { migrateLocalTransactionsToCloud } from '../services/firestoreService';
import { formatCNY } from '../utils/formatters';

interface MigrationModalProps {
  isOpen: boolean;
  userId: string;
  localTransactions: Transaction[];
  localBudget: BudgetSettings;
  existingCloudTransactions: Transaction[];
  onClose: () => void;
  onMigrationComplete: (migratedCount: number) => void;
}

export const MigrationModal: React.FC<MigrationModalProps> = ({
  isOpen,
  userId,
  localTransactions,
  localBudget,
  existingCloudTransactions,
  onClose,
  onMigrationComplete,
}) => {
  const [hasDownloadedBackup, setHasDownloadedBackup] = useState(false);
  const [clearLocalAfterMigration, setClearLocalAfterMigration] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{
    migrated: number;
    skipped: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const totalLocalAmount = localTransactions.reduce(
    (sum, tx) => sum + (tx.type === 'expense' ? tx.amount : 0),
    0
  );

  const handleDownloadBackup = () => {
    const jsonStr = exportBackupJSON(localTransactions, localBudget);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `迁移前本地账本备份_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setHasDownloadedBackup(true);
  };

  const handleExecuteMigration = async () => {
    if (!hasDownloadedBackup) {
      if (!window.confirm('强烈建议您先下载本地备份以防意外。确认要直接开始迁移吗？')) {
        return;
      }
    }

    setIsMigrating(true);
    setErrorMsg('');

    try {
      const result = await migrateLocalTransactionsToCloud(
        userId,
        localTransactions,
        existingCloudTransactions
      );

      setMigrationResult({
        migrated: result.migratedCount,
        skipped: result.skippedDuplicateCount,
      });

      if (clearLocalAfterMigration) {
        // Clear legacy local storage transactions to prevent contamination across different users
        localStorage.removeItem('finance_workbench_transactions_v1');
      }

      onMigrationComplete(result.migratedCount);
    } catch (err: any) {
      console.error('Migration failed:', err);
      setErrorMsg(`迁移未能完成: ${err.message || '网络中断或数据库超时'}`);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">本地数据迁移到个人云空间</h3>
              <p className="text-xs text-slate-500">将本机的离线历史账目安全同步到您的专属账号</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs">
          {migrationResult ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>数据迁移成功！</span>
              </div>
              <p className="leading-relaxed">
                已成功同步 <strong>{migrationResult.migrated}</strong> 笔交易记录至您的个人云端账本。
                {migrationResult.skipped > 0 && (
                  <span>（检测到 {migrationResult.skipped} 笔与云端已存记录重复，已自动跳过，避免重复入账）</span>
                )}
              </p>
              <div className="pt-2 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer transition-all"
                >
                  完成并进入工作台
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">检测到的本地离线流水：</span>
                  <span className="font-bold text-slate-900 text-sm tabular-nums">
                    {localTransactions.length} 笔
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">本地累计支出总额：</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {formatCNY(totalLocalAmount)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight pt-1 border-t border-slate-200/60">
                  迁移将保留原始日期、金额、分类、支付渠道与备注，并绑定当前登录的个人 UID。
                </p>
              </div>

              {/* Step 1: Mandatory Backup Download */}
              <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-blue-900">
                    <Download className="w-4 h-4 text-blue-600" />
                    <span>步骤 1: 迁移前数据安全备份</span>
                  </div>
                  {hasDownloadedBackup && (
                    <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      已下载备份
                    </span>
                  )}
                </div>
                <p className="text-blue-800 text-[11px] leading-relaxed">
                  为确保万无一失，请在迁移前点击下载本地完整 `.json` 备份文件。
                </p>
                <button
                  onClick={handleDownloadBackup}
                  className="px-3.5 py-1.5 bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{hasDownloadedBackup ? '重新下载备份文件' : '立即下载本地离线备份 (.json)'}</span>
                </button>
              </div>

              {/* Step 2: Options */}
              <div className="space-y-2 pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="mt-0.5 rounded text-slate-900 focus:ring-0"
                  />
                  <div>
                    <span className="font-semibold text-slate-800">启用防重复写入机制 (已强制开启)</span>
                    <p className="text-slate-500 text-[11px]">
                      系统会自动比对日期、金额和渠道，如果云端已存在相同流水则自动跳过，绝不重复计算。
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clearLocalAfterMigration}
                    onChange={(e) => setClearLocalAfterMigration(e.target.checked)}
                    className="mt-0.5 rounded text-slate-900 focus:ring-0"
                  />
                  <div>
                    <span className="font-semibold text-slate-800">
                      迁移成功后，清理浏览器离线记录（推荐）
                    </span>
                    <p className="text-slate-500 text-[11px]">
                      避免公共电脑或其他人使用此设备时产生数据混淆。
                    </p>
                  </div>
                </label>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                  {errorMsg}
                </div>
              )}

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  onClick={onClose}
                  disabled={isMigrating}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  稍后处理
                </button>
                <button
                  onClick={handleExecuteMigration}
                  disabled={isMigrating}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isMigrating ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>正在同步迁移中...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>确认迁移至云端</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
