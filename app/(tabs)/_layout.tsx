import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography } from '@/lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabIcon({
  name,
  color,
  focused,
}: {
  name: keyof typeof Feather.glyphMap;
  color: string;
  focused: boolean;
}) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Feather name={name} size={22} color={color} />
      {focused && (
        <View
          style={{
            position: 'absolute',
            bottom: -8,
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: Colors.primary,
          }}
        />
      )}
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 72 + insets.bottom : 64,
        },
        tabBarLabelStyle: {
          fontSize: Typography.tiny,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="pie-chart" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="list" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Goals',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="target" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="grid" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
