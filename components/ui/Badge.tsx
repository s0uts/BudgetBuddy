import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '@/lib/theme';

// Category → color mapping
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Food & Drink':     { bg: '#FEE2E2', text: '#DC2626' },
  'Groceries':        { bg: '#D1FAE5', text: '#059669' },
  'Shopping':         { bg: '#DBEAFE', text: '#1D4ED8' },
  'Entertainment':    { bg: '#EDE9FE', text: '#7C3AED' },
  'Transportation':   { bg: '#FEF3C7', text: '#B45309' },
  'Travel':           { bg: '#E0F2FE', text: '#0369A1' },
  'Health & Medical': { bg: '#FCE7F3', text: '#BE185D' },
  'Personal Care':    { bg: '#F3E8FF', text: '#7E22CE' },
  'Bills & Utilities':{ bg: '#F1F5F9', text: '#475569' },
  'Rent & Housing':   { bg: '#F0FDF4', text: '#15803D' },
  'Investments':      { bg: '#FEF9C3', text: '#A16207' },
  'Transfers':        { bg: '#F5F3FF', text: '#6D28D9' },
  'Income':           { bg: '#D1FAE5', text: '#047857' },
  'Education':        { bg: '#EFF6FF', text: '#1E40AF' },
  'Gifts & Donations':{ bg: '#FDF2F8', text: '#9D174D' },
  'Business':         { bg: '#F8FAFC', text: '#334155' },
  'Government':       { bg: '#F0FDF4', text: '#166534' },
  'Other':            { bg: Colors.surface, text: Colors.textSecondary },
};

interface BadgeProps {
  label: string;
  variant?: 'category' | 'custom';
  color?: string;
  bgColor?: string;
  style?: ViewStyle;
}

export function Badge({ label, variant = 'category', color, bgColor, style }: BadgeProps) {
  const colors =
    variant === 'category'
      ? (CATEGORY_COLORS[label] ?? { bg: Colors.surface, text: Colors.textSecondary })
      : { bg: bgColor ?? Colors.surface, text: color ?? Colors.textSecondary };

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, style]}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: Typography.caption,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export { CATEGORY_COLORS };
