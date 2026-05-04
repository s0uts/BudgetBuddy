import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors, Typography, Spacing } from '@/lib/theme';
import { plaidApi } from '@/lib/api';

WebBrowser.maybeCompleteAuthSession();

const INSTITUTION_LOGOS: { name: string; icon: keyof typeof Feather.glyphMap }[] = [
  { name: 'TD Bank', icon: 'credit-card' },
  { name: 'RBC', icon: 'credit-card' },
  { name: 'BMO', icon: 'credit-card' },
  { name: 'Scotiabank', icon: 'credit-card' },
  { name: 'CIBC', icon: 'credit-card' },
  { name: 'Tangerine', icon: 'credit-card' },
];

export default function LinkBankScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLinkBank() {
    setLoading(true);
    try {
      const { link_token } = await plaidApi.createLinkToken();

      // In a production app, use react-native-plaid-link-sdk
      // For sandbox testing, we open a WebView flow
      const result = await WebBrowser.openAuthSessionAsync(
        `https://cdn.plaid.com/link/v2/stable/link.html?isWebview=true&token=${link_token}`,
        'budgetbuddy://'
      );

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const publicToken = url.searchParams.get('public_token');
        const institutionId = url.searchParams.get('institution_id') ?? undefined;
        const institutionName = url.searchParams.get('institution_name') ?? undefined;

        if (publicToken) {
          await plaidApi.exchangeToken(publicToken, institutionId, institutionName);
          await plaidApi.sync();
          Alert.alert('Success!', 'Your bank has been linked and transactions synced.', [
            { text: 'Done', onPress: () => router.back() },
          ]);
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Could not link bank. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Button
          label=""
          onPress={() => router.back()}
          variant="ghost"
          icon={<Feather name="arrow-left" size={22} color={Colors.textPrimary} />}
        />
        <Text style={styles.headerTitle}>Link Bank Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Plaid badge */}
        <View style={styles.plaidBadge}>
          <Feather name="shield" size={20} color={Colors.success} />
          <Text style={styles.plaidText}>Secured by Plaid</Text>
        </View>

        <Text style={styles.title}>Connect your bank</Text>
        <Text style={styles.subtitle}>
          BudgetBuddy uses Plaid to securely connect to 12,000+ Canadian and US financial institutions.
          Your credentials are never stored by us.
        </Text>

        {/* Supported banks */}
        <View style={styles.bankGrid}>
          {INSTITUTION_LOGOS.map((b) => (
            <Card key={b.name} style={styles.bankCard}>
              <Feather name={b.icon} size={24} color={Colors.primary} />
              <Text style={styles.bankName}>{b.name}</Text>
            </Card>
          ))}
        </View>

        {/* Security notes */}
        <Card style={styles.securityCard}>
          {[
            { icon: 'lock' as const, text: 'Bank-level 256-bit encryption' },
            { icon: 'eye-off' as const, text: 'Read-only access — we cannot move money' },
            { icon: 'shield' as const, text: 'Your credentials go directly to Plaid' },
          ].map(({ icon, text }) => (
            <View key={text} style={styles.securityRow}>
              <Feather name={icon} size={16} color={Colors.success} />
              <Text style={styles.securityText}>{text}</Text>
            </View>
          ))}
        </Card>

        <Button
          label={loading ? 'Connecting…' : 'Connect Bank Account'}
          onPress={handleLinkBank}
          loading={loading}
          variant="primary"
          fullWidth
          size="lg"
          style={{ marginTop: Spacing.xxl }}
          icon={<Feather name="link" size={18} color={Colors.textInverse} />}
        />

        <Text style={styles.disclaimer}>
          By connecting, you agree to Plaid's Terms of Service and Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: Typography.subheading, fontWeight: '700', color: Colors.textPrimary },
  content: { flex: 1, padding: Spacing.screen },

  plaidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: Colors.successLight,
    borderRadius: Spacing.xxl,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    marginBottom: Spacing.xl,
  },
  plaidText: { fontSize: Typography.caption, fontWeight: '700', color: Colors.success },

  title: { fontSize: Typography.heading2, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  subtitle: { fontSize: Typography.body, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.xxl },

  bankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  bankCard: {
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.xs,
    minWidth: '30%',
    flex: 1,
  },
  bankName: { fontSize: Typography.tiny, color: Colors.textSecondary, textAlign: 'center', fontWeight: '600' },

  securityCard: { gap: Spacing.md, backgroundColor: Colors.surface },
  securityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  securityText: { fontSize: Typography.bodySmall, color: Colors.textSecondary, flex: 1 },

  disclaimer: {
    textAlign: 'center',
    fontSize: Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.md,
    lineHeight: 18,
  },
});
