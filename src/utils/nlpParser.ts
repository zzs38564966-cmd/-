/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NLPParseResult, PaymentChannel, TransactionType, CategoryRule } from '../types/finance';
import { getTodayDateString } from './formatters';
import { matchRules, PRESET_CATEGORY_RULES } from './rulesEngine';

/**
 * Intelligent Local Chinese Financial Natural Language Parser
 * Runs 100% locally in browser with 0ms latency, zero API costs, and absolute privacy.
 */
export function parseFinancialNLP(
  text: string,
  rules: CategoryRule[] = PRESET_CATEGORY_RULES,
  fallbackChannel: PaymentChannel = '微信支付'
): NLPParseResult {
  const rawText = (text || '').trim();

  if (!rawText) {
    return {
      rawText: '',
      parsed: {
        type: 'expense',
        amount: null,
        date: getTodayDateString(),
        category: '待分类',
        channel: fallbackChannel,
        note: '',
      },
      confidence: 'low',
      explanation: '请输入一段记账文字（例如：“今天中午食堂吃了18元”）',
    };
  }

  // 1. Amount Extraction
  // Look for:
  // - "18元", "18.5块", "¥18.5", "18.50"
  // - "花了18", "支出18", "付了18", "收入500", "转入300"
  let extractedAmount: number | null = null;

  const amountPatterns = [
    /(?:花了|付了|支出|用了|消费|扣款|付|扣)\s*([0-9]+(?:\.[0-9]{1,2})?)/i,
    /([0-9]+(?:\.[0-9]{1,2})?)\s*(?:元|块|块钱|RMB|rmb|￥|¥)/i,
    /(?:收入|到账|赚了|发了|收到|兼职|工资)\s*([0-9]+(?:\.[0-9]{1,2})?)/i,
    /(?:转入|存入|定投|储蓄|转账)\s*([0-9]+(?:\.[0-9]{1,2})?)/i,
    /(?:退款|退还|退回)\s*([0-9]+(?:\.[0-9]{1,2})?)/i,
    /\b([0-9]+(?:\.[0-9]{1,2})?)\b/,
  ];

  for (const pattern of amountPatterns) {
    const match = rawText.match(pattern);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      if (!isNaN(val) && val > 0) {
        extractedAmount = Math.round(val * 100) / 100;
        break;
      }
    }
  }

  // 2. Date Extraction
  let extractedDate = getTodayDateString();
  const today = new Date();

  if (rawText.includes('前天')) {
    const d = new Date(today);
    d.setDate(d.getDate() - 2);
    extractedDate = d.toISOString().slice(0, 10);
  } else if (rawText.includes('昨天')) {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    extractedDate = d.toISOString().slice(0, 10);
  } else if (rawText.includes('今天')) {
    extractedDate = getTodayDateString();
  } else {
    // Check specific formats like 2026-10-28, 10月28日, 10-28
    const dateMatchIso = rawText.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (dateMatchIso) {
      const [, y, m, d] = dateMatchIso;
      extractedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    } else {
      const dateMatchCN = rawText.match(/(\d{1,2})月(\d{1,2})[日号]?/);
      if (dateMatchCN) {
        const [, m, d] = dateMatchCN;
        extractedDate = `${today.getFullYear()}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    }
  }

  // 3. Time Approximation
  let extractedTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
  if (rawText.includes('早上') || rawText.includes('早餐') || rawText.includes('早饭')) {
    extractedTime = '08:30';
  } else if (rawText.includes('中午') || rawText.includes('午餐') || rawText.includes('中饭') || rawText.includes('午饭')) {
    extractedTime = '12:15';
  } else if (rawText.includes('下午')) {
    extractedTime = '15:30';
  } else if (rawText.includes('晚上') || rawText.includes('晚餐') || rawText.includes('晚饭')) {
    extractedTime = '18:45';
  } else if (rawText.includes('夜宵') || rawText.includes('深夜')) {
    extractedTime = '22:30';
  }

  // 4. Payment Channel Detection
  let extractedChannel: PaymentChannel = fallbackChannel;
  if (/微信|零钱|财付通/i.test(rawText)) {
    extractedChannel = '微信支付';
  } else if (/支付宝|花呗|余额宝/i.test(rawText)) {
    extractedChannel = '支付宝';
  } else if (/农行|农业银行|中国农业银行|银行卡|储蓄卡|刷卡/i.test(rawText)) {
    extractedChannel = '农业银行';
  } else if (/现金|纸币/i.test(rawText)) {
    extractedChannel = '现金';
  }

  // 5. Refund & Intent Detection
  const isRefund = /退款|退还|退回|反还|返还/i.test(rawText);

  // 6. Transaction Type & Category Determination via Rule Engine
  const matchRes = matchRules(rawText, rules);

  let finalType: TransactionType = 'expense';
  let finalCategory = matchRes.category;

  if (isRefund) {
    finalType = 'expense'; // will be credited against expense in stats
  } else if (/收入|兼职|兼职工资|生活费|工资|收益|奖学金|分账/i.test(rawText) && !/支出|消费|买了/i.test(rawText)) {
    finalType = 'income';
    if (finalCategory === '待分类') {
      finalCategory = '兼职收入';
    }
  } else if (/转入|转账|存入|理财|基金|定投|存钱|应急储蓄/i.test(rawText) && !/外卖|食堂/i.test(rawText)) {
    finalType = 'transfer';
    if (finalCategory === '待分类') {
      finalCategory = '投资转入';
    }
  } else if (matchRes.hasMatch) {
    finalType = matchRes.type;
  }

  // 7. Clean Note / Description
  // Remove matched date/amount/channel trigger tokens to isolate note
  let cleanedNote = rawText
    .replace(/(今天|昨天|前天|刚才|早上|中午|下午|晚上|夜宵)/g, '')
    .replace(/(微信支付|支付宝|农业银行|微信|农行|现金|刷卡|花呗)/g, '')
    .replace(/(花了|付了|支出|用了|消费|扣款|收入|到账|赚了|发了|收到|转入|存入|定投|储蓄|退款|退还|退回)/g, '')
    .replace(/([0-9]+(?:\.[0-9]{1,2})?)\s*(?:元|块|块钱|RMB|rmb|￥|¥)?/g, '')
    .replace(/[，。！？,.!]/g, ' ')
    .trim();

  if (!cleanedNote) {
    cleanedNote = rawText;
  }

  // 8. Confidence calculation
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (extractedAmount !== null && matchRes.hasMatch && !matchRes.hasConflict) {
    confidence = 'high';
  } else if (extractedAmount !== null || matchRes.hasMatch) {
    confidence = 'medium';
  }

  const explanations: string[] = [];
  if (extractedAmount !== null) {
    explanations.push(`识别到金额 ¥${extractedAmount.toFixed(2)}`);
  } else {
    explanations.push('未检测到明确金额');
  }

  if (matchRes.hasConflict) {
    explanations.push(matchRes.explanation);
  } else if (matchRes.hasMatch) {
    explanations.push(matchRes.explanation);
  } else {
    explanations.push('分类暂设为待分类，可随时调整');
  }

  if (isRefund) {
    explanations.push('检测到退款意图，将冲抵相应支出');
  }

  return {
    rawText,
    parsed: {
      type: finalType,
      amount: extractedAmount,
      date: extractedDate,
      time: extractedTime,
      category: finalCategory,
      channel: extractedChannel,
      note: cleanedNote,
      merchant: matchRes.matchedRule?.keyword,
      isRefund,
    },
    confidence,
    matchedRule: matchRes.matchedRule,
    conflictRules: matchRes.conflictRules,
    explanation: explanations.join('；'),
  };
}
