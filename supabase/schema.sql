-- BudgetBuddy Supabase Schema
-- Run this in the Supabase SQL Editor

-- ============================================
-- ACCOUNTS
-- ============================================
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plaid_account_id text,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('spending', 'saving', 'investing', 'borrowing')),
  balance decimal(12, 2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'CAD',
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own accounts"
  ON accounts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- RULES
-- ============================================
CREATE TABLE IF NOT EXISTS rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  priority int NOT NULL DEFAULT 100,
  enabled bool NOT NULL DEFAULT true,
  conditions jsonb NOT NULL DEFAULT '[]',
  actions jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own rules"
  ON rules FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_rules_user_priority ON rules (user_id, priority ASC);

-- ============================================
-- GOALS
-- ============================================
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_amount decimal(12, 2) NOT NULL,
  current_amount decimal(12, 2) NOT NULL DEFAULT 0,
  target_date date,
  funding_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  color text NOT NULL DEFAULT '#F4B942',
  icon text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own goals"
  ON goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- INVESTMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  ticker text NOT NULL,
  shares decimal(12, 6) NOT NULL DEFAULT 0,
  avg_cost decimal(12, 4),
  current_price decimal(12, 4),
  currency text NOT NULL DEFAULT 'CAD',
  last_price_fetch timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own investments"
  ON investments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TRANSACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  plaid_transaction_id text UNIQUE,
  date date NOT NULL,
  amount decimal(12, 2) NOT NULL,
  description text NOT NULL,
  merchant_name text,
  category text,
  raw_category text[],
  tags text[],
  is_investment bool NOT NULL DEFAULT false,
  investment_id uuid REFERENCES investments(id) ON DELETE SET NULL,
  rule_id uuid REFERENCES rules(id) ON DELETE SET NULL,
  pending bool NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own transactions"
  ON transactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_transactions_user_date ON transactions (user_id, date DESC);
CREATE INDEX idx_transactions_account ON transactions (account_id, date DESC);
CREATE INDEX idx_transactions_category ON transactions (user_id, category);

-- ============================================
-- PLAID ITEMS (encrypted access tokens)
-- ============================================
CREATE TABLE IF NOT EXISTS plaid_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plaid_item_id text NOT NULL UNIQUE,
  access_token_encrypted text NOT NULL,
  institution_id text,
  institution_name text,
  cursor text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE plaid_items ENABLE ROW LEVEL SECURITY;

-- Only service role can access plaid_items (access tokens must NEVER go to client)
CREATE POLICY "Service role only"
  ON plaid_items FOR ALL
  USING (false);

-- ============================================
-- GOAL CONTRIBUTIONS VIEW
-- ============================================
CREATE OR REPLACE VIEW goal_contributions AS
  SELECT
    t.id AS transaction_id,
    t.user_id,
    t.date,
    t.amount,
    t.description,
    r.actions AS rule_actions,
    (action->>'goal_id')::uuid AS goal_id
  FROM transactions t
  JOIN rules r ON r.id = t.rule_id
  CROSS JOIN LATERAL jsonb_array_elements(r.actions) AS action
  WHERE action->>'type' = 'contribute_to_goal';
