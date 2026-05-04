-- BudgetBuddy Seed Data (for development/testing only)
-- Run AFTER schema.sql

-- NOTE: Replace 'YOUR_USER_ID' with your actual auth.users UUID

-- Sample accounts
-- INSERT INTO accounts (user_id, name, type, balance, currency) VALUES
--   ('YOUR_USER_ID', 'TD Chequing ***4521', 'spending', 2450.75, 'CAD'),
--   ('YOUR_USER_ID', 'TD Savings ***8832', 'saving', 12300.00, 'CAD'),
--   ('YOUR_USER_ID', 'Wealthsimple TFSA', 'investing', 45200.00, 'CAD'),
--   ('YOUR_USER_ID', 'TD Visa ***1234', 'borrowing', -1843.20, 'CAD');

-- Sample rules
-- INSERT INTO rules (user_id, name, description, priority, enabled, conditions, actions) VALUES
--   ('YOUR_USER_ID',
--    'TD to Wealthsimple Investment',
--    'When money is transferred to Wealthsimple, mark as investment',
--    10,
--    true,
--    '[{"field":"description","operator":"contains","value":"WEALTHSIMPLE"},{"field":"amount","operator":"lt","value":0}]',
--    '[{"type":"set_category","category":"Investments"},{"type":"mark_investment","investment_account_id":"YOUR_INVEST_ACCOUNT_ID"}]');
