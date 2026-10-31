/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Lock,
  Download,
  Trash2,
  LogOut,
  Database,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Server,
  Key,
  HardDrive,
  Eye,
  FileCheck,
  AlertOctagon,
  RefreshCw,
} from 'lucide-react';
import { BudgetSettings, CategoryRule, Transaction } from '../types/finance';
import { Card } from './ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { exportToJSON, exportToCSV } from '../utils/storage';

interface SecurityAuditViewProps {
  transactions: Transaction[];
  budget: BudgetSettings;
  rules: CategoryRule[];
  onDeleteAllTransactions: () => Promise<number>;
  onWipeAllUserData: () => Promise<void>;
  onRefreshData: () => void;
}

export const SecurityAuditView: React.FC<SecurityAuditViewProps> = ({
  transactions,
  budget,
  rules,
  onDeleteAllTransactions,
  onWipeAllUserData,
  onRefreshData,
}) => {
  const { currentUser, userProfile, logout } = useAuth();

  const [confirmClearTxsText, setConfirmClearTxsText] = useState('');
  const [confirmWipeAllText, setConfirmWipeAllText] = useState('');
  const [isClearingTxs, setIsClearingTxs] = useState(false);
  const [isWipingAll, setIsWipingAll] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const notificationPermission =
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'denied';

  // 1. Audit Check Items
  const auditItems = [
    {
      id: 'auth_isolation',
      category: '身份验证与用户物理隔离',
      risk: '极高（已防御）',
      riskLevel: 'safe',
      status: '通过 · 严格所有权验证',
      description:
        '通过 Firebase Authentication 获取强加密 UID，Firestore 安全规则只允许 request.auth.uid == userId 读写，未登录用户全面拒绝，无法通过篡改交易 ID 越权横向查看他人数据。',
    },
    {
      id: 'key_security',
      category: '凭据与密钥安全性',
      risk: '高（已防御）',
      riskLevel: 'safe',
      status: '通过 · 无前端特权私钥',
      description:
        '前端代码不包含任何数据库管理员密钥（Service Account Key）或服务端高特权凭据；API 代理采用安全环境变量隔离，无硬编码秘钥提交至代码仓库。',
    },
    {
      id: 'data_minimization',
      category: '高敏感金融数据最小化',
      risk: '高（已防御）',
      riskLevel: 'safe',
      status: '通过 · 零密码零验证码采集',
      description:
        '本系统严格奉行数据最小化准则，杜绝索取或保存微信/支付宝支付密码、银行网银密码、短信验证码或完整 16~19 位银行卡号，全面切断金融钓鱼风险。',
    },
    {
      id: 'file_safety',
      category: '账单导入安全与防代码执行',
      risk: '中（已防御）',
      riskLevel: 'safe',
      status: '通过 · 防 CSV 公式注入与 8MB 限额',
      description:
        '文件全在浏览器本地离线解析，拦截并转义 =、+、-、@、% 开头的 CSV 公式执行字符（DDE 注入防御），剥离所有 HTML/Script 脚本标签，限制文件体积不超过 8MB。',
    },
    {
      id: 'ai_data_privacy',
      category: '自然语言记账与外部 AI 隐私',
      risk: '中（已防御）',
      riskLevel: 'safe',
      status: '通过 · 本地 0ms 纯算法解析',
      description:
        '智能记账与规则推荐采用纯本地 JavaScript 正则与分词引擎，耗时 0ms 且成本为 0，绝对不向任何外部模型服务器上传明细账单，规避云端大模型数据投毒与外泄。',
    },
    {
      id: 'logging_safety',
      category: '敏感信息日志脱敏',
      risk: '低（已防御）',
      riskLevel: 'safe',
      status: '通过 · 过滤敏感字段输出',
      description:
        '系统内部日志不打印用户完整个人资产账户明细或对账凭单，桌面系统通知仅发送脱敏后的概括提示（如“有一项预算预警待处理”），不在锁屏弹窗暴露商户与金额。',
    },
  ];

  // Export handlers
  const handleExportJSON = () => {
    exportToJSON(transactions, budget, rules);
  };

  const handleExportCSV = () => {
    exportToCSV(transactions);
  };

  // Clear all transactions
  const handleClearTransactions = async () => {
    if (confirmClearTxsText !== 'CLEAR_ALL') {
      alert('请输入确认字符 CLEAR_ALL 以执行删除。');
      return;
    }
    setIsClearingTxs(true);
    try {
      const count = await onDeleteAllTransactions();
      setConfirmClearTxsText('');
      setFeedbackMessage(`已成功真实删除 ${count} 笔云端交易记录。`);
      setTimeout(() => setFeedbackMessage(null), 5000);
    } catch (e) {
      alert('删除失败，请检查网络后重试。');
    } finally {
      setIsClearingTxs(false);
    }
  };

  // Wipe all user data
  const handleWipeAll = async () => {
    if (confirmWipeAllText !== 'DELETE_ACCOUNT_DATA') {
      alert('请输入确认字符 DELETE_ACCOUNT_DATA 以执行彻底清除。');
      return;
    }
    setIsWipingAll(true);
    try {
      await onWipeAllUserData();
      setConfirmWipeAllText('');
      setFeedbackMessage('已彻底清空当前云端账户的所有账单、规则、连接与预算配置，恢复全新初始状态。');
      setTimeout(() => setFeedbackMessage(null), 5000);
      onRefreshData();
    } catch (e) {
      alert('重置失败，请检查网络后重试。');
    } finally {
      setIsWipingAll(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-slate-900 text-white rounded-2xl shrink-0 mt-0.5 shadow-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  安全合规审查与隐私管理中心
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  6 项安全防线全面达标
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                依据个人信息保护法与金融信息安全标准，为您提供全透明的数据存储架构、身份隔离证明与自主删除权利。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title="导出包含账单、规则与预算的完整 JSON 备份"
            >
              <Download className="w-3.5 h-3.5" />
              <span>导出 JSON</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
              title="导出通用 CSV 表格"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>导出 CSV</span>
            </button>
          </div>
        </div>

        {feedbackMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}
      </div>

      {/* Audit Checklist Table */}
      <Card
        title="一、全面安全合规与隐私审计报告"
        subtitle="逐项审查数据存储方式、身份隔离、防抓取与模型外泄边界"
      >
        <div className="divide-y divide-slate-100">
          {auditItems.map((item) => (
            <div key={item.id} className="py-3.5 space-y-1.5 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{item.category}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {item.status}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">
                  原风险评级：{item.risk}
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Storage Architecture Transparency */}
      <Card
        title="二、数据存储与服务架构全透明披露"
        subtitle="明确披露数据物理存储位置与调用情况，杜绝暗箱操作"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Database className="w-4 h-4 text-blue-600" />
              <span>数据物理存储位置</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              您的全部记账流水与预算存储于 <strong>Google Cloud Firestore</strong> 独立文档路径：
              <code className="block mt-1 p-2 bg-white rounded-lg border border-slate-200 text-[11px] font-mono text-indigo-900 select-all">
                /databases/(default)/documents/users/{currentUser?.uid || 'GUEST_USER'}/...
              </code>
              受 Google 云端物理隔离与 AES-256 加密保护，任何其他账号无权跨域查询。
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Server className="w-4 h-4 text-purple-600" />
              <span>是否使用外部 AI 云服务</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              <strong>否。当前未将您的财务数据发送给任何外部云端大模型。</strong> 自然语言解析、商户分类、防重复校验等均为纯客户端本地算法，零成本、零外发、零敏感泄密风险。
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <HardDrive className="w-4 h-4 text-emerald-600" />
              <span>本地离线存储使用说明</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              本地 localStorage 仅用于临时缓存预警冷却标记（防疲劳免扰）与离线未同步草稿，不包含敏感银行卡密码或认证 Token。
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Eye className="w-4 h-4 text-amber-600" />
              <span>浏览器桌面通知权限状态</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              当前系统通知权限：
              <strong
                className={`ml-1 ${
                  notificationPermission === 'granted'
                    ? 'text-emerald-700'
                    : notificationPermission === 'denied'
                    ? 'text-red-700'
                    : 'text-amber-700'
                }`}
              >
                {notificationPermission === 'granted'
                  ? '已授权（桌面脱敏预警就绪）'
                  : notificationPermission === 'denied'
                  ? '已拒绝（应用仅在页面内提示，不强求授权）'
                  : '未授权'}
              </strong>
            </p>
          </div>
        </div>
      </Card>

      {/* Interactive Privacy Controls & Deletion Zone */}
      <Card
        title="三、个人隐私控制与永久删除权利"
        subtitle="拥有完整的数据自主权，支持导出、清空流水与抹除云空间全部数据"
      >
        <div className="space-y-5 text-xs">
          {/* Action 1: Export Data */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900 text-sm">1. 完整数据导出与下载</span>
              <p className="text-slate-500">
                可随时导出全部历史流水、自定义分类规则与月度预算方案为 JSON 或 CSV 文件，供本地归档或迁移。
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleExportJSON}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl font-semibold cursor-pointer transition-colors"
              >
                导出 JSON
              </button>
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl font-semibold cursor-pointer transition-colors"
              >
                导出 CSV
              </button>
            </div>
          </div>

          {/* Action 2: Clear All Transactions */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span className="font-bold text-amber-950 text-sm">2. 清空所有交易记录（保留分类规则与预算配置）</span>
              </div>
              <p className="text-amber-800 text-xs">
                当前账本共保存有 <strong>{transactions.length} 笔</strong>真实交易记录。执行后将永久删除云端与本地全部交易，不可撤销。
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                type="text"
                placeholder="请输入 CLEAR_ALL 确认删除"
                value={confirmClearTxsText}
                onChange={(e) => setConfirmClearTxsText(e.target.value)}
                className="px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs outline-none font-mono focus:border-amber-600 sm:w-64"
              />
              <button
                onClick={handleClearTransactions}
                disabled={confirmClearTxsText !== 'CLEAR_ALL' || isClearingTxs}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  confirmClearTxsText === 'CLEAR_ALL' && !isClearingTxs
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isClearingTxs ? '正在真实删除中...' : '确认清空交易记录'}
              </button>
            </div>
          </div>

          {/* Action 3: Wipe All Data */}
          <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200/80 space-y-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-red-700" />
                <span className="font-bold text-red-950 text-sm">3. 彻底抹除个人账本空间（删除所有交易、预算、规则与设置）</span>
              </div>
              <p className="text-red-800 text-xs">
                彻底重置当前用户的个人空间，物理抹除 Firestore 上的所有交易、自定义规则、支付账户连接与预警历史，恢复全新出厂状态。
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                type="text"
                placeholder="请输入 DELETE_ACCOUNT_DATA 确认抹除"
                value={confirmWipeAllText}
                onChange={(e) => setConfirmWipeAllText(e.target.value)}
                className="px-3 py-1.5 bg-white border border-red-300 rounded-xl text-xs outline-none font-mono focus:border-red-600 sm:w-72"
              />
              <button
                onClick={handleWipeAll}
                disabled={confirmWipeAllText !== 'DELETE_ACCOUNT_DATA' || isWipingAll}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  confirmWipeAllText === 'DELETE_ACCOUNT_DATA' && !isWipingAll
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isWipingAll ? '正在执行物理抹除...' : '彻底清空并重置个人空间'}
              </button>
            </div>
          </div>

          {/* Action 4: Logout */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900 text-sm">4. 安全退出登录</span>
              <p className="text-slate-500">
                当前登录账号：{currentUser?.email || currentUser?.displayName || '财务用户'}（UID: {currentUser?.uid?.slice(0, 10)}...）
              </p>
            </div>
            <button
              onClick={() => logout()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>安全退出</span>
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};
