import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Colors, Typography, Spacing, Radius } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

type AuthMode = 'magic-link' | 'password';

export default function LoginScreen() {
  const [mode, setMode] = useState<AuthMode>('magic-link');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleMagicLink() {
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: 'budgetbuddy://auth/callback',
      },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setSent(true);
    }
  }

  async function handleSignIn() {
    if (!email.trim() || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) Alert.alert('Sign in failed', error.message);
  }

  async function handleSignUp() {
    if (!email.trim() || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) {
      Alert.alert('Sign up failed', error.message);
    } else {
      Alert.alert('Check your email', 'We sent you a confirmation link.');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoBlock}>
            <View style={styles.logoCircle}>
              <Feather name="dollar-sign" size={36} color={Colors.textInverse} />
            </View>
            <Text style={styles.logoText}>BudgetBuddy</Text>
            <Text style={styles.logoSub}>Your Canadian money companion</Text>
          </View>

          {sent && mode === 'magic-link' ? (
            <View style={styles.sentCard}>
              <Feather name="mail" size={48} color={Colors.primary} />
              <Text style={styles.sentTitle}>Check your inbox</Text>
              <Text style={styles.sentBody}>
                We sent a magic link to{'\n'}<Text style={{ fontWeight: '700' }}>{email}</Text>
              </Text>
              <Button
                label="Use a different email"
                onPress={() => { setSent(false); setEmail(''); }}
                variant="ghost"
                style={{ marginTop: Spacing.lg }}
              />
            </View>
          ) : (
            <View style={styles.form}>
              {/* Mode toggle */}
              <View style={styles.modeToggle}>
                {(['magic-link', 'password'] as AuthMode[]).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                    onPress={() => setMode(m)}
                  >
                    <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                      {m === 'magic-link' ? '✉️ Magic Link' : '🔒 Password'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Email */}
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputRow}>
                  <Feather name="mail" size={16} color={Colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor={Colors.textTertiary}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                  />
                </View>
              </View>

              {/* Password (only for password mode) */}
              {mode === 'password' && (
                <View style={styles.field}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputRow}>
                    <Feather name="lock" size={16} color={Colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor={Colors.textTertiary}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoComplete="password"
                    />
                  </View>
                </View>
              )}

              {/* CTA */}
              {mode === 'magic-link' ? (
                <Button
                  label="Send Magic Link"
                  onPress={handleMagicLink}
                  loading={loading}
                  disabled={!email.trim()}
                  variant="primary"
                  fullWidth
                  style={{ marginTop: Spacing.md }}
                />
              ) : (
                <View style={styles.authBtns}>
                  <Button
                    label="Sign In"
                    onPress={handleSignIn}
                    loading={loading}
                    disabled={!email.trim() || !password}
                    variant="primary"
                    fullWidth
                  />
                  <Button
                    label="Create Account"
                    onPress={handleSignUp}
                    loading={loading}
                    disabled={!email.trim() || !password}
                    variant="outline"
                    fullWidth
                  />
                </View>
              )}

              <Text style={styles.disclaimer}>
                By continuing, you agree to our Terms of Service and Privacy Policy.
                Your financial data is encrypted and never sold.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.huge,
    paddingBottom: Spacing.huge,
    justifyContent: 'center',
  },

  logoBlock: { alignItems: 'center', marginBottom: Spacing.xxxl * 2 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  logoText: {
    fontSize: Typography.heading1,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  logoSub: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    marginTop: 4,
  },

  form: { gap: Spacing.sm },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 4,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: Colors.background,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  modeBtnText: { fontSize: Typography.bodySmall, fontWeight: '500', color: Colors.textSecondary },
  modeBtnTextActive: { color: Colors.primary, fontWeight: '700' },

  field: { marginBottom: Spacing.md },
  label: {
    fontSize: Typography.bodySmall,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: { marginRight: Spacing.sm },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: Typography.body,
    color: Colors.textPrimary,
  },

  authBtns: { gap: Spacing.sm, marginTop: Spacing.md },
  disclaimer: {
    fontSize: Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: Spacing.xl,
  },

  sentCard: {
    alignItems: 'center',
    padding: Spacing.xxxl,
    gap: Spacing.md,
  },
  sentTitle: { fontSize: Typography.heading3, fontWeight: '700', color: Colors.textPrimary },
  sentBody: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
