import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PositionCard } from '@/components/investments/PositionCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Colors, Typography, Spacing } from '@/lib/theme';
import { db } from '@/lib/supabase';
import { stocksApi } from '@/lib/api';
import type { Investment, Account } from '@/lib/supabase';

export default function InvestmentsScreen() {
  const router = useRouter();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingPrices, setUpdatingPrices] = useState(false);

  async function loadData() {
    const [invResult, accResult] = await Promise.all([
      db.investments().select('*').order('ticker'),
      db.accounts().select('*').eq('type', 'investing'),
    ]);
    if (!invResult.error && invResult.data) setInvestments(invResult.data as Investment[]);
    if (!accResult.error && accResult.data) setAccounts(accResult.data as Account[]);
  }

  async function refreshPrices() {
    if (investments.length === 0) return;
    setUpdatingPrices(true);
    try {
      const tickers = [...new Set(investments.map((i) => i.ticker))];
      const quotes = await stocksApi.getBatch(tickers);

      // Update prices in Supabase
      await Promise.all(
        quotes.map((q) =>
          db.investments()
            .update({
              current_price: q.price,
              last_price_fetch: new Date().toISOString(),
            })
            .eq('ticker', q.ticker)
        )
      );

      // Update local state
      setInvestments((prev) =>
        prev.map((inv) => {
          const quote = quotes.find((q) => q.ticker === inv.ticker);
          return quote
            ? { ...inv, current_price: quote.price, last_price_fetch: new Date().toISOString() }
            : inv;
        })
      );
    } catch {
      Alert.alert('Price update failed', 'Could not fetch live prices. Try again later.');
    } finally {
      setUpdatingPrices(false);
    }
  }

  useEffect(() => {
    loadData()
      .then(() => refreshPrices())
      .finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    await refreshPrices();
    setRefreshing(false);
  }, [investments]);

  // Portfolio stats
  const totalValue = investments.reduce((s, i) => s + (i.current_price ?? 0) * i.shares, 0);
  const totalCost = investments.reduce((s, i) => s + (i.avg_cost ?? 0) * i.shares, 0);
  const totalGainLoss = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
  const isGain = totalGainLoss >= 0;

  function formatCurrency(n: number) {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 2,
    }).format(n);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  // Group by account
  const byAccount = accounts.map((acc) => ({
    account: acc,
    positions: investments.filter((i) => i.account_id === acc.id),
  }));
  const unlinked = investments.filter((i) => !i.account_id);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Portfolio summary */}
        {investments.length > 0 && (
          <Card style={styles.summaryCard} elevated>
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>Portfolio Value</Text>
                <Text style={styles.summaryValue}>{formatCurrency(totalValue)}</Text>
              </View>
              <View style={styles.summaryRight}>
                <View style={styles.gainRow}>
                  <Feather
                    name={isGain ? 'trending-up' : 'trending-down'}
                    size={16}
                    color={isGain ? Colors.gold : Colors.danger}
                  />
                  <Text style={[styles.gainText, { color: isGain ? Colors.gold : Colors.danger }]}>
                    {isGain ? '+' : ''}{formatCurrency(totalGainLoss)}
                  </Text>
                </View>
                <Text style={[styles.gainPct, { color: isGain ? Colors.gold : Colors.danger }]}>
                  {totalGainPct >= 0 ? '+' : ''}{totalGainPct.toFixed(2)}%
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={refreshPrices}
              disabled={updatingPrices}
            >
              {updatingPrices ? (
                <ActivityIndicator size="small" color={Colors.primaryLight} />
              ) : (
                <Feather name="refresh-cw" size={14} color={Colors.primaryLight} />
              )}
              <Text style={styles.refreshBtnText}>
                {updatingPrices ? 'Updating prices…' : 'Refresh prices'}
              </Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Empty state */}
        {investments.length === 0 && (
          <Card style={styles.emptyCard}>
            <Feather name="trending-up" size={48} color={Colors.border} />
            <Text style={styles.emptyTitle}>No investments tracked</Text>
            <Text style={styles.emptyBody}>
              Create a rule to mark transactions as investments, or add positions manually.
            </Text>
            <Button
              label="Set Up Investment Rules"
              onPress={() => router.push('/rules/create')}
              variant="gold"
              fullWidth
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        )}

        {/* Positions by account */}
        {byAccount.filter((g) => g.positions.length > 0).map(({ account, positions }) => (
          <View key={account.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{account.name}</Text>
            {positions.map((inv) => (
              <PositionCard key={inv.id} investment={inv} />
            ))}
          </View>
        ))}

        {unlinked.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Other Positions</Text>
            {unlinked.map((inv) => (
              <PositionCard key={inv.id} investment={inv} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.screen, paddingBottom: 80 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  summaryCard: {
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  summaryLabel: { fontSize: Typography.caption, color: Colors.textTertiary },
  summaryValue: { fontSize: Typography.heading2, fontWeight: '700', color: Colors.textInverse },
  summaryRight: { alignItems: 'flex-end', gap: 4 },
  gainRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gainText: { fontSize: Typography.body, fontWeight: '700' },
  gainPct: { fontSize: Typography.caption, fontWeight: '600' },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
  },
  refreshBtnText: { fontSize: Typography.caption, color: Colors.primaryLight, fontWeight: '600' },

  section: { gap: Spacing.sm, marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: Typography.subheading,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },

  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  emptyTitle: { fontSize: Typography.subheading, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.sm },
  emptyBody: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
