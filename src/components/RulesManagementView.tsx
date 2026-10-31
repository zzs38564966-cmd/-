/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Search,
  Zap,
  ArrowRight,
  X,
} from 'lucide-react';
import { CategoryRule, TransactionType, PaymentChannel } from '../types/finance';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, TRANSFER_CATEGORIES, PAYMENT_CHANNELS } from '../types/finance';
import { Card } from './ui/Card';
import { EmptyState } from './ui/EmptyState';
import { matchRules } from '../utils/rulesEngine';

interface RulesManagementViewProps {
  rules: CategoryRule[];
  onSaveRule: (rule: CategoryRule) => Promise<void>;
  onDeleteRule: (ruleId: string) => Promise<void>;
}

export const RulesManagementView: React.FC<RulesManagementViewProps> = ({
  rules,
  onSaveRule,
  onDeleteRule,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | TransactionType>('all');
  const [editingRule, setEditingRule] = useState<CategoryRule | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form Fields
  const [formKeyword, setFormKeyword] = useState('');
  const [formCategory, setFormCategory] = useState('餐饮');
  const [formType, setFormType] = useState<TransactionType>('expense');
  const [formChannel, setFormChannel] = useState<PaymentChannel | ''>('');
  const [formDesc, setFormDesc] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Interactive Match Tester
  const [testText, setTestText] = useState('今天中午在二食堂二楼吃了黄焖鸡米饭');

  const testResult = useMemo(() => {
    return matchRules(testText, rules);
  }, [testText, rules]);

  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      const matchSearch =
        r.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.targetCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = selectedTypeFilter === 'all' || r.targetType === selectedTypeFilter;
      return matchSearch && matchType;
    });
  }, [rules, searchTerm, selectedTypeFilter]);

  const handleOpenCreate = () => {
    setEditingRule(null);
    setFormKeyword('');
    setFormCategory('餐饮');
    setFormType('expense');
    setFormChannel('');
    setFormDesc('');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (rule: CategoryRule) => {
    setEditingRule(rule);
    setFormKeyword(rule.keyword);
    setFormCategory(rule.targetCategory);
    setFormType(rule.targetType);
    setFormChannel(rule.channel || '');
    setFormDesc(rule.description || '');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleToggleRule = async (rule: CategoryRule) => {
    await onSaveRule({
      ...rule,
      enabled: !rule.enabled,
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKeyword.trim()) {
      setFormError('请输入触发关键字（例如：食堂、打车、Midjourney）');
      return;
    }

    setSaving(true);
    try {
      const ruleToSave: CategoryRule = {
        id: editingRule ? editingRule.id : `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        keyword: formKeyword.trim(),
        targetCategory: formCategory,
        targetType: formType,
        channel: (formChannel as PaymentChannel) || undefined,
        description: formDesc.trim(),
        enabled: editingRule ? editingRule.enabled : true,
        isPreset: editingRule ? editingRule.isPreset : false,
      };

      await onSaveRule(ruleToSave);
      setIsFormOpen(false);
    } catch (err: any) {
      setFormError(err.message || '保存规则失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const activeCategoryList =
    formType === 'expense'
      ? EXPENSE_CATEGORIES
      : formType === 'income'
      ? INCOME_CATEGORIES
      : TRANSFER_CATEGORIES;

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Top Banner / Explanation Card */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>自动分类规则管理</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold tabular-nums">
              共 {rules.length} 条智能规则
            </span>
          </div>
        }
        subtitle="当交易商户或描述包含指定关键词时，智能引擎自动推荐分类；冲突时由您明确确认，绝不静默覆盖。"
        action={
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>新建分类规则</span>
          </button>
        }
      >
        {/* Interactive Match Simulator */}
        <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>实时规则匹配与冲突消歧测试台：</span>
            </div>
            <span className="text-[11px] text-slate-500">输入任意商户或账单描述测试命中</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="例如：今天中午在二食堂二楼吃了黄焖鸡米饭 / 滴滴出行打车"
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
          </div>

          {/* Test Match Output */}
          <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">匹配结果：</span>
                {testResult.hasMatch ? (
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>推荐分类：【{testResult.category}】</span>
                  </span>
                ) : (
                  <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    未命中规则（保留待确认）
                  </span>
                )}
                <span className="text-[11px] text-slate-400">
                  收支类型: {testResult.type === 'expense' ? '支出' : testResult.type === 'income' ? '收入' : '转账'}
                </span>
              </div>

              {testResult.hasConflict && (
                <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md font-bold text-[11px] flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>检测到多规则冲突</span>
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-2 rounded-lg">
              {testResult.explanation}
            </p>

            {testResult.hasConflict && testResult.conflictRules && (
              <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-900 space-y-1">
                <span className="font-bold block">冲突规则列表（系统保留用户手动裁决权）：</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                  {testResult.conflictRules.map((cr) => (
                    <div key={cr.id} className="p-1.5 bg-white rounded border border-amber-200 flex items-center justify-between">
                      <span className="font-semibold">关键词「{cr.keyword}」</span>
                      <span className="text-emerald-700">➔ {cr.targetCategory}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="按关键词、分类名称或描述搜索规则..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-900 rounded-xl text-xs text-slate-900 focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs">
          {(['all', 'expense', 'income', 'transfer'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTypeFilter(t)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                selectedTypeFilter === t
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {t === 'all' ? '全部' : t === 'expense' ? '支出类' : t === 'income' ? '收入类' : '转账类'}
            </button>
          ))}
        </div>
      </div>

      {/* Rules List Grid */}
      {filteredRules.length === 0 ? (
        <EmptyState
          title="未找到匹配的规则"
          description="尝试调整搜索关键词，或点击右上角「新建分类规则」添加专属识别规则。"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredRules.map((rule) => {
            const isExpense = rule.targetType === 'expense';
            const isIncome = rule.targetType === 'income';

            return (
              <div
                key={rule.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  rule.enabled
                    ? 'bg-white border-slate-200/90 shadow-2xs hover:border-slate-300'
                    : 'bg-slate-50/70 border-slate-200/60 opacity-60'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-sm bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                        「{rule.keyword}」
                      </span>
                      {rule.isPreset && (
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                          预置
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleRule(rule)}
                      className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      title={rule.enabled ? '点击停用' : '点击启用'}
                    >
                      {rule.enabled ? (
                        <ToggleRight className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-300" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400">建议分类:</span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded-md ${
                        isIncome
                          ? 'bg-emerald-50 text-emerald-700'
                          : isExpense
                          ? 'bg-slate-100 text-slate-800'
                          : 'bg-purple-50 text-purple-700'
                      }`}
                    >
                      {rule.targetCategory}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({isExpense ? '支出' : isIncome ? '收入' : '转账'})
                    </span>
                  </div>

                  {rule.description && (
                    <p className="text-[11px] text-slate-500 leading-relaxed truncate">
                      {rule.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-3 mt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenEdit(rule)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg text-xs transition-colors cursor-pointer"
                    title="编辑规则"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`确认删除规则「${rule.keyword}」吗？`)) {
                        onDeleteRule(rule.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs transition-colors cursor-pointer"
                    title="删除规则"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Rule Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {editingRule ? '编辑分类规则' : '新建分类规则'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                  {formError}
                </div>
              )}

              {/* Keyword */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  触发关键词 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：食堂、打车、Midjourney、黄焖鸡"
                  value={formKeyword}
                  onChange={(e) => setFormKeyword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-900 rounded-xl text-xs text-slate-900 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400">
                  当交易对方名称或备注中包含此词汇时自动触发推荐
                </span>
              </div>

              {/* Transaction Type */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  收支类型
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                  {(['expense', 'income', 'transfer'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setFormType(t);
                        setFormCategory(t === 'expense' ? '餐饮' : t === 'income' ? '兼职收入' : '账户互转');
                      }}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        formType === t
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {t === 'expense' ? '支出' : t === 'income' ? '收入' : '转账'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Category */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  建议归属分类 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-900 rounded-xl text-xs text-slate-900 focus:outline-none"
                >
                  {activeCategoryList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  规则备注说明（可选）
                </label>
                <input
                  type="text"
                  placeholder="例如：校区一食堂二楼档口消费"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-900 rounded-xl text-xs text-slate-900 focus:outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {saving ? '保存中...' : '确认保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
