/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Utensils,
  Bus,
  Smartphone,
  BookOpen,
  Film,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Gamepad2,
  ShoppingBag,
  CircleDollarSign,
  HelpCircle,
  ArrowRightLeft,
  Briefcase,
  Wallet,
  CreditCard,
  Banknote,
  Coins,
} from 'lucide-react';
import { PaymentChannel, TransactionType } from '../types/finance';

export function getCategoryIcon(category: string, className = 'w-4 h-4'): React.ReactNode {
  switch (category) {
    case '餐饮':
      return <Utensils className={className} />;
    case '交通':
      return <Bus className={className} />;
    case '手机及日常通信':
      return <Smartphone className={className} />;
    case '学习':
      return <BookOpen className={className} />;
    case 'AI 漫剧':
      return <Film className={className} />;
    case 'AI 软件及订阅':
      return <Sparkles className={className} />;
    case '投资':
    case '投资转入':
    case '投资收益':
      return <TrendingUp className={className} />;
    case '应急储蓄':
    case '应急储蓄转入':
      return <ShieldCheck className={className} />;
    case '娱乐':
      return <Gamepad2 className={className} />;
    case '购物':
      return <ShoppingBag className={className} />;
    case '生活费':
      return <Wallet className={className} />;
    case 'AI 漫剧收入':
      return <Film className={className} />;
    case '兼职收入':
      return <Briefcase className={className} />;
    case '账户互转':
    case '其他资金分配':
      return <ArrowRightLeft className={className} />;
    case '待分类':
      return <HelpCircle className={className} />;
    default:
      return <CircleDollarSign className={className} />;
  }
}

export function getCategoryColorClass(category: string): { bg: string; text: string } {
  switch (category) {
    case '餐饮':
      return { bg: 'bg-orange-50', text: 'text-orange-600' };
    case '交通':
      return { bg: 'bg-blue-50', text: 'text-blue-600' };
    case '手机及日常通信':
      return { bg: 'bg-cyan-50', text: 'text-cyan-600' };
    case '学习':
      return { bg: 'bg-emerald-50', text: 'text-emerald-600' };
    case 'AI 漫剧':
      return { bg: 'bg-purple-50', text: 'text-purple-600' };
    case 'AI 软件及订阅':
      return { bg: 'bg-indigo-50', text: 'text-indigo-600' };
    case '投资':
    case '投资转入':
    case '投资收益':
      return { bg: 'bg-teal-50', text: 'text-teal-600' };
    case '应急储蓄':
    case '应急储蓄转入':
      return { bg: 'bg-amber-50', text: 'text-amber-600' };
    case '娱乐':
      return { bg: 'bg-pink-50', text: 'text-pink-600' };
    case '购物':
      return { bg: 'bg-rose-50', text: 'text-rose-600' };
    case '生活费':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700' };
    case 'AI 漫剧收入':
      return { bg: 'bg-violet-50', text: 'text-violet-600' };
    case '兼职收入':
      return { bg: 'bg-sky-50', text: 'text-sky-600' };
    case '待分类':
      return { bg: 'bg-amber-100', text: 'text-amber-800' };
    default:
      return { bg: 'bg-slate-100', text: 'text-slate-700' };
  }
}

export function getChannelIcon(channel: PaymentChannel, className = 'w-3.5 h-3.5'): React.ReactNode {
  switch (channel) {
    case '微信支付':
      return <Coins className={className} />;
    case '支付宝':
      return <CreditCard className={className} />;
    case '农业银行':
      return <Banknote className={className} />;
    case '现金':
      return <Wallet className={className} />;
    default:
      return <CreditCard className={className} />;
  }
}

export function getTypeBadge(type: TransactionType): { label: string; bg: string; text: string } {
  switch (type) {
    case 'expense':
      return { label: '支出', bg: 'bg-red-50', text: 'text-red-700' };
    case 'income':
      return { label: '收入', bg: 'bg-emerald-50', text: 'text-emerald-700' };
    case 'transfer':
      return { label: '资金分配', bg: 'bg-sky-50', text: 'text-sky-700' };
  }
}
