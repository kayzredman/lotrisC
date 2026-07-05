import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { EmptyState } from '@/components/status-chip';
import { LoadingView } from '@/components/loading-view';
import { TicketRow } from '@/components/ticket-row';
import { claimTicket, fetchQueue } from '@/lib/tickets-api';
import { useAuth } from '@/lib/auth-context';
import type { QueueTicket } from '@/lib/types';
import { colors } from '@/lib/theme';

export default function QueueScreen() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<QueueTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setError(null);
    try {
      const rows = await fetchQueue(accessToken);
      setItems(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load queue');
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

  async function onClaim(ticketId: string) {
    if (!accessToken) return;
    setClaimingId(ticketId);
    setError(null);
    try {
      await claimTicket(accessToken, ticketId);
      await load();
      router.push(`/ticket/${ticketId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Claim failed');
    } finally {
      setClaimingId(null);
    }
  }

  if (loading && !refreshing) return <LoadingView />;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {items.length === 0 ? (
        <EmptyState message="Queue is empty — nothing to claim right now." />
      ) : (
        items.map((ticket) => (
          <TicketRow
            key={ticket.id}
            ticket={ticket}
            onPress={() => router.push(`/ticket/${ticket.id}`)}
            actionLabel="Claim"
            onAction={() => onClaim(ticket.id)}
            actionBusy={claimingId === ticket.id}
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
