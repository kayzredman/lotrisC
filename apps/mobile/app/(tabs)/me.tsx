import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { useBiometricLock } from '@/lib/biometric-lock';
import { revokeRegisteredDevice, usePagerAlerts } from '@/lib/pager-alerts-context';
import { API_BASE } from '@/lib/lotris-api';
import { colors } from '@/lib/theme';

export default function MeScreen() {
  const { user, session, accessToken, logout } = useAuth();
  const { pushEnabled, pushError, retryPushRegistration, testPagerAlert } = usePagerAlerts();
  const { enabled: bioLock, available: bioAvailable, setEnabled: setBioLock } = useBiometricLock();

  const pushLabel = pushEnabled ? 'Registered' : pushError ?? 'Not registered';
  const registerBtnLabel = pushEnabled ? 'Re-register push' : 'Register push';

  async function onLogout() {
    if (accessToken) {
      await revokeRegisteredDevice(accessToken);
    }
    await logout();
    router.replace('/');
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.name}>{user?.fullName ?? session?.fullName ?? 'Engineer'}</Text>
      <Text style={styles.role}>{user?.roleName ?? session?.role}</Text>

      <View style={styles.card}>
        <Row label="Email" value={user?.email ?? session?.email ?? '—'} />
        <Row label="Team" value={user?.teamId ? user.teamId.slice(0, 8) + '…' : '—'} />
        <Row label="API" value={API_BASE} mono />
        <Row label="Push" value={pushLabel} />
        <Row
          label="Biometric lock"
          value={bioAvailable ? (bioLock ? 'On' : 'Off') : 'Not available on device'}
        />
      </View>

      {bioAvailable ? (
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Lock on app resume</Text>
          <Switch
            value={bioLock}
            onValueChange={(v) => void setBioLock(v)}
            trackColor={{ false: colors.border, true: colors.accentMuted }}
            thumbColor="#fff"
          />
        </View>
      ) : null}

      {pushError && !pushEnabled ? (
        <Text style={styles.pushError}>{pushError}</Text>
      ) : null}

      <Pressable style={styles.testBtn} onPress={retryPushRegistration}>
        <Text style={styles.testBtnText}>{registerBtnLabel}</Text>
      </Pressable>

      {__DEV__ ? (
        <Pressable style={styles.testBtn} onPress={testPagerAlert}>
          <Text style={styles.testBtnText}>Test pager alert (dev)</Text>
        </Pressable>
      ) : null}

      <Pressable style={styles.logout} onPress={onLogout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, mono && styles.mono]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 16 },
  name: { color: colors.text, fontSize: 24, fontWeight: '700' },
  role: { color: colors.accentLight, fontSize: 14, fontWeight: '600', marginTop: -8 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  row: { gap: 4 },
  rowLabel: { color: colors.muted, fontSize: 12 },
  rowValue: { color: colors.text, fontSize: 15 },
  mono: { fontFamily: 'monospace', fontSize: 12 },
  pushError: { color: colors.danger, fontSize: 13, lineHeight: 18 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  switchLabel: { color: colors.text, fontSize: 15 },
  testBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  testBtnText: { color: colors.accentLight, fontSize: 14, fontWeight: '600' },
  logout: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: colors.danger, fontSize: 16, fontWeight: '600' },
});
