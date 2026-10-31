/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TransactionType = 'expense' | 'income' | 'transfer';

export type PaymentChannel =
  | '微信支付'
  | '支付宝'
  | '农业银行'
  | '现金'
  | '其他';

export const PAYMENT_CHANNELS: PaymentChannel[] = [
  '微信支付',
  '支付宝',
  '农业银行',
  '现金',
  '其他',
];

export const EXPENSE_CATEGORIES = [
  '餐饮',
  '交通',
  '手机及日常通信',
  '学习',
  'AI 漫剧',
  'AI 软件及订阅',
  '投资',
  '应急储蓄',
  '娱乐',
  '购物',
  '其他',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number] | '待分类';

export const INCOME_CATEGORIES = [
  '生活费',
  'AI 漫剧收入',
  '兼职收入',
  '投资收益',
  '其他收入',
] as const;

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number] | '待分类';

export const TRANSFER_CATEGORIES = [
  '投资转入',
  '应急储蓄转入',
  '账户互转',
  '其他资金分配',
] as const;

export type TransferCategory = (typeof TRANSFER_CATEGORIES)[number] | '待分类';

export interface Transaction {
  id: string;
  type: TransactionType; // 'expense' | 'income' | 'transfer'
  amount: number; // positive number in CNY
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  category: string;
  channel: PaymentChannel;
  note: string;
  isCategorized: boolean; // false if unclassified
  targetAccount?: string; // e.g., '证券/理财账户', '应急存钱罐'
  isRefund?: boolean; // true if this transaction is a refund/credit
  merchant?: string; // counterparty or store name
  sourceBillType?: 'manual' | 'nlp' | 'alipay' | 'wechat' | 'bank' | 'csv';
  createdAt: number;
  updatedAt: number;
}

export interface CategoryRule {
  id: string;
  keyword: string; // e.g., "食堂", "麦当劳", "滴滴", "Midjourney"
  targetCategory: string;
  targetType: TransactionType;
  channel?: PaymentChannel;
  enabled: boolean;
  priority?: number;
  description?: string;
  isPreset?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface NLPParseResult {
  rawText: string;
  parsed: {
    type: TransactionType;
    amount: number | null;
    date: string;
    time?: string;
    category: string;
    channel: PaymentChannel;
    note: string;
    merchant?: string;
    isRefund?: boolean;
  };
  confidence: 'high' | 'medium' | 'low';
  matchedRule?: CategoryRule;
  conflictRules?: CategoryRule[];
  explanation: string;
}

export interface BillImportRow {
  id: string;
  date: string;
  time?: string;
  type: TransactionType;
  amount: number;
  category: string;
  channel: PaymentChannel;
  merchant: string;
  note: string;
  rawStatus: string;
  isRefund: boolean;
  isDuplicateCandidate: boolean;
  duplicateReason?: string;
  isCategorized: boolean;
  ruleMatched?: string;
  conflictRules?: CategoryRule[];
  selected: boolean;
}

export interface BudgetBucket {
  id: string;
  name: string;
  amount: number; // monthly budget in CNY
  description: string;
  // Subcategories belonging to this bucket (does not sum redundantly into total)
  categories: string[];
  subBudgets?: {
    category: string;
    amount: number;
  }[];
}

export interface BudgetSettings {
  totalBudget: number; // default 2500
  buckets: BudgetBucket[];
}

export interface RecurringBill {
  id: string;
  name: string;
  amount: number;
  dueDayOfMonth: number; // 1 - 31
  category: string;
  channel?: PaymentChannel;
  note?: string;
  enabled: boolean;
}

export interface AlertRuleConfig {
  lowBalance: {
    enabled: boolean;
    threshold: number; // e.g., 200 CNY
  };
  dailySpend: {
    enabled: boolean;
    threshold: number; // e.g., 100 CNY
  };
  category80: {
    enabled: boolean;
  };
  categoryOverspend: {
    enabled: boolean;
  };
  projectedMonthOverspend: {
    enabled: boolean;
  };
  billDue: {
    enabled: boolean;
    advanceDays: number; // e.g., 3 days before
    bills: RecurringBill[];
  };
  consecutiveSpike: {
    enabled: boolean;
    days: number; // e.g., 3 days
    dailyThreshold: number; // e.g., 80 CNY/day
  };
  channels: {
    inAppCenter: boolean;
    inPageBanner: boolean;
    browserDesktop: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // e.g. "23:00"
    end: string; // e.g. "08:00"
  };
  cooldownHours: number; // default 24h
}

export type AlertType =
  | 'low_balance'
  | 'daily_spend'
  | 'category_80'
  | 'category_overspend'
  | 'projected_overspend'
  | 'bill_due'
  | 'consecutive_spike';

export interface AlertItem {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'danger';
  timestamp: number;
  details: {
    currentValue?: number;
    threshold?: number;
    targetName?: string;
    dueDay?: number;
    daysRemaining?: number;
    calculationBasis?: string;
  };
  dismissedAt?: number;
  snoozedUntil?: number;
}

export type AccountAuthStatus =
  | 'unconnected' // 未连接
  | 'pending' // 等待授权 / 准备导入
  | 'authorized' // 已授权（合规官方账单通道）
  | 'failed' // 授权或格式校验失败
  | 'expired' // 授权已过期（建议更新账单）
  | 'revoked' // 已撤销
  | 'unsupported_direct'; // 明确标注：官方未对个人开放免商户入驻的实时直联 API

export interface ConnectedAccount {
  id: string; // 'wechat' | 'alipay' | 'abchina' | 'unionpay'
  platformName: string;
  channel: PaymentChannel;
  status: AccountAuthStatus;
  authMethod: 'bill_import_compliant' | 'official_oauth_api';
  statusDescription: string;
  lastSyncDate?: string;
  importedCount: number;
  authorizedScope: string[];
  validUntil?: string;
  hasDirectApi: boolean;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'transactions'
  | 'unclassified'
  | 'budget'
  | 'summary'
  | 'alerts'
  | 'accounts'
  | 'security'
  | 'rules'
  | 'data'
  | 'test'
  | 'profile';

