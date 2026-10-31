/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BillImportRow,
  CategoryRule,
  PaymentChannel,
  Transaction,
  TransactionType,
} from '../types/finance';
import { matchRules, PRESET_CATEGORY_RULES } from './rulesEngine';

export interface BillParseResult {
  detectedFormat: 'wechat' | 'alipay' | 'bank' | 'standard_csv' | 'unknown';
  detectedFormatName: string;
  totalRows: number;
  validRows: BillImportRow[];
  duplicateCount: number;
  refundCount: number;
  transferCount: number;
  expenseCount: number;
  incomeCount: number;
  errors: { line: number; message: string }[];
}

/**
 * Intelligent Multi-Platform Bill Parser
 * Safely parses active user-provided files (WeChat, Alipay, Bank, Standard CSV).
 * No fake API calls - 100% genuine local parsing of user-uploaded files.
 */
export function parseBillFile(
  content: string,
  existingTransactions: Transaction[] = [],
  rules: CategoryRule[] = PRESET_CATEGORY_RULES
): BillParseResult {
  // Security Check 1: File size defense (max 8MB or 15,000 lines)
  if (!content || content.length > 8 * 1024 * 1024) {
    return {
      detectedFormat: 'unknown',
      detectedFormatName: '文件超出安全限制 (最大支持 8MB)',
      totalRows: 0,
      validRows: [],
      duplicateCount: 0,
      refundCount: 0,
      transferCount: 0,
      expenseCount: 0,
      incomeCount: 0,
      errors: [{ line: 1, message: '上传文件体积超过 8MB 安全限额，请导出单个季度或单月账单重试。' }],
    };
  }

  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  if (lines.length > 15000) {
    return {
      detectedFormat: 'unknown',
      detectedFormatName: '行数超出安全限额 (最多 15,000 行)',
      totalRows: lines.length,
      validRows: [],
      duplicateCount: 0,
      refundCount: 0,
      transferCount: 0,
      expenseCount: 0,
      incomeCount: 0,
      errors: [{ line: 1, message: '单次账单流水行数过多，建议分段按月导入以确保浏览器解析性能与稳定性。' }],
    };
  }

  let detectedFormat: 'wechat' | 'alipay' | 'bank' | 'standard_csv' | 'unknown' = 'unknown';
  let detectedFormatName = '未知账单文件格式';
  let headerIndex = -1;

  // 1. Detect format by inspecting lines
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const line = lines[i];

    if (line.includes('微信支付账单') || (line.includes('交易时间') && line.includes('交易对方') && line.includes('金额(元)'))) {
      detectedFormat = 'wechat';
      detectedFormatName = '微信支付官方账单流水';
      headerIndex = line.includes('交易时间') ? i : -1;
      if (headerIndex !== -1) break;
    } else if (line.includes('支付宝') || (line.includes('交易时间') && line.includes('交易分类') && line.includes('对方账号'))) {
      detectedFormat = 'alipay';
      detectedFormatName = '支付宝官方账单明细';
      headerIndex = line.includes('交易时间') ? i : -1;
      if (headerIndex !== -1) break;
    } else if (line.includes('借贷标志') || (line.includes('交易日期') && line.includes('摘要') && line.includes('账户余额'))) {
      detectedFormat = 'bank';
      detectedFormatName = '中国农业银行 / 银联对账流水';
      headerIndex = line.includes('交易日期') ? i : -1;
      if (headerIndex !== -1) break;
    } else if (line.includes('交易日期') && line.includes('收支类型') && line.includes('交易分类')) {
      detectedFormat = 'standard_csv';
      detectedFormatName = '个人财务管理工作台标准 CSV';
      headerIndex = i;
      break;
    }
  }

  // If header wasn't found in scan, look for row with "交易时间" or "交易日期"
  if (headerIndex === -1) {
    for (let i = 0; i < Math.min(lines.length, 35); i++) {
      if (lines[i].includes('交易时间') || lines[i].includes('交易日期')) {
        headerIndex = i;
        if (detectedFormat === 'unknown') {
          if (lines[i].includes('支付方式') || lines[i].includes('商户单号')) {
            detectedFormat = 'wechat';
            detectedFormatName = '微信支付官方账单流水';
          } else if (lines[i].includes('商品说明') || lines[i].includes('收/付款方式')) {
            detectedFormat = 'alipay';
            detectedFormatName = '支付宝官方账单明细';
          } else if (lines[i].includes('借贷标志') || lines[i].includes('借/贷')) {
            detectedFormat = 'bank';
            detectedFormatName = '银行卡对账流水';
          }
        }
        break;
      }
    }
  }

  if (headerIndex === -1 || headerIndex >= lines.length - 1) {
    return {
      detectedFormat: 'unknown',
      detectedFormatName: '未识别出有效的账单表头',
      totalRows: 0,
      validRows: [],
      duplicateCount: 0,
      refundCount: 0,
      transferCount: 0,
      expenseCount: 0,
      incomeCount: 0,
      errors: [
        {
          line: 1,
          message:
            '未能在文件中识别出微信、支付宝、银行流水或标准账单的表头行。请确保上传由官方导出的 CSV 文件。',
        },
      ],
    };
  }

  const headerCols = splitCSVLine(lines[headerIndex]);
  const dataLines = lines.slice(headerIndex + 1);

  const validRows: BillImportRow[] = [];
  const errors: { line: number; message: string }[] = [];

  let duplicateCount = 0;
  let refundCount = 0;
  let transferCount = 0;
  let expenseCount = 0;
  let incomeCount = 0;

  dataLines.forEach((rawLine, idx) => {
    const lineNum = headerIndex + 2 + idx;
    if (!rawLine || rawLine.startsWith('----------------') || rawLine.startsWith('注：')) return;

    const cols = splitCSVLine(rawLine);
    if (cols.length < 3) return;

    try {
      let rowParsed: Partial<BillImportRow> | null = null;

      if (detectedFormat === 'wechat') {
        rowParsed = parseWeChatRow(cols, headerCols);
      } else if (detectedFormat === 'alipay') {
        rowParsed = parseAlipayRow(cols, headerCols);
      } else if (detectedFormat === 'bank') {
        rowParsed = parseBankRow(cols, headerCols);
      } else {
        rowParsed = parseStandardCSVRow(cols, headerCols);
      }

      if (!rowParsed || !rowParsed.amount || rowParsed.amount <= 0 || !rowParsed.date) {
        return; // Skip empty summary or title rows
      }

      // Run through intelligent rules engine for auto-categorization
      const matchTargetText = `${rowParsed.merchant || ''} ${rowParsed.note || ''} ${rowParsed.rawStatus || ''}`;
      const ruleMatch = matchRules(matchTargetText, rules);

      let finalCategory = rowParsed.category || '待分类';
      let finalType: TransactionType = rowParsed.type || 'expense';

      if (ruleMatch.hasMatch) {
        finalCategory = ruleMatch.category;
        if (rowParsed.type === 'expense' && ruleMatch.type === 'transfer') {
          finalType = 'transfer';
        }
      }

      // Check Duplicate with existing transactions
      let isDuplicateCandidate = false;
      let duplicateReason = '';

      const matchedExisting = existingTransactions.find((etx) => {
        const dateMatch = etx.date === rowParsed?.date;
        const amountMatch = Math.abs(etx.amount - (rowParsed?.amount || 0)) < 0.001;
        const noteMatch =
          etx.note && rowParsed?.note && (etx.note.includes(rowParsed.note) || rowParsed.note.includes(etx.note));
        return dateMatch && amountMatch && (noteMatch || etx.channel === rowParsed?.channel);
      });

      if (matchedExisting) {
        isDuplicateCandidate = true;
        duplicateReason = `与现有记录（${matchedExisting.date} ¥${matchedExisting.amount.toFixed(2)} [${matchedExisting.category}]）高度重合`;
        duplicateCount++;
      }

      if (rowParsed.isRefund) {
        refundCount++;
      } else if (finalType === 'transfer') {
        transferCount++;
      } else if (finalType === 'income') {
        incomeCount++;
      } else {
        expenseCount++;
      }

      const billRow: BillImportRow = {
        id: `import_row_${Date.now()}_${idx}`,
        date: rowParsed.date,
        time: rowParsed.time || '12:00',
        type: finalType,
        amount: rowParsed.amount,
        category: finalCategory,
        channel: rowParsed.channel || '其他',
        merchant: rowParsed.merchant || '',
        note: rowParsed.note || '',
        rawStatus: rowParsed.rawStatus || '成功',
        isRefund: Boolean(rowParsed.isRefund),
        isDuplicateCandidate,
        duplicateReason,
        isCategorized: finalCategory !== '待分类',
        ruleMatched: ruleMatch.hasMatch ? ruleMatch.matchedRule?.keyword : undefined,
        conflictRules: ruleMatch.hasConflict ? ruleMatch.conflictRules : undefined,
        selected: !isDuplicateCandidate, // Default unselect duplicates to prevent double-counting!
      };

      validRows.push(billRow);
    } catch (e: any) {
      errors.push({ line: lineNum, message: e.message || '行数据格式错误' });
    }
  });

  return {
    detectedFormat,
    detectedFormatName,
    totalRows: validRows.length,
    validRows,
    duplicateCount,
    refundCount,
    transferCount,
    expenseCount,
    incomeCount,
    errors,
  };
}

/**
 * Split a CSV line respecting quoted strings
 */
function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(cleanCol(cur));
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cleanCol(cur));
  return result;
}

function cleanCol(val: string): string {
  let cleaned = val.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  // Remove possible UTF8 BOM or leading tab
  cleaned = cleaned.replace(/^[\t\ufeff]/, '').trim();

  // Security Defense 1: Prevent CSV / Excel Formula Injection (DDE injection)
  // If field starts with =, +, -, @, % (which trigger formula execution when opened in Excel/WPS)
  if (/^[=+\-@%]/.test(cleaned) && !/^-?\d+(\.\d+)?$/.test(cleaned)) {
    // If it's not a standard numeric value like -12.50, neutralize by prepending single quote
    cleaned = `'${cleaned}`;
  }

  // Security Defense 2: Strip dangerous HTML tags / script injection
  cleaned = cleaned.replace(/<[^>]*>?/gm, '');

  return cleaned;
}

/**
 * WeChat Pay Row Parser
 * Typical columns:
 * 交易时间,交易类型,交易对方,商品,收/支,金额(元),支付方式,当前状态,交易单号,商户单号,备注
 */
function parseWeChatRow(cols: string[], headerCols: string[]): Partial<BillImportRow> | null {
  const colMap: Record<string, number> = {};
  headerCols.forEach((col, idx) => {
    colMap[col] = idx;
  });

  const timeRaw = cols[colMap['交易时间'] ?? 0] || '';
  if (!timeRaw || !timeRaw.includes('-')) return null;

  const [datePart, timePart] = timeRaw.split(' ');
  const typeText = cols[colMap['收/支'] ?? 4] || '';
  const amountStr = (cols[colMap['金额(元)'] ?? 5] || cols[colMap['金额'] ?? 5] || '').replace(/[^0-9.]/g, '');
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) return null;

  const counterparty = cols[colMap['交易对方'] ?? 2] || '';
  const product = cols[colMap['商品'] ?? 3] || '';
  const status = cols[colMap['当前状态'] ?? 7] || '';
  const txType = cols[colMap['交易类型'] ?? 1] || '';

  const isRefund = status.includes('已退款') || status.includes('退款') || typeText.includes('退款');
  let type: TransactionType = 'expense';

  if (isRefund) {
    type = 'expense';
  } else if (typeText.includes('收入') || status.includes('已存入零钱')) {
    type = 'income';
  } else if (typeText.includes('其他') || txType.includes('零钱通') || txType.includes('理财通') || txType.includes('转入零钱')) {
    type = 'transfer';
  }

  const note = [product, counterparty !== '/' ? counterparty : '', txType].filter(Boolean).join(' - ');

  return {
    date: datePart,
    time: timePart ? timePart.slice(0, 5) : '12:00',
    type,
    amount,
    channel: '微信支付',
    merchant: counterparty !== '/' ? counterparty : product,
    note,
    rawStatus: status,
    isRefund,
    category: type === 'transfer' ? '账户互转' : '待分类',
  };
}

/**
 * Alipay Row Parser
 * Typical columns:
 * 交易时间,交易分类,交易对方,对方账号,商品说明,收/支,金额,收/付款方式,交易状态,交易订单号,商家订单号,备注
 */
function parseAlipayRow(cols: string[], headerCols: string[]): Partial<BillImportRow> | null {
  const colMap: Record<string, number> = {};
  headerCols.forEach((col, idx) => {
    colMap[col] = idx;
  });

  const timeRaw = cols[colMap['交易时间'] ?? 0] || '';
  if (!timeRaw || !timeRaw.includes('-')) return null;

  const [datePart, timePart] = timeRaw.split(' ');
  const direction = cols[colMap['收/支'] ?? 5] || '';
  const amountStr = (cols[colMap['金额'] ?? 6] || cols[colMap['金额(元)'] ?? 6] || '').replace(/[^0-9.]/g, '');
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) return null;

  const counterparty = cols[colMap['交易对方'] ?? 2] || '';
  const product = cols[colMap['商品说明'] ?? 4] || '';
  const status = cols[colMap['交易状态'] ?? 8] || '';
  const rawCat = cols[colMap['交易分类'] ?? 1] || '';

  const isRefund = status.includes('退款成功') || direction.includes('退款');
  let type: TransactionType = 'expense';

  if (isRefund) {
    type = 'expense';
  } else if (direction.includes('收入')) {
    type = 'income';
  } else if (direction.includes('不计收支') || rawCat.includes('理财') || rawCat.includes('转账') || product.includes('余额宝')) {
    type = 'transfer';
  }

  const note = [product, counterparty, rawCat].filter(Boolean).join(' - ');

  return {
    date: datePart,
    time: timePart ? timePart.slice(0, 5) : '12:00',
    type,
    amount,
    channel: '支付宝',
    merchant: counterparty || product,
    note,
    rawStatus: status,
    isRefund,
    category: type === 'transfer' ? '账户互转' : '待分类',
  };
}

/**
 * Bank Row Parser (Agricultural Bank of China & UnionPay)
 * Typical columns:
 * 交易日期,交易时间,摘要,借贷标志,交易金额,账户余额,交易渠道,对方户名,附言
 */
function parseBankRow(cols: string[], headerCols: string[]): Partial<BillImportRow> | null {
  const colMap: Record<string, number> = {};
  headerCols.forEach((col, idx) => {
    colMap[col] = idx;
  });

  let datePart = cols[colMap['交易日期'] ?? 0] || '';
  if (datePart.length === 8 && /^\d{8}$/.test(datePart)) {
    // 20261028 -> 2026-10-28
    datePart = `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}`;
  }
  const timePart = cols[colMap['交易时间'] ?? 1] || '12:00';

  const amountStr = (cols[colMap['交易金额'] ?? 4] || '').replace(/[^0-9.]/g, '');
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) return null;

  const flag = cols[colMap['借贷标志'] ?? 3] || '';
  const summary = cols[colMap['摘要'] ?? 2] || '';
  const otherName = cols[colMap['对方户名'] ?? 7] || '';
  const memo = cols[colMap['附言'] ?? 8] || '';

  const isRefund = summary.includes('退款') || memo.includes('退款');
  let type: TransactionType = 'expense';

  if (isRefund) {
    type = 'expense';
  } else if (flag.includes('贷') || flag.includes('收入')) {
    type = 'income';
  } else if (summary.includes('理财') || summary.includes('投资') || summary.includes('互转')) {
    type = 'transfer';
  }

  const note = [summary, otherName, memo].filter(Boolean).join(' - ');

  return {
    date: datePart,
    time: timePart.length > 5 ? timePart.slice(0, 5) : timePart,
    type,
    amount,
    channel: '农业银行',
    merchant: otherName || summary,
    note,
    rawStatus: '记账成功',
    isRefund,
    category: type === 'transfer' ? '账户互转' : '待分类',
  };
}

/**
 * Standard CSV Row Parser
 */
function parseStandardCSVRow(cols: string[], headerCols: string[]): Partial<BillImportRow> | null {
  const colMap: Record<string, number> = {};
  headerCols.forEach((col, idx) => {
    colMap[col] = idx;
  });

  const date = cols[colMap['交易日期'] ?? 0];
  const time = cols[colMap['交易时间'] ?? 1] || '12:00';
  const typeStr = cols[colMap['收支类型'] ?? 2] || '支出';
  const amount = parseFloat(cols[colMap['金额'] ?? 3] || '0');
  const category = cols[colMap['交易分类'] ?? 4] || '待分类';
  const channel = (cols[colMap['支付渠道'] ?? 5] as PaymentChannel) || '其他';
  const merchant = cols[colMap['商户或交易对象'] ?? 6] || '';
  const note = cols[colMap['备注'] ?? 7] || '';

  let type: TransactionType = 'expense';
  if (typeStr.includes('收')) type = 'income';
  else if (typeStr.includes('转') || typeStr.includes('资金分配')) type = 'transfer';

  return {
    date,
    time,
    type,
    amount,
    channel,
    merchant,
    note,
    rawStatus: '正常',
    isRefund: note.includes('退款'),
    category,
  };
}
