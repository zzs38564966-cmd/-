/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CategoryRule, Transaction, TransactionType } from '../types/finance';

export const PRESET_CATEGORY_RULES: CategoryRule[] = [
  // 餐饮
  { id: 'rule_preset_canteen', keyword: '食堂', targetCategory: '餐饮', targetType: 'expense', enabled: true, isPreset: true, description: '校园食堂与档口消费' },
  { id: 'rule_preset_meituan', keyword: '美团', targetCategory: '餐饮', targetType: 'expense', enabled: true, isPreset: true, description: '外卖点餐' },
  { id: 'rule_preset_eleme', keyword: '饿了么', targetCategory: '餐饮', targetType: 'expense', enabled: true, isPreset: true, description: '外卖点餐' },
  { id: 'rule_preset_luckin', keyword: '瑞幸', targetCategory: '餐饮', targetType: 'expense', enabled: true, isPreset: true, description: '咖啡饮品' },
  { id: 'rule_preset_mixue', keyword: '蜜雪冰城', targetCategory: '餐饮', targetType: 'expense', enabled: true, isPreset: true, description: '日常奶茶与茶饮' },
  { id: 'rule_preset_kfc', keyword: '肯德基', targetCategory: '餐饮', targetType: 'expense', enabled: true, isPreset: true, description: '快餐餐饮' },
  { id: 'rule_preset_mcd', keyword: '麦当劳', targetCategory: '餐饮', targetType: 'expense', enabled: true, isPreset: true, description: '快餐餐饮' },
  { id: 'rule_preset_subway_food', keyword: '黄焖鸡', targetCategory: '餐饮', targetType: 'expense', enabled: true, isPreset: true, description: '快餐餐饮' },

  // 交通
  { id: 'rule_preset_didi', keyword: '滴滴', targetCategory: '交通', targetType: 'expense', enabled: true, isPreset: true, description: '网约车出行' },
  { id: 'rule_preset_gaode', keyword: '高德打车', targetCategory: '交通', targetType: 'expense', enabled: true, isPreset: true, description: '网约车打车' },
  { id: 'rule_preset_metro', keyword: '地铁', targetCategory: '交通', targetType: 'expense', enabled: true, isPreset: true, description: '城市轨道交通' },
  { id: 'rule_preset_bus', keyword: '公交', targetCategory: '交通', targetType: 'expense', enabled: true, isPreset: true, description: '公交车乘车刷码' },
  { id: 'rule_preset_12306', keyword: '12306', targetCategory: '交通', targetType: 'expense', enabled: true, isPreset: true, description: '铁路火车/高铁客票' },
  { id: 'rule_preset_rail', keyword: '铁路', targetCategory: '交通', targetType: 'expense', enabled: true, isPreset: true, description: '火车高铁乘车' },
  { id: 'rule_preset_bike', keyword: '单车', targetCategory: '交通', targetType: 'expense', enabled: true, isPreset: true, description: '共享单车骑行' },

  // 手机及日常通信
  { id: 'rule_preset_huafei', keyword: '话费', targetCategory: '手机及日常通信', targetType: 'expense', enabled: true, isPreset: true, description: '手机充值' },
  { id: 'rule_preset_yidong', keyword: '中国移动', targetCategory: '手机及日常通信', targetType: 'expense', enabled: true, isPreset: true, description: '移动营业厅话费与宽带' },
  { id: 'rule_preset_liantong', keyword: '中国联通', targetCategory: '手机及日常通信', targetType: 'expense', enabled: true, isPreset: true, description: '联通话费充值' },
  { id: 'rule_preset_dianxin', keyword: '中国电信', targetCategory: '手机及日常通信', targetType: 'expense', enabled: true, isPreset: true, description: '电信号费充值' },
  { id: 'rule_preset_campus_net', keyword: '校园网', targetCategory: '手机及日常通信', targetType: 'expense', enabled: true, isPreset: true, description: '大学校园网网费' },

  // 学习
  { id: 'rule_preset_cet', keyword: '四六级', targetCategory: '学习', targetType: 'expense', enabled: true, isPreset: true, description: '外语等级考试报名' },
  { id: 'rule_preset_postgrad', keyword: '考研', targetCategory: '学习', targetType: 'expense', enabled: true, isPreset: true, description: '考研资料与网课' },
  { id: 'rule_preset_print', keyword: '打印', targetCategory: '学习', targetType: 'expense', enabled: true, isPreset: true, description: '文印店课件与论文打印' },
  { id: 'rule_preset_cnki', keyword: '知网', targetCategory: '学习', targetType: 'expense', enabled: true, isPreset: true, description: '论文查重与文献下载' },
  { id: 'rule_preset_book', keyword: '教材', targetCategory: '学习', targetType: 'expense', enabled: true, isPreset: true, description: '专业课课本与教辅' },

  // AI 软件及订阅
  { id: 'rule_preset_midjourney', keyword: 'Midjourney', targetCategory: 'AI 软件及订阅', targetType: 'expense', enabled: true, isPreset: true, description: 'AI 生图工具订阅' },
  { id: 'rule_preset_chatgpt', keyword: 'ChatGPT', targetCategory: 'AI 软件及订阅', targetType: 'expense', enabled: true, isPreset: true, description: 'OpenAI 会员订阅' },
  { id: 'rule_preset_openai', keyword: 'OpenAI', targetCategory: 'AI 软件及订阅', targetType: 'expense', enabled: true, isPreset: true, description: 'OpenAI API 与服务' },
  { id: 'rule_preset_claude', keyword: 'Claude', targetCategory: 'AI 软件及订阅', targetType: 'expense', enabled: true, isPreset: true, description: 'Anthropic AI 会员订阅' },
  { id: 'rule_preset_runway', keyword: 'Runway', targetCategory: 'AI 软件及订阅', targetType: 'expense', enabled: true, isPreset: true, description: 'AI 视频生成' },
  { id: 'rule_preset_kling', keyword: '可灵', targetCategory: 'AI 软件及订阅', targetType: 'expense', enabled: true, isPreset: true, description: '可灵 AI 视频积分' },
  { id: 'rule_preset_coze', keyword: '扣子', targetCategory: 'AI 软件及订阅', targetType: 'expense', enabled: true, isPreset: true, description: 'AI Agent 开发' },

  // AI 漫剧项目
  { id: 'rule_preset_manga_script', keyword: '漫剧', targetCategory: 'AI 漫剧', targetType: 'expense', enabled: true, isPreset: true, description: '漫剧项目制作支出' },
  { id: 'rule_preset_storyboard', keyword: '分镜', targetCategory: 'AI 漫剧', targetType: 'expense', enabled: true, isPreset: true, description: '分镜素材与美术支出' },
  { id: 'rule_preset_voice', keyword: '配音', targetCategory: 'AI 漫剧', targetType: 'expense', enabled: true, isPreset: true, description: 'AI/真人配音素材' },

  // 收入
  { id: 'rule_preset_parent', keyword: '生活费', targetCategory: '生活费', targetType: 'income', enabled: true, isPreset: true, description: '家庭月度生活费' },
  { id: 'rule_preset_parttime', keyword: '兼职', targetCategory: '兼职收入', targetType: 'income', enabled: true, isPreset: true, description: '校园与校外兼职薪资' },
  { id: 'rule_preset_tutor', keyword: '家教', targetCategory: '兼职收入', targetType: 'income', enabled: true, isPreset: true, description: '家教课酬' },
  { id: 'rule_preset_drama_inc', keyword: '漫剧收入', targetCategory: 'AI 漫剧收入', targetType: 'income', enabled: true, isPreset: true, description: '漫剧流量分账与接单收益' },

  // 账户转账与资金分配（防止被误算为日常消费）
  { id: 'rule_preset_transfer_lingqian', keyword: '零钱通', targetCategory: '账户互转', targetType: 'transfer', enabled: true, isPreset: true, description: '微信零钱通转入转出' },
  { id: 'rule_preset_transfer_yuebao', keyword: '余额宝', targetCategory: '投资转入', targetType: 'transfer', enabled: true, isPreset: true, description: '支付宝余额宝转入' },
  { id: 'rule_preset_fund_trans', keyword: '定投', targetCategory: '投资转入', targetType: 'transfer', enabled: true, isPreset: true, description: '每月投资资金定投' },
  { id: 'rule_preset_savings_trans', keyword: '应急储蓄', targetCategory: '应急储蓄转入', targetType: 'transfer', enabled: true, isPreset: true, description: '存入应急存钱罐' },
];

export interface MatchResult {
  hasMatch: boolean;
  matchedRule?: CategoryRule;
  hasConflict: boolean;
  conflictRules?: CategoryRule[];
  confidence: 'high' | 'medium' | 'low';
  category: string;
  type: TransactionType;
  explanation: string;
}

/**
 * Match a text against active rules with conflict detection
 */
export function matchRules(
  text: string,
  rules: CategoryRule[] = PRESET_CATEGORY_RULES
): MatchResult {
  const clean = (text || '').trim().toLowerCase();
  if (!clean) {
    return {
      hasMatch: false,
      hasConflict: false,
      confidence: 'low',
      category: '待分类',
      type: 'expense',
      explanation: '未提供交易描述文本，保留待确认状态。',
    };
  }

  const enabledRules = rules.filter((r) => r.enabled);
  const matchedRules: CategoryRule[] = [];

  for (const rule of enabledRules) {
    const kw = rule.keyword.toLowerCase().trim();
    if (!kw) continue;
    if (clean.includes(kw)) {
      matchedRules.push(rule);
    }
  }

  if (matchedRules.length === 0) {
    return {
      hasMatch: false,
      hasConflict: false,
      confidence: 'low',
      category: '待分类',
      type: 'expense',
      explanation: '未匹配到预置或自定义规则，建议手动指定分类或补充关键字规则。',
    };
  }

  // Check if multiple matched rules have different categories or types
  const distinctTargets = new Set(matchedRules.map((r) => `${r.targetType}:${r.targetCategory}`));

  if (distinctTargets.size > 1) {
    // Conflict detected!
    const conflictDescriptions = matchedRules
      .map((r) => `「${r.keyword}」-> ${r.targetCategory} (${r.targetType === 'expense' ? '支出' : r.targetType === 'income' ? '收入' : '转账'})`)
      .join('、');

    return {
      hasMatch: true,
      matchedRule: matchedRules[0],
      hasConflict: true,
      conflictRules: matchedRules,
      confidence: 'medium',
      category: matchedRules[0].targetCategory,
      type: matchedRules[0].targetType,
      explanation: `检测到规则冲突：该描述同时命中了多条不同分类规则（${conflictDescriptions}），请手动确认采用哪一类别。`,
    };
  }

  // Exactly one distinct category matched
  const bestRule = matchedRules[0];
  return {
    hasMatch: true,
    matchedRule: bestRule,
    hasConflict: false,
    confidence: 'high',
    category: bestRule.targetCategory,
    type: bestRule.targetType,
    explanation: `依据规则「${bestRule.keyword}」自动推荐分类为【${bestRule.targetCategory}】（高置信度）。`,
  };
}

/**
 * Learn frequently used categories from user transaction history
 */
export function learnFrequentCategories(
  transactions: Transaction[],
  type: TransactionType = 'expense',
  limit: number = 6
): { category: string; count: number }[] {
  const counts: Record<string, number> = {};

  transactions
    .filter((tx) => tx.type === type && tx.category && tx.category !== '待分类')
    .forEach((tx) => {
      counts[tx.category] = (counts[tx.category] || 0) + 1;
    });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category, count]) => ({ category, count }));
}

/**
 * Storage helpers for custom rules in localStorage
 */
const STORAGE_KEY_CUSTOM_RULES = 'finance_custom_rules_v1';

export function loadLocalRules(): CategoryRule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_RULES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load local custom rules:', e);
  }
  return PRESET_CATEGORY_RULES;
}

export function saveLocalRules(rules: CategoryRule[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_RULES, JSON.stringify(rules));
  } catch (e) {
    console.error('Failed to save local custom rules:', e);
  }
}
