/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConnectedAccount, PaymentChannel } from '../types/finance';

export const DEFAULT_CONNECTED_ACCOUNTS: ConnectedAccount[] = [
  {
    id: 'wechat',
    platformName: '微信支付',
    channel: '微信支付',
    status: 'unsupported_direct',
    authMethod: 'bill_import_compliant',
    statusDescription: '官方未对个人账户开放免商户入驻直联 API · 支持官方导出的 CSV 账单合规导入',
    importedCount: 0,
    authorizedScope: ['读取交易时间', '读取金额与收支方向', '读取交易对方与商品信息'],
    hasDirectApi: false,
    notes: '严禁向任何第三方透露微信支付密码或短信验证码。账单解析全过程由浏览器本地完成，数据存入您个人隔离的专属云空间。',
  },
  {
    id: 'alipay',
    platformName: '支付宝',
    channel: '支付宝',
    status: 'unsupported_direct',
    authMethod: 'bill_import_compliant',
    statusDescription: '官方未对普通个人开放个人直联 API · 支持官方账单明细 CSV 合规导入',
    importedCount: 0,
    authorizedScope: ['读取交易时间', '读取金额与收支方向', '读取交易分类与商户说明'],
    hasDirectApi: false,
    notes: '支付宝官方仅对通过认证的合法商户开放企业 API，个人用户严禁使用非法的后台模拟登录或代抓脚本。',
  },
  {
    id: 'abchina',
    platformName: '中国农业银行',
    channel: '农业银行',
    status: 'unsupported_direct',
    authMethod: 'bill_import_compliant',
    statusDescription: '银保监合规限制个人储蓄账户开放接口 · 支持掌银或个人网银流水明细导入',
    importedCount: 0,
    authorizedScope: ['读取交易日期时间', '读取交易金额与借贷标志', '读取摘要与对方户名'],
    hasDirectApi: false,
    notes: '个人借记卡涉及高敏感金融信息，本应用绝不要求且严禁输入银行卡密码或手机短信验证码。',
  },
  {
    id: 'cash_other',
    platformName: '现金及其他账户',
    channel: '现金',
    status: 'authorized',
    authMethod: 'bill_import_compliant',
    statusDescription: '本地手工记账通道已就绪 · 支持实时快速记账与自定义分类',
    importedCount: 0,
    authorizedScope: ['本地录入流水', '分类归档'],
    hasDirectApi: false,
    notes: '现金与线下零星交易支持快速记账与自然语言解析。',
  },
];

const STORAGE_KEY_ACCOUNTS = 'finance_connected_accounts_v1';

export function loadLocalConnectedAccounts(): ConnectedAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge with defaults to guarantee all fields present
        return DEFAULT_CONNECTED_ACCOUNTS.map((def) => {
          const found = parsed.find((p) => p.id === def.id);
          return found ? { ...def, ...found } : def;
        });
      }
    }
  } catch (e) {
    console.warn('Failed to load local connected accounts:', e);
  }
  return DEFAULT_CONNECTED_ACCOUNTS;
}

export function saveLocalConnectedAccounts(accounts: ConnectedAccount[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
  } catch (e) {
    console.warn('Failed to save connected accounts to localStorage:', e);
  }
}
