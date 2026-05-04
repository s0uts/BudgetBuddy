import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Colors, Typography, Spacing } from '@/lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface MonthlySpending {
  month: string;   // "Jan", "Feb", etc.
  amount: number;
  isCurrent?: boolean;
}

interface SpendingBarChartProps {
  data: MonthlySpending[];
  height?: number;
}

export function SpendingBarChart({ data, height = 160 }: SpendingBarChartProps) {
  if (data.length === 0) return null;

  const maxAmount = Math.max(...data.map((d) => d.amount));

  return (
    <View style={[styles.container, { height: height + 40 }]}>
      <View style={[styles.barsRow, { height }]}>
        {data.map((item, i) => {
          const barHeightPct = maxAmount > 0 ? item.amount / maxAmount : 0;
          const barHeight = Math.max(4, barHeightPct * height);

          return (
            <View key={i} style={styles.barWrapper}>
              <View style={[styles.barBackground, { height }]}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: item.isCurrent
                        ? Colors.primary
                        : Colors.primaryLight,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.label,
                  item.isCurrent && styles.labelActive,
                ]}
              >
                {item.month}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Y-axis guide lines */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {[0.25, 0.5, 0.75, 1].map((pct) => (
          <View
            key={pct}
            style={[
              styles.guideLine,
              {
                bottom: pct * height + 24,  // 24 = label row height
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 24,
    gap: 6,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  barBackground: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  label: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  labelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  guideLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.border,
    opacity: 0.5,
  },
});
