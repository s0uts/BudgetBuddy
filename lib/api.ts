import { supabase } from './supabase';
import type { Rule } from '@/rules/types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new ApiError(401, 'Not authenticated');
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let errorBody: unknown;
    try {
      errorBody = await res.json();
    } catch {
      errorBody = await res.text();
    }
    throw new ApiError(res.status, `API error ${res.status}`, errorBody);
  }

  return res.json() as Promise<T>;
}

// ============================================================
// Plaid
// ============================================================

export const plaidApi = {
  createLinkToken: () =>
    request<{ link_token: string }>('POST', '/api/plaid/link-token'),

  exchangeToken: (publicToken: string, institutionId?: string, institutionName?: string) =>
    request<{ success: boolean }>('POST', '/api/plaid/exchange-token', {
      public_token: publicToken,
      institution_id: institutionId,
      institution_name: institutionName,
    }),

  sync: () =>
    request<{ added: number; modified: number; removed: number }>('POST', '/api/plaid/sync'),
};

// ============================================================
// Stocks
// ============================================================

export interface StockQuote {
  ticker: string;
  price: number;
  currency: string;
  change: number;
  changePercent: number;
  name: string;
}

export const stocksApi = {
  getQuote: (ticker: string) =>
    request<StockQuote>('GET', `/api/stocks/${encodeURIComponent(ticker)}`),

  getBatch: (tickers: string[]) =>
    request<StockQuote[]>('GET', `/api/stocks/batch?tickers=${tickers.join(',')}`),
};

// ============================================================
// Rules — AI parsing
// ============================================================

export interface ParseRuleResponse {
  rule: Omit<Rule, 'id' | 'user_id' | 'created_at'>;
  confidence: number;
  clarification?: string;
}

export const rulesApi = {
  parseNaturalLanguage: (text: string) =>
    request<ParseRuleResponse>('POST', '/api/rules/parse', { text }),
};

export { ApiError };
