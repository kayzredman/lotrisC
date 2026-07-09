import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { LotrisMark } from '@/components/lotris-mark';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, API_BASE } from '@/lib/lotris-api';
import { colors } from '@/lib/theme';

export default function LoginScreen() {
  const { login, loginWithMicrosoft } = useAuth();
  const [email, setEmail] = useState('admin-loose@test.local');
  const [password, setPassword] = useState('Test1234!');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [microsoftEnabled, setMicrosoftEnabled] = useState(false);
  const [microsoftSubmitting, setMicrosoftSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void apiFetch<{ microsoft?: boolean }>('/api/v1/auth/providers', { skipAuthRefresh: true })
      .then((providers) => {
        if (!cancelled) setMicrosoftEnabled(Boolean(providers.microsoft));
      })
      .catch(() => {
        if (!cancelled) setMicrosoftEnabled(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)/my-work');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function onMicrosoftSubmit() {
    setError(null);
    setMicrosoftSubmitting(true);
    try {
      await loginWithMicrosoft();
      router.replace('/(tabs)/my-work');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microsoft sign-in failed');
    } finally {
      setMicrosoftSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <View style={styles.brandRow}>
          <LotrisMark size="lg" showWordmark />
        </View>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>Engineer field response for Lotris mobile pager</Text>
        <Text style={styles.apiHint}>API: {API_BASE}</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          placeholderTextColor={colors.muted}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          placeholderTextColor={colors.muted}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </Pressable>

        {microsoftEnabled ? (
          <>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
            <Pressable
              style={[styles.microsoftButton, microsoftSubmitting && styles.buttonDisabled]}
              onPress={onMicrosoftSubmit}
              disabled={microsoftSubmitting}
            >
              {microsoftSubmitting ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.microsoftButtonText}>Sign in with Microsoft</Text>
              )}
            </Pressable>
          </>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 8,
  },
  brandRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 8,
  },
  apiHint: {
    color: colors.muted,
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 12,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginTop: 4,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.muted,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  microsoftButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  microsoftButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
