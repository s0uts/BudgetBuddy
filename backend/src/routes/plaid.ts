import { Router, Request, Response } from 'express';
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
} from 'plaid';
import { requireAuth, supabaseAdmin, type AuthenticatedRequest } from '../middleware/auth';
import { encrypt, decrypt } from '../lib/crypto';

const router = Router();
router.use(requireAuth);

const plaidEnv = process.env.PLAID_ENV ?? 'sandbox';
const plaidConfig = new Configuration({
  basePath: PlaidEnvironments[plaidEnv as keyof typeof PlaidEnvironments],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
      'PLAID-SECRET': process.env.PLAID_SECRET!,
    },
  },
});

const plaidClient = new PlaidApi(plaidConfig);

// ─── POST /api/plaid/link-token ──────────────────────────────
router.post('/link-token', async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'BudgetBuddy',
      products: [Products.Transactions],
      country_codes: [CountryCode.Ca, CountryCode.Us],
      language: 'en',
      android_package_name: 'ca.budgetbuddy.app',
      redirect_uri: undefined,
    });
    res.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error('[Plaid] link-token error', err);
    res.status(500).json({ error: 'Failed to create link token' });
  }
});

// ─── POST /api/plaid/exchange-token ─────────────────────────
router.post('/exchange-token', async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const { public_token, institution_id, institution_name } = req.body as {
    public_token: string;
    institution_id?: string;
    institution_name?: string;
  };

  if (!public_token) {
    res.status(400).json({ error: 'Missing public_token' });
    return;
  }

  try {
    const { data } = await plaidClient.itemPublicTokenExchange({ public_token });
    const encryptedAccessToken = encrypt(data.access_token);

    // Upsert into plaid_items (service role bypasses RLS)
    const { error } = await supabaseAdmin
      .from('plaid_items')
      .upsert(
        {
          user_id: userId,
          plaid_item_id: data.item_id,
          access_token_encrypted: encryptedAccessToken,
          institution_id: institution_id ?? null,
          institution_name: institution_name ?? null,
        },
        { onConflict: 'plaid_item_id' }
      );

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[Plaid] exchange-token error', err);
    res.status(500).json({ error: 'Failed to exchange token' });
  }
});

// ─── POST /api/plaid/sync ────────────────────────────────────
router.post('/sync', async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;

  try {
    // Get all plaid items for user
    const { data: items, error: itemsErr } = await supabaseAdmin
      .from('plaid_items')
      .select('*')
      .eq('user_id', userId);

    if (itemsErr) throw itemsErr;
    if (!items || items.length === 0) {
      res.json({ added: 0, modified: 0, removed: 0, message: 'No linked accounts' });
      return;
    }

    let totalAdded = 0;
    let totalModified = 0;
    let totalRemoved = 0;

    for (const item of items) {
      const accessToken = decrypt(item.access_token_encrypted);
      let cursor: string | undefined = item.cursor ?? undefined;
      let hasMore = true;

      while (hasMore) {
        const { data } = await plaidClient.transactionsSync({
          access_token: accessToken,
          cursor,
          count: 500,
        });

        hasMore = data.has_more;
        cursor = data.next_cursor;

        // Sync accounts
        for (const plaidAcc of data.accounts ?? []) {
          await supabaseAdmin.from('accounts').upsert(
            {
              user_id: userId,
              plaid_account_id: plaidAcc.account_id,
              name: `${plaidAcc.official_name ?? plaidAcc.name} ***${plaidAcc.mask ?? ''}`,
              type: mapPlaidAccountType(plaidAcc.type, plaidAcc.subtype),
              balance: plaidAcc.balances.current ?? plaidAcc.balances.available ?? 0,
              currency: (plaidAcc.balances.iso_currency_code ?? 'CAD').toUpperCase(),
              last_synced_at: new Date().toISOString(),
            },
            { onConflict: 'plaid_account_id' }
          );
        }

        // Get account id mapping
        const { data: accountRows } = await supabaseAdmin
          .from('accounts')
          .select('id, plaid_account_id')
          .eq('user_id', userId);
        const accountMap = new Map(accountRows?.map((a) => [a.plaid_account_id, a.id]) ?? []);

        // Added transactions
        for (const tx of data.added) {
          await supabaseAdmin.from('transactions').upsert(
            {
              user_id: userId,
              account_id: accountMap.get(tx.account_id) ?? null,
              plaid_transaction_id: tx.transaction_id,
              date: tx.date,
              amount: -tx.amount, // Plaid: positive = debit; we: negative = debit
              description: tx.name,
              merchant_name: tx.merchant_name ?? null,
              raw_category: tx.personal_finance_category
                ? [tx.personal_finance_category.primary, tx.personal_finance_category.detailed]
                : (tx.category ?? null),
              pending: tx.pending,
              category: null, // will be categorized by rules engine
            },
            { onConflict: 'plaid_transaction_id' }
          );
          totalAdded++;
        }

        // Modified transactions
        for (const tx of data.modified) {
          await supabaseAdmin
            .from('transactions')
            .update({
              amount: -tx.amount,
              description: tx.name,
              merchant_name: tx.merchant_name ?? null,
              pending: tx.pending,
            })
            .eq('plaid_transaction_id', tx.transaction_id)
            .eq('user_id', userId);
          totalModified++;
        }

        // Removed transactions
        for (const tx of data.removed) {
          await supabaseAdmin
            .from('transactions')
            .delete()
            .eq('plaid_transaction_id', tx.transaction_id)
            .eq('user_id', userId);
          totalRemoved++;
        }
      }

      // Update cursor
      await supabaseAdmin
        .from('plaid_items')
        .update({ cursor, last_synced_at: new Date().toISOString() })
        .eq('id', item.id);
    }

    res.json({ added: totalAdded, modified: totalModified, removed: totalRemoved });
  } catch (err) {
    console.error('[Plaid] sync error', err);
    res.status(500).json({ error: 'Sync failed' });
  }
});

function mapPlaidAccountType(type: string, subtype?: string | null): string {
  const sub = (subtype ?? '').toLowerCase();
  switch (type.toLowerCase()) {
    case 'depository':
      if (sub.includes('saving')) return 'saving';
      return 'spending';
    case 'credit':
      return 'borrowing';
    case 'loan':
    case 'mortgage':
      return 'borrowing';
    case 'investment':
    case 'brokerage':
      return 'investing';
    default:
      return 'spending';
  }
}

export { router as plaidRouter };
