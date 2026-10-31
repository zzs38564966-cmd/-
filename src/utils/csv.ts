/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BudgetSettings, PaymentChannel, Transaction, TransactionType } from '../types/finance';
import { formatCNY } from './formatters';

export interface CSVParseResult {
  validRows: Array<{
    type: TransactionType;
    amount: number;
    date: string;
    time?: string;
    category: string;
    channel: PaymentChannel;
    note: string;
    isCategorized: boolean;
    isDuplicateCandidate?: boolean;
    rawLineNumber: number;
  }>;
  errors: Array<{
    lineNumber: number;
    rawText: string;
    reason: string;
  }>;
}

/**
 * Standard CSV headers:
 * 交易日期,交易时间,收支类型,金额(元),交易类别,支付渠道,备注,是否已分类
 */
export const CSV_HEADER_STRING = '交易日期,交易时间,收支类型,金额(元),交易类别,支付渠道,备注,是否已分类';

export const CSV_SAMPLE_TEMPLATE = `\uFEFF交易日期,交易时间,收支类型,金额(元),交易类别,支付渠道,备注,是否已分类
2026-10-15,12:30,支出,18.00,餐饮,微信支付,食堂午餐二楼,是
2026-10-16,14:20,支出,35.00,AI 软件及订阅,支付宝,AI漫剧素材生成合租,是
2026-10-18,18:00,收入,2500.00,生活费,农业银行,本月生活费到账,是
2026-10-20,10:00,资金分配,500.00,应急储蓄转入,微信支付,零钱通应急储备金,是
2026-10-22,20:45,支出,25.00,待分类,支付宝,便利店购物稍后分类,否`;

/**
 * Helper to escape CSV cell value
 */
function escapeCSV(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generate CSV string from transactions with UTF-8 BOM for Windows Excel compatibility
 */
export function exportTransactionsToCSV(transactions: Transaction[]): string {
  const rows: string[] = [CSV_HEADER_STRING];

  transactions.forEach((tx) => {
    let typeLabel = '支出';
    if (tx.type === 'income') typeLabel = '收入';
    if (tx.type === 'transfer') typeLabel = '资金分配';

    rows.push(
      [
        escapeCSV(tx.date),
        escapeCSV(tx.time || ''),
        escapeCSV(typeLabel),
        escapeCSV(tx.amount.toFixed(2)),
        escapeCSV(tx.category),
        escapeCSV(tx.channel),
        escapeCSV(tx.note),
        escapeCSV(tx.isCategorized ? '是' : '否'),
      ].join(',')
    );
  });

  // \uFEFF is UTF-8 Byte Order Mark for Microsoft Excel on Windows
  return `\uFEFF${rows.join('\r\n')}`;
}

/**
 * Generate Budget & Monthly Summary Report as CSV
 */
export function exportBudgetSummaryToCSV(
  monthStr: string,
  totalIncome: number,
  totalExpense: number,
  totalTransfer: number,
  budget: BudgetSettings,
  bucketSpentMap: Record<string, number>
): string {
  const lines: string[] = [];
  lines.push(`【个人财务管理工作台 - ${monthStr} 月度收支与预算汇总表】`);
  lines.push('');
  lines.push('【本月核心指标】');
  lines.push(`月度总预算,${formatCNY(budget.totalBudget)}`);
  lines.push(`实际本月收入,${formatCNY(totalIncome)}`);
  lines.push(`实际日常与项目支出,${formatCNY(totalExpense)}`);
  lines.push(`本月收支结余,${formatCNY(totalIncome - totalExpense)}`);
  lines.push(`独立资金分配/储蓄转入,${formatCNY(totalTransfer)} (专款专用不计入日常消费)`);
  lines.push(`预算剩余额度,${formatCNY(budget.totalBudget - totalExpense)}`);
  lines.push('');
  lines.push('【预算执行情况】');
  lines.push('预算板块,预算金额(元),实际发生(元),剩余额度(元),执行率,状态说明');

  budget.buckets.forEach((b) => {
    const spent = bucketSpentMap[b.id] || 0;
    const remaining = b.amount - spent;
    const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
    let status = '正常';
    if (pct > 100) status = '超出预算';
    else if (pct >= 80) status = '达到预警 (>=80%)';

    lines.push(
      [
        escapeCSV(b.name),
        escapeCSV(b.amount.toFixed(2)),
        escapeCSV(spent.toFixed(2)),
        escapeCSV(remaining.toFixed(2)),
        escapeCSV(`${pct.toFixed(1)}%`),
        escapeCSV(status),
      ].join(',')
    );
  });

  return `\uFEFF${lines.join('\r\n')}`;
}

/**
 * Parse CSV line handling quoted strings with commas and quotes
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip next escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Validate and parse CSV content
 */
export function parseCSVTransactions(
  csvContent: string,
  existingTransactions: Transaction[]
): CSVParseResult {
  const cleanContent = csvContent.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleanContent.split('\n').filter((l) => l.trim().length > 0);

  const result: CSVParseResult = {
    validRows: [],
    errors: [],
  };

  if (lines.length === 0) {
    result.errors.push({
      lineNumber: 1,
      rawText: '',
      reason: 'CSV 文件内容为空',
    });
    return result;
  }

  // Determine starting line (check if line 0 is header)
  let startIndex = 0;
  const firstCols = parseCSVLine(lines[0]);
  if (
    firstCols.some(
      (c) =>
        c.includes('日期') ||
        c.includes('金额') ||
        c.includes('收支') ||
        c.includes('类型') ||
        c.includes('类别')
    )
  ) {
    startIndex = 1;
  }

  for (let idx = startIndex; idx < lines.length; idx++) {
    const lineNum = idx + 1;
    const rawLine = lines[idx];
    const cols = parseCSVLine(rawLine);

    if (cols.length < 4) {
      result.errors.push({
        lineNumber: lineNum,
        rawText: rawLine,
        reason: '数据列数过少，每行至少应包含：日期、收支类型、金额、类别/渠道',
      });
      continue;
    }

    // Try mapping columns. Expected:
    // 0: 日期 (YYYY-MM-DD)
    // 1: 时间 (HH:mm, optional or skip if 3rd is amount)
    // 2: 收支类型 (支出/收入/资金分配)
    // 3: 金额
    // 4: 类别
    // 5: 支付渠道
    // 6: 备注
    // 7: 是否已分类
    let dateStr = '';
    let timeStr = '';
    let typeVal: TransactionType = 'expense';
    let amountVal = 0;
    let categoryVal = '待分类';
    let channelVal: PaymentChannel = '微信支付';
    let noteVal = '';
    let isCategorizedVal = true;

    // Check if column 1 looks like time (e.g. 12:30 or empty) or type
    if (cols.length >= 7) {
      dateStr = cols[0];
      timeStr = cols[1];
      const rawType = cols[2];
      if (rawType.includes('收') || rawType.toLowerCase() === 'income') typeVal = 'income';
      else if (rawType.includes('分配') || rawType.includes('转') || rawType.toLowerCase() === 'transfer')
        typeVal = 'transfer';
      else typeVal = 'expense';

      amountVal = parseFloat(cols[3].replace(/[¥, ]/g, ''));
      categoryVal = cols[4] || '待分类';
      const rawChan = cols[5] || '微信支付';
      if (rawChan.includes('支付宝')) channelVal = '支付宝';
      else if (rawChan.includes('农') || rawChan.includes('银行')) channelVal = '农业银行';
      else if (rawChan.includes('现金')) channelVal = '现金';
      else if (rawChan.includes('微信')) channelVal = '微信支付';
      else channelVal = '其他';

      noteVal = cols[6] || '';
      if (cols[7]) {
        const rawCatFlag = cols[7].trim();
        isCategorizedVal = rawCatFlag === '是' || rawCatFlag === 'true' || rawCatFlag === '1';
      }
    } else {
      // Shorter column format fallback: [日期, 类型, 金额, 类别, 渠道, 备注]
      dateStr = cols[0];
      const rawType = cols[1];
      if (rawType.includes('收') || rawType.toLowerCase() === 'income') typeVal = 'income';
      else if (rawType.includes('分配') || rawType.includes('转') || rawType.toLowerCase() === 'transfer')
        typeVal = 'transfer';
      else typeVal = 'expense';

      amountVal = parseFloat(cols[2].replace(/[¥, ]/g, ''));
      categoryVal = cols[3] || '待分类';
      channelVal = (cols[4] as PaymentChannel) || '微信支付';
      noteVal = cols[5] || '';
    }

    // Validation
    // 1. Date format check: YYYY-MM-DD or YYYY/MM/DD
    dateStr = dateStr.replace(/\//g, '-').trim();
    const dateMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!dateMatch) {
      result.errors.push({
        lineNumber: lineNum,
        rawText: rawLine,
        reason: `日期格式无效: "${dateStr}"，请使用 YYYY-MM-DD 格式（例如 2026-10-28）`,
      });
      continue;
    }
    // Normalize date to YYYY-MM-DD
    const y = dateMatch[1];
    const m = dateMatch[2].padStart(2, '0');
    const d = dateMatch[3].padStart(2, '0');
    dateStr = `${y}-${m}-${d}`;

    // 2. Amount check
    if (isNaN(amountVal) || amountVal <= 0) {
      result.errors.push({
        lineNumber: lineNum,
        rawText: rawLine,
        reason: `金额格式无效或必须大于0，当前值: "${cols[3] || cols[2]}"`,
      });
      continue;
    }

    // Category logic
    if (!categoryVal || categoryVal === '待分类' || categoryVal === '未分类') {
      isCategorizedVal = false;
      categoryVal = '待分类';
    }

    // Duplicate detection: match existing transactions by same date, amount, channel, and note
    const isDup = existingTransactions.some(
      (tx) =>
        tx.date === dateStr &&
        Math.abs(tx.amount - amountVal) < 0.001 &&
        tx.channel === channelVal &&
        (tx.note.trim() === noteVal.trim() || (!tx.note && !noteVal))
    );

    result.validRows.push({
      type: typeVal,
      amount: Math.round(amountVal * 100) / 100,
      date: dateStr,
      time: timeStr || undefined,
      category: categoryVal,
      channel: channelVal,
      note: noteVal,
      isCategorized: isCategorizedVal,
      isDuplicateCandidate: isDup,
      rawLineNumber: lineNum,
    });
  }

  return result;
}
