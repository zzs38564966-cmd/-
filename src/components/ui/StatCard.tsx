/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  valueColor?: string;
  badge?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBg = 'bg-slate-100 text-slate-700',
  valueColor = 'text-slate-900',
  badge,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between transition-all ${
        onClick ? 'cursor-pointer hover:border-slate-300' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between text-slate-500 mb-2">
        <span className="text-xs font-semibold text-slate-600">{title}</span>
        {icon && (
          <div className={`p-1.5 rounded-xl shrink-0 ${iconBg}`}>{icon}</div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div className={`text-xl sm:text-2xl font-bold tabular-nums tracking-tight ${valueColor}`}>
          {value}
        </div>
        {badge && <div>{badge}</div>}
      </div>

      {subtitle && (
        <p className="text-[11px] text-slate-500 mt-1 truncate leading-tight font-medium">
          {subtitle}
        </p>
      )}
    </div>
  );
};
