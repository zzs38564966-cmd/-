/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Cloud,
  Smartphone,
  HardDrive,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { loadTransactions } from '../utils/storage';
import { formatCNY } from '../utils/formatters';

export const LoginView: React.FC = () => {
  const { loginWithGoogle, loading } = useAuth();
  const [errorMsg, setErrorMsg] = useState('');

  // Check if current browser has any offline transactions
  const localTxs = loadTransactions();
  const hasLocalData = localTxs && localTxs.length > 0;

  const handleLogin = async () => {
    setErrorMsg('');
    try {
      await loginWithGoogle();
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('登录窗口已被取消，您可以随时重新点击登录。');
      } else {
        setErrorMsg(`登录失败: ${err.message || '网络连接异常，请重试'}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Lockup */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-extrabold text-2xl shadow-md">
            ¥
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-extrabold text-slate-900 tracking-tight">
          个人财务管理工作台
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          独立游戏存档式个人云端财务空间 · 多人完全隐私隔离
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-5 sm:px-8 shadow-sm border border-slate-200 rounded-3xl space-y-6">
          {/* Security Guarantee Cards */}
          <div className="space-y-3">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-3 text-xs">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">绝对隐私隔离保障</h4>
                <p className="text-slate-500 mt-0.5 leading-relaxed">
                  每位用户的数据由 Firestore 数据库底层安全规则严格封控。即使其他人拥有您的交易 ID 或修改请求参数，也无法窃取或篡改您的任何一笔流水。
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-3 text-xs">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shrink-0 mt-0.5">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Windows 与 iPhone 跨端同步</h4>
                <p className="text-slate-500 mt-0.5 leading-relaxed">
                  登录同一 Google 账号即可在电脑端与手机端随时查看最新的 2500 元月预算执行进度与 AI 漫剧项目开支。
                </p>
              </div>
            </div>
          </div>

          {/* Legacy Local Data Notice */}
          {hasLocalData && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <HardDrive className="w-4 h-4 text-amber-700" />
                <span>检测到此浏览器存有离线账单（共 {localTxs.length} 笔）</span>
              </div>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                登录后，系统将提示您自主选择是否将本地数据迁移同步至云端专属账本，并提供防重复和全量备份机制。
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Login CTA Button */}
          <div className="pt-2">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.99] transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {/* Google G logo svg */}
              <svg className="w-5 h-5 bg-white rounded-full p-0.5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{loading ? '正在验证身份...' : '使用 Google 账号安全登录'}</span>
            </button>
          </div>

          {/* Privacy & Zero-cost Note */}
          <div className="pt-2 text-center text-[11px] text-slate-400 leading-relaxed border-t border-slate-100">
            <p>100% 免费基础架构 · 不产生云端账单费用 · 纯净无广告</p>
            <p className="mt-0.5">未登录用户无法读取任何个人账簿，全面保障隐私安全</p>
          </div>
        </div>
      </div>
    </div>
  );
};
