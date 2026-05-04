import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Badge } from '@/components/ui/Badge';
import { Colors, Typography, Spacing } from '@/lib/theme';
import type { Transaction } from '@/lib/supabase';

interface TransactionCardProps {
  transaction: Transaction;
  onPress?: (tx: Transaction) => void;
}

function formatCurrency(amount: number, currency = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
}

function getMerchantInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function getCategoryIcon(category: string | null): keyof typeof Feather.glyphMap {
  const map: Record<string, keyof typeof Feather.glyphMap> = {
    'Food & Drink': 'coffee',
    'Groceries': 'shopping-bag',
    'Shopping': 'shopping-cart',
    'Entertainment': 'film',
    'Transportation': 'map-pin',
    'Travel': 'navigation',
    'Health & Medical': 'heart',
    'Personal Care': 'user',
    'Bills & Utilities': 'zap',
    'Rent & Housing': 'home',
    'Investments': 'trending-up',
    'Transfers': 'repeat',
    'Income': 'dollar-sign',
    'Education': 'book',
    'Gifts & Donations': 'gift',
    'Business': 'briefcase',
    'Government': 'flag',
    'Other': 'more-horizontal',
  };
  return map[category ?? 'Other'] ?? 'more-horizontal';
}

export function TransactionCard({ transaction: tx, onPress }: TransactionCardProps) {
  const isCredit = tx.amount > 0;
  const displayName = tx.merchant_name ?? tx.description;
  const initials = getMerchantInitials(displayName);
  const amountFormatted = formatCurrency(tx.amount);
  const amountColor = isCredit ? Colors.success : Colors.danger;
  const amountPrefix = isCredit ? '+' : '-';

  return (
    <TouchableOpacity
      onPress={() => onPress?.(tx)}
      activeOpacity={0.75}
      style={styles.row}
    >
      {/* Merchant avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

      {/* Details */}
      <View style={styles.details}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
          <Text style={[styles.amount, { color: amountColor }]}>
            {amountPrefix}{amountFormatted}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          {tx.category ? (
            <Badge label={tx.category} />
          ) : null}
          {tx.pending && (
            <Badge
              label="Pending"
              variant="custom"
              color={Colors.warning}
              bgColor={Colors.warningLight}
            />
          )}
          {tx.is_investment && (
            <Badge
              label="Investment"
              variant="custom"
              color="#A16207"
              bgColor="#FEF9C3"
            />
          )}
        </View>
      </View>

      <Feather
        name="chevron-right"
        size={16}
        color={Colors.textTertiary}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: Typography.bodySmall,
    fontWeight: '700',
    color: Colors.primary,
  },
  details: {
    flex: 1,
    gap: Spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: Typography.body,
    fontWeight: '500',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  amount: {
    fontSize: Typography.body,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  chevron: {
    marginLeft: Spacing.xs,
  },
});
