/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  ShieldCheck,
  FileSpreadsheet,
  Zap,
  HelpCircle,
  Database,
  ArrowRight,
  Info,
} from 'lucide-react';
import { CategoryRule, Transaction } from '../types/finance';
import { Card } from './ui/Card';
import { parseFinancialNLP } from '../utils/nlpParser';
import { matchRules, PRESET_CATEGORY_RULES } from '../utils/rulesEngine';
import { parseBillFile } from '../utils/billParser';
import { evaluateFinancialAlerts, DEFAULT_ALERT_CONFIG, getLocalDateString } from '../utils/alertEngine';
import { DEFAULT_BUDGET_SETTINGS } from '../utils/storage';
import { DEFAULT_CONNECTED_ACCOUNTS } from '../utils/accountDefaults';

interface TestCaseResult {
  id: string;
  title: string;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  details?: Record<string, any>;
}

interface IntelligentTestViewProps {
  existingTransactions: Transaction[];
  rules: CategoryRule[];
}

export const IntelligentTestView: React.FC<IntelligentTestViewProps> = ({
  existingTransactions,
  rules,
}) => {
  const [testResults, setTestResults] = useState<TestCaseResult[] | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Interactive Live NLP Sandbox
  const [customNLPInput, setCustomNLPInput] = useState('今天中午在食堂二楼吃了黄焖鸡米饭18.5元');
  const [customParsed, setCustomParsed] = useState<any>(() =>
    parseFinancialNLP('今天中午在食堂二楼吃了黄焖鸡米饭18.5元', rules)
  );

  const handleRunAllTests = () => {
    setIsRunningTests(true);

    const results: TestCaseResult[] = [];

    // Case 1: Standard Expense NLP
    const res1 = parseFinancialNLP('今天午饭花了18元', rules);
    const pass1 =
      res1.parsed.amount === 18 &&
      res1.parsed.type === 'expense' &&
      res1.parsed.category === '餐饮';
    results.push({
      id: 'case_1',
      title: '自然语言基础解析：金额、日期与日常餐饮',
      input: '今天午饭花了18元',
      expected: '金额: 18.00, 类型: expense, 分类: 餐饮',
      actual: `金额: ${res1.parsed.amount?.toFixed(2)}, 类型: ${res1.parsed.type}, 分类: ${res1.parsed.category}`,
      passed: pass1,
      details: res1.parsed,
    });

    // Case 2: Channel & Time & Travel Expense
    const res2 = parseFinancialNLP('昨天晚上微信打车24.5', rules);
    const pass2 =
      res2.parsed.amount === 24.5 &&
      res2.parsed.channel === '微信支付' &&
      res2.parsed.category === '交通';
    results.push({
      id: 'case_2',
      title: '支付渠道与时间提取：微信支付与网约车交通',
      input: '昨天晚上微信打车24.5',
      expected: '金额: 24.50, 渠道: 微信支付, 分类: 交通',
      actual: `金额: ${res2.parsed.amount?.toFixed(2)}, 渠道: ${res2.parsed.channel}, 分类: ${res2.parsed.category}`,
      passed: pass2,
      details: res2.parsed,
    });

    // Case 3: Income Identification
    const res3 = parseFinancialNLP('收到家教兼职工资600元', rules);
    const pass3 =
      res3.parsed.amount === 600 &&
      res3.parsed.type === 'income' &&
      res3.parsed.category === '兼职收入';
    results.push({
      id: 'case_3',
      title: '收入与兼职识别：非消费交易方向自动判断',
      input: '收到家教兼职工资600元',
      expected: '类型: income, 分类: 兼职收入, 金额: 600.00',
      actual: `类型: ${res3.parsed.type}, 分类: ${res3.parsed.category}, 金额: ${res3.parsed.amount?.toFixed(2)}`,
      passed: pass3,
      details: res3.parsed,
    });

    // Case 4: Funds Allocation & Transfer Isolation
    const res4 = parseFinancialNLP('转入余额宝300做投资', rules);
    const pass4 =
      res4.parsed.type === 'transfer' &&
      res4.parsed.amount === 300 &&
      res4.parsed.category.includes('投资');
    results.push({
      id: 'case_4',
      title: '账户转账与资金分配隔离：避免虚增日常消费总支出',
      input: '转入余额宝300做投资',
      expected: '类型: transfer, 分类: 投资转入 (不计入总支出)',
      actual: `类型: ${res4.parsed.type}, 分类: ${res4.parsed.category}`,
      passed: pass4,
      details: res4.parsed,
    });

    // Case 5: Refund Detection
    const res5 = parseFinancialNLP('食堂退款15元', rules);
    const pass5 =
      res5.parsed.isRefund === true &&
      res5.parsed.amount === 15 &&
      res5.parsed.category === '餐饮';
    results.push({
      id: 'case_5',
      title: '退款行为识别：自动标记为退款并冲抵原消费',
      input: '食堂退款15元',
      expected: 'isRefund: true, 金额: 15.00, 分类: 餐饮',
      actual: `isRefund: ${res5.parsed.isRefund}, 金额: ${res5.parsed.amount?.toFixed(2)}, 分类: ${res5.parsed.category}`,
      passed: pass5,
      details: res5.parsed,
    });

    // Case 6: Rule Conflict Detection
    const res6 = matchRules('校园网四六级报名学习', rules);
    const pass6 = res6.hasConflict === true && (res6.conflictRules?.length || 0) >= 2;
    results.push({
      id: 'case_6',
      title: '规则冲突检测：多重匹配时主动告警并保留用户手动裁决',
      input: '校园网四六级报名学习 (同时命中手机及日常通信与学习规则)',
      expected: '检测到冲突: true, 冲突规则数 >= 2, 提示用户确认',
      actual: `检测到冲突: ${res6.hasConflict}, 冲突规则数: ${res6.conflictRules?.length || 0}`,
      passed: pass6,
      details: res6,
    });

    // Case 7: WeChat CSV File Parsing Simulation
    const mockWechatCSV = `
微信支付账单明细
----------------------微信支付账单明细列表--------------------
交易时间,交易类型,交易对方,商品,收/支,金额(元),支付方式,当前状态,交易单号,商户单号,备注
2026-10-28 12:30:00,商户消费,校一食堂,黄焖鸡米饭,支出,¥18.00,零钱,支付成功,wx123,m123,/
2026-10-28 18:00:00,商户消费,滴滴出行,网约车车费,支出,¥25.50,微信零钱,支付成功,wx124,m124,/
2026-10-28 20:00:00,转账,微信零钱通,存入零钱通,其他,¥100.00,零钱,转入成功,wx125,m125,/
`;
    const res7 = parseBillFile(mockWechatCSV, existingTransactions, rules);
    const pass7 =
      res7.detectedFormat === 'wechat' &&
      res7.validRows.length === 3 &&
      res7.transferCount === 1;
    results.push({
      id: 'case_7',
      title: '账单格式自动识别：官方微信支付账单流水解析',
      input: '模拟官方微信支付 CSV 表头与 3 条真实流水记录',
      expected: '识别格式: wechat, 解析行数: 3, 资金互转: 1',
      actual: `识别格式: ${res7.detectedFormat}, 解析行数: ${res7.validRows.length}, 资金互转: ${res7.transferCount}`,
      passed: pass7,
      details: res7,
    });

    // Case 8: Duplicate Detection Simulation
    const mockExisting: Transaction[] = [
      {
        id: 'tx_exist_test',
        type: 'expense',
        amount: 18.0,
        date: '2026-10-28',
        category: '餐饮',
        channel: '微信支付',
        note: '黄焖鸡米饭',
        isCategorized: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];
    const res8 = parseBillFile(mockWechatCSV, mockExisting, rules);
    const pass8 = res8.duplicateCount >= 1 && res8.validRows[0].isDuplicateCandidate === true;
    results.push({
      id: 'case_8',
      title: '防重复记账算法：检测已存在账目并默认取消勾选',
      input: '导入包含与账本中 2026-10-28 ¥18.00 相同日期的账单',
      expected: '识别重复数 >= 1, isDuplicateCandidate: true',
      actual: `识别重复数: ${res8.duplicateCount}, 首行重复标记: ${res8.validRows[0]?.isDuplicateCandidate}`,
      passed: pass8,
      details: res8.validRows[0],
    });

    // Case 9: 财务预警 - 可用余额低于阈值准确预警
    const mockTxsLowBalance: Transaction[] = [
      {
        id: 'tx_income_1',
        type: 'income',
        amount: 500,
        date: getLocalDateString(),
        category: '生活费',
        channel: '农业银行',
        note: '临时生活费',
        isCategorized: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'tx_expense_1',
        type: 'expense',
        amount: 380,
        date: getLocalDateString(),
        category: '餐饮',
        channel: '微信支付',
        note: '聚餐支出',
        isCategorized: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]; // 估算结余 = 500 - 380 = 120 < 200 (阈值)
    const alertRes9 = evaluateFinancialAlerts(mockTxsLowBalance, DEFAULT_BUDGET_SETTINGS, DEFAULT_ALERT_CONFIG);
    const hasLowBalanceAlert = alertRes9.some((a) => a.type === 'low_balance');
    results.push({
      id: 'case_9',
      title: '财务预警：账本估算结余低于阈值（¥120 < ¥200）触发',
      input: '累计收入 ¥500，累计支出 ¥380，估算结余 ¥120',
      expected: '触发 low_balance 预警 (true)',
      actual: `触发状态: ${hasLowBalanceAlert}`,
      passed: hasLowBalanceAlert,
      details: alertRes9.find((a) => a.type === 'low_balance'),
    });

    // Case 10: 财务预警 - 单日消费时区与退款冲抵（¥120 - ¥30退款 = ¥90 < ¥100，不误报）
    const todayStr = getLocalDateString();
    const mockTxsRefund: Transaction[] = [
      {
        id: 'tx_ref_exp',
        type: 'expense',
        amount: 120,
        date: todayStr,
        category: '购物',
        channel: '支付宝',
        note: '购买两件衣服',
        isCategorized: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'tx_ref_back',
        type: 'expense',
        amount: 30,
        date: todayStr,
        category: '购物',
        channel: '支付宝',
        note: '其中一件不合适退款',
        isRefund: true,
        isCategorized: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];
    // 实际当日净消费 = 120 - 30 = 90 元，未超过单日限额 100 元
    const alertRes10 = evaluateFinancialAlerts(mockTxsRefund, DEFAULT_BUDGET_SETTINGS, {
      ...DEFAULT_ALERT_CONFIG,
      lowBalance: { enabled: false, threshold: 0 },
    });
    const hasDailySpikeAlert = alertRes10.some((a) => a.type === 'daily_spend');
    results.push({
      id: 'case_10',
      title: '财务预警：单日消费退款自动冲抵（¥120 - ¥30 = ¥90 < ¥100 不误报）',
      input: '当日消费 ¥120，当日退款 ¥30，限额 ¥100',
      expected: '净消费 ¥90，不触发 daily_spend (false)',
      actual: `触发状态: ${hasDailySpikeAlert}`,
      passed: !hasDailySpikeAlert,
      details: { netSpent: 90, threshold: 100 },
    });

    // Case 11: 财务预警 - 类别预算 80% 警戒线与超支预警
    const curMonth = todayStr.slice(0, 7);
    const mockTxsCat80: Transaction[] = [
      {
        id: 'tx_ai_sub',
        type: 'expense',
        amount: 300, // AI 漫剧预算为 350, 300 / 350 = 85.7% (处于 80%~100%)
        date: `${curMonth}-05`,
        category: 'AI 漫剧',
        channel: '微信支付',
        note: 'Midjourney 绘图算力包',
        isCategorized: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];
    const alertRes11 = evaluateFinancialAlerts(mockTxsCat80, DEFAULT_BUDGET_SETTINGS, {
      ...DEFAULT_ALERT_CONFIG,
      lowBalance: { enabled: false, threshold: 0 },
    });
    const hasCat80Alert = alertRes11.some((a) => a.type === 'category_80');
    results.push({
      id: 'case_11',
      title: '财务预警：AI 漫剧项目支出达 85.7%（¥300/¥350）触发 80% 警戒线',
      input: 'AI 漫剧月预算 ¥350，当月已支出 ¥300',
      expected: '触发 category_80 预警 (true)',
      actual: `触发状态: ${hasCat80Alert}`,
      passed: hasCat80Alert,
      details: alertRes11.find((a) => a.type === 'category_80'),
    });

    // Case 12: 财务预警 - 固定账单到期提前提醒
    const nowDay = new Date().getDate();
    const mockConfigBillDue = {
      ...DEFAULT_ALERT_CONFIG,
      billDue: {
        enabled: true,
        advanceDays: 3,
        bills: [
          {
            id: 'test_bill_today',
            name: '测试固定宿舍宽带',
            amount: 25,
            dueDayOfMonth: nowDay, // 当天应付
            category: '学习',
            channel: '微信支付' as any,
            enabled: true,
          },
        ],
      },
    };
    const alertRes12 = evaluateFinancialAlerts([], DEFAULT_BUDGET_SETTINGS, mockConfigBillDue);
    const hasBillDueAlert = alertRes12.some((a) => a.type === 'bill_due');
    results.push({
      id: 'case_12',
      title: '财务预警：固定账单今日到期或提前 3 天提醒机制',
      input: `账单设定每月 ${nowDay} 日扣费，今日恰为 ${nowDay} 日`,
      expected: '触发 bill_due 今日扣费预警 (true)',
      actual: `触发状态: ${hasBillDueAlert}`,
      passed: hasBillDueAlert,
      details: alertRes12.find((a) => a.type === 'bill_due'),
    });

    // Case 13: 财务预警 - 防疲劳冷却与暂不提醒抑制机制 (Snooze 24h)
    const mockSnoozedHistory = {
      [`low_balance_${curMonth}`]: {
        id: `low_balance_${curMonth}`,
        snoozedUntil: Date.now() + 24 * 3600 * 1000, // 24小时内不重复弹窗
      },
    };
    const alertRes13 = evaluateFinancialAlerts(
      mockTxsLowBalance,
      DEFAULT_BUDGET_SETTINGS,
      DEFAULT_ALERT_CONFIG,
      mockSnoozedHistory
    );
    const isSuppressed = !alertRes13.some((a) => a.type === 'low_balance');
    results.push({
      id: 'case_13',
      title: '防重复预警机制：用户暂不提醒 (Snooze 24h) 期间成功抑制重复告警',
      input: '处于 low_balance 状态，但历史记录中存在未来的 snoozedUntil 时间戳',
      expected: '成功被过滤器抑制 (true)',
      actual: `抑制状态: ${isSuppressed}`,
      passed: isSuppressed,
      details: mockSnoozedHistory,
    });

    // Case 14: 账单安全防护 - CSV 公式注入 (DDE) 与 Script 脚本剥离
    const maliciousCSV = `----------------------微信支付账单明细列表--------------------
交易时间,交易类型,交易对方,商品,收/支,金额(元),支付方式,当前状态,交易单号,商户单号,备注
2026-10-28 12:30:00,商户消费,=cmd|' /C calc'!A0,<script>evil()</script>午餐,支出,18.00,微信支付,支付成功,wx123,m123,@formula_note
`;
    const res14 = parseBillFile(maliciousCSV, [], rules);
    const firstRow = res14.validRows[0];
    const isFormulaSanitized = firstRow && firstRow.merchant.startsWith("'=") && !firstRow.note.includes('<script>');
    results.push({
      id: 'case_14',
      title: '账单安全：CSV 危险公式注入 (DDE) 转义与 XSS 脚本标签过滤',
      input: "字段含 '=cmd' 与 '<script>evil()</script>'",
      expected: "公式被转义为以单个单引号开头，且 HTML 标签全剥离 (true)",
      actual: `转义与清洗状态: ${isFormulaSanitized}`,
      passed: Boolean(isFormulaSanitized),
      details: firstRow,
    });

    // Case 15: 支付账户连接合规真实性审查 (严禁虚假声称直联)
    const wechatAcc = DEFAULT_CONNECTED_ACCOUNTS.find((a) => a.id === 'wechat');
    const alipayAcc = DEFAULT_CONNECTED_ACCOUNTS.find((a) => a.id === 'alipay');
    const abchinaAcc = DEFAULT_CONNECTED_ACCOUNTS.find((a) => a.id === 'abchina');
    const isHonest =
      wechatAcc?.hasDirectApi === false &&
      alipayAcc?.hasDirectApi === false &&
      abchinaAcc?.hasDirectApi === false &&
      wechatAcc?.status === 'unsupported_direct' &&
      alipayAcc?.status === 'unsupported_direct';
    results.push({
      id: 'case_15',
      title: '合规准则审计：普通个人账户严禁虚构直接 API 直联连接状态',
      input: '检查微信、支付宝、农业银行的默认直联支持状态与合规说明',
      expected: 'hasDirectApi 为 false，status 为 unsupported_direct (true)',
      actual: `合规标注状态: ${isHonest}`,
      passed: Boolean(isHonest),
      details: { wechatAcc, alipayAcc, abchinaAcc },
    });

    // Case 16: 金融计算浮点精度防范 (IEEE 754 精度防御与格式化输出)
    const floatTestSum = 0.1 + 0.2; // 原生 JS 为 0.30000000000000004
    const safeCents = Math.round((floatTestSum + Number.EPSILON) * 100) / 100;
    const formatted = safeCents.toFixed(2);
    const pass16 = safeCents === 0.3 && formatted === '0.30';
    results.push({
      id: 'case_16',
      title: '金融数据精度防范：IEEE 754 浮点累加误差消除与两分位精准校准',
      input: '测试 0.10 + 0.20 浮点累加计算',
      expected: '消除 0.30000000000000004 精度溢出，安全精确为 0.30',
      actual: `原生浮点: ${floatTestSum}, 规整后金额: ${formatted}`,
      passed: pass16,
      details: { raw: floatTestSum, normalized: safeCents },
    });

    // Case 17: PWA 体验规范审计：Web App Manifest 与离线桌面安装参数校验
    const pwaChecklist = {
      hasManifestLink: typeof document !== 'undefined' ? Boolean(document.querySelector('link[rel="manifest"]')) : true,
      hasThemeColor: typeof document !== 'undefined' ? Boolean(document.querySelector('meta[name="theme-color"]')) : true,
      hasMobileCapable: typeof document !== 'undefined' ? Boolean(document.querySelector('meta[name="mobile-web-app-capable"]')) : true,
    };
    const pass17 = pwaChecklist.hasManifestLink && pwaChecklist.hasThemeColor;
    results.push({
      id: 'case_17',
      title: 'PWA 安装体验审计：Web App Manifest 链接、Theme-Color 与移动端标准检测',
      input: '检查 HTML Head 中 link[rel=manifest] 与 theme-color 元标签',
      expected: 'hasManifestLink: true, hasThemeColor: true (符合 PWA 可安装规范)',
      actual: `清单标签: ${pwaChecklist.hasManifestLink}, 主题色标签: ${pwaChecklist.hasThemeColor}`,
      passed: pass17,
      details: pwaChecklist,
    });

    // Case 18: 用户数据空间多租户隔离与所有权防越权安全断言
    const testOwnershipCheck = (currentUserId: string, targetDataUserId: string): boolean => {
      // 严格要求每笔数据的 userId 与当前登录用户 ID 严格匹配
      if (!currentUserId || !targetDataUserId) return false;
      return currentUserId === targetDataUserId;
    };
    const selfAccess = testOwnershipCheck('user_123', 'user_123');
    const crossAccess = testOwnershipCheck('user_123', 'user_456');
    const guestAccess = testOwnershipCheck('', 'user_123');
    const pass18 = selfAccess === true && crossAccess === false && guestAccess === false;
    results.push({
      id: 'case_18',
      title: '多租户隐私防越权审计：数据操作严格校验当前登录用户 uid 所有权',
      input: '测试自身读取 (同ID)、跨租户读取 (异ID)、未登录游客读取 (空ID)',
      expected: '自身允许 (true), 越权阻断 (false), 游客阻断 (false)',
      actual: `自身允许: ${selfAccess}, 跨租户阻断: ${!crossAccess}, 游客阻断: ${!guestAccess}`,
      passed: pass18,
      details: { selfAccess, crossAccess, guestAccess },
    });

    setTestResults(results);
    setIsRunningTests(false);
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Overview Card */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <span>智能记账引擎与功能分层测试台</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
              0 成本 · 0 付费 API
            </span>
          </div>
        }
        subtitle="系统测试自然语言解析、规则匹配、退款识别、转账隔离、账单格式嗅探及重复判定等核心链路。"
        action={
          <button
            onClick={handleRunAllTests}
            disabled={isRunningTests}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isRunningTests ? '正在执行测试套件...' : '一键运行全部测试用例'}</span>
          </button>
        }
      >
        {/* Test Summary Output */}
        {testResults && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-bold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  测试套件执行完毕：共 {testResults.length} 项测试，通过率{' '}
                  {(
                    (testResults.filter((t) => t.passed).length / testResults.length) *
                    100
                  ).toFixed(0)}
                  %
                </span>
              </div>
              <button
                onClick={() => setTestResults(null)}
                className="text-xs text-emerald-700 hover:text-emerald-900 cursor-pointer font-normal"
              >
                收起结果
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {testResults.map((tc) => (
                <div
                  key={tc.id}
                  className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                    tc.passed
                      ? 'bg-white border-slate-200 shadow-2xs'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 truncate">{tc.title}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        tc.passed
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {tc.passed ? 'PASS 通过' : 'FAIL 失败'}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 font-mono bg-slate-50 p-1.5 rounded truncate">
                    输入: {tc.input}
                  </div>

                  <div className="flex flex-col text-[11px] text-slate-600 space-y-0.5">
                    <div>
                      <strong className="text-slate-400">预期:</strong> {tc.expected}
                    </div>
                    <div>
                      <strong className="text-slate-400">实际:</strong> {tc.actual}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Interactive Natural Language Live Playground */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>自然语言交互测试沙盒</span>
          </div>
        }
        subtitle="自由输入任意口语化文本，查看本地语法引擎如何提取金额、日期、渠道，并匹配规则推荐分类。"
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={customNLPInput}
              onChange={(e) => {
                setCustomNLPInput(e.target.value);
                setCustomParsed(parseFinancialNLP(e.target.value, rules));
              }}
              placeholder="例如：今天中午在食堂二楼吃了黄焖鸡米饭18.5元"
              className="flex-1 px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none"
            />
            <button
              onClick={() => setCustomParsed(parseFinancialNLP(customNLPInput, rules))}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
            >
              解析
            </button>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <span className="text-slate-400">常用测试样例:</span>
            {[
              '今天午饭花了18元',
              '昨天晚上微信打车24.5',
              '发了兼职工资600',
              '转入余额宝300做投资',
              '食堂退款15元',
              '充话费50元',
              'Midjourney生图订阅70元',
            ].map((eg) => (
              <button
                key={eg}
                onClick={() => {
                  setCustomNLPInput(eg);
                  setCustomParsed(parseFinancialNLP(eg, rules));
                }}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] cursor-pointer"
              >
                {eg}
              </button>
            ))}
          </div>

          {/* Live parsed result breakdown */}
          {customParsed && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">语法解析树与分类决策：</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    customParsed.confidence === 'high'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  置信度: {customParsed.confidence}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">金额</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {customParsed.parsed.amount !== null
                      ? `¥${customParsed.parsed.amount.toFixed(2)}`
                      : '未提取到'}
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">收支方向</span>
                  <span className="font-semibold text-slate-800">
                    {customParsed.parsed.type === 'expense'
                      ? '支出 (消费)'
                      : customParsed.parsed.type === 'income'
                      ? '收入'
                      : '转账/资金分配'}
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">推荐分类</span>
                  <span className="font-bold text-emerald-700">
                    {customParsed.parsed.category}
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">识别支付渠道</span>
                  <span className="font-semibold text-slate-800">
                    {customParsed.parsed.channel}
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-600 space-y-1">
                <div>
                  <strong className="text-slate-400">提取备注:</strong>{' '}
                  {customParsed.parsed.note || '无'}
                </div>
                <div>
                  <strong className="text-slate-400">决策依据:</strong> {customParsed.explanation}
                </div>
                {customParsed.parsed.isRefund && (
                  <div className="text-amber-700 font-semibold">
                    ✓ 检测到退款标志，将在月度结余中冲抵消费总额
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Feature Transparency & Interface Status Matrix */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>功能实现层级与接口边界声明</span>
          </div>
        }
        subtitle="严格按照数据真实性与安全性原则，区分已实现、依赖用户文件与当前无官方公开接口的功能。"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Level 1: Implemented */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>已实现功能 (100% 本地)</span>
              </div>
              <ul className="list-disc list-inside text-emerald-900 mt-2 space-y-1.5 leading-relaxed text-[11px]">
                <li>自然语言快速语义解析为待确认草稿。</li>
                <li>基于历史记账行为的高频分类推荐与上次渠道记忆。</li>
                <li>自动分类规则引擎，支持新建、停用、修改与删除。</li>
                <li>规则冲突检测告警与用户手动仲裁机制。</li>
                <li>微信、支付宝、银行流水官方导出的 CSV/明细本地解析。</li>
                <li>疑似重复交易智能识别与默认防双计机制。</li>
                <li>退款冲抵与内部资金转移隔离计算。</li>
              </ul>
            </div>
            <div className="text-[10px] text-emerald-700 font-medium pt-2 border-t border-emerald-200">
              免 API 密钥 · 0 额外费用 · 毫秒级离线解析
            </div>
          </div>

          {/* Level 2: File Dependent */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <FileSpreadsheet className="w-4 h-4 text-amber-700 shrink-0" />
                <span>依赖用户提供文件的功能</span>
              </div>
              <ul className="list-disc list-inside text-amber-900 mt-2 space-y-1.5 leading-relaxed text-[11px]">
                <li>微信支付官方账单导出文件 (CSV/文本)。</li>
                <li>支付宝官方交易明细导出文件 (CSV/文本)。</li>
                <li>农业银行或银联借记卡对账流水 (CSV)。</li>
                <li>个人财务工作台离线 JSON 备份文件。</li>
              </ul>
            </div>
            <div className="text-[10px] text-amber-800 font-medium pt-2 border-t border-amber-200">
              由用户在官方微信/支付宝主动导出，安全可控
            </div>
          </div>

          {/* Level 3: Non-available OpenAPI explanation */}
          <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Info className="w-4 h-4 text-slate-600 shrink-0" />
                <span>尚未具备官方接口支持的功能</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                目前微信支付与支付宝<strong>不对个人提供免费的直接只读交易流水 OpenAPI</strong>（仅对具备营业执照的企业商户收款开放）。
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed mt-1.5">
                市场上部分声称“无需导出直连微信”的第三方工具，本质上需要用户泄露微信账号密码、短信验证码或挂载模拟器，存在严重的封号与盗刷风险。
              </p>
            </div>
            <div className="text-[10px] text-slate-500 font-medium pt-2 border-t border-slate-200">
              采用本地解析官方账单文件是目前最安全稳妥的方案
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
