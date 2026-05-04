import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Secure storage adapter — uses SecureStore on device, AsyncStorage on web
 */
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ============================================================
// Database types matching schema.sql
// ============================================================

export type AccountType = 'spending' | 'saving' | 'investing' | 'borrowing';

export interface Account {
  id: string;
  user_id: string;
  plaid_account_id: string | null;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  last_synced_at: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string | null;
  plaid_transaction_id: string | null;
  date: string;
  amount: number;
  description: string;
  merchant_name: string | null;
  category: string | null;
  raw_category: string[] | null;
  tags: string[] | null;
  is_investment: boolean;
  investment_id: string | null;
  rule_id: string | null;
  pending: boolean;
  created_at: string;
}

export interface Rule {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  priority: number;
  enabled: boolean;
  conditions: import('@/rules/types').Condition[];
  actions: import('@/rules/types').Action[];
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  funding_account_id: string | null;
  color: string;
  icon: string | null;
  created_at: string;
}

export interface Investment {
  id: string;
  user_id: string;
  account_id: string | null;
  ticker: string;
  shares: number;
  avg_cost: number | null;
  current_price: number | null;
  currency: string;
  last_price_fetch: string | null;
  created_at: string;
}

// ============================================================
// Convenience query helpers
// ============================================================

export const db = {
  accounts: () => supabase.from('accounts'),
  transactions: () => supabase.from('transactions'),
  rules: () => supabase.from('rules'),
  goals: () => supabase.from('goals'),
  investments: () => supabase.from('investments'),
};
