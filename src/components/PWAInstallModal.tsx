/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Monitor,
  Download,
  Share2,
  PlusSquare,
  CheckCircle2,
  Bell,
  Wifi,
  ShieldCheck,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';
import {
  getNotificationCapabilities,
  requestNotificationPermission,
  sendSystemNotification,
} from '../utils/notificationService';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isStandalone, isIOS, promptInstall } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'guide' | 'notifications' | 'privacy'>('guide');
  const [notificationStatus, setNotificationStatus] = useState(() => getNotificationCapabilities());
  const [testNotificationFeedback, setTestNotificationFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRequestNotification = async () => {
    const perm = await requestNotificationPermission();
    setNotificationStatus(getNotificationCapabilities());
    if (perm === 'granted') {
      await sendSystemNotification({
        title: '财务工作台 · 系统通知已开启',
        body: '您已成功配置通知权限，当可用余额预警或固定账单到期时将向您发送提醒。',
      });
      setTestNotificationFeedback('已成功发出测试通知！请查看系统通知弹窗。');
    } else {
      setTestNotificationFeedback('通知权限已被拒绝，请在系统或浏览器设置中允许此网站发送通知。');
    }
  };

  const handleSendTestNotification = async () => {
    setTestNotificationFeedback(null);
    const sent = await sendSystemNotification({
      title: '财务预警测试提醒',
      body: '【测试】您的账本估算结余充足，日常开支保持在健康预算区间。',
    });
    if (sent) {
      setTestNotificationFeedback('已发出测试系统通知！');
    } else {
      setTestNotificationFeedback('发送失败，请确认是否已在浏览器中允许通知。');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Smartphone className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                PWA 独立应用安装与使用指南
              </h3>
              <p className="text-xs text-slate-500">
                无需通过应用商店，直接在 iPhone 与 Windows 桌面像原生 App 一样打开
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-100 px-6 pt-2 bg-white shrink-0">
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'guide'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            安装指南（iPhone / Windows）
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'notifications'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            通知与 Web Push 说明
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'privacy'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            离线缓存与数据安全
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {activeTab === 'guide' && (
            <div className="space-y-4">
              {/* Standalone Status Indicator */}
              {isStandalone ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-sm block">已在独立应用模式下运行</span>
                    <span className="text-[11px] text-emerald-700">
                      当前应用正以 PWA 全屏原生模式运行，无浏览器网址栏干扰，享受沉浸式财务管理体验。
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Windows / Chromium Desktop Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-slate-700" />
                    <span className="font-bold text-slate-900 text-sm">
                      Windows 电脑 / 桌面浏览器（Chrome · Edge）
                    </span>
                  </div>
                  {isInstallable && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-md">
                      可直接安装
                    </span>
                  )}
                </div>

                <p className="text-slate-600 leading-relaxed">
                  在 Windows 上安装后，应用将在桌面和开始菜单生成独立图标，拥有独立的无边框应用窗口，快捷记账随手打开。
                </p>

                {isInstallable ? (
                  <button
                    onClick={promptInstall}
                    className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>立即在当前电脑安装应用</span>
                  </button>
                ) : (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-600 space-y-1">
                    <span className="font-semibold text-slate-800 block">手动安装方法：</span>
                    <p>
                      1. 查看浏览器右上角地址栏右侧，点击出现的<strong>「安装」图标（⊕）</strong>；
                    </p>
                    <p>
                      2. 或点击浏览器右上角三个点菜单 ➔ <strong>「应用」➔「安装此网站为应用」</strong>。
                    </p>
                  </div>
                )}
              </div>

              {/* iPhone / iOS Safari Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-slate-700" />
                  <span className="font-bold text-slate-900 text-sm">
                    iPhone 苹果手机（Safari 浏览器）
                  </span>
                </div>

                <p className="text-slate-600 leading-relaxed">
                  iOS Safari 不支持自动弹出安装窗，但通过 Safari 内置的「添加到主屏幕」即可一键生成独立 App：
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                    <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                      1
                    </div>
                    <span className="font-bold text-slate-900 block flex items-center gap-1">
                      <Share2 className="w-3.5 h-3.5 text-blue-600" />
                      点击分享按钮
                    </span>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      在 iPhone Safari 底部工具栏中，点击正中间的<strong>「分享图标（带向上箭头的方框）」</strong>。
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                    <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                      2
                    </div>
                    <span className="font-bold text-slate-900 block flex items-center gap-1">
                      <PlusSquare className="w-3.5 h-3.5 text-emerald-600" />
                      添加到主屏幕
                    </span>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      向上轻扫弹出的菜单，找到并轻点<strong>「添加到主屏幕」</strong>。
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                    <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                      3
                    </div>
                    <span className="font-bold text-slate-900 block flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      确认并打开
                    </span>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      点击右上角<strong>「添加」</strong>，主屏幕就会出现「财务工作台」独立图标，点开即是纯净全屏！
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-slate-900 text-sm">
                      系统通知与 Web Push 能力评估
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                      notificationStatus.permission === 'granted'
                        ? 'bg-emerald-100 text-emerald-800'
                        : notificationStatus.permission === 'denied'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    权限状态: {notificationStatus.permission === 'granted' ? '已授权' : notificationStatus.permission === 'denied' ? '已拒绝' : '待授权'}
                  </span>
                </div>

                <div className="space-y-2 text-slate-600 leading-relaxed">
                  <p>
                    <strong>1. 浏览器与应用内通知（已实现）</strong>：
                    支持在单日消费超标、预算超支（80%/100%）、固定账单到期或余额低于安全线时向您弹出桌面/手机系统通知，并在顶部预警中心保留记录。
                  </p>
                  <p>
                    <strong>2. Apple iPhone (iOS) Web Push 限制说明</strong>：
                    依据 Apple 官方 WebKit 安全机制（iOS 16.4+），在普通的 Safari 浏览器标签页中，Push API 默认是被禁用的；<strong>只有先将网页「添加到主屏幕」以独立 PWA 方式打开后，才支持系统推送权限</strong>。
                  </p>
                  <p>
                    <strong>3. 离线/后台推送真实约束</strong>：
                    Web 应用并非原生 iOS/Android 后台守护进程。若用户彻底关闭应用或设备进入深度省电休眠，推送依赖系统通知服务，无法保证在任何断网断电极限情况下均能常驻唤醒。
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                  {notificationStatus.permission !== 'granted' ? (
                    <button
                      onClick={handleRequestNotification}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      申请开启系统通知权限
                    </button>
                  ) : (
                    <button
                      onClick={handleSendTestNotification}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      发送一条测试预警通知
                    </button>
                  )}
                </div>

                {testNotificationFeedback && (
                  <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium text-[11px]">
                    {testNotificationFeedback}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-900 text-sm">
                    PWA 缓存机制与隐私防泄漏架构
                  </span>
                </div>

                <div className="space-y-2 text-slate-600 leading-relaxed">
                  <p>
                    <strong>严格分离公共静态资源与私人账本</strong>：
                    Service Worker 仅对应用的 HTML、CSS、JS 脚本以及图标等纯静态展示资源执行 Workbox 预缓存。
                  </p>
                  <p className="p-2.5 bg-amber-50 rounded-xl text-amber-900 border border-amber-200 font-medium">
                    ⚠️ <strong>严禁公共缓存敏感数据</strong>：所有的个人交易流水、账单明细和支付账户配置，绝不会被写入公共 Service Worker 缓存，完全避免了在共享设备上残留敏感财务隐私的风险。
                  </p>
                  <p>
                    <strong>离线访问策略</strong>：
                    断网时，应用能迅速从本地离线存储渲染最近一次已核实的数据，并在顶部明确提示「离线状态」，绝不伪造或将过期数据冒充为实时同步的云端数据。
                  </p>
                  <p>
                    <strong>卸载与更新说明</strong>：
                    更新应用时，Service Worker 会在后台安静校验版本；从手机主屏幕删除 PWA 图标仅清除当前浏览器容器的本地离线副本，您的真实云端账本牢固保存在受密码/身份保护的独立 Firebase Firestore 数据库中，随时可在新设备重新登录找回。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 shrink-0">
          <span className="text-[11px] text-slate-400">
            支持 iOS 16.4+ · Android · Windows 10/11 · macOS
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};
