/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  FileSpreadsheet,
  AlertTriangle,
  Lock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink,
  Trash2,
  Info,
  Clock,
  ArrowRight,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { ConnectedAccount, PaymentChannel, Transaction } from '../types/finance';
import { Card } from './ui/Card';
import { AccountAuthorizationModal } from './AccountAuthorizationModal';
import { BillImportModal } from './BillImportModal';

interface AccountsViewProps {
  accounts: ConnectedAccount[];
  transactions: Transaction[];
  onSaveAccounts: (newAccounts: ConnectedAccount[]) => void;
  onDeleteChannelTransactions: (channel: PaymentChannel) => Promise<number>;
  onBatchImport: (txList: any[]) => Promise<void>;
  onNavigateToTab: (tab: any) => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  transactions,
  onSaveAccounts,
  onDeleteChannelTransactions,
  onBatchImport,
  onNavigateToTab,
}) => {
  const [selectedAccountForAuth, setSelectedAccountForAuth] = useState<ConnectedAccount | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedChannelForImport, setSelectedChannelForImport] = useState<PaymentChannel | null>(null);
  const [revokingAccountId, setRevokingAccountId] = useState<string | null>(null);
  const [deleteDataOnRevoke, setDeleteDataOnRevoke] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Compute transactions count per channel
  const channelCounts: Record<string, number> = {};
  transactions.forEach((tx) => {
    channelCounts[tx.channel] = (channelCounts[tx.channel] || 0) + 1;
  });

  const getStatusBadge = (status: ConnectedAccount['status']) => {
    switch (status) {
      case 'unsupported_direct':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-blue-600" />
            <span>暂不支持直联 · 仅支持官方账单合规导入</span>
          </span>
        );
      case 'authorized':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>已授权（账单通道）</span>
          </span>
        );
      case 'pending':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>等待导入账单</span>
          </span>
        );
      case 'revoked':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>已撤销授权</span>
          </span>
        );
      case 'expired':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-200 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
            <span>授权已到期</span>
          </span>
        );
      case 'failed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-800 border border-red-200 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            <span>校验失败</span>
          </span>
        );
      case 'unconnected':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            未连接
          </span>
        );
    }
  };

  const handleConsentConfirmed = (account: ConnectedAccount) => {
    // Update status to pending/authorized with timestamp
    const updated = accounts.map((a) =>
      a.id === account.id
        ? {
            ...a,
            status: 'pending' as const,
            statusDescription: '已完成授权须知确认，请导入官方导出的对账 CSV 流水文件',
            updatedAt: new Date().toISOString(),
          }
        : a
    );
    onSaveAccounts(updated);
    setSelectedAccountForAuth(null);
    setSelectedChannelForImport(account.channel);
    setIsImportModalOpen(true);
    setActionFeedback(`已确认【${account.platformName}】授权说明，现已为您打开安全导入通道。`);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleRevokeAccount = async (accountId: string) => {
    const target = accounts.find((a) => a.id === accountId);
    if (!target) return;

    let deletedCount = 0;
    if (deleteDataOnRevoke) {
      deletedCount = await onDeleteChannelTransactions(target.channel);
    }

    const updated = accounts.map((a) =>
      a.id === accountId
        ? {
            ...a,
            status: 'revoked' as const,
            statusDescription: '用户已主动撤销授权与账单同步',
            updatedAt: new Date().toISOString(),
          }
        : a
    );

    onSaveAccounts(updated);
    setRevokingAccountId(null);
    setDeleteDataOnRevoke(false);

    setActionFeedback(
      `已撤销【${target.platformName}】的授权状态${
        deleteDataOnRevoke ? `，并同步真实清理了 ${deletedCount} 笔相关历史流水` : '（保留了已有记账记录）'
      }。`
    );
    setTimeout(() => setActionFeedback(null), 5000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-slate-900 text-white rounded-2xl shrink-0 mt-0.5 shadow-xs">
              <Building2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  支付账户连接与授权管理
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  合规声明生效中
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                遵循《中华人民共和国个人信息保护法》与金融安全规范，严格实行“平台逐一授权、明示数据范围、真实状态管理、绝不伪造直联”。
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateToTab('security')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>安全审计与隐私中心</span>
          </button>
        </div>

        {/* Real Principle Disclaimer Banner */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3 text-xs text-slate-600 leading-relaxed">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-800">重要法律与合规准则：</span>
            <span>
              由于微信支付、支付宝及各大商业银行官方政策限制，目前<strong>并未面向普通个人储蓄账户开放免商户企业入驻的直接自动拉取 API</strong>。本产品绝不使用未经授权的后台自动化模拟登录、验证码截获或网页爬虫技术，绝不会以任何虚假的“连接成功”误导用户。当前所有外部流水均通过<strong>【用户主动导出的官方账单 CSV】</strong>进行前端离线解析，确保凭证绝对安全。
            </span>
          </div>
        </div>
      </div>

      {/* Account List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 px-1">平台账户连接状态与授权列表</h3>

        {accounts.map((account) => {
          const currentCount = channelCounts[account.channel] || 0;
          const isRevoking = revokingAccountId === account.id;

          return (
            <Card key={account.id} className="relative overflow-hidden">
              <div className="space-y-4">
                {/* Account Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                      {account.platformName.slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{account.platformName}</h4>
                        <span className="text-[11px] text-slate-400">（渠道：{account.channel}）</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{account.statusDescription}</p>
                    </div>
                  </div>

                  <div className="self-start sm:self-auto shrink-0">
                    {getStatusBadge(account.status)}
                  </div>
                </div>

                {/* Account Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-[11px] text-slate-400 font-medium">接入与同步方式</span>
                    <p className="font-bold text-slate-800">
                      {account.authMethod === 'bill_import_compliant'
                        ? '官方账单导出导入通道'
                        : '官方企业级 OAuth 直联'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-[11px] text-slate-400 font-medium">当前账本内该渠道交易</span>
                    <p className="font-bold text-slate-800 tabular-nums">
                      {currentCount > 0 ? (
                        <span className="text-emerald-700 font-bold">{currentCount} 笔真实记录</span>
                      ) : (
                        <span className="text-slate-400 font-normal">暂无流水记录</span>
                      )}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-[11px] text-slate-400 font-medium">凭据安全与密码要求</span>
                    <p className="font-bold text-emerald-700">0 密码收集 · 0 验证码要求</p>
                  </div>
                </div>

                {/* Scope & Notes */}
                <div className="space-y-1.5 text-xs">
                  <span className="font-semibold text-slate-700">授权权限范围：</span>
                  <div className="flex flex-wrap gap-1.5">
                    {account.authorizedScope.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[11px]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{account.notes}</p>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedAccountForAuth(account)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Info className="w-3.5 h-3.5 text-slate-500" />
                      <span>查看授权说明与指引</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedChannelForImport(account.channel);
                        setIsImportModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>导入【{account.platformName}】账单</span>
                    </button>
                  </div>

                  <div>
                    {account.status !== 'unconnected' && account.status !== 'revoked' && (
                      <button
                        onClick={() => setRevokingAccountId(account.id)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-semibold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>撤销授权</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Revoke Confirmation Dialog */}
                {isRevoking && (
                  <div className="mt-3 p-4 bg-red-50/90 border border-red-200 rounded-2xl space-y-3 animate-fade-in">
                    <div className="flex items-center gap-2 text-red-900 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span>确认撤销【{account.platformName}】的账户连接授权？</span>
                    </div>

                    <p className="text-red-800 text-xs leading-relaxed">
                      撤销后将终止后续针对该平台的记账导入与关联提醒。您可以选择是否一并清理已经保存在账本中的全部【{account.channel}】流水（共 {currentCount} 笔）。
                    </p>

                    <label className="flex items-center gap-2 text-xs text-red-900 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={deleteDataOnRevoke}
                        onChange={(e) => setDeleteDataOnRevoke(e.target.checked)}
                        className="rounded text-red-600 focus:ring-0 cursor-pointer w-4 h-4"
                      />
                      <span>同步永久删除账本中属于【{account.channel}】的全部历史流水（共 {currentCount} 笔）</span>
                    </label>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleRevokeAccount(account.id)}
                        className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        确认执行撤销{deleteDataOnRevoke ? '并删除数据' : ''}
                      </button>
                      <button
                        onClick={() => {
                          setRevokingAccountId(null);
                          setDeleteDataOnRevoke(false);
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Feature Reality & Transparency Matrix (四层架构严格透明化) */}
      <Card
        title="技术能力透明度矩阵：已实现 vs 待接入"
        subtitle="明确区分真实可用功能与金融监管限制，拒绝虚构 API"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
          <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-950 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>1. 已经可以实际运行的功能</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-emerald-900">
              <li>微信官方账单 CSV、支付宝账单 CSV、银行流水本地离线解析</li>
              <li>防重复流水候选标记与自动冲抵退款</li>
              <li>按用户 Google UID 加密隔离保存至 Cloud Firestore</li>
              <li>支付账户逐项独立授权说明与明示同意机制</li>
              <li>撤销授权与渠道历史流水一键物理清除</li>
            </ul>
          </div>

          <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-blue-950 font-bold">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>2. 只有界面、尚未接入直联的功能</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-blue-900">
              <li>微信支付企业直联后台同步（需微信商户号营业执照）</li>
              <li>支付宝开放平台商用对账直连（需企业法人实名认证应用）</li>
              <li>商业银行银企直联专线对接（需开通对公专线并部署证书硬件）</li>
            </ul>
          </div>

          <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-amber-950 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>3. 需要平台授权或外部特定配置的功能</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-amber-900">
              <li>商户侧退款自动通知 Webhook 接收端</li>
              <li>第三方金融聚合支付结算账户批量对账</li>
            </ul>
          </div>

          <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <Lock className="w-4 h-4 text-slate-700" />
              <span>4. 暂时无法实现的合规限制场景</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li>免用户登录无感实时截获他人微信/支付宝账户流水（法律严令禁止）</li>
              <li>要求用户输入银行卡支付密码进行后台余额窥探（属于重大金融安全红线）</li>
              <li>私自开通任何未经用户同意的自动扣费免密协议</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Account Authorization Pre-Consent Modal */}
      <AccountAuthorizationModal
        isOpen={selectedAccountForAuth !== null}
        account={selectedAccountForAuth}
        onClose={() => setSelectedAccountForAuth(null)}
        onConfirmConsent={handleConsentConfirmed}
        onOpenPrivacyAudit={() => {
          setSelectedAccountForAuth(null);
          onNavigateToTab('security');
        }}
      />

      {/* Bill Import Modal */}
      <BillImportModal
        isOpen={isImportModalOpen}
        existingTransactions={transactions}
        rules={[]}
        initialChannel={selectedChannelForImport || undefined}
        onClose={() => {
          setIsImportModalOpen(false);
          setSelectedChannelForImport(null);
        }}
        onConfirmImport={async (importedList) => {
          await onBatchImport(importedList);
          setIsImportModalOpen(false);
          // Mark target account as authorized
          if (selectedChannelForImport) {
            const updated = accounts.map((a) =>
              a.channel === selectedChannelForImport
                ? {
                    ...a,
                    status: 'authorized' as const,
                    statusDescription: `已成功导入 ${importedList.length} 笔流水`,
                    importedCount: (a.importedCount || 0) + importedList.length,
                    lastSyncDate: new Date().toISOString().slice(0, 10),
                    updatedAt: new Date().toISOString(),
                  }
                : a
            );
            onSaveAccounts(updated);
          }
        }}
      />
    </div>
  );
};
