import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors, Typography, Spacing, Radius } from '@/lib/theme';
import { db } from '@/lib/supabase';
import type { Rule } from '@/lib/supabase';

export default function EditRuleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [rule, setRule] = useState<Rule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [priority, setPriority] = useState('100');
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    db.rules()
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          const r = data as Rule;
          setRule(r);
          setName(r.name);
          setPriority(String(r.priority));
          setEnabled(r.enabled);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    if (!rule || !name.trim()) return;
    setSaving(true);
    const { error } = await db.rules()
      .update({
        name: name.trim(),
        priority: parseInt(priority, 10) || 100,
        enabled,
      })
      .eq('id', rule.id);
    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.back();
    }
  }

  async function handleDelete() {
    Alert.alert('Delete Rule', `Delete "${rule?.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await db.rules().delete().eq('id', id);
          router.back();
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

  if (!rule) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.notFound}>Rule not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Basic fields */}
        <View style={styles.field}>
          <Text style={styles.label}>Rule Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Rule name"
            placeholderTextColor={Colors.textTertiary}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Priority (lower runs first)</Text>
          <TextInput
            style={styles.input}
            value={priority}
            onChangeText={setPriority}
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.label}>Enabled</Text>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: Colors.border, true: Colors.primaryLight }}
            thumbColor={enabled ? Colors.primary : Colors.textTertiary}
          />
        </View>

        {/* Read-only conditions */}
        <Text style={styles.sectionTitle}>Conditions</Text>
        <Card style={styles.readOnly}>
          {rule.conditions.map((c, i) => (
            <Text key={i} style={styles.monoText}>
              {c.field} {c.operator} "{c.value}"
            </Text>
          ))}
          {rule.conditions.length === 0 && (
            <Text style={styles.emptyText}>No conditions</Text>
          )}
        </Card>

        {/* Read-only actions */}
        <Text style={styles.sectionTitle}>Actions</Text>
        <Card style={styles.readOnly}>
          {rule.actions.map((a, i) => (
            <Text key={i} style={styles.monoText}>
              {a.type}
              {'category' in a ? ` → ${a.category}` : ''}
              {'tag' in a ? ` → ${a.tag}` : ''}
              {'message' in a ? ` → ${a.message}` : ''}
            </Text>
          ))}
          {rule.actions.length === 0 && (
            <Text style={styles.emptyText}>No actions</Text>
          )}
        </Card>

        <Text style={styles.editHint}>
          To change conditions or actions, delete this rule and create a new one.
        </Text>

        <View style={styles.buttonGroup}>
          <Button
            label="Save Changes"
            onPress={handleSave}
            loading={saving}
            variant="primary"
            fullWidth
          />
          <Button
            label="Delete Rule"
            onPress={handleDelete}
            variant="danger"
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.screen, paddingBottom: 80, gap: Spacing.lg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  field: { gap: Spacing.xs },
  label: {
    fontSize: Typography.caption,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: Typography.body,
    color: Colors.textPrimary,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: Typography.caption,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: -Spacing.sm,
  },
  readOnly: { gap: Spacing.xs, backgroundColor: Colors.surface },
  monoText: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  emptyText: { fontSize: Typography.bodySmall, color: Colors.textTertiary, fontStyle: 'italic' },
  editHint: { fontSize: Typography.caption, color: Colors.textTertiary, fontStyle: 'italic' },
  buttonGroup: { gap: Spacing.sm },
  notFound: { fontSize: Typography.body, color: Colors.textSecondary },
});
