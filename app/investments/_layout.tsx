import { Stack } from 'expo-router';
import { Colors, Typography } from '@/lib/theme';

export default function InvestmentsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.primary,
        headerTitleStyle: {
          fontSize: Typography.subheading,
          fontWeight: '700',
          color: Colors.textPrimary,
        },
        headerShadowVisible: false,
        headerBackTitle: '',
      }}
    />
  );
}
