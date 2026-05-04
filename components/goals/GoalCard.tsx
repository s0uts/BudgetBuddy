import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/lib/theme';
import type { Goal } from '@/lib/supabase';

const RING_SIZE = 72;
const RING_STROKE = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface GoalCardProps {
  goal: Goal;
  onPress?: (goal: Goal) => void;
}

function formatCurrency(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${amount.toFixed(0)}`;
}

function getDaysRemaining(targetDate: string | null): string | null {
  if (!targetDate) return null;
  const diff = new Date(targetDate).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Today!';
  if (days === 1) return '1 day left';
  if (days < 30) return `${days} days left`;
  const months = Math.round(days / 30);
  return `${months} mo left`;
}

export function GoalCard({ goal, onPress }: GoalCardProps) {
  const progress = goal.target_amount > 0
    ? Math.min(1, goal.current_amount / goal.target_amount)
    : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);
  const daysRemaining = getDaysRemaining(goal.target_date);
  const isComplete = progress >= 1;

  return (
    <TouchableOpacity
      onPress={() => onPress?.(goal)}
      activeOpacity={0.85}
      style={styles.card}
    >
      {/* Progress ring */}
      <View style={styles.ringWrapper}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          {/* Track */}
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={Colors.border}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          {/* Fill */}
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={isComplete ? Colors.success : (goal.color ?? Colors.gold)}
            strokeWidth={RING_STROKE}
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </Svg>
        {/* Percentage label in ring */}
        <View style={styles.ringLabel}>
          <Text style={styles.ringPercent}>
            {isComplete ? '✓' : `${Math.round(progress * 100)}%`}
          </Text>
        </View>
      </View>

      {/* Text */}
      <View style={styles.textBlock}>
        <Text style={styles.goalName} numberOfLines={1}>{goal.name}</Text>
        <Text style={styles.amounts}>
          <Text style={styles.current}>{formatCurrency(goal.current_amount)}</Text>
          <Text style={styles.separator}> / </Text>
          <Text style={styles.target}>{formatCurrency(goal.target_amount)}</Text>
        </Text>
        {daysRemaining && (
          <Text style={[styles.deadline, isComplete && styles.deadlineComplete]}>
            {daysRemaining}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    ...Shadow.sm,
  },
  ringWrapper: {
    position: 'relative',
    width: RING_SIZE,
    height: RING_SIZE,
  },
  ringLabel: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPercent: {
    fontSize: Typography.caption,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  goalName: {
    fontSize: Typography.subheading,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  amounts: {
    fontSize: Typography.body,
  },
  current: {
    fontWeight: '700',
    color: Colors.gold,
  },
  separator: {
    color: Colors.textTertiary,
  },
  target: {
    color: Colors.textSecondary,
  },
  deadline: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  deadlineComplete: {
    color: Colors.success,
    fontWeight: '600',
  },
});
