import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { EmptyState } from '@/components/status-chip';
import { LoadingView } from '@/components/loading-view';
import { TicketRow } from '@/components/ticket-row';
import { ACTIVE_STATUSES } from '@/lib/format';
import { fetchMyTickets } from '@/lib/tickets-api';
import { useAuth } from '@/lib/auth-context';
import type { TicketDto } from '@/lib/types';
import { colors } from '@/lib/theme';

export default function MyWorkScreen() {
  const { accessToken } = useAuth();
  const [tickets, setTickets] = useState<TicketDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setError(null);
    try {
      const page = await fetchMyTickets(accessToken);
      const active = page.rows.filter((t) => ACTIVE_STATUSES.has(t.status) || t.status === 'NEW');
      setTickets(active);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading && !refreshing) return <LoadingView />;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {tickets.length === 0 ? (
        <EmptyState message="No active tickets assigned to you." />
      ) : (
        tickets.map((ticket) => (
          <TicketRow
            key={ticket.id}
            ticket={ticket}
            onPress={() => router.push(`/ticket/${ticket.id}`)}
            subtitle={ticket.teamName ?? undefined}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  error: { color: colors.danger, marginBottom: 8 },
});
