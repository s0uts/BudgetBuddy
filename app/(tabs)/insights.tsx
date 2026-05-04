import React, { useEffect, useState, useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { SunburstChart, type SunburstNode } from '@/components/charts/SunburstChart';
import { SpendingBarChart, type MonthlySpending } from '@/components/charts/SpendingBarChart';
import { Colors, Typography, Spacing } from '@/lib/theme';
import { db } from '@/lib/supabase';
import type { Transaction } from '@/lib/supabase';

interface CategoryTotal {
  category: string;
  amount: number;
  pct: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function buildSunburstData(categories: CategoryTotal[]): SunburstNode {
  return {
    name: 'Spending',
    children: categories.map((c) => ({
      name: c.category,
      value: c.amount,
    })),
  };
}

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function InsightsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  useEffect(() => {
    db.transactions()
      .select('*')
      .gte('date', new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1).toISOString().split('T')[0])
      .order('date', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setTransactions(data as Transaction[]);
      })
      .finally(() => setLoading(false));
  }, []);

  const currentMonthKey = getMonthKey(new Date().toISOString());

  const currentMonthExpenses = useMemo(() => {
    return transactions.filter(
      (tx) =>
        getMonthKey(tx.date) === currentMonthKey &&
        tx.amount < 0 &&
        !tx.is_investment &&
        tx.category !== 'Transfers' &&
        tx.category !== 'Income'
    );
  }, [transactions, currentMonthKey]);

  const categoryTotals = useMemo((): CategoryTotal[] => {
    const totals = new Map<string, number>();
    for (const tx of currentMonthExpenses) {
      const cat = tx.category ?? 'Other';
      totals.set(cat, (totals.get(cat) ?? 0) + Math.abs(tx.amount));
    }
    const totalSpent = Array.from(totals.values()).reduce((a, b) => a + b, 0);
    return Array.from(totals.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        pct: totalSpent > 0 ? amount / totalSpent : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [currentMonthExpenses]);

  const totalSpent = categoryTotals.reduce((s, c) => s + c.amount, 0);

  const monthlyData = useMemo((): MonthlySpending[] => {
    const monthTotals = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.amount < 0 && tx.category !== 'Transfers' && tx.category !== 'Income') {
        const key = getMonthKey(tx.date);
        monthTotals.set(key, (monthTotals.get(key) ?? 0) + Math.abs(tx.amount));
      }
    }
    return Array.from(monthTotals.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, amount]) => {
        const [, month] = key.split('-');
        return {
          month: MONTH_NAMES[parseInt(month, 10) - 1],
          amount,
          isCurrent: key === currentMonthKey,
        };
      });
  }, [transactions, currentMonthKey]);

  const sunburstData = useMemo(
    () => buildSunburstData(categoryTotals),
    [categoryTotals]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Insights</Text>
          <Text style={styles.subtitle}>
            {new Date().toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}
          </Text>
        </View>

        {/* Sunburst chart */}
        <Card style={styles.chartCard} elevated>
          <Text style={styles.cardTitle}>Spending Breakdown</Text>
          {categoryTotals.length === 0 ? (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyText}>No spending data yet</Text>
            </View>
          ) : (
            <SunburstChart
              data={sunburstData}
              selectedCategory={selectedCategory}
              onSelectCategory={(name) =>
                setSelectedCategory(selectedCategory === name ? undefined : name)
              }
              totalLabel="Spent"
              totalValue={formatCurrency(totalSpent)}
            />
          )}

          {/* Category chips */}
          {categoryTotals.length > 0 && (
            <View style={styles.chips}>
              {categoryTotals.slice(0, 6).map((c) => (
                <TouchableOpacity
                  key={c.category}
                  onPress={() =>
                    setSelectedCategory(
                      selectedCategory === c.category ? undefined : c.category
                    )
                  }
                >
                  <Badge
                    label={c.category}
                    style={
                      selectedCategory === c.category
                        ? { opacity: 1 }
                        : selectedCategory
                        ? { opacity: 0.5 }
                        : {}
                    }
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>

        {/* Monthly bar chart */}
        <Card style={styles.sectionCard}>
          <Text style={styles.cardTitle}>Monthly Spending</Text>
          {monthlyData.length === 0 ? (
            <Text style={styles.emptyText}>Not enough data yet</Text>
          ) : (
            <SpendingBarChart data={monthlyData} />
          )}
        </Card>

        {/* Category list */}
        <Card style={styles.sectionCard}>
          <Text style={styles.cardTitle}>By Category</Text>
          {categoryTotals.length === 0 ? (
            <Text style={styles.emptyText}>No spending this month</Text>
          ) : (
            categoryTotals.map((c) => (
              <View key={c.category} style={styles.categoryRow}>
                <View style={styles.categoryLeft}>
                  <Badge label={c.category} />
                  <Text style={styles.categoryPct}>{(c.pct * 100).toFixed(0)}%</Text>
                </View>
                <View style={styles.categoryRight}>
                  <Text style={styles.categoryAmount}>{formatCurrency(c.amount)}</Text>
                </View>
                <ProgressBar
                  progress={c.pct}
                  style={styles.categoryBar}
                  height={4}
                />
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.screen, paddingBottom: 80 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  header: { paddingTop: Spacing.xl, paddingBottom: Spacing.xl },
  title: { fontSize: Typography.heading1, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: Typography.body, color: Colors.textSecondary, marginTop: 2 },

  chartCard: { marginBottom: Spacing.lg, alignItems: 'center', gap: Spacing.lg },
  cardTitle: {
    alignSelf: 'flex-start',
    fontSize: Typography.subheading,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptyChart: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: Typography.body, color: Colors.textSecondary },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
  },

  sectionCard: { marginBottom: Spacing.lg, gap: Spacing.md },
  categoryRow: { gap: Spacing.xs, marginBottom: Spacing.sm },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  categoryRight: { alignItems: 'flex-end' },
  categoryPct: { fontSize: Typography.caption, color: Colors.textSecondary },
  categoryAmount: { fontSize: Typography.body, fontWeight: '700', color: Colors.textPrimary },
  categoryBar: { marginTop: 4 },
});
