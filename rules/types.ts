/**
 * BudgetBuddy Rules Engine — Type Definitions
 */

export type ConditionField =
  | 'amount'
  | 'merchant'
  | 'description'
  | 'account'
  | 'date_day'      // 0=Sunday, 1=Monday, …, 6=Saturday
  | 'category'      // Plaid raw category
  | 'tag';

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'regex';

export interface Condition {
  field: ConditionField;
  operator: ConditionOperator;
  value: string | number;
}

export type ActionType =
  | 'set_category'
  | 'add_tag'
  | 'remove_tag'
  | 'mark_investment'
  | 'contribute_to_goal'
  | 'ignore'
  | 'notify'
  | 'rename';

export type Action =
  | { type: 'set_category'; category: string }
  | { type: 'add_tag'; tag: string }
  | { type: 'remove_tag'; tag: string }
  | { type: 'mark_investment'; investment_account_id: string }
  | { type: 'contribute_to_goal'; goal_id: string }
  | { type: 'ignore' }
  | { type: 'notify'; message: string }
  | { type: 'rename'; name: string };

export interface Rule {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  priority: number;
  enabled: boolean;
  conditions: Condition[];
  actions: Action[];
  created_at: string;
}

/**
 * A transaction object as passed into the rule engine
 */
export interface RuleTransaction {
  id: string;
  account_id: string | null;
  account_name?: string;
  date: string;
  amount: number;             // negative = debit
  description: string;
  merchant_name: string | null;
  category: string | null;
  raw_category: string[] | null;
  tags: string[];
  pending: boolean;
}

/**
 * Output from the rule engine for a single transaction
 */
export interface RuleEngineResult {
  transaction: RuleTransaction;
  matchedRuleId: string | null;
  appliedActions: Action[];
  category: string | null;
  tags: string[];
  isIgnored: boolean;
  isInvestment: boolean;
  investmentAccountId: string | null;
  goalContributions: string[];  // goal_ids
  notifications: string[];
  merchantName: string | null;
}
