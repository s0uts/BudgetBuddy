import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TransactionList } from '@/components/transactions/TransactionList';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Colors, Typography, Spacing, Radius } from '@/lib/theme';
import { db } from '@/lib/supabase';
import type { Transaction, Account } from '@/lib/supabase';

type TimeFilter = 'all' | '7d' | '30d' | '90d';
type TypeFilter = 'all' | 'debit' | 'credit';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
}

export default function TransactionsScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30d');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  useEffect(() => {
    Promise.all([
      db.transactions().select('*').order('date', { ascending: false }).limit(500),
      db.accounts().select('*'),
    ]).then(([txResult, accResult]) => {
      if (!txResult.error && txResult.data) setTransactions(txResult.data as Transaction[]);
      if (!accResult.error && accResult.data) setAccounts(accResult.data as Account[]);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = transactions;

    // Time filter
    if (timeFilter !== 'all') {
      const days = { '7d': 7, '30d': 30, '90d': 90 }[timeFilter];
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      list = list.filter((tx) => tx.date >= cutoffStr);
    }

    // Type filter
    if (typeFilter === 'debit') list = list.filter((tx) => tx.amount < 0);
    if (typeFilter === 'credit') list = list.filter((tx) => tx.amount > 0);

    // Account filter
    if (selectedAccount) list = list.filter((tx) => tx.account_id === selectedAccount);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (tx) =>
          tx.description.toLowerCase().includes(q) ||
          (tx.merchant_name ?? '').toLowerCase().includes(q) ||
          (tx.category ?? '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [transactions, timeFilter, typeFilter, selectedAccount, search]);

  const totalDebit = filtered.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalCredit = filtered.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions…"
            placeholderTextColor={Colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {/* Time pills */}
          {(['7d', '30d', '90d', 'all'] as TimeFilter[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.pill, timeFilter === t && styles.pillActive]}
              onPress={() => setTimeFilter(t)}
            >
              <Text style={[styles.pillText, timeFilter === t && styles.pillTextActive]}>
                {t === 'all' ? 'All Time' : t === '7d' ? '7 Days' : t === '30d' ? '30 Days' : '90 Days'}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.pillDivider} />
          {/* Type pills */}
          {(['all', 'debit', 'credit'] as TypeFilter[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.pill, typeFilter === t && styles.pillActive]}
              onPress={() => setTypeFilter(t)}
            >
              <Text style={[styles.pillText, typeFilter === t && styles.pillTextActive]}>
                {t === 'all' ? 'All Types' : t === 'debit' ? 'Expenses' : 'Income'}
              </Text>
            </TouchableOpacity>
          ))}
          {/* Account pills */}
          {accounts.map((acc) => (
            <TouchableOpacity
              key={acc.id}
              style={[styles.pill, selectedAccount === acc.id && styles.pillActive]}
              onPress={() =>
                setSelectedAccount(selectedAccount === acc.id ? null : acc.id)
              }
            >
              <Text style={[styles.pillText, selectedAccount === acc.id && styles.pillTextActive]}>
                {acc.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Expenses</Text>
          <Text style={[styles.summaryValue, { color: Colors.danger }]}>
            -{formatCurrency(totalDebit)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Income</Text>
          <Text style={[styles.summaryValue, { color: Colors.success }]}>
            +{formatCurrency(totalCredit)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Count</Text>
          <Text style={styles.summaryValue}>{filtered.length}</Text>
        </View>
      </View>

      {/* List */}
      <TransactionList
        transactions={filtered}
        onPress={setSelectedTx}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="inbox" size={48} color={Colors.border} />
            <Text style={styles.emptyTitle}>No transactions</Text>
            <Text style={styles.emptyBody}>
              {search ? 'Try a different search term' : 'Sync your bank to see transactions'}
            </Text>
          </View>
        }
      />

      {/* Transaction Detail Modal */}
      <Modal
        visible={selectedTx !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedTx(null)}
      >
        {selectedTx && (
          <SafeAreaView style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transaction Details</Text>
              <TouchableOpacity onPress={() => setSelectedTx(null)}>
                <Feather name="x" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <Card style={styles.txDetailCard} elevated>
                <Text style={styles.txDetailAmount} style={[
                  styles.txDetailAmount,
                  { color: selectedTx.amount > 0 ? Colors.success : Colors.danger }
                ]}>
                  {selectedTx.amount > 0 ? '+' : '-'}
                  {new Intl.NumberFormat('en-CA', {
                    style: 'currency', currency: 'CAD'
                  }).format(Math.abs(selectedTx.amount))}
                </Text>
                <Text style={styles.txDetailName}>
                  {selectedTx.merchant_name ?? selectedTx.description}
                </Text>
                <Text style={styles.txDetailDate}>
                  {new Date(selectedTx.date + 'T00:00:00').toLocaleDateString('en-CA', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </Text>
              </Card>

              <View style={styles.txDetailRows}>
                {[
                  { label: 'Description', value: selectedTx.description },
                  { label: 'Category', value: selectedTx.category ?? 'Uncategorized' },
                  { label: 'Status', value: selectedTx.pending ? 'Pending' : 'Posted' },
                  { label: 'Type', value: selectedTx.is_investment ? 'Investment' : (selectedTx.amount > 0 ? 'Income' : 'Expense') },
                ].map(({ label, value }) => (
                  <View key={label} style={styles.txDetailRow}>
                    <Text style={styles.txDetailLabel}>{label}</Text>
                    <Text style={styles.txDetailValue}>{value}</Text>
                  </View>
                ))}
              </View>

              {selectedTx.tags && selectedTx.tags.length > 0 && (
                <View style={styles.txTags}>
                  <Text style={styles.txDetailLabel}>Tags</Text>
                  <View style={styles.txTagRow}>
                    {selectedTx.tags.map((tag) => (
                      <Badge
                        key={tag}
                        label={tag}
                        variant="custom"
                        color={Colors.primary}
                        bgColor={Colors.surface}
                      />
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  header: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  title: { fontSize: Typography.heading1, fontWeight: '700', color: Colors.textPrimary },

  searchRow: { paddingHorizontal: Spacing.screen, marginBottom: Spacing.sm },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.body,
    color: Colors.textPrimary,
    padding: 0,
  },

  filtersSection: { marginBottom: Spacing.sm },
  filterScroll: { paddingHorizontal: Spacing.screen },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.xs,
  },
  pillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillText: {
    fontSize: Typography.bodySmall,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  pillTextActive: { color: Colors.textInverse },
  pillDivider: {
    width: 1,
    height: '80%',
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.xs,
    alignSelf: 'center',
  },

  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.screen,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryDivider: { width: 1, backgroundColor: Colors.border },
  summaryLabel: { fontSize: Typography.tiny, color: Colors.textSecondary, fontWeight: '500' },
  summaryValue: { fontSize: Typography.bodySmall, fontWeight: '700', color: Colors.textPrimary },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: Spacing.sm,
  },
  emptyTitle: { fontSize: Typography.subheading, fontWeight: '700', color: Colors.textPrimary },
  emptyBody: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center' },

  // Modal
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: Typography.subheading, fontWeight: '700', color: Colors.textPrimary },
  modalContent: { padding: Spacing.screen },
  txDetailCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  txDetailAmount: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  txDetailName: {
    fontSize: Typography.subheading,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  txDetailDate: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  txDetailRows: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  txDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  txDetailLabel: { fontSize: Typography.body, color: Colors.textSecondary },
  txDetailValue: { fontSize: Typography.body, fontWeight: '600', color: Colors.textPrimary },
  txTags: { marginTop: Spacing.lg, gap: Spacing.sm },
  txTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
});
