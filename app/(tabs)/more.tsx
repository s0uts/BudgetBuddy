import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Colors, Typography, Spacing, Radius } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

interface MenuRow {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  color?: string;
  badge?: string;
}

export default function MoreScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [rulesCount, setRulesCount] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? '');
    });
    supabase.from('rules').select('id', { count: 'exact', head: true }).then(({ count }) => {
      setRulesCount(count ?? 0);
    });
  }, []);

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/auth/login');
        },
      },
    ]);
  }

  const sections: { title: string; rows: MenuRow[] }[] = [
    {
      title: 'Finance',
      rows: [
        {
          icon: 'sliders',
          label: 'Rules',
          subtitle: `${rulesCount} rule${rulesCount !== 1 ? 's' : ''} active`,
          onPress: () => router.push('/rules'),
          color: Colors.primary,
        },
        {
          icon: 'trending-up',
          label: 'Investments',
          subtitle: 'Portfolio & live prices',
          onPress: () => router.push('/investments'),
          color: Colors.gold,
        },
        {
          icon: 'link',
          label: 'Link Bank Account',
          subtitle: 'Connect via Plaid',
          onPress: () => router.push('/auth/link-bank'),
          color: Colors.success,
        },
      ],
    },
    {
      title: 'Account',
      rows: [
        {
          icon: 'user',
          label: 'Profile',
          subtitle: email,
          onPress: () => {},
          color: Colors.textSecondary,
        },
        {
          icon: 'bell',
          label: 'Notifications',
          subtitle: 'Manage alerts',
          onPress: () => {},
          color: Colors.primary,
        },
        {
          icon: 'shield',
          label: 'Privacy & Security',
          subtitle: 'Data & permissions',
          onPress: () => {},
          color: Colors.textSecondary,
        },
      ],
    },
    {
      title: 'Support',
      rows: [
        {
          icon: 'help-circle',
          label: 'Help & FAQ',
          subtitle: 'Get answers',
          onPress: () => {},
          color: Colors.info,
        },
        {
          icon: 'log-out',
          label: 'Sign Out',
          onPress: handleSignOut,
          color: Colors.danger,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {email?.[0]?.toUpperCase() ?? 'U'}
            </Text>
          </View>
          <View>
            <Text style={styles.emailText}>{email}</Text>
            <Text style={styles.planText}>BudgetBuddy Free</Text>
          </View>
        </View>

        {/* Menu sections */}
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Card>
              {section.rows.map((row, i) => (
                <TouchableOpacity
                  key={row.label}
                  onPress={row.onPress}
                  activeOpacity={0.75}
                  style={[
                    styles.row,
                    i < section.rows.length - 1 && styles.rowBorder,
                  ]}
                >
                  <View style={[styles.rowIcon, { backgroundColor: (row.color ?? Colors.textSecondary) + '20' }]}>
                    <Feather name={row.icon} size={18} color={row.color ?? Colors.textSecondary} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={[styles.rowLabel, { color: row.color === Colors.danger ? Colors.danger : Colors.textPrimary }]}>
                      {row.label}
                    </Text>
                    {row.subtitle && (
                      <Text style={styles.rowSubtitle} numberOfLines={1}>{row.subtitle}</Text>
                    )}
                  </View>
                  {row.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{row.badge}</Text>
                    </View>
                  )}
                  <Feather name="chevron-right" size={16} color={Colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ))}

        <Text style={styles.version}>BudgetBuddy v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.screen, paddingBottom: 80 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: Typography.heading3, fontWeight: '700', color: Colors.textInverse },
  emailText: { fontSize: Typography.body, fontWeight: '600', color: Colors.textPrimary },
  planText: { fontSize: Typography.caption, color: Colors.textSecondary, marginTop: 2 },

  section: { marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: Typography.caption,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: Typography.body, fontWeight: '500' },
  rowSubtitle: { fontSize: Typography.caption, color: Colors.textSecondary, marginTop: 1 },
  badge: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: Typography.tiny, fontWeight: '700', color: Colors.textInverse },
  version: {
    textAlign: 'center',
    fontSize: Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
  },
});
