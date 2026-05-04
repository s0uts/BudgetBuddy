import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Colors, Typography, Spacing, Radius } from '@/lib/theme';
import { db, supabase } from '@/lib/supabase';
import { rulesApi } from '@/lib/api';
import type { Condition, Action } from '@/rules/types';
import { CATEGORIES } from '@/rules/built-in';

type CreateMode = 'ai' | 'manual';

const CONDITION_FIELDS = ['merchant', 'description', 'amount', 'account', 'date_day'] as const;
const CONDITION_OPS_TEXT = ['contains', 'not_contains', 'equals', 'starts_with', 'ends_with', 'regex'] as const;
const CONDITION_OPS_NUM = ['gt', 'lt', 'gte', 'lte', 'equals'] as const;

export default function CreateRuleScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<CreateMode>('ai');
  const [saving, setSaving] = useState(false);

  // AI mode
  const [prompt, setPrompt] = useState('');
  const [parsing, setParsing] = useState(false);
  const [previewRule, setPreviewRule] = useState<{
    name: string;
    description: string | null;
    conditions: Condition[];
    actions: Action[];
  } | null>(null);

  // Manual mode
  const [ruleName, setRuleName] = useState('');
  const [conditions, setConditions] = useState<Condition[]>([
    { field: 'description', operator: 'contains', value: '' },
  ]);
  const [actions, setActions] = useState<Action[]>([
    { type: 'set_category', category: 'Food & Drink' },
  ]);

  async function handleParseAI() {
    if (!prompt.trim()) return;
    setParsing(true);
    try {
      const { rule } = await rulesApi.parseNaturalLanguage(prompt);
      setPreviewRule(rule);
    } catch (err) {
      Alert.alert('Parse error', 'Could not understand the rule. Try rewording it.');
    } finally {
      setParsing(false);
    }
  }

  async function saveRule(rule: {
    name: string;
    description?: string | null;
    conditions: Condition[];
    actions: Action[];
  }) {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    // Get max priority
    const { data: existingRules } = await db.rules()
      .select('priority')
      .order('priority', { ascending: false })
      .limit(1);
    const maxPriority = existingRules?.[0]?.priority ?? 0;

    const { error } = await db.rules().insert({
      user_id: user!.id,
      name: rule.name,
      description: rule.description ?? null,
      priority: maxPriority + 100,
      enabled: true,
      conditions: rule.conditions,
      actions: rule.actions,
    });

    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.back();
    }
  }

  async function handleSaveAI() {
    if (!previewRule) return;
    await saveRule(previewRule);
  }

  async function handleSaveManual() {
    if (!ruleName.trim() || conditions.length === 0 || actions.length === 0) return;
    await saveRule({ name: ruleName, conditions, actions });
  }

  function addCondition() {
    setConditions((prev) => [...prev, { field: 'description', operator: 'contains', value: '' }]);
  }

  function removeCondition(i: number) {
    setConditions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateCondition(i: number, updates: Partial<Condition>) {
    setConditions((prev) =>
      prev.map((c, idx) => (idx === i ? ({ ...c, ...updates } as Condition) : c))
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Mode toggle */}
          <View style={styles.modeToggle}>
            {(['ai', 'manual'] as CreateMode[]).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                onPress={() => setMode(m)}
              >
                <Feather
                  name={m === 'ai' ? 'zap' : 'tool'}
                  size={14}
                  color={mode === m ? Colors.textInverse : Colors.textSecondary}
                />
                <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                  {m === 'ai' ? 'Describe It (AI)' : 'Build Manually'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ─── AI MODE ─── */}
          {mode === 'ai' && (
            <View style={styles.aiSection}>
              <Text style={styles.aiHint}>
                Describe what the rule should do in plain English:
              </Text>
              <View style={styles.aiExamples}>
                {[
                  'When I buy coffee, tag it as "morning"',
                  'Mark Wealthsimple transfers as investments',
                  'Rename "AMZN*MKTP CA" to Amazon',
                ].map((ex) => (
                  <TouchableOpacity
                    key={ex}
                    onPress={() => setPrompt(ex)}
                    style={styles.exampleChip}
                  >
                    <Text style={styles.exampleText}>{ex}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.aiInput}
                placeholder="When I spend money at Tim Hortons, categorize it as Food & Drink…"
                placeholderTextColor={Colors.textTertiary}
                value={prompt}
                onChangeText={setPrompt}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <Button
                label={parsing ? 'Thinking…' : 'Generate Rule'}
                onPress={handleParseAI}
                loading={parsing}
                disabled={!prompt.trim()}
                variant="primary"
                fullWidth
                icon={<Feather name="zap" size={16} color={Colors.textInverse} />}
                style={{ marginTop: Spacing.md }}
              />

              {/* Preview */}
              {previewRule && (
                <Card style={styles.previewCard} elevated>
                  <View style={styles.previewHeader}>
                    <Feather name="check-circle" size={18} color={Colors.success} />
                    <Text style={styles.previewTitle}>Rule Preview</Text>
                  </View>
                  <Text style={styles.previewName}>{previewRule.name}</Text>
                  {previewRule.description && (
                    <Text style={styles.previewDesc}>{previewRule.description}</Text>
                  )}

                  <Text style={styles.previewSectionTitle}>Conditions (ALL must match):</Text>
                  {previewRule.conditions.map((c, i) => (
                    <View key={i} style={styles.previewRow}>
                      <Feather name="filter" size={12} color={Colors.primary} />
                      <Text style={styles.previewRowText}>
                        {c.field} {c.operator} "{c.value}"
                      </Text>
                    </View>
                  ))}

                  <Text style={styles.previewSectionTitle}>Actions:</Text>
                  {previewRule.actions.map((a, i) => (
                    <View key={i} style={styles.previewRow}>
                      <Feather name="arrow-right" size={12} color={Colors.gold} />
                      <Text style={styles.previewRowText}>
                        {a.type}
                        {'category' in a ? `: ${a.category}` : ''}
                        {'tag' in a ? `: ${a.tag}` : ''}
                        {'message' in a ? `: ${a.message}` : ''}
                      </Text>
                    </View>
                  ))}

                  <View style={styles.previewActions}>
                    <Button
                      label="Save Rule"
                      onPress={handleSaveAI}
                      loading={saving}
                      variant="gold"
                      fullWidth
                    />
                    <Button
                      label="Regenerate"
                      onPress={handleParseAI}
                      variant="outline"
                      fullWidth
                    />
                  </View>
                </Card>
              )}
            </View>
          )}

          {/* ─── MANUAL MODE ─── */}
          {mode === 'manual' && (
            <View style={styles.manualSection}>
              {/* Rule name */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Rule Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Categorize Tim Hortons"
                  placeholderTextColor={Colors.textTertiary}
                  value={ruleName}
                  onChangeText={setRuleName}
                />
              </View>

              {/* Conditions */}
              <View style={styles.conditionsSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionLabel}>CONDITIONS (ALL must match)</Text>
                  <TouchableOpacity onPress={addCondition} style={styles.addBtn}>
                    <Feather name="plus" size={14} color={Colors.primary} />
                    <Text style={styles.addBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>

                {conditions.map((cond, i) => (
                  <Card key={i} style={styles.conditionCard}>
                    <View style={styles.conditionRow}>
                      {/* Field */}
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.fieldPills}>
                          {CONDITION_FIELDS.map((f) => (
                            <TouchableOpacity
                              key={f}
                              style={[styles.fieldPill, cond.field === f && styles.fieldPillActive]}
                              onPress={() => updateCondition(i, { field: f })}
                            >
                              <Text style={[styles.fieldPillText, cond.field === f && styles.fieldPillTextActive]}>
                                {f}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>

                      {conditions.length > 1 && (
                        <TouchableOpacity onPress={() => removeCondition(i)}>
                          <Feather name="x" size={16} color={Colors.danger} />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Operator */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.fieldPills}>
                        {(cond.field === 'amount' || cond.field === 'date_day'
                          ? CONDITION_OPS_NUM
                          : CONDITION_OPS_TEXT
                        ).map((op) => (
                          <TouchableOpacity
                            key={op}
                            style={[styles.fieldPill, cond.operator === op && styles.fieldPillActive]}
                            onPress={() => updateCondition(i, { operator: op as any })}
                          >
                            <Text style={[styles.fieldPillText, cond.operator === op && styles.fieldPillTextActive]}>
                              {op}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>

                    {/* Value */}
                    <TextInput
                      style={styles.conditionInput}
                      placeholder="Value…"
                      placeholderTextColor={Colors.textTertiary}
                      value={String(cond.value)}
                      onChangeText={(v) => updateCondition(i, { value: v })}
                      keyboardType={
                        cond.field === 'amount' || cond.field === 'date_day'
                          ? 'decimal-pad'
                          : 'default'
                      }
                    />
                  </Card>
                ))}
              </View>

              {/* Actions (simplified - just set_category) */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>ACTION — Set Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.fieldPills}>
                    {CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setActions([{ type: 'set_category', category: cat }])}
                      >
                        <Badge
                          label={cat}
                          style={
                            actions.some(
                              (a) => a.type === 'set_category' && 'category' in a && a.category === cat
                            )
                              ? { opacity: 1, borderWidth: 2, borderColor: Colors.primary }
                              : { opacity: 0.7 }
                          }
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <Button
                label="Save Rule"
                onPress={handleSaveManual}
                loading={saving}
                disabled={!ruleName.trim() || conditions.some((c) => !c.value)}
                variant="primary"
                fullWidth
                style={{ marginTop: Spacing.xl }}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.screen, paddingBottom: 80 },

  modeToggle: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  modeBtnActive: { backgroundColor: Colors.primary },
  modeBtnText: { fontSize: Typography.bodySmall, fontWeight: '600', color: Colors.textSecondary },
  modeBtnTextActive: { color: Colors.textInverse },

  aiSection: { gap: Spacing.md },
  aiHint: { fontSize: Typography.body, color: Colors.textSecondary },
  aiExamples: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  exampleChip: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exampleText: { fontSize: Typography.caption, color: Colors.primary, fontWeight: '600' },
  aiInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    fontSize: Typography.body,
    color: Colors.textPrimary,
    minHeight: 80,
  },

  previewCard: { marginTop: Spacing.lg, gap: Spacing.sm },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  previewTitle: { fontSize: Typography.bodySmall, fontWeight: '700', color: Colors.success },
  previewName: { fontSize: Typography.subheading, fontWeight: '700', color: Colors.textPrimary },
  previewDesc: { fontSize: Typography.body, color: Colors.textSecondary },
  previewSectionTitle: {
    fontSize: Typography.caption,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.sm,
  },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  previewRowText: { fontSize: Typography.bodySmall, color: Colors.textSecondary, fontFamily: 'monospace' },
  previewActions: { gap: Spacing.sm, marginTop: Spacing.md },

  manualSection: { gap: Spacing.lg },
  field: { gap: Spacing.sm },
  fieldLabel: {
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
  conditionsSection: { gap: Spacing.sm },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: {
    fontSize: Typography.caption,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addBtnText: { fontSize: Typography.caption, fontWeight: '700', color: Colors.primary },
  conditionCard: { gap: Spacing.sm },
  conditionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldPills: { flexDirection: 'row', gap: Spacing.xs },
  fieldPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fieldPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  fieldPillText: { fontSize: Typography.caption, fontWeight: '600', color: Colors.textSecondary },
  fieldPillTextActive: { color: Colors.textInverse },
  conditionInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    fontSize: Typography.bodySmall,
    color: Colors.textPrimary,
  },
});
