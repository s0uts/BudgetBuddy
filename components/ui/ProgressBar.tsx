import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ViewStyle, Animated } from 'react-native';
import { Colors, Radius } from '@/lib/theme';

interface ProgressBarProps {
  progress: number;       // 0–1
  color?: string;
  trackColor?: string;
  height?: number;
  animated?: boolean;
  style?: ViewStyle;
}

export function ProgressBar({
  progress,
  color = Colors.primary,
  trackColor = Colors.surface,
  height = 8,
  animated = true,
  style,
}: ProgressBarProps) {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.timing(animatedWidth, {
        toValue: clampedProgress,
        duration: 600,
        useNativeDriver: false,
      }).start();
    } else {
      animatedWidth.setValue(clampedProgress);
    }
  }, [clampedProgress, animated]);

  return (
    <View
      style={[
        styles.track,
        { height, backgroundColor: trackColor, borderRadius: height / 2 },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            height,
            borderRadius: height / 2,
            backgroundColor: color,
            width: animatedWidth.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    overflow: 'hidden',
  },
  fill: {},
});
