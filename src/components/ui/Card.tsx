/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface CardProps {
  children?: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  action,
  noPadding = false,
}) => {
  const hasHeader = Boolean(title || action);

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs transition-all ${className}`}
    >
      {hasHeader && (
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div>
            {typeof title === 'string' ? (
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                {title}
              </h3>
            ) : (
              title
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children && <div className={noPadding ? '' : 'p-5'}>{children}</div>}
    </div>
  );
};
