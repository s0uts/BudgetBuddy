/**
 * Built-in default categorization
 * Maps Plaid's raw categories and merchant keywords to our categories
 */

import type { RuleTransaction } from './types';

// Our app category names
export const CATEGORIES = [
  'Food & Drink',
  'Groceries',
  'Shopping',
  'Entertainment',
  'Transportation',
  'Travel',
  'Health & Medical',
  'Personal Care',
  'Bills & Utilities',
  'Rent & Housing',
  'Investments',
  'Transfers',
  'Income',
  'Education',
  'Gifts & Donations',
  'Business',
  'Government',
  'Other',
] as const;

export type Category = typeof CATEGORIES[number];

// Plaid category → our category mappings
const PLAID_CATEGORY_MAP: Record<string, Category> = {
  // Food
  'food and drink': 'Food & Drink',
  'restaurants': 'Food & Drink',
  'fast food': 'Food & Drink',
  'coffee shop': 'Food & Drink',
  'bar': 'Food & Drink',
  'breweries': 'Food & Drink',
  // Groceries
  'supermarkets and groceries': 'Groceries',
  'grocery': 'Groceries',
  // Shopping
  'shops': 'Shopping',
  'clothing and accessories': 'Shopping',
  'electronics': 'Shopping',
  'sporting goods': 'Shopping',
  'digital purchase': 'Shopping',
  // Entertainment
  'recreation': 'Entertainment',
  'arts and entertainment': 'Entertainment',
  'movies and dvds': 'Entertainment',
  'music': 'Entertainment',
  'games': 'Entertainment',
  'gyms and fitness centers': 'Entertainment',
  // Transportation
  'transportation': 'Transportation',
  'taxi': 'Transportation',
  'ride share': 'Transportation',
  'gas stations': 'Transportation',
  'parking': 'Transportation',
  'public transportation services': 'Transportation',
  // Travel
  'travel': 'Travel',
  'airlines and aviation services': 'Travel',
  'hotels and motels': 'Travel',
  'car rental': 'Travel',
  // Health
  'medical': 'Health & Medical',
  'pharmacies': 'Health & Medical',
  'dentists': 'Health & Medical',
  'doctors': 'Health & Medical',
  'hospitals': 'Health & Medical',
  // Personal care
  'personal care': 'Personal Care',
  'beauty salons': 'Personal Care',
  'barbers': 'Personal Care',
  // Bills & Utilities
  'service': 'Bills & Utilities',
  'utilities': 'Bills & Utilities',
  'telephone services': 'Bills & Utilities',
  'internet services': 'Bills & Utilities',
  'subscription': 'Bills & Utilities',
  'insurance': 'Bills & Utilities',
  // Housing
  'mortgage': 'Rent & Housing',
  'rent': 'Rent & Housing',
  'real estate': 'Rent & Housing',
  // Investment
  'investment': 'Investments',
  'brokerage': 'Investments',
  'financial planning': 'Investments',
  // Transfer
  'transfer': 'Transfers',
  'bank fees': 'Bills & Utilities',
  'credit card': 'Transfers',
  'loan payment': 'Bills & Utilities',
  // Income
  'payroll': 'Income',
  'deposit': 'Income',
  // Education
  'college': 'Education',
  'schools': 'Education',
  'books and supplies': 'Education',
  // Charity
  'charitable': 'Gifts & Donations',
  'religious': 'Gifts & Donations',
  // Government
  'government departments': 'Government',
  'tax': 'Government',
};

// Merchant keyword overrides (checked against merchant_name and description)
const MERCHANT_KEYWORD_MAP: Array<[string | RegExp, Category]> = [
  // Groceries (Canadian)
  [/loblaws|no frills|metro|sobeys|safeway|iga|food basics|freshco|zehrs/i, 'Groceries'],
  [/walmart/i, 'Groceries'],
  [/costco/i, 'Groceries'],
  // Food & Drink
  [/tim horton|starbucks|mcdonalds|mcdonald|subway|a&w|harvey|wendy|popeyes|kfc/i, 'Food & Drink'],
  [/skip the dishes|uber eats|doordash|instacart/i, 'Food & Drink'],
  // Transportation
  [/presto|ttc|oc transpo|stm|translink/i, 'Transportation'],
  [/uber|lyft|taxi/i, 'Transportation'],
  [/petro|esso|shell|husky|pioneer|canadian tire gas/i, 'Transportation'],
  // Investments
  [/wealthsimple|questrade|ci direct|td direct investing|rbc direct|itrade/i, 'Investments'],
  // Streaming / Entertainment
  [/netflix|spotify|apple music|disney\+|crave|amazon prime/i, 'Entertainment'],
  // Subscriptions / Bills
  [/rogers|bell|telus|videotron|freedom mobile/i, 'Bills & Utilities'],
  [/hydro|enbridge|union gas|fortis/i, 'Bills & Utilities'],
  // Health
  [/shoppers drug|rexall|london drugs|pharmacy/i, 'Health & Medical'],
  // Shopping
  [/amazon/i, 'Shopping'],
  [/canadian tire|home depot|ikea|best buy/i, 'Shopping'],
  // Income
  [/payroll|direct deposit|e-transfer from/i, 'Income'],
  // Transfers
  [/e-transfer to|interac transfer|transfer to|transfer from/i, 'Transfers'],
];

export function getBuiltInCategory(tx: RuleTransaction): Category {
  // 1. Check merchant keywords first (higher specificity)
  const haystack = `${tx.merchant_name ?? ''} ${tx.description}`.toLowerCase();

  for (const [pattern, category] of MERCHANT_KEYWORD_MAP) {
    if (typeof pattern === 'string' && haystack.includes(pattern)) {
      return category;
    }
    if (pattern instanceof RegExp && pattern.test(haystack)) {
      return category;
    }
  }

  // 2. Check Plaid raw categories
  if (tx.raw_category) {
    for (const rawCat of tx.raw_category) {
      const lower = rawCat.toLowerCase();
      const mapped = PLAID_CATEGORY_MAP[lower];
      if (mapped) return mapped;

      // Partial match
      for (const [key, val] of Object.entries(PLAID_CATEGORY_MAP)) {
        if (lower.includes(key) || key.includes(lower)) {
          return val;
        }
      }
    }
  }

  // 3. Amount heuristics
  if (tx.amount > 0) return 'Income';
  if (tx.amount < 0 && Math.abs(tx.amount) > 1000) return 'Transfers';

  return 'Other';
}
