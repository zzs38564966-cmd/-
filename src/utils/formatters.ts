/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Format a number into RMB Chinese Yuan string with two decimals and comma separators.
 * e.g., 2500 -> "¥2,500.00"
 */
export function formatCNY(amount: number, showSign = false): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (showSign) {
    if (amount > 0) return `+¥${formatted}`;
    if (amount < 0) return `-¥${formatted}`;
  }
  return `${isNegative ? '-' : ''}¥${formatted}`;
}

/**
 * Format date string 'YYYY-MM-DD' into 'YYYY年M月D日'
 */
export function formatDateCN(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[0]}年${parseInt(parts[1], 10)}月${parseInt(parts[2], 10)}日`;
  }
  return dateStr;
}

/**
 * Format month string 'YYYY-MM' into 'YYYY年M月'
 */
export function formatMonthCN(monthStr: string): string {
  if (!monthStr) return '';
  const parts = monthStr.split('-');
  if (parts.length === 2) {
    return `${parts[0]}年${parseInt(parts[1], 10)}月`;
  }
  return monthStr;
}

/**
 * Returns today's date in 'YYYY-MM-DD'
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns current month string in 'YYYY-MM'
 */
export function getCurrentMonthString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get previous month string in 'YYYY-MM'
 */
export function getPreviousMonthString(monthStr: string): string {
  const [y, m] = monthStr.split('-').map(Number);
  let prevYear = y;
  let prevMonth = m - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
}

/**
 * Format percentage
 */
export function formatPercent(ratio: number): string {
  const pct = Math.round(ratio * 1000) / 10;
  return `${pct.toFixed(1)}%`;
}
