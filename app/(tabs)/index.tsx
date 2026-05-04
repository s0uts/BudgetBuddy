import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Colors, Typography, Spacing, Radius } from '@/lib/theme';
import { supabase, db } from '@/lib/supabase';
import { plaidApi } from '@/lib/api';
import type { Account } from '@/lib/supabase';

type AccountGroup = {
  type: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  accounts: Account[];
  total: number;
};

function formatCurrency(amount: number, currency = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

const ACCOUNT_TYPE_META: Record<string, { label: string; icon: keyof typeof Feather.glyphMap; color: string }> = {
  spending:   { label: 'Spending',   icon: 'credit-card',  color: Colors.primary },
  saving:     { label: 'Saving',     icon: 'save',         color: Colors.success },
  investing:  { label: 'Investing',  icon: 'trending-up',  color: Colors.gold },
  borrowing:  { label: 'Borrowing',  icon: 'alert-circle', color: Colors.danger },
};

export default function OverviewScreen() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [user, setUser] = useState<{ email?: string } | null>(null);

  async function loadAccounts() {
    const { data, error } = await db.accounts()
      .select('*')
      .order('type', { ascending: true });
    if (!error && data) setAccounts(data as Account[]);
  }

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  }

  useEffect(() => {
    Promise.all([loadAccounts(), loadUser()]).finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAccounts();
    setRefreshing(false);
  }, []);

  async function handleSync() {
    setSyncing(true);
    try {
      await plaidApi.sync();
      await loadAccounts();
    } catch (e) {
      // user hasn't linked a bank yet
    } finally {
      setSyncing(false);
    }
  }

  // Group accounts by type
  const groups: AccountGroup[] = Object.entries(ACCOUNT_TYPE_META)
    .map(([type, meta]) => {
      const accs = accounts.filter((a) => a.type === type);
      const total = accs.reduce((sum, a) => {
        return sum + (type === 'borrowing' ? -a.balance : a.balance);
      }, 0);
      return { type, ...meta, accounts: accs, total };
    })
    .filter((g) => g.accounts.length > 0);

  const netWorth = accounts.reduce((sum, a) => {
    return sum + (a.type === 'borrowing' ? -a.balance : a.balance);
  }, 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const firstName = user?.email?.split('@')[0] ?? 'there';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}, {firstName}</Text>
            <Text style={styles.subtitle}>Here's your financial snapshot</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => router.push('/more')}
          >
            <Text style={styles.avatarText}>
              {firstName[0]?.toUpperCase() ?? 'U'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Net Worth Card */}
        <Card style={styles.netWorthCard} elevated>
          <Text style={styles.netWorthLabel}>Net Worth</Text>
          <Text style={styles.netWorthValue}>{formatCurrency(netWorth)}</Text>
          <View style={styles.netWorthRow}>
            <Feather
              name={netWorth >= 0 ? 'trending-up' : 'trending-down'}
              size={14}
              color={Colors.gold}
            />
            <Text style={styles.netWorthSubtext}>
              {accounts.length === 0
                ? 'Link your bank to get started'
                : `Across ${accounts.length} account${accounts.length !== 1 ? 's' : ''}`}
            </Text>
          </View>
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Feather name="refresh-cw" size={20} color={Colors.primary} />
            )}
            <Text style={styles.quickActionLabel}>Sync</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/auth/link-bank')}
          >
            <Feather name="link" size={20} color={Colors.primary} />
            <Text style={styles.quickActionLabel}>Link Bank</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/goals')}
          >
            <Feather name="target" size={20} color={Colors.primary} />
            <Text style={styles.quickActionLabel}>Goals</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/rules')}
          >
            <Feather name="sliders" size={20} color={Colors.primary} />
            <Text style={styles.quickActionLabel}>Rules</Text>
          </TouchableOpacity>
        </View>

        {/* Account Groups */}
        {groups.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Feather name="credit-card" size={40} color={Colors.border} />
            <Text style={styles.emptyTitle}>No accounts yet</Text>
            <Text style={styles.emptyBody}>
              Link your bank account to start tracking your finances
            </Text>
            <Button
              label="Link a Bank Account"
              onPress={() => router.push('/auth/link-bank')}
              variant="gold"
              fullWidth
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        ) : (
          groups.map((group) => (
            <View key={group.type} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: group.color + '20' }]}>
                  <Feather name={group.icon} size={16} color={group.color} />
                </View>
                <Text style={styles.sectionTitle}>{group.label}</Text>
                <Text style={[
                  styles.sectionTotal,
                  { color: group.type === 'borrowing' ? Colors.danger : group.color }
                ]}>
                  {group.type === 'borrowing' ? '-' : ''}{formatCurrency(Math.abs(group.total))}
                </Text>
              </View>

              {group.accounts.map((account) => (
                <Card
                  key={account.id}
                  style={styles.accountCard}
                  accentColor={group.color}
                >
                  <View style={styles.accountRow}>
                    <View>
                      <Text style={styles.accountName}>{account.name}</Text>
                      <Text style={styles.accountCurrency}>{account.currency}</Text>
                    </View>
                    <Text style={[
                      styles.accountBalance,
                      { color: group.type === 'borrowing' ? Colors.danger : Colors.textPrimary }
                    ]}>
                      {group.type === 'borrowing' ? '-' : ''}
                      {formatCurrency(Math.abs(account.balance), account.currency)}
                    </Text>
                  </View>
                </Card>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.screen, paddingBottom: Spacing.huge },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  greeting: {
    fontSize: Typography.heading1,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: Typography.body,
    fontWeight: '700',
    color: Colors.textInverse,
  },

  netWorthCard: {
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  netWorthLabel: {
    fontSize: Typography.caption,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  netWorthValue: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.textInverse,
    letterSpacing: -0.5,
  },
  netWorthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  netWorthSubtext: {
    fontSize: Typography.caption,
    color: Colors.gold,
    fontWeight: '500',
  },

  quickActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionLabel: {
    fontSize: Typography.tiny,
    fontWeight: '600',
    color: Colors.primary,
  },

  section: { marginBottom: Spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    flex: 1,
    fontSize: Typography.subheading,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  sectionTotal: {
    fontSize: Typography.subheading,
    fontWeight: '700',
  },

  accountCard: {
    marginBottom: Spacing.sm,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountName: {
    fontSize: Typography.body,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  accountCurrency: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  accountBalance: {
    fontSize: Typography.subheading,
    fontWeight: '700',
  },

  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: Typography.subheading,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  emptyBody: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
