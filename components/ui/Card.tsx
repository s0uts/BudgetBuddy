import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Colors, Radius, Spacing, Shadow } from '@/lib/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padding?: number;
  elevated?: boolean;
  accentColor?: string;  // left border accent color
}

export function Card({
  children,
  style,
  onPress,
  padding = Spacing.lg,
  elevated = false,
  accentColor,
}: CardProps) {
  const containerStyle: ViewStyle[] = [
    styles.card,
    elevated ? Shadow.md : Shadow.sm,
    { padding },
    accentColor ? { borderLeftWidth: 3, borderLeftColor: accentColor } : {},
    style ?? {},
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={containerStyle}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
