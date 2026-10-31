/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Transaction } from '../../types/finance';
import { formatCNY, formatDateCN } from '../../utils/formatters';
import {
  getCategoryColorClass,
  getCategoryIcon,
  getChannelIcon,
  getTypeBadge,
} from '../../utils/categoryIcons';

interface TransactionItemProps {
  transaction: Transaction;
  onClick?: () => void;
  actions?: React.ReactNode;
  showDate?: boolean;
  className?: string;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction: tx,
  onClick,
  actions,
  showDate = true,
  className = '',
}) => {
  const colorInfo = getCategoryColorClass(tx.category);
  const typeInfo = getTypeBadge(tx.type);
  const isUncat = !tx.isCategorized || tx.category === '待分类';

  return (
    <div
      onClick={onClick}
      className={`group flex items-center justify-between p-3.5 sm:px-4 sm:py-3 hover:bg-slate-50/80 rounded-xl transition-colors ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* Left: Category Icon & Details */}
      <div className="flex items-center gap-3 min-w-0 pr-2">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorInfo.bg} ${colorInfo.text}`}
        >
          {getCategoryIcon(tx.category, 'w-4 h-4')}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              {tx.note || tx.category}
            </span>
            {isUncat && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-md shrink-0">
                待分类
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 truncate">
            {showDate && (
              <>
                <span className="tabular-nums">{formatDateCN(tx.date)}</span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span className="flex items-center gap-1 shrink-0">
              {getChannelIcon(tx.channel, 'w-3 h-3 text-slate-400')}
              <span>{tx.channel}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{tx.category}</span>
          </div>
        </div>
      </div>

      {/* Right: Amount & Actions */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <div
            className={`text-xs sm:text-sm font-bold tabular-nums ${
              tx.type === 'income'
                ? 'text-emerald-600'
                : tx.type === 'transfer'
                ? 'text-sky-600'
                : 'text-slate-900'
            }`}
          >
            {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '⇄ '}
            {formatCNY(tx.amount)}
          </div>
          {tx.time && (
            <div className="text-[10px] text-slate-400 tabular-nums">{tx.time}</div>
          )}
        </div>

        {actions && <div className="flex items-center gap-1 pl-1">{actions}</div>}
      </div>
    </div>
  );
};
