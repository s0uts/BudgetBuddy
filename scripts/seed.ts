/**
 * BudgetBuddy — Seed Script
 * Populates your Supabase project with realistic fake Canadian data.
 *
 * Usage:
 *   cd scripts
 *   npx ts-node --project tsconfig.json seed.ts <your-email>
 *
 * e.g.  npx ts-node --project tsconfig.json seed.ts josh@example.com
 *
 * Requires: backend/.env with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ── Load backend .env manually ──────────────────────────────────────────────
const envPath = path.resolve(__dirname, '../backend/.env');
if (!fs.existsSync(envPath)) {
  console.error('❌  backend/.env not found. Copy backend/.env.example → backend/.env first.');
  process.exit(1);
}
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const [key, ...rest] = line.split('=');
  if (key && rest.length && !key.startsWith('#')) {
    process.env[key.trim()] = rest.join('=').trim();
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from backend/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function randomBetween(min: number, max: number, decimals = 2): number {
  const val = Math.random() * (max - min) + min;
  return parseFloat(val.toFixed(decimals));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npx ts-node --project tsconfig.json seed.ts <your-email>');
    process.exit(1);
  }

  console.log(`\n🌱  BudgetBuddy Seed Script`);
  console.log(`   Seeding data for: ${email}\n`);

  // ── 1. Look up user ────────────────────────────────────────────────────────
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) { console.error('❌  Could not list users:', listErr.message); process.exit(1); }

  const user = users.find(u => u.email === email);
  if (!user) {
    console.error(`❌  No user found with email "${email}".`);
    console.error(`   Sign up / log in to the app first, then re-run this script.`);
    process.exit(1);
  }
  const userId = user.id;
  console.log(`✅  Found user: ${userId}`);

  // ── 2. Clear existing seed data ────────────────────────────────────────────
  console.log('🧹  Clearing existing data…');
  await supabase.from('transactions').delete().eq('user_id', userId);
  await supabase.from('investments').delete().eq('user_id', userId);
  await supabase.from('goals').delete().eq('user_id', userId);
  await supabase.from('rules').delete().eq('user_id', userId);
  await supabase.from('accounts').delete().eq('user_id', userId);

  // ── 3. Accounts ────────────────────────────────────────────────────────────
  console.log('🏦  Creating accounts…');
  const { data: accounts, error: accErr } = await supabase
    .from('accounts')
    .insert([
      {
        user_id: userId,
        name: 'TD Chequing ***4521',
        type: 'spending',
        balance: 2847.63,
        currency: 'CAD',
      },
      {
        user_id: userId,
        name: 'TD Savings ***8832',
        type: 'saving',
        balance: 8200.00,
        currency: 'CAD',
      },
      {
        user_id: userId,
        name: 'Wealthsimple TFSA',
        type: 'investing',
        balance: 14320.50,
        currency: 'CAD',
      },
      {
        user_id: userId,
        name: 'TD Visa ***1234',
        type: 'borrowing',
        balance: 843.21,
        currency: 'CAD',
      },
    ])
    .select();

  if (accErr) { console.error('❌  Accounts error:', accErr.message); process.exit(1); }

  const chequing  = accounts!.find(a => a.name.includes('Chequing'))!;
  const savings   = accounts!.find(a => a.name.includes('Savings'))!;
  const tfsa      = accounts!.find(a => a.name.includes('Wealthsimple'))!;
  const visa      = accounts!.find(a => a.name.includes('Visa'))!;
  console.log(`   Created ${accounts!.length} accounts`);

  // ── 4. Rules ───────────────────────────────────────────────────────────────
  console.log('⚙️   Creating rules…');
  const { data: rules, error: rulesErr } = await supabase
    .from('rules')
    .insert([
      {
        user_id: userId,
        name: 'Wealthsimple Investment Transfer',
        description: 'Any transfer to Wealthsimple is marked as an investment',
        priority: 10,
        enabled: true,
        conditions: [
          { field: 'description', operator: 'contains', value: 'WEALTHSIMPLE' },
          { field: 'amount', operator: 'lt', value: 0 },
        ],
        actions: [
          { type: 'set_category', category: 'Investments' },
          { type: 'mark_investment', investment_account_id: tfsa.id },
        ],
      },
      {
        user_id: userId,
        name: 'Tim Hortons → Coffee tag',
        description: 'Tag all Tim Hortons visits as morning coffee',
        priority: 20,
        enabled: true,
        conditions: [
          { field: 'merchant', operator: 'contains', value: 'TIM HORTON' },
        ],
        actions: [
          { type: 'set_category', category: 'Food & Drink' },
          { type: 'add_tag', tag: 'coffee' },
        ],
      },
      {
        user_id: userId,
        name: 'Rename Amazon',
        description: 'Clean up Amazon transaction names',
        priority: 30,
        enabled: true,
        conditions: [
          { field: 'description', operator: 'contains', value: 'AMZN' },
        ],
        actions: [
          { type: 'rename', name: 'Amazon' },
          { type: 'set_category', category: 'Shopping' },
        ],
      },
    ])
    .select();

  if (rulesErr) { console.error('❌  Rules error:', rulesErr.message); process.exit(1); }
  console.log(`   Created ${rules!.length} rules`);

  // ── 5. Goals ───────────────────────────────────────────────────────────────
  console.log('🎯  Creating goals…');
  const { error: goalsErr } = await supabase.from('goals').insert([
    {
      user_id: userId,
      name: 'Emergency Fund',
      target_amount: 10000,
      current_amount: 3200,
      target_date: new Date(new Date().setMonth(new Date().getMonth() + 8))
        .toISOString().split('T')[0],
      funding_account_id: savings.id,
      color: '#F4B942',
    },
    {
      user_id: userId,
      name: 'Europe Trip ✈️',
      target_amount: 5000,
      current_amount: 1250,
      target_date: new Date(new Date().setMonth(new Date().getMonth() + 14))
        .toISOString().split('T')[0],
      funding_account_id: savings.id,
      color: '#8B5CF6',
    },
    {
      user_id: userId,
      name: 'New MacBook',
      target_amount: 2500,
      current_amount: 2500,
      target_date: null,
      funding_account_id: chequing.id,
      color: '#10B981',
    },
  ]);
  if (goalsErr) { console.error('❌  Goals error:', goalsErr.message); process.exit(1); }
  console.log('   Created 3 goals');

  // ── 6. Investments ────────────────────────────────────────────────────────
  console.log('📈  Creating investment positions…');
  const { error: invErr } = await supabase.from('investments').insert([
    {
      user_id: userId,
      account_id: tfsa.id,
      ticker: 'XEQT.TO',
      shares: 52.0,
      avg_cost: 25.84,
      current_price: 27.12,
      currency: 'CAD',
      last_price_fetch: new Date().toISOString(),
    },
    {
      user_id: userId,
      account_id: tfsa.id,
      ticker: 'VEQT.TO',
      shares: 38.0,
      avg_cost: 33.10,
      current_price: 35.47,
      currency: 'CAD',
      last_price_fetch: new Date().toISOString(),
    },
    {
      user_id: userId,
      account_id: tfsa.id,
      ticker: 'VFV.TO',
      shares: 8.0,
      avg_cost: 118.20,
      current_price: 131.85,
      currency: 'CAD',
      last_price_fetch: new Date().toISOString(),
    },
  ]);
  if (invErr) { console.error('❌  Investments error:', invErr.message); process.exit(1); }
  console.log('   Created 3 positions (XEQT.TO, VEQT.TO, VFV.TO)');

  // ── 7. Transactions ────────────────────────────────────────────────────────
  console.log('💳  Generating 90 days of transactions…');

  const transactions: object[] = [];

  // ── Recurring monthly (run for months 0, 1, 2 ago) ─────────────────────
  for (let month = 0; month < 3; month++) {
    const base = month * 30;

    // Payroll — bi-weekly (day 1 and 15 of each "month")
    transactions.push({
      user_id: userId, account_id: chequing.id,
      date: daysAgo(base + 1), amount: 2834.50,
      description: 'DIRECT DEPOSIT - PAYROLL', merchant_name: 'Employer Inc.',
      category: 'Income', raw_category: ['payroll'], pending: false,
    });
    transactions.push({
      user_id: userId, account_id: chequing.id,
      date: daysAgo(base + 15), amount: 2834.50,
      description: 'DIRECT DEPOSIT - PAYROLL', merchant_name: 'Employer Inc.',
      category: 'Income', raw_category: ['payroll'], pending: false,
    });

    // Rent
    transactions.push({
      user_id: userId, account_id: chequing.id,
      date: daysAgo(base + 2), amount: -1850.00,
      description: 'E-TRANSFER TO LANDLORD', merchant_name: null,
      category: 'Rent & Housing', raw_category: ['transfer'], pending: false,
    });

    // Rogers phone bill
    transactions.push({
      user_id: userId, account_id: chequing.id,
      date: daysAgo(base + 5), amount: -84.75,
      description: 'ROGERS COMMUNICATIONS', merchant_name: 'Rogers',
      category: 'Bills & Utilities', raw_category: ['telephone services'], pending: false,
    });

    // Hydro
    transactions.push({
      user_id: userId, account_id: chequing.id,
      date: daysAgo(base + 8), amount: -randomBetween(88, 115),
      description: 'TORONTO HYDRO', merchant_name: 'Toronto Hydro',
      category: 'Bills & Utilities', raw_category: ['utilities'], pending: false,
    });

    // Netflix
    transactions.push({
      user_id: userId, account_id: visa.id,
      date: daysAgo(base + 3), amount: -16.99,
      description: 'NETFLIX.COM', merchant_name: 'Netflix',
      category: 'Entertainment', raw_category: ['subscription'], pending: false,
    });

    // Spotify
    transactions.push({
      user_id: userId, account_id: visa.id,
      date: daysAgo(base + 3), amount: -9.99,
      description: 'SPOTIFY', merchant_name: 'Spotify',
      category: 'Entertainment', raw_category: ['subscription'], pending: false,
    });

    // Wealthsimple transfer
    transactions.push({
      user_id: userId, account_id: chequing.id,
      date: daysAgo(base + 10), amount: -500.00,
      description: 'WEALTHSIMPLE TRANSFER', merchant_name: 'Wealthsimple',
      category: 'Investments', raw_category: ['investment'], pending: false,
      is_investment: true, investment_id: null,
    });

    // Visa payment
    transactions.push({
      user_id: userId, account_id: chequing.id,
      date: daysAgo(base + 20), amount: -randomBetween(400, 900),
      description: 'TD VISA PAYMENT', merchant_name: null,
      category: 'Transfers', raw_category: ['credit card'], pending: false,
    });
  }

  // ── Weekly groceries (~12 trips) ────────────────────────────────────────
  const groceryStores = [
    { name: 'LOBLAWS #1042', merchant: 'Loblaws' },
    { name: 'NO FRILLS #0284', merchant: 'No Frills' },
    { name: 'METRO GROCERY', merchant: 'Metro' },
  ];
  for (let week = 0; week < 12; week++) {
    const store = pick(groceryStores);
    transactions.push({
      user_id: userId, account_id: week % 2 === 0 ? chequing.id : visa.id,
      date: daysAgo(week * 7 + randomBetween(0, 3, 0)),
      amount: -randomBetween(65, 195),
      description: store.name, merchant_name: store.merchant,
      category: 'Groceries', raw_category: ['supermarkets and groceries'], pending: false,
    });
  }

  // ── Tim Hortons (~3x/week) ───────────────────────────────────────────────
  for (let i = 0; i < 36; i++) {
    transactions.push({
      user_id: userId, account_id: visa.id,
      date: daysAgo(randomBetween(0, 89, 0)),
      amount: -randomBetween(2.85, 7.50),
      description: 'TIM HORTONS #4821', merchant_name: 'Tim Hortons',
      category: 'Food & Drink', raw_category: ['coffee shop'], pending: false,
      tags: ['coffee'],
    });
  }

  // ── Restaurants & food delivery (~2x/week) ──────────────────────────────
  const restaurants = [
    { name: 'SKIP THE DISHES', merchant: 'SkipTheDishes' },
    { name: 'UBER* EATS', merchant: 'Uber Eats' },
    { name: 'OSMOW\'S SHAWARMA', merchant: 'Osmow\'s' },
    { name: 'BANH MI BOYS', merchant: 'Banh Mi Boys' },
    { name: 'RAMEN ISSHIN', merchant: 'Ramen Isshin' },
    { name: 'POPEYES #1204', merchant: 'Popeyes' },
    { name: 'HARVEYS BURGERS', merchant: 'Harvey\'s' },
  ];
  for (let i = 0; i < 24; i++) {
    const r = pick(restaurants);
    transactions.push({
      user_id: userId, account_id: visa.id,
      date: daysAgo(randomBetween(0, 89, 0)),
      amount: -randomBetween(12, 58),
      description: r.name, merchant_name: r.merchant,
      category: 'Food & Drink', raw_category: ['restaurants'], pending: false,
    });
  }

  // ── Gas (~every 2 weeks) ─────────────────────────────────────────────────
  const gasStations = ['PETRO-CANADA #0821', 'ESSO EXPRESS', 'SHELL #4401'];
  for (let i = 0; i < 6; i++) {
    transactions.push({
      user_id: userId, account_id: visa.id,
      date: daysAgo(i * 14 + randomBetween(0, 3, 0)),
      amount: -randomBetween(52, 88),
      description: pick(gasStations), merchant_name: 'Gas Station',
      category: 'Transportation', raw_category: ['gas stations'], pending: false,
    });
  }

  // ── Shoppers Drug Mart (~monthly) ─────────────────────────────────────────
  for (let i = 0; i < 3; i++) {
    transactions.push({
      user_id: userId, account_id: visa.id,
      date: daysAgo(i * 28 + randomBetween(0, 5, 0)),
      amount: -randomBetween(18, 65),
      description: 'SHOPPERS DRUG MART #1842', merchant_name: 'Shoppers Drug Mart',
      category: 'Health & Medical', raw_category: ['pharmacies'], pending: false,
    });
  }

  // ── Amazon purchases (~weekly) ────────────────────────────────────────────
  for (let i = 0; i < 10; i++) {
    transactions.push({
      user_id: userId, account_id: visa.id,
      date: daysAgo(randomBetween(0, 89, 0)),
      amount: -randomBetween(14, 120),
      description: 'AMZN*MKTP CA', merchant_name: 'Amazon',
      category: 'Shopping', raw_category: ['shops'], pending: false,
    });
  }

  // ── Occasional shopping ────────────────────────────────────────────────────
  const shops = [
    { name: 'CANADIAN TIRE #0284', merchant: 'Canadian Tire', cat: 'Shopping' },
    { name: 'INDIGO BOOKS #412', merchant: 'Indigo', cat: 'Shopping' },
    { name: 'SPORT CHEK #0821', merchant: 'Sport Chek', cat: 'Shopping' },
    { name: 'UNIQLO TORONTO', merchant: 'Uniqlo', cat: 'Shopping' },
    { name: 'APPLE.COM/BILL', merchant: 'Apple', cat: 'Bills & Utilities' },
    { name: 'LCBO #0482', merchant: 'LCBO', cat: 'Food & Drink' },
    { name: 'TTC PRESTO', merchant: 'TTC / Presto', cat: 'Transportation' },
    { name: 'CINEPLEX ENT', merchant: 'Cineplex', cat: 'Entertainment' },
  ];
  for (const shop of shops) {
    if (Math.random() > 0.3) {
      transactions.push({
        user_id: userId, account_id: visa.id,
        date: daysAgo(randomBetween(0, 89, 0)),
        amount: -randomBetween(15, 180),
        description: shop.name, merchant_name: shop.merchant,
        category: shop.cat, raw_category: ['shops'], pending: false,
      });
    }
  }

  // ── One pending transaction ───────────────────────────────────────────────
  transactions.push({
    user_id: userId, account_id: visa.id,
    date: daysAgo(0),
    amount: -randomBetween(20, 60),
    description: 'UBER* EATS', merchant_name: 'Uber Eats',
    category: 'Food & Drink', raw_category: ['restaurants'], pending: true,
  });

  // Sort by date descending
  transactions.sort((a: any, b: any) => b.date.localeCompare(a.date));

  // Insert in batches of 50
  let inserted = 0;
  for (let i = 0; i < transactions.length; i += 50) {
    const batch = transactions.slice(i, i + 50);
    const { error } = await supabase.from('transactions').insert(batch);
    if (error) { console.error('❌  Transaction batch error:', error.message); process.exit(1); }
    inserted += batch.length;
  }
  console.log(`   Inserted ${inserted} transactions`);

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log(`
✅  Seed complete!

   Accounts:     4  (TD Chequing, TD Savings, Wealthsimple TFSA, TD Visa)
   Transactions: ${inserted}  (~90 days of Canadian spending)
   Investments:  3  (XEQT.TO, VEQT.TO, VFV.TO)
   Goals:        3  (Emergency Fund, Europe Trip, MacBook ✅)
   Rules:        3  (Wealthsimple, Tim Hortons, Amazon)

   Open the app and run: npm start
`);
}

main().catch(err => {
  console.error('❌  Unexpected error:', err);
  process.exit(1);
});
