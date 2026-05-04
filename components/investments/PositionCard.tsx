import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Colors, Typography, Spacing } from '@/lib/theme';
import type { Investment } from '@/lib/supabase';

interface PositionCardProps {
  investment: Investment;
}

function formatCurrency(
  amount: number,
  currency = 'CAD',
  compact = false
): string {
  if (compact && Math.abs(amount) >= 1000) {
    return `$${(amount / 1000).toFixed(2)}k`;
  }
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function PositionCard({ investment: inv }: PositionCardProps) {
  const currentPrice = inv.current_price ?? 0;
  const avgCost = inv.avg_cost ?? 0;
  const currentValue = currentPrice * inv.shares;
  const costBasis = avgCost * inv.shares;
  const gainLoss = currentValue - costBasis;
  const gainLossPct = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
  const isGain = gainLoss >= 0;

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.tickerBlock}>
          <Text style={styles.ticker}>{inv.ticker}</Text>
          <Text style={styles.shares}>{inv.shares.toFixed(4)} shares</Text>
        </View>
        <View style={styles.valueBlock}>
          <Text style={styles.currentValue}>
            {formatCurrency(currentValue, inv.currency)}
          </Text>
          <View style={styles.gainRow}>
            <Feather
              name={isGain ? 'trending-up' : 'trending-down'}
              size={12}
              color={isGain ? Colors.gold : Colors.danger}
            />
            <Text style={[styles.gainText, { color: isGain ? Colors.gold : Colors.danger }]}>
              {isGain ? '+' : ''}{formatCurrency(gainLoss, inv.currency, true)}
              {' '}({gainLossPct >= 0 ? '+' : ''}{gainLossPct.toFixed(2)}%)
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.detailRow}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Avg Cost</Text>
          <Text style={styles.detailValue}>
            {formatCurrency(avgCost, inv.currency)}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Current Price</Text>
          <Text style={styles.detailValue}>
            {formatCurrency(currentPrice, inv.currency)}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Cost Basis</Text>
          <Text style={styles.detailValue}>
            {formatCurrency(costBasis, inv.currency)}
          </Text>
        </View>
      </View>

      {inv.last_price_fetch && (
        <Text style={styles.lastUpdated}>
          Updated {new Date(inv.last_price_fetch).toLocaleTimeString('en-CA', {
            hour: '2-digit', minute: '2-digit',
          })}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tickerBlock: {
    gap: 2,
  },
  ticker: {
    fontSize: Typography.subheading,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  shares: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
  },
  valueBlock: {
    alignItems: 'flex-end',
    gap: 4,
  },
  currentValue: {
    fontSize: Typography.subheading,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  gainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gainText: {
    fontSize: Typography.caption,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: Spacing.md,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  detailLabel: {
    fontSize: Typography.tiny,
    color: Colors.textTertiary,
    fontWeight: '500',
    textAlign: 'center',
  },
  detailValue: {
    fontSize: Typography.bodySmall,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  lastUpdated: {
    fontSize: Typography.tiny,
    color: Colors.textTertiary,
    textAlign: 'right',
  },
});
