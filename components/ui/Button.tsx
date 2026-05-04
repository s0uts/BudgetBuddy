import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/lib/theme';

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'gold' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const variantStyles: Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> = {
  primary: {
    container: {
      backgroundColor: Colors.primary,
      ...Shadow.sm,
    },
    text: { color: Colors.textInverse },
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: Colors.primary,
    },
    text: { color: Colors.primary },
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
    },
    text: { color: Colors.primary },
  },
  gold: {
    container: {
      backgroundColor: Colors.gold,
      ...Shadow.sm,
    },
    text: { color: Colors.textPrimary },
  },
  danger: {
    container: {
      backgroundColor: Colors.danger,
      ...Shadow.sm,
    },
    text: { color: Colors.textInverse },
  },
};

const sizeStyles: Record<ButtonSize, { container: ViewStyle; text: TextStyle }> = {
  sm: {
    container: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md },
    text: { fontSize: Typography.bodySmall },
  },
  md: {
    container: { paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.xl },
    text: { fontSize: Typography.body },
  },
  lg: {
    container: { paddingVertical: Spacing.md + 2, paddingHorizontal: Spacing.xxl },
    text: { fontSize: Typography.subheading },
  },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const vStyle = variantStyles[variant];
  const sStyle = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        vStyle.container,
        sStyle.container,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? Colors.primary : Colors.textInverse}
        />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          <Text
            style={[
              styles.text,
              vStyle.text,
              sStyle.text,
              isDisabled && styles.disabledText,
              textStyle,
            ]}
          >
            {label}
          </Text>
          {icon && iconPosition === 'right' && (
            <View style={styles.iconRight}>{icon}</View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  disabled: {
    opacity: 0.45,
  },
  disabledText: {},
  iconLeft: { marginRight: Spacing.xs },
  iconRight: { marginLeft: Spacing.xs },
});
