import React, { useMemo } from 'react';
import { SectionList, Text, View, StyleSheet } from 'react-native';
import { TransactionCard } from './TransactionCard';
import { Colors, Typography, Spacing } from '@/lib/theme';
import type { Transaction } from '@/lib/supabase';

interface TransactionListProps {
  transactions: Transaction[];
  onPress?: (tx: Transaction) => void;
  ListHeaderComponent?: React.ComponentType | React.ReactElement | null;
  ListEmptyComponent?: React.ComponentType | React.ReactElement | null;
}

interface Section {
  title: string;
  data: Transaction[];
}

function getSectionTitle(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';

  const diffDays = Math.floor((today.getTime() - date.getTime()) / 86400000);
  if (diffDays < 7) return 'This Week';

  return date.toLocaleDateString('en-CA', { month: 'long', day: 'numeric' });
}

function groupTransactionsByDate(transactions: Transaction[]): Section[] {
  const groups = new Map<string, Transaction[]>();

  for (const tx of transactions) {
    const title = getSectionTitle(tx.date);
    if (!groups.has(title)) groups.set(title, []);
    groups.get(title)!.push(tx);
  }

  return Array.from(groups.entries()).map(([title, data]) => ({ title, data }));
}

export function TransactionList({
  transactions,
  onPress,
  ListHeaderComponent,
  ListEmptyComponent,
}: TransactionListProps) {
  const sections = useMemo(
    () => groupTransactionsByDate(transactions),
    [transactions]
  );

  return (
    <SectionList
      sections={sections}
      keyExtractor={(tx) => tx.id}
      renderItem={({ item }) => (
        <TransactionCard transaction={item} onPress={onPress} />
      )}
      renderSectionHeader={({ section: { title } }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      contentContainerStyle={styles.content}
      stickySectionHeadersEnabled={false}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: Spacing.huge,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  sectionTitle: {
    fontSize: Typography.caption,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: 76,  // align with text (44px avatar + 16*2 padding + 12 gap)
  },
});
