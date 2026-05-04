import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Colors, Typography, Spacing, Radius } from '@/lib/theme';
import { db } from '@/lib/supabase';
import type { Rule } from '@/lib/supabase';

export default function RulesListScreen() {
  const router = useRouter();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadRules() {
    const { data, error } = await db.rules()
      .select('*')
      .order('priority', { ascending: true });
    if (!error && data) setRules(data as Rule[]);
  }

  useEffect(() => {
    loadRules().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRules();
    setRefreshing(false);
  }, []);

  async function toggleRule(rule: Rule) {
    await db.rules().update({ enabled: !rule.enabled }).eq('id', rule.id);
    setRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r))
    );
  }

  async function deleteRule(rule: Rule) {
    Alert.alert('Delete Rule', `Delete "${rule.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await db.rules().delete().eq('id', rule.id);
          setRules((prev) => prev.filter((r) => r.id !== rule.id));
        },
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={rules}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Rules</Text>
              <Text style={styles.subtitle}>
                {rules.length} rule{rules.length !== 1 ? 's' : ''}, runs in priority order
              </Text>
            </View>
            <Button
              label="New Rule"
              onPress={() => router.push('/rules/create')}
              variant="primary"
              size="sm"
              icon={<Feather name="plus" size={14} color={Colors.textInverse} />}
            />
          </View>
        }
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Feather name="sliders" size={48} color={Colors.border} />
            <Text style={styles.emptyTitle}>No rules yet</Text>
            <Text style={styles.emptyBody}>
              Rules automatically categorize your transactions. Try describing one in plain English!
            </Text>
            <Button
              label="Create Your First Rule"
              onPress={() => router.push('/rules/create')}
              variant="primary"
              fullWidth
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        }
        renderItem={({ item: rule, index }) => (
          <Card style={styles.ruleCard} onPress={() => router.push(`/rules/${rule.id}`)}>
            {/* Priority badge */}
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityText}>#{index + 1}</Text>
            </View>

            <View style={styles.ruleMain}>
              <View style={styles.ruleMeta}>
                <Text style={styles.ruleName}>{rule.name}</Text>
                {rule.description && (
                  <Text style={styles.ruleDesc} numberOfLines={2}>{rule.description}</Text>
                )}
                <View style={styles.ruleStats}>
                  <Text style={styles.ruleStatText}>
                    {rule.conditions.length} condition{rule.conditions.length !== 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.ruleStatDot}>·</Text>
                  <Text style={styles.ruleStatText}>
                    {rule.actions.length} action{rule.actions.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.ruleActions}>
                <Switch
                  value={rule.enabled}
                  onValueChange={() => toggleRule(rule)}
                  trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                  thumbColor={rule.enabled ? Colors.primary : Colors.textTertiary}
                />
                <TouchableOpacity
                  onPress={() => deleteRule(rule)}
                  style={styles.deleteBtn}
                >
                  <Feather name="trash-2" size={16} color={Colors.textTertiary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Condition preview */}
            {rule.conditions.length > 0 && (
              <View style={styles.conditionPreview}>
                <Feather name="filter" size={12} color={Colors.textSecondary} />
                <Text style={styles.conditionText} numberOfLines={1}>
                  {rule.conditions.map((c) =>
                    `${c.field} ${c.operator} "${c.value}"`
                  ).join(' AND ')}
                </Text>
              </View>
            )}
          </Card>
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.screen, paddingBottom: 80 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  title: { fontSize: Typography.heading1, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: Typography.body, color: Colors.textSecondary, marginTop: 2 },

  ruleCard: { padding: Spacing.lg, gap: Spacing.sm },
  priorityBadge: {
    position: 'absolute',
    top: -8,
    right: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  priorityText: { fontSize: Typography.tiny, fontWeight: '700', color: Colors.textInverse },
  ruleMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  ruleMeta: { flex: 1, marginRight: Spacing.md },
  ruleName: { fontSize: Typography.body, fontWeight: '700', color: Colors.textPrimary },
  ruleDesc: { fontSize: Typography.bodySmall, color: Colors.textSecondary, marginTop: 2 },
  ruleStats: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xs },
  ruleStatText: { fontSize: Typography.caption, color: Colors.primary, fontWeight: '600' },
  ruleStatDot: { color: Colors.textTertiary },
  ruleActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  deleteBtn: { padding: Spacing.xs },
  conditionPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  conditionText: { fontSize: Typography.tiny, color: Colors.textSecondary, flex: 1, fontFamily: 'monospace' },

  sep: { height: Spacing.sm },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  emptyTitle: { fontSize: Typography.subheading, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.sm },
  emptyBody: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
