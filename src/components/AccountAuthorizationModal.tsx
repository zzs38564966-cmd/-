/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Lock,
  X,
  CheckCircle2,
  ExternalLink,
  Info,
  Building,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { ConnectedAccount } from '../types/finance';

interface AccountAuthorizationModalProps {
  isOpen: boolean;
  account: ConnectedAccount | null;
  onClose: () => void;
  onConfirmConsent: (account: ConnectedAccount) => void;
  onOpenPrivacyAudit: () => void;
}

export const AccountAuthorizationModal: React.FC<AccountAuthorizationModalProps> = ({
  isOpen,
  account,
  onClose,
  onConfirmConsent,
  onOpenPrivacyAudit,
}) => {
  const [hasUserAgreed, setHasUserAgreed] = useState(false);

  if (!isOpen || !account) return null;

  const handleConsent = () => {
    if (!hasUserAgreed) {
      alert('请先勾选并确认您已阅读上述授权说明与隐私须知。');
      return;
    }
    onConfirmConsent(account);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs select-none overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 text-white rounded-2xl shadow-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                支付账户连接与授权说明 · {account.platformName}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                依照国家金融与网络安全合规规范，连接前向您明确披露数据范围与隐私边界
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5 text-xs text-slate-600 leading-relaxed">
          {/* Important Principle Alert */}
          <div className="p-4 bg-amber-50/90 border border-amber-200/80 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>重要安全原则：坚决不伪造连接状态，杜绝任何密码抓取</span>
            </div>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              目前微信支付、支付宝及各大商业银行官方<strong>未对普通个人储蓄账户开放免商户入驻的实时对账 API</strong>。本应用严格遵守中国人民银行与网络安全法规定，<strong>绝不向您索取支付密码、银行网银密码或短信验证码</strong>，绝不使用未经授权的后台自动化模拟登录脚本。
            </p>
          </div>

          {/* Itemized Declarations */}
          <div className="space-y-3.5">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Info className="w-4 h-4 text-slate-700" />
              <span>逐项授权说明清单</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                <span className="font-bold text-slate-800">1. 目标平台名称</span>
                <p className="text-slate-600">{account.platformName}（{account.channel}）</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                <span className="font-bold text-slate-800">2. 连接的具体目的</span>
                <p className="text-slate-600">个人收支自动化统计、预算消耗预警与分类管理</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                <span className="font-bold text-slate-800">3. 需要读取的数据类型</span>
                <p className="text-slate-600">交易日期时间、金额、收支类型、对方商户户名与摘要备注</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                <span className="font-bold text-slate-800">4. 数据读取的时间范围</span>
                <p className="text-slate-600">仅限您主动上传导出的官方账单对应账期（如单月/单季度）</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                <span className="font-bold text-slate-800">5. 数据保存在哪里</span>
                <p className="text-slate-600">Google Cloud Firestore 您账号专属的独立加密安全空间</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                <span className="font-bold text-slate-800">6. 是否会发送到第三方</span>
                <p className="text-emerald-700 font-bold">绝对不会！零外部第三方传输，无广告商打扰</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                <span className="font-bold text-slate-800">7. 同步模式说明</span>
                <p className="text-slate-600">
                  <span className="font-bold text-indigo-700">官方账单导出导入</span>（合规安全、不暴露凭据）
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                <span className="font-bold text-slate-800">8. 授权有效期</span>
                <p className="text-slate-600">账单导入后持续保留在您的账簿中，直至您主动撤销或清空</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1.5">
              <span className="font-bold text-slate-800">9. 如何撤销授权及已保存数据的处理方式</span>
              <p className="text-slate-500 leading-relaxed">
                您可以在随时点击对应账户的「撤销授权」按钮。撤销时系统会提供弹窗确认：可选择仅停止后续导入关联，或<strong>同步一键抹除所有已导入该支付渠道的历史交易记录</strong>，并给出实际删除条数反馈。
              </p>
            </div>
          </div>

          {/* User Consent Checkbox (NEVER default-checked) */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-100/70 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={hasUserAgreed}
                onChange={(e) => setHasUserAgreed(e.target.checked)}
                className="mt-0.5 rounded text-slate-900 focus:ring-0 cursor-pointer w-4 h-4"
              />
              <span className="text-xs text-slate-800 font-medium leading-relaxed">
                我已仔细阅读并理解上述针对【{account.platformName}】的授权说明。我知晓当前模式为基于官方导出的账单合规通道，绝不包含任何密码收集或后台未经授权的抓取行为。
              </span>
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
          <button
            onClick={() => {
              onClose();
              onOpenPrivacyAudit();
            }}
            className="flex items-center gap-1 text-slate-600 hover:text-slate-900 text-xs font-semibold cursor-pointer underline"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>查看完整安全与隐私审计白皮书</span>
          </button>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              暂不同意并取消
            </button>
            <button
              onClick={handleConsent}
              disabled={!hasUserAgreed}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 ${
                hasUserAgreed
                  ? 'bg-slate-900 hover:bg-slate-800 text-white'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>同意并进入账单指引</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
