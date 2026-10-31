/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  HelpCircle,
  ArrowRightLeft,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Check,
  Tag,
  Clock,
  Calendar,
} from 'lucide-react';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  TRANSFER_CATEGORIES,
  PAYMENT_CHANNELS,
  PaymentChannel,
  Transaction,
  TransactionType,
  CategoryRule,
  NLPParseResult,
} from '../types/finance';
import { getTodayDateString } from '../utils/formatters';
import { getCategoryIcon, getChannelIcon } from '../utils/categoryIcons';
import { parseFinancialNLP } from '../utils/nlpParser';
import { learnFrequentCategories, matchRules, PRESET_CATEGORY_RULES } from '../utils/rulesEngine';

interface TransactionFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialTransaction?: Transaction | null;
  onClose: () => void;
  onSubmit: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> | Transaction) => void;
  rules?: CategoryRule[];
  existingTransactions?: Transaction[];
  onAddRule?: (rule: CategoryRule) => void;
}

const STORAGE_KEY_LAST_TYPE = 'pref_last_tx_type';
const STORAGE_KEY_LAST_CHANNEL = 'pref_last_tx_channel';

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  isOpen,
  mode,
  initialTransaction,
  onClose,
  onSubmit,
  rules = PRESET_CATEGORY_RULES,
  existingTransactions = [],
  onAddRule,
}) => {
  // Read remembered defaults
  const getLastUsedType = (): TransactionType => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LAST_TYPE);
      if (saved === 'income' || saved === 'transfer') return saved;
    } catch {}
    return 'expense';
  };

  const getLastUsedChannel = (): PaymentChannel => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LAST_CHANNEL) as PaymentChannel;
      if (PAYMENT_CHANNELS.includes(saved)) return saved;
    } catch {}
    return '微信支付';
  };

  const [type, setType] = useState<TransactionType>(getLastUsedType);
  const [amountStr, setAmountStr] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayDateString);
  const [time, setTime] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [category, setCategory] = useState<string>('');
  const [isUnclassified, setIsUnclassified] = useState<boolean>(false);
  const [channel, setChannel] = useState<PaymentChannel>(getLastUsedChannel);
  const [note, setNote] = useState<string>('');
  const [merchant, setMerchant] = useState<string>('');
  const [isRefund, setIsRefund] = useState<boolean>(false);
  const [targetAccount, setTargetAccount] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Natural Language Input State
  const [nlpInput, setNlpInput] = useState<string>('');
  const [nlpDraft, setNlpDraft] = useState<NLPParseResult | null>(null);
  const [showNlpPanel, setShowNlpPanel] = useState<boolean>(true);

  // Sync state when opening or when initialTransaction changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialTransaction) {
        setType(initialTransaction.type);
        setAmountStr(initialTransaction.amount.toString());
        setDate(initialTransaction.date);
        setTime(initialTransaction.time || '');
        setCategory(initialTransaction.category);
        setIsUnclassified(!initialTransaction.isCategorized || initialTransaction.category === '待分类');
        setChannel(initialTransaction.channel);
        setNote(initialTransaction.note || '');
        setMerchant(initialTransaction.merchant || '');
        setIsRefund(Boolean(initialTransaction.isRefund));
        setTargetAccount(initialTransaction.targetAccount || '');
        setErrorMsg('');
        setNlpDraft(null);
        setShowNlpPanel(false);
      } else {
        // Create mode: prefill remembered preferences & today
        setType(getLastUsedType());
        setAmountStr('');
        setDate(getTodayDateString());
        const d = new Date();
        setTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
        setCategory('');
        setIsUnclassified(false);
        setChannel(getLastUsedChannel());
        setNote('');
        setMerchant('');
        setIsRefund(false);
        setTargetAccount('');
        setErrorMsg('');
        setNlpInput('');
        setNlpDraft(null);
        setShowNlpPanel(true);
      }
    }
  }, [isOpen, mode, initialTransaction]);

  // Learn top frequent categories for current type from history
  const frequentCategories = useMemo(() => {
    return learnFrequentCategories(existingTransactions, type, 4);
  }, [existingTransactions, type]);

  // Live match rules when typing in Note
  const liveRuleMatch = useMemo(() => {
    if (!note || note.length < 2) return null;
    return matchRules(note, rules);
  }, [note, rules]);

  if (!isOpen) return null;

  const currentCategories =
    type === 'expense'
      ? EXPENSE_CATEGORIES
      : type === 'income'
      ? INCOME_CATEGORIES
      : TRANSFER_CATEGORIES;

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setCategory('');
    setIsUnclassified(false);
    setErrorMsg('');
    try {
      localStorage.setItem(STORAGE_KEY_LAST_TYPE, newType);
    } catch {}
  };

  const handleChannelChange = (newChannel: PaymentChannel) => {
    setChannel(newChannel);
    try {
      localStorage.setItem(STORAGE_KEY_LAST_CHANNEL, newChannel);
    } catch {}
  };

  // NLP Parse action
  const handleRunNLP = (textToParse?: string) => {
    const query = (textToParse || nlpInput).trim();
    if (!query) {
      setErrorMsg('请输入需要解析的自然语言文本');
      return;
    }
    const result = parseFinancialNLP(query, rules, channel);
    setNlpDraft(result);
    setErrorMsg('');
  };

  // Apply NLP Draft into Form fields (leaves user in control before final commit)
  const handleApplyDraft = (directSubmit = false) => {
    if (!nlpDraft || !nlpDraft.parsed) return;
    const p = nlpDraft.parsed;

    if (p.amount !== null && p.amount > 0) {
      setAmountStr(p.amount.toString());
    }
    if (p.type) {
      setType(p.type);
    }
    if (p.date) {
      setDate(p.date);
    }
    if (p.time) {
      setTime(p.time);
    }
    if (p.category && p.category !== '待分类') {
      setCategory(p.category);
      setIsUnclassified(false);
    } else {
      setIsUnclassified(true);
    }
    if (p.channel) {
      setChannel(p.channel);
    }
    if (p.note) {
      setNote(p.note);
    }
    if (p.merchant) {
      setMerchant(p.merchant);
    }
    if (p.isRefund !== undefined) {
      setIsRefund(p.isRefund);
    }

    if (directSubmit && p.amount && p.amount > 0) {
      // User reviewed and explicitly clicked "核对无误直接提交"
      onSubmit({
        type: p.type,
        amount: Math.round(p.amount * 100) / 100,
        date: p.date,
        time: p.time,
        category: p.category || '待分类',
        channel: p.channel,
        note: p.note,
        merchant: p.merchant,
        isRefund: Boolean(p.isRefund),
        isCategorized: Boolean(p.category && p.category !== '待分类'),
        sourceBillType: 'nlp',
      });
      onClose();
    } else {
      setNlpDraft(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountStr);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('请输入有效的交易金额（必须大于 0）');
      return;
    }

    if (!date) {
      setErrorMsg('请选择交易日期');
      return;
    }

    let finalCategory = category;
    let finalIsCategorized = true;

    if (isUnclassified || !category || category === '待分类') {
      finalCategory = '待分类';
      finalIsCategorized = false;
    }

    if (mode === 'edit' && initialTransaction) {
      onSubmit({
        ...initialTransaction,
        type,
        amount: Math.round(parsedAmount * 100) / 100,
        date,
        time: time || undefined,
        category: finalCategory,
        channel,
        note: note.trim(),
        merchant: merchant.trim() || undefined,
        isRefund: type === 'expense' ? isRefund : false,
        isCategorized: finalIsCategorized,
        targetAccount: type === 'transfer' ? targetAccount.trim() || undefined : undefined,
      });
    } else {
      onSubmit({
        type,
        amount: Math.round(parsedAmount * 100) / 100,
        date,
        time: time || undefined,
        category: finalCategory,
        channel,
        note: note.trim(),
        merchant: merchant.trim() || undefined,
        isRefund: type === 'expense' ? isRefund : false,
        isCategorized: finalIsCategorized,
        targetAccount: type === 'transfer' ? targetAccount.trim() || undefined : undefined,
        sourceBillType: 'manual',
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {mode === 'create' ? '快速记一笔' : '修改交易记录'}
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 font-medium">
              {mode === 'create' ? '智能辅助' : '云端同步'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {mode === 'create' && (
              <button
                type="button"
                onClick={() => setShowNlpPanel(!showNlpPanel)}
                className={`p-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  showNlpPanel
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
                title="切换自然语言智能解析"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">一句话记账</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              aria-label="关闭窗口"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 max-h-[80vh] overflow-y-auto space-y-4">
          {/* Natural Language Intelligent Input Zone */}
          {mode === 'create' && showNlpPanel && (
            <div className="p-3.5 sm:p-4 bg-gradient-to-br from-amber-50/80 via-white to-slate-50 rounded-2xl border border-amber-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>智能一句话记账（本地隐私引擎 · 0延迟）</span>
                </div>
                <span className="text-[11px] text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md font-medium">
                  生成草稿由您确认
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={nlpInput}
                  onChange={(e) => setNlpInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleRunNLP();
                    }
                  }}
                  placeholder="例如：今天中午食堂花了18元 / 昨天微信打车24.5"
                  className="flex-1 px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => handleRunNLP()}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>智能解析</span>
                </button>
              </div>

              {/* Fast Example Chips for Students */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                <span className="text-slate-400">试一试:</span>
                {[
                  '今天午饭吃了18元',
                  '刚才微信打车24.5',
                  '收到家教兼职500',
                  '食堂退款15元',
                  '存入余额宝300做投资',
                ].map((eg) => (
                  <button
                    key={eg}
                    type="button"
                    onClick={() => {
                      setNlpInput(eg);
                      handleRunNLP(eg);
                    }}
                    className="px-2 py-0.5 bg-white/90 hover:bg-amber-100/60 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    {eg}
                  </button>
                ))}
              </div>

              {/* Draft Review Card when parsed */}
              {nlpDraft && (
                <div className="p-3 bg-white rounded-xl border border-amber-300/80 shadow-xs space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>解析生成的待确认草稿：</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        nlpDraft.confidence === 'high'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {nlpDraft.confidence === 'high' ? '高置信度规则命中' : '建议手动确认'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">识别金额</span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {nlpDraft.parsed.amount !== null ? `¥${nlpDraft.parsed.amount.toFixed(2)}` : '未识别'}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">日期与时间</span>
                      <span className="font-semibold text-slate-800">
                        {nlpDraft.parsed.date} {nlpDraft.parsed.time}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">推荐分类</span>
                      <span className="font-semibold text-emerald-700">
                        {nlpDraft.parsed.category}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">支付渠道</span>
                      <span className="font-semibold text-slate-800">
                        {nlpDraft.parsed.channel}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50/70 p-2 rounded-lg">
                    {nlpDraft.explanation}
                  </p>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleApplyDraft(false)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      导入表单进一步修改
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyDraft(true)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>核对无误，直接记账</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Form Component */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            {/* Type Selector (Expense, Income, Transfer) */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  type === 'expense'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                支出 (消费)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  type === 'income'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                收入
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('transfer')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  type === 'transfer'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <ArrowRightLeft className="w-3 h-3" />
                <span>转账/资金分配</span>
              </button>
            </div>

            {/* Amount Input & Quick Increments */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                金额（元）<span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                  ¥
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amountStr}
                  onChange={(e) => {
                    setAmountStr(e.target.value);
                    setErrorMsg('');
                  }}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-900 rounded-xl text-lg font-bold text-slate-900 tabular-nums focus:outline-none transition-colors"
                />
              </div>

              {/* Quick Preset Amount Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {[5, 10, 15, 20, 50, 100].map((quickVal) => (
                  <button
                    key={quickVal}
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(amountStr) || 0;
                      setAmountStr((cur + quickVal).toString());
                    }}
                    className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-colors cursor-pointer tabular-nums"
                  >
                    +{quickVal}
                  </button>
                ))}
                {amountStr && (
                  <button
                    type="button"
                    onClick={() => setAmountStr('')}
                    className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 transition-colors ml-auto cursor-pointer"
                  >
                    清空金额
                  </button>
                )}
              </div>
            </div>

            {/* Date and Time Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  交易日期 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-900 rounded-xl text-xs font-medium text-slate-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  时间（可选）
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-900 rounded-xl text-xs font-medium text-slate-900 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Payment Channel Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                支付来源 / 渠道 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {PAYMENT_CHANNELS.map((ch) => {
                  const isSelected = channel === ch;
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => handleChannelChange(ch)}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                      }`}
                    >
                      <span className="text-sm mb-1">{getChannelIcon(ch)}</span>
                      <span className="text-[11px] truncate w-full text-center">{ch}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  交易分类 <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsUnclassified(!isUnclassified);
                    if (!isUnclassified) setCategory('待分类');
                    else setCategory('');
                  }}
                  className={`text-xs px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                    isUnclassified
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {isUnclassified ? '✓ 稍后分类模式已开启' : '稍后分类 (快速记账)'}
                </button>
              </div>

              {/* History-based Recommended Categories */}
              {frequentCategories.length > 0 && !isUnclassified && (
                <div className="flex items-center gap-1.5 flex-wrap p-2 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
                  <span className="text-slate-400 text-[11px] flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-400" />
                    <span>常用分类:</span>
                  </span>
                  {frequentCategories.map((item) => (
                    <button
                      key={item.category}
                      type="button"
                      onClick={() => {
                        setCategory(item.category);
                        setIsUnclassified(false);
                      }}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        category === item.category
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {item.category}
                    </button>
                  ))}
                </div>
              )}

              {/* Standard Categories Grid */}
              {!isUnclassified && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-40 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50/50">
                  {currentCategories.map((cat) => {
                    const isSelected = category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium border text-left transition-all cursor-pointer truncate ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-bold'
                            : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200/80'
                        }`}
                      >
                        <span className="shrink-0">{getCategoryIcon(cat)}</span>
                        <span className="truncate">{cat}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Target Account (Only for transfers) */}
            {type === 'transfer' && (
              <div className="space-y-1 p-3 bg-purple-50/60 rounded-xl border border-purple-200/70">
                <label className="block text-xs font-semibold text-purple-900">
                  资金转入目标账户 (例如：余额宝、应急储蓄专户、证券理财)
                </label>
                <input
                  type="text"
                  placeholder="例如：微信零钱通、支付宝余额宝、农业银行二类卡"
                  value={targetAccount}
                  onChange={(e) => setTargetAccount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            )}

            {/* Note & Merchant input */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                交易描述 / 商户 / 备注（可选）
              </label>
              <input
                type="text"
                placeholder="例如：二食堂黄焖鸡、四六级报名、Midjourney订阅"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-900 rounded-xl text-xs font-medium text-slate-900 focus:outline-none transition-colors"
              />

              {/* Live Rule Match Suggestion */}
              {liveRuleMatch && liveRuleMatch.hasMatch && (
                <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                  <div className="flex items-center gap-1.5 truncate">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      规则提示：关键词「{liveRuleMatch.matchedRule?.keyword}」建议分类为「{liveRuleMatch.category}」
                    </span>
                  </div>
                  {category !== liveRuleMatch.category && (
                    <button
                      type="button"
                      onClick={() => {
                        setCategory(liveRuleMatch.category);
                        setIsUnclassified(false);
                      }}
                      className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-[11px] shrink-0 cursor-pointer"
                    >
                      采纳
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Refund Checkbox (Only for Expense) */}
            {type === 'expense' && (
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-xs">
                  <span className="font-semibold text-slate-800">标记为退款</span>
                  <p className="text-[11px] text-slate-500">
                    勾选后在月度统计中将冲抵实际消费，避免总支出虚增
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isRefund}
                  onChange={(e) => setIsRefund(e.target.checked)}
                  className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900 cursor-pointer"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                {mode === 'create' ? '确认并记入账本' : '保存修改'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
