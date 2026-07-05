import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/lotris-api';
import type { PagedTickets } from '@/lib/types';
import { colors } from '@/lib/theme';

export default function HomeScreen() {
  const { user, session, accessToken, logout, refreshUser } = useAuth();
  const [ticketTotal, setTicketTotal] = useState<number | null>(null);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    if (!accessToken) return;
    setError(null);
    try {
      const page = await apiFetch<PagedTickets>('/api/v1/tickets?limit=1', {
        token: accessToken,
      });
      setTicketTotal(Number(page.total));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoadingTickets(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refreshUser(), loadTickets()]);
    setRefreshing(false);
  }

  async function onLogout() {
    await logout();
    router.replace('/');
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >
      <Text style={styles.greeting}>Hello, {user?.fullName ?? session?.fullName ?? 'Engineer'}</Text>
      <Text style={styles.role}>{user?.roleName ?? session?.role}</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Profile</Text>
        <Row label="Email" value={user?.email ?? session?.email ?? '—'} />
        <Row label="User ID" value={truncate(user?.id ?? session?.userId)} />
        <Row label="Tenant" value={truncate(user?.tenantId ?? session?.tenantId)} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>My tickets</Text>
        {loadingTickets ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 8 }} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <Text style={styles.stat}>{ticketTotal ?? 0}</Text>
        )}
        <Text style={styles.cardHint}>Assigned tickets visible to your role</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Phase 1 spike</Text>
        <Text style={styles.cardHint}>
          Login ✓ · GET /users/me ✓ · GET /api/v1/tickets ✓{'\n'}
          Next: tabs, queue, claim (Phase 2)
        </Text>
      </View>

      <Pressable style={styles.logout} onPress={onLogout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function truncate(id?: string) {
  if (!id) return '—';
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  greeting: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  role: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
    marginTop: -8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 6,
  },
  cardLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardHint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  stat: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
  },
  rowLabel: {
    color: colors.muted,
    fontSize: 13,
  },
  rowValue: {
    color: colors.text,
    fontSize: 13,
    flexShrink: 1,
    textAlign: 'right',
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  logout: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '600',
  },
});
