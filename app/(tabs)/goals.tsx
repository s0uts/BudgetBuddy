import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { GoalCard } from '@/components/goals/GoalCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Colors, Typography, Spacing, Radius } from '@/lib/theme';
import { db, supabase } from '@/lib/supabase';
import type { Goal } from '@/lib/supabase';

interface GoalFormState {
  name: string;
  target_amount: string;
  current_amount: string;
  target_date: string;
  color: string;
}

const GOAL_COLORS = [
  Colors.gold, Colors.primary, Colors.success,
  '#3B82F6', '#EF4444', '#F59E0B',
];

const EMPTY_FORM: GoalFormState = {
  name: '',
  target_amount: '',
  current_amount: '0',
  target_date: '',
  color: Colors.gold,
};

export default function GoalsScreen() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<GoalFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function loadGoals() {
    const { data, error } = await db.goals()
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setGoals(data as Goal[]);
  }

  useEffect(() => {
    loadGoals().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadGoals();
    setRefreshing(false);
  }, []);

  async function handleSave() {
    if (!form.name.trim()) return;
    const target = parseFloat(form.target_amount);
    const current = parseFloat(form.current_amount) || 0;
    if (isNaN(target) || target <= 0) return;

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await db.goals().insert({
      user_id: user!.id,
      name: form.name.trim(),
      target_amount: target,
      current_amount: current,
      target_date: form.target_date || null,
      color: form.color,
    });

    setSaving(false);
    if (!error) {
      setShowCreate(false);
      setForm(EMPTY_FORM);
      await loadGoals();
    }
  }

  async function handleDelete(goal: Goal) {
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${goal.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await db.goals().delete().eq('id', goal.id);
            await loadGoals();
          },
        },
      ]
    );
  }

  const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
  const overallProgress = totalTarget > 0 ? totalSaved / totalTarget : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Goals</Text>
            <Text style={styles.subtitle}>Track your savings targets</Text>
          </View>
          <Button
            label="New Goal"
            onPress={() => setShowCreate(true)}
            variant="primary"
            size="sm"
            icon={<Feather name="plus" size={14} color={Colors.textInverse} />}
          />
        </View>

        {/* Summary card */}
        {goals.length > 0 && (
          <Card style={styles.summaryCard} elevated>
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>Total Saved</Text>
                <Text style={styles.summaryValue}>
                  ${totalSaved.toLocaleString('en-CA', { minimumFractionDigits: 0 })}
                </Text>
              </View>
              <View style={styles.summaryRight}>
                <Text style={styles.summaryLabel}>of ${totalTarget.toLocaleString('en-CA', { minimumFractionDigits: 0 })}</Text>
                <Text style={[styles.summaryPct, { color: Colors.gold }]}>
                  {(overallProgress * 100).toFixed(0)}%
                </Text>
              </View>
            </View>
            <ProgressBar
              progress={overallProgress}
              color={Colors.gold}
              height={10}
              style={{ marginTop: Spacing.sm }}
            />
          </Card>
        )}

        {/* Goal list */}
        {goals.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Feather name="target" size={48} color={Colors.border} />
            <Text style={styles.emptyTitle}>No goals yet</Text>
            <Text style={styles.emptyBody}>
              Create a savings goal and track your progress
            </Text>
            <Button
              label="Create Your First Goal"
              onPress={() => setShowCreate(true)}
              variant="gold"
              fullWidth
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        ) : (
          <View style={styles.goalList}>
            {goals.map((goal) => (
              <View key={goal.id}>
                <GoalCard goal={goal} />
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(goal)}
                >
                  <Feather name="trash-2" size={14} color={Colors.textTertiary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create Goal Modal */}
      <Modal
        visible={showCreate}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreate(false)}
      >
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Goal</Text>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Feather name="x" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Goal Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Emergency Fund, Vacation, New Car…"
                placeholderTextColor={Colors.textTertiary}
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                autoFocus
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Target Amount ($CAD) *</Text>
              <TextInput
                style={styles.input}
                placeholder="5000"
                placeholderTextColor={Colors.textTertiary}
                value={form.target_amount}
                onChangeText={(v) => setForm((f) => ({ ...f, target_amount: v }))}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Already Saved ($CAD)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={Colors.textTertiary}
                value={form.current_amount}
                onChangeText={(v) => setForm((f) => ({ ...f, current_amount: v }))}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Target Date (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textTertiary}
                value={form.target_date}
                onChangeText={(v) => setForm((f) => ({ ...f, target_date: v }))}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Color</Text>
              <View style={styles.colorRow}>
                {GOAL_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: c },
                      form.color === c && styles.colorSwatchActive,
                    ]}
                    onPress={() => setForm((f) => ({ ...f, color: c }))}
                  />
                ))}
              </View>
            </View>

            <Button
              label="Create Goal"
              onPress={handleSave}
              loading={saving}
              disabled={!form.name.trim() || !form.target_amount}
              variant="gold"
              fullWidth
              style={{ marginTop: Spacing.xl }}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.screen, paddingBottom: 80 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  title: { fontSize: Typography.heading1, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: Typography.body, color: Colors.textSecondary, marginTop: 2 },

  summaryCard: {
    marginBottom: Spacing.xl,
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  summaryLabel: { fontSize: Typography.caption, color: Colors.textTertiary },
  summaryValue: { fontSize: Typography.heading2, fontWeight: '700', color: Colors.textInverse },
  summaryRight: { alignItems: 'flex-end', gap: 2 },
  summaryPct: { fontSize: Typography.subheading, fontWeight: '700' },

  goalList: { gap: Spacing.md },
  deleteBtn: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.sm,
    marginRight: Spacing.sm,
    padding: Spacing.xs,
  },

  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.sm,
  },
  emptyTitle: { fontSize: Typography.subheading, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.sm },
  emptyBody: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: Typography.subheading, fontWeight: '700', color: Colors.textPrimary },
  modalContent: { padding: Spacing.screen },
  field: { marginBottom: Spacing.xl },
  fieldLabel: {
    fontSize: Typography.bodySmall,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
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
  colorRow: { flexDirection: 'row', gap: Spacing.sm },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchActive: {
    borderColor: Colors.textPrimary,
  },
});
