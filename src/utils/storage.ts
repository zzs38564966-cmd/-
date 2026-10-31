/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BudgetSettings, Transaction } from '../types/finance';

const STORAGE_KEY_TRANSACTIONS = 'finance_workbench_transactions_v1';
const STORAGE_KEY_BUDGET = 'finance_workbench_budget_v1';

export const DEFAULT_BUDGET_SETTINGS: BudgetSettings = {
  totalBudget: 2500,
  buckets: [
    {
      id: 'living',
      name: '生活费用',
      amount: 1080,
      description: '日常伙食餐饮、交通出行、校园通信、文具学习等基本生活花销',
      categories: ['餐饮', '交通', '手机及日常通信', '学习', '娱乐', '购物', '其他'],
      subBudgets: [
        { category: '餐饮', amount: 750 },
        { category: '交通', amount: 90 },
        { category: '手机及日常通信', amount: 40 },
        { category: '学习', amount: 200 },
      ],
    },
    {
      id: 'ai_drama',
      name: 'AI 漫剧',
      amount: 350,
      description: '用于漫剧生成工具、AI 绘画/语音订阅、视频渲染及音效素材采购',
      categories: ['AI 漫剧', 'AI 软件及订阅'],
    },
    {
      id: 'invest',
      name: '投资资金',
      amount: 300,
      description: '每月定投资金，积累长期本金（资金分配转账，不计入日常消费）',
      categories: ['投资', '投资转入'],
    },
    {
      id: 'savings',
      name: '应急储蓄',
      amount: 500,
      description: '防范突发事件的应急备用金（资金分配转账，专款专用）',
      categories: ['应急储蓄', '应急储蓄转入'],
    },
    {
      id: 'flexible',
      name: '灵活资金',
      amount: 270,
      description: '应对社交聚餐、突发购置等灵活机动开销',
      categories: ['灵活资金'],
    },
  ],
};

export const INITIAL_DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_seed_1',
    type: 'income',
    amount: 2500.0,
    date: '2026-10-01',
    time: '09:30',
    category: '生活费',
    channel: '农业银行',
    note: '10月份每月生活费转账到卡',
    isCategorized: true,
    createdAt: 1790847000000,
    updatedAt: 1790847000000,
  },
  {
    id: 'tx_seed_2',
    type: 'transfer',
    amount: 500.0,
    date: '2026-10-02',
    time: '10:15',
    category: '应急储蓄转入',
    channel: '农业银行',
    note: '转入微信零钱通专户作为应急备用金',
    isCategorized: true,
    targetAccount: '微信零钱通应急金',
    createdAt: 1790936100000,
    updatedAt: 1790936100000,
  },
  {
    id: 'tx_seed_3',
    type: 'transfer',
    amount: 300.0,
    date: '2026-10-03',
    time: '14:20',
    category: '投资转入',
    channel: '支付宝',
    note: '每月指数基金定投资金分配',
    isCategorized: true,
    targetAccount: '证券/理财定投账户',
    createdAt: 1791037200000,
    updatedAt: 1791037200000,
  },
  {
    id: 'tx_seed_4',
    type: 'expense',
    amount: 50.0,
    date: '2026-10-05',
    time: '11:00',
    category: 'AI 软件及订阅',
    channel: '支付宝',
    note: 'AI绘画生图与模型API额度订阅',
    isCategorized: true,
    createdAt: 1791198000000,
    updatedAt: 1791198000000,
  },
  {
    id: 'tx_seed_5',
    type: 'expense',
    amount: 39.0,
    date: '2026-10-08',
    time: '09:00',
    category: '手机及日常通信',
    channel: '微信支付',
    note: '校园卡当月通信套餐费',
    isCategorized: true,
    createdAt: 1791450000000,
    updatedAt: 1791450000000,
  },
  {
    id: 'tx_seed_6',
    type: 'expense',
    amount: 22.5,
    date: '2026-10-12',
    time: '12:25',
    category: '餐饮',
    channel: '微信支付',
    note: '第一食堂二楼鸡排饭与饮料',
    isCategorized: true,
    createdAt: 1791807900000,
    updatedAt: 1791807900000,
  },
  {
    id: 'tx_seed_7',
    type: 'expense',
    amount: 45.0,
    date: '2026-10-16',
    time: '16:40',
    category: 'AI 漫剧',
    channel: '支付宝',
    note: '漫剧第一集人物配音素材定制',
    isCategorized: true,
    createdAt: 1792168800000,
    updatedAt: 1792168800000,
  },
  {
    id: 'tx_seed_8',
    type: 'income',
    amount: 150.0,
    date: '2026-10-20',
    time: '18:10',
    category: 'AI 漫剧收入',
    channel: '支付宝',
    note: '短剧预告片平台商单分成收益',
    isCategorized: true,
    createdAt: 1792519800000,
    updatedAt: 1792519800000,
  },
  {
    id: 'tx_seed_9',
    type: 'expense',
    amount: 15.0,
    date: '2026-10-24',
    time: '18:30',
    category: '餐饮',
    channel: '微信支付',
    note: '学一食堂晚饭牛肉面',
    isCategorized: true,
    createdAt: 1792866600000,
    updatedAt: 1792866600000,
  },
  {
    id: 'tx_seed_10',
    type: 'expense',
    amount: 28.0,
    date: '2026-10-27',
    time: '21:15',
    category: '待分类',
    channel: '微信支付',
    note: '校门口扫码支付，未填写分类',
    isCategorized: false,
    createdAt: 1793126100000,
    updatedAt: 1793126100000,
  },
];

/**
 * Load transactions from local storage. If empty, load default seed.
 */
export function loadTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    if (!raw) {
      saveTransactions(INITIAL_DEMO_TRANSACTIONS);
      return INITIAL_DEMO_TRANSACTIONS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return INITIAL_DEMO_TRANSACTIONS;
  } catch (err) {
    console.error('Failed to load transactions from localStorage', err);
    return INITIAL_DEMO_TRANSACTIONS;
  }
}

/**
 * Save transactions to local storage
 */
export function saveTransactions(transactions: Transaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
  } catch (err) {
    console.error('Failed to save transactions to localStorage', err);
  }
}

/**
 * Load budget settings from local storage
 */
export function loadBudgetSettings(): BudgetSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BUDGET);
    if (!raw) {
      saveBudgetSettings(DEFAULT_BUDGET_SETTINGS);
      return DEFAULT_BUDGET_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.totalBudget === 'number' && Array.isArray(parsed.buckets)) {
      return parsed;
    }
    return DEFAULT_BUDGET_SETTINGS;
  } catch (err) {
    console.error('Failed to load budget settings from localStorage', err);
    return DEFAULT_BUDGET_SETTINGS;
  }
}

/**
 * Save budget settings to local storage
 */
export function saveBudgetSettings(settings: BudgetSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_BUDGET, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save budget settings to localStorage', err);
  }
}

/**
 * Export complete backup data (transactions + budget settings + metadata)
 */
export function exportBackupJSON(transactions: Transaction[], budget: BudgetSettings): string {
  const backup = {
    appName: '个人财务管理工作台',
    version: '1.0.0',
    exportTime: new Date().toISOString(),
    totalBudget: budget.totalBudget,
    budgetSettings: budget,
    transactions,
  };
  return JSON.stringify(backup, null, 2);
}

/**
 * Export and trigger browser download of JSON backup
 */
export function exportToJSON(
  transactions: Transaction[],
  budget: BudgetSettings,
  rules: any[] = []
): void {
  const data = {
    appName: '个人财务管理工作台',
    version: '1.2.0',
    exportTime: new Date().toISOString(),
    totalBudget: budget.totalBudget,
    budgetSettings: budget,
    categoryRules: rules,
    transactions,
  };
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `财务工作台备份_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export and trigger browser download of CSV spreadsheet
 */
export function exportToCSV(transactions: Transaction[]): void {
  const headers = ['交易日期', '交易时间', '收支类型', '金额(元)', '交易分类', '支付渠道', '商户或对方', '备注', '是否退款'];
  const rows = transactions.map((t) => [
    t.date,
    t.time || '',
    t.type === 'expense' ? '支出' : t.type === 'income' ? '收入' : '转账/分配',
    t.amount.toFixed(2),
    t.category,
    t.channel,
    `"${(t.merchant || '').replace(/"/g, '""')}"`,
    `"${(t.note || '').replace(/"/g, '""')}"`,
    t.isRefund ? '是' : '否',
  ]);
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `财务交易明细_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Reset all data to initial demo data
 */
export function resetToDefaultData(): { transactions: Transaction[]; budget: BudgetSettings } {
  saveTransactions(INITIAL_DEMO_TRANSACTIONS);
  saveBudgetSettings(DEFAULT_BUDGET_SETTINGS);
  return {
    transactions: INITIAL_DEMO_TRANSACTIONS,
    budget: DEFAULT_BUDGET_SETTINGS,
  };
}

/**
 * Clear all records
 */
export function clearAllData(): { transactions: Transaction[]; budget: BudgetSettings } {
  const empty: Transaction[] = [];
  saveTransactions(empty);
  return {
    transactions: empty,
    budget: loadBudgetSettings(),
  };
}
