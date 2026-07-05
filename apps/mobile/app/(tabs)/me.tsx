import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { API_BASE } from '@/lib/lotris-api';
import { colors } from '@/lib/theme';

export default function MeScreen() {
  const { user, session, logout } = useAuth();

  async function onLogout() {
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
      </View>

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
  role: { color: colors.accent, fontSize: 14, fontWeight: '600', marginTop: -8 },
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
  logout: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: colors.danger, fontSize: 16, fontWeight: '600' },
});
