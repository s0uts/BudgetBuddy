/**
 * BudgetBuddy Rules Engine
 *
 * Pipeline:
 *   raw transaction
 *     → [priority-sorted user rules]  (first match wins)
 *     → [built-in default categorization]
 *     → [enrichment]
 *     → RuleEngineResult
 */

import type {
  Rule,
  Condition,
  Action,
  RuleTransaction,
  RuleEngineResult,
} from './types';
import { getBuiltInCategory } from './built-in';

// ============================================================
// Condition evaluation
// ============================================================

function getFieldValue(
  tx: RuleTransaction,
  field: Condition['field']
): string | number | null {
  switch (field) {
    case 'amount':
      return tx.amount;
    case 'merchant':
      return tx.merchant_name?.toLowerCase() ?? tx.description.toLowerCase();
    case 'description':
      return tx.description.toLowerCase();
    case 'account':
      return tx.account_name?.toLowerCase() ?? tx.account_id ?? '';
    case 'date_day':
      return new Date(tx.date).getDay();
    case 'category':
      return tx.raw_category?.[0]?.toLowerCase() ?? '';
    case 'tag':
      return tx.tags.join(',').toLowerCase();
    default:
      return null;
  }
}

function evaluateCondition(tx: RuleTransaction, cond: Condition): boolean {
  const raw = getFieldValue(tx, cond.field);
  if (raw === null) return false;

  const val = cond.value;

  // Numeric comparisons
  if (
    cond.operator === 'gt' ||
    cond.operator === 'lt' ||
    cond.operator === 'gte' ||
    cond.operator === 'lte'
  ) {
    const num = typeof raw === 'number' ? raw : parseFloat(String(raw));
    const threshold = typeof val === 'number' ? val : parseFloat(String(val));
    switch (cond.operator) {
      case 'gt':  return num > threshold;
      case 'lt':  return num < threshold;
      case 'gte': return num >= threshold;
      case 'lte': return num <= threshold;
    }
  }

  // String comparisons (all case-insensitive)
  const str = String(raw).toLowerCase();
  const target = String(val).toLowerCase();

  switch (cond.operator) {
    case 'equals':       return str === target;
    case 'not_equals':   return str !== target;
    case 'contains':     return str.includes(target);
    case 'not_contains': return !str.includes(target);
    case 'starts_with':  return str.startsWith(target);
    case 'ends_with':    return str.endsWith(target);
    case 'regex': {
      try {
        return new RegExp(target, 'i').test(str);
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}

function evaluateRule(tx: RuleTransaction, rule: Rule): boolean {
  if (!rule.enabled) return false;
  if (rule.conditions.length === 0) return false;
  // ALL conditions must match (AND logic)
  return rule.conditions.every((cond) => evaluateCondition(tx, cond));
}

// ============================================================
// Action application
// ============================================================

function applyActions(
  actions: Action[],
  result: RuleEngineResult
): void {
  for (const action of actions) {
    switch (action.type) {
      case 'set_category':
        result.category = action.category;
        break;
      case 'add_tag':
        if (!result.tags.includes(action.tag)) {
          result.tags.push(action.tag);
        }
        break;
      case 'remove_tag':
        result.tags = result.tags.filter((t) => t !== action.tag);
        break;
      case 'mark_investment':
        result.isInvestment = true;
        result.investmentAccountId = action.investment_account_id;
        if (!result.category) result.category = 'Investments';
        break;
      case 'contribute_to_goal':
        result.goalContributions.push(action.goal_id);
        break;
      case 'ignore':
        result.isIgnored = true;
        break;
      case 'notify':
        result.notifications.push(action.message);
        break;
      case 'rename':
        result.merchantName = action.name;
        break;
    }
  }
}

// ============================================================
// Main pipeline
// ============================================================

/**
 * Run the rules engine on a single transaction.
 * @param tx       The raw transaction
 * @param rules    User's rules, will be sorted by priority ascending (runs first)
 */
export function runRuleEngine(
  tx: RuleTransaction,
  rules: Rule[]
): RuleEngineResult {
  const result: RuleEngineResult = {
    transaction: tx,
    matchedRuleId: null,
    appliedActions: [],
    category: tx.category,
    tags: [...tx.tags],
    isIgnored: false,
    isInvestment: false,
    investmentAccountId: null,
    goalContributions: [],
    notifications: [],
    merchantName: tx.merchant_name,
  };

  // Sort rules by priority ascending (lower priority number = runs first)
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  // First matching rule wins
  for (const rule of sorted) {
    if (evaluateRule(tx, rule)) {
      result.matchedRuleId = rule.id;
      result.appliedActions = rule.actions;
      applyActions(rule.actions, result);
      break;
    }
  }

  // Fall back to built-in categorization if no category was set
  if (!result.category) {
    result.category = getBuiltInCategory(tx);
  }

  return result;
}

/**
 * Run the rules engine on a batch of transactions.
 */
export function runRuleEngineBatch(
  transactions: RuleTransaction[],
  rules: Rule[]
): RuleEngineResult[] {
  return transactions.map((tx) => runRuleEngine(tx, rules));
}
